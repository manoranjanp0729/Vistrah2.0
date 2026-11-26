"""Fetch unmodified Expo Google Fonts static faces and their bundled OFL notices.

Run explicitly when refreshing these assets; never used by the app at runtime.
All downloads validate before workspace assets are written.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
import struct
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'mobile' / 'assets' / 'fonts' / 'native'
BASE = 'https://raw.githubusercontent.com/expo/google-fonts/master/font-packages'
FAMILIES = {'inter': 'Inter', 'poppins': 'Poppins', 'nunito': 'Nunito', 'dm-sans': 'DMSans'}
WEIGHTS = {400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold'}


def fetch(task):
    name, url = task
    with urlopen(url, timeout=60) as response:
        data = response.read(5_000_001)
    if len(data) > 5_000_000:
        raise ValueError('Unexpected asset size: ' + name)
    if name.endswith('.ttf'):
        if data[:4] != b'\x00\x01\x00\x00':
            raise ValueError('Expected a TrueType font: ' + name)
        tables = {data[12 + i * 16:16 + i * 16] for i in range(struct.unpack('>H', data[4:6])[0])}
        if b'cmap' not in tables or b'fvar' in tables:
            raise ValueError('Expected a static face with character mappings: ' + name)
    elif b'SIL OPEN FONT LICENSE' not in data or b'Version 1.1' not in data:
        raise ValueError('Expected the bundled OFL 1.1 notice: ' + name)
    return name, url, data


if __name__ == '__main__':
    tasks = []
    for package, family in FAMILIES.items():
        tasks.append((family + '-OFL.txt', f'{BASE}/{package}/LICENSE_FONT'))
        for weight, style in WEIGHTS.items():
            filename = f'{family}_{weight}{style}.ttf'
            tasks.append((filename, f'{BASE}/{package}/{weight}{style}/{filename}'))
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(fetch, tasks))
    manifest = []
    for name, url, data in results:
        (TARGET / name).write_bytes(data)
        manifest.append({'file': name, 'source': url, 'sha256': sha256(data).hexdigest(), 'bytes': len(data)})
    (TARGET / 'settings-fonts-sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    notices = [{'name': name, 'license': (TARGET / (family + '-OFL.txt')).read_text(encoding='utf-8')}
               for name, family in [('Montserrat', 'Montserrat'), ('Inter', 'Inter'), ('Poppins', 'Poppins'), ('Nunito', 'Nunito'), ('DM Sans', 'DMSans')]]
    (TARGET.parent / 'font-licenses.json').write_text(json.dumps(notices, indent=2) + '\n', encoding='utf-8')
    print(f'Validated {len(results)} font/license files; {sum(len(data) for _, _, data in results):,} bytes. No runtime font downloads.')
