"""Repository for SecurityFinding model persistence."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from db_models import SecurityFinding
from .base_repository import BaseRepository


class SecurityFindingRepository(BaseRepository[SecurityFinding]):
    """Repository for security finding operations."""

    def __init__(self, db_session: Session):
        super().__init__(db_session, SecurityFinding)

    def get_by_account(self, account_id: str, limit: int = 100) -> List[SecurityFinding]:
        """Get security findings for an account."""
        return self.db.query(SecurityFinding).filter(
            SecurityFinding.account_id == account_id
        ).order_by(desc(SecurityFinding.created_at)).limit(limit).all()

    def get_by_severity(self, account_id: str, severity: str) -> List[SecurityFinding]:
        """Get findings by severity level."""
        return self.db.query(SecurityFinding).filter(
            and_(
                SecurityFinding.account_id == account_id,
                SecurityFinding.severity == severity
            )
        ).order_by(desc(SecurityFinding.created_at)).all()

    def get_critical_findings(self, account_id: str) -> List[SecurityFinding]:
        """Get critical severity findings."""
        return self.get_by_severity(account_id, 'CRITICAL')

    def get_high_findings(self, account_id: str) -> List[SecurityFinding]:
        """Get high severity findings."""
        return self.get_by_severity(account_id, 'HIGH')

    def get_unresolved(self, account_id: str) -> List[SecurityFinding]:
        """Get unresolved findings."""
        return self.db.query(SecurityFinding).filter(
            and_(
                SecurityFinding.account_id == account_id,
                SecurityFinding.status == 'OPEN'
            )
        ).order_by(desc(SecurityFinding.created_at)).all()

    def count_by_severity(self, account_id: str) -> dict:
        """Count findings by severity."""
        findings = self.get_by_account(account_id, limit=1000)
        counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        for finding in findings:
            counts[finding.severity] = counts.get(finding.severity, 0) + 1
        return counts
