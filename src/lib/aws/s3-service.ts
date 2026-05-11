/**
 * S3 Service - Real AWS Integration via Backend API
 * 
 * ARCHITECTURE:
 * Frontend calls → awsApiClient.getS3Buckets() → Backend Flask API
 * Backend → boto3 s3_client → Real AWS S3 API → Transform to DTOs → Response
 * 
 * Enterprise Features:
 * - Real S3 bucket enumeration
 * - Encryption status verification
 * - Public access block analysis
 * - Versioning configuration
 * - Lifecycle policy detection
 * - Cost estimation per bucket
 * - Security findings generation
 */

import { logger } from '@/lib/utils/logger';
import { awsApiClient, S3Bucket as APIS3Bucket, PaginatedResponse, getErrorMessage } from '@/lib/api/aws-client';

/**
 * Frontend S3 Bucket interface - matches backend DTO
 */
export interface S3Bucket {
    name: string;
    region: string;
    createdAt?: string;
    status: 'safe' | 'warning' | 'critical';
    costPerMonth?: number;
    sizeGb: number;
    objectCount: number;
    encryption: {
        enabled: boolean;
        algorithm?: string;
        keyId?: string;
    };
    versioning: {
        enabled: boolean;
        mfaDelete?: boolean;
    };
    publicAccess: {
        blockPublicAcls: boolean;
        blockPublicPolicy: boolean;
        ignorePublicAcls: boolean;
        restrictPublicBuckets: boolean;
    };
    lifecycle: {
        rulesCount: number;
        enabled: boolean;
    };
    replication?: {
        enabled: boolean;
        targetBuckets?: string[];
    };
    tags?: Record<string, string>;
}

/**
 * S3 cost breakdown
 */
export interface S3CostAnalysis {
    totalMonthly: number;
    storageByRegion: Record<string, number>;
    storageByClass: Record<string, number>;
    requestCosts: number;
    transferCosts: number;
    topBuckets: Array<{ name: string; cost: number; sizeGb: number }>;
    optimizationOpportunities: Array<{
        bucketName: string;
        opportunity: string;
        estimatedSavings: number;
    }>;
}

/**
 * S3 security findings
 */
export interface S3SecurityFinding {
    bucketName: string;
    finding: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
    compliance: string;
}

/**
 * Fetch S3 buckets from backend API
 * 
 * @param page Page number (default: 1)
 * @param pageSize Items per page (default: 50)
 * @returns Promise<S3Bucket[]>
 */
export async function getS3Buckets(
    page = 1,
    pageSize = 50
): Promise<S3Bucket[]> {
    try {
        logger.info('Fetching S3 buckets');

        const response = await awsApiClient.getS3Buckets(page, pageSize);

        const buckets: S3Bucket[] = (response.items || []).map((bucket: any) => ({
            name: bucket.bucket_name,
            region: bucket.region,
            createdAt: bucket.creation_date,
            status: bucket.status as 'safe' | 'warning' | 'critical',
            costPerMonth: bucket.cost_per_month,
            sizeGb: bucket.size_gb,
            objectCount: bucket.object_count,
            encryption: {
                enabled: bucket.encryption?.sse_algorithm ? true : false,
                algorithm: bucket.encryption?.sse_algorithm,
                keyId: bucket.encryption?.kms_master_key,
            },
            versioning: {
                enabled: bucket.versioning_enabled,
                mfaDelete: bucket.versioning_mfa_delete,
            },
            publicAccess: {
                blockPublicAcls: bucket.public_access_block?.block_public_acls ?? true,
                blockPublicPolicy: bucket.public_access_block?.block_public_policy ?? true,
                ignorePublicAcls: bucket.public_access_block?.ignore_public_acls ?? true,
                restrictPublicBuckets: bucket.public_access_block?.restrict_public_buckets ?? true,
            },
            lifecycle: {
                rulesCount: bucket.lifecycle_rules || 0,
                enabled: (bucket.lifecycle_rules || 0) > 0,
            },
            replication: bucket.replication_enabled ? {
                enabled: true,
                targetBuckets: bucket.replication_targets,
            } : undefined,
            tags: bucket.tags || {},
        }));

        logger.info(`Successfully fetched ${buckets.length} S3 buckets`);
        return buckets;
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        logger.error(`Error fetching S3 buckets: ${errorMsg}`);
        throw new Error(`Failed to fetch S3 buckets: ${errorMsg}`);
    }
}

