"""Build VISTRAH's simplified marketplace files from shared/business-types.json.

Outputs (all deterministic, safe to re-run):
  shared/legacy/marketplace-taxonomy-v1.json  frozen copy of the original 14/126/749 taxonomy
  shared/marketplace-taxonomy.json            v2: 13 categories -> business types (one listing type each)
  shared/marketplace-imagery.json             adds photo items for every new category/type id
  shared/marketplace-legacy-map.json          old category/subcategory/catalogue slugs -> new slugs

Usage: python scripts/build-business-types.py [--check]
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "shared"
SOURCE = SHARED / "business-types.json"
TAXONOMY = SHARED / "marketplace-taxonomy.json"
LEGACY_TAXONOMY = SHARED / "legacy" / "marketplace-taxonomy-v1.json"
IMAGERY = SHARED / "marketplace-imagery.json"
LEGACY_MAP = SHARED / "marketplace-legacy-map.json"
CATALOGUE = SHARED / "catalogue.json"

# Old customer categories -> default new category for links that only carry a category.
LEGACY_CATEGORY_DEFAULTS = {
    "food-and-dining": "food-and-dining",
    "home-and-everyday-services": "home-services",
    "shopping-and-local-retail": "shops-and-retail",
    "beauty-fashion-and-lifestyle": "beauty-and-personal-care",
    "automobiles": "vehicles",
    "rental-services": "rentals",
    "travel-stay-and-experiences": "travel-and-stay",
    "health-fitness-and-wellness": "health-and-fitness",
    "education-and-skills": "education-and-training",
    "jobs-and-careers": "professional-and-business-services",
    "professional-services": "professional-and-business-services",
    "events-and-celebrations": "events-and-celebrations",
    "pet-care": "home-services",
    "agriculture-and-farming": "agriculture-and-farming",
}
# Legacy onboarding categories that stay as-is (Find Jobs feature is not a business type).
RETAINED_CATALOGUE_CATEGORIES = {"jobs-careers"}
MAX_KEYWORDS = 60


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> str:
    if path == TAXONOMY:
        return json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def legacy_catalogue_index():
    index: dict[str, str] = {}
    for cat in load(CATALOGUE):
        for svc in cat["services"]:
            index[f"{cat['slug']}/{svc['slug']}"] = svc["title"]
        for sub in cat["subcategories"]:
            for svc in sub["services"]:
                index[f"{cat['slug']}/{sub['slug']}/{svc['slug']}"] = svc["title"]
    return index


def build():
    source = load(SOURCE)
    if not LEGACY_TAXONOMY.exists():
        current = load(TAXONOMY)
        if current.get("version") != 1:
            raise SystemExit("Legacy taxonomy snapshot missing and current taxonomy is not v1.")
        LEGACY_TAXONOMY.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(TAXONOMY, LEGACY_TAXONOMY)
    legacy = load(LEGACY_TAXONOMY)
    imagery = load(IMAGERY)
    catalogue_titles = legacy_catalogue_index()

    legacy_subs = {}
    for cat in legacy["categories"]:
        for sub in cat["subcategories"]:
            legacy_subs[sub["slug"]] = (cat, sub)

    errors: list[str] = []
    seen_cat: set[str] = set()
    seen_type: set[str] = set()
    sub_map: dict[str, list[str]] = {}
    svc_map: dict[str, list[str]] = {}
    categories_out = []
    items = imagery["items"]
    regulations = source["regulations"]

    for c_index, cat in enumerate(source["categories"], start=1):
        if cat["slug"] in seen_cat:
            errors.append(f"duplicate category {cat['slug']}")
        seen_cat.add(cat["slug"])
        cat_photo_item = items.get(cat["photo_from"])
        if not cat_photo_item:
            errors.append(f"category photo source missing: {cat['photo_from']}")
            cat_photo = None
        else:
            cat_photo = cat_photo_item["photo"]
        items[f"category/{cat['slug']}"] = {"photo": cat_photo, "subject": cat["title"]}

        subs_out = []
        for t_index, bt in enumerate(cat["types"], start=1):
            slug = bt["slug"]
            if slug in seen_type:
                errors.append(f"duplicate business type {slug}")
            seen_type.add(slug)
            if bt.get("regulated") and bt["regulated"] not in regulations:
                errors.append(f"unknown regulation {bt['regulated']} on {slug}")

            keywords: list[str] = []
            photo = None
            for old_sub in bt.get("legacy_subcategories", []):
                if old_sub not in legacy_subs:
                    errors.append(f"{slug}: unknown legacy subcategory {old_sub}")
                    continue
                if old_sub in sub_map:
                    errors.append(f"legacy subcategory {old_sub} mapped twice")
                sub_map[old_sub] = [cat["slug"], slug]
                old_cat, old = legacy_subs[old_sub]
                keywords.append(old["title"])
                keywords.extend(t["title"] for t in old["listing_types"])
                if photo is None:
                    entry = items.get(f"subcategory/{old_cat['slug']}/{old_sub}")
                    photo = entry["photo"] if entry else None
            for old_svc in bt.get("legacy_services", []):
                if old_svc not in catalogue_titles:
                    errors.append(f"{slug}: unknown legacy catalogue service {old_svc}")
                    continue
                if old_svc in svc_map:
                    errors.append(f"legacy catalogue service {old_svc} mapped twice")
                svc_map[old_svc] = [cat["slug"], slug]
                keywords.append(catalogue_titles[old_svc])
            if photo is None and bt.get("photo_hint"):
                hint = bt["photo_hint"].lower()
                for key, value in items.items():
                    if key.startswith("type/") and hint in str(value.get("subject", "")).lower() and value.get("photo"):
                        photo = value["photo"]
                        break
            if photo is None:
                photo = cat_photo

            unique: list[str] = []
            lowered = {bt["title"].lower()}
            for word in keywords:
                if word and word.lower() not in lowered:
                    lowered.add(word.lower())
                    unique.append(word)
            sub_entry = {
                "slug": slug,
                "title": bt["title"],
                "order": t_index,
                "description": bt["description"],
                "keywords": unique[:MAX_KEYWORDS],
                "listing_types": [{"slug": slug, "title": bt["title"]}],
            }
            if bt.get("regulated"):
                sub_entry["regulated"] = bt["regulated"]
            subs_out.append(sub_entry)
            items[f"subcategory/{cat['slug']}/{slug}"] = {"photo": photo, "subject": bt["title"]}
            items[f"type/{cat['slug']}/{slug}/{slug}"] = {"photo": photo, "subject": bt["title"]}

        categories_out.append({
            "slug": cat["slug"],
            "title": cat["title"],
            "order": c_index,
            "description": cat["description"],
            "subcategories": subs_out,
        })

    missing_subs = sorted(set(legacy_subs) - set(sub_map))
    if missing_subs:
        errors.append("unmapped legacy subcategories: " + ", ".join(missing_subs))
    missing_svcs = sorted(k for k in catalogue_titles if k.split("/")[0] not in RETAINED_CATALOGUE_CATEGORIES and k not in svc_map)
    if missing_svcs:
        errors.append("unmapped legacy catalogue services: " + ", ".join(missing_svcs))
    for old_cat in (c["slug"] for c in legacy["categories"]):
        if LEGACY_CATEGORY_DEFAULTS.get(old_cat) not in seen_cat:
            errors.append(f"legacy category {old_cat} has no valid default")
    if errors:
        raise SystemExit("business-types.json validation failed:\n  " + "\n  ".join(errors))

    taxonomy = {"version": 2, "categories": categories_out}
    legacy_map = {
        "version": 1,
        "note": "Generated by scripts/build-business-types.py. Maps v1 marketplace and onboarding slugs to v2 business types.",
        "categories": LEGACY_CATEGORY_DEFAULTS,
        "subcategories": dict(sorted(sub_map.items())),
        "catalogue_services": dict(sorted(svc_map.items())),
        "retained_catalogue_categories": sorted(RETAINED_CATALOGUE_CATEGORIES),
    }
    return {TAXONOMY: dump(TAXONOMY, taxonomy), IMAGERY: dump(IMAGERY, imagery), LEGACY_MAP: dump(LEGACY_MAP, legacy_map)}


def main():
    outputs = build()
    check = "--check" in sys.argv
    stale = []
    for path, text in outputs.items():
        current = path.read_text(encoding="utf-8") if path.exists() else ""
        if current != text:
            stale.append(path.relative_to(ROOT).as_posix())
            if not check:
                path.write_text(text, encoding="utf-8")
    taxonomy = json.loads(outputs[TAXONOMY])
    types = sum(len(c["subcategories"]) for c in taxonomy["categories"])
    print(f"categories={len(taxonomy['categories'])} business_types={types}")
    if check and stale:
        raise SystemExit("Generated files are stale: " + ", ".join(stale))
    print("updated: " + (", ".join(stale) if stale else "none"))


if __name__ == "__main__":
    main()
