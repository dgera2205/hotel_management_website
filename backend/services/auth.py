from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from config import settings
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# In-memory storage (replace with database)
users_db: dict = {}

class AuthService:
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def create_access_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        data = {"sub": user_id, "exp": expire, "type": "access"}
        return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def create_refresh_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(days=7)
        data = {"sub": user_id, "exp": expire, "type": "refresh"}
        return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def create_tokens(self, user_id: str) -> dict:
        return {
            "access_token": self.create_access_token(user_id),
            "refresh_token": self.create_refresh_token(user_id),
            "token_type": "bearer",
        }

    async def create_user(self, email: str, password: str) -> dict:
        if email in users_db:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = str(uuid.uuid4())
        user = {"id": user_id, "email": email, "hashed_password": self.hash_password(password)}
        users_db[email] = user
        return {"id": user_id, "email": email}

    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        user = users_db.get(email)
        if not user or not self.verify_password(password, user["hashed_password"]):
            return None
        return user

    async def refresh_tokens(self, refresh_token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            if payload.get("type") != "refresh":
                return None
            user_id = payload.get("sub")
            return self.create_tokens(user_id)
        except JWTError:
            return None

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Find user by id
        for user in users_db.values():
            if user["id"] == user_id:
                return {"id": user["id"], "email": user["email"], "role": user.get("role", "customer")}
        raise HTTPException(status_code=401, detail="User not found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[dict]:
    """Get current user if authenticated, otherwise return None."""
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
    """Require admin role to access endpoint."""
    role = current_user.get("role", "customer")
    if role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
