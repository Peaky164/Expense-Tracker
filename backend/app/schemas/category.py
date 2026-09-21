from pydantic import BaseModel
from typing import Literal

class CategoryCreate(BaseModel):
    name: str
    type: Literal["income", "expense"]

class CategoryOut(BaseModel):
    id: int
    name: str
    type: str
    owner_id: int

    class Config:
        from_attributes = True