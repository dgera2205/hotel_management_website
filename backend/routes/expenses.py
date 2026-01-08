from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, extract
from typing import List, Optional, Dict
from datetime import datetime, date, timedelta
from database import get_db
from models.expense import (
    Expense, ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseListResponse, ExpenseSummary, ExpenseSearchFilters,
    ExpenseCategoryEnum, ExpenseStatusEnum
)

router = APIRouter()

@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    expense_data: ExpenseCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new expense with debt management"""
    try:
        data = expense_data.dict(exclude_unset=True)

        # Ensure required fields have defaults
        amount = data.get('amount', 0)
        amount_paid = data.get('amount_paid', 0.0) or 0.0
        amount_due = amount - amount_paid

        # Auto-compute status based on payment
        if amount_paid >= amount:
            status = ExpenseStatusEnum.PAID
        else:
            status = ExpenseStatusEnum.PENDING

        data['amount_due'] = amount_due
        data['status'] = status

        # Remove None values for optional fields
        data = {k: v for k, v in data.items() if v is not None}

        expense = Expense(**data)
        db.add(expense)
        await db.commit()
        await db.refresh(expense)

        return expense
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create expense: {str(e)}")

@router.get("/", response_model=List[ExpenseListResponse])
async def list_expenses(
    category: Optional[ExpenseCategoryEnum] = None,
    status: Optional[ExpenseStatusEnum] = None,
    vendor_name: Optional[str] = None,
    employee_name: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    amount_min: Optional[float] = Query(None, ge=0),
    amount_max: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of expenses with optional filters"""
    query = select(Expense)

    filters = []
    if category:
        filters.append(Expense.category == category)
    if status:
        filters.append(Expense.status == status)
    if vendor_name:
        filters.append(Expense.vendor_name.ilike(f"%{vendor_name}%"))
    if employee_name:
        filters.append(Expense.employee_name.ilike(f"%{employee_name}%"))
    if date_from:
        filters.append(Expense.expense_date >= date_from)
    if date_to:
        filters.append(Expense.expense_date <= date_to)
    if amount_min is not None:
        filters.append(Expense.amount >= amount_min)
    if amount_max is not None:
        filters.append(Expense.amount <= amount_max)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    expenses = result.scalars().all()

    # Convert to list response format
    expense_list = []
    for expense in expenses:
        # Calculate amount_due dynamically to ensure accuracy
        # This handles cases where amount_due wasn't properly set
        amount_paid = expense.amount_paid or 0.0
        calculated_amount_due = expense.amount - amount_paid

        # Use the stored amount_due if it's set, otherwise use calculated
        # For unpaid expenses (Pending status), recalculate to ensure correctness
        if expense.status == ExpenseStatusEnum.PENDING:
            amount_due = calculated_amount_due if calculated_amount_due > 0 else 0.0
        else:
            amount_due = expense.amount_due if expense.amount_due is not None else 0.0

        expense_item = ExpenseListResponse(
            id=expense.id,
            category=expense.category,
            description=expense.description,
            amount=expense.amount,
            amount_paid=amount_paid,
            amount_due=amount_due,
            expense_date=expense.expense_date,
            status=expense.status,
            vendor_name=expense.vendor_name,
            created_at=expense.created_at
        )
        expense_list.append(expense_item)

    return expense_list

