from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.rooms import router as rooms_router
from routes.bookings import router as bookings_router
from routes.expenses import router as expenses_router
from routes.guests import router as guests_router
from database import Base, engine
import models  # Import to register all models

# Use root_path for proper URL generation behind nginx reverse proxy
# nginx strips /api prefix, so we set root_path="/api" to generate correct redirect URLs
app = FastAPI(
    title="Hotel Management System",
    version="1.0.0",
    description="Comprehensive Hotel Management System",
    root_path="/api"
)

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully!")

# CORS
origins = settings.cors_origins.split(",") if settings.cors_origins else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, prefix='/auth', tags=['auth'])
app.include_router(rooms_router, prefix='/rooms', tags=['rooms'])
app.include_router(bookings_router, prefix='/bookings', tags=['bookings'])
app.include_router(expenses_router, prefix='/expenses', tags=['expenses'])
app.include_router(guests_router, prefix='/guests', tags=['guests'])

@app.get("/")
async def root():
    return {"message": "Welcome to Hotel Management System API"}

@app.get("/api")
async def api_root():
    return {"message": "Hotel Management System API v1.0", "docs": "/docs"}
