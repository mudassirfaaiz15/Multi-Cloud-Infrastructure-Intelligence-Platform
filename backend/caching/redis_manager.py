"""Redis caching and pub/sub manager for distributed systems."""

import json
import logging
import pickle
from typing import Any, Optional, Callable, Dict, List
from functools import wraps
from datetime import timedelta
import redis
from redis.connection import ConnectionPool
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError

logger = logging.getLogger(__name__)


class RedisManager:
    """Manages Redis connections, caching, and pub/sub operations."""

    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0, 
                 password: Optional[str] = None, max_connections: int = 50):
        """Initialize Redis manager with connection pooling."""
        self.host = host
        self.port = port
        self.db = db
        self.password = password
        self.max_connections = max_connections
        self.pool: Optional[ConnectionPool] = None
        self.client: Optional[redis.Redis] = None
        self.pubsub_client: Optional[redis.Redis] = None
        self._is_connected = False

    def connect(self) -> bool:
        """Establish Redis connection with pooling."""
        try:
            self.pool = ConnectionPool(
                host=self.host,
                port=self.port,
                db=self.db,
                password=self.password,
                max_connections=self.max_connections,
                decode_responses=False,
                socket_connect_timeout=5,
                socket_keepalive=True,
                socket_keepalive_options={
                    1: 1,  # TCP_KEEPIDLE
                    2: 1,  # TCP_KEEPINTVL
                    3: 3,  # TCP_KEEPCNT
                }
            )
            self.client = redis.Redis(connection_pool=self.pool)
            self.pubsub_client = redis.Redis(connection_pool=self.pool)
            
            # Test connection
            self.client.ping()
            self._is_connected = True
            logger.info(f"Redis connected: {self.host}:{self.port}")
            return True
        except (RedisError, RedisConnectionError) as e:
            logger.error(f"Redis connection failed: {str(e)}")
            self._is_connected = False
            return False

    def disconnect(self) -> None:
        """Close Redis connections."""
        if self.pool:
            self.pool.disconnect()
            self._is_connected = False
            logger.info("Redis disconnected")

    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        if not self._is_connected or not self.client:
            return False
        try:
            self.client.ping()
            return True
        except (RedisError, RedisConnectionError):
            self._is_connected = False
            return False

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.is_connected():
            return None
        try:
            value = self.client.get(key)
            if value is None:
                return None
            try:
                return json.loads(value.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return pickle.loads(value)
        except RedisError as e:
            logger.error(f"Redis get error for key {key}: {str(e)}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL."""
        if not self.is_connected():
            return False
        try:
            serialized = json.dumps(value).encode('utf-8')
            if ttl:
                self.client.setex(key, ttl, serialized)
            else:
                self.client.set(key, serialized)
            return True
        except (RedisError, TypeError) as e:
            logger.error(f"Redis set error for key {key}: {str(e)}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.is_connected():
            return False
        try:
            self.client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Redis delete error for key {key}: {str(e)}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self.is_connected():
            return 0
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except RedisError as e:
            logger.error(f"Redis delete pattern error for {pattern}: {str(e)}")
            return 0

    def exists(self, key: str) -> bool:
        """Check if key exists."""
        if not self.is_connected():
            return False
        try:
            return self.client.exists(key) > 0
        except RedisError as e:
            logger.error(f"Redis exists error for key {key}: {str(e)}")
            return False

    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter."""
        if not self.is_connected():
            return None
        try:
            return self.client.incrby(key, amount)
        except RedisError as e:
            logger.error(f"Redis increment error for key {key}: {str(e)}")
            return None

    def decrement(self, key: str, amount: int = 1) -> Optional[int]:
        """Decrement counter."""
        if not self.is_connected():
            return None
        try:
            return self.client.decrby(key, amount)
        except RedisError as e:
            logger.error(f"Redis decrement error for key {key}: {str(e)}")
            return None

    def publish(self, channel: str, message: Dict[str, Any]) -> int:
        """Publish message to channel."""
        if not self.is_connected():
            return 0
        try:
            serialized = json.dumps(message).encode('utf-8')
            return self.client.publish(channel, serialized)
        except RedisError as e:
            logger.error(f"Redis publish error to {channel}: {str(e)}")
            return 0

    def subscribe(self, channels: List[str], callback: Callable) -> None:
        """Subscribe to channels and handle messages."""
        if not self.is_connected():
            logger.error("Cannot subscribe: Redis not connected")
            return
        try:
            pubsub = self.pubsub_client.pubsub()
            pubsub.subscribe(channels)
            logger.info(f"Subscribed to channels: {channels}")
            
            for message in pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'].decode('utf-8'))
                        callback(message['channel'].decode('utf-8'), data)
                    except (json.JSONDecodeError, UnicodeDecodeError) as e:
                        logger.error(f"Error parsing message: {str(e)}")
        except RedisError as e:
            logger.error(f"Redis subscribe error: {str(e)}")
        finally:
            pubsub.close()

    def get_ttl(self, key: str) -> Optional[int]:
        """Get remaining TTL for key in seconds."""
        if not self.is_connected():
            return None
        try:
            ttl = self.client.ttl(key)
            return ttl if ttl >= 0 else None
        except RedisError as e:
            logger.error(f"Redis ttl error for key {key}: {str(e)}")
            return None

    def expire(self, key: str, ttl: int) -> bool:
        """Set expiration on key."""
        if not self.is_connected():
            return False
        try:
            return self.client.expire(key, ttl)
        except RedisError as e:
            logger.error(f"Redis expire error for key {key}: {str(e)}")
            return False

    def health_check(self) -> Dict[str, Any]:
        """Check Redis health status."""
        if not self.is_connected():
            return {
                'status': 'disconnected',
                'connected': False,
                'error': 'Redis connection failed'
            }
        try:
            info = self.client.info()
            return {
                'status': 'healthy',
                'connected': True,
                'version': info.get('redis_version'),
                'memory_used': info.get('used_memory_human'),
                'connected_clients': info.get('connected_clients'),
                'total_commands': info.get('total_commands_processed')
            }
        except RedisError as e:
            return {
                'status': 'error',
                'connected': False,
                'error': str(e)
            }


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from function arguments."""
    key_parts = [str(arg) for arg in args]
    key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
    return ":".join(key_parts)


def cached(ttl: int = 3600, key_prefix: str = ""):
    """Decorator for caching function results."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            redis_mgr = get_redis_manager()
            if not redis_mgr.is_connected():
                return func(*args, **kwargs)
            
            cache_k = f"{key_prefix}:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = redis_mgr.get(cache_k)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_k}")
                return cached_value
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            redis_mgr.set(cache_k, result, ttl)
            logger.debug(f"Cache set: {cache_k} (TTL: {ttl}s)")
            return result
        return wrapper
    return decorator


def rate_limit(max_requests: int = 100, window: int = 60, key_prefix: str = ""):
    """Decorator for rate limiting."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            redis_mgr = get_redis_manager()
            if not redis_mgr.is_connected():
                return func(*args, **kwargs)
            
            rate_key = f"{key_prefix}:rate_limit:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            current = redis_mgr.increment(rate_key)
            if current == 1:
                redis_mgr.expire(rate_key, window)
            
            if current and current > max_requests:
                raise Exception(f"Rate limit exceeded: {max_requests} requests per {window}s")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


# Global Redis manager instance
_redis_manager: Optional[RedisManager] = None


def get_redis_manager() -> RedisManager:
    """Get or create global Redis manager."""
    global _redis_manager
    if _redis_manager is None:
        _redis_manager = RedisManager()
        _redis_manager.connect()
    return _redis_manager


def init_redis(host: str = 'localhost', port: int = 6379, db: int = 0,
               password: Optional[str] = None) -> RedisManager:
    """Initialize Redis manager."""
    global _redis_manager
    _redis_manager = RedisManager(host=host, port=port, db=db, password=password)
    _redis_manager.connect()
    return _redis_manager
