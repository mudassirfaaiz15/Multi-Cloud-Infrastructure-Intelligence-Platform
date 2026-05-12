"""
Backend Constants
Centralized constants for backend services
"""

from enum import Enum
from typing import Dict, List

# ============================================================================
# AWS CONSTANTS
# ============================================================================

AWS_REGIONS = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-central-1', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'ca-central-1', 'sa-east-1',
]

AWS_SERVICES = {
    'ec2': 'Elastic Compute Cloud',
    'rds': 'Relational Database Service',
    's3': 'Simple Storage Service',
    'lambda': 'Lambda',
    'iam': 'Identity and Access Management',
    'cloudtrail': 'CloudTrail',
    'securityhub': 'Security Hub',
    'cloudwatch': 'CloudWatch',
    'dynamodb': 'DynamoDB',
    'elasticache': 'ElastiCache',
}

AWS_RESOURCE_TYPES = [
    'ec2', 'rds', 's3', 'lambda', 'iam', 'dynamodb',
    'elasticache', 'elb', 'alb', 'nlb', 'ebs', 'efs',
]

# ============================================================================
# SECURITY CONSTANTS
# ============================================================================

class SecurityLevel(Enum):
    """Security severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


SECURITY_SEVERITY_SCORES = {
    SecurityLevel.CRITICAL: 100,
    SecurityLevel.HIGH: 75,
    SecurityLevel.MEDIUM: 50,
    SecurityLevel.LOW: 25,
    SecurityLevel.INFO: 10,
}

# ============================================================================
# COST CONSTANTS
# ============================================================================

COST_THRESHOLDS = {
    'daily_alert': 100.0,
    'weekly_alert': 500.0,
    'monthly_alert': 2000.0,
}

COST_CATEGORIES = [
    'compute',
    'storage',
    'database',
    'networking',
    'analytics',
    'management',
    'other',
]

# ============================================================================
# API CONSTANTS
# ============================================================================

API_VERSION = "v1"
API_TIMEOUT_SECONDS = 30
API_MAX_RETRIES = 3
API_RETRY_DELAY_MS = 1000

# ============================================================================
# PAGINATION CONSTANTS
# ============================================================================

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 1000
MIN_PAGE_SIZE = 1

# ============================================================================
# CACHE CONSTANTS
# ============================================================================

CACHE_TTL_SECONDS = {
    'resources': 300,  # 5 minutes
    'costs': 3600,  # 1 hour
    'security': 600,  # 10 minutes
    'audit_logs': 1800,  # 30 minutes
}

# ============================================================================
# LOGGING CONSTANTS
# ============================================================================

LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']

LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# ============================================================================
# DATABASE CONSTANTS
# ============================================================================

DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 40
DB_POOL_RECYCLE = 3600

# ============================================================================
# JWT CONSTANTS
# ============================================================================

JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
JWT_REFRESH_EXPIRATION_DAYS = 30

# ============================================================================
# FEATURE FLAGS
# ============================================================================

CORE_FEATURES = [
    'aws_integration',
    'claude_ai',
    'cost_analysis',
    'security_audit',
    'cloudtrail_monitoring',
]

EXPERIMENTAL_FEATURES = [
    'gcp_support',
    'azure_support',
    'websocket_streaming',
    'advanced_anomaly_detection',
    'multi_llm_support',
]

ROADMAP_FEATURES = [
    'terraform_integration',
    'kubernetes_monitoring',
    'slack_integration',
    'advanced_compliance_reporting',
    'mobile_app',
]

# ============================================================================
# ALERT CONSTANTS
# ============================================================================

ALERT_TYPES = [
    'cost_spike',
    'security_finding',
    'resource_utilization',
    'compliance_violation',
    'anomaly_detected',
]

ALERT_CHANNELS = [
    'email',
    'slack',
    'webhook',
    'in_app',
]

# ============================================================================
# AUDIT CONSTANTS
# ============================================================================

AUDIT_ACTIONS = [
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'share',
]

# ============================================================================
# ROLE CONSTANTS
# ============================================================================

class UserRole(Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        'read_all',
        'write_all',
        'delete_all',
        'manage_users',
        'manage_settings',
        'export_data',
    ],
    UserRole.EDITOR: [
        'read_all',
        'write_own',
        'export_data',
    ],
    UserRole.VIEWER: [
        'read_all',
        'export_data',
    ],
}

# ============================================================================
# RESPONSE CONSTANTS
# ============================================================================

HTTP_STATUS_CODES = {
    'success': 200,
    'created': 201,
    'bad_request': 400,
    'unauthorized': 401,
    'forbidden': 403,
    'not_found': 404,
    'conflict': 409,
    'internal_error': 500,
    'service_unavailable': 503,
}

# ============================================================================
# VALIDATION CONSTANTS
# ============================================================================

VALIDATION_RULES = {
    'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    'password_min_length': 8,
    'password_require_uppercase': True,
    'password_require_numbers': True,
    'password_require_special': True,
}

# ============================================================================
# TIME CONSTANTS
# ============================================================================

SECONDS_PER_MINUTE = 60
SECONDS_PER_HOUR = 3600
SECONDS_PER_DAY = 86400
SECONDS_PER_WEEK = 604800
SECONDS_PER_MONTH = 2592000

# ============================================================================
# METRIC CONSTANTS
# ============================================================================

METRIC_AGGREGATIONS = [
    'sum',
    'average',
    'minimum',
    'maximum',
    'count',
]

METRIC_PERIODS = [
    '1m',
    '5m',
    '15m',
    '1h',
    '1d',
    '1w',
    '1mo',
]
