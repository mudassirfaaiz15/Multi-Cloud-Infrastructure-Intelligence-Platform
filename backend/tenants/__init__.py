"""Multi-tenant SaaS architecture."""

from .tenant_manager import (
    TenantContext,
    TenantManager,
    TenantAwareRepository,
    TenantMiddleware,
    get_tenant_manager,
    init_tenant_manager,
)

__all__ = [
    'TenantContext',
    'TenantManager',
    'TenantAwareRepository',
    'TenantMiddleware',
    'get_tenant_manager',
    'init_tenant_manager',
]
