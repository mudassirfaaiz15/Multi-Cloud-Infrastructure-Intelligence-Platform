/**
 * EC2 Service - Real AWS Integration via Backend API
 * 
 * ARCHITECTURE:
 * Frontend calls → awsApiClient.getEC2Instances() → Backend Flask API
 * Backend → boto3 ec2_client → Real AWS API → Transform to DTOs → Response
 * 
 * WHY: AWS credentials must NOT be in frontend code or localStorage
 * Security: All AWS SDK calls must be backend-only with IAM role assumption
 * 
 * IMPLEMENTS ENTERPRISE PATTERNS:
 * - JWT authentication (handled by awsApiClient)
 * - RBAC enforcement (backend permission decorators)
 * - Error handling with retry logic
 * - Pagination for large datasets
 * - Type-safe responses
 */

import { logger } from '@/lib/utils/logger';
import { awsApiClient, EC2Instance as APIEc2Instance, PaginatedResponse, getErrorMessage } from '@/lib/api/aws-client';

/**
 * Frontend EC2Instance interface - matches backend DTO
 */
export interface EC2Instance {
    id: string;
    name: string;
    type: string;
    status: 'safe' | 'warning' | 'critical';
    state: 'running' | 'stopped' | 'terminated';
    region: string;
    costPerMonth?: number;
    isRunning: boolean;
    launchTime?: string;
    metrics?: {
        cpuUtilization?: number;
        networkIn?: number;
        networkOut?: number;
    };
    security?: {
        securityGroups: string[];
        publicIpAddress?: string;
        privateIpAddress?: string;
        tags: Record<string, string>;
    };
}

/**
 * EC2 cost analysis breakdown
 */
export interface EC2CostAnalysis {
    totalMonthly: number;
    byInstanceType: Record<string, number>;
    byRegion: Record<string, number>;
    byState: Record<string, number>;
    topExpensive: Array<{ name: string; type: string; cost: number }>;
    potentialSavings: number;
}

/**
 * EC2 summary statistics
 */
export interface EC2Summary {
    total: number;
    running: number;
    stopped: number;
    terminated: number;
    totalCost: number;
    regions: string[];
    statusCounts: {
        safe: number;
        warning: number;
        critical: number;
    };
    topRegions: Array<{ region: string; count: number; cost: number }>;
}

/**
 * Fetch EC2 instances from backend API
 * 
 * @param region Optional region to filter by (e.g., 'us-east-1')
 * @param page Page number (default: 1)
 * @param pageSize Items per page (default: 50)
 * @returns Promise<EC2Instance[]>
 * @throws Error if API call fails
 */
export async function getEC2Instances(
    region?: string,
    page = 1,
    pageSize = 50
): Promise<EC2Instance[]> {
    try {
        const logMsg = region 
            ? `Fetching EC2 instances from ${region}` 
            : 'Fetching EC2 instances across all regions';
        logger.info(logMsg);

        // Call backend API with JWT authentication
        // Token refresh handled automatically by awsApiClient interceptor
        const response = await awsApiClient.getEC2Instances(region, page, pageSize);

        // Transform backend response to frontend format
        const instances: EC2Instance[] = (response.items || []).map((ec2: any) => ({
            id: ec2.instance_id,
            name: ec2.instance_name || 'Unnamed',
            type: ec2.instance_type,
            status: ec2.status as 'safe' | 'warning' | 'critical',
            state: ec2.state as 'running' | 'stopped' | 'terminated',
            region: ec2.region,
            costPerMonth: ec2.cost_per_month,
            isRunning: ec2.state === 'running',
            launchTime: ec2.launch_time,
            metrics: {
                cpuUtilization: ec2.cpu_utilization,
                networkIn: ec2.network_in,
                networkOut: ec2.network_out,
            },
            security: {
                securityGroups: ec2.security_groups || [],
                publicIpAddress: ec2.public_ip,
                privateIpAddress: ec2.private_ip,
                tags: ec2.tags || {},
            },
        }));

        logger.info(`Successfully fetched ${instances.length} EC2 instances`);
        return instances;
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        logger.error(`Error fetching EC2 instances: ${errorMsg}`);
        throw new Error(`Failed to fetch EC2 instances: ${errorMsg}`);
    }
}

/**
 * Get EC2 instance summary statistics
 * 
 * Useful for dashboard cards showing:
 * - Total instance count
 * - Running vs stopped breakdown
 * - Total monthly cost
 * - Health status distribution
 */
