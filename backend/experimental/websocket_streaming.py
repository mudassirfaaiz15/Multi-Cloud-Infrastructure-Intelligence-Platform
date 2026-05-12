"""
WebSocket Streaming - Experimental Feature
Real-time data streaming for dashboards and monitoring
"""

from typing import Dict, List, Callable, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


@dataclass
class StreamEvent:
    """Represents a streaming event"""
    event_type: str
    data: Dict[str, Any]
    timestamp: str
    source: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "event_type": self.event_type,
            "data": self.data,
            "timestamp": self.timestamp,
            "source": self.source,
        }


class WebSocketStreamingManager:
    """
    Manages WebSocket streaming for real-time data updates
    This is an experimental feature for future scalability
    """
    
    def __init__(self):
        """Initialize streaming manager"""
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_history: List[StreamEvent] = []
        self.max_history = 1000
    
    def subscribe(self, channel: str, callback: Callable[[StreamEvent], None]) -> str:
        """
        Subscribe to a channel
        
        Args:
            channel: Channel name (e.g., 'resource_updates', 'cost_updates')
            callback: Callback function to receive events
            
        Returns:
            Subscription ID
        """
        if channel not in self.subscribers:
            self.subscribers[channel] = []
        
        self.subscribers[channel].append(callback)
        logger.info(f"Subscriber added to channel: {channel}")
        
        return f"{channel}_{len(self.subscribers[channel])}"
    
    def unsubscribe(self, channel: str, callback: Callable) -> bool:
        """
        Unsubscribe from a channel
        
        Args:
            channel: Channel name
            callback: Callback function to remove
            
        Returns:
            True if unsubscribed, False if not found
        """
        if channel in self.subscribers:
            try:
                self.subscribers[channel].remove(callback)
                logger.info(f"Subscriber removed from channel: {channel}")
                return True
            except ValueError:
                return False
        return False
    
    def publish(self, channel: str, event_type: str, data: Dict[str, Any], source: str = "system") -> None:
        """
        Publish an event to a channel
        
        Args:
            channel: Channel name
            event_type: Type of event
            data: Event data
            source: Event source
        """
        event = StreamEvent(
            event_type=event_type,
            data=data,
            timestamp=datetime.utcnow().isoformat(),
            source=source,
        )
        
        self._add_to_history(event)
        
        if channel in self.subscribers:
            for callback in self.subscribers[channel]:
                try:
                    callback(event)
                except Exception as e:
                    logger.error(f"Error in subscriber callback: {e}")
    
    def publish_resource_update(self, resource_id: str, resource_type: str, status: str, data: Dict[str, Any]) -> None:
        """Publish a resource update event"""
        self.publish(
            "resource_updates",
            "resource_changed",
            {
                "resource_id": resource_id,
                "resource_type": resource_type,
                "status": status,
                "details": data,
            },
            source="resource_monitor"
        )
    
    def publish_cost_update(self, account_id: str, current_cost: float, daily_average: float) -> None:
        """Publish a cost update event"""
        self.publish(
            "cost_updates",
            "cost_changed",
            {
                "account_id": account_id,
                "current_cost": current_cost,
                "daily_average": daily_average,
            },
            source="cost_engine"
        )
    
    def publish_anomaly_alert(self, anomaly_type: str, severity: str, description: str, data: Dict[str, Any]) -> None:
        """Publish an anomaly detection alert"""
        self.publish(
            "anomalies",
            "anomaly_detected",
            {
                "anomaly_type": anomaly_type,
                "severity": severity,
                "description": description,
                "details": data,
            },
            source="anomaly_detector"
        )
    
    def publish_security_finding(self, finding_id: str, severity: str, title: str, description: str) -> None:
        """Publish a security finding"""
        self.publish(
            "security_alerts",
            "security_finding",
            {
                "finding_id": finding_id,
                "severity": severity,
                "title": title,
                "description": description,
            },
            source="security_hub"
        )
    
    def get_channel_subscribers(self, channel: str) -> int:
        """Get number of subscribers for a channel"""
        return len(self.subscribers.get(channel, []))
    
    def get_all_channels(self) -> List[str]:
        """Get list of all active channels"""
        return list(self.subscribers.keys())
    
    def get_event_history(self, channel: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get event history
        
        Args:
            channel: Optional channel filter
            limit: Maximum number of events to return
            
        Returns:
            List of events
        """
        events = self.event_history
        
        if channel:
            events = [e for e in events if e.source == channel]
        
        return [e.to_dict() for e in events[-limit:]]
    
    def _add_to_history(self, event: StreamEvent) -> None:
        """Add event to history with size limit"""
        self.event_history.append(event)
        
        if len(self.event_history) > self.max_history:
            self.event_history = self.event_history[-self.max_history:]
    
    def clear_history(self) -> None:
        """Clear event history"""
        self.event_history.clear()
        logger.info("Event history cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get streaming manager statistics"""
        return {
            "total_channels": len(self.subscribers),
            "total_subscribers": sum(len(subs) for subs in self.subscribers.values()),
            "channels": {
                channel: len(subs) for channel, subs in self.subscribers.items()
            },
            "history_size": len(self.event_history),
            "max_history": self.max_history,
        }


# Global streaming manager instance
streaming_manager = WebSocketStreamingManager()


def get_streaming_manager() -> WebSocketStreamingManager:
    """Get global streaming manager instance"""
    return streaming_manager
