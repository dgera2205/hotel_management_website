from pydantic import BaseModel, EmailStr
from typing import Optional

class User(BaseModel):
    id: str
    email: EmailStr
    hashed_password: str

class UserInDB(User):
    pass
