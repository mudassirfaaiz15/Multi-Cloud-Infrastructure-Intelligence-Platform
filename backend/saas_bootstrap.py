"""SaaS platform bootstrap and initialization."""

import logging
from typing import Optional

from config_saas import get_config, init_config
from caching.redis_manager import init_redis, get_redis_manager
from events.event_bus import init_event_bus, get_event_bus
from tenants.tenant_manager import init_tenant_manager, get_tenant_manager
from websocket.distributed_socket_manager import init_socket_manager, get_socket_manager
from cloud.provider_abstraction import init_provider_registry, get_provider_registry
from database import get_db_session

logger = logging.getLogger(__name__)


class SaaSBootstrap:
    """Bootstrap SaaS platform components."""

    def __init__(self, environment: str = 'development'):
        """Initialize bootstrap."""
        self.environment = environment
        self.config = init_config(environment)
        self.initialized = False

    def initialize(self) -> bool:
        """Initialize all SaaS components."""
        try:
            logger.info(f"Initializing SaaS platform ({self.environment})")
            
            # Initialize Redis
            if not self._init_redis():
                logger.error("Redis initialization failed")
                return False
            
            # Initialize database
            if not self._init_database():
                logger.error("Database initialization failed")
                return False
            
            # Initialize event bus
            if not self._init_event_bus():
                logger.error("Event bus initialization failed")
                return False
            
            # Initialize tenant manager
            if not self._init_tenant_manager():
                logger.error("Tenant manager initialization failed")
                return False
            
            # Initialize socket manager
            if not self._init_socket_manager():
                logger.error("Socket manager initialization failed")
                return False
            
            # Initialize provider registry
            if not self._init_provider_registry():
                logger.error("Provider registry initialization failed")
                return False
            
            self.initialized = True
            logger.info("SaaS platform initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Bootstrap failed: {str(e)}")
            return False

    def _init_redis(self) -> bool:
        """Initialize Redis."""
        try:
            redis_config = self.config.redis
            redis_mgr = init_redis(
                host=redis_config.host,
                port=redis_config.port,
                db=redis_config.db,
                password=redis_config.password if redis_config.password else None
            )
            
            if redis_mgr.is_connected():
                health = redis_mgr.health_check()
                logger.info(f"Redis initialized: {health['status']}")
                return True
            else:
                logger.error("Redis connection failed")
                return False
        except Exception as e:
            logger.error(f"Redis initialization error: {str(e)}")
            return False

    def _init_database(self) -> bool:
        """Initialize database."""
        try:
            db_session = get_db_session()
            logger.info("Database initialized")
            return True
        except Exception as e:
            logger.error(f"Database initialization error: {str(e)}")
            return False

    def _init_event_bus(self) -> bool:
        """Initialize event bus."""
        try:
            event_bus = init_event_bus()
            logger.info("Event bus initialized")
            return True
        except Exception as e:
            logger.error(f"Event bus initialization error: {str(e)}")
            return False

    def _init_tenant_manager(self) -> bool:
        """Initialize tenant manager."""
        try:
            db_session = get_db_session()
            tenant_manager = init_tenant_manager(db_session)
            logger.info("Tenant manager initialized")
            return True
        except Exception as e:
            logger.error(f"Tenant manager initialization error: {str(e)}")
            return False

    def _init_socket_manager(self) -> bool:
        """Initialize socket manager."""
        try:
            socket_manager = init_socket_manager()
            health = socket_manager.health_check()
            logger.info(f"Socket manager initialized: {health['status']}")
            return True
        except Exception as e:
            logger.error(f"Socket manager initialization error: {str(e)}")
            return False

    def _init_provider_registry(self) -> bool:
        """Initialize provider registry."""
        try:
            provider_registry = init_provider_registry()
            logger.info("Provider registry initialized")
            return True
        except Exception as e:
            logger.error(f"Provider registry initialization error: {str(e)}")
            return False

    def health_check(self) -> dict:
        """Check health of all components."""
        if not self.initialized:
            return {'status': 'not_initialized'}
        
        health = {
            'status': 'healthy',
            'components': {}
        }
        
        # Check Redis
        try:
            redis_mgr = get_redis_manager()
            health['components']['redis'] = redis_mgr.health_check()
        except Exception as e:
            health['components']['redis'] = {'status': 'error', 'error': str(e)}
        
        # Check Database
        try:
            db_session = get_db_session()
            health['components']['database'] = {'status': 'healthy'}
        except Exception as e:
            health['components']['database'] = {'status': 'error', 'error': str(e)}
        
        # Check Event Bus
        try:
            event_bus = get_event_bus()
            health['components']['event_bus'] = {'status': 'healthy'}
        except Exception as e:
            health['components']['event_bus'] = {'status': 'error', 'error': str(e)}
        
        # Check Socket Manager
        try:
            socket_manager = get_socket_manager()
            health['components']['socket_manager'] = socket_manager.health_check()
        except Exception as e:
            health['components']['socket_manager'] = {'status': 'error', 'error': str(e)}
        
        # Check Provider Registry
        try:
            provider_registry = get_provider_registry()
            health['components']['provider_registry'] = {
                'status': 'healthy',
                'providers': provider_registry.list_providers()
            }
        except Exception as e:
            health['components']['provider_registry'] = {'status': 'error', 'error': str(e)}
        
        return health


# Global bootstrap instance
_bootstrap: Optional[SaaSBootstrap] = None


def get_bootstrap() -> Optional[SaaSBootstrap]:
    """Get bootstrap instance."""
    return _bootstrap


def init_saas_platform(environment: str = 'development') -> bool:
    """Initialize SaaS platform."""
    global _bootstrap
    _bootstrap = SaaSBootstrap(environment)
    return _bootstrap.initialize()


def get_platform_health() -> dict:
    """Get platform health status."""
    if _bootstrap is None:
        return {'status': 'not_initialized'}
    return _bootstrap.health_check()
