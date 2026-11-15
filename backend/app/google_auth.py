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


async def verify_google_access_token(access_token: str):
    audiences = [value.strip() for value in os.getenv('GOOGLE_CLIENT_ID', '').split(',') if value.strip()]
    if not audiences:
        raise HTTPException(503, 'Google sign-in is not configured. Use email and password.')
    if not access_token:
        raise HTTPException(400, 'A Google ID token is required')
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            token_res = await client.post(
                'https://oauth2.googleapis.com/tokeninfo',
                data={'access_token': access_token},
            )
            if token_res.status_code in (400, 401):
                raise ValueError('Invalid Google access token')
            token_res.raise_for_status()
            token_info = token_res.json()

            aud = token_info.get('aud')
            azp = token_info.get('azp')
            sub = token_info.get('sub')
            exp = int(token_info.get('exp') or 0)
            expires_in = int(token_info.get('expires_in') or 0)
            if aud not in audiences:
                raise ValueError('Untrusted token audience')
            if azp and azp not in audiences:
                raise ValueError('Untrusted token presenter')
            if exp <= int(time.time()) and expires_in <= 0:
                raise ValueError('Expired Google access token')
            if not isinstance(sub, str) or not (1 <= len(sub) <= 255):
                raise ValueError('Invalid token subject')

            user_res = await client.get(
                'https://openidconnect.googleapis.com/v1/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
            )
            if user_res.status_code in (400, 401, 403):
                raise ValueError('Invalid Google userinfo response')
            user_res.raise_for_status()
            user_info = user_res.json()

        if user_info.get('sub') != sub:
            raise ValueError('Mismatched token subject')
        email = user_info.get('email')
        if user_info.get('email_verified') is not True or not isinstance(email, str) or not email.strip():
            raise ValueError('Unverified identity')
        return {
            'sub': sub,
            'email': email,
            'email_verified': True,
            'name': user_info.get('name'),
            'hd': user_info.get('hd'),
        }
    except (httpx.HTTPError, OSError):
        raise HTTPException(503, 'Google sign-in is temporarily unavailable. Use email and password.')
    except (ValueError, KeyError, TypeError):
        raise HTTPException(401, 'Google authentication failed. Please try again.')
