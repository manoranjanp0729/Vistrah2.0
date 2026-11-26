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
