#!/bin/bash
# New configuration is uploaded with .pending suffixes, preserving active files.
set -euo pipefail
cd -- "$(dirname -- "$0")"
umask 077
for file in compose.cloud.yaml.pending Caddyfile.pending .env; do
    [[ -f "$file" ]] || { echo "Missing $file" >&2; exit 1; }
done
sudo docker image inspect vistrah20-phone-web:latest >/dev/null
sudo docker image inspect vistrah20-web:latest >/dev/null
sudo docker compose -f compose.cloud.yaml.pending config --quiet
sudo docker run --rm --entrypoint caddy -v "$PWD/Caddyfile.pending:/etc/caddy/Caddyfile:ro" caddy:2.10.2-alpine validate --config /etc/caddy/Caddyfile
backup="before-phone-$(date -u +%Y%m%d-%H%M%S)"
mkdir "$backup"
cp compose.cloud.yaml Caddyfile "$backup/"
old_phone=''
rollback_tag="vistrah20-phone-web:rollback-$(basename "$backup")"
web_rollback_tag="vistrah20-web:rollback-$(basename "$backup")"
old_web=$(sudo docker inspect vistrah-cloud-web-1 --format '{{.Image}}')
sudo docker image tag "$old_web" "$web_rollback_tag"
if sudo docker inspect vistrah-cloud-phone-web-1 >/dev/null 2>&1; then
    old_phone=$(sudo docker inspect vistrah-cloud-phone-web-1 --format '{{.Image}}')
    sudo docker image tag "$old_phone" "$rollback_tag"
fi
restore_configuration(){
    cp "$backup/compose.cloud.yaml" compose.cloud.yaml
    cp "$backup/Caddyfile" Caddyfile
    sudo docker image tag "$web_rollback_tag" vistrah20-web:latest
    sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait web
    if [[ -n "$old_phone" ]]; then
        sudo docker image tag "$rollback_tag" vistrah20-phone-web:latest
        sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait phone-web
    fi
    sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps proxy
    sudo docker compose -f compose.cloud.yaml exec -T proxy caddy reload --config /etc/caddy/Caddyfile
    echo "Activation failed; previous proxy configuration restored from $backup." >&2
}
cp compose.cloud.yaml.pending compose.cloud.yaml
cp Caddyfile.pending Caddyfile
if ! sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait --wait-timeout 90 web; then
    restore_configuration
    exit 1
fi
if ! sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait --wait-timeout 90 phone-web; then
    restore_configuration
    exit 1
fi
if ! sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps proxy; then
    restore_configuration
    exit 1
fi
if ! sudo docker compose -f compose.cloud.yaml exec -T proxy caddy reload --config /etc/caddy/Caddyfile; then
    restore_configuration
    exit 1
fi
if ! curl --fail --silent --show-error --max-time 20 https://vistrah.in/app/ >/dev/null; then
    restore_configuration
    exit 1
fi
sudo docker compose --ansi never -f compose.cloud.yaml ps
echo "Phone website activated. Previous configuration retained in $backup."
