import hashlib
import hmac
import json
import secrets
import uuid
from dataclasses import dataclass
from typing import Any, Protocol

from app.core.config import settings


@dataclass(frozen=True)
class CheckoutSession:
    order_reference: str
    checkout_url: str
    customer_reference: str
    subscription_reference: str | None = None


class PaymentGatewayAdapter(Protocol):
    name: str

    def create_checkout(self, transaction_id: str, user_id: str, amount_paise: int, currency: str) -> CheckoutSession: ...
    def create_subscription(self, user_id: str, plan_slug: str) -> tuple[str, str]: ...
    def verify_payment(self, payment_reference: str, amount_paise: int, currency: str) -> bool: ...
    def request_refund(self, transaction_id: str, amount_paise: int) -> str: ...
    def request_settlement(self, settlement_id: str, recipient_reference: str, amount_paise: int) -> str: ...
    def onboard_recipient(self, recipient_key: str) -> str: ...
    def cancel_subscription(self, subscription_reference: str) -> None: ...
    def verify_webhook(self, raw_body: bytes, signature: str) -> bool: ...


_ephemeral_sandbox_secret = secrets.token_urlsafe(48)


class SandboxPaymentGateway:
    """Deterministic local sandbox adapter; it never transfers real money."""

    name = "SANDBOX"

    def __init__(self, webhook_secret: str | None = None):
        self.webhook_secret = webhook_secret or settings.payment_webhook_secret or _ephemeral_sandbox_secret

    def create_checkout(self, transaction_id: str, user_id: str, amount_paise: int, currency: str) -> CheckoutSession:
        if currency != "INR" or amount_paise <= 0:
            raise ValueError("Sandbox checkout requires a positive INR amount")
        return CheckoutSession(
            order_reference=f"sbx_order_{uuid.uuid4().hex}",
            checkout_url=f"/sandbox-checkout?transaction={transaction_id}",
            customer_reference=f"sbx_customer_{user_id}",
        )

    def create_subscription(self, user_id: str, plan_slug: str) -> tuple[str, str]:
        return f"sbx_customer_{user_id}", f"sbx_subscription_{plan_slug}_{uuid.uuid4().hex}"

    def verify_payment(self, payment_reference: str, amount_paise: int, currency: str) -> bool:
        return payment_reference.startswith("sbx_payment_") and amount_paise > 0 and currency == "INR"

    def request_refund(self, transaction_id: str, amount_paise: int) -> str:
        return f"sbx_refund_{uuid.uuid4().hex}"

    def request_settlement(self, settlement_id: str, recipient_reference: str, amount_paise: int) -> str:
        if not recipient_reference:
            raise ValueError("A verified gateway recipient reference is required")
        return f"sbx_settlement_{uuid.uuid4().hex}"

    def onboard_recipient(self, recipient_key: str) -> str:
        if not recipient_key:
            raise ValueError("Recipient key is required")
        return f"sbx_account_{uuid.uuid4().hex}"

    def cancel_subscription(self, subscription_reference: str) -> None:
        if not subscription_reference.startswith("sbx_subscription_"):
            raise ValueError("Unknown sandbox subscription")

    def verify_webhook(self, raw_body: bytes, signature: str) -> bool:
        supplied = signature.removeprefix("sha256=").strip()
        expected = hmac.new(self.webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, supplied)

    def sign_webhook_for_sandbox(self, event: dict[str, Any]) -> tuple[bytes, str]:
        raw_body = json.dumps(event, separators=(",", ":"), sort_keys=True).encode()
        digest = hmac.new(self.webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return raw_body, f"sha256={digest}"


def get_payment_gateway(name: str = "sandbox") -> PaymentGatewayAdapter:
    if settings.payments_mode.lower() != "sandbox" or name.lower() != "sandbox" or settings.payment_gateway.lower() != "sandbox":
        raise RuntimeError("Only the sandbox payment gateway is enabled in this phase")
    return SandboxPaymentGateway()
