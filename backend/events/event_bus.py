"""Event-driven architecture with domain events and event bus."""

import json
import logging
from typing import Any, Callable, Dict, List, Optional, Type
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from abc import ABC, abstractmethod
import uuid

from caching.redis_manager import get_redis_manager

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Domain event types."""
    RESOURCE_DISCOVERED = "resource_discovered"
    RESOURCE_UPDATED = "resource_updated"
    RESOURCE_DELETED = "resource_deleted"
    ANOMALY_DETECTED = "anomaly_detected"
    SECURITY_ALERT_CREATED = "security_alert_created"
    COST_SPIKE_DETECTED = "cost_spike_detected"
    AI_QUERY_PROCESSED = "ai_query_processed"
    WEBSOCKET_EVENT = "websocket_event"
    TENANT_CREATED = "tenant_created"
    TENANT_UPDATED = "tenant_updated"


@dataclass
class DomainEvent:
    """Base domain event."""
    event_id: str
    event_type: EventType
    tenant_id: str
    timestamp: str
    data: Dict[str, Any]
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return asdict(self)

    def to_json(self) -> str:
        """Convert event to JSON."""
        return json.dumps(self.to_dict())

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DomainEvent':
        """Create event from dictionary."""
        return cls(
            event_id=data.get('event_id', str(uuid.uuid4())),
            event_type=EventType(data['event_type']),
            tenant_id=data['tenant_id'],
            timestamp=data.get('timestamp', datetime.utcnow().isoformat()),
            data=data.get('data', {}),
            correlation_id=data.get('correlation_id'),
            user_id=data.get('user_id')
        )


class EventHandler(ABC):
    """Base event handler."""

    @abstractmethod
    def handle(self, event: DomainEvent) -> None:
        """Handle domain event."""
        pass

    @abstractmethod
    def can_handle(self, event_type: EventType) -> bool:
        """Check if handler can handle event type."""
        pass


class EventBus:
    """Central event bus for domain events."""

    def __init__(self):
        """Initialize event bus."""
        self.handlers: Dict[EventType, List[EventHandler]] = {}
        self.redis_mgr = get_redis_manager()

    def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Subscribe handler to event type."""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
        logger.info(f"Handler subscribed to {event_type.value}")

    def unsubscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Unsubscribe handler from event type."""
        if event_type in self.handlers:
            self.handlers[event_type] = [
                h for h in self.handlers[event_type] if h != handler
            ]
            logger.info(f"Handler unsubscribed from {event_type.value}")

    def publish(self, event: DomainEvent) -> None:
        """Publish domain event."""
        # Publish to Redis pub/sub for distributed systems
        channel = f"events:{event.event_type.value}:{event.tenant_id}"
        self.redis_mgr.publish(channel, event.to_dict())
        
        # Call local handlers
        if event.event_type in self.handlers:
            for handler in self.handlers[event.event_type]:
                try:
                    handler.handle(event)
                except Exception as e:
                    logger.error(f"Error handling event {event.event_id}: {str(e)}")
        
        logger.info(f"Event published: {event.event_type.value} (ID: {event.event_id})")

    def publish_async(self, event: DomainEvent) -> None:
        """Publish event asynchronously via Redis."""
        channel = f"events:async:{event.event_type.value}:{event.tenant_id}"
        self.redis_mgr.publish(channel, event.to_dict())
        logger.info(f"Async event published: {event.event_type.value}")


class ResourceDiscoveredEvent(DomainEvent):
    """Event when resource is discovered."""

    def __init__(self, tenant_id: str, resource_id: str, resource_type: str,
                 region: str, correlation_id: Optional[str] = None,
                 user_id: Optional[str] = None):
        super().__init__(
            event_id=str(uuid.uuid4()),
            event_type=EventType.RESOURCE_DISCOVERED,
            tenant_id=tenant_id,
            timestamp=datetime.utcnow().isoformat(),
            data={
                'resource_id': resource_id,
                'resource_type': resource_type,
                'region': region
            },
            correlation_id=correlation_id,
            user_id=user_id
        )


class AnomalyDetectedEvent(DomainEvent):
    """Event when anomaly is detected."""

    def __init__(self, tenant_id: str, anomaly_type: str, severity: str,
                 description: str, correlation_id: Optional[str] = None,
                 user_id: Optional[str] = None):
        super().__init__(
            event_id=str(uuid.uuid4()),
            event_type=EventType.ANOMALY_DETECTED,
            tenant_id=tenant_id,
            timestamp=datetime.utcnow().isoformat(),
            data={
                'anomaly_type': anomaly_type,
                'severity': severity,
                'description': description
            },
            correlation_id=correlation_id,
            user_id=user_id
        )


class SecurityAlertCreatedEvent(DomainEvent):
    """Event when security alert is created."""

    def __init__(self, tenant_id: str, finding_id: str, severity: str,
                 title: str, resource_id: str, correlation_id: Optional[str] = None,
                 user_id: Optional[str] = None):
        super().__init__(
            event_id=str(uuid.uuid4()),
            event_type=EventType.SECURITY_ALERT_CREATED,
            tenant_id=tenant_id,
            timestamp=datetime.utcnow().isoformat(),
            data={
                'finding_id': finding_id,
                'severity': severity,
                'title': title,
                'resource_id': resource_id
            },
            correlation_id=correlation_id,
            user_id=user_id
        )


class CostSpikeDetectedEvent(DomainEvent):
    """Event when cost spike is detected."""

    def __init__(self, tenant_id: str, current_cost: float, previous_cost: float,
                 percentage_increase: float, correlation_id: Optional[str] = None,
                 user_id: Optional[str] = None):
        super().__init__(
            event_id=str(uuid.uuid4()),
            event_type=EventType.COST_SPIKE_DETECTED,
            tenant_id=tenant_id,
            timestamp=datetime.utcnow().isoformat(),
            data={
                'current_cost': current_cost,
                'previous_cost': previous_cost,
                'percentage_increase': percentage_increase
            },
            correlation_id=correlation_id,
            user_id=user_id
        )


class AIQueryProcessedEvent(DomainEvent):
    """Event when AI query is processed."""

    def __init__(self, tenant_id: str, query: str, response: str,
                 tokens_used: int, correlation_id: Optional[str] = None,
                 user_id: Optional[str] = None):
        super().__init__(
            event_id=str(uuid.uuid4()),
            event_type=EventType.AI_QUERY_PROCESSED,
            tenant_id=tenant_id,
            timestamp=datetime.utcnow().isoformat(),
            data={
                'query': query,
                'response': response,
                'tokens_used': tokens_used
            },
            correlation_id=correlation_id,
            user_id=user_id
        )


# Global event bus instance
_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Get or create global event bus."""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus


def init_event_bus() -> EventBus:
    """Initialize event bus."""
    global _event_bus
    _event_bus = EventBus()
    return _event_bus
