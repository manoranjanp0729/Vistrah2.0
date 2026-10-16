"""Download only independently verified public photo URLs; never edits taxonomy or runtime data."""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts/agriculture-photos'

def download(record):
    target = OUTPUT / 'originals' / (record['sourceId'] + '.jpg')
    if target.exists():
        return {'id': record['id'], 'file': str(target.relative_to(ROOT)), 'cached': True}
    try:
        url = record['downloadUrl']
        parts = urlsplit(url)
        if parts.netloc not in ('images.pexels.com', 'cdn.pixabay.com'):
            raise ValueError('Unapproved image host')
        if parts.netloc == 'images.pexels.com':
            query = dict(parse_qsl(parts.query))
            query.update({'auto': 'compress', 'w': '1000'})
            url = urlunsplit(parts._replace(query=urlencode(query)))
        with urlopen(Request(url, headers={'User-Agent': 'Vistrah-Asset-Review/1.0'}), timeout=40) as response:
            if not response.headers.get('Content-Type', '').startswith('image/'):
                raise ValueError('Response was not an image')
            content = response.read(15000000)
        target.write_bytes(content)
        return {'id': record['id'], 'file': str(target.relative_to(ROOT)), 'bytes': len(content), 'downloadUrl': url}
    except Exception as error:
        return {'id': record['id'], 'error': str(error)}

if __name__ == '__main__':
    (OUTPUT / 'originals').mkdir(parents=True, exist_ok=True)
    records = json.loads((OUTPUT / 'verified-downloads.json').read_text(encoding='utf-8'))
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(download, records))
    (OUTPUT / 'download-result.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'downloaded': sum('file' in r for r in results), 'errors': [r for r in results if 'error' in r]}, indent=2))
