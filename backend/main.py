"""
Hotel Management System - Main Application Entry Point

This module initializes the FastAPI application and configures all necessary
middleware, routers, and startup events. It serves as the central hub that
connects all API routes and handles application lifecycle events.

The application is designed to run behind an Nginx reverse proxy that strips
the /api prefix, hence the root_path configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.rooms import router as rooms_router
from routes.bookings import router as bookings_router
from routes.expenses import router as expenses_router
from routes.guests import router as guests_router
from routes.event_bookings import router as event_bookings_router
from database import Base, engine
import models  # Import to register all models with SQLAlchemy's metadata

# Initialize the FastAPI application instance
# root_path="/api" ensures proper URL generation when running behind nginx reverse proxy
# The nginx configuration strips /api prefix before forwarding to the backend
app = FastAPI(
    title="Hotel Management System",
    version="1.0.0",
    description="Comprehensive Hotel Management System",
    root_path="/api"
)

@app.on_event("startup")
async def startup_event():
    """
    Application startup event handler.

    Creates all database tables defined in SQLAlchemy models if they don't exist.
    This ensures the database schema is always in sync with the application models.
    Uses async connection for non-blocking database initialization.
    """
    async with engine.begin() as conn:
        # Create all tables defined in Base.metadata
        # run_sync is used because create_all is synchronous
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully!")

# =============================================================================
# CORS (Cross-Origin Resource Sharing) Configuration
# =============================================================================
# Parse allowed origins from settings (comma-separated string)
# This allows the frontend running on different ports/domains to access the API
origins = settings.cors_origins.split(",") if settings.cors_origins else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # List of allowed origins
    allow_credentials=True,          # Allow cookies and authentication headers
    allow_methods=["*"],             # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],             # Allow all headers
)

# =============================================================================
# Router Registration
# =============================================================================
# Register all API routers with their respective prefixes and tags
# Tags are used for API documentation grouping in Swagger UI
app.include_router(health_router)                                           # Health check endpoint
app.include_router(auth_router, prefix='/auth', tags=['auth'])              # Authentication routes
app.include_router(rooms_router, prefix='/rooms', tags=['rooms'])           # Room management routes
app.include_router(bookings_router, prefix='/bookings', tags=['bookings'])  # Booking management routes
app.include_router(expenses_router, prefix='/expenses', tags=['expenses'])  # Expense tracking routes
app.include_router(guests_router, prefix='/guests', tags=['guests'])        # Guest management routes
app.include_router(event_bookings_router, prefix='/event-bookings', tags=['event-bookings'])  # Event booking routes


@app.get("/")
async def root():
    """
    Root endpoint providing a welcome message.

    Returns:
        dict: Welcome message indicating the API is running
    """
    return {"message": "Welcome to Hotel Management System API"}


@app.get("/api")
async def api_root():
    """
    API version information endpoint.

    Returns:
        dict: API version and documentation URL
    """
    return {"message": "Hotel Management System API v1.0", "docs": "/docs"}
