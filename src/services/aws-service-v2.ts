import type { Resource, Alert, Activity, CostData, ResourceStatus, AlertType } from '@/types';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

/**
 * Retry logic with exponential backoff
 */
async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries - 1) {
                const delayMs = initialDelayMs * Math.pow(2, attempt);
                logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    throw lastError || new Error('Max retries exceeded');
}

/**
 * API response validation
 */
function validateApiResponse<T>(data: unknown, expectedFields: string[]): T {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response: not an object');
    }
    
    const obj = data as Record<string, unknown>;
    for (const field of expectedFields) {
        if (!(field in obj)) {
            throw new Error(`Invalid API response: missing field '${field}'`);
        }
    }
    
    return data as T;
}

/**
 * Map backend AWS resource to frontend Resource type
 */
function mapBackendResourceToFrontend(backendResource: any): Resource {
    const statusMap: Record<string, ResourceStatus> = {
        'running': 'safe',
        'stopped': 'warning',
        'terminated': 'critical',
        'available': 'safe',
        'creating': 'warning',
        'deleting': 'critical',
        'failed': 'critical',
    };
    
    return {
        id: backendResource.id,
        name: backendResource.resource_name,
        value: backendResource.metadata?.count?.toString() || '1',
        status: statusMap[backendResource.status] || 'warning',
        description: backendResource.metadata?.description || backendResource.status,
        type: backendResource.resource_type,
        region: backendResource.region,
    };
}

/**
 * Map backend alert to frontend Alert type
 */
function mapBackendAlertToFrontend(backendAlert: any): Alert {
    const typeMap: Record<string, AlertType> = {
        'critical': 'critical',
        'high': 'critical',
        'medium': 'warning',
        'low': 'info',
        'info': 'info',
    };
    
    return {
        id: backendAlert.id,
        type: typeMap[backendAlert.severity] || 'info',
        title: backendAlert.title,
        description: backendAlert.description,
        time: new Date(backendAlert.created_at).toLocaleString(),
        timestamp: backendAlert.created_at,
    };
}

/**
 * Map backend activity to frontend Activity type
 */
function mapBackendActivityToFrontend(backendActivity: any): Activity {
    return {
        id: backendActivity.id,
        action: backendActivity.action,
        resource: backendActivity.resource_id,
        time: new Date(backendActivity.created_at).toLocaleString(),
        user: backendActivity.user_id || 'system',
        timestamp: backendActivity.created_at,
        eventType: backendActivity.action,
    };
}

export interface HygieneScore {
    overall: number;
    security: number;
    costEfficiency: number;
    bestPractices: number;
    criticalIssues: number;
    recommendations: string[];
}

/**
 * Production-grade AWS Service
 * All data fetched from real backend API connected to AWS
 */
