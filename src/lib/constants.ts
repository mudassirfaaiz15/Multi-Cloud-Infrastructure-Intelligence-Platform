/**
 * Frontend Constants
 * Centralized constants for frontend services
 */

// ============================================================================
// API CONSTANTS
// ============================================================================

export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000';
export const API_VERSION = 'v1';
export const API_TIMEOUT_MS = 30000;
export const API_MAX_RETRIES = 3;
export const API_RETRY_DELAY_MS = 1000;

// ============================================================================
// AWS CONSTANTS
// ============================================================================

export const AWS_REGIONS = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-central-1', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'ca-central-1', 'sa-east-1',
];

export const AWS_SERVICES = {
    ec2: 'Elastic Compute Cloud',
    rds: 'Relational Database Service',
    s3: 'Simple Storage Service',
    lambda: 'Lambda',
    iam: 'Identity and Access Management',
    cloudtrail: 'CloudTrail',
    securityhub: 'Security Hub',
    cloudwatch: 'CloudWatch',
    dynamodb: 'DynamoDB',
    elasticache: 'ElastiCache',
} as const;

export const AWS_RESOURCE_TYPES = [
    'ec2', 'rds', 's3', 'lambda', 'iam', 'dynamodb',
    'elasticache', 'elb', 'alb', 'nlb', 'ebs', 'efs',
] as const;

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

export enum SecurityLevel {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
    INFO = 'info',
}

export const SECURITY_SEVERITY_SCORES: Record<SecurityLevel, number> = {
    [SecurityLevel.CRITICAL]: 100,
    [SecurityLevel.HIGH]: 75,
    [SecurityLevel.MEDIUM]: 50,
    [SecurityLevel.LOW]: 25,
    [SecurityLevel.INFO]: 10,
};

export const SECURITY_COLORS: Record<SecurityLevel, string> = {
    [SecurityLevel.CRITICAL]: '#dc2626',
    [SecurityLevel.HIGH]: '#ea580c',
    [SecurityLevel.MEDIUM]: '#f59e0b',
    [SecurityLevel.LOW]: '#eab308',
    [SecurityLevel.INFO]: '#3b82f6',
};

// ============================================================================
// COST CONSTANTS
// ============================================================================

export const COST_THRESHOLDS = {
    daily_alert: 100.0,
    weekly_alert: 500.0,
    monthly_alert: 2000.0,
};

export const COST_CATEGORIES = [
    'compute',
    'storage',
    'database',
    'networking',
    'analytics',
    'management',
    'other',
] as const;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;
export const MIN_PAGE_SIZE = 1;

// ============================================================================
// CACHE CONSTANTS
// ============================================================================

export const CACHE_TTL_MS = {
    resources: 300000,  // 5 minutes
    costs: 3600000,  // 1 hour
    security: 600000,  // 10 minutes
    audit_logs: 1800000,  // 30 minutes
};

// ============================================================================
// ALERT CONSTANTS
// ============================================================================

export const ALERT_TYPES = [
    'cost_spike',
    'security_finding',
    'resource_utilization',
    'compliance_violation',
    'anomaly_detected',
] as const;

export const ALERT_CHANNELS = [
    'email',
    'slack',
    'webhook',
    'in_app',
] as const;

// ============================================================================
// ROLE CONSTANTS
// ============================================================================

export enum UserRole {
    ADMIN = 'admin',
    EDITOR = 'editor',
    VIEWER = 'viewer',
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: [
        'read_all',
        'write_all',
        'delete_all',
        'manage_users',
        'manage_settings',
        'export_data',
    ],
    [UserRole.EDITOR]: [
        'read_all',
        'write_own',
        'export_data',
    ],
    [UserRole.VIEWER]: [
        'read_all',
        'export_data',
    ],
};

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_RULES = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_numbers: true,
    password_require_special: true,
};

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_WEEK = 604800;
export const SECONDS_PER_MONTH = 2592000;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const CORE_FEATURES = [
    'aws_integration',
    'claude_ai',
    'cost_analysis',
    'security_audit',
    'cloudtrail_monitoring',
] as const;

export const EXPERIMENTAL_FEATURES = [
    'gcp_support',
    'azure_support',
    'websocket_streaming',
    'advanced_anomaly_detection',
    'multi_llm_support',
] as const;

export const ROADMAP_FEATURES = [
    'terraform_integration',
    'kubernetes_monitoring',
    'slack_integration',
    'advanced_compliance_reporting',
    'mobile_app',
] as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const TOAST_DURATION_MS = 5000;
export const DEBOUNCE_DELAY_MS = 300;
export const ANIMATION_DURATION_MS = 300;

export const BREAKPOINTS = {
    mobile: 640,
    tablet: 1024,
    desktop: 1280,
    wide: 1536,
};

// ============================================================================
// CHART CONSTANTS
// ============================================================================

export const CHART_COLORS = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
];

export const CHART_ANIMATION_DURATION = 300;

// ============================================================================
// EXPORT CONSTANTS
// ============================================================================

export const EXPORT_FORMATS = ['pdf', 'csv', 'json'] as const;

export const EXPORT_FILENAME_TEMPLATE = 'console-sensei-{type}-{date}.{ext}';

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
    network_error: 'Network error. Please check your connection.',
    server_error: 'Server error. Please try again later.',
    unauthorized: 'Unauthorized. Please log in again.',
    forbidden: 'You do not have permission to perform this action.',
    not_found: 'Resource not found.',
    validation_error: 'Please check your input and try again.',
    unknown_error: 'An unknown error occurred. Please try again.',
};

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
    saved: 'Changes saved successfully.',
    deleted: 'Item deleted successfully.',
    created: 'Item created successfully.',
    updated: 'Item updated successfully.',
    exported: 'Data exported successfully.',
    copied: 'Copied to clipboard.',
};

// ============================================================================
// LOADING STATES
// ============================================================================

export const LOADING_STATES = {
    idle: 'idle',
    loading: 'loading',
    success: 'success',
    error: 'error',
} as const;

// ============================================================================
// METRIC CONSTANTS
// ============================================================================

export const METRIC_AGGREGATIONS = [
    'sum',
    'average',
    'minimum',
    'maximum',
    'count',
] as const;

export const METRIC_PERIODS = [
    '1m',
    '5m',
    '15m',
    '1h',
    '1d',
    '1w',
    '1mo',
] as const;
