from pydantic import BaseModel, Field

class ApplicationCreate(BaseModel):
    user_id: str = Field(min_length=1)
    service_id: str = Field(min_length=1)
    requirement_data: dict = Field(default_factory=dict)
    referral_code: str | None = None

class ApplicationOut(BaseModel):
    application_number: str
    service_id: str
    status: str
    final_amount_paise: int | None
    model_config = {"from_attributes": True}

class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=30)
    password: str = Field(min_length=8, max_length=72)

class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=72)
