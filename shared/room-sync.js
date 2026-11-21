/**
 * Couch Arcade — Shared 5-Player Room & Real-Time Hybrid Sync Engine
 * Dual-transport: PeerJS WebRTC P2P (sub-30ms) + WSS MQTT Relay (100% NAT/5G/iOS proof) + BroadcastChannel.
 * - First-letter + 3-digit game room codes (e.g. A482, W719) + legacy 6-char support
 * - Guaranteed QR / TV Mode joins with HOST_HELLO handshake & JOIN_REQ retry loop
 * - Automatic WebRTC watchdog & transparent WSS fallback when NAT/5G blocks P2P
 * - TV Screen Spectator Mode, Phone Controllers, Host Join Approval Queue,
 *   Cross-Device Account Lookup, and Live Achievement Unlock forwarding
 */
(function (global) {
  'use strict';

  const PEERJS_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  const PLAYER_COLORS = [
    { name: 'Alpha', hex: '#14b8a6', glow: '#5eead4' },   // P1 Cyan
    { name: 'Beta', hex: '#f59e0b', glow: '#fde68a' },    // P2 Amber
    { name: 'Gamma', hex: '#f43f5e', glow: '#fda4af' },   // P3 Rose
    { name: 'Delta', hex: '#22c55e', glow: '#86efac' },   // P4 Emerald
    { name: 'Epsilon', hex: '#a855f7', glow: '#d8b4fe' }, // P5 Violet
  ];

  function generateRoomCode(prefix) {
    if (prefix) {
      const letter = String(prefix).trim().toUpperCase().replace(/[^A-Z]/g, '')[0] || 'G';
      const digits = String(Math.floor(100 + Math.random() * 900));
      return letter + digits;
    }
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
    if (global.CouchAccounts && global.CouchAccounts.getActiveAccount) {
      const acc = global.CouchAccounts.getActiveAccount();
      if (acc && acc.username) return acc.username;
    }
    return (
      localStorage.getItem('couch_arcade_name') ||
      localStorage.getItem('wa_nickname') ||
      'Pilot ' + Math.floor(100 + Math.random() * 899)
    );
  }

  function getSavedProfileMeta() {
    if (global.CouchAccounts && global.CouchAccounts.getPublicProfile) {
      return global.CouchAccounts.getPublicProfile();
    }
    return {
      loggedIn: false,
      username: getSavedPlayerName(),
      avatar: '🎮',
      trophyCount: 0,
      handle: '',
    };
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
      this.codePrefix = opts.codePrefix || '';
      this.maxPlayers = opts.maxPlayers || 5;
      this.myId = getStablePlayerId();

      const prof = getSavedProfileMeta();
      this.myName = opts.playerName || prof.username || getSavedPlayerName();
      this.myAvatar = opts.avatar || prof.avatar || '🛸';
      this.myAccountHandle = opts.accountHandle !== undefined ? opts.accountHandle : prof.handle;
      this.myTrophyCount = opts.trophyCount !== undefined ? opts.trophyCount : prof.trophyCount;

      this.roomCode = (opts.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      this.isHost = Boolean(opts.isHost);
      this.tvMode = Boolean(opts.tvMode) && this.isHost;
      this.controllerMode = Boolean(opts.controllerMode) && !this.isHost;
      this.requireApproval = Boolean(opts.requireApproval) && !this.isHost;
      this.roomHasTv = this.tvMode;
      this.updateUrl = opts.updateUrl !== false;

      this.onRosterChange = opts.onRosterChange || (() => {});
      this.onMessage = opts.onMessage || (() => {});
      this.onStatusChange = opts.onStatusChange || (() => {});
      this.onRoomFull = opts.onRoomFull || (() => {});
      this.onKicked = opts.onKicked || (() => {});
      this.onJoinRequestsChange = opts.onJoinRequestsChange || (() => {});
      this.onJoinPending = opts.onJoinPending || (() => {});
      this.onJoinAccepted = opts.onJoinAccepted || (() => {});
      this.onJoinDeclined = opts.onJoinDeclined || (() => {});

      this.players = {}; // id -> { id, name, avatar, accountHandle, trophyCount, slot, isHost, isLocal, isController, ready }
      this.pendingRequests = {}; // playerId -> { id, name, avatar, accountHandle, trophyCount, isController, ts, conn }
      this.pendingLookups = {}; // reqId -> { resolve, timer }
      this.bc = null;
      this.relay = null;
      this.peer = null;
      this.conns = {}; // peerId -> DataConnection
      this.hostConn = null;
      this.peerToPlayerId = {};
      this.playerToPeerId = {};
      this.lastSeenByPlayer = {};
      this.reconnectTimer = null;
      this.connWatchdog = null;
      this.joinRetryTimer = null;
      this.hbTimer = null;
      this.retryCount = 0;
      this.msgSeq = 0;
      this.seenMids = new Set();
      this.lastRelayRtSent = 0;
      this.admitted = this.isHost;
      this.waitingApproval = false;
      this.roomFull = false;
      this.kicked = false;
      this.declined = false;
      this.destroyed = false;

      this._onVisibility = () => {
        if (!this.destroyed && document.visibilityState === 'visible') {
          if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
            try { this.peer.reconnect(); } catch (e) {}
          }
          if (!this.isHost && !this.declined && !this.kicked) {
            if (!this.hostConn || !this.hostConn.open) {
              this.connectToHostPeer();
            }
            if (!this.admitted) this._sendJoinReq();
          }
        }
      };

      this._onPageHide = () => {
        if (!this.isHost && !this.destroyed) {
          this.sendSignal({ type: 'PLAYER_LEAVE' });
        }
      };
    }

    get hostPeerId() {
      return `ca-${this.gameId}-${this.roomCode}`;
    }

    hasOpenP2p() {
      if (this.isHost) {
        return Object.values(this.conns).some((c) => c && c.open);
      }
      return Boolean(this.hostConn && this.hostConn.open);
    }

    _updateStatus() {
      if (this.destroyed) return;
      const p2pOpen = this.hasOpenP2p();
      const relayOpen = Boolean(this.relay && this.relay.connected);
      const peerOpen = Boolean(this.peer && !this.peer.destroyed && this.peer.open);

      if (this.isHost) {
        if (p2pOpen) this.onStatusChange('ok', 'P2P Live');
        else if (peerOpen || relayOpen) this.onStatusChange('ok', 'Room Online');
        else this.onStatusChange('warn', 'Connecting...');
      } else {
        if (p2pOpen) this.onStatusChange('ok', 'P2P Live');
        else if (relayOpen && (this.admitted || this.waitingApproval)) this.onStatusChange('ok', 'Live (Relay)');
        else if (relayOpen) this.onStatusChange('warn', 'Joining Room...');
        else this.onStatusChange('warn', 'Connecting...');
      }
    }

    getInviteUrl(opts = {}) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.roomCode);
      url.searchParams.delete('host');
      url.searchParams.delete('autocreate');
      url.searchParams.delete('tv');
      url.searchParams.delete('joinreq');
      const forController = opts.controller !== undefined ? Boolean(opts.controller) : this.tvMode;
      if (forController) {
        url.searchParams.set('controller', '1');
      } else {
        url.searchParams.delete('controller');
      }
      return url.toString();
    }

    getOrderedPlayers() {
      return Object.values(this.players).sort((a, b) => a.slot - b.slot);
    }

    getPendingRequests() {
      return Object.values(this.pendingRequests)
        .map(({ conn, ...rest }) => rest)
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }

    getMyPlayer() {
      return this.players[this.myId] || null;
    }

    broadcastRoster() {
      if (!this.isHost) return;
      this.sendSignal({ type: 'ROSTER', players: this.players, hostId: this.myId, tvMode: this.tvMode });
    }

    setTvMode(enabled) {
      if (!this.isHost) return;
      this.tvMode = Boolean(enabled);
      this.roomHasTv = this.tvMode;
      if (this.tvMode) {
        delete this.players[this.myId];
      } else if (!this.players[this.myId]) {
        const used = new Set(Object.values(this.players).map((p) => p.slot));
        let freeSlot = 0;
        while (used.has(freeSlot) && freeSlot < this.maxPlayers) freeSlot++;
        if (freeSlot < this.maxPlayers) {
          this.players[this.myId] = {
            id: this.myId,
            name: this.myName,
            avatar: this.myAvatar,
            accountHandle: this.myAccountHandle,
            trophyCount: this.myTrophyCount,
            slot: freeSlot,
            isHost: true,
            isLocal: true,
            isController: false,
            ready: true,
          };
        }
      }
      if (this.updateUrl) {
        try {
          const url = new URL(window.location.href);
          if (this.tvMode) url.searchParams.set('tv', '1');
          else url.searchParams.delete('tv');
          window.history.replaceState({}, '', url.toString());
        } catch (e) {}
      }
      this.emitRoster();
      this.broadcastRoster();
    }

    updateProfile(profile = {}) {
      if (profile.name) {
        this.myName = String(profile.name).trim().slice(0, 18) || this.myName;
        savePlayerName(this.myName);
      }
      if (profile.avatar) this.myAvatar = profile.avatar;
      if (profile.accountHandle !== undefined) this.myAccountHandle = profile.accountHandle;
      if (profile.trophyCount !== undefined) this.myTrophyCount = Number(profile.trophyCount) || 0;

      if (this.players[this.myId]) {
        this.players[this.myId].name = this.myName;
        this.players[this.myId].avatar = this.myAvatar;
        this.players[this.myId].accountHandle = this.myAccountHandle;
        this.players[this.myId].trophyCount = this.myTrophyCount;
        this.emitRoster();
        if (this.isHost) {
          this.broadcastRoster();
        } else {
          this.sendSignal({
            type: 'NAME_UPDATE',
            name: this.myName,
            avatar: this.myAvatar,
            accountHandle: this.myAccountHandle,
            trophyCount: this.myTrophyCount,
          });
        }
      } else if (!this.isHost) {
        this.sendSignal({
          type: 'NAME_UPDATE',
          name: this.myName,
          avatar: this.myAvatar,
          accountHandle: this.myAccountHandle,
          trophyCount: this.myTrophyCount,
        });
      }
    }

    setPlayerName(name) {
      this.updateProfile({ name });
    }

    _sendJoinReq(viaConn) {
      if (this.destroyed || this.isHost || this.declined || this.kicked || this.roomFull) return;
      const payload = {
        type: 'JOIN_REQ',
        senderId: this.myId,
        name: this.myName,
        avatar: this.myAvatar,
        accountHandle: this.myAccountHandle,
        trophyCount: this.myTrophyCount,
        isController: this.controllerMode,
        requireApproval: this.requireApproval,
        _mid: `${this.myId}_j_${++this.msgSeq}`,
        ts: Date.now(),
      };
      if (viaConn && viaConn.open) {
        try { viaConn.send(payload); } catch (e) {}
      }
      if (this.hostConn && this.hostConn.open && this.hostConn !== viaConn) {
        try { this.hostConn.send(payload); } catch (e) {}
      }
      if (this.bc) {
        try { this.bc.postMessage(payload); } catch (e) {}
      }
      if (this.relay && this.relay.connected) {
        this.relay.send(payload);
      }
    }

    _startJoinRetry() {
      if (this.isHost || this.joinRetryTimer) return;
      this.joinRetryTimer = setInterval(() => {
        if (this.destroyed || this.admitted || this.waitingApproval || this.declined || this.kicked || this.roomFull) {
          clearInterval(this.joinRetryTimer);
          this.joinRetryTimer = null;
          return;
        }
        this._sendJoinReq();
      }, 1200);
    }

    async connect() {
      if (!this.roomCode) {
        this.roomCode = generateRoomCode(this.codePrefix);
        this.isHost = true;
        this.admitted = true;
      }

      if (this.updateUrl) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('room', this.roomCode);
          url.searchParams.delete('host');
          url.searchParams.delete('autocreate');
          if (this.isHost && this.tvMode) url.searchParams.set('tv', '1');
          window.history.replaceState({}, '', url.toString());
        } catch (e) {}
      }

      if ('BroadcastChannel' in window) {
        this.bc = new BroadcastChannel(`ca_bc_${this.gameId}_${this.roomCode}`);
        this.bc.onmessage = (ev) => {
          if (ev.data) this.handlePacket(ev.data, null);
        };
      }

      if (this.isHost) {
        if (!this.tvMode) {
          this.players[this.myId] = {
            id: this.myId,
            name: this.myName,
            avatar: this.myAvatar,
            accountHandle: this.myAccountHandle,
            trophyCount: this.myTrophyCount,
            slot: 0,
            isHost: true,
            isLocal: true,
            isController: false,
            ready: true,
          };
        }
        this.emitRoster();
      }

      this.onStatusChange('warn', 'Connecting...');
      document.addEventListener('visibilitychange', this._onVisibility);
      window.addEventListener('pagehide', this._onPageHide);

      // 1. Start NAT-proof WSS MQTT Relay immediately (connects in ~300ms on any Wi-Fi/5G/iOS Safari!)
      if (global.CouchWsRelay && global.CouchWsRelay.WsRelayChannel) {
        this.relay = new global.CouchWsRelay.WsRelayChannel(`room/${this.gameId}/${this.roomCode}`, {
          onOpen: () => {
            this._updateStatus();
            if (this.isHost) {
              this.sendSignal({ type: 'HOST_HELLO', tvMode: this.tvMode, players: this.players });
            } else if (!this.admitted && !this.waitingApproval) {
              this._sendJoinReq();
              this._startJoinRetry();
            }
          },
          onMessage: (data) => {
            this.handlePacket(data, null);
          },
          onClose: () => {
            this._updateStatus();
          },
        });
        this.relay.connect();
      }

      // Heartbeat for relay-connected guests so Host detects clean timeouts without dropping active players
      this.hbTimer = setInterval(() => {
        if (this.destroyed) return;
        if (!this.isHost && this.admitted && !this.hasOpenP2p() && this.relay && this.relay.connected) {
          this.relay.send({ type: 'HEARTBEAT', senderId: this.myId, ts: Date.now() });
        }
      }, 6000);

      if (!this.isHost) {
        this._startJoinRetry();
      }

      // 2. Simultaneously start PeerJS WebRTC P2P for ultra-low-latency direct sync
      try {
        await ensurePeerJs();
        this.openPeer();
      } catch (e) {
        this._updateStatus();
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
        this._updateStatus();
        if (!this.isHost) {
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
        this._updateStatus();
        setTimeout(() => {
          if (!this.destroyed && peer && !peer.destroyed) {
            try { peer.reconnect(); } catch (e) {}
          }
        }, 1500);
      });

      peer.on('error', (err) => {
        if (this.destroyed) return;
        const type = err && err.type ? err.type : '';
        if (type === 'unavailable-id' && this.isHost && this.retryCount < 6) {
          this.retryCount += 1;
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.openPeer(), 1200);
          return;
        }
        if (type === 'peer-unavailable' && !this.isHost) {
          this._updateStatus();
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 1800);
          return;
        }
        this._updateStatus();
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (this.destroyed) return;
          if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
            try { this.peer.reconnect(); } catch (e) {}
          } else if (!this.peer || this.peer.destroyed) {
            this.openPeer();
          } else if (!this.isHost && !this.hasOpenP2p()) {
            this.connectToHostPeer();
          }
        }, 3000);
      });
    }

    bindHostConnection(conn) {
      this.conns[conn.peer] = conn;

      conn.on('open', () => {
        this._updateStatus();
        // Proactively greet guest so even if an early JOIN_REQ raced, guest immediately re-handshakes!
        try {
          conn.send({
            type: 'HOST_HELLO',
            senderId: this.myId,
            tvMode: this.tvMode,
            players: this.players,
            _mid: `${this.myId}_hh_${++this.msgSeq}`,
          });
        } catch (e) {}
      });

      conn.on('data', (data) => {
        this.handlePacket(data, conn);
      });

      const onDrop = () => {
        delete this.conns[conn.peer];
        const pid = this.peerToPlayerId[conn.peer];
        delete this.peerToPlayerId[conn.peer];
        if (pid && this.playerToPeerId[pid] === conn.peer) {
          delete this.playerToPeerId[pid];
        }
        // Only drop player immediately if WSS relay is NOT connected; otherwise wait for PLAYER_LEAVE
        if (pid && !this.relay?.connected) {
          if (this.pendingRequests[pid]) {
            delete this.pendingRequests[pid];
            this.onJoinRequestsChange(this.getPendingRequests());
          }
          if (this.players[pid] && !this.players[pid].isLocal) {
            delete this.players[pid];
            this.emitRoster();
            this.broadcastRoster();
          }
        }
        this._updateStatus();
      };

      conn.on('close', onDrop);
      conn.on('error', onDrop);
    }

    connectToHostPeer() {
      if (this.destroyed || this.isHost || this.declined || this.kicked || !this.peer || this.peer.destroyed) return;
      if (this.hostConn && this.hostConn.open) return;

      clearTimeout(this.connWatchdog);
      if (this.hostConn) {
        try { this.hostConn.close(); } catch (e) {}
        this.hostConn = null;
      }

      this._updateStatus();
      let conn;
      try {
        conn = this.peer.connect(this.hostPeerId, { reliable: true });
      } catch (e) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 2500);
        return;
      }
      this.hostConn = conn;
      this.conns[this.hostPeerId] = conn;

      // Watchdog: if WebRTC ICE stalls silently (common on 5G/Safari), close stalled attempt and retry later
      this.connWatchdog = setTimeout(() => {
        if (this.destroyed || this.hostConn !== conn || conn.open) return;
        try { conn.close(); } catch (e) {}
        if (this.hostConn === conn) this.hostConn = null;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 3500);
      }, 5000);

      conn.on('open', () => {
        clearTimeout(this.connWatchdog);
        this._updateStatus();
        this._sendJoinReq(conn);
        this._startJoinRetry();
      });

      conn.on('data', (data) => {
        this.handlePacket(data, conn);
      });

      const onDrop = () => {
        clearTimeout(this.connWatchdog);
        if (this.hostConn === conn) this.hostConn = null;
        if (this.destroyed || this.declined || this.kicked) return;
        this._updateStatus();
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 2500);
      };

      conn.on('close', onDrop);
      conn.on('error', onDrop);
    }

    _admitPlayer(sender, data, fromConn) {
      if (fromConn) {
        this.peerToPlayerId[fromConn.peer] = sender;
        this.playerToPeerId[sender] = fromConn.peer;
      }
      this.lastSeenByPlayer[sender] = Date.now();

      if (!this.players[sender]) {
        const used = new Set(Object.values(this.players).map((p) => p.slot));
        let freeSlot = -1;
        for (let i = 0; i < this.maxPlayers; i++) {
          if (!used.has(i)) { freeSlot = i; break; }
        }
        if (freeSlot === -1) {
          this.sendToPlayer(sender, { type: 'ROOM_FULL' }, fromConn);
          return false;
        }
        this.players[sender] = {
          id: sender,
          name: (data.name || `Pilot ${freeSlot + 1}`).slice(0, 18),
          avatar: data.avatar || '🛸',
          accountHandle: data.accountHandle || '',
          trophyCount: Number(data.trophyCount) || 0,
          slot: freeSlot,
          isHost: false,
          isLocal: false,
          isController: Boolean(data.isController),
          ready: true,
        };
        this.emitRoster();
      } else {
        if (data.name) this.players[sender].name = data.name.slice(0, 18);
        if (data.avatar) this.players[sender].avatar = data.avatar;
        if (data.accountHandle !== undefined) this.players[sender].accountHandle = data.accountHandle;
        if (data.trophyCount !== undefined) this.players[sender].trophyCount = Number(data.trophyCount) || 0;
        if (data.isController !== undefined) this.players[sender].isController = Boolean(data.isController);
        this.emitRoster();
      }

      this.broadcastRoster();
      if (fromConn && fromConn.open) {
        try {
          fromConn.send({
            type: 'ROSTER',
            senderId: this.myId,
            players: this.players,
            hostId: this.myId,
            tvMode: this.tvMode,
            _mid: `${this.myId}_rd_${++this.msgSeq}`,
          });
        } catch (e) {}
      }
      return true;
    }

    approveJoinRequest(playerId) {
      if (!this.isHost) return false;
      const req = this.pendingRequests[playerId];
      if (!req) return false;
      delete this.pendingRequests[playerId];
      this.onJoinRequestsChange(this.getPendingRequests());

      const ok = this._admitPlayer(playerId, req, req.conn || null);
      if (ok) {
        this.sendToPlayer(playerId, { type: 'JOIN_ACCEPTED' }, req.conn || null);
      }
      return ok;
    }

    declineJoinRequest(playerId) {
      if (!this.isHost) return false;
      const req = this.pendingRequests[playerId];
      if (!req) return false;
      delete this.pendingRequests[playerId];
      this.onJoinRequestsChange(this.getPendingRequests());

      this.sendToPlayer(playerId, { type: 'JOIN_DECLINED' }, req.conn || null);
      if (req.conn && req.conn.open) {
        setTimeout(() => {
          try { req.conn.close(); } catch (e) {}
        }, 120);
      }
      return true;
    }

    lookupRemoteAccount(username, pin) {
      return new Promise((resolve) => {
        if (this.isHost) {
          resolve({ ok: false, notFound: true });
          return;
        }
        const canSend = (this.hostConn && this.hostConn.open) || (this.relay && this.relay.connected);
        if (!canSend) {
          resolve({ ok: false, notFound: true });
          return;
        }
        const reqId = 'lk_' + Math.random().toString(36).slice(2, 8);
        const timer = setTimeout(() => {
          delete this.pendingLookups[reqId];
          resolve({ ok: false, notFound: true });
        }, 4000);
        this.pendingLookups[reqId] = { resolve, timer };
        this.sendSignal({
          type: 'ACCOUNT_LOOKUP',
          reqId,
          username,
          pin,
        });
      });
    }

    awardPlayerAchievement(playerId, achievementId) {
      if (!achievementId) return;
      if (playerId === this.myId) {
        if (global.CouchAccounts) global.CouchAccounts.unlockAchievement(achievementId);
        return;
      }
      if (this.isHost) {
        this.sendToPlayer(playerId, { type: 'ACHIEVEMENT_UNLOCK', achievementId });
      }
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
        avatar: '🎮',
        accountHandle: '',
        trophyCount: 0,
        slot: freeSlot,
        isHost: false,
        isLocal: true,
        ready: true,
      };
      this.emitRoster();
      this.broadcastRoster();
      return this.players[localId];
    }

    removeLocalPlayer(localId) {
      if (!this.isHost || !this.players[localId] || localId === this.myId) return;
      delete this.players[localId];
      this.emitRoster();
      this.broadcastRoster();
    }

    kickPlayer(playerId) {
      if (!this.isHost || !playerId || playerId === this.myId) return;
      const p = this.players[playerId];
      if (!p) return;

      if (!p.isLocal) {
        this.sendToPlayer(playerId, { type: 'KICKED' });
        const remotePeer = this.playerToPeerId[playerId];
        const conn = remotePeer ? this.conns[remotePeer] : null;
        if (conn && conn.open) {
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
      this.broadcastRoster();
    }

    sendToPlayer(playerId, payload, directConn = null) {
      if (!this.isHost || !playerId) return;
      const msg = {
        ...payload,
        targetId: playerId,
        senderId: this.myId,
        _mid: `${this.myId}_t_${++this.msgSeq}`,
        ts: Date.now(),
      };
      if (this.bc) {
        try { this.bc.postMessage(msg); } catch (e) {}
      }
      const remotePeer = this.playerToPeerId[playerId];
      const conn = directConn || (remotePeer ? this.conns[remotePeer] : null);
      if (conn && conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
      if (this.relay && this.relay.connected) {
        this.relay.send(msg);
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
      let sentViaP2p = false;
      if (this.isHost) {
        const remoteIds = Object.values(this.players).filter((p) => !p.isLocal).map((p) => p.id);
        let allRemoteOnP2p = remoteIds.length > 0;
        for (const rid of remoteIds) {
          const rPeer = this.playerToPeerId[rid];
          const c = rPeer ? this.conns[rPeer] : null;
          if (!c || !c.open) allRemoteOnP2p = false;
        }
        for (const conn of Object.values(this.conns)) {
          if (conn && conn.open) {
            try { conn.send(msg); sentViaP2p = true; } catch (e) {}
          }
        }
        // If any remote player is relay-only (NAT/5G), also mirror throttled realtime state over WSS!
        if (!allRemoteOnP2p && remoteIds.length > 0 && this.relay && this.relay.connected) {
          const now = Date.now();
          if (now - this.lastRelayRtSent >= 75) {
            this.lastRelayRtSent = now;
            this.relay.send(msg);
          }
        }
      } else {
        if (this.hostConn && this.hostConn.open) {
          try { this.hostConn.send(msg); sentViaP2p = true; } catch (e) {}
        }
        if (!sentViaP2p && this.relay && this.relay.connected) {
          const now = Date.now();
          if (now - this.lastRelayRtSent >= 55) {
            this.lastRelayRtSent = now;
            this.relay.send(msg);
          }
        }
      }
    }

    sendSignal(payload) {
      const msg = {
        ...payload,
        senderId: this.myId,
        _mid: `${this.myId}_s_${++this.msgSeq}`,
        ts: Date.now(),
      };
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
      if (this.relay) {
        this.relay.send(msg);
      }
    }

    handlePacket(data, fromConn) {
      if (!data || data.senderId === this.myId) return;
      if (data.targetId && data.targetId !== this.myId) return;

      if (data._rt) {
        this.onMessage(data);
        return;
      }

      if (data._mid) {
        if (this.seenMids.has(data._mid)) return;
        this.seenMids.add(data._mid);
        if (this.seenMids.size > 260) {
          const first = this.seenMids.values().next().value;
          this.seenMids.delete(first);
        }
      }

      if (data.type === 'HEARTBEAT' && this.isHost) {
        this.lastSeenByPlayer[data.senderId] = Date.now();
        return;
      }

      if (data.type === 'PLAYER_LEAVE' && this.isHost) {
        const pid = data.senderId;
        if (this.pendingRequests[pid]) {
          delete this.pendingRequests[pid];
          this.onJoinRequestsChange(this.getPendingRequests());
        }
        if (this.players[pid] && !this.players[pid].isLocal) {
          delete this.players[pid];
          this.emitRoster();
          this.broadcastRoster();
        }
        return;
      }

      if (data.type === 'HOST_HELLO' && !this.isHost) {
        this.roomHasTv = Boolean(data.tvMode);
        if (data.players && data.players[this.myId]) {
          this.players = data.players;
          this.admitted = true;
          this.emitRoster();
          this._updateStatus();
        } else if (!this.admitted && !this.waitingApproval) {
          this._sendJoinReq(fromConn);
        }
        return;
      }

      if (data.type === 'KICKED' && !this.isHost) {
        this.kicked = true;
        this.destroy();
        this.onKicked();
        return;
      }

      if (data.type === 'ACCOUNT_LOOKUP' && this.isHost) {
        let res = { ok: false, notFound: true };
        if (global.CouchAccounts && global.CouchAccounts.verifyAccountCredentials) {
          res = global.CouchAccounts.verifyAccountCredentials(data.username, data.pin);
        }
        this.sendToPlayer(
          data.senderId,
          {
            type: 'ACCOUNT_LOOKUP_RES',
            reqId: data.reqId,
            ok: Boolean(res.ok),
            error: res.error || '',
            account: res.ok ? res.account : null,
          },
          fromConn
        );
        return;
      }

      if (data.type === 'ACCOUNT_LOOKUP_RES' && !this.isHost) {
        const entry = this.pendingLookups[data.reqId];
        if (entry) {
          clearTimeout(entry.timer);
          delete this.pendingLookups[data.reqId];
          entry.resolve({ ok: data.ok, error: data.error, account: data.account });
        }
        return;
      }

      if (data.type === 'ACHIEVEMENT_UNLOCK' && !this.isHost && data.achievementId) {
        if (global.CouchAccounts && global.CouchAccounts.unlockAchievement) {
          global.CouchAccounts.unlockAchievement(data.achievementId);
        }
        return;
      }

      if (data.type === 'JOIN_REQ' && this.isHost) {
        const sender = data.senderId;
        if (fromConn) {
          this.peerToPlayerId[fromConn.peer] = sender;
          this.playerToPeerId[sender] = fromConn.peer;
        }

        if (data.requireApproval && !this.players[sender]) {
          const usedCount = Object.keys(this.players).length;
          if (usedCount >= this.maxPlayers) {
            this.sendToPlayer(sender, { type: 'ROOM_FULL' }, fromConn);
            return;
          }
          this.pendingRequests[sender] = {
            id: sender,
            name: (data.name || 'Guest Pilot').slice(0, 18),
            avatar: data.avatar || '🎮',
            accountHandle: data.accountHandle || '',
            trophyCount: Number(data.trophyCount) || 0,
            isController: Boolean(data.isController),
            ts: Date.now(),
            conn: fromConn,
          };
          this.onJoinRequestsChange(this.getPendingRequests());
          this.sendToPlayer(sender, { type: 'JOIN_PENDING', tvMode: this.tvMode }, fromConn);
          return;
        }

        this._admitPlayer(sender, data, fromConn);
        return;
      }

      if (data.type === 'JOIN_PENDING' && !this.isHost) {
        this.roomHasTv = Boolean(data.tvMode);
        this.waitingApproval = true;
        this._updateStatus();
        this.onJoinPending();
        return;
      }

      if (data.type === 'JOIN_ACCEPTED' && !this.isHost) {
        this.requireApproval = false;
        this.waitingApproval = false;
        this.admitted = true;
        this._updateStatus();
        this.onJoinAccepted();
        return;
      }

      if (data.type === 'JOIN_DECLINED' && !this.isHost) {
        this.declined = true;
        this.waitingApproval = false;
        this.destroy();
        this.onJoinDeclined();
        return;
      }

      if (data.type === 'NAME_UPDATE' && this.isHost) {
        const sender = data.senderId;
        if (this.players[sender]) {
          if (data.name) this.players[sender].name = data.name.slice(0, 18);
          if (data.avatar) this.players[sender].avatar = data.avatar;
          if (data.accountHandle !== undefined) this.players[sender].accountHandle = data.accountHandle;
          if (data.trophyCount !== undefined) this.players[sender].trophyCount = Number(data.trophyCount) || 0;
          this.emitRoster();
          this.broadcastRoster();
        } else if (this.pendingRequests[sender]) {
          if (data.name) this.pendingRequests[sender].name = data.name.slice(0, 18);
          if (data.avatar) this.pendingRequests[sender].avatar = data.avatar;
          if (data.accountHandle !== undefined) this.pendingRequests[sender].accountHandle = data.accountHandle;
          if (data.trophyCount !== undefined) this.pendingRequests[sender].trophyCount = Number(data.trophyCount) || 0;
          this.onJoinRequestsChange(this.getPendingRequests());
        }
        return;
      }

      if (data.type === 'ROSTER' && !this.isHost && data.players) {
        this.players = data.players;
        this.hostId = data.hostId;
        this.roomHasTv = Boolean(data.tvMode);
        if (this.players[this.myId]) {
          this.admitted = true;
          this.waitingApproval = false;
        }
        this._updateStatus();
        this.emitRoster();
        return;
      }

      if (data.type === 'ROOM_FULL' && !this.isHost) {
        this.roomFull = true;
        this.onRoomFull();
        return;
      }

      this.onMessage(data);
    }

    destroy() {
      this.destroyed = true;
      document.removeEventListener('visibilitychange', this._onVisibility);
      window.removeEventListener('pagehide', this._onPageHide);
      clearTimeout(this.reconnectTimer);
      clearTimeout(this.connWatchdog);
      clearInterval(this.joinRetryTimer);
      clearInterval(this.hbTimer);
      for (const entry of Object.values(this.pendingLookups)) {
        clearTimeout(entry.timer);
      }
      this.pendingLookups = {};
      if (this.bc) {
        try { this.bc.close(); } catch (e) {}
      }
      if (this.relay) {
        try { this.relay.destroy(); } catch (e) {}
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
    getStablePlayerId,
    getSavedPlayerName,
    getSavedProfileMeta,
    savePlayerName,
    ensurePeerJs,
  };
})(window);
