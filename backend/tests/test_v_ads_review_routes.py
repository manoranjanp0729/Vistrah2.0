"""Isolated unittest for admin V Ads targeting review routes; never touches normal DB."""
import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
BOOT = tempfile.TemporaryDirectory(prefix="vistrah-targeting-review-test-")
with patch.dict(
    os.environ,
    {
        "DATABASE_URL": "sqlite:///" + str(Path(BOOT.name) / "unused.db"),
        "JWT_SECRET": "isolated-targeting-review-secret-not-real-1234567890",
        "APP_ENV": "development",
    },
):
    main_mod = importlib.import_module("app.main")
    review_mod = importlib.import_module("app.v_ads_review_routes")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import engine as normal_engine, get_db
from app.models import Audit, AuthSession, User
from app.security import issue_token
from app.v_ads_models import VAdsAdvertiser, VAdsMediaUpload, VAdsVideo
from app.v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision


@event.listens_for(normal_engine, "connect")
def _forbid_normal_db(*_args):
    raise AssertionError("Normal DB must never be accessed in unit tests")


SQLITE_GUARD = (
    "NEW.video_id <> OLD.video_id OR NEW.revision <> OLD.revision OR "
    "NEW.latitude <> OLD.latitude OR NEW.longitude <> OLD.longitude OR "
    "NEW.targeting_radius_km <> OLD.targeting_radius_km OR NEW.created_at <> OLD.created_at OR "
    "(OLD.status <> 'PENDING' AND (NEW.reviewed_at <> OLD.reviewed_at OR NEW.reviewed_by <> OLD.reviewed_by)) OR "
    "(OLD.status = 'PENDING' AND NEW.status = 'SUPERSEDED') OR "
    "(OLD.status = 'APPROVED' AND NEW.status NOT IN ('APPROVED','SUPERSEDED')) OR "
    "(OLD.status IN ('REJECTED','SUPERSEDED') AND NEW.status <> OLD.status)"
)


