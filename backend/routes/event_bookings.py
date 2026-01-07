"""
Event Bookings API Routes

This module provides all API endpoints for managing event bookings,
including CRUD operations, service management, and payment collection.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
from database import get_db
from models.event_booking import (
    EventBooking, EventService, EventCustomerPayment, EventVendorPayment,
    EventBookingCreate, EventBookingUpdate, EventBookingResponse, EventBookingListResponse,
    EventServiceCreate, EventServiceUpdate, EventServiceResponse,
    EventCustomerPaymentCreate, EventCustomerPaymentResponse,
    EventVendorPaymentCreate, EventVendorPaymentResponse,
    EventBookingSummary, EventBookingStatusEnum, EventServiceTypeEnum
)

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def compute_event_financials(event_booking: EventBooking) -> dict:
    """
    Compute financial summary for an event booking.

    Returns dict with:
    - total_customer_price: Sum of all services customer_price
    - total_collected: Sum of customer payments
    - customer_pending: total_customer_price - total_collected
    - total_vendor_cost: Sum of all services vendor_cost
    - total_vendor_paid: Sum of all vendor payments across all services
    - vendor_pending: total_vendor_cost - total_vendor_paid
    - profit_margin: total_customer_price - total_vendor_cost
    """
    total_customer_price = sum(s.customer_price for s in event_booking.services)
    total_collected = sum(p.amount for p in event_booking.customer_payments)

    total_vendor_cost = sum(s.vendor_cost for s in event_booking.services)
    total_vendor_paid = sum(
        sum(vp.amount for vp in s.vendor_payments)
        for s in event_booking.services
    )

    return {
        "total_customer_price": total_customer_price,
        "total_collected": total_collected,
        "customer_pending": total_customer_price - total_collected,
        "total_vendor_cost": total_vendor_cost,
        "total_vendor_paid": total_vendor_paid,
        "vendor_pending": total_vendor_cost - total_vendor_paid,
        "profit_margin": total_customer_price - total_vendor_cost
    }


def is_collapsed(booking_date: date) -> bool:
    """Check if event should be auto-collapsed (> 3 days old)"""
    today = date.today()
    diff_days = (today - booking_date).days
    return diff_days > 3


def build_service_response(service: EventService) -> EventServiceResponse:
    """Build service response with computed vendor payment totals"""
    vendor_total_paid = sum(vp.amount for vp in service.vendor_payments)
    vendor_pending = service.vendor_cost - vendor_total_paid

    return EventServiceResponse(
        id=service.id,
        service_type=service.service_type,
        custom_service_name=service.custom_service_name,
        customer_price=service.customer_price,
        vendor_cost=service.vendor_cost,
        vendor_name=service.vendor_name,
        notes=service.notes,
        vendor_total_paid=vendor_total_paid,
        vendor_pending=vendor_pending,
        vendor_payments=[
            EventVendorPaymentResponse(
                id=vp.id,
                payment_date=vp.payment_date,
                amount=vp.amount,
                payment_mode=vp.payment_mode,
                notes=vp.notes,
                created_at=vp.created_at
            ) for vp in service.vendor_payments
        ]
    )


def build_event_response(event: EventBooking) -> EventBookingResponse:
    """Build full event booking response with all details"""
    financials = compute_event_financials(event)

    return EventBookingResponse(
        id=event.id,
        booking_name=event.booking_name,
        booking_date=event.booking_date,
        contact_name=event.contact_name,
        contact_phone=event.contact_phone,
        contact_email=event.contact_email,
        status=event.status,
        notes=event.notes,
        created_at=event.created_at,
        updated_at=event.updated_at,
        services=[build_service_response(s) for s in event.services],
        customer_payments=[
            EventCustomerPaymentResponse(
                id=p.id,
                payment_date=p.payment_date,
                amount=p.amount,
                payment_mode=p.payment_mode,
                notes=p.notes,
                created_at=p.created_at
            ) for p in event.customer_payments
        ],
        **financials
    )


# =============================================================================
# EVENT BOOKING CRUD ENDPOINTS
# =============================================================================

@router.post("/", response_model=EventBookingResponse, status_code=201)
async def create_event_booking(
    event_data: EventBookingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new event booking with optional services"""
    # Create event booking
    event = EventBooking(
        booking_name=event_data.booking_name,
        booking_date=event_data.booking_date,
        contact_name=event_data.contact_name,
        contact_phone=event_data.contact_phone,
        contact_email=event_data.contact_email,
        notes=event_data.notes,
        status=EventBookingStatusEnum.CONFIRMED
    )

    db.add(event)
    await db.flush()  # Get the event ID

    # Create services if provided
    for service_data in event_data.services:
        service = EventService(
            event_booking_id=event.id,
            service_type=service_data.service_type,
            custom_service_name=service_data.custom_service_name,
            customer_price=service_data.customer_price,
            vendor_cost=service_data.vendor_cost,
            vendor_name=service_data.vendor_name,
            notes=service_data.notes
        )
        db.add(service)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(EventBooking)
        .options(
            selectinload(EventBooking.services).selectinload(EventService.vendor_payments),
            selectinload(EventBooking.customer_payments)
        )
        .where(EventBooking.id == event.id)
    )
    event = result.scalar_one()

    return build_event_response(event)


