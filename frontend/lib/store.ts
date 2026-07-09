import { create } from 'zustand';

// All PULSE API calls go through the Next.js proxy at /api/pulse/*
// The proxy (app/api/pulse/[...path]/route.ts) forwards these to the
// Python backend and bypasses the self-signed SSL cert restriction.
const PROXY_BASE = '/api/pulse';

async function pulseGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${PROXY_BASE}${path}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ===== Interfaces =====
// These match the exact JSON structure produced by PULSEPipeline.process_segment()
// as saved in output/debug/<session>/<seg>/pipeline_result.json

export interface SegmentResult {
  segment_id: string;
  session_id?: string;
  // GPS data (top-level after fusion)
  gps?: { lat: number; lng: number; speed?: number; heading?: number; altitude?: number; accuracy?: number };
  avg_speed_kmh?: number;
  length_km?: number;
  timestamp?: number;
  // IRI result (nested under 'iri' key)
  iri?: { iri_value: number | null; avg_speed_kmh?: number; pass_count?: number };
  // Top-level fused fields from FusionAgent
  iri_value?: number | null;
  iri_condition?: string;
  pci_estimate?: number;
  rut_depth_mm?: number;         // ← TOP-LEVEL from fusion (not inside visual!)
  rut_severity?: string;
  rut_confidence?: string;
  final_condition?: string;
  final_confidence?: string;
  data_quality?: string;
  distresses?: Array<{ type: string; severity: string; extent_percent?: number; notes?: string }>;
  drainage_adequacy?: string;
  acoustic_surface?: string;
  acoustic_confidence?: number;
  highest_action?: string;
  challenge_count?: number;
  cleared_for_report?: boolean;
  // Nested agent outputs
  visual?: {
    surface_type?: string;
    overall_condition?: string;
    pci_estimate?: number;
    distresses?: Array<{ type: string; severity: string; extent_percent?: number; notes?: string }>;
    drainage_adequacy?: string;
    recommended_intervention?: string;
    confidence?: string;
    limiting_factor?: string;
    frames_analysed?: number;
    model_used?: string;
    inference_time_s?: number;
  };
  depth_3d?: {
    rut_depth_mm?: number;
    severity?: string;
    confidence?: string;
    frames_used?: number;
  };
  acoustic?: {
    surface_type_acoustic?: string;
    confidence?: number;
  };
  deterioration?: Record<string, unknown>;
  economic?: { error?: string; narrative?: string; repair_cost_inr?: number };
  conflicts?: Array<{ type: string; resolution?: string; final?: string }>;
  devils_advocate_challenges?: Array<{ rule_id: string; challenge: string; action: string }>;
  pmgsy_application?: {
    application_text?: string;
    intervention_type?: string;
    surface_type?: string;
    road_length_km?: number;
    iri_condition?: string;
    total_budget_lakh?: number;
    status?: string;
    generated_at?: string;
    model_used?: string;
  };
  processing_time_s?: number;
}

export interface SessionSummary {
  session_id: string;
  status: 'active' | 'completed';
  segment_count: number;
  avg_iri: number | null;
  avg_pci: number | null;
  total_distance_km: number;
}

export interface GlobalStats {
  total_sessions: number;
  total_segments: number;
  total_distance_km: number;
  avg_iri: number | null;
  avg_pci: number | null;
  distress_count: number;
}

export interface AgentDecision {
  segment_id: string;
  timestamp: string;
  agents: string[];
  hypotheses: string[];
  finalDecision: string;
  confidence: number;
  action: 'log' | 'alert' | 'camera';
  status: 'resolved' | 'investigating';
}

// ===== Store State =====

interface PulseState {
  // Connection
  isConnected: boolean;
  isLoading: boolean;
  lastUpdate: string;

  // Live session
  hasActiveSession: boolean;
  activeSessionId: string | null;
  currentGPS: { lat: number; lng: number };
  currentIRI: number | null;
  currentPCI: number | null;
  currentSpeedKmh: number;
  currentRutDepthMM: number;

  // Metrics (from latest/aggregated data)
  avgIRI: number;
  avgPCI: number;
  avgRutDepthMM: number;
  avgSpeedKmh: number;
  distressCount: number;
  vlmStatus: 'Active' | 'Offline';
  pipelineHealth: number;
  wsSignalQuality: number;
  pipelineStatus: 'Optimal' | 'Warning' | 'Critical';

  // Data arrays
  sessions: SessionSummary[];
  segments: SegmentResult[];
  globalStats: GlobalStats;
  agentDecisions: AgentDecision[];

  // Actions
  fetchDashboardData: () => Promise<void>;
  startPolling: () => () => void;
  updateData: (data: Partial<PulseState>) => void;
}

