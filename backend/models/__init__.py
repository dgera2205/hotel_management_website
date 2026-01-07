"""
Models Package - Hotel Management System

This package contains all data models for the Hotel Management System, including:
- SQLAlchemy ORM models for database tables
- Pydantic models for API request/response validation

Model Categories:
-----------------
User Models:
    - User: Base user model for authentication
    - UserInDB: User model with database-specific fields

Room Models:
    - Room: SQLAlchemy model for hotel rooms
    - RoomCreate/Update/Response: Pydantic schemas for CRUD operations
    - RoomSummary: Aggregated room statistics

Booking Models:
    - Booking: Guest reservation records
    - BookingService: Additional services added to bookings
    - BookingCreate/Update/Response: API schemas
    - BookingSearchFilters: Query filter parameters

Expense Models:
    - Expense: Operational expense tracking
    - ExpenseCreate/Update/Response: API schemas
    - ExpenseSummary: Financial summaries
    - ExpenseSearchFilters: Query filter parameters

Guest Models:
    - Guest: Guest information and history
    - GuestCreate/Update/Response: API schemas
    - GuestSearchFilters: Query filter parameters

Event Booking Models:
    - EventBooking: Event booking records (weddings, corporate events)
    - EventService: Services provided for events with dual pricing
    - EventCustomerPayment: Customer payment tracking
    - EventVendorPayment: Vendor payment tracking
    - EventBookingCreate/Update/Response: API schemas
"""

# User models for authentication
from .user import User, UserInDB

# Room models for hotel room management
from .room import Room, RoomCreate, RoomUpdate, RoomResponse, RoomSummary

# Booking models for reservation management
from .booking import Booking, BookingService, BookingCreate, BookingUpdate, BookingResponse, BookingListResponse, BookingSearchFilters

# Expense models for financial tracking
from .expense import Expense, ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseListResponse, ExpenseSummary, ExpenseSearchFilters

# Guest models for customer management
from .guest import Guest, GuestCreate, GuestUpdate, GuestResponse, GuestListResponse, GuestSearchFilters

# Event booking models for event management
from .event_booking import (
    EventBooking, EventService, EventCustomerPayment, EventVendorPayment,
    EventBookingCreate, EventBookingUpdate, EventBookingResponse, EventBookingListResponse,
    EventServiceCreate, EventServiceUpdate, EventServiceResponse,
    EventCustomerPaymentCreate, EventCustomerPaymentResponse,
    EventVendorPaymentCreate, EventVendorPaymentResponse,
    EventBookingSummary, EventBookingStatusEnum, EventServiceTypeEnum
)

# Re-import SQLAlchemy models to ensure they're registered with Base.metadata
# This is necessary for automatic table creation on application startup
from .room import Room
from .booking import Booking, BookingService
from .expense import Expense
from .guest import Guest
from .event_booking import EventBooking, EventService, EventCustomerPayment, EventVendorPayment

# Explicit exports for 'from models import *' statements
__all__ = [
    # User models
    "User", "UserInDB",
    # Room models
    "Room", "RoomCreate", "RoomUpdate", "RoomResponse", "RoomSummary",
    # Booking models
    "Booking", "BookingService", "BookingCreate", "BookingUpdate", "BookingResponse", "BookingListResponse", "BookingSearchFilters",
    # Expense models
    "Expense", "ExpenseCreate", "ExpenseUpdate", "ExpenseResponse", "ExpenseListResponse", "ExpenseSummary", "ExpenseSearchFilters",
    # Guest models
    "Guest", "GuestCreate", "GuestUpdate", "GuestResponse", "GuestListResponse", "GuestSearchFilters",
    # Event booking models
    "EventBooking", "EventService", "EventCustomerPayment", "EventVendorPayment",
    "EventBookingCreate", "EventBookingUpdate", "EventBookingResponse", "EventBookingListResponse",
    "EventServiceCreate", "EventServiceUpdate", "EventServiceResponse",
    "EventCustomerPaymentCreate", "EventCustomerPaymentResponse",
    "EventVendorPaymentCreate", "EventVendorPaymentResponse",
    "EventBookingSummary", "EventBookingStatusEnum", "EventServiceTypeEnum"
]