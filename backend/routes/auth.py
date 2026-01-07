"""
Authentication Routes Module

This module implements a simplified authentication system for the Hotel
Management System. It uses a single shared password for all hotel staff
members, rather than individual user accounts.

Security Model:
- Single shared password for all staff access
- JWT tokens for session management
- "Remember me" option for extended sessions (30 days)
- Token expiration after 24 hours (default) or 30 days (remember me)

Endpoints:
- POST /auth/login - Authenticate and receive JWT token
- POST /auth/logout - Invalidate session (client-side token removal)
- GET /auth/me - Get current user information
- GET /auth/verify - Verify token validity
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from config import settings

# Create router instance for authentication endpoints
router = APIRouter()

# OAuth2 scheme for extracting Bearer tokens from requests
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# =============================================================================
# Authentication Configuration
# =============================================================================
# Simple shared password system for hotel staff
# Password can be overridden via HOTEL_PASSWORD environment variable
import os
HOTEL_PASSWORD = os.getenv("HOTEL_PASSWORD", "PrinceHotel16121997")
HOTEL_USER = {"id": "hotel_admin", "username": "admin"}  # Single admin user


# =============================================================================
# Request/Response Models
# =============================================================================

class LoginRequest(BaseModel):
    """
    Login request payload.

    Attributes:
        password: The shared hotel staff password
        remember_me: If True, token expires in 30 days; otherwise 24 hours
    """
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    """
    Successful login response containing JWT token.

    Attributes:
        access_token: JWT token for subsequent API requests
        token_type: Always "bearer" for Bearer token authentication
        expires_in: Token lifetime in seconds
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# =============================================================================
# Helper Functions
# =============================================================================

def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Create a JWT access token with expiration.

    Args:
        data: Payload data to encode in the token (e.g., {"sub": user_id})
        expires_delta: Optional custom expiration time; defaults to 24 hours

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)  # Default 24 hours

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str = Depends(oauth2_scheme)):
    """
    FastAPI dependency to verify JWT token validity.

    Extracts the token from the Authorization header, validates it,
    and returns the associated user data.

    Args:
        token: JWT token from Authorization header (injected by FastAPI)

    Returns:
        User dictionary if token is valid

    Raises:
        HTTPException: 401 if token is invalid or expired
    """
    try:
        # Decode and validate the JWT token
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")

        # Verify the user_id matches our single hotel admin user
        if user_id is None or user_id != HOTEL_USER["id"]:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return HOTEL_USER
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# =============================================================================
# API Endpoints
# =============================================================================

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """
    Authenticate hotel staff and issue JWT token.

    This endpoint validates the shared hotel password and returns a JWT
    token for subsequent authenticated requests.

    Args:
        login_data: Login credentials containing password and remember_me flag

    Returns:
        TokenResponse with access_token, token_type, and expires_in

    Raises:
        HTTPException: 401 if password is incorrect
    """
    # Validate password against the shared hotel password
    if login_data.password != HOTEL_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Set token expiration based on "remember me" preference
    # 30 days for remembered sessions, 24 hours for regular sessions
    expires_delta = timedelta(days=30) if login_data.remember_me else timedelta(hours=24)

    # Generate JWT token with user ID as subject
    access_token = create_access_token(
        data={"sub": HOTEL_USER["id"]},
        expires_delta=expires_delta
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(expires_delta.total_seconds())
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(verify_token)):
    """
    Logout the current user.

    Note: JWT tokens are stateless, so server-side logout is a no-op.
    The client should discard the token from local storage.

    Args:
        current_user: Authenticated user (injected by verify_token)

    Returns:
        Success message confirming logout
    """
    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(verify_token)):
    """
    Get current authenticated user's information.

    Returns the user profile data for the authenticated user.
    Useful for displaying user info in the UI.

    Args:
        current_user: Authenticated user (injected by verify_token)

    Returns:
        User profile with id, username, and role
    """
    return {
        "user_id": current_user["id"],
        "username": current_user["username"],
        "role": "hotel_admin"
    }


@router.get("/verify")
async def verify_authentication(current_user: dict = Depends(verify_token)):
    """
    Verify if the current token is valid.

    Used by the frontend to check if the stored token is still valid
    before making authenticated requests.

    Args:
        current_user: Authenticated user (injected by verify_token)

    Returns:
        Authentication status and user data
    """
    return {"authenticated": True, "user": current_user}
