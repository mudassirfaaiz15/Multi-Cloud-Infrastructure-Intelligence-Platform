"""Repository for CostSnapshot model persistence."""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from db_models import CostSnapshot
from .base_repository import BaseRepository


class CostSnapshotRepository(BaseRepository[CostSnapshot]):
    """Repository for cost snapshot operations."""

    def __init__(self, db_session: Session):
        super().__init__(db_session, CostSnapshot)

    def get_by_account(self, account_id: str, limit: int = 100) -> List[CostSnapshot]:
        """Get cost snapshots for an account."""
        return self.db.query(CostSnapshot).filter(
            CostSnapshot.account_id == account_id
        ).order_by(desc(CostSnapshot.snapshot_date)).limit(limit).all()

    def get_by_date_range(self, account_id: str, start_date: datetime, end_date: datetime) -> List[CostSnapshot]:
        """Get cost snapshots within date range."""
        return self.db.query(CostSnapshot).filter(
            and_(
                CostSnapshot.account_id == account_id,
                CostSnapshot.snapshot_date >= start_date,
                CostSnapshot.snapshot_date <= end_date
            )
        ).order_by(CostSnapshot.snapshot_date).all()

    def get_latest(self, account_id: str) -> Optional[CostSnapshot]:
        """Get most recent cost snapshot for account."""
        return self.db.query(CostSnapshot).filter(
            CostSnapshot.account_id == account_id
        ).order_by(desc(CostSnapshot.snapshot_date)).first()

    def get_monthly_trend(self, account_id: str, months: int = 6) -> List[CostSnapshot]:
        """Get monthly cost trend."""
        start_date = datetime.utcnow() - timedelta(days=30 * months)
        return self.get_by_date_range(account_id, start_date, datetime.utcnow())

    def get_by_service(self, account_id: str, service: str) -> List[CostSnapshot]:
        """Get cost snapshots for specific service."""
        return self.db.query(CostSnapshot).filter(
            and_(
                CostSnapshot.account_id == account_id,
                CostSnapshot.service == service
            )
        ).order_by(desc(CostSnapshot.snapshot_date)).all()

    def get_total_cost(self, account_id: str, start_date: datetime, end_date: datetime) -> float:
        """Get total cost for date range."""
        snapshots = self.get_by_date_range(account_id, start_date, end_date)
        return sum(s.cost for s in snapshots)
