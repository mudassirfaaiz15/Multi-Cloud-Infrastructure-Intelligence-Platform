import { logger } from '@/lib/utils/logger';
import { Activity } from '@/types';
import { apiClient } from '@/lib/api-client';

export interface AuditTrail {
    id: string;
    name: string;
    region: string;
    enabled: boolean;
    description: string;
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
 * CloudTrail Service - Real Backend API Integration
 * Monitors CloudTrail logging and audit trails across AWS resources
 */
export async function getAuditTrails(region: string = 'us-east-1'): Promise<AuditTrail[]> {
    try {
        logger.info(`Fetching CloudTrail trails in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/cloudtrail/trails', {
                params: { region },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response || !Array.isArray(response.trails)) {
            logger.warn('Invalid CloudTrail response format');
            return [];
        }

        return response.trails.map((trail: Record<string, unknown>) => ({
            id: String(trail.trail_arn),
            name: String(trail.name),
            region: String(trail.region || region),
            enabled: Boolean(trail.is_enabled),
            description: String(trail.description || ''),
        }));
    } catch (error) {
        logger.error(`Error fetching CloudTrail trails: ${error}`);
        return [];
    }
}

/**
 * Get audit activity log from backend
 */
export async function getAuditActivity(
    region: string = 'us-east-1',
    eventType?: string,
    limit: number = 50,
    offset: number = 0
): Promise<Activity[]> {
    try {
        logger.info(`Fetching audit activity${eventType ? ` for ${eventType}` : ''} in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/audit-logs', {
                params: {
                    region,
                    event_type: eventType,
                    limit,
                    offset,
                },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response || !Array.isArray(response.events)) {
            logger.warn('Invalid audit activity response format');
            return [];
        }

        return response.events.map((event: Record<string, unknown>) => ({
            id: String(event.id),
            action: String(event.event_name),
            resource: String(event.resource_id || ''),
            time: new Date(String(event.event_time)).toLocaleString(),
            user: String(event.user_identity || 'system'),
            timestamp: String(event.event_time),
            eventType: String(event.event_name),
            region: String(event.aws_region || region),
        }));
    } catch (error) {
        logger.error(`Error fetching audit activity: ${error}`);
        return [];
    }
}

/**
 * Get audit activity with pagination
 */
export async function getAuditActivityPaginated(
    region: string = 'us-east-1',
    eventType?: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ events: Activity[]; total: number; hasMore: boolean }> {
    try {
        logger.info(`Fetching paginated audit activity in ${region}`);

        const response = await retryWithExponentialBackoff(async () => {
            const res = await apiClient.get('/api/v1/audit-logs', {
                params: {
                    region,
                    event_type: eventType,
                    limit,
                    offset,
                },
                timeout: 10000,
            });
            return res.data;
        });

        if (!response || !Array.isArray(response.events)) {
            return { events: [], total: 0, hasMore: false };
        }

        const events = response.events.map((event: Record<string, unknown>) => ({
            id: String(event.id),
            action: String(event.event_name),
            resource: String(event.resource_id || ''),
            time: new Date(String(event.event_time)).toLocaleString(),
            user: String(event.user_identity || 'system'),
            timestamp: String(event.event_time),
            eventType: String(event.event_name),
            region: String(event.aws_region || region),
        }));

        const total = Number(response.total || 0);
        const hasMore = offset + limit < total;

        return { events, total, hasMore };
    } catch (error) {
        logger.error(`Error fetching paginated audit activity: ${error}`);
        return { events: [], total: 0, hasMore: false };
    }
}
