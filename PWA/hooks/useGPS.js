/**
 * useGPS — High-accuracy location at ~1Hz
 */
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { computeDistanceMeters } from '../utils/iriEstimate';

const GPS_ACCURACY = Location.Accuracy.BestForNavigation;

export function useGPS({ onSample, enabled = false, isTestMode = false }) {
  const [hasPermission, setHasPermission] = useState(false);
  const watchRef = useRef(null);
  const coordHistory = useRef([]);
  const totalDistance = useRef(0);
  const onSampleRef = useRef(onSample);
  onSampleRef.current = onSample;

  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') setHasPermission(true);
    }
    requestPermissions();
  }, []);

  useEffect(() => {
    if (!hasPermission && !isTestMode) return;
    if (enabled) startTracking();
    else stopTracking();
    return () => stopTracking();
  }, [enabled, hasPermission, isTestMode]);

  async function startTracking() {
    if (watchRef.current) return;
    coordHistory.current = [];
    totalDistance.current = 0;

    if (isTestMode) {
      // Simulate 36 km/h (10 m/s) movement directly east
      let currentLat = 12.838700;
      let currentLng = 80.155268;

      const timerId = setInterval(() => {
        currentLng += 0.0001; // Fake eastward movement
        totalDistance.current += 10;

        if (onSampleRef.current) {
          onSampleRef.current({
            type: 'GPS',
            timestamp: Date.now(),
            lat: currentLat,
            lng: currentLng,
            speed_ms: 10,
            speed_kmh: 36,
            accuracy_m: 5,
            heading: 90,
            altitude: 0,
            distance_m: totalDistance.current,
          });
        }
      }, 1000);

      watchRef.current = { remove: () => clearInterval(timerId) };
      return;
    }

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: GPS_ACCURACY, timeInterval: 1000, distanceInterval: 5 },
      (location) => {
        const { latitude, longitude, speed, accuracy, heading, altitude } = location.coords;
        const speedMs = speed || 0;
        const speedKmh = speedMs * 3.6;

        const newCoord = { lat: latitude, lng: longitude };
        if (coordHistory.current.length > 0) {
          const last = coordHistory.current[coordHistory.current.length - 1];
          totalDistance.current += computeDistanceMeters([last, newCoord]);
        }
        coordHistory.current.push(newCoord);
        if (coordHistory.current.length > 120) coordHistory.current.shift();

        if (onSampleRef.current) {
          onSampleRef.current({
            type: 'GPS',
            timestamp: Date.now(),
            lat: latitude,
            lng: longitude,
            speed_ms: speedMs,
            speed_kmh: speedKmh,
            accuracy_m: accuracy,
            heading: heading || 0,
            altitude: altitude || 0,
            distance_m: totalDistance.current,
          });
        }
      }
    );
  }

  function stopTracking() {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }

  function resetDistance() {
    totalDistance.current = 0;
    coordHistory.current = [];
  }

  return {
    hasPermission,
    isActive: enabled && hasPermission && !!watchRef.current,
    resetDistance,
  };
}