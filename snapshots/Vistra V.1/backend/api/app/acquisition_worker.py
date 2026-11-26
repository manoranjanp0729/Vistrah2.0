import csv
import hashlib
import io
import json
import os

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import text
from sqlalchemy.orm import Session


TIMEOUT = 30
USER_AGENT = "VISTRAH-Acquisition/1.0 (+public-data-collector)"


def clean(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value).strip()


def sha256(value):
    return hashlib.sha256(
        value.encode("utf-8", errors="ignore")
    ).hexdigest()


def pick(data, *names):
    lowered = {
        str(k).strip().lower(): v
        for k, v in data.items()
    }

    for name in names:
        value = lowered.get(name.lower())
        if clean(value):
            return clean(value)

    return ""


def normalize_record(item, source_url):
    if not isinstance(item, dict):
        return None

    name = pick(
        item,
        "company_name",
        "company name",
        "name",
        "organisation",
        "organization",
        "provider_name",
        "firm_name",
        "legal_name",
        "entity_name",
    )

    if not name:
        return None

    external_id = pick(
        item,
        "cin",
        "company_id",
        "registration_number",
        "external_id",
        "id",
    )

    record_url = pick(
        item,
        "record_url",
        "record url",
        "detail_url",
        "profile_url",
        "page_url",
        "detail_page",
    )

    return {
        "external_id": external_id or sha256(name),
        "source_url": source_url,
        "record_url": record_url or source_url,
        "raw_data": dict(item),
        "extracted_data": {
            "provider_name": name,
            "phone": pick(
                item,
                "phone",
                "mobile",
                "telephone",
                "contact_number",
            ),
            "email": pick(
                item,
                "email",
                "email_id",
                "email address",
            ),
            "website": pick(
                item,
                "website",
                "web_site",
                "website_url",
            ),
            "address": pick(
                item,
                "registered_office",
                "registered office",
                "address",
                "registered_address",
                "office_address",
            ),
            "city": pick(
                item,
                "city",
                "district",
                "registered_city",
            ),
            "state": pick(
                item,
                "state",
                "registered_state",
            ),
            "description": pick(
                item,
                "business_activity",
                "business activity",
                "activity",
                "description",
                "nature_of_business",
                "industry",
            ),
        },
    }


def parse_response(response):
    body = response.text
    content_type = response.headers.get(
        "content-type",
        "",
    ).lower()

    if "json" in content_type or body.lstrip().startswith(("{", "[")):
        try:
            data = response.json()
        except Exception:
            data = None

        if isinstance(data, list):
            return data

        if isinstance(data, dict):
            for key in (
                "records",
                "data",
                "results",
                "items",
                "rows",
            ):
                if isinstance(data.get(key), list):
                    return data[key]

            return [data]

    if "csv" in content_type:
        try:
            return list(
                csv.DictReader(
                    io.StringIO(body)
                )
            )
        except Exception:
            return []

    soup = BeautifulSoup(
        body,
        "html.parser",
    )

    records = []

    for script in soup.find_all(
        "script",
        type="application/ld+json",
    ):
        try:
            data = json.loads(
                script.string
                or script.get_text()
            )
        except Exception:
            continue

        values = (
            data
            if isinstance(data, list)
            else [data]
        )

        expanded = []

        for value in values:
            if (
                isinstance(value, dict)
                and isinstance(
                    value.get("@graph"),
                    list,
                )
            ):
                expanded.extend(
                    value["@graph"]
                )
            else:
                expanded.append(value)

        for value in expanded:
            if isinstance(value, dict):
                if value.get("name"):
                    records.append(value)

    return records


