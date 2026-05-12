"""SaaS configuration with distributed systems support."""

import os
from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class RedisConfig:
    """Redis configuration."""
    host: str = os.getenv('REDIS_HOST', 'localhost')
    port: int = int(os.getenv('REDIS_PORT', 6379))
    db: int = int(os.getenv('REDIS_DB', 0))
    password: str = os.getenv('REDIS_PASSWORD', '')
    max_connections: int = int(os.getenv('REDIS_MAX_CONNECTIONS', 50))
    socket_timeout: int = int(os.getenv('REDIS_SOCKET_TIMEOUT', 5))
    socket_connect_timeout: int = int(os.getenv('REDIS_CONNECT_TIMEOUT', 5))


@dataclass
class DatabaseConfig:
    """Database configuration."""
    url: str = os.getenv('DATABASE_URL', 'postgresql://localhost/console_sensei')
    pool_size: int = int(os.getenv('DB_POOL_SIZE', 20))
    max_overflow: int = int(os.getenv('DB_MAX_OVERFLOW', 40))
    pool_timeout: int = int(os.getenv('DB_POOL_TIMEOUT', 30))
    pool_recycle: int = int(os.getenv('DB_POOL_RECYCLE', 3600))
    echo: bool = os.getenv('DB_ECHO', 'false').lower() == 'true'


@dataclass
class WebSocketConfig:
    """WebSocket configuration."""
    async_mode: str = os.getenv('SOCKETIO_ASYNC_MODE', 'threading')
    ping_timeout: int = int(os.getenv('SOCKETIO_PING_TIMEOUT', 60))
    ping_interval: int = int(os.getenv('SOCKETIO_PING_INTERVAL', 25))
    max_http_buffer_size: int = int(os.getenv('SOCKETIO_MAX_BUFFER', 1000000))
    cors_allowed_origins: list = os.getenv('SOCKETIO_CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')


@dataclass
class CacheConfig:
    """Cache configuration."""
    default_ttl: int = int(os.getenv('CACHE_DEFAULT_TTL', 3600))
    api_response_ttl: int = int(os.getenv('CACHE_API_TTL', 300))
    infrastructure_ttl: int = int(os.getenv('CACHE_INFRA_TTL', 600))
    ai_response_ttl: int = int(os.getenv('CACHE_AI_TTL', 1800))
    session_ttl: int = int(os.getenv('CACHE_SESSION_TTL', 86400))


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    enabled: bool = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    default_limit: int = int(os.getenv('RATE_LIMIT_DEFAULT', 100))
    default_window: int = int(os.getenv('RATE_LIMIT_WINDOW', 60))
    api_limit: int = int(os.getenv('RATE_LIMIT_API', 1000))
    ai_limit: int = int(os.getenv('RATE_LIMIT_AI', 50))


@dataclass
class DistributedConfig:
    """Distributed systems configuration."""
    instance_id: str = os.getenv('INSTANCE_ID', 'default')
    cluster_name: str = os.getenv('CLUSTER_NAME', 'console-sensei')
    enable_distributed_tracing: bool = os.getenv('DISTRIBUTED_TRACING', 'true').lower() == 'true'
    enable_metrics: bool = os.getenv('ENABLE_METRICS', 'true').lower() == 'true'
    metrics_port: int = int(os.getenv('METRICS_PORT', 9090))


@dataclass
class SaaSConfig:
    """Complete SaaS configuration."""
    environment: str = os.getenv('ENVIRONMENT', 'development')
    debug: bool = os.getenv('DEBUG', 'false').lower() == 'true'
    
    # Component configs
    redis: RedisConfig = RedisConfig()
    database: DatabaseConfig = DatabaseConfig()
    websocket: WebSocketConfig = WebSocketConfig()
    cache: CacheConfig = CacheConfig()
    rate_limit: RateLimitConfig = RateLimitConfig()
    distributed: DistributedConfig = DistributedConfig()
    
    # Feature flags
    enable_multi_tenancy: bool = True
    enable_distributed_websocket: bool = True
    enable_redis_caching: bool = True
    enable_event_bus: bool = True
    enable_cloud_abstraction: bool = True
    
    # Security
    jwt_secret: str = os.getenv('JWT_SECRET', 'change-me-in-production')
    jwt_algorithm: str = 'HS256'
    jwt_expiration: int = int(os.getenv('JWT_EXPIRATION', 86400))
    
    # API
    api_version: str = 'v2'
    api_prefix: str = '/api/v2'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            'environment': self.environment,
            'debug': self.debug,
            'redis': {
                'host': self.redis.host,
                'port': self.redis.port,
                'db': self.redis.db,
            },
            'database': {
                'pool_size': self.database.pool_size,
                'max_overflow': self.database.max_overflow,
            },
            'websocket': {
                'async_mode': self.websocket.async_mode,
                'ping_timeout': self.websocket.ping_timeout,
            },
            'cache': {
                'default_ttl': self.cache.default_ttl,
            },
            'features': {
                'multi_tenancy': self.enable_multi_tenancy,
                'distributed_websocket': self.enable_distributed_websocket,
                'redis_caching': self.enable_redis_caching,
                'event_bus': self.enable_event_bus,
                'cloud_abstraction': self.enable_cloud_abstraction,
            }
        }


# Global config instance
_config: SaaSConfig = SaaSConfig()


def get_config() -> SaaSConfig:
    """Get global SaaS configuration."""
    return _config


def init_config(environment: str = 'development') -> SaaSConfig:
    """Initialize SaaS configuration."""
    global _config
    _config = SaaSConfig(environment=environment)
    return _config
