"""
User Models Module

This module defines Pydantic models for user authentication and management.
Note: This application uses a simple password-based authentication system
where staff members share a common password, rather than individual user accounts.

The User models here are primarily used for JWT token validation and
potential future expansion to individual user accounts.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class User(BaseModel):
    """
    Base user model for authentication purposes.

    This is a Pydantic model (not SQLAlchemy) used for validating
    user data in API requests and responses.

    Attributes:
        id: Unique identifier for the user
        email: User's email address (validated as proper email format)
        hashed_password: Bcrypt-hashed password string
    """
    id: str
    email: EmailStr
    hashed_password: str


class UserInDB(User):
    """
    User model with database-specific fields.

    Extends the base User model with any additional fields that are
    stored in the database but not exposed in API responses.
    Currently identical to User, but allows for future extension.
    """
    pass
