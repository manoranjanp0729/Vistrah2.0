import os
import secrets
from pathlib import Path

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./vistrah.db')
secret = os.getenv('JWT_SECRET', '')
if not secret:
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
