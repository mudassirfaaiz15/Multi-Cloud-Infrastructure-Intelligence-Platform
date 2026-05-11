/**
 * Lambda Service - Real AWS Integration via Backend API
 * 
 * ARCHITECTURE:
 * Frontend calls → awsApiClient.getLambdaFunctions() → Backend Flask API
 * Backend → boto3 lambda_client → Real AWS API → Transform to DTOs → Response
 * 
 * Features:
 * - Real Lambda function listing
 * - CloudWatch metrics integration
 * - Error rate and duration analysis
 * - Cost estimation per invocation
 * - Memory optimization recommendations
 * - Concurrent execution limits
 */

import { logger } from '@/lib/utils/logger';
import { awsApiClient, LambdaFunction as APILambdaFunction, PaginatedResponse, getErrorMessage } from '@/lib/api/aws-client';

/**
 * Frontend Lambda function interface - matches backend DTO
 */
export interface LambdaFunction {
    id: string;
    name: string;
    runtime: string;
    status: 'safe' | 'warning' | 'critical';
    memory: number;
    timeout: number;
    region: string;
    description: string;
    costPerMonth?: number;
    handler: string;
    codeSize?: number;
    lastModified?: string;
    metrics?: {
        invocations?: number;
        errors?: number;
        duration?: number; // Average duration in ms
        throttles?: number;
        concurrentExecutions?: number;
    };
    environment?: {
        variables: Record<string, string>;
    };
    environment_encrypted?: boolean;
}

/**
 * Lambda cost breakdown
 */
export interface LambdaCostAnalysis {
    totalMonthly: number;
    byRuntime: Record<string, number>;
    byRegion: Record<string, number>;
    topExpensive: Array<{ name: string; runtime: string; cost: number }>;
    estimatedInvocations: number;
    optimizationOpportunities: Array<{
        functionName: string;
        opportunity: string;
        estimatedSavings: number;
    }>;
}

/**
 * Lambda summary statistics
 */
export interface LambdaSummary {
    total: number;
    activeStatus: {
        safe: number;
        warning: number;
        critical: number;
    };
    totalCost: number;
    regions: string[];
    runtimeBreakdown: Record<string, number>;
    totalInvocations: number;
    totalErrors: number;
}

/**
 * Fetch Lambda functions from backend API
 * 
 * Enterprise features:
 * - Real AWS Lambda API calls
 * - CloudWatch metrics integration
 * - Pagination support
 * - Region filtering
 * - Error rate tracking
 * - Memory and timeout info
 * 
 * @param region Optional region filter
 * @param page Page number (default: 1)
 * @param pageSize Items per page (default: 50)
 * @returns Promise<LambdaFunction[]>
 */
export async function getLambdaFunctions(
    region?: string,
    page = 1,
    pageSize = 50
): Promise<LambdaFunction[]> {
    try {
        const logMsg = region 
            ? `Fetching Lambda functions from ${region}` 
            : 'Fetching Lambda functions across all regions';
        logger.info(logMsg);

        // Call backend API with JWT authentication
        const response = await awsApiClient.getLambdaFunctions(region, page, pageSize);

        // Transform backend response to frontend format
        const functions: LambdaFunction[] = (response.items || []).map((func: any) => ({
            id: func.function_name,
            name: func.function_name,
            runtime: func.runtime,
            status: func.status as 'safe' | 'warning' | 'critical',
            memory: func.memory_size,
            timeout: func.timeout,
            region: func.region,
            description: func.description || 'No description',
            costPerMonth: func.cost_per_month,
            handler: func.handler,
            codeSize: func.code_size,
            lastModified: func.last_modified,
            metrics: {
                invocations: func.invocations,
                errors: func.errors,
                duration: func.average_duration,
                throttles: func.throttles,
                concurrentExecutions: func.concurrent_executions,
            },
            environment: {
                variables: func.environment_variables || {},
            },
            environment_encrypted: func.environment_encrypted,
        }));

        logger.info(`Successfully fetched ${functions.length} Lambda functions`);
        return functions;
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        logger.error(`Error fetching Lambda functions: ${errorMsg}`);
        throw new Error(`Failed to fetch Lambda functions: ${errorMsg}`);
    }
}

/**
 * Get Lambda function summary statistics
 * 
 * Useful for dashboard overview:
 * - Total function count
 * - Health status breakdown
 * - Total monthly cost
 * - Runtime distribution
 * - Invocation metrics
 */
