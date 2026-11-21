/**
 * Wonder Tetris — Main Game Orchestrator, Multiplayer Sync, TV Cinema & Phone Controller
 * Integrates seamlessly with Couch Arcade's RoomSync, Unified Pre-Game Rooms, and Accounts.
 */
(function () {
  'use strict';

  const E = window.WonderEngine;
  const R = window.WonderRenderer;
  const { RoomSync, PLAYER_COLORS, getSavedPlayerName } = window.CouchRoom;

  // ---- URL & Launch Parameters ----
  const params = new URLSearchParams(window.location.search);
  const initialRoomParam = (params.get('room') || '').trim().toUpperCase();
  const explicitHost = params.get('host') === '1';
  const isHostStart = !initialRoomParam || explicitHost;
  const initialTvParam = params.get('tv') === '1';
  const initialControllerParam = params.get('controller') === '1';
  const autostartParam = params.get('autostart') === '1';

  let handoffMeta = null;
  if (autostartParam && isHostStart) {
    try {
      const raw = sessionStorage.getItem('ca_room_launch');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.gameId === 'wonder-tetris' &&
          (!initialRoomParam || parsed.roomCode === initialRoomParam) &&
          Date.now() - (parsed.ts || 0) < 30000
        ) {
          handoffMeta = parsed;
        }
      }
    } catch (e) {}
  }

  // ---- DOM References ----
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const gameCanvas = document.getElementById('game-canvas');
  const gameCtx = gameCanvas.getContext('2d');
  const stageWrap = document.getElementById('stage-wrap');
  const controllerShell = document.getElementById('controller-shell');

  const topModeSub = document.getElementById('top-mode-sub');
  const hudRoomCode = document.getElementById('hud-room-code');
  const hudNetPill = document.getElementById('hud-net-pill');
  const hudNetText = document.getElementById('hud-net-text');

  const btnMusic = document.getElementById('btn-music');
  const btnMute = document.getElementById('btn-mute');
  const btnPause = document.getElementById('btn-pause');
  const btnBackRoom = document.getElementById('btn-back-room');

  const targetBar = document.getElementById('target-bar');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownBubble = document.getElementById('countdown-bubble');

  const titleModal = document.getElementById('title-modal');
  const titleSub = document.getElementById('title-sub');
  const titleRosterPills = document.getElementById('title-roster-pills');
  const hostOptions = document.getElementById('host-options');
  const btnStartMatch = document.getElementById('btn-start-match');
  const btnCopyInvite = document.getElementById('btn-copy-invite');

  const pauseModal = document.getElementById('pause-modal');
  const btnResume = document.getElementById('btn-resume');
  const btnPauseRestart = document.getElementById('btn-pause-restart');
  const btnPauseRoom = document.getElementById('btn-pause-room');

  const victoryModal = document.getElementById('victory-modal');
  const victoryKicker = document.getElementById('victory-kicker');
  const victoryTitle = document.getElementById('victory-title');
  const victorySub = document.getElementById('victory-sub');
  const podiumList = document.getElementById('podium-list');
  const btnRematch = document.getElementById('btn-rematch');
  const btnVictoryRoom = document.getElementById('btn-victory-room');
  const kickedModal = document.getElementById('kicked-modal');

  // Phone Controller Elements
  const ctrlAvatar = document.getElementById('ctrl-avatar');
  const ctrlName = document.getElementById('ctrl-name');
  const ctrlStats = document.getElementById('ctrl-stats');
  const ctrlHoldCanvas = document.getElementById('ctrl-hold-canvas');
  const ctrlNextCanvas = document.getElementById('ctrl-next-canvas');
  const ctrlCaptainBar = document.getElementById('ctrl-captain-bar');
  const btnCtrlStart = document.getElementById('btn-ctrl-start');
  const btnCtrlPause = document.getElementById('btn-ctrl-pause');

  // ---- Audio & Renderer ----
  const audio = new window.WonderAudio();
  const backdrop = new R.StorybookBackdrop();

  function syncAudioButtons() {
    btnMusic.textContent = audio.musicOn ? '🎵' : '🔇';
    btnMusic.style.opacity = audio.musicOn ? '1' : '0.6';
    btnMute.textContent = audio.muted ? '🔇' : '🔊';
  }
  syncAudioButtons();

  btnMusic.addEventListener('click', () => {
    audio.init();
    audio.setMusicOn(!audio.musicOn);
    syncAudioButtons();
  });

  btnMute.addEventListener('click', () => {
    audio.init();
    audio.setMuted(!audio.muted);
    syncAudioButtons();
  });

  // ---- Game State ----
  const state = {
    mode: 'title', // 'title' | 'countdown' | 'playing' | 'paused' | 'victory' | 'kicked'
    botCount: 1,
    botCountManuallySet: false,
    speedPreset: 'normal',
    targetMode: 'random', // 'random' | 'leader' | 'highest'
    boards: [], // ordered array of TetrisBoard
    boardsById: {},
    botBrains: [],
    myBoard: null,
    attackArcs: [], // [{ x1, y1, x2, y2, count, color, life, maxLife }]
    boardCenters: {}, // id -> { cx, cy }
    mascot: { jump: 0, spin: 0, mood: 'happy', bubbleText: 'Let’s stack!', bubbleTimer: 2.2 },
    countdownVal: 3,
    countdownTimer: 0,
    lastSnapBroadcast: 0,
    lastCtrlHudSend: 0,
    matchStartTs: 0,
    ctrlHud: { score: 0, lines: 0, level: 1, combo: -1, hold: null, next: null, alive: true, danger: false, pg: 0 },
    time: 0,
  };

  let autostartDone = false;
  let autostartTimer = null;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function clearBootSplash() {
    document.documentElement.classList.remove('autostart-boot');
  }

  function isPhoneController() {
    return !room.isHost && (initialControllerParam || room.roomHasTv);
  }

  function isCouchCaptain() {
    if (room.isHost) return false;
    const roster = room.getOrderedPlayers();
    return Boolean(room.roomHasTv && roster.length > 0 && roster[0].id === room.myId);
  }

  function cheerMascot(text, jump = 1.0, mood = 'celebrate') {
    state.mascot.bubbleText = text;
    state.mascot.bubbleTimer = 2.0;
    state.mascot.jump = Math.max(state.mascot.jump, jump);
    state.mascot.mood = mood;
  }

  function unlockAch(id, targetPlayerId = null) {
    if (!id) return;
    if (targetPlayerId && targetPlayerId !== room.myId) {
      if (room.isHost) room.awardPlayerAchievement(targetPlayerId, id);
      return;
    }
    if (!room.tvMode && window.CouchAccounts && window.CouchAccounts.unlockAchievement) {
      window.CouchAccounts.unlockAchievement(id);
    }
  }

  function saveLocalBest(score, lines, won) {
    if (room.tvMode) return;
    try {
      const raw = localStorage.getItem('wonder_tetris_best');
      const cur = raw ? JSON.parse(raw) : { bestScore: 0, bestLines: 0, wins: 0, games: 0 };
      cur.games = (cur.games || 0) + 1;
      if (score > (cur.bestScore || 0)) cur.bestScore = score;
      if (lines > (cur.bestLines || 0)) cur.bestLines = lines;
      if (won) cur.wins = (cur.wins || 0) + 1;
      localStorage.setItem('wonder_tetris_best', JSON.stringify(cur));
    } catch (e) {}
  }

  // ---- RoomSync Multiplayer Connection ----
  const room = new RoomSync({
    gameId: 'wonder_tetris',
    codePrefix: 'T',
    maxPlayers: 5,
    roomCode: initialRoomParam || '',
    isHost: isHostStart,
    tvMode: isHostStart && initialTvParam,
    controllerMode: !isHostStart && initialControllerParam,
    playerName: getSavedPlayerName(),
    onRosterChange: (roster) => {
      if (!state.botCountManuallySet && room.isHost) {
        // Default to 0 bots when 2+ real players are in the room, or +1 friendly bot for solo!
        state.botCount = roster.length >= 2 ? 0 : 1;
        syncOptionButtons();
      }
      renderTitleRoster(roster);
      syncShellViews();
      maybeTriggerAutostart(roster);
    },
    onStatusChange: (status, label) => {
      hudNetText.textContent = label;
      hudNetPill.classList.toggle('ok', status === 'ok');
    },
    onRoomFull: () => {
      clearBootSplash();
      titleSub.textContent = 'This Wonder Tetris room is full (5/5). Return to the Main Menu to open a new room!';
      btnStartMatch.disabled = true;
    },
    onKicked: () => {
      clearBootSplash();
      state.mode = 'kicked';
      audio.stopBgm();
      titleModal.classList.add('hidden');
      pauseModal.classList.add('hidden');
      victoryModal.classList.add('hidden');
      kickedModal.classList.remove('hidden');
    },
    onMessage: handleRoomMessage,
  });

  function maybeTriggerAutostart(roster) {
    if (!autostartParam || !room.isHost || autostartDone || state.mode !== 'title') return;
    const expected = handoffMeta ? Math.max(1, handoffMeta.expectedCount || 1) : 1;
    if (roster.length >= expected) {
      autostartDone = true;
      clearTimeout(autostartTimer);
      setTimeout(() => {
        if (state.mode === 'title' && room.getOrderedPlayers().length > 0) {
          hostStartMatch();
        }
      }, 240);
    } else if (roster.length > 0 && !autostartTimer) {
      autostartTimer = setTimeout(() => {
        if (!autostartDone && state.mode === 'title' && room.getOrderedPlayers().length > 0) {
          autostartDone = true;
          hostStartMatch();
        }
      }, 2200);
    }
  }

  // ---- Shell & View Sync ----
  function syncShellViews() {
    const isCtrl = isPhoneController();
    const isTv = room.isHost && room.tvMode;

    if (isTv) {
      topModeSub.textContent = '📺 TV Cinema Mode · 1–5P';
    } else if (isCtrl) {
      topModeSub.textContent = '📱 Phone Controller';
    } else {
      topModeSub.textContent = 'Storybook Block Party';
    }

    stageWrap.classList.toggle('hidden', isCtrl);
    controllerShell.classList.toggle('hidden', !isCtrl);

    const showTouch = isTouchDevice && !isCtrl && !isTv && state.mode === 'playing';
    document.body.classList.toggle('show-touch-bar', showTouch);

    const showTargetBar = !isCtrl && !isTv && state.mode === 'playing' && state.boards.length >= 2;
    targetBar.classList.toggle('hidden', !showTargetBar);

    btnPause.classList.toggle('hidden', state.mode !== 'playing' && state.mode !== 'paused');

    if (isCtrl) {
      titleModal.classList.add('hidden');
      const me = room.getMyPlayer();
      const cap = isCouchCaptain();
      ctrlAvatar.textContent = (me && me.avatar) || '🌟';
      ctrlName.textContent = (me && me.name) || room.myName;
      ctrlCaptainBar.classList.toggle('hidden', !cap);
      btnCtrlStart.classList.toggle('hidden', state.mode === 'playing' || state.mode === 'countdown');
      btnCtrlPause.classList.toggle('hidden', state.mode !== 'playing' && state.mode !== 'paused');
      btnCtrlPause.textContent = state.mode === 'paused' ? '▶ Resume TV' : '⏸️ Pause TV';
      if (state.mode === 'title') {
        ctrlStats.textContent = cap ? '★ You are Captain — Tap Start below!' : 'Connected to TV · Waiting for match!';
      }
    }
  }

  function renderTitleRoster(roster) {
    titleRosterPills.innerHTML = '';
    roster.forEach((p, idx) => {
      const pal = PLAYER_COLORS[(p.slot !== undefined ? p.slot : idx) % PLAYER_COLORS.length];
      const pill = document.createElement('div');
      pill.className = 'roster-pill';
      pill.style.borderColor = pal.hex;
      const tag = p.isHost ? ' (Host)' : p.isController ? ' 📱' : '';
      pill.textContent = `${p.avatar || '🌟'} ${p.name}${tag}`;
      titleRosterPills.appendChild(pill);
    });

    if (room.isHost && state.botCount > 0) {
      const botSlots = Math.min(state.botCount, Math.max(0, 5 - roster.length));
      for (let i = 0; i < botSlots; i++) {
        const bot = E.BOT_ROSTER[i % E.BOT_ROSTER.length];
        const pill = document.createElement('div');
        pill.className = 'roster-pill';
        pill.style.background = '#fef9c3';
        pill.textContent = `${bot.avatar} ${bot.name} (Bot)`;
        titleRosterPills.appendChild(pill);
      }
    }

    hostOptions.classList.toggle('hidden', !room.isHost);
    if (room.isHost) {
      btnStartMatch.disabled = roster.length === 0;
      btnStartMatch.textContent =
        roster.length === 0
          ? 'Waiting for Players...'
          : `✨ Start Block Party! (${Math.min(5, roster.length + state.botCount)}P)`;
    } else if (isCouchCaptain()) {
      btnStartMatch.disabled = false;
      btnStartMatch.textContent = '🚀 Launch on TV!';
    } else {
      btnStartMatch.disabled = true;
      btnStartMatch.textContent = 'Waiting for Host to Start...';
    }
  }

  function syncOptionButtons() {
    document.querySelectorAll('#opt-bots .seg-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.val) === state.botCount);
    });
    document.querySelectorAll('#opt-speed .seg-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === state.speedPreset);
    });
    renderTitleRoster(room.getOrderedPlayers());
  }

  document.querySelectorAll('#opt-bots .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!room.isHost) return;
      state.botCount = Number(btn.dataset.val) || 0;
      state.botCountManuallySet = true;
      syncOptionButtons();
    });
  });

  document.querySelectorAll('#opt-speed .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!room.isHost) return;
      state.speedPreset = btn.dataset.val || 'normal';
      syncOptionButtons();
    });
  });

  document.querySelectorAll('.target-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.targetMode = chip.dataset.target || 'random';
      document.querySelectorAll('.target-chip').forEach((c) => {
        c.classList.toggle('active', c === chip);
      });
    });
  });

  // ---- Match Start & Setup ----
  function buildParticipants(roster) {
    const list = [];
    roster.forEach((p, idx) => {
      const pal = PLAYER_COLORS[(p.slot !== undefined ? p.slot : idx) % PLAYER_COLORS.length];
      list.push({
        id: p.id,
        name: p.name,
        avatar: p.avatar || '🌟',
        color: pal.hex,
        slot: p.slot !== undefined ? p.slot : idx,
        isBot: false,
      });
    });

    const maxBots = Math.min(state.botCount, Math.max(0, 5 - list.length));
    for (let i = 0; i < maxBots; i++) {
      const bot = E.BOT_ROSTER[i % E.BOT_ROSTER.length];
      const slot = list.length;
      list.push({
        id: `bot_${i + 1}`,
        name: bot.name,
        avatar: bot.avatar,
        color: bot.color,
        slot,
        isBot: true,
        botSkill: bot.skill,
      });
    }
    return list;
  }

  function hostStartMatch() {
    if (!room.isHost) return;
    const roster = room.getOrderedPlayers();
    if (roster.length === 0) return;

    const seed = Math.floor(Math.random() * 2147483640) + 1;
    const participants = buildParticipants(roster);
    const payload = {
      type: 'MATCH_START',
      seed,
      speedPreset: state.speedPreset,
      participants,
      tvMode: room.tvMode,
    };
    room.sendSignal(payload);
    startMatchLocal(payload);
  }

  function startMatchLocal(cfg) {
    clearBootSplash();
    audio.init();
    titleModal.classList.add('hidden');
    pauseModal.classList.add('hidden');
    victoryModal.classList.add('hidden');

    state.speedPreset = cfg.speedPreset || 'normal';
    state.boards = [];
    state.boardsById = {};
    state.botBrains = [];
    state.attackArcs = [];
    state.myBoard = null;
    state.matchStartTs = Date.now();
    for (const k of Object.keys(tvCtrlState)) delete tvCtrlState[k];

    const participants = cfg.participants || [];
    for (const p of participants) {
      const b = new E.TetrisBoard({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        slot: p.slot,
        isBot: p.isBot,
        botSkill: p.botSkill || 0.65,
        speedPreset: state.speedPreset,
        seed: cfg.seed,
        onEvent: (ev) => handleBoardEvent(ev),
      });
      state.boards.push(b);
      state.boardsById[b.id] = b;
      if (p.id === room.myId) {
        state.myBoard = b;
      }
      if (room.isHost && p.isBot) {
        state.botBrains.push(new E.BotBrain(b, p.botSkill || 0.65));
      }
    }

    // Start joyful 3-2-1-STACK! countdown
    state.mode = 'countdown';
    state.countdownVal = 3;
    state.countdownTimer = 0.72;
    showCountdownText('3');
    audio.playCountdown(false);
    cheerMascot('Ready, set...', 0.9, 'happy');
    syncShellViews();
  }

  function showCountdownText(txt) {
    countdownOverlay.classList.remove('hidden');
    countdownBubble.textContent = txt;
    countdownBubble.style.animation = 'none';
    void countdownBubble.offsetWidth;
    countdownBubble.style.animation = '';
  }

  // ---- Board Events (Audio, FX, Attacks, Achievements) ----
  function pickTargetBoard(attackerId) {
    const candidates = state.boards.filter((b) => b.id !== attackerId && b.alive);
    if (candidates.length === 0) return null;
    if (state.targetMode === 'leader') {
      return candidates.slice().sort((a, b) => b.score - a.score)[0];
    }
    if (state.targetMode === 'highest') {
      const heightOf = (b) => {
        for (let r = 0; r < E.TOTAL_ROWS; r++) {
          if (b.grid[r].some((c) => c !== null)) return E.TOTAL_ROWS - r;
        }
        return 0;
      };
      return candidates.slice().sort((a, b) => heightOf(b) - heightOf(a))[0];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function spawnAttackArc(fromId, targetId, count, color) {
    const p1 = state.boardCenters[fromId];
    const p2 = state.boardCenters[targetId];
    if (!p1 || !p2) return;
    state.attackArcs.push({
      x1: p1.cx,
      y1: p1.cy - 40,
      x2: p2.cx,
      y2: p2.cy - 30,
      count,
      color: color || '#fde047',
      life: 0.68,
      maxLife: 0.68,
    });
  }

  function handleBoardEvent(ev) {
    const b = ev.board;
    const isMine = b === state.myBoard;
    const isTv = room.isHost && room.tvMode;
    const playSfx = isMine || isTv;

    if (ev.type === 'MOVE') {
      if (isMine) audio.playMove();
    } else if (ev.type === 'ROTATE') {
      if (isMine) audio.playRotate();
    } else if (ev.type === 'SOFT_DROP') {
      if (isMine) audio.playSoftDrop();
    } else if (ev.type === 'HOLD') {
      if (playSfx) audio.playHold();
    } else if (ev.type === 'LOCK') {
      if (isMine) audio.playLock();
    } else if (ev.type === 'HARD_DROP') {
      if (playSfx) audio.playHardDrop();
      if (isMine && !isTv) pushMySnapshot(true);
    } else if (ev.type === 'GARBAGE_RISE') {
      if (playSfx) audio.playGarbageHit();
      if (isMine) cheerMascot('Whoa! Bubbles!', 0.6, 'happy');
    } else if (ev.type === 'LINE_CLEAR') {
      if (playSfx) {
        audio.playLineClear(ev.lines, ev.combo, ev.isTSpin);
        if (ev.lines >= 3 || ev.isTSpin || ev.combo >= 2) {
          backdrop.boostRainbow(1.0);
          backdrop.spawnCelebrationBurst(0.2 + Math.random() * 0.6, 0.28);
        } else {
          backdrop.boostRainbow(0.55);
        }
      }

      // Mascot cheering!
      if (isMine || isTv) {
        if (ev.isPerfectClear) cheerMascot('PERFECT! 🌟', 1.35);
        else if (ev.lines >= 4) cheerMascot('FANTASIA! ✨', 1.3);
        else if (ev.isTSpin) cheerMascot('T-SPIN MAGIC!', 1.2);
        else if (ev.combo >= 2) cheerMascot(`${ev.combo + 1}x RAINBOW!`, 1.15);
        else if (ev.lines >= 2) cheerMascot('Splendid!', 0.9);
        else cheerMascot('Yay!', 0.6);
      }

      // Achievements!
      if (!b.isBot) {
        if (ev.lines >= 4) unlockAch('wt_tetris_clear', b.id);
        if (ev.combo >= 2) unlockAch('wt_combo_queen', b.id);
        if (b.level >= 5) unlockAch('wt_level_five', b.id);
      }

      // Multiplayer Giggle-Garbage Attack!
      if (ev.attack > 0 && state.boards.length >= 2) {
        const target = pickTargetBoard(b.id);
        if (target) {
          if (playSfx) audio.playAttackSend();
          if (room.isHost && (room.tvMode || b.isBot)) {
            // Host directly delivers & broadcasts FX
            if (room.tvMode || target.isBot || target.id === room.myId) {
              target.queueGarbage(ev.attack, b.id, b.name, b.color);
            } else {
              room.sendToPlayer(target.id, {
                type: 'ATTACK_DELIVER',
                fromId: b.id,
                fromName: b.name,
                color: b.color,
                count: ev.attack,
              });
            }
            spawnAttackArc(b.id, target.id, ev.attack, b.color);
            room.sendSignal({
              type: 'ATTACK_FX',
              fromId: b.id,
              targetId: target.id,
              count: ev.attack,
              color: b.color,
            });
          } else if (isMine) {
            // Standard non-TV player sends attack through room
            spawnAttackArc(b.id, target.id, ev.attack, b.color);
            if (room.isHost) {
              if (target.isBot) {
                target.queueGarbage(ev.attack, b.id, b.name, b.color);
              } else {
                room.sendToPlayer(target.id, {
                  type: 'ATTACK_DELIVER',
                  fromId: b.id,
                  fromName: b.name,
                  color: b.color,
                  count: ev.attack,
                });
              }
              room.sendSignal({
                type: 'ATTACK_FX',
                fromId: b.id,
                targetId: target.id,
                count: ev.attack,
                color: b.color,
              });
            } else {
              room.sendSignal({
                type: 'ATTACK_REQ',
                fromId: b.id,
                fromName: b.name,
                color: b.color,
                targetId: target.id,
                count: ev.attack,
              });
            }
          }
        }
      }

      if (isMine && !isTv) pushMySnapshot(true);
    } else if (ev.type === 'KO') {
      if (playSfx) audio.playKo();
      if (ev.attackerId && state.boardsById[ev.attackerId]) {
        state.boardsById[ev.attackerId].koCount++;
      }
      if (isMine && !room.isHost) {
        room.sendSignal({ type: 'PLAYER_KO', playerId: b.id, score: b.score, lines: b.lines, attackerId: ev.attackerId });
        pushMySnapshot(true);
      }
      if (room.isHost) {
        checkMatchOverHost();
      }
    }
  }

  function checkMatchOverHost() {
    if (!room.isHost || state.mode !== 'playing') return;
    const total = state.boards.length;
    const aliveBoards = state.boards.filter((b) => b.alive);

    const over = total <= 1 ? aliveBoards.length === 0 : aliveBoards.length <= 1;
    if (!over) return;

    const rankings = state.boards
      .slice()
      .sort((a, b) => {
        if (a.alive !== b.alive) return a.alive ? -1 : 1;
        if (b.finishedAt !== a.finishedAt) return (b.finishedAt || 0) - (a.finishedAt || 0);
        return b.score - a.score;
      })
      .map((b, idx) => ({
        rank: idx + 1,
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        color: b.color,
        isBot: b.isBot,
        score: b.score,
        lines: b.lines,
        level: b.level,
        koCount: b.koCount,
        alive: b.alive,
      }));

    // Award achievements to participants
    for (const r of rankings) {
      if (r.isBot) continue;
      unlockAch('wt_first_game', r.id);
      if (total >= 2 && r.rank === 1) {
        unlockAch('wt_crown_winner', r.id);
      }
    }

    const payload = { type: 'MATCH_OVER', rankings, totalParticipants: total };
    room.sendSignal(payload);
    showVictoryModal(payload);
  }

  function showVictoryModal(payload) {
    state.mode = 'victory';
    audio.stopBgm();
    audio.playVictory();
    backdrop.boostRainbow(1.0);
    backdrop.spawnCelebrationBurst(0.25, 0.25);
    backdrop.spawnCelebrationBurst(0.75, 0.25);
    backdrop.spawnCelebrationBurst(0.5, 0.2);

    const rankings = payload.rankings || [];
    const winner = rankings[0];
    const total = payload.totalParticipants || rankings.length;

    if (total <= 1 && winner) {
      victoryKicker.textContent = '🌟 MARATHON COMPLETE 🌟';
      victoryTitle.textContent = `${Number(winner.score).toLocaleString()} Points!`;
      victorySub.textContent = `${winner.lines} lines cleared · Reached Level ${winner.level}!`;
    } else if (winner) {
      victoryKicker.textContent = '👑 ROYAL BLOCK CHAMPION 👑';
      victoryTitle.textContent = `${winner.avatar} ${winner.name} Wins!`;
      victorySub.textContent = 'What a magical storybook block battle!';
    }

    // Save local stats for this player
    const myRank = rankings.find((r) => r.id === room.myId);
    if (myRank) {
      saveLocalBest(myRank.score, myRank.lines, total >= 2 && myRank.rank === 1);
      unlockAch('wt_first_game');
      if (total >= 2 && myRank.rank === 1) unlockAch('wt_crown_winner');
    }

    podiumList.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉', '⭐', '🌟'];
    rankings.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'podium-row' + (i === 0 ? ' winner' : '');
      row.innerHTML = `
        <div class="podium-left">
          <span>${medals[i] || '✨'}</span>
          <span>${escapeHtml(r.avatar)} ${escapeHtml(r.name)}${r.isBot ? ' (Bot)' : ''}</span>
        </div>
        <div class="podium-right">
          <div>${Number(r.score).toLocaleString()} pts</div>
          <div style="font-size:0.74rem; color:#4c4566;">${r.lines} lines · Lv ${r.level}${r.koCount ? ` · ${r.koCount} KO` : ''}</div>
        </div>
      `;
      podiumList.appendChild(row);
    });

    btnRematch.classList.toggle('hidden', !room.isHost && !isCouchCaptain());
    victoryModal.classList.remove('hidden');
    syncShellViews();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }

  // ---- Networking Messages ----
  function pushMySnapshot(force = false) {
    if (!state.myBoard || room.tvMode || isPhoneController()) return;
    const now = performance.now();
    if (!force && now - state.lastSnapBroadcast < 75) return;
    state.lastSnapBroadcast = now;
    const snap = state.myBoard.serialize();
    if (room.isHost) {
      broadcastWorldSnapshot();
    } else {
      room.sendRealtime({ type: 'BOARD_SNAP', snap });
    }
  }

  function broadcastWorldSnapshot() {
    if (!room.isHost || state.boards.length === 0) return;
    const snaps = state.boards.map((b) => b.serialize());
    room.sendRealtime({ type: 'WORLD_SNAP', snaps });
  }

  function handleRoomMessage(msg) {
    if (!msg || !msg.type) return;

    // Guest receives Match Start
    if (msg.type === 'MATCH_START' && !room.isHost) {
      startMatchLocal(msg);
      return;
    }

    if (msg.type === 'MATCH_OVER' && !room.isHost) {
      showVictoryModal(msg);
      return;
    }

    if (msg.type === 'PAUSE_SYNC' && !room.isHost) {
      if (msg.paused && state.mode === 'playing') {
        state.mode = 'paused';
        pauseModal.classList.remove('hidden');
        audio.stopBgm();
      } else if (!msg.paused && state.mode === 'paused') {
        state.mode = 'playing';
        pauseModal.classList.add('hidden');
        audio.startBgm();
      }
      syncShellViews();
      return;
    }

    // Attack visual arc for everyone
    if (msg.type === 'ATTACK_FX') {
      spawnAttackArc(msg.fromId, msg.targetId, msg.count, msg.color);
      return;
    }

    // Target receives giggle-garbage!
    if (msg.type === 'ATTACK_DELIVER') {
      if (state.myBoard && state.myBoard.alive) {
        state.myBoard.queueGarbage(msg.count, msg.fromId, msg.fromName, msg.color);
      }
      return;
    }

    // Host handles guest attack requests
    if (msg.type === 'ATTACK_REQ' && room.isHost) {
      const target = state.boardsById[msg.targetId] || pickTargetBoard(msg.fromId);
      if (!target || !target.alive) return;
      spawnAttackArc(msg.fromId, target.id, msg.count, msg.color);
      if (target.id === room.myId || target.isBot || room.tvMode) {
        target.queueGarbage(msg.count, msg.fromId, msg.fromName, msg.color);
      } else {
        room.sendToPlayer(target.id, {
          type: 'ATTACK_DELIVER',
          fromId: msg.fromId,
          fromName: msg.fromName,
          color: msg.color,
          count: msg.count,
        });
      }
      room.sendSignal({
        type: 'ATTACK_FX',
        fromId: msg.fromId,
        targetId: target.id,
        count: msg.count,
        color: msg.color,
      });
      return;
    }

    // Non-TV Guest sends its board snapshot to Host
    if (msg.type === 'BOARD_SNAP' && room.isHost && !room.tvMode && msg.snap) {
      const b = state.boardsById[msg.snap.id];
      if (b && b !== state.myBoard && !b.isBot) {
        const wasAlive = b.alive;
        b.applySnapshot(msg.snap);
        if (wasAlive && !b.alive) {
          b.finishedAt = Date.now();
          checkMatchOverHost();
        }
      }
      return;
    }

    if (msg.type === 'PLAYER_KO' && room.isHost && !room.tvMode) {
      const b = state.boardsById[msg.playerId];
      if (b && b.alive) {
        b.alive = false;
        b.finishedAt = Date.now();
        b.score = msg.score || b.score;
        b.lines = msg.lines || b.lines;
        if (msg.attackerId && state.boardsById[msg.attackerId]) {
          state.boardsById[msg.attackerId].koCount++;
        }
        checkMatchOverHost();
      }
      return;
    }

    // Guests apply host's world snapshot (to display live rival mini-boards)
    if (msg.type === 'WORLD_SNAP' && !room.isHost && Array.isArray(msg.snaps)) {
      for (const snap of msg.snaps) {
        const b = state.boardsById[snap.id];
        if (!b) continue;
        // Never overwrite our own locally-simulated board in standard online mode!
        if (b === state.myBoard && !isPhoneController()) continue;
        b.applySnapshot(snap);
      }
      return;
    }

    // TV Mode: Host receives low-latency Phone Controller digital button state changes!
    // Sending { b: 'L'|'R'|'D'|'CW'|'CCW'|'DROP'|'HOLD', s: 1|0 } on pointerdown/pointerup
    // lets the TV run silky-smooth native 60fps DAS/ARR with only 2 tiny UDP packets per hold!
    if (msg.type === 'CTRL_BTN' && room.isHost && room.tvMode) {
      if (state.mode !== 'playing') return;
      const pid = msg.senderId;
      const b = state.boardsById[pid];
      if (!b || !b.alive) return;
      let st = tvCtrlState[pid];
      if (!st) {
        st = { left: false, right: false, down: false, dir: 0, das: 0, arr: 0, downTimer: 0 };
        tvCtrlState[pid] = st;
      }
      const pressed = Boolean(msg.s);
      if (msg.b === 'L') {
        st.left = pressed;
        if (pressed) {
          b.move(-1);
          st.dir = -1;
          st.das = 0.14;
          st.arr = 0;
        } else {
          st.dir = st.right ? 1 : 0;
          if (st.dir !== 0) st.das = 0.14;
        }
      } else if (msg.b === 'R') {
        st.right = pressed;
        if (pressed) {
          b.move(1);
          st.dir = 1;
          st.das = 0.14;
          st.arr = 0;
        } else {
          st.dir = st.left ? -1 : 0;
          if (st.dir !== 0) st.das = 0.14;
        }
      } else if (msg.b === 'D') {
        st.down = pressed;
        if (pressed) {
          b.softDrop();
          st.downTimer = 0.055;
        }
      } else if (pressed) {
        if (msg.b === 'CW') b.rotate(1);
        else if (msg.b === 'CCW') b.rotate(-1);
        else if (msg.b === 'DROP') b.hardDrop();
        else if (msg.b === 'HOLD') b.holdPiece();
      }
      return;
    }

    // Legacy / single-action fallback
    if (msg.type === 'CTRL_ACT' && room.isHost && room.tvMode) {
      if (state.mode !== 'playing') return;
      const b = state.boardsById[msg.senderId];
      if (!b || !b.alive) return;
      if (msg.action === 'left') b.move(-1);
      else if (msg.action === 'right') b.move(1);
      else if (msg.action === 'down') b.softDrop();
      else if (msg.action === 'drop') b.hardDrop();
      else if (msg.action === 'rotCW') b.rotate(1);
      else if (msg.action === 'rotCCW') b.rotate(-1);
      else if (msg.action === 'hold') b.holdPiece();
      return;
    }

    // TV Mode: Phone Controller receives compact HUD update!
    if (msg.type === 'CTRL_HUD' && isPhoneController()) {
      state.ctrlHud = msg.hud || state.ctrlHud;
      updatePhoneControllerHud();
      return;
    }

    // TV Mode: Couch Captain controls!
    if (room.isHost && room.tvMode) {
      if (msg.type === 'CAPTAIN_START' && (state.mode === 'title' || state.mode === 'victory')) {
        hostStartMatch();
      } else if (msg.type === 'CAPTAIN_PAUSE' && (state.mode === 'playing' || state.mode === 'paused')) {
        togglePause();
      }
    }
  }

  // Per-player TV-side DAS/ARR state for zero-jitter remote holds
  const tvCtrlState = {};

  // ---- Phone Controller Input & HUD (UDP State-Change Protocol) ----
  function sendControllerBtn(btnCode, isDown) {
    if (!isPhoneController()) return;
    if (isDown) {
      if (window.CouchRoom && window.CouchRoom.requestWakeLock) {
        window.CouchRoom.requestWakeLock();
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(btnCode === 'DROP' ? 22 : 15); } catch (e) {}
      }
    }
    // Fly immediately over local Wi-Fi WebRTC UDP DataChannel (with edge dedupe!)
    room.sendRealtime({ type: 'CTRL_BTN', b: btnCode, s: isDown ? 1 : 0 }, { urgent: true, edge: true });
  }

  function updatePhoneControllerHud() {
    const h = state.ctrlHud;
    const statusLabel = !h.alive ? '★ Knocked Out!' : h.danger ? '⚠️ Stack High!' : 'Watch the TV!';
    ctrlStats.textContent = `Score ${Number(h.score || 0).toLocaleString()} · Lv ${h.level || 1} · ${statusLabel}`;

    const hCtx = ctrlHoldCanvas.getContext('2d');
    hCtx.clearRect(0, 0, ctrlHoldCanvas.width, ctrlHoldCanvas.height);
    if (h.hold) R.drawPiecePreview(hCtx, h.hold, 0, 0, ctrlHoldCanvas.width, ctrlHoldCanvas.height, state.time);

    const nCtx = ctrlNextCanvas.getContext('2d');
    nCtx.clearRect(0, 0, ctrlNextCanvas.width, ctrlNextCanvas.height);
    if (h.next) R.drawPiecePreview(nCtx, h.next, 0, 0, ctrlNextCanvas.width, ctrlNextCanvas.height, state.time);
  }

  function bindDigitalControllerBtn(el, btnCode, sendRelease = false) {
    if (!el) return;
    let activePtr = null;
    const down = (ev) => {
      ev.preventDefault();
      if (activePtr !== null) return;
      activePtr = ev.pointerId;
      if (el.setPointerCapture) {
        try { el.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      audio.init();
      el.classList.add('pressed');
      sendControllerBtn(btnCode, true);
    };
    const up = (ev) => {
      if (activePtr !== null && ev && ev.pointerId !== undefined && ev.pointerId !== activePtr) return;
      if (activePtr === null) return;
      activePtr = null;
      el.classList.remove('pressed');
      if (sendRelease) sendControllerBtn(btnCode, false);
    };
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  function bindHoldButton(el, onPress, repeatMs = 0) {
    if (!el) return;
    let repTimer = null;
    let delayTimer = null;
    let activePtr = null;
    const stop = (ev) => {
      if (activePtr !== null && ev && ev.pointerId !== undefined && ev.pointerId !== activePtr) return;
      activePtr = null;
      el.classList.remove('pressed');
      clearTimeout(delayTimer);
      clearInterval(repTimer);
      delayTimer = null;
      repTimer = null;
    };
    const start = (ev) => {
      ev.preventDefault();
      if (activePtr !== null) return;
      activePtr = ev.pointerId;
      if (el.setPointerCapture) {
        try { el.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      audio.init();
      el.classList.add('pressed');
      if (navigator.vibrate) { try { navigator.vibrate(14); } catch (e) {} }
      onPress();
      if (repeatMs > 0) {
        delayTimer = setTimeout(() => {
          repTimer = setInterval(onPress, repeatMs);
        }, 140);
      }
    };
    el.addEventListener('pointerdown', start, { passive: false });
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('lostpointercapture', stop);
  }

  // Phone Controller Buttons (TV Mode — State-Change UDP Protocol!)
  bindDigitalControllerBtn(document.getElementById('c-left'), 'L', true);
  bindDigitalControllerBtn(document.getElementById('c-right'), 'R', true);
  bindDigitalControllerBtn(document.getElementById('c-down'), 'D', true);
  bindDigitalControllerBtn(document.getElementById('c-rot-cw'), 'CW', false);
  bindDigitalControllerBtn(document.getElementById('c-rot-ccw'), 'CCW', false);
  bindDigitalControllerBtn(document.getElementById('c-drop'), 'DROP', false);
  bindDigitalControllerBtn(document.getElementById('c-hold'), 'HOLD', false);

  window.addEventListener('blur', () => {
    if (isPhoneController()) {
      sendControllerBtn('L', false);
      sendControllerBtn('R', false);
      sendControllerBtn('D', false);
    }
  });

  btnCtrlStart.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio.init();
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (err) {} }
    room.sendSignal({ type: 'CAPTAIN_START' });
  }, { passive: false });
  btnCtrlPause.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
    room.sendSignal({ type: 'CAPTAIN_PAUSE' });
  }, { passive: false });

  // Mobile Standalone Touch Controls
  function doLocalAction(action) {
    if (state.mode !== 'playing' || !state.myBoard || !state.myBoard.alive) return;
    if (action === 'left') state.myBoard.move(-1);
    else if (action === 'right') state.myBoard.move(1);
    else if (action === 'down') state.myBoard.softDrop();
    else if (action === 'rotCW') state.myBoard.rotate(1);
    else if (action === 'rotCCW') state.myBoard.rotate(-1);
    else if (action === 'drop') state.myBoard.hardDrop();
    else if (action === 'hold') state.myBoard.holdPiece();
  }

  bindHoldButton(document.getElementById('m-left'), () => doLocalAction('left'), 48);
  bindHoldButton(document.getElementById('m-right'), () => doLocalAction('right'), 48);
  bindHoldButton(document.getElementById('m-down'), () => doLocalAction('down'), 48);
  bindHoldButton(document.getElementById('m-rot'), () => doLocalAction('rotCW'));
  bindHoldButton(document.getElementById('m-drop'), () => doLocalAction('drop'));
  bindHoldButton(document.getElementById('m-hold'), () => doLocalAction('hold'));

  // ---- Snappy Keyboard Controls with DAS / ARR ----
  const heldKeys = {};
  const dasState = { dir: 0, timer: 0, arrTimer: 0, downHeld: false, downTimer: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const code = e.code;

    if (code === 'Escape' || code === 'KeyP') {
      if (state.mode === 'playing' || state.mode === 'paused') {
        e.preventDefault();
        togglePause();
      }
      return;
    }

    if (state.mode !== 'playing' || !state.myBoard || room.tvMode || isPhoneController()) return;
    audio.init();

    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (heldKeys[code]) return;
    heldKeys[code] = true;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      doLocalAction('left');
      dasState.dir = -1;
      dasState.timer = 0.14;
      dasState.arrTimer = 0;
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      doLocalAction('right');
      dasState.dir = 1;
      dasState.timer = 0.14;
      dasState.arrTimer = 0;
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      doLocalAction('down');
      dasState.downHeld = true;
      dasState.downTimer = 0.055;
    } else if (code === 'ArrowUp' || code === 'KeyX' || code === 'KeyW') {
      doLocalAction('rotCW');
    } else if (code === 'KeyZ' || code === 'ControlLeft' || code === 'ControlRight') {
      doLocalAction('rotCCW');
    } else if (code === 'Space') {
      doLocalAction('drop');
    } else if (code === 'KeyC' || code === 'ShiftLeft' || code === 'ShiftRight') {
      doLocalAction('hold');
    }
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    delete heldKeys[code];
    if (code === 'ArrowLeft' || code === 'KeyA') {
      if (heldKeys['ArrowRight'] || heldKeys['KeyD']) {
        dasState.dir = 1;
        dasState.timer = 0.14;
      } else if (dasState.dir === -1) {
        dasState.dir = 0;
      }
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      if (heldKeys['ArrowLeft'] || heldKeys['KeyA']) {
        dasState.dir = -1;
        dasState.timer = 0.14;
      } else if (dasState.dir === 1) {
        dasState.dir = 0;
      }
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      dasState.downHeld = false;
    }
  });

  // ---- Pause & Navigation Buttons ----
  function togglePause() {
    if (!room.isHost && state.boards.length >= 2) return; // Host controls multiplayer pause
    if (state.mode === 'playing') {
      state.mode = 'paused';
      pauseModal.classList.remove('hidden');
      audio.stopBgm();
      if (room.isHost) room.sendSignal({ type: 'PAUSE_SYNC', paused: true });
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
      pauseModal.classList.add('hidden');
      audio.startBgm();
      if (room.isHost) room.sendSignal({ type: 'PAUSE_SYNC', paused: false });
    }
    syncShellViews();
  }

  function goBackToRoom() {
    const url = new URL('../../room.html', window.location.href);
    url.searchParams.set('game', 'wonder-tetris');
    url.searchParams.set('room', room.roomCode);
    if (room.isHost) url.searchParams.set('host', '1');
    if (room.isHost && room.tvMode) url.searchParams.set('tv', '1');
    if (!room.isHost && isPhoneController()) url.searchParams.set('controller', '1');
    window.location.href = url.toString();
  }

  btnPause.addEventListener('click', togglePause);
  btnResume.addEventListener('click', togglePause);
  btnPauseRestart.addEventListener('click', () => {
    if (room.isHost) hostStartMatch();
  });
  btnBackRoom.addEventListener('click', goBackToRoom);
  btnPauseRoom.addEventListener('click', goBackToRoom);
  btnVictoryRoom.addEventListener('click', goBackToRoom);

  btnStartMatch.addEventListener('click', () => {
    audio.init();
    if (room.isHost) hostStartMatch();
    else if (isCouchCaptain()) room.sendSignal({ type: 'CAPTAIN_START' });
  });

  btnRematch.addEventListener('click', () => {
    audio.init();
    if (room.isHost) hostStartMatch();
    else if (isCouchCaptain()) room.sendSignal({ type: 'CAPTAIN_START' });
  });

  btnCopyInvite.addEventListener('click', async () => {
    const url = new URL('../../room.html', window.location.href);
    url.searchParams.set('game', 'wonder-tetris');
    url.searchParams.set('room', room.roomCode);
    if (room.tvMode) url.searchParams.set('controller', '1');
    try {
      await navigator.clipboard.writeText(url.toString());
      btnCopyInvite.textContent = '✓ Invite Copied!';
      setTimeout(() => (btnCopyInvite.textContent = '📋 Copy Invite Link'), 1800);
    } catch (e) {
      window.prompt('Share this Wonder Tetris room link:', url.toString());
    }
  });

  // ---- Canvas Sizing (Full Retina DPR) ----
  let dpr = 1;
  let bgW = 1, bgH = 1, stageW = 1, stageH = 1;

  function resizeCanvases() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    bgW = window.innerWidth;
    bgH = window.innerHeight;
    bgCanvas.width = Math.round(bgW * dpr);
    bgCanvas.height = Math.round(bgH * dpr);
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rect = stageWrap.getBoundingClientRect();
    stageW = Math.max(1, rect.width);
    stageH = Math.max(1, rect.height);
    gameCanvas.width = Math.round(stageW * dpr);
    gameCanvas.height = Math.round(stageH * dpr);
    gameCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // ---- Storybook Side Card Helper (Rendered on Main Canvas!) ----
  function drawStoryCard(ctx, x, y, w, h, title, accent = '#38bdf8') {
    ctx.save();
    R.roundRectPath(ctx, x + 2, y + 5, w, h, 18);
    ctx.fillStyle = 'rgba(30, 27, 46, 0.16)';
    ctx.fill();

    R.roundRectPath(ctx, x, y, w, h, 18);
    ctx.fillStyle = 'rgba(255, 253, 248, 0.96)';
    ctx.fill();
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Header ribbon pill
    if (title) {
      R.roundRectPath(ctx, x + 10, y - 12, Math.min(w - 20, 120), 23, 11);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.strokeStyle = '#1e1b2e';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.font = '700 12px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + 10 + Math.min(w - 20, 120) / 2, y - 0.5);
    }
    ctx.restore();
  }

  // ---- Main Render Pipeline ----
  function renderStage() {
    if (isPhoneController()) return;
    gameCtx.clearRect(0, 0, stageW, stageH);

    if (state.boards.length === 0) return;

    const leaderId = state.boards
      .slice()
      .sort((a, b) => (b.alive - a.alive) || (b.score - a.score))[0]?.id;

    // 1. TV MODE: WIDESCREEN 1–5P CINEMA LAYOUT!
    if (room.isHost && room.tvMode) {
      const n = state.boards.length;
      const topPad = 46;
      const botPad = 18;
      const sidePad = 20;
      const gap = n >= 4 ? 16 : 26;
      const availW = stageW - sidePad * 2 - gap * (n - 1);
      const availH = stageH - topPad - botPad;
      const colW = availW / n;

      state.boards.forEach((b, idx) => {
        const rx = sidePad + idx * (colW + gap);
        const info = R.drawBoard(gameCtx, b, { x: rx, y: topPad, w: colW, h: availH }, {
          showNameHeader: true,
          isLeader: n >= 2 && b.id === leaderId,
          showFaces: true,
        });
        state.boardCenters[b.id] = { cx: info.cx, cy: info.cy };
      });

      // Sparky Mascot floating happily at top-right corner of TV
      R.drawMascot(gameCtx, stageW - 58, 56, 26, state.mascot, state.time);
      R.drawAttackArcs(gameCtx, state.attackArcs);
      return;
    }

    // 2. STANDARD MODE (DESKTOP & MOBILE): HERO BOARD + STORYBOOK PANELS + LIVE RIVALS!
    const myB = state.myBoard || state.boards[0];
    const rivals = state.boards.filter((b) => b !== myB);
    const isNarrow = stageW < 700;

    if (isNarrow) {
      // Compact Mobile Portrait Layout
      const topStripH = rivals.length > 0 ? 86 : 64;
      const boardAvailH = stageH - topStripH - 16;
      const boardAvailW = stageW - 20;
      const info = R.drawBoard(gameCtx, myB, {
        x: 10,
        y: topStripH + 8,
        w: boardAvailW,
        h: boardAvailH,
      }, { showFaces: true });
      state.boardCenters[myB.id] = { cx: info.cx, cy: info.cy };

      // Compact Top HUD strip (Hold + Score + Next)
      const stripY = 6;
      const boxH = 54;
      drawStoryCard(gameCtx, 10, stripY, 64, boxH, null);
      gameCtx.font = '700 10px Fredoka, sans-serif';
      gameCtx.fillStyle = '#4c4566';
      gameCtx.textAlign = 'center';
      gameCtx.fillText('HOLD', 42, stripY + 12);
      if (myB.hold) R.drawPiecePreview(gameCtx, myB.hold, 14, stripY + 14, 56, 38, state.time);

      const midW = Math.max(120, stageW - 156);
      drawStoryCard(gameCtx, 80, stripY, midW, boxH, null);
      gameCtx.font = '700 17px Fredoka, sans-serif';
      gameCtx.fillStyle = '#1e1b2e';
      gameCtx.textAlign = 'center';
      gameCtx.fillText(Number(myB.score).toLocaleString(), 80 + midW / 2, stripY + 25);
      gameCtx.font = '700 11px Nunito, sans-serif';
      gameCtx.fillStyle = '#0284c7';
      gameCtx.fillText(`Lv ${myB.level} · ${myB.lines} Lines${myB.combo >= 1 ? ` · 🌈${myB.combo + 1}x` : ''}`, 80 + midW / 2, stripY + 43);

      drawStoryCard(gameCtx, stageW - 74, stripY, 64, boxH, null);
      gameCtx.font = '700 10px Fredoka, sans-serif';
      gameCtx.fillStyle = '#4c4566';
      gameCtx.textAlign = 'center';
      gameCtx.fillText('NEXT', stageW - 42, stripY + 12);
      if (myB.queue[0]) R.drawPiecePreview(gameCtx, myB.queue[0], stageW - 70, stripY + 14, 56, 38, state.time);

      // Compact Rival Badges below top strip
      if (rivals.length > 0) {
        const pillW = Math.min(115, (stageW - 24) / rivals.length - 6);
        const startX = (stageW - rivals.length * (pillW + 6)) / 2;
        rivals.forEach((rb, i) => {
          const px = startX + i * (pillW + 6);
          const py = stripY + boxH + 6;
          R.roundRectPath(gameCtx, px, py, pillW, 24, 10);
          gameCtx.fillStyle = rb.alive ? '#ffffff' : '#fee2e2';
          gameCtx.fill();
          gameCtx.strokeStyle = '#1e1b2e';
          gameCtx.lineWidth = 2;
          gameCtx.stroke();
          gameCtx.font = '700 11px Fredoka, sans-serif';
          gameCtx.fillStyle = '#1e1b2e';
          gameCtx.textAlign = 'center';
          gameCtx.textBaseline = 'middle';
          gameCtx.fillText(`${rb.avatar} ${rb.name.slice(0, 7)} ${rb.alive ? Number(rb.score).toLocaleString() : 'KO'}`, px + pillW / 2, py + 12.5);
          state.boardCenters[rb.id] = { cx: px + pillW / 2, cy: py + 12 };
        });
      }

      R.drawAttackArcs(gameCtx, state.attackArcs);
      return;
    }

    // ---- Desktop / Tablet Widescreen Storybook Layout ----
    const bottomReserve = rivals.length > 0 ? 44 : 18;
    const maxBoardH = Math.min(stageH - bottomReserve - 20, 680);
    const cell = Math.floor(Math.min(maxBoardH / E.VISIBLE_ROWS, (stageW * 0.42) / E.COLS));
    const gridW = cell * E.COLS;
    const gridH = cell * E.VISIBLE_ROWS;

    // Shift main board slightly left when rivals are displayed on the right!
    const centerShift = rivals.length > 0 ? -Math.min(110, stageW * 0.08) : 0;
    const heroX = Math.round(stageW / 2 - gridW / 2 + centerShift);
    const heroY = Math.round((stageH - bottomReserve - gridH) / 2);

    const heroInfo = R.drawBoard(gameCtx, myB, { x: heroX, y: heroY, w: gridW, h: gridH }, {
      showFaces: true,
      isLeader: state.boards.length >= 2 && myB.id === leaderId,
    });
    state.boardCenters[myB.id] = { cx: heroInfo.cx, cy: heroInfo.cy };

    // Center countdown bubble directly over the hero board!
    if (state.mode === 'countdown') {
      const rect = stageWrap.getBoundingClientRect();
      countdownBubble.style.position = 'fixed';
      countdownBubble.style.left = `${Math.round(rect.left + heroInfo.cx)}px`;
      countdownBubble.style.top = `${Math.round(rect.top + heroInfo.cy)}px`;
      countdownBubble.style.transform = 'translate(-50%, -50%)';
    }

    // LEFT PANEL: HOLD + SCOREBOARD + SPARKY MASCOT!
    const leftW = Math.min(164, Math.max(126, heroX - 34));
    const leftX = heroX - leftW - 22;
    if (leftX >= 10) {
      // HOLD Card
      drawStoryCard(gameCtx, leftX, heroY + 6, leftW, 102, 'HOLD [C]', '#ec4899');
      if (myB.hold) {
        R.drawPiecePreview(gameCtx, myB.hold, leftX + 10, heroY + 22, leftW - 20, 76, state.time);
      } else {
        gameCtx.font = '700 12px Nunito, sans-serif';
        gameCtx.fillStyle = '#94a3b8';
        gameCtx.textAlign = 'center';
        gameCtx.fillText('Empty', leftX + leftW / 2, heroY + 62);
      }

      // SCORE / STATS Card
      const statsY = heroY + 126;
      drawStoryCard(gameCtx, leftX, statsY, leftW, 186, 'STORYBOOK', '#f59e0b');
      const rows = [
        ['SCORE', Number(myB.score).toLocaleString(), '#1e1b2e'],
        ['LEVEL', String(myB.level), '#0284c7'],
        ['LINES', String(myB.lines), '#16a34a'],
        ['COMBO', myB.combo >= 1 ? `${myB.combo + 1}x 🌈` : '—', '#ec4899'],
      ];
      rows.forEach(([lbl, val, col], ri) => {
        const ry = statsY + 34 + ri * 38;
        gameCtx.textAlign = 'left';
        gameCtx.font = '800 11px Nunito, sans-serif';
        gameCtx.fillStyle = '#64748b';
        gameCtx.fillText(lbl, leftX + 14, ry);
        gameCtx.textAlign = 'right';
        gameCtx.font = '700 18px Fredoka, sans-serif';
        gameCtx.fillStyle = col;
        gameCtx.fillText(val, leftX + leftW - 14, ry + 1);
      });

      // Sparky the Animated Disney Star Mascot!
      const mascotY = Math.min(heroY + gridH - 42, statsY + 260);
      if (mascotY - (statsY + 186) > 36) {
        R.drawMascot(gameCtx, leftX + leftW / 2, mascotY, 32, state.mascot, state.time);
      }
    }

    // RIGHT PANEL: NEXT 3 QUEUE + LIVE RIVAL MINI-BOARDS!
    const rightX = heroX + gridW + 22;
    const nextW = Math.min(148, Math.max(114, stageW - rightX - 18));
    if (rightX + nextW <= stageW - 6) {
      drawStoryCard(gameCtx, rightX, heroY + 6, nextW, 224, 'NEXT UP', '#38bdf8');
      for (let i = 0; i < 3; i++) {
        const qType = myB.queue[i];
        if (qType) {
          R.drawPiecePreview(gameCtx, qType, rightX + 10, heroY + 24 + i * 66, nextW - 20, 62, state.time + i * 0.7);
        }
      }
    }

    // Live Rival Mini-Boards! (Positioned cleanly so the smiling golden sun shines above!)
    if (rivals.length > 0) {
      const rivalStartX = rightX + nextW + 20;
      const availRivalW = stageW - rivalStartX - 18;
      const cols = rivals.length <= 2 ? 1 : 2;
      const rows = Math.ceil(rivals.length / cols);

      if (availRivalW >= 120) {
        const rGap = 18;
        const topSkyClearance = rivals.length === 1 ? Math.min(118, gridH * 0.2) : 44;
        const maxAreaH = gridH - topSkyClearance;
        const cellW = (availRivalW - rGap * (cols - 1)) / cols;
        const cellH = (maxAreaH - rGap * (rows - 1)) / rows;
        const targetPreview = pickTargetBoard(myB.id);

        rivals.forEach((rb, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const rx = rivalStartX + c * (cellW + rGap);
          const ry = heroY + topSkyClearance + r * (cellH + rGap);
          const rInfo = R.drawBoard(gameCtx, rb, { x: rx, y: ry, w: cellW, h: cellH }, {
            showNameHeader: true,
            isLeader: rb.id === leaderId,
            isTargeted: state.targetMode !== 'random' && targetPreview && targetPreview.id === rb.id,
            showFaces: cellW >= 140,
          });
          state.boardCenters[rb.id] = { cx: rInfo.cx, cy: rInfo.cy };
        });
      } else {
        // Put rival mini-boards cleanly stacked below NEXT UP card on medium screens
        const miniTop = heroY + 250;
        const availH = heroY + gridH - miniTop;
        if (availH >= 110) {
          const eachW = (nextW - 8) / Math.min(2, rivals.length);
          rivals.slice(0, 2).forEach((rb, i) => {
            const rInfo = R.drawBoard(gameCtx, rb, {
              x: rightX + i * (eachW + 8),
              y: miniTop + 26,
              w: eachW,
              h: availH - 28,
            }, { showNameHeader: true, isLeader: rb.id === leaderId, showFaces: false });
            state.boardCenters[rb.id] = { cx: rInfo.cx, cy: rInfo.cy };
          });
        }
      }
    }

    // Draw Flying Rainbow Garbage Star Arcs on top!
    R.drawAttackArcs(gameCtx, state.attackArcs);
  }

  // ---- Main 60 FPS Loop ----
  let lastTs = performance.now();

  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;
    state.time += dt;

    // Update Living Disney Kingdom Backdrop
    let maxLv = 1;
    let anyDanger = false;
    for (const b of state.boards) {
      if (b.level > maxLv) maxLv = b.level;
      if (b.alive && b.danger) anyDanger = true;
    }
    backdrop.update(dt);
    backdrop.render(bgCtx, bgW, bgH, maxLv);

    // Mascot animations
    if (state.mascot.jump > 0) {
      state.mascot.jump = Math.max(0, state.mascot.jump - dt * 2.4);
    }
    if (state.mascot.bubbleTimer > 0) {
      state.mascot.bubbleTimer = Math.max(0, state.mascot.bubbleTimer - dt);
      if (state.mascot.bubbleTimer <= 0) state.mascot.mood = 'happy';
    }

    // Update Flying Attack Arcs
    for (let i = state.attackArcs.length - 1; i >= 0; i--) {
      state.attackArcs[i].life -= dt;
      if (state.attackArcs[i].life <= 0) state.attackArcs.splice(i, 1);
    }

    // Countdown Phase
    if (state.mode === 'countdown') {
      state.countdownTimer -= dt;
      if (state.countdownTimer <= 0) {
        state.countdownVal--;
        if (state.countdownVal > 0) {
          state.countdownTimer = 0.72;
          showCountdownText(String(state.countdownVal));
          audio.playCountdown(false);
        } else if (state.countdownVal === 0) {
          state.countdownTimer = 0.55;
          showCountdownText('STACK! ✨');
          audio.playCountdown(true);
        } else {
          countdownOverlay.classList.add('hidden');
          state.mode = 'playing';
          audio.startBgm();
          cheerMascot('Have fun! ✨', 1.0, 'celebrate');
          syncShellViews();
        }
      }
    }

    // Active Gameplay Simulation
    if (state.mode === 'playing') {
      audio.setLevel(maxLv);
      audio.setDanger(state.myBoard ? state.myBoard.danger : anyDanger);

      // Keyboard DAS / ARR repeat
      if (dasState.dir !== 0 && state.myBoard && !room.tvMode && !isPhoneController()) {
        if (dasState.timer > 0) {
          dasState.timer -= dt;
        } else {
          dasState.arrTimer -= dt;
          if (dasState.arrTimer <= 0) {
            doLocalAction(dasState.dir < 0 ? 'left' : 'right');
            dasState.arrTimer = 0.038;
          }
        }
      }
      if (dasState.downHeld && state.myBoard && !room.tvMode && !isPhoneController()) {
        dasState.downTimer -= dt;
        if (dasState.downTimer <= 0) {
          doLocalAction('down');
          dasState.downTimer = 0.045;
        }
      }

      if (room.isHost && room.tvMode) {
        // TV Mode: Run silky-smooth native 60fps DAS/ARR for held Phone Controller buttons!
        for (const b of state.boards) {
          if (b.isBot || !b.alive) continue;
          const st = tvCtrlState[b.id];
          if (!st) continue;
          if (st.dir !== 0) {
            if (st.das > 0) {
              st.das -= dt;
            } else {
              st.arr -= dt;
              if (st.arr <= 0) {
                b.move(st.dir);
                st.arr = 0.04;
              }
            }
          }
          if (st.down) {
            st.downTimer -= dt;
            if (st.downTimer <= 0) {
              b.softDrop();
              st.downTimer = 0.048;
            }
          }
        }

        // TV Mode: Host simulates ALL boards + bots!
        for (const bot of state.botBrains) bot.update(dt);
        for (const b of state.boards) b.update(dt);

        // Send compact HUD to each connected Phone Controller ONLY when values changed (over UDP!)
        if (now - state.lastCtrlHudSend > 120) {
          state.lastCtrlHudSend = now;
          for (const b of state.boards) {
            if (b.isBot) continue;
            const hud = {
              score: b.score,
              lines: b.lines,
              level: b.level,
              combo: b.combo,
              hold: b.hold,
              next: b.queue[0] || null,
              alive: b.alive,
              danger: b.danger,
              pg: b.getTotalPendingGarbage(),
            };
            const sig = `${hud.score}|${hud.lines}|${hud.level}|${hud.hold}|${hud.next}|${hud.alive}|${hud.danger}|${hud.pg}`;
            if (b._lastHudSig !== sig) {
              b._lastHudSig = sig;
              room.sendRealtime({ type: 'CTRL_HUD', targetId: b.id, hud });
            }
          }
        }
      } else {
        // Standard Mode: simulate myBoard + (if host) bots, and update remote FX!
        if (state.myBoard) state.myBoard.update(dt);
        if (room.isHost) {
          for (const bot of state.botBrains) bot.update(dt);
          for (const b of state.boards) {
            if (b.isBot) b.update(dt);
          }
        }
        // Keep idle blink/FX ticking on remote rival boards
        for (const b of state.boards) {
          if (b !== state.myBoard && !(room.isHost && b.isBot)) {
            b.time += dt;
          }
        }
        pushMySnapshot(false);
        if (room.isHost && now - state.lastSnapBroadcast > 85) {
          state.lastSnapBroadcast = now;
          broadcastWorldSnapshot();
        }
      }
    }

    renderStage();
    requestAnimationFrame(tick);
  }

  // ---- Boot & Connect RoomSync ----
  hudRoomCode.textContent = room.roomCode || 'T---';
  syncOptionButtons();
  syncShellViews();

  room.connect().then(() => {
    hudRoomCode.textContent = room.roomCode;
    renderTitleRoster(room.getOrderedPlayers());
    syncShellViews();
    if (!autostartParam) {
      clearBootSplash();
    } else if (!room.isHost) {
      // Guest waits briefly for MATCH_START; clear splash after 4s fallback
      setTimeout(clearBootSplash, 4000);
    }
  });

  requestAnimationFrame(tick);
})();
