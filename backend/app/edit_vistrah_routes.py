"""FastAPI routes for Edit Vistrah: pages, sections, variations, and photo management."""
import struct
import io
from email.parser import BytesParser
from email import policy
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from pydantic import BaseModel, Field
from .security import admin_user
from .edit_vistrah_store import edit_vistrah_store

router = APIRouter(tags=['Edit Vistrah CMS'])


class CreatePageInput(BaseModel):
    slug: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    path: str = Field(default='', max_length=100)
    description: str = Field(default='', max_length=500)
    target_platform: str = Field(default='all')


class UpdatePageInput(BaseModel):
    revision: int | None = None
    name: str | None = None
    path: str | None = None
    description: str | None = None
    target_platform: str | None = None
    sections: list[dict[str, Any]] | None = None


def get_image_dimensions(data: bytes) -> tuple[int, int] | None:
    """Detect image width and height from PNG, JPEG, GIF, WEBP header bytes using only stdlib."""
    size = len(data)
    if size < 16:
        return None
    # PNG: Header 8 bytes, IHDR chunk has width and height at offset 16 and 20
    if data.startswith(b'\x89PNG\r\n\x1a\n') and size >= 24:
        w, h = struct.unpack('>LL', data[16:24])
        return int(w), int(h)
    # GIF: GIF87a or GIF89a, width and height at offset 6 and 8 (little-endian unsigned short)
    if data[:6] in (b'GIF87a', b'GIF89a') and size >= 10:
        w, h = struct.unpack('<HH', data[6:10])
        return int(w), int(h)
    # WEBP: RIFF....WEBPVP8
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP' and size >= 30:
        if data[12:16] == b'VP8 ':
            w, h = struct.unpack('<HH', data[26:30])
            return int(w & 0x3fff), int(h & 0x3fff)
        elif data[12:16] == b'VP8L':
            b0, b1, b2, b3 = data[21:25]
            w = 1 + (((b1 & 0x3f) << 8) | b0)
            h = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
            return int(w), int(h)
        elif data[12:16] == b'VP8X' and size >= 30:
            w = struct.unpack('<I', data[24:27] + b'\x00')[0] + 1
            h = struct.unpack('<I', data[27:30] + b'\x00')[0] + 1
            return int(w), int(h)
    # JPEG: Find SOF markers (SOF0 = 0xFFC0, SOF2 = 0xFFC2, etc.)
    if data.startswith(b'\xff\xd8'):
        stream = io.BytesIO(data)
        stream.read(2)
        while True:
            marker = stream.read(2)
            if not marker or len(marker) < 2 or marker[0] != 0xff:
                break
            code = marker[1]
            if code in (0xd9, 0xda): # EOI or SOS
                break
            if code in (0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf):
                stream.read(3) # length + precision
                h, w = struct.unpack('>HH', stream.read(4))
                return int(w), int(h)
            else:
                length_bytes = stream.read(2)
                if len(length_bytes) < 2:
                    break
                length = struct.unpack('>H', length_bytes)[0]
                stream.seek(length - 2, io.SEEK_CUR)
    return None


# ===================== ADMIN ENDPOINTS =====================

@router.get('/admin/edit-vistrah/pages')
def list_pages(_admin: Any = Depends(admin_user)):
    """List all pages available for section and photo configuration."""
    return edit_vistrah_store.list_pages()


@router.get('/admin/edit-vistrah/pages/{slug}')
def get_page_details(slug: str, _admin: Any = Depends(admin_user)):
    """Get full section configuration and running images for a page."""
    page = edit_vistrah_store.get_page(slug)
    if not page:
        raise HTTPException(status_code=404, detail=f'Page "{slug}" not found')
    return page


