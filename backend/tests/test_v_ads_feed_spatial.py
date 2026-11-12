"""Isolated unittest for public V Ads spatial feed filtering; never touches normal DB."""
import importlib
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
BOOT = tempfile.TemporaryDirectory(prefix="vistrah-feed-spatial-test-")
with patch.dict(
    os.environ,
    {
        "DATABASE_URL": "sqlite:///" + str(Path(BOOT.name) / "unused.db"),
        "JWT_SECRET": "isolated-feed-spatial-secret-not-real-1234567890",
        "APP_ENV": "development",
    },
):
    main_mod = importlib.import_module("app.main")
    feed_mod = importlib.import_module("app.v_ads_routes")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import engine as normal_engine, get_db
from app.models import Audit, AuthSession, User, now
from app.security import issue_token
from app.v_ads_geography import MAX_RADIUS_KM, bounding_box, distance_km
from app.v_ads_models import VAdsAdvertiser, VAdsComment, VAdsLike, VAdsMediaUpload, VAdsVideo
from app.v_ads_targeting_models import VAdsTargeting, VAdsTargetingRevision


@event.listens_for(normal_engine, "connect")
def _forbid_normal_db(*_args):
    raise AssertionError("Normal DB must never be accessed in unit tests")


class VAdsFeedSpatialTests(unittest.TestCase):
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
            VAdsLike.__table__,
            VAdsComment.__table__,
            VAdsTargeting.__table__,
            VAdsTargetingRevision.__table__,
        ):
            table.create(self.engine)

        self.db = Session(self.engine)
        self.addCleanup(self.db.close)

        self.seller = User(
            id=1,
            email="seller@example.test",
            name="Seller Bengaluru",
            password_hash="unused",
            seller_enabled=True,
        )
        self.admin = User(
            id=2,
            email="admin@example.test",
            name="Admin Reviewer",
            password_hash="unused",
            role="ADMIN",
            seller_enabled=False,
        )
        self.db.add_all([self.seller, self.admin])
        self.db.flush()

        self.advertiser = VAdsAdvertiser(
            id="adv-blr",
            owner_id=self.seller.id,
            name="Bengaluru Services",
            handle="blr-services",
            status="APPROVED",
        )
        self.suspended_adv = VAdsAdvertiser(
            id="adv-suspended",
            owner_id=None,
            name="Suspended Studio",
            handle="suspended-studio",
            status="SUSPENDED",
        )
        self.db.add_all([self.advertiser, self.suspended_adv])
        self.db.flush()

        self.base_ts = datetime(2026, 11, 12, 6, 0, tzinfo=timezone.utc)
        self.db.commit()

        self.token_seller = issue_token(self.db, self.seller)
        self.token_admin = issue_token(self.db, self.admin)

        main_mod.app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(main_mod.app.dependency_overrides.clear)
        self.client = TestClient(main_mod.app)
        self.addCleanup(self.client.close)

    def _add_video(
        self,
        vid: str,
        *,
        advertiser_id: str = "adv-blr",
        video_status: str = "APPROVED",
        minutes_offset: int = 0,
        targeting: tuple[float, float, float, str] | None = None,
    ) -> VAdsVideo:
        published = self.base_ts + timedelta(minutes=minutes_offset) if video_status == "APPROVED" else None
        video = VAdsVideo(
            id=vid,
            advertiser_id=advertiser_id,
            title=f"Reel {vid}",
            description="Local service promotion",
            video_url=f"/v-ads/media/{vid}",
            status=video_status,
            published_at=published,
        )
        self.db.add(video)
        self.db.flush()
        if targeting is not None:
            lat, lon, radius_km, rev_status = targeting
            self.db.add(VAdsTargeting(video_id=vid, advertiser_id=advertiser_id))
            self.db.flush()
            reviewed_ts = now() if rev_status != "PENDING" else None
            reviewed_by = self.admin.id if rev_status != "PENDING" else None
            self.db.add(
                VAdsTargetingRevision(
                    video_id=vid,
                    revision=1,
                    latitude=lat,
                    longitude=lon,
                    targeting_radius_km=radius_km,
                    status=rev_status,
                    reviewed_at=reviewed_ts,
                    reviewed_by=reviewed_by,
                )
            )
            self.db.flush()
        return video

    def test_bounding_box_contains_haversine_circle_across_regions_and_poles(self):
        # MG Road Bengaluru 10 km envelope
        min_lat, max_lat, min_lon, max_lon = bounding_box(12.9716, 77.5946, 10.0)
        self.assertLess(min_lat, 12.9716)
        self.assertGreater(max_lat, 12.9716)
        self.assertLess(min_lon, 77.5946)
        self.assertGreater(max_lon, 77.5946)
        # Mysuru lies well outside Bengaluru 10 km bounding box
        self.assertFalse(min_lat <= 12.2958 <= max_lat and min_lon <= 76.6394 <= max_lon)
        # Antimeridian and polar circles fall back to full longitude span safely
        self.assertEqual(bounding_box(0.0, 179.95, 20.0)[2:], (-180.0, 180.0))
        self.assertEqual(bounding_box(89.95, 45.0, 20.0)[2:], (-180.0, 180.0))

    def test_unlocated_feed_preserves_legacy_visibility_and_three_select_budget(self):
        self._add_video("untargeted-1", minutes_offset=1)
        self._add_video("targeted-1", minutes_offset=2, targeting=(12.9716, 77.5946, 5.0, "APPROVED"))
        self.db.commit()

        statements: list[str] = []

        def _count_selects(_conn, _cursor, statement, *_rest):
            if statement.lstrip().upper().startswith("SELECT"):
                statements.append(statement)

        conn = self.db.connection()
        event.listen(conn, "before_cursor_execute", _count_selects)
        try:
            payload = feed_mod.list_reels(page=1, page_size=6, db=self.db)
        finally:
            event.remove(conn, "before_cursor_execute", _count_selects)

        self.assertEqual([item["id"] for item in payload["items"]], ["targeted-1", "untargeted-1"])
        self.assertEqual(len(statements), 3)

    def test_invalid_or_partial_spatial_parameters_fail_with_422(self):
        invalid_queries = [
            "/v-ads/reels?lat=12.9716",
            "/v-ads/reels?lon=77.5946",
            "/v-ads/reels?radius_km=5",
            "/v-ads/reels?local_only=true",
            "/v-ads/reels?lat=91&lon=77.5946",
            "/v-ads/reels?lat=12.9716&lon=181",
            "/v-ads/reels?lat=12.9716&lon=77.5946&radius_km=0",
            "/v-ads/reels?lat=12.9716&lon=77.5946&radius_km=-3",
            f"/v-ads/reels?lat=12.9716&lon=77.5946&radius_km={MAX_RADIUS_KM + 10}",
        ]
        for path in invalid_queries:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 422)

    def test_spatial_filtering_surfaces_in_range_ads_and_excludes_outside_or_unapproved(self):
        # Viewer in MG Road, Bengaluru: (12.9716, 77.5946)
        viewer_lat, viewer_lon = 12.9716, 77.5946

        # 1. Local MG Road ad (~0.7 km away, 5 km target) -> local
        self._add_video(
            "ad-mg-local",
            minutes_offset=1,
            targeting=(12.9760, 77.5990, 5.0, "APPROVED"),
        )
        # 2. Koramangala Bengaluru-wide ad (~5.2 km away, 15 km target) -> farther when radius_km=3
        self._add_video(
            "ad-koramangala-wide",
            minutes_offset=5,
            targeting=(12.9352, 77.6245, 15.0, "APPROVED"),
        )
        # 3. Diagonal corner point: inside 10 km lat/lon box, but ~12.4 km Haversine distance (> 10 km target) -> excluded!
        corner_lat, corner_lon = 13.0500, 77.6750
        box = bounding_box(corner_lat, corner_lon, 10.0)
        self.assertTrue(box[0] <= viewer_lat <= box[1] and box[2] <= viewer_lon <= box[3])
        self.assertGreater(distance_km(viewer_lat, viewer_lon, corner_lat, corner_lon), 10.0)
        self._add_video(
            "ad-box-corner-outside-circle",
            minutes_offset=6,
            targeting=(corner_lat, corner_lon, 10.0, "APPROVED"),
        )
        # 4. Whitefield narrow ad (~16.8 km away, 3 km target) -> excluded even with large viewer radius_km=25
        self._add_video(
            "ad-whitefield-narrow",
            minutes_offset=7,
            targeting=(12.9698, 77.7500, 3.0, "APPROVED"),
        )
        # 5. Mysuru ad (~128 km away, 20 km target) -> excluded in Bengaluru, surfaced in Mysuru
        self._add_video(
            "ad-mysuru",
            minutes_offset=8,
            targeting=(12.2958, 76.6394, 20.0, "APPROVED"),
        )
        # 6. Non-approved revisions / videos / advertisers at 0 km -> excluded
        self._add_video("ad-pending-rev", minutes_offset=9, targeting=(viewer_lat, viewer_lon, 10.0, "PENDING"))
        self._add_video("ad-rejected-rev", minutes_offset=10, targeting=(viewer_lat, viewer_lon, 10.0, "REJECTED"))
        self._add_video("ad-superseded-rev", minutes_offset=11, targeting=(viewer_lat, viewer_lon, 10.0, "SUPERSEDED"))
        self._add_video("ad-pending-video", video_status="PENDING", targeting=(viewer_lat, viewer_lon, 10.0, "APPROVED"))
        self._add_video(
            "ad-suspended-adv",
            advertiser_id="adv-suspended",
            minutes_offset=12,
            targeting=(viewer_lat, viewer_lon, 10.0, "APPROVED"),
        )
        self._add_video("ad-untargeted", minutes_offset=13, targeting=None)
        self.db.commit()

        # Bengaluru query with 3 km local discovery radius: local ad ranks before farther citywide ad
        blr_resp = self.client.get(f"/v-ads/reels?lat={viewer_lat}&lon={viewer_lon}&radius_km=3")
        self.assertEqual(blr_resp.status_code, 200)
        blr_items = blr_resp.json()["items"]
        self.assertEqual([item["id"] for item in blr_items], ["ad-mg-local", "ad-koramangala-wide"])
        self.assertEqual(blr_items[0]["proximity"], "local")
        self.assertLess(blr_items[0]["distance_km"], 3.0)
        self.assertEqual(blr_items[1]["proximity"], "farther")
        self.assertGreater(blr_items[1]["distance_km"], 3.0)

        # Strict local_only=true excludes farther ads outside the 3 km discovery ring
        local_only_resp = self.client.get(
            f"/v-ads/reels?lat={viewer_lat}&lon={viewer_lon}&radius_km=3&local_only=true"
        )
        self.assertEqual(local_only_resp.status_code, 200)
        self.assertEqual([item["id"] for item in local_only_resp.json()["items"]], ["ad-mg-local"])

        # Viewer passing radius_km=25 still cannot expand Whitefield's 3 km campaign
        wide_viewer_resp = self.client.get(f"/v-ads/reels?lat={viewer_lat}&lon={viewer_lon}&radius_km=25")
        self.assertEqual(
            [item["id"] for item in wide_viewer_resp.json()["items"]],
            ["ad-koramangala-wide", "ad-mg-local"],
        )

        # Mysuru viewer (12.3051, 76.6551) receives only the Mysuru campaign
        mys_resp = self.client.get("/v-ads/reels?lat=12.3051&lon=76.6551&radius_km=5")
        self.assertEqual(mys_resp.status_code, 200)
        self.assertEqual([item["id"] for item in mys_resp.json()["items"]], ["ad-mysuru"])
        self.assertEqual(mys_resp.json()["items"][0]["proximity"], "local")

        # Location headers work identically to query params and support pagination
        header_p1 = self.client.get(
            "/v-ads/reels?page=1&page_size=1",
            headers={
                "X-User-Latitude": str(viewer_lat),
                "X-User-Longitude": str(viewer_lon),
                "X-User-Radius-Km": "3",
            },
        ).json()
        header_p2 = self.client.get(
            "/v-ads/reels?page=2&page_size=1",
            headers={
                "X-User-Latitude": str(viewer_lat),
                "X-User-Longitude": str(viewer_lon),
                "X-User-Radius-Km": "3",
            },
        ).json()
        self.assertEqual([item["id"] for item in header_p1["items"]], ["ad-mg-local"])
        self.assertTrue(header_p1["has_more"])
        self.assertEqual([item["id"] for item in header_p2["items"]], ["ad-koramangala-wide"])
        self.assertFalse(header_p2["has_more"])

    def test_end_to_end_seller_submit_admin_approve_and_feed_visibility(self):
        self._add_video("ad-e2e", minutes_offset=1, targeting=None)
        self.db.commit()

        # Submit seller targeting for Indiranagar Bengaluru (12.9784, 77.6408), 8 km radius
        sub = self.client.post(
            "/v-ads/seller/targeting/ad-e2e",
            headers={"Authorization": f"Bearer {self.token_seller}"},
            json={
                "latitude": 12.9784,
                "longitude": 77.6408,
                "radius_km": 8.0,
                "target_regions": ["Bengaluru"],
            },
        )
        self.assertEqual(sub.status_code, 201)

        # Pending targeting is NOT surfaced in spatial feed
        before = self.client.get("/v-ads/reels?lat=12.9716&lon=77.5946&radius_km=10").json()
        self.assertEqual(before["items"], [])

        # Admin approves targeting -> immediately surfaced in Bengaluru spatial feed
        rev = self.client.patch(
            "/v-ads/admin/targeting/ad-e2e/review",
            headers={"Authorization": f"Bearer {self.token_admin}"},
            json={"status": "APPROVED", "reason": "Bengaluru coverage verified"},
        )
        self.assertEqual(rev.status_code, 200)

        after = self.client.get("/v-ads/reels?lat=12.9716&lon=77.5946&radius_km=10").json()
        self.assertEqual([item["id"] for item in after["items"]], ["ad-e2e"])
        self.assertEqual(after["items"][0]["proximity"], "local")


if __name__ == "__main__":
    unittest.main()

