from sqlalchemy import Column, Integer, String, DateTime, Text, Date
from database import Base
from datetime import datetime, date

class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Personal Information
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(200), nullable=True, index=True)
    id_proof_type = Column(String(50), nullable=True)  # Aadhar, Passport, etc.
    id_proof_number = Column(String(50), nullable=True)

    # Address
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)

    # Guest Preferences and Notes
    preferences = Column(Text, nullable=True)  # Room preferences, food allergies, etc.
    special_notes = Column(Text, nullable=True)

    # Statistics
    total_bookings = Column(Integer, default=0)
    total_spent = Column(Integer, default=0)  # Total amount spent across all bookings
    first_visit = Column(Date, nullable=True)
    last_visit = Column(Date, nullable=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models for API
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime as dt, date as date_type

class GuestCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    id_proof_type: Optional[str] = Field(None, max_length=50)
    id_proof_number: Optional[str] = Field(None, max_length=50)

    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=20)

    preferences: Optional[str] = None
    special_notes: Optional[str] = None

class GuestUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    id_proof_type: Optional[str] = Field(None, max_length=50)
    id_proof_number: Optional[str] = Field(None, max_length=50)

    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=20)

    preferences: Optional[str] = None
    special_notes: Optional[str] = None

class GuestResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    email: Optional[str]
    id_proof_type: Optional[str]
    id_proof_number: Optional[str]

    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    pincode: Optional[str]

    preferences: Optional[str]
    special_notes: Optional[str]

    total_bookings: int
    total_spent: float
    first_visit: Optional[date_type]
    last_visit: Optional[date_type]

    created_at: dt
    updated_at: dt

    class Config:
        from_attributes = True

class GuestListResponse(BaseModel):
    """Simplified guest response for list views"""
    id: int
    full_name: str
    phone: str
    email: Optional[str]
    total_bookings: int
    total_spent: float
    last_visit: Optional[date_type]

class GuestSearchFilters(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    min_bookings: Optional[int] = Field(None, ge=0)
    min_spent: Optional[float] = Field(None, ge=0)