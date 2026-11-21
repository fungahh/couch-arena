/**
 * Couch Arcade — Unified Pre-Game Room Controller (room.html)
 * Shared by Astro Purge, Wordle Arena, and any future Couch Arcade game.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const rawRoom = (params.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  let gameId = (params.get('game') || '').trim().toLowerCase();

  let game = gameId ? window.CouchGames.getById(gameId) : null;
  if (!game && rawRoom) {
    game = window.CouchGames.getByCode(rawRoom);
  }
  if (!game) {
    game = window.CouchGames.getAll()[0];
  }
  gameId = game.id;

  const isHostStart = params.get('host') === '1' || !rawRoom;
  const initialTvMode = isHostStart && params.get('tv') === '1';
  const initialController = !isHostStart && params.get('controller') === '1';
  const requireApproval = !isHostStart && params.get('joinreq') === '1';
  const roomCode = rawRoom || window.CouchGames.generateRoomCode(game);
  let selectedLang = params.get('lang') === 'sv' ? 'sv' : 'en';
  let openInMainMenu = isHostStart && params.get('private') !== '1';
  let launching = false;
  let waitingForApproval = requireApproval;

  // ---- Apply Per-Game Retro-Disney Flair ----
  const flair = game.roomFlair || {};
  document.title = `${game.title} Room (${roomCode}) — Couch Arcade`;
  if (flair.themeClass) document.body.classList.add(flair.themeClass);

  const bannerEl = document.getElementById('room-flair-banner');
  if (bannerEl && flair.bannerBg) {
    bannerEl.style.background = flair.bannerBg;
    bannerEl.style.color = flair.bannerText || '#1e1b2e';
  }
  document.getElementById('flair-eyebrow').textContent = `${flair.icon || '✦'} ${flair.eyebrow || game.tagline}`;
  document.getElementById('flair-title').textContent = `${game.title} Room`;
  document.getElementById('flair-sub').textContent = game.description;
  document.getElementById('flair-art-badge').innerHTML = game.artSvg || '';
  document.getElementById('room-tip-note').textContent = flair.controlsTip || '';

  // ---- DOM References ----
  const netPill = document.getElementById('room-net-pill');
  const netText = document.getElementById('room-net-text');
  const btnRoomAccount = document.getElementById('btn-room-account');
  const roomAccAva = document.getElementById('room-acc-ava');
  const roomAccLabel = document.getElementById('room-acc-label');
  const roomCodeBig = document.getElementById('room-code-big');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnOpenToggle = document.getElementById('btn-open-toggle');
  const btnTvToggle = document.getElementById('btn-tv-toggle');
  const btnTvFs = document.getElementById('btn-tv-fs');
  const tvQrCard = document.getElementById('tv-qr-card');
  const tvQrSvg = document.getElementById('tv-qr-svg');
  const tvInlineCode = document.getElementById('tv-inline-code');
  const gateBanner = document.getElementById('gate-banner');
  const gateTitle = document.getElementById('gate-title');
  const gateDesc = document.getElementById('gate-desc');
  const phoneAccountBar = document.getElementById('phone-account-bar');
  const phoneAccAva = document.getElementById('phone-acc-ava');
  const phoneAccTitle = document.getElementById('phone-acc-title');
  const phoneAccSub = document.getElementById('phone-acc-sub');
  const btnPhoneSignin = document.getElementById('btn-phone-signin');
  const approvalBox = document.getElementById('approval-box');
  const approvalList = document.getElementById('approval-list');
  const gameOptionsBar = document.getElementById('game-options-bar');
  const nameOptionGroup = document.getElementById('name-option-group');
  const roomNameInput = document.getElementById('room-name-input');
  const wordleLangGroup = document.getElementById('wordle-lang-group');
  const btnLangEn = document.getElementById('btn-lang-en');
  const btnLangSv = document.getElementById('btn-lang-sv');
  const astroLocalGroup = document.getElementById('astro-local-group');
  const btnAddLocal = document.getElementById('btn-add-local');
  const rosterSection = document.getElementById('roster-section');
  const rosterHeading = document.getElementById('roster-heading');
  const rosterHint = document.getElementById('roster-hint');
  const rosterGrid = document.getElementById('roster-grid');
  const roomActionsFooter = document.getElementById('room-actions-footer');
  const btnLaunchGame = document.getElementById('btn-launch-game');

  roomCodeBig.textContent = roomCode;
  tvInlineCode.textContent = roomCode;

  // ---- Clean URL state ----
  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.set('game', gameId);
    cleanUrl.searchParams.set('room', roomCode);
    if (isHostStart) cleanUrl.searchParams.set('host', '1');
    if (initialTvMode) cleanUrl.searchParams.set('tv', '1');
    if (initialController) cleanUrl.searchParams.set('controller', '1');
    window.history.replaceState({}, '', cleanUrl.toString());
  } catch (e) {}

  // ---- RoomSync (Pre-Game Lobby Channel: `lobby_<gameId>`) ----
  const { RoomSync, PLAYER_COLORS } = window.CouchRoom;
  const profile = window.CouchAccounts ? window.CouchAccounts.getPublicProfile() : { username: window.CouchRoom.getSavedPlayerName(), avatar: '🛸', handle: '', trophyCount: 0 };

  let currentPendingRequests = [];

  const room = new RoomSync({
    gameId: `lobby_${gameId}`,
    codePrefix: window.CouchGames.getPrefix(game),
    maxPlayers: 4,
    roomCode,
    isHost: isHostStart,
    tvMode: initialTvMode,
    controllerMode: initialController,
    requireApproval,
    updateUrl: false,
    playerName: profile.username || window.CouchRoom.getSavedPlayerName(),
    avatar: profile.avatar || '🛸',
    accountHandle: profile.handle || '',
    trophyCount: profile.trophyCount || 0,
    onRosterChange: (roster) => {
      renderRoster(roster);
      syncAllUI(roster);
      publishToLounge(roster);
      if (room.isHost && currentPendingRequests.length > 0) {
        room.sendSignal({ type: 'PENDING_SYNC', requests: currentPendingRequests });
      }
    },
    onStatusChange: (status, label) => {
      netText.textContent = label;
      netPill.classList.toggle('ok', status === 'ok');
    },
    onJoinRequestsChange: (reqs) => {
      currentPendingRequests = reqs;
      renderPendingRequests(reqs);
      if (room.isHost) {
        room.sendSignal({ type: 'PENDING_SYNC', requests: reqs });
      }
    },
    onJoinPending: () => {
      waitingForApproval = true;
      showGate(
        '🚪 Knocking on the Room Door...',
        `Waiting for the Host of ${game.title} (${roomCode}) to accept your request!`,
        false
      );
    },
    onJoinAccepted: () => {
      waitingForApproval = false;
      hideGate();
      syncAllUI(room.getOrderedPlayers());
    },
    onJoinDeclined: () => {
      waitingForApproval = false;
      showGate(
        '🚫 Request Declined',
        'The Host declined your join request. Try another open room from the Main Menu!',
        true
      );
    },
    onRoomFull: () => {
      showGate(
        '🎟️ Room Full (4 / 4)',
        'This room already has 4 players! Head back to the Main Menu to open a new room.',
        true
      );
    },
    onKicked: () => {
      showGate(
        '👋 Removed from Room',
        'The Host removed you from this room. You can return to the Main Menu anytime!',
        true
      );
    },
    onMessage: handleLobbyMessage,
  });

  // ---- Live Open Rooms Lounge Announcement (Host Only) ----
  let lounge = null;
  if (isHostStart && window.CouchLounge) {
    lounge = new window.CouchLounge.LoungeClient({});
    lounge.start();
    window.addEventListener('beforeunload', () => {
      if (lounge) lounge.unpublishRoom(roomCode);
    });
  }

  function publishToLounge(roster = room.getOrderedPlayers()) {
    if (!lounge || !room.isHost || launching) return;
    if (!openInMainMenu) {
      lounge.unpublishRoom(roomCode);
      return;
    }
    const hostPlayer = room.getMyPlayer();
    const prof = window.CouchAccounts ? window.CouchAccounts.getPublicProfile() : null;
    lounge.publishRoom({
      code: roomCode,
      gameId,
      gameTitle: game.title,
      gameIcon: flair.icon || '🎮',
      accent: flair.accent || game.accent,
      hostName: room.tvMode ? 'TV Screen' : (hostPlayer ? hostPlayer.name : (prof && prof.username) || room.myName),
      hostAvatar: room.tvMode ? '📺' : (hostPlayer ? hostPlayer.avatar : (prof && prof.avatar) || '🛸'),
      playerCount: roster.length,
      maxPlayers: 4,
      tvMode: room.tvMode,
      lang: selectedLang,
      createdAt: Date.now(),
    });
  }

  function isCouchCaptain(roster = room.getOrderedPlayers()) {
    if (room.isHost) return false;
    return Boolean(room.roomHasTv && roster.length > 0 && roster[0].id === room.myId);
  }

  function showGate(title, desc, isError) {
    gateBanner.classList.remove('hidden');
    gateBanner.classList.toggle('error', Boolean(isError));
    gateTitle.textContent = title;
    gateDesc.textContent = desc;
    rosterSection.classList.add('hidden');
    roomActionsFooter.classList.add('hidden');
    gameOptionsBar.classList.add('hidden');
    tvQrCard.classList.add('hidden');
  }

  function hideGate() {
    gateBanner.classList.add('hidden');
    rosterSection.classList.remove('hidden');
    roomActionsFooter.classList.remove('hidden');
    gameOptionsBar.classList.remove('hidden');
  }

  function renderQrCode() {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('game', gameId);
    url.searchParams.set('room', roomCode);
    url.searchParams.set('controller', '1');
    if (flair.supportsLanguage) url.searchParams.set('lang', selectedLang);
    if (window.CouchQR && window.CouchQR.renderSvg) {
      tvQrSvg.innerHTML = window.CouchQR.renderSvg(url.toString(), { fg: '#1e1b2e', bg: '#ffffff', quiet: 3 });
    }
    tvInlineCode.textContent = roomCode;
  }

  function syncAccountUI() {
    const acc = window.CouchAccounts ? window.CouchAccounts.getActiveAccount() : null;
    if (acc) {
      const trophies = window.CouchAccounts.getTrophyCount(acc);
      roomAccAva.textContent = acc.avatar;
      roomAccLabel.textContent = `${acc.username} · 🏆 ${trophies}`;
      phoneAccAva.textContent = acc.avatar;
      phoneAccTitle.textContent = `Signed in as ${acc.username} (🏆 ${trophies})`;
      phoneAccSub.textContent = 'Your achievements for this game will save directly to your account!';
      btnPhoneSignin.textContent = '🏆 Account / Switch';
      roomNameInput.value = acc.username;
      room.updateProfile({
        name: acc.username,
        avatar: acc.avatar,
        accountHandle: acc.handle,
        trophyCount: trophies,
      });
    } else {
      roomAccAva.textContent = '⭐';
      roomAccLabel.textContent = 'Sign In / Create Account';
      phoneAccAva.textContent = '🎮';
      phoneAccTitle.textContent = `Playing as ${room.myName}`;
      phoneAccSub.textContent = 'Log into your account (or create one) to unlock achievements!';
      btnPhoneSignin.textContent = '🔑 Sign In / Create Account';
      if (!roomNameInput.value) roomNameInput.value = room.myName;
    }
  }

  function openAccountDialog() {
    if (!window.CouchAccounts) return;
    window.CouchAccounts.openAccountModal({
      title: '⭐ Couch Arcade Account',
      showGuestButton: !room.isHost,
      closeOnAuth: !room.isHost,
      remoteLookupFn: !room.isHost ? (u, p) => room.lookupRemoteAccount(u, p) : null,
      onAuth: () => syncAccountUI(),
      onClose: () => syncAccountUI(),
    });
  }

  btnRoomAccount.addEventListener('click', openAccountDialog);
  btnPhoneSignin.addEventListener('click', openAccountDialog);
  if (window.CouchAccounts) {
    window.CouchAccounts.onChange(() => syncAccountUI());
  }

  roomNameInput.value = room.myName;
  roomNameInput.addEventListener('input', () => {
    room.setPlayerName(roomNameInput.value);
    publishToLounge();
  });

  // ---- Per-Game Options ----
  function syncLangUI() {
    btnLangEn.classList.toggle('active', selectedLang === 'en');
    btnLangSv.classList.toggle('active', selectedLang === 'sv');
    const canEdit = room.isHost || isCouchCaptain();
    btnLangEn.disabled = !canEdit;
    btnLangSv.disabled = !canEdit;
    if (room.isHost && room.tvMode) renderQrCode();
  }

  function setLanguage(lang) {
    selectedLang = lang === 'sv' ? 'sv' : 'en';
    syncLangUI();
    if (room.isHost) {
      room.sendSignal({ type: 'LANG_SYNC', lang: selectedLang });
      publishToLounge();
    } else if (isCouchCaptain()) {
      room.sendSignal({ type: 'CAPTAIN_SET_LANG', lang: selectedLang });
    }
  }

  btnLangEn.addEventListener('click', () => setLanguage('en'));
  btnLangSv.addEventListener('click', () => setLanguage('sv'));

  btnAddLocal.addEventListener('click', () => {
    if (!room.isHost || room.tvMode) return;
    const added = room.addLocalPlayer();
    if (!added) {
      btnAddLocal.textContent = 'Room Full (4/4)';
      setTimeout(() => (btnAddLocal.textContent = '+ Add Local Player (Same Screen)'), 1400);
    }
  });

  // ---- Copy Invite, Open Listing Toggle, TV Toggle, TV Fullscreen ----
  btnCopyLink.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('game', gameId);
    url.searchParams.set('room', roomCode);
    if (room.tvMode) url.searchParams.set('controller', '1');
    if (flair.supportsLanguage) url.searchParams.set('lang', selectedLang);
    try {
      await navigator.clipboard.writeText(url.toString());
      btnCopyLink.textContent = '✓ Link Copied!';
      setTimeout(() => (btnCopyLink.textContent = '📋 Copy Invite'), 1800);
    } catch (e) {
      window.prompt('Share this room link:', url.toString());
    }
  });

  btnOpenToggle.addEventListener('click', () => {
    if (!room.isHost) return;
    openInMainMenu = !openInMainMenu;
    btnOpenToggle.classList.toggle('active', openInMainMenu);
    btnOpenToggle.textContent = openInMainMenu ? '🌐 Listed in Main Menu: ON' : '🔒 Private Room (Code Only)';
    publishToLounge();
  });

  btnTvToggle.addEventListener('click', () => {
    if (!room.isHost) return;
    room.setTvMode(!room.tvMode);
    syncAllUI(room.getOrderedPlayers());
    publishToLounge();
  });

  btnTvFs.addEventListener('click', () => {
    const docEl = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    }
  });

  // ---- Render Pending Host Approval Requests ----
  function renderPendingRequests(reqs) {
    const canApprove = room.isHost || isCouchCaptain();
    if (!canApprove || !reqs || reqs.length === 0) {
      approvalBox.classList.add('hidden');
      approvalList.innerHTML = '';
      return;
    }
    approvalBox.classList.remove('hidden');
    approvalList.innerHTML = '';

    reqs.forEach((req) => {
      const row = document.createElement('div');
      row.className = 'approval-row';
      row.dataset.reqId = req.id;
      const trophyBadge = req.trophyCount > 0 ? ` · 🏆 ${req.trophyCount}` : '';
      row.innerHTML = `
        <div class="approval-who">
          <span style="font-size:1.4rem;">${escapeHtml(req.avatar || '🎮')}</span>
          <span>${escapeHtml(req.name)}</span>
          <span style="font-size:0.78rem; color:#5b5575;">${req.isController ? '📱 Phone' : 'Main Menu'}${trophyBadge}</span>
        </div>
        <div class="approval-actions">
          <button type="button" class="btn-cartoon btn-accept" data-accept="${escapeHtml(req.id)}">✅ Accept</button>
          <button type="button" class="btn-cartoon btn-decline" data-decline="${escapeHtml(req.id)}">✖ Decline</button>
        </div>
      `;
      row.querySelector('[data-accept]').addEventListener('click', () => {
        if (room.isHost) room.approveJoinRequest(req.id);
        else room.sendSignal({ type: 'CAPTAIN_APPROVE_JOIN', targetPlayerId: req.id });
      });
      row.querySelector('[data-decline]').addEventListener('click', () => {
        if (room.isHost) room.declineJoinRequest(req.id);
        else room.sendSignal({ type: 'CAPTAIN_DECLINE_JOIN', targetPlayerId: req.id });
      });
      approvalList.appendChild(row);
    });
  }

  // ---- Render 4-Player Retro-Cartoon Roster ----
  function renderRoster(roster) {
    rosterHeading.textContent = `Room Roster (${roster.length} / 4)`;
    rosterGrid.innerHTML = '';
    const bySlot = {};
    roster.forEach((p) => { bySlot[p.slot] = p; });

    for (let s = 0; s < 4; s++) {
      const p = bySlot[s];
      const pal = PLAYER_COLORS[s];
      const card = document.createElement('div');

      if (p) {
        card.className = 'roster-card';
        card.style.borderTop = `6px solid ${pal.hex}`;
        const canKick = room.isHost && p.id !== room.myId;
        const isCap = room.roomHasTv && roster.length > 0 && roster[0].id === p.id;
        const roleTag = p.isHost ? 'HOST' : isCap ? '★ CAPTAIN' : p.isController ? '📱 PHONE' : p.isLocal ? 'LOCAL' : 'READY';
        const trophyStr = p.accountHandle ? `🏆 ${p.trophyCount || 0} Trophies` : (p.isController ? 'Phone Controller' : p.isLocal ? 'Same Screen' : 'Guest');
        card.innerHTML = `
          <div class="roster-card-top">
            <span style="color:${pal.hex};">P${s + 1} · ${pal.name}</span>
            ${canKick
              ? `<button type="button" class="kick-btn" data-kick="${escapeHtml(p.id)}">${p.isLocal ? 'Remove' : 'Kick'}</button>`
              : `<span class="roster-role-badge">${roleTag}</span>`}
          </div>
          <div class="roster-player-row">
            <div class="roster-avatar">${escapeHtml(p.avatar || '🛸')}</div>
            <div style="min-width:0;">
              <div class="roster-name">${escapeHtml(p.name)}</div>
              <div class="roster-meta">${p.id === room.myId ? 'You · ' : ''}${trophyStr}</div>
            </div>
          </div>
        `;
        if (canKick) {
          card.querySelector('[data-kick]').addEventListener('click', () => {
            room.kickPlayer(p.id);
          });
        }
      } else {
        card.className = 'roster-card empty';
        card.innerHTML = `
          <div style="font-family:'Fredoka',sans-serif; font-size:1rem; font-weight:700;">Open Slot (P${s + 1})</div>
          <div style="font-size:0.8rem; font-weight:700;">${room.tvMode ? 'Scan QR or enter ' + roomCode : 'Share code ' + roomCode}</div>
        `;
      }
      rosterGrid.appendChild(card);
    }
  }

  function syncAllUI(roster = room.getOrderedPlayers()) {
    if (waitingForApproval) return;
    const isTvHost = room.isHost && room.tvMode;
    const captain = isCouchCaptain(roster);

    btnOpenToggle.classList.toggle('hidden', !room.isHost);
    btnOpenToggle.classList.toggle('active', openInMainMenu);
    btnOpenToggle.textContent = openInMainMenu ? '🌐 Listed in Main Menu: ON' : '🔒 Private Room (Code Only)';

    btnTvToggle.classList.toggle('hidden', !room.isHost);
    btnTvToggle.classList.toggle('tv-on', isTvHost);
    btnTvToggle.textContent = isTvHost ? '💻 Exit TV Mode' : '📺 TV Screen Mode';

    btnTvFs.classList.toggle('hidden', !isTvHost);
    tvQrCard.classList.toggle('hidden', !isTvHost);
    if (isTvHost) renderQrCode();

    phoneAccountBar.classList.toggle('hidden', room.isHost);
    nameOptionGroup.classList.toggle('hidden', isTvHost);
    wordleLangGroup.classList.toggle('hidden', !flair.supportsLanguage);
    astroLocalGroup.classList.toggle('hidden', !(flair.supportsLocalAdd && room.isHost && !isTvHost));
    syncLangUI();

    const baseLabel = flair.launchLabel || `Launch ${game.title}!`;
    if (room.isHost) {
      btnLaunchGame.disabled = roster.length === 0;
      btnLaunchGame.textContent =
        roster.length === 0
          ? 'Waiting for Players to Join (0/4)...'
          : `🚀 ${baseLabel} (${roster.length}/4)`;
      rosterHint.textContent = isTvHost
        ? 'TV is a pure display · Phone 1 (★ Captain) can also launch from the couch!'
        : 'Players joining from the Main Menu will knock for your approval!';
    } else if (captain) {
      btnLaunchGame.disabled = false;
      btnLaunchGame.textContent = `🚀 ${baseLabel} on TV (${roster.length}/4)`;
      rosterHint.textContent = '★ You are the Couch Captain! Tap Launch when everyone is ready.';
    } else {
      btnLaunchGame.disabled = true;
      btnLaunchGame.textContent = room.roomHasTv
        ? 'Waiting for Couch Captain / TV to Launch...'
        : 'Waiting for Host to Launch...';
      rosterHint.textContent = initialController
        ? '📱 Phone Controller ready! Watch the TV when the game starts.'
        : 'Connected! Waiting for Host to start the match.';
    }

    renderPendingRequests(currentPendingRequests);
  }

  // ---- Synchronized Launch from Unified Pre-Game Room into the Game! ----
  function buildGameUrl({ isHost, tvMode, controllerMode, lang }) {
    const url = new URL(game.path, window.location.href);
    url.searchParams.set('room', roomCode);
    url.searchParams.set('autostart', '1');
    if (isHost) url.searchParams.set('host', '1');
    if (isHost && tvMode) url.searchParams.set('tv', '1');
    if (!isHost && controllerMode) url.searchParams.set('controller', '1');
    if (flair.supportsLanguage) url.searchParams.set('lang', lang || selectedLang);
    return url.toString();
  }

  function hostLaunchGame() {
    if (!room.isHost || launching) return;
    const roster = room.getOrderedPlayers();
    if (roster.length === 0) return;

    launching = true;
    btnLaunchGame.disabled = true;
    btnLaunchGame.textContent = '🚀 Launching Everyone...';

    if (lounge) lounge.unpublishRoom(roomCode);

    const localPlayers = roster.filter((p) => p.isLocal && p.id !== room.myId).map((p) => ({ name: p.name }));
    try {
      sessionStorage.setItem('ca_room_launch', JSON.stringify({
        gameId,
        roomCode,
        expectedCount: roster.length,
        tvMode: room.tvMode,
        lang: selectedLang,
        localPlayers,
        ts: Date.now(),
      }));
    } catch (e) {}

    room.sendSignal({
      type: 'LAUNCH_GAME',
      gameId,
      roomCode,
      lang: selectedLang,
      tvMode: room.tvMode,
    });

    setTimeout(() => {
      window.location.href = buildGameUrl({
        isHost: true,
        tvMode: room.tvMode,
        controllerMode: false,
        lang: selectedLang,
      });
    }, 320);
  }

  btnLaunchGame.addEventListener('click', () => {
    if (room.isHost) {
      hostLaunchGame();
    } else if (isCouchCaptain()) {
      btnLaunchGame.disabled = true;
      btnLaunchGame.textContent = '🚀 Launching on TV...';
      room.sendSignal({ type: 'CAPTAIN_LAUNCH' });
    }
  });

  function handleLobbyMessage(msg) {
    if (!msg || !msg.type) return;

    if (room.isHost) {
      if (msg.type === 'CAPTAIN_LAUNCH' && room.tvMode) {
        hostLaunchGame();
      } else if (msg.type === 'CAPTAIN_SET_LANG' && msg.lang) {
        setLanguage(msg.lang);
      } else if (msg.type === 'CAPTAIN_APPROVE_JOIN' && msg.targetPlayerId) {
        room.approveJoinRequest(msg.targetPlayerId);
      } else if (msg.type === 'CAPTAIN_DECLINE_JOIN' && msg.targetPlayerId) {
        room.declineJoinRequest(msg.targetPlayerId);
      }
      return;
    }

    // Guest / Phone handlers
    if (msg.type === 'LANG_SYNC' && msg.lang) {
      selectedLang = msg.lang === 'sv' ? 'sv' : 'en';
      syncLangUI();
    } else if (msg.type === 'PENDING_SYNC' && Array.isArray(msg.requests)) {
      currentPendingRequests = msg.requests;
      renderPendingRequests(currentPendingRequests);
    } else if (msg.type === 'LAUNCH_GAME' && msg.roomCode === roomCode) {
      launching = true;
      if (initialController && window.CouchAccounts) {
        window.CouchAccounts.unlockAchievement('hub_tv_party', { silent: true });
      }
      window.location.href = buildGameUrl({
        isHost: false,
        tvMode: false,
        controllerMode: initialController || room.roomHasTv,
        lang: msg.lang || selectedLang,
      });
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }

  // ---- Boot ----
  if (waitingForApproval) {
    showGate(
      '🚪 Knocking on the Room Door...',
      `Connecting to ${game.title} (${roomCode}) and waiting for Host approval...`,
      false
    );
  }
  syncAccountUI();
  syncAllUI(room.getOrderedPlayers());
  room.connect().then(() => {
    if (room.isHost) {
      publishToLounge(room.getOrderedPlayers());
      if (flair.supportsLanguage) {
        room.sendSignal({ type: 'LANG_SYNC', lang: selectedLang });
      }
    }
  });
})();
