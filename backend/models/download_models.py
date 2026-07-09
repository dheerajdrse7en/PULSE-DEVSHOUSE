"""
models/download_models.py

PULSE model setup script — INTEL IRIS XE COMPATIBLE VERSION

Downloads all required models and provides setup instructions.

Run:
    python models/download_models.py

Models:
    1. Depth Anything V2 Small — HuggingFace (~100 MB) — depth estimation (CPU-compatible)
    2. Visual Assessment       — Choose ONE:
         Option A: Gemini API (RECOMMENDED for Iris Xe) — cloud-based, free tier
         Option B: Ollama CPU models — llama3.2-vision:11b-q4 (7GB RAM) or llava:7b-q4 (4GB RAM)
         Option C: Disable visual assessment (IRI + depth still work)

Intel Iris Xe Configuration:
    - Depth Anything V2 will run on CPU (~2-5 fps, acceptable for post-processing)
    - Visual assessment: Use Gemini API (fast, free) OR Ollama CPU mode (slow but local)
    - All other agents run on CPU without issues
"""

import logging
import subprocess
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


# ── 1. Depth Anything V2 Small (HuggingFace) ──────────────────────────────

def download_depth_anything():
    logger.info("Downloading Depth Anything V2 Small (HuggingFace)...")
    try:
        from huggingface_hub import snapshot_download
        path = snapshot_download(
            repo_id="depth-anything/Depth-Anything-V2-Small-hf",
            ignore_patterns=["*.gguf"],
        )
        logger.info(f"  ✓ Depth Anything V2 Small cached at: {path}")
        return True
    except Exception as exc:
        logger.error(f"  ✗ Depth Anything V2 failed: {exc}")
        return False


# ── 2. Ollama model pulls ──────────────────────────────────────────────────

def check_ollama_running() -> bool:
    """Check if Ollama daemon is reachable."""
    import requests
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def ollama_pull(model: str) -> bool:
    """Pull a model via Ollama CLI."""
    logger.info(f"  Pulling {model} via Ollama (may take several minutes)...")
    try:
        result = subprocess.run(
            ["ollama", "pull", model],
            capture_output=False,  # Show progress live
            timeout=1800,          # 30 min max (large models)
        )
        return result.returncode == 0
    except FileNotFoundError:
        logger.error("  'ollama' command not found. Install from https://ollama.ai")
        return False
    except subprocess.TimeoutExpired:
        logger.error(f"  Pull timed out for {model}")
        return False


def get_pulled_models() -> set:
    """Return set of currently pulled Ollama model names."""
    import requests
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=3)
        if r.status_code == 200:
            return {m["name"] for m in r.json().get("models", [])}
    except Exception:
        pass
    return set()


def setup_ollama_models():
    """Pull required Ollama models if not already present."""
    if not check_ollama_running():
        logger.warning(
            "Ollama is not running. If you want local visual assessment:\n"
            "  1. Install Ollama from https://ollama.ai\n"
            "  2. Start it: ollama serve\n"
            "  3. Re-run this script\n"
            "\n"
            "  OR use Gemini API instead (recommended for Iris Xe) — see .env.example"
        )
        return False

    pulled = get_pulled_models()
    logger.info(f"  Currently pulled models: {pulled or '(none)'}")

    required = [
        # Intel Iris Xe compatible models (CPU-only)
        ("llama3.2-vision:11b-q4", "Visual assessment CPU mode (7GB RAM, ~15s/segment)", "recommended"),
        ("llava:7b-q4",            "Faster fallback (4GB RAM, ~10s/segment, lower quality)", "optional"),
    ]

    logger.info("\n  NOTE: For Intel Iris Xe, these models run on CPU (slower but functional).")
    logger.info("  RECOMMENDED: Use Gemini API instead — set GEMINI_API_KEY in .env\n")

    all_ok = True
    for model, desc, importance in required:
        if model in pulled:
            logger.info(f"  ✓ {model} already pulled ({desc})")
            continue

        if importance == "optional":
            logger.info(f"  - Skipping optional {model} ({desc}). Pull manually if needed.")
            continue

        logger.info(f"\nPulling {model} — {desc}")
        logger.info("  This will take 5-10 minutes on first run...")
        ok = ollama_pull(model)
        if ok:
            logger.info(f"  ✓ {model} pulled successfully")
        else:
            logger.error(f"  ✗ {model} pull failed")
            all_ok = False

    return all_ok


# ── 3. Optional visual odometry ───────────────────────────────────────────

def check_dpvo():
    """Check if DPVO is installed."""
    try:
        import dpvo  # noqa: F401
        logger.info("  ✓ DPVO installed — full 3-anchor scale fusion active")
        return True
    except ImportError:
        logger.warning(
            "  - DPVO not installed. System will use 2/3 scale anchors.\n"
            "    To install: pip install dpvo  (requires CUDA)"
        )
        return False


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("PULSE — Model Setup Script")
    logger.info("Hardware: Intel Iris Xe (integrated graphics)")
    logger.info("=" * 60)

    results = {}

    logger.info("\n[1/3] Depth Anything V2 Small (HuggingFace)")
    logger.info("  Will run on CPU — expect ~2-5 fps (acceptable for post-processing)")
    results["depth"] = download_depth_anything()

    logger.info("\n[2/3] Visual Assessment Models")
    logger.info("  Choose ONE of these options:")
    logger.info("    A) Gemini API (RECOMMENDED) — fast, free tier, cloud-based")
    logger.info("       → Set GEMINI_API_KEY in .env file")
    logger.info("    B) Ollama CPU mode — slow (~15s/segment) but fully local")
    logger.info("       → Continue below to pull models")
    logger.info("    C) Skip visual assessment — IRI + depth still work")
    
    user_choice = input("\n  Enter choice (A/B/C): ").strip().upper()
    
    if user_choice == "A":
        logger.info("\n  ✓ Using Gemini API mode")
        logger.info("    1. Get free API key: https://aistudio.google.com/apikey")
        logger.info("    2. Add to .env: GEMINI_API_KEY=your_key_here")
        results["ollama"] = True  # Skip Ollama setup
    elif user_choice == "B":
        results["ollama"] = setup_ollama_models()
    else:
        logger.info("\n  ✓ Visual assessment disabled — using IRI + depth only")
        results["ollama"] = True  # Skip

    logger.info("\n[3/3] DPVO visual odometry (optional)")
    logger.info("  Not compatible with Iris Xe — skipping")
    results["dpvo"] = False

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Setup Summary:")
    for name, ok in results.items():
        status = "✓" if ok else "✗ (see warnings above)"
        logger.info(f"  {status}  {name}")

    logger.info("""
Next steps:
  1. Copy environment template:
       copy .env.example .env
     Then edit .env:
       - Add GEMINI_API_KEY (if using Option A)
       - Verify PULSE_API_URL points to your laptop IP

  2. Run camera calibration (once):
       python calibration/camera_calibration.py

  3. Start backend:
       python run_https.py

  4. Connect phone to same Wi-Fi → open https://<YOUR_LAPTOP_IP>:8000/app/index.html

PERFORMANCE NOTES (Intel Iris Xe):
  - Depth Anything V2: ~2-5 fps on CPU (post-process recorded video, not real-time)
  - Visual assessment: Gemini API ~2-5s/segment OR Ollama CPU ~15-30s/segment
  - IRI computation: Real-time (CPU-only, very fast)
  - Expect ~30-60 seconds total processing time per 100m segment
""")
    sys.exit(0 if all(results.values()) else 1)


if __name__ == "__main__":
    main()
