from pydantic import BaseModel
from typing import Optional


class BudgetCreate(BaseModel):
    limit_amount: float
    month: str  # format: "YYYY-MM", e.g. "2026-09"
    category_id: int


class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = None
    month: Optional[str] = None


class BudgetOut(BaseModel):
    id: int
    limit_amount: float
    month: str
    owner_id: int
    category_id: int

    class Config:
        from_attributes = True