/**
 * HistoryScreen — Past sessions list with stats and upload option (Premium UI)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
  RefreshControl, Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getSessions, deleteSession, getSessionStats, exportSessionJSON } from '../services/OfflineBuffer';
import { COLORS, SPACING, RADIUS, getIRIColor, getIRILabel } from '../utils/theme';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionStats, setSessionStats] = useState({});

  useEffect(() => { loadSessions(); }, []);
  useFocusEffect(useCallback(() => { loadSessions(); }, []));

  async function loadSessions(isRefresh = false) {
    if (isRefresh) setIsRefreshing(true); else setIsLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
      const stats = {};
      for (const session of data) {
        try { stats[session.id] = await getSessionStats(session.id); }
        catch (e) { /* none yet */ }
      }
      setSessionStats(stats);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setIsLoading(false); setIsRefreshing(false);
    }
  }

  async function handleDelete(session) {
    Alert.alert('Delete Session', `Remove "${session.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSession(session.id); loadSessions(); } }
    ]);
  }

  async function handleExport(session) {
    try {
      const json = await exportSessionJSON(session.id);

      // Default fallback if session didn't save the host
      let host = session.server_host || '192.168.0.109:8000';

      let cleanHost = host.trim();
      const isHttps = cleanHost.startsWith('https://');
      cleanHost = cleanHost.replace(/^https?:\/\//, '');
      const _host = isHttps ? `https://${cleanHost}` : `http://${cleanHost}`;

      console.log('[EXPORT] Attempting to POST to:', `${_host}/api/sessions/import`);

      // Add a manual timeout abort controller since RN fetch can hang forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${_host}/api/sessions/import`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: json,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with HTTP ${response.status}`);
      }

      Alert.alert('Export Complete', `Successfully uploaded to ${_host}`);
    } catch (e) {
      if (e.name === 'AbortError') {
        Alert.alert('Export Failed', 'Request timed out. Check if the backend is running at your designated IP address.');
      } else {
        Alert.alert('Network Error', `Could not reach server. Verify your IP setting.\n\nDetails: ${e.message}`);
      }
    }
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  function formatDistance(m) {
    if (!m) return '—';
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
  }

  function formatDuration(startedAt, endedAt) {
    if (!endedAt) return 'in progress';
    const secs = Math.floor((endedAt - startedAt) / 1000);
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  function renderSession({ item: session }) {
    const stats = sessionStats[session.id];
    const avgIRI = session.avg_iri;
    const iriColor = getIRIColor(avgIRI);
    const iriLabel = getIRILabel(avgIRI);
    const isRecording = session.status === 'recording';

    return (
      <View style={[styles.sessionCard, isRecording && styles.sessionCardRecording]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.sessionName} numberOfLines={1}>{session.name}</Text>
            <Text style={styles.sessionDate}>{formatDate(session.started_at)}</Text>
          </View>
          {isRecording && (
            <View style={styles.recordingBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recordingBadgeText}>LIVE</Text>
            </View>
          )}
          {!isRecording && avgIRI != null && (
            <View style={styles.iriBadge}>
              <Text style={[styles.iriBadgeVal, { color: iriColor }]}>{avgIRI.toFixed(1)}</Text>
              <Text style={styles.iriBadgeLabel}>{iriLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <Stat name="DISTANCE" value={formatDistance(session.distance_m)} />
          <Stat name="SEGMENTS" value={session.segment_count || '0'} />
          <Stat name="DURATION" value={formatDuration(session.started_at, session.ended_at)} />
          {stats && stats.segment_count > 0 && (
            <Stat name="PEAK IRI" value={stats.max_iri ? stats.max_iri.toFixed(1) : '—'} />
          )}
        </View>

        {stats && stats.segment_count > 0 && (
          <View style={styles.barWrap}>
            <View style={styles.barTrack}>
              {[
                { k: 'good_count', c: COLORS.iriGood },
                { k: 'fair_count', c: COLORS.iriFair },
                { k: 'poor_count', c: COLORS.iriPoor },
                { k: 'very_poor_count', c: COLORS.iriVeryPoor },
              ].map(({ k, c }) => {
                const count = stats[k] || 0;
                const flex = count / stats.segment_count;
                if (!flex) return null;
                return <View key={k} style={{ flex, backgroundColor: c }} />;
              })}
            </View>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleExport(session)}>
            <Text style={styles.actionBtnText}>EXPORT JSON</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(session)}>
            <Text style={[styles.actionBtnText, { color: COLORS.red }]}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg1} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>COLLECTOR HISTORY</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Fetching Records...</Text></View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}><Text style={styles.emptyTitle}>NO SESSIONS</Text><Text style={styles.emptySubtitle}>Start a session from the main screen.</Text></View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadSessions(true)} tintColor={COLORS.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ name, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxLabel}>{name}</Text>
      <Text style={styles.statBoxValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + SPACING.md : 60,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg1
  },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  title: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700', letterSpacing: 2 },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  sessionCard: { backgroundColor: COLORS.bg2, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.md },
  sessionCardRecording: { borderColor: COLORS.red + '60' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flex: 1, gap: 4 },
  sessionName: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700', letterSpacing: 0.2 },
  sessionDate: { fontSize: 11, color: COLORS.textMuted },

  recordingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: COLORS.redFaint, borderWidth: 1, borderColor: COLORS.red + '40' },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red },
  recordingBadgeText: { fontSize: 10, color: COLORS.red, fontWeight: '800', letterSpacing: 1 },

  iriBadge: { alignItems: 'flex-end' },
  iriBadgeVal: { fontSize: 24, fontWeight: '300', fontVariant: ['tabular-nums'], lineHeight: 28 },
  iriBadgeLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: COLORS.bg3, padding: 10, borderRadius: RADIUS.sm },
  statBoxLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, fontWeight: '600', marginBottom: 2 },
  statBoxValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },

  barWrap: { height: 6, backgroundColor: COLORS.bg3, borderRadius: 3, overflow: 'hidden' },
  barTrack: { flexDirection: 'row', height: '100%' },

  cardActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, alignItems: 'center' },
  actionBtnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.borderBright },
  actionBtnText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  emptyTitle: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 2 },
  emptySubtitle: { fontSize: 12, color: COLORS.textMuted },
  loadingText: { fontSize: 12, color: COLORS.textMuted },
});
