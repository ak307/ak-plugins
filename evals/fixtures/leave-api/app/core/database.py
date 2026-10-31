from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# MySQL URL form: mysql+pymysql://user:password@host:3306/dbname?charset=utf8mb4
engine = create_engine(
    settings.database_url.get_secret_value(),
    pool_pre_ping=True,
    pool_recycle=3600,  # MySQL drops idle connections after wait_timeout
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """Give each request its own session and always close it."""
    with SessionLocal() as db:
        yield db


DbSession = Annotated[Session, Depends(get_db)]
