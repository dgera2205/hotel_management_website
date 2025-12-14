from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Date
from sqlalchemy.types import Enum
from database import Base
from datetime import datetime, date
import enum

class ExpenseCategoryEnum(str, enum.Enum):
    STAFF_SALARIES = "Staff Salaries"
    UTILITIES = "Utilities"
    HOUSEKEEPING_SUPPLIES = "Housekeeping Supplies"
    MAINTENANCE_REPAIRS = "Maintenance & Repairs"
    KITCHEN_RESTAURANT = "Kitchen/Restaurant"
    MARKETING_COMMISSIONS = "Marketing & Commissions"
    OTHER_OPERATING = "Other Operating Expenses"

class ExpenseStatusEnum(str, enum.Enum):
    PAID = "Paid"
    PENDING = "Pending"

class PaymentModeEnum(str, enum.Enum):
    CASH = "Cash"
    UPI = "UPI"
    CARD = "Card"
    BANK_TRANSFER = "Bank Transfer"
    CHEQUE = "Cheque"

class RecurrenceTypeEnum(str, enum.Enum):
    ONE_TIME = "One Time"
    MONTHLY = "Monthly"
    YEARLY = "Yearly"

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Basic Information
    category = Column(Enum(ExpenseCategoryEnum), nullable=False)
    subcategory = Column(String(200), nullable=True)  # Specific type within category
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)  # Total expense amount

    # Debt Management Fields
    amount_paid = Column(Float, nullable=False, default=0.0)  # Amount already paid
    amount_due = Column(Float, nullable=False, default=0.0)  # Remaining amount to pay

    # Date Information
    expense_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)

    # Payment Information
    status = Column(Enum(ExpenseStatusEnum), nullable=False, default=ExpenseStatusEnum.PENDING)
    payment_mode = Column(Enum(PaymentModeEnum), nullable=True)
    payment_date = Column(Date, nullable=True)

    # Vendor/Employee Information
    vendor_name = Column(String(200), nullable=True)
    employee_name = Column(String(200), nullable=True)  # For salaries
    vendor_contact = Column(String(100), nullable=True)

    # Additional Details
    invoice_number = Column(String(100), nullable=True)
    room_number = Column(String(20), nullable=True)  # For room-specific expenses

    # Recurrence
    recurrence_type = Column(Enum(RecurrenceTypeEnum), nullable=False, default=RecurrenceTypeEnum.ONE_TIME)
    recurrence_end_date = Column(Date, nullable=True)

    # Notes and attachments
    notes = Column(Text, nullable=True)
    receipt_path = Column(String(500), nullable=True)  # Path to uploaded receipt

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models for API
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime as dt, date as date_type

class ExpenseCreate(BaseModel):
    category: ExpenseCategoryEnum
    subcategory: Optional[str] = Field(None, max_length=200)
    description: str = Field(..., min_length=1, max_length=500)
    amount: float = Field(..., gt=0)

    # Debt Management - allow partial payments
    amount_paid: float = Field(default=0.0, ge=0)

    expense_date: date_type
    due_date: Optional[date_type] = None

    vendor_name: Optional[str] = Field(None, max_length=200)
    employee_name: Optional[str] = Field(None, max_length=200)
    vendor_contact: Optional[str] = Field(None, max_length=100)

    invoice_number: Optional[str] = Field(None, max_length=100)
    room_number: Optional[str] = Field(None, max_length=20)

    payment_mode: Optional[PaymentModeEnum] = None
    payment_date: Optional[date_type] = None
    status: Optional[ExpenseStatusEnum] = None  # Will be computed based on payment

    recurrence_type: RecurrenceTypeEnum = RecurrenceTypeEnum.ONE_TIME
    recurrence_end_date: Optional[date_type] = None

    notes: Optional[str] = None

    @validator('payment_date', 'due_date')
    def validate_dates(cls, v, values):
        if v and 'expense_date' in values and v < values['expense_date']:
            raise ValueError('Payment/due date cannot be before expense date')
        return v

    @validator('recurrence_end_date')
    def validate_recurrence_end_date(cls, v, values):
        if v and 'expense_date' in values and v <= values['expense_date']:
            raise ValueError('Recurrence end date must be after expense date')
        return v

    @validator('amount_paid')
    def validate_amount_paid(cls, v, values):
        if 'amount' in values and v > values['amount']:
            raise ValueError('Amount paid cannot exceed total amount')
        return v

class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategoryEnum] = None
    subcategory: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[float] = Field(None, gt=0)

    # Debt Management
    amount_paid: Optional[float] = Field(None, ge=0)

    expense_date: Optional[date_type] = None
    due_date: Optional[date_type] = None

    vendor_name: Optional[str] = Field(None, max_length=200)
    employee_name: Optional[str] = Field(None, max_length=200)
    vendor_contact: Optional[str] = Field(None, max_length=100)

    invoice_number: Optional[str] = Field(None, max_length=100)
    room_number: Optional[str] = Field(None, max_length=20)

    payment_mode: Optional[PaymentModeEnum] = None
    payment_date: Optional[date_type] = None
    status: Optional[ExpenseStatusEnum] = None

    recurrence_type: Optional[RecurrenceTypeEnum] = None
    recurrence_end_date: Optional[date_type] = None

    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    category: ExpenseCategoryEnum
    subcategory: Optional[str]
    description: str
    amount: float

    # Debt Management
    amount_paid: float
    amount_due: float

    expense_date: date_type
    due_date: Optional[date_type]

    status: ExpenseStatusEnum
    payment_mode: Optional[PaymentModeEnum]
    payment_date: Optional[date_type]

    vendor_name: Optional[str]
    employee_name: Optional[str]
    vendor_contact: Optional[str]

    invoice_number: Optional[str]
    room_number: Optional[str]

    recurrence_type: RecurrenceTypeEnum
    recurrence_end_date: Optional[date_type]

    notes: Optional[str]
    receipt_path: Optional[str]

    created_at: dt
    updated_at: dt

    class Config:
        from_attributes = True

class ExpenseListResponse(BaseModel):
    """Simplified expense response for list views"""
    id: int
    category: ExpenseCategoryEnum
    description: str
    amount: float
    amount_paid: float
    amount_due: float
    expense_date: date_type
    status: ExpenseStatusEnum
    vendor_name: Optional[str]
    created_at: dt

class ExpenseSummary(BaseModel):
    """Summary stats for expenses"""
    total_amount: float
    paid_amount: float
    pending_amount: float
    total_due: float  # Total outstanding debt across all pending expenses
    expense_by_category: dict
    monthly_trend: dict

class ExpenseSearchFilters(BaseModel):
    category: Optional[ExpenseCategoryEnum] = None
    status: Optional[ExpenseStatusEnum] = None
    vendor_name: Optional[str] = None
    employee_name: Optional[str] = None
    room_number: Optional[str] = None
    date_from: Optional[date_type] = None
    date_to: Optional[date_type] = None
    amount_min: Optional[float] = Field(None, ge=0)
    amount_max: Optional[float] = Field(None, ge=0)