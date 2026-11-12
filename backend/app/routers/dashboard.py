import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.dashboard import CategoryTotal, DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    month: str = Query(..., description='Format "YYYY-MM", e.g. "2026-11"'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not MONTH_PATTERN.match(month):
        raise HTTPException(
            status_code=422, detail='Month must be in "YYYY-MM" format, e.g. "2026-11"'
        )

    year, mon = int(month[:4]), int(month[5:])
    start = datetime(year, mon, 1, tzinfo=timezone.utc)
    end = (
        datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        if mon == 12
        else datetime(year, mon + 1, 1, tzinfo=timezone.utc)
    )

    rows = (
        db.query(
            Category.id,
            Category.name,
            Category.type,
            func.coalesce(func.sum(Transaction.amount), 0.0),
            func.count(Transaction.id),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.owner_id == current_user.id,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Category.id, Category.name, Category.type)
        .all()
    )

    total_income = 0.0
    total_expense = 0.0
    count = 0
    by_category = []

    for cat_id, name, cat_type, total, n in rows:
        total = float(total)
        count += n
        if cat_type == "income":
            total_income += total
        else:
            total_expense += total
            by_category.append(CategoryTotal(category_id=cat_id, name=name, total=total))

    by_category.sort(key=lambda c: c.total, reverse=True)

    return DashboardSummary(
        month=month,
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        transaction_count=count,
        by_category=by_category,
    )