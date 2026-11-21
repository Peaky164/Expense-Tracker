import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.database import Base, engine
from app.core.limiter import limiter
from app.models import user as user_model
from app.models import category as category_model
from app.models import transaction as transaction_model
from app.models import budget as budget_model
from app.routers import auth, category, transaction, budget, dashboard, push_token

app = FastAPI(title="Expense Tracker API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Comma-separated list of allowed origins, e.g.
# "http://localhost:5173,https://your-app.vercel.app"
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(category.router)
app.include_router(transaction.router)
app.include_router(budget.router)
app.include_router(dashboard.router)
app.include_router(push_token.router)


@app.get("/")
def read_root():
    return {"message": "Expense Tracker API is running!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}