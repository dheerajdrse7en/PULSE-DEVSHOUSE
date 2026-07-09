"""
Diagnostic script: tests each API independently with verbose error reporting.
Run: .venv\Scripts\python.exe diagnose_apis.py
"""
import requests, json, sys

LAT, LNG = 18.5204, 73.8567   # Pune, Maharashtra
DATA_GOV_KEY = "579b464db66ec23bdd000001ed01c85551154e765ded9d3986e5804a"

SEP = "=" * 60

# ────────────────────────────────────────────────────────────────
# TEST 1: Overpass API — multiple mirrors
# ────────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("TEST 1: OVERPASS API (OpenStreetMap)")
print(SEP)

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Simple school query — smallest possible
QUERY = "[out:json][timeout:20];\nnode[\"amenity\"=\"school\"](around:3000,18.5204,73.8567);\nout body 3;"

overpass_ok = False
for mirror in OVERPASS_MIRRORS:
    try:
        print(f"\n  Trying: {mirror}")
        r = requests.post(mirror, data={"data": QUERY}, timeout=20)
        print(f"  HTTP {r.status_code}  |  response size: {len(r.text)} bytes")
        if r.status_code == 200:
            d = r.json()
            elems = d.get("elements", [])
            print(f"  ✅ SUCCESS — {len(elems)} elements returned")
            if elems:
                print(f"  Sample: {elems[0].get('tags', {}).get('name', '(no name)')} "
                      f"@ ({elems[0].get('lat')}, {elems[0].get('lon')})")
            overpass_ok = True
            break
        elif r.status_code == 429:
            print(f"  ❌ Rate limited (429) — try again later")
        elif "Server load too high" in r.text:
            print(f"  ❌ Server overloaded — body: {r.text[:120]}")
        else:
            print(f"  ❌ Error body: {r.text[:200]}")
    except requests.Timeout:
        print(f"  ❌ Timeout after 20s")
    except Exception as e:
        print(f"  ❌ Exception: {type(e).__name__}: {e}")

if not overpass_ok:
    print("\n  DIAGNOSIS: ALL OVERPASS MIRRORS FAILED")
    print("  → Overpass public servers are rate-limited/overloaded. This is transient.")
    print("  → Fix: add jitter delay between calls; use OSM Turbo as manual test.")

# ────────────────────────────────────────────────────────────────
# TEST 2: overpy library — check version + method
# ────────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("TEST 2: OVERPY LIBRARY")
print(SEP)
try:
    import overpy
    print(f"  overpy version: {overpy.__version__}")
    api = overpy.Overpass()
    # Use the Overpass URL overpy defaults to
    print(f"  overpy default URL: {api.url}")
    # Small test query
    try:
        result = api.query(QUERY)
        print(f"  ✅ overpy query OK — {len(result.nodes)} nodes")
    except Exception as eq:
        print(f"  ❌ overpy.query() failed: {type(eq).__name__}: {eq}")
except ImportError:
    print("  ❌ overpy not installed — run: pip install overpy")

# ────────────────────────────────────────────────────────────────
# TEST 3: data.gov.in — test each resource ID
# ────────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("TEST 3: DATA.GOV.IN CROP PRODUCTION API")
print(SEP)

RESOURCE_IDS = [
    ("1e6222b7-9f16-4d6d-8696-a4302c6d8f1e", "Crop Area & Production 2020-21"),
    ("35985678-0d79-46b4-9ed6-6f13308a1d24", "Crop Production 2021-22"),
    ("9ef84268-d588-465a-a308-a864a43d0070", "Crop Production Statistics"),
]

