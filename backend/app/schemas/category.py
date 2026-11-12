from pydantic import BaseModel, field_validator
from typing import Literal, Optional


class CategoryCreate(BaseModel):
    name: str
    type: Literal["income", "expense"]

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be blank")
        return v
class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be blank")
        return v

    


class CategoryOut(BaseModel):
    id: int
    name: str
    type: str
    owner_id: int

    class Config:
        from_attributes = True