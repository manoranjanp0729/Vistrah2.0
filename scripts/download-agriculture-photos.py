"""Download only independently verified public photo URLs; never edits taxonomy or runtime data."""
import json
import argparse
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', default='artifacts/agriculture-photos/verified-downloads.json')
    parser.add_argument('--output', default='artifacts/agriculture-photos')
    args = parser.parse_args()
    manifest = (ROOT / args.manifest).resolve()
    OUTPUT = (ROOT / args.output).resolve()
    manifest.relative_to(ROOT)
    OUTPUT.relative_to(ROOT)
    (OUTPUT / 'originals').mkdir(parents=True, exist_ok=True)
    records = json.loads(manifest.read_text(encoding='utf-8'))
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(download, records))
    (OUTPUT / 'download-result.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'downloaded': sum('file' in r for r in results), 'errors': [r for r in results if 'error' in r]}, indent=2))
