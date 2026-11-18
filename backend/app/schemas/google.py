from pydantic import BaseModel


class GoogleLogin(BaseModel):
    id_token: str