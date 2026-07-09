/**
 * PULSE WebSocket Client
 */

const MAX_QUEUE_SIZE = 2000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const HEARTBEAT_INTERVAL = 5000;

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.serverUrl = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.shouldReconnect = false;
    this.destroyed = false;

    this.queue = [];
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;

    this.onConnected = null;
    this.onDisconnected = null;
    this.onSegmentComplete = null;
    this.onError = null;
    this.onQueueDrain = null;
  }

  connect(host, sessionId) {
    if (this.isConnecting || this.isConnected) return;

    this.destroyed = false;

    // Robust URL parsing for local vs cloud
    let cleanHost = host.trim();
    const isHttps = cleanHost.startsWith('https://');
    cleanHost = cleanHost.replace(/^https?:\/\//, '');

    // Auto-upgrade to WSS for known cloud tunnels
    const protocol = (isHttps || cleanHost.includes('ngrok') || cleanHost.includes('vercel.app')) ? 'wss' : 'ws';

    this.serverUrl = `${protocol}://${cleanHost}/ws/${sessionId}`;
    this.sessionId = sessionId;
    this.shouldReconnect = true;
    this._connect();
  }

  _connect() {
    if (this.isConnecting || this.destroyed) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        if (this.destroyed) { this.ws.close(); return; } // FIX
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        console.log('[WS] Connected to', this.serverUrl);
        this._startHeartbeat();
        this._drainQueue();

        if (this.onConnected) this.onConnected();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (e) {
          console.warn('[WS] Parse error:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('[WS] Error:', error);
        if (this.onError) this.onError(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this._stopHeartbeat();

        console.log('[WS] Disconnected');
        if (this.onDisconnected) this.onDisconnected();

        // FIX: check destroyed flag — prevents reconnect after explicit disconnect()
        if (this.shouldReconnect && !this.destroyed) {
          this._scheduleReconnect();
        }
      };
    } catch (e) {
      this.isConnecting = false;
      console.error('[WS] Connection failed:', e);
      if (this.shouldReconnect && !this.destroyed) this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_MS
    );
    this.reconnectAttempts++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.destroyed) this._connect(); // FIX
    }, delay);
  }

  _handleMessage(data) {
    if (data.type === 'SEGMENT_COMPLETE' || data.type === 'segment_result') {
      const segmentData = data.segment || data.data;
      if (this.onSegmentComplete) this.onSegmentComplete(segmentData);
    } else if (data.type === 'PONG') {
      // Heartbeat acknowledged
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this._rawSend(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(packet) {
    if (!packet || !packet.type) return;

    // The backend SegmentManager expects {"type": "gps"|"imu"|"camera"|"audio", "data": {...}}
    // But the React Native hooks generate flat objects: {"type": "GPS", "lat": ...}
    // We must map them here to bridge the two systems.

    // 1. Lowercase the type (e.g., 'GPS' -> 'gps')
    const backendType = packet.type.toLowerCase();

    // 2. Remove 'type' and 'timestamp' from the inner data payload
    const { type, timestamp, ...dataPayload } = packet;

    // 3. Construct the nested payload
    const nestedPacket = {
      type: backendType,
      timestamp: timestamp || Date.now(),
      data: dataPayload
    };

    const json = JSON.stringify(nestedPacket);

    if (this.isConnected) {
      this._rawSend(json);
    } else {
      if (this.queue.length < MAX_QUEUE_SIZE) {
        this.queue.push(json);
      }
    }
  }

  _rawSend(json) {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(json);
      }
    } catch (e) {
      console.warn('[WS] Send failed:', e);
    }
  }

  async _drainQueue() {
    if (this.queue.length === 0) return;
    console.log(`[WS] Draining ${this.queue.length} queued packets`);
    const toSend = [...this.queue];
    this.queue = [];
    
    // Throttle the drain to prevent flooding the backend and crashing the socket
    for (let i = 0; i < toSend.length; i++) {
       if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) break;
       this._rawSend(toSend[i]);
       await new Promise(r => setTimeout(r, 5)); 
    }
    
    if (this.onQueueDrain) this.onQueueDrain(toSend.length);
  }

  disconnect() {
    this.destroyed = true;      // FIX: set BEFORE close so onclose doesn't reconnect
    this.shouldReconnect = false;
    this._stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.queue = []; // FIX: clear queue on disconnect — stale packets shouldn't be sent to new session
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      queueSize: this.queue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
