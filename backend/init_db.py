import asyncio
from database import Base, engine
from models import Room, Booking, BookingService, Expense, Guest

async def init_database():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_database())