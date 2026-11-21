/* ==========================================================================
   ASTRO PURGE — Old-School Cartoon 4-Player UFO Co-op
   Follow-Finger iOS Touch | Personal Visual UFO Upgrades | Damage Meter |
   Multi-Phase Bosses every 10 Levels | Host Kick | PeerJS 4P Rooms
   ========================================================================== */

(function () {
  'use strict';

  const { RoomSync, PLAYER_COLORS, getSavedPlayerName } = window.CouchRoom;

  // ---- Canvas & Context ----
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth;
  let H = window.innerHeight;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- DOM Elements ----
  const hudEl = document.getElementById('hud');
  const hudLevel = document.getElementById('hud-level');
  const hudScore = document.getElementById('hud-score');
  const hudXpFill = document.getElementById('hud-xp-fill');
  const hudBossHint = document.getElementById('hud-boss-hint');
  const hudControllers = document.getElementById('hud-controllers');
  const hudKills = document.getElementById('hud-kills');
  const damageMeterEl = document.getElementById('damage-meter');
  const playerHudCards = document.getElementById('player-hud-cards');
  const weaponsTray = document.getElementById('weapons-tray');
  const btnHudInvite = document.getElementById('btn-hud-invite');
  const btnPause = document.getElementById('btn-pause');
  const btnAutofire = document.getElementById('btn-autofire');
  const btnMute = document.getElementById('btn-mute');

  const bossBarWrap = document.getElementById('boss-bar-wrap');
  const bossNameEl = document.getElementById('boss-name');
  const bossHpText = document.getElementById('boss-hp-text');
  const bossHpFill = document.getElementById('boss-hp-fill');
  const bossWarningEl = document.getElementById('boss-warning');
  const bossWarningTitle = document.getElementById('boss-warning-title');
  const bossWarningSub = document.getElementById('boss-warning-sub');

  const titleOverlay = document.getElementById('title-overlay');
  const upgradeOverlay = document.getElementById('upgrade-overlay');
  const pauseOverlay = document.getElementById('pause-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const kickedOverlay = document.getElementById('kicked-overlay');

  const lobbyRoomCode = document.getElementById('lobby-room-code');
  const lobbyPlayerName = document.getElementById('lobby-player-name');
  const lobbyRoomStatus = document.getElementById('lobby-room-status');
  const lobbyRosterGrid = document.getElementById('lobby-roster-grid');
  const btnCopyInvite = document.getElementById('btn-copy-invite');
  const btnAddLocal = document.getElementById('btn-add-local');
  const btnLaunch = document.getElementById('btn-launch');
  const titlePadHint = document.getElementById('title-pad-hint');

  const draftEyebrow = document.getElementById('draft-eyebrow');
  const draftTitle = document.getElementById('draft-title');
  const draftSub = document.getElementById('draft-sub');
  const upgradeGrid = document.getElementById('upgrade-grid');
  const draftWaitingEl = document.getElementById('draft-waiting');

  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const sumLevel = document.getElementById('sum-level');
  const sumScore = document.getElementById('sum-score');
  const sumBosses = document.getElementById('sum-bosses');
  const gameoverSub = document.getElementById('gameover-sub');
  const gameoverDamageList = document.getElementById('gameover-damage-list');

  // ---- Synthesized Web Audio SFX ----
  const SFX = {
    ctx: null,
    muted: false,
    xpCombo: 0,
    lastXpAt: 0,
    lastShootAt: 0,
    ensure() {
      if (this.muted) return null;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },
    tone(freq, endFreq, dur, type = 'triangle', vol = 0.1) {
      const c = this.ensure();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur);
    },
    noise(dur = 0.12, vol = 0.08, filterFreq = 900) {
      const c = this.ensure();
      if (!c) return;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, c.currentTime);
      const gain = c.createGain();
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
    },
    shoot() {
      const now = performance.now();
      if (now - this.lastShootAt < 55) return;
      this.lastShootAt = now;
      this.tone(740, 210, 0.065, 'triangle', 0.05);
    },
    rail() { this.tone(1120, 150, 0.2, 'sawtooth', 0.085); this.noise(0.12, 0.05, 1800); },
    missile() { this.tone(320, 680, 0.11, 'sine', 0.055); this.noise(0.08, 0.035, 1400); },
    zap() { this.tone(940, 420, 0.085, 'square', 0.055); },
    nova() { this.tone(260, 52, 0.34, 'sine', 0.13); this.noise(0.24, 0.08, 700); },
    hit() { this.tone(210, 80, 0.045, 'square', 0.04); },
    pop() { this.tone(240, 58, 0.14, 'sawtooth', 0.075); this.noise(0.11, 0.065, 950); },
    xp() {
      const now = performance.now();
      if (now - this.lastXpAt < 450) this.xpCombo = Math.min(8, this.xpCombo + 1);
      else this.xpCombo = 0;
      this.lastXpAt = now;
      const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98];
      const f = scale[this.xpCombo % scale.length];
      this.tone(f, f * 1.32, 0.09, 'sine', 0.075);
    },
    heal() {
      this.tone(523.25, 659.25, 0.12, 'sine', 0.09);
      setTimeout(() => this.tone(659.25, 1046.5, 0.18, 'sine', 0.09), 70);
    },
    dash() { this.tone(280, 740, 0.13, 'triangle', 0.08); this.noise(0.1, 0.045, 2200); },
    hurt() { this.tone(165, 50, 0.22, 'sawtooth', 0.11); this.noise(0.14, 0.07, 600); },
    levelUp() {
      this.tone(440, 440, 0.12, 'triangle', 0.1);
      setTimeout(() => this.tone(554.37, 554.37, 0.12, 'triangle', 0.1), 85);
      setTimeout(() => this.tone(659.25, 880, 0.26, 'triangle', 0.11), 170);
    },
    bossWarn() {
      this.tone(180, 260, 0.25, 'sawtooth', 0.11);
      setTimeout(() => this.tone(180, 260, 0.25, 'sawtooth', 0.11), 300);
    },
    bossDead() {
      this.noise(0.38, 0.12, 800);
      this.tone(220, 440, 0.22, 'triangle', 0.12);
      setTimeout(() => this.tone(330, 660, 0.26, 'triangle', 0.12), 140);
      setTimeout(() => this.tone(440, 880, 0.45, 'triangle', 0.13), 280);
    },
  };

  ['touchstart', 'pointerdown', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => SFX.ensure(), { passive: true, once: true });
  });

  // ---- Personal Upgrade Catalog (Each Visually Upgrades Your UFO!) ----
  const UPGRADES = [
    {
      id: 'pulse_cannon',
      name: 'Ray Blasters',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '⚡',
      maxLevel: 5,
      describe: (nextLv) => `Mounts ${nextLv}-barrel ray blasters on your UFO rim with faster fire rate.`,
    },
    {
      id: 'plasma_rail',
      name: 'Dome Laser Dish',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '💠',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Mounts a crystalline laser dish on your UFO dome that zaps piercing beams.'
          : `Laser Dish Lv ${nextLv}: +30% beam power, thicker beam, faster recharge.`,
    },
    {
      id: 'homing_missiles',
      name: 'Retro Rocket Pods',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '🚀',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Bolts twin striped rocket pods onto your UFO that launch homing missiles!'
          : `Rocket Pods Lv ${nextLv}: Fires ${nextLv + 1} seeking rockets per volley.`,
    },
    {
      id: 'orbital_blades',
      name: 'Star Saw Satellites',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '🌀',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Deploys spinning cartoon star-saws around your UFO that slice viruses & block globs.'
          : `Star Saws Lv ${nextLv}: ${nextLv + 1} faster orbiting saws around your saucer.`,
    },
    {
      id: 'chain_lightning',
      name: 'Tesla Antennae',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '🌩️',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Adds crackling Tesla coils to your UFO that arc lightning across viruses.'
          : `Tesla Coils Lv ${nextLv}: Zaps ${nextLv + 2} viruses per chain with higher voltage.`,
    },
    {
      id: 'nova_pulse',
      name: 'Bumper Shock Ring',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '💥',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Installs a glowing bumper ring that periodically blasts viruses & clears red enemy globs.'
          : `Shock Ring Lv ${nextLv}: Bigger blast radius and quicker recharge.`,
    },
    {
      id: 'hull_plating',
      name: 'Riveted Saucer Armor',
      tag: 'Defense',
      tagClass: '',
      icon: '🛡️',
      maxLevel: 6,
      describe: () => 'Bolts steel armor plates onto your UFO: +30 Max HP & heals +45 HP now.',
    },
    {
      id: 'overclock',
      name: 'Turbo Ray Core',
      tag: 'Power',
      tagClass: '',
      icon: '🔥',
      maxLevel: 6,
      describe: () => '+22% damage for all your UFO weapons and +8% Critical Strike chance.',
    },
    {
      id: 'thrusters',
      name: 'Twin Booster Bells',
      tag: 'Mobility',
      tagClass: '',
      icon: '💨',
      maxLevel: 5,
      describe: () => 'Adds oversized cartoon thrusters: +13% flight speed & -16% Dash cooldown.',
    },
    {
      id: 'cryo_rounds',
      name: 'Frost Crystal Fins',
      tag: 'Utility',
      tagClass: '',
      icon: '❄️',
      maxLevel: 4,
      describe: (nextLv) =>
        `Adds icy fins to your saucer — your hits chill & slow viruses by ${Math.min(55, 18 + nextLv * 10)}%.`,
    },
    {
      id: 'magnet_core',
      name: 'Horseshoe Magnet',
      tag: 'Utility',
      tagClass: '',
      icon: '🧲',
      maxLevel: 5,
      describe: () => 'Mounts a giant magnet on your UFO: +45% orb pull radius & +15% Team XP.',
    },
    {
      id: 'tether_beam',
      name: 'Buddy Plasma Link',
      tag: 'Co-op',
      tagClass: 'coop',
      icon: '🔗',
      maxLevel: 5,
      describe: (nextLv, isCoop) =>
        isCoop
          ? nextLv === 1
            ? 'Creates a crackling plasma link between your UFO and nearby teammates!'
            : `Plasma Link Lv ${nextLv}: Longer tether range and +35% slice damage.`
          : nextLv === 1
            ? 'Deploys a cute mini UFO Wingman Drone that orbits and fires at viruses!'
            : `Wingman Drone Lv ${nextLv}: Faster drone blasts and +35% damage.`,
    },
  ];

  function defaultUpgrades() {
    return {
      pulse_cannon: 1,
      plasma_rail: 0,
      homing_missiles: 0,
      orbital_blades: 0,
      chain_lightning: 0,
      nova_pulse: 0,
      hull_plating: 0,
      overclock: 0,
      thrusters: 0,
      cryo_rounds: 0,
      magnet_core: 0,
      tether_beam: 0,
    };
  }

  // ---- Input State ----
  const keys = new Set();
  const prevPadButtons = [{}, {}];
  const remoteInputs = {}; // playerId -> { mx, my, tx, ty, ax, ay, fire, dash }

  window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      if (state.mode !== 'title') e.preventDefault();
    }
    keys.add(code);

    if (state.mode === 'playing') {
      if (code === 'Escape' || code === 'KeyP') {
        if (room.isHost) togglePause();
      } else if (code === 'KeyT') {
        toggleAutofire();
      } else if (code === 'KeyM') {
        toggleMute();
      }
    } else if (state.mode === 'paused') {
      if ((code === 'Escape' || code === 'KeyP') && room.isHost) togglePause();
    } else if (state.mode === 'upgrade' && !state.myDraftPicked) {
      if (code === 'Digit1') requestPickUpgrade(0);
      else if (code === 'Digit2') requestPickUpgrade(1);
      else if (code === 'Digit3') requestPickUpgrade(2);
      else if (code === 'ArrowLeft' || code === 'KeyA') moveDraftFocus(-1);
      else if (code === 'ArrowRight' || code === 'KeyD') moveDraftFocus(1);
      else if (code === 'Enter' || code === 'Space') requestPickUpgrade(state.draftFocus);
    } else if (state.mode === 'title') {
      if ((code === 'Enter' || code === 'Space') && room.isHost) startGame();
    } else if (state.mode === 'gameover') {
      if ((code === 'Enter' || code === 'Space') && room.isHost) startGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  function getConnectedPads() {
    if (!navigator.getGamepads) return [];
    return Array.from(navigator.getGamepads()).filter(Boolean);
  }

  // ---- iOS Safari Follow-the-Finger Touch Controls (Zero Input on Release!) ----
  const touchDashBtn = document.getElementById('touch-dash-btn');
  const touchCtrl = {
    isTouchDevice: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
    active: false,
    touchId: null,
    x: 0,
    y: 0,
    tx: null, // normalized 0..1 target X
    ty: null, // normalized 0..1 target Y
    dash: false,
    dashTouchId: null,
  };

  function clearTouchSteer() {
    touchCtrl.active = false;
    touchCtrl.touchId = null;
    touchCtrl.tx = null;
    touchCtrl.ty = null;
  }

  function updateTouchCoords(t) {
    touchCtrl.x = t.clientX;
    touchCtrl.y = t.clientY;
    touchCtrl.tx = clamp(t.clientX / Math.max(1, W), 0, 1);
    touchCtrl.ty = clamp(t.clientY / Math.max(1, H), 0, 1);
  }

  canvas.addEventListener('touchstart', (e) => {
    touchCtrl.isTouchDevice = true;
    if (state.mode !== 'playing') return;
    e.preventDefault();
    SFX.ensure();
    if (touchCtrl.active) return;
    const t = e.changedTouches[0];
    if (!t) return;
    touchCtrl.active = true;
    touchCtrl.touchId = t.identifier;
    updateTouchCoords(t);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!touchCtrl.active || state.mode !== 'playing') return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchCtrl.touchId) {
        updateTouchCoords(t);
        break;
      }
    }
  }, { passive: false });

  function handleCanvasTouchRelease(e) {
    if (!touchCtrl.active) return;
    // Check if our steering touch ended OR if zero touches remain on canvas
    let stillHeld = false;
    if (e.touches) {
      for (const t of e.touches) {
        if (t.identifier === touchCtrl.touchId) {
          stillHeld = true;
          break;
        }
      }
    }
    if (!stillHeld) {
      clearTouchSteer();
    }
  }
  canvas.addEventListener('touchend', handleCanvasTouchRelease, { passive: true });
  canvas.addEventListener('touchcancel', handleCanvasTouchRelease, { passive: true });
  window.addEventListener('blur', () => {
    clearTouchSteer();
    touchCtrl.dash = false;
  });

  if (touchDashBtn) {
    touchDashBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      touchCtrl.isTouchDevice = true;
      SFX.ensure();
      const t = e.changedTouches[0];
      if (t) touchCtrl.dashTouchId = t.identifier;
      touchCtrl.dash = true;
      touchDashBtn.classList.add('active');
    }, { passive: false });

    const endDash = (e) => {
      let stillHeld = false;
      if (e.touches) {
        for (const t of e.touches) {
          if (t.identifier === touchCtrl.dashTouchId) { stillHeld = true; break; }
        }
      }
      if (!stillHeld) {
        touchCtrl.dash = false;
        touchCtrl.dashTouchId = null;
        touchDashBtn.classList.remove('active');
      }
    };
    touchDashBtn.addEventListener('touchend', endDash, { passive: true });
    touchDashBtn.addEventListener('touchcancel', endDash, { passive: true });
  }

  function readLocalInput(localSlot, pads) {
    const pad = pads[localSlot] || null;
    let mx = 0;
    let my = 0;
    let tx = null;
    let ty = null;
    let ax = 0;
    let ay = 0;
    let fire = false;
    let dash = false;

    if (localSlot === 0) {
      if (keys.has('KeyW')) my -= 1;
      if (keys.has('KeyS')) my += 1;
      if (keys.has('KeyA')) mx -= 1;
      if (keys.has('KeyD')) mx += 1;
      if (keys.has('Space')) fire = true;
      if (keys.has('ShiftLeft') || keys.has('KeyE')) dash = true;
      if (countLocalPlayers() === 1) {
        if (keys.has('ArrowUp')) my -= 1;
        if (keys.has('ArrowDown')) my += 1;
        if (keys.has('ArrowLeft')) mx -= 1;
        if (keys.has('ArrowRight')) mx += 1;
      }
      // Follow-the-finger touch input ONLY while finger is actively pressed down
      if (touchCtrl.active && touchCtrl.tx !== null && touchCtrl.ty !== null) {
        tx = touchCtrl.tx;
        ty = touchCtrl.ty;
      }
      if (touchCtrl.dash) dash = true;
    } else {
      if (keys.has('ArrowUp')) my -= 1;
      if (keys.has('ArrowDown')) my += 1;
      if (keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('ArrowRight')) mx += 1;
      if (keys.has('Enter') || keys.has('ControlRight')) fire = true;
      if (keys.has('ShiftRight') || keys.has('Slash')) dash = true;
    }

    if (pad) {
      const dead = 0.2;
      const lx = Math.abs(pad.axes[0] || 0) > dead ? pad.axes[0] : 0;
      const ly = Math.abs(pad.axes[1] || 0) > dead ? pad.axes[1] : 0;
      if (lx || ly) { mx = lx; my = ly; }
      if (pad.buttons[12] && pad.buttons[12].pressed) my = -1;
      if (pad.buttons[13] && pad.buttons[13].pressed) my = 1;
      if (pad.buttons[14] && pad.buttons[14].pressed) mx = -1;
      if (pad.buttons[15] && pad.buttons[15].pressed) mx = 1;

      const rx = Math.abs(pad.axes[2] || 0) > 0.25 ? pad.axes[2] : 0;
      const ry = Math.abs(pad.axes[3] || 0) > 0.25 ? pad.axes[3] : 0;
      if (rx || ry) { ax = rx; ay = ry; }

      if (
        (pad.buttons[0] && pad.buttons[0].pressed) ||
        (pad.buttons[7] && pad.buttons[7].pressed) ||
        (pad.buttons[5] && pad.buttons[5].pressed)
      ) fire = true;
      if (
        (pad.buttons[1] && pad.buttons[1].pressed) ||
        (pad.buttons[2] && pad.buttons[2].pressed) ||
        (pad.buttons[4] && pad.buttons[4].pressed) ||
        (pad.buttons[6] && pad.buttons[6].pressed)
      ) dash = true;
    }

    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    return { mx, my, tx, ty, ax, ay, fire, dash };
  }

  function countLocalPlayers() {
    if (!room.isHost) return 1;
    return room.getOrderedPlayers().filter((p) => p.isLocal).length;
  }

  // ---- Vintage Cartoon Background (Twinkling 4-point Stars + Pastel Nebula Clouds) ----
  const stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() < 0.2 ? 3.2 : Math.random() * 1.4 + 0.7,
      sparkle: Math.random() < 0.22,
      phase: Math.random() * Math.PI * 2,
      speed: 5 + Math.random() * 14,
      color: Math.random() < 0.25 ? '#fef08a' : Math.random() < 0.5 ? '#bae6fd' : '#f8fafc',
    });
  }
  const clouds = [
    { x: 0.18, y: 0.22, r: 160, color: 'rgba(56, 189, 248, 0.06)' },
    { x: 0.82, y: 0.30, r: 190, color: 'rgba(251, 191, 36, 0.05)' },
    { x: 0.50, y: 0.78, r: 210, color: 'rgba(45, 212, 191, 0.05)' },
  ];
  const shootingStars = [];
  let nextShootingStar = 2.5;

  // ---- Game State ----
  const state = {
    mode: 'title', // title | playing | upgrade | paused | gameover | kicked
    autoFire: true,
    time: 0,
    score: 0,
    kills: 0,
    bossesDefeated: 0,
    level: 1,
    xp: 0,
    xpNeeded: 75,
    shake: 0,
    spawnTimer: 0,
    bossActive: false,
    bossWarningTimer: 0,
    pendingBossLevel: null,
    pendingDrafts: [],
    // Personal draft tracking
    activeDraftMap: {}, // playerId -> { choices: [Upgrade], picked: bool, isBoss: bool }
    localDraftQueue: [], // local playerIds needing to pick sequentially on host screen
    activeLocalDraftId: null,
    draftChoices: [],
    draftFocus: 0,
    draftIsBoss: false,
    myDraftPicked: false,
    players: [],
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    particles: [],
    beams: [],
    novas: [],
    floatTexts: [],
  };

  function createPlayerFromRoster(rp, localIndex) {
    const pal = PLAYER_COLORS[rp.slot % PLAYER_COLORS.length];
    const offsets = [
      [0.42, 0.52],
      [0.58, 0.52],
      [0.42, 0.64],
      [0.58, 0.64],
    ];
    const off = offsets[rp.slot % 4];
    return {
      id: rp.id,
      slot: rp.slot,
      isLocal: Boolean(rp.isLocal),
      localIndex,
      name: rp.name || `P${rp.slot + 1} · ${pal.name}`,
      color: pal.hex,
      glow: pal.glow,
      x: W * off[0],
      y: H * off[1],
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      thrustAngle: Math.PI / 2,
      thrustPower: 0,
      puffTimer: 0,
      muzzleFlash: 0,
      radius: 19,
      hp: 100,
      maxHp: 100,
      damage: 0,
      upgrades: defaultUpgrades(),
      downed: false,
      reviveProgress: 0,
      invuln: 1.5,
      dashCooldown: 0,
      dashTimer: 0,
      fireTimer: 0,
      railTimer: 2.2,
      missileTimer: 2.0,
      teslaTimer: 1.4,
      novaTimer: 4.5,
      droneAngle: 0,
      droneFireTimer: 0.4,
      orbitAngle: rp.slot * (Math.PI / 2),
      thrusting: false,
      blinkTimer: rand(1.5, 4.0),
    };
  }

  // ---- Room Setup ----
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomParam = urlParams.get('room');
  const explicitHost = urlParams.get('host') === '1';
  const isHostStart = !initialRoomParam || explicitHost;

  const room = new RoomSync({
    gameId: 'astro_purge',
    maxPlayers: 4,
    roomCode: initialRoomParam || '',
    isHost: isHostStart,
    playerName: getSavedPlayerName(),
    onRosterChange: (roster) => {
      renderLobbyRoster(roster);
      if (room.isHost && state.mode === 'playing') {
        syncMidGamePlayers(roster);
      }
      if (room.isHost && state.mode === 'upgrade') {
        // If a remote player left mid-draft, don't hang waiting for them
        const liveIds = new Set(roster.map((r) => r.id));
        for (const pid of Object.keys(state.activeDraftMap)) {
          if (!liveIds.has(pid)) state.activeDraftMap[pid].picked = true;
        }
        checkAllDraftsPicked();
      }
    },
    onStatusChange: (status, label) => {
      lobbyRoomStatus.textContent = label;
      lobbyRoomStatus.classList.toggle('ok', status === 'ok');
    },
    onRoomFull: () => {
      lobbyRoomStatus.textContent = 'Room Full (4/4)';
      titlePadHint.textContent = 'This room already has 4 players. Return to the Hub to create a new room.';
      btnLaunch.disabled = true;
    },
    onKicked: () => {
      state.mode = 'kicked';
      hudEl.classList.add('hidden');
      titleOverlay.classList.add('hidden');
      upgradeOverlay.classList.add('hidden');
      pauseOverlay.classList.add('hidden');
      gameoverOverlay.classList.add('hidden');
      kickedOverlay.classList.remove('hidden');
    },
    onMessage: handleRoomMessage,
  });

  lobbyPlayerName.value = room.myName;
  lobbyPlayerName.addEventListener('input', () => room.setPlayerName(lobbyPlayerName.value));

  room.connect().then(() => {
    lobbyRoomCode.textContent = `ROOM ${room.roomCode}`;
    btnHudInvite.textContent = `Room: ${room.roomCode} · Copy Link`;
    if (!room.isHost) {
      btnLaunch.textContent = 'Waiting for Host...';
      btnLaunch.disabled = true;
      btnAddLocal.classList.add('hidden');
    }
  });

  function copyInviteLink(btnEl) {
    const url = room.getInviteUrl();
    const prev = btnEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    btnEl.textContent = 'Invite Link Copied!';
    setTimeout(() => { btnEl.textContent = prev; }, 1800);
  }

  btnCopyInvite.addEventListener('click', () => copyInviteLink(btnCopyInvite));
  btnHudInvite.addEventListener('click', () => copyInviteLink(btnHudInvite));

  btnAddLocal.addEventListener('click', () => {
    if (!room.isHost) return;
    if (countLocalPlayers() >= 2) {
      btnAddLocal.textContent = 'Max 2 Local Players';
      setTimeout(() => (btnAddLocal.textContent = '+ Add Local Couch Player'), 1400);
      return;
    }
    const added = room.addLocalPlayer('Local P2');
    if (!added) {
      btnAddLocal.textContent = 'Room Full (4/4)';
      setTimeout(() => (btnAddLocal.textContent = '+ Add Local Couch Player'), 1400);
    }
  });

  function renderLobbyRoster(roster) {
    lobbyRosterGrid.innerHTML = '';
    const bySlot = {};
    roster.forEach((p) => { bySlot[p.slot] = p; });

    for (let s = 0; s < 4; s++) {
      const p = bySlot[s];
      const pal = PLAYER_COLORS[s];
      const card = document.createElement('div');
      if (p) {
        card.className = 'slot-card';
        card.style.borderTop = `3px solid ${pal.hex}`;
        const canKick = room.isHost && p.id !== room.myId;
        const kickLabel = p.isLocal ? 'Remove' : 'Kick';
        card.innerHTML = `
          <div class="slot-head">
            <span style="color:${pal.hex}">P${s + 1} · ${pal.name}</span>
            ${canKick ? `<button type="button" class="slot-remove" data-kick="${p.id}">${kickLabel}</button>` : `<span>${p.isHost ? 'HOST' : p.isLocal ? 'LOCAL' : 'ONLINE'}</span>`}
          </div>
          <div class="slot-name">${escapeHtml(p.name)}</div>
          <div class="slot-sub">${p.id === room.myId ? 'You' : p.isLocal ? 'Same Screen' : 'Connected'}</div>
        `;
        if (canKick) {
          card.querySelector('.slot-remove').addEventListener('click', () => {
            room.kickPlayer(p.id);
          });
        }
      } else {
        card.className = 'slot-card empty';
        card.innerHTML = `
          <div>Open Slot (P${s + 1})</div>
          <div style="font-size:0.7rem; opacity:0.75;">Share invite link</div>
        `;
      }
      lobbyRosterGrid.appendChild(card);
    }

    if (room.isHost) {
      btnLaunch.textContent = `Launch Mission (${roster.length}/4)`;
      btnLaunch.disabled = false;
    }
  }

  function syncMidGamePlayers(roster) {
    const liveIds = new Set(roster.map((r) => r.id));
    // Remove kicked/disconnected remote players cleanly
    state.players = state.players.filter((p) => p.isLocal || liveIds.has(p.id));

    const existingIds = new Set(state.players.map((p) => p.id));
    let localCounter = state.players.filter((p) => p.isLocal).length;
    for (const rp of roster) {
      if (!existingIds.has(rp.id)) {
        const np = createPlayerFromRoster(rp, rp.isLocal ? localCounter++ : -1);
        state.players.push(np);
        spawnFloatText(np.x, np.y - 30, `${np.name} JOINED!`, np.glow);
        SFX.levelUp();
      }
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }

  // ---- Room Message Handling (Host & Guest Sync) ----
  function handleRoomMessage(msg) {
    if (!msg || !msg.type) return;

    if (room.isHost) {
      if (msg.type === 'INPUT' && msg.senderId) {
        remoteInputs[msg.senderId] = msg.input;
      } else if (msg.type === 'PERSONAL_PICK' && state.mode === 'upgrade' && msg.senderId) {
        applyPlayerDraftPick(msg.senderId, msg.idx);
      }
      return;
    }

    // Guest handlers
    if (msg.type === 'GAME_START') {
      state.mode = 'playing';
      clearTouchSteer();
      titleOverlay.classList.add('hidden');
      upgradeOverlay.classList.add('hidden');
      pauseOverlay.classList.add('hidden');
      gameoverOverlay.classList.add('hidden');
      hudEl.classList.remove('hidden');
      SFX.levelUp();
    } else if (msg.type === 'SNAP') {
      applySnapshot(msg.s);
    } else if (msg.type === 'BOSS_WARN') {
      bossWarningTitle.textContent = '⚠ BIO-HAZARD BOSS DETECTED';
      bossWarningSub.textContent = msg.sub;
      bossWarningEl.classList.remove('hidden');
      SFX.bossWarn();
      setTimeout(() => bossWarningEl.classList.add('hidden'), 2600);
    } else if (msg.type === 'PERSONAL_DRAFT') {
      clearTouchSteer();
      state.mode = 'upgrade';
      state.myDraftPicked = false;
      state.draftIsBoss = msg.isBoss;
      state.draftFocus = 0;
      state.draftChoices = msg.choiceIds
        .map((id) => UPGRADES.find((u) => u.id === id))
        .filter(Boolean);
      const me = state.players.find((p) => p.id === room.myId);
      if (me && msg.myUpgrades) me.upgrades = msg.myUpgrades;
      draftEyebrow.textContent = msg.eyebrow;
      draftTitle.textContent = msg.title;
      draftSub.textContent = msg.sub;
      draftWaitingEl.classList.add('hidden');
      renderDraftCards(msg.myUpgrades || defaultUpgrades());
      upgradeOverlay.classList.remove('hidden');
      SFX.levelUp();
    } else if (msg.type === 'DRAFT_STATUS') {
      if (state.myDraftPicked) {
        draftWaitingEl.textContent = `Upgrade locked in! Waiting for teammates (${msg.ready}/${msg.total} ready)...`;
        draftWaitingEl.classList.remove('hidden');
      }
    } else if (msg.type === 'DRAFT_DONE') {
      upgradeOverlay.classList.add('hidden');
      draftWaitingEl.classList.add('hidden');
      state.myDraftPicked = false;
      state.mode = 'playing';
      SFX.xp();
      renderHud();
    } else if (msg.type === 'PAUSE_STATE') {
      state.mode = msg.paused ? 'paused' : 'playing';
      pauseOverlay.classList.toggle('hidden', !msg.paused);
    } else if (msg.type === 'GAME_OVER') {
      state.level = msg.level;
      state.score = msg.score;
      state.bossesDefeated = msg.bosses;
      state.kills = msg.kills;
      showGameOverUI(msg.dmgSummary || []);
    } else if (msg.type === 'RETURN_LOBBY') {
      returnToLobbyUI();
    }
  }

  function buildSnapshot() {
    const nx = (v) => Math.round((v / W) * 1000) / 1000;
    const ny = (v) => Math.round((v / H) * 1000) / 1000;
    const boss = state.enemies.find((e) => e.isBoss);
    return {
      lv: state.level,
      sc: state.score,
      kl: state.kills,
      xp: Math.round(state.xp),
      xn: state.xpNeeded,
      ba: state.bossActive ? 1 : 0,
      b: boss ? { n: boss.name, h: Math.ceil(boss.hp), m: boss.maxHp, ph: boss.phase || 1 } : null,
      p: state.players.map((p) => [
        p.id,
        p.slot,
        nx(p.x),
        ny(p.y),
        Math.round(p.angle * 100) / 100,
        Math.ceil(p.hp),
        p.maxHp,
        p.downed ? 1 : 0,
        Math.round(p.reviveProgress * 100) / 100,
        p.thrusting ? 1 : 0,
        p.name,
        Math.round(p.orbitAngle * 100) / 100,
        Math.round(p.dashCooldown * 10) / 10,
        Math.round(p.damage),
        p.upgrades,
        Math.round((p.thrustAngle || 0) * 100) / 100,
        Math.round((p.thrustPower || 0) * 100) / 100,
        p.dashTimer > 0 ? 1 : 0,
        Math.round(p.vx || 0),
        Math.round(p.vy || 0),
      ]),
      e: state.enemies.slice(0, 44).map((e) => [
        e.type,
        nx(e.x),
        ny(e.y),
        Math.round(e.radius),
        Math.round(e.rot * 100) / 100,
        e.color,
        e.hitFlash > 0 ? 1 : 0,
        e.chillTimer > 0 ? 1 : 0,
        e.phase || 1,
      ]),
      bl: state.bullets.slice(0, 65).map((b) => [nx(b.x), ny(b.y), Math.round(b.radius), b.color, b.kind === 'missile' ? 1 : 0]),
      eb: state.enemyBullets.slice(0, 60).map((b) => [nx(b.x), ny(b.y), Math.round(b.radius), b.color]),
      pk: state.pickups.slice(0, 45).map((pk) => [pk.kind === 'xp' ? 0 : 1, nx(pk.x), ny(pk.y), pk.pulling ? 1 : 0]),
    };
  }

  function applySnapshot(s) {
    if (!s) return;
    if (s.xp > state.xp) SFX.xp();
    if (s.kl > state.kills) SFX.pop();
    const prevHpSum = state.players.reduce((acc, p) => acc + (p.hp || 0), 0);
    const nextHpSum = (s.p || []).reduce((acc, arr) => acc + (arr[5] || 0), 0);
    if (prevHpSum > 0 && nextHpSum < prevHpSum) SFX.hurt();

    state.level = s.lv;
    state.score = s.sc;
    state.kills = s.kl;
    state.xp = s.xp;
    state.xpNeeded = s.xn;
    state.bossActive = Boolean(s.ba);

    const prevMap = {};
    state.players.forEach((pl) => { prevMap[pl.id] = pl; });

    state.players = s.p.map((arr) => {
      const pal = PLAYER_COLORS[arr[1] % PLAYER_COLORS.length];
      const prev = prevMap[arr[0]];
      return {
        id: arr[0],
        slot: arr[1],
        color: pal.hex,
        glow: pal.glow,
        x: arr[2] * W,
        y: arr[3] * H,
        angle: arr[4],
        hp: arr[5],
        maxHp: arr[6],
        downed: Boolean(arr[7]),
        reviveProgress: arr[8],
        thrusting: Boolean(arr[9]),
        name: arr[10],
        orbitAngle: arr[11],
        dashCooldown: arr[12],
        damage: arr[13] || 0,
        upgrades: arr[14] || defaultUpgrades(),
        thrustAngle: arr[15] || 0,
        thrustPower: arr[16] || 0,
        dashTimer: arr[17] ? 0.15 : 0,
        vx: arr[18] || 0,
        vy: arr[19] || 0,
        puffTimer: prev ? prev.puffTimer || 0 : 0,
        muzzleFlash: 0,
        invuln: 0,
        droneAngle: arr[11],
      };
    });

    state.enemies = s.e.map((arr) => ({
      type: arr[0],
      isBoss: arr[0] === 'boss',
      x: arr[1] * W,
      y: arr[2] * H,
      radius: arr[3],
      rot: arr[4],
      color: arr[5],
      veinColor: '#a3e635',
      hitFlash: arr[6] ? 0.08 : 0,
      chillTimer: arr[7] ? 1 : 0,
      phase: arr[8] || 1,
      shape: arr[0].startsWith('asteroid') ? getCachedRockShape(arr[3]) : null,
    }));

    state.bullets = s.bl.map((arr) => ({
      x: arr[0] * W,
      y: arr[1] * H,
      radius: arr[2],
      color: arr[3],
      kind: arr[4] ? 'missile' : 'pulse',
    }));

    state.enemyBullets = s.eb.map((arr) => ({
      x: arr[0] * W,
      y: arr[1] * H,
      radius: arr[2],
      color: arr[3],
    }));

    state.pickups = s.pk.map((arr) => ({
      kind: arr[0] === 0 ? 'xp' : 'heal',
      x: arr[1] * W,
      y: arr[2] * H,
      pulling: Boolean(arr[3]),
      vx: 0,
      vy: 0,
    }));

    if (s.b) {
      bossNameEl.textContent = `LV ${state.level} · ${s.b.n}${s.b.ph >= 2 ? ' [ENRAGED]' : ''}`;
      bossBarWrap.classList.remove('hidden');
      const pct = clamp((s.b.h / s.b.m) * 100, 0, 100);
      bossHpFill.style.width = pct.toFixed(1) + '%';
      bossHpText.textContent = `${s.b.h} / ${s.b.m}`;
    } else {
      bossBarWrap.classList.add('hidden');
    }

    renderHud();
  }

  const rockShapeCache = {};
  function getCachedRockShape(r) {
    if (!rockShapeCache[r]) {
      const pts = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const rad = r * (i % 2 === 0 ? 1.08 : 0.82);
        pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
      }
      rockShapeCache[r] = pts;
    }
    return rockShapeCache[r];
  }

  // ---- Helpers ----
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

  function formatDmg(n) {
    if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
    return Math.round(n).toLocaleString();
  }

  function rollPlayerDamage(p, base) {
    const oc = p ? (p.upgrades.overclock || 0) : 0;
    const mult = 1 + oc * 0.22;
    const isCrit = Math.random() < oc * 0.08;
    const dmg = Math.round(base * mult * (isCrit ? 1.8 : 1));
    return { dmg, isCrit };
  }

  function spawnParticles(x, y, color, count = 10, speed = 160, size = 3.5, kind = 'dot') {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(speed * 0.25, speed);
      const maxL = kind === 'puff' ? rand(0.32, 0.6) : rand(0.25, 0.56);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: maxL,
        maxLife: maxL,
        color,
        size: rand(size * 0.7, size * 1.45),
        kind,
      });
    }
  }

  function spawnCartoonBurst(x, y, color, big = false) {
    // Classic rubber-hose cartoon explosion puffs + golden 4-point stars
    spawnParticles(x, y, '#fef9c3', big ? 12 : 5, big ? 170 : 105, big ? 11 : 7, 'puff');
    spawnParticles(x, y, color, big ? 18 : 8, big ? 260 : 165, big ? 7 : 4.5, 'puff');
    spawnParticles(x, y, '#fde047', big ? 14 : 5, big ? 290 : 195, big ? 5.5 : 3.5, 'star');
  }

  function spawnFloatText(x, y, text, color = '#f8fafc') {
    state.floatTexts.push({ x, y, vy: -42, text, color, life: 0.85, maxLife: 0.85 });
  }

  // ---- Start / Reset (Host Authoritative) ----
  function startGame() {
    if (!room.isHost) return;
    const roster = room.getOrderedPlayers();
    if (roster.length === 0) return;

    clearTouchSteer();
    state.mode = 'playing';
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.bossesDefeated = 0;
    state.level = 1;
    state.xp = 0;
    state.xpNeeded = 75;
    state.shake = 0;
    state.spawnTimer = 0.4;
    state.bossActive = false;
    state.bossWarningTimer = 0;
    state.pendingBossLevel = null;
    state.pendingDrafts = [];
    state.activeDraftMap = {};
    state.localDraftQueue = [];
    state.myDraftPicked = false;
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.pickups = [];
    state.particles = [];
    state.beams = [];
    state.novas = [];
    state.floatTexts = [];

    let localIdx = 0;
    state.players = roster.map((rp) => createPlayerFromRoster(rp, rp.isLocal ? localIdx++ : -1));

    titleOverlay.classList.add('hidden');
    upgradeOverlay.classList.add('hidden');
    draftWaitingEl.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    bossWarningEl.classList.add('hidden');
    bossBarWrap.classList.add('hidden');
    hudEl.classList.remove('hidden');

    for (let i = 0; i < 5; i++) spawnEnemy('asteroid_lg');
    for (let i = 0; i < 4; i++) spawnEnemy('corona');

    room.sendSignal({ type: 'GAME_START' });
    SFX.levelUp();
    renderHud();
  }

  function returnToLobbyUI() {
    clearTouchSteer();
    state.mode = 'title';
    hudEl.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    upgradeOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    bossBarWrap.classList.add('hidden');
    bossWarningEl.classList.add('hidden');
    titleOverlay.classList.remove('hidden');
  }

  // ---- Enemy Spawning (Tuned Harder!) ----
  function edgeSpawnPos(pad = 44) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: rand(0, W), y: -pad };
    if (side === 1) return { x: W + pad, y: rand(0, H) };
    if (side === 2) return { x: rand(0, W), y: H + pad };
    return { x: -pad, y: rand(0, H) };
  }

  function makeAsteroidShape(r) {
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rad = r * rand(0.76, 1.15);
      pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    return pts;
  }

  function spawnEnemy(type, customPos = null) {
    const pos = customPos || edgeSpawnPos();
    const lv = state.level;
    const coopHp = 1 + Math.max(0, state.players.length - 1) * 0.45;
    const hpScale = (1 + (lv - 1) * 0.34 + Math.pow(lv - 1, 1.25) * 0.05) * coopHp;
    const speedScale = 1 + Math.min(1.25, (lv - 1) * 0.045);
    const angleToCenter = Math.atan2(H * 0.5 - pos.y, W * 0.5 - pos.x) + rand(-0.45, 0.45);

    if (type === 'asteroid_lg' || type === 'asteroid_md' || type === 'asteroid_sm') {
      const r = type === 'asteroid_lg' ? 35 : type === 'asteroid_md' ? 23 : 14;
      const baseHp = type === 'asteroid_lg' ? 58 : type === 'asteroid_md' ? 30 : 15;
      const sp = (type === 'asteroid_lg' ? 54 : type === 'asteroid_md' ? 84 : 118) * speedScale;
      state.enemies.push({
        type, x: pos.x, y: pos.y,
        vx: Math.cos(angleToCenter) * sp,
        vy: Math.sin(angleToCenter) * sp,
        radius: r,
        hp: Math.round(baseHp * hpScale),
        maxHp: Math.round(baseHp * hpScale),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-1.3, 1.3),
        shape: makeAsteroidShape(r),
        xp: type === 'asteroid_lg' ? 14 : type === 'asteroid_md' ? 9 : 6,
        score: type === 'asteroid_lg' ? 40 : type === 'asteroid_md' ? 25 : 15,
        damage: type === 'asteroid_lg' ? 22 : 16,
        color: '#64748b',
        veinColor: '#a3e635',
        hitFlash: 0,
        chillTimer: 0,
      });
      return;
    }

    const defs = {
      corona: { r: 18, hp: 36, sp: 88, rotSp: 1.1, xp: 12, sc: 35, dmg: 18, col: '#e11d48' },
      mitosis: { r: 22, hp: 54, sp: 70, rotSp: 0.9, xp: 16, sc: 50, dmg: 20, col: '#84cc16' },
      microbe: { r: 12, hp: 18, sp: 148, rotSp: 2.5, xp: 7, sc: 20, dmg: 14, col: '#a3e635' },
      shooter: { r: 20, hp: 48, sp: 76, rotSp: -1.4, xp: 18, sc: 65, dmg: 18, col: '#ea580c' },
      capsid: { r: 29, hp: 135, sp: 56, rotSp: 0.5, xp: 28, sc: 110, dmg: 26, col: '#9333ea' },
    };
    const d = defs[type];
    if (!d) return;
    state.enemies.push({
      type, x: pos.x, y: pos.y, vx: 0, vy: 0,
      radius: d.r,
      hp: Math.round(d.hp * hpScale),
      maxHp: Math.round(d.hp * hpScale),
      speed: d.sp * speedScale,
      fireTimer: type === 'shooter' ? rand(1.1, 2.2) : 0,
      rot: rand(0, Math.PI * 2),
      rotSpeed: d.rotSp,
      xp: d.xp,
      score: d.sc,
      damage: d.dmg,
      color: d.col,
      hitFlash: 0,
      chillTimer: 0,
    });
  }

  function pickWaveEnemyType() {
    const lv = state.level;
    const r = Math.random();
    if (lv >= 6 && r < 0.16) return 'capsid';
    if (lv >= 3 && r < 0.36) return 'shooter';
    if (lv >= 2 && r < 0.54) return 'mitosis';
    if (lv >= 4 && r < 0.68) return 'microbe';
    if (r < 0.84) return 'corona';
    return 'asteroid_lg';
  }

  // ---- TOUGH MULTI-PHASE BOSSES (Every 10 Levels!) ----
  function triggerBossSequence(bossLevel) {
    state.bossActive = true;
    state.pendingBossLevel = bossLevel;
    state.bossWarningTimer = 2.6;

    const tier = Math.floor(bossLevel / 10);
    const variant = (tier - 1) % 3;
    const names = ['BARON CORONA-CHOMP', 'HYDRA SLIME-QUEEN', 'KING PANDEMIC-REX'];
    const name = tier > 3 ? `${names[variant]} MK-${tier}` : names[variant];
    const sub = `LEVEL ${bossLevel} — ${name} INCOMING!`;

    bossWarningTitle.textContent = '⚠ GIANT SPACE VIRUS BOSS!';
    bossWarningSub.textContent = sub;
    bossWarningEl.classList.remove('hidden');
    room.sendSignal({ type: 'BOSS_WARN', sub });
    SFX.bossWarn();
    renderHud();
  }

  function spawnBoss(bossLevel) {
    const tier = Math.floor(bossLevel / 10);
    const variant = (tier - 1) % 3;
    const names = ['BARON CORONA-CHOMP', 'HYDRA SLIME-QUEEN', 'KING PANDEMIC-REX'];
    const name = tier > 3 ? `${names[variant]} MK-${tier}` : names[variant];
    const coopScale = 1 + Math.max(0, state.players.length - 1) * 0.65;
    // Much tankier so bosses are real epic multi-phase fights!
    const maxHp = Math.round((4200 + (tier - 1) * 3800) * coopScale);

    const boss = {
      type: 'boss',
      isBoss: true,
      variant, tier, name,
      phase: 1,
      x: W * 0.5, y: -100, vx: 0, vy: 0,
      radius: 62,
      hp: maxHp, maxHp,
      speed: 74 + tier * 10,
      rot: 0, rotSpeed: 0.45,
      attackTimer: 1.6, minionTimer: 4.5, chargeTimer: 5.8,
      charging: 0, chargeVx: 0, chargeVy: 0, spiralAngle: 0,
      xp: 0, score: 1500 * tier, damage: 32,
      color: variant === 0 ? '#e11d48' : variant === 1 ? '#65a30d' : '#ea580c',
      hitFlash: 0, chillTimer: 0,
    };

    state.enemies.push(boss);
    bossNameEl.textContent = `LV ${bossLevel} · ${name}`;
    bossBarWrap.classList.remove('hidden');
    updateBossBar(boss);
  }

  function updateBossBar(boss) {
    if (!boss || boss.hp <= 0) {
      bossBarWrap.classList.add('hidden');
      return;
    }
    const pct = clamp((boss.hp / boss.maxHp) * 100, 0, 100);
    bossHpFill.style.width = pct.toFixed(1) + '%';
    bossHpText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    bossNameEl.textContent = `LV ${state.level} · ${boss.name}${boss.phase >= 2 ? ' [ENRAGED!]' : ''}`;
  }

  // ---- Shared Team XP -> PERSONAL Upgrade Drafts! ----
  function addTeamXp(amount) {
    const maxMag = Math.max(0, ...state.players.map((p) => p.upgrades.magnet_core || 0));
    const mult = 1 + maxMag * 0.15;
    state.xp += amount * mult;

    if (state.bossActive) {
      state.xp = Math.min(state.xp, state.xpNeeded - 1);
      return;
    }

    while (state.xp >= state.xpNeeded) {
      state.xp -= state.xpNeeded;
      state.level += 1;
      state.xpNeeded = Math.round(75 + state.level * 30 + Math.pow(state.level, 1.4) * 7);
      SFX.levelUp();

      state.pendingDrafts.push({ isBossReward: false, level: state.level });
      if (state.level % 10 === 0) {
        triggerBossSequence(state.level);
        break;
      }
    }

    if (state.pendingDrafts.length > 0 && state.mode === 'playing') {
      openNextPersonalDraft();
    }
  }

  function rollPersonalChoices(player, isBoss) {
    let pool = UPGRADES.filter((u) => (player.upgrades[u.id] || 0) < u.maxLevel);
    if (isBoss) {
      const wPool = pool.filter((u) => u.tag === 'Weapon' || u.tag === 'Co-op');
      if (wPool.length >= 3) pool = wPool;
    }
    return pool.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  }

  function openNextPersonalDraft() {
    if (!room.isHost || state.pendingDrafts.length === 0) return;
    const req = state.pendingDrafts.shift();
    clearTouchSteer();
    state.mode = 'upgrade';
    state.draftIsBoss = req.isBossReward;
    state.activeDraftMap = {};
    state.localDraftQueue = [];

    const eyebrow = req.isBossReward ? 'Boss Defeated · Personal Supply Drop!' : `Team Level ${req.level}!`;
    const title = req.isBossReward ? 'Pick Your Boss UFO Evolution' : 'Upgrade Your Personal UFO';
    const sub = req.isBossReward
      ? 'Full Hull Repair! Pick a personal weapon upgrade to bolt onto your saucer.'
      : 'Every pilot chooses their own personal UFO upgrade!';

    for (const p of state.players) {
      const choices = rollPersonalChoices(p, req.isBossReward);
      if (choices.length === 0) {
        state.activeDraftMap[p.id] = { choices: [], picked: true, isBoss: req.isBossReward };
        continue;
      }
      state.activeDraftMap[p.id] = { choices, picked: false, isBoss: req.isBossReward };

      if (p.isLocal) {
        state.localDraftQueue.push(p.id);
      } else {
        room.sendToPlayer(p.id, {
          type: 'PERSONAL_DRAFT',
          isBoss: req.isBossReward,
          eyebrow,
          title,
          sub,
          choiceIds: choices.map((c) => c.id),
          myUpgrades: p.upgrades,
        });
      }
    }

    showNextLocalDraft(eyebrow, title, sub);
    checkAllDraftsPicked();
  }

  function showNextLocalDraft(eyebrow, title, sub) {
    const nextLocalId = state.localDraftQueue.find(
      (pid) => state.activeDraftMap[pid] && !state.activeDraftMap[pid].picked
    );
    if (!nextLocalId) {
      state.myDraftPicked = true;
      upgradeGrid.innerHTML = '';
      const { ready, total } = countDraftReady();
      draftWaitingEl.textContent = `Your UFO upgrade is locked in! Waiting for teammates (${ready}/${total} ready)...`;
      draftWaitingEl.classList.remove('hidden');
      upgradeOverlay.classList.remove('hidden');
      return;
    }

    state.activeLocalDraftId = nextLocalId;
    state.myDraftPicked = false;
    state.draftFocus = 0;
    const p = state.players.find((pl) => pl.id === nextLocalId);
    const entry = state.activeDraftMap[nextLocalId];
    state.draftChoices = entry.choices;

    draftEyebrow.textContent = eyebrow || `Team Level ${state.level}!`;
    draftTitle.textContent =
      state.localDraftQueue.length > 1 && p ? `${p.name}: Choose Your UFO Upgrade` : title || 'Upgrade Your Personal UFO';
    draftSub.textContent = sub || 'Your pick upgrades & visually evolves your own UFO!';
    draftWaitingEl.classList.add('hidden');
    renderDraftCards(p ? p.upgrades : defaultUpgrades());
    upgradeOverlay.classList.remove('hidden');
  }

  function countDraftReady() {
    const entries = Object.values(state.activeDraftMap);
    const total = entries.length;
    const ready = entries.filter((e) => e.picked).length;
    return { ready, total };
  }

  function renderDraftCards(myUpgrades) {
    upgradeGrid.innerHTML = '';
    const isCoop = state.players.length >= 2;
    state.draftChoices.forEach((u, idx) => {
      const curLv = (myUpgrades && myUpgrades[u.id]) || 0;
      const nextLv = curLv + 1;
      const card = document.createElement('button');
      card.type = 'button';
      card.className =
        'upgrade-card' +
        (idx === state.draftFocus ? ' focused' : '') +
        (state.draftIsBoss ? ' boss-tier' : '');
      const displayName = !isCoop && u.id === 'tether_beam' ? 'Wingman Mini-UFO' : u.name;
      const displayTag = !isCoop && u.id === 'tether_beam' ? 'Weapon' : u.tag;
      card.innerHTML = `
        <div class="upg-head">
          <div class="upg-icon">${u.icon}</div>
          <span class="upg-tag ${u.tagClass}">${displayTag}</span>
        </div>
        <div class="upg-name">${displayName}</div>
        <div class="upg-desc">${u.describe(nextLv, isCoop)}</div>
        <div class="upg-footer">
          <span>${curLv === 0 ? 'NEW VISUAL GEAR' : `LV ${curLv} → LV ${nextLv}`}</span>
          <span>[${idx + 1}]</span>
        </div>
      `;
      card.addEventListener('mouseenter', () => {
        state.draftFocus = idx;
        updateDraftFocusClasses();
      });
      card.addEventListener('click', () => requestPickUpgrade(idx));
      upgradeGrid.appendChild(card);
    });
  }

  function updateDraftFocusClasses() {
    const children = upgradeGrid.children;
    for (let i = 0; i < children.length; i++) {
      children[i].classList.toggle('focused', i === state.draftFocus);
    }
  }

  function moveDraftFocus(dir) {
    const n = state.draftChoices.length;
    if (!n) return;
    state.draftFocus = (state.draftFocus + dir + n) % n;
    updateDraftFocusClasses();
  }

  function requestPickUpgrade(idx) {
    if (state.myDraftPicked) return;
    if (room.isHost) {
      if (state.activeLocalDraftId) {
        applyPlayerDraftPick(state.activeLocalDraftId, idx);
      }
    } else {
      state.myDraftPicked = true;
      SFX.xp();
      upgradeGrid.innerHTML = '';
      draftWaitingEl.textContent = 'Your UFO upgrade is locked in! Waiting for teammates...';
      draftWaitingEl.classList.remove('hidden');
      room.sendSignal({ type: 'PERSONAL_PICK', idx });
    }
  }

  function applyPlayerDraftPick(playerId, idx) {
    if (!room.isHost) return;
    const entry = state.activeDraftMap[playerId];
    const p = state.players.find((pl) => pl.id === playerId);
    if (!entry || entry.picked || !p) return;
    const u = entry.choices[idx];
    if (!u) return;

    p.upgrades[u.id] = (p.upgrades[u.id] || 0) + 1;
    entry.picked = true;

    if (u.id === 'hull_plating') {
      p.maxHp += 30;
      if (!p.downed) p.hp = Math.min(p.maxHp, p.hp + 45);
    }

    SFX.xp();
    const { ready, total } = countDraftReady();
    room.sendSignal({ type: 'DRAFT_STATUS', ready, total });

    if (p.isLocal) {
      showNextLocalDraft(draftEyebrow.textContent, draftTitle.textContent, draftSub.textContent);
    } else if (state.myDraftPicked) {
      draftWaitingEl.textContent = `Your UFO upgrade is locked in! Waiting for teammates (${ready}/${total} ready)...`;
    }

    checkAllDraftsPicked();
  }

  function checkAllDraftsPicked() {
    if (!room.isHost || state.mode !== 'upgrade') return;
    const { ready, total } = countDraftReady();
    if (total === 0 || ready >= total) {
      upgradeOverlay.classList.add('hidden');
      draftWaitingEl.classList.add('hidden');
      state.myDraftPicked = false;
      room.sendSignal({ type: 'DRAFT_DONE' });

      if (state.pendingDrafts.length > 0) {
        openNextPersonalDraft();
      } else {
        state.mode = 'playing';
      }
      renderHud();
    }
  }

  // ---- Weapons Firing (Per-Player Personal Upgrades!) ----
  function findNearestEnemy(x, y, maxRange = Infinity) {
    let best = null;
    let bestD = maxRange;
    for (const e of state.enemies) {
      const d = dist(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function firePulseCannon(p) {
    const lv = p.upgrades.pulse_cannon || 1;
    const count = lv;
    const spread = count === 1 ? 0 : Math.min(0.46, (count - 1) * 0.11);
    const speed = 660;
    const baseDmg = 13 + lv * 3;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const ang = p.angle + t * spread;
      state.bullets.push({
        kind: 'pulse',
        ownerId: p.id,
        x: p.x + Math.cos(ang) * 20,
        y: p.y + Math.sin(ang) * 20,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        radius: 5,
        damage: baseDmg,
        color: p.glow,
        life: 1.05,
      });
    }
    p.muzzleFlash = 0.08;
    SFX.shoot();
  }

  function firePlasmaRail(p) {
    const lv = p.upgrades.plasma_rail;
    const target = findNearestEnemy(p.x, p.y, 700);
    const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
    const len = Math.max(W, H) * 0.9;
    const x2 = p.x + Math.cos(ang) * len;
    const y2 = p.y + Math.sin(ang) * len;
    const width = 10 + lv * 3;
    const baseDmg = 34 + lv * 16;

    state.beams.push({ x1: p.x, y1: p.y, x2, y2, width, color: '#38bdf8', life: 0.22, maxLife: 0.22 });

    const dx = x2 - p.x;
    const dy = y2 - p.y;
    const lenSq = dx * dx + dy * dy;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const t = clamp(((e.x - p.x) * dx + (e.y - p.y) * dy) / lenSq, 0, 1);
      if (dist(p.x + t * dx, p.y + t * dy, e.x, e.y) <= e.radius + width * 0.6) {
        damageEnemy(e, baseDmg, '#38bdf8', p);
      }
    }
    SFX.rail();
  }

  function fireHomingMissiles(p) {
    const lv = p.upgrades.homing_missiles;
    for (let i = 0; i < lv + 1; i++) {
      const ang = p.angle + rand(-0.9, 0.9);
      state.bullets.push({
        kind: 'missile',
        ownerId: p.id,
        x: p.x + Math.cos(ang) * 16,
        y: p.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * 260,
        vy: Math.sin(ang) * 260,
        speed: 420 + lv * 22,
        radius: 6.5,
        damage: 24 + lv * 10,
        color: '#fde047',
        life: 3.0,
      });
    }
    SFX.missile();
  }

  function fireChainLightning(p) {
    const lv = p.upgrades.chain_lightning;
    const hitSet = new Set();
    let curX = p.x;
    let curY = p.y;
    const baseDmg = 22 + lv * 9;

    for (let j = 0; j < lv + 2; j++) {
      let best = null;
      let bestD = j === 0 ? 310 : 210;
      for (const e of state.enemies) {
        if (hitSet.has(e) || e.hp <= 0) continue;
        const d = dist(curX, curY, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;
      hitSet.add(best);
      state.beams.push({
        x1: curX, y1: curY, x2: best.x, y2: best.y,
        width: 4, color: '#fde047', jagged: true, life: 0.16, maxLife: 0.16,
      });
      damageEnemy(best, baseDmg, '#fde047', p);
      curX = best.x;
      curY = best.y;
    }
    if (hitSet.size > 0) SFX.zap();
  }

  function triggerNovaPulse(p) {
    const lv = p.upgrades.nova_pulse;
    const maxR = 145 + lv * 35;
    const baseDmg = 26 + lv * 14;
    state.novas.push({ x: p.x, y: p.y, r: 18, maxR, color: p.glow, life: 0.36, maxLife: 0.36 });

    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      if (dist(p.x, p.y, b.x, b.y) <= maxR) {
        spawnParticles(b.x, b.y, '#fb7185', 4, 90, 2.5);
        state.enemyBullets.splice(i, 1);
      }
    }
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const d = dist(p.x, p.y, e.x, e.y);
      if (d <= maxR + e.radius) {
        damageEnemy(e, baseDmg, p.glow, p);
        if (!e.isBoss && d > 1) {
          e.vx += ((e.x - p.x) / d) * 210;
          e.vy += ((e.y - p.y) / d) * 210;
        }
      }
    }
    SFX.nova();
  }

  // ---- Enemy Damage & Death (With Damage Meter Tracking & Boss Armor Cap) ----
  function damageEnemy(e, baseDmg, color = '#f8fafc', sourcePlayer = null) {
    if (e.hp <= 0) return;
    let { dmg, isCrit } = rollPlayerDamage(sourcePlayer, baseDmg);

    // Boss burst-armor cap so bosses are real battles and never insta-melt
    if (e.isBoss) {
      const maxHit = Math.max(40, Math.round(e.maxHp * 0.035));
      dmg = Math.min(dmg, maxHit);
    }

    const dealt = Math.min(e.hp, dmg);
    e.hp -= dmg;
    e.hitFlash = 0.09;
    e.hitBounce = 0.2;

    if (sourcePlayer) {
      sourcePlayer.damage += dealt;
      if ((sourcePlayer.upgrades.cryo_rounds || 0) > 0) {
        e.chillTimer = 2.2;
        e.chillPower = Math.min(0.55, 0.18 + sourcePlayer.upgrades.cryo_rounds * 0.1);
      }
    }

    // Boss Phase 2 Enrage at 50% HP!
    if (e.isBoss && e.phase === 1 && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
      e.phase = 2;
      e.speed *= 1.28;
      state.shake = 12;
      spawnCartoonBurst(e.x, e.y, '#fb7185', true);
      spawnFloatText(e.x, e.y - 72, 'PHASE 2 — ENRAGED!', '#fde047');
      SFX.bossWarn();
    }

    if (isCrit || e.isBoss) {
      spawnFloatText(e.x + rand(-10, 10), e.y - e.radius * 0.6, isCrit ? `POW! ${dmg}!` : `${dmg}`, isCrit ? '#fde047' : color);
    }
    if (e.isBoss) updateBossBar(e);
    if (e.hp <= 0) killEnemy(e);
    else SFX.hit();
  }

  const COMIC_WORDS = ['POP!', 'ZAP!', 'BAM!', 'POW!', 'BOING!', 'SPLAT!'];

  function killEnemy(e) {
    const idx = state.enemies.indexOf(e);
    if (idx !== -1) state.enemies.splice(idx, 1);

    state.kills += 1;
    state.score += e.score;
    spawnCartoonBurst(e.x, e.y, e.color, Boolean(e.isBoss));
    if (!e.isBoss && Math.random() < 0.24) {
      const word = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
      spawnFloatText(e.x, e.y - e.radius * 0.5, word, '#fef08a');
    }

    if (e.type === 'asteroid_lg') {
      spawnEnemy('asteroid_md', { x: e.x + rand(-12, 12), y: e.y + rand(-12, 12) });
      spawnEnemy('asteroid_md', { x: e.x + rand(-12, 12), y: e.y + rand(-12, 12) });
    } else if (e.type === 'asteroid_md') {
      spawnEnemy('asteroid_sm', { x: e.x + rand(-8, 8), y: e.y + rand(-8, 8) });
      spawnEnemy('asteroid_sm', { x: e.x + rand(-8, 8), y: e.y + rand(-8, 8) });
    } else if (e.type === 'mitosis') {
      spawnEnemy('microbe', { x: e.x + rand(-10, 10), y: e.y + rand(-10, 10) });
      spawnEnemy('microbe', { x: e.x + rand(-10, 10), y: e.y + rand(-10, 10) });
    }

    if (e.isBoss) {
      state.bossActive = false;
      state.bossesDefeated += 1;
      state.shake = 20;
      state.enemyBullets = [];
      bossBarWrap.classList.add('hidden');
      SFX.bossDead();
      spawnFloatText(e.x, e.y, `${e.name} PURGED!`, '#fde047');

      state.players.forEach((p) => {
        p.downed = false;
        p.reviveProgress = 0;
        p.hp = p.maxHp;
        p.invuln = 2.0;
      });

      state.pendingDrafts.push({ isBossReward: true, level: state.level });
      openNextPersonalDraft();
      return;
    }

    SFX.pop();
    state.pickups.push({
      kind: 'xp', x: e.x, y: e.y, vx: rand(-35, 35), vy: rand(-35, 35), value: e.xp, life: 16, pulling: false,
    });
    if (Math.random() < 0.05) {
      state.pickups.push({
        kind: 'heal', x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: rand(-25, 25), vy: rand(-25, 25), value: 26, life: 16, pulling: false,
      });
    }
  }

  // ---- Player Damage & Game Over ----
  function hurtPlayer(p, amount) {
    if (p.downed || p.invuln > 0 || p.dashTimer > 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invuln = 0.85;
    state.shake = Math.max(state.shake, 9);
    spawnParticles(p.x, p.y, p.color, 14, 170, 3.5);
    SFX.hurt();

    if (p.hp <= 0) {
      p.downed = true;
      p.reviveProgress = 0;
      spawnParticles(p.x, p.y, '#fb7185', 26, 220, 4.5);
      if (state.players.length >= 2) {
        spawnFloatText(p.x, p.y - 28, `${p.name} DOWN! FLY NEAR TO REVIVE`, '#fb7185');
      }
      if (!state.players.some((pl) => !pl.downed)) {
        triggerGameOver();
      }
    }
  }

  function triggerGameOver() {
    saveBestStats();
    const dmgSummary = state.players
      .slice()
      .sort((a, b) => b.damage - a.damage)
      .map((p) => ({ name: p.name, color: p.color, damage: Math.round(p.damage) }));
    room.sendSignal({
      type: 'GAME_OVER',
      level: state.level,
      score: state.score,
      bosses: state.bossesDefeated,
      kills: state.kills,
      dmgSummary,
    });
    showGameOverUI(dmgSummary);
  }

  function showGameOverUI(dmgSummary = []) {
    clearTouchSteer();
    state.mode = 'gameover';
    sumLevel.textContent = String(state.level);
    sumScore.textContent = state.score.toLocaleString();
    sumBosses.textContent = String(state.bossesDefeated);
    gameoverSub.textContent =
      state.bossesDefeated > 0
        ? `Your UFO squad reached Level ${state.level} and purged ${state.bossesDefeated} space virus boss${state.bossesDefeated > 1 ? 'es' : ''}!`
        : `Your UFO squad reached Level ${state.level} and purged ${state.kills} space viruses.`;

    const totalDmg = Math.max(1, dmgSummary.reduce((acc, d) => acc + d.damage, 0));
    gameoverDamageList.innerHTML = dmgSummary.length
      ? `<div style="font-size:0.78rem;font-weight:700;color:#fde68a;margin-bottom:8px;text-transform:uppercase;">Squad Damage Breakdown</div>` +
        dmgSummary
          .map((d) => {
            const pct = Math.round((d.damage / totalDmg) * 100);
            return `
              <div class="dmg-row" style="margin-bottom:8px;">
                <div class="dmg-row-head">
                  <span>${escapeHtml(d.name)}</span>
                  <span>${formatDmg(d.damage)} (${pct}%)</span>
                </div>
                <div class="dmg-bar-track" style="height:8px;">
                  <div class="dmg-bar-fill" style="width:${pct}%;background:${d.color};"></div>
                </div>
              </div>
            `;
          })
          .join('')
      : '';

    btnPlayAgain.disabled = !room.isHost;
    btnPlayAgain.textContent = room.isHost ? 'Play Again' : 'Waiting for Host...';
    gameoverOverlay.classList.remove('hidden');
  }

  function saveBestStats() {
    try {
      const prev = JSON.parse(localStorage.getItem('astro_purge_best') || '{}');
      localStorage.setItem(
        'astro_purge_best',
        JSON.stringify({
          bestLevel: Math.max(prev.bestLevel || 0, state.level),
          bestScore: Math.max(prev.bestScore || 0, state.score),
          bestBosses: Math.max(prev.bestBosses || 0, state.bossesDefeated),
        })
      );
    } catch {}
  }

  // ---- Main Host Update Loop ----
  function updateHost(dt, pads) {
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);

    if (state.bossWarningTimer > 0) {
      state.bossWarningTimer -= dt;
      if (state.bossWarningTimer <= 0) {
        bossWarningEl.classList.add('hidden');
        if (state.pendingBossLevel !== null) {
          spawnBoss(state.pendingBossLevel);
          state.pendingBossLevel = null;
        }
      }
    }

    // Spawner (Harder & More Action-Packed)
    state.spawnTimer -= dt;
    const maxEnemies = state.bossActive ? 12 : Math.min(42, 11 + state.level * 2 + state.players.length * 3);
    if (state.spawnTimer <= 0 && state.bossWarningTimer <= 0 && state.enemies.length < maxEnemies) {
      const type = pickWaveEnemyType();
      if (type === 'microbe') {
        const base = edgeSpawnPos();
        for (let k = 0; k < 4; k++) {
          spawnEnemy('microbe', { x: base.x + rand(-24, 24), y: base.y + rand(-24, 24) });
        }
      } else {
        spawnEnemy(type);
      }
      const baseInterval = state.bossActive ? 2.4 : Math.max(0.32, 1.38 - state.level * 0.055);
      state.spawnTimer = baseInterval / (1 + (state.players.length - 1) * 0.25);
    }

    // Update Players
    for (const p of state.players) {
      if (p.invuln > 0) p.invuln -= dt;
      if (p.muzzleFlash > 0) p.muzzleFlash = Math.max(0, p.muzzleFlash - dt);
      if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      if (p.dashTimer > 0) p.dashTimer = Math.max(0, p.dashTimer - dt);

      const speedBoost = 1 + (p.upgrades.thrusters || 0) * 0.13;
      const dashCdMax = Math.max(1.2, 3.0 * Math.pow(0.84, p.upgrades.thrusters || 0));

      if (p.downed) {
        const helper = state.players.find((o) => o !== p && !o.downed && dist(p.x, p.y, o.x, o.y) < 78);
        if (helper) {
          p.reviveProgress += dt / 2.2;
          if (p.reviveProgress >= 1) {
            p.downed = false;
            p.reviveProgress = 0;
            p.hp = Math.round(p.maxHp * 0.55);
            p.invuln = 2.0;
            spawnCartoonBurst(p.x, p.y, p.glow, false);
            spawnFloatText(p.x, p.y - 26, 'REVIVED!', '#5eead4');
            SFX.levelUp();
          }
        } else {
          p.reviveProgress = Math.max(0, p.reviveProgress - dt * 0.35);
        }
        continue;
      }

      const inp = p.isLocal
        ? readLocalInput(p.localIndex, pads)
        : remoteInputs[p.id] || { mx: 0, my: 0, tx: null, ty: null, ax: 0, ay: 0, fire: false, dash: false };

      let moveX = inp.mx || 0;
      let moveY = inp.my || 0;

      // Follow-the-finger touch steering! (When finger is lifted, tx/ty are null -> zero input!)
      if (inp.tx !== null && inp.tx !== undefined && inp.ty !== null && inp.ty !== undefined) {
        const targetX = inp.tx * W;
        const targetY = inp.ty * H;
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 14) {
          const strength = clamp((d - 12) / 70, 0.2, 1);
          moveX = (dx / d) * strength;
          moveY = (dy / d) * strength;
        } else {
          moveX = 0;
          moveY = 0;
        }
      }

      const accel = 1140 * speedBoost;
      const maxSpeed = 395 * speedBoost;

      if (inp.dash && p.dashCooldown <= 0) {
        const dx = moveX || Math.cos(p.angle);
        const dy = moveY || Math.sin(p.angle);
        const dm = Math.hypot(dx, dy) || 1;
        p.vx = (dx / dm) * 780;
        p.vy = (dy / dm) * 780;
        p.thrustAngle = Math.atan2(-dy, -dx);
        p.thrustPower = 1.4;
        p.dashTimer = 0.22;
        p.dashCooldown = dashCdMax;
        spawnCartoonBurst(p.x, p.y, p.glow, false);
        SFX.dash();
      }

      const moveMag = Math.hypot(moveX, moveY);
      p.thrusting = moveMag > 0.08;
      if (p.thrusting) {
        // Thruster exhaust points OPPOSITE the direction you are steering!
        p.thrustAngle = Math.atan2(-moveY, -moveX);
        p.thrustPower = clamp(moveMag, 0.35, 1);
      } else if (p.dashTimer > 0) {
        p.thrustPower = 1.35;
      } else {
        p.thrustPower = Math.max(0, (p.thrustPower || 0) - dt * 5);
      }

      if (p.dashTimer <= 0) {
        p.vx += moveX * accel * dt;
        p.vy += moveY * accel * dt;
        // Longer, smooth space-drift braking when no input is pressed
        const drag = Math.pow(0.28, dt);
        p.vx *= drag;
        p.vy *= drag;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > maxSpeed) {
          p.vx = (p.vx / sp) * maxSpeed;
          p.vy = (p.vy / sp) * maxSpeed;
        }
      }

      p.x = clamp(p.x + p.vx * dt, 24, W - 24);
      p.y = clamp(p.y + p.vy * dt, 24, H - 24);

      if (inp.ax || inp.ay) {
        p.angle = Math.atan2(inp.ay, inp.ax);
      } else {
        const nearest = findNearestEnemy(p.x, p.y, 480);
        if (nearest) {
          const targetAng = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          let diff = targetAng - p.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          p.angle += diff * Math.min(1, dt * 12);
        } else if (p.thrusting) {
          const moveAng = Math.atan2(moveY, moveX);
          let diff = moveAng - p.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          p.angle += diff * Math.min(1, dt * 10);
        }
      }

      // Personal Weapons
      p.fireTimer -= dt;
      const pulseInterval = Math.max(0.11, 0.24 - ((p.upgrades.pulse_cannon || 1) - 1) * 0.025);
      if (((state.autoFire && state.enemies.length > 0) || inp.fire) && p.fireTimer <= 0) {
        firePulseCannon(p);
        p.fireTimer = pulseInterval;
      }

      if (p.upgrades.plasma_rail > 0) {
        p.railTimer -= dt;
        if (p.railTimer <= 0 && state.enemies.length > 0) {
          firePlasmaRail(p);
          p.railTimer = Math.max(1.3, 3.3 - p.upgrades.plasma_rail * 0.35);
        }
      }

      if (p.upgrades.homing_missiles > 0) {
        p.missileTimer -= dt;
        if (p.missileTimer <= 0 && state.enemies.length > 0) {
          fireHomingMissiles(p);
          p.missileTimer = Math.max(1.2, 2.7 - p.upgrades.homing_missiles * 0.25);
        }
      }

      if (p.upgrades.chain_lightning > 0) {
        p.teslaTimer -= dt;
        if (p.teslaTimer <= 0 && state.enemies.length > 0) {
          fireChainLightning(p);
          p.teslaTimer = Math.max(0.75, 1.85 - p.upgrades.chain_lightning * 0.18);
        }
      }

      if (p.upgrades.nova_pulse > 0) {
        p.novaTimer -= dt;
        if (p.novaTimer <= 0) {
          triggerNovaPulse(p);
          p.novaTimer = Math.max(2.6, 5.4 - p.upgrades.nova_pulse * 0.5);
        }
      }

      if (p.upgrades.orbital_blades > 0) {
        const orbRadius = 290;
        const orbCount = p.upgrades.orbital_blades + 1;
        p.orbitAngle += (2.1 + p.upgrades.orbital_blades * 0.28) * dt;
        for (let k = 0; k < orbCount; k++) {
          const oa = p.orbitAngle + (k / orbCount) * Math.PI * 2;
          const ox = p.x + Math.cos(oa) * orbRadius;
          const oy = p.y + Math.sin(oa) * orbRadius;
          for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            if (dist(ox, oy, e.x, e.y) < e.radius + 17) {
              if (!e._orbCd || state.time - e._orbCd > 0.2) {
                e._orbCd = state.time;
                damageEnemy(e, 16 + p.upgrades.orbital_blades * 6, '#fde047', p);
              }
            }
          }
          for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const b = state.enemyBullets[i];
            if (dist(ox, oy, b.x, b.y) < b.radius + 17) {
              spawnParticles(b.x, b.y, '#fde047', 4, 90, 3, 'star');
              state.enemyBullets.splice(i, 1);
            }
          }
        }
      }

      if (state.players.length === 1 && p.upgrades.tether_beam > 0) {
        const lv = p.upgrades.tether_beam;
        p.droneAngle += 1.9 * dt;
        const dx = p.x + Math.cos(p.droneAngle) * 56;
        const dy = p.y + Math.sin(p.droneAngle) * 56;
        p.droneFireTimer -= dt;
        if (p.droneFireTimer <= 0) {
          const t = findNearestEnemy(dx, dy, 420);
          if (t) {
            const ang = Math.atan2(t.y - dy, t.x - dx);
            state.bullets.push({
              kind: 'pulse', ownerId: p.id, x: dx, y: dy,
              vx: Math.cos(ang) * 580, vy: Math.sin(ang) * 580,
              radius: 4.5, damage: 14 + lv * 7, color: '#fcd34d', life: 0.9,
            });
            p.droneFireTimer = Math.max(0.18, 0.55 - lv * 0.07);
          }
        }
      }
    }

    // Co-op Plasma Tether between teammates if either player has tether_beam
    if (state.players.length >= 2) {
      for (let a = 0; a < state.players.length; a++) {
        for (let b = a + 1; b < state.players.length; b++) {
          const p1 = state.players[a];
          const p2 = state.players[b];
          const tetherLv = Math.max(p1.upgrades.tether_beam || 0, p2.upgrades.tether_beam || 0);
          if (tetherLv <= 0 || p1.downed || p2.downed) continue;
          const maxRange = 290 + tetherLv * 55;
          if (dist(p1.x, p1.y, p2.x, p2.y) > maxRange) continue;
          const owner = (p1.upgrades.tether_beam || 0) >= (p2.upgrades.tether_beam || 0) ? p1 : p2;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const lenSq = dx * dx + dy * dy || 1;
          for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            const t = clamp(((e.x - p1.x) * dx + (e.y - p1.y) * dy) / lenSq, 0, 1);
            if (dist(p1.x + t * dx, p1.y + t * dy, e.x, e.y) <= e.radius + 9) {
              if (!e._tetherCd || state.time - e._tetherCd > 0.16) {
                e._tetherCd = state.time;
                damageEnemy(e, 14 + tetherLv * 8, '#fcd34d', owner);
              }
            }
          }
        }
      }
    }

    // Update Player Bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.life -= dt;
      if (b.life <= 0) { state.bullets.splice(i, 1); continue; }

      if (b.kind === 'missile') {
        const target = findNearestEnemy(b.x, b.y, 650);
        if (target) {
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nextAng = cur + clamp(diff, -5.5 * dt, 5.5 * dt);
          b.vx = Math.cos(nextAng) * b.speed;
          b.vy = Math.sin(nextAng) * b.speed;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) {
        state.bullets.splice(i, 1);
        continue;
      }

      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.radius) {
          const owner = state.players.find((pl) => pl.id === b.ownerId) || null;
          damageEnemy(e, b.damage, b.color, owner);
          spawnParticles(b.x, b.y, b.color, 4, 90, 2.5);
          state.bullets.splice(i, 1);
          break;
        }
      }
    }

    // Update Enemies
    const livingPlayers = state.players.filter((p) => !p.downed);
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hitBounce > 0) e.hitBounce = Math.max(0, e.hitBounce - dt);
      if (e.chillTimer > 0) e.chillTimer -= dt;
      e.rot += (e.rotSpeed || 0) * dt;
      const slow = e.chillTimer > 0 ? 1 - (e.chillPower || 0.25) : 1;

      let target = null;
      let bestPD = Infinity;
      for (const lp of livingPlayers) {
        const d = dist(e.x, e.y, lp.x, lp.y);
        if (d < bestPD) { bestPD = d; target = lp; }
      }

      if (e.type.startsWith('asteroid')) {
        e.x += e.vx * slow * dt;
        e.y += e.vy * slow * dt;
        if (e.x < -60) e.x = W + 55;
        if (e.x > W + 60) e.x = -55;
        if (e.y < -60) e.y = H + 55;
        if (e.y > H + 60) e.y = -55;
      } else if (e.isBoss) {
        updateBossBehavior(e, target, dt, slow);
      } else if (target) {
        const ang = Math.atan2(target.y - e.y, target.x - e.x);
        const d = bestPD;
        if (e.type === 'shooter') {
          const desiredSp = d > 260 ? e.speed : d < 170 ? -e.speed * 0.6 : 0;
          const strafe = ang + Math.PI * 0.5;
          e.vx += (Math.cos(ang) * desiredSp + Math.cos(strafe) * e.speed * 0.55 - e.vx) * dt * 3;
          e.vy += (Math.sin(ang) * desiredSp + Math.sin(strafe) * e.speed * 0.55 - e.vy) * dt * 3;
          e.fireTimer -= dt;
          if (e.fireTimer <= 0 && d < 560) {
            state.enemyBullets.push({
              x: e.x, y: e.y, vx: Math.cos(ang) * 255, vy: Math.sin(ang) * 255,
              radius: 7.5, damage: 17, color: '#ef4444', life: 3.6,
            });
            e.fireTimer = Math.max(1.05, 2.2 - state.level * 0.045);
          }
        } else {
          e.vx += (Math.cos(ang) * e.speed - e.vx) * dt * 2.6;
          e.vy += (Math.sin(ang) * e.speed - e.vy) * dt * 2.6;
        }
        e.x += e.vx * slow * dt;
        e.y += e.vy * slow * dt;
      }

      for (const p of livingPlayers) {
        if (dist(e.x, e.y, p.x, p.y) < e.radius + p.radius - 3) {
          hurtPlayer(p, e.damage);
          if (!e.isBoss) {
            const push = Math.atan2(e.y - p.y, e.x - p.x);
            e.vx = Math.cos(push) * 180;
            e.vy = Math.sin(push) * 180;
          }
        }
      }
    }

    // Enemy Bullets
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
        state.enemyBullets.splice(i, 1);
        continue;
      }
      for (const p of livingPlayers) {
        if (dist(b.x, b.y, p.x, p.y) < b.radius + p.radius - 3) {
          hurtPlayer(p, b.damage);
          state.enemyBullets.splice(i, 1);
          break;
        }
      }
    }

    // Pickups (Animated Magnetic Pull + Absorption Burst)
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const pk = state.pickups[i];
      pk.life -= dt;
      if (pk.life <= 0) { state.pickups.splice(i, 1); continue; }
      pk.vx *= Math.pow(0.08, dt);
      pk.vy *= Math.pow(0.08, dt);

      let nearest = null;
      let bestD = Infinity;
      for (const p of livingPlayers) {
        const pMag = 120 * (1 + (p.upgrades.magnet_core || 0) * 0.45);
        const d = dist(pk.x, pk.y, p.x, p.y);
        if (d < pMag && d < bestD) { bestD = d; nearest = p; }
      }
      if (nearest) {
        pk.pulling = true;
        const ang = Math.atan2(nearest.y - pk.y, nearest.x - pk.x);
        pk.vx += Math.cos(ang) * 540 * dt * 4.5;
        pk.vy += Math.sin(ang) * 540 * dt * 4.5;
        if (bestD < nearest.radius + 16) {
          const orbColor = pk.kind === 'xp' ? '#38bdf8' : '#4ade80';
          state.novas.push({
            x: nearest.x, y: nearest.y, r: 8,
            maxR: pk.kind === 'xp' ? 40 : 56,
            color: orbColor, life: 0.24, maxLife: 0.24,
          });
          spawnParticles(nearest.x, nearest.y, orbColor, pk.kind === 'xp' ? 9 : 16, 155, 3);

          if (pk.kind === 'xp') {
            addTeamXp(pk.value);
            SFX.xp();
          } else {
            state.players.forEach((pl) => {
              if (!pl.downed) pl.hp = Math.min(pl.maxHp, pl.hp + pk.value);
            });
            spawnFloatText(nearest.x, nearest.y - 24, `+${pk.value} HULL`, '#4ade80');
            SFX.heal();
          }
          state.pickups.splice(i, 1);
          continue;
        }
      } else {
        pk.pulling = false;
      }
      pk.x = clamp(pk.x + pk.vx * dt, 14, W - 14);
      pk.y = clamp(pk.y + pk.vy * dt, 14, H - 14);
    }
  }

  // Runs on BOTH Host and Guest every frame for silky 60fps Disney cartoon visuals!
  function updateVisualEffects(dt) {
    state.time += dt;

    // Shooting stars streaking occasionally across the cartoon night sky
    nextShootingStar -= dt;
    if (nextShootingStar <= 0) {
      nextShootingStar = rand(3.5, 8.0);
      shootingStars.push({
        x: rand(W * 0.15, W * 0.95),
        y: rand(15, H * 0.35),
        vx: -rand(380, 560),
        vy: rand(160, 260),
        life: 0.55,
        maxLife: 0.55,
      });
    }
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.life -= dt;
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      if (ss.life <= 0) shootingStars.splice(i, 1);
    }

    // Emit cute inked cartoon exhaust puffs & sparks behind any steering UFO!
    if (state.mode === 'playing') {
      for (const p of state.players) {
        if (p.downed) continue;
        const firingThruster = p.thrusting || p.dashTimer > 0 || (p.thrustPower || 0) > 0.18;
        if (!firingThruster) continue;
        p.puffTimer = (p.puffTimer || 0) - dt;
        const rate = p.dashTimer > 0 ? 0.022 : 0.048;
        if (p.puffTimer <= 0) {
          p.puffTimer = rate;
          const ea = p.thrustAngle !== undefined ? p.thrustAngle : Math.PI / 2;
          const ex = p.x + Math.cos(ea) * 24;
          const ey = p.y + Math.sin(ea) * 24;
          const spread = rand(-0.35, 0.35);
          const sp = p.dashTimer > 0 ? rand(130, 220) : rand(65, 130);
          state.particles.push({
            x: ex + rand(-3, 3),
            y: ey + rand(-3, 3),
            vx: Math.cos(ea + spread) * sp,
            vy: Math.sin(ea + spread) * sp,
            life: p.dashTimer > 0 ? 0.38 : 0.32,
            maxLife: p.dashTimer > 0 ? 0.38 : 0.32,
            color: Math.random() < 0.55 ? '#fef3c7' : p.glow,
            size: p.dashTimer > 0 ? rand(6.5, 10) : rand(4.5, 7.5),
            kind: 'puff',
          });
          if (Math.random() < (p.dashTimer > 0 ? 0.65 : 0.28)) {
            state.particles.push({
              x: ex,
              y: ey,
              vx: Math.cos(ea + rand(-0.5, 0.5)) * (sp * 1.3),
              vy: Math.sin(ea + rand(-0.5, 0.5)) * (sp * 1.3),
              life: 0.28,
              maxLife: 0.28,
              color: '#fde047',
              size: rand(2.6, 4.2),
              kind: 'star',
            });
          }
        }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.pow(0.18, dt);
      pt.vy *= Math.pow(0.18, dt);
      if (pt.kind === 'puff') pt.size += dt * 7;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.beams.length - 1; i >= 0; i--) {
      state.beams[i].life -= dt;
      if (state.beams[i].life <= 0) state.beams.splice(i, 1);
    }
    for (let i = state.novas.length - 1; i >= 0; i--) {
      const n = state.novas[i];
      n.life -= dt;
      n.r = n.maxR * (1 - n.life / n.maxLife);
      if (n.life <= 0) state.novas.splice(i, 1);
    }
    for (let i = state.floatTexts.length - 1; i >= 0; i--) {
      const ft = state.floatTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) state.floatTexts.splice(i, 1);
    }
  }

  function updateBossBehavior(boss, target, dt, slow) {
    if (boss.y < 145) { boss.y += 120 * dt; return; }
    if (boss.charging > 0) {
      boss.charging -= dt;
      boss.x = clamp(boss.x + boss.chargeVx * dt, 70, W - 70);
      boss.y = clamp(boss.y + boss.chargeVy * dt, 95, H - 70);
      return;
    }
    if (target) {
      const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
      boss.vx += (Math.cos(ang) * boss.speed - boss.vx) * dt * 1.6;
      boss.vy += (Math.sin(ang) * boss.speed - boss.vy) * dt * 1.6;
      boss.x = clamp(boss.x + boss.vx * slow * dt, 70, W - 70);
      boss.y = clamp(boss.y + boss.vy * slow * dt, 95, H - 70);
    }

    const enraged = boss.phase >= 2;
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      if (boss.variant === 0) {
        const count = (enraged ? 18 : 12) + boss.tier * 2;
        boss.spiralAngle += 0.35;
        for (let k = 0; k < count; k++) {
          const a = boss.spiralAngle + (k / count) * Math.PI * 2;
          state.enemyBullets.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * (enraged ? 245 : 210),
            vy: Math.sin(a) * (enraged ? 245 : 210),
            radius: 8, damage: 19, color: '#ef4444', life: 4.5,
          });
        }
        boss.attackTimer = Math.max(0.95, (enraged ? 1.45 : 2.0) - boss.tier * 0.1);
      } else if (boss.variant === 1 && target) {
        const baseAng = Math.atan2(target.y - boss.y, target.x - boss.x);
        const span = enraged ? 3 : 2;
        for (let k = -span; k <= span; k++) {
          const a = baseAng + k * 0.18;
          state.enemyBullets.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * (enraged ? 295 : 260),
            vy: Math.sin(a) * (enraged ? 295 : 260),
            radius: 8, damage: 19, color: '#ef4444', life: 4.0,
          });
        }
        boss.attackTimer = Math.max(0.8, (enraged ? 1.2 : 1.65) - boss.tier * 0.1);
      } else {
        boss.spiralAngle += 0.45;
        const count = enraged ? 20 : 14;
        for (let k = 0; k < count; k++) {
          const a = boss.spiralAngle + (k / count) * Math.PI * 2;
          state.enemyBullets.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * (enraged ? 265 : 230),
            vy: Math.sin(a) * (enraged ? 265 : 230),
            radius: 8.5, damage: 21, color: '#ef4444', life: 4.5,
          });
        }
        boss.attackTimer = Math.max(0.9, (enraged ? 1.3 : 1.75) - boss.tier * 0.1);
      }
    }

    boss.chargeTimer -= dt;
    if (boss.chargeTimer <= 0 && target) {
      const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
      const sp = enraged ? 420 : 355;
      boss.chargeVx = Math.cos(ang) * sp;
      boss.chargeVy = Math.sin(ang) * sp;
      boss.charging = 0.8;
      boss.chargeTimer = enraged ? 4.4 : 5.8;
      spawnFloatText(boss.x, boss.y - 74, 'BOSS LUNGE!', '#fb7185');
    }

    boss.minionTimer -= dt;
    if (boss.minionTimer <= 0 && state.enemies.length < 14) {
      const count = enraged ? 3 : 2;
      for (let k = 0; k < count; k++) {
        spawnEnemy(boss.variant === 1 ? 'microbe' : 'corona', {
          x: boss.x + rand(-55, 55),
          y: boss.y + rand(-55, 55),
        });
      }
      boss.minionTimer = enraged ? 4.0 : 5.2;
    }
  }

  // ---- Old-School Disney / Vintage Cartoon Rendering ----
  function draw() {
    ctx.save();
    // Deep vintage midnight-indigo cartoon sky
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, W, H);

    // Soft pastel cartoon space clouds
    for (const c of clouds) {
      const grad = ctx.createRadialGradient(c.x * W, c.y * H, 10, c.x * W, c.y * H, c.r);
      grad.addColorStop(0, c.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x * W, c.y * H, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Whimsical Old-School Cartoon Crescent Moon & Ringed Planet in deep sky
    ctx.save();
    const moonX = W * 0.12;
    const moonY = H * 0.22 + Math.sin(state.time * 0.7) * 5;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a1020';
    ctx.beginPath();
    ctx.arc(moonX + 12, moonY - 6, 29, 0, Math.PI * 2);
    ctx.fill();

    const plX = W * 0.86;
    const plY = H * 0.74 + Math.cos(state.time * 0.6) * 6;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.arc(plX, plY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(plX, plY, 46, 11, -0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (state.bossActive) {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 80, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(225, 29, 72, 0.04)');
      grad.addColorStop(1, 'rgba(225, 29, 72, 0.16)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    if (state.shake > 0.2) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    }

    // Twinkling cartoon stars (4-point sparkles + dots)
    for (const s of stars) {
      const tw = 0.55 + Math.sin(state.time * 3.5 + s.phase) * 0.45;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = tw;
      const sx = s.x * W;
      const sy = s.y * H;
      if (s.sparkle) {
        drawFourPointStar(sx, sy, s.r * (0.85 + tw * 0.35) * 1.9);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Shooting stars streaking across the cartoon sky
    for (const ss of shootingStars) {
      const a = clamp(ss.life / ss.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 0.11, ss.y - ss.vy * 0.11);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      drawFourPointStar(ss.x, ss.y, 6 * a);
      ctx.restore();
    }

    // Novas & Absorption Rings
    for (const n of state.novas) {
      const a = n.life / n.maxLife;
      ctx.strokeStyle = n.color;
      ctx.globalAlpha = a * 0.9;
      ctx.lineWidth = 5.5 * a;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Co-op Plasma Tether lines
    if (state.players.length >= 2) {
      for (let a = 0; a < state.players.length; a++) {
        for (let b = a + 1; b < state.players.length; b++) {
          const p1 = state.players[a];
          const p2 = state.players[b];
          const tetherLv = Math.max(p1.upgrades.tether_beam || 0, p2.upgrades.tether_beam || 0);
          if (tetherLv <= 0 || p1.downed || p2.downed) continue;
          if (dist(p1.x, p1.y, p2.x, p2.y) <= 290 + tetherLv * 55) {
            drawJaggedLine(p1.x, p1.y, p2.x, p2.y, '#fde047', 4.5);
          }
        }
      }
    }

    // Animated XP & Heal Orbs
    for (const pk of state.pickups) {
      const pulse = 1 + Math.sin(state.time * 8 + pk.x * 0.05) * 0.16;
      const col = pk.kind === 'xp' ? '#38bdf8' : '#22c55e';
      const glowCol = pk.kind === 'xp' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(34, 197, 94, 0.34)';

      if (pk.pulling && (Math.abs(pk.vx || 0) > 35 || Math.abs(pk.vy || 0) > 35)) {
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pk.x, pk.y);
        ctx.lineTo(pk.x - pk.vx * 0.055, pk.y - pk.vy * 0.055);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = glowCol;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, (pk.pulling ? 13 : 9.5) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.scale(pulse * (pk.pulling ? 1.2 : 1), pulse * (pk.pulling ? 1.2 : 1));
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.8;
      if (pk.kind === 'xp') {
        ctx.rotate(state.time * 3 + pk.y * 0.02);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.roundRect(-6.5, -2.5, 13, 5, 2);
        ctx.roundRect(-2.5, -6.5, 5, 13, 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Beams
    for (const b of state.beams) {
      const a = b.life / b.maxLife;
      ctx.globalAlpha = a;
      if (b.jagged) {
        drawJaggedLine(b.x1, b.y1, b.x2, b.y2, b.color, b.width);
      } else {
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = (b.width + 4) * a;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.width * a;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Cartoon Enemies
    for (const e of state.enemies) drawEnemy(e);

    // ENEMY PROJECTILES — High-contrast spiky red hazard globs with pulsing danger rings!
    for (const b of state.enemyBullets) {
      const p = 1 + Math.sin(state.time * 16 + b.x) * 0.14;
      ctx.save();
      ctx.translate(b.x, b.y);
      // Pulsing danger halo
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (b.radius + 3.5) * p, 0, Math.PI * 2);
      ctx.stroke();
      // Spiky dark-inked crimson glob
      ctx.fillStyle = '#e11d48';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + state.time * 5;
        const rr = k % 2 === 0 ? b.radius * 1.15 : b.radius * 0.72;
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Bright yellow-white warning core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // TEAM PROJECTILES — Clean bright glowing star-bolts & retro rockets (distinct from red enemy globs!)
    for (const b of state.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.6;
      if (b.kind === 'missile') {
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Cartoon UFO Players (with Visual Upgrades + Easy "YOU" Beacon!)
    for (const p of state.players) drawUfoPlayer(p);

    // Cartoon Particles (inked puff clouds, 4-point Disney stars, and sparks)
    for (const pt of state.particles) {
      const a = clamp(pt.life / pt.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      if (pt.kind === 'puff') {
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (pt.kind === 'star') {
        ctx.fillStyle = pt.color;
        drawFourPointStar(pt.x, pt.y, pt.size * 2.1);
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.font = '700 14px "Fredoka", "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const ft of state.floatTexts) {
      ctx.globalAlpha = clamp(ft.life / ft.maxLife, 0, 1);
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Cute Cartoon Finger-Follow Target Reticle (only while finger is pressed down!)
    if (touchCtrl.active && state.mode === 'playing') {
      const pulse = 1 + Math.sin(state.time * 10) * 0.12;
      ctx.save();
      ctx.translate(touchCtrl.x, touchCtrl.y);
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(204, 251, 241, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFourPointStar(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.28, y - r * 0.28);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.28, y + r * 0.28);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.28, y + r * 0.28);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.28, y - r * 0.28);
    ctx.closePath();
    ctx.fill();
  }

  function drawJaggedLine(x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      ctx.lineTo(x1 + (x2 - x1) * t + rand(-8, 8), y1 + (y2 - y1) * t + rand(-8, 8));
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // ---- Old-School Cartoon UFO Ship with Visual Upgrades! ----
  function drawUfoPlayer(p) {
    const up = p.upgrades || defaultUpgrades();
    const isMe = p.id === room.myId;

    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.downed) {
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (p.reviveProgress > 0) {
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 58, -Math.PI / 2, -Math.PI / 2 + p.reviveProgress * Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.font = '700 12px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('REVIVE!', 0, -22);
      ctx.restore();
      return;
    }

    // "YOU" Spotter Ring so your own UFO is unmistakable in chaos!
    if (isMe) {
      const rPulse = 1 + Math.sin(state.time * 6) * 0.07;
      ctx.strokeStyle = p.glow;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 32 * rPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Visual Upgrade: Nova Bumper Ring
    if (up.nova_pulse > 0) {
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + Math.sin(state.time * 8) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Visual Upgrade: Orbital Star-Saw Satellites (Wide 5x Orbit!)
    if (up.orbital_blades > 0) {
      const orbRadius = 290;
      const orbCount = up.orbital_blades + 1;

      // Subtle dashed cartoon orbit track
      ctx.save();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, orbRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      for (let k = 0; k < orbCount; k++) {
        const oa = p.orbitAngle + (k / orbCount) * Math.PI * 2;
        const ox = Math.cos(oa) * orbRadius;
        const oy = Math.sin(oa) * orbRadius;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(state.time * 9);
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let s = 0; s < 10; s++) {
          const sa = (s / 10) * Math.PI * 2;
          const sr = s % 2 === 0 ? 15 : 7.5;
          if (s === 0) ctx.moveTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
          else ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Cute spinning center hub
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Visual Upgrade: Solo Wingman Mini-UFO
    if (state.players.length === 1 && up.tether_beam > 0) {
      const dx = Math.cos(p.droneAngle) * 56;
      const dy = Math.sin(p.droneAngle) * 56;
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(dx, dy, 10, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(dx, dy - 3, 5, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }

    if (p.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Visible Directional Cartoon Thruster Jet when steering or dashing!
    const thrustAmt = p.dashTimer > 0 ? 1.45 : (p.thrusting ? Math.max(0.55, p.thrustPower || 0.8) : (p.thrustPower || 0));
    if (thrustAmt > 0.12) {
      const ea = p.thrustAngle !== undefined ? p.thrustAngle : Math.PI / 2;
      const flicker = 0.85 + Math.sin(state.time * 42 + p.slot * 3) * 0.22;
      const flameLen = (20 + thrustAmt * 18 + (up.thrusters || 0) * 3) * flicker;
      const flameW = (9 + thrustAmt * 4.5) * (0.9 + Math.cos(state.time * 36) * 0.12);

      ctx.save();
      ctx.rotate(ea);
      // Cartoon thruster nozzle bell on the steering exhaust side
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(15, -6);
      ctx.lineTo(24, -8.5);
      ctx.lineTo(24, 8.5);
      ctx.lineTo(15, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Outer Fiery Orange Teardrop Flame with thick cartoon ink outline
      ctx.fillStyle = p.dashTimer > 0 ? '#38bdf8' : '#f97316';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(22, -flameW * 0.72);
      ctx.quadraticCurveTo(22 + flameLen * 0.55, -flameW, 22 + flameLen, 0);
      ctx.quadraticCurveTo(22 + flameLen * 0.55, flameW, 22, flameW * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Middle Golden Cartoon Flame
      ctx.fillStyle = p.dashTimer > 0 ? '#bae6fd' : '#facc15';
      ctx.beginPath();
      ctx.moveTo(22, -flameW * 0.45);
      ctx.quadraticCurveTo(22 + flameLen * 0.4, -flameW * 0.6, 22 + flameLen * 0.72, 0);
      ctx.quadraticCurveTo(22 + flameLen * 0.4, flameW * 0.6, 22, flameW * 0.45);
      ctx.closePath();
      ctx.fill();

      // Bright White-Hot Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(25, 0, Math.max(4, flameLen * 0.22), Math.max(2.5, flameW * 0.25), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Muzzle flash 4-point cartoon star when shooting
    if (p.muzzleFlash > 0) {
      ctx.save();
      ctx.fillStyle = '#fef08a';
      drawFourPointStar(Math.cos(p.angle) * 24, Math.sin(p.angle) * 24, 11);
      ctx.restore();
    }

    // Cartoon rubber-hose squash-and-stretch wobble + steering lean!
    const bob = Math.sin(state.time * 9 + p.slot) * 0.065;
    const speedStretch = clamp(Math.hypot(p.vx || 0, p.vy || 0) * 0.00022, 0, 0.08);
    const tilt = clamp((p.vx || 0) * 0.0007, -0.28, 0.28);
    ctx.rotate(tilt);
    ctx.scale(1 + bob + speedStretch, 1 - bob - speedStretch * 0.5);

    // Visual Upgrade: Oversized Twin Cartoon Booster Bells (thrusters)
    if (up.thrusters > 0) {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.4;
      [-13, 13].forEach((bx) => {
        ctx.beginPath();
        ctx.roundRect(bx - 4.5, 8, 9, 10, 3);
        ctx.fill();
        ctx.stroke();
        if (thrustAmt > 0.15) {
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(bx, 20 + rand(0, 4), p.dashTimer > 0 ? 6.5 : 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#cbd5e1';
        }
      });
    }

    // Visual Upgrade: Frost Crystal Fins (cryo_rounds)
    if (up.cryo_rounds > 0) {
      ctx.fillStyle = '#7dd3fc';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(side * 19, -2);
        ctx.lineTo(side * 29, -8);
        ctx.lineTo(side * 25, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }

    // Visual Upgrade: Striped Retro Rocket Pods (homing_missiles)
    if (up.homing_missiles > 0) {
      [-21, 21].forEach((rx) => {
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rx - 4, -8, 8, 15, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(rx, -7, 4, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Main Cartoon UFO Saucer Rim
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(0, 3, 23, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim Glossy Highlight Strip
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.beginPath();
    ctx.ellipse(-4, 0, 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated Chasing Saucer Marquee Lights along rim
    const chase = Math.floor(state.time * 8 + p.slot);
    [-14, -7, 0, 7, 14].forEach((lx, i) => {
      const lit = (chase + i) % 3 === 0;
      ctx.fillStyle = lit ? '#fef08a' : '#1e293b';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(lx, 5.5 - Math.abs(lx) * 0.08, lit ? 2.6 : 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Visual Upgrade: Riveted Steel Armor Plates (hull_plating)
    if (up.hull_plating > 0) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 3, 21, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }

    // Visual Upgrade: Ray Blaster Pods along saucer front (pulse_cannon >= 2)
    if ((up.pulse_cannon || 1) >= 2) {
      const pods = Math.min(4, up.pulse_cannon);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < pods; i++) {
        const px = (i / (pods - 1) - 0.5) * 28;
        ctx.beginPath();
        ctx.roundRect(px - 2.5, -12, 5, 8, 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Big Glossy Cartoon Glass UFO Dome
    ctx.fillStyle = 'rgba(186, 230, 253, 0.84)';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Expressive Disney-style Alien Pilot inside dome (blinks, smiles, looks at enemies!)
    const pilotBob = Math.sin(state.time * 10 + p.slot * 2) * 1.1;
    const isBlinking = Math.sin(state.time * 1.9 + p.slot * 2.7) > 0.96;
    const lookX = Math.cos(p.angle) * 2.2;
    const lookY = Math.sin(p.angle) * 1.4;

    // Cute green cartoon alien head
    ctx.fillStyle = '#86efac';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -4.5 + pilotBob, 7.5, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.stroke();

    if (isBlinking) {
      // Cute curved happy blink eyes
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-3.6, -5.5 + pilotBob, 2.6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3.6, -5.5 + pilotBob, 2.6, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      const eyeH = p.dashTimer > 0 ? 4.8 : 4.0;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-3.6, -5.5 + pilotBob, 3.1, eyeH, 0, 0, Math.PI * 2);
      ctx.ellipse(3.6, -5.5 + pilotBob, 3.1, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Glossy pie-cut cartoon pupils
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(-3.6 + lookX * 0.55, -5.5 + pilotBob + lookY * 0.55, 1.7, 0, Math.PI * 2);
      ctx.arc(3.6 + lookX * 0.55, -5.5 + pilotBob + lookY * 0.55, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4.1 + lookX * 0.55, -6.2 + pilotBob + lookY * 0.55, 0.65, 0, Math.PI * 2);
      ctx.arc(3.1 + lookX * 0.55, -6.2 + pilotBob + lookY * 0.55, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    // Little happy cartoon smile (turns into excited 'O' mouth during Dash!)
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    if (p.dashTimer > 0) {
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(0, -1.6 + pilotBob, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, -3 + pilotBob, 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // Dome Specular Shine Arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-1, -1, 10, Math.PI * 1.15, Math.PI * 1.48);
    ctx.stroke();

    // Visual Upgrade: Dome Laser Dish (plasma_rail)
    if (up.plasma_rail > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -16, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Visual Upgrade: Twin Tesla Antennae Coils (chain_lightning)
    if (up.chain_lightning > 0) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      [-9, 9].forEach((ax) => {
        ctx.beginPath();
        ctx.moveTo(ax, -10);
        ctx.lineTo(ax * 1.35, -20);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(ax * 1.35, -21, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Visual Upgrade: Horseshoe Magnet (magnet_core)
    if (up.magnet_core > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 12, 5.5, 0, Math.PI);
      ctx.stroke();
    }

    ctx.restore();

    // Clear "YOU" or Player Name Tag underneath
    ctx.save();
    ctx.font = '700 11px "Fredoka", "Inter", sans-serif';
    ctx.textAlign = 'center';
    const tagText = isMe ? `▲ YOU (${p.name})` : p.name;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3;
    ctx.strokeText(tagText, p.x, p.y + 34);
    ctx.fillStyle = isMe ? '#fef08a' : '#f8fafc';
    ctx.fillText(tagText, p.x, p.y + 34);
    ctx.restore();
  }

  // ---- Old-School Cartoon Space Viruses & Bosses (Wiggling & Chomping!) ----
  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const flash = e.hitFlash > 0;
    const chilled = e.chillTimer > 0;
    const bounce = e.hitBounce ? Math.sin((e.hitBounce / 0.2) * Math.PI) * 0.22 : 0;
    const squash = 1 + Math.sin(state.time * 7.5 + e.x * 0.03) * 0.08 + bounce;
    ctx.scale(squash, 2 - squash);

    if (e.type.startsWith('asteroid')) {
      ctx.rotate(e.rot);
      ctx.fillStyle = flash ? '#ffffff' : chilled ? '#334155' : '#334155';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      (e.shape || getCachedRockShape(e.radius)).forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!flash) {
        // Cartoon rock crater
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.beginPath();
        ctx.arc(-e.radius * 0.28, e.radius * 0.22, e.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Pulsing toxic slime vein & bubble
        const bub = 1 + Math.sin(state.time * 7 + e.y * 0.05) * 0.25;
        ctx.strokeStyle = chilled ? '#7dd3fc' : e.veinColor;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.4, -e.radius * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(e.radius * 0.35, e.radius * 0.28);
        ctx.stroke();
        ctx.fillStyle = chilled ? '#7dd3fc' : '#bef264';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(e.radius * 0.24, -e.radius * 0.22, Math.max(2.5, e.radius * 0.14) * bub, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (e.isBoss) {
      const enraged = e.phase >= 2;
      const chomp = 0.5 + Math.sin(state.time * (enraged ? 11 : 6.5)) * 0.5;

      // Wiggling rubber-hose curved tentacles/spikes
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + e.rot;
        const wiggle = Math.sin(state.time * (enraged ? 10 : 6) + k * 1.4) * 0.22;
        const tipX = Math.cos(a + wiggle) * (e.radius + 20);
        const tipY = Math.sin(a + wiggle) * (e.radius + 20);
        const midX = Math.cos(a - wiggle * 0.6) * (e.radius + 8);
        const midY = Math.sin(a - wiggle * 0.6) * (e.radius + 8);

        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius * 0.85, Math.sin(a) * e.radius * 0.85);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();
        ctx.strokeStyle = flash ? '#fff' : e.color;
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.fillStyle = flash ? '#fff' : enraged ? '#fde047' : '#fda4af';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Giant Cartoon Boss Body + Gloss Highlight
      ctx.fillStyle = flash ? '#ffffff' : e.color;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (!flash) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(-18, -28, 22, 10, -0.45, 0, Math.PI * 2);
        ctx.fill();

        // Big Animated Boss Eyes
        ctx.fillStyle = enraged ? '#fef08a' : '#ffffff';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(-20, -10, 12, 15, 0, 0, Math.PI * 2);
        ctx.ellipse(20, -10, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const eyeJitter = Math.sin(state.time * 9) * 2.5;
        ctx.fillStyle = enraged ? '#dc2626' : '#090d16';
        ctx.beginPath();
        ctx.arc(-18 + eyeJitter, -8, 5.5, 0, Math.PI * 2);
        ctx.arc(18 + eyeJitter, -8, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Furrowed Angry Eyebrows
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-34, -26 - chomp * 3); ctx.lineTo(-8, -17);
        ctx.moveTo(34, -26 - chomp * 3); ctx.lineTo(8, -17);
        ctx.stroke();
        // Animated Chomping Jagged Boss Mouth!
        const jawOpen = 10 + chomp * 14;
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.moveTo(-28, 16);
        ctx.lineTo(-14, 22);
        ctx.lineTo(0, 17);
        ctx.lineTo(14, 22);
        ctx.lineTo(28, 16);
        ctx.lineTo(18, 24 + jawOpen);
        ctx.lineTo(-18, 24 + jawOpen);
        ctx.closePath();
        ctx.fill();
        // Cartoon white teeth
        ctx.fillStyle = '#ffffff';
        [-16, 0, 16].forEach((tx) => {
          ctx.beginPath();
          ctx.moveTo(tx - 5, 19);
          ctx.lineTo(tx, 27);
          ctx.lineTo(tx + 5, 19);
          ctx.closePath();
          ctx.fill();
        });
      }
    } else {
      // Spiky Cartoon Space Virus with Wiggling Tentacles!
      const spikes = e.type === 'microbe' ? 6 : e.type === 'capsid' ? 6 : 8;
      for (let k = 0; k < spikes; k++) {
        const a = (k / spikes) * Math.PI * 2 + e.rot;
        const wig = Math.sin(state.time * 9 + k * 1.7 + e.x * 0.04) * 0.25;
        const tx = Math.cos(a + wig) * (e.radius + 7.5);
        const ty = Math.sin(a + wig) * (e.radius + 7.5);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (e.radius - 2), Math.sin(a) * (e.radius - 2));
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.strokeStyle = flash ? '#fff' : chilled ? '#7dd3fc' : e.color;
        ctx.lineWidth = 2.6;
        ctx.stroke();
      }

      // Main Viral Body with thick cartoon ink outline
      ctx.fillStyle = flash ? '#ffffff' : chilled ? '#0284c7' : e.color;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (e.type === 'capsid') {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + e.rot;
          if (k === 0) ctx.moveTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
          else ctx.lineTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Animated Grumpy Cartoon Face (Blinking Eyes + Chomping Mini Mouth!)
      if (!flash && e.radius >= 13) {
        const er = Math.max(2.8, e.radius * 0.23);
        const ex = e.radius * 0.34;
        const blink = Math.sin(state.time * 2.4 + e.x * 0.05) > 0.96;
        if (blink) {
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-ex - er, -2); ctx.lineTo(-ex + er, -2);
          ctx.moveTo(ex - er, -2); ctx.lineTo(ex + er, -2);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.arc(-ex, -2, er, 0, Math.PI * 2);
          ctx.arc(ex, -2, er, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.arc(-ex, -2, er * 0.45, 0, Math.PI * 2);
          ctx.arc(ex, -2, er * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        // Grumpy brows
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-ex - er, -2 - er);
        ctx.lineTo(-ex + er, -2 - er * 0.25);
        ctx.moveTo(ex + er, -2 - er);
        ctx.lineTo(ex - er, -2 - er * 0.25);
        ctx.stroke();
        // Little animated grumble mouth
        const mOpen = 1.5 + Math.abs(Math.sin(state.time * 7 + e.y * 0.04)) * 2.5;
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.ellipse(0, e.radius * 0.36, e.radius * 0.28, mOpen, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ---- HUD Rendering (Including Live Team Damage Meter!) ----
  function renderHud() {
    hudLevel.textContent = `LEVEL ${state.level}`;
    hudScore.textContent = `${state.score.toLocaleString()} PTS`;
    hudKills.textContent = `Purged: ${state.kills}`;

    const xpPct = clamp((state.xp / Math.max(1, state.xpNeeded)) * 100, 0, 100);
    hudXpFill.style.width = xpPct.toFixed(1) + '%';

    const nextBoss = Math.ceil((state.level + 0.01) / 10) * 10;
    const levelsLeft = nextBoss - state.level;
    if (state.bossActive) {
      hudBossHint.textContent = 'BOSS ENCOUNTER ACTIVE!';
      hudBossHint.classList.add('boss-now');
    } else {
      hudBossHint.textContent = `Boss in ${levelsLeft} level${levelsLeft === 1 ? '' : 's'} (Lv ${nextBoss})`;
      hudBossHint.classList.remove('boss-now');
    }

    // Live Team Damage Meter
    const rankedDmg = state.players.slice().sort((a, b) => (b.damage || 0) - (a.damage || 0));
    const totalDmg = Math.max(1, rankedDmg.reduce((acc, p) => acc + (p.damage || 0), 0));
    damageMeterEl.innerHTML =
      `<div class="dmg-title"><span>Damage Meter</span><span>${formatDmg(rankedDmg.reduce((a, p) => a + (p.damage || 0), 0))}</span></div>` +
      rankedDmg
        .map((p) => {
          const pct = Math.round(((p.damage || 0) / totalDmg) * 100);
          return `
            <div class="dmg-row">
              <div class="dmg-row-head">
                <span>${escapeHtml(p.name)}${p.id === room.myId ? ' ★' : ''}</span>
                <span>${formatDmg(p.damage || 0)} (${pct}%)</span>
              </div>
              <div class="dmg-bar-track">
                <div class="dmg-bar-fill" style="width:${pct}%;background:${p.color};"></div>
              </div>
            </div>
          `;
        })
        .join('');

    // Player Hull Cards
    playerHudCards.innerHTML = state.players
      .map((p) => {
        const hpPct = clamp((p.hp / Math.max(1, p.maxHp)) * 100, 0, 100);
        const cls = `p${(p.slot % 4) + 1}`;
        const dashStatus = p.dashCooldown <= 0 ? 'Dash Ready' : `Dash ${p.dashCooldown.toFixed(1)}s`;
        return `
          <div class="ship-hud ${cls} ${p.downed ? 'downed' : ''}">
            <div class="ship-hud-top">
              <span>${escapeHtml(p.name)}${p.id === room.myId ? ' (You)' : ''}</span>
              <span>${p.downed ? 'DOWNED' : `${Math.ceil(p.hp)}/${p.maxHp}`}</span>
            </div>
            <div class="hp-track">
              <div class="hp-fill" style="width:${hpPct.toFixed(1)}%"></div>
            </div>
            <div class="dash-row">
              <span>${p.downed ? 'Teammate: fly near to revive' : dashStatus}</span>
            </div>
          </div>
        `;
      })
      .join('');

    // Personal Weapons Tray (shows YOUR UFO's personal upgrades!)
    const me = state.players.find((p) => p.id === room.myId) || state.players[0];
    const myUp = (me && me.upgrades) || defaultUpgrades();
    const chips = [];
    for (const u of UPGRADES) {
      const lv = myUp[u.id] || 0;
      if (lv > 0) {
        const shortName = state.players.length === 1 && u.id === 'tether_beam' ? 'Drone' : u.name.split(' ')[0];
        chips.push(`<span class="weapon-chip">${u.icon} ${shortName} <span class="lvl">Lv${lv}</span></span>`);
      }
    }
    weaponsTray.innerHTML = chips.join('');
  }

  // ---- Menu & Gamepad Navigation ----
  let lastPadMenuMove = 0;

  function pollMenuGamepads(pads, now) {
    hudControllers.textContent = `Controllers: ${pads.length}`;
    const pad = pads[0];
    if (!pad) return;

    const pressed = (idx) => Boolean(pad.buttons[idx] && pad.buttons[idx].pressed);
    const justPressed = (idx) => {
      const cur = pressed(idx);
      const prev = Boolean(prevPadButtons[0][idx]);
      prevPadButtons[0][idx] = cur;
      return cur && !prev;
    };

    const ax = pad.axes[0] || 0;
    const left = ax < -0.55 || pressed(14);
    const right = ax > 0.55 || pressed(15);
    const confirm = justPressed(0);
    const startBtn = justPressed(9);

    if (state.mode === 'playing' && startBtn && room.isHost) { togglePause(); return; }
    if (state.mode === 'paused' && (startBtn || confirm) && room.isHost) { togglePause(); return; }
    if (state.mode === 'title' && (confirm || startBtn) && room.isHost) { startGame(); return; }
    if (state.mode === 'upgrade' && !state.myDraftPicked) {
      if (now - lastPadMenuMove > 200) {
        if (left) { moveDraftFocus(-1); lastPadMenuMove = now; }
        else if (right) { moveDraftFocus(1); lastPadMenuMove = now; }
      }
      if (confirm) requestPickUpgrade(state.draftFocus);
    } else if (state.mode === 'gameover' && (confirm || startBtn) && room.isHost) {
      startGame();
    }
  }

  // ---- UI Controls ----
  function togglePause() {
    if (!room.isHost) return;
    if (state.mode === 'playing') {
      state.mode = 'paused';
      pauseOverlay.classList.remove('hidden');
      room.sendSignal({ type: 'PAUSE_STATE', paused: true });
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
      pauseOverlay.classList.add('hidden');
      room.sendSignal({ type: 'PAUSE_STATE', paused: false });
    }
  }

  function toggleAutofire() {
    state.autoFire = !state.autoFire;
    btnAutofire.textContent = `Auto-Fire: ${state.autoFire ? 'ON' : 'OFF'}`;
  }

  function toggleMute() {
    SFX.muted = !SFX.muted;
    btnMute.textContent = `SFX: ${SFX.muted ? 'OFF' : 'ON'}`;
  }

  btnLaunch.addEventListener('click', startGame);
  btnPause.addEventListener('click', togglePause);
  btnAutofire.addEventListener('click', toggleAutofire);
  btnMute.addEventListener('click', toggleMute);
  btnResume.addEventListener('click', togglePause);
  btnRestartPause.addEventListener('click', () => {
    if (room.isHost) {
      room.sendSignal({ type: 'RETURN_LOBBY' });
      returnToLobbyUI();
    }
  });
  btnPlayAgain.addEventListener('click', startGame);

  // ---- Main RAF Loop ----
  let lastTs = performance.now();
  let hudTick = 0;
  let netTick = 0;

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    const pads = getConnectedPads();
    pollMenuGamepads(pads, ts);
    updateVisualEffects(dt);

    for (const s of stars) {
      s.y += (s.speed * (state.mode === 'playing' ? 1 : 0.4) * dt) / H;
      if (s.y > 1) { s.y = 0; s.x = Math.random(); }
    }

    if (state.mode === 'playing') {
      if (room.isHost) {
        updateHost(dt, pads);
        hudTick += dt;
        if (hudTick >= 0.1) {
          hudTick = 0;
          renderHud();
        }
        netTick += dt;
        if (netTick >= 0.04 && state.players.some((p) => !p.isLocal)) {
          netTick = 0;
          room.sendRealtime({ type: 'SNAP', s: buildSnapshot() });
        }
      } else {
        netTick += dt;
        if (netTick >= 0.033) {
          netTick = 0;
          room.sendRealtime({ type: 'INPUT', input: readLocalInput(0, pads) });
        }
      }
    }

    if (touchDashBtn) {
      const showDash = touchCtrl.isTouchDevice && state.mode === 'playing';
      touchDashBtn.classList.toggle('visible', showDash);
      if (!showDash && touchCtrl.active) clearTouchSteer();
    }

    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