@router.get("/summary", response_model=ExpenseSummary)
async def get_expense_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get expense summary statistics"""
    # Build date filters
    date_filters = []
    if date_from:
        date_filters.append(Expense.expense_date >= date_from)
    if date_to:
        date_filters.append(Expense.expense_date <= date_to)

    # Total amount
    total_query_stmt = select(func.coalesce(func.sum(Expense.amount), 0))
    if date_filters:
        total_query_stmt = total_query_stmt.where(and_(*date_filters))
    total_result = await db.execute(total_query_stmt)
    total_amount = float(total_result.scalar() or 0)

    # Paid amount - sum of amount_paid across all expenses
    paid_query_stmt = select(func.coalesce(func.sum(Expense.amount_paid), 0))
    if date_filters:
        paid_query_stmt = paid_query_stmt.where(and_(*date_filters))
    paid_result = await db.execute(paid_query_stmt)
    paid_amount = float(paid_result.scalar() or 0)

    # Pending amount - total amount minus paid amount
    pending_amount = total_amount - paid_amount

    # Total due - calculated as (amount - amount_paid) for pending expenses
    # This ensures accuracy even if amount_due field wasn't properly set
    due_filters = [Expense.status == ExpenseStatusEnum.PENDING]
    if date_filters:
        due_filters.extend(date_filters)
    due_query_stmt = select(
        func.coalesce(
            func.sum(Expense.amount - func.coalesce(Expense.amount_paid, 0)),
            0
        )
    ).where(and_(*due_filters))
    due_result = await db.execute(due_query_stmt)
    total_due = float(due_result.scalar() or 0)

    # Expense by category
    category_query_stmt = select(Expense.category, func.sum(Expense.amount))
    if date_filters:
        category_query_stmt = category_query_stmt.where(and_(*date_filters))
    category_query_stmt = category_query_stmt.group_by(Expense.category)
    category_result = await db.execute(category_query_stmt)
    expense_by_category = {str(row[0].value if hasattr(row[0], 'value') else row[0]): float(row[1]) for row in category_result.all()}

    # Monthly trend (last 12 months)
    monthly_trend = {}
    if not date_from and not date_to:  # Only calculate trend if no date filters
        for i in range(12):
            month_date = (date.today().replace(day=1) - timedelta(days=30*i))
            month_key = month_date.strftime("%Y-%m")

            month_query = await db.execute(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    and_(
                        extract('year', Expense.expense_date) == month_date.year,
                        extract('month', Expense.expense_date) == month_date.month
                    )
                )
            )
            monthly_trend[month_key] = float(month_query.scalar())

    return ExpenseSummary(
        total_amount=total_amount,
        paid_amount=paid_amount,
        pending_amount=pending_amount,
        total_due=total_due,
        expense_by_category=expense_by_category,
        monthly_trend=monthly_trend
    )

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: int, db: AsyncSession = Depends(get_db)):
    """Get expense by ID"""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    return expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update expense information with debt management"""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Update fields that were provided
    update_data = expense_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    # Recalculate amount_due and status if amount or amount_paid changed
    if 'amount' in update_data or 'amount_paid' in update_data:
        expense.amount_due = expense.amount - (expense.amount_paid or 0.0)

        # Auto-compute status based on payment
        if expense.amount_paid >= expense.amount:
            expense.status = ExpenseStatusEnum.PAID
        else:
            expense.status = ExpenseStatusEnum.PENDING

    await db.commit()
    await db.refresh(expense)

    return expense

@router.delete("/{expense_id}")
async def delete_expense(expense_id: int, db: AsyncSession = Depends(get_db)):
    """Delete expense"""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.delete(expense)
    await db.commit()

    return {"message": "Expense deleted successfully"}

@router.patch("/{expense_id}/status", response_model=ExpenseResponse)
async def update_expense_status(
    expense_id: int,
    status: ExpenseStatusEnum,
    payment_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update expense payment status"""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.status = status
    if status == ExpenseStatusEnum.PAID and payment_date:
        expense.payment_date = payment_date
    elif status == ExpenseStatusEnum.PAID and not payment_date:
        expense.payment_date = date.today()

    await db.commit()
    await db.refresh(expense)

    return expense

@router.get("/categories/breakdown")
async def get_category_breakdown(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    db: AsyncSession = Depends(get_db)
):
    """Get expense breakdown by category for a specific month/year"""
    filters = []

    if month and year:
        filters.append(extract('month', Expense.expense_date) == month)
        filters.append(extract('year', Expense.expense_date) == year)
    elif year:
        filters.append(extract('year', Expense.expense_date) == year)
    elif month:
        current_year = date.today().year
        filters.append(extract('month', Expense.expense_date) == month)
        filters.append(extract('year', Expense.expense_date) == current_year)

    query = select(
        Expense.category,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    )

    if filters:
        query = query.where(and_(*filters))

    query = query.group_by(Expense.category)

    result = await db.execute(query)
    breakdown = []

    for row in result.all():
        breakdown.append({
            "category": str(row[0]),
            "total_amount": float(row[1]),
            "expense_count": row[2]
        })

    return breakdown

@router.get("/pending/overdue")
async def get_overdue_expenses(db: AsyncSession = Depends(get_db)):
    """Get overdue pending expenses"""
    today = date.today()

    query = select(Expense).where(
        and_(
            Expense.status == ExpenseStatusEnum.PENDING,
            Expense.due_date < today,
            Expense.due_date.is_not(None)
        )
    ).order_by(Expense.due_date)

    result = await db.execute(query)
    overdue_expenses = result.scalars().all()

    return overdue_expenses

@router.post("/bulk-status-update")
async def bulk_update_status(
    expense_ids: List[int],
    status: ExpenseStatusEnum,
    payment_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """Bulk update expense status"""
    # Get all expenses
    result = await db.execute(
        select(Expense).where(Expense.id.in_(expense_ids))
    )
    expenses = result.scalars().all()

    if len(expenses) != len(expense_ids):
        raise HTTPException(status_code=404, detail="Some expenses not found")

    # Update all expenses
    for expense in expenses:
        expense.status = status
        if status == ExpenseStatusEnum.PAID:
            expense.payment_date = payment_date or date.today()

    await db.commit()

    return {"message": f"Updated {len(expenses)} expenses successfully"}