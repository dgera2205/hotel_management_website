"""
Room Models Module

This module defines the Room model and related Pydantic schemas for hotel
room management. Rooms are the core entity of the hotel system, with each
room having a unique number, type, pricing, and amenities configuration.

Database Table: rooms
Relationships: One-to-Many with bookings (a room can have multiple bookings)
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.types import Enum
from database import Base
from datetime import datetime
import enum


# =============================================================================
# Enumeration Types
# =============================================================================

class RoomTypeEnum(str, enum.Enum):
    """
    Available room types in the hotel.

    Values are stored as strings in the database for readability.
    CUSTOM type allows for user-defined room types via custom_room_type field.
    """
    SINGLE = "Single"           # Basic single occupancy room
    DOUBLE = "Double"           # Standard double occupancy room
    DELUXE = "Deluxe"           # Premium room with extra amenities
    SUITE = "Suite"             # Luxury suite with separate living area
    FAMILY_ROOM = "Family Room" # Larger room for families
    CUSTOM = "Custom"           # User-defined room type


class BedConfigEnum(str, enum.Enum):
    """
    Bed configuration options for rooms.

    Determines the sleeping arrangement in the room.
    """
    SINGLE_BED = "Single Bed"   # One single bed
    DOUBLE_BED = "Double Bed"   # One double/queen bed
    TWIN_BEDS = "Twin Beds"     # Two single beds
    KING_BED = "King Bed"       # One king-size bed


class RoomStatusEnum(str, enum.Enum):
    """
    Room availability status.

    Controls whether the room can be booked in the calendar view.
    """
    ACTIVE = "Active"                       # Available for booking
    UNDER_MAINTENANCE = "Under Maintenance" # Temporarily unavailable
    INACTIVE = "Inactive"                   # Permanently unavailable


# =============================================================================
# SQLAlchemy ORM Model
# =============================================================================

class Room(Base):
    """
    SQLAlchemy model representing a hotel room.

    This model stores all room information including identification,
    configuration, pricing, amenities, and status. Each room is uniquely
    identified by its room_number.

    Table: rooms
    Primary Key: id (auto-increment)
    Unique Constraint: room_number
    """
    __tablename__ = "rooms"

    # Primary identification
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_number = Column(String(20), unique=True, nullable=False, index=True)  # e.g., "101", "A-201"

    # Room configuration
    room_type = Column(Enum(RoomTypeEnum), nullable=False)
    bed_configuration = Column(Enum(BedConfigEnum), nullable=False)
    floor_number = Column(Integer, nullable=False)
    base_price = Column(Float, nullable=False)  # Price per night in INR
    max_occupancy = Column(Integer, nullable=False, default=2)  # Maximum guests
    status = Column(Enum(RoomStatusEnum), nullable=False, default=RoomStatusEnum.ACTIVE)

    # Amenities - boolean flags for easy filtering and display
    has_ac = Column(Boolean, default=False)           # Air conditioning
    has_tv = Column(Boolean, default=False)           # Television
    has_wifi = Column(Boolean, default=False)         # WiFi access
    has_balcony = Column(Boolean, default=False)      # Private balcony
    has_refrigerator = Column(Boolean, default=False) # Mini refrigerator
    has_mini_bar = Column(Boolean, default=False)     # Mini bar
    has_safe = Column(Boolean, default=False)         # In-room safe
    has_bathtub = Column(Boolean, default=False)      # Bathtub (vs shower only)

    # Additional information
    notes = Column(Text, nullable=True)  # Internal notes about the room
    custom_room_type = Column(String(100), nullable=True)  # Used when room_type is CUSTOM

    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# =============================================================================
# Pydantic API Schemas
# =============================================================================

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime as dt


class RoomCreate(BaseModel):
    """
    Schema for creating a new room.

    All required fields must be provided. Amenity flags default to False.
    Used for POST /rooms/ endpoint.
    """
    room_number: str = Field(..., min_length=1, max_length=20)  # Unique identifier like "101"
    room_type: RoomTypeEnum
    bed_configuration: BedConfigEnum
    floor_number: int = Field(..., ge=0)       # Floor 0 = ground floor
    base_price: float = Field(..., ge=0)       # Price per night in INR
    max_occupancy: int = Field(default=2, ge=1, le=10)
    status: RoomStatusEnum = RoomStatusEnum.ACTIVE

    # Room amenities - all default to False
    has_ac: bool = False
    has_tv: bool = False
    has_wifi: bool = False
    has_balcony: bool = False
    has_refrigerator: bool = False
    has_mini_bar: bool = False
    has_safe: bool = False
    has_bathtub: bool = False

    notes: Optional[str] = None
    custom_room_type: Optional[str] = None  # Required if room_type is CUSTOM


class RoomUpdate(BaseModel):
    """
    Schema for updating an existing room.

    All fields are optional - only provided fields will be updated.
    Used for PUT /rooms/{id} endpoint.
    """
    room_type: Optional[RoomTypeEnum] = None
    bed_configuration: Optional[BedConfigEnum] = None
    floor_number: Optional[int] = Field(None, ge=0)
    base_price: Optional[float] = Field(None, ge=0)
    max_occupancy: Optional[int] = Field(None, ge=1, le=10)
    status: Optional[RoomStatusEnum] = None

    # Room amenities
    has_ac: Optional[bool] = None
    has_tv: Optional[bool] = None
    has_wifi: Optional[bool] = None
    has_balcony: Optional[bool] = None
    has_refrigerator: Optional[bool] = None
    has_mini_bar: Optional[bool] = None
    has_safe: Optional[bool] = None
    has_bathtub: Optional[bool] = None

    notes: Optional[str] = None
    custom_room_type: Optional[str] = None


class RoomResponse(BaseModel):
    """
    Schema for room data in API responses.

    Includes all room fields plus audit timestamps.
    Used for GET /rooms/ and GET /rooms/{id} responses.
    """
    id: int
    room_number: str
    room_type: RoomTypeEnum
    bed_configuration: BedConfigEnum
    floor_number: int
    base_price: float
    max_occupancy: int
    status: RoomStatusEnum

    # Room amenities
    has_ac: bool
    has_tv: bool
    has_wifi: bool
    has_balcony: bool
    has_refrigerator: bool
    has_mini_bar: bool
    has_safe: bool
    has_bathtub: bool

    notes: Optional[str]
    custom_room_type: Optional[str]

    created_at: dt
    updated_at: dt

    class Config:
        """Enable ORM mode for SQLAlchemy model conversion."""
        from_attributes = True


class RoomSummary(BaseModel):
    """
    Aggregated statistics for room inventory.

    Used for dashboard displays and reporting.
    Returned by GET /rooms/summary endpoint.
    """
    total_rooms: int          # Total number of rooms in the system
    active_rooms: int         # Rooms available for booking
    inactive_rooms: int       # Rooms marked as inactive
    under_maintenance: int    # Rooms under maintenance
    room_types: dict          # Count of rooms by type (e.g., {"Single": 5, "Double": 10})