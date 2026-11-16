from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.budget import (
    MONTH_PATTERN,
    BudgetCreate,
    BudgetUpdate,
    BudgetOut,
    BudgetProgressOut,
)

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post("/", response_model=BudgetOut)
def create_budget(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.query(Category).filter(
        Category.id == budget.category_id,
        Category.owner_id == current_user.id,
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    existing_budget = db.query(Budget).filter(
        Budget.owner_id == current_user.id,
        Budget.category_id == budget.category_id,
        Budget.month == budget.month,
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=400,
            detail="A budget for this category and month already exists",
        )

    new_budget = Budget(
        limit_amount=budget.limit_amount,
        month=budget.month,
        category_id=budget.category_id,
        owner_id=current_user.id,
    )
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    return new_budget


@router.get("/", response_model=List[BudgetOut])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Budget).filter(Budget.owner_id == current_user.id).all()


@router.get("/progress", response_model=List[BudgetProgressOut])
def get_budget_progress(
    month: str = Query(..., description='Format "YYYY-MM", e.g. "2026-11"'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not MONTH_PATTERN.match(month):
        raise HTTPException(
            status_code=422, detail='Month must be in "YYYY-MM" format, e.g. "2026-11"'
        )

    # Same UTC month boundaries as /dashboard/summary
    year, mon = int(month[:4]), int(month[5:])
    start = datetime(year, mon, 1, tzinfo=timezone.utc)
    end = (
        datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        if mon == 12
        else datetime(year, mon + 1, 1, tzinfo=timezone.utc)
    )

    rows = (
        db.query(
            Budget.id,
            Budget.category_id,
            Budget.month,
            Budget.limit_amount,
            Category.name,
            func.coalesce(func.sum(Transaction.amount), 0.0),
        )
        .join(Category, Category.id == Budget.category_id)
        .outerjoin(
            Transaction,
            (Transaction.category_id == Budget.category_id)
            & (Transaction.owner_id == Budget.owner_id)
            & (Transaction.date >= start)
            & (Transaction.date < end),
        )
        .filter(Budget.owner_id == current_user.id, Budget.month == month)
        .group_by(
            Budget.id,
            Budget.category_id,
            Budget.month,
            Budget.limit_amount,
            Category.name,
        )
        .order_by(Category.name)
        .all()
    )

    return [
        BudgetProgressOut(
            budget_id=budget_id,
            category_id=category_id,
            category_name=category_name,
            month=budget_month,
            limit_amount=limit_amount,
            spent=float(spent),
            remaining=limit_amount - float(spent),
            percent_used=round(float(spent) / limit_amount * 100, 1),
        )
        for budget_id, category_id, budget_month, limit_amount, category_name, spent in rows
    ]


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    budget_update: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.owner_id == current_user.id,
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if budget_update.limit_amount is not None:
        budget.limit_amount = budget_update.limit_amount
    if budget_update.month is not None:
        budget.month = budget_update.month

    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.owner_id == current_user.id,
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(budget)
    db.commit()
    return {"detail": "Budget deleted successfully"}