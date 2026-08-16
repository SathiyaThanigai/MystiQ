from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .database import init_db, async_session
from .routes.admin import router as admin_router
from .routes.participant import router as participant_router
from .routes.level2 import router as level2_router
from .seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    async with async_session() as db:
        await seed_database(db)
    yield
    # Shutdown


app = FastAPI(
    title="MYSTIQ Investigation API",
    version="1.0.0",
    lifespan=lifespan,
)

# GZip compression for faster responses
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(participant_router)
app.include_router(level2_router)


@app.get("/api/health")
async def health_check():
    return {"status": "operational", "app": "MYSTIQ"}
