# Hotel Management System - Repository Technical Documentation

This document provides a comprehensive technical overview of the Hotel Management System codebase, explaining the architecture, data flow, and how all components work together.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Data Flow](#data-flow)
6. [Backend Deep Dive](#backend-deep-dive)
7. [Frontend Deep Dive](#frontend-deep-dive)
8. [Database Schema](#database-schema)
9. [Authentication System](#authentication-system)
10. [Docker Infrastructure](#docker-infrastructure)
11. [API Reference](#api-reference)

---

## Project Overview

The Hotel Management System is a full-stack web application designed for small to medium-sized hotels to manage their daily operations. It provides functionality for:

- **Room Management**: Track room inventory, types, amenities, and status
- **Booking Management**: Create, modify, and track guest reservations
- **Guest Management**: Maintain guest profiles and booking history
- **Expense Tracking**: Record and categorize operational expenses
- **Reporting**: View dashboard summaries and analytics

The application uses a modern tech stack with a React/Next.js frontend, FastAPI backend, PostgreSQL database, and Docker for containerization.

---

## Directory Structure

```
hotel_management_website/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # Application entry point, FastAPI app initialization
│   ├── config.py               # Environment configuration (Pydantic settings)
│   ├── database.py             # SQLAlchemy async engine and session management
│   ├── init_db.py              # Database initialization scripts
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container configuration
│   ├── models/                 # Data models (SQLAlchemy + Pydantic)
│   │   ├── __init__.py         # Model exports
│   │   ├── user.py             # User/authentication models
│   │   ├── room.py             # Room entity and schemas
│   │   ├── booking.py          # Booking and BookingService models
│   │   ├── expense.py          # Expense tracking models
│   │   └── guest.py            # Guest profile models
│   ├── routes/                 # API endpoint handlers
│   │   ├── __init__.py         # Router aggregation
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── health.py           # Health check endpoint
│   │   ├── rooms.py            # Room CRUD operations
│   │   ├── bookings.py         # Booking management
│   │   ├── expenses.py         # Expense tracking
│   │   └── guests.py           # Guest management
│   └── services/               # Business logic layer
│       ├── __init__.py
│       └── auth.py             # Authentication service (JWT, password hashing)
│
├── frontend/                   # Next.js React frontend
│   ├── package.json            # Node.js dependencies
│   ├── next.config.js          # Next.js configuration
│   ├── tailwind.config.ts      # Tailwind CSS configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── Dockerfile              # Frontend container configuration
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Dashboard/home page
│   │   ├── login/page.tsx      # Login page
│   │   ├── rooms/page.tsx      # Room management page
│   │   ├── bookings/page.tsx   # Booking management with calendar
│   │   ├── expenses/page.tsx   # Expense tracking page
│   │   └── reports/page.tsx    # Reports and analytics
│   ├── components/             # Reusable React components
│   │   └── Header.tsx          # Navigation header
│   ├── context/                # React Context providers
│   │   └── AuthContext.tsx     # Authentication state management
│   └── lib/                    # Utility libraries
│       ├── api.ts              # HTTP client for backend API
│       ├── auth.ts             # Authentication utilities
│       └── utils.ts            # General utilities (cn function)
│
├── database/                   # Database initialization
│   └── init.sql                # Initial schema and seed data
│
├── nginx/                      # Reverse proxy configuration
│   └── nginx.conf              # Nginx routing rules
│
├── docker-compose.yml          # Container orchestration
├── Makefile                    # Development shortcuts
├── .env.example                # Environment variables template
├── CLAUDE.md                   # AI assistant guidelines
└── README.md                   # Project documentation
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **React 18** | UI component library |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first CSS framework |
| **Shadcn/UI** | Component library |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance Python web framework |
| **SQLAlchemy 2.0** | Async ORM for database operations |
| **Pydantic** | Data validation and settings management |
| **python-jose** | JWT token handling |
| **bcrypt** | Password hashing |
| **asyncpg** | Async PostgreSQL driver |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **PostgreSQL 16** | Relational database |
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy and load balancer |

---

## Architecture Overview

The application follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX REVERSE PROXY                         │
│                       (Port 16873)                               │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   /  → Frontend     │    │   /api/* → Backend (strip /api) │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌──────────────────────┐          ┌─────────────────────────────┐
│   NEXT.JS FRONTEND   │          │      FASTAPI BACKEND        │
│     (Port 3000)      │          │        (Port 8000)          │
│                      │          │                             │
│  • React Components  │          │  • REST API Endpoints       │
│  • Auth Context      │          │  • Business Logic           │
│  • API Client        │          │  • Data Validation          │
│  • Tailwind CSS      │          │  • JWT Authentication       │
└──────────────────────┘          └─────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │     POSTGRESQL DATABASE       │
                              │         (Port 5432)           │
                              │                               │
                              │  • rooms                      │
                              │  • bookings                   │
                              │  • booking_services           │
                              │  • expenses                   │
                              │  • guests                     │
                              └───────────────────────────────┘
```

### Key Design Patterns

1. **Repository Pattern**: Database operations are abstracted through SQLAlchemy ORM models
2. **Dependency Injection**: FastAPI's `Depends()` for database sessions and authentication
3. **Context Pattern**: React Context for global authentication state
4. **Factory Pattern**: Pydantic models for request/response validation

---

## Data Flow

### 1. Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│  POST    │────▶│  Verify  │────▶│  Return  │
│  Page    │     │ /auth/   │     │ Password │     │   JWT    │
│          │     │  login   │     │          │     │  Token   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                                   │
     │                                                   ▼
     │                                          ┌──────────────┐
     │                                          │ localStorage │
     │                                          │ + In-memory  │
     │                                          └──────────────┘
     │                                                   │
     ▼                                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   Subsequent API Requests                     │
│         Authorization: Bearer <JWT_TOKEN>                     │
└──────────────────────────────────────────────────────────────┘
```

### 2. Booking Creation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Bookings   │────▶│   Select    │────▶│  Fill Guest │
│   Page      │     │  Room/Date  │     │   Details   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    POST /api/bookings/                       │
│  {                                                           │
│    guest_name, guest_phone, room_id,                        │
│    check_in_date, check_out_date, booking_source,           │
│    room_rate_per_night, advance_payment                     │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Processing                        │
│  1. Validate input (Pydantic)                               │
│  2. Check room availability                                  │
│  3. Calculate totals (nights, charges, balance)             │
│  4. Create booking record in PostgreSQL                      │
│  5. Return BookingResponse                                   │
└─────────────────────────────────────────────────────────────┘
```

### 3. Calendar View Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Bookings Page Load                        │
└──────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────────┐
    │ GET /rooms │  │ GET /book- │  │ Calculate Date │
    │            │  │   ings/    │  │    Range       │
    └────────────┘  └────────────┘  └────────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
              ┌─────────────────────────┐
              │   Build Calendar Grid   │
              │  - Rows: Rooms          │
              │  - Columns: Dates       │
              │  - Cells: Bookings      │
              └─────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Render Calendar UI    │
              │  with color-coded       │
              │  booking status         │
              └─────────────────────────┘
```

---

## Backend Deep Dive

### Application Initialization (`main.py`)

```python
# FastAPI app is created with root_path for nginx proxy compatibility
app = FastAPI(
    title="Hotel Management System",
    root_path="/api"  # Important for Swagger UI behind nginx
)

# Startup event creates database tables
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# CORS middleware allows frontend requests
app.add_middleware(CORSMiddleware, ...)

# Routers are registered with prefixes
app.include_router(rooms_router, prefix='/rooms')
app.include_router(bookings_router, prefix='/bookings')
# etc.
```

### Database Session Management (`database.py`)

Uses SQLAlchemy's async session with dependency injection:

```python
async def get_db():
    async with async_session() as session:
        yield session  # Provides session to route handlers

# Usage in routes:
@router.get("/")
async def get_rooms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room))
    return result.scalars().all()
```

### Model Structure

Each entity has three types of Pydantic models:

| Model Type | Purpose | Example |
|------------|---------|---------|
| `*Create` | Request body for POST | `RoomCreate` |
| `*Update` | Request body for PUT (all fields optional) | `RoomUpdate` |
| `*Response` | API response format | `RoomResponse` |

SQLAlchemy models define the database schema:

```python
class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    room_number = Column(String(20), unique=True)
    room_type = Column(Enum(RoomTypeEnum))
    # ... additional columns
```

---

## Frontend Deep Dive

### App Router Structure

Next.js 14 App Router organizes pages by directory:

```
app/
├── layout.tsx      # Root layout - wraps all pages
├── page.tsx        # Dashboard at /
├── login/
│   └── page.tsx    # Login page at /login
├── rooms/
│   └── page.tsx    # Room management at /rooms
└── bookings/
    └── page.tsx    # Booking calendar at /bookings
```

### Authentication State Management

The `AuthContext` provides global authentication state:

```tsx
// In any component:
const { user, isAuthenticated, login, logout } = useAuth()

// Protected route pattern:
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login')
  }
}, [isAuthenticated, isLoading])
```

### API Client Pattern

Centralized API calls through `lib/api.ts`:

```typescript
// Set token after login
setAuthToken(token)

// Make authenticated requests
const rooms = await api.get<Room[]>('/rooms/')
const booking = await api.post<Booking>('/bookings/', bookingData)
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐
│       rooms         │
├─────────────────────┤
│ id (PK)             │
│ room_number (UK)    │
│ room_type           │
│ bed_configuration   │
│ floor_number        │
│ base_price          │
│ max_occupancy       │
│ status              │
│ has_ac, has_tv...   │
│ created_at          │
│ updated_at          │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐         ┌─────────────────────┐
│      bookings       │         │       guests        │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ room_id (FK)        │         │ full_name           │
│ guest_name          │         │ phone (indexed)     │
│ guest_phone         │         │ email (indexed)     │
│ check_in_date       │         │ id_proof_type       │
│ check_out_date      │         │ id_proof_number     │
│ booking_source      │         │ address             │
│ room_rate_per_night │         │ total_bookings      │
│ total_amount        │         │ total_spent         │
│ payment_status      │         │ first_visit         │
│ status              │         │ last_visit          │
│ created_at          │         │ created_at          │
│ updated_at          │         │ updated_at          │
└─────────────────────┘         └─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐         ┌─────────────────────┐
│  booking_services   │         │      expenses       │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ booking_id (FK)     │         │ category            │
│ service_name        │         │ subcategory         │
│ quantity            │         │ description         │
│ unit_price          │         │ amount              │
│ total_price         │         │ amount_paid         │
│ service_date        │         │ amount_due          │
│ notes               │         │ expense_date        │
└─────────────────────┘         │ vendor_name         │
                                │ status              │
                                │ recurrence_type     │
                                │ created_at          │
                                │ updated_at          │
                                └─────────────────────┘
```

### Key Enumerations

| Enum | Values |
|------|--------|
| `RoomTypeEnum` | Single, Double, Deluxe, Suite, Family Room, Custom |
| `RoomStatusEnum` | Active, Under Maintenance, Inactive |
| `BookingStatusEnum` | Confirmed, Checked In, Checked Out, Cancelled, No Show |
| `PaymentStatusEnum` | Paid, Partially Paid, Unpaid |
| `BookingSourceEnum` | Walk-in, Phone, OTA-MakeMyTrip, OTA-Booking.com, etc. |
| `ExpenseCategoryEnum` | Staff Salaries, Utilities, Housekeeping, Maintenance, etc. |

---

## Authentication System

### Security Model

The system uses a **simplified shared-password authentication**:

- Single password for all hotel staff
- JWT tokens for session management
- Tokens stored in localStorage for persistence

### Token Flow

1. **Login**: POST `/auth/login` with password
2. **Token Storage**: JWT stored in localStorage + in-memory
3. **Request Auth**: Bearer token added to all API requests
4. **Token Verification**: Backend decodes JWT and validates
5. **Logout**: Token removed from storage

### JWT Token Structure

```json
{
  "sub": "hotel_admin",     // Subject (user ID)
  "exp": 1704240000,        // Expiration timestamp
  "type": "access"          // Token type
}
```

### Token Expiration

| Scenario | Expiration |
|----------|------------|
| Normal login | 24 hours |
| "Remember me" checked | 30 days |

---

## Docker Infrastructure

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    nginx     │  │   frontend   │  │   backend    │       │
│  │  (gateway)   │──│  (Next.js)   │  │  (FastAPI)   │       │
│  │  Port 16873  │  │  Port 3000   │  │  Port 8000   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                              │               │
│                                              ▼               │
│                                      ┌──────────────┐       │
│                                      │      db      │       │
│                                      │ (PostgreSQL) │       │
│                                      │  Port 5432   │       │
│                                      └──────────────┘       │
│                                              │               │
│                                              ▼               │
│                                      ┌──────────────┐       │
│                                      │    Volume    │       │
│                                      │  (db_data)   │       │
│                                      └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Service Dependencies

```yaml
services:
  nginx:
    depends_on: [frontend, backend]    # Waits for apps

  backend:
    depends_on:
      db:
        condition: service_healthy     # Waits for DB health check

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_user"]
```

### Volume Mounts (Development)

| Service | Mount | Purpose |
|---------|-------|---------|
| frontend | `./frontend:/app` | Hot reload |
| backend | `./backend:/app` | Hot reload |
| db | `./database:/docker-entrypoint-initdb.d` | Init scripts |

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Authenticate and get JWT token |
| POST | `/auth/logout` | Logout (client-side token removal) |
| GET | `/auth/me` | Get current user info |
| GET | `/auth/verify` | Verify token validity |

### Room Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms/` | List all rooms |
| POST | `/rooms/` | Create new room |
| GET | `/rooms/{id}` | Get room details |
| PUT | `/rooms/{id}` | Update room |
| DELETE | `/rooms/{id}` | Delete room |
| GET | `/rooms/summary` | Get room statistics |

### Booking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bookings/` | List all bookings |
| POST | `/bookings/` | Create new booking |
| GET | `/bookings/{id}` | Get booking details |
| PUT | `/bookings/{id}` | Update booking |
| DELETE | `/bookings/{id}` | Cancel booking |
| POST | `/bookings/{id}/check-in` | Check in guest |
| POST | `/bookings/{id}/check-out` | Check out guest |

### Expense Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses/` | List all expenses |
| POST | `/expenses/` | Create new expense |
| GET | `/expenses/{id}` | Get expense details |
| PUT | `/expenses/{id}` | Update expense |
| DELETE | `/expenses/{id}` | Delete expense |
| GET | `/expenses/summary` | Get expense statistics |

### Guest Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/guests/` | List all guests |
| POST | `/guests/` | Create new guest |
| GET | `/guests/{id}` | Get guest details |
| PUT | `/guests/{id}` | Update guest |
| DELETE | `/guests/{id}` | Delete guest |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Application health status |

---

## Development Workflow

### Starting the Application

```bash
# Start all services with build
make up

# Or using docker-compose directly
docker-compose up --build
```

### Accessing the Application

- **Frontend**: http://localhost:16873
- **API Docs**: http://localhost:16873/api/docs
- **API ReDoc**: http://localhost:16873/api/redoc

### Viewing Logs

```bash
make logs           # All services
make logs-frontend  # Frontend only
make logs-backend   # Backend only
make logs-db        # Database only
```

### Default Credentials

- **Password**: `hotel2024admin`

---

## Summary

This Hotel Management System is a well-structured full-stack application that demonstrates:

1. **Clean Architecture**: Separation of concerns between frontend, backend, and database
2. **Type Safety**: TypeScript on frontend, Pydantic on backend
3. **Modern Practices**: Async/await, React hooks, FastAPI dependency injection
4. **Containerization**: Docker for consistent development and deployment
5. **Security**: JWT authentication, password protection

The codebase is designed to be maintainable and extensible, following industry best practices for both Python and TypeScript development.