export const awsService = {
    /**
     * Fetch all AWS resources from backend
     * @param region - AWS region to fetch from
     * @returns Array of resources with real AWS data
     */
    async getResources(region: string = 'us-east-1'): Promise<Resource[]> {
        try {
            logger.info(`Fetching AWS resources from region ${region}`);
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/aws/resources', {
                    params: { region, max_results: 100 },
                    timeout: 10000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['resources', 'count']);
            const resources = (validated as any).resources || [];
            
            return resources.map(mapBackendResourceToFrontend);
        } catch (error) {
            logger.error(`Failed to fetch resources: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch resources by type from backend
     * @param type - Resource type (ec2, rds, s3, etc.)
     * @param region - AWS region
     * @returns Filtered resources
     */
    async getResourcesByType(type: string, region: string = 'us-east-1'): Promise<Resource[]> {
        try {
            logger.info(`Fetching ${type} resources from region ${region}`);
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get(`/api/aws/${type}/instances`, {
                    params: { region, max_results: 100 },
                    timeout: 10000,
                });
                return res.data;
            });
            
            const key = type === 'ec2' ? 'instances' : 
                       type === 'rds' ? 'instances' :
                       type === 's3' ? 'buckets' :
                       type === 'lambda' ? 'functions' : 'resources';
            
            const items = (response as any)[key] || [];
            return items.map(mapBackendResourceToFrontend);
        } catch (error) {
            logger.error(`Failed to fetch ${type} resources: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch active alerts from backend
     * @returns Array of real alerts from database
     */
    async getAlerts(): Promise<Alert[]> {
        try {
            logger.info('Fetching alerts from backend');
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/alerts', {
                    params: { status: 'open', max_results: 50 },
                    timeout: 5000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['alerts']);
            const alerts = (validated as any).alerts || [];
            
            return alerts.map(mapBackendAlertToFrontend);
        } catch (error) {
            logger.error(`Failed to fetch alerts: ${error}`);
            throw error;
        }
    },

    /**
     * Dismiss an alert in backend
     * @param alertId - Alert ID to dismiss
     */
    async dismissAlert(alertId: string): Promise<void> {
        try {
            logger.info(`Dismissing alert ${alertId}`);
            
            await retryWithExponentialBackoff(async () => {
                await apiClient.post(`/api/alerts/${alertId}/dismiss`, {}, {
                    timeout: 5000,
                });
            });
        } catch (error) {
            logger.error(`Failed to dismiss alert: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch CloudTrail activities from backend
     * @param limit - Maximum number of activities
     * @param region - AWS region
     * @returns Array of real CloudTrail events
     */
    async getActivities(limit: number = 10, region: string = 'us-east-1'): Promise<Activity[]> {
        try {
            logger.info(`Fetching ${limit} CloudTrail events from region ${region}`);
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/aws/cloudtrail/events', {
                    params: { region, max_results: limit },
                    timeout: 10000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['events']);
            const events = (validated as any).events || [];
            
            return events.map(mapBackendActivityToFrontend);
        } catch (error) {
            logger.error(`Failed to fetch activities: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch cost data from backend
     * @param months - Number of months to fetch
     * @returns Cost data for chart
     */
    async getCostData(months: number = 6): Promise<CostData[]> {
        try {
            logger.info(`Fetching cost data for last ${months} months`);
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/costs/summary', {
                    params: { months },
                    timeout: 10000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['cost_data']);
            const costData = (validated as any).cost_data || [];
            
            return costData.map((item: any) => ({
                month: item.month,
                cost: parseFloat(item.cost_usd),
            }));
        } catch (error) {
            logger.error(`Failed to fetch cost data: ${error}`);
            throw error;
        }
    },

    /**
     * Get current month cost from backend
     * @returns Current month cost in USD
     */
    async getCurrentMonthCost(): Promise<number> {
        try {
            logger.info('Fetching current month cost');
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/costs/current-month', {
                    timeout: 5000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['cost_usd']);
            return parseFloat((validated as any).cost_usd);
        } catch (error) {
            logger.error(`Failed to fetch current month cost: ${error}`);
            throw error;
        }
    },

    /**
     * Get hygiene score from backend
     * @returns Calculated hygiene score with recommendations
     */
    async getHygieneScore(): Promise<HygieneScore> {
        try {
            logger.info('Fetching hygiene score');
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/hygiene-score', {
                    timeout: 10000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['overall', 'security', 'cost_efficiency']);
            const data = validated as any;
            
            return {
                overall: data.overall,
                security: data.security,
                costEfficiency: data.cost_efficiency,
                bestPractices: data.best_practices || 0,
                criticalIssues: data.critical_issues || 0,
                recommendations: data.recommendations || [],
            };
        } catch (error) {
            logger.error(`Failed to fetch hygiene score: ${error}`);
            throw error;
        }
    },

    /**
     * Run a new AWS scan
     * @param region - Region to scan
     * @returns Scan results
     */
    async runScan(region: string = 'us-east-1'): Promise<{ success: boolean; resourcesScanned: number }> {
        try {
            logger.info(`Running AWS scan for region ${region}`);
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.post('/api/scan', { region }, {
                    timeout: 30000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['success', 'resources_scanned']);
            return {
                success: (validated as any).success,
                resourcesScanned: (validated as any).resources_scanned,
            };
        } catch (error) {
            logger.error(`Failed to run scan: ${error}`);
            throw error;
        }
    },

    /**
     * Connect AWS account
     * @param accessKeyId - AWS access key
     * @param secretAccessKey - AWS secret key
     * @param region - AWS region
     * @returns Connection result with account ID
     */
    async connectAccount(
        accessKeyId: string,
        secretAccessKey: string,
        region: string
    ): Promise<{ success: boolean; accountId: string }> {
        try {
            logger.info(`Connecting AWS account in region ${region}`);
            
            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.post('/api/aws/connect', {
                    access_key_id: accessKeyId,
                    secret_access_key: secretAccessKey,
                    region,
                }, {
                    timeout: 15000,
                });
                return res.data;
            });
            
            const validated = validateApiResponse(response, ['success', 'account_id']);
            return {
                success: (validated as any).success,
                accountId: (validated as any).account_id,
            };
        } catch (error) {
            logger.error(`Failed to connect AWS account: ${error}`);
            throw error;
        }
    },

    /**
     * Disconnect AWS account
     */
    async disconnectAccount(): Promise<void> {
        try {
            logger.info('Disconnecting AWS account');
            
            await retryWithExponentialBackoff(async () => {
                await apiClient.post('/api/aws/disconnect', {}, {
                    timeout: 5000,
                });
            });
        } catch (error) {
            logger.error(`Failed to disconnect AWS account: ${error}`);
            throw error;
        }
    },
};
