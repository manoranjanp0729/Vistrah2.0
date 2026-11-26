from sqlalchemy import String, Text, Boolean, Integer, BigInteger, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    icon: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Service(Base):
    __tablename__ = "services"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    base_price_paise: Mapped[int | None] = mapped_column(BigInteger)
    quote_required: Mapped[bool] = mapped_column(Boolean, default=False)

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    application_number: Mapped[str] = mapped_column(String(40), unique=True)
    user_id: Mapped[str] = mapped_column(String(36))
    service_id: Mapped[str] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(40), default="SUBMITTED")
    requirement_data: Mapped[dict] = mapped_column(JSON, default=dict)
    quoted_amount_paise: Mapped[int | None] = mapped_column(BigInteger)
    discount_amount_paise: Mapped[int] = mapped_column(BigInteger, default=0)
    final_amount_paise: Mapped[int | None] = mapped_column(BigInteger)
