from fastapi import FastAPI
from app.core.database import Base, engine
from app.models import user, category, transaction, budget

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Expense Tracker API is running!"}