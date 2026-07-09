/**
 * RecordingScreen — Main recording interface (Premium UI & Decoupled Logic)
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Platform
} from 'react-native';
import { CameraView } from 'expo-camera';
import { useRoute } from '@react-navigation/native';

import { useRecordingEngine } from '../hooks/useRecordingEngine';

import SensorStatusBar from '../components/SensorStatusBar';
import AccelWaveform from '../components/AccelWaveform';
import IRIGauge from '../components/IRIGauge';
import SegmentHistory from '../components/SegmentHistory';

import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function RecordingScreen() {
  const route = useRoute();
  const { sessionName, serverHost, segmentLengthM, isTestMode } = route.params;

  const {
    isRecording,
    display,
    completedSegments,
    queueSize,
    segIndex,
    sensorStatuses,
    imu,
    camera,
    startRecording,
    stopRecording
  } = useRecordingEngine({ sessionName, serverHost, segmentLengthM, isTestMode });

  function formatElapsed(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDistance(meters) {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  }

  const wsStatus = display.wsStatus;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg0} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.sessionName} numberOfLines={1}>{sessionName}</Text>
          <Text style={styles.sessionMeta}>
            {isRecording ? formatElapsed(display.elapsedSeconds) : 'READY'} · {formatDistance(display.distanceM)} · SEG {segIndex}
          </Text>
        </View>
        <View style={[
          styles.wsBadge,
          wsStatus === 'connected' && styles.wsBadgeConnected,
          wsStatus === 'connecting' && styles.wsBadgeConnecting,
          wsStatus === 'disconnected' && styles.wsBadgeDisconnected,
        ]}>
          <Text style={[
            styles.wsBadgeText,
            wsStatus === 'connected' && { color: COLORS.green },
            wsStatus === 'connecting' && { color: COLORS.amber },
            wsStatus === 'disconnected' && { color: COLORS.red },
          ]}>
            {wsStatus === 'connected' ? '● LIVE' : wsStatus === 'connecting' ? '◌ LINKING' : wsStatus === 'disconnected' ? '○ OFFLINE' : '○ IDLE'}
          </Text>
          {queueSize > 0 && <Text style={styles.queueBadge}>{queueSize}Q</Text>}
        </View>
      </View>

      {/* Sensor Bar */}
      <View style={styles.sensorBar}>
        <SensorStatusBar statuses={sensorStatuses} sampleRate={imu.sampleRate} />
      </View>

      {/* Scrollable content */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} bounces={false}>

        {/* Camera (Flex-based now, no hardcoded height) */}
        <View style={styles.cameraContainer}>
          {camera.hasPermission ? (
            <CameraView ref={camera.cameraRef} style={styles.camera} facing="back" pictureSize={camera.pictureSize} onCameraReady={camera.handleCameraReady} />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.cameraPlaceholderText}>CAM PERMISSION REQUIRED</Text>
            </View>
          )}
          {isRecording && !display.isSpeedValid && (
            <View style={styles.speedWarning}>
              <Text style={styles.speedWarningText}>⚠ SPEED &lt; 20 km/h</Text>
            </View>
          )}
          {display.gpsCoords && (
            <View style={styles.gpsOverlay}>
              <Text style={styles.gpsText}>{display.gpsCoords.lat.toFixed(5)}, {display.gpsCoords.lng.toFixed(5)}</Text>
            </View>
          )}
        </View>

        {/* Data Panels */}
        <View style={styles.dataPanels}>
          <View style={styles.iriPanel}>
            <IRIGauge iri={display.currentIRI} isValid={display.isSpeedValid || !isRecording} />
            <Text style={styles.iriNote}>LIVE IRI ESTIMATE</Text>
          </View>
          <View style={styles.rightDataCol}>
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxLabel}>SPEED (km/h)</Text>
              <Text style={[styles.cardBoxValue, { color: display.isSpeedValid ? COLORS.green : COLORS.amber }]}>
                {display.speedKmh.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.cardBox, { flex: 1 }]}>
              <Text style={styles.cardBoxLabel}>ACCEL Z (m/s²)</Text>
              <View style={styles.waveformWrap}>
                <AccelWaveform value={display.accelZ} />
              </View>
            </View>
          </View>
        </View>

        {/* Segment Progress */}
        {isRecording && (
          <View style={styles.segmentProgress}>
            <View style={styles.segmentProgressTrack}>
              <View style={[styles.segmentProgressFill, {
                width: `${Math.min(100, (display.currentSegmentDistance / segmentLengthM) * 100)}%`,
              }]} />
            </View>
            <Text style={styles.segmentProgressText}>
              {Math.round(display.currentSegmentDistance)}m / {segmentLengthM}m  ·  SEGMENT {segIndex + 1}
            </Text>
          </View>
        )}

        {/* Segment History */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyLabel}>COMPLETED SEGMENTS</Text>
          <SegmentHistory segments={completedSegments} />
        </View>

      </ScrollView>

      {/* Button Area */}
      <View style={styles.buttonArea}>
        {!isRecording ? (
          <TouchableOpacity style={styles.recordBtn} onPress={startRecording} activeOpacity={0.8}>
            <View style={styles.recordBtnInner}><View style={styles.recordDot} /></View>
            <Text style={styles.recordBtnLabel}>START SESSION</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording} activeOpacity={0.8}>
            <View style={styles.stopBtnInner}><View style={styles.stopSquare} /></View>
            <Text style={styles.stopBtnLabel}>STOP RECORDING</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerInfo: { flex: 1 },
  sessionName: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '700', letterSpacing: 0.2 },
  sessionMeta: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.5, marginTop: 4 },
  wsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg2,
  },
  wsBadgeConnected: { borderColor: COLORS.greenFaint, backgroundColor: COLORS.bg2 },
  wsBadgeConnecting: { borderColor: COLORS.amberFaint, backgroundColor: COLORS.bg2 },
  wsBadgeDisconnected: { borderColor: COLORS.redFaint, backgroundColor: COLORS.bg2 },
  wsBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: COLORS.textSecondary },
  queueBadge: { fontSize: 10, color: COLORS.amber, fontWeight: '600' },

  sensorBar: { paddingHorizontal: SPACING.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  scrollArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: SPACING.xl },

  cameraContainer: {
    aspectRatio: 16 / 9, backgroundColor: COLORS.bg2, position: 'relative',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    overflow: 'hidden'
  },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraPlaceholderText: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 1 },

  speedWarning: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  speedWarningText: {
    fontSize: 11, color: COLORS.amber, backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.lg,
    fontWeight: '700', letterSpacing: 1, overflow: 'hidden'
  },
  gpsOverlay: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, overflow: 'hidden' },
  gpsText: { fontSize: 10, color: COLORS.primary, letterSpacing: 0.5 },

  dataPanels: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iriPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.bg2, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderBright },
  iriNote: { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1, fontWeight: '600' },

  rightDataCol: { flex: 1, gap: SPACING.sm },
  cardBox: { backgroundColor: COLORS.bg2, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderBright, justifyContent: 'center' },
  cardBoxLabel: { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1, fontWeight: '600', marginBottom: 4 },
  cardBoxValue: { fontSize: 32, fontWeight: '300', fontVariant: ['tabular-nums'] },
  waveformWrap: { flex: 1, marginTop: 4, minHeight: 40 },

  segmentProgress: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: 8 },
  segmentProgressTrack: { height: 4, backgroundColor: COLORS.bg3, borderRadius: 2, overflow: 'hidden' },
  segmentProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  segmentProgressText: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1, textAlign: 'right' },

  historyContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.sm },
  historyLabel: { fontSize: 11, color: COLORS.textPrimary, letterSpacing: 1, fontWeight: '600' },

  buttonArea: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg1 },
  recordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: 18 },
  recordBtnInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  recordDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.white },
  recordBtnLabel: { fontSize: 16, color: COLORS.white, fontWeight: '700', letterSpacing: 2 },

  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.borderBright, borderRadius: RADIUS.xl, paddingVertical: 18 },
  stopBtnInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.borderBright, justifyContent: 'center', alignItems: 'center' },
  stopSquare: { width: 12, height: 12, backgroundColor: COLORS.textPrimary, borderRadius: 2 },
  stopBtnLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '700', letterSpacing: 2 },
});
