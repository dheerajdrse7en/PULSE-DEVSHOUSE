"""
Find the correct data.gov.in dataset for crop production by searching the OGD catalog.
Also test the mandi price dataset as a proxy for crop value.
"""
import requests, json

DATA_GOV_KEY = "579b464db66ec23bdd000001ed01c85551154e765ded9d3986e5804a"

print("=" * 60)
print("PART A: Mandi Price Dataset — already works!")
print("  Use modal price as proxy for crop value per unit")
print("=" * 60)

# This dataset returns mandi prices — we can derive crop value from it
url = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
params = {
    "api-key": DATA_GOV_KEY,
    "format": "json",
    "limit": 10,
    "filters[State]": "Maharashtra",
}
r = requests.get(url, params=params, timeout=15)
print(f"HTTP {r.status_code}")
d = r.json()
records = d.get("records", [])
print(f"Total Maharashtra records: {d.get('total')}")
print(f"Keys: {list(records[0].keys()) if records else 'none'}")
for rec in records[:3]:
    print(f"  {rec}")

print()

# What commodity types are available?
params_crops = {
    "api-key": DATA_GOV_KEY,
    "format": "json",
    "limit": 20,
    "filters[State]": "Maharashtra",
    "filters[Commodity]": "Rice",
}
r2 = requests.get(url, params=params_crops, timeout=15)
d2 = r2.json()
recs2 = d2.get("records", [])
print(f"Rice in Maharashtra: {len(recs2)} records, total={d2.get('total')}")
for rec in recs2[:2]:
    print(f"  {rec}")

print()
print("=" * 60)
print("PART B: Search OGD catalog for crop production datasets")
print("=" * 60)
# Use the data.gov.in catalog search API
for search_term in ["crop production district", "crop area production india"]:
    cat_url = "https://api.data.gov.in/catalogs"
    cat_params = {"api-key": DATA_GOV_KEY, "format": "json", "q": search_term, "limit": 5}
    try:
        rc = requests.get(cat_url, params=cat_params, timeout=12)
        print(f"\nSearch '{search_term}': HTTP {rc.status_code}")
        if rc.status_code == 200:
            dc = rc.json()
            catalogs = dc.get("catalogs", dc.get("records", []))
            for cat in catalogs[:5]:
                print(f"  ID={cat.get('id') or cat.get('identifier')}  |  {cat.get('title')}")
        else:
            print(f"  body: {rc.text[:200]}")
    except Exception as e:
        print(f"  {type(e).__name__}: {e}")

print()
print("=" * 60)
print("PART C: Test the mandi price dataset as crop value source")
print("  Strategy: modal_price (₹/quintal) × avg yield → ₹/ha")
print("=" * 60)

# Get modal prices for major crops in Maharashtra
MAJOR_CROPS = ["Rice", "Wheat", "Sugarcane", "Cotton", "Soyabean"]
for crop in MAJOR_CROPS:
    params_c = {
        "api-key": DATA_GOV_KEY,
        "format": "json",
        "limit": 5,
        "filters[State]": "Maharashtra",
        "filters[Commodity]": crop,
    }
    rc = requests.get(url, params=params_c, timeout=12)
    if rc.status_code == 200:
        dr = rc.json()
        recs = dr.get("records", [])
        total = dr.get("total", 0)
        if recs:
            modal_prices = [int(r.get("modal_price", 0) or 0) for r in recs if r.get("modal_price")]
            avg_modal = sum(modal_prices) / len(modal_prices) if modal_prices else 0
            print(f"  {crop:<12}  total={total:>8}  avg modal_price=₹{avg_modal:,.0f}/quintal")
        else:
            print(f"  {crop:<12}  total={total}  (no records)")
