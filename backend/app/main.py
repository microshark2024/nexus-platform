# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "Nexus AI Core Engine",
        "configured_origins": settings.ALLOWED_ORIGINS
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
