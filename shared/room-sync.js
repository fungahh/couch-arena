/**
 * Couch Arcade — Shared Room & Multiplayer Sync Engine
 * Supports up to 4 players per game room with direct invite links.
 * Transport:
 *  - BroadcastChannel (instant multi-tab on same device)
 *  - ntfy.sh HTTPS Server-Sent Events (1 persistent stream — zero polling rate limits!)
 *  - WebRTC DataChannels (low-latency real-time sync for action games)
 */
(function (global) {
  'use strict';

  const NTFY_BASE = 'https://ntfy.sh';
  const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const PLAYER_COLORS = [
    { name: 'Alpha', hex: '#14b8a6', glow: '#5eead4' }, // P1 Cyan
    { name: 'Beta', hex: '#f59e0b', glow: '#fde68a' },  // P2 Amber
    { name: 'Gamma', hex: '#f43f5e', glow: '#fda4af' }, // P3 Rose
    { name: 'Delta', hex: '#22c55e', glow: '#86efac' }, // P4 Emerald
  ];

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function getStablePlayerId() {
    try {
      let id = localStorage.getItem('couch_arcade_player_id');
      if (!id) {
        id = 'p_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('couch_arcade_player_id', id);
      }
      return id;
    } catch (e) {
      return 'p_' + Math.random().toString(36).slice(2, 10);
    }
  }

  function getSavedPlayerName() {
    return (
      localStorage.getItem('couch_arcade_name') ||
      localStorage.getItem('wa_nickname') ||
      'Pilot ' + Math.floor(100 + Math.random() * 899)
    );
  }

  function savePlayerName(name) {
    const clean = (name || '').trim().slice(0, 18);
    if (!clean) return;
    localStorage.setItem('couch_arcade_name', clean);
    localStorage.setItem('wa_nickname', clean);
  }

  class RoomSync {
    constructor(opts) {
      this.gameId = opts.gameId;
      this.maxPlayers = opts.maxPlayers || 4;
      this.enableRtc = Boolean(opts.enableRtc);
      this.myId = getStablePlayerId();
      this.myName = opts.playerName || getSavedPlayerName();
      this.roomCode = (opts.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      this.isHost = Boolean(opts.isHost);

      this.onRosterChange = opts.onRosterChange || (() => {});
      this.onMessage = opts.onMessage || (() => {});
      this.onStatusChange = opts.onStatusChange || (() => {});
      this.onRoomFull = opts.onRoomFull || (() => {});

      this.players = {}; // id -> { id, name, slot, isHost, isLocal, lastSeen, ready }
      this.seenEvents = new Set();
      this.lastMsgId = 'all';
      this.bc = null;
      this.sse = null;
      this.reconnectTimer = null;
      this.heartbeatTimer = null;
      this.sseErrors = 0;
      this.peers = {}; // peerId -> { pc, dc, open }
      this.destroyed = false;

      this._onVisibility = () => {
        if (!this.destroyed && document.visibilityState === 'visible' && this.roomCode) {
          if (!this.sse || this.sse.readyState === EventSource.CLOSED) {
            this.openSseStream();
          }
        }
      };
    }

    get topic() {
      return `couch_arcade_${this.gameId}_${this.roomCode}`;
    }

    getInviteUrl() {
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.roomCode);
      url.searchParams.delete('host');
      url.searchParams.delete('autocreate');
      return url.toString();
    }

    getOrderedPlayers() {
      return Object.values(this.players).sort((a, b) => a.slot - b.slot);
    }

    getMyPlayer() {
      return this.players[this.myId] || null;
    }

    setPlayerName(name) {
      this.myName = (name || '').trim().slice(0, 18) || this.myName;
      savePlayerName(this.myName);
      if (this.players[this.myId]) {
        this.players[this.myId].name = this.myName;
        this.emitRoster();
        this.broadcastRosterOrHello();
      }
    }

    async connect() {
      if (!this.roomCode) {
        this.roomCode = generateRoomCode();
        this.isHost = true;
      }

      // Reflect room code in URL so sharing/reloading keeps the room
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('room', this.roomCode);
        url.searchParams.delete('host');
        url.searchParams.delete('autocreate');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}

      // 1. Local BroadcastChannel for instant multi-tab sync
      if ('BroadcastChannel' in window) {
        this.bc = new BroadcastChannel(`ca_bc_${this.gameId}_${this.roomCode}`);
        this.bc.onmessage = (ev) => {
          if (ev.data) this.handleSignal(ev.data, true);
        };
      }

      if (this.isHost) {
        this.players[this.myId] = {
          id: this.myId,
          name: this.myName,
          slot: 0,
          isHost: true,
          isLocal: true,
          ready: true,
          lastSeen: Date.now(),
        };
        this.emitRoster();
      }

      // 2. Open single persistent HTTPS SSE stream (no polling spam!)
      this.openSseStream();
      document.addEventListener('visibilitychange', this._onVisibility);

      // 3. Announce presence (non-blocking)
      if (this.isHost) {
        this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
      } else {
        this.sendSignal({ type: 'JOIN_REQ', name: this.myName });
      }

      // Lightweight presence check every 15s (keeps rate limits safe on shared Wi-Fi)
      this.heartbeatTimer = setInterval(() => this.heartbeat(), 15000);
    }

    openSseStream() {
      if (this.destroyed || !this.roomCode) return;
      if (this.sse) {
        try { this.sse.close(); } catch (e) {}
        this.sse = null;
      }

      this.onStatusChange('warn', 'Connecting...');
      const since = this.lastMsgId || 'all';
      const url = `${NTFY_BASE}/${this.topic}/sse?since=${encodeURIComponent(since)}`;

      try {
        const es = new EventSource(url);
        this.sse = es;

        es.onopen = () => {
          this.sseErrors = 0;
          const hasRtc = Object.values(this.peers).some((p) => p && p.open);
          this.onStatusChange('ok', hasRtc ? 'P2P Live' : 'Room Online');
        };

        es.onmessage = (ev) => {
          this.sseErrors = 0;
          const hasRtc = Object.values(this.peers).some((p) => p && p.open);
          this.onStatusChange('ok', hasRtc ? 'P2P Live' : 'Room Online');
          if (!ev.data) return;
          try {
            const env = JSON.parse(ev.data);
            if (env.id) this.lastMsgId = env.id;
            if (env.event === 'message' && env.message) {
              const payload = JSON.parse(env.message);
              this.handleSignal(payload, false);
            }
          } catch (e) {}
        };

        es.onerror = () => {
          this.sseErrors += 1;
          this.onStatusChange('warn', this.sseErrors >= 3 ? 'Local Only' : 'Reconnecting...');
          if (es.readyState === EventSource.CLOSED && !this.destroyed) {
            const delay = Math.min(12000, 2000 * this.sseErrors);
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.openSseStream(), delay);
          }
        };
      } catch (e) {
        this.onStatusChange('warn', 'Local Only');
      }
    }

    addLocalPlayer(name) {
      if (!this.isHost) return null;
      const usedSlots = new Set(Object.values(this.players).map((p) => p.slot));
      let freeSlot = -1;
      for (let i = 0; i < this.maxPlayers; i++) {
        if (!usedSlots.has(i)) {
          freeSlot = i;
          break;
        }
      }
      if (freeSlot === -1) return null;

      const localId = `${this.myId}_local_${freeSlot}`;
      this.players[localId] = {
        id: localId,
        name: name || `Local P${freeSlot + 1}`,
        slot: freeSlot,
        isHost: false,
        isLocal: true,
        ready: true,
        lastSeen: Date.now(),
      };
      this.emitRoster();
      this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
      return this.players[localId];
    }

    removeLocalPlayer(localId) {
      if (!this.isHost || !this.players[localId] || localId === this.myId) return;
      delete this.players[localId];
      this.emitRoster();
      this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
    }

    heartbeat() {
      if (this.destroyed) return;
      const now = Date.now();
      if (this.isHost) {
        let changed = false;
        for (const p of Object.values(this.players)) {
          if (p.isLocal) {
            p.lastSeen = now;
          } else if (now - p.lastSeen > 45000) {
            delete this.players[p.id];
            this.closePeer(p.id);
            changed = true;
          }
        }
        if (changed) {
          this.emitRoster();
          this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
        }
      } else {
        // Guest only pings over ntfy if not yet in roster or no open RTC channel
        const hasOpenRtc = Object.values(this.peers).some((p) => p && p.open);
        if (!this.players[this.myId] || !hasOpenRtc) {
          this.sendSignal({ type: 'PING', name: this.myName });
        }
      }
    }

    broadcastRosterOrHello() {
      if (this.isHost) {
        this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
      } else {
        this.sendSignal({ type: 'PING', name: this.myName });
      }
    }

    emitRoster() {
      this.onRosterChange(this.getOrderedPlayers());
    }

    // ---- Low-Latency Realtime Channel (WebRTC -> BroadcastChannel) ----
    sendRealtime(payload, targetId = null) {
      const msg = { ...payload, _rt: true, senderId: this.myId };

      if (this.bc) {
        try { this.bc.postMessage(msg); } catch (e) {}
      }

      let sentViaRtc = false;
      const raw = JSON.stringify(msg);
      if (targetId && this.peers[targetId] && this.peers[targetId].open) {
        try {
          this.peers[targetId].dc.send(raw);
          sentViaRtc = true;
        } catch (e) {}
      } else if (!targetId) {
        for (const pid of Object.keys(this.peers)) {
          const peer = this.peers[pid];
          if (peer && peer.open) {
            try {
              peer.dc.send(raw);
              sentViaRtc = true;
            } catch (e) {}
          }
        }
      }
      return sentViaRtc;
    }

    // Reliable signaling / game event (BC + open RTC + ntfy POST)
    async sendSignal(payload) {
      const enriched = {
        ...payload,
        eventId: `${this.myId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: this.myId,
        ts: Date.now(),
      };
      this.seenEvents.add(enriched.eventId);

      if (this.bc) {
        try { this.bc.postMessage(enriched); } catch (e) {}
      }

      const raw = JSON.stringify(enriched);
      for (const pid of Object.keys(this.peers)) {
        const peer = this.peers[pid];
        if (peer && peer.open) {
          try { peer.dc.send(raw); } catch (e) {}
        }
      }

      try {
        const res = await fetch(`${NTFY_BASE}/${this.topic}`, {
          method: 'POST',
          body: raw,
        });
        if (res.ok) {
          const hasRtc = Object.values(this.peers).some((p) => p && p.open);
          this.onStatusChange('ok', hasRtc ? 'P2P Live' : 'Room Online');
        }
      } catch (e) {
        // Keep current SSE/local status without getting stuck
      }
    }

    handleSignal(data, fromFastTransport) {
      if (!data || data.senderId === this.myId) return;

      if (data._rt) {
        if (this.isHost && this.players[data.senderId]) {
          this.players[data.senderId].lastSeen = Date.now();
        }
        this.onMessage(data);
        return;
      }

      if (data.eventId) {
        if (this.seenEvents.has(data.eventId)) return;
        this.seenEvents.add(data.eventId);
        if (this.seenEvents.size > 600) {
          const first = this.seenEvents.values().next().value;
          this.seenEvents.delete(first);
        }
      }

      if (data.targetId && data.targetId !== this.myId) return;

      if (data.type === 'JOIN_REQ' && this.isHost) {
        const sender = data.senderId;
        if (!this.players[sender]) {
          const used = new Set(Object.values(this.players).map((p) => p.slot));
          let freeSlot = -1;
          for (let i = 0; i < this.maxPlayers; i++) {
            if (!used.has(i)) {
              freeSlot = i;
              break;
            }
          }
          if (freeSlot === -1) {
            this.sendSignal({ type: 'ROOM_FULL', targetId: sender });
            return;
          }
          this.players[sender] = {
            id: sender,
            name: (data.name || `Pilot ${freeSlot + 1}`).slice(0, 18),
            slot: freeSlot,
            isHost: false,
            isLocal: false,
            ready: true,
            lastSeen: Date.now(),
          };
          this.emitRoster();
        } else {
          this.players[sender].lastSeen = Date.now();
          if (data.name) this.players[sender].name = data.name.slice(0, 18);
        }
        this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
        if (this.enableRtc && !fromFastTransport) {
          this.initiateRtcOffer(sender);
        }
        return;
      }

      if (data.type === 'PING' && this.isHost) {
        const sender = data.senderId;
        if (this.players[sender]) {
          this.players[sender].lastSeen = Date.now();
          if (data.name && this.players[sender].name !== data.name) {
            this.players[sender].name = data.name.slice(0, 18);
            this.emitRoster();
            this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
          }
          if (this.enableRtc && !fromFastTransport && (!this.peers[sender] || !this.peers[sender].open)) {
            this.initiateRtcOffer(sender);
          }
        } else {
          this.handleSignal({ ...data, type: 'JOIN_REQ' }, fromFastTransport);
        }
        return;
      }

      if (data.type === 'ROSTER' && !this.isHost && data.players) {
        this.players = data.players;
        this.hostId = data.hostId;
        this.emitRoster();
        return;
      }

      if (data.type === 'ROOM_FULL' && !this.isHost) {
        this.onRoomFull();
        return;
      }

      if (data.type === 'RTC_OFFER' && this.enableRtc) {
        this.handleRtcOffer(data.senderId, data.sdp);
        return;
      }

      if (data.type === 'RTC_ANSWER' && this.enableRtc) {
        this.handleRtcAnswer(data.senderId, data.sdp);
        return;
      }

      if (data.type === 'RTC_ICE' && this.enableRtc) {
        this.handleRtcIce(data.senderId, data.candidate);
        return;
      }

      this.onMessage(data);
    }

    // ---- WebRTC Peer Management (Star: Host <-> Guest) ----
    async initiateRtcOffer(peerId) {
      if (typeof RTCPeerConnection === 'undefined') return;
      if (this.peers[peerId] && this.peers[peerId].open) return;
      this.closePeer(peerId);

      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      const dc = pc.createDataChannel('game', { ordered: false, maxRetransmits: 0 });
      const entry = { pc, dc, open: false };
      this.peers[peerId] = entry;
      this.bindDataChannel(peerId, entry);

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          this.sendSignal({ type: 'RTC_ICE', targetId: peerId, candidate: ev.candidate });
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignal({ type: 'RTC_OFFER', targetId: peerId, sdp: pc.localDescription });
      } catch (e) {}
    }

    async handleRtcOffer(peerId, sdp) {
      if (typeof RTCPeerConnection === 'undefined') return;
      this.closePeer(peerId);

      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      const entry = { pc, dc: null, open: false };
      this.peers[peerId] = entry;

      pc.ondatachannel = (ev) => {
        entry.dc = ev.channel;
        this.bindDataChannel(peerId, entry);
      };
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          this.sendSignal({ type: 'RTC_ICE', targetId: peerId, candidate: ev.candidate });
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal({ type: 'RTC_ANSWER', targetId: peerId, sdp: pc.localDescription });
      } catch (e) {}
    }

    async handleRtcAnswer(peerId, sdp) {
      const entry = this.peers[peerId];
      if (!entry) return;
      try {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (e) {}
    }

    async handleRtcIce(peerId, candidate) {
      const entry = this.peers[peerId];
      if (!entry || !candidate) return;
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    }

    bindDataChannel(peerId, entry) {
      entry.dc.onopen = () => {
        entry.open = true;
        this.onStatusChange('ok', 'P2P Live');
      };
      entry.dc.onclose = () => {
        entry.open = false;
      };
      entry.dc.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          this.handleSignal(data, true);
        } catch (e) {}
      };
    }

    closePeer(peerId) {
      const entry = this.peers[peerId];
      if (!entry) return;
      try { if (entry.dc) entry.dc.close(); } catch (e) {}
      try { if (entry.pc) entry.pc.close(); } catch (e) {}
      delete this.peers[peerId];
    }

    destroy() {
      this.destroyed = true;
      document.removeEventListener('visibilitychange', this._onVisibility);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      if (this.sse) {
        try { this.sse.close(); } catch (e) {}
      }
      if (this.bc) {
        try { this.bc.close(); } catch (e) {}
      }
      for (const pid of Object.keys(this.peers)) {
        this.closePeer(pid);
      }
    }
  }

  global.CouchRoom = {
    RoomSync,
    PLAYER_COLORS,
    generateRoomCode,
    getSavedPlayerName,
    savePlayerName,
  };
})(window);
