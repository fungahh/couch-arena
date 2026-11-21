/**
 * Couch Arcade — Shared 4-Player Room & Real-Time P2P Engine
 * Uses PeerJS (WebRTC DataChannels via 0.peerjs.com) + BroadcastChannel.
 * - Zero daily message limits (fixes ntfy.sh 250/day IP cap on shared Wi-Fi)
 * - Direct sub-50ms P2P sync for both turn-based and 30Hz action games
 * - Up to 4 players per room with direct ?room=XXXXXX invite links
 */
(function (global) {
  'use strict';

  const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
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

  let peerJsPromise = null;
  function ensurePeerJs() {
    if (typeof global.Peer === 'function') return Promise.resolve();
    if (peerJsPromise) return peerJsPromise;
    peerJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PEERJS_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load PeerJS'));
      document.head.appendChild(s);
    });
    return peerJsPromise;
  }

  class RoomSync {
    constructor(opts) {
      this.gameId = String(opts.gameId || 'game').replace(/[^a-z0-9_-]/gi, '');
      this.maxPlayers = opts.maxPlayers || 4;
      this.myId = getStablePlayerId();
      this.myName = opts.playerName || getSavedPlayerName();
      this.roomCode = (opts.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      this.isHost = Boolean(opts.isHost);

      this.onRosterChange = opts.onRosterChange || (() => {});
      this.onMessage = opts.onMessage || (() => {});
      this.onStatusChange = opts.onStatusChange || (() => {});
      this.onRoomFull = opts.onRoomFull || (() => {});
      this.onKicked = opts.onKicked || (() => {});

      this.players = {}; // id -> { id, name, slot, isHost, isLocal, ready }
      this.bc = null;
      this.peer = null;
      this.conns = {}; // peerId -> DataConnection (host: guest conns; guest: host conn)
      this.hostConn = null;
      this.peerToPlayerId = {}; // remotePeerId -> playerId
      this.playerToPeerId = {}; // playerId -> remotePeerId
      this.reconnectTimer = null;
      this.retryCount = 0;
      this.kicked = false;
      this.destroyed = false;

      this._onVisibility = () => {
        if (!this.destroyed && document.visibilityState === 'visible') {
          if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
            try { this.peer.reconnect(); } catch (e) {}
          }
          if (!this.isHost && (!this.hostConn || !this.hostConn.open)) {
            this.connectToHostPeer();
          }
        }
      };
    }

    get hostPeerId() {
      return `ca-${this.gameId}-${this.roomCode}`;
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
        if (this.isHost) {
          this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
        } else {
          this.sendSignal({ type: 'NAME_UPDATE', name: this.myName });
        }
      }
    }

    async connect() {
      if (!this.roomCode) {
        this.roomCode = generateRoomCode();
        this.isHost = true;
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.set('room', this.roomCode);
        url.searchParams.delete('host');
        url.searchParams.delete('autocreate');
        window.history.replaceState({}, '', url.toString());
      } catch (e) {}

      // Local BroadcastChannel for instant same-browser multi-tab sync
      if ('BroadcastChannel' in window) {
        this.bc = new BroadcastChannel(`ca_bc_${this.gameId}_${this.roomCode}`);
        this.bc.onmessage = (ev) => {
          if (ev.data) this.handlePacket(ev.data, null);
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
        };
        this.emitRoster();
      }

      this.onStatusChange('warn', 'Connecting...');
      document.addEventListener('visibilitychange', this._onVisibility);

      try {
        await ensurePeerJs();
        this.openPeer();
      } catch (e) {
        this.onStatusChange('warn', 'Local Only');
      }
    }

    openPeer() {
      if (this.destroyed) return;
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
        this.peer = null;
      }

      const peerOpts = { config: { iceServers: STUN_SERVERS } };
      const peer = this.isHost
        ? new global.Peer(this.hostPeerId, peerOpts)
        : new global.Peer(peerOpts);
      this.peer = peer;

      peer.on('open', () => {
        this.retryCount = 0;
        if (this.isHost) {
          this.onStatusChange('ok', 'Room Online');
        } else {
          this.connectToHostPeer();
        }
      });

      if (this.isHost) {
        peer.on('connection', (conn) => {
          this.bindHostConnection(conn);
        });
      }

      peer.on('disconnected', () => {
        if (this.destroyed) return;
        this.onStatusChange('warn', 'Reconnecting...');
        setTimeout(() => {
          if (!this.destroyed && peer && !peer.destroyed) {
            try { peer.reconnect(); } catch (e) {}
          }
        }, 1500);
      });

      peer.on('error', (err) => {
        if (this.destroyed) return;
        const type = err && err.type ? err.type : '';
        if (type === 'unavailable-id' && this.isHost && this.retryCount < 4) {
          this.retryCount += 1;
          this.onStatusChange('warn', 'Reclaiming Room...');
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.openPeer(), 1200);
          return;
        }
        if (type === 'peer-unavailable' && !this.isHost) {
          this.onStatusChange('warn', 'Searching Room...');
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 2000);
          return;
        }
        this.onStatusChange('warn', 'Reconnecting...');
      });
    }

    bindHostConnection(conn) {
      this.conns[conn.peer] = conn;

      conn.on('open', () => {
        this.onStatusChange('ok', 'P2P Live');
      });

      conn.on('data', (data) => {
        this.handlePacket(data, conn);
      });

      const onDrop = () => {
        delete this.conns[conn.peer];
        const pid = this.peerToPlayerId[conn.peer];
        delete this.peerToPlayerId[conn.peer];
        if (pid && this.players[pid] && !this.players[pid].isLocal) {
          delete this.players[pid];
          this.emitRoster();
          this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
        }
        if (Object.keys(this.conns).length === 0 && !this.destroyed) {
          this.onStatusChange('ok', 'Room Online');
        }
      };

      conn.on('close', onDrop);
      conn.on('error', onDrop);
    }

    connectToHostPeer() {
      if (this.destroyed || this.isHost || !this.peer || this.peer.destroyed) return;
      if (this.hostConn && this.hostConn.open) return;

      this.onStatusChange('warn', 'Joining Room...');
      const conn = this.peer.connect(this.hostPeerId, { reliable: true });
      this.hostConn = conn;
      this.conns[this.hostPeerId] = conn;

      conn.on('open', () => {
        this.onStatusChange('ok', 'P2P Live');
        conn.send({
          type: 'JOIN_REQ',
          senderId: this.myId,
          name: this.myName,
        });
      });

      conn.on('data', (data) => {
        this.handlePacket(data, conn);
      });

      const onDrop = () => {
        if (this.destroyed) return;
        this.hostConn = null;
        this.onStatusChange('warn', 'Reconnecting...');
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 2000);
      };

      conn.on('close', onDrop);
      conn.on('error', onDrop);
    }

    addLocalPlayer(name) {
      if (!this.isHost) return null;
      const usedSlots = new Set(Object.values(this.players).map((p) => p.slot));
      let freeSlot = -1;
      for (let i = 0; i < this.maxPlayers; i++) {
        if (!usedSlots.has(i)) { freeSlot = i; break; }
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

    kickPlayer(playerId) {
      if (!this.isHost || !playerId || playerId === this.myId) return;
      const p = this.players[playerId];
      if (!p) return;

      if (!p.isLocal) {
        const remotePeer = this.playerToPeerId[playerId];
        const conn = remotePeer ? this.conns[remotePeer] : null;
        if (conn && conn.open) {
          try { conn.send({ type: 'KICKED', senderId: this.myId }); } catch (e) {}
          setTimeout(() => {
            try { conn.close(); } catch (e) {}
          }, 120);
        }
        if (remotePeer) {
          delete this.conns[remotePeer];
          delete this.peerToPlayerId[remotePeer];
        }
        delete this.playerToPeerId[playerId];
      }

      delete this.players[playerId];
      this.emitRoster();
      this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
    }

    sendToPlayer(playerId, payload) {
      if (!this.isHost || !playerId) return;
      const msg = { ...payload, targetId: playerId, senderId: this.myId, ts: Date.now() };
      if (this.bc) {
        try { this.bc.postMessage(msg); } catch (e) {}
      }
      const remotePeer = this.playerToPeerId[playerId];
      const conn = remotePeer ? this.conns[remotePeer] : null;
      if (conn && conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    }

    emitRoster() {
      this.onRosterChange(this.getOrderedPlayers());
    }

    sendRealtime(payload) {
      const msg = { ...payload, _rt: true, senderId: this.myId };
      if (this.bc) {
        try { this.bc.postMessage(msg); } catch (e) {}
      }
      if (this.isHost) {
        for (const conn of Object.values(this.conns)) {
          if (conn && conn.open) {
            try { conn.send(msg); } catch (e) {}
          }
        }
      } else if (this.hostConn && this.hostConn.open) {
        try { this.hostConn.send(msg); } catch (e) {}
      }
    }

    sendSignal(payload) {
      const msg = { ...payload, senderId: this.myId, ts: Date.now() };
      if (this.bc) {
        try { this.bc.postMessage(msg); } catch (e) {}
      }
      if (this.isHost) {
        for (const conn of Object.values(this.conns)) {
          if (conn && conn.open) {
            try { conn.send(msg); } catch (e) {}
          }
        }
      } else if (this.hostConn && this.hostConn.open) {
        try { this.hostConn.send(msg); } catch (e) {}
      }
    }

    handlePacket(data, fromConn) {
      if (!data || data.senderId === this.myId) return;
      if (data.targetId && data.targetId !== this.myId) return;

      if (data._rt) {
        this.onMessage(data);
        return;
      }

      if (data.type === 'KICKED' && !this.isHost) {
        this.kicked = true;
        this.destroy();
        this.onKicked();
        return;
      }

      if (data.type === 'JOIN_REQ' && this.isHost) {
        const sender = data.senderId;
        if (fromConn) {
          this.peerToPlayerId[fromConn.peer] = sender;
          this.playerToPeerId[sender] = fromConn.peer;
        }

        if (!this.players[sender]) {
          const used = new Set(Object.values(this.players).map((p) => p.slot));
          let freeSlot = -1;
          for (let i = 0; i < this.maxPlayers; i++) {
            if (!used.has(i)) { freeSlot = i; break; }
          }
          if (freeSlot === -1) {
            if (fromConn && fromConn.open) {
              try { fromConn.send({ type: 'ROOM_FULL', senderId: this.myId }); } catch (e) {}
            }
            return;
          }
          this.players[sender] = {
            id: sender,
            name: (data.name || `Pilot ${freeSlot + 1}`).slice(0, 18),
            slot: freeSlot,
            isHost: false,
            isLocal: false,
            ready: true,
          };
          this.emitRoster();
        } else if (data.name) {
          this.players[sender].name = data.name.slice(0, 18);
          this.emitRoster();
        }

        this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
        return;
      }

      if (data.type === 'NAME_UPDATE' && this.isHost) {
        const sender = data.senderId;
        if (this.players[sender] && data.name) {
          this.players[sender].name = data.name.slice(0, 18);
          this.emitRoster();
          this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId });
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

      this.onMessage(data);
    }

    destroy() {
      this.destroyed = true;
      document.removeEventListener('visibilitychange', this._onVisibility);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.bc) {
        try { this.bc.close(); } catch (e) {}
      }
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
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
