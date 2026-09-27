import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import user as user_model
from app.models import category as category_model
from app.models import transaction as transaction_model
from app.models import budget as budget_model
from app.routers import auth, category, transaction, budget

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expense Tracker API")

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


@app.get("/")
def read_root():
    return {"message": "Expense Tracker API is running!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}