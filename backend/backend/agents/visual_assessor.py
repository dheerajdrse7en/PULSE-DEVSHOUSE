"""
backend/agents/visual_assessor.py

Agent 2 — Visual Road Distress Assessor

INTEL IRIS XE COMPATIBLE VERSION:
    - Primary:   Google Gemini 2.0 Flash (cloud API, free tier)
    - Fallback:  Ollama llama3.2-vision:11b-q4 (CPU-only, ~7GB RAM)
    - Emergency: Template-based assessment (no AI)

For Intel Iris Xe integrated graphics:
    Option A: Use Gemini API (recommended) - set GEMINI_API_KEY in .env
    Option B: Use Ollama CPU mode with llama3.2-vision:11b-q4
    Option C: Disable visual assessment (IRI + depth still work)
"""

import base64
import json
import logging
import time
from io import BytesIO
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Intel Iris Xe compatible models (CPU-only via Ollama)
# These run on CPU with acceptable performance (~10-30s per segment)
VLM_OLLAMA_MODELS = [
    "llama3.2-vision:11b-q4",  # 7GB RAM, CPU-only, ~15s inference
    "llava:7b-q4",              # 4GB RAM, CPU-only, ~10s inference (lower quality)
]

# Gemini API models (cloud-based, recommended for Iris Xe)
GEMINI_MODELS = [
    "gemini-2.5-flash-lite",     # Free tier, fast, excellent quality
    "gemini-1.5-flash",         # Stable fallback
]

SYSTEM_PROMPT = """You are a pavement engineer. Assess road surface condition from images and provided sensor telemetry. Output only valid JSON."""

ASSESSMENT_PROMPT_TEMPLATE = """
You are assessing a 100m road segment. The survey vehicle captured the following sensor data:

{sensor_context}

Analyse the road surface images together with the sensor data above.
Return ONLY this JSON structure:
{{
    "surface_type": "BC|WBM|Granular|Rigid|Unknown",
    "overall_condition": "Good|Fair|Poor|Very Poor",
    "pci_estimate": <0-100>,
    "distresses": [
        {{
            "type": "pothole|alligator_crack|longitudinal_crack|transverse_crack|raveling|bleeding|rutting|edge_drop|corrugation|drainage",
            "severity": "Low|Medium|High",
            "extent_percent": <0-100>,
            "notes": "<specific observation>"
        }}
    ],
    "drainage_adequacy": "Adequate|Inadequate|Blocked",
    "recommended_intervention": "Routine|Preventive|Rehabilitation|Reconstruction",
    "confidence": "High|Medium|Low",
    "limiting_factor": "<what reduced confidence, or empty string if High>"
}}"""


def _build_sensor_context(sensor_telemetry: dict) -> str:
    """Format sensor telemetry dict into a human-readable text block for the VLM."""
    if not sensor_telemetry:
        return "No additional sensor data available."

    lines = []
    if "avg_speed_kmh" in sensor_telemetry:
        lines.append(f"- Vehicle speed: {sensor_telemetry['avg_speed_kmh']} km/h")
    if "accel_z_mean" in sensor_telemetry:
        lines.append(f"- Vertical acceleration (az): mean={sensor_telemetry['accel_z_mean']} m/s², std={sensor_telemetry.get('accel_z_std', 'N/A')} m/s²")
    if "gyro_x_mean" in sensor_telemetry:
        lines.append(
            f"- Gyroscope: X={sensor_telemetry['gyro_x_mean']} rad/s, "
            f"Y={sensor_telemetry.get('gyro_y_mean', 0)} rad/s, "
            f"Z={sensor_telemetry.get('gyro_z_mean', 0)} rad/s"
        )
    if "audio_rms_mean" in sensor_telemetry:
        lines.append(
            f"- Road noise (audio RMS): mean={sensor_telemetry['audio_rms_mean']}, "
            f"peak={sensor_telemetry.get('audio_rms_max', 'N/A')}"
        )
    if "avg_heading_deg" in sensor_telemetry:
        lines.append(f"- GPS heading: {sensor_telemetry['avg_heading_deg']}°")
    if "avg_altitude_m" in sensor_telemetry:
        lines.append(f"- Altitude: {sensor_telemetry['avg_altitude_m']} m ASL")

    return "\n".join(lines) if lines else "No additional sensor data available."


def _frame_to_base64(frame_pil) -> str:
    """Convert a PIL Image to base64 string for Ollama API."""
    buf = BytesIO()
    frame_pil.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


