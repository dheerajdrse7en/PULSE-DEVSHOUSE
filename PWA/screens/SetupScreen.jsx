/**
 * SetupScreen — Configure server, session name, camera height
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const STORAGE_KEYS = {
  SERVER_HOST: 'pulse_server_host',
  CAMERA_HEIGHT: 'pulse_camera_height',
  SEGMENT_LENGTH: 'pulse_segment_length',
  TEST_MODE: 'pulse_test_mode',
};

export default function SetupScreen({ navigation }) {
  const [serverHost, setServerHost] = useState('192.168.1.100:8000');
  const [sessionName, setSessionName] = useState('');
  const [cameraHeightM, setCameraHeightM] = useState('1.20');
  const [segmentLengthM, setSegmentLengthM] = useState('100');
  const [isTestMode, setIsTestMode] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    loadSavedSettings();
    generateSessionName();
  }, []);

  async function loadSavedSettings() {
    try {
      const [host, height, segLen, testMode] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SERVER_HOST),
        AsyncStorage.getItem(STORAGE_KEYS.CAMERA_HEIGHT),
        AsyncStorage.getItem(STORAGE_KEYS.SEGMENT_LENGTH),
        AsyncStorage.getItem(STORAGE_KEYS.TEST_MODE),
      ]);
      if (host) setServerHost(host);
      if (height) setCameraHeightM(height);
      if (segLen) setSegmentLengthM(segLen);
      if (testMode !== null) setIsTestMode(testMode === 'true');
    } catch (e) {
      // Use defaults
    }
  }

  function generateSessionName() {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setSessionName(`Session ${date} ${time}`);
  }

  async function saveSettings() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SERVER_HOST, serverHost),
        AsyncStorage.setItem(STORAGE_KEYS.CAMERA_HEIGHT, cameraHeightM),
        AsyncStorage.setItem(STORAGE_KEYS.SEGMENT_LENGTH, segmentLengthM),
        AsyncStorage.setItem(STORAGE_KEYS.TEST_MODE, isTestMode ? 'true' : 'false'),
      ]);
    } catch (e) {
      // Non-critical
    }
  }

  async function testConnection() {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    try {
      const isHttps = serverHost.startsWith('https://');
      const cleanHost = serverHost.replace(/^https?:\/\//, '');
      const _host = isHttps ? `https://${cleanHost}` : `http://${cleanHost}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${_host}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setConnectionStatus(response.ok ? 'ok' : 'fail');
    } catch (e) {
      setConnectionStatus('fail');
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function startSession() {
    if (!sessionName.trim()) {
      Alert.alert('Session Name Required', 'Please enter a name for this session.');
      return;
    }
    const cameraHeight = parseFloat(cameraHeightM);
    if (isNaN(cameraHeight) || cameraHeight < 0.5 || cameraHeight > 3.0) {
      Alert.alert('Invalid Camera Height', 'Camera height must be between 0.5m and 3.0m.');
      return;
    }
    await saveSettings();
    navigation.navigate('Recording', {
      sessionName: sessionName.trim(),
      serverHost: serverHost.trim(),
      cameraHeightM: cameraHeight,
      segmentLengthM: parseInt(segmentLengthM, 10) || 100,
      isTestMode: isTestMode,
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg1} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>PULSE</Text>
        <Text style={styles.logoSub}>COLLECTOR</Text>
        <Text style={styles.tagline}>Intelligent Road Assessment Platform</Text>
      </View>

      <View style={styles.divider} />

      {/* Server Config */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BACKEND SERVER</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={serverHost}
            onChangeText={setServerHost}
            placeholder="192.168.x.x:8000 or pulse.example.com"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity
            style={[styles.testBtn,
            connectionStatus === 'ok' && styles.testBtnOk,
            connectionStatus === 'fail' && styles.testBtnFail,
            ]}
            onPress={testConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={[styles.testBtnText,
              connectionStatus === 'ok' && { color: COLORS.green },
              connectionStatus === 'fail' && { color: COLORS.red },
              ]}>
                {connectionStatus === 'ok' ? '✓ OK' : connectionStatus === 'fail' ? '✗ FAIL' : 'TEST'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Local network: <Text style={styles.code}>uvicorn main:app --host 0.0.0.0</Text>
        </Text>
      </View>

      {/* Session Config */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SESSION</Text>
        <TextInput
          style={styles.input}
          value={sessionName}
          onChangeText={setSessionName}
          placeholder="Session name..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Sensor Config */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SENSOR PARAMETERS</Text>
        <View style={styles.paramRow}>
          <View style={styles.paramField}>
            <TextInput
              style={styles.inputSmall}
              value={cameraHeightM}
              onChangeText={setCameraHeightM}
              keyboardType="decimal-pad"
              placeholder="1.20"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.hintCenter}>Height (m)</Text>
          </View>
          <View style={styles.paramField}>
            <TextInput
              style={styles.inputSmall}
              value={segmentLengthM}
              onChangeText={setSegmentLengthM}
              keyboardType="number-pad"
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.hintCenter}>Target Len (m)</Text>
          </View>
        </View>
      </View>

      {/* Pre-flight */}
      <View style={styles.checklist}>
        <Text style={styles.sectionLabel}>PRE-FLIGHT CHECKLIST</Text>
        {[
          'Phone mounted rigidly vertically',
          'Rear camera facing road surface',
          'Drive speed must exceed 20 km/h',
        ].map((item, i) => (
          <View key={i} style={styles.checkItem}>
            <View style={styles.checkDot} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {/* Start Actions */}
      <View style={styles.actionGroup}>
        <TouchableOpacity
          style={styles.testModeToggle}
          onPress={() => setIsTestMode(!isTestMode)}
        >
          <View style={[styles.checkbox, isTestMode && styles.checkboxActive]} />
          <Text style={styles.testModeText}>Simulation Mode (Desk Testing)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.startBtn} onPress={startSession} activeOpacity={0.8}>
          <Text style={styles.startBtnText}>INITIALIZE HARDWARE</Text>
          <Text style={styles.startBtnSub}>Imu · Gps · Camera · Audio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.historyLink} onPress={() => navigation.navigate('History')}>
          <Text style={styles.historyLinkText}>SESSION HISTORY</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg1 },
  content: { padding: SPACING.lg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60, minHeight: '100%', gap: SPACING.lg, paddingBottom: Platform.OS === 'android' ? 80 : SPACING.xxl },
  header: { alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  logo: { fontSize: 48, fontWeight: '100', color: COLORS.textPrimary, letterSpacing: 10 },
  logoSub: { fontSize: 13, color: COLORS.primary, letterSpacing: 6, fontWeight: '700' },
  tagline: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5, marginTop: 4, textAlign: 'center' },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 2, fontWeight: '600', marginBottom: 4 },

  inputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: COLORS.bg2, borderWidth: 1, borderColor: COLORS.borderBright,
    borderRadius: RADIUS.md, color: COLORS.textPrimary, paddingHorizontal: SPACING.md,
    paddingVertical: 14, fontSize: 15, letterSpacing: 0.2,
  },
  inputSmall: {
    backgroundColor: COLORS.bg2, borderWidth: 1, borderColor: COLORS.borderBright,
    borderRadius: RADIUS.md, color: COLORS.textPrimary, paddingHorizontal: SPACING.md,
    paddingVertical: 14, fontSize: 16, textAlign: 'center', fontWeight: '500'
  },

  testBtn: {
    backgroundColor: COLORS.bg2, borderWidth: 1, borderColor: COLORS.borderBright,
    borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 14, minWidth: 80, alignItems: 'center', justifyContent: 'center'
  },
  testBtnOk: { borderColor: COLORS.green + '80', backgroundColor: COLORS.greenFaint },
  testBtnFail: { borderColor: COLORS.red + '80', backgroundColor: COLORS.redFaint },
  testBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 1 },

  hint: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  hintCenter: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, textAlign: 'center', marginTop: 4 },
  code: { color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10 },

  paramRow: { flexDirection: 'row', gap: SPACING.md },
  paramField: { flex: 1 },

  checklist: { gap: 8, marginTop: SPACING.sm, backgroundColor: COLORS.bg2, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  checkItem: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  checkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  checkText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },

  actionGroup: { gap: SPACING.md, marginTop: SPACING.xl, paddingBottom: SPACING.xl },
  testModeToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', paddingBottom: SPACING.sm },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: COLORS.borderBright, backgroundColor: COLORS.bg2 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  testModeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  startBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center', gap: 4,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
  },
  startBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '800', letterSpacing: 2 },
  startBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  historyLink: { alignItems: 'center', paddingVertical: SPACING.sm },
  historyLinkText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 2, fontWeight: '600' },
});
