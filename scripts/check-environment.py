"""Read-only environment checks. Never connect to a database or print secrets."""
import argparse
import ipaddress
import os
from pathlib import Path
import re
from urllib.parse import urlsplit

DEFAULTS = {
    'POSTGRES_USER': 'vistrah', 'POSTGRES_DB': 'vistrah',
    'POSTGRES_PASSWORD': 'vistrah-local-only',
    'WEB_PORT': '3000', 'API_PORT': '8000', 'ADMIN_PORT': '3200',
    'APP_ENV': 'development', 'COOKIE_SECURE': 'false',
    'SEED_CATALOGUE': 'true', 'JWT_SECRET': '',
}
BOUNDARY_KEYS = {'COMPOSE_PROJECT_NAME', 'PUBLIC_API_URL', 'V_ADS_PRIVATE_VOLUME',
                 'PRODUCTION_DB_VOLUME', 'PRODUCTION_API_VOLUME',
                 'PRODUCTION_API_IMAGE', 'PRODUCTION_WORKER_IMAGE',
                 'PRODUCTION_WEB_IMAGE', 'PRODUCTION_ADMIN_IMAGE'}
OVERRIDES = set(DEFAULTS) | BOUNDARY_KEYS | {'PUBLIC_APP_URL', 'ALLOWED_ORIGINS', 'ADMIN_ALLOWED_ORIGINS'}
TEST_HOSTS = {'vistrah.in', 'www.vistrah.in', 'api.vistrah.in', 'admin.vistrah.in'}