class VAdsTargetingReviewRoutesTests(unittest.TestCase):
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

        with self.engine.begin() as conn:
            conn.execute(
                text(
                    f"CREATE TRIGGER v_ads_targeting_immutable BEFORE UPDATE ON v_ads_targeting_revisions "
                    f"WHEN {SQLITE_GUARD} BEGIN SELECT RAISE(ABORT, 'Targeting revision is immutable'); END"
                )
            )
            conn.execute(
                text(
                    "CREATE TRIGGER v_ads_targeting_no_delete BEFORE DELETE ON v_ads_targeting_revisions "
                    "BEGIN SELECT RAISE(ABORT, 'Targeting history cannot be deleted'); END"
                )
            )
            conn.execute(
                text(
                    "CREATE TRIGGER v_ads_targeting_pending_insert BEFORE INSERT ON v_ads_targeting_revisions "
                    "WHEN NEW.status <> 'PENDING' BEGIN SELECT RAISE(ABORT, 'Submit pending targeting first'); END"
                )
            )

        self.db = Session(self.engine)
        self.addCleanup(self.db.close)

        self.seller = User(
            id=1,
            email="seller@example.test",
            name="Seller User",
            password_hash="unused",
            seller_enabled=True,
        )
        self.customer = User(
            id=2,
            email="customer@example.test",
            name="Customer User",
            password_hash="unused",
            seller_enabled=False,
        )
        self.admin = User(
            id=3,
            email="admin@example.test",
            name="Admin Reviewer",
            password_hash="unused",
            role="ADMIN",
            seller_enabled=False,
        )
        self.admin_owner = User(
            id=4,
            email="admin-owner@example.test",
            name="Admin Seller Owner",
            password_hash="unused",
            role="ADMIN",
            seller_enabled=True,
        )
        self.db.add_all([self.seller, self.customer, self.admin, self.admin_owner])
        self.db.flush()

        self.adv_seller = VAdsAdvertiser(
            id="adv-seller",
            owner_id=self.seller.id,
            name="Seller Studio",
            handle="seller-studio",
            status="APPROVED",
        )
        self.adv_admin = VAdsAdvertiser(
            id="adv-admin",
            owner_id=self.admin_owner.id,
            name="Admin Studio",
            handle="admin-studio",
            status="APPROVED",
        )
        self.db.add_all([self.adv_seller, self.adv_admin])
        self.db.flush()

        self.video_seller = VAdsVideo(
            id="ad-seller-1",
            advertiser_id=self.adv_seller.id,
            title="Seller Promo",
            description="Promo",
            video_url="/v-ads/media/u1",
            status="APPROVED",
        )
        self.video_admin = VAdsVideo(
            id="ad-admin-1",
            advertiser_id=self.adv_admin.id,
            title="Admin Promo",
            description="Promo",
            video_url="/v-ads/media/u2",
            status="APPROVED",
        )
        self.db.add_all([self.video_seller, self.video_admin])
        self.db.commit()

        self.token_seller = issue_token(self.db, self.seller)
        self.token_customer = issue_token(self.db, self.customer)
        self.token_admin = issue_token(self.db, self.admin)
        self.token_admin_owner = issue_token(self.db, self.admin_owner)

        main_mod.app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(main_mod.app.dependency_overrides.clear)
        self.client = TestClient(main_mod.app)
        self.addCleanup(self.client.close)

    def _headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def _submit_targeting(self, token: str, ad_id: str, radius_km: float = 12.0, regions: list[str] | None = None):
        resp = self.client.post(
            f"/v-ads/seller/targeting/{ad_id}",
            headers=self._headers(token),
            json={
                "latitude": 12.9716,
                "longitude": 77.5946,
                "radius_km": radius_km,
                "target_regions": regions or ["Bengaluru"],
            },
        )
        self.assertEqual(resp.status_code, 201)
        return resp.json()

    def test_main_app_registers_admin_targeting_review_routes(self):
        methods_by_path: dict[str, set[str]] = {}
        for route in main_mod.app.routes:
            if hasattr(route, "path") and hasattr(route, "methods"):
                methods_by_path.setdefault(route.path, set()).update(route.methods or set())
        self.assertIn("/v-ads/admin/targeting/{rule_id}/review", methods_by_path)
        self.assertTrue({"PATCH", "POST"}.issubset(methods_by_path["/v-ads/admin/targeting/{rule_id}/review"]))

    def test_admin_privilege_and_independent_review_guards(self):
        self._submit_targeting(self.token_seller, "ad-seller-1")
        self._submit_targeting(self.token_admin_owner, "ad-admin-1")

        self.assertEqual(
            self.client.patch(
                "/v-ads/admin/targeting/ad-seller-1/review",
                json={"status": "APPROVED"},
            ).status_code,
            401,
        )
        self.assertEqual(
            self.client.patch(
                "/v-ads/admin/targeting/ad-seller-1/review",
                headers=self._headers(self.token_customer),
                json={"status": "APPROVED"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/v-ads/admin/targeting/ad-seller-1/review",
                headers=self._headers(self.token_seller),
                json={"status": "APPROVED"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.patch(
                "/v-ads/admin/targeting/missing-rule/review",
                headers=self._headers(self.token_admin),
                json={"status": "APPROVED"},
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.patch(
                "/v-ads/admin/targeting/ad-admin-1/review",
                headers=self._headers(self.token_admin_owner),
                json={"status": "APPROVED"},
            ).status_code,
            403,
        )

    def test_approval_flow_updates_timestamps_status_and_audit(self):
        self._submit_targeting(self.token_seller, "ad-seller-1", radius_km=15.0, regions=["Bengaluru", "Mysuru"])

        approved = self.client.patch(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"status": "APPROVED", "reason": "Verified service coverage"},
        )
        self.assertEqual(approved.status_code, 200)
        body = approved.json()
        self.assertEqual(body["decision"], "APPROVED")
        self.assertEqual(body["reviewed_revision"], 1)
        self.assertIsNone(body["superseded_revision"])
        self.assertEqual(body["reviewer_id"], 3)
        self.assertIsNone(body["pending_revision"])
        self.assertEqual(body["active_revision"]["revision"], 1)
        self.assertEqual(body["active_revision"]["status"], "APPROVED")
        self.assertEqual(body["active_revision"]["reviewed_by"], 3)
        self.assertIsNotNone(body["active_revision"]["reviewed_at"])
        self.assertEqual(body["active_revision"]["target_regions"], ["Bengaluru", "Mysuru"])

        audits = self.db.scalars(
            select(Audit).where(
                Audit.action == "V_ADS_TARGETING_REVIEW",
                Audit.entity_id == "ad-seller-1",
            )
        ).all()
        self.assertEqual(len(audits), 1)
        self.assertEqual(audits[0].actor_id, 3)
        self.assertEqual(audits[0].details["status"], "APPROVED")
        self.assertEqual(audits[0].details["previous_status"], "PENDING")
        self.assertEqual(audits[0].details["revision"], 1)

        repeat = self.client.patch(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"status": "APPROVED"},
        )
        self.assertEqual(repeat.status_code, 409)

    def test_rejection_requires_reason_and_preserves_active_revision(self):
        self._submit_targeting(self.token_seller, "ad-seller-1", radius_km=10.0)
        self.assertEqual(
            self.client.patch(
                "/v-ads/admin/targeting/ad-seller-1/review",
                headers=self._headers(self.token_admin),
                json={"status": "APPROVED"},
            ).status_code,
            200,
        )

        self._submit_targeting(self.token_seller, "ad-seller-1", radius_km=80.0, regions=["Statewide"])

        for invalid in (
            {"status": "REJECTED"},
            {"decision": "REJECTED", "reason": "    "},
            {"status": "UNKNOWN"},
            {"status": "APPROVED", "expected_revision": True},
        ):
            with self.subTest(invalid=invalid):
                resp = self.client.post(
                    "/v-ads/admin/targeting/ad-seller-1/review",
                    headers=self._headers(self.token_admin),
                    json=invalid,
                )
                self.assertEqual(resp.status_code, 422)

        stale = self.client.post(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"decision": "REJECTED", "reason": "Too wide", "expected_revision": 1},
        )
        self.assertEqual(stale.status_code, 409)

        rejected = self.client.post(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={
                "decision": "REJECTED",
                "reason": "Radius exceeds verified delivery boundary",
                "expected_revision": 2,
            },
        )
        self.assertEqual(rejected.status_code, 200)
        payload = rejected.json()
        self.assertEqual(payload["decision"], "REJECTED")
        self.assertEqual(payload["reviewed_revision"], 2)
        self.assertEqual(payload["review_reason"], "Radius exceeds verified delivery boundary")
        self.assertIsNone(payload["pending_revision"])
        self.assertEqual(payload["active_revision"]["revision"], 1)
        self.assertEqual(payload["active_revision"]["radius_km"], 10.0)
        self.assertEqual(payload["revisions"][0]["revision"], 2)
        self.assertEqual(payload["revisions"][0]["status"], "REJECTED")
        self.assertEqual(payload["revisions"][0]["reviewed_by"], 3)
        self.assertIsNotNone(payload["revisions"][0]["reviewed_at"])

    def test_transactional_supersede_on_replacement_and_explicit_supersede(self):
        self._submit_targeting(self.token_seller, "ad-seller-1", radius_km=8.0)
        first_approval = self.client.patch(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"status": "APPROVED"},
        ).json()
        rev1_reviewed_at = first_approval["active_revision"]["reviewed_at"]

        self._submit_targeting(self.token_seller, "ad-seller-1", radius_km=20.0, regions=["Hubballi"])
        replacement = self.client.patch(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"status": "APPROVED", "reason": "Expanded coverage verified"},
        )
        self.assertEqual(replacement.status_code, 200)
        rep_body = replacement.json()
        self.assertEqual(rep_body["reviewed_revision"], 2)
        self.assertEqual(rep_body["superseded_revision"], 1)
        self.assertEqual(rep_body["active_revision"]["revision"], 2)
        self.assertEqual(rep_body["active_revision"]["radius_km"], 20.0)

        rev_by_num = {r["revision"]: r for r in rep_body["revisions"]}
        self.assertEqual(rev_by_num[1]["status"], "SUPERSEDED")
        self.assertEqual(rev_by_num[1]["reviewed_at"], rev1_reviewed_at)
        self.assertEqual(rev_by_num[1]["reviewed_by"], 3)

        superseded = self.client.patch(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"status": "SUPERSEDED", "reason": "Campaign geography retired"},
        )
        self.assertEqual(superseded.status_code, 200)
        sup_body = superseded.json()
        self.assertEqual(sup_body["decision"], "SUPERSEDED")
        self.assertEqual(sup_body["reviewed_revision"], 2)
        self.assertEqual(sup_body["superseded_revision"], 2)
        self.assertIsNone(sup_body["active_revision"])
        self.assertEqual(sup_body["revisions"][0]["status"], "SUPERSEDED")

        no_active = self.client.patch(
            "/v-ads/admin/targeting/ad-seller-1/review",
            headers=self._headers(self.token_admin),
            json={"status": "SUPERSEDED"},
        )
        self.assertEqual(no_active.status_code, 409)


if __name__ == "__main__":
    unittest.main()

