/**
 * Couch Arcade — Live Open Rooms Directory (PeerJS Lounge Beacon + BroadcastChannel)
 * & TV Main Menu Casting Party (CouchHubParty)
 */
(function (global) {
  'use strict';

  const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const LS_ROOMS_KEY = 'ca_lounge_rooms_v1';
  const ROOM_TTL_MS = 22000;

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
   * LoungeClient — participates in the self-electing PeerJS Lounge Beacon
   * so Open Game Rooms appear live on every Main Menu (same-browser & cross-device!).
   */
  class LoungeClient {
    constructor(opts = {}) {
      this.onRoomsChange = opts.onRoomsChange || (() => {});
      this.rooms = readLocalRooms(); // code -> roomInfo
      this.ownRoom = null;
      this.isBeacon = false;
      this.peer = null;
      this.beaconConn = null;
      this.clients = new Set(); // when isBeacon
      this.bc = null;
      this.destroyed = false;
      this.hbTimer = null;
      this.retryTimer = null;
      this.sweepTimer = null;
    }

    start() {
      if ('BroadcastChannel' in global) {
        this.bc = new BroadcastChannel(`ca_lounge_bc_${getHostScope()}`);
        this.bc.onmessage = (ev) => {
          const msg = ev.data;
          if (!msg) return;
          if (msg.type === 'LOUNGE_PUT' && msg.room && msg.room.code) {
            this._mergeRoom(msg.room);
          } else if (msg.type === 'LOUNGE_DEL' && msg.code) {
            this._deleteRoom(msg.code);
          } else if (msg.type === 'LOUNGE_HELLO' && this.ownRoom) {
            try { this.bc.postMessage({ type: 'LOUNGE_PUT', room: this.ownRoom }); } catch (e) {}
          }
        };
        try { this.bc.postMessage({ type: 'LOUNGE_HELLO' }); } catch (e) {}
      }

      this._emitRooms();
      this.sweepTimer = setInterval(() => this._pruneExpired(), 4000);
      this.hbTimer = setInterval(() => {
        if (this.ownRoom) {
          this.ownRoom.updatedAt = Date.now();
          this._announceOwnRoom();
        }
      }, 5000);

      ensurePeerJs()
        .then(() => {
          if (!this.destroyed) this._tryClaimOrConnect();
        })
        .catch(() => {});
    }

    _tryClaimOrConnect() {
      if (this.destroyed) return;
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
        this.peer = null;
      }
      this.isBeacon = false;
      this.beaconConn = null;
      this.clients.clear();

      const peerOpts = { config: { iceServers: STUN_SERVERS } };
      const beaconId = getBeaconPeerId();
      const p = new global.Peer(beaconId, peerOpts);
      this.peer = p;

      p.on('open', () => {
        if (this.destroyed) return;
        this.isBeacon = true;
        if (this.ownRoom) this._mergeRoom(this.ownRoom);
      });

      p.on('connection', (conn) => {
        if (!this.isBeacon) return;
        this.clients.add(conn);
        conn.on('open', () => {
          this._pruneExpired(false);
          try { conn.send({ type: 'LOUNGE_LIST', rooms: Object.values(this.rooms) }); } catch (e) {}
        });
        conn.on('data', (msg) => {
          if (!msg) return;
          if (msg.type === 'LOUNGE_PUT' && msg.room && msg.room.code) {
            this._mergeRoom(msg.room);
            this._beaconBroadcastList();
          } else if (msg.type === 'LOUNGE_DEL' && msg.code) {
            this._deleteRoom(msg.code);
            this._beaconBroadcastList();
          } else if (msg.type === 'LOUNGE_REQ') {
            this._pruneExpired(false);
            try { conn.send({ type: 'LOUNGE_LIST', rooms: Object.values(this.rooms) }); } catch (e) {}
          }
        });
        const cleanup = () => {
          this.clients.delete(conn);
        };
        conn.on('close', cleanup);
        conn.on('error', cleanup);
      });

      p.on('error', (err) => {
        if (this.destroyed) return;
        if (err && err.type === 'unavailable-id') {
          // Someone else is already the Lounge Beacon -> connect as a client!
          try { p.destroy(); } catch (e) {}
          this._connectAsClient();
        } else {
          clearTimeout(this.retryTimer);
          this.retryTimer = setTimeout(() => this._tryClaimOrConnect(), 3500);
        }
      });
    }

    _connectAsClient() {
      if (this.destroyed) return;
      const peerOpts = { config: { iceServers: STUN_SERVERS } };
      const p = new global.Peer(peerOpts);
      this.peer = p;
      this.isBeacon = false;

      p.on('open', () => {
        if (this.destroyed) return;
        const conn = p.connect(getBeaconPeerId(), { reliable: true });
        this.beaconConn = conn;

        conn.on('open', () => {
          try { conn.send({ type: 'LOUNGE_REQ' }); } catch (e) {}
          if (this.ownRoom) {
            try { conn.send({ type: 'LOUNGE_PUT', room: this.ownRoom }); } catch (e) {}
          }
        });

        conn.on('data', (msg) => {
          if (!msg) return;
          if (msg.type === 'LOUNGE_LIST' && Array.isArray(msg.rooms)) {
            const now = Date.now();
            const next = {};
            msg.rooms.forEach((r) => {
              if (r && r.code && now - (r.updatedAt || now) < ROOM_TTL_MS) {
                next[r.code] = r;
              }
            });
            if (this.ownRoom && this.ownRoom.code) {
              next[this.ownRoom.code] = this.ownRoom;
            }
            this.rooms = next;
            this._emitRooms();
          }
        });

        const onLost = () => {
          if (this.destroyed) return;
          this.beaconConn = null;
          clearTimeout(this.retryTimer);
          // Beacon may have left -> try reclaiming or reconnecting after short jitter
          const jitter = 600 + Math.floor(Math.random() * 900);
          this.retryTimer = setTimeout(() => this._tryClaimOrConnect(), jitter);
        };
        conn.on('close', onLost);
        conn.on('error', onLost);
      });

      p.on('error', () => {
        if (this.destroyed) return;
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => this._tryClaimOrConnect(), 2200);
      });
    }

    _beaconBroadcastList() {
      if (!this.isBeacon) return;
      this._pruneExpired(false);
      const list = Object.values(this.rooms);
      for (const conn of this.clients) {
        if (conn && conn.open) {
          try { conn.send({ type: 'LOUNGE_LIST', rooms: list }); } catch (e) {}
        }
      }
    }

    _mergeRoom(room) {
      this.rooms[room.code] = { ...room, updatedAt: room.updatedAt || Date.now() };
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
      if (this.bc) {
        try { this.bc.postMessage({ type: 'LOUNGE_PUT', room: this.ownRoom }); } catch (e) {}
      }
      if (this.isBeacon) {
        this._beaconBroadcastList();
      } else if (this.beaconConn && this.beaconConn.open) {
        try { this.beaconConn.send({ type: 'LOUNGE_PUT', room: this.ownRoom }); } catch (e) {}
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
      if (this.bc) {
        try { this.bc.postMessage({ type: 'LOUNGE_DEL', code: target }); } catch (e) {}
      }
      if (this.isBeacon) {
        this._beaconBroadcastList();
      } else if (this.beaconConn && this.beaconConn.open) {
        try { this.beaconConn.send({ type: 'LOUNGE_DEL', code: target }); } catch (e) {}
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
      clearTimeout(this.retryTimer);
      if (this.bc) { try { this.bc.close(); } catch (e) {} }
      if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
    }
  }

  /**
   * CouchHubParty — Cast the Main Menu on TV and connect phones via QR code!
   * Phones sign into their account (or create one), show up right on the TV Main Menu,
   * and transition automatically with the TV into whichever game is picked.
   */
  class HubPartyHost {
    constructor(opts = {}) {
      this.partyCode = opts.partyCode || ('H' + Math.floor(100 + Math.random() * 900));
      this.onPlayersChange = opts.onPlayersChange || (() => {});
      this.onStatusChange = opts.onStatusChange || (() => {});
      this.onCaptainPickGame = opts.onCaptainPickGame || (() => {});
      this.players = {}; // id -> { id, name, avatar, accountHandle, trophyCount, slot }
      this.conns = {}; // peerId -> conn
      this.peerToId = {};
      this.idToPeer = {};
      this.peer = null;
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

    async start() {
      this.onStatusChange('warn', 'Starting TV Hub...');
      try {
        await ensurePeerJs();
      } catch (e) {
        this.onStatusChange('warn', 'Offline');
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
        conn.on('data', (msg) => this._handleMessage(msg, conn));
        const onDrop = () => {
          delete this.conns[conn.peer];
          const pid = this.peerToId[conn.peer];
          delete this.peerToId[conn.peer];
          if (pid && this.players[pid]) {
            delete this.players[pid];
            delete this.idToPeer[pid];
            this._broadcastPartyState();
          }
        };
        conn.on('close', onDrop);
        conn.on('error', onDrop);
      });

      p.on('error', () => {
        if (!this.destroyed) this.onStatusChange('warn', 'Reconnecting TV Hub...');
      });
    }

    _handleMessage(msg, conn) {
      if (!msg || !msg.type) return;

      if (msg.type === 'ACCOUNT_LOOKUP') {
        let res = { ok: false, notFound: true };
        if (global.CouchAccounts && global.CouchAccounts.verifyAccountCredentials) {
          res = global.CouchAccounts.verifyAccountCredentials(msg.username, msg.pin);
        }
        try {
          conn.send({
            type: 'ACCOUNT_LOOKUP_RES',
            reqId: msg.reqId,
            ok: Boolean(res.ok),
            error: res.error || '',
            account: res.ok ? res.account : null,
          });
        } catch (e) {}
        return;
      }

      if (msg.type === 'HUB_JOIN' || msg.type === 'HUB_PROFILE') {
        const pid = msg.senderId;
        if (!pid) return;
        this.peerToId[conn.peer] = pid;
        this.idToPeer[pid] = conn.peer;

        if (!this.players[pid]) {
          const used = new Set(Object.values(this.players).map((p) => p.slot));
          let slot = -1;
          for (let i = 0; i < 4; i++) {
            if (!used.has(i)) { slot = i; break; }
          }
          if (slot === -1) {
            try { conn.send({ type: 'HUB_FULL' }); } catch (e) {}
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
      const peerId = this.idToPeer[pid];
      const conn = peerId ? this.conns[peerId] : null;
      if (conn && conn.open) {
        try { conn.send({ type: 'HUB_KICKED' }); } catch (e) {}
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
      const msg = { type: 'PARTY_GOTO_ROOM', gameId, roomCode };
      for (const conn of Object.values(this.conns)) {
        if (conn && conn.open) {
          try { conn.send(msg); } catch (e) {}
        }
      }
    }

    _broadcastPartyState() {
      const ordered = this.getOrderedPlayers();
      this.onPlayersChange(ordered);
      const msg = { type: 'HUB_STATE', players: ordered, partyCode: this.partyCode };
      for (const conn of Object.values(this.conns)) {
        if (conn && conn.open) {
          try { conn.send(msg); } catch (e) {}
        }
      }
    }

    destroy() {
      this.destroyed = true;
      if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
    }
  }

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
      this.pendingLookups = {};
      this.destroyed = false;
      this.joined = false;
      this.lastProfile = null;
    }

    async connect() {
      this.onStatusChange('warn', 'Connecting to TV Menu...');
      try {
        await ensurePeerJs();
      } catch (e) {
        this.onStatusChange('warn', 'Offline');
        return;
      }
      if (this.destroyed) return;
      const p = new global.Peer({ config: { iceServers: STUN_SERVERS } });
      this.peer = p;

      p.on('open', () => this._openConn());
      p.on('error', () => {
        if (!this.destroyed) {
          this.onStatusChange('warn', 'Searching for TV Menu...');
          setTimeout(() => this._openConn(), 1800);
        }
      });
    }

    _openConn() {
      if (this.destroyed || !this.peer || this.peer.destroyed) return;
      const conn = this.peer.connect(`ca-hub-${this.partyCode}`, { reliable: true });
      this.conn = conn;

      conn.on('open', () => {
        this.onStatusChange('ok', 'Connected to TV Menu!');
        if (this.lastProfile) {
          this.sendJoin(this.lastProfile);
        }
      });

      conn.on('data', (msg) => {
        if (!msg || !msg.type) return;
        if (msg.type === 'ACCOUNT_LOOKUP_RES') {
          const entry = this.pendingLookups[msg.reqId];
          if (entry) {
            clearTimeout(entry.timer);
            delete this.pendingLookups[msg.reqId];
            entry.resolve({ ok: msg.ok, error: msg.error, account: msg.account });
          }
          return;
        }
        if (msg.type === 'HUB_STATE' && Array.isArray(msg.players)) {
          this.joined = msg.players.some((p) => p.id === this.myId);
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
      });

      conn.on('close', () => {
        if (!this.destroyed) {
          this.onStatusChange('warn', 'Reconnecting to TV...');
          setTimeout(() => this._openConn(), 2000);
        }
      });
    }

    sendJoin(profile) {
      this.lastProfile = { ...profile };
      if (!this.conn || !this.conn.open) return;
      try {
        this.conn.send({
          type: 'HUB_JOIN',
          senderId: this.myId,
          name: profile.name,
          avatar: profile.avatar || '🛸',
          accountHandle: profile.accountHandle || '',
          trophyCount: Number(profile.trophyCount) || 0,
        });
      } catch (e) {}
    }

    pickGame(gameId) {
      if (!this.conn || !this.conn.open) return;
      try {
        this.conn.send({ type: 'CAPTAIN_PICK_GAME', senderId: this.myId, gameId });
      } catch (e) {}
    }

    lookupRemoteAccount(username, pin) {
      return new Promise((resolve) => {
        if (!this.conn || !this.conn.open) {
          resolve({ ok: false, notFound: true });
          return;
        }
        const reqId = 'hlk_' + Math.random().toString(36).slice(2, 8);
        const timer = setTimeout(() => {
          delete this.pendingLookups[reqId];
          resolve({ ok: false, notFound: true });
        }, 3500);
        this.pendingLookups[reqId] = { resolve, timer };
        try {
          this.conn.send({ type: 'ACCOUNT_LOOKUP', reqId, username, pin });
        } catch (e) {
          clearTimeout(timer);
          delete this.pendingLookups[reqId];
          resolve({ ok: false, notFound: true });
        }
      });
    }

    destroy() {
      this.destroyed = true;
      for (const e of Object.values(this.pendingLookups)) clearTimeout(e.timer);
      this.pendingLookups = {};
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
