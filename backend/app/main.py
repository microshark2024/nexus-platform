# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.api.routes import ai

app = FastAPI(
    title="Nexus AI Backend Engine",
    description="Python FastAPI backend powering project analytical insights for Nexus platform.",
    version="1.0.0"
)

# Apply CORS middleware using settings configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(ai.router)

# Resolve the static files directory path (app/static)
static_dir = os.path.join(os.path.dirname(__file__), "static")

# Custom SPA fallback handler for Next.js routing in client-side
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request, exc):
    if exc.status_code == 404:
        path = request.url.path
        # Return 404 for API endpoints or files with extensions (assets)
        if path.startswith("/api") or path.startswith("/ai") or "." in path.split("/")[-1]:
            return JSONResponse(status_code=404, content={"detail": exc.detail})
        
        # Fallback to index.html for SPA page paths (e.g. /login, /dashboard, /projects/...)
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
            
    return await http_exception_handler(request, exc)

# Mount the static files directory if it exists
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    @app.get("/", tags=["Health"])
    async def root():
        return {
            "status": "online",
            "service": "Nexus AI Core Engine (Static assets directory not found)",
            "configured_origins": settings.ALLOWED_ORIGINS
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
