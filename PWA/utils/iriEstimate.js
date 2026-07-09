/**
 * On-device IRI estimation for live display
 * 
 * Full quarter-car model runs on the backend.
 * This is a lightweight rolling RMS estimate for real-time feedback.
 * 
 * Reference: Douangphachanh & Oneyama (2014)
 * Accuracy: ±0.8 IRI units (sufficient for live color feedback)
 */

const SAMPLE_RATE = 200; // Hz
const GRAVITY = 9.81;
const MIN_SPEED_KMH = 20;

// Rolling buffer for accelerometer Z data
let accelBuffer = [];
let speedBuffer = [];
const BUFFER_SIZE = SAMPLE_RATE * 2; // 2 seconds of data

// High-pass filter state (remove gravity DC offset)
let filterState = { x: 0, y: 0 };

/**
 * Exponential Moving Average (EMA) high-pass filter
 * Unconditionally stable, removes gravity component from accel Z.
 */
function highPassFilter(sample) {
  const ALPHA = 0.99; // Fc ~ 0.3 Hz at 200Hz
  const y = ALPHA * (filterState.y + sample - filterState.x);
  filterState.x = sample;
  filterState.y = y;
  return y;
}

/**
 * Push new accelerometer sample into rolling buffer
 * @param {number} az - vertical acceleration (m/s²)
 * @param {number} speedKmh - current GPS speed
 */
export function pushSample(az, speedKmh) {
  const filtered = highPassFilter(az);
  accelBuffer.push(filtered);
  speedBuffer.push(speedKmh);

  if (accelBuffer.length > BUFFER_SIZE) {
    accelBuffer.shift();
    speedBuffer.shift();
  }
}

/**
 * Compute rolling IRI estimate from current buffer
 * Returns null if insufficient data or speed too low
 * 
 * @returns {number|null} IRI estimate in m/km
 */
export function computeRollingIRI() {
  if (accelBuffer.length < SAMPLE_RATE * 0.5) return null; // Need at least 0.5s

  const avgSpeed = speedBuffer.reduce((a, b) => a + b, 0) / speedBuffer.length;
  if (avgSpeed < MIN_SPEED_KMH) return null;

  // Speed normalization factor (IRI defined at 80 km/h)
  const speedFactor = Math.max(0.3, Math.min(2.0, avgSpeed / 80));

  // RMS of filtered acceleration
  const rms = Math.sqrt(
    accelBuffer.reduce((sum, v) => sum + v * v, 0) / accelBuffer.length
  );

  // Empirical relationship: IRI ≈ k * RMS / speed_factor
  // Calibration constant k derived from Douangphachanh regression
  const k = 3.5;
  const iriEstimate = (k * rms) / speedFactor;

  return Math.round(iriEstimate * 10) / 10; // 1 decimal place
}

/**
 * Reset all filter state (call when starting new session)
 */
export function resetIRIEstimator() {
  accelBuffer = [];
  speedBuffer = [];
  filterState = { x: 0, y: 0 };
}

/**
 * Compute distance traveled from GPS coordinates array
 * @param {Array} coords - [{lat, lng}, ...]
 * @returns {number} distance in meters
 */
export function computeDistanceMeters(coords) {
  if (!coords || coords.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineMeters(coords[i - 1], coords[i]);
  }
  return total;
}

function haversineMeters(a, b) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sin2 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

/**
 * Format IRI for display
 */
export function formatIRI(iri) {
  if (iri === null || iri === undefined) return '—';
  return iri.toFixed(1);
}
