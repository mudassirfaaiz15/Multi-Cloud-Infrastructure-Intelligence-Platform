import { isDemoMode } from '@/lib/supabase';
import { handleApiError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

// Types
export interface AIResponse {
    success: boolean;
    answer: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    timestamp: string;
    fallback?: boolean;
}

export interface AIUsageStats {
    success: boolean;
    provider: string;
    period_days: number;
    api_calls: number;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    monthly_forecast_usd: number;
    model_breakdown: Record<string, {
        api_calls: number;
        input_tokens: number;
        output_tokens: number;
        cost: number;
    }>;
    monthly_trend: Array<{
        month: string;
        year: number;
        api_calls: number;
        tokens: number;
        cost: number;
    }>;
    timestamp: string;
    demo_mode?: boolean;
}

const API_BASE_URL = 'http://localhost:5000';
const API_KEY = 'demo-key';

/**
 * Generate demo response for development
 */
function generateDemoResponse(question: string): AIResponse {
    const questionLower = question.toLowerCase();
    let answer = 'I can help analyze your cloud costs, identify savings opportunities, explain anomalies, or review security posture. Try asking about specific services or concerns.';

    if (questionLower.includes('anomaly') || questionLower.includes('spike')) {
        answer = 'The anomaly on Mar 10 was caused by an EC2 Auto Scaling event that launched 18 additional instances during a traffic surge in us-east-1. Root cause: misconfigured CloudWatch alarm. Recommendation: configure 300s scaling cooldown.';
    } else if (questionLower.includes('savings') || questionLower.includes('reduce') || questionLower.includes('save')) {
        answer = 'Top 3 savings opportunities:\n1. Downsize idle EC2 (t3.xlarge → t3.medium) — $380/mo\n2. Enable S3 Intelligent-Tiering — $94/mo\n3. Delete unattached EBS volumes — $15/mo\n\nTotal potential: $489/month';
    } else if (questionLower.includes('ec2') || questionLower.includes('compute')) {
        answer = 'EC2 is your largest cost at $2,140/mo (41%). 23% of instances have <10% CPU utilization. Review right-sizing opportunities in us-east-1 first.';
    } else if (questionLower.includes('s3') || questionLower.includes('storage')) {
        answer = 'S3 costs $295/mo across 18 buckets. 3 unused buckets (90+ days) are Glacier candidates. Lifecycle policies could save ~$60/mo.';
    } else if (questionLower.includes('forecast') || questionLower.includes('predict')) {
        answer = 'Month-end forecast: $5,610 (+6.4% vs budget of $5,274). Overrun driven by BigQuery at 3.5× budget — optimize queries.';
    } else if (questionLower.includes('cost') || questionLower.includes('spend') || questionLower.includes('driver')) {
        answer = 'Top cost drivers:\n1. EC2 — $2,140 (41%)\n2. RDS — $640 (12%)\n3. BigQuery — $890 (17%)\n4. S3 — $295 (6%)\n5. Claude AI — $312 (6%)';
    } else if (questionLower.includes('security') || questionLower.includes('iam')) {
        answer = 'Security findings:\n• 2 S3 buckets with public ACL\n• 1 IAM role with overly broad permissions\n• CloudTrail disabled in 1 region\n\nAll MEDIUM severity. Remediation scripts available.';
    }

    return {
        success: true,
        answer,
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        timestamp: new Date().toISOString(),
        fallback: true,
    };
}

/**
 * Query the AI chat endpoint
 */
export async function queryAIChat(
    question: string,
    context?: Record<string, unknown>
): Promise<AIResponse> {
    try {
        if (isDemoMode) {
            return generateDemoResponse(question);
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify({
                question,
                context: context || {},
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(error.error || `API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.data) {
            return data.data;
        }

        throw new Error(data.error || 'Unknown API error');
    } catch (error) {
        logger.error(`AI chat error: ${error}`);
        return handleApiError(error) as any;
    }
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(days: number = 30): Promise<AIUsageStats> {
    try {
        if (isDemoMode) {
            return generateDemoUsageStats();
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/ai/usage?days=${days}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(error.error || `API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.data) {
            return data.data;
        }

        throw new Error(data.error || 'Unknown API error');
    } catch (error) {
        logger.error(`AI usage stats error: ${error}`);
        return handleApiError(error) as any;
    }
}

/**
 * Generate demo usage stats for development
 */
function generateDemoUsageStats(): AIUsageStats {
    return {
        success: true,
        provider: 'anthropic',
        period_days: 30,
        api_calls: 3210,
        total_tokens: 9_340_000,
        input_tokens: 6_724_800,
        output_tokens: 2_615_200,
        estimated_cost_usd: 52.6,
        monthly_forecast_usd: 56.81,
        model_breakdown: {
            'claude-3-5-sonnet-20241022': {
                api_calls: 2100,
                input_tokens: 5_200_000,
                output_tokens: 2_100_000,
                cost: 45.3,
            },
            'claude-3-5-haiku-20241022': {
                api_calls: 890,
                input_tokens: 1_500_000,
                output_tokens: 540_000,
                cost: 3.36,
            },
            'claude-3-opus-20240229': {
                api_calls: 220,
                input_tokens: 480_000,
                output_tokens: 220_000,
                cost: 23.7,
            },
        },
        monthly_trend: [
            { month: 'Aug', year: 2024, api_calls: 1240, tokens: 3_450_000, cost: 18.25 },
            { month: 'Sep', year: 2024, api_calls: 1580, tokens: 4_120_000, cost: 22.8 },
            { month: 'Oct', year: 2024, api_calls: 2100, tokens: 5_890_000, cost: 31.4 },
            { month: 'Nov', year: 2024, api_calls: 2450, tokens: 6_780_000, cost: 37.9 },
            { month: 'Dec', year: 2024, api_calls: 2890, tokens: 7_920_000, cost: 45.1 },
            { month: 'Jan', year: 2025, api_calls: 3210, tokens: 9_340_000, cost: 52.6 },
        ],
        timestamp: new Date().toISOString(),
        demo_mode: true,
    };
}
