"""Tests for WebSocket functionality."""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock

from websocket_manager import (
    ConnectionManager,
    EventBroadcaster,
    WebSocketMessage,
    MessageType,
    ResourceUpdate,
    CostUpdate,
    AnomalyAlert,
    SecurityAlert,
)


class TestWebSocketMessage:
    """Test WebSocket message handling."""

    def test_message_creation(self):
        """Test creating a WebSocket message."""
        msg = WebSocketMessage(
            message_type=MessageType.RESOURCE_UPDATE,
            data={'resource_id': 'ec2-001', 'status': 'running'},
            user_id='user-001'
        )
        assert msg.message_type == MessageType.RESOURCE_UPDATE
        assert msg.data['resource_id'] == 'ec2-001'

    def test_message_to_json(self):
        """Test converting message to JSON."""
        msg = WebSocketMessage(
            message_type=MessageType.RESOURCE_UPDATE,
            data={'resource_id': 'ec2-001'},
            user_id='user-001'
        )
        json_str = msg.to_json()
        assert isinstance(json_str, str)
        data = json.loads(json_str)
        assert data['message_type'] == 'resource_update'

    def test_message_from_json(self):
        """Test creating message from JSON."""
        json_str = '{"message_type": "resource_update", "data": {"resource_id": "ec2-001"}, "user_id": "user-001", "timestamp": "2024-01-01T00:00:00"}'
        msg = WebSocketMessage.from_json(json_str)
        assert msg.message_type == MessageType.RESOURCE_UPDATE
        assert msg.data['resource_id'] == 'ec2-001'


class TestConnectionManager:
    """Test connection manager."""

    @pytest.mark.asyncio
    async def test_connect(self):
        """Test connecting a user."""
        manager = ConnectionManager()
        websocket = Mock()
        
        connection_id = manager.connect('user-001', websocket)
        
        assert connection_id is not None
        assert manager.get_connection_count('user-001') == 1

    @pytest.mark.asyncio
    async def test_disconnect(self):
        """Test disconnecting a user."""
        manager = ConnectionManager()
        websocket = Mock()
        
        manager.connect('user-001', websocket)
        assert manager.get_connection_count('user-001') == 1
        
        manager.disconnect('user-001', websocket)
        assert manager.get_connection_count('user-001') == 0

    @pytest.mark.asyncio
    async def test_get_active_users(self):
        """Test getting active users."""
        manager = ConnectionManager()
        
        manager.connect('user-001', Mock())
        manager.connect('user-002', Mock())
        manager.connect('user-001', Mock())
        
        active_users = manager.get_active_users()
        assert len(active_users) == 2
        assert 'user-001' in active_users
        assert 'user-002' in active_users

    @pytest.mark.asyncio
    async def test_send_personal(self):
        """Test sending personal message."""
        manager = ConnectionManager()
        websocket = Mock()
        
        manager.connect('user-001', websocket)
        
        msg = WebSocketMessage(
            message_type=MessageType.RESOURCE_UPDATE,
            data={'resource_id': 'ec2-001'},
            user_id='user-001'
        )
        
        await manager.send_personal('user-001', msg)
        # Message should be sent to websocket

    @pytest.mark.asyncio
    async def test_broadcast(self):
        """Test broadcasting message."""
        manager = ConnectionManager()
        
        manager.connect('user-001', Mock())
        manager.connect('user-002', Mock())
        
        msg = WebSocketMessage(
            message_type=MessageType.RESOURCE_UPDATE,
            data={'resource_id': 'ec2-001'},
            user_id='system'
        )
        
        await manager.broadcast(msg)
        # Message should be sent to all users

    @pytest.mark.asyncio
    async def test_broadcast_to_group(self):
        """Test broadcasting to group."""
        manager = ConnectionManager()
        
        manager.connect('user-001', Mock())
        manager.connect('user-002', Mock())
        
        msg = WebSocketMessage(
            message_type=MessageType.RESOURCE_UPDATE,
            data={'resource_id': 'ec2-001'},
            user_id='system'
        )
        
        await manager.broadcast_to_group('resources-user-001', msg)
        # Message should be sent to group


