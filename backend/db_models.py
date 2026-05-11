"""
Production-grade SQLAlchemy database models
Replaces mock data with persistent PostgreSQL storage
Implements proper relationships, constraints, and audit trails
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Enum, Index, UniqueConstraint, CheckConstraint,
    func, event
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import logging

from database import Base

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS
# ============================================================================

class UserRole(str):
    """User role enumeration"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class ResourceType(str):
    """AWS resource type enumeration"""
    EC2 = "ec2"
    RDS = "rds"
    S3 = "s3"
    LAMBDA = "lambda"
    IAM = "iam"
    CLOUDTRAIL = "cloudtrail"
    SECURITY_HUB = "security_hub"


class AnomalyType(str):
    """Anomaly type enumeration"""
    COST_SPIKE = "cost_spike"
    USAGE_ANOMALY = "usage_anomaly"
    SECURITY_FINDING = "security_finding"
    PERFORMANCE_DEGRADATION = "performance_degradation"


class AlertSeverity(str):
    """Alert severity enumeration"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


# ============================================================================
# USERS & AUTHENTICATION
# ============================================================================

class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Relationships
    cloud_accounts = relationship("CloudAccount", back_populates="user", cascade="all, delete-orphan")
    ai_conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'editor', 'viewer')", name="valid_role"),
        Index("idx_user_email_active", "email", "is_active"),
    )

    def __repr__(self):
        return f"<User {self.email}>"


class Session(Base):
    """User session model for token management"""
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        Index("idx_session_user_active", "user_id", "expires_at"),
    )


# ============================================================================
# CLOUD ACCOUNTS & CREDENTIALS
# ============================================================================

class CloudAccount(Base):
    """Cloud account configuration"""
    __tablename__ = "cloud_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Account details
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)  # aws, gcp, azure
    account_id = Column(String(255), nullable=False)
    region = Column(String(50), nullable=False, default="us-east-1")
    
    # Credentials (encrypted in production)
    credentials_encrypted = Column(Text, nullable=False)  # Encrypted JSON
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_verified_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="cloud_accounts")
    resources = relationship("Resource", back_populates="cloud_account", cascade="all, delete-orphan")
    cost_snapshots = relationship("CostSnapshot", back_populates="cloud_account", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("user_id", "account_id", name="unique_user_account"),
        Index("idx_cloud_account_user_active", "user_id", "is_active"),
    )


# ============================================================================
# AWS RESOURCES
# ============================================================================

class Resource(Base):
    """AWS resource tracking"""
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_account_id = Column(UUID(as_uuid=True), ForeignKey("cloud_accounts.id", ondelete="CASCADE"), nullable=False)
    
    # Resource identification
    resource_id = Column(String(255), nullable=False)
    resource_type = Column(String(50), nullable=False)  # ec2, rds, s3, etc.
    resource_name = Column(String(255), nullable=False)
    region = Column(String(50), nullable=False)
    
    # Resource details
    status = Column(String(50), nullable=False)
    metadata = Column(JSONB, default={}, nullable=False)  # Flexible storage for resource-specific data
    tags = Column(JSONB, default={}, nullable=False)
    
    # Cost tracking
    estimated_monthly_cost = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    discovered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cloud_account = relationship("CloudAccount", back_populates="resources")
    anomalies = relationship("Anomaly", back_populates="resource", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("cloud_account_id", "resource_id", name="unique_resource_per_account"),
        Index("idx_resource_type_status", "resource_type", "status"),
        Index("idx_resource_account_type", "cloud_account_id", "resource_type"),
    )


# ============================================================================
# ANOMALIES & ALERTS
# ============================================================================

class Anomaly(Base):
    """Detected anomalies in cloud resources"""
    __tablename__ = "anomalies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    
    # Anomaly details
    anomaly_type = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Metrics
    baseline_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    deviation_percent = Column(Float, nullable=True)
    
    # Status
    status = Column(String(50), default="open", nullable=False)  # open, acknowledged, resolved
    
    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    resource = relationship("Resource", back_populates="anomalies")
    
    __table_args__ = (
        Index("idx_anomaly_resource_status", "resource_id", "status"),
        Index("idx_anomaly_detected_at", "detected_at"),
    )


class Alert(Base):
    """User alerts and notifications"""
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Alert details
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)
    alert_type = Column(String(50), nullable=False)  # cost, security, performance, etc.
    
    # Related resource
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="SET NULL"), nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False, nullable=False)
    is_acknowledged = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="alerts")
    
    __table_args__ = (
        Index("idx_alert_user_read", "user_id", "is_read"),
        Index("idx_alert_created_at", "created_at"),
    )


# ============================================================================
# COST TRACKING
# ============================================================================

class CostSnapshot(Base):
    """Historical cost snapshots for trend analysis"""
    __tablename__ = "cost_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_account_id = Column(UUID(as_uuid=True), ForeignKey("cloud_accounts.id", ondelete="CASCADE"), nullable=False)
    
    # Cost data
    service_name = Column(String(255), nullable=False)
    cost_usd = Column(Float, nullable=False)
    resource_count = Column(Integer, default=0, nullable=False)
    
    # Trend
    trend_percent = Column(Float, default=0.0, nullable=False)
    
    # Timestamp
    snapshot_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cloud_account = relationship("CloudAccount", back_populates="cost_snapshots")
    
    __table_args__ = (
        Index("idx_cost_snapshot_account_date", "cloud_account_id", "snapshot_date"),
        Index("idx_cost_snapshot_service", "service_name"),
    )


# ============================================================================
# AI CONVERSATIONS
# ============================================================================

class AIConversation(Base):
    """AI chat conversation history"""
    __tablename__ = "ai_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Conversation details
    title = Column(String(255), nullable=False)
    ai_provider = Column(String(50), default="claude", nullable=False)  # claude, openai, etc.
    model = Column(String(100), nullable=False)
    
    # Metrics
    total_tokens_used = Column(Integer, default=0, nullable=False)
    total_cost_usd = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="ai_conversations")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_ai_conversation_user", "user_id"),
        Index("idx_ai_conversation_created_at", "created_at"),
    )


class AIMessage(Base):
    """Individual AI messages in conversations"""
    __tablename__ = "ai_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    
    # Message content
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    
    # Metrics
    tokens_used = Column(Integer, default=0, nullable=False)
    cost_usd = Column(Float, default=0.0, nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")
    
    __table_args__ = (
        Index("idx_ai_message_conversation", "conversation_id"),
    )


# ============================================================================
# AUDIT LOGGING
# ============================================================================

class AuditLog(Base):
    """Audit trail for all user actions"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Action details
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=True)
    
    # Change tracking
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    
    # Request context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index("idx_audit_log_user_action", "user_id", "action"),
        Index("idx_audit_log_created_at", "created_at"),
        Index("idx_audit_log_resource", "resource_type", "resource_id"),
    )


# ============================================================================
# RECOMMENDATIONS
# ============================================================================

class Recommendation(Base):
    """AI-generated optimization recommendations"""
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    
    # Recommendation details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    recommendation_type = Column(String(50), nullable=False)  # cost, security, performance
    
    # Impact
    estimated_savings_usd = Column(Float, default=0.0, nullable=False)
    priority = Column(String(50), nullable=False)  # critical, high, medium, low
    
    # Status
    status = Column(String(50), default="open", nullable=False)  # open, implemented, dismissed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    implemented_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index("idx_recommendation_resource_status", "resource_id", "status"),
        Index("idx_recommendation_priority", "priority"),
    )


# ============================================================================
# SECURITY FINDINGS
# ============================================================================

class SecurityFinding(Base):
    """Security Hub findings storage"""
    __tablename__ = "security_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    
    # Finding details
    finding_id = Column(String(255), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    
    # Description
    description = Column(Text, nullable=False)
    remediation = Column(Text, nullable=True)
    
    # Timestamps
    first_observed_at = Column(DateTime, nullable=False)
    last_observed_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index("idx_security_finding_resource_severity", "resource_id", "severity"),
        Index("idx_security_finding_status", "status"),
    )
