"""Repository for Anomaly model persistence."""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from db_models import Anomaly
from .base_repository import BaseRepository


class AnomalyRepository(BaseRepository[Anomaly]):
    """Repository for anomaly detection operations."""

    def __init__(self, db_session: Session):
        super().__init__(db_session, Anomaly)

    def get_by_account(self, account_id: str, limit: int = 100) -> List[Anomaly]:
        """Get anomalies for an account."""
        return self.db.query(Anomaly).filter(
            Anomaly.account_id == account_id
        ).order_by(desc(Anomaly.detected_at)).limit(limit).all()

    def get_by_type(self, account_id: str, anomaly_type: str) -> List[Anomaly]:
        """Get anomalies by type."""
        return self.db.query(Anomaly).filter(
            and_(
                Anomaly.account_id == account_id,
                Anomaly.anomaly_type == anomaly_type
            )
        ).order_by(desc(Anomaly.detected_at)).all()

    def get_recent(self, account_id: str, hours: int = 24) -> List[Anomaly]:
        """Get anomalies from last N hours."""
        start_time = datetime.utcnow() - timedelta(hours=hours)
        return self.db.query(Anomaly).filter(
            and_(
                Anomaly.account_id == account_id,
                Anomaly.detected_at >= start_time
            )
        ).order_by(desc(Anomaly.detected_at)).all()

    def get_unresolved(self, account_id: str) -> List[Anomaly]:
        """Get unresolved anomalies."""
        return self.db.query(Anomaly).filter(
            and_(
                Anomaly.account_id == account_id,
                Anomaly.status == 'OPEN'
            )
        ).order_by(desc(Anomaly.detected_at)).all()

    def get_by_severity(self, account_id: str, severity: str) -> List[Anomaly]:
        """Get anomalies by severity."""
        return self.db.query(Anomaly).filter(
            and_(
                Anomaly.account_id == account_id,
                Anomaly.severity == severity
            )
        ).order_by(desc(Anomaly.detected_at)).all()

    def count_by_type(self, account_id: str) -> dict:
        """Count anomalies by type."""
        anomalies = self.get_by_account(account_id, limit=1000)
        counts = {}
        for anomaly in anomalies:
            counts[anomaly.anomaly_type] = counts.get(anomaly.anomaly_type, 0) + 1
        return counts
