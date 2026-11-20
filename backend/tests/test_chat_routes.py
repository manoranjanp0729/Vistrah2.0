"""Tests for grounded Ask VISTRAH Gemini chatbot (`POST /api/chat` and `POST /chat`)."""
import io
import json

from app import chat_routes


def test_chat_gemini_grounded_reply_sanitizes_actions_and_hides_api_key(client, monkeypatch):
    chat_routes.clear_chat_rate_limits()
    monkeypatch.setenv("GEMINI_API_KEY", "test-secret-gemini-key")

    captured: list[dict] = []

    class _FakeGeminiResp:
        def read(self, n: int = -1) -> bytes:
            payload = {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "reply": "You can find verified Clinics near you on VISTRAH's interactive map, or list your clinic in 3 steps.",
                                            "suggestedActions": [
                                                {
                                                    "label": "Nearby Clinics",
                                                    "href": "/services/nearby?category=hospitals-and-labs&subcategory=clinics&type=clinics",
                                                },
                                                {
                                                    "label": "List Your Clinic",
                                                    "href": "/seller/onboard?category=hospitals-and-labs&type=clinics",
                                                },
                                                {
                                                    "label": "Blocked External Link",
                                                    "href": "https://evil.example.com/phish",
                                                },
                                                {
                                                    "label": "Blocked JS URI",
                                                    "href": "javascript:alert(1)",
                                                },
                                            ],
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
            return io.BytesIO(json.dumps(payload).encode("utf-8")).read(n)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    class _FakeOpener:
        def open(self, req, timeout=9):
            captured.append(
                {
                    "url": req.full_url,
                    "headers": {k.lower(): v for k, v in req.header_items()},
                    "body": json.loads(req.data.decode("utf-8")),
                }
            )
            return _FakeGeminiResp()

    monkeypatch.setattr(chat_routes, "build_opener", lambda *a, **kw: _FakeOpener())

    resp = client.post(
        "/api/chat",
        json={
            "message": "Where can I find clinics near me?",
            "history": [{"role": "user", "content": "Hello"}],
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.headers["cache-control"] == "private, no-store"
    data = resp.json()
    assert "Clinics" in data["reply"]
    # Unsafe external / javascript: links are stripped fail-closed!
    assert data["suggestedActions"] == [
        {
            "label": "Nearby Clinics",
            "href": "/services/nearby?category=hospitals-and-labs&subcategory=clinics&type=clinics",
        },
        {
            "label": "List Your Clinic",
            "href": "/seller/onboard?category=hospitals-and-labs&type=clinics",
        },
    ]

    assert len(captured) == 1
    sent = captured[0]
    assert "key=" not in sent["url"]  # Key passed only via header, never URL
    assert sent["headers"]["x-goog-api-key"] == "test-secret-gemini-key"
    sys_prompt = sent["body"]["systemInstruction"]["parts"][0]["text"]
    assert "Vistrah India Pvt Limited" in sys_prompt
    assert "/seller/onboard" in sys_prompt
    assert "/services/nearby" in sys_prompt
    assert "Free Forever" in sys_prompt
    assert "any geographic radius" in sys_prompt.lower()
    assert "clinics" in sys_prompt.lower()


def test_chat_fallback_when_key_missing_and_per_ip_rate_limit(client, monkeypatch):
    chat_routes.clear_chat_rate_limits()
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("VISTRAH_GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("CHAT_RATE_LIMIT_PER_MINUTE", "2")

    r1 = client.post(
        "/chat",
        headers={"X-Forwarded-For": "203.0.113.42"},
        json={"message": "How do I list my business?"},
    )
    assert r1.status_code == 200
    b1 = r1.json()
    assert "/seller/onboard" in b1["reply"]
    assert any(a["href"].startswith("/seller/onboard") for a in b1["suggestedActions"])

    r2 = client.post(
        "/api/chat",
        headers={"X-Forwarded-For": "203.0.113.42"},
        json={"message": "Find EV charging near me"},
    )
    assert r2.status_code == 200
    b2 = r2.json()
    assert any("/services/nearby?" in a["href"] for a in b2["suggestedActions"])

    # 3rd request from same IP hits 429 rate limit with clean suggestedActions
    r3 = client.post(
        "/api/chat",
        headers={"X-Forwarded-For": "203.0.113.42"},
        json={"message": "Another question"},
    )
    assert r3.status_code == 429
    assert r3.json()["code"] == "CHAT_RATE_LIMITED"
    assert len(r3.json()["suggestedActions"]) >= 1

    # Different visitor IP is unaffected — verify pricing / free V Ads fallback grounding
    r_other = client.post(
        "/api/chat",
        headers={"X-Forwarded-For": "198.51.100.77"},
        json={"message": "What is the pricing to list my business and upload V Ads?"},
    )
    assert r_other.status_code == 200
    b_other = r_other.json()
    assert "100% Free Forever" in b_other["reply"]
    assert any(a["href"] == "/pricing" for a in b_other["suggestedActions"])
    chat_routes.clear_chat_rate_limits()
