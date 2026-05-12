"""Base repository with common CRUD operations."""

from typing import TypeVar, Generic, List, Optional, Type
from sqlalchemy.orm import Session
from sqlalchemy import desc

T = TypeVar('T')


class BaseRepository(Generic[T]):
    """Generic repository for common database operations."""

    def __init__(self, db_session: Session, model: Type[T]):
        self.db = db_session
        self.model = model

    def create(self, **kwargs) -> T:
        """Create and persist a new entity."""
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def get_by_id(self, id: int) -> Optional[T]:
        """Get entity by ID."""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, limit: int = 100, offset: int = 0) -> List[T]:
        """Get all entities with pagination."""
        return self.db.query(self.model).limit(limit).offset(offset).all()

    def update(self, id: int, **kwargs) -> Optional[T]:
        """Update entity by ID."""
        instance = self.get_by_id(id)
        if instance:
            for key, value in kwargs.items():
                setattr(instance, key, value)
            self.db.commit()
            self.db.refresh(instance)
        return instance

    def delete(self, id: int) -> bool:
        """Delete entity by ID."""
        instance = self.get_by_id(id)
        if instance:
            self.db.delete(instance)
            self.db.commit()
            return True
        return False

    def get_recent(self, limit: int = 10) -> List[T]:
        """Get most recent entities."""
        return self.db.query(self.model).order_by(desc(self.model.created_at)).limit(limit).all()
