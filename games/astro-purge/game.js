/* ==========================================================================
   ASTRO PURGE — Co-op Space Virus Asteroids
   1-2P Couch Co-op | Shared Leveling | Upgrades & Weapons | Boss every 10 Lvs
   ========================================================================== */

(function () {
  'use strict';

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
  const playerHudCards = document.getElementById('player-hud-cards');
  const weaponsTray = document.getElementById('weapons-tray');
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

  const mode2pBtn = document.getElementById('mode-2p');
  const mode1pBtn = document.getElementById('mode-1p');
  const btnLaunch = document.getElementById('btn-launch');
  const titlePadHint = document.getElementById('title-pad-hint');

  const draftEyebrow = document.getElementById('draft-eyebrow');
  const draftTitle = document.getElementById('draft-title');
  const draftSub = document.getElementById('draft-sub');
  const upgradeGrid = document.getElementById('upgrade-grid');

  const btnResume = document.getElementById('btn-resume');
  const btnRestartPause = document.getElementById('btn-restart-pause');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const sumLevel = document.getElementById('sum-level');
  const sumScore = document.getElementById('sum-score');
  const sumBosses = document.getElementById('sum-bosses');
  const gameoverSub = document.getElementById('gameover-sub');

  // ---- Synthesized Web Audio SFX ----
  const SFX = {
    ctx: null,
    muted: false,
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
    tone(freq, endFreq, dur, type = 'triangle', vol = 0.08) {
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
    shoot() { this.tone(620, 220, 0.06, 'triangle', 0.045); },
    rail() { this.tone(980, 140, 0.16, 'sawtooth', 0.07); },
    missile() { this.tone(360, 580, 0.1, 'sine', 0.04); },
    zap() { this.tone(860, 420, 0.08, 'square', 0.04); },
    nova() { this.tone(240, 60, 0.28, 'sine', 0.1); },
    hit() { this.tone(180, 70, 0.05, 'square', 0.035); },
    pop() { this.tone(260, 65, 0.12, 'sawtooth', 0.06); },
    xp() { this.tone(720, 1080, 0.07, 'sine', 0.035); },
    dash() { this.tone(320, 680, 0.12, 'triangle', 0.06); },
    hurt() { this.tone(160, 55, 0.2, 'sawtooth', 0.09); },
    levelUp() {
      this.tone(440, 440, 0.12, 'triangle', 0.08);
      setTimeout(() => this.tone(554, 554, 0.12, 'triangle', 0.08), 80);
      setTimeout(() => this.tone(659, 880, 0.22, 'triangle', 0.09), 160);
    },
    bossWarn() {
      this.tone(180, 260, 0.25, 'sawtooth', 0.09);
      setTimeout(() => this.tone(180, 260, 0.25, 'sawtooth', 0.09), 300);
    },
    bossDead() {
      this.tone(220, 440, 0.2, 'triangle', 0.1);
      setTimeout(() => this.tone(330, 660, 0.25, 'triangle', 0.1), 140);
      setTimeout(() => this.tone(440, 880, 0.4, 'triangle', 0.11), 280);
    },
  };

  // ---- Upgrade Catalog ----
  const UPGRADES = [
    {
      id: 'pulse_cannon',
      name: 'Pulse Cannons',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '⚡',
      maxLevel: 5,
      describe: (nextLv) => {
        const shots = nextLv;
        return `Upgrade primary blasters to ${shots}-way spread with faster fire rate.`;
      },
    },
    {
      id: 'plasma_rail',
      name: 'Plasma Railgun',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '💠',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Unlocks a piercing laser beam that fires automatically through lines of viruses.'
          : `Railgun Lv ${nextLv}: +30% beam damage, wider beam, and faster recharge.`,
    },
    {
      id: 'homing_missiles',
      name: 'Antibody Missiles',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '🚀',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Unlocks heat-seeking micro-missiles that hunt nearby viruses & boss cores.'
          : `Missiles Lv ${nextLv}: Launches ${nextLv + 1} homing missiles per salvo with higher damage.`,
    },
    {
      id: 'orbital_blades',
      name: 'Orbital Saw-Orbs',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '🌀',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Deploys spinning energy satellites around both ships that shred viruses & block shots.'
          : `Saw-Orbs Lv ${nextLv}: ${nextLv + 1} faster orbiting blades around each ship.`,
    },
    {
      id: 'chain_lightning',
      name: 'Arc Tesla Coil',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '🌩️',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Zaps nearby viruses with chain lightning that arcs across infected clusters.'
          : `Tesla Coil Lv ${nextLv}: Chains to ${nextLv + 2} targets with higher voltage damage.`,
    },
    {
      id: 'nova_pulse',
      name: 'EMP Nova Ring',
      tag: 'Weapon',
      tagClass: 'weapon',
      icon: '💥',
      maxLevel: 5,
      describe: (nextLv) =>
        nextLv === 1
          ? 'Periodically blasts an expanding shockwave that damages viruses & clears enemy bullets.'
          : `EMP Nova Lv ${nextLv}: Larger blast radius, stronger knockback, faster cooldown.`,
    },
    {
      id: 'hull_plating',
      name: 'Titanium Hull',
      tag: 'Defense',
      tagClass: '',
      icon: '🛡️',
      maxLevel: 6,
      describe: () => '+25 Max Hull HP for both ships and immediately repairs +40 HP.',
    },
    {
      id: 'overclock',
      name: 'Weapon Overclock',
      tag: 'Power',
      tagClass: '',
      icon: '🔥',
      maxLevel: 6,
      describe: () => '+20% damage for all fleet weapons and +8% Critical Strike chance.',
    },
    {
      id: 'thrusters',
      name: 'Ion Thrusters',
      tag: 'Mobility',
      tagClass: '',
      icon: '💨',
      maxLevel: 5,
      describe: () => '+13% ship flight speed and -16% Dash cooldown for snappy dodging.',
    },
    {
      id: 'cryo_rounds',
      name: 'Cryo-Antibodies',
      tag: 'Utility',
      tagClass: '',
      icon: '❄️',
      maxLevel: 4,
      describe: (nextLv) =>
        `Shots chill viruses on hit, slowing their movement by ${Math.min(55, 18 + nextLv * 10)}%.`,
    },
    {
      id: 'magnet_core',
      name: 'Bio-Core Magnet',
      tag: 'Utility',
      tagClass: '',
      icon: '🧲',
      maxLevel: 5,
      describe: () => '+45% Bio-Core & Repair pickup radius and +15% bonus Team XP gain.',
    },
    {
      id: 'tether_beam',
      name: 'Co-op Plasma Tether',
      tag: 'Co-op',
      tagClass: 'coop',
      icon: '🔗',
      maxLevel: 5,
      describe: (nextLv, isCoop) => {
        if (isCoop) {
          return nextLv === 1
            ? 'Creates a searing plasma beam between P1 & P2 when close, slicing viruses between you!'
            : `Plasma Tether Lv ${nextLv}: Longer link range and +35% beam slice damage.`;
        }
        return nextLv === 1
          ? 'Deploys an autonomous Wingman Drone that orbits your ship and fires at viruses!'
          : `Wingman Drone Lv ${nextLv}: Faster drone fire rate and +35% bolt damage.`;
      },
    },
  ];

  // ---- Input State ----
  const keys = new Set();
  const prevPadButtons = [{}, {}];

  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      if (state.mode !== 'title') e.preventDefault();
    }
    keys.add(code);

    if (state.mode === 'playing') {
      if (code === 'Escape' || code === 'KeyP') {
        togglePause();
      } else if (code === 'KeyT') {
        toggleAutofire();
      } else if (code === 'KeyM') {
        toggleMute();
      } else if (
        state.playerCount === 1 &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'ShiftRight'].includes(code)
      ) {
        dropInPlayer2();
      }
    } else if (state.mode === 'paused') {
      if (code === 'Escape' || code === 'KeyP') togglePause();
    } else if (state.mode === 'upgrade') {
      if (code === 'Digit1') pickUpgrade(0);
      else if (code === 'Digit2') pickUpgrade(1);
      else if (code === 'Digit3') pickUpgrade(2);
      else if (code === 'ArrowLeft' || code === 'KeyA') moveDraftFocus(-1);
      else if (code === 'ArrowRight' || code === 'KeyD') moveDraftFocus(1);
      else if (code === 'Enter' || code === 'Space') pickUpgrade(state.draftFocus);
    } else if (state.mode === 'title') {
      if (code === 'ArrowLeft' || code === 'KeyA') selectPlayerMode(2);
      else if (code === 'ArrowRight' || code === 'KeyD') selectPlayerMode(1);
      else if (code === 'Enter' || code === 'Space') startGame();
    } else if (state.mode === 'gameover') {
      if (code === 'Enter' || code === 'Space') startGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  function getConnectedPads() {
    if (!navigator.getGamepads) return [];
    return Array.from(navigator.getGamepads()).filter(Boolean);
  }

  function readPlayerInput(playerIndex, pads) {
    const pad = pads[playerIndex] || null;
    let mx = 0;
    let my = 0;
    let ax = 0;
    let ay = 0;
    let fire = false;
    let dash = false;

    if (playerIndex === 0) {
      if (keys.has('KeyW')) my -= 1;
      if (keys.has('KeyS')) my += 1;
      if (keys.has('KeyA')) mx -= 1;
      if (keys.has('KeyD')) mx += 1;
      if (keys.has('Space')) fire = true;
      if (keys.has('ShiftLeft') || keys.has('KeyE')) dash = true;
      // In 1P mode, allow arrow keys to move P1 only if user didn't drop in P2?
      // Better: keep WASD for P1 and Arrow Keys as instant P2 drop-in!
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
      if (lx || ly) {
        mx = lx;
        my = ly;
      }
      if (pad.buttons[12] && pad.buttons[12].pressed) my = -1;
      if (pad.buttons[13] && pad.buttons[13].pressed) my = 1;
      if (pad.buttons[14] && pad.buttons[14].pressed) mx = -1;
      if (pad.buttons[15] && pad.buttons[15].pressed) mx = 1;

      const rx = Math.abs(pad.axes[2] || 0) > 0.25 ? pad.axes[2] : 0;
      const ry = Math.abs(pad.axes[3] || 0) > 0.25 ? pad.axes[3] : 0;
      if (rx || ry) {
        ax = rx;
        ay = ry;
      }

      if (
        (pad.buttons[0] && pad.buttons[0].pressed) ||
        (pad.buttons[7] && pad.buttons[7].pressed) ||
        (pad.buttons[5] && pad.buttons[5].pressed)
      ) {
        fire = true;
      }
      if (
        (pad.buttons[1] && pad.buttons[1].pressed) ||
        (pad.buttons[2] && pad.buttons[2].pressed) ||
        (pad.buttons[4] && pad.buttons[4].pressed) ||
        (pad.buttons[6] && pad.buttons[6].pressed)
      ) {
        dash = true;
      }
    }

    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    return { mx, my, ax, ay, fire, dash };
  }

  // ---- Background Starfield ----
  const stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() < 0.15 ? 2.1 : Math.random() * 1.3 + 0.5,
      speed: 4 + Math.random() * 14,
      alpha: 0.25 + Math.random() * 0.65,
    });
  }

  // ---- Game State ----
  const state = {
    mode: 'title', // title | playing | upgrade | paused | gameover
    selectedPlayers: 2,
    playerCount: 2,
    autoFire: true,
    time: 0,
    score: 0,
    kills: 0,
    bossesDefeated: 0,
    level: 1,
    xp: 0,
    xpNeeded: 70,
    shake: 0,
    spawnTimer: 0,
    bossActive: false,
    bossWarningTimer: 0,
    pendingBossLevel: null,
    pendingDrafts: [],
    draftChoices: [],
    draftFocus: 0,
    draftIsBoss: false,
    fleet: {},
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

  function defaultFleet() {
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

  function createPlayer(index) {
    const isP1 = index === 0;
    const maxHp = 100 + (state.fleet.hull_plating || 0) * 25;
    return {
      index,
      name: isP1 ? 'P1 · Alpha' : 'P2 · Beta',
      color: isP1 ? '#14b8a6' : '#f59e0b',
      glow: isP1 ? '#5eead4' : '#fde68a',
      x: W * (isP1 ? 0.42 : 0.58),
      y: H * 0.55,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: 16,
      hp: maxHp,
      maxHp,
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
      orbitAngle: index * Math.PI,
      thrusting: false,
    };
  }

  function dropInPlayer2() {
    if (state.playerCount >= 2) return;
    state.playerCount = 2;
    const p2 = createPlayer(1);
    const p1 = state.players[0];
    if (p1) {
      p2.x = clamp(p1.x + 60, 40, W - 40);
      p2.y = clamp(p1.y, 40, H - 40);
    }
    state.players.push(p2);
    spawnFloatText(p2.x, p2.y - 26, 'PLAYER 2 JOINED!', '#fde68a');
    SFX.levelUp();
    renderHud();
  }

  // ---- Helpers ----
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function damageMultiplier() {
    return 1 + (state.fleet.overclock || 0) * 0.2;
  }

  function critChance() {
    return (state.fleet.overclock || 0) * 0.08;
  }

  function rollDamage(base) {
    const isCrit = Math.random() < critChance();
    const dmg = Math.round(base * damageMultiplier() * (isCrit ? 1.8 : 1));
    return { dmg, isCrit };
  }

  function spawnParticles(x, y, color, count = 10, speed = 160, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(speed * 0.25, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.6),
        maxLife: 0.6,
        color,
        size: rand(size * 0.6, size * 1.4),
      });
    }
  }

  function spawnFloatText(x, y, text, color = '#f8fafc') {
    state.floatTexts.push({
      x,
      y,
      vy: -38,
      text,
      color,
      life: 0.85,
      maxLife: 0.85,
    });
  }

  // ---- Start / Reset ----
  function startGame() {
    state.mode = 'playing';
    state.playerCount = state.selectedPlayers;
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.bossesDefeated = 0;
    state.level = 1;
    state.xp = 0;
    state.xpNeeded = 65;
    state.shake = 0;
    state.spawnTimer = 0.5;
    state.bossActive = false;
    state.bossWarningTimer = 0;
    state.pendingBossLevel = null;
    state.pendingDrafts = [];
    state.fleet = defaultFleet();
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.pickups = [];
    state.particles = [];
    state.beams = [];
    state.novas = [];
    state.floatTexts = [];
    state.players = [];

    for (let i = 0; i < state.playerCount; i++) {
      state.players.push(createPlayer(i));
    }

    titleOverlay.classList.add('hidden');
    upgradeOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    bossWarningEl.classList.add('hidden');
    bossBarWrap.classList.add('hidden');
    hudEl.classList.remove('hidden');

    // Initial wave of asteroids & viruses so action begins immediately
    for (let i = 0; i < 4; i++) spawnEnemy('asteroid_lg');
    for (let i = 0; i < 3; i++) spawnEnemy('corona');

    SFX.levelUp();
    renderHud();
  }

  // ---- Enemy Spawning ----
  function edgeSpawnPos(pad = 42) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: rand(0, W), y: -pad };
    if (side === 1) return { x: W + pad, y: rand(0, H) };
    if (side === 2) return { x: rand(0, W), y: H + pad };
    return { x: -pad, y: rand(0, H) };
  }

  function makeAsteroidShape(r) {
    const pts = [];
    const verts = 9;
    for (let i = 0; i < verts; i++) {
      const a = (i / verts) * Math.PI * 2;
      const rad = r * rand(0.74, 1.16);
      pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    return pts;
  }

  function spawnEnemy(type, customPos = null) {
    const pos = customPos || edgeSpawnPos();
    const lv = state.level;
    const hpScale = 1 + (lv - 1) * 0.22;
    const speedScale = 1 + Math.min(1.1, (lv - 1) * 0.035);
    const angleToCenter = Math.atan2(H * 0.5 - pos.y, W * 0.5 - pos.x) + rand(-0.45, 0.45);

    if (type === 'asteroid_lg' || type === 'asteroid_md' || type === 'asteroid_sm') {
      const r = type === 'asteroid_lg' ? 34 : type === 'asteroid_md' ? 22 : 13;
      const baseHp = type === 'asteroid_lg' ? 46 : type === 'asteroid_md' ? 24 : 12;
      const sp = (type === 'asteroid_lg' ? 48 : type === 'asteroid_md' ? 76 : 108) * speedScale;
      state.enemies.push({
        type,
        x: pos.x,
        y: pos.y,
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
        damage: type === 'asteroid_lg' ? 20 : 14,
        color: '#64748b',
        veinColor: '#22c55e',
        hitFlash: 0,
        chillTimer: 0,
      });
      return;
    }

    if (type === 'corona') {
      state.enemies.push({
        type,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: 17,
        hp: Math.round(28 * hpScale),
        maxHp: Math.round(28 * hpScale),
        speed: 78 * speedScale,
        rot: rand(0, Math.PI * 2),
        rotSpeed: 1.1,
        xp: 12,
        score: 35,
        damage: 16,
        color: '#f43f5e',
        hitFlash: 0,
        chillTimer: 0,
      });
    } else if (type === 'mitosis') {
      state.enemies.push({
        type,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: 21,
        hp: Math.round(42 * hpScale),
        maxHp: Math.round(42 * hpScale),
        speed: 62 * speedScale,
        rot: 0,
        rotSpeed: 0.9,
        xp: 16,
        score: 50,
        damage: 18,
        color: '#84cc16',
        hitFlash: 0,
        chillTimer: 0,
      });
    } else if (type === 'microbe') {
      state.enemies.push({
        type,
        x: pos.x,
        y: pos.y,
        vx: rand(-90, 90),
        vy: rand(-90, 90),
        radius: 11,
        hp: Math.round(14 * hpScale),
        maxHp: Math.round(14 * hpScale),
        speed: 132 * speedScale,
        rot: 0,
        rotSpeed: 2.5,
        xp: 7,
        score: 20,
        damage: 11,
        color: '#a3e635',
        hitFlash: 0,
        chillTimer: 0,
      });
    } else if (type === 'shooter') {
      state.enemies.push({
        type,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: 19,
        hp: Math.round(38 * hpScale),
        maxHp: Math.round(38 * hpScale),
        speed: 68 * speedScale,
        fireTimer: rand(1.4, 2.6),
        rot: 0,
        rotSpeed: -1.4,
        xp: 18,
        score: 65,
        damage: 16,
        color: '#f59e0b',
        hitFlash: 0,
        chillTimer: 0,
      });
    } else if (type === 'capsid') {
      state.enemies.push({
        type,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: 27,
        hp: Math.round(95 * hpScale),
        maxHp: Math.round(95 * hpScale),
        speed: 48 * speedScale,
        rot: 0,
        rotSpeed: 0.5,
        xp: 28,
        score: 110,
        damage: 24,
        color: '#38bdf8',
        hitFlash: 0,
        chillTimer: 0,
      });
    }
  }

  function pickWaveEnemyType() {
    const lv = state.level;
    const r = Math.random();
    if (lv >= 7 && r < 0.14) return 'capsid';
    if (lv >= 4 && r < 0.30) return 'shooter';
    if (lv >= 3 && r < 0.48) return 'mitosis';
    if (lv >= 5 && r < 0.60) return 'microbe';
    if (r < 0.78) return 'corona';
    return 'asteroid_lg';
  }

  // ---- BOSS SPAWNING (Every 10 Levels!) ----
  function triggerBossSequence(bossLevel) {
    state.bossActive = true;
    state.pendingBossLevel = bossLevel;
    state.bossWarningTimer = 2.6;

    const tier = Math.floor(bossLevel / 10); // 1, 2, 3...
    const variant = (tier - 1) % 3;
    const names = [
      'ALPHA CORONA-LEVIATHAN',
      'HYDRA MITOSIS-CORE',
      'OMEGA PANDEMIC-TITAN',
    ];
    const name = tier > 3 ? `${names[variant]} MK-${tier}` : names[variant];

    bossWarningTitle.textContent = '⚠ BIO-HAZARD BOSS DETECTED';
    bossWarningSub.textContent = `LEVEL ${bossLevel} — ${name} INCOMING`;
    bossWarningEl.classList.remove('hidden');
    SFX.bossWarn();
    renderHud();
  }

  function spawnBoss(bossLevel) {
    const tier = Math.floor(bossLevel / 10);
    const variant = (tier - 1) % 3;
    const names = [
      'ALPHA CORONA-LEVIATHAN',
      'HYDRA MITOSIS-CORE',
      'OMEGA PANDEMIC-TITAN',
    ];
    const name = tier > 3 ? `${names[variant]} MK-${tier}` : names[variant];
    const coopScale = state.playerCount === 2 ? 1.45 : 1.0;
    const maxHp = Math.round((1150 + (tier - 1) * 950) * coopScale);

    const boss = {
      type: 'boss',
      isBoss: true,
      variant,
      tier,
      name,
      x: W * 0.5,
      y: -95,
      vx: 0,
      vy: 0,
      radius: 58,
      hp: maxHp,
      maxHp,
      speed: 62 + tier * 8,
      rot: 0,
      rotSpeed: 0.45,
      attackTimer: 2.0,
      minionTimer: 5.5,
      chargeTimer: 7.0,
      charging: 0,
      chargeVx: 0,
      chargeVy: 0,
      spiralAngle: 0,
      xp: 0,
      score: 1200 * tier,
      damage: 28,
      color: variant === 0 ? '#f43f5e' : variant === 1 ? '#84cc16' : '#fb923c',
      hitFlash: 0,
      chillTimer: 0,
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
  }

  // ---- Shared Level-Up & Upgrade Draft ----
  function addTeamXp(amount) {
    const mult = 1 + (state.fleet.magnet_core || 0) * 0.15;
    state.xp += amount * mult;

    // While a boss is alive, bank XP right below next level until boss is defeated
    if (state.bossActive) {
      state.xp = Math.min(state.xp, state.xpNeeded - 1);
      return;
    }

    while (state.xp >= state.xpNeeded) {
      state.xp -= state.xpNeeded;
      state.level += 1;
      state.xpNeeded = Math.round(65 + state.level * 26 + Math.pow(state.level, 1.35) * 6);
      SFX.levelUp();

      // Queue upgrade draft
      state.pendingDrafts.push({ isBossReward: false, level: state.level });

      // Every 10 levels -> Trigger Boss!
      if (state.level % 10 === 0) {
        triggerBossSequence(state.level);
        break;
      }
    }

    if (state.pendingDrafts.length > 0 && state.mode === 'playing') {
      openNextDraft();
    }
  }

  function openNextDraft() {
    if (state.pendingDrafts.length === 0) return;
    const req = state.pendingDrafts.shift();
    state.mode = 'upgrade';
    state.draftIsBoss = req.isBossReward;
    state.draftFocus = 0;

    // Filter eligible upgrades (not maxed)
    let pool = UPGRADES.filter((u) => (state.fleet[u.id] || 0) < u.maxLevel);
    if (req.isBossReward) {
      const weaponsPool = pool.filter((u) => u.tag === 'Weapon' || u.tag === 'Co-op');
      if (weaponsPool.length >= 3) pool = weaponsPool;
    }

    // Shuffle and pick 3
    pool = pool.slice().sort(() => Math.random() - 0.5);
    state.draftChoices = pool.slice(0, 3);

    // Fallback if everything is somehow maxed
    if (state.draftChoices.length === 0) {
      state.mode = 'playing';
      return;
    }

    if (req.isBossReward) {
      draftEyebrow.textContent = 'Boss Purged · Bonus Supply Drop!';
      draftTitle.textContent = 'Select a Boss Weapon Evolution';
      draftSub.textContent = 'Both ships repaired to 100% Hull. Choose a high-tier upgrade!';
    } else {
      draftEyebrow.textContent = `Fleet Level ${req.level}!`;
      draftTitle.textContent = 'Level Up Your Ships Together';
      draftSub.textContent =
        state.playerCount === 2
          ? 'This upgrade powers up both Alpha & Beta ships.'
          : 'Choose an upgrade for your starship.';
    }

    renderDraftCards();
    upgradeOverlay.classList.remove('hidden');
  }

  function renderDraftCards() {
    upgradeGrid.innerHTML = '';
    const isCoop = state.playerCount >= 2;
    state.draftChoices.forEach((u, idx) => {
      const curLv = state.fleet[u.id] || 0;
      const nextLv = curLv + 1;
      const card = document.createElement('button');
      card.type = 'button';
      card.className =
        'upgrade-card' +
        (idx === state.draftFocus ? ' focused' : '') +
        (state.draftIsBoss ? ' boss-tier' : '');
      const displayName = !isCoop && u.id === 'tether_beam' ? 'Wingman Drone' : u.name;
      const displayTag = !isCoop && u.id === 'tether_beam' ? 'Weapon' : u.tag;
      card.innerHTML = `
        <div class="upg-head">
          <div class="upg-icon">${u.icon}</div>
          <span class="upg-tag ${u.tagClass}">${displayTag}</span>
        </div>
        <div class="upg-name">${displayName}</div>
        <div class="upg-desc">${u.describe(nextLv, isCoop)}</div>
        <div class="upg-footer">
          <span>${curLv === 0 ? 'NEW UNLOCK' : `LV ${curLv} → LV ${nextLv}`}</span>
          <span>[${idx + 1}]</span>
        </div>
      `;
      card.addEventListener('mouseenter', () => {
        state.draftFocus = idx;
        updateDraftFocusClasses();
      });
      card.addEventListener('click', () => pickUpgrade(idx));
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

  function pickUpgrade(idx) {
    const u = state.draftChoices[idx];
    if (!u) return;
    state.fleet[u.id] = (state.fleet[u.id] || 0) + 1;

    // Immediate effects
    if (u.id === 'hull_plating') {
      state.players.forEach((p) => {
        p.maxHp += 25;
        if (!p.downed) p.hp = Math.min(p.maxHp, p.hp + 40);
      });
    }

    SFX.xp();
    upgradeOverlay.classList.add('hidden');

    if (state.pendingDrafts.length > 0) {
      openNextDraft();
    } else {
      state.mode = 'playing';
    }
    renderHud();
  }

  // ---- Weapons Firing ----
  function findNearestEnemy(x, y, maxRange = Infinity) {
    let best = null;
    let bestD = maxRange;
    for (const e of state.enemies) {
      const d = dist(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function firePulseCannon(p) {
    const lv = state.fleet.pulse_cannon || 1;
    const count = lv; // 1 to 5 bolts
    const spread = count === 1 ? 0 : Math.min(0.46, (count - 1) * 0.11);
    const speed = 640;
    const baseDmg = 14 + lv * 3;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const ang = p.angle + t * spread;
      state.bullets.push({
        kind: 'pulse',
        owner: p.index,
        x: p.x + Math.cos(ang) * 18,
        y: p.y + Math.sin(ang) * 18,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        radius: 4.5,
        damage: baseDmg,
        color: p.glow,
        life: 1.05,
        pierce: 0,
      });
    }
    SFX.shoot();
  }

  function firePlasmaRail(p) {
    const lv = state.fleet.plasma_rail;
    const target = findNearestEnemy(p.x, p.y, 700);
    const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
    const len = Math.max(W, H) * 0.9;
    const x2 = p.x + Math.cos(ang) * len;
    const y2 = p.y + Math.sin(ang) * len;
    const width = 10 + lv * 3;
    const baseDmg = 34 + lv * 16;

    state.beams.push({
      x1: p.x,
      y1: p.y,
      x2,
      y2,
      width,
      color: '#38bdf8',
      life: 0.22,
      maxLife: 0.22,
    });

    // Hit all enemies along segment
    const dx = x2 - p.x;
    const dy = y2 - p.y;
    const lenSq = dx * dx + dy * dy;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const t = clamp(((e.x - p.x) * dx + (e.y - p.y) * dy) / lenSq, 0, 1);
      const px = p.x + t * dx;
      const py = p.y + t * dy;
      if (dist(px, py, e.x, e.y) <= e.radius + width * 0.6) {
        damageEnemy(e, baseDmg, '#38bdf8');
      }
    }
    SFX.rail();
  }

  function fireHomingMissiles(p) {
    const lv = state.fleet.homing_missiles;
    const count = lv + 1;
    for (let i = 0; i < count; i++) {
      const ang = p.angle + rand(-0.9, 0.9);
      state.bullets.push({
        kind: 'missile',
        owner: p.index,
        x: p.x + Math.cos(ang) * 14,
        y: p.y + Math.sin(ang) * 14,
        vx: Math.cos(ang) * 260,
        vy: Math.sin(ang) * 260,
        speed: 410 + lv * 22,
        radius: 6,
        damage: 24 + lv * 10,
        color: '#f472b6',
        life: 3.0,
        pierce: 0,
      });
    }
    SFX.missile();
  }

  function fireChainLightning(p) {
    const lv = state.fleet.chain_lightning;
    const maxJumps = lv + 2;
    const hitSet = new Set();
    let curX = p.x;
    let curY = p.y;
    const baseDmg = 22 + lv * 9;

    for (let j = 0; j < maxJumps; j++) {
      let best = null;
      let bestD = j === 0 ? 310 : 210;
      for (const e of state.enemies) {
        if (hitSet.has(e) || e.hp <= 0) continue;
        const d = dist(curX, curY, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      hitSet.add(best);
      state.beams.push({
        x1: curX,
        y1: curY,
        x2: best.x,
        y2: best.y,
        width: 4,
        color: '#fde047',
        jagged: true,
        life: 0.16,
        maxLife: 0.16,
      });
      damageEnemy(best, baseDmg, '#fde047');
      curX = best.x;
      curY = best.y;
    }
    if (hitSet.size > 0) SFX.zap();
  }

  function triggerNovaPulse(p) {
    const lv = state.fleet.nova_pulse;
    const maxR = 145 + lv * 35;
    const baseDmg = 26 + lv * 14;
    state.novas.push({
      x: p.x,
      y: p.y,
      r: 18,
      maxR,
      color: p.color,
      life: 0.36,
      maxLife: 0.36,
    });

    // Clear enemy bullets within blast
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      if (dist(p.x, p.y, b.x, b.y) <= maxR) {
        spawnParticles(b.x, b.y, '#fb7185', 4, 90, 2);
        state.enemyBullets.splice(i, 1);
      }
    }

    // Damage & push viruses
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const d = dist(p.x, p.y, e.x, e.y);
      if (d <= maxR + e.radius) {
        damageEnemy(e, baseDmg, p.glow);
        if (!e.isBoss && d > 1) {
          e.vx += ((e.x - p.x) / d) * 210;
          e.vy += ((e.y - p.y) / d) * 210;
        }
      }
    }
    SFX.nova();
  }

  // ---- Enemy Damage & Death ----
  function damageEnemy(e, baseDmg, color = '#f8fafc') {
    if (e.hp <= 0) return;
    const { dmg, isCrit } = rollDamage(baseDmg);
    e.hp -= dmg;
    e.hitFlash = 0.09;
    if ((state.fleet.cryo_rounds || 0) > 0) {
      e.chillTimer = 2.2;
    }

    if (isCrit || e.isBoss) {
      spawnFloatText(
        e.x + rand(-10, 10),
        e.y - e.radius * 0.6,
        isCrit ? `${dmg}!` : `${dmg}`,
        isCrit ? '#fde047' : color
      );
    }

    if (e.isBoss) updateBossBar(e);

    if (e.hp <= 0) {
      killEnemy(e);
    } else {
      SFX.hit();
    }
  }

  function killEnemy(e) {
    const idx = state.enemies.indexOf(e);
    if (idx !== -1) state.enemies.splice(idx, 1);

    state.kills += 1;
    state.score += e.score;
    spawnParticles(e.x, e.y, e.color, e.isBoss ? 55 : 14, e.isBoss ? 320 : 180, e.isBoss ? 5 : 3);

    // Splitting mechanics
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
      state.shake = 18;
      state.enemyBullets = [];
      bossBarWrap.classList.add('hidden');
      SFX.bossDead();
      spawnFloatText(e.x, e.y, `${e.name} PURGED!`, '#fde047');

      // Repair & revive all ships
      state.players.forEach((p) => {
        p.downed = false;
        p.reviveProgress = 0;
        p.hp = p.maxHp;
        p.invuln = 2.0;
      });

      // Grant Boss Reward Draft
      state.pendingDrafts.push({ isBossReward: true, level: state.level });
      openNextDraft();
      return;
    }

    SFX.pop();

    // Drop Bio-Core XP
    state.pickups.push({
      kind: 'xp',
      x: e.x,
      y: e.y,
      vx: rand(-35, 35),
      vy: rand(-35, 35),
      value: e.xp,
      life: 16,
    });

    // Chance to drop Hull Repair Nanite
    if (Math.random() < 0.055) {
      state.pickups.push({
        kind: 'heal',
        x: e.x + rand(-10, 10),
        y: e.y + rand(-10, 10),
        vx: rand(-25, 25),
        vy: rand(-25, 25),
        value: 26,
        life: 16,
      });
    }
  }

  // ---- Player Damage & Game Over ----
  function hurtPlayer(p, amount) {
    if (p.downed || p.invuln > 0 || p.dashTimer > 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invuln = 0.85;
    state.shake = Math.max(state.shake, 9);
    spawnParticles(p.x, p.y, p.color, 14, 170, 3);
    SFX.hurt();

    if (p.hp <= 0) {
      p.downed = true;
      p.reviveProgress = 0;
      spawnParticles(p.x, p.y, '#fb7185', 26, 220, 4);
      if (state.playerCount >= 2) {
        spawnFloatText(p.x, p.y - 24, `${p.name} DOWN! FLY NEAR TO REVIVE`, '#fb7185');
      }

      const anyAlive = state.players.some((pl) => !pl.downed);
      if (!anyAlive) {
        triggerGameOver();
      }
    }
  }

  function triggerGameOver() {
    state.mode = 'gameover';
    saveBestStats();
    sumLevel.textContent = String(state.level);
    sumScore.textContent = state.score.toLocaleString();
    sumBosses.textContent = String(state.bossesDefeated);
    gameoverSub.textContent =
      state.bossesDefeated > 0
        ? `Your fleet reached Level ${state.level} and purged ${state.bossesDefeated} space virus boss${state.bossesDefeated > 1 ? 'es' : ''}!`
        : `Your fleet reached Level ${state.level} and purged ${state.kills} space viruses.`;
    gameoverOverlay.classList.remove('hidden');
  }

  function saveBestStats() {
    try {
      const prev = JSON.parse(localStorage.getItem('astro_purge_best') || '{}');
      const next = {
        bestLevel: Math.max(prev.bestLevel || 0, state.level),
        bestScore: Math.max(prev.bestScore || 0, state.score),
        bestBosses: Math.max(prev.bestBosses || 0, state.bossesDefeated),
      };
      localStorage.setItem('astro_purge_best', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }

  // ---- Main Update Loop ----
  function update(dt, pads) {
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);

    // Update stars
    for (const s of stars) {
      s.y += (s.speed * dt) / H;
      if (s.y > 1) {
        s.y = 0;
        s.x = Math.random();
      }
    }

    // Drop-in P2 via Gamepad 2
    if (state.playerCount === 1 && pads[1]) {
      const p2Pressed = pads[1].buttons.some((b) => b && b.pressed);
      if (p2Pressed) dropInPlayer2();
    }

    // Boss warning countdown
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

    // Spawner (paused during boss warning, slower during boss)
    state.spawnTimer -= dt;
    const maxEnemies = state.bossActive ? 10 : Math.min(34, 9 + state.level * 2);
    if (state.spawnTimer <= 0 && state.bossWarningTimer <= 0 && state.enemies.length < maxEnemies) {
      const type = pickWaveEnemyType();
      if (type === 'microbe') {
        const base = edgeSpawnPos();
        for (let k = 0; k < 3; k++) {
          spawnEnemy('microbe', { x: base.x + rand(-24, 24), y: base.y + rand(-24, 24) });
        }
      } else {
        spawnEnemy(type);
      }
      const baseInterval = state.bossActive ? 2.8 : Math.max(0.42, 1.55 - state.level * 0.055);
      state.spawnTimer = baseInterval / (state.playerCount === 2 ? 1.18 : 1);
    }

    // ---- Update Players ----
    const speedBoost = 1 + (state.fleet.thrusters || 0) * 0.13;
    const dashCdMax = Math.max(1.2, 3.0 * Math.pow(0.84, state.fleet.thrusters || 0));

    for (const p of state.players) {
      if (p.invuln > 0) p.invuln -= dt;
      if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      if (p.dashTimer > 0) p.dashTimer = Math.max(0, p.dashTimer - dt);

      if (p.downed) {
        // Check if surviving partner is close enough to revive
        const partner = state.players.find((o) => o !== p && !o.downed);
        if (partner && dist(p.x, p.y, partner.x, partner.y) < 72) {
          p.reviveProgress += dt / 2.2;
          if (p.reviveProgress >= 1) {
            p.downed = false;
            p.reviveProgress = 0;
            p.hp = Math.round(p.maxHp * 0.55);
            p.invuln = 2.0;
            spawnParticles(p.x, p.y, p.glow, 22, 190, 3.5);
            spawnFloatText(p.x, p.y - 24, 'REVIVED!', '#5eead4');
            SFX.levelUp();
          }
        } else {
          p.reviveProgress = Math.max(0, p.reviveProgress - dt * 0.35);
        }
        continue;
      }

      const inp = readPlayerInput(p.index, pads);
      const accel = 980 * speedBoost;
      const maxSpeed = 305 * speedBoost;

      // Dash trigger
      if (inp.dash && p.dashCooldown <= 0) {
        const dx = inp.mx || Math.cos(p.angle);
        const dy = inp.my || Math.sin(p.angle);
        const dm = Math.hypot(dx, dy) || 1;
        p.vx = (dx / dm) * 690;
        p.vy = (dy / dm) * 690;
        p.dashTimer = 0.2;
        p.dashCooldown = dashCdMax;
        spawnParticles(p.x, p.y, p.glow, 12, 150, 3);
        SFX.dash();
      }

      p.thrusting = Math.abs(inp.mx) > 0.1 || Math.abs(inp.my) > 0.1;

      if (p.dashTimer <= 0) {
        p.vx += inp.mx * accel * dt;
        p.vy += inp.my * accel * dt;
        // Smooth space drag
        const drag = Math.pow(0.06, dt);
        p.vx *= drag;
        p.vy *= drag;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > maxSpeed) {
          p.vx = (p.vx / sp) * maxSpeed;
          p.vy = (p.vy / sp) * maxSpeed;
        }
      }

      p.x = clamp(p.x + p.vx * dt, 22, W - 22);
      p.y = clamp(p.y + p.vy * dt, 22, H - 22);

      // Aiming: Right Stick > Auto-aim nearest enemy if moving/firing > movement direction
      if (inp.ax || inp.ay) {
        p.angle = Math.atan2(inp.ay, inp.ax);
      } else {
        const nearest = findNearestEnemy(p.x, p.y, 460);
        if (nearest) {
          const targetAng = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          let diff = targetAng - p.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          p.angle += diff * Math.min(1, dt * 12);
        } else if (p.thrusting) {
          const moveAng = Math.atan2(inp.my, inp.mx);
          let diff = moveAng - p.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          p.angle += diff * Math.min(1, dt * 10);
        }
      }

      // Primary Pulse Cannon
      p.fireTimer -= dt;
      const pulseInterval = Math.max(0.11, 0.24 - (state.fleet.pulse_cannon - 1) * 0.025);
      if ((state.autoFire || inp.fire) && p.fireTimer <= 0 && state.enemies.length > 0) {
        firePulseCannon(p);
        p.fireTimer = pulseInterval;
      } else if (inp.fire && p.fireTimer <= 0) {
        firePulseCannon(p);
        p.fireTimer = pulseInterval;
      }

      // Plasma Railgun
      if (state.fleet.plasma_rail > 0) {
        p.railTimer -= dt;
        if (p.railTimer <= 0 && state.enemies.length > 0) {
          firePlasmaRail(p);
          p.railTimer = Math.max(1.3, 3.3 - state.fleet.plasma_rail * 0.35);
        }
      }

      // Homing Missiles
      if (state.fleet.homing_missiles > 0) {
        p.missileTimer -= dt;
        if (p.missileTimer <= 0 && state.enemies.length > 0) {
          fireHomingMissiles(p);
          p.missileTimer = Math.max(1.2, 2.7 - state.fleet.homing_missiles * 0.25);
        }
      }

      // Chain Lightning
      if (state.fleet.chain_lightning > 0) {
        p.teslaTimer -= dt;
        if (p.teslaTimer <= 0 && state.enemies.length > 0) {
          fireChainLightning(p);
          p.teslaTimer = Math.max(0.75, 1.85 - state.fleet.chain_lightning * 0.18);
        }
      }

      // EMP Nova Ring
      if (state.fleet.nova_pulse > 0) {
        p.novaTimer -= dt;
        if (p.novaTimer <= 0) {
          triggerNovaPulse(p);
          p.novaTimer = Math.max(2.6, 5.4 - state.fleet.nova_pulse * 0.5);
        }
      }

      // Orbital Saw-Orbs
      if (state.fleet.orbital_blades > 0) {
        const orbCount = state.fleet.orbital_blades + 1;
        const orbDist = 56;
        p.orbitAngle += (2.6 + state.fleet.orbital_blades * 0.35) * dt;
        for (let k = 0; k < orbCount; k++) {
          const oa = p.orbitAngle + (k / orbCount) * Math.PI * 2;
          const ox = p.x + Math.cos(oa) * orbDist;
          const oy = p.y + Math.sin(oa) * orbDist;

          // Shred enemies
          for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            if (dist(ox, oy, e.x, e.y) < e.radius + 11) {
              if (!e._orbCd || state.time - e._orbCd > 0.22) {
                e._orbCd = state.time;
                damageEnemy(e, 16 + state.fleet.orbital_blades * 6, '#5eead4');
              }
            }
          }
          // Block enemy bullets
          for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const b = state.enemyBullets[i];
            if (dist(ox, oy, b.x, b.y) < b.radius + 11) {
              spawnParticles(b.x, b.y, '#5eead4', 4, 80, 2);
              state.enemyBullets.splice(i, 1);
            }
          }
        }
      }

      // Solo Wingman Drone (when 1P has tether_beam)
      if (state.playerCount === 1 && state.fleet.tether_beam > 0) {
        const lv = state.fleet.tether_beam;
        p.droneAngle += 1.9 * dt;
        const dx = p.x + Math.cos(p.droneAngle) * 52;
        const dy = p.y + Math.sin(p.droneAngle) * 52;
        p.droneFireTimer -= dt;
        if (p.droneFireTimer <= 0) {
          const t = findNearestEnemy(dx, dy, 420);
          if (t) {
            const ang = Math.atan2(t.y - dy, t.x - dx);
            state.bullets.push({
              kind: 'pulse',
              owner: p.index,
              x: dx,
              y: dy,
              vx: Math.cos(ang) * 580,
              vy: Math.sin(ang) * 580,
              radius: 4,
              damage: 14 + lv * 7,
              color: '#fcd34d',
              life: 0.9,
              pierce: 0,
            });
            p.droneFireTimer = Math.max(0.18, 0.55 - lv * 0.07);
          }
        }
      }
    }

    // Co-op Plasma Tether Beam (2P active)
    if (state.playerCount >= 2 && state.fleet.tether_beam > 0) {
      const p1 = state.players[0];
      const p2 = state.players[1];
      const maxRange = 290 + state.fleet.tether_beam * 55;
      if (p1 && p2 && !p1.downed && !p2.downed && dist(p1.x, p1.y, p2.x, p2.y) <= maxRange) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy || 1;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          const t = clamp(((e.x - p1.x) * dx + (e.y - p1.y) * dy) / lenSq, 0, 1);
          const px = p1.x + t * dx;
          const py = p1.y + t * dy;
          if (dist(px, py, e.x, e.y) <= e.radius + 9) {
            if (!e._tetherCd || state.time - e._tetherCd > 0.16) {
              e._tetherCd = state.time;
              damageEnemy(e, 14 + state.fleet.tether_beam * 8, '#fcd34d');
            }
          }
        }
      }
    }

    // ---- Update Player Bullets ----
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.life -= dt;
      if (b.life <= 0) {
        state.bullets.splice(i, 1);
        continue;
      }

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

      // Collision with enemies
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.radius) {
          damageEnemy(e, b.damage, b.color);
          spawnParticles(b.x, b.y, b.color, 4, 90, 2);
          state.bullets.splice(i, 1);
          break;
        }
      }
    }

    // ---- Update Enemies ----
    const livingPlayers = state.players.filter((p) => !p.downed);
    const cryoSlow =
      (state.fleet.cryo_rounds || 0) > 0
        ? 1 - Math.min(0.55, 0.18 + state.fleet.cryo_rounds * 0.1)
        : 1;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.chillTimer > 0) e.chillTimer -= dt;
      e.rot += (e.rotSpeed || 0) * dt;
      const slow = e.chillTimer > 0 ? cryoSlow : 1;

      // Nearest living player
      let target = livingPlayers[0] || null;
      if (livingPlayers.length > 1) {
        target =
          dist(e.x, e.y, livingPlayers[0].x, livingPlayers[0].y) <=
          dist(e.x, e.y, livingPlayers[1].x, livingPlayers[1].y)
            ? livingPlayers[0]
            : livingPlayers[1];
      }

      if (e.type.startsWith('asteroid')) {
        e.x += e.vx * slow * dt;
        e.y += e.vy * slow * dt;
        // Wrap asteroids around screen
        if (e.x < -60) e.x = W + 55;
        if (e.x > W + 60) e.x = -55;
        if (e.y < -60) e.y = H + 55;
        if (e.y > H + 60) e.y = -55;
      } else if (e.isBoss) {
        updateBossBehavior(e, target, dt, slow);
      } else if (target) {
        const ang = Math.atan2(target.y - e.y, target.x - e.x);
        const d = dist(e.x, e.y, target.x, target.y);

        if (e.type === 'shooter') {
          const desiredSp = d > 250 ? e.speed : d < 170 ? -e.speed * 0.6 : 0;
          const strafe = ang + Math.PI * 0.5;
          e.vx += (Math.cos(ang) * desiredSp + Math.cos(strafe) * e.speed * 0.55 - e.vx) * dt * 3;
          e.vy += (Math.sin(ang) * desiredSp + Math.sin(strafe) * e.speed * 0.55 - e.vy) * dt * 3;
          e.fireTimer -= dt;
          if (e.fireTimer <= 0 && d < 520) {
            state.enemyBullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(ang) * 235,
              vy: Math.sin(ang) * 235,
              radius: 5.5,
              damage: 14,
              color: '#fbbf24',
              life: 3.4,
            });
            e.fireTimer = Math.max(1.3, 2.5 - state.level * 0.04);
          }
        } else {
          e.vx += (Math.cos(ang) * e.speed - e.vx) * dt * 2.6;
          e.vy += (Math.sin(ang) * e.speed - e.vy) * dt * 2.6;
        }
        e.x += e.vx * slow * dt;
        e.y += e.vy * slow * dt;
      }

      // Collision with players
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

    // ---- Update Enemy Bullets ----
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
        if (dist(b.x, b.y, p.x, p.y) < b.radius + p.radius - 2) {
          hurtPlayer(p, b.damage);
          state.enemyBullets.splice(i, 1);
          break;
        }
      }
    }

    // ---- Update Pickups (XP Bio-Cores & Hull Nanites) ----
    const magnetRadius = 115 * (1 + (state.fleet.magnet_core || 0) * 0.45);
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const pk = state.pickups[i];
      pk.life -= dt;
      if (pk.life <= 0) {
        state.pickups.splice(i, 1);
        continue;
      }

      pk.vx *= Math.pow(0.08, dt);
      pk.vy *= Math.pow(0.08, dt);

      // Attract to closest living player
      let nearest = null;
      let bestD = magnetRadius;
      for (const p of livingPlayers) {
        const d = dist(pk.x, pk.y, p.x, p.y);
        if (d < bestD) {
          bestD = d;
          nearest = p;
        }
      }
      if (nearest) {
        const ang = Math.atan2(nearest.y - pk.y, nearest.x - pk.x);
        const pull = 440;
        pk.vx += Math.cos(ang) * pull * dt * 4;
        pk.vy += Math.sin(ang) * pull * dt * 4;
        if (bestD < nearest.radius + 14) {
          if (pk.kind === 'xp') {
            addTeamXp(pk.value);
            SFX.xp();
          } else if (pk.kind === 'heal') {
            state.players.forEach((pl) => {
              if (!pl.downed) pl.hp = Math.min(pl.maxHp, pl.hp + pk.value);
            });
            spawnFloatText(nearest.x, nearest.y - 20, `+${pk.value} HULL`, '#4ade80');
            SFX.xp();
          }
          state.pickups.splice(i, 1);
          continue;
        }
      }

      pk.x = clamp(pk.x + pk.vx * dt, 14, W - 14);
      pk.y = clamp(pk.y + pk.vy * dt, 14, H - 14);
    }

    // ---- Visual Effects ----
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.pow(0.2, dt);
      pt.vy *= Math.pow(0.2, dt);
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
    // Enter arena smoothly
    if (boss.y < 140) {
      boss.y += 120 * dt;
      return;
    }

    if (boss.charging > 0) {
      boss.charging -= dt;
      boss.x = clamp(boss.x + boss.chargeVx * dt, 70, W - 70);
      boss.y = clamp(boss.y + boss.chargeVy * dt, 90, H - 70);
      return;
    }

    if (target) {
      const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
      boss.vx += (Math.cos(ang) * boss.speed - boss.vx) * dt * 1.5;
      boss.vy += (Math.sin(ang) * boss.speed - boss.vy) * dt * 1.5;
      boss.x = clamp(boss.x + boss.vx * slow * dt, 70, W - 70);
      boss.y = clamp(boss.y + boss.vy * slow * dt, 95, H - 70);
    }

    // Attack Pattern by Variant
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      if (boss.variant === 0) {
        // Alpha Corona-Leviathan: Radial spore bursts
        const count = 12 + boss.tier * 2;
        boss.spiralAngle += 0.35;
        for (let k = 0; k < count; k++) {
          const a = boss.spiralAngle + (k / count) * Math.PI * 2;
          state.enemyBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(a) * 210,
            vy: Math.sin(a) * 210,
            radius: 6.5,
            damage: 16,
            color: '#fb7185',
            life: 4.5,
          });
        }
        boss.attackTimer = Math.max(1.3, 2.2 - boss.tier * 0.12);
      } else if (boss.variant === 1) {
        // Hydra Mitosis-Core: Targeted 5-way bio-fan
        if (target) {
          const baseAng = Math.atan2(target.y - boss.y, target.x - boss.x);
          for (let k = -2; k <= 2; k++) {
            const a = baseAng + k * 0.2;
            state.enemyBullets.push({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(a) * 260,
              vy: Math.sin(a) * 260,
              radius: 6.5,
              damage: 16,
              color: '#a3e635',
              life: 4.0,
            });
          }
        }
        boss.attackTimer = Math.max(1.0, 1.8 - boss.tier * 0.1);
      } else {
        // Omega Pandemic-Titan: Double spiral ring
        const count = 16;
        boss.spiralAngle += 0.45;
        for (let k = 0; k < count; k++) {
          const a = boss.spiralAngle + (k / count) * Math.PI * 2;
          state.enemyBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(a) * 230,
            vy: Math.sin(a) * 230,
            radius: 7,
            damage: 18,
            color: '#fb923c',
            life: 4.5,
          });
        }
        boss.attackTimer = Math.max(1.1, 1.9 - boss.tier * 0.1);
      }
    }

    // Periodic Lunge Charge
    boss.chargeTimer -= dt;
    if (boss.chargeTimer <= 0 && target) {
      const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
      boss.chargeVx = Math.cos(ang) * 340;
      boss.chargeVy = Math.sin(ang) * 340;
      boss.charging = 0.75;
      boss.chargeTimer = 6.2;
      spawnFloatText(boss.x, boss.y - 68, 'BOSS LUNGE!', '#fb7185');
    }

    // Periodic Minion Spawn
    boss.minionTimer -= dt;
    if (boss.minionTimer <= 0 && state.enemies.length < 12) {
      for (let k = 0; k < 2; k++) {
        spawnEnemy(boss.variant === 1 ? 'microbe' : 'corona', {
          x: boss.x + rand(-50, 50),
          y: boss.y + rand(-50, 50),
        });
      }
      boss.minionTimer = 5.5;
    }
  }

  // ---- Rendering ----
  function draw() {
    ctx.save();
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, W, H);

    // Subtle red tint during boss fight
    if (state.bossActive) {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 80, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.04)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0.13)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Screen shake
    if (state.shake > 0.2) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    }

    // Starfield
    for (const s of stars) {
      ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Novas
    for (const n of state.novas) {
      const a = n.life / n.maxLife;
      ctx.strokeStyle = n.color;
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = 5 * a;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Co-op Plasma Tether Beam
    if (state.playerCount >= 2 && state.fleet.tether_beam > 0) {
      const p1 = state.players[0];
      const p2 = state.players[1];
      const maxRange = 290 + state.fleet.tether_beam * 55;
      if (p1 && p2 && !p1.downed && !p2.downed && dist(p1.x, p1.y, p2.x, p2.y) <= maxRange) {
        drawJaggedLine(p1.x, p1.y, p2.x, p2.y, '#fcd34d', 4);
      }
    }

    // Pickups
    for (const pk of state.pickups) {
      if (pk.kind === 'xp') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(pk.x, pk.y - 6);
        ctx.lineTo(pk.x + 5, pk.y);
        ctx.lineTo(pk.x, pk.y + 6);
        ctx.lineTo(pk.x - 5, pk.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(pk.x - 6, pk.y - 2, 12, 4);
        ctx.fillRect(pk.x - 2, pk.y - 6, 4, 12);
      }
    }

    // Beams (Railgun & Tesla)
    for (const b of state.beams) {
      const a = b.life / b.maxLife;
      ctx.globalAlpha = a;
      if (b.jagged) {
        drawJaggedLine(b.x1, b.y1, b.x2, b.y2, b.color, b.width);
      } else {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.width * a;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Enemies
    for (const e of state.enemies) {
      drawEnemy(e);
    }

    // Enemy Bullets
    for (const b of state.enemyBullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Bullets
    for (const b of state.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players
    for (const p of state.players) {
      drawPlayer(p);
    }

    // Particles
    for (const pt of state.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating Damage / Event Text
    ctx.font = '700 13px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const ft of state.floatTexts) {
      ctx.globalAlpha = clamp(ft.life / ft.maxLife, 0, 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawJaggedLine(x1, y1, x2, y2, color, width) {
    const segs = 7;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jx = x1 + (x2 - x1) * t + rand(-8, 8);
      const jy = y1 + (y2 - y1) * t + rand(-8, 8);
      ctx.lineTo(jx, jy);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawPlayer(p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.downed) {
      // Escape Pod + Revive Ring
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (p.reviveProgress > 0) {
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 56, -Math.PI / 2, -Math.PI / 2 + p.reviveProgress * Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('REVIVE', 0, -20);
      ctx.restore();
      return;
    }

    // Orbital Saw-Orbs
    if (state.fleet.orbital_blades > 0) {
      const orbCount = state.fleet.orbital_blades + 1;
      for (let k = 0; k < orbCount; k++) {
        const oa = p.orbitAngle + (k / orbCount) * Math.PI * 2;
        const ox = Math.cos(oa) * 56;
        const oy = Math.sin(oa) * 56;
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ccfbf1';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Solo Wingman Drone
    if (state.playerCount === 1 && state.fleet.tether_beam > 0) {
      const dx = Math.cos(p.droneAngle) * 52;
      const dy = Math.sin(p.droneAngle) * 52;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(dx, dy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Blink during invulnerability
    if (p.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.rotate(p.angle);

    // Engine flame
    if (p.thrusting || p.dashTimer > 0) {
      const flameLen = p.dashTimer > 0 ? 28 : rand(14, 21);
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.moveTo(-11, -5);
      ctx.lineTo(-11 - flameLen, 0);
      ctx.lineTo(-11, 5);
      ctx.closePath();
      ctx.fill();
    }

    // Ship Hull
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-13, -12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(3, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);

    const flash = e.hitFlash > 0;
    const chilled = e.chillTimer > 0;

    if (e.type.startsWith('asteroid')) {
      ctx.fillStyle = flash ? '#f8fafc' : chilled ? '#334155' : '#1e293b';
      ctx.strokeStyle = flash ? '#fff' : chilled ? '#7dd3fc' : '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      e.shape.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Viral glowing veins on asteroid
      if (!flash) {
        ctx.strokeStyle = e.veinColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.4, -e.radius * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(e.radius * 0.35, e.radius * 0.25);
        ctx.stroke();
      }
    } else if (e.isBoss) {
      // Giant Spiked Virus Boss
      const spikes = 12;
      ctx.strokeStyle = flash ? '#ffffff' : e.color;
      ctx.lineWidth = 4;
      for (let k = 0; k < spikes; k++) {
        const a = (k / spikes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius * 0.85, Math.sin(a) * e.radius * 0.85);
        ctx.lineTo(Math.cos(a) * (e.radius + 16), Math.sin(a) * (e.radius + 16));
        ctx.stroke();
        ctx.fillStyle = flash ? '#fff' : '#fda4af';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (e.radius + 18), Math.sin(a) * (e.radius + 18), 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = flash ? '#ffffff' : '#24101a';
      ctx.strokeStyle = flash ? '#ffffff' : e.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing Boss Nucleus
      const pulse = 0.65 + Math.sin(state.time * 6) * 0.08;
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'capsid') {
      // Hexagonal Armored Virus
      ctx.fillStyle = flash ? '#fff' : '#16253b';
      ctx.strokeStyle = flash ? '#fff' : chilled ? '#7dd3fc' : e.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Spiky Space Virus (Corona / Mitosis / Shooter / Microbe)
      const spikes = e.type === 'microbe' ? 6 : 8;
      ctx.strokeStyle = flash ? '#fff' : chilled ? '#7dd3fc' : e.color;
      ctx.lineWidth = 2;
      for (let k = 0; k < spikes; k++) {
        const a = (k / spikes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (e.radius - 2), Math.sin(a) * (e.radius - 2));
        ctx.lineTo(Math.cos(a) * (e.radius + 6), Math.sin(a) * (e.radius + 6));
        ctx.stroke();
      }
      ctx.fillStyle = flash ? '#fff' : '#151c2c';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner nucleus
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath();
      if (e.type === 'mitosis') {
        ctx.arc(-5, 0, 4.5, 0, Math.PI * 2);
        ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
      } else {
        ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    ctx.restore();
  }

  // ---- HUD Rendering ----
  function renderHud() {
    hudLevel.textContent = `LEVEL ${state.level}`;
    hudScore.textContent = `${state.score.toLocaleString()} PTS`;
    hudKills.textContent = `Purged: ${state.kills}`;

    const xpPct = clamp((state.xp / state.xpNeeded) * 100, 0, 100);
    hudXpFill.style.width = xpPct.toFixed(1) + '%';

    const nextBoss = Math.ceil((state.level + 0.01) / 10) * 10;
    const levelsLeft = nextBoss - state.level;
    if (state.bossActive) {
      hudBossHint.textContent = 'BOSS ENCOUNTER ACTIVE';
      hudBossHint.classList.add('boss-now');
    } else {
      hudBossHint.textContent = `Boss in ${levelsLeft} level${levelsLeft === 1 ? '' : 's'} (Lv ${nextBoss})`;
      hudBossHint.classList.remove('boss-now');
    }

    // Player HUD Cards
    playerHudCards.innerHTML = state.players
      .map((p) => {
        const hpPct = clamp((p.hp / p.maxHp) * 100, 0, 100);
        const cls = p.index === 0 ? 'p1' : 'p2';
        const dashStatus = p.dashCooldown <= 0 ? 'Dash Ready' : `Dash ${p.dashCooldown.toFixed(1)}s`;
        return `
          <div class="ship-hud ${cls} ${p.downed ? 'downed' : ''}">
            <div class="ship-hud-top">
              <span>${p.name}</span>
              <span>${p.downed ? 'DOWNED' : `${Math.ceil(p.hp)}/${p.maxHp}`}</span>
            </div>
            <div class="hp-track">
              <div class="hp-fill" style="width:${hpPct.toFixed(1)}%"></div>
            </div>
            <div class="dash-row">
              <span>${p.downed ? 'Partner: fly near to revive' : dashStatus}</span>
            </div>
          </div>
        `;
      })
      .join('');

    // Active Weapons & Upgrades Tray
    const chips = [];
    for (const u of UPGRADES) {
      const lv = state.fleet[u.id] || 0;
      if (lv > 0) {
        const shortName = state.playerCount === 1 && u.id === 'tether_beam' ? 'Drone' : u.name.split(' ')[0];
        chips.push(`<span class="weapon-chip">${u.icon} ${shortName} <span class="lvl">Lv${lv}</span></span>`);
      }
    }
    weaponsTray.innerHTML = chips.join('');
  }

  // ---- Menu & Gamepad Navigation ----
  let lastPadMenuMove = 0;

  function pollMenuGamepads(pads, now) {
    const count = pads.length;
    hudControllers.textContent = `Controllers: ${count}`;
    if (state.mode === 'title') {
      titlePadHint.textContent =
        count > 0
          ? `${count} Controller${count > 1 ? 's' : ''} connected! Use D-Pad to choose mode, A to launch.`
          : 'Tip: Connect 1 or 2 Bluetooth controllers anytime — press A / Enter to launch.';
    }

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

    if (state.mode === 'playing' && startBtn) {
      togglePause();
      return;
    }
    if (state.mode === 'paused' && (startBtn || confirm)) {
      togglePause();
      return;
    }
    if (state.mode === 'title') {
      if (now - lastPadMenuMove > 220) {
        if (left) { selectPlayerMode(2); lastPadMenuMove = now; }
        else if (right) { selectPlayerMode(1); lastPadMenuMove = now; }
      }
      if (confirm || startBtn) startGame();
    } else if (state.mode === 'upgrade') {
      if (now - lastPadMenuMove > 200) {
        if (left) { moveDraftFocus(-1); lastPadMenuMove = now; }
        else if (right) { moveDraftFocus(1); lastPadMenuMove = now; }
      }
      if (confirm) pickUpgrade(state.draftFocus);
    } else if (state.mode === 'gameover') {
      if (confirm || startBtn) startGame();
    }
  }

  // ---- UI Event Handlers ----
  function selectPlayerMode(num) {
    state.selectedPlayers = num;
    mode2pBtn.classList.toggle('selected', num === 2);
    mode1pBtn.classList.toggle('selected', num === 1);
  }

  function togglePause() {
    if (state.mode === 'playing') {
      state.mode = 'paused';
      pauseOverlay.classList.remove('hidden');
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
      pauseOverlay.classList.add('hidden');
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

  mode2pBtn.addEventListener('click', () => selectPlayerMode(2));
  mode1pBtn.addEventListener('click', () => selectPlayerMode(1));
  btnLaunch.addEventListener('click', startGame);
  btnPause.addEventListener('click', togglePause);
  btnAutofire.addEventListener('click', toggleAutofire);
  btnMute.addEventListener('click', toggleMute);
  btnResume.addEventListener('click', togglePause);
  btnRestartPause.addEventListener('click', startGame);
  btnPlayAgain.addEventListener('click', startGame);

  // ---- Main RAF Loop ----
  let lastTs = performance.now();
  let hudTick = 0;

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    const pads = getConnectedPads();
    pollMenuGamepads(pads, ts);

    if (state.mode === 'playing') {
      update(dt, pads);
      hudTick += dt;
      if (hudTick >= 0.1) {
        hudTick = 0;
        renderHud();
      }
    } else {
      // Gentle starfield drift on menus
      for (const s of stars) {
        s.y += (s.speed * 0.4 * dt) / H;
        if (s.y > 1) { s.y = 0; s.x = Math.random(); }
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