@router.get("/", response_model=List[EventBookingListResponse])
async def list_event_bookings(
    search: Optional[str] = Query(None, description="Search by booking name or contact name"),
    status: Optional[EventBookingStatusEnum] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of event bookings with optional filters"""
    query = select(EventBooking).options(
        selectinload(EventBooking.services).selectinload(EventService.vendor_payments),
        selectinload(EventBooking.customer_payments)
    )

    filters = []

    if search:
        filters.append(
            or_(
                EventBooking.booking_name.ilike(f"%{search}%"),
                EventBooking.contact_name.ilike(f"%{search}%")
            )
        )

    if status:
        filters.append(EventBooking.status == status)

    if date_from:
        filters.append(EventBooking.booking_date >= date_from)

    if date_to:
        filters.append(EventBooking.booking_date <= date_to)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(EventBooking.booking_date.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    events = result.scalars().all()

    response = []
    for event in events:
        financials = compute_event_financials(event)
        response.append(EventBookingListResponse(
            id=event.id,
            booking_name=event.booking_name,
            booking_date=event.booking_date,
            contact_name=event.contact_name,
            contact_phone=event.contact_phone,
            status=event.status,
            total_customer_price=financials["total_customer_price"],
            total_collected=financials["total_collected"],
            customer_pending=financials["customer_pending"],
            total_vendor_cost=financials["total_vendor_cost"],
            total_vendor_paid=financials["total_vendor_paid"],
            vendor_pending=financials["vendor_pending"],
            created_at=event.created_at,
            is_collapsed=is_collapsed(event.booking_date)
        ))

    return response


@router.get("/summary", response_model=EventBookingSummary)
async def get_event_bookings_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get financial summary of event bookings for reports"""
    query = select(EventBooking).options(
        selectinload(EventBooking.services).selectinload(EventService.vendor_payments),
        selectinload(EventBooking.customer_payments)
    )

    filters = []
    if date_from:
        filters.append(EventBooking.booking_date >= date_from)
    if date_to:
        filters.append(EventBooking.booking_date <= date_to)

    # Exclude cancelled from financial calculations
    filters.append(EventBooking.status != EventBookingStatusEnum.CANCELLED)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    events = result.scalars().all()

    # Count by status (including cancelled for total count)
    status_query = select(EventBooking)
    if date_from:
        status_query = status_query.where(EventBooking.booking_date >= date_from)
    if date_to:
        status_query = status_query.where(EventBooking.booking_date <= date_to)

    status_result = await db.execute(status_query)
    all_events = status_result.scalars().all()

    confirmed = sum(1 for e in all_events if e.status == EventBookingStatusEnum.CONFIRMED)
    completed = sum(1 for e in all_events if e.status == EventBookingStatusEnum.COMPLETED)
    cancelled = sum(1 for e in all_events if e.status == EventBookingStatusEnum.CANCELLED)

    # Calculate financials
    total_revenue = 0.0
    total_collected = 0.0
    total_expenses = 0.0
    total_paid = 0.0

    for event in events:
        financials = compute_event_financials(event)
        total_revenue += financials["total_customer_price"]
        total_collected += financials["total_collected"]
        total_expenses += financials["total_vendor_cost"]
        total_paid += financials["total_vendor_paid"]

    return EventBookingSummary(
        total_events=len(all_events),
        confirmed_events=confirmed,
        completed_events=completed,
        cancelled_events=cancelled,
        total_revenue=total_revenue,
        total_collected=total_collected,
        revenue_pending=total_revenue - total_collected,
        total_expenses=total_expenses,
        total_paid=total_paid,
        expenses_pending=total_expenses - total_paid,
        total_profit=total_revenue - total_expenses
    )


@router.get("/{event_id}", response_model=EventBookingResponse)
async def get_event_booking(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single event booking with all details"""
    result = await db.execute(
        select(EventBooking)
        .options(
            selectinload(EventBooking.services).selectinload(EventService.vendor_payments),
            selectinload(EventBooking.customer_payments)
        )
        .where(EventBooking.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event booking not found")

    return build_event_response(event)


@router.put("/{event_id}", response_model=EventBookingResponse)
async def update_event_booking(
    event_id: int,
    event_data: EventBookingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update event booking basic information"""
    result = await db.execute(
        select(EventBooking)
        .options(
            selectinload(EventBooking.services).selectinload(EventService.vendor_payments),
            selectinload(EventBooking.customer_payments)
        )
        .where(EventBooking.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event booking not found")

    # Update fields that were provided
    update_data = event_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)

    # Reload with relationships
    result = await db.execute(
        select(EventBooking)
        .options(
            selectinload(EventBooking.services).selectinload(EventService.vendor_payments),
            selectinload(EventBooking.customer_payments)
        )
        .where(EventBooking.id == event_id)
    )
    event = result.scalar_one()

    return build_event_response(event)


@router.delete("/{event_id}")
async def delete_event_booking(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete event booking (only if cancelled)"""
    result = await db.execute(
        select(EventBooking).where(EventBooking.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event booking not found")

    if event.status != EventBookingStatusEnum.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail="Only cancelled events can be deleted"
        )

    await db.delete(event)
    await db.commit()

    return {"message": "Event booking deleted successfully"}


# =============================================================================
# SERVICE ENDPOINTS
# =============================================================================

@router.post("/{event_id}/services", response_model=EventServiceResponse, status_code=201)
async def add_service(
    event_id: int,
    service_data: EventServiceCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a service to an event booking"""
    result = await db.execute(
        select(EventBooking).where(EventBooking.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event booking not found")

    if event.status == EventBookingStatusEnum.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot add services to cancelled events")

    service = EventService(
        event_booking_id=event_id,
        service_type=service_data.service_type,
        custom_service_name=service_data.custom_service_name,
        customer_price=service_data.customer_price,
        vendor_cost=service_data.vendor_cost,
        vendor_name=service_data.vendor_name,
        notes=service_data.notes
    )

    db.add(service)
    await db.commit()
    await db.refresh(service)

    # Load vendor_payments relationship
    result = await db.execute(
        select(EventService)
        .options(selectinload(EventService.vendor_payments))
        .where(EventService.id == service.id)
    )
    service = result.scalar_one()

    return build_service_response(service)


@router.put("/{event_id}/services/{service_id}", response_model=EventServiceResponse)
async def update_service(
    event_id: int,
    service_id: int,
    service_data: EventServiceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a service's pricing or details"""
    result = await db.execute(
        select(EventService)
        .options(selectinload(EventService.vendor_payments))
        .where(
            and_(
                EventService.id == service_id,
                EventService.event_booking_id == event_id
            )
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Update fields that were provided
    update_data = service_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    await db.commit()
    await db.refresh(service)

    # Reload with relationships
    result = await db.execute(
        select(EventService)
        .options(selectinload(EventService.vendor_payments))
        .where(EventService.id == service_id)
    )
    service = result.scalar_one()

    return build_service_response(service)


@router.delete("/{event_id}/services/{service_id}")
async def delete_service(
    event_id: int,
    service_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Remove a service from an event booking"""
    result = await db.execute(
        select(EventService).where(
            and_(
                EventService.id == service_id,
                EventService.event_booking_id == event_id
            )
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    await db.delete(service)
    await db.commit()

    return {"message": "Service removed successfully"}


# =============================================================================
# CUSTOMER PAYMENT ENDPOINTS
# =============================================================================

@router.post("/{event_id}/customer-payments", response_model=EventCustomerPaymentResponse, status_code=201)
async def add_customer_payment(
    event_id: int,
    payment_data: EventCustomerPaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Record a customer payment for an event"""
    result = await db.execute(
        select(EventBooking).where(EventBooking.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event booking not found")

    if event.status == EventBookingStatusEnum.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot add payments to cancelled events")

    payment = EventCustomerPayment(
        event_booking_id=event_id,
        payment_date=payment_data.payment_date,
        amount=payment_data.amount,
        payment_mode=payment_data.payment_mode,
        notes=payment_data.notes
    )

    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return EventCustomerPaymentResponse(
        id=payment.id,
        payment_date=payment.payment_date,
        amount=payment.amount,
        payment_mode=payment.payment_mode,
        notes=payment.notes,
        created_at=payment.created_at
    )


@router.delete("/{event_id}/customer-payments/{payment_id}")
async def delete_customer_payment(
    event_id: int,
    payment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Remove a customer payment"""
    result = await db.execute(
        select(EventCustomerPayment).where(
            and_(
                EventCustomerPayment.id == payment_id,
                EventCustomerPayment.event_booking_id == event_id
            )
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.delete(payment)
    await db.commit()

    return {"message": "Payment removed successfully"}


# =============================================================================
# VENDOR PAYMENT ENDPOINTS
# =============================================================================

@router.post("/{event_id}/services/{service_id}/vendor-payments", response_model=EventVendorPaymentResponse, status_code=201)
async def add_vendor_payment(
    event_id: int,
    service_id: int,
    payment_data: EventVendorPaymentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Record a vendor payment for a specific service"""
    # Verify service belongs to the event
    result = await db.execute(
        select(EventService).where(
            and_(
                EventService.id == service_id,
                EventService.event_booking_id == event_id
            )
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    payment = EventVendorPayment(
        event_service_id=service_id,
        payment_date=payment_data.payment_date,
        amount=payment_data.amount,
        payment_mode=payment_data.payment_mode,
        notes=payment_data.notes
    )

    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return EventVendorPaymentResponse(
        id=payment.id,
        payment_date=payment.payment_date,
        amount=payment.amount,
        payment_mode=payment.payment_mode,
        notes=payment.notes,
        created_at=payment.created_at
    )


@router.delete("/{event_id}/services/{service_id}/vendor-payments/{payment_id}")
async def delete_vendor_payment(
    event_id: int,
    service_id: int,
    payment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Remove a vendor payment"""
    # Verify the payment belongs to the correct service and event
    result = await db.execute(
        select(EventVendorPayment)
        .join(EventService)
        .where(
            and_(
                EventVendorPayment.id == payment_id,
                EventVendorPayment.event_service_id == service_id,
                EventService.event_booking_id == event_id
            )
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.delete(payment)
    await db.commit()

    return {"message": "Vendor payment removed successfully"}
