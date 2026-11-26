from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://vistra:vistra@localhost:5432/vistra"
    jwt_secret: str = "change-me"
    cors_origins: str = "http://localhost:3000"
    aws_region: str = "ap-south-1"
    aws_s3_bucket: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    payments_mode: str = "sandbox"
    payment_gateway: str = "sandbox"
    payment_webhook_secret: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
