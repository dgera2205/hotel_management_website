from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from database import get_db
from models.room import (
    Room, RoomCreate, RoomUpdate, RoomResponse, RoomSummary,
    RoomTypeEnum, RoomStatusEnum
)

router = APIRouter()

@router.post("/", response_model=RoomResponse, status_code=201)
async def create_room(
    room_data: RoomCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new room"""
    # Check if room number already exists
    existing_room = await db.execute(
        select(Room).where(Room.room_number == room_data.room_number)
    )
    if existing_room.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Room number already exists")

    # Create new room
    room = Room(**room_data.dict())
    db.add(room)
    await db.commit()
    await db.refresh(room)

    return room

@router.get("/", response_model=List[RoomResponse])
async def list_rooms(
    status: Optional[RoomStatusEnum] = None,
    room_type: Optional[RoomTypeEnum] = None,
    floor: Optional[int] = None,
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of rooms with optional filters"""
    query = select(Room)

    filters = []
    if status:
        filters.append(Room.status == status)
    if room_type:
        filters.append(Room.room_type == room_type)
    if floor is not None:
        filters.append(Room.floor_number == floor)
    if min_price is not None:
        filters.append(Room.base_price >= min_price)
    if max_price is not None:
        filters.append(Room.base_price <= max_price)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Room.room_number).offset(skip).limit(limit)

    result = await db.execute(query)
    rooms = result.scalars().all()

    return rooms

@router.get("/summary", response_model=RoomSummary)
async def get_room_summary(db: AsyncSession = Depends(get_db)):
    """Get room summary statistics"""
    # Total counts by status
    total_query = await db.execute(select(func.count(Room.id)))
    total_rooms = total_query.scalar() or 0

    active_query = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatusEnum.ACTIVE)
    )
    active_rooms = active_query.scalar() or 0

    inactive_query = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatusEnum.INACTIVE)
    )
    inactive_rooms = inactive_query.scalar() or 0

    maintenance_query = await db.execute(
        select(func.count(Room.id)).where(Room.status == RoomStatusEnum.UNDER_MAINTENANCE)
    )
    under_maintenance = maintenance_query.scalar() or 0

    # Room types distribution
    type_query = await db.execute(
        select(Room.room_type, func.count(Room.id)).group_by(Room.room_type)
    )
    room_types = {row[0]: row[1] for row in type_query.all()}

    return RoomSummary(
        total_rooms=total_rooms,
        active_rooms=active_rooms,
        inactive_rooms=inactive_rooms,
        under_maintenance=under_maintenance,
        room_types=room_types
    )

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    """Get room by ID"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return room

@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_data: RoomUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update room information"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Update fields that were provided
    update_data = room_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room, field, value)

    await db.commit()
    await db.refresh(room)

    return room

@router.delete("/{room_id}")
async def delete_room(room_id: int, db: AsyncSession = Depends(get_db)):
    """Delete room (soft delete - mark as inactive)"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if room has active bookings before allowing deletion
    # This would require checking booking table - for now just mark inactive
    room.status = RoomStatusEnum.INACTIVE
    await db.commit()

    return {"message": "Room deactivated successfully"}

@router.get("/number/{room_number}", response_model=RoomResponse)
async def get_room_by_number(room_number: str, db: AsyncSession = Depends(get_db)):
    """Get room by room number"""
    result = await db.execute(
        select(Room).where(Room.room_number == room_number)
    )
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return room

@router.patch("/{room_id}/status", response_model=RoomResponse)
async def update_room_status(
    room_id: int,
    status: RoomStatusEnum,
    db: AsyncSession = Depends(get_db)
):
    """Update room status only"""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room.status = status
    await db.commit()
    await db.refresh(room)

    return room

@router.get("/available/dates")
async def get_available_rooms_for_dates(
    check_in: str = Query(..., description="Check-in date (YYYY-MM-DD)"),
    check_out: str = Query(..., description="Check-out date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """Get available rooms for given dates (requires booking integration)"""
    # This endpoint will be fully implemented once booking model is integrated
    # For now, return all active rooms
    query = select(Room).where(Room.status == RoomStatusEnum.ACTIVE).order_by(Room.room_number)
    result = await db.execute(query)
    rooms = result.scalars().all()

    return rooms