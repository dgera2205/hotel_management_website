"""
Database Configuration and Session Management

This module sets up the async SQLAlchemy engine and session factory for
PostgreSQL database connections. It provides the base class for all ORM
models and a dependency injection function for FastAPI route handlers.

The async configuration allows non-blocking database operations, which is
essential for handling concurrent requests efficiently.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Create async database engine
# echo=True enables SQL query logging (useful for debugging, disable in production)
# The async_database_url property converts postgresql:// to postgresql+asyncpg://
engine = create_async_engine(settings.async_database_url, echo=True)

# Session factory for creating database sessions
# expire_on_commit=False prevents objects from being expired after commit,
# allowing continued access to their attributes without re-querying
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Base class for all SQLAlchemy ORM models
# All model classes should inherit from this Base
Base = declarative_base()


async def get_db():
    """
    Dependency injection function for database sessions.

    Creates a new database session for each request and ensures proper cleanup.
    Used with FastAPI's Depends() for automatic session management.

    Yields:
        AsyncSession: Database session for the current request

    Example:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with async_session() as session:
        yield session
