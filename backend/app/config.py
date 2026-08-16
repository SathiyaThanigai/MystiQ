import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR / 'mystiq.db'}")

SECRET_KEY = os.getenv("SECRET_KEY", "mystiq-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "Mystiqq26")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "25282006")
