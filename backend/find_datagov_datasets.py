"""
Step 2: Find the REAL data.gov.in crop production resource IDs.
Searches the data.gov.in catalog for crop-related datasets.
Run: .venv\Scripts\python.exe find_datagov_datasets.py
"""
import requests

DATA_GOV_KEY = "579b464db66ec23bdd000001ed01c85551154e765ded9d3986e5804a"

print("Searching data.gov.in for crop production datasets...\n")

# data.gov.in uses OGD platform catalog endpoint
search_url = "https://api.data.gov.in/resource"

# Known working resource IDs from data.gov.in for agriculture
CANDIDATES = [
    # Agmarknet daily mandi prices (THIS is what 35985678 is)
    ("35985678-0d79-46b4-9ed6-6f13308a1d24", "Agmarknet daily mandi prices"),
    # District-wise crop production — Season and Year from Directorate of Economics & Statistics
    ("9ef84268-d588-465a-a308-a864a43d0070", "Crop production v2"),
    # Ministry of Agri — State-wise crop production
    ("5dacbc52-d0b4-4e92-8adb-cde0b3cb52e3", "State crop production MoA"),
    # District-wise crop area and production
    ("a85cdef7-a85d-46b7-8a6d-832b24b2f24b", "District crop area MoA"),
    # Agricultural Statistics at a glance
    ("8a9ab78e-3e43-11e9-967d-000d3af9b60e", "Agri stats at glance"),
    # Kharif crop production
    ("1e6222b7-9f16-4d6d-8696-a4302c6d8f1e", "Kharif 2020-21 attempt"),
]

print(f"{'ID':<45} {'Status':>10} {'Total':>8}  Keys")
print("-" * 90)
for rid, label in CANDIDATES:
    url = f"https://api.data.gov.in/resource/{rid}"
    params = {"api-key": DATA_GOV_KEY, "format": "json", "limit": 2}
    try:
        r = requests.get(url, params=params, timeout=12)
        if r.status_code == 200:
            d = r.json()
            total = d.get("total", "?")
            records = d.get("records", [])
            keys = list(records[0].keys()) if records else []
            # Flag if this looks like a crop dataset (not mandi prices)
            is_crop = any(k.lower() in ("production", "area", "yield", "crop", "crop_name", "season")
                         for k in keys)
            flag = "✅ CROP" if is_crop else "⚠️  maybe"
            print(f"{rid}  {r.status_code:>10}  {str(total):>8}  {str(keys[:5])} {flag}")
            if records and is_crop:
                print(f"    Sample record: {records[0]}")
        elif r.status_code == 404:
            print(f"{rid}  {'404 missing':>10}  {'':>8}")
        elif r.status_code == 401:
            print(f"{rid}  {'401 key err':>10}  {'':>8}")
        else:
            print(f"{rid}  {r.status_code:>10}  {'':>8}  {r.text[:60]}")
    except requests.Timeout:
        print(f"{rid}  {'TIMEOUT':>10}")
    except Exception as e:
        print(f"{rid}  {'ERROR':>10}  {e}")
