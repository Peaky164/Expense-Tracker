from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PushTokenCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    token: str = Field(min_length=1, max_length=255)


class PushTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    token: str
    created_at: datetime