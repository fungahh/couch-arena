/**
 * Couch Arcade — Shared 4-Player Room & Real-Time P2P Engine
 * Uses PeerJS (WebRTC DataChannels via 0.peerjs.com) + BroadcastChannel.
 * - First-letter + 3-digit game room codes (e.g. A482, W719) + legacy 6-char support
 * - Direct sub-50ms P2P sync for both turn-based and 30Hz action games
 * - TV Screen Spectator Mode, Phone Controllers, Host Join Approval Queue,
 *   P2P Account Lookup, and Live Achievement Unlock forwarding
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
      this.maxPlayers = opts.maxPlayers || 4;
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
      this.peer = null;
      this.conns = {}; // peerId -> DataConnection
      this.hostConn = null;
      this.peerToPlayerId = {};
      this.playerToPeerId = {};
      this.reconnectTimer = null;
      this.retryCount = 0;
      this.kicked = false;
      this.declined = false;
      this.destroyed = false;

      this._onVisibility = () => {
        if (!this.destroyed && document.visibilityState === 'visible') {
          if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
            try { this.peer.reconnect(); } catch (e) {}
          }
          if (!this.isHost && !this.declined && (!this.hostConn || !this.hostConn.open)) {
            this.connectToHostPeer();
          }
        }
      };
    }

    get hostPeerId() {
      return `ca-${this.gameId}-${this.roomCode}`;
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

    async connect() {
      if (!this.roomCode) {
        this.roomCode = generateRoomCode(this.codePrefix);
        this.isHost = true;
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
          this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 1600);
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
        if (pid && this.pendingRequests[pid]) {
          delete this.pendingRequests[pid];
          this.onJoinRequestsChange(this.getPendingRequests());
        }
        if (pid && this.players[pid] && !this.players[pid].isLocal) {
          delete this.players[pid];
          this.emitRoster();
          this.broadcastRoster();
        }
        if (Object.keys(this.conns).length === 0 && !this.destroyed) {
          this.onStatusChange('ok', 'Room Online');
        }
      };

      conn.on('close', onDrop);
      conn.on('error', onDrop);
    }

    connectToHostPeer() {
      if (this.destroyed || this.isHost || this.declined || !this.peer || this.peer.destroyed) return;
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
          avatar: this.myAvatar,
          accountHandle: this.myAccountHandle,
          trophyCount: this.myTrophyCount,
          isController: this.controllerMode,
          requireApproval: this.requireApproval,
        });
      });

      conn.on('data', (data) => {
        this.handlePacket(data, conn);
      });

      const onDrop = () => {
        if (this.destroyed || this.declined || this.kicked) return;
        this.hostConn = null;
        this.onStatusChange('warn', 'Reconnecting...');
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectToHostPeer(), 2000);
      };

      conn.on('close', onDrop);
      conn.on('error', onDrop);
    }

    _admitPlayer(sender, data, fromConn) {
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
        this.sendToPlayer(playerId, { type: 'JOIN_ACCEPTED' });
      }
      return ok;
    }

    declineJoinRequest(playerId) {
      if (!this.isHost) return false;
      const req = this.pendingRequests[playerId];
      if (!req) return false;
      delete this.pendingRequests[playerId];
      this.onJoinRequestsChange(this.getPendingRequests());

      if (req.conn && req.conn.open) {
        try { req.conn.send({ type: 'JOIN_DECLINED', senderId: this.myId, targetId: playerId }); } catch (e) {}
        setTimeout(() => {
          try { req.conn.close(); } catch (e) {}
        }, 120);
      } else {
        this.sendSignal({ type: 'JOIN_DECLINED', targetId: playerId });
      }
      return true;
    }

    lookupRemoteAccount(username, pin) {
      return new Promise((resolve) => {
        if (this.isHost || !this.hostConn || !this.hostConn.open) {
          resolve({ ok: false, notFound: true });
          return;
        }
        const reqId = 'lk_' + Math.random().toString(36).slice(2, 8);
        const timer = setTimeout(() => {
          delete this.pendingLookups[reqId];
          resolve({ ok: false, notFound: true });
        }, 3500);
        this.pendingLookups[reqId] = { resolve, timer };
        try {
          this.hostConn.send({
            type: 'ACCOUNT_LOOKUP',
            senderId: this.myId,
            reqId,
            username,
            pin,
          });
        } catch (e) {
          clearTimeout(timer);
          delete this.pendingLookups[reqId];
          resolve({ ok: false, notFound: true });
        }
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
      this.broadcastRoster();
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

      if (data.type === 'ACCOUNT_LOOKUP' && this.isHost) {
        let res = { ok: false, notFound: true };
        if (global.CouchAccounts && global.CouchAccounts.verifyAccountCredentials) {
          res = global.CouchAccounts.verifyAccountCredentials(data.username, data.pin);
        }
        const reply = {
          type: 'ACCOUNT_LOOKUP_RES',
          senderId: this.myId,
          targetId: data.senderId,
          reqId: data.reqId,
          ok: Boolean(res.ok),
          error: res.error || '',
          account: res.ok ? res.account : null,
        };
        if (fromConn && fromConn.open) {
          try { fromConn.send(reply); } catch (e) {}
        }
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

        // If joining from Main Menu Open Rooms list and not already admitted -> queue for Host acceptance!
        if (data.requireApproval && !this.players[sender]) {
          const usedCount = Object.keys(this.players).length;
          if (usedCount >= this.maxPlayers) {
            if (fromConn && fromConn.open) {
              try { fromConn.send({ type: 'ROOM_FULL', senderId: this.myId }); } catch (e) {}
            }
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
          if (fromConn && fromConn.open) {
            try { fromConn.send({ type: 'JOIN_PENDING', senderId: this.myId, targetId: sender, tvMode: this.tvMode }); } catch (e) {}
          } else {
            this.sendSignal({ type: 'JOIN_PENDING', targetId: sender, tvMode: this.tvMode });
          }
          return;
        }

        this._admitPlayer(sender, data, fromConn);
        return;
      }

      if (data.type === 'JOIN_PENDING' && !this.isHost) {
        this.roomHasTv = Boolean(data.tvMode);
        this.onJoinPending();
        return;
      }

      if (data.type === 'JOIN_ACCEPTED' && !this.isHost) {
        this.requireApproval = false;
        this.onJoinAccepted();
        return;
      }

      if (data.type === 'JOIN_DECLINED' && !this.isHost) {
        this.declined = true;
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
      for (const entry of Object.values(this.pendingLookups)) {
        clearTimeout(entry.timer);
      }
      this.pendingLookups = {};
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
    getStablePlayerId,
    getSavedPlayerName,
    getSavedProfileMeta,
    savePlayerName,
    ensurePeerJs,
  };
})(window);
