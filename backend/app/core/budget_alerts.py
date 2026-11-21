from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.push import send_push
from app.models.budget import Budget
from app.models.budget_alert import BudgetAlert
from app.models.category import Category
from app.models.push_token import PushToken
from app.models.transaction import Transaction


def check_budget_alerts(db: Session, owner_id: int, category_id: int, when: datetime) -> None:
    """After a transaction is saved, send a push at 80% and 100% of the
    budget (once each). Never raises, so saving a transaction can't fail."""
    try:
        _check(db, owner_id, category_id, when)
    except Exception:
        db.rollback()


def _check(db: Session, owner_id: int, category_id: int, when: datetime) -> None:
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    when = when.astimezone(timezone.utc)

    month = f"{when.year:04d}-{when.month:02d}"
    budget = (
        db.query(Budget)
        .filter(
            Budget.owner_id == owner_id,
            Budget.category_id == category_id,
            Budget.month == month,
        )
        .first()
    )
    if not budget or budget.limit_amount <= 0:
        return

    # Same UTC month boundaries as /budgets/progress
    start = datetime(when.year, when.month, 1, tzinfo=timezone.utc)
    end = (
        datetime(when.year + 1, 1, 1, tzinfo=timezone.utc)
        if when.month == 12
        else datetime(when.year, when.month + 1, 1, tzinfo=timezone.utc)
    )
    spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.owner_id == owner_id,
            Transaction.category_id == category_id,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .scalar()
    )
    percent = float(spent) / budget.limit_amount * 100

    # Only the highest threshold reached, so one transaction sends one push
    threshold = 100 if percent >= 100 else 80 if percent >= 80 else None
    if threshold is None:
        return

    already = (
        db.query(BudgetAlert)
        .filter(BudgetAlert.budget_id == budget.id, BudgetAlert.threshold >= threshold)
        .first()
    )
    if already:
        return

    # The unique constraint makes sure two requests can't both send this alert
    db.add(BudgetAlert(budget_id=budget.id, threshold=threshold))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return

    category = db.query(Category).filter(Category.id == category_id).first()
    name = category.name if category else "a category"
    tokens = [
        t.token for t in db.query(PushToken).filter(PushToken.owner_id == owner_id).all()
    ]

    if threshold == 100:
        title = "Budget limit reached"
        body = f"You have used {percent:.0f}% of your {name} budget this month."
    else:
        title = "Budget warning"
        body = f"You have used {percent:.0f}% of your {name} budget this month."
    send_push(tokens, title, body)