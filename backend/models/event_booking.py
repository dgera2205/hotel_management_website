"""
Event Booking Models and Schemas

This module defines the data models for event bookings (weddings, corporate events, etc.)
with dual-track financial management - tracking both customer revenue and vendor expenses.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Date
from sqlalchemy.types import Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, date
import enum
from pydantic import BaseModel, Field, validator
from typing import Optional, List


# =============================================================================
# ENUMS
# =============================================================================

class EventBookingStatusEnum(str, enum.Enum):
    """Status of an event booking"""
    CONFIRMED = "Confirmed"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class EventServiceTypeEnum(str, enum.Enum):
    """Types of services available for events"""
    MARRIAGE_GARDEN = "Marriage Garden"
    ROOMS = "Rooms"
    TENTING = "Tenting"
    ELECTRICITY = "Electricity"
    GENERATOR = "Generator"
    LABOUR = "Labour"
    EVENT_SERVICES = "Event Services"
    CUSTOM = "Custom"


class PaymentModeEnum(str, enum.Enum):
    """Payment modes for transactions"""
    CASH = "Cash"
    UPI = "UPI"
    CARD = "Card"
    BANK_TRANSFER = "Bank Transfer"
    CHEQUE = "Cheque"


# =============================================================================
# SQLALCHEMY MODELS
# =============================================================================

class EventBooking(Base):
    """
    Main event booking entity.

    Tracks event details, contact information, and has relationships
    to services and customer payments.
    """
    __tablename__ = "event_bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Basic Information
    booking_name = Column(String(300), nullable=False)  # Event name/title
    booking_date = Column(Date, nullable=False)  # Event date

    # Contact Information
    contact_name = Column(String(200), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    contact_email = Column(String(200), nullable=True)

    # Status
    status = Column(Enum(EventBookingStatusEnum), nullable=False, default=EventBookingStatusEnum.CONFIRMED)

    # Notes
    notes = Column(Text, nullable=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    services = relationship("EventService", back_populates="event_booking", cascade="all, delete-orphan")
    customer_payments = relationship("EventCustomerPayment", back_populates="event_booking", cascade="all, delete-orphan")


class EventService(Base):
    """
    Service provided for an event.

    Tracks both customer pricing (revenue) and vendor costs (expenses).
    One vendor per service.
    """
    __tablename__ = "event_services"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_booking_id = Column(Integer, ForeignKey("event_bookings.id"), nullable=False)

    # Service Type (fixed enum or custom)
    service_type = Column(Enum(EventServiceTypeEnum), nullable=False)
    custom_service_name = Column(String(200), nullable=True)  # Only for CUSTOM type

    # Financial - dual tracking
    customer_price = Column(Float, nullable=False, default=0.0)  # Revenue from customer
    vendor_cost = Column(Float, nullable=False, default=0.0)    # Cost to vendor

    # Vendor tracking
    vendor_name = Column(String(200), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    event_booking = relationship("EventBooking", back_populates="services")
    vendor_payments = relationship("EventVendorPayment", back_populates="service", cascade="all, delete-orphan")


class EventCustomerPayment(Base):
    """
    Payment received from customer for an event.

    Multiple date-stamped payment entries can be recorded per event.
    """
    __tablename__ = "event_customer_payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_booking_id = Column(Integer, ForeignKey("event_bookings.id"), nullable=False)

    payment_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    event_booking = relationship("EventBooking", back_populates="customer_payments")


class EventVendorPayment(Base):
    """
    Payment made to vendor for a specific service.

    Multiple date-stamped payment entries can be recorded per service.
    """
    __tablename__ = "event_vendor_payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_service_id = Column(Integer, ForeignKey("event_services.id"), nullable=False)

    payment_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    service = relationship("EventService", back_populates="vendor_payments")


# =============================================================================
# PYDANTIC SCHEMAS - PAYMENTS
# =============================================================================

class EventCustomerPaymentCreate(BaseModel):
    """Schema for creating a customer payment"""
    payment_date: date
    amount: float = Field(..., gt=0)
    payment_mode: Optional[str] = None
    notes: Optional[str] = None


class EventCustomerPaymentResponse(BaseModel):
    """Schema for customer payment response"""
    id: int
    payment_date: date
    amount: float
    payment_mode: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EventVendorPaymentCreate(BaseModel):
    """Schema for creating a vendor payment"""
    payment_date: date
    amount: float = Field(..., gt=0)
    payment_mode: Optional[str] = None
    notes: Optional[str] = None


class EventVendorPaymentResponse(BaseModel):
    """Schema for vendor payment response"""
    id: int
    payment_date: date
    amount: float
    payment_mode: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# PYDANTIC SCHEMAS - SERVICES
# =============================================================================

class EventServiceCreate(BaseModel):
    """Schema for creating a service"""
    service_type: EventServiceTypeEnum
    custom_service_name: Optional[str] = None
    customer_price: float = Field(default=0.0, ge=0)
    vendor_cost: float = Field(default=0.0, ge=0)
    vendor_name: Optional[str] = None
    notes: Optional[str] = None

    @validator('custom_service_name')
    def validate_custom_name(cls, v, values):
        if values.get('service_type') == EventServiceTypeEnum.CUSTOM and not v:
            raise ValueError('Custom service name is required for CUSTOM service type')
        return v


class EventServiceUpdate(BaseModel):
    """Schema for updating a service"""
    service_type: Optional[EventServiceTypeEnum] = None
    custom_service_name: Optional[str] = None
    customer_price: Optional[float] = Field(None, ge=0)
    vendor_cost: Optional[float] = Field(None, ge=0)
    vendor_name: Optional[str] = None
    notes: Optional[str] = None


class EventServiceResponse(BaseModel):
    """Schema for service response with payment details"""
    id: int
    service_type: EventServiceTypeEnum
    custom_service_name: Optional[str]
    customer_price: float
    vendor_cost: float
    vendor_name: Optional[str]
    notes: Optional[str]
    # Computed fields
    vendor_total_paid: float = 0.0
    vendor_pending: float = 0.0
    vendor_payments: List[EventVendorPaymentResponse] = []

    class Config:
        from_attributes = True


# =============================================================================
# PYDANTIC SCHEMAS - EVENT BOOKING
# =============================================================================

class EventBookingCreate(BaseModel):
    """Schema for creating an event booking"""
    booking_name: str = Field(..., min_length=1, max_length=300)
    booking_date: date
    contact_name: str = Field(..., min_length=1, max_length=200)
    contact_phone: str = Field(..., min_length=10, max_length=20)
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    services: List[EventServiceCreate] = []


class EventBookingUpdate(BaseModel):
    """Schema for updating an event booking"""
    booking_name: Optional[str] = Field(None, min_length=1, max_length=300)
    booking_date: Optional[date] = None
    contact_name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    contact_email: Optional[str] = None
    status: Optional[EventBookingStatusEnum] = None
    notes: Optional[str] = None


class EventBookingResponse(BaseModel):
    """Full event booking response with all details and computed financials"""
    id: int
    booking_name: str
    booking_date: date
    contact_name: str
    contact_phone: str
    contact_email: Optional[str]
    status: EventBookingStatusEnum
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Services with full details
    services: List[EventServiceResponse] = []

    # Customer payments
    customer_payments: List[EventCustomerPaymentResponse] = []

    # Computed financial summary - Revenue
    total_customer_price: float = 0.0
    total_collected: float = 0.0
    customer_pending: float = 0.0

    # Computed financial summary - Expenses
    total_vendor_cost: float = 0.0
    total_vendor_paid: float = 0.0
    vendor_pending: float = 0.0

    # Profit
    profit_margin: float = 0.0

    class Config:
        from_attributes = True


class EventBookingListResponse(BaseModel):
    """Simplified event booking response for list views"""
    id: int
    booking_name: str
    booking_date: date
    contact_name: str
    contact_phone: str
    status: EventBookingStatusEnum
    total_customer_price: float = 0.0
    total_collected: float = 0.0
    customer_pending: float = 0.0
    total_vendor_cost: float = 0.0
    total_vendor_paid: float = 0.0
    vendor_pending: float = 0.0
    created_at: datetime
    is_collapsed: bool = False  # True if event date is > 3 days ago

    class Config:
        from_attributes = True


class EventBookingSummary(BaseModel):
    """Summary statistics for event bookings (for reports)"""
    total_events: int = 0
    confirmed_events: int = 0
    completed_events: int = 0
    cancelled_events: int = 0
    total_revenue: float = 0.0
    total_collected: float = 0.0
    revenue_pending: float = 0.0
    total_expenses: float = 0.0
    total_paid: float = 0.0
    expenses_pending: float = 0.0
    total_profit: float = 0.0
