import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
canonical=json.loads((root/'shared/interface-copy.json').read_text())
website=json.loads((root/'frontend/lib/interface-copy.json').read_text())
mobile=(root/'mobile/src/lib/interface-copy.ts').read_text()
mobile=json.loads(mobile.removeprefix('const copy = ').split(' as const;')[0])
assert canonical==website==mobile, 'Interface copy differs; run scripts/sync-interface-copy.py'
assert list(canonical['nav'].values())[:4]==['Discover','Services','Requests','Account']
print('Website and mobile interface-copy snapshots match.')
