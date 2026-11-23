from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime, timezone
from typing import Optional


class TransactionCreate(BaseModel):
    amount: float
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    category_id: int
    # Optional: when the spending really happened (e.g. an offline entry or an SMS)
    date: Optional[datetime] = None

    @field_validator("date")
    @classmethod
    def date_as_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

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
class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    payment_mode: Optional[str] = None
    category_id: Optional[int] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
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

    model_config = ConfigDict(from_attributes=True)