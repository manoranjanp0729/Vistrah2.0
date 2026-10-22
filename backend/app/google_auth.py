"""Verify Google-signed identity tokens; never accept client-supplied identities."""
import asyncio
import os
import time
import httpx
import jwt
from fastapi import HTTPException

_keys = None
_expires = 0.0
_lock = asyncio.Lock()

async def verify_google_token(token):
    global _keys, _expires
    audiences = [value.strip() for value in os.getenv('GOOGLE_CLIENT_ID', '').split(',') if value.strip()]
    if not audiences:
        raise HTTPException(503, 'Google sign-in is not configured. Use email and password.')
    if not token:
        raise HTTPException(400, 'A Google ID token is required')
    try:
        header = jwt.get_unverified_header(token)
        if header.get('alg') != 'RS256' or not isinstance(header.get('kid'), str):
            raise ValueError('Unsupported signing key')
        async with _lock:
            if _keys is None or time.monotonic() >= _expires:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
                    response = await client.get('https://www.googleapis.com/oauth2/v3/certs')
                response.raise_for_status()
                _keys = response.json()['keys']
                _expires = time.monotonic() + 300
        key = next((key for key in _keys if key.get('kid') == header['kid']), None)
        if key is None:
            raise ValueError('Unknown signing key')
        claims = jwt.decode(token, jwt.PyJWK.from_dict(key).key, algorithms=['RS256'],
            audience=audiences, issuer=['accounts.google.com', 'https://accounts.google.com'],
            options={'require': ['sub', 'email', 'email_verified', 'exp', 'iat', 'iss', 'aud']})
        if claims.get('azp') and claims['azp'] not in audiences:
            raise ValueError('Untrusted token presenter')
        if claims['email_verified'] is not True or not isinstance(claims['sub'], str) or not 1 <= len(claims['sub']) <= 255:
            raise ValueError('Unverified identity')
        return claims
    except (httpx.HTTPError, OSError):
        raise HTTPException(503, 'Google sign-in is temporarily unavailable. Use email and password.')
    except (jwt.PyJWTError, ValueError, KeyError, TypeError, StopIteration):
        raise HTTPException(401, 'Google authentication failed. Please try again.')
