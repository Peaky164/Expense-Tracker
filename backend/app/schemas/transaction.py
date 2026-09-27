from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class TransactionCreate(BaseModel):
    amount: float
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    category_id: int

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        return v or None


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