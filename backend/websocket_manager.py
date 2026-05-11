"""
Production-grade WebSocket real-time infrastructure
Enables live monitoring, alerts, and activity streaming
Implements connection pooling, message broadcasting, and error recovery
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class MessageType(str, Enum):
    """WebSocket message types"""
    # Connection
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    
    # Real-time updates
    RESOURCE_UPDATE = "resource_update"
    COST_UPDATE = "cost_update"
    ANOMALY_DETECTED = "anomaly_detected"
    ALERT = "alert"
    SECURITY_FINDING = "security_finding"
    
    # Activity
    ACTIVITY_LOG = "activity_log"
    AI_MESSAGE = "ai_message"
    
    # Errors
    ERROR = "error"
    UNAUTHORIZED = "unauthorized"


@dataclass
class WebSocketMessage:
    """Standardized WebSocket message"""
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    message_id: str = None
    
    def __post_init__(self):
        if not self.message_id:
            self.message_id = str(uuid.uuid4())
    
    def to_json(self) -> str:
        """Convert to JSON for transmission"""
        return json.dumps({
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
            "message_id": self.message_id,
        })
    
    @classmethod
    def from_json(cls, json_str: str) -> "WebSocketMessage":
        """Create from JSON"""
        data = json.loads(json_str)
        return cls(
            type=data["type"],
            data=data["data"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            message_id=data.get("message_id"),
        )


@dataclass
class ResourceUpdate:
    """Real-time resource update"""
    resource_id: str
    resource_type: str
    status: str
    metrics: Dict[str, Any]
    timestamp: datetime


@dataclass
class CostUpdate:
    """Real-time cost update"""
    account_id: str
    service: str
    cost_usd: float
    trend_percent: float
    timestamp: datetime


@dataclass
class AnomalyAlert:
    """Anomaly detection alert"""
    anomaly_id: str
    resource_id: str
    anomaly_type: str
    severity: str
    title: str
    description: str
    timestamp: datetime


@dataclass
class SecurityAlert:
    """Security finding alert"""
    finding_id: str
    resource_id: str
    title: str
    severity: str
    description: str
    timestamp: datetime


# ============================================================================
# CONNECTION MANAGER
# ============================================================================

class ConnectionManager:
    """
    Manages WebSocket connections with:
    - Connection pooling
    - User-based routing
    - Broadcast capabilities
    - Automatic cleanup
    """

    def __init__(self):
        """Initialize connection manager"""
        # Map of user_id -> set of active connections
        self.active_connections: Dict[str, Set[Any]] = {}
        # Map of connection_id -> user_id
        self.connection_user_map: Dict[str, str] = {}
        # Message handlers
        self.handlers: Dict[str, Callable] = {}

    async def connect(self, user_id: str, websocket: Any) -> str:
        """
        Register new connection

        Args:
            user_id: User ID
            websocket: WebSocket connection

        Returns:
            Connection ID
        """
        connection_id = str(uuid.uuid4())
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.connection_user_map[connection_id] = user_id
        
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")
        return connection_id

    async def disconnect(self, user_id: str, websocket: Any) -> None:
        """
        Unregister connection

        Args:
            user_id: User ID
            websocket: WebSocket connection
        """
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove from connection map
        connection_id = next(
            (cid for cid, uid in self.connection_user_map.items() if uid == user_id),
            None
        )
        if connection_id:
            del self.connection_user_map[connection_id]
        
        logger.info(f"User {user_id} disconnected")

    async def send_personal(self, user_id: str, message: WebSocketMessage) -> None:
        """
        Send message to specific user

        Args:
            user_id: User ID
            message: Message to send
        """
        if user_id not in self.active_connections:
            logger.warning(f"User {user_id} has no active connections")
            return
        
        disconnected = set()
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message.to_json())
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {str(e)}")
                disconnected.add(websocket)
        
        # Clean up disconnected connections
        for ws in disconnected:
            await self.disconnect(user_id, ws)

    async def broadcast(self, message: WebSocketMessage, exclude_user: Optional[str] = None) -> None:
        """
        Broadcast message to all connected users

        Args:
            message: Message to broadcast
            exclude_user: User ID to exclude from broadcast
        """
        disconnected_users = []
        
        for user_id, connections in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
            
            disconnected_conns = set()
            for websocket in connections:
                try:
                    await websocket.send_text(message.to_json())
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {str(e)}")
                    disconnected_conns.add(websocket)
            
            # Clean up disconnected connections
            for ws in disconnected_conns:
                await self.disconnect(user_id, ws)

    async def broadcast_to_group(
        self,
        user_ids: Set[str],
        message: WebSocketMessage,
    ) -> None:
        """
        Broadcast message to specific group of users

        Args:
            user_ids: Set of user IDs
            message: Message to broadcast
        """
        for user_id in user_ids:
            await self.send_personal(user_id, message)

    def register_handler(self, message_type: str, handler: Callable) -> None:
        """
        Register message handler

        Args:
            message_type: Message type to handle
            handler: Async handler function
        """
        self.handlers[message_type] = handler
        logger.info(f"Registered handler for message type: {message_type}")

    async def handle_message(self, user_id: str, message: WebSocketMessage) -> None:
        """
        Route message to appropriate handler

        Args:
            user_id: User ID
            message: Message to handle
        """
        handler = self.handlers.get(message.type)
        if handler:
            try:
                await handler(user_id, message)
            except Exception as e:
                logger.error(f"Error handling message {message.type}: {str(e)}")
                error_msg = WebSocketMessage(
                    type=MessageType.ERROR.value,
                    data={"error": str(e)},
                    timestamp=datetime.utcnow(),
                )
                await self.send_personal(user_id, error_msg)
        else:
            logger.warning(f"No handler for message type: {message.type}")

    def get_connection_count(self, user_id: Optional[str] = None) -> int:
        """Get connection count"""
        if user_id:
            return len(self.active_connections.get(user_id, set()))
        return sum(len(conns) for conns in self.active_connections.values())

    def get_active_users(self) -> Set[str]:
        """Get set of active user IDs"""
        return set(self.active_connections.keys())


# ============================================================================
# EVENT BROADCASTER
# ============================================================================

class EventBroadcaster:
    """
    Broadcasts real-time events to connected clients
    """

    def __init__(self, connection_manager: ConnectionManager):
        """
        Initialize broadcaster

        Args:
            connection_manager: Connection manager instance
        """
        self.manager = connection_manager

    async def broadcast_resource_update(
        self,
        resource_id: str,
        resource_type: str,
        status: str,
        metrics: Dict[str, Any],
        user_ids: Optional[Set[str]] = None,
    ) -> None:
        """Broadcast resource update"""
        update = ResourceUpdate(
            resource_id=resource_id,
            resource_type=resource_type,
            status=status,
            metrics=metrics,
            timestamp=datetime.utcnow(),
        )
        
        message = WebSocketMessage(
            type=MessageType.RESOURCE_UPDATE.value,
            data=asdict(update),
            timestamp=datetime.utcnow(),
        )
        
        if user_ids:
            await self.manager.broadcast_to_group(user_ids, message)
        else:
            await self.manager.broadcast(message)

    async def broadcast_cost_update(
        self,
        account_id: str,
        service: str,
        cost_usd: float,
        trend_percent: float,
        user_ids: Optional[Set[str]] = None,
    ) -> None:
        """Broadcast cost update"""
        update = CostUpdate(
            account_id=account_id,
            service=service,
            cost_usd=cost_usd,
            trend_percent=trend_percent,
            timestamp=datetime.utcnow(),
        )
        
        message = WebSocketMessage(
            type=MessageType.COST_UPDATE.value,
            data=asdict(update),
            timestamp=datetime.utcnow(),
        )
        
        if user_ids:
            await self.manager.broadcast_to_group(user_ids, message)
        else:
            await self.manager.broadcast(message)

    async def broadcast_anomaly_alert(
        self,
        anomaly_id: str,
        resource_id: str,
        anomaly_type: str,
        severity: str,
        title: str,
        description: str,
        user_ids: Optional[Set[str]] = None,
    ) -> None:
        """Broadcast anomaly detection alert"""
        alert = AnomalyAlert(
            anomaly_id=anomaly_id,
            resource_id=resource_id,
            anomaly_type=anomaly_type,
            severity=severity,
            title=title,
            description=description,
            timestamp=datetime.utcnow(),
        )
        
        message = WebSocketMessage(
            type=MessageType.ANOMALY_DETECTED.value,
            data=asdict(alert),
            timestamp=datetime.utcnow(),
        )
        
        if user_ids:
            await self.manager.broadcast_to_group(user_ids, message)
        else:
            await self.manager.broadcast(message)

    async def broadcast_security_alert(
        self,
        finding_id: str,
        resource_id: str,
        title: str,
        severity: str,
        description: str,
        user_ids: Optional[Set[str]] = None,
    ) -> None:
        """Broadcast security finding alert"""
        alert = SecurityAlert(
            finding_id=finding_id,
            resource_id=resource_id,
            title=title,
            severity=severity,
            description=description,
            timestamp=datetime.utcnow(),
        )
        
        message = WebSocketMessage(
            type=MessageType.SECURITY_FINDING.value,
            data=asdict(alert),
            timestamp=datetime.utcnow(),
        )
        
        if user_ids:
            await self.manager.broadcast_to_group(user_ids, message)
        else:
            await self.manager.broadcast(message)

    async def send_activity_log(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Dict[str, Any],
    ) -> None:
        """Send activity log entry"""
        message = WebSocketMessage(
            type=MessageType.ACTIVITY_LOG.value,
            data={
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details,
            },
            timestamp=datetime.utcnow(),
        )
        
        await self.manager.send_personal(user_id, message)

    async def send_ai_message(
        self,
        user_id: str,
        conversation_id: str,
        role: str,
        content: str,
        tokens_used: int = 0,
        cost_usd: float = 0.0,
    ) -> None:
        """Send AI message update"""
        message = WebSocketMessage(
            type=MessageType.AI_MESSAGE.value,
            data={
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "tokens_used": tokens_used,
                "cost_usd": cost_usd,
            },
            timestamp=datetime.utcnow(),
        )
        
        await self.manager.send_personal(user_id, message)


# ============================================================================
# SINGLETON INSTANCES
# ============================================================================

_connection_manager: Optional[ConnectionManager] = None
_event_broadcaster: Optional[EventBroadcaster] = None


def get_connection_manager() -> ConnectionManager:
    """Get or create connection manager singleton"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager


def get_event_broadcaster() -> EventBroadcaster:
    """Get or create event broadcaster singleton"""
    global _event_broadcaster
    if _event_broadcaster is None:
        _event_broadcaster = EventBroadcaster(get_connection_manager())
    return _event_broadcaster
