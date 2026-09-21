from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.category import Category
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetOut

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