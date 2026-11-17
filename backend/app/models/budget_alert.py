from datetime import datetime, timezone

from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint

from app.core.database import Base


class BudgetAlert(Base):
    """Remembers which threshold alerts were already sent for a budget."""

    __tablename__ = "budget_alerts"
    __table_args__ = (
        UniqueConstraint("budget_id", "threshold", name="uq_budget_alert_threshold"),
    )

    id = Column(Integer, primary_key=True, index=True)
    threshold = Column(Integer, nullable=False)  # 80 or 100
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # CASCADE so deleting a budget (your existing DELETE endpoint) also removes its alerts
    budget_id = Column(
        Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )