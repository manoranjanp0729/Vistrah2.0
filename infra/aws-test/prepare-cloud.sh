#!/bin/bash
# Run from /home/ec2-user/vistrah. Never overwrite existing cloud credentials.
set -euo pipefail
umask 077
if [[ -e .env ]]; then
    echo 'Existing .env retained; preparation stopped.' >&2
    exit 1
fi
password=$(openssl rand -hex 32)
secret=$(openssl rand -hex 48)
set -o noclobber
printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\n' "$password" "$secret" > .env
echo 'Cloud credentials created privately. Do not print or share .env.'
