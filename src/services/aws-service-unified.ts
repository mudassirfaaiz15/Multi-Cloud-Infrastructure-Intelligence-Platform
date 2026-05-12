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
function mapBackendResourceToFrontend(backendResource: Record<string, unknown>): Resource {
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
        id: String(backendResource.id),
        name: String(backendResource.resource_name),
        value: String((backendResource.metadata as Record<string, unknown>)?.count || '1'),
        status: statusMap[String(backendResource.status)] || 'warning',
        description: String((backendResource.metadata as Record<string, unknown>)?.description || backendResource.status),
        type: String(backendResource.resource_type),
        region: String(backendResource.region),
    };
}

/**
 * Map backend alert to frontend Alert type
 */
function mapBackendAlertToFrontend(backendAlert: Record<string, unknown>): Alert {
    const typeMap: Record<string, AlertType> = {
        'critical': 'critical',
        'high': 'critical',
        'medium': 'warning',
        'low': 'info',
        'info': 'info',
    };

    return {
        id: String(backendAlert.id),
        type: typeMap[String(backendAlert.severity)] || 'info',
        title: String(backendAlert.title),
        description: String(backendAlert.description),
        time: new Date(String(backendAlert.created_at)).toLocaleString(),
        timestamp: String(backendAlert.created_at),
    };
}

/**
 * Map backend activity to frontend Activity type
 */
