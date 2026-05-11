"""
Database Models and Schemas for ConsoleSensei Enterprise RBAC

This module defines Pydantic models for type safety and database schemas
for Supabase integration with proper role-based access control.

Enterprise Patterns:
- Type-safe DTOs (Data Transfer Objects)
- Audit logging support
- Timestamp tracking
- Soft deletes
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict


# ============================================================================
# ENUMS - Role and Permission Definitions
# ============================================================================

class RoleType(str, Enum):
    """Enterprise role hierarchy"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class PermissionType(str, Enum):
    """Fine-grained permissions for RBAC"""
    # Resource permissions
    RESOURCE_READ = "resource:read"
    RESOURCE_MODIFY = "resource:modify"
    RESOURCE_DELETE = "resource:delete"
    
    # Cost and billing
    BILLING_READ = "billing:read"
    BILLING_MODIFY = "billing:modify"
    
    # Security operations
    SECURITY_READ = "security:read"
    SECURITY_MODIFY = "security:modify"
    
    # User and role management
    USER_READ = "user:read"
    USER_MODIFY = "user:modify"
    
    # AI operations
    AI_QUERY = "ai:query"
    AI_ADVANCED = "ai:advanced"
    
    # Audit and reporting
    AUDIT_READ = "audit:read"
    
    # Admin operations
    SYSTEM_ADMIN = "system:admin"


# ============================================================================
# DATA TRANSFER OBJECTS (DTOs)
# ============================================================================

@dataclass
class UserDTO:
    """User data transfer object"""
    id: str
    email: str
    full_name: Optional[str]
    roles: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, handling datetime serialization"""
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


@dataclass
class RoleDTO:
    """Role data transfer object"""
    id: str
    name: RoleType
    description: str
    permissions: List[PermissionType]
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else 
                [p.value for p in v] if isinstance(v, list) and v and hasattr(v[0], 'value') 
                else v 
                for k, v in asdict(self).items()}


@dataclass
class AuditLogDTO:
    """Audit log for compliance and debugging"""
    id: str
    user_id: str
    action: str  # e.g., "RESOURCE_CREATED", "POLICY_MODIFIED"
    resource_type: str  # e.g., "ec2_instance", "iam_role"
    resource_id: Optional[str]
    changes: Dict[str, Any]
    ip_address: str
    user_agent: str
    status: str  # "success", "failure"
    error_message: Optional[str]
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


# ============================================================================
# AWS SERVICE RESPONSE DTOs
# ============================================================================

@dataclass
class EC2InstanceDTO:
    """EC2 instance data transfer object"""
    instance_id: str
    instance_name: str
    instance_type: str
    state: str  # "running", "stopped", "terminated"
    private_ip: Optional[str]
    public_ip: Optional[str]
    region: str
    availability_zone: str
    launch_time: datetime
    tags: Dict[str, str]
    security_groups: List[str]
    cost_per_month: float
    status: str = "safe"  # "safe", "warning", "critical"
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


@dataclass
class RDSInstanceDTO:
    """RDS database instance data transfer object"""
    db_instance_identifier: str
    engine: str  # "mysql", "postgres", "aurora", etc.
    db_instance_class: str
    engine_version: str
    db_instance_status: str
    availability_zone: str
    master_username: str
    allocated_storage: int
    storage_encrypted: bool
    port: int
    create_time: datetime
    multi_az: bool
    region: str
    cost_per_month: float
    status: str = "safe"
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


@dataclass
class LambdaFunctionDTO:
    """Lambda function data transfer object"""
    function_name: str
    function_arn: str
    runtime: str
    handler: str
    code_size: int
    timeout: int
    memory_size: int
    last_modified: datetime
    role_arn: str
    region: str
    cost_per_month: float
    invocations_last_30d: int
    errors_last_30d: int
    status: str = "safe"
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


@dataclass
class S3BucketDTO:
    """S3 bucket data transfer object"""
    bucket_name: str
    region: str
    creation_date: datetime
    size_bytes: int
    object_count: int
    storage_class: str
    encryption_enabled: bool
    versioning_enabled: bool
    public_access_blocked: bool
    cost_per_month: float
    status: str = "safe"
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


@dataclass
class CloudTrailEventDTO:
    """CloudTrail event data transfer object"""
    event_id: str
    event_name: str
    event_time: datetime
    username: str
    source_ip_address: str
    user_agent: str
    aws_region: str
    event_source: str
    resources: List[Dict[str, str]]
    error_code: Optional[str]
    error_message: Optional[str]
    request_parameters: Dict[str, Any]
    response_elements: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


@dataclass
class SecurityHubFindingDTO:
    """AWS Security Hub finding data transfer object"""
    finding_id: str
    title: str
    description: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"
    compliance_status: str  # "PASSED", "FAILED"
    resource_type: str
    resource_id: str
    aws_region: str
    first_observed_at: datetime
    last_observed_at: datetime
    status: str = "active"
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v.isoformat() if isinstance(v, datetime) else v 
                for k, v in asdict(self).items()}


# ============================================================================
# API REQUEST/RESPONSE WRAPPERS
# ============================================================================

@dataclass
class APIResponse:
    """Standard API response wrapper for consistency"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None  # pagination, timestamp, etc.
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dictionary"""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "message": self.message,
            "meta": self.meta,
        }


@dataclass
class PaginatedResponse:
    """Paginated API response"""
    items: List[Any]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "items": self.items,
            "total_count": self.total_count,
            "page": self.page,
            "page_size": self.page_size,
            "total_pages": self.total_pages,
        }


# ============================================================================
# SUPABASE SCHEMA DEFINITIONS (SQL)
# ============================================================================

# These should be run in Supabase SQL editor to set up the database

SUPABASE_SCHEMA = """
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    deleted_at TIMESTAMP  -- Soft delete
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_names CHECK (name IN ('admin', 'editor', 'viewer'))
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- User-Role junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',  -- 'success', 'failure'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
"""
