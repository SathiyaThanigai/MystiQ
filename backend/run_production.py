"""Run the MYSTIQ backend in production mode for the live event (50+ users)."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,              # 4 worker processes for parallel request handling
        limit_concurrency=200,  # Max 200 concurrent connections
        timeout_keep_alive=30,
        access_log=False,       # Disable access log for speed
    )