export async function getEC2Summary(region?: string): Promise<EC2Summary> {
    try {
        const instances = await getEC2Instances(region, 1, 100);

        // Build region statistics
        const regionMap = new Map<string, { count: number; cost: number }>();
        instances.forEach(inst => {
            const existing = regionMap.get(inst.region) || { count: 0, cost: 0 };
            regionMap.set(inst.region, {
                count: existing.count + 1,
                cost: existing.cost + (inst.costPerMonth || 0),
            });
        });

        const topRegions = Array.from(regionMap.entries())
            .map(([region, { count, cost }]) => ({ region, count, cost }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);

        const summary: EC2Summary = {
            total: instances.length,
            running: instances.filter(i => i.state === 'running').length,
            stopped: instances.filter(i => i.state === 'stopped').length,
            terminated: instances.filter(i => i.state === 'terminated').length,
            totalCost: instances.reduce((sum, i) => sum + (i.costPerMonth || 0), 0),
            regions: [...new Set(instances.map(i => i.region))],
            statusCounts: {
                safe: instances.filter(i => i.status === 'safe').length,
                warning: instances.filter(i => i.status === 'warning').length,
                critical: instances.filter(i => i.status === 'critical').length,
            },
            topRegions,
        };

        logger.info(
            `EC2 Summary: ${summary.total} instances (${summary.running} running), ` +
            `$${summary.totalCost.toFixed(2)}/month`
        );
        return summary;
    } catch (error) {
        logger.error(`Error getting EC2 summary: ${error}`);
        return {
            total: 0,
            running: 0,
            stopped: 0,
            terminated: 0,
            totalCost: 0,
            regions: [],
            statusCounts: { safe: 0, warning: 0, critical: 0 },
            topRegions: [],
        };
    }
}

/**
 * Get high-cost instances (potential optimization targets)
 * 
 * Useful for cost optimization recommendations
 * Default threshold: $1000/month
 */
export async function getHighCostInstances(threshold: number = 1000): Promise<EC2Instance[]> {
    try {
        const instances = await getEC2Instances(undefined, 1, 200);
        return instances
            .filter(i => (i.costPerMonth || 0) > threshold)
            .sort((a, b) => (b.costPerMonth || 0) - (a.costPerMonth || 0));
    } catch (error) {
        logger.error(`Error fetching high-cost instances: ${error}`);
        return [];
    }
}

/**
 * Get idle instances (stopped but not terminated)
 * 
 * Useful for cleanup recommendations
 */
export async function getIdleInstances(): Promise<EC2Instance[]> {
    try {
        const instances = await getEC2Instances(undefined, 1, 100);
        // Filter for stopped instances (backend would provide stopped_duration)
        return instances.filter(i => i.state === 'stopped')
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        logger.error(`Error fetching idle instances: ${error}`);
        return [];
    }
}

/**
 * Get cost analysis for EC2
 * 
 * Returns breakdown by:
 * - Instance type
 * - Region
 * - State
 * - Top expensive instances
 * - Potential savings
 */
export async function getEC2CostAnalysis(region?: string): Promise<EC2CostAnalysis> {
    try {
        const instances = await getEC2Instances(region, 1, 200);

        const analysis: EC2CostAnalysis = {
            totalMonthly: 0,
            byInstanceType: {},
            byRegion: {},
            byState: {},
            topExpensive: [],
            potentialSavings: 0,
        };

        const costByInstance: Array<{ name: string; type: string; cost: number }> = [];

        for (const instance of instances) {
            const cost = instance.costPerMonth || 0;
            analysis.totalMonthly += cost;

            // By instance type
            analysis.byInstanceType[instance.type] = 
                (analysis.byInstanceType[instance.type] || 0) + cost;

            // By region
            analysis.byRegion[instance.region] = 
                (analysis.byRegion[instance.region] || 0) + cost;

            // By state
            analysis.byState[instance.state] = 
                (analysis.byState[instance.state] || 0) + cost;

            costByInstance.push({
                name: instance.name,
                type: instance.type,
                cost,
            });

            // Calculate potential savings from stopped instances
            if (instance.state === 'stopped' && cost > 0) {
                analysis.potentialSavings += cost * 0.8; // Assume 80% cost reduction
            }
        }

        analysis.topExpensive = costByInstance
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10);

        logger.info(`EC2 Cost Analysis: $${analysis.totalMonthly.toFixed(2)}/month`);
        return analysis;
    } catch (error) {
        logger.error(`Error analyzing EC2 costs: ${error}`);
        return {
            totalMonthly: 0,
            byInstanceType: {},
            byRegion: {},
            byState: {},
            topExpensive: [],
            potentialSavings: 0,
        };
    }
}
