"""
Application Configuration Module

This module defines the application settings using Pydantic's BaseSettings,
which automatically loads values from environment variables and .env files.
All configuration values are centralized here for easy management.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application configuration settings.

    Loads configuration from environment variables with fallback defaults.
    Environment variables take precedence over values defined in .env file.

    Attributes:
        cors_origins: Comma-separated list of allowed CORS origins
        env: Application environment (development, production, testing)
        database_url: PostgreSQL connection string for async connection
        jwt_secret: Secret key for JWT token signing (MUST be changed in production)
        jwt_algorithm: Algorithm used for JWT encoding (HS256 is symmetric)
        access_token_expire_minutes: JWT access token expiration time in minutes
    """
    cors_origins: str = "http://localhost:3000"
    env: str = "development"
    database_url: str = ""
    jwt_secret: str = "change-me-in-production"  # WARNING: Change this in production!
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    @property
    def async_database_url(self) -> str:
        """Convert standard PostgreSQL URL to async format for SQLAlchemy."""
        url = self.database_url
        # Railway and other platforms use postgresql://, convert to asyncpg format
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        # asyncpg doesn't support sslmode parameter, it uses ssl instead
        # Remove sslmode from URL as we'll handle SSL via connect_args
        if "sslmode=" in url:
            # Remove sslmode parameter from query string
            import re
            url = re.sub(r'[?&]sslmode=[^&]*', '', url)
            # Clean up any leftover ? or & at the end
            url = url.rstrip('?&')
        return url

    class Config:
        """Pydantic configuration for loading environment variables."""
        env_file = ".env"  # Load additional settings from .env file if present


# Global settings instance used throughout the application
settings = Settings()
