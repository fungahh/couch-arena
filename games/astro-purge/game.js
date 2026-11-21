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
    const vv = window.visualViewport;
    W = Math.floor(vv ? vv.width : window.innerWidth);
    H = Math.floor(vv ? vv.height : window.innerHeight);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 180));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }
  resize();

  // ---- DOM Elements ----
  const hudEl = document.getElementById('hud');
  const hudWave = document.getElementById('hud-wave');
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
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // Start Damage Meter collapsed on narrow portrait phones so screen stays uncluttered (tap to expand!)
  if (window.innerWidth <= 760 && damageMeterEl) {
    damageMeterEl.classList.add('collapsed');
  }
  if (damageMeterEl) {
    damageMeterEl.addEventListener('click', (e) => {
      e.stopPropagation();
      damageMeterEl.classList.toggle('collapsed');
    });
  }
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const docEl = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        document.body.classList.remove('clean-hud');
      } else if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {
          document.body.classList.toggle('clean-hud');
        });
      } else {
        // iOS Safari: scroll top to shrink bar & toggle clean HUD opacity
        window.scrollTo(0, 1);
        document.body.classList.toggle('clean-hud');
      }
      setTimeout(resize, 150);
    });
  }

  const bossBarWrap = document.getElementById('boss-bar-wrap');
  const bossNameEl = document.getElementById('boss-name');
  const bossHpText = document.getElementById('boss-hp-text');
  const bossHpFill = document.getElementById('boss-hp-fill');
  const bossCastWrap = document.getElementById('boss-cast-wrap');
  const bossCastLabel = document.getElementById('boss-cast-label');
  const bossCastFill = document.getElementById('boss-cast-fill');
  const bossWarningEl = document.getElementById('boss-warning');
  const bossWarningTitle = document.getElementById('boss-warning-title');
  const bossWarningSub = document.getElementById('boss-warning-sub');
  const waveBannerEl = document.getElementById('wave-banner');
  const waveBannerTitle = document.getElementById('wave-banner-title');
  const waveBannerSub = document.getElementById('wave-banner-sub');

  const titleOverlay = document.getElementById('title-overlay');
  const upgradeOverlay = document.getElementById('upgrade-overlay');
  const pauseOverlay = document.getElementById('pause-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const kickedOverlay = document.getElementById('kicked-overlay');

  const lobbyRoomCode = document.getElementById('lobby-room-code');
  const lobbyPlayerName = document.getElementById('lobby-player-name');
  const lobbyRoomStatus = document.getElementById('lobby-room-status');
  const lobbyRosterGrid = document.getElementById('lobby-roster-grid');
  const lobbyControlsBox = document.getElementById('lobby-controls-box');
  const btnCopyInvite = document.getElementById('btn-copy-invite');
  const btnToggleTv = document.getElementById('btn-toggle-tv');
  const btnAddLocal = document.getElementById('btn-add-local');
  const btnLaunch = document.getElementById('btn-launch');
  const titlePadHint = document.getElementById('title-pad-hint');

  const tvQrPanel = document.getElementById('tv-qr-panel');
  const tvQrBox = document.getElementById('tv-qr-box');
  const tvBigCode = document.getElementById('tv-big-code');
  const btnTvFullscreen = document.getElementById('btn-tv-fullscreen');

  const btnHudPing = document.getElementById('btn-hud-ping');
  const controllerUi = document.getElementById('controller-ui');
  const ctrlPilotPill = document.getElementById('ctrl-pilot-pill');
  const ctrlColorDot = document.getElementById('ctrl-color-dot');
  const ctrlSlotTag = document.getElementById('ctrl-slot-tag');
  const ctrlPilotName = document.getElementById('ctrl-pilot-name');
  const ctrlMeta = document.getElementById('ctrl-meta');
  const ctrlHpFill = document.getElementById('ctrl-hp-fill');
  const ctrlHpText = document.getElementById('ctrl-hp-text');
  const btnCtrlMode = document.getElementById('btn-ctrl-mode');
  const btnCtrlPause = document.getElementById('btn-ctrl-pause');
  const btnCtrlSwap = document.getElementById('btn-ctrl-swap');
  const ctrlSteerPad = document.getElementById('ctrl-steer-pad');
  const ctrlSteerLabel = document.getElementById('ctrl-steer-label');
  const ctrlStickBase = document.getElementById('ctrl-stick-base');
  const ctrlStickKnob = document.getElementById('ctrl-stick-knob');
  const ctrlTrackVisual = document.getElementById('ctrl-track-visual');
  const ctrlTrackDot = document.getElementById('ctrl-track-dot');
  const ctrlDashBtn = document.getElementById('ctrl-dash-btn');
  const ctrlDashSub = document.getElementById('ctrl-dash-sub');
  const ctrlPingBtn = document.getElementById('ctrl-ping-btn');
  const ctrlPingIcon = document.getElementById('ctrl-ping-icon');
  const ctrlPingTitle = document.getElementById('ctrl-ping-title');
  const ctrlPingSub = document.getElementById('ctrl-ping-sub');
  const ctrlWeaponsMini = document.getElementById('ctrl-weapons-mini');
  const ctrlHurtFlash = document.getElementById('ctrl-hurt-flash');
  const ctrlDownedBanner = document.getElementById('ctrl-downed-banner');

  const draftEyebrow = document.getElementById('draft-eyebrow');
  const draftTitle = document.getElementById('draft-title');
  const draftSub = document.getElementById('draft-sub');
  const upgradeGrid = document.getElementById('upgrade-grid');
  const draftWaitingEl = document.getElementById('draft-waiting');
  const draftHintFooter = document.getElementById('draft-hint-footer');

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
    slice() { this.tone(1180, 520, 0.09, 'triangle', 0.07); this.noise(0.05, 0.04, 2400); },
    shield() { this.tone(880, 1480, 0.11, 'sine', 0.08); this.tone(1320, 1760, 0.08, 'triangle', 0.05); },
    wave() {
      this.tone(392, 523.25, 0.12, 'triangle', 0.085);
      setTimeout(() => this.tone(523.25, 659.25, 0.18, 'triangle', 0.09), 90);
    },
    bossBoom() {
      this.noise(0.22, 0.11, 750);
      this.tone(150, 42, 0.22, 'sawtooth', 0.1);
    },
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
    laserCharge() {
      this.tone(220, 780, 0.45, 'sine', 0.085);
      this.tone(440, 960, 0.35, 'triangle', 0.05);
    },
    laserFire() {
      this.noise(0.32, 0.1, 1400);
      this.tone(520, 140, 0.38, 'sawtooth', 0.11);
    },
    phaseShift() {
      this.noise(0.28, 0.1, 900);
      this.tone(180, 360, 0.18, 'sawtooth', 0.11);
      setTimeout(() => this.tone(270, 540, 0.22, 'sawtooth', 0.11), 130);
      setTimeout(() => this.tone(360, 720, 0.32, 'triangle', 0.12), 260);
    },
    voidBoom() {
      this.noise(0.18, 0.09, 600);
      this.tone(190, 55, 0.2, 'sawtooth', 0.1);
    },
    ping() {
      this.tone(740, 1046.5, 0.11, 'sine', 0.1);
      setTimeout(() => this.tone(1046.5, 1318.5, 0.15, 'sine', 0.095), 95);
    },
    sosPing() {
      this.tone(880, 660, 0.12, 'triangle', 0.12);
      setTimeout(() => this.tone(880, 660, 0.12, 'triangle', 0.12), 140);
      setTimeout(() => this.tone(1046.5, 784, 0.2, 'triangle', 0.13), 280);
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
      } else if (code === 'KeyQ' || code === 'KeyF') {
        triggerMyPing();
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

  // ---- Dedicated Phone Controller Input (Toggleable Virtual Joystick OR Trackpad!) ----
  const phonePad = {
    mode: (localStorage.getItem('astro_ctrl_mode') === 'trackpad') ? 'trackpad' : 'stick',
    active: false,
    mx: 0,
    my: 0,
    dash: false,
    pointerId: null,
    originX: 0,
    originY: 0,
  };

  function resetPhonePad() {
    phonePad.active = false;
    phonePad.mx = 0;
    phonePad.my = 0;
    phonePad.dash = false;
    phonePad.pointerId = null;
    if (ctrlStickBase) {
      ctrlStickBase.classList.remove('active');
      ctrlStickBase.style.transform = 'translate(0px, 0px)';
    }
    if (ctrlStickKnob) ctrlStickKnob.style.transform = 'translate(0px, 0px)';
    if (ctrlTrackDot) ctrlTrackDot.style.transform = 'translate(0px, 0px)';
    if (ctrlDashBtn) ctrlDashBtn.classList.remove('pressed');
  }

  function applyPhonePadModeUI() {
    const isTrack = phonePad.mode === 'trackpad';
    if (btnCtrlMode) {
      btnCtrlMode.textContent = isTrack ? '👆 Trackpad' : '🕹️ Stick';
      btnCtrlMode.classList.toggle('active', isTrack);
    }
    if (ctrlSteerLabel) {
      ctrlSteerLabel.textContent = isTrack
        ? 'SLIDE TO STEER UFO (TRACKPAD MODE)'
        : 'TOUCH ANYWHERE ON RIGHT TO STEER UFO';
    }
    if (ctrlStickBase) ctrlStickBase.classList.toggle('hidden', isTrack);
    if (ctrlTrackVisual) ctrlTrackVisual.classList.toggle('hidden', !isTrack);
  }
  applyPhonePadModeUI();

  if (btnCtrlMode) {
    btnCtrlMode.addEventListener('click', () => {
      phonePad.mode = phonePad.mode === 'stick' ? 'trackpad' : 'stick';
      try { localStorage.setItem('astro_ctrl_mode', phonePad.mode); } catch (e) {}
      resetPhonePad();
      applyPhonePadModeUI();
      SFX.xp();
    });
  }

  if (ctrlSteerPad) {
    const updateSteerFromPoint = (clientX, clientY) => {
      const dx = clientX - phonePad.originX;
      const dy = clientY - phonePad.originY;
      // Shorter, super-responsive 42px throw radius so gentle thumb motions hit full speed easily!
      const maxR = phonePad.mode === 'trackpad' ? 38 : 42;
      const d = Math.hypot(dx, dy);
      const clampedD = Math.min(d, maxR);
      const rawMag = d > 0.001 ? clampedD / maxR : 0;
      const dead = 0.07;
      if (rawMag < dead) {
        phonePad.mx = 0;
        phonePad.my = 0;
      } else {
        const rescaled = Math.pow((rawMag - dead) / (1 - dead), 0.85);
        phonePad.mx = Math.round((dx / d) * rescaled * 100) / 100;
        phonePad.my = Math.round((dy / d) * rescaled * 100) / 100;
      }
      const visScale = phonePad.mode === 'stick' ? 1.15 : 0.95;
      const visX = (d > 0.001 ? (dx / d) * clampedD * visScale : 0);
      const visY = (d > 0.001 ? (dy / d) * clampedD * visScale : 0);
      if (phonePad.mode === 'stick' && ctrlStickKnob) {
        ctrlStickKnob.style.transform = `translate(${visX.toFixed(1)}px, ${visY.toFixed(1)}px)`;
      } else if (ctrlTrackDot) {
        ctrlTrackDot.style.transform = `translate(${visX.toFixed(1)}px, ${visY.toFixed(1)}px)`;
      }
    };

    ctrlSteerPad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      SFX.ensure();
      if (window.CouchRoom && window.CouchRoom.requestWakeLock) window.CouchRoom.requestWakeLock();
      if (phonePad.pointerId !== null) return;
      phonePad.pointerId = e.pointerId;
      phonePad.active = true;
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
      if (ctrlSteerPad.setPointerCapture) {
        try { ctrlSteerPad.setPointerCapture(e.pointerId); } catch (err) {}
      }
      // Visually glide the joystick ring right under where the thumb touched down!
      phonePad.originX = e.clientX;
      phonePad.originY = e.clientY;
      if (phonePad.mode === 'stick' && ctrlStickBase) {
        ctrlStickBase.style.transform = 'translate(0px, 0px)';
        const baseRect = ctrlStickBase.getBoundingClientRect();
        const padRect = ctrlSteerPad.getBoundingClientRect();
        const restCx = baseRect.left + baseRect.width / 2;
        const restCy = baseRect.top + baseRect.height / 2;
        const margin = baseRect.width * 0.42;
        const clampedX = clamp(e.clientX, padRect.left + margin, padRect.right - margin);
        const clampedY = clamp(e.clientY, padRect.top + margin, padRect.bottom - margin);
        ctrlStickBase.style.transform = `translate(${(clampedX - restCx).toFixed(1)}px, ${(clampedY - restCy).toFixed(1)}px)`;
        ctrlStickBase.classList.add('active');
      }
      updateSteerFromPoint(e.clientX, e.clientY);
    }, { passive: false });

    ctrlSteerPad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== phonePad.pointerId || !phonePad.active) return;
      e.preventDefault();
      updateSteerFromPoint(e.clientX, e.clientY);
    }, { passive: false });

    const releaseSteer = (e) => {
      if (e.pointerId !== phonePad.pointerId) return;
      phonePad.active = false;
      phonePad.pointerId = null;
      phonePad.mx = 0;
      phonePad.my = 0;
      if (ctrlStickBase) {
        ctrlStickBase.classList.remove('active');
        ctrlStickBase.style.transform = 'translate(0px, 0px)';
      }
      if (ctrlStickKnob) ctrlStickKnob.style.transform = 'translate(0px, 0px)';
      if (ctrlTrackDot) ctrlTrackDot.style.transform = 'translate(0px, 0px)';
      phonePad.urgentFlush = true;
    };
    ctrlSteerPad.addEventListener('pointerup', releaseSteer);
    ctrlSteerPad.addEventListener('pointercancel', releaseSteer);
  }

  if (ctrlDashBtn) {
    ctrlDashBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      SFX.ensure();
      if (window.CouchRoom && window.CouchRoom.requestWakeLock) window.CouchRoom.requestWakeLock();
      phonePad.dash = true;
      phonePad.urgentFlush = true;
      ctrlDashBtn.classList.add('pressed');
      if (navigator.vibrate) { try { navigator.vibrate(18); } catch (err) {} }
    }, { passive: false });
    const endCtrlDash = () => {
      phonePad.dash = false;
      phonePad.urgentFlush = true;
      ctrlDashBtn.classList.remove('pressed');
    };
    ctrlDashBtn.addEventListener('pointerup', endCtrlDash);
    ctrlDashBtn.addEventListener('pointercancel', endCtrlDash);
    ctrlDashBtn.addEventListener('pointerleave', endCtrlDash);
  }

  window.addEventListener('blur', resetPhonePad);

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
      // Dedicated Phone Controller input (Virtual Joystick / Trackpad + Arcade Dash!)
      if (typeof isPhoneControllerActive === 'function' && isPhoneControllerActive()) {
        if (phonePad.mx || phonePad.my) {
          mx = phonePad.mx;
          my = phonePad.my;
        }
        if (phonePad.dash) dash = true;
      } else {
        // Follow-the-finger touch input ONLY while finger is actively pressed down
        if (touchCtrl.active && touchCtrl.tx !== null && touchCtrl.ty !== null) {
          tx = touchCtrl.tx;
          ty = touchCtrl.ty;
        }
        if (touchCtrl.dash) dash = true;
      }
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
    wave: 1,
    waveKills: 0,
    waveTarget: 12,
    level: 1,
    xp: 0,
    xpNeeded: 140,
    shake: 0,
    hurtVignette: 0,
    spawnTimer: 0,
    bossActive: false,
    bossWarningTimer: 0,
    bossRewardDelay: 0,
    pendingBossWave: null,
    pendingDrafts: [],
    // Personal draft tracking
    draftSeq: 0,
    activeDraftMeta: null,
    activeDraftId: 0,
    myDraftPickIdx: -1,
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
    hazards: [],
    bossBeams: [],
    bossCast: null,
    pings: [], // { playerId, isRess, timer, maxTimer, x, y, color, glow, name, slot }
    myPingCooldown: 0,
  };

  function createPlayerFromRoster(rp, localIndex) {
    const pal = PLAYER_COLORS[rp.slot % PLAYER_COLORS.length];
    const offsets = [
      [0.36, 0.50],
      [0.50, 0.44],
      [0.64, 0.50],
      [0.42, 0.64],
      [0.58, 0.64],
    ];
    const off = offsets[rp.slot % offsets.length];
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
      fireKick: 0,
      hurtRecoil: 0,
      shieldFlash: 0,
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

  // ---- Room Setup (Normal Play, TV Screen Mode, or Phone Controller!) ----
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomParam = urlParams.get('room');
  const explicitHost = urlParams.get('host') === '1';
  const isHostStart = !initialRoomParam || explicitHost;
  const initialTvParam = urlParams.get('tv') === '1';
  const initialControllerParam = urlParams.get('controller') === '1';
  const autostartParam = urlParams.get('autostart') === '1';

  let phoneControllerMode = !isHostStart && initialControllerParam;
  let autostartDone = false;
  let autostartTimer = null;
  let handoffMeta = null;
  if (autostartParam && isHostStart) {
    try {
      const raw = sessionStorage.getItem('ca_room_launch');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.gameId === 'astro-purge' && (!initialRoomParam || parsed.roomCode === initialRoomParam) && Date.now() - (parsed.ts || 0) < 30000) {
          handoffMeta = parsed;
        }
      }
    } catch (e) {}
  }

  function isPhoneControllerActive() {
    return !room.isHost && phoneControllerMode && state.mode === 'playing';
  }

  function isCouchCaptain() {
    if (room.isHost) return false;
    const ordered = room.getOrderedPlayers();
    return Boolean(room.roomHasTv && ordered.length > 0 && ordered[0].id === room.myId);
  }

  function awardAchievementToAll(achId) {
    if (!achId) return;
    if (!room.tvMode && window.CouchAccounts) {
      window.CouchAccounts.unlockAchievement(achId);
    }
    if (room.isHost) {
      for (const p of state.players) {
        if (!p.isLocal) room.awardPlayerAchievement(p.id, achId);
      }
    }
  }

  function maybeTriggerAutostart(roster) {
    if (!autostartParam || !room.isHost || autostartDone || state.mode !== 'title') return;
    const expected = handoffMeta ? Math.max(1, handoffMeta.expectedCount || 1) : 1;
    if (roster.length >= expected) {
      autostartDone = true;
      clearTimeout(autostartTimer);
      setTimeout(() => {
        if (state.mode === 'title' && room.getOrderedPlayers().length > 0) startGame();
      }, 220);
    } else if (roster.length > 0 && !autostartTimer) {
      autostartTimer = setTimeout(() => {
        if (!autostartDone && state.mode === 'title' && room.getOrderedPlayers().length > 0) {
          autostartDone = true;
          startGame();
        }
      }, 2200);
    }
  }

  const room = new RoomSync({
    gameId: 'astro_purge',
    codePrefix: 'A',
    maxPlayers: 5,
    roomCode: initialRoomParam || '',
    isHost: isHostStart,
    tvMode: isHostStart && initialTvParam,
    controllerMode: !isHostStart && initialControllerParam,
    playerName: getSavedPlayerName(),
    onRosterChange: (roster) => {
      renderLobbyRoster(roster);
      syncTvAndControllerLobbyUI(roster);
      maybeTriggerAutostart(roster);
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
      document.documentElement.classList.remove('autostart-boot');
      lobbyRoomStatus.textContent = 'Room Full (5/5)';
      titlePadHint.textContent = 'This room already has 5 players. Return to the Hub to create a new room.';
      btnLaunch.disabled = true;
    },
    onKicked: () => {
      document.documentElement.classList.remove('autostart-boot');
      state.mode = 'kicked';
      resetPhonePad();
      if (controllerUi) controllerUi.classList.add('hidden');
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

  function renderTvQrCode() {
    if (!tvQrBox || !room.roomCode) return;
    const ctrlUrl = room.getInviteUrl({ controller: true });
    if (window.CouchQR && window.CouchQR.renderSvg) {
      tvQrBox.innerHTML = window.CouchQR.renderSvg(ctrlUrl, { fg: '#111827', bg: '#ffffff', quiet: 3 });
    }
    if (tvBigCode) tvBigCode.textContent = room.roomCode;
  }

  function syncTvAndControllerLobbyUI(roster = room.getOrderedPlayers()) {
    const isTvHost = room.isHost && room.tvMode;
    if (tvQrPanel) tvQrPanel.classList.toggle('hidden', !isTvHost);
    if (isTvHost) renderTvQrCode();

    if (lobbyPlayerName) lobbyPlayerName.classList.toggle('hidden', isTvHost);
    if (btnAddLocal) btnAddLocal.classList.toggle('hidden', !room.isHost || isTvHost);
    if (lobbyControlsBox) lobbyControlsBox.classList.toggle('hidden', isTvHost);

    if (btnToggleTv) {
      if (room.isHost) {
        btnToggleTv.classList.remove('hidden');
        btnToggleTv.textContent = isTvHost ? '💻 Exit TV Mode' : '📺 TV Screen Mode';
      } else {
        // On a Guest phone, let them toggle between Phone Controller and Full Arena View!
        btnToggleTv.classList.remove('hidden');
        btnToggleTv.textContent = phoneControllerMode ? '🎮 Controller Mode: ON' : '📱 Switch to Phone Controller';
      }
    }

    if (btnCopyInvite) {
      btnCopyInvite.textContent = isTvHost ? 'Copy Controller Link' : 'Copy Invite Link';
    }

    if (room.isHost) {
      if (isTvHost) {
        btnLaunch.disabled = roster.length === 0;
        btnLaunch.textContent =
          roster.length === 0
            ? 'Waiting for Phone Controllers (0/5)...'
            : `▶ Launch Mission (${roster.length}/5 Ready)`;
        titlePadHint.textContent = 'Cast/mirror this screen to your TV! Phone 1 (Captain) can also press Launch right from the couch.';
      } else {
        btnLaunch.disabled = roster.length === 0;
        btnLaunch.textContent = `Launch Mission (${roster.length}/5)`;
        titlePadHint.textContent = 'Send the Invite Link to friends on iPhones/laptops, or switch to TV Screen Mode so phones act as controllers!';
      }
    } else {
      const captain = isCouchCaptain();
      if (captain) {
        btnLaunch.disabled = false;
        btnLaunch.textContent = `▶ Launch Mission on TV (${roster.length}/5)`;
        titlePadHint.textContent = phoneControllerMode
          ? '🎮 You are the Couch Captain! Tap Launch Mission when everyone has scanned in.'
          : 'You are the Couch Captain! Tap Launch Mission when everyone is ready.';
      } else {
        btnLaunch.disabled = true;
        btnLaunch.textContent = room.roomHasTv ? 'Waiting for Captain / TV to Start...' : 'Waiting for Host...';
        titlePadHint.textContent = phoneControllerMode
          ? '🎮 Phone Controller Ready! Watch the TV screen — your joystick & personal upgrades will appear when the mission starts.'
          : 'Connected! Waiting for Host to launch the mission...';
      }
    }
  }

  function syncPhoneControllerVisibility() {
    const showCtrl = isPhoneControllerActive();
    if (controllerUi) controllerUi.classList.toggle('hidden', !showCtrl);
    if (showCtrl) {
      hudEl.classList.add('hidden');
      if (touchDashBtn) touchDashBtn.classList.remove('visible');
    } else if (state.mode === 'playing') {
      hudEl.classList.remove('hidden');
    }
    if (btnCtrlPause) {
      btnCtrlPause.classList.toggle('hidden', !isCouchCaptain());
    }
    if (btnCtrlSwap) {
      btnCtrlSwap.textContent = phoneControllerMode ? '👁 Arena' : '🎮 Pad';
    }
  }

  function spawnPlayerPing(playerId, isRessOverride) {
    const p = state.players.find((pl) => pl.id === playerId);
    if (!p) return;
    const isRess = isRessOverride !== undefined ? Boolean(isRessOverride) : Boolean(p.downed);
    const dur = isRess ? 3.2 : 2.6;
    state.pings = state.pings.filter((pg) => pg.playerId !== playerId);
    state.pings.push({
      playerId: p.id,
      slot: p.slot,
      name: p.name,
      color: p.color,
      glow: p.glow,
      x: p.x,
      y: p.y,
      isRess,
      timer: dur,
      maxTimer: dur,
    });
    if (isRess) SFX.sosPing();
    else SFX.ping();
  }

  function triggerMyPing() {
    if (state.mode !== 'playing') return;
    if (room.isHost && room.tvMode) return;
    if (state.myPingCooldown > 0) return;
    state.myPingCooldown = 1.4;
    SFX.ensure();
    if (navigator.vibrate) {
      const me = state.players.find((p) => p.id === room.myId);
      try { navigator.vibrate(me && me.downed ? [40, 40, 60] : 22); } catch (e) {}
    }
    if (room.isHost) {
      const me = state.players.find((p) => p.id === room.myId);
      const isRess = Boolean(me && me.downed);
      spawnPlayerPing(room.myId, isRess);
      room.sendSignal({ type: 'PING_FX', playerId: room.myId, isRess });
    } else {
      room.sendSignal({ type: 'PLAYER_PING' });
      const me = state.players.find((p) => p.id === room.myId);
      if (me && me.downed) SFX.sosPing();
      else SFX.ping();
    }
  }

  if (ctrlPingBtn) {
    ctrlPingBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ctrlPingBtn.classList.add('pressed');
      triggerMyPing();
    }, { passive: false });
    const releasePingBtn = () => ctrlPingBtn.classList.remove('pressed');
    ctrlPingBtn.addEventListener('pointerup', releasePingBtn);
    ctrlPingBtn.addEventListener('pointercancel', releasePingBtn);
    ctrlPingBtn.addEventListener('pointerleave', releasePingBtn);
  }
  if (ctrlDownedBanner) {
    ctrlDownedBanner.addEventListener('click', () => triggerMyPing());
  }
  if (btnHudPing) {
    btnHudPing.addEventListener('click', () => triggerMyPing());
  }

  function updatePhoneControllerHUD() {
    if (!isPhoneControllerActive()) return;
    const me = state.players.find((p) => p.id === room.myId);
    const mySlot = me ? me.slot : (room.getMyPlayer()?.slot || 0);
    const pal = PLAYER_COLORS[mySlot % PLAYER_COLORS.length];

    if (ctrlColorDot) {
      ctrlColorDot.style.background = pal.hex;
      ctrlColorDot.style.boxShadow = `0 0 12px ${pal.glow}`;
    }
    if (ctrlSlotTag) {
      ctrlSlotTag.textContent = `P${mySlot + 1} ${pal.name.toUpperCase()}`;
      ctrlSlotTag.style.background = pal.hex;
      ctrlSlotTag.style.color = '#090d16';
    }
    if (ctrlPilotPill) {
      ctrlPilotPill.style.borderColor = pal.hex;
    }
    if (ctrlStickBase) {
      ctrlStickBase.style.borderColor = phonePad.active ? '#fde047' : pal.hex;
      ctrlStickBase.style.boxShadow = `inset 0 0 28px ${pal.hex}44, 0 8px 26px rgba(0, 0, 0, 0.45)`;
    }
    if (ctrlStickKnob) {
      ctrlStickKnob.style.background = `linear-gradient(135deg, ${pal.glow}, ${pal.hex})`;
      ctrlStickKnob.style.boxShadow = `0 5px 0 #090d16, 0 0 22px ${pal.hex}99`;
    }
    if (ctrlPilotName) ctrlPilotName.textContent = (me && me.name) || room.myName;
    if (ctrlMeta) ctrlMeta.textContent = `W${state.wave} · LV${state.level}`;

    if (me) {
      const hpPct = clamp((me.hp / Math.max(1, me.maxHp)) * 100, 0, 100);
      if (ctrlHpFill) {
        ctrlHpFill.style.width = hpPct.toFixed(1) + '%';
        ctrlHpFill.style.background = hpPct <= 30 ? '#ef4444' : hpPct <= 60 ? '#facc15' : '#22c55e';
      }
      if (ctrlHpText) ctrlHpText.textContent = me.downed ? 'DOWNED' : `${Math.ceil(me.hp)}/${me.maxHp}`;
      if (ctrlDownedBanner) ctrlDownedBanner.classList.toggle('hidden', !me.downed);

      const dashReady = (me.dashCooldown || 0) <= 0.05;
      if (ctrlDashBtn) ctrlDashBtn.classList.toggle('cooling', !dashReady);
      if (ctrlDashSub) ctrlDashSub.textContent = dashReady ? 'READY!' : `${me.dashCooldown.toFixed(1)}s`;

      // Morph PING button into urgent RESS ME! button when downed!
      const pingCool = state.myPingCooldown > 0.05;
      if (ctrlPingBtn) {
        ctrlPingBtn.classList.toggle('ress', Boolean(me.downed));
        ctrlPingBtn.classList.toggle('cooling', pingCool);
      }
      if (ctrlPingIcon) ctrlPingIcon.textContent = me.downed ? '🆘' : '📍';
      if (ctrlPingTitle) ctrlPingTitle.textContent = me.downed ? 'RESS!' : 'PING';
      if (ctrlPingSub) {
        ctrlPingSub.textContent = pingCool
          ? `${state.myPingCooldown.toFixed(1)}s`
          : me.downed ? 'NEED REVIVE' : 'FIND ME';
      }

      if (ctrlWeaponsMini && me.upgrades) {
        const chips = [];
        for (const u of UPGRADES) {
          const lv = me.upgrades[u.id] || 0;
          if (lv > 0) chips.push(`<span class="weapon-chip">${u.icon} Lv${lv}</span>`);
        }
        ctrlWeaponsMini.innerHTML = chips.join('');
      }
    }

    if (ctrlHurtFlash) {
      ctrlHurtFlash.style.opacity = state.hurtVignette > 0.02 ? String(clamp(state.hurtVignette * 1.4, 0, 0.9)) : '0';
    }
  }

  room.connect().then(() => {
    lobbyRoomCode.textContent = `ROOM ${room.roomCode}`;
    btnHudInvite.textContent = `Room: ${room.roomCode} · Copy Link`;
    if (handoffMeta && room.isHost && !room.tvMode && Array.isArray(handoffMeta.localPlayers)) {
      handoffMeta.localPlayers.forEach((lp) => room.addLocalPlayer(lp.name));
    }
    syncTvAndControllerLobbyUI();
    maybeTriggerAutostart(room.getOrderedPlayers());
  });

  if (btnToggleTv) {
    btnToggleTv.addEventListener('click', () => {
      if (room.isHost) {
        room.setTvMode(!room.tvMode);
        syncTvAndControllerLobbyUI();
      } else {
        phoneControllerMode = !phoneControllerMode;
        syncTvAndControllerLobbyUI();
      }
    });
  }

  if (btnTvFullscreen) {
    btnTvFullscreen.addEventListener('click', () => {
      const docEl = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
    });
  }

  if (btnCtrlSwap) {
    btnCtrlSwap.addEventListener('click', () => {
      phoneControllerMode = !phoneControllerMode;
      resetPhonePad();
      syncPhoneControllerVisibility();
    });
  }

  if (btnCtrlPause) {
    btnCtrlPause.addEventListener('click', () => {
      if (isCouchCaptain()) {
        room.sendSignal({ type: 'CAPTAIN_PAUSE' });
      }
    });
  }

  function copyInviteLink(btnEl) {
    const url = room.getInviteUrl({ controller: room.tvMode });
    const prev = btnEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    btnEl.textContent = room.tvMode ? 'Controller Link Copied!' : 'Invite Link Copied!';
    setTimeout(() => { btnEl.textContent = prev; }, 1800);
  }

  btnCopyInvite.addEventListener('click', () => copyInviteLink(btnCopyInvite));
  btnHudInvite.addEventListener('click', () => copyInviteLink(btnHudInvite));

  btnAddLocal.addEventListener('click', () => {
    if (!room.isHost || room.tvMode) return;
    if (countLocalPlayers() >= 2) {
      btnAddLocal.textContent = 'Max 2 Local Players';
      setTimeout(() => (btnAddLocal.textContent = '+ Add Local Player'), 1400);
      return;
    }
    const added = room.addLocalPlayer('Local P2');
    if (!added) {
      btnAddLocal.textContent = 'Room Full (5/5)';
      setTimeout(() => (btnAddLocal.textContent = '+ Add Local Player'), 1400);
    }
  });

  function renderLobbyRoster(roster) {
    lobbyRosterGrid.innerHTML = '';
    const bySlot = {};
    roster.forEach((p) => { bySlot[p.slot] = p; });

    for (let s = 0; s < 5; s++) {
      const p = bySlot[s];
      const pal = PLAYER_COLORS[s % PLAYER_COLORS.length];
      const card = document.createElement('div');
      if (p) {
        card.className = 'slot-card';
        card.style.borderTop = `3px solid ${pal.hex}`;
        const canKick = room.isHost && p.id !== room.myId;
        const kickLabel = p.isLocal ? 'Remove' : 'Kick';
        const isCap = room.roomHasTv && roster.length > 0 && roster[0].id === p.id;
        const roleTag = p.isHost ? 'HOST' : isCap ? '★ CAPTAIN' : p.isController ? '📱 PAD' : p.isLocal ? 'LOCAL' : 'ONLINE';
        card.innerHTML = `
          <div class="slot-head">
            <span style="color:${pal.hex}">P${s + 1} · ${pal.name}</span>
            ${canKick ? `<button type="button" class="slot-remove" data-kick="${p.id}">${kickLabel}</button>` : `<span>${roleTag}</span>`}
          </div>
          <div class="slot-name">${escapeHtml(p.name)}</div>
          <div class="slot-sub">${p.id === room.myId ? 'You' : p.isController ? 'Phone Controller' : p.isLocal ? 'Same Screen' : 'Connected'}</div>
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
          <div style="font-size:0.7rem; opacity:0.75;">${room.tvMode ? 'Scan QR with phone' : 'Share invite link'}</div>
        `;
      }
      lobbyRosterGrid.appendChild(card);
    }

    syncTvAndControllerLobbyUI(roster);
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

  // ---- Room Message Handling (Host, TV & Guest/Controller Sync) ----
  function handleRoomMessage(msg) {
    if (!msg || !msg.type) return;

    if (room.isHost) {
      if (msg.type === 'INPUT' && msg.senderId) {
        remoteInputs[msg.senderId] = msg.input;
      } else if (msg.type === 'PERSONAL_PICK' && state.mode === 'upgrade' && msg.senderId) {
        applyPlayerDraftPick(msg.senderId, msg.idx);
      } else if (msg.type === 'CAPTAIN_START' && room.tvMode && (state.mode === 'title' || state.mode === 'gameover')) {
        startGame();
      } else if (msg.type === 'CAPTAIN_PAUSE' && room.tvMode && (state.mode === 'playing' || state.mode === 'paused')) {
        togglePause();
      } else if (msg.type === 'PLAYER_PING' && state.mode === 'playing' && msg.senderId) {
        const target = state.players.find((pl) => pl.id === msg.senderId);
        if (target) {
          const isRess = Boolean(target.downed);
          spawnPlayerPing(target.id, isRess);
          room.sendSignal({ type: 'PING_FX', playerId: target.id, isRess });
        }
      } else if (msg.type === 'CAPTAIN_LOBBY' && room.tvMode && (state.mode === 'paused' || state.mode === 'gameover')) {
        room.sendSignal({ type: 'RETURN_LOBBY' });
        returnToLobbyUI();
      }
      return;
    }

    // Guest / Phone Controller handlers
    if (msg.type === 'GAME_START') {
      document.documentElement.classList.remove('autostart-boot');
      state.mode = 'playing';
      state.pings = [];
      clearTouchSteer();
      resetPhonePad();
      titleOverlay.classList.add('hidden');
      upgradeOverlay.classList.add('hidden');
      pauseOverlay.classList.add('hidden');
      gameoverOverlay.classList.add('hidden');
      syncPhoneControllerVisibility();
      updatePhoneControllerHUD();
      if (window.CouchAccounts) {
        window.CouchAccounts.recordGamePlayed('astro-purge');
        window.CouchAccounts.unlockAchievement('ap_first_flight');
        if (phoneControllerMode || room.roomHasTv) {
          window.CouchAccounts.unlockAchievement('hub_tv_party');
        }
      }
      SFX.levelUp();
    } else if (msg.type === 'PING_FX' && msg.playerId) {
      if (!isPhoneControllerActive()) {
        spawnPlayerPing(msg.playerId, msg.isRess);
      }
    } else if (msg.type === 'SNAP') {
      if (state.mode === 'title') {
        // Guest arrived slightly after GAME_START -> seamlessly jump straight into live match!
        document.documentElement.classList.remove('autostart-boot');
        state.mode = 'playing';
        titleOverlay.classList.add('hidden');
        syncPhoneControllerVisibility();
      }
      if (state.mode === 'upgrade' && state.myDraftPicked && Date.now() - (state.myDraftPickedAt || 0) > 1200) {
        // Self-heal if DRAFT_DONE packet was ever missed after player already picked
        upgradeOverlay.classList.add('hidden');
        draftWaitingEl.classList.add('hidden');
        state.myDraftPicked = false;
        state.mode = 'playing';
        syncPhoneControllerVisibility();
      }
      applySnapshot(msg.s);
      updatePhoneControllerHUD();
    } else if (msg.type === 'WAVE_BANNER') {
      if (!isPhoneControllerActive()) showWaveBanner(msg.title, msg.sub);
    } else if (msg.type === 'BOSS_WARN') {
      if (!isPhoneControllerActive()) {
        bossWarningTitle.textContent = '⚠ RAID BOSS ENCOUNTER!';
        bossWarningSub.textContent = msg.sub;
        bossWarningEl.classList.remove('hidden');
        setTimeout(() => bossWarningEl.classList.add('hidden'), 2600);
      }
      SFX.bossWarn();
    } else if (msg.type === 'PERSONAL_DRAFT') {
      const incomingId = msg.draftId || 0;
      if (state.mode === 'upgrade' && incomingId && state.activeDraftId === incomingId) {
        if (state.myDraftPicked && state.myDraftPickIdx >= 0) {
          // Resend pick in case Host missed our first PERSONAL_PICK packet
          room.sendSignal({ type: 'PERSONAL_PICK', idx: state.myDraftPickIdx, draftId: incomingId });
        } else {
          // Ensure controller stays hidden and upgrade modal stays visible without flickering
          syncPhoneControllerVisibility();
          upgradeOverlay.classList.remove('hidden');
        }
        return;
      }
      clearTouchSteer();
      resetPhonePad();
      state.mode = 'upgrade';
      state.activeDraftId = incomingId;
      state.myDraftPicked = false;
      state.myDraftPickIdx = -1;
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
      syncPhoneControllerVisibility();
      upgradeOverlay.scrollTop = 0;
      upgradeOverlay.classList.remove('hidden');
      if (navigator.vibrate) { try { navigator.vibrate([30, 40, 30]); } catch (e) {} }
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
      state.myDraftPickIdx = -1;
      state.mode = 'playing';
      syncPhoneControllerVisibility();
      updatePhoneControllerHUD();
      SFX.xp();
      renderHud();
    } else if (msg.type === 'PAUSE_STATE') {
      state.mode = msg.paused ? 'paused' : 'playing';
      resetPhonePad();
      const cap = isCouchCaptain();
      btnResume.disabled = !cap;
      btnRestartPause.disabled = !cap;
      pauseOverlay.classList.toggle('hidden', !msg.paused);
      syncPhoneControllerVisibility();
    } else if (msg.type === 'GAME_OVER') {
      state.wave = msg.wave || state.wave;
      state.level = msg.level;
      state.score = msg.score;
      state.bossesDefeated = msg.bosses;
      state.kills = msg.kills;
      resetPhonePad();
      if (controllerUi) controllerUi.classList.add('hidden');
      showGameOverUI(msg.dmgSummary || []);
    } else if (msg.type === 'RETURN_LOBBY') {
      returnToLobbyUI();
    }
  }

  function renderBossCastUI(cast) {
    if (!bossCastWrap) return;
    if (!cast || !cast.label) {
      bossCastWrap.classList.add('hidden');
      bossCastWrap.classList.remove('safe-cast');
      return;
    }
    bossCastLabel.textContent = cast.label;
    bossCastFill.style.width = `${clamp((cast.progress || 0) * 100, 0, 100).toFixed(1)}%`;
    bossCastWrap.classList.toggle('safe-cast', Boolean(cast.safe));
    bossCastWrap.classList.remove('hidden');
  }

  function buildSnapshot() {
    const nx = (v) => Math.round((v / W) * 1000) / 1000;
    const ny = (v) => Math.round((v / H) * 1000) / 1000;
    const boss = state.enemies.find((e) => e.isBoss);
    const kindToCode = { void: 0, meteor: 1, safe: 2, puddle: 3 };
    return {
      wv: state.wave,
      wk: state.waveKills,
      wt: state.waveTarget,
      lv: state.level,
      sc: state.score,
      kl: state.kills,
      xp: Math.round(state.xp),
      xn: state.xpNeeded,
      ba: state.bossActive ? 1 : 0,
      b: boss && !boss.dying ? {
        n: boss.name,
        h: Math.ceil(boss.hp),
        m: boss.maxHp,
        ph: boss.phase || 1,
        inv: boss.phaseInvuln > 0 ? 1 : 0,
        ct: boss.chargeTelegraph ? Math.round(boss.chargeTelegraph.angle * 100) / 100 : null,
      } : null,
      bc: state.bossCast ? {
        l: state.bossCast.label,
        p: Math.round((state.bossCast.progress || 0) * 100) / 100,
        sf: state.bossCast.safe ? 1 : 0,
      } : null,
      hz: state.hazards.slice(0, 18).map((h) => [
        kindToCode[h.kind] ?? 0,
        nx(h.x),
        ny(h.y),
        Math.round(h.r),
        Math.round(clamp(1 - h.timer / Math.max(0.01, h.maxTimer), 0, 1) * 100) / 100,
      ]),
      bb: state.bossBeams.slice(0, 8).map((bm) => [
        nx(bm.x),
        ny(bm.y),
        Math.round(bm.angle * 100) / 100,
        Math.round(bm.len),
        Math.round(bm.width),
        bm.telegraph > 0 ? 1 : 0,
        Math.round((bm.telegraph > 0 ? 1 - bm.telegraph / Math.max(0.01, bm.maxTelegraph) : 1) * 100) / 100,
      ]),
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
        p.hurtRecoil > 0 ? 1 : 0,
        p.shieldFlash > 0 ? 1 : 0,
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
        e.dying ? 1 : 0,
        e.phaseInvuln > 0 ? 1 : 0,
      ]),
      bl: state.bullets.slice(0, 65).map((b) => [nx(b.x), ny(b.y), Math.round(b.radius), b.color, b.kind === 'missile' ? 1 : 0]),
      eb: state.enemyBullets.slice(0, 65).map((b) => [nx(b.x), ny(b.y), Math.round(b.radius), b.color, b.bouncy ? 1 : 0]),
      pk: state.pickups.slice(0, 60).map((pk) => [pk.kind === 'xp' ? 0 : 1, nx(pk.x), ny(pk.y), pk.pulling ? 1 : 0, pk.tier || 1]),
    };
  }

  function applySnapshot(s) {
    if (!s) return;
    if (s.xp > state.xp) SFX.xp();
    if (s.kl > state.kills) SFX.pop();

    const prevMap = {};
    state.players.forEach((pl) => { prevMap[pl.id] = pl; });
    const prevMe = prevMap[room.myId];
    const nextMeArr = (s.p || []).find((arr) => arr[0] === room.myId);
    if (prevMe && nextMeArr && nextMeArr[5] < prevMe.hp) {
      SFX.hurt();
      state.hurtVignette = 0.48;
      state.shake = Math.max(state.shake, 9);
    }

    state.wave = s.wv || 1;
    state.waveKills = s.wk || 0;
    state.waveTarget = s.wt || 12;
    state.level = s.lv;
    state.score = s.sc;
    state.kills = s.kl;
    state.xp = s.xp;
    state.xpNeeded = s.xn;
    state.bossActive = Boolean(s.ba);

    const codeToKind = ['void', 'meteor', 'safe', 'puddle'];
    state.hazards = (s.hz || []).map((arr) => ({
      kind: codeToKind[arr[0]] || 'void',
      x: arr[1] * W,
      y: arr[2] * H,
      r: arr[3],
      progress: arr[4] || 0,
      timer: 1 - (arr[4] || 0),
      maxTimer: 1,
    }));

    state.bossBeams = (s.bb || []).map((arr) => ({
      x: arr[0] * W,
      y: arr[1] * H,
      angle: arr[2],
      len: arr[3],
      width: arr[4],
      telegraph: arr[5] ? 0.5 : 0,
      maxTelegraph: 1,
      progress: arr[6] || 0,
    }));

    state.bossCast = s.bc ? { label: s.bc.l, progress: s.bc.p, safe: Boolean(s.bc.sf) } : null;

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
        hurtRecoil: arr[20] ? 0.25 : 0,
        shieldFlash: arr[21] ? 0.3 : 0,
        puffTimer: prev ? prev.puffTimer || 0 : 0,
        muzzleFlash: 0,
        fireKick: 0,
        invuln: arr[20] ? 0.2 : 0,
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
      dying: Boolean(arr[9]),
      phaseInvuln: arr[10] ? 0.5 : 0,
      chargeTelegraph: arr[0] === 'boss' && s.b && s.b.ct !== null && s.b.ct !== undefined ? { angle: s.b.ct } : null,
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
      bouncy: Boolean(arr[4]),
    }));

    state.pickups = s.pk.map((arr) => ({
      kind: arr[0] === 0 ? 'xp' : 'heal',
      x: arr[1] * W,
      y: arr[2] * H,
      pulling: Boolean(arr[3]),
      tier: arr[4] || 1,
      vx: 0,
      vy: 0,
    }));

    if (s.b) {
      const phTag = s.b.ph >= 3 ? ' [FINAL PHASE!]' : s.b.ph === 2 ? ' [PHASE 2]' : ' [PHASE 1]';
      bossNameEl.textContent = `WAVE ${state.wave} · ${s.b.n}${phTag}`;
      bossBarWrap.classList.remove('hidden');
      const pct = clamp((s.b.h / s.b.m) * 100, 0, 100);
      bossHpFill.style.width = pct.toFixed(1) + '%';
      bossHpText.textContent = `${s.b.h} / ${s.b.m}`;
      renderBossCastUI(state.bossCast);
    } else {
      bossBarWrap.classList.add('hidden');
      renderBossCastUI(null);
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

  let waveBannerTimer = null;

  function waveQuotaFor(wv) {
    // Distinct Wave progression: steadily growing quota per wave
    return Math.round(10 + wv * 3.2);
  }

  function waveSubtitleFor(wv) {
    if (wv === 1) return 'Clear space viruses to advance waves! Boss arrives at Wave 10.';
    if (wv % 10 === 9) return 'Final wave before the Giant Space Virus Boss!';
    if (wv === 2) return 'Mitosis Splitters spotted — Emerald XP Gems drop!';
    if (wv === 3) return 'Spore Turrets incoming — watch for red hazard globs!';
    if (wv === 5) return 'Armored Capsid Elites — big Golden XP Gems!';
    return `Eliminate ${waveQuotaFor(wv)} space viruses to clear Wave ${wv}!`;
  }

  function showWaveBanner(title, sub) {
    if (!waveBannerEl) return;
    waveBannerTitle.textContent = title;
    waveBannerSub.textContent = sub || '';
    waveBannerEl.classList.remove('hidden');
    // Re-trigger cartoon bounce animation
    waveBannerEl.style.animation = 'none';
    void waveBannerEl.offsetWidth;
    waveBannerEl.style.animation = '';
    SFX.wave();
    if (waveBannerTimer) clearTimeout(waveBannerTimer);
    waveBannerTimer = setTimeout(() => {
      waveBannerEl.classList.add('hidden');
    }, 2400);
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
    state.wave = 1;
    state.waveKills = 0;
    state.waveTarget = waveQuotaFor(1);
    state.level = 1;
    state.xp = 0;
    state.xpNeeded = 140;
    state.shake = 0;
    state.hurtVignette = 0;
    state.spawnTimer = 0.4;
    state.bossActive = false;
    state.bossWarningTimer = 0;
    state.pendingBossWave = null;
    state.bossRewardDelay = 0;
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
    state.hazards = [];
    state.bossBeams = [];
    state.bossCast = null;
    state.pings = [];
    if (btnHudPing) btnHudPing.classList.toggle('hidden', Boolean(room.isHost && room.tvMode));

    let localIdx = 0;
    state.players = roster.map((rp) => createPlayerFromRoster(rp, rp.isLocal ? localIdx++ : -1));

    titleOverlay.classList.add('hidden');
    document.documentElement.classList.remove('autostart-boot');
    upgradeOverlay.classList.add('hidden');
    draftWaitingEl.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    bossWarningEl.classList.add('hidden');
    bossBarWrap.classList.add('hidden');
    renderBossCastUI(null);
    if (waveBannerEl) waveBannerEl.classList.add('hidden');
    hudEl.classList.remove('hidden');

    for (let i = 0; i < 4; i++) spawnEnemy('asteroid_lg');
    for (let i = 0; i < 4; i++) spawnEnemy('corona');

    room.sendSignal({ type: 'GAME_START' });
    if (!room.tvMode && window.CouchAccounts) {
      window.CouchAccounts.recordGamePlayed('astro-purge');
    }
    awardAchievementToAll('ap_first_flight');
    if (state.players.length >= 2) {
      awardAchievementToAll('ap_couch_crew');
    }
    const wTitle = 'WAVE 1';
    const wSub = waveSubtitleFor(1);
    showWaveBanner(wTitle, wSub);
    room.sendSignal({ type: 'WAVE_BANNER', title: wTitle, sub: wSub });
    SFX.levelUp();
    renderHud();
  }

  function returnToLobbyUI() {
    if (autostartParam) {
      const url = new URL('../../room.html', window.location.href);
      url.searchParams.set('game', 'astro-purge');
      url.searchParams.set('room', room.roomCode);
      if (room.isHost) url.searchParams.set('host', '1');
      if (room.isHost && room.tvMode) url.searchParams.set('tv', '1');
      if (!room.isHost && (phoneControllerMode || room.roomHasTv)) {
        url.searchParams.set('controller', '1');
        url.searchParams.set('party', '1');
      }
      window.location.href = url.toString();
      return;
    }
    clearTouchSteer();
    resetPhonePad();
    state.mode = 'title';
    state.hazards = [];
    state.bossBeams = [];
    state.bossCast = null;
    if (controllerUi) controllerUi.classList.add('hidden');
    hudEl.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    upgradeOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    bossBarWrap.classList.add('hidden');
    renderBossCastUI(null);
    bossWarningEl.classList.add('hidden');
    if (waveBannerEl) waveBannerEl.classList.add('hidden');
    titleOverlay.classList.remove('hidden');
    syncTvAndControllerLobbyUI();
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
    const wv = state.wave;
    const coopHp = 1 + Math.max(0, state.players.length - 1) * 0.45;
    const hpScale = (1 + (wv - 1) * 0.3 + Math.pow(wv - 1, 1.2) * 0.05) * coopHp;
    const speedScale = 1 + Math.min(1.25, (wv - 1) * 0.045);
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
        xp: type === 'asteroid_lg' ? 26 : type === 'asteroid_md' ? 14 : 9,
        xpTier: type === 'asteroid_lg' ? 2 : 1,
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
      corona:  { r: 18, hp: 36,  sp: 88,  rotSp: 1.1,  xp: 14, tier: 1, sc: 35,  dmg: 18, col: '#e11d48' },
      microbe: { r: 12, hp: 18,  sp: 148, rotSp: 2.5,  xp: 10, tier: 1, sc: 20,  dmg: 14, col: '#a3e635' },
      mitosis: { r: 22, hp: 56,  sp: 70,  rotSp: 0.9,  xp: 30, tier: 2, sc: 55,  dmg: 20, col: '#84cc16' },
      shooter: { r: 20, hp: 50,  sp: 76,  rotSp: -1.4, xp: 34, tier: 2, sc: 65,  dmg: 18, col: '#ea580c' },
      capsid:  { r: 29, hp: 145, sp: 56,  rotSp: 0.5,  xp: 78, tier: 3, sc: 125, dmg: 26, col: '#9333ea' },
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
      xpTier: d.tier,
      score: d.sc,
      damage: d.dmg,
      color: d.col,
      hitFlash: 0,
      chillTimer: 0,
    });
  }

  function pickWaveEnemyType() {
    const wv = state.wave;
    const r = Math.random();
    if (wv >= 5 && r < 0.16) return 'capsid';
    if (wv >= 3 && r < 0.36) return 'shooter';
    if (wv >= 2 && r < 0.56) return 'mitosis';
    if (wv >= 4 && r < 0.70) return 'microbe';
    if (r < 0.84) return 'corona';
    return 'asteroid_lg';
  }

  function advanceWave() {
    state.wave += 1;
    state.waveKills = 0;
    state.waveTarget = waveQuotaFor(state.wave);
    if (state.wave >= 5) awardAchievementToAll('ap_wave_5');

    if (state.wave % 10 === 0) {
      triggerBossSequence(state.wave);
    } else {
      const title = `WAVE ${state.wave}`;
      const sub = waveSubtitleFor(state.wave);
      showWaveBanner(title, sub);
      room.sendSignal({ type: 'WAVE_BANNER', title, sub });
      // Spawn a fresh wave burst immediately so the wave transition feels clear!
      const burst = Math.min(5, 2 + Math.floor(state.wave / 3));
      for (let i = 0; i < burst; i++) spawnEnemy(pickWaveEnemyType());
    }
    renderHud();
  }

  // ---- CUPHEAD x WOW RAID BOSSES (3 Distinct Phases + Special Abilities Every 10 Waves!) ----
  const BOSS_PROFILES = [
    {
      name: 'BARON CORONA-CHOMP',
      color: '#e11d48',
      intro: 'Toxic Void Pools · Sweeping Mega Laser · Chomp Lunge',
      p2Call: 'PHASE 2 · SWEEPING MEGA LASER UNLOCKED!',
      p3Call: 'FINAL PHASE · TWIN LASERS & VOID STORM!',
    },
    {
      name: 'HYDRA SLIME-QUEEN',
      color: '#65a30d',
      intro: 'Safe-Bubble Shockwave · Bouncing Slime Orbs · Royal Brood',
      p2Call: 'PHASE 2 · SAFE-BUBBLE SHOCKWAVE & BOUNCING SLIMES!',
      p3Call: 'FINAL PHASE · ROYAL SWARM OVERDRIVE!',
    },
    {
      name: 'KING PANDEMIC-REX',
      color: '#ea580c',
      intro: 'Rotating Plasma Cross · Meteor Barrage · Flame Charge',
      p2Call: 'PHASE 2 · ROTATING PLASMA CROSS UNLOCKED!',
      p3Call: 'FINAL PHASE · METEOR CATACLYSM!',
    },
  ];

  function triggerBossSequence(bossWave) {
    state.bossActive = true;
    state.pendingBossWave = bossWave;
    state.bossWarningTimer = 2.6;

    const tier = Math.floor(bossWave / 10);
    const variant = (tier - 1) % 3;
    const prof = BOSS_PROFILES[variant];
    const name = tier > 3 ? `${prof.name} MK-${tier}` : prof.name;
    const sub = `WAVE ${bossWave} RAID BOSS — ${name} (${prof.intro})`;

    bossWarningTitle.textContent = '⚠ RAID BOSS ENCOUNTER!';
    bossWarningSub.textContent = sub;
    bossWarningEl.classList.remove('hidden');
    room.sendSignal({ type: 'BOSS_WARN', sub });
    SFX.bossWarn();
    renderHud();
  }

  function spawnBoss(bossWave) {
    const tier = Math.floor(bossWave / 10);
    const variant = (tier - 1) % 3;
    const prof = BOSS_PROFILES[variant];
    const name = tier > 3 ? `${prof.name} MK-${tier}` : prof.name;
    const coopScale = 1 + Math.max(0, state.players.length - 1) * 0.68;
    const maxHp = Math.round((5600 + (tier - 1) * 4600) * coopScale);

    state.hazards = [];
    state.bossBeams = [];
    state.bossCast = null;

    const boss = {
      type: 'boss',
      isBoss: true,
      variant, tier, name,
      phase: 1,
      phaseInvuln: 0,
      dying: false,
      dyingTimer: 0,
      boomTick: 0,
      x: W * 0.5, y: -100, vx: 0, vy: 0,
      radius: 64,
      hp: maxHp, maxHp,
      speed: 78 + tier * 10,
      rot: 0, rotSpeed: 0.48,
      attackTimer: 1.5,
      minionTimer: 5.5,
      chargeTimer: 6.2,
      chargeTelegraph: null,
      charging: 0, chargeVx: 0, chargeVy: 0, chargeDropTick: 0,
      spiralAngle: 0,
      abilityTimer: 3.2,
      abilityStep: 0,
      beamLockTimer: 0,
      meteorQueue: [],
      xp: 0, score: 1800 * tier, damage: 32,
      color: prof.color,
      hitFlash: 0, chillTimer: 0,
    };

    state.enemies.push(boss);
    bossNameEl.textContent = `WAVE ${bossWave} · ${name} [PHASE 1]`;
    bossBarWrap.classList.remove('hidden');
    updateBossBar(boss);
  }

  function updateBossBar(boss) {
    if (!boss || boss.hp <= 0 || boss.dying) {
      bossBarWrap.classList.add('hidden');
      renderBossCastUI(null);
      return;
    }
    const pct = clamp((boss.hp / boss.maxHp) * 100, 0, 100);
    bossHpFill.style.width = pct.toFixed(1) + '%';
    bossHpText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    const phTag = boss.phase >= 3 ? ' [FINAL PHASE!]' : boss.phase === 2 ? ' [PHASE 2]' : ' [PHASE 1]';
    bossNameEl.textContent = `WAVE ${state.wave} · ${boss.name}${phTag}`;
    renderBossCastUI(state.bossCast);
  }

  // ---- Harder Team Leveling -> PERSONAL Upgrade Drafts (Separate from Waves!) ----
  function addTeamXp(amount) {
    const maxMag = Math.max(0, ...state.players.map((p) => p.upgrades.magnet_core || 0));
    const mult = 1 + maxMag * 0.15;
    state.xp += amount * mult;

    while (state.xp >= state.xpNeeded) {
      state.xp -= state.xpNeeded;
      state.level += 1;
      if (state.level >= 10) awardAchievementToAll('ap_level_10');
      // Steeper, more rewarding XP curve so gaining levels feels earned
      state.xpNeeded = Math.round(140 + state.level * 85 + Math.pow(state.level, 1.65) * 20);
      SFX.levelUp();
      state.pendingDrafts.push({ isBossReward: false, level: state.level });
    }

    // Don't interrupt the Boss XP fountain until it finishes sucking into players
    if (state.pendingDrafts.length > 0 && state.mode === 'playing' && state.bossRewardDelay <= 0) {
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

  function resendPendingDrafts() {
    if (!room.isHost || state.mode !== 'upgrade' || !state.activeDraftMeta) return;
    const { draftId, isBoss, eyebrow, title, sub } = state.activeDraftMeta;
    for (const p of state.players) {
      if (p.isLocal) continue;
      const entry = state.activeDraftMap[p.id];
      if (!entry || entry.picked || !entry.choices || entry.choices.length === 0) continue;
      room.sendToPlayer(p.id, {
        type: 'PERSONAL_DRAFT',
        draftId,
        isBoss,
        eyebrow,
        title,
        sub,
        choiceIds: entry.choices.map((c) => c.id),
        myUpgrades: p.upgrades,
      });
    }
  }

  function openNextPersonalDraft() {
    if (!room.isHost || state.pendingDrafts.length === 0) return;
    const req = state.pendingDrafts.shift();
    clearTouchSteer();
    state.mode = 'upgrade';
    state.draftIsBoss = req.isBossReward;
    state.activeDraftMap = {};
    state.localDraftQueue = [];
    state.draftSeq += 1;
    const draftId = state.draftSeq;

    const eyebrow = req.isBossReward
      ? `Boss Defeated · Extra Bonus (${req.bonusIndex || 1}/${req.bonusTotal || 2})!`
      : `Team Level ${req.level}!`;
    const title = req.isBossReward
      ? `Boss Bonus Upgrade ${req.bonusIndex || 1} of ${req.bonusTotal || 2}`
      : 'Upgrade Your Personal UFO';
    const sub = req.isBossReward
      ? 'Boss Victory grants 2 Personal Bonus Upgrades + Full Hull Repair!'
      : 'Every pilot chooses their own personal UFO upgrade!';

    state.activeDraftMeta = { draftId, isBoss: req.isBossReward, eyebrow, title, sub };

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
          draftId,
          isBoss: req.isBossReward,
          eyebrow,
          title,
          sub,
          choiceIds: choices.map((c) => c.id),
          myUpgrades: p.upgrades,
        });
      }
    }

    upgradeOverlay.scrollTop = 0;
    showNextLocalDraft(eyebrow, title, sub);
    checkAllDraftsPicked();
  }

  function renderTvDraftStatus(eyebrow, title) {
    draftEyebrow.textContent = eyebrow || `Team Level ${state.level}!`;
    draftTitle.textContent = room.tvMode ? '📱 Check Your Phones to Upgrade!' : (title || 'Upgrade Locked In!');
    draftSub.textContent = room.tvMode
      ? 'Each pilot picks their personal UFO upgrade on their own phone!'
      : 'Waiting for teammates to lock in their upgrades...';
    upgradeGrid.innerHTML = '';
    if (draftHintFooter) draftHintFooter.classList.toggle('hidden', Boolean(room.tvMode));

    const { ready, total } = countDraftReady();
    if (room.tvMode) {
      const pills = state.players
        .map((pl) => {
          const done = state.activeDraftMap[pl.id] && state.activeDraftMap[pl.id].picked;
          return `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;margin:4px;border-radius:999px;background:${done ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.75)'};border:2px solid ${done ? '#4ade80' : pl.color};color:#f8fafc;font-weight:700;">${done ? '✓' : '⏳'} ${escapeHtml(pl.name)}</span>`;
        })
        .join('');
      draftWaitingEl.innerHTML = `<div style="margin-bottom:6px;">Pilots Ready: <strong>${ready} / ${total}</strong></div><div>${pills}</div>`;
    } else {
      draftWaitingEl.textContent = `Your UFO upgrade is locked in! Waiting for teammates (${ready}/${total} ready)...`;
    }
    draftWaitingEl.classList.remove('hidden');
    upgradeOverlay.classList.remove('hidden');
  }

  function showNextLocalDraft(eyebrow, title, sub) {
    const nextLocalId = state.localDraftQueue.find(
      (pid) => state.activeDraftMap[pid] && !state.activeDraftMap[pid].picked
    );
    if (!nextLocalId) {
      state.myDraftPicked = true;
      renderTvDraftStatus(eyebrow, title);
      return;
    }

    if (draftHintFooter) draftHintFooter.classList.remove('hidden');
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
      state.myDraftPickIdx = idx;
      state.myDraftPickedAt = Date.now();
      SFX.xp();
      upgradeGrid.innerHTML = '';
      draftWaitingEl.textContent = 'Your UFO upgrade is locked in! Waiting for teammates...';
      draftWaitingEl.classList.remove('hidden');
      room.sendSignal({ type: 'PERSONAL_PICK', idx, draftId: state.activeDraftId });
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
      renderTvDraftStatus(draftEyebrow.textContent, draftTitle.textContent);
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
      if (e.dying) continue;
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
    p.muzzleFlash = 0.09;
    p.fireKick = 0.085;
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
    p.fireKick = 0.12;
    p.muzzleFlash = 0.12;

    const dx = x2 - p.x;
    const dy = y2 - p.y;
    const lenSq = dx * dx + dy * dy;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.dying) continue;
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
    p.fireKick = 0.09;
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
        if (hitSet.has(e) || e.hp <= 0 || e.dying) continue;
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

    let blockedCount = 0;
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      if (dist(p.x, p.y, b.x, b.y) <= maxR) {
        spawnParticles(b.x, b.y, '#38bdf8', 5, 110, 3, 'star');
        state.enemyBullets.splice(i, 1);
        blockedCount++;
      }
    }
    if (blockedCount > 0) {
      p.shieldFlash = 0.36;
      state.novas.push({ x: p.x, y: p.y, r: 24, maxR: 54, color: '#7dd3fc', life: 0.25, maxLife: 0.25 });
      spawnFloatText(p.x, p.y - 38, blockedCount > 1 ? `SHIELDED x${blockedCount}!` : 'SHIELDED!', '#7dd3fc');
      SFX.shield();
    }
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.dying) continue;
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

  // ---- Enemy Damage & Death (With Hit-Confirm Animations, 3-Phase Raid Shifts & Boss Finale!) ----
  function triggerBossPhaseShift(e, nextPhase) {
    e.phase = nextPhase;
    e.phaseInvuln = 1.05;
    e.speed *= nextPhase === 2 ? 1.18 : 1.22;
    e.chargeTelegraph = null;
    e.charging = 0;
    e.abilityTimer = 1.35; // Immediately showcase newly unlocked phase ability!
    state.enemyBullets = [];
    state.shake = 16;

    // Gentle shockwave push so players see the phase transformation clearly
    state.novas.push({ x: e.x, y: e.y, r: 30, maxR: 260, color: nextPhase === 3 ? '#ef4444' : '#fde047', life: 0.55, maxLife: 0.55 });
    spawnCartoonBurst(e.x, e.y, nextPhase === 3 ? '#fde047' : '#fb7185', true);
    for (const pl of state.players) {
      if (pl.downed) continue;
      const d = dist(e.x, e.y, pl.x, pl.y) || 1;
      if (d < 220) {
        pl.vx += ((pl.x - e.x) / d) * 320;
        pl.vy += ((pl.y - e.y) / d) * 320;
      }
    }

    const prof = BOSS_PROFILES[e.variant] || BOSS_PROFILES[0];
    const bannerTitle = nextPhase === 2 ? `${e.name} · PHASE 2!` : `${e.name} · FINAL PHASE!`;
    const bannerSub = nextPhase === 2 ? prof.p2Call : prof.p3Call;
    showWaveBanner(bannerTitle, bannerSub);
    room.sendSignal({ type: 'WAVE_BANNER', title: bannerTitle, sub: bannerSub });
    spawnFloatText(e.x, e.y - 76, nextPhase === 2 ? 'PHASE 2!!' : 'FINAL PHASE!!', '#fde047');
    SFX.phaseShift();
  }

  function damageEnemy(e, baseDmg, color = '#f8fafc', sourcePlayer = null, hitX = null, hitY = null) {
    if (e.hp <= 0 || e.dying) return;
    if (e.isBoss && e.phaseInvuln > 0) {
      // Brief phase-shift barrier deflects hits with a clear cartoon spark
      const ix = hitX !== null ? hitX : e.x;
      const iy = hitY !== null ? hitY : e.y;
      spawnParticles(ix, iy, '#fde047', 2, 120, 2.5, 'star');
      return;
    }

    let { dmg, isCrit } = rollPlayerDamage(sourcePlayer, baseDmg);

    // Boss burst-armor cap so bosses are real battles and never insta-melt
    if (e.isBoss) {
      const maxHit = Math.max(40, Math.round(e.maxHp * 0.03));
      dmg = Math.min(dmg, maxHit);
    }

    const dealt = Math.min(e.hp, dmg);
    e.hp -= dmg;
    e.hitFlash = 0.11;
    e.hitBounce = 0.24;

    // Expressive hit-confirm animation where the attack lands!
    const ix = hitX !== null ? hitX : e.x + rand(-e.radius * 0.35, e.radius * 0.35);
    const iy = hitY !== null ? hitY : e.y + rand(-e.radius * 0.35, e.radius * 0.35);
    state.novas.push({
      x: ix,
      y: iy,
      r: 3,
      maxR: isCrit ? 30 : e.isBoss ? 24 : 18,
      color: isCrit ? '#fde047' : color,
      life: 0.14,
      maxLife: 0.14,
    });
    spawnParticles(ix, iy, isCrit ? '#fde047' : color, isCrit ? 6 : 3, isCrit ? 190 : 135, isCrit ? 3.8 : 2.6, 'star');

    // Subtle cartoon knockback nudge so enemies visibly react when hit
    if (sourcePlayer && !e.isBoss && !e.type.startsWith('asteroid')) {
      const d = dist(sourcePlayer.x, sourcePlayer.y, e.x, e.y) || 1;
      e.vx += ((e.x - sourcePlayer.x) / d) * 32;
      e.vy += ((e.y - sourcePlayer.y) / d) * 32;
    }

    if (sourcePlayer) {
      sourcePlayer.damage += dealt;
      if ((sourcePlayer.upgrades.cryo_rounds || 0) > 0) {
        e.chillTimer = 2.2;
        e.chillPower = Math.min(0.55, 0.18 + sourcePlayer.upgrades.cryo_rounds * 0.1);
      }
    }

    // 3-Phase WoW/Cuphead Boss Transitions at 66.6% and 33.3% HP!
    if (e.isBoss && e.hp > 0) {
      if (e.phase === 1 && e.hp <= e.maxHp * 0.666) {
        e.hp = Math.max(e.hp, Math.ceil(e.maxHp * 0.666));
        triggerBossPhaseShift(e, 2);
      } else if (e.phase === 2 && e.hp <= e.maxHp * 0.333) {
        e.hp = Math.max(e.hp, Math.ceil(e.maxHp * 0.333));
        triggerBossPhaseShift(e, 3);
      }
    }

    if (isCrit || e.isBoss) {
      spawnFloatText(e.x + rand(-10, 10), e.y - e.radius * 0.6, isCrit ? `POW! ${dmg}!` : `${dmg}`, isCrit ? '#fde047' : color);
    }
    if (e.isBoss) updateBossBar(e);

    if (e.hp <= 0) {
      if (e.isBoss) {
        // Trigger satisfying multi-explosion cartoon Boss Death Sequence!
        e.hp = 0;
        e.dying = true;
        e.dyingTimer = 2.15;
        e.boomTick = 0;
        e.chargeTelegraph = null;
        state.enemyBullets = [];
        state.hazards = [];
        state.bossBeams = [];
        state.bossCast = null;
        state.shake = 16;
        bossBarWrap.classList.add('hidden');
        renderBossCastUI(null);
        spawnCartoonBurst(e.x, e.y, '#fde047', true);
        spawnFloatText(e.x, e.y - 72, `${e.name} DEFEATED!!`, '#fde047');
        SFX.bossBoom();
      } else {
        killEnemy(e);
      }
    } else {
      SFX.hit();
    }
  }

  const COMIC_WORDS = ['POP!', 'ZAP!', 'BAM!', 'POW!', 'BOING!', 'SPLAT!'];

  function finishBossDeath(e) {
    const idx = state.enemies.indexOf(e);
    if (idx !== -1) state.enemies.splice(idx, 1);

    state.kills += 1;
    state.score += e.score;
    state.bossActive = false;
    state.bossesDefeated += 1;
    state.shake = 26;
    state.enemyBullets = [];
    bossBarWrap.classList.add('hidden');

    // Grand finale explosion + golden shockwaves!
    spawnCartoonBurst(e.x, e.y, e.color, true);
    spawnCartoonBurst(e.x + rand(-35, 35), e.y + rand(-35, 35), '#fde047', true);
    spawnCartoonBurst(e.x + rand(-35, 35), e.y + rand(-35, 35), '#f472b6', true);
    state.novas.push({ x: e.x, y: e.y, r: 22, maxR: 280, color: '#fde047', life: 0.65, maxLife: 0.65 });
    state.novas.push({ x: e.x, y: e.y, r: 10, maxR: 210, color: '#f472b6', life: 0.52, maxLife: 0.52 });
    spawnFloatText(e.x, e.y - 24, 'KABOOM!! +2 BONUS UPGRADES!', '#fde047');
    SFX.bossDead();

    // Erupt a joyful fountain of glowing Boss XP orbs that vacuum straight into players!
    const orbCount = 26;
    const perOrbXp = Math.round(16 + (e.tier || 1) * 7);
    for (let k = 0; k < orbCount; k++) {
      const a = (k / orbCount) * Math.PI * 2 + rand(-0.18, 0.18);
      const sp = rand(180, 420);
      state.pickups.push({
        kind: 'xp',
        tier: 4,
        autoMagnet: true,
        magnetDelay: rand(0.18, 0.55),
        x: e.x + Math.cos(a) * 18,
        y: e.y + Math.sin(a) * 18,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        value: perOrbXp,
        life: 20,
        pulling: false,
      });
    }

    // Full Hull Repair & Revive all pilots!
    state.players.forEach((p) => {
      p.downed = false;
      p.reviveProgress = 0;
      p.hp = p.maxHp;
      p.invuln = 2.6;
      p.shieldFlash = 0.5;
    });

    // Grant TWO Boss Bonus Personal Upgrades after the XP fountain sweeps into players!
    state.pendingDrafts.push({ isBossReward: true, bonusIndex: 1, bonusTotal: 2, level: state.level });
    state.pendingDrafts.push({ isBossReward: true, bonusIndex: 2, bonusTotal: 2, level: state.level });
    state.bossRewardDelay = 1.7;

    // Advance cleanly past the Boss Wave
    awardAchievementToAll('ap_boss_slayer');
    state.wave += 1;
    state.waveKills = 0;
    state.waveTarget = waveQuotaFor(state.wave);
    renderHud();
  }

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
      finishBossDeath(e);
      return;
    }

    SFX.pop();
    const xpTier = e.xpTier || 1;
    state.pickups.push({
      kind: 'xp',
      tier: xpTier,
      x: e.x,
      y: e.y,
      vx: rand(-45, 45),
      vy: rand(-45, 45),
      value: e.xp,
      life: 18,
      pulling: false,
    });
    if (Math.random() < 0.05) {
      state.pickups.push({
        kind: 'heal',
        tier: 1,
        x: e.x + rand(-10, 10),
        y: e.y + rand(-10, 10),
        vx: rand(-25, 25),
        vy: rand(-25, 25),
        value: 26,
        life: 16,
        pulling: false,
      });
    }

    // Track Wave kills independently of Team Level!
    if (!state.bossActive) {
      state.waveKills += 1;
      if (state.waveKills >= state.waveTarget) {
        advanceWave();
      }
    }
  }

  // ---- Player Damage, Shielding & Game Over ----
  function hurtPlayer(p, amount) {
    if (p.downed) return;
    // Clear cartoon Shield-Dodge animation when phasing through an attack during Dash!
    if (p.dashTimer > 0) {
      p.shieldFlash = 0.34;
      state.novas.push({ x: p.x, y: p.y, r: 14, maxR: 46, color: '#7dd3fc', life: 0.24, maxLife: 0.24 });
      spawnParticles(p.x, p.y, '#7dd3fc', 7, 150, 3.2, 'star');
      spawnFloatText(p.x, p.y - 34, 'DODGED!', '#7dd3fc');
      SFX.shield();
      return;
    }
    if (p.invuln > 0) return;

    // Armor plating gives a clear visual shield absorption flash + 10% damage reduction per level
    const armorLv = p.upgrades.hull_plating || 0;
    let finalAmt = amount;
    if (armorLv > 0) {
      const reduced = Math.max(4, Math.round(amount * Math.max(0.55, 1 - armorLv * 0.1)));
      const saved = amount - reduced;
      finalAmt = reduced;
      p.shieldFlash = 0.32;
      state.novas.push({ x: p.x, y: p.y, r: 16, maxR: 48, color: '#38bdf8', life: 0.24, maxLife: 0.24 });
      if (saved > 0) {
        spawnFloatText(p.x, p.y - 46, `SHIELD -${saved}`, '#7dd3fc');
      }
    }

    p.hp = Math.max(0, p.hp - finalAmt);
    p.invuln = 0.85;
    p.hurtRecoil = 0.34;
    state.shake = Math.max(state.shake, 11);
    if (p.id === room.myId) {
      state.hurtVignette = Math.min(0.75, Math.max(state.hurtVignette, 0.52));
    }

    // Dramatic red impact ring + cartoon sparks + OUCH text!
    state.novas.push({ x: p.x, y: p.y, r: 10, maxR: 56, color: '#ef4444', life: 0.28, maxLife: 0.28 });
    spawnCartoonBurst(p.x, p.y, '#ef4444', false);
    spawnFloatText(p.x, p.y - 30, `OUCH! -${finalAmt}`, '#fb7185');
    SFX.hurt();

    if (p.hp <= 0) {
      p.downed = true;
      p.reviveProgress = 0;
      spawnCartoonBurst(p.x, p.y, '#fb7185', true);
      if (state.players.length >= 2) {
        spawnFloatText(p.x, p.y - 32, `${p.name} DOWN! FLY NEAR TO REVIVE`, '#fb7185');
        spawnPlayerPing(p.id, true);
        room.sendSignal({ type: 'PING_FX', playerId: p.id, isRess: true });
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
      wave: state.wave,
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
    sumLevel.textContent = `W${state.wave} / Lv${state.level}`;
    sumScore.textContent = state.score.toLocaleString();
    sumBosses.textContent = String(state.bossesDefeated);
    gameoverSub.textContent =
      state.bossesDefeated > 0
        ? `Your UFO squad reached Wave ${state.wave} (Level ${state.level}) and purged ${state.bossesDefeated} space virus boss${state.bossesDefeated > 1 ? 'es' : ''}!`
        : `Your UFO squad reached Wave ${state.wave} (Level ${state.level}) and purged ${state.kills} space viruses.`;

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

    const canRestart = room.isHost || isCouchCaptain();
    btnPlayAgain.disabled = !canRestart;
    btnPlayAgain.textContent = room.isHost
      ? 'Play Again'
      : canRestart
        ? '▶ Play Again on TV!'
        : room.roomHasTv
          ? 'Waiting for Captain / TV...'
          : 'Waiting for Host...';
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
        if (state.pendingBossWave !== null) {
          spawnBoss(state.pendingBossWave);
          state.pendingBossWave = null;
        }
      }
    }

    // Wait briefly while Boss XP fountain gets sucked into players before opening the 2x Bonus Upgrade Draft!
    if (state.bossRewardDelay > 0) {
      state.bossRewardDelay -= dt;
      const anyBossXpLeft = state.pickups.some((pk) => pk.autoMagnet);
      if (state.bossRewardDelay <= 0 || (!anyBossXpLeft && state.bossRewardDelay < 1.25)) {
        state.bossRewardDelay = 0;
        if (state.pendingDrafts.length > 0 && state.mode === 'playing') {
          openNextPersonalDraft();
          return;
        }
      }
    }

    // Spawner (Wave-scaled & Action-Packed)
    state.spawnTimer -= dt;
    const bossDying = state.enemies.some((e) => e.isBoss && e.dying);
    const maxEnemies = state.bossActive ? 12 : Math.min(42, 11 + state.wave * 2 + state.players.length * 3);
    if (state.spawnTimer <= 0 && state.bossWarningTimer <= 0 && !bossDying && state.bossRewardDelay <= 0 && state.enemies.length < maxEnemies) {
      const type = pickWaveEnemyType();
      if (type === 'microbe') {
        const base = edgeSpawnPos();
        for (let k = 0; k < 4; k++) {
          spawnEnemy('microbe', { x: base.x + rand(-24, 24), y: base.y + rand(-24, 24) });
        }
      } else {
        spawnEnemy(type);
      }
      const baseInterval = state.bossActive ? 2.4 : Math.max(0.32, 1.38 - state.wave * 0.055);
      state.spawnTimer = baseInterval / (1 + (state.players.length - 1) * 0.25);
    }

    // Update Players
    for (const p of state.players) {
      if (p.invuln > 0) p.invuln -= dt;
      if (p.muzzleFlash > 0) p.muzzleFlash = Math.max(0, p.muzzleFlash - dt);
      if (p.fireKick > 0) p.fireKick = Math.max(0, p.fireKick - dt);
      if (p.hurtRecoil > 0) p.hurtRecoil = Math.max(0, p.hurtRecoil - dt);
      if (p.shieldFlash > 0) p.shieldFlash = Math.max(0, p.shieldFlash - dt);
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
            p.shieldFlash = 0.45;
            spawnCartoonBurst(p.x, p.y, p.glow, false);
            spawnFloatText(p.x, p.y - 26, 'REVIVED!', '#5eead4');
            if (helper && helper.id) room.awardPlayerAchievement(helper.id, 'ap_team_revive');
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
        p.shieldFlash = 0.22;
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
        if (moveMag > 0.05) {
          // Crisp, responsive target-velocity steering (fast turns, zero ice-skating drift!)
          const targetVx = moveX * maxSpeed;
          const targetVy = moveY * maxSpeed;
          const turnRate = 1 - Math.exp(-15.5 * dt);
          p.vx += (targetVx - p.vx) * turnRate;
          p.vy += (targetVy - p.vy) * turnRate;
        } else {
          // Clean, predictable brake on release so you stop right where you want
          const stopDrag = Math.pow(0.04, dt);
          p.vx *= stopDrag;
          p.vy *= stopDrag;
          if (Math.hypot(p.vx, p.vy) < 6) {
            p.vx = 0;
            p.vy = 0;
          }
        }
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
      const hasLiveEnemies = state.enemies.some((e) => !e.dying);
      p.fireTimer -= dt;
      const pulseInterval = Math.max(0.11, 0.24 - ((p.upgrades.pulse_cannon || 1) - 1) * 0.025);
      if (((state.autoFire && hasLiveEnemies) || inp.fire) && p.fireTimer <= 0) {
        firePulseCannon(p);
        p.fireTimer = pulseInterval;
      }

      if (p.upgrades.plasma_rail > 0) {
        p.railTimer -= dt;
        if (p.railTimer <= 0 && hasLiveEnemies) {
          firePlasmaRail(p);
          p.railTimer = Math.max(1.3, 3.3 - p.upgrades.plasma_rail * 0.35);
        }
      }

      if (p.upgrades.homing_missiles > 0) {
        p.missileTimer -= dt;
        if (p.missileTimer <= 0 && hasLiveEnemies) {
          fireHomingMissiles(p);
          p.missileTimer = Math.max(1.2, 2.7 - p.upgrades.homing_missiles * 0.25);
        }
      }

      if (p.upgrades.chain_lightning > 0) {
        p.teslaTimer -= dt;
        if (p.teslaTimer <= 0 && hasLiveEnemies) {
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
            if (e.dying) continue;
            if (dist(ox, oy, e.x, e.y) < e.radius + 17) {
              if (!e._orbCd || state.time - e._orbCd > 0.2) {
                e._orbCd = state.time;
                const hitX = (ox + e.x) * 0.5;
                const hitY = (oy + e.y) * 0.5;
                // Animated cartoon star-slash hit burst!
                state.novas.push({
                  x: hitX, y: hitY, r: 5, maxR: 36,
                  color: '#fde047', life: 0.2, maxLife: 0.2,
                });
                spawnParticles(hitX, hitY, '#fde047', 7, 210, 4.2, 'star');
                spawnParticles(hitX, hitY, '#ffffff', 4, 140, 5.5, 'puff');
                SFX.slice();
                damageEnemy(e, 16 + p.upgrades.orbital_blades * 6, '#fde047', p, hitX, hitY);
              }
            }
          }
          for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const b = state.enemyBullets[i];
            if (dist(ox, oy, b.x, b.y) < b.radius + 17) {
              p.shieldFlash = 0.26;
              state.novas.push({ x: b.x, y: b.y, r: 4, maxR: 26, color: '#7dd3fc', life: 0.18, maxLife: 0.18 });
              spawnParticles(b.x, b.y, '#7dd3fc', 6, 125, 3.2, 'star');
              if (Math.random() < 0.35) spawnFloatText(b.x, b.y - 12, 'BLOCKED!', '#7dd3fc');
              SFX.shield();
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
            if (e.dying) continue;
            const t = clamp(((e.x - p1.x) * dx + (e.y - p1.y) * dy) / lenSq, 0, 1);
            if (dist(p1.x + t * dx, p1.y + t * dy, e.x, e.y) <= e.radius + 9) {
              if (!e._tetherCd || state.time - e._tetherCd > 0.16) {
                e._tetherCd = state.time;
                damageEnemy(e, 14 + tetherLv * 8, '#fcd34d', owner, p1.x + t * dx, p1.y + t * dy);
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
        if (e.dying) continue;
        if (dist(b.x, b.y, e.x, e.y) <= b.radius + e.radius) {
          const owner = state.players.find((pl) => pl.id === b.ownerId) || null;
          damageEnemy(e, b.damage, b.color, owner, b.x, b.y);
          spawnParticles(b.x, b.y, b.color, b.kind === 'missile' ? 8 : 5, b.kind === 'missile' ? 165 : 115, b.kind === 'missile' ? 4 : 2.8, 'puff');
          state.bullets.splice(i, 1);
          break;
        }
      }
    }

    // Update Enemies
    const livingPlayers = state.players.filter((p) => !p.downed);
    // Solid Teammate <-> Teammate Collision (cannot fly through each other!)
    for (let a = 0; a < livingPlayers.length; a++) {
      for (let b = a + 1; b < livingPlayers.length; b++) {
        const p1 = livingPlayers[a];
        const p2 = livingPlayers[b];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const minDist = p1.radius + p2.radius + 4;
        if (d < minDist) {
          const nx = dx / d;
          const ny = dy / d;
          const overlap = (minDist - d) * 0.52;
          p1.x = clamp(p1.x - nx * overlap, 24, W - 24);
          p1.y = clamp(p1.y - ny * overlap, 24, H - 24);
          p2.x = clamp(p2.x + nx * overlap, 24, W - 24);
          p2.y = clamp(p2.y + ny * overlap, 24, H - 24);
          // Playful cartoon bumper bounce
          const relVn = (p2.vx - p1.vx) * nx + (p2.vy - p1.vy) * ny;
          if (relVn < 0) {
            const imp = -relVn * 0.65 + 45;
            p1.vx -= nx * imp;
            p1.vy -= ny * imp;
            p2.vx += nx * imp;
            p2.vy += ny * imp;
          }
        }
      }
    }

    function getCollisionDamage(enemy, player) {
      let pct = 0.15;
      if (enemy.isBoss) pct = 0.50;
      else if (enemy.type === 'capsid') pct = 0.30;
      else if (enemy.type === 'asteroid_lg') pct = 0.26;
      else if (enemy.type === 'asteroid_md' || enemy.type === 'mitosis' || enemy.type === 'shooter') pct = 0.18;
      else if (enemy.type === 'corona') pct = 0.15;
      else if (enemy.type === 'asteroid_sm' || enemy.type === 'microbe') pct = 0.10;
      return Math.max(8, Math.round(player.maxHp * pct));
    }

    const BOSS_BOOM_WORDS = ['BOOM!', 'POW!', 'CRACK!', 'KRAKOOM!', 'ZAP!'];

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hitBounce > 0) e.hitBounce = Math.max(0, e.hitBounce - dt);
      if (e.chillTimer > 0) e.chillTimer -= dt;

      // Satisfying Multi-Explosion Cartoon Boss Death Sequence!
      if (e.isBoss && e.dying) {
        e.dyingTimer -= dt;
        e.boomTick -= dt;
        e.rot += 5.5 * dt;
        e.hitFlash = Math.floor(state.time * 18) % 2 === 0 ? 0.08 : 0;
        if (e.boomTick <= 0) {
          e.boomTick = 0.17;
          const bx = e.x + rand(-e.radius * 0.85, e.radius * 0.85);
          const by = e.y + rand(-e.radius * 0.85, e.radius * 0.85);
          spawnCartoonBurst(bx, by, Math.random() < 0.5 ? '#fde047' : e.color, false);
          state.novas.push({ x: bx, y: by, r: 6, maxR: 54, color: '#fde047', life: 0.24, maxLife: 0.24 });
          state.shake = Math.max(state.shake, 10);
          if (Math.random() < 0.55) {
            const w = BOSS_BOOM_WORDS[Math.floor(Math.random() * BOSS_BOOM_WORDS.length)];
            spawnFloatText(bx, by - 14, w, '#fde047');
          }
          SFX.bossBoom();
        }
        if (e.dyingTimer <= 0) {
          finishBossDeath(e);
        }
        continue;
      }

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
            e.fireTimer = Math.max(1.05, 2.2 - state.wave * 0.045);
          }
        } else {
          e.vx += (Math.cos(ang) * e.speed - e.vx) * dt * 2.6;
          e.vy += (Math.sin(ang) * e.speed - e.vy) * dt * 2.6;
        }
        e.x += e.vx * slow * dt;
        e.y += e.vy * slow * dt;
      }

      // Solid Player <-> Enemy Collision (never pass through enemies, asteroids, or bosses!)
      for (const p of livingPlayers) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const minDist = e.radius + p.radius;
        if (d < minDist) {
          const nx = dx / d;
          const ny = dy / d;
          const overlap = minDist - d + 1.5;

          if (e.isBoss) {
            // Boss is immovable: push UFO cleanly out + strong bounce
            p.x = clamp(p.x + nx * overlap, 24, W - 24);
            p.y = clamp(p.y + ny * overlap, 24, H - 24);
            p.vx = nx * 380;
            p.vy = ny * 380;
          } else {
            // Push both apart so neither overlaps
            p.x = clamp(p.x + nx * overlap * 0.72, 24, W - 24);
            p.y = clamp(p.y + ny * overlap * 0.72, 24, H - 24);
            e.x -= nx * overlap * 0.28;
            e.y -= ny * overlap * 0.28;
            p.vx = nx * 270;
            p.vy = ny * 270;
            e.vx = -nx * 190;
            e.vy = -ny * 190;
          }

          if (p.invuln <= 0 && p.dashTimer <= 0) {
            const colDmg = getCollisionDamage(e, p);
            hurtPlayer(p, colDmg);
          }
        }
      }
    }

    // Enemy Bullets (Including Cuphead Bouncing Slime Orbs!)
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.bounces > 0) {
        let bounced = false;
        if (b.x < b.radius + 6 && b.vx < 0) { b.x = b.radius + 6; b.vx = -b.vx; bounced = true; }
        else if (b.x > W - b.radius - 6 && b.vx > 0) { b.x = W - b.radius - 6; b.vx = -b.vx; bounced = true; }
        if (b.y < b.radius + 6 && b.vy < 0) { b.y = b.radius + 6; b.vy = -b.vy; bounced = true; }
        else if (b.y > H - b.radius - 6 && b.vy > 0) { b.y = H - b.radius - 6; b.vy = -b.vy; bounced = true; }
        if (bounced) {
          b.bounces -= 1;
          spawnParticles(b.x, b.y, b.color || '#a3e635', 5, 110, 3.2, 'puff');
        }
      }

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

    // Update Cuphead / WoW Raid Boss Hazards (Void Zones, Meteors, Safe Bubbles, Puddles) & Sweeping Beams!
    updateBossHazardsAndBeams(dt, livingPlayers);

    // Pickups (Tiered XP Gems + Boss Super-Magnet Vacuum + Absorption Burst!)
    const XP_TIER_COLORS = ['#38bdf8', '#38bdf8', '#4ade80', '#fbbf24', '#f472b6'];
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const pk = state.pickups[i];
      pk.life -= dt;
      if (pk.life <= 0) { state.pickups.splice(i, 1); continue; }
      if (pk.magnetDelay > 0) pk.magnetDelay -= dt;
      pk.vx *= Math.pow(pk.autoMagnet && pk.magnetDelay > 0 ? 0.3 : 0.08, dt);
      pk.vy *= Math.pow(pk.autoMagnet && pk.magnetDelay > 0 ? 0.3 : 0.08, dt);

      const superPull = pk.autoMagnet && (!pk.magnetDelay || pk.magnetDelay <= 0);
      let nearest = null;
      let bestD = Infinity;
      for (const p of livingPlayers) {
        const pMag = superPull ? Infinity : 120 * (1 + (p.upgrades.magnet_core || 0) * 0.45);
        const d = dist(pk.x, pk.y, p.x, p.y);
        if (d < pMag && d < bestD) { bestD = d; nearest = p; }
      }
      if (nearest) {
        pk.pulling = true;
        const ang = Math.atan2(nearest.y - pk.y, nearest.x - pk.x);
        const pullForce = superPull ? 980 * dt * 5.2 : 540 * dt * 4.5;
        pk.vx += Math.cos(ang) * pullForce;
        pk.vy += Math.sin(ang) * pullForce;
        if (bestD < nearest.radius + (superPull ? 22 : 16)) {
          const tier = pk.tier || 1;
          const orbColor = pk.kind === 'xp' ? (XP_TIER_COLORS[tier] || '#38bdf8') : '#4ade80';
          state.novas.push({
            x: nearest.x, y: nearest.y, r: 8,
            maxR: pk.kind === 'xp' ? (36 + tier * 8) : 56,
            color: orbColor, life: 0.26, maxLife: 0.26,
          });
          spawnParticles(nearest.x, nearest.y, orbColor, pk.kind === 'xp' ? (7 + tier * 2) : 16, 165, tier >= 3 ? 4 : 3, tier >= 3 ? 'star' : 'dot');

          if (pk.kind === 'xp') {
            addTeamXp(pk.value);
            if (tier >= 3) spawnFloatText(nearest.x, nearest.y - 24, `+${pk.value} XP!`, orbColor);
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
    if (state.myPingCooldown > 0) state.myPingCooldown = Math.max(0, state.myPingCooldown - dt);
    if (state.hurtVignette > 0) state.hurtVignette = Math.max(0, state.hurtVignette - dt * 1.35);
    if (!room.isHost && state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);

    // Keep active radar pings locked onto moving UFOs
    for (let i = state.pings.length - 1; i >= 0; i--) {
      const pg = state.pings[i];
      pg.timer -= dt;
      const liveP = state.players.find((pl) => pl.id === pg.playerId);
      if (liveP) {
        pg.x = liveP.x;
        pg.y = liveP.y;
        pg.name = liveP.name;
        pg.color = liveP.color;
        pg.glow = liveP.glow;
        pg.slot = liveP.slot;
      }
      if (pg.timer <= 0) state.pings.splice(i, 1);
    }

    // Guest-side Boss dying fireworks so teammates see the full cartoon explosion show!
    if (!room.isHost && state.mode === 'playing') {
      for (const e of state.enemies) {
        if (e.isBoss && e.dying && Math.random() < dt * 7) {
          const bx = e.x + rand(-e.radius * 0.85, e.radius * 0.85);
          const by = e.y + rand(-e.radius * 0.85, e.radius * 0.85);
          spawnCartoonBurst(bx, by, Math.random() < 0.5 ? '#fde047' : e.color, false);
          state.shake = Math.max(state.shake, 7);
          SFX.bossBoom();
        }
      }
    }

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

  // ---- CUPHEAD x WOW RAID BOSS ABILITIES & HAZARD ENGINE ----
  function spawnBossVoidZones(boss, count) {
    const living = state.players.filter((p) => !p.downed);
    const delay = boss.phase >= 3 ? 1.15 : 1.38;
    for (let k = 0; k < count; k++) {
      let hx, hy;
      if (k < living.length) {
        const lp = living[k];
        hx = clamp(lp.x + (lp.vx || 0) * 0.35 + rand(-36, 36), 80, W - 80);
        hy = clamp(lp.y + (lp.vy || 0) * 0.35 + rand(-36, 36), 95, H - 80);
      } else {
        hx = rand(90, W - 90);
        hy = rand(110, H - 90);
      }
      state.hazards.push({
        kind: 'void',
        x: hx,
        y: hy,
        r: boss.phase >= 3 ? 66 : 58,
        timer: delay,
        maxTimer: delay,
        damage: 24 + boss.tier * 4,
      });
    }
    state.bossCast = { label: '☠ TOXIC VOID POOLS — MOVE OUT!', progress: 0, safe: false, timer: delay, maxTimer: delay };
    SFX.laserCharge();
  }

  function startBossLaserSweep(boss, target, twin = false) {
    const baseAng = target ? Math.atan2(target.y - boss.y, target.x - boss.x) : rand(0, Math.PI * 2);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const startAng = baseAng - dir * 0.92;
    const telegraph = boss.phase >= 3 ? 1.05 : 1.25;
    const active = boss.phase >= 3 ? 2.15 : 1.85;
    const rotSpeed = dir * (boss.phase >= 3 ? 1.05 : 0.92);
    const len = Math.max(W, H) * 1.15;
    const beamCount = twin ? 2 : 1;

    for (let k = 0; k < beamCount; k++) {
      state.bossBeams.push({
        ownerBoss: boss,
        x: boss.x,
        y: boss.y,
        angle: startAng + k * Math.PI,
        rotSpeed,
        len,
        width: 22,
        telegraph,
        maxTelegraph: telegraph,
        activeTimer: active,
        damage: 26 + boss.tier * 4,
        firedSfx: false,
      });
    }
    boss.beamLockTimer = telegraph + active * 0.75;
    state.bossCast = {
      label: twin ? '🔥 TWIN MEGA LASERS — ORBIT OR DASH!' : '🔥 MEGA LASER SWEEP — ORBIT OR DASH!',
      progress: 0,
      safe: false,
      timer: telegraph,
      maxTimer: telegraph,
    };
    spawnFloatText(boss.x, boss.y - 76, twin ? 'TWIN LASER SWEEP!' : 'MEGA LASER!', '#fde047');
    SFX.laserCharge();
  }

  function startBossSafeBubble(boss) {
    // Classic WoW Raid Mechanic: stand inside the glowing Safe Bubble before the arena-wide shockwave hits!
    const safeX = clamp(W * 0.5 + rand(-W * 0.24, W * 0.24), 130, W - 130);
    const safeY = clamp(H * 0.54 + rand(-H * 0.2, H * 0.2), 130, H - 120);
    const delay = boss.phase >= 3 ? 2.25 : 2.6;
    state.hazards.push({
      kind: 'safe',
      x: safeX,
      y: safeY,
      r: boss.phase >= 3 ? 98 : 112,
      timer: delay,
      maxTimer: delay,
      damage: 34 + boss.tier * 5,
    });
    state.bossCast = {
      label: '🛡 SLIME SHOCKWAVE — GET IN THE SAFE BUBBLE!',
      progress: 0,
      safe: true,
      timer: delay,
      maxTimer: delay,
    };
    spawnFloatText(safeX, safeY - 12, 'SAFE BUBBLE!', '#5eead4');
    SFX.bossWarn();
  }

  function startBossPlasmaCross(boss) {
    // Classic WoW Raid Mechanic: 4 rotating laser arms in a giant + / X wheel!
    const telegraph = boss.phase >= 3 ? 1.15 : 1.35;
    const active = boss.phase >= 3 ? 2.8 : 2.4;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const rotSpeed = dir * (boss.phase >= 3 ? 0.68 : 0.52);
    const baseAng = rand(0, Math.PI * 0.5);
    const len = Math.max(W, H) * 1.15;

    for (let k = 0; k < 4; k++) {
      state.bossBeams.push({
        ownerBoss: boss,
        x: boss.x,
        y: boss.y,
        angle: baseAng + (k * Math.PI) / 2,
        rotSpeed,
        len,
        width: 20,
        telegraph,
        maxTelegraph: telegraph,
        activeTimer: active,
        damage: 25 + boss.tier * 4,
        firedSfx: k > 0, // only play fire SFX once for the group
      });
    }
    boss.beamLockTimer = telegraph + active;
    state.bossCast = {
      label: '⚡ ROTATING PLASMA CROSS — WEAVE AROUND!',
      progress: 0,
      safe: false,
      timer: telegraph,
      maxTimer: telegraph,
    };
    spawnFloatText(boss.x, boss.y - 76, 'PLASMA CROSS!', '#fde047');
    SFX.laserCharge();
  }

  function startBossMeteorBarrage(boss, count) {
    boss.meteorQueue = [];
    for (let k = 0; k < count; k++) {
      boss.meteorQueue.push({ wait: k * (boss.phase >= 3 ? 0.28 : 0.36) });
    }
    const dur = count * 0.36 + 0.9;
    state.bossCast = {
      label: '☄️ METEOR BARRAGE — KEEP MOVING!',
      progress: 0,
      safe: false,
      timer: dur,
      maxTimer: dur,
    };
    spawnFloatText(boss.x, boss.y - 76, 'METEOR RAIN!', '#fb923c');
    SFX.bossWarn();
  }

  function updateBossHazardsAndBeams(dt, livingPlayers) {
    // Update WoW Boss Cast Bar timer
    if (state.bossCast) {
      state.bossCast.timer -= dt;
      state.bossCast.progress = clamp(1 - state.bossCast.timer / Math.max(0.01, state.bossCast.maxTimer), 0, 1);
      if (state.bossCast.timer <= 0) {
        state.bossCast = null;
      }
      renderBossCastUI(state.bossCast);
    }

    // Update Arena Ground Hazards (Void Pools, Meteors, Safe Bubbles, Toxic Puddles)
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      h.timer -= dt;

      if (h.kind === 'puddle') {
        // Lingering toxic slime puddle ticks light damage if player parks inside
        for (const p of livingPlayers) {
          if (dist(p.x, p.y, h.x, h.y) < h.r + p.radius * 0.5 && p.invuln <= 0 && p.dashTimer <= 0) {
            hurtPlayer(p, 11);
          }
        }
        if (h.timer <= 0) state.hazards.splice(i, 1);
        continue;
      }

      if (h.timer <= 0) {
        if (h.kind === 'void') {
          // Detonate Toxic Void Pool -> spawns lingering bubbling puddle!
          state.novas.push({ x: h.x, y: h.y, r: 10, maxR: h.r + 14, color: '#a3e635', life: 0.34, maxLife: 0.34 });
          spawnCartoonBurst(h.x, h.y, '#84cc16', false);
          SFX.voidBoom();
          for (const p of livingPlayers) {
            if (dist(p.x, p.y, h.x, h.y) <= h.r + p.radius * 0.65) {
              hurtPlayer(p, h.damage);
            }
          }
          // Convert into lingering toxic puddle for 2.3s
          state.hazards.splice(i, 1, {
            kind: 'puddle',
            x: h.x,
            y: h.y,
            r: h.r * 0.88,
            timer: 2.3,
            maxTimer: 2.3,
            damage: 11,
          });
        } else if (h.kind === 'meteor') {
          // Detonate Meteor Strike + scatter 4 cartoon rock sparks!
          state.shake = Math.max(state.shake, 11);
          state.novas.push({ x: h.x, y: h.y, r: 8, maxR: h.r + 22, color: '#fb923c', life: 0.36, maxLife: 0.36 });
          spawnCartoonBurst(h.x, h.y, '#f97316', true);
          SFX.voidBoom();
          for (const p of livingPlayers) {
            if (dist(p.x, p.y, h.x, h.y) <= h.r + p.radius * 0.65) {
              hurtPlayer(p, h.damage);
            }
          }
          state.hazards.splice(i, 1);
        } else if (h.kind === 'safe') {
          // WoW Safe-Bubble Shockwave! Anyone inside is SAFE; anyone outside gets blasted!
          state.shake = Math.max(state.shake, 18);
          state.novas.push({ x: W * 0.5, y: H * 0.5, r: 40, maxR: Math.max(W, H) * 0.85, color: '#e11d48', life: 0.55, maxLife: 0.55 });
          state.novas.push({ x: h.x, y: h.y, r: h.r * 0.7, maxR: h.r + 28, color: '#5eead4', life: 0.45, maxLife: 0.45 });
          SFX.bossBoom();
          for (const p of livingPlayers) {
            if (dist(p.x, p.y, h.x, h.y) <= h.r + p.radius * 0.35) {
              p.shieldFlash = 0.48;
              spawnParticles(p.x, p.y, '#5eead4', 10, 150, 3.5, 'star');
              spawnFloatText(p.x, p.y - 34, 'SAFE!', '#5eead4');
              SFX.shield();
            } else {
              hurtPlayer(p, h.damage);
            }
          }
          state.hazards.splice(i, 1);
        }
      }
    }

    // Update Cuphead / WoW Sweeping Laser Beams & Plasma Cross
    for (let i = state.bossBeams.length - 1; i >= 0; i--) {
      const bm = state.bossBeams[i];
      if (bm.ownerBoss && !bm.ownerBoss.dying && bm.ownerBoss.hp > 0) {
        bm.x = bm.ownerBoss.x;
        bm.y = bm.ownerBoss.y;
      } else {
        state.bossBeams.splice(i, 1);
        continue;
      }

      if (bm.telegraph > 0) {
        bm.telegraph -= dt;
        if (bm.telegraph <= 0 && !bm.firedSfx) {
          bm.firedSfx = true;
          state.shake = Math.max(state.shake, 10);
          SFX.laserFire();
        }
        continue;
      }

      bm.activeTimer -= dt;
      bm.angle += bm.rotSpeed * dt;
      if (bm.activeTimer <= 0) {
        state.bossBeams.splice(i, 1);
        continue;
      }

      // Check active beam collision against living players (line-segment distance)
      const x2 = bm.x + Math.cos(bm.angle) * bm.len;
      const y2 = bm.y + Math.sin(bm.angle) * bm.len;
      const dx = x2 - bm.x;
      const dy = y2 - bm.y;
      const lenSq = dx * dx + dy * dy || 1;
      for (const p of livingPlayers) {
        const t = clamp(((p.x - bm.x) * dx + (p.y - bm.y) * dy) / lenSq, 0, 1);
        const px = bm.x + t * dx;
        const py = bm.y + t * dy;
        if (dist(px, py, p.x, p.y) <= bm.width * 0.5 + p.radius - 4) {
          hurtPlayer(p, bm.damage);
        }
      }
    }
  }

  function updateBossBehavior(boss, target, dt, slow) {
    if (boss.y < 145) { boss.y += 120 * dt; return; }
    if (boss.phaseInvuln > 0) {
      boss.phaseInvuln = Math.max(0, boss.phaseInvuln - dt);
      boss.rot += 2.2 * dt;
      return;
    }

    // Process staggered Meteor Barrage drops (King Pandemic-Rex)
    if (boss.meteorQueue && boss.meteorQueue.length > 0) {
      for (let i = boss.meteorQueue.length - 1; i >= 0; i--) {
        boss.meteorQueue[i].wait -= dt;
        if (boss.meteorQueue[i].wait <= 0) {
          boss.meteorQueue.splice(i, 1);
          const living = state.players.filter((p) => !p.downed);
          const pick = living.length ? living[Math.floor(Math.random() * living.length)] : null;
          const mx = pick ? clamp(pick.x + (pick.vx || 0) * 0.4 + rand(-42, 42), 75, W - 75) : rand(80, W - 80);
          const my = pick ? clamp(pick.y + (pick.vy || 0) * 0.4 + rand(-42, 42), 95, H - 75) : rand(100, H - 80);
          const delay = boss.phase >= 3 ? 0.98 : 1.15;
          state.hazards.push({
            kind: 'meteor',
            x: mx,
            y: my,
            r: boss.phase >= 3 ? 62 : 54,
            timer: delay,
            maxTimer: delay,
            damage: 26 + boss.tier * 4,
          });
        }
      }
    }

    // Hold position while channeling a sweeping laser / plasma cross
    if (boss.beamLockTimer > 0) {
      boss.beamLockTimer = Math.max(0, boss.beamLockTimer - dt);
      // Drift gently toward center during Plasma Cross so players have room on all sides
      if (boss.variant === 2) {
        boss.x += (W * 0.5 - boss.x) * dt * 1.4;
        boss.y += (H * 0.48 - boss.y) * dt * 1.4;
      }
      return;
    }

    // Cuphead Telegraphed Chomp Lunge!
    if (boss.chargeTelegraph) {
      boss.chargeTelegraph.timer -= dt;
      if (boss.chargeTelegraph.timer <= 0) {
        const ang = boss.chargeTelegraph.angle;
        const sp = boss.phase >= 3 ? 500 : boss.phase === 2 ? 440 : 380;
        boss.chargeVx = Math.cos(ang) * sp;
        boss.chargeVy = Math.sin(ang) * sp;
        boss.charging = 0.78;
        boss.chargeDropTick = 0.08;
        boss.chargeTelegraph = null;
        spawnFloatText(boss.x, boss.y - 74, 'CHOMP LUNGE!', '#fb7185');
        SFX.dash();
      }
      return;
    }

    if (boss.charging > 0) {
      boss.charging -= dt;
      boss.x = clamp(boss.x + boss.chargeVx * dt, 70, W - 70);
      boss.y = clamp(boss.y + boss.chargeVy * dt, 95, H - 70);
      // Drop spicy hazard globs along the lunge path in Phase 2+!
      if (boss.phase >= 2) {
        boss.chargeDropTick -= dt;
        if (boss.chargeDropTick <= 0) {
          boss.chargeDropTick = 0.14;
          const perp = Math.atan2(boss.chargeVy, boss.chargeVx) + Math.PI * 0.5;
          [-1, 1].forEach((side) => {
            state.enemyBullets.push({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(perp) * 145 * side,
              vy: Math.sin(perp) * 145 * side,
              radius: 7.5,
              damage: 18,
              color: '#ef4444',
              life: 3.4,
            });
          });
        }
      }
      return;
    }

    if (target) {
      const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
      boss.vx += (Math.cos(ang) * boss.speed - boss.vx) * dt * 1.6;
      boss.vy += (Math.sin(ang) * boss.speed - boss.vy) * dt * 1.6;
      boss.x = clamp(boss.x + boss.vx * slow * dt, 70, W - 70);
      boss.y = clamp(boss.y + boss.vy * slow * dt, 95, H - 70);
    }

    const ph = boss.phase || 1;

    // ---- Special WoW / Cuphead Raid Ability Rotation ----
    boss.abilityTimer -= dt;
    if (boss.abilityTimer <= 0 && !state.bossCast) {
      boss.abilityStep += 1;
      if (boss.variant === 0) {
        // BARON CORONA-CHOMP: Void Pools (P1+) & Sweeping Mega Laser (P2+) / Twin Lasers (P3)
        if (ph >= 2 && boss.abilityStep % 2 === 0) {
          startBossLaserSweep(boss, target, ph >= 3);
        } else {
          spawnBossVoidZones(boss, ph >= 3 ? 5 : ph === 2 ? 4 : 3);
        }
        boss.abilityTimer = ph >= 3 ? 4.3 : ph === 2 ? 5.2 : 6.0;
      } else if (boss.variant === 1) {
        // HYDRA SLIME-QUEEN: Royal Brood + Bouncing Slime Orbs (P1+) & WoW Safe-Bubble Shockwave (P2+)
        if (ph >= 2 && boss.abilityStep % 2 === 0) {
          startBossSafeBubble(boss);
        } else {
          // Launch Cuphead Bouncing Slime Orb ring!
          const count = ph >= 3 ? 9 : ph === 2 ? 7 : 5;
          const base = target ? Math.atan2(target.y - boss.y, target.x - boss.x) : 0;
          for (let k = 0; k < count; k++) {
            const a = base + (k / count) * Math.PI * 2;
            state.enemyBullets.push({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(a) * (ph >= 3 ? 255 : 220),
              vy: Math.sin(a) * (ph >= 3 ? 255 : 220),
              radius: 11,
              damage: 20,
              color: '#84cc16',
              life: 6.2,
              bouncy: true,
              bounces: ph >= 3 ? 3 : 2,
            });
          }
          spawnFloatText(boss.x, boss.y - 74, 'BOUNCING SLIMES!', '#bef264');
          SFX.nova();
          if (ph >= 3) spawnBossVoidZones(boss, 3);
        }
        boss.abilityTimer = ph >= 3 ? 4.8 : ph === 2 ? 5.6 : 6.0;
      } else {
        // KING PANDEMIC-REX: Meteor Barrage (P1+) & WoW Rotating Plasma Cross (P2+)
        if (ph >= 2 && boss.abilityStep % 2 === 0) {
          startBossPlasmaCross(boss);
        } else {
          startBossMeteorBarrage(boss, ph >= 3 ? 8 : ph === 2 ? 6 : 5);
        }
        boss.abilityTimer = ph >= 3 ? 4.6 : ph === 2 ? 5.6 : 6.2;
      }
    }

    // ---- Core Cuphead Bullet Patterns (escalate across Phases 1 -> 2 -> 3) ----
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      if (boss.variant === 0) {
        const count = (ph >= 3 ? 18 : ph === 2 ? 15 : 11) + boss.tier * 2;
        boss.spiralAngle += ph >= 3 ? 0.42 : 0.34;
        for (let k = 0; k < count; k++) {
          const a = boss.spiralAngle + (k / count) * Math.PI * 2;
          state.enemyBullets.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * (ph >= 3 ? 260 : ph === 2 ? 235 : 205),
            vy: Math.sin(a) * (ph >= 3 ? 260 : ph === 2 ? 235 : 205),
            radius: 8, damage: 19, color: '#ef4444', life: 4.5,
          });
        }
        boss.attackTimer = Math.max(0.9, (ph >= 3 ? 1.25 : ph === 2 ? 1.55 : 2.0) - boss.tier * 0.08);
      } else if (boss.variant === 1 && target) {
        const baseAng = Math.atan2(target.y - boss.y, target.x - boss.x);
        const span = ph >= 3 ? 3 : 2;
        for (let k = -span; k <= span; k++) {
          const a = baseAng + k * 0.19;
          const isBouncy = ph >= 2 && Math.abs(k) === span;
          state.enemyBullets.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * (ph >= 3 ? 295 : 255),
            vy: Math.sin(a) * (ph >= 3 ? 295 : 255),
            radius: isBouncy ? 10.5 : 8,
            damage: 19,
            color: isBouncy ? '#84cc16' : '#ef4444',
            life: isBouncy ? 5.5 : 4.0,
            bouncy: isBouncy,
            bounces: isBouncy ? 2 : 0,
          });
        }
        boss.attackTimer = Math.max(0.8, (ph >= 3 ? 1.15 : ph === 2 ? 1.4 : 1.75) - boss.tier * 0.08);
      } else {
        boss.spiralAngle += 0.46;
        const count = ph >= 3 ? 20 : ph === 2 ? 16 : 12;
        for (let k = 0; k < count; k++) {
          const a = boss.spiralAngle + (k / count) * Math.PI * 2;
          state.enemyBullets.push({
            x: boss.x, y: boss.y,
            vx: Math.cos(a) * (ph >= 3 ? 275 : ph === 2 ? 245 : 220),
            vy: Math.sin(a) * (ph >= 3 ? 275 : ph === 2 ? 245 : 220),
            radius: 8.5, damage: 20, color: '#ef4444', life: 4.5,
          });
        }
        boss.attackTimer = Math.max(0.85, (ph >= 3 ? 1.2 : ph === 2 ? 1.45 : 1.8) - boss.tier * 0.08);
      }
    }

    // ---- Telegraphed Cuphead Boss Lunge ----
    boss.chargeTimer -= dt;
    if (boss.chargeTimer <= 0 && target) {
      const ang = Math.atan2(target.y - boss.y, target.x - boss.x);
      boss.chargeTelegraph = { angle: ang, timer: ph >= 3 ? 0.58 : 0.72 };
      boss.chargeTimer = ph >= 3 ? 4.4 : ph === 2 ? 5.2 : 6.2;
      SFX.bossWarn();
    }

    // ---- Coordinated Raid Add Waves ----
    boss.minionTimer -= dt;
    if (boss.minionTimer <= 0 && state.enemies.length < 13) {
      const count = ph >= 3 ? 3 : 2;
      for (let k = 0; k < count; k++) {
        const addType = boss.variant === 1 ? (k === 0 && ph >= 2 ? 'mitosis' : 'microbe') : 'corona';
        spawnEnemy(addType, {
          x: boss.x + rand(-60, 60),
          y: boss.y + rand(-60, 60),
        });
      }
      boss.minionTimer = ph >= 3 ? 4.8 : 6.0;
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

    // Animated Tiered XP Gems & Heal Orbs (tougher enemies drop bigger, brighter, higher-value gems!)
    const XP_STYLES = [
      null,
      { col: '#38bdf8', inner: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.32)', sz: 6.2 },
      { col: '#4ade80', inner: '#dcfce7', glow: 'rgba(74, 222, 128, 0.36)', sz: 8.6 },
      { col: '#fbbf24', inner: '#fef9c3', glow: 'rgba(251, 191, 36, 0.44)', sz: 10.8 },
      { col: '#f472b6', inner: '#fef08a', glow: 'rgba(244, 114, 182, 0.54)', sz: 12.2 },
    ];
    for (const pk of state.pickups) {
      const tier = pk.kind === 'xp' ? clamp(pk.tier || 1, 1, 4) : 1;
      const st = pk.kind === 'xp' ? XP_STYLES[tier] : { col: '#22c55e', inner: '#dcfce7', glow: 'rgba(34, 197, 94, 0.34)', sz: 7 };
      const pulse = 1 + Math.sin(state.time * (tier >= 4 ? 13 : 8) + pk.x * 0.05) * (tier >= 3 ? 0.2 : 0.15);

      if (pk.pulling && (Math.abs(pk.vx || 0) > 35 || Math.abs(pk.vy || 0) > 35)) {
        ctx.strokeStyle = tier === 4 ? '#fde047' : st.col;
        ctx.globalAlpha = tier === 4 ? 0.85 : 0.65;
        ctx.lineWidth = tier >= 3 ? 5 : 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pk.x, pk.y);
        const trailLen = tier === 4 ? 0.085 : 0.055;
        ctx.lineTo(pk.x - pk.vx * trailLen, pk.y - pk.vy * trailLen);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = st.glow;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, (pk.pulling ? st.sz * 2.15 : st.sz * 1.6) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.scale(pulse * (pk.pulling ? 1.2 : 1), pulse * (pk.pulling ? 1.2 : 1));
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = tier >= 3 ? 2.2 : 1.8;
      if (pk.kind === 'xp') {
        ctx.rotate(state.time * (tier >= 3 ? 4.2 : 3) + pk.y * 0.02);
        ctx.fillStyle = st.col;
        const s = st.sz;
        ctx.beginPath();
        if (tier >= 3) {
          // Faceted octagonal / star-cut high-value gem for Elites & Bosses
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            const r = k % 2 === 0 ? s * 1.12 : s * 0.78;
            if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
        } else {
          ctx.moveTo(0, -s * 1.15);
          ctx.lineTo(s * 0.95, 0);
          ctx.lineTo(0, s * 1.15);
          ctx.lineTo(-s * 0.95, 0);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = st.inner;
        if (tier >= 3) {
          drawFourPointStar(0, 0, s * 0.65);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
          ctx.fill();
        }
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

    // WoW Raid Ground Hazards (Toxic Void Zones, Meteor Targets, Safe Bubbles, Bubbling Slime Puddles!)
    for (const h of state.hazards) {
      const prog = h.progress !== undefined ? h.progress : clamp(1 - h.timer / Math.max(0.01, h.maxTimer), 0, 1);
      ctx.save();
      if (h.kind === 'safe') {
        // Subtle danger tint across the rest of the arena so the glowing Safe Bubble pops!
        ctx.fillStyle = `rgba(225, 29, 72, ${(0.08 + prog * 0.16).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);

        ctx.translate(h.x, h.y);
        const pulse = 1 + Math.sin(state.time * 10) * 0.04;
        // Glowing golden-cyan Safe Bubble fill
        ctx.fillStyle = 'rgba(45, 212, 191, 0.24)';
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, h.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Filling radial countdown ring around the Safe Bubble
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, h.r + 6, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();

        // Bold SAFE ZONE label
        ctx.font = '700 15px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 4;
        ctx.strokeText('SAFE ZONE!', 0, 5);
        ctx.fillStyle = '#ccfbf1';
        ctx.fillText('SAFE ZONE!', 0, 5);
      } else if (h.kind === 'puddle') {
        ctx.translate(h.x, h.y);
        const fade = clamp(h.timer / Math.max(0.01, h.maxTimer), 0.25, 1);
        ctx.globalAlpha = fade * 0.8;
        ctx.fillStyle = 'rgba(132, 204, 22, 0.35)';
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, h.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cute cartoon bubbling dots
        for (let b = 0; b < 3; b++) {
          const ba = b * 2.1 + state.time * 1.2;
          const br = h.r * 0.45;
          const bSize = 4 + Math.sin(state.time * 8 + b * 2) * 2.5;
          ctx.fillStyle = '#bef264';
          ctx.beginPath();
          ctx.arc(Math.cos(ba) * br, Math.sin(ba) * br, Math.max(1.5, bSize), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 'void' or 'meteor' telegraphed AoE circle (fills up to 100% -> BOOM!)
        const isMeteor = h.kind === 'meteor';
        const ringCol = isMeteor ? '#fb923c' : '#a3e635';
        const fillCol = isMeteor ? 'rgba(249, 115, 22, 0.24)' : 'rgba(225, 29, 72, 0.22)';
        const innerCol = isMeteor ? 'rgba(251, 146, 60, 0.48)' : 'rgba(163, 230, 53, 0.44)';

        ctx.translate(h.x, h.y);
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.arc(0, 0, h.r, 0, Math.PI * 2);
        ctx.fill();

        // Expanding inner fill showing exact detonation progress!
        ctx.fillStyle = innerCol;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(4, h.r * prog), 0, Math.PI * 2);
        ctx.fill();

        // Crisp dashed danger perimeter
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, h.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center target crosshair / warning mark
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 3;
        ctx.font = '700 16px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        const icon = isMeteor ? '!' : '☠';
        ctx.strokeText(icon, 0, 6);
        ctx.fillText(icon, 0, 6);
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

    // Cuphead / WoW Boss Sweeping Lasers & Rotating Plasma Cross!
    for (const bm of state.bossBeams) {
      const x2 = bm.x + Math.cos(bm.angle) * bm.len;
      const y2 = bm.y + Math.sin(bm.angle) * bm.len;
      ctx.save();
      if (bm.telegraph > 0) {
        const prog = bm.progress !== undefined ? bm.progress : clamp(1 - bm.telegraph / Math.max(0.01, bm.maxTelegraph), 0, 1);
        const blink = 0.55 + Math.sin(state.time * 28) * 0.45;
        ctx.strokeStyle = `rgba(244, 63, 94, ${(0.4 + blink * 0.5).toFixed(3)})`;
        ctx.lineWidth = 3 + prog * 5;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.moveTo(bm.x, bm.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Growing charge orb at boss mouth
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, 10 + prog * 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const flicker = 1 + Math.sin(state.time * 48) * 0.14;
        ctx.lineCap = 'round';
        // Thick cartoon ink outer outline
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = (bm.width + 12) * flicker;
        ctx.beginPath();
        ctx.moveTo(bm.x, bm.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Fiery crimson laser body
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = (bm.width + 4) * flicker;
        ctx.stroke();
        // Bright yellow-white core
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = (bm.width * 0.46) * flicker;
        ctx.stroke();
        // Blazing emitter star at origin
        ctx.fillStyle = '#fef08a';
        drawFourPointStar(bm.x, bm.y, 26 * flicker);
      }
      ctx.restore();
    }

    // Cuphead Telegraphed Boss Lunge Arrow!
    for (const e of state.enemies) {
      if (e.isBoss && e.chargeTelegraph) {
        const ang = e.chargeTelegraph.angle;
        const distLen = 280;
        const ex = e.x + Math.cos(ang) * distLen;
        const ey = e.y + Math.sin(ang) * distLen;
        const pulse = 0.55 + Math.sin(state.time * 26) * 0.45;
        ctx.save();
        ctx.strokeStyle = `rgba(251, 113, 133, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrowhead
        ctx.translate(ex, ey);
        ctx.rotate(ang);
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Cartoon Enemies
    for (const e of state.enemies) drawEnemy(e);

    // ENEMY PROJECTILES — High-contrast spiky red globs + Cuphead glossy bouncing slime orbs!
    for (const b of state.enemyBullets) {
      const p = 1 + Math.sin(state.time * 16 + b.x) * 0.14;
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.bouncy) {
        // Glossy cartoon bouncing Cuphead slime orb!
        const sq = 1 + Math.sin(state.time * 14 + b.y * 0.05) * 0.14;
        ctx.scale(sq, 2 - sq);
        ctx.strokeStyle = 'rgba(163, 230, 53, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius + 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#84cc16';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Gloss highlight
        ctx.fillStyle = '#ecfccb';
        ctx.beginPath();
        ctx.ellipse(-b.radius * 0.3, -b.radius * 0.3, b.radius * 0.34, b.radius * 0.2, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
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
      }
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

    // Cartoon UFO Players (with Visual Upgrades + Clear Color Halos & Pilot Pill Badges!)
    for (const p of state.players) drawUfoPlayer(p);
    drawPlayerPings();

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

    // Clear Screen-Edge Red Vignette Flash when YOU take damage!
    if (state.hurtVignette > 0.01 && state.mode === 'playing') {
      const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(239, 68, 68, 0)');
      vg.addColorStop(1, `rgba(239, 68, 68, ${(state.hurtVignette * 0.72).toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

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
      ctx.strokeStyle = p.color || '#f43f5e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 3.5;
      ctx.font = '700 13px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(`🆘 REVIVE P${p.slot + 1} ${p.name}!`, 0, -24);
      ctx.fillText(`🆘 REVIVE P${p.slot + 1} ${p.name}!`, 0, -24);
      ctx.restore();
      return;
    }

    // Vivid Color-Matched Identification Halo under EVERY UFO (so all 5 players stand out on TV!)
    const rPulse = 1 + Math.sin(state.time * 5.5 + p.slot * 1.3) * 0.06;
    const haloGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 42 * rPulse);
    haloGrad.addColorStop(0, `${p.color}48`);
    haloGrad.addColorStop(0.65, `${p.color}22`);
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 42 * rPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isMe ? '#fef08a' : p.color;
    ctx.globalAlpha = isMe ? 0.85 : 0.62;
    ctx.lineWidth = isMe ? 2.8 : 2.2;
    if (isMe) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, (isMe ? 33 : 29) * rPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

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
      drawFourPointStar(Math.cos(p.angle) * 24, Math.sin(p.angle) * 24, 13);
      ctx.restore();
    }

    // Firing recoil kick + Hurt damage shake + Cartoon rubber-hose squash-and-stretch wobble!
    const hurtAmt = clamp((p.hurtRecoil || 0) / 0.34, 0, 1);
    const kickAmt = clamp((p.fireKick || 0) / 0.085, 0, 1);
    if (kickAmt > 0) {
      ctx.translate(-Math.cos(p.angle) * kickAmt * 3.8, -Math.sin(p.angle) * kickAmt * 3.8);
    }
    if (hurtAmt > 0) {
      ctx.translate(Math.sin(state.time * 72) * hurtAmt * 6, Math.cos(state.time * 64) * hurtAmt * 4);
    }

    const bob = Math.sin(state.time * 9 + p.slot) * 0.065;
    const speedStretch = clamp(Math.hypot(p.vx || 0, p.vy || 0) * 0.00022, 0, 0.08);
    const hurtSquash = hurtAmt > 0 ? Math.sin(hurtAmt * Math.PI) * 0.22 : 0;
    const tilt = clamp((p.vx || 0) * 0.0007, -0.28, 0.28) + (hurtAmt > 0 ? Math.sin(state.time * 55) * 0.25 * hurtAmt : 0);
    ctx.rotate(tilt);
    ctx.scale(1 + bob + speedStretch + hurtSquash, 1 - bob - speedStretch * 0.5 - hurtSquash * 0.7);

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

    // Main Cartoon UFO Saucer Rim (flashes crimson-white on damage recoil!)
    const hurtBlink = hurtAmt > 0 && Math.floor(state.time * 24) % 2 === 0;
    ctx.fillStyle = hurtBlink ? '#ef4444' : p.color;
    ctx.strokeStyle = hurtBlink ? '#fef08a' : '#090d16';
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
    ctx.fillStyle = hurtBlink ? 'rgba(254, 202, 202, 0.9)' : 'rgba(186, 230, 253, 0.84)';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, 14, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Expressive Disney-style Alien Pilot inside dome (blinks, smiles, looks at enemies, winces on hit!)
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

    if (hurtAmt > 0.1) {
      // Cartoon OUCH! '> <' squint eyes when hit!
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.5, -7.2 + pilotBob); ctx.lineTo(-2.2, -5.4 + pilotBob); ctx.lineTo(-5.5, -3.6 + pilotBob);
      ctx.moveTo(5.5, -7.2 + pilotBob); ctx.lineTo(2.2, -5.4 + pilotBob); ctx.lineTo(5.5, -3.6 + pilotBob);
      ctx.stroke();
    } else if (isBlinking) {
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

    // Little happy cartoon smile (turns into OUCH wavy frown when hit, or excited 'O' during Dash!)
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    if (hurtAmt > 0.1) {
      ctx.beginPath();
      ctx.arc(0, -0.5 + pilotBob, 2.4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (p.dashTimer > 0) {
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

    // Clear Cartoon Energy Shield Bubble when Armored or Shielding/Blocking/Dashing!
    const shieldAmt = clamp((p.shieldFlash || 0) / 0.34, 0, 1);
    if (shieldAmt > 0.02 || up.hull_plating > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const rad = 29 + shieldAmt * 7 + Math.sin(state.time * 7) * 1.2;
      ctx.fillStyle = shieldAmt > 0.02
        ? `rgba(125, 211, 252, ${(0.16 + shieldAmt * 0.28).toFixed(3)})`
        : 'rgba(56, 189, 248, 0.09)';
      ctx.strokeStyle = shieldAmt > 0.02
        ? `rgba(224, 242, 254, ${(0.5 + shieldAmt * 0.5).toFixed(3)})`
        : 'rgba(125, 211, 252, 0.35)';
      ctx.lineWidth = shieldAmt > 0.02 ? 3.5 : 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (shieldAmt > 0.1) {
        // Cartoon glossy bubble sheen + sparkle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, rad - 4, Math.PI * 1.15, Math.PI * 1.48);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        drawFourPointStar(Math.cos(state.time * 10) * rad, Math.sin(state.time * 10) * rad, 7 * shieldAmt);
      }
      ctx.restore();
    }

    // Floating Color-Coded Cartoon HP Bar directly above each UFO!
    const hpRatio = clamp((p.hp || 0) / Math.max(1, p.maxHp || 100), 0, 1);
    const barW = 46;
    const barH = 7;
    const barX = p.x - barW * 0.5;
    const barY = p.y - 34;
    let barColor = '#22c55e'; // Healthy green (>60%)
    if (hpRatio < 0.15) {
      barColor = Math.floor(state.time * 10) % 2 === 0 ? '#ef4444' : '#fca5a5'; // Critical pulsing red (<15%)
    } else if (hpRatio <= 0.3) {
      barColor = '#ef4444'; // Low solid red (15%–30%)
    } else if (hpRatio <= 0.6) {
      barColor = '#facc15'; // Mid yellow/amber (30%–60%)
    }

    ctx.save();
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 4);
    ctx.fill();
    ctx.stroke();

    if (hpRatio > 0) {
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(4, barW * hpRatio), barH, 3);
      ctx.fill();
      // Cartoon glossy strip on top of HP bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(barX + 1, barY + 1, Math.max(2, barW * hpRatio - 2), 2);
    }

    // Bobbing "▼ YOU" pointer above your own HP bar (when playing on your own screen)
    if (isMe) {
      const bob = Math.sin(state.time * 8) * 3;
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(p.x, barY - 5 + bob);
      ctx.lineTo(p.x - 7, barY - 15 + bob);
      ctx.lineTo(p.x + 7, barY - 15 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // High-Contrast Color-Coded Cartoon Pilot Pill Badge + Per-Game Veteran Title!
    const slotPrefix = `P${p.slot + 1}`;
    const shortName = String(p.name || slotPrefix).slice(0, 12);
    const rp = room.players && room.players[p.id];
    const vet = (rp && rp.veteran) || (isMe && window.CouchAccounts && window.CouchAccounts.getVeteranStats ? window.CouchAccounts.getVeteranStats('astro-purge') : null);
    const vetPrefix = vet ? `${vet.badge} ` : '';
    const labelText = isMe ? `★ ${vetPrefix}${shortName}` : `${slotPrefix} · ${vetPrefix}${shortName}`;
    ctx.font = '700 12px "Fredoka", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(labelText).width;
    const pillW = Math.max(58, textW + 24);
    const pillH = 20;
    const pillX = p.x - pillW * 0.5;
    const pillY = p.y + 27;

    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.strokeStyle = isMe ? '#fde047' : p.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 999);
    ctx.fill();
    ctx.stroke();

    // Glowing pilot color dot inside pill
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(pillX + 10, pillY + pillH * 0.5, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isMe ? '#fef08a' : '#ffffff';
    ctx.fillText(labelText, p.x + 4, pillY + pillH * 0.5 + 0.5);

    // Floating Cool Veteran Title & VP tag right above the UFO's head!
    if (vet && vet.title) {
      const titleStr = `${vet.badge} ${vet.title} · ${vet.points} VP`;
      ctx.font = '700 10px "Fredoka", "Inter", sans-serif';
      const tw = ctx.measureText(titleStr).width + 14;
      const ty = barY - (isMe ? 28 : 14);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.strokeStyle = vet.color || '#facc15';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(p.x - tw * 0.5, ty - 8, tw, 16, 999);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef9c3';
      ctx.fillText(titleStr, p.x, ty + 0.5);
    }
    ctx.restore();
  }

  // ---- Giant Radar Beacon Spotlight for PING ("I'm Here!") & Dead SOS ("RESS ME!") ----
  function drawPlayerPings() {
    if (!state.pings || state.pings.length === 0) return;
    for (const pg of state.pings) {
      const progress = 1 - clamp(pg.timer / Math.max(0.01, pg.maxTimer), 0, 1);
      const fade = pg.timer < 0.45 ? clamp(pg.timer / 0.45, 0, 1) : 1;
      const accent = pg.isRess
        ? (Math.floor(state.time * 12) % 2 === 0 ? '#f43f5e' : '#fde047')
        : (pg.color || '#5eead4');
      const glow = pg.isRess ? '#fda4af' : (pg.glow || '#fef08a');

      ctx.save();
      ctx.globalAlpha = fade;

      // 1. Vertical Cartoon Spotlight Beam from Top of Screen straight onto the UFO!
      const beamW = pg.isRess ? 64 : 52;
      const beamGrad = ctx.createLinearGradient(pg.x, 0, pg.x, pg.y + 30);
      beamGrad.addColorStop(0, 'rgba(0,0,0,0)');
      beamGrad.addColorStop(0.55, pg.isRess ? 'rgba(244, 63, 94, 0.22)' : `${pg.color}28`);
      beamGrad.addColorStop(1, pg.isRess ? 'rgba(253, 224, 71, 0.42)' : `${pg.color}55`);
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(pg.x - beamW * 0.35, 0);
      ctx.lineTo(pg.x + beamW * 0.35, 0);
      ctx.lineTo(pg.x + beamW * 0.85, pg.y + 18);
      ctx.lineTo(pg.x - beamW * 0.85, pg.y + 18);
      ctx.closePath();
      ctx.fill();

      // 2. Three Expanding Concentric Sonar Rings
      for (let k = 0; k < 3; k++) {
        const phase = (progress * 3.2 + k * 0.33) % 1;
        const rad = 26 + phase * (pg.isRess ? 140 : 115);
        ctx.strokeStyle = k === 1 && pg.isRess ? '#fde047' : accent;
        ctx.globalAlpha = fade * (1 - phase) * 0.92;
        ctx.lineWidth = pg.isRess ? 5.5 : 4.2;
        ctx.beginPath();
        ctx.arc(pg.x, pg.y, rad, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Bouncing Giant Pointer + Comic Callout Banner above UFO!
      ctx.globalAlpha = fade;
      const bounce = Math.sin(state.time * 13) * 6;
      const bannerY = Math.max(54, pg.y - 68 + bounce);
      const callout = pg.isRess
        ? `🆘 RESS ME! · P${pg.slot + 1} ${String(pg.name || '').slice(0, 12)}`
        : `📍 P${pg.slot + 1} ${String(pg.name || '').slice(0, 12)} IS HERE!`;

      ctx.font = '700 15px "Fredoka", "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(callout).width;
      const bw = tw + 26;
      const bh = 30;
      const bx = clamp(pg.x, bw * 0.5 + 12, W - bw * 0.5 - 12);

      // Chunky comic drop shadow
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(bx - bw * 0.5, bannerY - bh * 0.5 + 3, bw, bh, 999);
      ctx.fill();

      ctx.fillStyle = pg.isRess ? '#e11d48' : '#0f172a';
      ctx.strokeStyle = pg.isRess ? '#fde047' : accent;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(bx - bw * 0.5, bannerY - bh * 0.5, bw, bh, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pg.isRess ? '#ffffff' : glow;
      ctx.fillText(callout, bx, bannerY + 0.5);

      // Pointer triangle aimed straight down at the UFO
      ctx.fillStyle = pg.isRess ? '#fde047' : accent;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pg.x, bannerY + bh * 0.5 + 12);
      ctx.lineTo(pg.x - 9, bannerY + bh * 0.5 + 1);
      ctx.lineTo(pg.x + 9, bannerY + bh * 0.5 + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  // ---- Old-School Cartoon Space Viruses & Bosses (Wiggling, Chomping & Hit-Reacting!) ----
  function drawEnemy(e) {
    ctx.save();
    const dyingShakeX = e.dying ? rand(-8, 8) : 0;
    const dyingShakeY = e.dying ? rand(-8, 8) : 0;
    ctx.translate(e.x + dyingShakeX, e.y + dyingShakeY);

    const flash = e.hitFlash > 0;
    const chilled = e.chillTimer > 0;
    const bounce = e.hitBounce ? Math.sin((e.hitBounce / 0.24) * Math.PI) * 0.28 : 0;
    if (e.isBoss && e.dying) {
      const swell = 1.12 + Math.sin(state.time * 28) * 0.14;
      ctx.scale(swell, 2.24 - swell);
    } else {
      const squash = 1 + Math.sin(state.time * 7.5 + e.x * 0.03) * 0.08 + bounce;
      ctx.scale(squash, 2 - squash);
    }

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
      const ph = e.phase || 1;
      const enraged = ph >= 2;
      const overdrive = ph >= 3;
      const chomp = 0.5 + Math.sin(state.time * (overdrive ? 15 : enraged ? 11 : 6.5)) * 0.5;

      // Cuphead-style Phase 2 & Phase 3 Visual Power-Up Aura!
      if (enraged && !e.dying) {
        const auraPulse = 1 + Math.sin(state.time * (overdrive ? 16 : 9)) * 0.08;
        ctx.save();
        ctx.strokeStyle = overdrive ? 'rgba(253, 224, 71, 0.72)' : 'rgba(251, 113, 133, 0.5)';
        ctx.lineWidth = overdrive ? 6 : 4;
        ctx.setLineDash(overdrive ? [12, 8] : [16, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, (e.radius + 26) * auraPulse, state.time * 2, state.time * 2 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (overdrive) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
          ctx.beginPath();
          ctx.arc(0, 0, (e.radius + 32) * auraPulse, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Wiggling rubber-hose curved tentacles/spikes
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + e.rot;
        const wiggle = Math.sin(state.time * (overdrive ? 14 : enraged ? 10 : 6) + k * 1.4) * (overdrive ? 0.3 : 0.22);
        const tipX = Math.cos(a + wiggle) * (e.radius + (overdrive ? 24 : 20));
        const tipY = Math.sin(a + wiggle) * (e.radius + (overdrive ? 24 : 20));
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
        ctx.fillStyle = flash ? '#fff' : overdrive ? '#facc15' : enraged ? '#fde047' : '#fda4af';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(tipX, tipY, overdrive ? 8.5 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Giant Cartoon Boss Body + Gloss Highlight
      ctx.fillStyle = flash ? '#ffffff' : e.color;
      ctx.strokeStyle = overdrive ? '#fde047' : '#090d16';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (e.dying) {
        // Cartoon defeated X_X dizzy eyes + wide shocked mouth during Boss Death Finale!
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        [-20, 20].forEach((ex) => {
          ctx.beginPath();
          ctx.moveTo(ex - 10, -18); ctx.lineTo(ex + 10, 0);
          ctx.moveTo(ex + 10, -18); ctx.lineTo(ex - 10, 0);
          ctx.stroke();
        });
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.ellipse(0, 24, 18, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (!flash) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(-18, -28, 22, 10, -0.45, 0, Math.PI * 2);
        ctx.fill();

        // Big Animated Boss Eyes (glow gold-crimson in Phase 2 & fiery overdrive in Phase 3!)
        ctx.fillStyle = overdrive ? '#fde047' : enraged ? '#fef08a' : '#ffffff';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(-20, -10, 12, overdrive ? 17 : 15, 0, 0, Math.PI * 2);
        ctx.ellipse(20, -10, 12, overdrive ? 17 : 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const eyeJitter = Math.sin(state.time * (overdrive ? 18 : 9)) * (overdrive ? 3.5 : 2.5);
        ctx.fillStyle = enraged ? '#dc2626' : '#090d16';
        ctx.beginPath();
        ctx.arc(-18 + eyeJitter, -8, overdrive ? 6.5 : 5.5, 0, Math.PI * 2);
        ctx.arc(18 + eyeJitter, -8, overdrive ? 6.5 : 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Furrowed Angry Eyebrows
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-34, -26 - chomp * 3); ctx.lineTo(-8, -16);
        ctx.moveTo(34, -26 - chomp * 3); ctx.lineTo(8, -16);
        ctx.stroke();
        // Animated Chomping Jagged Boss Mouth!
        const jawOpen = 10 + chomp * (overdrive ? 18 : 14);
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

      // Shimmering Golden Phase-Shift Invulnerability Barrier!
      if (e.phaseInvuln > 0 && !e.dying) {
        ctx.save();
        ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 14 + Math.sin(state.time * 24) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
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

      // Animated Cartoon Face — Startled 'O' shock face when hit, grumpy face normally!
      if (e.radius >= 13) {
        const er = Math.max(2.8, e.radius * 0.23);
        const ex = e.radius * 0.34;
        if (flash) {
          // Startled cartoon hit-flinch face!
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.arc(-ex, -2, er * 0.9, 0, Math.PI * 2);
          ctx.arc(ex, -2, er * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-ex, -2, er * 0.35, 0, Math.PI * 2);
          ctx.arc(ex, -2, er * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.arc(0, e.radius * 0.35, e.radius * 0.24, 0, Math.PI * 2);
          ctx.fill();
        } else {
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
    }

    ctx.restore();
  }

  // ---- HUD Rendering (Distinct Waves vs Team Level + Live Damage Meter!) ----
  function renderHud() {
    if (hudWave) hudWave.textContent = `WAVE ${state.wave}`;
    hudLevel.textContent = `LV ${state.level}`;
    hudScore.textContent = `${state.score.toLocaleString()} PTS`;
    hudKills.textContent = `Purged: ${state.kills}`;

    const xpPct = clamp((state.xp / Math.max(1, state.xpNeeded)) * 100, 0, 100);
    hudXpFill.style.width = xpPct.toFixed(1) + '%';

    const nextBossWave = Math.ceil((state.wave + 0.01) / 10) * 10;
    const waveLeft = Math.max(0, state.waveTarget - state.waveKills);
    if (state.bossActive) {
      hudBossHint.textContent = `BOSS WAVE ${state.wave} ACTIVE!`;
      hudBossHint.classList.add('boss-now');
    } else {
      hudBossHint.textContent = `Wave ${state.wave} · ${waveLeft} left · Boss @ Wave ${nextBossWave}`;
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

  btnLaunch.addEventListener('click', () => {
    if (room.isHost) startGame();
    else if (isCouchCaptain()) room.sendSignal({ type: 'CAPTAIN_START' });
  });
  btnPause.addEventListener('click', () => {
    if (room.isHost) togglePause();
    else if (isCouchCaptain()) room.sendSignal({ type: 'CAPTAIN_PAUSE' });
  });
  btnAutofire.addEventListener('click', toggleAutofire);
  btnMute.addEventListener('click', toggleMute);
  btnResume.addEventListener('click', () => {
    if (room.isHost) togglePause();
    else if (isCouchCaptain()) room.sendSignal({ type: 'CAPTAIN_PAUSE' });
  });
  btnRestartPause.addEventListener('click', () => {
    if (room.isHost) {
      room.sendSignal({ type: 'RETURN_LOBBY' });
      returnToLobbyUI();
    } else if (isCouchCaptain()) {
      room.sendSignal({ type: 'CAPTAIN_LOBBY' });
    }
  });
  btnPlayAgain.addEventListener('click', () => {
    if (room.isHost) startGame();
    else if (isCouchCaptain()) room.sendSignal({ type: 'CAPTAIN_START' });
  });

  // ---- Main RAF Loop ----
  let lastTs = performance.now();
  let hudTick = 0;
  let netTick = 0;
  let draftResendTick = 0;

  window.addEventListener('orientationchange', () => {
    resetPhonePad();
    if (state.mode === 'upgrade' && !room.isHost) {
      syncPhoneControllerVisibility();
      upgradeOverlay.classList.remove('hidden');
    }
  });

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

    if (state.mode === 'upgrade' && room.isHost) {
      draftResendTick += dt;
      if (draftResendTick >= 1.2) {
        draftResendTick = 0;
        resendPendingDrafts();
      }
    } else {
      draftResendTick = 0;
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
        const snapInterval = room.hasOpenFastP2p && room.hasOpenFastP2p() ? 0.03 : 0.04;
        if (netTick >= snapInterval && state.players.some((p) => !p.isLocal)) {
          netTick = 0;
          room.sendRealtime({ type: 'SNAP', s: buildSnapshot() });
        }
      } else {
        netTick += dt;
        const fastUdp = Boolean(room.hasOpenFastP2p && room.hasOpenFastP2p());
        const inputInterval = fastUdp ? 0.016 : 0.032; // 60Hz over local Wi-Fi WebRTC UDP!
        const urgent = Boolean(phonePad.urgentFlush);
        if (urgent || netTick >= inputInterval) {
          const inp = readLocalInput(0, pads);
          const inpKey = `${inp.mx.toFixed(2)}|${inp.my.toFixed(2)}|${inp.tx === null ? '' : inp.tx.toFixed(0)}|${inp.ty === null ? '' : inp.ty.toFixed(0)}|${inp.dash ? 1 : 0}|${inp.fire ? 1 : 0}`;
          const changed = inpKey !== phonePad._lastSentKey;
          if (urgent || changed || netTick >= 0.12) {
            netTick = 0;
            phonePad.urgentFlush = false;
            phonePad._lastSentKey = inpKey;
            room.sendRealtime({ type: 'INPUT', input: inp }, { urgent });
          }
        }
      }
    }

    const ctrlActive = isPhoneControllerActive();
    if (touchDashBtn) {
      const showDash = touchCtrl.isTouchDevice && state.mode === 'playing' && !ctrlActive && !room.tvMode;
      touchDashBtn.classList.toggle('visible', showDash);
      if (!showDash && touchCtrl.active) clearTouchSteer();
    }

    if (ctrlActive) {
      updatePhoneControllerHUD();
    } else {
      draw();
    }
    requestAnimationFrame(loop);
  }

  if (window.CouchAccounts && window.CouchAccounts.startVeteranSession) {
    window.CouchAccounts.startVeteranSession(
      'astro-purge',
      () => state.mode === 'playing' && !(room.isHost && room.tvMode),
      {
        onUpdate: (rank) => {
          room.updateProfile({ veteran: rank });
        },
      }
    );
  }

  requestAnimationFrame(loop);
})();
