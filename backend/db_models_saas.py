"""SaaS database models with multi-tenant support."""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Organization(Base):
    """Organization/Tenant entity."""
    __tablename__ = 'organizations'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    logo_url = Column(String(512))
    website = Column(String(512))
    status = Column(String(50), default='active')
    tier = Column(String(50), default='free')  # free, pro, enterprise
    max_users = Column(Integer, default=5)
    max_cloud_accounts = Column(Integer, default=1)
    features = Column(JSON, default={})
    settings = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship('User', back_populates='organization')
    cloud_accounts = relationship('CloudAccount', back_populates='organization')
    resources = relationship('Resource', back_populates='organization')
    audit_logs = relationship('AuditLog', back_populates='organization')

    __table_args__ = (
        Index('idx_tenant_id', 'tenant_id'),
        Index('idx_status', 'status'),
    )


class User(Base):
    """User entity with tenant isolation."""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    email = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    password_hash = Column(String(512))
    role = Column(String(50), default='viewer')  # admin, editor, viewer
    permissions = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship('Organization', back_populates='users')
    audit_logs = relationship('AuditLog', back_populates='user')

    __table_args__ = (
        Index('idx_tenant_id_email', 'tenant_id', 'email'),
        Index('idx_tenant_id_username', 'tenant_id', 'username'),
    )


class CloudAccount(Base):
    """Cloud account entity with tenant isolation."""
    __tablename__ = 'cloud_accounts'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    provider = Column(String(50), nullable=False)  # aws, gcp, azure
    account_id = Column(String(255), nullable=False)
    account_name = Column(String(255))
    credentials = Column(JSON)  # Encrypted in production
    regions = Column(JSON, default=[])
    status = Column(String(50), default='active')
    last_scanned = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship('Organization', back_populates='cloud_accounts')
    resources = relationship('Resource', back_populates='cloud_account')

    __table_args__ = (
        Index('idx_tenant_id_provider', 'tenant_id', 'provider'),
        Index('idx_tenant_id_account_id', 'tenant_id', 'account_id'),
    )


class Resource(Base):
    """Cloud resource entity with tenant isolation."""
    __tablename__ = 'resources'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    cloud_account_id = Column(Integer, ForeignKey('cloud_accounts.id'))
    resource_id = Column(String(255), nullable=False)
    resource_type = Column(String(100), nullable=False)
    name = Column(String(255))
    provider = Column(String(50), nullable=False)
    region = Column(String(100))
    status = Column(String(50))
    metadata = Column(JSON, default={})
    tags = Column(JSON, default={})
    cost_per_month = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship('Organization', back_populates='resources')
    cloud_account = relationship('CloudAccount', back_populates='resources')

    __table_args__ = (
        Index('idx_tenant_id_resource_id', 'tenant_id', 'resource_id'),
        Index('idx_tenant_id_resource_type', 'tenant_id', 'resource_type'),
        Index('idx_tenant_id_provider', 'tenant_id', 'provider'),
    )


class Anomaly(Base):
    """Anomaly detection entity with tenant isolation."""
    __tablename__ = 'anomalies'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    anomaly_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    description = Column(Text)
    resource_id = Column(String(255))
    status = Column(String(50), default='open')
    detected_at = Column(DateTime, nullable=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_tenant_id_status', 'tenant_id', 'status'),
        Index('idx_tenant_id_severity', 'tenant_id', 'severity'),
    )


class SecurityFinding(Base):
    """Security finding entity with tenant isolation."""
    __tablename__ = 'security_findings'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    finding_id = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    resource_id = Column(String(255))
    status = Column(String(50), default='open')
    remediation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_tenant_id_severity', 'tenant_id', 'severity'),
        Index('idx_tenant_id_status', 'tenant_id', 'status'),
    )


class CostSnapshot(Base):
    """Cost snapshot entity with tenant isolation."""
    __tablename__ = 'cost_snapshots'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    service = Column(String(100))
    cost = Column(Float, nullable=False)
    currency = Column(String(10), default='USD')
    snapshot_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_tenant_id_snapshot_date', 'tenant_id', 'snapshot_date'),
        Index('idx_tenant_id_service', 'tenant_id', 'service'),
    )


class AuditLog(Base):
    """Audit log entity with tenant isolation."""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(255))
    details = Column(JSON, default={})
    ip_address = Column(String(50))
    user_agent = Column(String(512))
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship('Organization', back_populates='audit_logs')
    user = relationship('User', back_populates='audit_logs')

    __table_args__ = (
        Index('idx_tenant_id_timestamp', 'tenant_id', 'timestamp'),
        Index('idx_tenant_id_action', 'tenant_id', 'action'),
        Index('idx_tenant_id_user_id', 'tenant_id', 'user_id'),
    )


class AIConversation(Base):
    """AI conversation entity with tenant isolation."""
    __tablename__ = 'ai_conversations'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'))
    conversation_id = Column(String(255), unique=True, nullable=False)
    title = Column(String(255))
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_tenant_id_conversation_id', 'tenant_id', 'conversation_id'),
    )


class AIMessage(Base):
    """AI message entity with tenant isolation."""
    __tablename__ = 'ai_messages'

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(255), ForeignKey('organizations.tenant_id'), nullable=False, index=True)
    conversation_id = Column(String(255), ForeignKey('ai_conversations.conversation_id'))
    role = Column(String(50), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('idx_tenant_id_conversation_id', 'tenant_id', 'conversation_id'),
    )
