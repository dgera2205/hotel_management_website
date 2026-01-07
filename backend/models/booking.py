from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Date
from sqlalchemy.types import Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, date
import enum

class BookingSourceEnum(str, enum.Enum):
    WALK_IN = "Walk-in"
    PHONE = "Phone"
    OTA_MAKEMYTRIP = "OTA-MakeMyTrip"
    OTA_BOOKING_COM = "OTA-Booking.com"
    OTA_GOIBIBO = "OTA-Goibibo"
    OTA_AGODA = "OTA-Agoda"
    CORPORATE = "Corporate"
    REPEAT_CUSTOMER = "Repeat Customer"
    AGENT = "Agent"
    OTHER = "Other"

class PaymentStatusEnum(str, enum.Enum):
    PAID = "Paid"
    PARTIALLY_PAID = "Partially Paid"
    UNPAID = "Unpaid"

class PaymentModeEnum(str, enum.Enum):
    CASH = "Cash"
    UPI = "UPI"
    CARD = "Card"
    BANK_TRANSFER = "Bank Transfer"

class BookingStatusEnum(str, enum.Enum):
    CONFIRMED = "Confirmed"
    CHECKED_IN = "Checked In"
    CHECKED_OUT = "Checked Out"
    CANCELLED = "Cancelled"
    NO_SHOW = "No Show"


class BookingTypeEnum(str, enum.Enum):
    """Type of booking - Hotel room or Event"""
    HOTEL = "Hotel"
    EVENT = "Event"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Booking Type (Hotel or Event - for reports filtering)
    booking_type = Column(Enum(BookingTypeEnum), nullable=False, default=BookingTypeEnum.HOTEL)

    # Guest Information
    guest_name = Column(String(200), nullable=False)
    guest_phone = Column(String(20), nullable=False)
    guest_email = Column(String(200), nullable=True)
    guest_id_proof = Column(String(50), nullable=True)

    # Booking Details
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    actual_check_in = Column(DateTime, nullable=True)
    actual_check_out = Column(DateTime, nullable=True)

    # Guest Count
    adults = Column(Integer, nullable=False, default=1)
    children = Column(Integer, nullable=False, default=0)

    # Booking Source and Reference
    booking_source = Column(Enum(BookingSourceEnum), nullable=False)
    booking_reference = Column(String(100), nullable=True)

    # Financial Information
    room_rate_per_night = Column(Float, nullable=False)
    total_nights = Column(Integer, nullable=False)
    room_charges = Column(Float, nullable=False)
    additional_charges = Column(Float, default=0.0)  # Services, extras etc.
    total_amount = Column(Float, nullable=False)
    advance_payment = Column(Float, default=0.0)
    balance_due = Column(Float, nullable=False)

    # Payment Information
    payment_status = Column(Enum(PaymentStatusEnum), nullable=False, default=PaymentStatusEnum.UNPAID)
    payment_mode = Column(Enum(PaymentModeEnum), nullable=True)

    # Status and Notes
    status = Column(Enum(BookingStatusEnum), nullable=False, default=BookingStatusEnum.CONFIRMED)
    special_requests = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    room = relationship("Room", backref="bookings")

# Service charges model for additional room services
class BookingService(Base):
    __tablename__ = "booking_services"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)

    service_name = Column(String(200), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    service_date = Column(DateTime, default=datetime.utcnow)

    notes = Column(Text, nullable=True)

    # Relationships
    booking = relationship("Booking", backref="services")

# Pydantic models for API
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime as dt, date as date_type

class BookingServiceCreate(BaseModel):
    service_name: str = Field(..., min_length=1, max_length=200)
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., ge=0)
    notes: Optional[str] = None

class BookingServiceResponse(BaseModel):
    id: int
    service_name: str
    quantity: int
    unit_price: float
    total_price: float
    service_date: dt
    notes: Optional[str]

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    booking_type: BookingTypeEnum = BookingTypeEnum.HOTEL

    guest_name: str = Field(..., min_length=1, max_length=200)
    guest_phone: str = Field(..., min_length=10, max_length=20)
    guest_email: Optional[str] = None
    guest_id_proof: Optional[str] = None

    room_id: int
    check_in_date: date_type
    check_out_date: date_type

    adults: int = Field(default=1, ge=1, le=10)
    children: int = Field(default=0, ge=0, le=10)

    booking_source: BookingSourceEnum
    booking_reference: Optional[str] = None

    room_rate_per_night: float = Field(..., ge=0)
    advance_payment: float = Field(default=0.0, ge=0)

    payment_mode: Optional[PaymentModeEnum] = None
    special_requests: Optional[str] = None
    notes: Optional[str] = None

    @validator('check_out_date')
    def validate_dates(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out date must be after check-in date')
        return v

class BookingUpdate(BaseModel):
    booking_type: Optional[BookingTypeEnum] = None

    guest_name: Optional[str] = Field(None, min_length=1, max_length=200)
    guest_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    guest_email: Optional[str] = None
    guest_id_proof: Optional[str] = None

    check_in_date: Optional[date_type] = None
    check_out_date: Optional[date_type] = None

    adults: Optional[int] = Field(None, ge=1, le=10)
    children: Optional[int] = Field(None, ge=0, le=10)

    booking_source: Optional[BookingSourceEnum] = None
    booking_reference: Optional[str] = None

    room_rate_per_night: Optional[float] = Field(None, ge=0)
    advance_payment: Optional[float] = Field(None, ge=0)

    payment_status: Optional[PaymentStatusEnum] = None
    payment_mode: Optional[PaymentModeEnum] = None
    status: Optional[BookingStatusEnum] = None

    special_requests: Optional[str] = None
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    id: int
    booking_type: BookingTypeEnum

    guest_name: str
    guest_phone: str
    guest_email: Optional[str]
    guest_id_proof: Optional[str]

    room_id: int
    check_in_date: date_type
    check_out_date: date_type
    actual_check_in: Optional[dt]
    actual_check_out: Optional[dt]

    adults: int
    children: int

    booking_source: BookingSourceEnum
    booking_reference: Optional[str]

    room_rate_per_night: float
    total_nights: int
    room_charges: float
    additional_charges: float
    total_amount: float
    advance_payment: float
    balance_due: float

    payment_status: PaymentStatusEnum
    payment_mode: Optional[PaymentModeEnum]
    status: BookingStatusEnum

    special_requests: Optional[str]
    notes: Optional[str]

    created_at: dt
    updated_at: dt

    # Related data
    room: Optional[dict] = None  # Will be populated by the API
    services: List[BookingServiceResponse] = []

    class Config:
        from_attributes = True

class BookingListResponse(BaseModel):
    """Simplified booking response for list views"""
    id: int
    guest_name: str
    guest_phone: str
    room_id: int
    room_number: str
    check_in_date: date_type
    check_out_date: date_type
    total_amount: float
    payment_status: PaymentStatusEnum
    status: BookingStatusEnum
    created_at: dt

class BookingSearchFilters(BaseModel):
    guest_name: Optional[str] = None
    room_number: Optional[str] = None
    booking_source: Optional[BookingSourceEnum] = None
    payment_status: Optional[PaymentStatusEnum] = None
    status: Optional[BookingStatusEnum] = None
    check_in_from: Optional[date_type] = None
    check_in_to: Optional[date_type] = None
    check_out_from: Optional[date_type] = None
    check_out_to: Optional[date_type] = None