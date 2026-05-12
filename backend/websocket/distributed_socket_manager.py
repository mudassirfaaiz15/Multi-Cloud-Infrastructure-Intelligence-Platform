"""Distributed WebSocket management with Redis pub/sub for horizontal scaling."""

import logging
import json
from typing import Dict, Set, Optional, Callable, Any
from dataclasses import dataclass
from datetime import datetime
import uuid

from caching.redis_manager import get_redis_manager

logger = logging.getLogger(__name__)


@dataclass
class SocketConnection:
    """Represents a WebSocket connection."""
    connection_id: str
    user_id: str
    tenant_id: str
    sid: str
    connected_at: str
    subscriptions: Set[str]


class DistributedSocketManager:
    """Manages WebSocket connections with Redis pub/sub for distributed systems."""

    def __init__(self):
        """Initialize distributed socket manager."""
        self.connections: Dict[str, SocketConnection] = {}
        self.redis_mgr = get_redis_manager()
        self.instance_id = str(uuid.uuid4())

    def connect(self, user_id: str, tenant_id: str, sid: str) -> str:
        """Register new WebSocket connection."""
        connection_id = str(uuid.uuid4())
        connection = SocketConnection(
            connection_id=connection_id,
            user_id=user_id,
            tenant_id=tenant_id,
            sid=sid,
            connected_at=datetime.utcnow().isoformat(),
            subscriptions=set()
        )
        self.connections[connection_id] = connection
        
        # Store in Redis for distributed access
        key = f"socket:connection:{connection_id}"
        self.redis_mgr.set(key, {
            'connection_id': connection_id,
            'user_id': user_id,
            'tenant_id': tenant_id,
            'sid': sid,
            'instance_id': self.instance_id,
            'connected_at': connection.connected_at
        }, ttl=3600)
        
        logger.info(f"WebSocket connected: {connection_id} (user: {user_id}, tenant: {tenant_id})")
        return connection_id

    def disconnect(self, connection_id: str) -> None:
        """Unregister WebSocket connection."""
        if connection_id in self.connections:
            connection = self.connections.pop(connection_id)
            
            # Remove from Redis
            key = f"socket:connection:{connection_id}"
            self.redis_mgr.delete(key)
            
            logger.info(f"WebSocket disconnected: {connection_id}")

    def subscribe(self, connection_id: str, channel: str) -> None:
        """Subscribe connection to channel."""
        if connection_id in self.connections:
            self.connections[connection_id].subscriptions.add(channel)
            
            # Store subscription in Redis
            key = f"socket:subscription:{connection_id}:{channel}"
            self.redis_mgr.set(key, {'channel': channel}, ttl=3600)
            
            logger.info(f"Subscribed {connection_id} to {channel}")

    def unsubscribe(self, connection_id: str, channel: str) -> None:
        """Unsubscribe connection from channel."""
        if connection_id in self.connections:
            self.connections[connection_id].subscriptions.discard(channel)
            
            # Remove subscription from Redis
            key = f"socket:subscription:{connection_id}:{channel}"
            self.redis_mgr.delete(key)
            
            logger.info(f"Unsubscribed {connection_id} from {channel}")

    def get_connection(self, connection_id: str) -> Optional[SocketConnection]:
        """Get connection by ID."""
        return self.connections.get(connection_id)

    def get_user_connections(self, user_id: str) -> list:
        """Get all connections for user."""
        return [c for c in self.connections.values() if c.user_id == user_id]

    def get_tenant_connections(self, tenant_id: str) -> list:
        """Get all connections for tenant."""
        return [c for c in self.connections.values() if c.tenant_id == tenant_id]

    def broadcast_to_channel(self, channel: str, message: Dict[str, Any]) -> int:
        """Broadcast message to channel via Redis pub/sub."""
        redis_channel = f"socket:channel:{channel}"
        count = self.redis_mgr.publish(redis_channel, message)
        logger.info(f"Broadcast to {channel}: {count} subscribers")
        return count

    def broadcast_to_tenant(self, tenant_id: str, message: Dict[str, Any]) -> int:
        """Broadcast message to all tenant connections."""
        channel = f"tenant:{tenant_id}"
        return self.broadcast_to_channel(channel, message)

    def broadcast_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """Broadcast message to all user connections."""
        channel = f"user:{user_id}"
        return self.broadcast_to_channel(channel, message)

    def send_to_connection(self, connection_id: str, message: Dict[str, Any]) -> bool:
        """Send message to specific connection."""
        connection = self.get_connection(connection_id)
        if not connection:
            return False
        
        channel = f"socket:direct:{connection_id}"
        self.redis_mgr.publish(channel, message)
        return True

    def get_connection_count(self, tenant_id: Optional[str] = None) -> int:
        """Get number of active connections."""
        if tenant_id:
            return len(self.get_tenant_connections(tenant_id))
        return len(self.connections)

    def get_active_tenants(self) -> Set[str]:
        """Get set of active tenant IDs."""
        return {c.tenant_id for c in self.connections.values()}

    def get_active_users(self, tenant_id: Optional[str] = None) -> Set[str]:
        """Get set of active user IDs."""
        if tenant_id:
            return {c.user_id for c in self.get_tenant_connections(tenant_id)}
        return {c.user_id for c in self.connections.values()}

    def health_check(self) -> Dict[str, Any]:
        """Check socket manager health."""
        return {
            'status': 'healthy',
            'instance_id': self.instance_id,
            'connections': len(self.connections),
            'active_tenants': len(self.get_active_tenants()),
            'active_users': len(self.get_active_users()),
            'redis_connected': self.redis_mgr.is_connected()
        }