class TestEventBroadcaster:
    """Test event broadcaster."""

    @pytest.mark.asyncio
    async def test_broadcast_resource_update(self):
        """Test broadcasting resource update."""
        manager = ConnectionManager()
        broadcaster = EventBroadcaster(manager)
        
        manager.connect('user-001', Mock())
        
        await broadcaster.broadcast_resource_update(
            user_id='user-001',
            resource_id='ec2-001',
            resource_type='EC2',
            status='running',
            region='us-east-1'
        )
        # Event should be broadcast

    @pytest.mark.asyncio
    async def test_broadcast_cost_update(self):
        """Test broadcasting cost update."""
        manager = ConnectionManager()
        broadcaster = EventBroadcaster(manager)
        
        manager.connect('user-001', Mock())
        
        await broadcaster.broadcast_cost_update(
            user_id='user-001',
            account_id='default',
            current_cost=1500.50,
            previous_cost=1200.00,
            trend='increasing'
        )
        # Event should be broadcast

    @pytest.mark.asyncio
    async def test_broadcast_anomaly_alert(self):
        """Test broadcasting anomaly alert."""
        manager = ConnectionManager()
        broadcaster = EventBroadcaster(manager)
        
        manager.connect('user-001', Mock())
        
        await broadcaster.broadcast_anomaly_alert(
            user_id='user-001',
            anomaly_id='anom-001',
            anomaly_type='COST_SPIKE',
            severity='HIGH',
            description='Cost increased 50%'
        )
        # Event should be broadcast

    @pytest.mark.asyncio
    async def test_broadcast_security_alert(self):
        """Test broadcasting security alert."""
        manager = ConnectionManager()
        broadcaster = EventBroadcaster(manager)
        
        manager.connect('user-001', Mock())
        
        await broadcaster.broadcast_security_alert(
            user_id='user-001',
            finding_id='find-001',
            severity='CRITICAL',
            title='Unencrypted data',
            description='S3 bucket has no encryption',
            resource_id='s3-001'
        )
        # Event should be broadcast


class TestMessageTypes:
    """Test message type definitions."""

    def test_message_type_values(self):
        """Test message type enum values."""
        assert MessageType.RESOURCE_UPDATE.value == 'resource_update'
        assert MessageType.COST_UPDATE.value == 'cost_update'
        assert MessageType.ANOMALY_ALERT.value == 'anomaly_alert'
        assert MessageType.SECURITY_ALERT.value == 'security_alert'


class TestDataClasses:
    """Test data class definitions."""

    def test_resource_update(self):
        """Test ResourceUpdate data class."""
        update = ResourceUpdate(
            resource_id='ec2-001',
            resource_type='EC2',
            status='running',
            region='us-east-1'
        )
        assert update.resource_id == 'ec2-001'
        assert update.resource_type == 'EC2'

    def test_cost_update(self):
        """Test CostUpdate data class."""
        update = CostUpdate(
            account_id='default',
            current_cost=1500.50,
            previous_cost=1200.00,
            trend='increasing'
        )
        assert update.current_cost == 1500.50
        assert update.trend == 'increasing'

    def test_anomaly_alert(self):
        """Test AnomalyAlert data class."""
        alert = AnomalyAlert(
            anomaly_id='anom-001',
            anomaly_type='COST_SPIKE',
            severity='HIGH',
            description='Cost increased'
        )
        assert alert.anomaly_id == 'anom-001'
        assert alert.severity == 'HIGH'

    def test_security_alert(self):
        """Test SecurityAlert data class."""
        alert = SecurityAlert(
            finding_id='find-001',
            severity='CRITICAL',
            title='Unencrypted data',
            description='S3 bucket has no encryption',
            resource_id='s3-001'
        )
        assert alert.finding_id == 'find-001'
        assert alert.severity == 'CRITICAL'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
