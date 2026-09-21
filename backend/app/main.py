from fastapi import FastAPI
from app.core.database import Base, engine
from app.models import user, category, transaction, budget
from app.routers import auth, category, transaction, budget

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(category.router)
app.include_router(transaction.router)
app.include_router(budget.router)

@app.get("/")
def read_root():
    return {"message": "Expense Tracker API is running!"}