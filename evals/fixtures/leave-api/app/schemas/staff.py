from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    is_manager: bool = False


class StaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    is_manager: bool
