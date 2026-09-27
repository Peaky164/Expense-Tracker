from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.schemas.category import CategoryCreate, CategoryOut

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.post("/", response_model=CategoryOut)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_category = Category(
        name=category.name.strip(),
        type=category.type,
        owner_id=current_user.id,
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.get("/", response_model=List[CategoryOut])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Category).filter(Category.owner_id == current_user.id).all()


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.owner_id == current_user.id,
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    has_transactions = db.query(Transaction).filter(
        Transaction.category_id == category_id
    ).first()
    has_budgets = db.query(Budget).filter(
        Budget.category_id == category_id
    ).first()

    if has_transactions or has_budgets:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a category that still has transactions or budgets. "
                   "Delete those first, or reassign them to another category.",
        )

    db.delete(category)
    db.commit()
    return {"detail": "Category deleted successfully"}