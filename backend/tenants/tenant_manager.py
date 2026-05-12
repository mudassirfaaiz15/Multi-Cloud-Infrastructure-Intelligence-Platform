"""Multi-tenant SaaS architecture and tenant management."""

import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

logger = logging.getLogger(__name__)


@dataclass
class TenantContext:
    """Tenant context for request scope."""
    tenant_id: str
    organization_id: str
    user_id: str
    correlation_id: str
    permissions: List[str]


class TenantManager:
    """Manages tenant operations and isolation."""

    def __init__(self, db_session: Session):
        """Initialize tenant manager."""
        self.db = db_session
        self._current_tenant: Optional[TenantContext] = None

    def set_current_tenant(self, tenant_context: TenantContext) -> None:
        """Set current tenant context."""
        self._current_tenant = tenant_context
        logger.info(f"Tenant context set: {tenant_context.tenant_id}")

    def get_current_tenant(self) -> Optional[TenantContext]:
        """Get current tenant context."""
        return self._current_tenant

    def get_tenant_id(self) -> str:
        """Get current tenant ID."""
        if not self._current_tenant:
            raise ValueError("No tenant context set")
        return self._current_tenant.tenant_id

    def get_organization_id(self) -> str:
        """Get current organization ID."""
        if not self._current_tenant:
            raise ValueError("No tenant context set")
        return self._current_tenant.organization_id

    def validate_tenant_access(self, tenant_id: str) -> bool:
        """Validate if current user can access tenant."""
        if not self._current_tenant:
            return False
        return self._current_tenant.tenant_id == tenant_id

    def validate_organization_access(self, organization_id: str) -> bool:
        """Validate if current user can access organization."""
        if not self._current_tenant:
            return False
        return self._current_tenant.organization_id == organization_id

    def has_permission(self, permission: str) -> bool:
        """Check if current user has permission."""
        if not self._current_tenant:
            return False
        return permission in self._current_tenant.permissions

    def require_permission(self, permission: str) -> None:
        """Require specific permission."""
        if not self.has_permission(permission):
            raise PermissionError(f"Permission denied: {permission}")

    def get_tenant_filter(self, model_class: Any) -> Any:
        """Get SQLAlchemy filter for tenant isolation."""
        if not self._current_tenant:
            raise ValueError("No tenant context set")
        return model_class.tenant_id == self._current_tenant.tenant_id

    def get_organization_filter(self, model_class: Any) -> Any:
        """Get SQLAlchemy filter for organization isolation."""
        if not self._current_tenant:
            raise ValueError("No tenant context set")
        return model_class.organization_id == self._current_tenant.organization_id


class TenantAwareRepository:
    """Base repository with tenant isolation."""

    def __init__(self, db_session: Session, model_class: Any, tenant_manager: TenantManager):
        """Initialize tenant-aware repository."""
        self.db = db_session
        self.model = model_class
        self.tenant_manager = tenant_manager

    def _apply_tenant_filter(self, query: Any) -> Any:
        """Apply tenant filter to query."""
        tenant_filter = self.tenant_manager.get_tenant_filter(self.model)
        return query.filter(tenant_filter)

    def create(self, **kwargs) -> Any:
        """Create entity with tenant isolation."""
        kwargs['tenant_id'] = self.tenant_manager.get_tenant_id()
        kwargs['organization_id'] = self.tenant_manager.get_organization_id()
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def get_by_id(self, id: int) -> Optional[Any]:
        """Get entity by ID with tenant isolation."""
        query = self.db.query(self.model).filter(self.model.id == id)
        query = self._apply_tenant_filter(query)
        return query.first()

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Any]:
        """Get all entities with tenant isolation."""
        query = self.db.query(self.model)
        query = self._apply_tenant_filter(query)
        return query.limit(limit).offset(offset).all()

    def update(self, id: int, **kwargs) -> Optional[Any]:
        """Update entity with tenant isolation."""
        instance = self.get_by_id(id)
        if instance:
            for key, value in kwargs.items():
                setattr(instance, key, value)
            self.db.commit()
            self.db.refresh(instance)
        return instance

    def delete(self, id: int) -> bool:
        """Delete entity with tenant isolation."""
        instance = self.get_by_id(id)
        if instance:
            self.db.delete(instance)
            self.db.commit()
            return True
        return False

    def count(self) -> int:
        """Count entities with tenant isolation."""
        query = self.db.query(self.model)
        query = self._apply_tenant_filter(query)
        return query.count()


class TenantMiddleware:
    """WSGI middleware for tenant context injection."""

    def __init__(self, app, tenant_manager_factory):
        """Initialize tenant middleware."""
        self.app = app
        self.tenant_manager_factory = tenant_manager_factory

    def __call__(self, environ, start_response):
        """Process request with tenant context."""
        # Extract tenant ID from header or subdomain
        tenant_id = environ.get('HTTP_X_TENANT_ID')
        organization_id = environ.get('HTTP_X_ORGANIZATION_ID')
        user_id = environ.get('HTTP_X_USER_ID')
        correlation_id = environ.get('HTTP_X_CORRELATION_ID', '')

        if tenant_id and organization_id and user_id:
            tenant_context = TenantContext(
                tenant_id=tenant_id,
                organization_id=organization_id,
                user_id=user_id,
                correlation_id=correlation_id,
                permissions=[]  # Load from database
            )
            environ['tenant_context'] = tenant_context

        return self.app(environ, start_response)


# Global tenant manager instance
_tenant_manager: Optional[TenantManager] = None


def get_tenant_manager(db_session: Session) -> TenantManager:
    """Get or create tenant manager."""
    global _tenant_manager
    if _tenant_manager is None:
        _tenant_manager = TenantManager(db_session)
    return _tenant_manager


def init_tenant_manager(db_session: Session) -> TenantManager:
    """Initialize tenant manager."""
    global _tenant_manager
    _tenant_manager = TenantManager(db_session)
    return _tenant_manager
