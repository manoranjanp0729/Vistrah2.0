"""Isolated unittest for seller V Ads targeting routes; never touches normal DB."""
import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
BOOT = tempfile.TemporaryDirectory(prefix="vistrah-targeting-routes-test-")
with patch.dict(
    os.environ,
    {
        "DATABASE_URL": "sqlite:///" + str(Path(BOOT.name) / "unused.db"),
        "JWT_SECRET": "isolated-targeting-routes-secret-not-real-1234567890",
        "APP_ENV": "development",
    },
):
    main_mod = importlib.import_module("app.main")
    routes = importlib.import_module("app.v_ads_targeting_routes")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import engine as normal_engine, get_db
from app.models import Audit, AuthSession, User, now
from app.security import issue_token
from app.v_ads_geography import MAX_RADIUS_KM
from app.v_ads_models import VAdsAdvertiser, VAdsMediaUpload, VAdsVideo
from app.v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision


@event.listens_for(normal_engine, "connect")
def _forbid_normal_db(*_args):
    raise AssertionError("Normal DB must never be accessed in unit tests")


class VAdsTargetingRoutesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.addCleanup(self.engine.dispose)

        @event.listens_for(self.engine, "connect")
        def _fk_pragma(dbapi_conn, _):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        for table in (
            User.__table__,
            AuthSession.__table__,
            Audit.__table__,
            VAdsAdvertiser.__table__,
            VAdsMediaUpload.__table__,
            VAdsVideo.__table__,
            VAdsTargeting.__table__,
            VAdsTargetingRevision.__table__,
        ):
            table.create(self.engine)

        self.db = Session(self.engine)
        self.addCleanup(self.db.close)

        self.seller1 = User(
            id=1,
            email="seller1@example.test",
            name="Seller One",
            password_hash="unused",
            seller_enabled=True,
        )
        self.seller2 = User(
            id=2,
            email="seller2@example.test",
            name="Seller Two",
            password_hash="unused",
            seller_enabled=True,
        )
        self.customer = User(
            id=3,
            email="customer@example.test",
            name="Customer Only",
            password_hash="unused",
            seller_enabled=False,
        )
        self.admin = User(
            id=4,
            email="admin@example.test",
            name="Admin User",
            password_hash="unused",
            role="ADMIN",
            seller_enabled=False,
        )
        self.db.add_all([self.seller1, self.seller2, self.customer, self.admin])
        self.db.flush()

        self.adv1 = VAdsAdvertiser(
            id="adv-1",
            owner_id=self.seller1.id,
            name="Seller One Studio",
            handle="seller-one",
            status="APPROVED",
        )
        self.adv2 = VAdsAdvertiser(
            id="adv-2",
            owner_id=self.seller2.id,
            name="Seller Two Studio",
            handle="seller-two",
            status="APPROVED",
        )
        self.db.add_all([self.adv1, self.adv2])
        self.db.flush()

        self.video1 = VAdsVideo(
            id="ad-1",
            advertiser_id=self.adv1.id,
            title="Seller One Reel",
            description="Promo",
            video_url="/v-ads/media/u1",
            status="APPROVED",
        )
        self.video2 = VAdsVideo(
            id="ad-2",
            advertiser_id=self.adv2.id,
            title="Seller Two Reel",
            description="Promo",
            video_url="/v-ads/media/u2",
            status="PENDING",
        )
        self.db.add_all([self.video1, self.video2])
        self.db.commit()

        self.token_seller1 = issue_token(self.db, self.seller1)
        self.token_seller2 = issue_token(self.db, self.seller2)
        self.token_customer = issue_token(self.db, self.customer)
        self.token_admin = issue_token(self.db, self.admin)

        main_mod.app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(main_mod.app.dependency_overrides.clear)
        self.client = TestClient(main_mod.app)
        self.addCleanup(self.client.close)

    def _headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def test_main_app_registers_seller_targeting_routes(self):
        paths = {route.path for route in main_mod.app.routes if hasattr(route, "path")}
        self.assertIn("/v-ads/seller/targeting/{ad_id}", paths)

    def test_authentication_and_ownership_guards(self):
        self.assertEqual(self.client.get("/v-ads/seller/targeting/ad-1").status_code, 401)
        self.assertEqual(
            self.client.get("/v-ads/seller/targeting/ad-1", headers=self._headers(self.token_customer)).status_code,
            403,
        )
        self.assertEqual(
            self.client.get("/v-ads/seller/targeting/missing-ad", headers=self._headers(self.token_seller1)).status_code,
            404,
        )
        self.assertEqual(
            self.client.get("/v-ads/seller/targeting/ad-2", headers=self._headers(self.token_seller1)).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/v-ads/seller/targeting/ad-2",
                headers=self._headers(self.token_admin),
                json={"latitude": 12.9716, "longitude": 77.5946, "radius_km": 5.0},
            ).status_code,
            403,
        )

    def test_validation_rejects_invalid_bounds_with_422(self):
        invalid_payloads = [
            {"latitude": 90.001, "longitude": 77.5, "radius_km": 5.0},
            {"latitude": -90.5, "longitude": 77.5, "radius_km": 5.0},
            {"latitude": 12.9, "longitude": 180.1, "radius_km": 5.0},
            {"latitude": 12.9, "longitude": -181.0, "radius_km": 5.0},
            {"latitude": 12.9, "longitude": 77.5, "radius_km": 0},
            {"latitude": 12.9, "longitude": 77.5, "radius_km": -2.5},
            {"latitude": 12.9, "longitude": 77.5, "radius_km": MAX_RADIUS_KM + 1},
            {"latitude": True, "longitude": 77.5, "radius_km": 5.0},
            {"latitude": 12.9, "longitude": 77.5, "radius_km": 5.0, "target_regions": "not-a-list"},
            {"latitude": 12.9, "longitude": 77.5, "radius_km": 5.0, "target_regions": ["   "]},
            {"latitude": 12.9, "longitude": 77.5, "radius_km": 5.0, "extra_field": 1},
        ]
        for body in invalid_payloads:
            with self.subTest(body=body):
                resp = self.client.post(
                    "/v-ads/seller/targeting/ad-1",
                    headers=self._headers(self.token_seller1),
                    json=body,
                )
                self.assertEqual(resp.status_code, 422)
        self.assertIsNone(self.db.get(VAdsTargeting, "ad-1"))

    def test_get_and_submit_immutable_revisions_lifecycle(self):
        initial = self.client.get("/v-ads/seller/targeting/ad-1", headers=self._headers(self.token_seller1))
        self.assertEqual(initial.status_code, 200)
        self.assertFalse(initial.json()["configured"])
        self.assertIsNone(initial.json()["active_revision"])
        self.assertEqual(initial.json()["revisions"], [])

        created = self.client.post(
            "/v-ads/seller/targeting/ad-1",
            headers=self._headers(self.token_seller1),
            json={
                "latitude": 12.9716,
                "longitude": 77.5946,
                "radius_km": 10.5,
                "target_regions": ["Bengaluru", "Mysuru", "bengaluru"],
            },
        )
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertTrue(body["configured"])
        self.assertIsNone(body["active_revision"])
        self.assertEqual(body["pending_revision"]["revision"], 1)
        self.assertEqual(body["pending_revision"]["status"], "PENDING")
        self.assertEqual(body["pending_revision"]["radius_km"], 10.5)
        self.assertEqual(body["pending_revision"]["target_regions"], ["Bengaluru", "Mysuru"])

        duplicate = self.client.post(
            "/v-ads/seller/targeting/ad-1",
            headers=self._headers(self.token_seller1),
            json={"latitude": 13.0, "longitude": 77.6, "radius_km": 15.0},
        )
        self.assertEqual(duplicate.status_code, 409)

        rev1 = self.db.get(VAdsTargetingRevision, ("ad-1", 1))
        with self.db.no_autoflush:
            rev1.status = "APPROVED"
            rev1.reviewed_by = 4
            rev1.reviewed_at = now()
        self.db.commit()

        second = self.client.post(
            "/v-ads/seller/targeting/ad-1",
            headers=self._headers(self.token_seller1),
            json={
                "latitude": 15.3647,
                "longitude": 75.1240,
                "radius_km": 25.0,
                "target_regions": ["Hubballi"],
            },
        )
        self.assertEqual(second.status_code, 201)
        fetched = self.client.get("/v-ads/seller/targeting/ad-1", headers=self._headers(self.token_seller1)).json()
        self.assertEqual(fetched["active_revision"]["revision"], 1)
        self.assertEqual(fetched["active_revision"]["latitude"], 12.9716)
        self.assertEqual(fetched["pending_revision"]["revision"], 2)
        self.assertEqual(fetched["pending_revision"]["radius_km"], 25.0)
        self.assertEqual(fetched["pending_revision"]["target_regions"], ["Hubballi"])
        self.assertEqual([r["revision"] for r in fetched["revisions"]], [2, 1])


if __name__ == "__main__":
    unittest.main()
