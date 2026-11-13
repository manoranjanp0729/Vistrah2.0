#!/bin/bash
# Restores only a fresh cloud database. Never overwrites populated databases.
set -euo pipefail
cd -- "$(dirname -- "$0")"
expected_hash=${1:?Pass the verified database.dump SHA256}
[[ "$expected_hash" =~ ^[a-fA-F0-9]{64}$ ]] || { echo 'Invalid hash' >&2; exit 1; }
printf '%s  database.dump\n' "$expected_hash" | sha256sum --check --status
compose=(sudo docker compose -f compose.cloud.yaml)
"${compose[@]}" config --quiet
for service in api worker web admin proxy phone-web; do
    if [[ -n $("${compose[@]}" ps --status running -q "$service") ]]; then
        echo "Restore stopped: $service is running." >&2
        exit 1
    fi
done
"${compose[@]}" up -d --wait --wait-timeout 120 db
count=$("${compose[@]}" exec -T db psql -U vistrah -d vistrah -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
[[ "$count" == '0' ]] || { echo 'Restore stopped: database is not empty.' >&2; exit 1; }
"${compose[@]}" cp database.dump db:/tmp/database.dump
"${compose[@]}" exec -T db pg_restore --list /tmp/database.dump > /tmp/vistrah-cloud-archive-list.txt
"${compose[@]}" exec -T db pg_restore -U vistrah -d vistrah --no-owner --no-acl --single-transaction --exit-on-error /tmp/database.dump
revision=$("${compose[@]}" exec -T db psql -U vistrah -d vistrah -Atc 'SELECT version_num FROM alembic_version;')
[[ "$revision" == '012' ]] || { echo "Unexpected restored revision: $revision" >&2; exit 1; }
"${compose[@]}" exec -T db psql -U vistrah -d vistrah -c 'SELECT version_num FROM alembic_version; SELECT count(*) AS user_accounts FROM users;'
echo 'Database restored at 012. App, worker and proxy remain stopped.'