class DistributedEventBroadcaster:
    """Broadcasts events to WebSocket clients via Redis pub/sub."""

    def __init__(self, socket_manager: DistributedSocketManager):
        """Initialize event broadcaster."""
        self.socket_manager = socket_manager
        self.redis_mgr = get_redis_manager()

    def broadcast_resource_update(self, tenant_id: str, resource_id: str,
                                 resource_type: str, status: str, region: str) -> None:
        """Broadcast resource update event."""
        message = {
            'event_type': 'resource_update',
            'resource_id': resource_id,
            'resource_type': resource_type,
            'status': status,
            'region': region,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.socket_manager.broadcast_to_tenant(tenant_id, message)
        logger.info(f"Resource update broadcast: {resource_id}")

    def broadcast_cost_update(self, tenant_id: str, current_cost: float,
                             previous_cost: float, trend: str) -> None:
        """Broadcast cost update event."""
        message = {
            'event_type': 'cost_update',
            'current_cost': current_cost,
            'previous_cost': previous_cost,
            'trend': trend,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.socket_manager.broadcast_to_tenant(tenant_id, message)
        logger.info(f"Cost update broadcast: ${current_cost}")

    def broadcast_anomaly_alert(self, tenant_id: str, anomaly_type: str,
                               severity: str, description: str) -> None:
        """Broadcast anomaly alert event."""
        message = {
            'event_type': 'anomaly_alert',
            'anomaly_type': anomaly_type,
            'severity': severity,
            'description': description,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.socket_manager.broadcast_to_tenant(tenant_id, message)
        logger.info(f"Anomaly alert broadcast: {anomaly_type}")

    def broadcast_security_alert(self, tenant_id: str, severity: str,
                                title: str, resource_id: str) -> None:
        """Broadcast security alert event."""
        message = {
            'event_type': 'security_alert',
            'severity': severity,
            'title': title,
            'resource_id': resource_id,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.socket_manager.broadcast_to_tenant(tenant_id, message)
        logger.info(f"Security alert broadcast: {title}")

    def broadcast_cloudtrail_event(self, tenant_id: str, event_name: str,
                                  resource_id: str, user_id: str) -> None:
        """Broadcast CloudTrail event."""
        message = {
            'event_type': 'cloudtrail_event',
            'event_name': event_name,
            'resource_id': resource_id,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.socket_manager.broadcast_to_tenant(tenant_id, message)
        logger.info(f"CloudTrail event broadcast: {event_name}")

    def broadcast_ai_response(self, user_id: str, query: str, response: str) -> None:
        """Broadcast AI response to user."""
        message = {
            'event_type': 'ai_response',
            'query': query,
            'response': response,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.socket_manager.broadcast_to_user(user_id, message)
        logger.info(f"AI response broadcast to user: {user_id}")


# Global socket manager instance
_socket_manager: Optional[DistributedSocketManager] = None


def get_socket_manager() -> DistributedSocketManager:
    """Get or create global socket manager."""
    global _socket_manager
    if _socket_manager is None:
        _socket_manager = DistributedSocketManager()
    return _socket_manager


def init_socket_manager() -> DistributedSocketManager:
    """Initialize socket manager."""
    global _socket_manager
    _socket_manager = DistributedSocketManager()
    return _socket_manager
