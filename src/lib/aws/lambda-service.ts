import { logger } from '@/lib/utils/logger';

export interface LambdaFunction {
    id: string;
    name: string;
    runtime: string;
    status: 'safe' | 'warning' | 'critical';
    memory: number;
    region: string;
    description: string;
}

/**
 * Lambda Service
 * Monitors Lambda functions and configurations
 */
export async function getLambdaFunctions(region?: string): Promise<LambdaFunction[]> {
    try {
        logger.info(`Fetching Lambda functions ${region ? `in ${region}` : 'across all regions'}`);

        // Mock data for demo
        const functions: LambdaFunction[] = [
            {
                id: 'process-orders',
                name: 'ProcessOrders',
                runtime: 'python3.11',
                status: 'safe',
                memory: 512,
                region: region || 'us-east-1',
                description: 'Process customer orders from queue',
            },
            {
                id: 'send-notifications',
                name: 'SendNotifications',
                runtime: 'nodejs18.x',
                status: 'safe',
                memory: 256,
                region: region || 'us-east-1',
                description: 'Send email and SMS notifications',
            },
        ];

        return functions;
    } catch (error) {
        logger.error(`Error fetching Lambda functions: ${error}`);
        return [];
    }
}

/**
 * Get Lambda function summary
 */
export async function getLambdaSummary(region?: string): Promise<{ total: number; activeRegions: string[] }> {
    try {
        const functions = await getLambdaFunctions(region);
        return {
            total: functions.length,
            activeRegions: [...new Set(functions.map(f => f.region))],
        };
    } catch (error) {
        logger.error(`Error getting Lambda summary: ${error}`);
        return { total: 0, activeRegions: [] };
    }
}

