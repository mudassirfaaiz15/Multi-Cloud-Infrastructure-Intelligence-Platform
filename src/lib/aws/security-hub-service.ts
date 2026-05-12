import { logger } from '@/lib/utils/logger';
import { apiClient } from '@/lib/api-client';

export interface SecurityFinding {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    resourceType: string;
    description: string;
    region?: string;
    lastUpdated?: string;
}

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
 * Security Hub Service - Real Backend API Integration
 * Monitors security findings and compliance from AWS Security Hub
 */
export async function getSecurityFindings(
    region: string = 'us-east-1',
    limit: number = 50,
    offset: number = 0
): Promise<SecurityFinding[]> {
    try {
        logger.info(`Fetching Security Hub findings in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/security-findings', {
                params: {
                    region,
                    limit,
                    offset,
                },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response || !Array.isArray(response.findings)) {
            logger.warn('Invalid Security Hub response format');
            return [];
        }

        return response.findings.map((finding: Record<string, unknown>) => ({
            id: String(finding.id),
            title: String(finding.title),
            severity: String(finding.severity).toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
            status: String(finding.status),
            resourceType: String(finding.resource_type),
            description: String(finding.description),
            region: String(finding.region || region),
            lastUpdated: String(finding.last_updated || new Date().toISOString()),
        }));
    } catch (error) {
        logger.error(`Error fetching Security Hub findings: ${error}`);
        return [];
    }
}

/**
 * Get security findings with pagination
 */
export async function getSecurityFindingsPaginated(
    region: string = 'us-east-1',
    limit: number = 50,
    offset: number = 0
): Promise<{ findings: SecurityFinding[]; total: number; hasMore: boolean }> {
    try {
        logger.info(`Fetching paginated Security Hub findings in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/security-findings', {
                params: {
                    region,
                    limit,
                    offset,
                },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response || !Array.isArray(response.findings)) {
            return { findings: [], total: 0, hasMore: false };
        }

        const findings = response.findings.map((finding: Record<string, unknown>) => ({
            id: String(finding.id),
            title: String(finding.title),
            severity: String(finding.severity).toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
            status: String(finding.status),
            resourceType: String(finding.resource_type),
            description: String(finding.description),
            region: String(finding.region || region),
            lastUpdated: String(finding.last_updated || new Date().toISOString()),
        }));

        const total = Number(response.total || 0);
        const hasMore = offset + limit < total;

        return { findings, total, hasMore };
    } catch (error) {
        logger.error(`Error fetching paginated Security Hub findings: ${error}`);
        return { findings: [], total: 0, hasMore: false };
    }
}

/**
 * Get security compliance status
 */
export async function getComplianceStatus(region: string = 'us-east-1'): Promise<{ compliant: number; nonCompliant: number }> {
    try {
        logger.info(`Fetching compliance status in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/security/compliance', {
                params: { region },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response) {
            return { compliant: 0, nonCompliant: 0 };
        }

        return {
            compliant: Number(response.compliant || 0),
            nonCompliant: Number(response.non_compliant || 0),
        };
    } catch (error) {
        logger.error(`Error getting compliance status: ${error}`);
        return { compliant: 0, nonCompliant: 0 };
    }
}

/**
 * Get security findings by severity
 */
export async function getSecurityFindingsBySeverity(
    region: string = 'us-east-1',
    severity: 'critical' | 'high' | 'medium' | 'low'
): Promise<SecurityFinding[]> {
    try {
        logger.info(`Fetching ${severity} severity findings in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/security-findings', {
                params: {
                    region,
                    severity,
                    limit: 100,
                },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response || !Array.isArray(response.findings)) {
            return [];
        }

        return response.findings.map((finding: Record<string, unknown>) => ({
            id: String(finding.id),
            title: String(finding.title),
            severity: String(finding.severity).toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
            status: String(finding.status),
            resourceType: String(finding.resource_type),
            description: String(finding.description),
            region: String(finding.region || region),
            lastUpdated: String(finding.last_updated || new Date().toISOString()),
        }));
    } catch (error) {
        logger.error(`Error fetching ${severity} findings: ${error}`);
        return [];
    }
}
