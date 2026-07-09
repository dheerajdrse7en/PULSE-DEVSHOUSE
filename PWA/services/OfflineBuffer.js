/**
 * PULSE Offline Buffer — SQLite-backed session storage
 */

import * as SQLite from 'expo-sqlite';

let db = null;
let dbInitPromise = null; // FIX: prevent race condition on concurrent getDB() calls

async function getDB() {
  if (db) return db;

  // FIX: if init is already in progress, wait for it instead of starting a second init
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    db = await SQLite.openDatabaseAsync('pulse.db');
    await initSchema();
    return db;
  })();

  return dbInitPromise;
}

async function initSchema() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      server_host TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      status TEXT DEFAULT 'recording',
      distance_m REAL DEFAULT 0,
      segment_count INTEGER DEFAULT 0,
      avg_iri REAL,
      gps_start_lat REAL,
      gps_start_lng REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS buffered_packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      packet_type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      payload TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      lat REAL,
      lng REAL,
      iri_value REAL,
      iri_condition TEXT,
      rut_depth_mm REAL,
      surface_type TEXT,
      final_condition TEXT,
      distance_start_m REAL,
      distance_end_m REAL,
      timestamp INTEGER NOT NULL,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_buffered_session ON buffered_packets(session_id, synced);
    CREATE INDEX IF NOT EXISTS idx_segments_session ON segments(session_id);
  `);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession({ id, name, serverHost }) {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO sessions (id, name, server_host, started_at) VALUES (?, ?, ?, ?)`,
    [id, name, serverHost || null, Date.now()]
  );
  return id;
}

export async function updateSession(id, updates) {
  const database = await getDB();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  await database.runAsync(`UPDATE sessions SET ${fields} WHERE id = ?`, values);
}

export async function finalizeSession(id, { distanceM, segmentCount, avgIRI }) {
  const database = await getDB();
  await database.runAsync(
    `UPDATE sessions SET ended_at = ?, status = 'completed', distance_m = ?, segment_count = ?, avg_iri = ? WHERE id = ?`,
    [Date.now(), distanceM, segmentCount, avgIRI, id]
  );
}

export async function getSessions() {
  const database = await getDB();
  return await database.getAllAsync(`SELECT * FROM sessions ORDER BY started_at DESC`);
}

export async function getSession(id) {
  const database = await getDB();
  return await database.getFirstAsync(`SELECT * FROM sessions WHERE id = ?`, [id]);
}

export async function deleteSession(id) {
  const database = await getDB();
  await database.runAsync(`DELETE FROM segments WHERE session_id = ?`, [id]);
  await database.runAsync(`DELETE FROM buffered_packets WHERE session_id = ?`, [id]);
  await database.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
}

// ─── Buffered Packets ──────────────────────────────────────────────────────────

export async function bufferPacket(sessionId, packet) {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO buffered_packets (session_id, packet_type, timestamp, payload) VALUES (?, ?, ?, ?)`,
    [sessionId, packet.type, packet.timestamp, JSON.stringify(packet)]
  );
}

export async function getUnsyncedPackets(sessionId, limit = 200) {
  const database = await getDB();
  return await database.getAllAsync(
    `SELECT * FROM buffered_packets WHERE session_id = ? AND synced = 0 ORDER BY timestamp ASC LIMIT ?`,
    [sessionId, limit]
  );
}

export async function markPacketsSynced(ids) {
  if (!ids || ids.length === 0) return;
  const database = await getDB();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE buffered_packets SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

export async function getBufferedPacketCount(sessionId) {
  const database = await getDB();
  const result = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM buffered_packets WHERE session_id = ? AND synced = 0`,
    [sessionId]
  );
  return result?.count || 0;
}

// ─── Segments ─────────────────────────────────────────────────────────────────

export async function saveSegment(sessionId, segmentIndex, segmentData) {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO segments (session_id, segment_index, lat, lng, iri_value, iri_condition,
      rut_depth_mm, surface_type, final_condition, distance_start_m, distance_end_m, timestamp, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      segmentIndex,
      segmentData.gps?.lat || null,
      segmentData.gps?.lng || null,
      segmentData.iri_value || null,
      segmentData.iri_condition || null,
      segmentData.rut_depth_mm || null,
      segmentData.surface_type || null,
      segmentData.final_condition || null,
      segmentData.distance_start_m || null,
      segmentData.distance_end_m || null,
      Date.now(),
      JSON.stringify(segmentData),
    ]
  );
}

export async function getSegments(sessionId) {
  const database = await getDB();
  return await database.getAllAsync(
    `SELECT * FROM segments WHERE session_id = ? ORDER BY segment_index ASC`,
    [sessionId]
  );
}

export async function getSessionStats(sessionId) {
  const database = await getDB();
  return await database.getFirstAsync(
    `SELECT
       COUNT(*) as segment_count,
       AVG(iri_value) as avg_iri,
       MAX(iri_value) as max_iri,
       MIN(iri_value) as min_iri,
       SUM(CASE WHEN iri_condition = 'Good' THEN 1 ELSE 0 END) as good_count,
       SUM(CASE WHEN iri_condition = 'Fair' THEN 1 ELSE 0 END) as fair_count,
       SUM(CASE WHEN iri_condition = 'Poor' THEN 1 ELSE 0 END) as poor_count,
       SUM(CASE WHEN iri_condition = 'Very Poor' THEN 1 ELSE 0 END) as very_poor_count
     FROM segments WHERE session_id = ?`,
    [sessionId]
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export async function exportSessionJSON(sessionId) {
  const session = await getSession(sessionId);
  const segments = await getSegments(sessionId);
  return JSON.stringify({ session, segments, exported_at: new Date().toISOString() });
}
