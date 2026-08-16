"""Run the MYSTIQ backend server."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1,          # Use 1 with reload; for production use 4
        limit_concurrency=100,
        timeout_keep_alive=30,
    )
