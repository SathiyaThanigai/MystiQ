from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event, text

from .config import DATABASE_URL

# SQLite-optimized engine for 50 concurrent users
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,            # SQLite only allows 1 writer — keep pool small
    max_overflow=10,        # Some overflow for burst reads
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
)

# Apply PRAGMAs on EVERY new connection (not just once at startup)
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=10000")   # Wait up to 10s if locked
    cursor.execute("PRAGMA cache_size=-64000")     # 64MB cache
    cursor.execute("PRAGMA temp_store=MEMORY")
    cursor.close()


async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
