"""Repository for Resource model persistence."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from db_models import Resource
from .base_repository import BaseRepository


class ResourceRepository(BaseRepository[Resource]):
    """Repository for AWS resource operations."""

    def __init__(self, db_session: Session):
        super().__init__(db_session, Resource)

    def get_by_resource_id(self, resource_id: str) -> Optional[Resource]:
        """Get resource by AWS resource ID."""
        return self.db.query(Resource).filter(Resource.resource_id == resource_id).first()

    def get_by_type(self, resource_type: str, limit: int = 100) -> List[Resource]:
        """Get all resources of a specific type."""
        return self.db.query(Resource).filter(Resource.resource_type == resource_type).limit(limit).all()

    def get_by_region(self, region: str, limit: int = 100) -> List[Resource]:
        """Get all resources in a specific region."""
        return self.db.query(Resource).filter(Resource.region == region).limit(limit).all()

    def get_by_type_and_region(self, resource_type: str, region: str, limit: int = 100) -> List[Resource]:
        """Get resources by type and region."""
        return self.db.query(Resource).filter(
            and_(Resource.resource_type == resource_type, Resource.region == region)
        ).limit(limit).all()

    def get_by_account(self, account_id: str, limit: int = 100) -> List[Resource]:
        """Get all resources for an account."""
        return self.db.query(Resource).filter(Resource.account_id == account_id).limit(limit).all()

    def count_by_type(self, resource_type: str) -> int:
        """Count resources by type."""
        return self.db.query(Resource).filter(Resource.resource_type == resource_type).count()

    def count_by_status(self, status: str) -> int:
        """Count resources by status."""
        return self.db.query(Resource).filter(Resource.status == status).count()

    def upsert(self, resource_id: str, **kwargs) -> Resource:
        """Create or update resource by resource_id."""
        existing = self.get_by_resource_id(resource_id)
        if existing:
            return self.update(existing.id, **kwargs)
        return self.create(resource_id=resource_id, **kwargs)
