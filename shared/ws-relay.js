/**
 * Couch Arcade — Zero-Dependency MQTT 3.1.1 over WSS Relay (shared/ws-relay.js)
 * Works across 5G <-> Wi-Fi, symmetric NAT, iOS Safari Private Relay, and Smart TVs
 * whenever WebRTC P2P DataChannels are blocked or still negotiating.
 */
(function (global) {
  'use strict';

  const BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
  ];

  const te = new TextEncoder();
  const td = new TextDecoder();

  function getScope() {
    const raw = (global.location && global.location.host) ? global.location.host : 'local';
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'local';
  }

  function encodeVarLen(len) {
    const out = [];
    let x = len;
    do {
      let b = x & 0x7f;
      x >>>= 7;
      if (x > 0) b |= 0x80;
      out.push(b);
    } while (x > 0);
    return out;
  }

  function encodeStr(str) {
    const bytes = te.encode(String(str));
    const out = new Uint8Array(2 + bytes.length);
    out[0] = (bytes.length >> 8) & 0xff;
    out[1] = bytes.length & 0xff;
    out.set(bytes, 2);
    return out;
  }

  function concatBytes(parts) {
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      out.set(p, off);
      off += p.length;
    }
    return out;
  }

  function buildConnectPacket(clientId, keepAliveSec = 30) {
    const proto = encodeStr('MQTT');
    const flags = new Uint8Array([0x04, 0x02, (keepAliveSec >> 8) & 0xff, keepAliveSec & 0xff]); // v3.1.1, CleanSession=1
    const cid = encodeStr(clientId);
    const body = concatBytes([proto, flags, cid]);
    const header = new Uint8Array([0x10, ...encodeVarLen(body.length)]);
    return concatBytes([header, body]);
  }

  function buildSubscribePacket(packetId, topic) {
    const pid = new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff]);
    const t = encodeStr(topic);
    const qos = new Uint8Array([0x00]);
    const body = concatBytes([pid, t, qos]);
    const header = new Uint8Array([0x82, ...encodeVarLen(body.length)]);
    return concatBytes([header, body]);
  }

  function buildPublishPacket(topic, payloadStr) {
    const t = encodeStr(topic);
    const payload = te.encode(payloadStr);
    const body = concatBytes([t, payload]);
    const header = new Uint8Array([0x30, ...encodeVarLen(body.length)]); // QoS 0, Retain 0
    return concatBytes([header, body]);
  }

  function buildPingReqPacket() {
    return new Uint8Array([0xc0, 0x00]);
  }

  class WsRelayChannel {
    constructor(channelPath, opts = {}) {
      this.topic = `couch-arcade/v2/${getScope()}/${String(channelPath).replace(/^\/+/, '')}`;
      this.onOpen = opts.onOpen || (() => {});
      this.onMessage = opts.onMessage || (() => {});
      this.onClose = opts.onClose || (() => {});

      this.ws = null;
      this.connected = false;
      this.destroyed = false;
      this.brokerIdx = 0;
      this.packetId = 1;
      this.rxBuf = new Uint8Array(0);
      this.pingTimer = null;
      this.retryTimer = null;
      this.connectWatchdog = null;
      this.outQueue = [];

      this._onVisibility = () => {
        if (!this.destroyed && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (!this.connected && (!this.ws || this.ws.readyState !== 0)) {
            this._connect();
          }
        }
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this._onVisibility);
      }
    }

    connect() {
      if (this.destroyed) return;
      this._connect();
    }

    _connect() {
      if (this.destroyed) return;
      this._cleanupSocket();

      const brokerUrl = BROKERS[this.brokerIdx % BROKERS.length];
      const clientId = 'ca_' + Math.random().toString(36).slice(2, 12) + '_' + (Date.now() % 10000);

      let ws;
      try {
        ws = new WebSocket(brokerUrl, ['mqtt']);
      } catch (e) {
        this._scheduleReconnect(true);
        return;
      }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      this.rxBuf = new Uint8Array(0);

      this.connectWatchdog = setTimeout(() => {
        if (!this.connected && this.ws === ws) {
          try { ws.close(); } catch (e) {}
          this._scheduleReconnect(true);
        }
      }, 4500);

      ws.addEventListener('open', () => {
        if (this.destroyed || this.ws !== ws) return;
        try {
          ws.send(buildConnectPacket(clientId, 30));
        } catch (e) {
          this._scheduleReconnect(true);
        }
      });

      ws.addEventListener('message', (ev) => {
        if (this.destroyed || this.ws !== ws) return;
        const chunk = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : null;
        if (!chunk || chunk.length === 0) return;
        this._appendAndParse(chunk);
      });

      const onDrop = () => {
        if (this.ws !== ws) return;
        const wasConnected = this.connected;
        this.connected = false;
        this._cleanupSocket();
        if (wasConnected) this.onClose();
        if (!this.destroyed) {
          this._scheduleReconnect(!wasConnected);
        }
      };

      ws.addEventListener('close', onDrop);
      ws.addEventListener('error', onDrop);
    }

    _appendAndParse(chunk) {
      const merged = new Uint8Array(this.rxBuf.length + chunk.length);
      merged.set(this.rxBuf, 0);
      merged.set(chunk, this.rxBuf.length);
      this.rxBuf = merged;

      while (this.rxBuf.length >= 2) {
        const typeByte = this.rxBuf[0];
        let mult = 1;
        let remLen = 0;
        let idx = 1;
        let completeLen = false;
        while (idx < this.rxBuf.length && idx <= 4) {
          const b = this.rxBuf[idx++];
          remLen += (b & 0x7f) * mult;
          mult *= 128;
          if ((b & 0x80) === 0) {
            completeLen = true;
            break;
          }
        }
        if (!completeLen) break;
        const totalLen = idx + remLen;
        if (this.rxBuf.length < totalLen) break;

        const body = this.rxBuf.subarray(idx, totalLen);
        this.rxBuf = this.rxBuf.subarray(totalLen);
        this._handleMqttPacket(typeByte, body);
      }
    }

    _handleMqttPacket(typeByte, body) {
      const pktType = typeByte >>> 4;

      if (pktType === 2) {
        // CONNACK
        const returnCode = body.length >= 2 ? body[1] : 1;
        if (returnCode !== 0) {
          this._scheduleReconnect(true);
          return;
        }
        clearTimeout(this.connectWatchdog);
        this.connected = true;
        try {
          this.ws.send(buildSubscribePacket(this.packetId++, this.topic));
        } catch (e) {}

        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.connected && this.ws && this.ws.readyState === 1) {
            try { this.ws.send(buildPingReqPacket()); } catch (e) {}
          }
        }, 22000);

        // Flush any queued messages
        const pending = this.outQueue.splice(0, this.outQueue.length);
        for (const str of pending) {
          this._sendRaw(str);
        }
        this.onOpen();
        return;
      }

      if (pktType === 3) {
        // PUBLISH
        if (body.length < 2) return;
        const topicLen = (body[0] << 8) | body[1];
        const qos = (typeByte >>> 1) & 0x03;
        let payloadOff = 2 + topicLen;
        if (qos > 0) payloadOff += 2; // packet id
        if (payloadOff > body.length) return;
        const payloadBytes = body.subarray(payloadOff);
        try {
          const str = td.decode(payloadBytes);
          const data = JSON.parse(str);
          this.onMessage(data);
        } catch (e) {}
      }
    }

    _sendRaw(str) {
      if (!this.connected || !this.ws || this.ws.readyState !== 1) return false;
      try {
        this.ws.send(buildPublishPacket(this.topic, str));
        return true;
      } catch (e) {
        return false;
      }
    }

    send(obj) {
      if (this.destroyed) return false;
      let str;
      try {
        str = JSON.stringify(obj);
      } catch (e) {
        return false;
      }
      if (this._sendRaw(str)) return true;
      // Keep last 12 signal messages queued while connecting
      if (this.outQueue.length >= 12) this.outQueue.shift();
      this.outQueue.push(str);
      return false;
    }

    _cleanupSocket() {
      clearTimeout(this.connectWatchdog);
      clearInterval(this.pingTimer);
      if (this.ws) {
        const old = this.ws;
        this.ws = null;
        try { old.close(); } catch (e) {}
      }
    }

    _scheduleReconnect(rotateBroker) {
      if (this.destroyed) return;
      if (rotateBroker) this.brokerIdx = (this.brokerIdx + 1) % BROKERS.length;
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this._connect(), rotateBroker ? 900 : 1800);
    }

    destroy() {
      this.destroyed = true;
      this.connected = false;
      clearTimeout(this.retryTimer);
      this._cleanupSocket();
      this.outQueue = [];
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this._onVisibility);
      }
    }
  }

  global.CouchWsRelay = {
    WsRelayChannel,
    BROKERS,
  };
})(window);
