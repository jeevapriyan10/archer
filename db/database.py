"""
Archer — Database Engine & Session Management
"""

import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Base

# Read from env var in Docker, fall back to localhost for local development
DATABASE_URL = os.environ.get(
    "DB_URL",
    "postgresql+psycopg2://archer:archer123@localhost:5432/archerdb"
)

# pool_pre_ping=True: test connections before use to auto-reconnect stale ones
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables if they don't already exist."""
    Base.metadata.create_all(engine)


@contextmanager
def get_db():
    """Yield a database session, ensuring it is always closed."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
