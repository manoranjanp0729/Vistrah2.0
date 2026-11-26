from typing import Any

from app.domain.payments.gateway import PaymentGatewayAdapter, get_payment_gateway
from app.domain.payments.webhook_service import process_verified_event
from sqlalchemy.orm import Session


class PaymentService:
    """VISTRAH-facing payment orchestration over an interchangeable gateway adapter."""

    def __init__(self, gateway: PaymentGatewayAdapter | None = None):
        self.gateway = gateway or get_payment_gateway()

    def create_checkout(self, transaction_id: str, user_id: str, amount_paise: int, currency: str):
        return self.gateway.create_checkout(transaction_id, user_id, amount_paise, currency)

    def create_subscription(self, user_id: str, plan_slug: str):
        return self.gateway.create_subscription(user_id, plan_slug)

    def verify_payment(self, payment_reference: str, amount_paise: int, currency: str) -> bool:
        return self.gateway.verify_payment(payment_reference, amount_paise, currency)

    def process_webhook(self, db: Session, event: dict[str, Any]):
        return process_verified_event(db, self.gateway.name, event)

    def request_refund(self, transaction_id: str, amount_paise: int):
        return self.gateway.request_refund(transaction_id, amount_paise)

    def request_settlement(self, settlement_id: str, recipient_reference: str, amount_paise: int):
        return self.gateway.request_settlement(settlement_id, recipient_reference, amount_paise)

    def onboard_recipient(self, recipient_key: str):
        return self.gateway.onboard_recipient(recipient_key)

    def cancel_subscription(self, subscription_reference: str):
        return self.gateway.cancel_subscription(subscription_reference)

    def verify_webhook(self, raw_body: bytes, signature: str) -> bool:
        return self.gateway.verify_webhook(raw_body, signature)

    def sign_sandbox_event(self, event: dict[str, Any]) -> tuple[bytes, str]:
        sign = getattr(self.gateway, "sign_webhook_for_sandbox", None)
        if not sign:
            raise RuntimeError("This gateway adapter does not expose sandbox event signing")
        return sign(event)
