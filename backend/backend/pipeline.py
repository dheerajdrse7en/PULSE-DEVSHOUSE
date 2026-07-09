"""
backend/pipeline.py

PULSE Processing Pipeline — Orchestrator

Coordinates the full agent processing chain for a single 100m road segment:

    Raw segment buffers
        │
        ├── [Sensor A] IRI Computer         → iri_result
        ├── [Sensor B] Depth Pipeline       → depth_result
        ├── [Agent 2] Visual Assessor       → visual_result
        │
        ├── [Agent 0] Sensor Fusion         → fused_segment
        ├── [Agent 4] Deterioration Oracle  → deterioration
        ├── [Agent 5] Economic Cascade      → economic_impact
        ├── [Agent 6] Devil's Advocate      → reviewed_segment
        └── [Agent 7] Government Pipeline  → pmgsy_draft  (optional)

Returns a single unified result dict for WebSocket streaming to the dashboard.
"""

import logging
import time
import os
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class PULSEPipeline:
    """
    Full processing pipeline for one road session.
    Instantiated once per WebSocket session.

    Agents and sensors are lazy-loaded on first segment to avoid
    startup delay when GPU model loading is deferred.
    """

    def __init__(self, session_id: str, config: dict | None = None):
        self.session_id = session_id
        self.config = config or self._default_config()

        # Sensors (lazy-loaded)
        self._iri_computer       = None
        self._depth_pipeline     = None
        self._slam               = None

        # Agents (lazy-loaded)
        self._sensor_fusion      = None
        self._visual_assessor    = None
        self._deterioration      = None
        self._economic_cascade   = None
        self._devils_advocate    = None
        self._gov_pipeline       = None

        # Session state
        self._processed_segments: list[dict] = []
        self._session_start = time.time()

        # Debug logger — set DEBUG_MODE=1 in .env to enable
        from backend.debug_logger import DebugLogger
        debug_enabled = os.getenv("DEBUG_MODE", "1") == "1"  # ON by default for now
        self._debug = DebugLogger(session_id, enabled=debug_enabled)

        logger.info(f"PULSEPipeline initialized for session {session_id} (debug={'ON' if debug_enabled else 'OFF'})")

    # ── Config ─────────────────────────────────────────────────────────────

    @staticmethod
    def _default_config() -> dict:
        return {
            "device":              os.getenv("DEVICE", "cuda"),
            "camera_height_m":     float(os.getenv("CAMERA_HEIGHT_M", "1.20")),
            "depth_model":         os.getenv("DEPTH_MODEL", "depth-anything/Depth-Anything-V2-Small-hf"),
            "vlm_ollama_model":    os.getenv("VLM_OLLAMA_MODEL", "qwen3-vl:4b"),
            "ollama_host":         os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            "gemini_model":        os.getenv("GEMINI_MODEL", "gemma-3-27b-it"),
            "gemini_api_key":      os.getenv("GEMINI_API_KEY", ""),
            "irc_sample_rate":     int(os.getenv("IRI_SAMPLE_RATE", "200")),
            "min_speed_kmh":       float(os.getenv("MIN_SPEED_KMH", "20")),
            "test_mode":           os.getenv("TEST_MODE", "false").lower() == "true",
            # Economic cascade — real data keys
            "data_gov_api_key":    os.getenv("DATA_GOV_API_KEY", ""),
            "worldpop_year":       int(os.getenv("WORLDPOP_YEAR", "2020")),
            "economic_radius_m":   int(os.getenv("ECONOMIC_RADIUS_M", "3000")),
            "rainfall_default_mm": 1200,
            "generate_gov_app":    True,
            "aadt_default":        int(os.getenv("AADT_DEFAULT", "500")),
        }

    # ── Lazy Initialisation ────────────────────────────────────────────────

    def _ensure_sensors(self):
        """Initialise sensors on first use (defers GPU loads)."""
        if self._iri_computer is None:
            from backend.sensors.iri_computer import compute_iri, classify_iri
            self._iri_computer = (compute_iri, classify_iri)

        if self._slam is None:
            from backend.sensors.slam_wrapper import SLAMWrapper
            self._slam = SLAMWrapper()

        if self._depth_pipeline is None:
            from backend.sensors.depth_pipeline import MetricDepthPipeline
            self._depth_pipeline = MetricDepthPipeline(
                camera_height_m=self.config["camera_height_m"],
                device=self.config["device"],
                model_id=self.config["depth_model"],
            )

    def _ensure_agents(self):
        """Initialise agents on first use."""
        if self._sensor_fusion is None:
            from backend.agents.sensor_fusion import SensorFusionAgent
            self._sensor_fusion = SensorFusionAgent()

        if self._deterioration is None:
            from backend.agents.deterioration_oracle import DeteriorationOracle
            self._deterioration = DeteriorationOracle()

        if self._economic_cascade is None:
            from backend.agents.economic_cascade import EconomicCascadeEngine
            self._economic_cascade = EconomicCascadeEngine(
                gemini_model=self.config["gemini_model"],
                gemini_api_key=self.config["gemini_api_key"],
                data_gov_api_key=self.config["data_gov_api_key"],
                worldpop_year=self.config["worldpop_year"],
                economic_radius_m=self.config["economic_radius_m"],
            )

        if self._devils_advocate is None:
            from backend.agents.devils_advocate import DevilsAdvocateAgent
            self._devils_advocate = DevilsAdvocateAgent()

        if self._gov_pipeline is None:
            from backend.agents.government_pipeline import GovernmentPipelineAgent
            self._gov_pipeline = GovernmentPipelineAgent(
                gemini_model=self.config["gemini_model"],
                gemini_api_key=self.config["gemini_api_key"],
            )

    def _ensure_visual_assessor(self):
        """Visual assessor — supports Gemini API or Ollama CPU mode."""
        if self._visual_assessor is None:
            from backend.agents.visual_assessor import VisualRoadAssessor
            self._visual_assessor = VisualRoadAssessor(
                ollama_host=self.config["ollama_host"],
                model=self.config["vlm_ollama_model"],
                gemini_api_key=self.config.get("gemini_api_key"),  # Pass Gemini key
            )

    # ── Main Processing ────────────────────────────────────────────────────

    async def process_segment(self, segment: dict) -> dict:
        """
        Full pipeline: raw segment → unified result dict.

        Args:
            segment: Dict from SegmentManager.pop_segment()

        Returns:
            Complete processed segment dict suitable for dashboard streaming.
        """
        t_start = time.monotonic()
        self._ensure_sensors()
        self._ensure_agents()

        seg_id = segment["segment_id"]

        # ── DEBUG: Log raw sensor data ─────────────────────────────────────
        self._debug.log_raw_segment(segment)
        self._debug.log_frames(seg_id, segment.get("frames", []))

        result: dict = {
            "segment_id":  seg_id,
            "session_id":  self.session_id,
            "gps":         segment["gps"],
            "length_km":   segment["length_km"],
            "timestamp":   segment["timestamp"],
            "avg_speed_kmh": segment.get("avg_speed_kmh"),
        }

        import asyncio

        # ── Channel 1: IRI ─────────────────────────────────────────────────
        iri_result = await asyncio.to_thread(self._run_iri, segment)
        result["iri"] = iri_result
        self._debug.log_stage(seg_id, "iri_result", iri_result)

        # ── Channel 2: Depth + 3D ─────────────────────────────────────────
        depth_result = await asyncio.to_thread(self._run_depth, segment)
        result["depth_3d"] = depth_result
        self._debug.log_stage(seg_id, "depth_result", depth_result)

        # ── Agent 2: Visual Assessment ────────────────────────────────────
        visual_result = await asyncio.to_thread(self._run_visual, segment)
        result["visual"] = visual_result
        # VLM debug logs are handled inside visual_assessor.py itself

        # ── Agent 0: Sensor Fusion ────────────────────────────────────────
        segment_for_fusion = {
            **segment,
            "iri":      iri_result,
            "visual":   visual_result,
            "depth_3d": depth_result,
        }
        fused = await asyncio.to_thread(self._sensor_fusion.fuse, segment_for_fusion)
        result.update(fused)
        self._debug.log_stage(seg_id, "fusion_result", fused)

        # ── Agent 4: Deterioration Oracle ────────────────────────────────
        if fused.get("iri_value") is not None:
            deterioration = await asyncio.to_thread(
                self._deterioration.predict_deterioration,
                current_iri=fused["iri_value"],
                surface_type=fused.get("surface_type", "WBM"),
                aadt=self.config["aadt_default"],
                rainfall_mm_year=self.config["rainfall_default_mm"],
                length_km=segment.get("length_km", 0.1),
            )
        else:
            deterioration = {}
        result["deterioration"] = deterioration

        # ── Agent 5: Economic Cascade ─────────────────────────────────────
        # All real-data fetches (WorldPop, Nominatim, data.gov.in, AADT) happen
        # inside compute_cascade() automatically from the segment GPS.
        gps_mid = segment.get("gps", {})
        osm_context = await asyncio.to_thread(
            self._economic_cascade.fetch_osm_context,
            lat=gps_mid.get("lat", 0),
            lng=gps_mid.get("lng", 0),
        )
        # population=None → engine fetches real WorldPop count internally
        economic = await asyncio.to_thread(
            self._economic_cascade.compute_cascade,
            segment=fused,
            osm_context=osm_context,
            population=None,
        )
        result["economic"] = economic

        # ── Agent 6: Devil's Advocate ─────────────────────────────────────
        reviewed = self._devils_advocate.review(result)
        result = reviewed

        # ── Agent 7: Government Pipeline (if cleared) ────────────────────
        if self.config.get("generate_gov_app") and result.get("cleared_for_report"):
            district_info = {
                "district":  economic.get("district", "Unknown District"),
                "state":     economic.get("state", "India"),
                "city":      economic.get("city", ""),
                "road_name": f"Road Segment {segment['segment_id']}",
                "village":   economic.get("village", ""),
                "block":     economic.get("block", ""),
            }
            gov_app = self._gov_pipeline.draft_pmgsy_application(
                road_data=result,
                economic_data=economic,
                district_info=district_info,
            )
        else:
            gov_app = {"status": "HELD — Requires Human Review"}
        result["pmgsy_application"] = gov_app

        # ── Timing ────────────────────────────────────────────────────────
        elapsed = time.monotonic() - t_start
        result["processing_time_s"] = round(elapsed, 2)

        # ── DEBUG: Save full final result ─────────────────────────────────
        self._debug.log_final_result(seg_id, result)

        self._processed_segments.append(result)
        logger.info(
            f"Segment {result['segment_id']} processed in {elapsed:.1f}s | "
            f"IRI={result.get('iri_value')} | "
            f"Condition={result.get('final_condition')} | "
            f"Confidence={result.get('final_confidence')}"
        )
        return result

    # ── Sensor Runners ─────────────────────────────────────────────────────

    def _run_iri(self, segment: dict) -> dict:
        """Fetch IRI computation generated by the Edge device."""
        client_iri = segment.get("client_iri")
        
        if client_iri is not None:
            return {
                "iri_value":     round(client_iri, 2),
                "avg_speed_kmh": segment.get("avg_speed_kmh"),
                "pass_count":    1,
            }
        else:
            return {"iri_value": None, "error": "no_client_iri_provided"}

    def _run_depth(self, segment: dict) -> dict:
        """Run depth estimation on a sample of frames."""
        frames = segment.get("frames", [])
        if not frames:
            return {"rut_depth_mm": None, "error": "no_frames"}

        try:
            # Sample up to 5 frames evenly spaced across the segment
            indices = np.linspace(0, len(frames) - 1, min(5, len(frames)), dtype=int)
            sample_frames = [frames[i] for i in indices]

            avg_speed_ms = segment.get("avg_speed_ms", 0.0)
            imu_scale = self._slam.get_imu_scale_estimate(segment.get("imu_buffer", []))

            results = []
            for frame in sample_frames:
                if frame is None:
                    continue
                r = self._depth_pipeline.process_frame(
                    frame=frame,
                    gps_speed_ms=avg_speed_ms,
                    imu_scale=imu_scale,
                )
                if "rut_depth_mm" in r:
                    results.append(r)

            if not results:
                return {"rut_depth_mm": None, "error": "depth_processing_failed"}

            # Take median rut depth across sampled frames
            rut_values = [r["rut_depth_mm"] for r in results if r.get("rut_depth_mm") is not None]
            if rut_values:
                median_rut = float(np.median(rut_values))
                return {
                    "rut_depth_mm": round(median_rut, 1),
                    "severity":     results[-1].get("rut_severity"),
                    "confidence":   results[-1].get("rut_confidence"),
                    "frames_used":  len(results),
                    "scale_used":   results[-1].get("scale_used"),
                }

            return {"rut_depth_mm": None, "note": "All frames produced no valid depth"}

        except Exception as exc:
            logger.error(f"Depth pipeline failed: {exc}")
            return {"rut_depth_mm": None, "error": str(exc)}

    def _run_visual(self, segment: dict) -> dict:
        """Run visual assessment on segment frames."""
        frames = segment.get("frames", [])
        seg_id = segment.get("segment_id", "unknown")
        if not frames:
            return {"overall_condition": "Unknown", "confidence": "Low",
                    "error": "no_frames", "distresses": []}

        try:
            self._ensure_visual_assessor()
            from PIL import Image
            import cv2 as cv
            from backend.agents.visual_assessor import SYSTEM_PROMPT

            # Convert frames to PIL (VLM input format)
            pil_frames = []
            for f in frames[:8]:
                if f is not None:
                    rgb = cv.cvtColor(f, cv.COLOR_BGR2RGB)
                    pil_frames.append(Image.fromarray(rgb))

            if not pil_frames:
                return {"overall_condition": "Unknown", "confidence": "Low", "distresses": []}

            # ── Aggregate sensor telemetry to enrich VLM prompt context ─────
            imu_buf = segment.get("imu_buffer", [])
            gps_buf = segment.get("gps_buffer", [])

            sensor_telemetry: dict = {}

            if imu_buf:
                az_vals = [p.get("az", 0.0) for p in imu_buf]
                rx_vals = [p.get("rx", 0.0) for p in imu_buf]  # gyro X
                ry_vals = [p.get("ry", 0.0) for p in imu_buf]  # gyro Y
                rz_vals = [p.get("rz", 0.0) for p in imu_buf]  # gyro Z
                sensor_telemetry["accel_z_mean"] = round(float(np.mean(az_vals)), 3)
                sensor_telemetry["accel_z_std"] = round(float(np.std(az_vals)), 3)
                sensor_telemetry["gyro_x_mean"] = round(float(np.mean(rx_vals)), 3)
                sensor_telemetry["gyro_y_mean"] = round(float(np.mean(ry_vals)), 3)
                sensor_telemetry["gyro_z_mean"] = round(float(np.mean(rz_vals)), 3)

            if gps_buf:
                speeds_ms = [g.get("speed", 0.0) for g in gps_buf]
                headings = [g.get("heading", 0.0) for g in gps_buf]
                altitudes = [g.get("altitude", 0.0) for g in gps_buf]
                sensor_telemetry["avg_speed_kmh"] = round(float(np.mean(speeds_ms)) * 3.6, 1)
                sensor_telemetry["avg_heading_deg"] = round(float(np.mean(headings)), 1)
                sensor_telemetry["avg_altitude_m"] = round(float(np.mean(altitudes)), 1)

            # DEBUG: Log what we're about to send to VLM
            self._debug.log_vlm_input(seg_id, pil_frames, "[dynamic prompt with telemetry]", SYSTEM_PROMPT)

            result = self._visual_assessor.assess_segment(
                frames=pil_frames,
                segment_id=seg_id,
                sensor_telemetry=sensor_telemetry,
            )

            # DEBUG: Log VLM raw response and parsed output
            raw = result.get("raw_response", result.get("error", ""))
            self._debug.log_vlm_output(seg_id, str(raw), result, result.get("inference_time_s", 0))

            return result

        except Exception as exc:
            logger.error(f"Visual assessment failed: {exc}")
            return {"overall_condition": "Unknown", "confidence": "Low",
                    "error": str(exc), "distresses": []}

    # ── Session Summary ────────────────────────────────────────────────────

    def get_session_summary(self) -> dict:
        """Return aggregate statistics for the full session."""
        segs = self._processed_segments
        if not segs:
            return {"session_id": self.session_id, "segments": 0}

        iri_values = [s.get("iri_value") for s in segs if s.get("iri_value") is not None]
        total_econ = sum(
            s.get("economic", {}).get("total_annual_economic_loss_lakh", 0)
            for s in segs
        )

        return {
            "session_id":           self.session_id,
            "segments_processed":   len(segs),
            "total_length_km":      round(sum(s.get("length_km", 0) for s in segs), 3),
            "avg_iri":              round(float(np.mean(iri_values)), 2) if iri_values else None,
            "max_iri":              round(float(np.max(iri_values)), 2) if iri_values else None,
            "total_economic_loss_lakh": round(total_econ, 2),
            "session_duration_s":   round(time.time() - self._session_start, 0),
            "segments":             segs,
        }

    def finalise(self):
        """Clean up resources at session end."""
        logger.info(
            f"Session {self.session_id} complete. "
            f"{len(self._processed_segments)} segments processed."
        )