// ===== Helpers =====

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function buildAgentDecision(s: SegmentResult, timestamp: string): AgentDecision {
  const challenges = s.devils_advocate_challenges ?? [];
  const hasFlag = s.highest_action === 'FLAG_IRI_INVALID';
  const distressList = s.distresses ?? s.visual?.distresses ?? [];

  const agents = [
    'iri_computer',
    'depth_pipeline',
    'acoustic_classifier',
    'sensor_fusion',
    'visual_assessor',
  ];
  if (challenges.length) agents.push("devil's_advocate");
  if (s.deterioration && Object.keys(s.deterioration).length) agents.push('deterioration_oracle');
  if (s.pmgsy_application) agents.push('economic_cascade');

  const hypotheses: string[] = [
    `Final condition: ${s.final_condition ?? 'Unknown'}`,
    `PCI score: ${s.pci_estimate ?? 'N/A'}/100`,
    `Rut depth: ${s.rut_depth_mm ?? s.depth_3d?.rut_depth_mm ?? 'N/A'} mm (${s.rut_severity ?? 'N/A'})`,
    `IRI: ${s.iri?.iri_value?.toFixed(2) ?? 'Not computable — speed too low'}`,
    `Data quality: ${s.data_quality ?? 'N/A'} — Confidence: ${s.final_confidence ?? 'Unknown'}`,
    ...challenges.slice(0, 2).map(c =>
      `⚠ ${c.rule_id.replace(/_/g, ' ')}: ${c.challenge.substring(0, 100)}…`
    ),
    ...distressList.slice(0, 2).map(d =>
      `🔴 Distress: ${d.type} (${d.severity ?? 'unknown severity'})`
    ),
  ];

  const confidenceScore =
    s.final_confidence?.includes('Low') ? 28 :
      s.final_confidence?.includes('Medium') ? 60 :
        s.final_confidence?.includes('High') ? 90 : 50;

  const action: AgentDecision['action'] =
    hasFlag || challenges.length >= 3 ? 'alert' :
      (s.visual?.frames_analysed ?? 0) > 0 ? 'camera' :
        'log';

  return {
    segment_id: s.segment_id,
    timestamp,
    agents,
    hypotheses,
    finalDecision: s.final_condition ?? 'Unknown',
    confidence: confidenceScore,
    action,
    status: 'resolved',
  };
}

// ===== Store Implementation =====