export async function getLambdaSummary(region?: string): Promise<LambdaSummary> {
    try {
        const functions = await getLambdaFunctions(region, 1, 200);

        const runtimeBreakdown: Record<string, number> = {};
        let totalInvocations = 0;
        let totalErrors = 0;

        functions.forEach(func => {
            runtimeBreakdown[func.runtime] = (runtimeBreakdown[func.runtime] || 0) + 1;
            totalInvocations += func.metrics?.invocations || 0;
            totalErrors += func.metrics?.errors || 0;
        });

        const summary: LambdaSummary = {
            total: functions.length,
            activeStatus: {
                safe: functions.filter(f => f.status === 'safe').length,
                warning: functions.filter(f => f.status === 'warning').length,
                critical: functions.filter(f => f.status === 'critical').length,
            },
            totalCost: functions.reduce((sum, f) => sum + (f.costPerMonth || 0), 0),
            regions: [...new Set(functions.map(f => f.region))],
            runtimeBreakdown,
            totalInvocations,
            totalErrors,
        };

        logger.info(
            `Lambda Summary: ${summary.total} functions, ` +
            `$${summary.totalCost.toFixed(2)}/month, ` +
            `${summary.totalInvocations} invocations`
        );
        return summary;
    } catch (error) {
        logger.error(`Error getting Lambda summary: ${error}`);
        return {
            total: 0,
            activeStatus: { safe: 0, warning: 0, critical: 0 },
            totalCost: 0,
            regions: [],
            runtimeBreakdown: {},
            totalInvocations: 0,
            totalErrors: 0,
        };
    }
}

/**
 * Get high-error Lambda functions (troubleshooting candidates)
 * 
 * Threshold: Functions with error rate > 1%
 */
export async function getHighErrorFunctions(): Promise<LambdaFunction[]> {
    try {
        const functions = await getLambdaFunctions(undefined, 1, 200);
        
        return functions
            .filter(f => {
                const invocations = f.metrics?.invocations || 1;
                const errors = f.metrics?.errors || 0;
                const errorRate = errors / invocations;
                return errorRate > 0.01; // More than 1% error rate
            })
            .sort((a, b) => {
                const aErrors = a.metrics?.errors || 0;
                const bErrors = b.metrics?.errors || 0;
                return bErrors - aErrors;
            });
    } catch (error) {
        logger.error(`Error fetching high-error functions: ${error}`);
        return [];
    }
}

/**
 * Get slow Lambda functions (performance concerns)
 * 
 * Threshold: Average duration > 10 seconds
 */
export async function getSlowFunctions(): Promise<LambdaFunction[]> {
    try {
        const functions = await getLambdaFunctions(undefined, 1, 200);
        
        return functions
            .filter(f => (f.metrics?.duration || 0) > 10000) // > 10 seconds
            .sort((a, b) => (b.metrics?.duration || 0) - (a.metrics?.duration || 0));
    } catch (error) {
        logger.error(`Error fetching slow functions: ${error}`);
        return [];
    }
}

/**
 * Get high-cost Lambda functions
 * 
 * Threshold: $100/month
 */
export async function getHighCostFunctions(threshold: number = 100): Promise<LambdaFunction[]> {
    try {
        const functions = await getLambdaFunctions(undefined, 1, 200);
        
        return functions
            .filter(f => (f.costPerMonth || 0) > threshold)
            .sort((a, b) => (b.costPerMonth || 0) - (a.costPerMonth || 0));
    } catch (error) {
        logger.error(`Error fetching high-cost functions: ${error}`);
        return [];
    }
}

/**
 * Get Lambda cost analysis
 * 
 * Includes:
 * - Total monthly cost
 * - Breakdown by runtime
 * - Breakdown by region
 * - Top expensive functions
 * - Optimization opportunities
 */
export async function getLambdaCostAnalysis(region?: string): Promise<LambdaCostAnalysis> {
    try {
        const functions = await getLambdaFunctions(region, 1, 200);

        const analysis: LambdaCostAnalysis = {
            totalMonthly: 0,
            byRuntime: {},
            byRegion: {},
            topExpensive: [],
            estimatedInvocations: 0,
            optimizationOpportunities: [],
        };

        const costByFunction: Array<{ name: string; runtime: string; cost: number }> = [];

        for (const func of functions) {
            const cost = func.costPerMonth || 0;
            analysis.totalMonthly += cost;
            analysis.estimatedInvocations += func.metrics?.invocations || 0;

            // By runtime
            analysis.byRuntime[func.runtime] = (analysis.byRuntime[func.runtime] || 0) + cost;

            // By region
            analysis.byRegion[func.region] = (analysis.byRegion[func.region] || 0) + cost;

            costByFunction.push({
                name: func.name,
                runtime: func.runtime,
                cost,
            });

            // Find optimization opportunities
            if (func.metrics?.errors && func.metrics.errors > 0) {
                analysis.optimizationOpportunities.push({
                    functionName: func.name,
                    opportunity: `High error rate (${func.metrics.errors} errors)`,
                    estimatedSavings: cost * 0.2, // Assume 20% savings with fixes
                });
            }

            if ((func.metrics?.duration || 0) > func.timeout * 900) {
                analysis.optimizationOpportunities.push({
                    functionName: func.name,
                    opportunity: `Approaching timeout (${func.metrics?.duration}ms vs ${func.timeout}s limit)`,
                    estimatedSavings: cost * 0.15,
                });
            }
        }

        analysis.topExpensive = costByFunction
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10);

        logger.info(`Lambda Cost Analysis: $${analysis.totalMonthly.toFixed(2)}/month`);
        return analysis;
    } catch (error) {
        logger.error(`Error analyzing Lambda costs: ${error}`);
        return {
            totalMonthly: 0,
            byRuntime: {},
            byRegion: {},
            topExpensive: [],
            estimatedInvocations: 0,
            optimizationOpportunities: [],
        };
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