@router.post('/admin/edit-vistrah/pages')
def create_page(payload: CreatePageInput, _admin: Any = Depends(admin_user)):
    """Add a new page to Vistrah."""
    try:
        return edit_vistrah_store.create_page(
            slug=payload.slug,
            name=payload.name,
            path=payload.path,
            description=payload.description,
            target_platform=payload.target_platform,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put('/admin/edit-vistrah/pages/{slug}')
def update_page(slug: str, payload: UpdatePageInput, _admin: Any = Depends(admin_user)):
    """Update sections, variations, features, and images for a page."""
    try:
        patch = payload.model_dump(exclude_unset=True)
        return edit_vistrah_store.update_page(slug, patch)
    except KeyError:
        raise HTTPException(status_code=404, detail=f'Page "{slug}" not found')
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post('/admin/edit-vistrah/pages/{slug}/publish')
def publish_page(slug: str, payload: dict[str, Any] = Body(default={}), _admin: Any = Depends(admin_user)):
    """Make the page and its section configurations live across Vistrah."""
    try:
        return edit_vistrah_store.publish_page(slug, payload.get("revision"))
    except KeyError:
        raise HTTPException(status_code=404, detail=f'Page "{slug}" not found')
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete('/admin/edit-vistrah/pages/{slug}')
def delete_page(slug: str, _admin: Any = Depends(admin_user)):
    """Delete a custom page."""
    try:
        success = edit_vistrah_store.delete_page(slug)
        if not success:
            raise HTTPException(status_code=404, detail=f'Page "{slug}" not found')
        return {'deleted': True, 'slug': slug}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get('/admin/edit-vistrah/library')
def get_section_library(_admin: Any = Depends(admin_user)):
    """Get the predefined section templates, default variations, and recommended resolutions."""
    return edit_vistrah_store.get_library()


@router.post('/admin/edit-vistrah/inspect-photo')
async def inspect_uploaded_photo(request: Request, _admin: Any = Depends(admin_user)):
    """Analyze uploaded photo bytes and extract real width, height, resolution, and aspect ratio."""
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > 3_000_000:
            raise HTTPException(status_code=413, detail='Photo inspection is limited to 3 MB')
    filename = request.headers.get('x-file-name', 'photo')
    content_type = request.headers.get('content-type', '')
    if content_type.lower().startswith('multipart/form-data'):
        message = BytesParser(policy=policy.default).parsebytes(('Content-Type: ' + content_type + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + bytes(content))
        parts = [part for part in message.walk() if part.get_content_disposition() == 'form-data' and part.get_param('name', header='content-disposition') == 'file']
        if not parts:
            raise HTTPException(status_code=400, detail='Choose an image file')
        filename = parts[0].get_filename() or filename
        content = parts[0].get_payload(decode=True) or b''
    content = bytes(content)
    try:
        dims = get_image_dimensions(content)
    except (ValueError, struct.error, IndexError):
        dims = None
    if not dims or min(dims) <= 0:
        return {
            'filename': filename,
            'size_bytes': len(content),
            'detected': False,
            'resolution': 'Unknown',
            'aspect_ratio': 'Custom',
        }
    w, h = dims
    # Calculate aspect ratio string
    def gcd(a: int, b: int) -> int:
        while b:
            a, b = b, a % b
        return a
    g = gcd(w, h)
    ar_w, ar_h = w // g, h // g
    if ar_w > 50 or ar_h > 50:
        ratio = round(w / h, 2)
        ar_str = f'{ratio}:1'
    else:
        ar_str = f'{ar_w}:{ar_h}'

    return {
        'filename': filename,
        'size_bytes': len(content),
        'detected': True,
        'width': w,
        'height': h,
        'resolution': f'{w} × {h} px',
        'aspect_ratio': ar_str,
    }


# ===================== PUBLIC ENDPOINT =====================

@router.get('/edit-vistrah/pages/{slug}')
def get_public_page_layout(slug: str):
    """Public read of live published page layout for website and mobile."""
    page = edit_vistrah_store.get_live_page(slug)
    if not page:
        raise HTTPException(status_code=404, detail=f'Page "{slug}" is not currently live')
    # Filter only enabled sections
    sections = [s for s in page.get('sections', []) if s.get('enabled', True)]
    return {
        'slug': page['slug'],
        'target_platform': page.get('target_platform', 'all'),
        'name': page['name'],
        'path': page['path'],
        'description': page['description'],
        'published_version': page.get('published_version', 1),
        'published_at': page.get('published_at'),
        'sections': sorted(sections, key=lambda x: x.get('order', 0)),
    }

