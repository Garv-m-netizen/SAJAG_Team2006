import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routes import (
    auth, incidents, graph, ripple,
    intervention, resolution, equity,
    rewards, admin
)
from app.seed_data import seed_database

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicPulse AI API",
    description="Intelligent Civic Intelligence, Predictive Action, and Community Verification Platform for Chandigarh, India.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads Directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(graph.router, prefix=settings.API_V1_STR)
app.include_router(ripple.router, prefix=settings.API_V1_STR)
app.include_router(intervention.router, prefix=settings.API_V1_STR)
app.include_router(resolution.router, prefix=settings.API_V1_STR)
app.include_router(equity.router, prefix=settings.API_V1_STR)
app.include_router(rewards.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Check if database has users; if not, seed realistic demonstration data
        from app.models import User
        if db.query(User).count() == 0:
            seed_database(db, wipe_existing=False)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "name": "CivicPulse AI - Connected Civic Intelligence Engine",
        "city": "Chandigarh, India",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "jurisdiction": "Chandigarh Municipal Corporation (Demonstration Sandbox)"
    }
