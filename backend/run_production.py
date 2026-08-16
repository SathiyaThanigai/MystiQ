"""Run the MYSTIQ backend in production mode for the live event (50+ users)."""
import os
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        workers=1,               # SQLite is single-writer; multiple workers race on startup table creation
        limit_concurrency=200,   # Max 200 concurrent connections
        timeout_keep_alive=30,
        access_log=False,        # Disable access log for speed
    )