/**
 * Get S3 summary statistics
 */
export async function getS3Summary(): Promise<{
    totalBuckets: number;
    totalSize: number;
    totalObjects: number;
    totalCost: number;
    encryptedBuckets: number;
    versioningEnabled: number;
    publiclyAccessible: number;
    statusCounts: {
        safe: number;
        warning: number;
        critical: number;
    };
}> {
    try {
        const buckets = await getS3Buckets(1, 100);

        const summary = {
            totalBuckets: buckets.length,
            totalSize: buckets.reduce((sum, b) => sum + b.sizeGb, 0),
            totalObjects: buckets.reduce((sum, b) => sum + b.objectCount, 0),
            totalCost: buckets.reduce((sum, b) => sum + (b.costPerMonth || 0), 0),
            encryptedBuckets: buckets.filter(b => b.encryption.enabled).length,
            versioningEnabled: buckets.filter(b => b.versioning.enabled).length,
            publiclyAccessible: buckets.filter(b => 
                !b.publicAccess.blockPublicAcls || 
                !b.publicAccess.blockPublicPolicy
            ).length,
            statusCounts: {
                safe: buckets.filter(b => b.status === 'safe').length,
                warning: buckets.filter(b => b.status === 'warning').length,
                critical: buckets.filter(b => b.status === 'critical').length,
            },
        };

        logger.info(`S3 Summary: ${summary.totalBuckets} buckets, ${summary.totalSize}GB, $${summary.totalCost.toFixed(2)}/month`);
        return summary;
    } catch (error) {
        logger.error(`Error getting S3 summary: ${error}`);
        return {
            totalBuckets: 0,
            totalSize: 0,
            totalObjects: 0,
            totalCost: 0,
            encryptedBuckets: 0,
            versioningEnabled: 0,
            publiclyAccessible: 0,
            statusCounts: { safe: 0, warning: 0, critical: 0 },
        };
    }
}

/**
 * Get S3 security findings
 */
export async function getS3SecurityFindings(): Promise<S3SecurityFinding[]> {
    try {
        const buckets = await getS3Buckets(1, 100);
        const findings: S3SecurityFinding[] = [];

        for (const bucket of buckets) {
            // Check for unencrypted buckets
            if (!bucket.encryption.enabled) {
                findings.push({
                    bucketName: bucket.name,
                    finding: 'Bucket is not encrypted',
                    severity: 'high',
                    recommendation: 'Enable default encryption (SSE-S3 or SSE-KMS)',
                    compliance: 'PCI-DSS, HIPAA',
                });
            }

            // Check for public access
            if (!bucket.publicAccess.blockPublicAcls || !bucket.publicAccess.blockPublicPolicy) {
                findings.push({
                    bucketName: bucket.name,
                    finding: 'Bucket has public access settings not fully blocked',
                    severity: 'critical',
                    recommendation: 'Enable all Public Access Block options',
                    compliance: 'AWS Best Practice',
                });
            }

            // Check for versioning
            if (!bucket.versioning.enabled) {
                findings.push({
                    bucketName: bucket.name,
                    finding: 'Versioning not enabled',
                    severity: 'medium',
                    recommendation: 'Enable versioning for data protection',
                    compliance: 'Data Protection',
                });
            }

            // Check for large unversioned buckets
            if (!bucket.versioning.enabled && bucket.sizeGb > 1000) {
                findings.push({
                    bucketName: bucket.name,
                    finding: 'Large unversioned bucket (1TB+)',
                    severity: 'medium',
                    recommendation: 'Enable versioning or implement lifecycle policies',
                    compliance: 'Best Practice',
                });
            }
        }

        return findings.sort((a, b) => {
            const severity = { critical: 3, high: 2, medium: 1, low: 0 };
            return (severity[b.severity as keyof typeof severity] || 0) - 
                   (severity[a.severity as keyof typeof severity] || 0);
        });
    } catch (error) {
        logger.error(`Error getting S3 security findings: ${error}`);
        return [];
    }
}

