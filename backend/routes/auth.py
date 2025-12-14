from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Simple hotel auth system with single password
HOTEL_PASSWORD = "hotel2024admin"  # Single shared password
HOTEL_USER = {"id": "hotel_admin", "username": "admin"}

class LoginRequest(BaseModel):
    password: str
    remember_me: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)  # Default 24 hours

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str = Depends(oauth2_scheme)):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None or user_id != HOTEL_USER["id"]:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return HOTEL_USER
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """
    Simple password-based login for hotel staff
    """
    if login_data.password != HOTEL_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Set longer expiration if "remember me" is checked
    expires_delta = timedelta(days=30) if login_data.remember_me else timedelta(hours=24)
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
    Logout endpoint (client should remove token)
    """
    return {"message": "Successfully logged out"}

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(verify_token)):
    """
    Get current user information
    """
    return {
        "user_id": current_user["id"],
        "username": current_user["username"],
        "role": "hotel_admin"
    }

@router.get("/verify")
async def verify_authentication(current_user: dict = Depends(verify_token)):
    """
    Verify if the user is authenticated
    """
    return {"authenticated": True, "user": current_user}