def acquire_source(
    db: Session,
    source_id: str,
    job_id: str,
):
    source = db.execute(
        text(
            """
            SELECT *
            FROM data_sources
            WHERE id=:id
            """
        ),
        {"id": source_id},
    ).mappings().first()

    if not source:
        raise RuntimeError(
            "Data source not found"
        )

    source_name = source["name"]
    source_url = source["base_url"]

    if not source_url:
        raise RuntimeError(
            "Data source has no base_url"
        )

    db.execute(
        text(
            """
            UPDATE acquisition_jobs
            SET status='RUNNING',
                started_at=NOW(),
                error_message=NULL
            WHERE id=:id
            """
        ),
        {"id": job_id},
    )
    db.commit()

    try:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": (
                "application/json,"
                "text/csv,"
                "text/html;q=0.9,"
                "*/*;q=0.8"
            ),
        }

        api_key = os.getenv(
            "OGD_API_KEY"
        )

        if (
            api_key
            and "data.gov.in" in source_url
        ):
            headers["api-key"] = api_key

        with httpx.Client(
            timeout=TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(
                source_url
            )
            response.raise_for_status()

        final_source_url = str(
            response.url
        )

        candidates = parse_response(
            response
        )

        found = len(candidates)
        created = 0
        updated = 0
        failed = 0

        for item in candidates:
            try:
                record = normalize_record(
                    item,
                    final_source_url,
                )

                if not record:
                    continue

                extracted = record[
                    "extracted_data"
                ]

                location = " ".join(
                    [
                        extracted.get(
                            "city",
                            "",
                        ),
                        extracted.get(
                            "state",
                            "",
                        ),
                        extracted.get(
                            "address",
                            "",
                        ),
                    ]
                ).lower()

                if location and not any(
                    value in location
                    for value in (
                        "karnataka",
                        "bengaluru",
                        "bangalore",
                    )
                ):
                    continue

                raw_json = json.dumps(
                    record["raw_data"],
                    sort_keys=True,
                    ensure_ascii=False,
                )

                content_hash = sha256(
                    raw_json
                )

                existing = db.execute(
                    text(
                        """
                        SELECT id
                        FROM source_records
                        WHERE data_source_id=:source_id
                          AND content_hash=:content_hash
                        LIMIT 1
                        """
                    ),
                    {
                        "source_id": source_id,
                        "content_hash": content_hash,
                    },
                ).first()

                # Existing source evidence remains untouched.
                if existing:
                    updated += 1
                    continue

                source_record = db.execute(
                    text(
                        """
                        INSERT INTO source_records
                        (
                            data_source_id,
                            acquisition_job_id,
                            external_id,
                            source_name,
                            source_url,
                            record_url,
                            raw_data,
                            extracted_data,
                            content_hash,
                            status
                        )
                        VALUES
                        (
                            :source_id,
                            :job_id,
                            :external_id,
                            :source_name,
                            :source_url,
                            :record_url,
                            CAST(:raw_data AS JSONB),
                            CAST(:extracted_data AS JSONB),
                            :content_hash,
                            'STAGED'
                        )
                        RETURNING id
                        """
                    ),
                    {
                        "source_id": source_id,
                        "job_id": job_id,
                        "external_id": record[
                            "external_id"
                        ],
                        "source_name": source_name,
                        "source_url": record[
                            "source_url"
                        ],
                        "record_url": record[
                            "record_url"
                        ],
                        "raw_data": raw_json,
                        "extracted_data": json.dumps(
                            extracted,
                            ensure_ascii=False,
                        ),
                        "content_hash": content_hash,
                    },
                ).first()

                provider = db.execute(
                    text(
                        """
                        SELECT id
                        FROM providers
                        WHERE lower(name)=lower(:name)
                        LIMIT 1
                        """
                    ),
                    {
                        "name": extracted[
                            "provider_name"
                        ]
                    },
                ).first()

                if provider:
                    provider_id = provider[0]

                    db.execute(
                        text(
                            """
                            UPDATE providers
                            SET phone=COALESCE(
                                    NULLIF(:phone,''),
                                    phone
                                ),
                                email=COALESCE(
                                    NULLIF(:email,''),
                                    email
                                ),
                                website=COALESCE(
                                    NULLIF(:website,''),
                                    website
                                ),
                                address=COALESCE(
                                    NULLIF(:address,''),
                                    address
                                ),
                                city=COALESCE(
                                    NULLIF(:city,''),
                                    city
                                ),
                                state=COALESCE(
                                    NULLIF(:state,''),
                                    state
                                ),
                                description=COALESCE(
                                    NULLIF(:description,''),
                                    description
                                ),
                                source_record_id=:source_record_id,
                                updated_at=NOW()
                            WHERE id=:id
                            """
                        ),
                        {
                            "id": provider_id,
                            "phone": extracted.get(
                                "phone",
                                "",
                            ),
                            "email": extracted.get(
                                "email",
                                "",
                            ),
                            "website": extracted.get(
                                "website",
                                "",
                            ),
                            "address": extracted.get(
                                "address",
                                "",
                            ),
                            "city": extracted.get(
                                "city",
                                "",
                            ),
                            "state": extracted.get(
                                "state",
                                "",
                            ),
                            "description": extracted.get(
                                "description",
                                "",
                            ),
                            "source_record_id": source_record[
                                0
                            ],
                        },
                    )
                else:
                    provider_id = db.execute(
                        text(
                            """
                            INSERT INTO providers
                            (
                                name,
                                provider_type,
                                description,
                                phone,
                                email,
                                website,
                                address,
                                city,
                                state,
                                country,
                                source_record_id,
                                status,
                                verified
                            )
                            VALUES
                            (
                                :name,
                                'COMPANY',
                                :description,
                                :phone,
                                :email,
                                :website,
                                :address,
                                :city,
                                :state,
                                'India',
                                :source_record_id,
                                'PENDING',
                                FALSE
                            )
                            RETURNING id
                            """
                        ),
                        {
                            "name": extracted[
                                "provider_name"
                            ],
                            "description": extracted.get(
                                "description",
                                "",
                            ),
                            "phone": extracted.get(
                                "phone",
                                "",
                            ),
                            "email": extracted.get(
                                "email",
                                "",
                            ),
                            "website": extracted.get(
                                "website",
                                "",
                            ),
                            "address": extracted.get(
                                "address",
                                "",
                            ),
                            "city": extracted.get(
                                "city",
                                "",
                            ),
                            "state": extracted.get(
                                "state",
                                "",
                            ),
                            "source_record_id": source_record[
                                0
                            ],
                        },
                    ).first()[0]

                db.execute(
                    text(
                        """
                        INSERT INTO review_queue
                        (
                            source_record_id,
                            provider_id,
                            review_type,
                            status
                        )
                        SELECT
                            :source_record_id,
                            :provider_id,
                            'NEW_PROVIDER',
                            'PENDING'
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM review_queue
                            WHERE source_record_id=:source_record_id
                              AND review_type='NEW_PROVIDER'
                        )
                        """
                    ),
                    {
                        "source_record_id": source_record[
                            0
                        ],
                        "provider_id": provider_id,
                    },
                )

                created += 1

            except Exception:
                failed += 1

        db.execute(
            text(
                """
                UPDATE acquisition_jobs
                SET status='COMPLETED',
                    completed_at=NOW(),
                    records_found=:found,
                    records_created=:created,
                    records_updated=:updated,
                    records_failed=:failed
                WHERE id=:job_id
                """
            ),
            {
                "job_id": job_id,
                "found": found,
                "created": created,
                "updated": updated,
                "failed": failed,
            },
        )

        db.execute(
            text(
                """
                UPDATE data_sources
                SET last_run_at=NOW(),
                    updated_at=NOW()
                WHERE id=:source_id
                """
            ),
            {"source_id": source_id},
        )

        db.commit()

        return {
            "found": found,
            "created": created,
            "updated": updated,
            "failed": failed,
        }

    except Exception as exc:
        db.rollback()

        db.execute(
            text(
                """
                UPDATE acquisition_jobs
                SET status='FAILED',
                    completed_at=NOW(),
                    error_message=:error
                WHERE id=:job_id
                """
            ),
            {
                "job_id": job_id,
                "error": str(exc)[:2000],
            },
        )

        db.commit()
        raise
