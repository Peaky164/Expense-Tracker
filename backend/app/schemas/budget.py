import re

from pydantic import BaseModel, field_validator
from typing import Optional

MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _validate_month(v: str) -> str:
    if not MONTH_PATTERN.match(v):
        raise ValueError('Month must be in "YYYY-MM" format, e.g. "2026-09"')
    return v


class BudgetCreate(BaseModel):
    limit_amount: float
    month: str  # format: "YYYY-MM", e.g. "2026-09"
    category_id: int

    @field_validator("limit_amount")
    @classmethod
    def limit_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Limit amount must be greater than 0")
        return v

    @field_validator("month")
    @classmethod
    def month_format(cls, v: str) -> str:
        return _validate_month(v)


class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = None
    month: Optional[str] = None

    @field_validator("limit_amount")
    @classmethod
    def limit_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Limit amount must be greater than 0")
        return v

    @field_validator("month")
    @classmethod
    def month_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validate_month(v)
        return v


class BudgetOut(BaseModel):
    id: int
    limit_amount: float
    month: str
    owner_id: int
    category_id: int

    class Config:
        from_attributes = True