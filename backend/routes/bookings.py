from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
from database import get_db
from models.room import Room
from models.booking import (
    Booking, BookingService, BookingCreate, BookingUpdate,
    BookingResponse, BookingListResponse, BookingSearchFilters,
    BookingStatusEnum, PaymentStatusEnum, BookingServiceResponse
)

router = APIRouter()

@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(
    booking_data: BookingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new booking"""
    # Validate room exists and is active
    room_result = await db.execute(
        select(Room).where(Room.id == booking_data.room_id)
    )
    room = room_result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.status != "Active":
        raise HTTPException(status_code=400, detail="Room is not available")

    # Check room availability for the dates
    overlapping_query = await db.execute(
        select(Booking).where(
            and_(
                Booking.room_id == booking_data.room_id,
                Booking.status.in_(["Confirmed", "Checked In"]),
                or_(
                    and_(
                        Booking.check_in_date <= booking_data.check_in_date,
                        Booking.check_out_date > booking_data.check_in_date
                    ),
                    and_(
                        Booking.check_in_date < booking_data.check_out_date,
                        Booking.check_out_date >= booking_data.check_out_date
                    ),
                    and_(
                        Booking.check_in_date >= booking_data.check_in_date,
                        Booking.check_out_date <= booking_data.check_out_date
                    )
                )
            )
        )
    )

    overlapping_booking = overlapping_query.scalar_one_or_none()
    if overlapping_booking:
        raise HTTPException(
            status_code=400,
            detail=f"Room is already booked for overlapping dates"
        )

    # Check guest count doesn't exceed room capacity
    total_guests = booking_data.adults + booking_data.children
    if total_guests > room.max_occupancy:
        raise HTTPException(
            status_code=400,
            detail=f"Guest count ({total_guests}) exceeds room capacity ({room.max_occupancy})"
        )

    # Calculate financial details
    total_nights = (booking_data.check_out_date - booking_data.check_in_date).days
    room_charges = booking_data.room_rate_per_night * total_nights
    total_amount = room_charges
    balance_due = total_amount - booking_data.advance_payment

    # Determine payment status
    if booking_data.advance_payment >= total_amount:
        payment_status = PaymentStatusEnum.PAID
    elif booking_data.advance_payment > 0:
        payment_status = PaymentStatusEnum.PARTIALLY_PAID
    else:
        payment_status = PaymentStatusEnum.UNPAID

    # Create booking
    booking = Booking(
        **booking_data.dict(),
        total_nights=total_nights,
        room_charges=room_charges,
        total_amount=total_amount,
        balance_due=balance_due,
        payment_status=payment_status
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Manually construct response to avoid lazy loading issues
    return BookingResponse(
        id=booking.id,
        booking_type=booking.booking_type,
        guest_name=booking.guest_name,
        guest_phone=booking.guest_phone,
        guest_email=booking.guest_email,
        guest_id_proof=booking.guest_id_proof,
        room_id=booking.room_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        actual_check_in=booking.actual_check_in,
        actual_check_out=booking.actual_check_out,
        adults=booking.adults,
        children=booking.children,
        booking_source=booking.booking_source,
        booking_reference=booking.booking_reference,
        room_rate_per_night=booking.room_rate_per_night,
        total_nights=booking.total_nights,
        room_charges=booking.room_charges,
        additional_charges=booking.additional_charges,
        total_amount=booking.total_amount,
        advance_payment=booking.advance_payment,
        balance_due=booking.balance_due,
        payment_status=booking.payment_status,
        payment_mode=booking.payment_mode,
        status=booking.status,
        special_requests=booking.special_requests,
        notes=booking.notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        room={"id": room.id, "room_number": room.room_number, "room_type": room.room_type, "floor_number": room.floor_number},
        services=[]
    )

@router.get("/", response_model=List[BookingListResponse])
async def list_bookings(
    status: Optional[BookingStatusEnum] = None,
    payment_status: Optional[PaymentStatusEnum] = None,
    guest_name: Optional[str] = None,
    room_number: Optional[str] = None,
    check_in_from: Optional[date] = None,
    check_in_to: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of bookings with optional filters"""
    query = select(Booking, Room.room_number).join(Room, Booking.room_id == Room.id)

    filters = []
    if status:
        filters.append(Booking.status == status)
    if payment_status:
        filters.append(Booking.payment_status == payment_status)
    if guest_name:
        filters.append(Booking.guest_name.ilike(f"%{guest_name}%"))
    if room_number:
        filters.append(Room.room_number.ilike(f"%{room_number}%"))
    if check_in_from:
        filters.append(Booking.check_in_date >= check_in_from)
    if check_in_to:
        filters.append(Booking.check_in_date <= check_in_to)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Booking.check_in_date.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    bookings = []
    for booking, room_number in rows:
        booking_list = BookingListResponse(
            id=booking.id,
            guest_name=booking.guest_name,
            guest_phone=booking.guest_phone,
            room_id=booking.room_id,
            room_number=room_number,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
            total_amount=booking.total_amount,
            payment_status=booking.payment_status,
            status=booking.status,
            created_at=booking.created_at
        )
        bookings.append(booking_list)

    return bookings


# ============================================================
# STATIC ROUTES - Must be defined BEFORE dynamic routes
# These routes have fixed paths that should not be matched by /{booking_id}
# ============================================================

@router.get("/today/checkins")
async def get_today_checkins(
    target_date: Optional[date] = Query(None, description="Date to check (defaults to today)"),
    db: AsyncSession = Depends(get_db)
):
    """Get pending check-ins - bookings with check-in date <= today and status Confirmed, sorted by check-in date ascending"""
    # Use provided date or default to today
    check_date = target_date if target_date else date.today()

    query = select(Booking, Room.room_number).join(Room, Booking.room_id == Room.id).where(
        and_(
            Booking.check_in_date <= check_date,
            Booking.status == BookingStatusEnum.CONFIRMED
        )
    ).order_by(Booking.check_in_date.asc())

    result = await db.execute(query)
    rows = result.all()

    checkins = []
    for booking, room_number in rows:
        checkins.append({
            "booking_id": booking.id,
            "guest_name": booking.guest_name,
            "guest_phone": booking.guest_phone,
            "room_number": room_number,
            "adults": booking.adults,
            "children": booking.children,
            "check_in_date": booking.check_in_date.isoformat(),
            "advance_payment": booking.advance_payment or 0,
            "total_amount": booking.total_amount or 0
        })

    return checkins


@router.get("/today/checkouts")
async def get_today_checkouts(
    target_date: Optional[date] = Query(None, description="Date to check (defaults to today)"),
    db: AsyncSession = Depends(get_db)
):
    """Get all checked-in guests for checkout - sorted by check-out date ascending"""
    # Note: target_date is kept for API compatibility but no longer used for filtering
    # We now show ALL checked-in guests sorted by their checkout date

    query = select(Booking, Room.room_number).join(Room, Booking.room_id == Room.id).where(
        Booking.status == BookingStatusEnum.CHECKED_IN
    ).order_by(Booking.check_out_date.asc())

    result = await db.execute(query)
    rows = result.all()

    checkouts = []
    for booking, room_number in rows:
        checkouts.append({
            "booking_id": booking.id,
            "guest_name": booking.guest_name,
            "guest_phone": booking.guest_phone,
            "room_number": room_number,
            "balance_due": booking.balance_due,
            "check_out_date": booking.check_out_date.isoformat()
        })

    return checkouts


@router.get("/revenue/daily")
async def get_daily_revenue(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get daily revenue distribution.
    Revenue is distributed across each night of a booking stay.
    For example, a 3-night stay at ₹1000/night contributes ₹1000 to each of the 3 days.
    """
    # Default to last 30 days if no dates specified
    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=30)

    # Get all bookings that overlap with the date range
    # Include Confirmed, Checked In, and Checked Out (not Cancelled or No Show)
    query = select(Booking, Room.room_number).join(Room, Booking.room_id == Room.id).where(
        and_(
            Booking.status.in_([BookingStatusEnum.CONFIRMED, BookingStatusEnum.CHECKED_IN, BookingStatusEnum.CHECKED_OUT]),
            Booking.check_in_date <= date_to,
            Booking.check_out_date > date_from
        )
    )

    result = await db.execute(query)
    rows = result.all()

    # Calculate daily revenue
    daily_revenue = {}
    current_date = date_from
    while current_date <= date_to:
        daily_revenue[current_date.isoformat()] = {
            "date": current_date.isoformat(),
            "revenue": 0.0,
            "bookings_count": 0,
            "room_nights": 0
        }
        current_date += timedelta(days=1)

    # Distribute revenue across booking days
    for booking, room_number in rows:
        # Calculate the overlap between booking and our date range
        overlap_start = max(booking.check_in_date, date_from)
        overlap_end = min(booking.check_out_date, date_to + timedelta(days=1))

        # For each day the guest stays (check_in_date to day before check_out_date)
        current_day = overlap_start
        while current_day < overlap_end:
            day_key = current_day.isoformat()
            if day_key in daily_revenue:
                # Add daily rate to that day's revenue
                daily_revenue[day_key]["revenue"] += booking.room_rate_per_night
                daily_revenue[day_key]["room_nights"] += 1
                # Only count the booking once (on check-in date within range)
                if current_day == booking.check_in_date:
                    daily_revenue[day_key]["bookings_count"] += 1
            current_day += timedelta(days=1)

    # Calculate totals and return
    total_revenue = sum(day["revenue"] for day in daily_revenue.values())
    total_room_nights = sum(day["room_nights"] for day in daily_revenue.values())
    total_bookings = sum(day["bookings_count"] for day in daily_revenue.values())

    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "total_revenue": total_revenue,
        "total_room_nights": total_room_nights,
        "total_bookings": total_bookings,
        "average_daily_revenue": total_revenue / max(len(daily_revenue), 1),
        "average_daily_rate": total_revenue / max(total_room_nights, 1),
        "daily_breakdown": list(daily_revenue.values())
    }


@router.get("/revenue/summary")
async def get_revenue_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get revenue summary with daily distribution for the specified date range.
    Revenue is calculated based on room nights within the date range.
    """
    # Default to current month if no dates specified
    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to.replace(day=1)

    # Get all active bookings that overlap with the date range
    query = select(Booking).where(
        and_(
            Booking.status.in_([BookingStatusEnum.CONFIRMED, BookingStatusEnum.CHECKED_IN, BookingStatusEnum.CHECKED_OUT]),
            Booking.check_in_date <= date_to,
            Booking.check_out_date > date_from
        )
    )

    result = await db.execute(query)
    bookings = result.scalars().all()

    # Calculate revenue for the date range
    total_revenue = 0.0
    revenue_collected = 0.0
    revenue_pending = 0.0

    for booking in bookings:
        # Calculate nights within the date range
        overlap_start = max(booking.check_in_date, date_from)
        overlap_end = min(booking.check_out_date, date_to + timedelta(days=1))
        nights_in_range = (overlap_end - overlap_start).days

        # Revenue for this booking in this date range
        booking_revenue_in_range = nights_in_range * booking.room_rate_per_night
        total_revenue += booking_revenue_in_range

        # Calculate what proportion of total booking this represents
        if booking.total_nights > 0:
            proportion = nights_in_range / booking.total_nights
            # Proportional payment collected
            collected_for_range = booking.advance_payment * proportion
            revenue_collected += collected_for_range
            revenue_pending += (booking_revenue_in_range - collected_for_range)

    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "total_revenue": round(total_revenue, 2),
        "revenue_collected": round(revenue_collected, 2),
        "revenue_pending": round(revenue_pending, 2),
        "bookings_count": len(bookings)
    }


# ============================================================
# DYNAMIC ROUTES - Must be defined AFTER static routes
# ============================================================

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Get booking by ID"""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Get room details
    room_result = await db.execute(select(Room).where(Room.id == booking.room_id))
    room = room_result.scalar_one_or_none()

    # Get services separately to avoid lazy loading issues
    services_result = await db.execute(
        select(BookingService).where(BookingService.booking_id == booking_id)
    )
    services = services_result.scalars().all()

    # Convert services to response format
    services_list = [
        BookingServiceResponse(
            id=svc.id,
            service_name=svc.service_name,
            quantity=svc.quantity,
            unit_price=svc.unit_price,
            total_price=svc.total_price,
            service_date=svc.service_date,
            notes=svc.notes
        ) for svc in services
    ]

    # Manually construct response to avoid lazy loading issues
    return BookingResponse(
        id=booking.id,
        booking_type=booking.booking_type,
        guest_name=booking.guest_name,
        guest_phone=booking.guest_phone,
        guest_email=booking.guest_email,
        guest_id_proof=booking.guest_id_proof,
        room_id=booking.room_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        actual_check_in=booking.actual_check_in,
        actual_check_out=booking.actual_check_out,
        adults=booking.adults,
        children=booking.children,
        booking_source=booking.booking_source,
        booking_reference=booking.booking_reference,
        room_rate_per_night=booking.room_rate_per_night,
        total_nights=booking.total_nights,
        room_charges=booking.room_charges,
        additional_charges=booking.additional_charges,
        total_amount=booking.total_amount,
        advance_payment=booking.advance_payment,
        balance_due=booking.balance_due,
        payment_status=booking.payment_status,
        payment_mode=booking.payment_mode,
        status=booking.status,
        special_requests=booking.special_requests,
        notes=booking.notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        room={"id": room.id, "room_number": room.room_number, "room_type": room.room_type, "floor_number": room.floor_number} if room else None,
        services=services_list
    )

@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update booking information"""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Update fields that were provided
    update_data = booking_data.dict(exclude_unset=True)

    # Recalculate financial fields if dates or rate changed
    recalculate = False
    if any(field in update_data for field in ['check_in_date', 'check_out_date', 'room_rate_per_night']):
        recalculate = True

    for field, value in update_data.items():
        setattr(booking, field, value)

    if recalculate:
        total_nights = (booking.check_out_date - booking.check_in_date).days
        booking.total_nights = total_nights
        booking.room_charges = booking.room_rate_per_night * total_nights
        booking.total_amount = booking.room_charges + booking.additional_charges
        booking.balance_due = booking.total_amount - booking.advance_payment

        # Update payment status
        if booking.advance_payment >= booking.total_amount:
            booking.payment_status = PaymentStatusEnum.PAID
        elif booking.advance_payment > 0:
            booking.payment_status = PaymentStatusEnum.PARTIALLY_PAID
        else:
            booking.payment_status = PaymentStatusEnum.UNPAID

    await db.commit()
    await db.refresh(booking)

    # Get room details for response
    room_result = await db.execute(select(Room).where(Room.id == booking.room_id))
    room = room_result.scalar_one_or_none()

    # Manually construct response to avoid lazy loading issues
    return BookingResponse(
        id=booking.id,
        booking_type=booking.booking_type,
        guest_name=booking.guest_name,
        guest_phone=booking.guest_phone,
        guest_email=booking.guest_email,
        guest_id_proof=booking.guest_id_proof,
        room_id=booking.room_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        actual_check_in=booking.actual_check_in,
        actual_check_out=booking.actual_check_out,
        adults=booking.adults,
        children=booking.children,
        booking_source=booking.booking_source,
        booking_reference=booking.booking_reference,
        room_rate_per_night=booking.room_rate_per_night,
        total_nights=booking.total_nights,
        room_charges=booking.room_charges,
        additional_charges=booking.additional_charges,
        total_amount=booking.total_amount,
        advance_payment=booking.advance_payment,
        balance_due=booking.balance_due,
        payment_status=booking.payment_status,
        payment_mode=booking.payment_mode,
        status=booking.status,
        special_requests=booking.special_requests,
        notes=booking.notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        room={"id": room.id, "room_number": room.room_number, "room_type": room.room_type, "floor_number": room.floor_number} if room else None,
        services=[]
    )

@router.post("/{booking_id}/check-in")
async def check_in(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Check in a guest"""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatusEnum.CONFIRMED:
        raise HTTPException(status_code=400, detail="Booking is not confirmed")

    booking.status = BookingStatusEnum.CHECKED_IN
    booking.actual_check_in = datetime.utcnow()

    await db.commit()
    await db.refresh(booking)

    return {"message": "Guest checked in successfully", "booking": booking}

@router.post("/{booking_id}/check-out")
async def check_out(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Check out a guest"""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatusEnum.CHECKED_IN:
        raise HTTPException(status_code=400, detail="Guest is not checked in")

    booking.status = BookingStatusEnum.CHECKED_OUT
    booking.actual_check_out = datetime.utcnow()

    await db.commit()
    await db.refresh(booking)

    return {"message": "Guest checked out successfully", "booking": booking}

@router.get("/{booking_id}/services")
async def get_booking_services(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all services/extra items for a booking"""
    # Check booking exists
    booking_result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Get services
    services_result = await db.execute(
        select(BookingService).where(BookingService.booking_id == booking_id).order_by(BookingService.service_date.desc())
    )
    services = services_result.scalars().all()

    return [
        {
            "id": svc.id,
            "service_name": svc.service_name,
            "quantity": svc.quantity,
            "unit_price": svc.unit_price,
            "total_price": svc.total_price,
            "service_date": svc.service_date.isoformat() if svc.service_date else None,
            "notes": svc.notes
        }
        for svc in services
    ]


@router.post("/{booking_id}/services")
async def add_booking_service(
    booking_id: int,
    service_name: str = Query(..., description="Name of the service/item"),
    quantity: int = Query(1, ge=1, description="Quantity"),
    unit_price: float = Query(..., ge=0, description="Price per unit"),
    notes: Optional[str] = Query(None, description="Optional notes"),
    db: AsyncSession = Depends(get_db)
):
    """Add a service/extra item to booking (e.g., water bottle, towel, taxi)"""
    # Check booking exists
    booking_result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only allow adding services to active bookings
    if booking.status not in [BookingStatusEnum.CONFIRMED, BookingStatusEnum.CHECKED_IN]:
        raise HTTPException(status_code=400, detail="Can only add items to confirmed or checked-in bookings")

    # Create service
    total_price = quantity * unit_price
    service = BookingService(
        booking_id=booking_id,
        service_name=service_name,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        notes=notes
    )

    db.add(service)

    # Update booking additional charges
    booking.additional_charges += total_price
    booking.total_amount = booking.room_charges + booking.additional_charges
    booking.balance_due = booking.total_amount - booking.advance_payment

    # Update payment status
    if booking.balance_due <= 0:
        booking.payment_status = PaymentStatusEnum.PAID
    elif booking.advance_payment > 0:
        booking.payment_status = PaymentStatusEnum.PARTIALLY_PAID
    else:
        booking.payment_status = PaymentStatusEnum.UNPAID

    await db.commit()
    await db.refresh(service)

    return {
        "message": "Item added successfully",
        "service": {
            "id": service.id,
            "service_name": service.service_name,
            "quantity": service.quantity,
            "unit_price": service.unit_price,
            "total_price": service.total_price,
            "service_date": service.service_date.isoformat() if service.service_date else None,
            "notes": service.notes
        },
        "booking_total": booking.total_amount,
        "balance_due": booking.balance_due
    }


@router.delete("/{booking_id}/services/{service_id}")
async def delete_booking_service(
    booking_id: int,
    service_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a service/extra item from a booking"""
    # Check booking exists
    booking_result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = booking_result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only allow removing services from active bookings
    if booking.status not in [BookingStatusEnum.CONFIRMED, BookingStatusEnum.CHECKED_IN]:
        raise HTTPException(status_code=400, detail="Can only remove items from confirmed or checked-in bookings")

    # Get service
    service_result = await db.execute(
        select(BookingService).where(
            and_(BookingService.id == service_id, BookingService.booking_id == booking_id)
        )
    )
    service = service_result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Update booking additional charges
    booking.additional_charges -= service.total_price
    if booking.additional_charges < 0:
        booking.additional_charges = 0
    booking.total_amount = booking.room_charges + booking.additional_charges
    booking.balance_due = booking.total_amount - booking.advance_payment

    # Update payment status
    if booking.balance_due <= 0:
        booking.payment_status = PaymentStatusEnum.PAID
    elif booking.advance_payment > 0:
        booking.payment_status = PaymentStatusEnum.PARTIALLY_PAID
    else:
        booking.payment_status = PaymentStatusEnum.UNPAID

    await db.delete(service)
    await db.commit()

    return {
        "message": "Item removed successfully",
        "booking_total": booking.total_amount,
        "balance_due": booking.balance_due
    }


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    refund_advance: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a confirmed booking"""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in [BookingStatusEnum.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be cancelled")

    booking.status = BookingStatusEnum.CANCELLED

    # If refunding advance, set advance_payment to 0 and recalculate balance
    if refund_advance:
        booking.advance_payment = 0
        booking.balance_due = booking.total_amount
        booking.payment_status = PaymentStatusEnum.UNPAID

    await db.commit()
    await db.refresh(booking)

    return {"message": "Booking cancelled successfully", "booking": booking}


@router.post("/{booking_id}/collect-payment")
async def collect_payment(
    booking_id: int,
    amount: float,
    payment_mode: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Collect payment for a booking (partial or full)"""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    if amount > booking.balance_due:
        raise HTTPException(status_code=400, detail=f"Amount exceeds balance due ({booking.balance_due})")

    # Update payment
    booking.advance_payment += amount
    booking.balance_due = booking.total_amount - booking.advance_payment

    # Update payment mode if provided
    if payment_mode:
        from models.booking import PaymentModeEnum
        try:
            booking.payment_mode = PaymentModeEnum(payment_mode)
        except ValueError:
            pass  # Invalid payment mode, ignore

    # Update payment status
    if booking.balance_due <= 0:
        booking.payment_status = PaymentStatusEnum.PAID
    elif booking.advance_payment > 0:
        booking.payment_status = PaymentStatusEnum.PARTIALLY_PAID

    await db.commit()
    await db.refresh(booking)

    return {
        "message": "Payment collected successfully",
        "amount_collected": amount,
        "new_balance_due": booking.balance_due,
        "payment_status": booking.payment_status.value
    }


@router.delete("/{booking_id}")
async def delete_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a booking (only if Cancelled or Checked Out)"""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only allow deletion of cancelled or checked-out bookings
    if booking.status not in [BookingStatusEnum.CANCELLED, BookingStatusEnum.CHECKED_OUT]:
        raise HTTPException(
            status_code=400,
            detail="Only cancelled or checked-out bookings can be deleted"
        )

    # Delete associated services first
    await db.execute(
        BookingService.__table__.delete().where(BookingService.booking_id == booking_id)
    )

    await db.delete(booking)
    await db.commit()

    return {"message": "Booking deleted successfully"}