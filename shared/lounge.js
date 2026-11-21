/**
 * Couch Arcade — Live Open Rooms Directory & TV Main Menu Casting Party
 * Dual-transport: NAT-proof WSS MQTT Relay + PeerJS WebRTC P2P + BroadcastChannel.
 */
(function (global) {
  'use strict';

  const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const LS_ROOMS_KEY = 'ca_lounge_rooms_v1';
  const ROOM_TTL_MS = 24000;

  function getHostScope() {
    const raw = (global.location && global.location.host) ? global.location.host : 'local';
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'local';
  }

  function getBeaconPeerId() {
    return `ca-lounge-${getHostScope()}-0`;
  }

  function ensurePeerJs() {
    if (global.CouchRoom && global.CouchRoom.ensurePeerJs) {
      return global.CouchRoom.ensurePeerJs();
    }
    if (typeof global.Peer === 'function') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function readLocalRooms() {
    try {
      const raw = localStorage.getItem(LS_ROOMS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const out = {};
      for (const [k, v] of Object.entries(map || {})) {
        if (v && v.code && now - (v.updatedAt || 0) < ROOM_TTL_MS) {
          out[k] = v;
        }
      }
      return out;
    } catch (e) {
      return {};
    }
  }

  function writeLocalRooms(map) {
    try {
      localStorage.setItem(LS_ROOMS_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  /**
   * LoungeClient — broadcasts and discovers Open Game Rooms live across all devices
   * via WSS MQTT Relay + BroadcastChannel + localStorage.
   */
  class LoungeClient {
    constructor(opts = {}) {
      this.onRoomsChange = opts.onRoomsChange || (() => {});
      this.clientId = 'lg_' + Math.random().toString(36).slice(2, 10);
      this.rooms = readLocalRooms(); // code -> roomInfo
      this.ownRoom = null;
      this.relay = null;
      this.bc = null;
      this.destroyed = false;
      this.hbTimer = null;
      this.sweepTimer = null;
    }

    start() {
      if ('BroadcastChannel' in global) {
        this.bc = new BroadcastChannel(`ca_lounge_bc_${getHostScope()}`);
        this.bc.onmessage = (ev) => this._handleMsg(ev.data);
        try { this.bc.postMessage({ type: 'LOUNGE_HELLO', from: this.clientId }); } catch (e) {}
      }

      if (global.CouchWsRelay && global.CouchWsRelay.WsRelayChannel) {
        this.relay = new global.CouchWsRelay.WsRelayChannel('lounge/open-rooms', {
          onOpen: () => {
            if (this.ownRoom) {
              this._announceOwnRoom();
            } else {
              this.relay.send({ type: 'LOUNGE_HELLO', from: this.clientId });
            }
          },
          onMessage: (msg) => this._handleMsg(msg),
        });
        this.relay.connect();
      }

      this._emitRooms();
      this.sweepTimer = setInterval(() => this._pruneExpired(), 4000);
      this.hbTimer = setInterval(() => {
        if (this.ownRoom) {
          this.ownRoom.updatedAt = Date.now();
          this._announceOwnRoom();
        }
      }, 6000);
    }

    _handleMsg(msg) {
      if (!msg || msg.from === this.clientId) return;
      if (msg.type === 'LOUNGE_PUT' && msg.room && msg.room.code) {
        this._mergeRoom(msg.room);
      } else if (msg.type === 'LOUNGE_DEL' && msg.code) {
        this._deleteRoom(msg.code);
      } else if (msg.type === 'LOUNGE_HELLO' && this.ownRoom) {
        this.ownRoom.updatedAt = Date.now();
        this._announceOwnRoom();
      }
    }

    _mergeRoom(room) {
      this.rooms[room.code] = { ...room, updatedAt: Date.now() };
      writeLocalRooms(this.rooms);
      this._emitRooms();
    }

    _deleteRoom(code) {
      if (this.rooms[code]) {
        delete this.rooms[code];
        writeLocalRooms(this.rooms);
        this._emitRooms();
      }
    }

    _pruneExpired(emit = true) {
      const now = Date.now();
      let changed = false;
      for (const [k, v] of Object.entries(this.rooms)) {
        if (!v || now - (v.updatedAt || 0) >= ROOM_TTL_MS) {
          delete this.rooms[k];
          changed = true;
        }
      }
      if (changed) {
        writeLocalRooms(this.rooms);
        if (emit) this._emitRooms();
      }
    }

    _announceOwnRoom() {
      if (!this.ownRoom) return;
      this._mergeRoom(this.ownRoom);
      const pkt = { type: 'LOUNGE_PUT', from: this.clientId, room: this.ownRoom };
      if (this.bc) {
        try { this.bc.postMessage(pkt); } catch (e) {}
      }
      if (this.relay) {
        this.relay.send(pkt);
      }
    }

    publishRoom(roomInfo) {
      if (!roomInfo || !roomInfo.code) return;
      this.ownRoom = { ...roomInfo, updatedAt: Date.now() };
      this._announceOwnRoom();
    }

    unpublishRoom(code) {
      const target = code || (this.ownRoom && this.ownRoom.code);
      this.ownRoom = null;
      if (!target) return;
      this._deleteRoom(target);
      const pkt = { type: 'LOUNGE_DEL', from: this.clientId, code: target };
      if (this.bc) {
        try { this.bc.postMessage(pkt); } catch (e) {}
      }
      if (this.relay) {
        this.relay.send(pkt);
      }
    }

    getRooms() {
      this._pruneExpired(false);
      return Object.values(this.rooms).sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
    }

    _emitRooms() {
      this.onRoomsChange(this.getRooms());
    }

    destroy() {
      this.destroyed = true;
      if (this.ownRoom) this.unpublishRoom(this.ownRoom.code);
      clearInterval(this.hbTimer);
      clearInterval(this.sweepTimer);
      if (this.bc) { try { this.bc.close(); } catch (e) {} }
      if (this.relay) { try { this.relay.destroy(); } catch (e) {} }
    }
  }

  /**
   * HubPartyHost — Cast the Main Menu on TV and connect phones via QR code!
   * Dual-transport (WSS Relay + PeerJS) so any phone joins in <400ms!
   */
  class HubPartyHost {
    constructor(opts = {}) {
      this.partyCode = opts.partyCode || ('H' + Math.floor(100 + Math.random() * 900));
      this.myId = 'hubhost_' + Math.random().toString(36).slice(2, 8);
      this.onPlayersChange = opts.onPlayersChange || (() => {});
      this.onStatusChange = opts.onStatusChange || (() => {});
      this.onCaptainPickGame = opts.onCaptainPickGame || (() => {});
      this.players = {}; // id -> { id, name, avatar, accountHandle, trophyCount, slot }
      this.conns = {};
      this.peerToId = {};
      this.idToPeer = {};
      this.peer = null;
      this.relay = null;
      this.bc = null;
      this.destroyed = false;
    }

    get peerId() {
      return `ca-hub-${this.partyCode}`;
    }

    getOrderedPlayers() {
      return Object.values(this.players).sort((a, b) => a.slot - b.slot);
    }

    getJoinUrl() {
      const url = new URL(global.location.href);
      url.search = '';
      url.searchParams.set('hub', this.partyCode);
      url.searchParams.set('phone', '1');
      return url.toString();
    }

    _sendAll(msg) {
      const pkt = { ...msg, fromHost: this.myId };
      if (this.bc) {
        try { this.bc.postMessage(pkt); } catch (e) {}
      }
      for (const conn of Object.values(this.conns)) {
        if (conn && conn.open) {
          try { conn.send(pkt); } catch (e) {}
        }
      }
      if (this.relay) {
        this.relay.send(pkt);
      }
    }

    async start() {
      this.onStatusChange('warn', 'Starting TV Hub...');

      if ('BroadcastChannel' in global) {
        this.bc = new BroadcastChannel(`ca_hub_bc_${this.partyCode}`);
        this.bc.onmessage = (ev) => this._handleMessage(ev.data, null);
      }

      if (global.CouchWsRelay && global.CouchWsRelay.WsRelayChannel) {
        this.relay = new global.CouchWsRelay.WsRelayChannel(`hub/${this.partyCode}`, {
          onOpen: () => {
            this.onStatusChange('ok', 'TV Hub Ready · Scan QR!');
            this._sendAll({ type: 'HUB_HELLO', partyCode: this.partyCode, players: this.getOrderedPlayers() });
          },
          onMessage: (msg) => this._handleMessage(msg, null),
        });
        this.relay.connect();
      }

      try {
        await ensurePeerJs();
      } catch (e) {
        if (this.relay && this.relay.connected) {
          this.onStatusChange('ok', 'TV Hub Ready · Scan QR!');
        }
        return;
      }
      if (this.destroyed) return;
      const p = new global.Peer(this.peerId, { config: { iceServers: STUN_SERVERS } });
      this.peer = p;

      p.on('open', () => {
        this.onStatusChange('ok', 'TV Hub Ready · Scan QR!');
      });

      p.on('connection', (conn) => {
        this.conns[conn.peer] = conn;
        conn.on('open', () => {
          try { conn.send({ type: 'HUB_HELLO', partyCode: this.partyCode, players: this.getOrderedPlayers() }); } catch (e) {}
        });
        conn.on('data', (msg) => this._handleMessage(msg, conn));
        const onDrop = () => {
          delete this.conns[conn.peer];
          const pid = this.peerToId[conn.peer];
          delete this.peerToId[conn.peer];
          if (pid && this.idToPeer[pid] === conn.peer) delete this.idToPeer[pid];
        };
        conn.on('close', onDrop);
        conn.on('error', onDrop);
      });

      p.on('error', () => {
        if (!this.destroyed && (!this.relay || !this.relay.connected)) {
          this.onStatusChange('warn', 'Reconnecting TV Hub...');
        }
      });
    }

    _handleMessage(msg, conn) {
      if (!msg || !msg.type || msg.fromHost === this.myId) return;

      if (msg.type === 'ACCOUNT_LOOKUP') {
        let res = { ok: false, notFound: true };
        if (global.CouchAccounts && global.CouchAccounts.verifyAccountCredentials) {
          res = global.CouchAccounts.verifyAccountCredentials(msg.username, msg.pin);
        }
        const reply = {
          type: 'ACCOUNT_LOOKUP_RES',
          targetId: msg.senderId,
          reqId: msg.reqId,
          ok: Boolean(res.ok),
          error: res.error || '',
          account: res.ok ? res.account : null,
        };
        if (conn && conn.open) {
          try { conn.send(reply); } catch (e) {}
        }
        this._sendAll(reply);
        return;
      }

      if (msg.type === 'HUB_PING') {
        this._sendAll({ type: 'HUB_HELLO', partyCode: this.partyCode, players: this.getOrderedPlayers() });
        return;
      }

      if (msg.type === 'HUB_LEAVE' && msg.senderId && this.players[msg.senderId]) {
        delete this.players[msg.senderId];
        this._broadcastPartyState();
        return;
      }

      if (msg.type === 'HUB_JOIN' || msg.type === 'HUB_PROFILE') {
        const pid = msg.senderId;
        if (!pid) return;
        if (conn) {
          this.peerToId[conn.peer] = pid;
          this.idToPeer[pid] = conn.peer;
        }

        if (!this.players[pid]) {
          const used = new Set(Object.values(this.players).map((p) => p.slot));
          let slot = -1;
          for (let i = 0; i < 4; i++) {
            if (!used.has(i)) { slot = i; break; }
          }
          if (slot === -1) {
            this._sendAll({ type: 'HUB_FULL', targetId: pid });
            return;
          }
          this.players[pid] = {
            id: pid,
            slot,
            name: String(msg.name || `Player ${slot + 1}`).slice(0, 18),
            avatar: msg.avatar || '🛸',
            accountHandle: msg.accountHandle || '',
            trophyCount: Number(msg.trophyCount) || 0,
          };
        } else {
          if (msg.name) this.players[pid].name = String(msg.name).slice(0, 18);
          if (msg.avatar) this.players[pid].avatar = msg.avatar;
          if (msg.accountHandle !== undefined) this.players[pid].accountHandle = msg.accountHandle;
          if (msg.trophyCount !== undefined) this.players[pid].trophyCount = Number(msg.trophyCount) || 0;
        }
        this._broadcastPartyState();
        return;
      }

      if (msg.type === 'CAPTAIN_PICK_GAME' && msg.gameId) {
        const ordered = this.getOrderedPlayers();
        if (ordered.length > 0 && ordered[0].id === msg.senderId) {
          this.onCaptainPickGame(msg.gameId);
        }
      }
    }

    kickPlayer(pid) {
      this._sendAll({ type: 'HUB_KICKED', targetId: pid });
      const peerId = this.idToPeer[pid];
      const conn = peerId ? this.conns[peerId] : null;
      if (conn && conn.open) {
        setTimeout(() => { try { conn.close(); } catch (e) {} }, 120);
      }
      delete this.players[pid];
      delete this.idToPeer[pid];
      if (peerId) {
        delete this.peerToId[peerId];
        delete this.conns[peerId];
      }
      this._broadcastPartyState();
    }

    dispatchPartyToRoom({ gameId, roomCode }) {
      this._sendAll({ type: 'PARTY_GOTO_ROOM', gameId, roomCode });
    }

    _broadcastPartyState() {
      const ordered = this.getOrderedPlayers();
      this.onPlayersChange(ordered);
      this._sendAll({ type: 'HUB_STATE', players: ordered, partyCode: this.partyCode });
    }

    destroy() {
      this.destroyed = true;
      if (this.bc) { try { this.bc.close(); } catch (e) {} }
      if (this.relay) { try { this.relay.destroy(); } catch (e) {} }
      if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
    }
  }

  /**
   * HubPartyGuest — Phone connecting to TV Main Menu via QR code!
   */
  class HubPartyGuest {
    constructor(opts = {}) {
      this.partyCode = String(opts.partyCode || '').toUpperCase();
      this.myId = (global.CouchRoom && global.CouchRoom.getStablePlayerId)
        ? global.CouchRoom.getStablePlayerId()
        : ('p_' + Math.random().toString(36).slice(2, 10));
      this.onStatusChange = opts.onStatusChange || (() => {});
      this.onPlayersChange = opts.onPlayersChange || (() => {});
      this.onGotoRoom = opts.onGotoRoom || (() => {});
      this.onKicked = opts.onKicked || (() => {});
      this.onFull = opts.onFull || (() => {});
      this.peer = null;
      this.conn = null;
      this.relay = null;
      this.bc = null;
      this.pendingLookups = {};
      this.destroyed = false;
      this.joined = false;
      this.lastProfile = null;
      this.joinRetryTimer = null;

      this._onPageHide = () => {
        if (!this.destroyed) {
          this._sendToHost({ type: 'HUB_LEAVE', senderId: this.myId });
        }
      };
    }

    _sendToHost(msg) {
      if (this.bc) {
        try { this.bc.postMessage(msg); } catch (e) {}
      }
      if (this.conn && this.conn.open) {
        try { this.conn.send(msg); } catch (e) {}
      }
      if (this.relay) {
        this.relay.send(msg);
      }
    }

    async connect() {
      this.onStatusChange('warn', 'Connecting to TV Menu...');
      window.addEventListener('pagehide', this._onPageHide);

      if ('BroadcastChannel' in global) {
        this.bc = new BroadcastChannel(`ca_hub_bc_${this.partyCode}`);
        this.bc.onmessage = (ev) => this._handleHostMsg(ev.data);
      }

      if (global.CouchWsRelay && global.CouchWsRelay.WsRelayChannel) {
        this.relay = new global.CouchWsRelay.WsRelayChannel(`hub/${this.partyCode}`, {
          onOpen: () => {
            this.onStatusChange('ok', 'Connected to TV Menu!');
            this._sendToHost({ type: 'HUB_PING', senderId: this.myId });
            if (this.lastProfile) this.sendJoin(this.lastProfile);
          },
          onMessage: (msg) => this._handleHostMsg(msg),
        });
        this.relay.connect();
      }

      try {
        await ensurePeerJs();
      } catch (e) {
        return;
      }
      if (this.destroyed) return;
      const p = new global.Peer({ config: { iceServers: STUN_SERVERS } });
      this.peer = p;

      p.on('open', () => this._openConn());
      p.on('error', () => {
        if (!this.destroyed && (!this.relay || !this.relay.connected)) {
          this.onStatusChange('warn', 'Searching for TV Menu...');
        }
        setTimeout(() => this._openConn(), 2200);
      });
    }

    _openConn() {
      if (this.destroyed || !this.peer || this.peer.destroyed) return;
      if (this.conn && this.conn.open) return;
      let conn;
      try {
        conn = this.peer.connect(`ca-hub-${this.partyCode}`, { reliable: true });
      } catch (e) {
        return;
      }
      this.conn = conn;

      conn.on('open', () => {
        this.onStatusChange('ok', 'Connected to TV Menu!');
        if (this.lastProfile) this.sendJoin(this.lastProfile);
      });

      conn.on('data', (msg) => this._handleHostMsg(msg));

      conn.on('close', () => {
        if (this.conn === conn) this.conn = null;
        if (!this.destroyed) {
          setTimeout(() => this._openConn(), 2500);
        }
      });
    }

    _handleHostMsg(msg) {
      if (!msg || !msg.type) return;
      if (msg.targetId && msg.targetId !== this.myId) return;

      if (msg.type === 'ACCOUNT_LOOKUP_RES') {
        const entry = this.pendingLookups[msg.reqId];
        if (entry) {
          clearTimeout(entry.timer);
          delete this.pendingLookups[msg.reqId];
          entry.resolve({ ok: msg.ok, error: msg.error, account: msg.account });
        }
        return;
      }
      if (msg.type === 'HUB_HELLO') {
        this.onStatusChange('ok', 'Connected to TV Menu!');
        if (this.lastProfile && !this.joined) {
          this.sendJoin(this.lastProfile);
        }
        return;
      }
      if (msg.type === 'HUB_STATE' && Array.isArray(msg.players)) {
        this.joined = msg.players.some((p) => p.id === this.myId);
        if (this.joined && this.joinRetryTimer) {
          clearInterval(this.joinRetryTimer);
          this.joinRetryTimer = null;
        }
        this.onPlayersChange(msg.players);
        if (this.joined && global.CouchAccounts) {
          global.CouchAccounts.unlockAchievement('hub_tv_party');
        }
      } else if (msg.type === 'PARTY_GOTO_ROOM' && msg.gameId && msg.roomCode) {
        this.onGotoRoom({ gameId: msg.gameId, roomCode: msg.roomCode });
      } else if (msg.type === 'HUB_KICKED') {
        this.destroy();
        this.onKicked();
      } else if (msg.type === 'HUB_FULL') {
        this.onFull();
      }
    }

    sendJoin(profile) {
      this.lastProfile = { ...profile };
      const pkt = {
        type: 'HUB_JOIN',
        senderId: this.myId,
        name: profile.name,
        avatar: profile.avatar || '🛸',
        accountHandle: profile.accountHandle || '',
        trophyCount: Number(profile.trophyCount) || 0,
      };
      this._sendToHost(pkt);
      if (!this.joinRetryTimer) {
        this.joinRetryTimer = setInterval(() => {
          if (this.destroyed || this.joined || !this.lastProfile) {
            clearInterval(this.joinRetryTimer);
            this.joinRetryTimer = null;
            return;
          }
          this._sendToHost({
            type: 'HUB_JOIN',
            senderId: this.myId,
            name: this.lastProfile.name,
            avatar: this.lastProfile.avatar || '🛸',
            accountHandle: this.lastProfile.accountHandle || '',
            trophyCount: Number(this.lastProfile.trophyCount) || 0,
          });
        }, 1200);
      }
    }

    pickGame(gameId) {
      this._sendToHost({ type: 'CAPTAIN_PICK_GAME', senderId: this.myId, gameId });
    }

    lookupRemoteAccount(username, pin) {
      return new Promise((resolve) => {
        const canSend = (this.conn && this.conn.open) || (this.relay && this.relay.connected);
        if (!canSend) {
          resolve({ ok: false, notFound: true });
          return;
        }
        const reqId = 'hlk_' + Math.random().toString(36).slice(2, 8);
        const timer = setTimeout(() => {
          delete this.pendingLookups[reqId];
          resolve({ ok: false, notFound: true });
        }, 4000);
        this.pendingLookups[reqId] = { resolve, timer };
        this._sendToHost({ type: 'ACCOUNT_LOOKUP', senderId: this.myId, reqId, username, pin });
      });
    }

    destroy() {
      this.destroyed = true;
      window.removeEventListener('pagehide', this._onPageHide);
      clearInterval(this.joinRetryTimer);
      for (const e of Object.values(this.pendingLookups)) clearTimeout(e.timer);
      this.pendingLookups = {};
      if (this.bc) { try { this.bc.close(); } catch (e) {} }
      if (this.relay) { try { this.relay.destroy(); } catch (e) {} }
      if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
    }
  }

  global.CouchLounge = {
    LoungeClient,
    HubPartyHost,
    HubPartyGuest,
    getBeaconPeerId,
  };
})(window);
