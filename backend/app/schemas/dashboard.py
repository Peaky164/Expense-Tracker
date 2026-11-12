from typing import List

from pydantic import BaseModel


class CategoryTotal(BaseModel):
    category_id: int
    name: str
    total: float


class DashboardSummary(BaseModel):
    month: str
    total_income: float
    total_expense: float
    balance: float
    transaction_count: int
    by_category: List[CategoryTotal]