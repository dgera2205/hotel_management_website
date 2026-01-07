"""
Authentication Service Module

This module provides authentication functionality for the Hotel Management System,
including password hashing, JWT token generation/validation, and user management.

Security Features:
- Password hashing using bcrypt with automatic salt generation
- JWT tokens for stateless authentication
- Separate access and refresh tokens for security
- Token expiration handling

Note: This module uses in-memory storage for demonstration purposes.
In production, integrate with the PostgreSQL database.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from config import settings
import uuid

# OAuth2 password bearer scheme for extracting tokens from Authorization header
# tokenUrl specifies the endpoint for obtaining tokens (for Swagger UI integration)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# In-memory user storage (temporary - should be replaced with database queries)
# Structure: {email: {id, email, hashed_password, role}}
users_db: dict = {}


class AuthService:
    """
    Authentication service providing password and token management.

    This service handles all authentication-related operations including
    password hashing/verification, JWT token creation, and user management.
    """

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain text password against a bcrypt hash.

        Args:
            plain_password: The password to verify
            hashed_password: The bcrypt hash to check against

        Returns:
            True if password matches, False otherwise
        """
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with automatic salt generation.

        Args:
            password: Plain text password to hash

        Returns:
            Bcrypt hash string suitable for database storage
        """
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def create_access_token(self, user_id: str) -> str:
        """
        Create a short-lived JWT access token.

        Access tokens are used for API authentication and expire quickly
        for security. Expiration time is configured in settings.

        Args:
            user_id: User identifier to embed in token

        Returns:
            Encoded JWT access token string
        """
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        data = {"sub": user_id, "exp": expire, "type": "access"}
        return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def create_refresh_token(self, user_id: str) -> str:
        """
        Create a long-lived JWT refresh token.

        Refresh tokens are used to obtain new access tokens without
        re-authentication. They expire after 7 days.

        Args:
            user_id: User identifier to embed in token

        Returns:
            Encoded JWT refresh token string
        """
        expire = datetime.utcnow() + timedelta(days=7)
        data = {"sub": user_id, "exp": expire, "type": "refresh"}
        return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def create_tokens(self, user_id: str) -> dict:
        """
        Create both access and refresh tokens for a user.

        Args:
            user_id: User identifier to embed in tokens

        Returns:
            Dictionary containing access_token, refresh_token, and token_type
        """
        return {
            "access_token": self.create_access_token(user_id),
            "refresh_token": self.create_refresh_token(user_id),
            "token_type": "bearer",
        }

    async def create_user(self, email: str, password: str) -> dict:
        """
        Register a new user in the system.

        Args:
            email: User's email address (used as unique identifier)
            password: Plain text password (will be hashed)

        Returns:
            Dictionary with user id and email

        Raises:
            HTTPException: If email is already registered
        """
        if email in users_db:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = str(uuid.uuid4())
        user = {"id": user_id, "email": email, "hashed_password": self.hash_password(password)}
        users_db[email] = user
        return {"id": user_id, "email": email}

    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """
        Authenticate a user with email and password.

        Args:
            email: User's email address
            password: Plain text password to verify

        Returns:
            User dictionary if authentication succeeds, None otherwise
        """
        user = users_db.get(email)
        if not user or not self.verify_password(password, user["hashed_password"]):
            return None
        return user

    async def refresh_tokens(self, refresh_token: str) -> Optional[dict]:
        """
        Generate new tokens using a valid refresh token.

        Args:
            refresh_token: Valid JWT refresh token

        Returns:
            New token pair if refresh token is valid, None otherwise
        """
        try:
            payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            # Ensure this is actually a refresh token, not an access token
            if payload.get("type") != "refresh":
                return None
            user_id = payload.get("sub")
            return self.create_tokens(user_id)
        except JWTError:
            return None

# Optional OAuth2 scheme that doesn't raise errors for missing tokens
# Used for endpoints that optionally require authentication
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


# =============================================================================
# FastAPI Dependency Injection Functions
# =============================================================================
# These functions are used with Depends() to inject user context into routes

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency to get the currently authenticated user.

    Extracts and validates the JWT token from the Authorization header,
    then retrieves the corresponding user data.

    Args:
        token: JWT token extracted from Authorization header

    Returns:
        User dictionary with id, email, and role

    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    try:
        # Decode and validate the JWT token
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Find user by id in the database
        for user in users_db.values():
            if user["id"] == user_id:
                return {"id": user["id"], "email": user["email"], "role": user.get("role", "customer")}

        raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[dict]:
    """
    FastAPI dependency for optional authentication.

    Similar to get_current_user but returns None instead of raising
    an exception when no valid token is present. Useful for endpoints
    that have different behavior for authenticated vs anonymous users.

    Args:
        token: Optional JWT token from Authorization header

    Returns:
        User dictionary if authenticated, None otherwise
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            return None

        # Find user by id
        for user in users_db.values():
            if user["id"] == user_id:
                return {"id": user["id"], "email": user["email"], "role": user.get("role", "customer")}
        return None
    except JWTError:
        return None


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency requiring admin privileges.

    Use this dependency for endpoints that should only be accessible
    to users with admin or super_admin roles.

    Args:
        current_user: Injected from get_current_user dependency

    Returns:
        User dictionary if user has admin role

    Raises:
        HTTPException: 403 if user doesn't have admin privileges
    """
    role = current_user.get("role", "customer")
    if role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