/**
 * Get S3 cost analysis
 */
export async function getS3CostAnalysis(): Promise<S3CostAnalysis> {
    try {
        const buckets = await getS3Buckets(1, 100);

        const analysis: S3CostAnalysis = {
            totalMonthly: 0,
            storageByRegion: {},
            storageByClass: {},
            requestCosts: 0,
            transferCosts: 0,
            topBuckets: [],
            optimizationOpportunities: [],
        };

        const costByBucket: Array<{ name: string; cost: number; sizeGb: number }> = [];

        for (const bucket of buckets) {
            const cost = bucket.costPerMonth || 0;
            analysis.totalMonthly += cost;

            // By region
            analysis.storageByRegion[bucket.region] = 
                (analysis.storageByRegion[bucket.region] || 0) + cost;

            // Estimate by storage class
            analysis.storageByClass['Standard'] = 
                (analysis.storageByClass['Standard'] || 0) + cost * 0.7;

            costByBucket.push({
                name: bucket.name,
                cost,
                sizeGb: bucket.sizeGb,
            });

            // Optimization opportunities
            if (!bucket.lifecycle.enabled && bucket.sizeGb > 500) {
                analysis.optimizationOpportunities.push({
                    bucketName: bucket.name,
                    opportunity: 'Large bucket without lifecycle policies',
                    estimatedSavings: cost * 0.2,
                });
            }

            if (bucket.objectCount > 1000000 && !bucket.versioning.enabled) {
                analysis.optimizationOpportunities.push({
                    bucketName: bucket.name,
                    opportunity: 'High object count without versioning',
                    estimatedSavings: cost * 0.1,
                });
            }
        }

        analysis.topBuckets = costByBucket
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10);

        logger.info(`S3 Cost Analysis: $${analysis.totalMonthly.toFixed(2)}/month`);
        return analysis;
    } catch (error) {
        logger.error(`Error analyzing S3 costs: ${error}`);
        return {
            totalMonthly: 0,
            storageByRegion: {},
            storageByClass: {},
            requestCosts: 0,
            transferCosts: 0,
            topBuckets: [],
            optimizationOpportunities: [],
        };
    }
}

/**
 * Get unencrypted buckets (security risk)
 */
export async function getUnencryptedBuckets(): Promise<S3Bucket[]> {
    try {
        const buckets = await getS3Buckets(1, 100);
        return buckets.filter(b => !b.encryption.enabled);
    } catch (error) {
        logger.error(`Error fetching unencrypted buckets: ${error}`);
        return [];
    }
}

/**
 * Get publicly accessible buckets (security risk)
 */
export async function getPubliclyAccessibleBuckets(): Promise<S3Bucket[]> {
    try {
        const buckets = await getS3Buckets(1, 100);
        return buckets.filter(b => 
            !b.publicAccess.blockPublicAcls || 
            !b.publicAccess.blockPublicPolicy
        );
    } catch (error) {
        logger.error(`Error fetching publicly accessible buckets: ${error}`);
        return [];
    }
}

/**
 * Get high-cost buckets (optimization targets)
 */
export async function getHighCostBuckets(threshold: number = 1000): Promise<S3Bucket[]> {
    try {
        const buckets = await getS3Buckets(1, 100);
        return buckets
            .filter(b => (b.costPerMonth || 0) > threshold)
            .sort((a, b) => (b.costPerMonth || 0) - (a.costPerMonth || 0));
    } catch (error) {
        logger.error(`Error fetching high-cost buckets: ${error}`);
        return [];
    }
}