def read_env(path):
    values = {}
    for number, raw in enumerate(Path(path).read_text(encoding='utf-8-sig').splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line = line[7:]
        key, separator, value = line.partition('=')
        key = key.strip()
        if not separator or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', key):
            raise ValueError(f'Invalid environment syntax on line {number}.')
        value = value.strip()
        if value[:1] in ('"', "'"):
            quote = value[0]
            end = value.find(quote, 1)
            if end < 0 or (value[end + 1:].strip() and not value[end + 1:].strip().startswith('#')):
                raise ValueError(f'Invalid quoted value on line {number}.')
            value = value[1:end]
        else:
            value = re.split(r'\s+#', value, maxsplit=1)[0].strip()
        values[key] = value
    return values

def public_https(value, origin=False):
    try:
        url = urlsplit(value)
        _ = url.port
        host = (url.hostname or '').lower()
        try:
            if not ipaddress.ip_address(host).is_global:
                return False
        except ValueError:
            if '.' not in host or host.endswith(('.local', '.localhost', '.internal', '.invalid', '.example')):
                return False
        return bool(url.scheme == 'https' and url.hostname
                    and url.hostname not in {'localhost', '127.0.0.1', '0.0.0.0', '::1'}
                    and not url.username and not url.password and not url.query and not url.fragment
                    and '*' not in value and (not origin or url.path in ('', '/')))
    except ValueError:
        return False

def validate(values, mode, project=None):
    env = {**DEFAULTS, **values}
    errors = []
    ports = []
    for key in ('WEB_PORT', 'API_PORT', 'ADMIN_PORT'):
        try:
            port = int(env[key])
            if not 1 <= port <= 65535:
                raise ValueError
            ports.append(port)
        except (ValueError, TypeError):
            errors.append(f'{key} must be a valid TCP port.')
    if len(set(ports)) != len(ports):
        errors.append('WEB_PORT, API_PORT and ADMIN_PORT must be different.')
    if not re.fullmatch(r'[A-Za-z0-9_]+', env['POSTGRES_USER']):
        errors.append('POSTGRES_USER must contain only letters, numbers or underscores.')
    if not re.fullmatch(r'[A-Za-z0-9_]+', env['POSTGRES_DB']):
        errors.append('POSTGRES_DB must contain only letters, numbers or underscores.')
    if env['APP_ENV'] != ('production' if mode == 'production' else 'development'):
        errors.append('APP_ENV does not match the selected validation mode.')
    if mode == 'test':
        if not env['POSTGRES_DB'].endswith('_test'):
            errors.append('Test POSTGRES_DB must end with _test.')
        if not project or not project.endswith('-test'):
            errors.append('Test Compose project must end with -test; never use the normal project.')
        if env['WEB_PORT'] == '3100' or env['API_PORT'] == '8100' or env['ADMIN_PORT'] == '3200':
            errors.append('Test ports must differ from the documented normal local ports.')
    if mode in ('production', 'aws-test'):
        password = env['POSTGRES_PASSWORD']
        if (len(password) < 16 or not re.fullmatch(r'[A-Za-z0-9._~-]+', password)
                or any(word in password.lower() for word in ('local-only', 'test-only', 'changeme'))):
            errors.append('POSTGRES_PASSWORD needs a non-placeholder URL-safe value of at least 16 characters.')
        secret = env['JWT_SECRET']
        if len(secret) < 32 or '${' in secret or 'changeme' in secret.lower():
            errors.append('JWT_SECRET needs a non-placeholder value of at least 32 characters.')
        if env['COOKIE_SECURE'] != 'true':
            errors.append('COOKIE_SECURE must be true for production.')
        if env['SEED_CATALOGUE'] != 'false':
            errors.append('SEED_CATALOGUE must be false for controlled production startup.')
        if not public_https(env.get('PUBLIC_APP_URL', '')):
            errors.append('PUBLIC_APP_URL must be a credential-free public HTTPS URL.')
        for key in ('ALLOWED_ORIGINS', 'ADMIN_ALLOWED_ORIGINS'):
            origins = env.get(key, '').split(',')
            if not all(public_https(value.strip(), origin=True) for value in origins):
                errors.append(f'{key} must list exact public HTTPS origins without wildcards.')
        if not public_https(env.get('PUBLIC_API_URL', ''), origin=True):
            errors.append('PUBLIC_API_URL must be an explicit public HTTPS origin.')
        prefix = 'vistrah-production-' if mode == 'production' else 'vistrah-test-'
        if not re.fullmatch(prefix + r'[a-z0-9][a-z0-9_-]*', env.get('V_ADS_PRIVATE_VOLUME', '')):
            errors.append('V_ADS_PRIVATE_VOLUME must use the selected environment prefix.')
    if mode == 'aws-test':
        expected = {'PUBLIC_APP_URL':'https://vistrah.in', 'PUBLIC_API_URL':'https://api.vistrah.in',
                    'ALLOWED_ORIGINS':'https://vistrah.in', 'ADMIN_ALLOWED_ORIGINS':'https://admin.vistrah.in'}
        if any(env.get(key) != value for key, value in expected.items()):
            errors.append('AWS test origins must match the reviewed test configuration.')
        if (project or env.get('COMPOSE_PROJECT_NAME')) != 'vistrah-cloud':
            errors.append('AWS test uses the existing vistrah-cloud project, never production.')
    if mode == 'production':
        if (project or env.get('COMPOSE_PROJECT_NAME')) != 'vistrah-production':
            errors.append('Production requires the separate vistrah-production Compose project.')
        if not env['POSTGRES_DB'].endswith('_production'):
            errors.append('Production POSTGRES_DB must end with _production.')
        for key in ('PRODUCTION_DB_VOLUME', 'PRODUCTION_API_VOLUME'):
            if not re.fullmatch(r'vistrah-production-[a-z0-9][a-z0-9_-]*', env.get(key, '')):
                errors.append(f'{key} must name a separate production volume.')
        volumes = [env.get(key) for key in ('PRODUCTION_DB_VOLUME', 'PRODUCTION_API_VOLUME', 'V_ADS_PRIVATE_VOLUME')]
        if len(set(volumes)) != 3:
            errors.append('Production database, API state and media volumes must be distinct.')
        for key in ('PRODUCTION_API_IMAGE', 'PRODUCTION_WORKER_IMAGE', 'PRODUCTION_WEB_IMAGE', 'PRODUCTION_ADMIN_IMAGE'):
            if not re.fullmatch(r'(?:[^\s]+@)?sha256:[0-9a-f]{64}', env.get(key, '')):
                errors.append(f'{key} must use an immutable SHA-256 image reference.')
        for key in ('PUBLIC_APP_URL', 'PUBLIC_API_URL', 'ALLOWED_ORIGINS', 'ADMIN_ALLOWED_ORIGINS'):
            if any(public_https(value.strip()) and (urlsplit(value.strip()).hostname or '').lower() in TEST_HOSTS
                   for value in env.get(key, '').split(',')):
                errors.append(f'{key} must not use an AWS test hostname in production.')
    return errors

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', required=True)
    parser.add_argument('--mode', choices=['development', 'test', 'aws-test', 'production'], required=True)
    parser.add_argument('--compose-project', help='Required for test-mode isolation checks.')
    args = parser.parse_args()
    try:
        values = read_env(args.env_file)
        values.update({key: os.environ[key] for key in OVERRIDES if key in os.environ})
        errors = validate(values, args.mode, args.compose_project)
    except (OSError, ValueError):
        print('Environment file is missing, unreadable or has invalid syntax. No values were printed.')
        return 1
    if errors:
        for error in errors:
            print('FAIL: ' + error)
        return 1
    print(f'Environment value checks passed ({args.mode}).')
    print('This does not certify application readiness, live payments, DNS or deployment health.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
