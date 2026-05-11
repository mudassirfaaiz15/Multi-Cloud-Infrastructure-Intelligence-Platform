import { logger } from '@/lib/utils/logger';
import { awsApiClient, RDSInstance as APIRDSInstance, PaginatedResponse, getErrorMessage } from '@/lib/api/aws-client';

/**
 * RDS (Relational Database Service) Service
 * 
 * Production-grade RDS monitoring integration
 * Connects to real AWS via backend Flask API
 * 
 * Real Flow: Frontend → JWT Auth → Flask API → boto3 → AWS
 */

export interface RDSInstance {
    id: string;
    name: string;
    engine: string;
    status: 'safe' | 'warning' | 'critical';
    storage: number;
    region: string;
    description: string;
    costPerMonth?: number;
    isActive: boolean;
    instanceClass?: string;
    versionInfo?: {
        engineVersion: string;
        status: string;
    };
    security?: {
        encrypted: boolean;
        multiAZ: boolean;
    };
}

/**
 * Fetch RDS instances from backend API
 * 
 * Enterprise Features:
 * - Real AWS SDK calls via backend
 * - Pagination support
 * - Error handling with retry logic
 * - Automatic token refresh
 * - Region filtering
 */
export async function getRDSInstances(region?: string, page = 1, pageSize = 50): Promise<RDSInstance[]> {
    try {
        logger.info(`Fetching RDS instances ${region ? `in ${region}` : 'across all regions'}`);

        // Call backend API with JWT authentication
        const response = await awsApiClient.getRDSInstances(region, page, pageSize);

        // Transform backend response to frontend format
        const instances: RDSInstance[] = response.items.map((dbInstance: APIRDSInstance) => ({
            id: dbInstance.db_instance_identifier,
            name: dbInstance.db_instance_identifier,
            engine: dbInstance.engine,
            status: dbInstance.status as 'safe' | 'warning' | 'critical',
            storage: dbInstance.allocated_storage,
            region: dbInstance.region,
            description: `${dbInstance.engine} database - ${dbInstance.db_instance_status}`,
            costPerMonth: dbInstance.cost_per_month,
            isActive: dbInstance.db_instance_status === 'available',
            instanceClass: dbInstance.db_instance_class,
            versionInfo: {
                engineVersion: dbInstance.engine_version,
                status: dbInstance.db_instance_status,
            },
            security: {
                encrypted: dbInstance.storage_encrypted,
                multiAZ: dbInstance.multi_az,
            },
        }));

        logger.info(`Successfully fetched ${instances.length} RDS instances`);
        return instances;
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        logger.error(`Error fetching RDS instances: ${errorMsg}`);
        
        // Return empty array on error (with proper error logging)
        throw new Error(`Failed to fetch RDS instances: ${errorMsg}`);
    }
}

/**
 * Get RDS instance summary/statistics
 * 
 * Returns aggregated information about RDS resources
 */
export async function getRDSSummary(region?: string): Promise<{ 
    total: number
    regions: string[]
    totalCost: number
    statusCounts: {
        safe: number
        warning: number
        critical: number
    }
}> {
    try {
        const instances = await getRDSInstances(region, 1, 100);
        
        const summary = {
            total: instances.length,
            regions: [...new Set(instances.map(i => i.region))],
            totalCost: instances.reduce((sum, i) => sum + (i.costPerMonth || 0), 0),
            statusCounts: {
                safe: instances.filter(i => i.status === 'safe').length,
                warning: instances.filter(i => i.status === 'warning').length,
                critical: instances.filter(i => i.status === 'critical').length,
            },
        };

        logger.info(`RDS Summary: ${summary.total} instances, $${summary.totalCost.toFixed(2)}/month`);
        return summary;
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        logger.error(`Error getting RDS summary: ${errorMsg}`);
        return {
            total: 0,
            regions: [],
            totalCost: 0,
            statusCounts: { safe: 0, warning: 0, critical: 0 },
        };
    }
}

/**
 * Get detailed information about a specific RDS instance
 */
export async function getRDSInstanceDetail(instanceId: string): Promise<RDSInstance | null> {
    try {
        const instances = await getRDSInstances(undefined, 1, 100);
        return instances.find(i => i.id === instanceId) || null;
    } catch (error) {
        logger.error(`Error fetching RDS instance detail: ${error}`);
        return null;
    }
}

/**
 * Get RDS cost analysis
 */
export async function getRDSCostAnalysis(): Promise<{
    totalMonthly: number
    byEngine: Record<string, number>
    byRegion: Record<string, number>
}> {
    try {
        const instances = await getRDSInstances(undefined, 1, 100);
        
        const analysis = {
            totalMonthly: 0,
            byEngine: {} as Record<string, number>,
            byRegion: {} as Record<string, number>,
        };

        for (const instance of instances) {
            const cost = instance.costPerMonth || 0;
            analysis.totalMonthly += cost;
            
            analysis.byEngine[instance.engine] = (analysis.byEngine[instance.engine] || 0) + cost;
            analysis.byRegion[instance.region] = (analysis.byRegion[instance.region] || 0) + cost;
        }

        return analysis;
    } catch (error) {
        logger.error(`Error analyzing RDS costs: ${error}`);
        return {
            totalMonthly: 0,
            byEngine: {},
            byRegion: {},
        };
    }
}