data_gov_ok = False
for rid, label in RESOURCE_IDS:
    url = f"https://api.data.gov.in/resource/{rid}"
    params = {"api-key": DATA_GOV_KEY, "format": "json", "limit": 5,
              "filters[State_Name]": "MAHARASHTRA"}
    try:
        print(f"\n  [{label}]")
        print(f"  URL: {url}")
        r = requests.get(url, params=params, timeout=15)
        print(f"  HTTP {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            total = d.get("total", "?")
            records = d.get("records", [])
            msg = d.get("message", "")
            status = d.get("status", "")
            print(f"  status={status}  message={msg}  total={total}  records_returned={len(records)}")
            if records:
                print(f"  ✅ SUCCESS — sample record keys: {list(records[0].keys())}")
                print(f"  Sample: {records[0]}")
                data_gov_ok = True
                break
            elif total == 0 or total == "0":
                print(f"  ⚠️  Dataset exists but 0 records match (wrong filter?)")
                print(f"  → Try without state filter to see available values")
                # Try without filter
                r2 = requests.get(url, {"api-key": DATA_GOV_KEY, "format": "json", "limit": 2},
                                  timeout=15)
                if r2.status_code == 200:
                    d2 = r2.json()
                    recs = d2.get("records", [])
                    if recs:
                        print(f"  Without filter: keys={list(recs[0].keys())}")
                        print(f"  Without filter: sample={recs[0]}")
            else:
                print(f"  Full response: {str(d)[:400]}")
        elif r.status_code == 401:
            print(f"  ❌ 401 Unauthorized — API key invalid or expired")
            print(f"  → Renew at: https://data.gov.in/user/{DATA_GOV_KEY[:8]}...")
        elif r.status_code == 403:
            print(f"  ❌ 403 Forbidden — resource may require different access level")
        elif r.status_code == 404:
            print(f"  ❌ 404 — resource ID does not exist")
        else:
            print(f"  ❌ HTTP {r.status_code} body: {r.text[:300]}")
    except requests.Timeout:
        print(f"  ❌ Timeout after 15s")
    except Exception as e:
        print(f"  ❌ Exception: {type(e).__name__}: {e}")

if not data_gov_ok:
    print("\n  DIAGNOSIS: data.gov.in not returning records.")
    print("  → Finding correct dataset resource ID requires catalog search.")

# ────────────────────────────────────────────────────────────────
# TEST 4: data.gov.in catalog search — find correct dataset
# ────────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("TEST 4: data.gov.in CATALOG SEARCH (find crop dataset)")
print(SEP)

catalog_url = "https://api.data.gov.in/catalog"
params = {
    "api-key": DATA_GOV_KEY,
    "format":  "json",
    "q":       "district crop production area",
    "limit":   5,
}
try:
    r = requests.get(catalog_url, params=params, timeout=15)
    print(f"  HTTP {r.status_code}")
    if r.status_code == 200:
        d = r.json()
        catalogs = d.get("catalogs", d.get("records", []))
        print(f"  Found {len(catalogs)} datasets matching query")
        for c in catalogs[:5]:
            print(f"  - ID: {c.get('id') or c.get('resource_id')}  |  {c.get('title') or c.get('name')}")
    else:
        print(f"  body: {r.text[:400]}")
except Exception as e:
    print(f"  Exception: {type(e).__name__}: {e}")

# ────────────────────────────────────────────────────────────────
# TEST 5: WorldPop API endpoints
# ────────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("TEST 5: WORLDPOP API")
print(SEP)

wp_tests = [
    ("Stats API", "https://api.worldpop.org/v1/services/stats",
     {"dataset": "wpgpas", "iso3": "IND", "year": 2020,
      "lat": LAT, "lon": LNG, "runasync": "false"}),
    ("WOPR point estimate", "https://api.worldpop.org/v1/wopr/pointestimate",
     {"iso3": "IND", "ver": "1.0", "lat": LAT, "lon": LNG,
      "agerange": "a0t99", "female": 1, "male": 1}),
]
for label, url, params in wp_tests:
    try:
        print(f"\n  [{label}] {url}")
        r = requests.get(url, params=params, timeout=20)
        print(f"  HTTP {r.status_code}  size={len(r.text)}b")
        if r.status_code == 200:
            d = r.json()
            print(f"  keys: {list(d.keys())}")
            print(f"  snippet: {str(d)[:400]}")
        else:
            print(f"  body: {r.text[:300]}")
    except requests.Timeout:
        print(f"  ❌ Timeout")
    except Exception as e:
        print(f"  ❌ {type(e).__name__}: {e}")

# ────────────────────────────────────────────────────────────────
# TEST 6: Nominatim (should work — just confirming)
# ────────────────────────────────────────────────────────────────
print(f"\n{SEP}")
print("TEST 6: NOMINATIM (reverse geocode)")
print(SEP)
try:
    r = requests.get(
        "https://nominatim.openstreetmap.org/reverse",
        params={"lat": LAT, "lon": LNG, "format": "json", "addressdetails": 1, "zoom": 10},
        headers={"User-Agent": "PULSE-Diagnostic/1.0"},
        timeout=12,
    )
    print(f"  HTTP {r.status_code}")
    if r.status_code == 200:
        d = r.json()
        addr = d.get("address", {})
        print(f"  ✅ District: {addr.get('county') or addr.get('district')}")
        print(f"  ✅ State: {addr.get('state')}")
        print(f"  ✅ Display: {d.get('display_name')}")
    else:
        print(f"  body: {r.text[:200]}")
except Exception as e:
    print(f"  ❌ {type(e).__name__}: {e}")

print(f"\n{SEP}")
print("DIAGNOSIS COMPLETE")
print(SEP)
