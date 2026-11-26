import json, urllib.request
base="http://localhost:8000"
for path in ["/health","/api/v1/categories"]:
    with urllib.request.urlopen(base+path, timeout=5) as r:
        data=json.load(r)
        print(path, "OK", str(data)[:300])
