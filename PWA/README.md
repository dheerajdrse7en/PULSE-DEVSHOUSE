# PULSE Collector — React Native App

**Data Collection Layer for PULSE 2.0**
AMD Slingshot Hackathon — Smartphone Sensor Pipeline

---

## Architecture

```
📱 PULSE Collector (React Native / Expo)
│
├── 5 Sensor Channels (simultaneous)
│   ├── Accelerometer + Gyroscope @ 200Hz  →  IMU packets
│   ├── GPS @ 1Hz                           →  GPS packets  
│   ├── Camera (rear) @ 2fps               →  FRAME packets (base64 JPEG)
│   └── Microphone @ 10Hz (RMS)            →  AUDIO packets
│
├── Transport
│   ├── WebSocket → ws://<laptop>:8000/ws/<session_id>
│   └── SQLite offline buffer (auto-drain on reconnect)
│
└── On-device IRI
    └── Rolling RMS estimate for live display (full computation on backend)
```

---

## Directory Structure

```
pulse-collector/
├── App.jsx                      ← Navigation root
├── app.json                     ← Expo config + permissions
├── package.json
│
├── screens/
│   ├── SetupScreen.jsx          ← Server config, session name, camera height
│   ├── RecordingScreen.jsx      ← MAIN: live sensor streams + record button
│   └── HistoryScreen.jsx        ← Past sessions, export, delete
│
├── hooks/
│   ├── useIMU.js                ← Accelerometer + Gyroscope @ 200Hz
│   ├── useGPS.js                ← Location watcher + distance tracking
│   ├── useCamera.js             ← Rear camera frame capture @ 2fps
│   └── useAudio.js              ← Microphone RMS via expo-av metering
│
├── services/
│   ├── WebSocketClient.js       ← WS connect/reconnect/queue singleton
│   └── OfflineBuffer.js         ← SQLite sessions + packet + segment tables
│
├── components/
│   ├── SensorStatusBar.js       ← 5-dot sensor status indicators
│   ├── AccelWaveform.js         ← SVG sparkline of accel Z
│   ├── IRIGauge.js              ← Large IRI number with condition badge
│   └── SegmentHistory.js        ← Horizontal chips of completed 100m segments
│
└── utils/
    ├── theme.js                 ← Colors, spacing, IRI color helpers
    └── iriEstimate.js           ← Rolling RMS IRI + haversine distance
```

---

## Setup

### 1. Install dependencies

```bash
cd pulse-collector
npm install
```

### 2. Start Expo

```bash
npx expo start
```

Scan QR code with Expo Go app (iOS/Android).

For production build:
```bash
npx expo run:ios
npx expo run:android
```

### 3. Backend must be running

On your laptop:
```bash
cd pulse/backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Both devices must be on the same WiFi network.

---

## WebSocket Packet Format

All packets are JSON objects sent over `ws://<host>/ws/<session_id>`.

### IMU Packet (200Hz)
```json
{
  "type": "IMU",
  "timestamp": 1709123456789,
  "ax": 0.12,
  "ay": -0.03,
  "az": 9.83,
  "rx": 0.01,
  "ry": 0.00,
  "rz": 0.02
}
```
*ax/ay/az in m/s² · rx/ry/rz in rad/s*

### GPS Packet (~1Hz)
```json
{
  "type": "GPS",
  "timestamp": 1709123456790,
  "lat": 12.34567,
  "lng": 78.90123,
  "speed_ms": 8.33,
  "speed_kmh": 30.0,
  "accuracy_m": 4.2,
  "heading": 270.0,
  "distance_m": 450.2
}
```

### Frame Packet (2fps)
```json
{
  "type": "FRAME",
  "timestamp": 1709123456800,
  "data": "/9j/4AAQSkZJRgAB...",
  "width": 640,
  "height": 480
}
```
*data is base64-encoded JPEG*

### Audio Packet (10Hz)
```json
{
  "type": "AUDIO",
  "timestamp": 1709123456850,
  "rms": 0.042,
  "dbfs": -27.5,
  "sample_rate": 44100
}
```

### Backend → App (Segment Complete)
```json
{
  "type": "SEGMENT_COMPLETE",
  "segment": {
    "segment_id": "12.3456,78.9012",
    "iri_value": 4.8,
    "iri_condition": "Poor",
    "rut_depth_mm": 23.1,
    "surface_type": "WBM",
    "final_condition": "Poor",
    "gps": { "lat": 12.3456, "lng": 78.9012 }
  }
}
```

---

## Physical Setup (Critical for IRI accuracy)

1. **Mount phone rigidly** — windshield suction mount or dashboard holder
2. **Rear camera facing road** — unobstructed view of road surface
3. **Measure camera height** — from phone lens to road surface (typically 1.1–1.4m in a car)
4. **Enter camera height** in Setup screen before starting
5. **Drive ≥ 20 km/h** for valid IRI readings

---

## IRI Classification (IRC:SP:20)

| IRI (m/km) | Condition | Action |
|---|---|---|
| < 2.0 | Good | Routine Maintenance |
| 2.0 – 4.0 | Fair | Preventive Treatment |
| 4.0 – 6.0 | Poor | Rehabilitation |
| > 6.0 | Very Poor | Reconstruction |

---

## Permissions Required

| Permission | Platform | Purpose |
|---|---|---|
| Motion/Accelerometer | iOS (NSMotionUsageDescription) | IRI computation at 200Hz |
| Location | iOS + Android | GPS speed + segment geotag |
| Camera | iOS + Android | Visual road surface assessment |
| Microphone | iOS + Android | Acoustic surface classification |
| Wake Lock | Android | Keep screen on during recording |

---

## Offline Mode

When the backend is unreachable:
- IMU/GPS/Audio packets are queued in memory (up to 500 packets)
- Session metadata and segment results are always saved to SQLite
- On reconnection, queued packets are drained to backend automatically
- Session history is always accessible offline

---

*PULSE 2.0 — AMD Slingshot Hackathon, February 2026*
