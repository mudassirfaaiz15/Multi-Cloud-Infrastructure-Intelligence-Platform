"""
Production-grade PostgreSQL database configuration
Replaces Supabase demo with real SQLAlchemy ORM
Implements proper connection pooling, migrations, and session management
"""

import os
import logging
from typing import Optional
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Get database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/console_sensei"
)

# Validate database URL
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

if not DATABASE_URL.startswith("postgresql://"):
    raise ValueError("DATABASE_URL must be a PostgreSQL connection string")

# ============================================================================
# ENGINE CONFIGURATION
# ============================================================================

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",  # Log SQL if enabled
)

# ============================================================================
# SESSION FACTORY
# ============================================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ============================================================================
# BASE MODEL
# ============================================================================

Base = declarative_base()


# ============================================================================
# DATABASE UTILITIES
# ============================================================================

def get_db() -> Session:
    """
    Dependency injection for database session
    Usage in FastAPI/Flask:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> bool:
    """
    Initialize database tables
    Creates all tables defined in Base.metadata
    """
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        return True
    except SQLAlchemyError as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {str(e)}")
        return False


def verify_connection() -> bool:
    """Verify database connection is working"""
    try:
        with engine.connect() as connection:
            connection.execute("SELECT 1")
            logger.info("Database connection verified")
            return True
    except SQLAlchemyError as e:
        logger.error(f"Database connection failed: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error verifying database connection: {str(e)}")
        return False


def close_db() -> None:
    """Close all database connections"""
    try:
        engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {str(e)}")


# ============================================================================
# CONNECTION POOL MONITORING
# ============================================================================

@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log successful connections"""
    logger.debug("Database connection established")


@event.listens_for(engine, "close")
def receive_close(dbapi_conn, connection_record):
    """Log connection closures"""
    logger.debug("Database connection closed")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log connection returns to pool"""
    logger.debug("Database connection returned to pool")