export const usePulseStore = create<PulseState>((set, get) => ({
  // Initial state
  isConnected: false,
  isLoading: true,
  lastUpdate: new Date().toLocaleTimeString('en-US', {
    hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit'
  }),

  hasActiveSession: false,
  activeSessionId: null,
  currentGPS: { lat: 0, lng: 0 },
  currentIRI: null,
  currentPCI: null,
  currentSpeedKmh: 0,
  currentRutDepthMM: 0,

  avgIRI: 0,
  avgPCI: 0,
  avgRutDepthMM: 0,
  avgSpeedKmh: 0,
  distressCount: 0,
  vlmStatus: 'Offline',
  pipelineHealth: 0,
  wsSignalQuality: 0,
  pipelineStatus: 'Optimal',

  sessions: [],
  segments: [],
  globalStats: {
    total_sessions: 0,
    total_segments: 0,
    total_distance_km: 0,
    avg_iri: null,
    avg_pci: null,
    distress_count: 0,
  },
  agentDecisions: [],

  // ===== Fetch All Dashboard Data =====
  fetchDashboardData: async () => {
    try {
      set({ isLoading: true });

      // Parallel fetch from PULSE backend (via local proxy)
      const [sessionsRes, liveRes, statsRes] = await Promise.all([
        pulseGet<{ sessions: SessionSummary[] }>('/api/sessions'),
        pulseGet<{ active: boolean; sessions: Array<Record<string, unknown>> }>('/api/live'),
        pulseGet<GlobalStats>('/api/stats'),
      ]);

      const now = new Date().toLocaleTimeString('en-US', {
        hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit'
      });

      const updates: Partial<PulseState> = {
        isLoading: false,
        lastUpdate: now,
        isConnected: !!(sessionsRes || liveRes || statsRes),
      };

      // ── Global stats ───────────────────────────────
      if (statsRes) {
        updates.globalStats = statsRes;
        updates.distressCount = statsRes.distress_count;
        if (statsRes.avg_pci != null) updates.avgPCI = statsRes.avg_pci;
        if (statsRes.avg_iri != null) updates.avgIRI = statsRes.avg_iri;
      }

      if (sessionsRes?.sessions) {
        updates.sessions = sessionsRes.sessions;
      }

      // ── Live session telemetry ─────────────────────
      if (liveRes?.active && liveRes.sessions?.length) {
        const live = liveRes.sessions[0] as Record<string, unknown>;
        updates.hasActiveSession = true;
        updates.activeSessionId = live.session_id as string;
        updates.pipelineHealth = 95;
        updates.wsSignalQuality = 92;
        updates.vlmStatus = 'Active';
        updates.pipelineStatus = 'Optimal';
        if (live.current_gps) {
          updates.currentGPS = live.current_gps as { lat: number; lng: number };
        }
        if (live.current_speed_kmh != null) {
          updates.currentSpeedKmh = live.current_speed_kmh as number;
        }
        if (live.current_iri != null) {
          updates.currentIRI = live.current_iri as number;
        }
      } else {
        updates.hasActiveSession = false;
      }

      // ── Load full segment data ─────────────────────
      // Use the most recent session (active first, else latest historical)
      const targetSession = updates.activeSessionId
        || (sessionsRes?.sessions?.[sessionsRes.sessions.length - 1]?.session_id);

      if (targetSession) {
        const segRes = await pulseGet<{ segments: SegmentResult[] }>(
          `/api/sessions/${targetSession}/segments`
        );

        if (segRes?.segments?.length) {
          const segs = segRes.segments;
          updates.segments = segs;

          // ── Agent decisions: ALL segments, with full context ──
          updates.agentDecisions = segs.map((s: SegmentResult) =>
            buildAgentDecision(s, now)
          );

          // ── Compute metrics from segment data ─────
          // IRI: use segment-level iri.iri_value (may be null when speed too low)
          const iris = segs
            .map((s: SegmentResult) => s.iri?.iri_value ?? s.iri_value)
            .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

          // PCI: top-level field from fusion (most accurate)
          const pcis = segs
            .map((s: SegmentResult) => s.pci_estimate ?? s.visual?.pci_estimate)
            .filter((v): v is number => v !== null && v !== undefined);

          // Rut depth: TOP-LEVEL field from fusion (NOT s.visual.rut_depth_mm)
          const ruts = segs
            .map((s: SegmentResult) => s.rut_depth_mm ?? s.depth_3d?.rut_depth_mm)
            .filter((v): v is number => v !== null && v !== undefined);

          // Speed: top-level avg_speed_kmh from fusion
          const speeds = segs
            .map((s: SegmentResult) => s.avg_speed_kmh)
            .filter((v): v is number => v !== null && v !== undefined);

          // Distresses: top-level distresses array from fusion
          const allDistresses = segs.flatMap((s: SegmentResult) =>
            s.distresses ?? s.visual?.distresses ?? []
          );

          if (iris.length) updates.avgIRI = +avg(iris).toFixed(2);
          if (pcis.length) updates.avgPCI = +avg(pcis).toFixed(1);
          if (ruts.length) updates.avgRutDepthMM = +avg(ruts).toFixed(1);
          if (speeds.length) updates.avgSpeedKmh = +avg(speeds).toFixed(1);
          updates.distressCount = allDistresses.length;

          // ── Update GPS from latest segment ────────
          const latestSeg = segs[segs.length - 1];
          if (latestSeg?.gps?.lat != null && latestSeg.gps.lat !== 0) {
            updates.currentGPS = { lat: latestSeg.gps.lat, lng: latestSeg.gps.lng };
          }

          // ── Pipeline metrics from historical data ─
          // Backend is connected and has processed data → show appropriate health
          if (!updates.hasActiveSession) {
            // Historical data present — backend ran and completed successfully
            const highestChallenge = segs.some(
              (s: SegmentResult) => s.highest_action === 'FLAG_IRI_INVALID'
            );
            updates.pipelineHealth = highestChallenge ? 72 : 88;
            updates.wsSignalQuality = 85;
            updates.pipelineStatus = highestChallenge ? 'Warning' : 'Optimal';

            // VLM is Active if any segment has a visual result with model_used
            const hasVlmResult = segs.some(
              (s: SegmentResult) => s.visual?.model_used
            );
            updates.vlmStatus = hasVlmResult ? 'Active' : 'Offline';
          }
        }
      }

      set(updates);
    } catch (error) {
      console.error('Failed to fetch PULSE data:', error);
      set({ isConnected: false, isLoading: false });
    }
  },

  // ===== Polling =====
  startPolling: () => {
    // Initial fetch immediately
    get().fetchDashboardData();

    // Poll every 5 seconds for live updates
    const interval = setInterval(() => {
      get().fetchDashboardData();
    }, 5000);

    return () => clearInterval(interval);
  },

  updateData: (data) => set((state) => ({ ...state, ...data })),
}));