function mapBackendActivityToFrontend(backendActivity: Record<string, unknown>): Activity {
    return {
        id: String(backendActivity.id),
        action: String(backendActivity.action),
        resource: String(backendActivity.resource_id),
        time: new Date(String(backendActivity.created_at)).toLocaleString(),
        user: String(backendActivity.user_id || 'system'),
        timestamp: String(backendActivity.created_at),
        eventType: String(backendActivity.action),
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

export interface PaginationParams {
    limit?: number;
    offset?: number;
    nextToken?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Unified Enterprise AWS Service
 * Centralized API abstraction with retry middleware, timeout handling, caching support,
 * region-aware clients, and pagination abstraction.
 */
export const awsService = {
    /**
     * Fetch all AWS resources from backend with pagination
     */
    async getResources(region: string = 'us-east-1', pagination?: PaginationParams): Promise<PaginatedResponse<Resource>> {
        try {
            logger.info(`Fetching AWS resources from region ${region}`);

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/v1/resources', {
                    params: {
                        region,
                        limit: pagination?.limit || 100,
                        offset: pagination?.offset || 0,
                        next_token: pagination?.nextToken,
                    },
                    timeout: 10000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['resources', 'total']);
            const data = validated as Record<string, unknown>;
            const resources = (data.resources as Record<string, unknown>[]) || [];

            return {
                items: resources.map(mapBackendResourceToFrontend),
                total: Number(data.total),
                limit: pagination?.limit || 100,
                offset: pagination?.offset || 0,
                hasMore: (pagination?.offset || 0) + (pagination?.limit || 100) < Number(data.total),
            };
        } catch (error) {
            logger.error(`Failed to fetch resources: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch resources by type from backend
     */
    async getResourcesByType(type: string, region: string = 'us-east-1', pagination?: PaginationParams): Promise<PaginatedResponse<Resource>> {
        try {
            logger.info(`Fetching ${type} resources from region ${region}`);

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get(`/api/v1/resources/${type}`, {
                    params: {
                        region,
                        limit: pagination?.limit || 100,
                        offset: pagination?.offset || 0,
                    },
                    timeout: 10000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['resources', 'total']);
            const data = validated as Record<string, unknown>;
            const resources = (data.resources as Record<string, unknown>[]) || [];

            return {
                items: resources.map(mapBackendResourceToFrontend),
                total: Number(data.total),
                limit: pagination?.limit || 100,
                offset: pagination?.offset || 0,
                hasMore: (pagination?.offset || 0) + (pagination?.limit || 100) < Number(data.total),
            };
        } catch (error) {
            logger.error(`Failed to fetch ${type} resources: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch active alerts from backend
     */
    async getAlerts(pagination?: PaginationParams): Promise<PaginatedResponse<Alert>> {
        try {
            logger.info('Fetching alerts from backend');

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/v1/alerts', {
                    params: {
                        status: 'open',
                        limit: pagination?.limit || 50,
                        offset: pagination?.offset || 0,
                    },
                    timeout: 5000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['alerts', 'total']);
            const data = validated as Record<string, unknown>;
            const alerts = (data.alerts as Record<string, unknown>[]) || [];

            return {
                items: alerts.map(mapBackendAlertToFrontend),
                total: Number(data.total),
                limit: pagination?.limit || 50,
                offset: pagination?.offset || 0,
                hasMore: (pagination?.offset || 0) + (pagination?.limit || 50) < Number(data.total),
            };
        } catch (error) {
            logger.error(`Failed to fetch alerts: ${error}`);
            throw error;
        }
    },

    /**
     * Dismiss an alert in backend
     */
    async dismissAlert(alertId: string): Promise<void> {
        try {
            logger.info(`Dismissing alert ${alertId}`);

            await retryWithExponentialBackoff(async () => {
                await apiClient.post(`/api/v1/alerts/${alertId}/dismiss`, {}, {
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
     */
    async getActivities(region: string = 'us-east-1', pagination?: PaginationParams): Promise<PaginatedResponse<Activity>> {
        try {
            logger.info(`Fetching CloudTrail events from region ${region}`);

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/v1/audit-logs', {
                    params: {
                        region,
                        limit: pagination?.limit || 50,
                        offset: pagination?.offset || 0,
                    },
                    timeout: 10000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['events', 'total']);
            const data = validated as Record<string, unknown>;
            const events = (data.events as Record<string, unknown>[]) || [];

            return {
                items: events.map(mapBackendActivityToFrontend),
                total: Number(data.total),
                limit: pagination?.limit || 50,
                offset: pagination?.offset || 0,
                hasMore: (pagination?.offset || 0) + (pagination?.limit || 50) < Number(data.total),
            };
        } catch (error) {
            logger.error(`Failed to fetch activities: ${error}`);
            throw error;
        }
    },

    /**
     * Fetch cost data from backend
     */
    async getCostData(months: number = 6): Promise<CostData[]> {
        try {
            logger.info(`Fetching cost data for last ${months} months`);

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/v1/costs/summary', {
                    params: { months },
                    timeout: 10000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['cost_data']);
            const data = validated as Record<string, unknown>;
            const costData = (data.cost_data as Record<string, unknown>[]) || [];

            return costData.map((item: Record<string, unknown>) => ({
                month: String(item.month),
                cost: parseFloat(String(item.cost_usd)),
            }));
        } catch (error) {
            logger.error(`Failed to fetch cost data: ${error}`);
            throw error;
        }
    },

    /**
     * Get current month cost from backend
     */
    async getCurrentMonthCost(): Promise<number> {
        try {
            logger.info('Fetching current month cost');

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/v1/costs/current', {
                    timeout: 5000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['cost_usd']);
            const data = validated as Record<string, unknown>;
            return parseFloat(String(data.cost_usd));
        } catch (error) {
            logger.error(`Failed to fetch current month cost: ${error}`);
            throw error;
        }
    },

    /**
     * Get hygiene score from backend
     */
    async getHygieneScore(): Promise<HygieneScore> {
        try {
            logger.info('Fetching hygiene score');

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.get('/api/v1/hygiene-score', {
                    timeout: 10000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['overall', 'security', 'cost_efficiency']);
            const data = validated as Record<string, unknown>;

            return {
                overall: Number(data.overall),
                security: Number(data.security),
                costEfficiency: Number(data.cost_efficiency),
                bestPractices: Number(data.best_practices || 0),
                criticalIssues: Number(data.critical_issues || 0),
                recommendations: (data.recommendations as string[]) || [],
            };
        } catch (error) {
            logger.error(`Failed to fetch hygiene score: ${error}`);
            throw error;
        }
    },

    /**
     * Run a new AWS scan
     */
    async runScan(region: string = 'us-east-1'): Promise<{ success: boolean; resourcesScanned: number }> {
        try {
            logger.info(`Running AWS scan for region ${region}`);

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.post('/api/v1/scan', { region }, {
                    timeout: 30000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['success', 'resources_scanned']);
            const data = validated as Record<string, unknown>;
            return {
                success: Boolean(data.success),
                resourcesScanned: Number(data.resources_scanned),
            };
        } catch (error) {
            logger.error(`Failed to run scan: ${error}`);
            throw error;
        }
    },

    /**
     * Connect AWS account
     */
    async connectAccount(
        accessKeyId: string,
        secretAccessKey: string,
        region: string
    ): Promise<{ success: boolean; accountId: string }> {
        try {
            logger.info(`Connecting AWS account in region ${region}`);

            const response = await retryWithExponentialBackoff(async () => {
                const res = await apiClient.post('/api/v1/accounts/connect', {
                    access_key_id: accessKeyId,
                    secret_access_key: secretAccessKey,
                    region,
                }, {
                    timeout: 15000,
                });
                return res.data;
            });

            const validated = validateApiResponse(response, ['success', 'account_id']);
            const data = validated as Record<string, unknown>;
            return {
                success: Boolean(data.success),
                accountId: String(data.account_id),
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
                await apiClient.post('/api/v1/accounts/disconnect', {}, {
                    timeout: 5000,
                });
            });
        } catch (error) {
            logger.error(`Failed to disconnect AWS account: ${error}`);
            throw error;
        }
    },
};
