from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.push_token import PushToken
from app.schemas.push_token import PushTokenCreate, PushTokenOut

router = APIRouter(prefix="/push-tokens", tags=["Push tokens"])


def _claim(existing: PushToken, user: User, db: Session) -> PushToken:
    # Same token for the same user is a no-op; another user's token moves to this user.
    if existing.owner_id != user.id:
        existing.owner_id = user.id
        db.commit()
        db.refresh(existing)
    return existing


@router.post("/", response_model=PushTokenOut)
def register_push_token(
    payload: PushTokenCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(PushToken).filter(PushToken.token == payload.token).first()
    if existing:
        return _claim(existing, current_user, db)

    new_token = PushToken(token=payload.token, owner_id=current_user.id)
    db.add(new_token)
    try:
        db.commit()
    except IntegrityError:
        # Two requests registered the same token at once; use the row that won.
        db.rollback()
        existing = db.query(PushToken).filter(PushToken.token == payload.token).first()
        return _claim(existing, current_user, db)
    db.refresh(new_token)
    return new_token


@router.delete("/{token}")
def delete_push_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    push_token = db.query(PushToken).filter(
        PushToken.token == token,
        PushToken.owner_id == current_user.id,
    ).first()

    if not push_token:
        raise HTTPException(status_code=404, detail="Push token not found")

    db.delete(push_token)
    db.commit()
    return {"detail": "Push token deleted successfully"}