"""
Pydantic Schemas for API Validation
Centralized data validation for all API endpoints
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class UserRoleEnum(str, Enum):
    """User roles"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class ResourceStatusEnum(str, Enum):
    """Resource status"""
    SAFE = "safe"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertTypeEnum(str, Enum):
    """Alert types"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class SeverityEnum(str, Enum):
    """Severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ============================================================================
# RESOURCE SCHEMAS
# ============================================================================

class ResourceSchema(BaseModel):
    """Resource data model"""
    id: str
    name: str
    type: str
    region: str
    status: ResourceStatusEnum
    value: str
    description: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ResourceListSchema(BaseModel):
    """Paginated resource list"""
    items: List[ResourceSchema]
    total: int
    limit: int
    offset: int
    has_more: bool


# ============================================================================
# ALERT SCHEMAS
# ============================================================================

class AlertSchema(BaseModel):
    """Alert data model"""
    id: str
    type: AlertTypeEnum
    title: str
    description: str
    time: str
    timestamp: str
    severity: Optional[SeverityEnum] = None
    resource_id: Optional[str] = None
    resource_type: Optional[str] = None
    
    class Config:
        from_attributes = True


class AlertListSchema(BaseModel):
    """Paginated alert list"""
    items: List[AlertSchema]
    total: int
    limit: int
    offset: int
    has_more: bool


# ============================================================================
# ACTIVITY SCHEMAS
# ============================================================================

class ActivitySchema(BaseModel):
    """Activity/audit log data model"""
    id: str
    action: str
    resource: str
    time: str
    user: str
    timestamp: str
    event_type: str
    region: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class ActivityListSchema(BaseModel):
    """Paginated activity list"""
    items: List[ActivitySchema]
    total: int
    limit: int
    offset: int
    has_more: bool


# ============================================================================
# COST SCHEMAS
# ============================================================================

class CostDataSchema(BaseModel):
    """Cost data point"""
    month: str
    cost: float
    currency: Optional[str] = "USD"
    breakdown: Optional[Dict[str, float]] = None


class CostSummarySchema(BaseModel):
    """Cost summary"""
    current_month: float
    previous_month: float
    monthly_average: float
    trend: str = Field(..., pattern="^(up|down|stable)$")
    trend_percentage: float
    currency: str = "USD"


class CostForecastSchema(BaseModel):
    """Cost forecast"""
    month: str
    predicted_cost: float
    confidence: float = Field(..., ge=0, le=100)
    factors: List[str]


# ============================================================================
# SECURITY SCHEMAS
# ============================================================================

class SecurityFindingSchema(BaseModel):
    """Security finding"""
    id: str
    title: str
    severity: SeverityEnum
    status: str
    resource_type: str
    description: str
    region: Optional[str] = None
    last_updated: Optional[datetime] = None
    remediation: Optional[str] = None
    
    class Config:
        from_attributes = True


class SecurityFindingListSchema(BaseModel):
    """Paginated security findings"""
    items: List[SecurityFindingSchema]
    total: int
    limit: int
    offset: int
    has_more: bool


class SecurityScoreSchema(BaseModel):
    """Security score"""
    overall: int = Field(..., ge=0, le=100)
    security: int = Field(..., ge=0, le=100)
    cost_efficiency: int = Field(..., ge=0, le=100)
    best_practices: int = Field(..., ge=0, le=100)
    critical_issues: int = Field(..., ge=0)
    recommendations: List[str]


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserSchema(BaseModel):
    """User data model"""
    id: str
    email: EmailStr
    name: str
    role: UserRoleEnum
    status: str = Field(..., pattern="^(active|inactive|suspended)$")
    created_at: datetime
    last_login: Optional[datetime] = None
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserListSchema(BaseModel):
    """Paginated user list"""
    items: List[UserSchema]
    total: int
    limit: int
    offset: int
    has_more: bool


class CreateUserSchema(BaseModel):
    """Create user request"""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: UserRoleEnum
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        if not any(c in '!@#$%^&*' for c in v):
            raise ValueError('Password must contain special character')
        return v


class UpdateUserSchema(BaseModel):
    """Update user request"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[UserRoleEnum] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|suspended)$")


# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class LoginSchema(BaseModel):
    """Login request"""
    email: EmailStr
    password: str


class LoginResponseSchema(BaseModel):
    """Login response"""
    success: bool
    token: str
    refresh_token: str
    user: UserSchema
    expires_in: int


class RefreshTokenSchema(BaseModel):
    """Refresh token request"""
    refresh_token: str


class RefreshTokenResponseSchema(BaseModel):
    """Refresh token response"""
    success: bool
    token: str
    expires_in: int


# ============================================================================
# ACCOUNT SCHEMAS
# ============================================================================

class AccountSchema(BaseModel):
    """AWS account"""
    id: str
    name: str
    account_id: str
    region: str
    status: str = Field(..., pattern="^(connected|disconnected|error)$")
    created_at: datetime
    last_sync: Optional[datetime] = None
    resource_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class AccountListSchema(BaseModel):
    """Account list"""
    items: List[AccountSchema]
    total: int


class ConnectAccountSchema(BaseModel):
    """Connect AWS account request"""
    name: str = Field(..., min_length=1, max_length=255)
    access_key_id: str = Field(..., min_length=20, max_length=20)
    secret_access_key: str = Field(..., min_length=40, max_length=40)
    region: str


# ============================================================================
# PAGINATION SCHEMAS
# ============================================================================

class PaginationParamsSchema(BaseModel):
    """Pagination parameters"""
    limit: Optional[int] = Field(50, ge=1, le=1000)
    offset: Optional[int] = Field(0, ge=0)
    next_token: Optional[str] = None


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorSchema(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    message: str
    status: int
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime


class ValidationErrorSchema(ErrorSchema):
    """Validation error response"""
    errors: Dict[str, List[str]]


# ============================================================================
# API RESPONSE SCHEMAS
# ============================================================================

class ApiResponseSchema(BaseModel):
    """Generic API response"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    status: int
    timestamp: datetime


class ApiListResponseSchema(BaseModel):
    """API list response"""
    success: bool
    data: Dict[str, Any]
    status: int
    timestamp: datetime


# ============================================================================
# FILTER SCHEMAS
# ============================================================================

class FilterSchema(BaseModel):
    """Query filter"""
    field: str
    operator: str = Field(..., pattern="^(eq|ne|gt|gte|lt|lte|in|contains)$")
    value: Any


class SortSchema(BaseModel):
    """Sort specification"""
    field: str
    direction: str = Field(..., pattern="^(asc|desc)$")


class QuerySchema(BaseModel):
    """Query specification"""
    filters: Optional[List[FilterSchema]] = None
    sort: Optional[List[SortSchema]] = None
    pagination: Optional[PaginationParamsSchema] = None


# ============================================================================
# EXPORT SCHEMAS
# ============================================================================

class ExportRequestSchema(BaseModel):
    """Export request"""
    format: str = Field(..., pattern="^(pdf|csv|json)$")
    type: str = Field(..., pattern="^(resources|costs|security|audit)$")
    filters: Optional[List[FilterSchema]] = None
    date_range: Optional[Dict[str, str]] = None


class ExportResponseSchema(BaseModel):
    """Export response"""
    success: bool
    download_url: str
    filename: str
    size: int
    expires_at: datetime


# ============================================================================
# WEBHOOK SCHEMAS
# ============================================================================

class WebhookSchema(BaseModel):
    """Webhook"""
    id: str
    name: str
    url: str
    events: List[str]
    active: bool
    created_at: datetime
    last_triggered: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CreateWebhookSchema(BaseModel):
    """Create webhook request"""
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., pattern="^https://")
    events: List[str] = Field(..., min_items=1)


# ============================================================================
# NOTIFICATION SCHEMAS
# ============================================================================

class NotificationSchema(BaseModel):
    """Notification"""
    id: str
    type: str = Field(..., pattern="^(alert|info|warning|error)$")
    title: str
    message: str
    read: bool
    created_at: datetime
    action_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class NotificationListSchema(BaseModel):
    """Notification list"""
    items: List[NotificationSchema]
    unread_count: int
    total: int
