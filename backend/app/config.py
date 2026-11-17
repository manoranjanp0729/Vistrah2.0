import os
import secrets
from pathlib import Path

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./vistrah.db')
_is_prod = (
    os.getenv('ENVIRONMENT', '').strip().lower() == 'production'
    or os.getenv('APP_ENV', '').strip().lower() == 'production'
)
secret = os.getenv('JWT_SECRET', '')
if not secret:
    if _is_prod:
        raise RuntimeError('JWT_SECRET environment variable must be explicitly set in production')
    path = Path(os.getenv('SECRET_FILE', '.runtime-secret'))
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        try:
            with path.open('x') as file:
                file.write(secrets.token_hex(48))
            path.chmod(0o600)
        except FileExistsError:
            pass
    secret = path.read_text().strip()
if len(secret) < 32:
    raise RuntimeError('JWT_SECRET must contain at least 32 characters')
JWT_SECRET = secret
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', secret + ':sandbox-webhook')
CATALOGUE_FILE = Path(os.getenv('CATALOGUE_FILE', str(Path(__file__).resolve().parents[2] / 'shared' / 'catalogue.json')))
# Server-only Google Maps key (Geocoding & Places Essentials). Never expose in responses or client bundles.
GOOGLE_MAPS_SERVER_API_KEY = (
    os.getenv('GOOGLE_MAPS_SERVER_API_KEY', '').strip()
    or os.getenv('GOOGLE_MAPS_GEOCODING_API_KEY', '').strip()
)


def get_google_maps_server_api_key() -> str:
    return (
        os.getenv('GOOGLE_MAPS_SERVER_API_KEY', '').strip()
        or os.getenv('GOOGLE_MAPS_GEOCODING_API_KEY', '').strip()
        or GOOGLE_MAPS_SERVER_API_KEY
    )


def get_gemini_api_key() -> str:
    return (
        os.getenv('GEMINI_API_KEY', '').strip()
        or os.getenv('VISTRAH_GEMINI_API_KEY', '').strip()
    )
