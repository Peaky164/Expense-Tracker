from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TransactionCreate(BaseModel):
    amount: float
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    category_id: int

class TransactionOut(BaseModel):
    id: int
    amount: float
    description: Optional[str] = None
    date: datetime
    payment_mode: Optional[str] = None
    owner_id: int
    category_id: int

    class Config:
        from_attributes = True
