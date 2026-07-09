/**
 * PULSE API Service — Type interfaces for backend data models.
 * Firebase is used only for authentication.
 * All real-time sensor data comes from PULSE REST API (see store.ts).
 */

export interface PipelineData {
  pipelineHealth: number;
  wsSignalQuality: number;
  currentGPS: { lat: number; lng: number };
  pipelineStatus: 'Optimal' | 'Warning' | 'Critical';
  status: 'Active' | 'Idle';
}

export interface SensorReading {
  id?: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface DistressDetection {
  id?: string;
  location?: { lat: number; lng: number };
  confidence: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  segment_id: string;
}