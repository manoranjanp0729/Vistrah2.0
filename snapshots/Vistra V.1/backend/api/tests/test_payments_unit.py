from app.domain.payments.allocation import _split_by_basis_points
from app.domain.payments.gateway import SandboxPaymentGateway
from app.domain.payments.webhook_service import _safe_payload


def test_percentage_allocation_preserves_total_paise():
    targets = [{"basis_points": 7000}, {"basis_points": 3000}]
    shares = _split_by_basis_points(10_001, targets)
    assert shares == [7_001, 3_000]
    assert sum(shares) == 10_001


def test_sandbox_webhook_signature_verification():
    gateway = SandboxPaymentGateway("unit-test-only-secret")
    raw_body, signature = gateway.sign_webhook_for_sandbox({"id": "event-1", "type": "payment.succeeded", "data": {}})
    assert gateway.verify_webhook(raw_body, signature)
    assert not gateway.verify_webhook(raw_body + b" ", signature)


def test_webhook_payload_excludes_payment_credentials():
    safe = _safe_payload({"data": {"card_number": "1234", "cvv": "123", "status": "paid", "amount_paise": 500}})
    assert safe == {"data": {"status": "paid", "amount_paise": 500}}
