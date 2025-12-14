from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from database import get_db
from models.guest import (
    Guest, GuestCreate, GuestUpdate, GuestResponse,
    GuestListResponse, GuestSearchFilters
)

router = APIRouter()

@router.post("/", response_model=GuestResponse, status_code=201)
async def create_guest(
    guest_data: GuestCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new guest"""
    # Check if guest with same phone already exists
    existing_guest = await db.execute(
        select(Guest).where(Guest.phone == guest_data.phone)
    )
    if existing_guest.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Guest with this phone number already exists"
        )

    guest = Guest(**guest_data.dict())
    db.add(guest)
    await db.commit()
    await db.refresh(guest)

    return guest

@router.get("/", response_model=List[GuestListResponse])
async def list_guests(
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    city: Optional[str] = None,
    min_bookings: Optional[int] = Query(None, ge=0),
    min_spent: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of guests with optional filters"""
    query = select(Guest)

    filters = []
    if full_name:
        filters.append(Guest.full_name.ilike(f"%{full_name}%"))
    if phone:
        filters.append(Guest.phone.ilike(f"%{phone}%"))
    if email:
        filters.append(Guest.email.ilike(f"%{email}%"))
    if city:
        filters.append(Guest.city.ilike(f"%{city}%"))
    if min_bookings is not None:
        filters.append(Guest.total_bookings >= min_bookings)
    if min_spent is not None:
        filters.append(Guest.total_spent >= min_spent)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Guest.last_visit.desc().nulls_last()).offset(skip).limit(limit)

    result = await db.execute(query)
    guests = result.scalars().all()

    # Convert to list response format
    guest_list = []
    for guest in guests:
        guest_item = GuestListResponse(
            id=guest.id,
            full_name=guest.full_name,
            phone=guest.phone,
            email=guest.email,
            total_bookings=guest.total_bookings,
            total_spent=guest.total_spent,
            last_visit=guest.last_visit
        )
        guest_list.append(guest_item)

    return guest_list

@router.get("/search")
async def search_guests(
    q: str = Query(..., min_length=2, description="Search term"),
    db: AsyncSession = Depends(get_db)
):
    """Search guests by name, phone, or email"""
    search_term = f"%{q}%"

    query = select(Guest).where(
        or_(
            Guest.full_name.ilike(search_term),
            Guest.phone.ilike(search_term),
            Guest.email.ilike(search_term)
        )
    ).limit(10)

    result = await db.execute(query)
    guests = result.scalars().all()

    # Return simplified format for search results
    search_results = []
    for guest in guests:
        search_results.append({
            "id": guest.id,
            "full_name": guest.full_name,
            "phone": guest.phone,
            "email": guest.email,
            "total_bookings": guest.total_bookings
        })

    return search_results

@router.get("/{guest_id}", response_model=GuestResponse)
async def get_guest(guest_id: int, db: AsyncSession = Depends(get_db)):
    """Get guest by ID"""
    result = await db.execute(select(Guest).where(Guest.id == guest_id))
    guest = result.scalar_one_or_none()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    return guest

@router.get("/phone/{phone}", response_model=GuestResponse)
async def get_guest_by_phone(phone: str, db: AsyncSession = Depends(get_db)):
    """Get guest by phone number"""
    result = await db.execute(select(Guest).where(Guest.phone == phone))
    guest = result.scalar_one_or_none()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    return guest

@router.put("/{guest_id}", response_model=GuestResponse)
async def update_guest(
    guest_id: int,
    guest_data: GuestUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update guest information"""
    result = await db.execute(select(Guest).where(Guest.id == guest_id))
    guest = result.scalar_one_or_none()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    # Check if updating phone to an existing number
    if guest_data.phone and guest_data.phone != guest.phone:
        existing_guest = await db.execute(
            select(Guest).where(
                and_(
                    Guest.phone == guest_data.phone,
                    Guest.id != guest_id
                )
            )
        )
        if existing_guest.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Another guest with this phone number already exists"
            )

    # Update fields that were provided
    update_data = guest_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guest, field, value)

    await db.commit()
    await db.refresh(guest)

    return guest

@router.delete("/{guest_id}")
async def delete_guest(guest_id: int, db: AsyncSession = Depends(get_db)):
    """Delete guest"""
    result = await db.execute(select(Guest).where(Guest.id == guest_id))
    guest = result.scalar_one_or_none()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    # Check if guest has any bookings before deleting
    # This would require checking booking table - for now just delete
    await db.delete(guest)
    await db.commit()

    return {"message": "Guest deleted successfully"}

@router.get("/{guest_id}/bookings")
async def get_guest_bookings(
    guest_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all bookings for a guest (requires booking integration)"""
    # This endpoint will be fully implemented once booking integration is complete
    # For now, return placeholder
    guest_result = await db.execute(select(Guest).where(Guest.id == guest_id))
    guest = guest_result.scalar_one_or_none()

    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    return {
        "guest_id": guest_id,
        "guest_name": guest.full_name,
        "bookings": [],  # Will be populated when booking integration is complete
        "total_bookings": guest.total_bookings,
        "total_spent": guest.total_spent
    }

@router.get("/stats/top-guests")
async def get_top_guests(
    by: str = Query("bookings", description="Sort by 'bookings' or 'spent'"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top guests by bookings or amount spent"""
    if by == "spent":
        query = select(Guest).order_by(Guest.total_spent.desc()).limit(limit)
    else:
        query = select(Guest).order_by(Guest.total_bookings.desc()).limit(limit)

    result = await db.execute(query)
    guests = result.scalars().all()

    top_guests = []
    for guest in guests:
        top_guests.append({
            "id": guest.id,
            "full_name": guest.full_name,
            "phone": guest.phone,
            "total_bookings": guest.total_bookings,
            "total_spent": guest.total_spent,
            "last_visit": guest.last_visit
        })

    return top_guests