"""Repository for AuditLog model persistence."""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from db_models import AuditLog
from .base_repository import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository for audit logging operations."""

    def __init__(self, db_session: Session):
        super().__init__(db_session, AuditLog)

    def get_by_user(self, user_id: str, limit: int = 100) -> List[AuditLog]:
        """Get audit logs for a user."""
        return self.db.query(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(desc(AuditLog.timestamp)).limit(limit).all()

    def get_by_action(self, action: str, limit: int = 100) -> List[AuditLog]:
        """Get audit logs by action type."""
        return self.db.query(AuditLog).filter(
            AuditLog.action == action
        ).order_by(desc(AuditLog.timestamp)).limit(limit).all()

    def get_by_resource(self, resource_id: str, limit: int = 100) -> List[AuditLog]:
        """Get audit logs for a resource."""
        return self.db.query(AuditLog).filter(
            AuditLog.resource_id == resource_id
        ).order_by(desc(AuditLog.timestamp)).limit(limit).all()

    def get_by_date_range(self, start_date: datetime, end_date: datetime, limit: int = 100) -> List[AuditLog]:
        """Get audit logs within date range."""
        return self.db.query(AuditLog).filter(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.timestamp <= end_date
            )
        ).order_by(desc(AuditLog.timestamp)).limit(limit).all()

    def get_recent(self, hours: int = 24, limit: int = 100) -> List[AuditLog]:
        """Get recent audit logs."""
        start_time = datetime.utcnow() - timedelta(hours=hours)
        return self.get_by_date_range(start_time, datetime.utcnow(), limit)

    def log_action(self, user_id: str, action: str, resource_id: Optional[str] = None, details: Optional[dict] = None) -> AuditLog:
        """Create audit log entry."""
        return self.create(
            user_id=user_id,
            action=action,
            resource_id=resource_id,
            details=details or {},
            timestamp=datetime.utcnow()
        )
