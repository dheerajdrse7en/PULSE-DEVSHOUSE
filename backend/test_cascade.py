"""
Quick smoke test for economic_cascade, loading all env files properly.
Run from backend/ root:  .venv\Scripts\python.exe test_cascade.py
"""
import os, sys, logging

# Load both .env files
from dotenv import load_dotenv
for p in ["backend/.env", "backend/backend/.env", ".env"]:
    if os.path.exists(p):
        load_dotenv(p, override=False)
        print(f"Loaded: {p}")

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

sys.path.insert(0, str(os.getcwd()))
from backend.agents.economic_cascade import EconomicCascadeEngine

engine = EconomicCascadeEngine(
    gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
    data_gov_api_key=os.getenv("DATA_GOV_API_KEY", ""),
    worldpop_year=int(os.getenv("WORLDPOP_YEAR", "2020")),
    economic_radius_m=int(os.getenv("ECONOMIC_RADIUS_M", "3000")),
)

print(f"\nGEMINI_API_KEY set: {bool(engine.api_key)}")
print(f"DATA_GOV_API_KEY set: {bool(engine.data_gov_key)}")
print(f"LLM available: {engine._llm_available}")
print(f"data.gov available: {engine._data_gov_available}")

# Rural road near Pune (Junnar taluka — actual rural PMGSY road area)
TEST_LAT, TEST_LNG = 19.2032, 73.8567
TEST_IRI = 5.8

print("\n═══ 1. Population fetch ═══")
pop = engine.fetch_population(TEST_LAT, TEST_LNG)
print(pop)

print("\n═══ 2. Reverse geocode ═══")
loc = engine.fetch_district_name(TEST_LAT, TEST_LNG)
print(loc)

print("\n═══ 3. Crop stats ═══")
crops = engine.fetch_crop_stats(loc["district"], loc["state"])
print(crops)

print("\n═══ 4. AADT ═══")
aadt_info = engine.fetch_road_aadt(TEST_LAT, TEST_LNG)
print(aadt_info)

print("\n═══ 5. OSM context (30s...) ═══")
osm = engine.fetch_osm_context(TEST_LAT, TEST_LNG, radius_m=3000)
print(f"Schools: {len(osm['schools'])}, PHCs: {len(osm['health_facilities'])}, "
      f"Farms: {osm['agricultural_land_ha']:.1f} ha ({osm['farm_source']})")
if osm["schools"]:
    print(f"Nearest school: {osm['schools'][0]['name']} @ {osm['schools'][0]['distance_km']:.2f} km")

print("\n═══ 6. Full cascade + LLM reasoning ═══")
seg = {"segment_id": "smoke-001", "iri_value": TEST_IRI, "length_km": 0.1,
       "gps": {"lat": TEST_LAT, "lng": TEST_LNG}}
result = engine.compute_cascade(seg, osm)

print(f"\n{'='*50}")
print(f"District: {result['district']}, {result['state']}")
print(f"Population: {result['population_affected']:,}  [{result['population_source']}]")
print(f"AADT: {result['aadt']} veh/day  [{result['highway_class']} → {result['aadt_source']}]")
print(f"Crop value: ₹{result['crop_value_per_ha']:,.0f}/ha  [{result['crop_source']}]")
print(f"Farm area: {result['agricultural_land_ha']:.1f} ha  [{result['farm_area_source']}]")
print(f"OSM entities: {result['osm_entities_found']}")
print(f"\nVOC/year: ₹{result['annual_voc_cost_lakh']:.3f} Lakh  (Python: ₹{result['python_voc_lakh']:.3f}L)")
print(f"Agri loss/year: ₹{result['agricultural_loss_annual_lakh']:.3f} Lakh  (Python: ₹{result['python_agri_lakh']:.3f}L)")
print(f"Total loss/year: ₹{result['total_annual_economic_loss_lakh']:.3f} Lakh")
print(f"Ambulance delay: {result['ambulance_delay_minutes']} min")
print(f"Students affected: {result['total_students_affected']}")
print(f"\nComputation source: {result['computation_source']}")
print(f"LLM cross-check OK: {result.get('llm_cross_check_ok')}")
print(f"\nReasoning:\n{result.get('reasoning_steps', 'N/A')}")
print(f"\nNarrative:\n{result['narrative']}")
