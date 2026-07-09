/**
 * SensorStatusBar — 5-channel sensor status indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

const SENSORS = [
  { key: 'imu', label: 'IMU', sublabel: '200Hz' },
  { key: 'gps', label: 'GPS', sublabel: 'L1' },
  { key: 'camera', label: 'CAM', sublabel: '2fps' },
  { key: 'audio', label: 'MIC', sublabel: 'RMS' },
  { key: 'ws', label: 'LINK', sublabel: 'WS' },
];

export default function SensorStatusBar({ statuses = {}, sampleRate = 0 }) {
  return (
    <View style={styles.container}>
      {SENSORS.map((sensor) => {
        const status = statuses[sensor.key] || 'off';
        const color = getStatusColor(status);

        return (
          <View key={sensor.key} style={styles.sensor}>
            <View style={[styles.dot, { backgroundColor: color }]}>
              {status === 'active' && <View style={[styles.pulse, { borderColor: color }]} />}
            </View>
            <Text style={[styles.label, { color }]}>{sensor.label}</Text>
            <Text style={styles.sublabel}>
              {sensor.key === 'imu' && status === 'active' ? `${sampleRate}Hz` : sensor.sublabel}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return COLORS.primary; // Premium primary color for active
    case 'degraded': return COLORS.amber;
    case 'error': return COLORS.red;
    default: return COLORS.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sensor: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    opacity: 0.4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sublabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
});
