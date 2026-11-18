from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from fastapi import Request
from app.core.limiter import limiter
from app.core.google import GoogleNotConfigured, GoogleTokenError, verify_google_token
from app.schemas.google import GoogleLogin

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserOut)
@limiter.limit("5/minute")
def signup(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user.email.strip().lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user.name.strip(),
        email=normalized_email,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    normalized_email = credentials.email.strip().lower()

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not user.hashed_password or not verify_password(
        credentials.password, user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=Token)
@limiter.limit("10/minute")
def google_login(request: Request, payload: GoogleLogin, db: Session = Depends(get_db)):
    try:
        info = verify_google_token(payload.id_token)
    except GoogleNotConfigured:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    except GoogleTokenError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    sub = info.get("sub")
    email = (info.get("email") or "").strip().lower()
    if not sub or not email:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    if not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email is not verified")

    # Returning Google user: match on the stable Google ID first.
    user = db.query(User).filter(User.google_sub == sub).first()

    if user is None:
        user = db.query(User).filter(User.email == email).first()
        if user is not None:
            # Existing account with the same (Google-verified) email: link it.
            user.google_sub = sub
        else:
            user = User(
                name=(info.get("name") or email.split("@")[0]).strip(),
                email=email,
                hashed_password=None,
                google_sub=sub,
            )
            db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user