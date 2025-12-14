from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.types import Enum
from database import Base
from datetime import datetime
import enum

class RoomTypeEnum(str, enum.Enum):
    SINGLE = "Single"
    DOUBLE = "Double"
    DELUXE = "Deluxe"
    SUITE = "Suite"
    FAMILY_ROOM = "Family Room"
    CUSTOM = "Custom"

class BedConfigEnum(str, enum.Enum):
    SINGLE_BED = "Single Bed"
    DOUBLE_BED = "Double Bed"
    TWIN_BEDS = "Twin Beds"
    KING_BED = "King Bed"

class RoomStatusEnum(str, enum.Enum):
    ACTIVE = "Active"
    UNDER_MAINTENANCE = "Under Maintenance"
    INACTIVE = "Inactive"

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_number = Column(String(20), unique=True, nullable=False, index=True)
    room_type = Column(Enum(RoomTypeEnum), nullable=False)
    bed_configuration = Column(Enum(BedConfigEnum), nullable=False)
    floor_number = Column(Integer, nullable=False)
    base_price = Column(Float, nullable=False)
    max_occupancy = Column(Integer, nullable=False, default=2)
    status = Column(Enum(RoomStatusEnum), nullable=False, default=RoomStatusEnum.ACTIVE)

    # Amenities as boolean fields for easy filtering
    has_ac = Column(Boolean, default=False)
    has_tv = Column(Boolean, default=False)
    has_wifi = Column(Boolean, default=False)
    has_balcony = Column(Boolean, default=False)
    has_refrigerator = Column(Boolean, default=False)
    has_mini_bar = Column(Boolean, default=False)
    has_safe = Column(Boolean, default=False)
    has_bathtub = Column(Boolean, default=False)

    # Additional fields
    notes = Column(Text, nullable=True)
    custom_room_type = Column(String(100), nullable=True)  # For custom room types

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models for API
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime as dt

class RoomCreate(BaseModel):
    room_number: str = Field(..., min_length=1, max_length=20)
    room_type: RoomTypeEnum
    bed_configuration: BedConfigEnum
    floor_number: int = Field(..., ge=0)
    base_price: float = Field(..., ge=0)
    max_occupancy: int = Field(default=2, ge=1, le=10)
    status: RoomStatusEnum = RoomStatusEnum.ACTIVE

    # Amenities
    has_ac: bool = False
    has_tv: bool = False
    has_wifi: bool = False
    has_balcony: bool = False
    has_refrigerator: bool = False
    has_mini_bar: bool = False
    has_safe: bool = False
    has_bathtub: bool = False

    notes: Optional[str] = None
    custom_room_type: Optional[str] = None

class RoomUpdate(BaseModel):
    room_type: Optional[RoomTypeEnum] = None
    bed_configuration: Optional[BedConfigEnum] = None
    floor_number: Optional[int] = Field(None, ge=0)
    base_price: Optional[float] = Field(None, ge=0)
    max_occupancy: Optional[int] = Field(None, ge=1, le=10)
    status: Optional[RoomStatusEnum] = None

    # Amenities
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
    id: int
    room_number: str
    room_type: RoomTypeEnum
    bed_configuration: BedConfigEnum
    floor_number: int
    base_price: float
    max_occupancy: int
    status: RoomStatusEnum

    # Amenities
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
        from_attributes = True

class RoomSummary(BaseModel):
    """Summary stats for rooms"""
    total_rooms: int
    active_rooms: int
    inactive_rooms: int
    under_maintenance: int
    room_types: dict