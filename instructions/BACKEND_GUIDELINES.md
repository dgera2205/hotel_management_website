# Backend Guidelines - 378625e7-3833-4ff4-9ee6-3baec4a915ab

## Code Consistency

### Project Structure
```
backend/
├── src/
│   ├── routes/        # API route handlers
│   ├── models/        # Data models
│   ├── services/      # Business logic
│   ├── middleware/    # Request middleware
│   ├── utils/         # Helper functions
│   └── config/        # Configuration
├── tests/             # Test files
└── Dockerfile         # Container config
```

### Naming Conventions
- **Files**: snake_case (e.g., `user_service.py`, `user_service.ts`)
- **Classes**: PascalCase (e.g., `UserService`, `OrderController`)
- **Functions**: snake_case or camelCase (follow language convention)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Database tables**: snake_case plural (e.g., `users`, `order_items`)

### API Design Principles

#### RESTful Conventions
- Use proper HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Return appropriate status codes
- Use consistent URL patterns
- Version your API (e.g., `/api/v1/`)

#### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "errors": []
}
```

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```


## FastAPI + Python Guidelines

### Router Organization
```python
# src/routes/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserResponse, UserUpdate
from ..services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> list[User]:
    """Retrieve all users with pagination."""
    service = UserService(db)
    return service.get_users(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db)
) -> User:
    """Retrieve a specific user by ID."""
    service = UserService(db)
    user = service.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> User:
    """Create a new user."""
    service = UserService(db)
    return service.create_user(user_data)
```

### Pydantic Schemas
```python
# src/schemas/user.py
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    is_active: bool | None = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

### Service Layer Pattern
```python
# src/services/user_service.py
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        return self.db.query(User).offset(skip).limit(limit).all()

    def get_user(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def create_user(self, user_data: UserCreate) -> User:
        hashed_password = pwd_context.hash(user_data.password)
        db_user = User(
            email=user_data.email,
            name=user_data.name,
            hashed_password=hashed_password
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def update_user(self, user_id: int, user_data: UserUpdate) -> User | None:
        user = self.get_user(user_id)
        if not user:
            return None

        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user
```

### Dependency Injection
```python
# src/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .database import get_db
from .config import settings
from .services.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    service = UserService(db)
    user = service.get_user(user_id)
    if user is None:
        raise credentials_exception
    return user
```

### Error Handling
```python
# src/exceptions.py
from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict | None = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "success": False,
                "error": {
                    "code": code,
                    "message": message,
                    "details": details or {}
                }
            }
        )

class NotFoundError(AppException):
    def __init__(self, resource: str, id: int | str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"{resource} not found",
            details={"id": id}
        )

class ValidationError(AppException):
    def __init__(self, message: str, details: dict):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
            details=details
        )
```


## Database Guidelines

### Query Best Practices
- Use parameterized queries (prevent SQL injection)
- Index frequently queried columns
- Avoid N+1 query problems
- Use transactions for related operations

### Migration Standards
- Write reversible migrations
- Never modify existing migrations in production
- Include both up and down migrations
- Test migrations before deployment

## Security

### Authentication & Authorization
- Use secure token-based authentication (JWT)
- Implement proper password hashing
- Apply principle of least privilege
- Validate and sanitize all inputs

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement rate limiting
- Log security-relevant events

## Error Handling

### Consistent Error Handling
```python
# Example pattern
class AppError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code = code
        self.message = message
        self.status = status
```

### Logging Standards
- Log at appropriate levels (DEBUG, INFO, WARN, ERROR)
- Include context in log messages
- Never log sensitive information
- Use structured logging format

## Testing

### Test Organization
- Unit tests for business logic
- Integration tests for API endpoints
- Use fixtures for test data
- Mock external dependencies

### Test Naming
```python
def test_user_creation_with_valid_data_succeeds():
    pass

def test_user_creation_with_invalid_email_fails():
    pass
```

## Performance

### Optimization Guidelines
- Cache frequently accessed data
- Use connection pooling for databases
- Implement pagination for list endpoints
- Profile and optimize slow queries
- Use async operations for I/O-bound tasks