class VisualRoadAssessor:
    """
    Visual road assessor with Intel Iris Xe support.

    Mode selection (auto-detected):
      1. Gemini API (if GEMINI_API_KEY set) — RECOMMENDED for Iris Xe
      2. Ollama CPU models (llama3.2-vision, llava)
      3. Template fallback (no AI)
    """

    def __init__(
        self,
        ollama_host: str = "http://localhost:11434",
        model: str = VLM_OLLAMA_MODELS[0],
        gemini_api_key: Optional[str] = None,
    ):
        self.host  = ollama_host
        self.model = model
        self.gemini_api_key = gemini_api_key
        self._confirmed_model: Optional[str] = None
        self._use_gemini = bool(gemini_api_key and gemini_api_key.strip())
        
        if self._use_gemini:
            logger.info("VisualRoadAssessor using Gemini API (cloud-based, Iris Xe compatible)")
        else:
            logger.info("VisualRoadAssessor using Ollama (CPU mode for Iris Xe)")
            self._probe_models()

    def _probe_models(self):
        """
        Check which Qwen3-VL models are pulled locally.
        Sets self._confirmed_model to the best available.
        """
        try:
            resp = requests.get(f"{self.host}/api/tags", timeout=3)
            if resp.status_code != 200:
                logger.warning("Ollama not reachable — visual assessment will be disabled.")
                return

            pulled = {m["name"] for m in resp.json().get("models", [])}

            for candidate in VLM_OLLAMA_MODELS:
                if candidate in pulled:
                    self._confirmed_model = candidate
                    logger.info(f"VisualRoadAssessor using Ollama model: {candidate}")
                    return

            # None pulled yet — log helpful instructions
            logger.warning(
                "No Qwen3-VL model found in Ollama. Pull one before driving:\n"
                "  ollama pull qwen3-vl:4b   ← recommended for RTX 4050 6GB\n"
                "  ollama pull qwen3-vl:2b   ← fallback\n"
                "Visual assessment will be degraded (returns Unknown condition)."
            )
        except Exception as exc:
            logger.warning(f"Could not probe Ollama models: {exc}")

    def assess_segment(
        self,
        frames: list,              # List of PIL Images from the segment
        segment_id: str,
        max_frames: int = 3,
        sensor_telemetry: dict | None = None,
    ) -> dict:
        """
        Assess a road segment from a list of PIL frames.

        Args:
            frames:           PIL Images (typically 5–10 from a 100m segment).
            segment_id:       GPS-based identifier.
            max_frames:       Max frames to send to VLM (keep low for speed).
            sensor_telemetry: Optional dict with aggregated IMU/GPS/Audio data
                              to inject into the prompt for multi-modal reasoning.

        Returns:
            Structured assessment dict.
        """
        if not frames:
            return self._error_response(segment_id, "no_frames")

        # Route to Gemini or Ollama based on configuration
        if self._use_gemini:
            return self._assess_via_gemini(frames, segment_id, max_frames, sensor_telemetry)
        else:
            return self._assess_via_ollama(frames, segment_id, max_frames, sensor_telemetry)

    def _assess_via_gemini(self, frames, segment_id, max_frames, sensor_telemetry):
        """Gemini API path (recommended for Iris Xe)."""
        try:
            import numpy as np
            indices = np.linspace(0, len(frames) - 1, min(max_frames, len(frames)), dtype=int)
            selected = [frames[i] for i in indices]

            # Encode frames as base64
            images_b64 = [_frame_to_base64(f) for f in selected]

            sensor_context = _build_sensor_context(sensor_telemetry or {})
            assessment_prompt = ASSESSMENT_PROMPT_TEMPLATE.format(sensor_context=sensor_context)

            # Gemini API request
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODELS[0]}:generateContent?key={self.gemini_api_key}"
            
            # Build parts: text + images
            parts = [{"text": SYSTEM_PROMPT + "\n\n" + assessment_prompt}]
            for img_b64 in images_b64:
                parts.append({
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": img_b64
                    }
                })

            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 1024
                }
            }

            t0 = time.monotonic()
            resp = requests.post(url, json=payload, timeout=60)
            elapsed = time.monotonic() - t0

            if resp.status_code != 200:
                logger.error(f"Gemini API error: {resp.status_code} — {resp.text[:200]}")
                return self._error_response(segment_id, f"gemini_http_{resp.status_code}")

            resp_json = resp.json()
            raw_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            
            logger.info(f"Gemini VLM: {elapsed:.1f}s, segment={segment_id}")

            assessment = self._parse_response(raw_text)
            assessment["segment_id"] = segment_id
            assessment["frames_analysed"] = len(selected)
            assessment["model_used"] = "gemini-2.5-flash-lite"
            assessment["inference_time_s"] = round(elapsed, 1)
            return assessment

        except Exception as exc:
            logger.error(f"Gemini assessment failed: {exc}")
            return self._error_response(segment_id, str(exc))

    def _assess_via_ollama(self, frames, segment_id, max_frames, sensor_telemetry):
        """Ollama CPU path (for Iris Xe without API key)."""
        model = self._confirmed_model
        if model is None:
            self._probe_models()
            model = self._confirmed_model
        if model is None:
            return self._error_response(segment_id, "no_vlm_model_pulled")

        try:
            # Select evenly spaced frames
            import numpy as np
            indices = np.linspace(0, len(frames) - 1, min(max_frames, len(frames)), dtype=int)
            selected = [frames[i] for i in indices]

            # Encode frames as base64 JPEG
            images_b64 = [_frame_to_base64(f) for f in selected]

            # Build the dynamic assessment prompt with sensor context
            sensor_context = _build_sensor_context(sensor_telemetry or {})
            assessment_prompt = ASSESSMENT_PROMPT_TEMPLATE.format(sensor_context=sensor_context)

            # Build Ollama /api/chat multimodal request
            messages = [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": assessment_prompt,
                    "images": images_b64,
                },
            ]

            payload = {
                "model":  model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 2048,
                    "num_ctx": 4096,
                },
            }

            t0 = time.monotonic()
            resp = requests.post(
                f"{self.host}/api/chat",
                json=payload,
                timeout=180,   # CPU inference is slower: 10-30s
            )
            elapsed = time.monotonic() - t0

            if resp.status_code != 200:
                logger.error(f"Ollama VLM request failed: HTTP {resp.status_code} — {resp.text[:200]}")
                return self._error_response(segment_id, f"ollama_http_{resp.status_code}")

            resp_json = resp.json()
            raw_text = resp_json.get("message", {}).get("content", "")
            logger.info(f"Ollama VLM (CPU): {elapsed:.1f}s, model={model}, segment={segment_id}")

            assessment = self._parse_response(raw_text)
            assessment["segment_id"]       = segment_id
            assessment["frames_analysed"]  = len(selected)
            assessment["model_used"]        = model
            assessment["inference_time_s"] = round(elapsed, 1)
            assessment["raw_response"]     = raw_text
            return assessment

        except requests.Timeout:
            logger.error(f"VLM inference timed out for segment {segment_id}")
            return self._error_response(segment_id, "timeout")
        except Exception as exc:
            logger.error(f"Visual assessment failed for {segment_id}: {exc}")
            return self._error_response(segment_id, str(exc))

    def _parse_response(self, response: str) -> dict:
        """Parse JSON from model response. Strips markdown fences and extracts JSON."""
        # Strip common markdown code block patterns
        clean = response.strip()
        
        # Remove markdown code fences (```json ... ``` or ``` ... ```)
        if clean.startswith("```"):
            # Find the first newline after opening fence
            first_newline = clean.find("\n")
            if first_newline != -1:
                clean = clean[first_newline + 1:]
            # Remove closing fence
            if clean.endswith("```"):
                clean = clean[:-3]
        
        clean = clean.strip()
        
        # Remove any remaining backticks
        clean = clean.replace("```json", "").replace("```", "").strip()
        
        # Strip Qwen3/thinking tags if present (<think>...</think>)
        if "<think>" in clean:
            end_think = clean.find("</think>")
            if end_think != -1:
                clean = clean[end_think + len("</think>"):].strip()
        
        # Try direct parse first
        try:
            return json.loads(clean)
        except json.JSONDecodeError as e:
            logger.debug(f"Direct JSON parse failed: {e}")
        
        # Try to extract JSON object from text
        start = clean.find("{")
        end = clean.rfind("}") + 1
        if start != -1 and end > start:
            try:
                extracted = clean[start:end]
                return json.loads(extracted)
            except json.JSONDecodeError as e:
                logger.debug(f"Extracted JSON parse failed: {e}")
        
        # Last resort: try to find JSON array
        start = clean.find("[")
        end = clean.rfind("]") + 1
        if start != -1 and end > start:
            try:
                extracted = clean[start:end]
                parsed = json.loads(extracted)
                # Wrap array in expected structure
                return {
                    "distresses": parsed,
                    "overall_condition": "Unknown",
                    "confidence": "Low"
                }
            except json.JSONDecodeError:
                pass
        
        logger.warning(f"Could not parse VLM response as JSON. First 200 chars: {clean[:200]}")
        logger.debug(f"Full response: {clean}")
        
        return {
            "error": "parse_failed",
            "raw_response": clean[:500],
            "confidence": "Low",
            "overall_condition": "Unknown",
            "distresses": [],
            "pci_estimate": None,
        }

    def _error_response(self, segment_id: str, error: str) -> dict:
        return {
            "segment_id":        segment_id,
            "error":             error,
            "overall_condition": "Unknown",
            "confidence":        "Low",
            "distresses":        [],
            "pci_estimate":      None,
        }

    @property
    def is_ready(self) -> bool:
        return self._confirmed_model is not None
