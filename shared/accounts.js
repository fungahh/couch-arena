/**
 * Couch Arcade — Account & Per-Game Achievements System
 * - Local persistent accounts (username, optional 4-digit PIN, cartoon avatar)
 * - Cross-device P2P account lookup when connecting a phone to a TV
 * - Per-game achievements for Astro Purge, Wordle Arena, and Couch Arcade Party
 * - Self-contained retro-Disney cartoon Sign-In, Create Account, and Trophy Case modals
 */
(function (global) {
  'use strict';

  const ACCOUNTS_KEY = 'couch_arcade_accounts_v1';
  const ACTIVE_KEY = 'couch_arcade_active_account_v1';

  const AVATARS = ['🛸', '⭐', '🦊', '🐱', '🤖', '👑', '🦖', '🍕'];

  const ACHIEVEMENTS = [
    // Astro Purge
    {
      id: 'ap_first_flight',
      game: 'astro-purge',
      gameTitle: 'Astro Purge',
      icon: '🛸',
      title: 'First Lift-Off!',
      desc: 'Launch your first Astro Purge UFO mission.',
    },
    {
      id: 'ap_wave_5',
      game: 'astro-purge',
      gameTitle: 'Astro Purge',
      icon: '🌟',
      title: 'Space Cadet',
      desc: 'Survive to Wave 5 in Astro Purge.',
    },
    {
      id: 'ap_boss_slayer',
      game: 'astro-purge',
      gameTitle: 'Astro Purge',
      icon: '👾',
      title: 'Raid Boss Slayer!',
      desc: 'Defeat a Giant Space Virus Boss (Wave 10+).',
    },
    {
      id: 'ap_level_10',
      game: 'astro-purge',
      gameTitle: 'Astro Purge',
      icon: '⚡',
      title: 'Supercharged UFO',
      desc: 'Reach Team Level 10 in a single Astro Purge run.',
    },
    {
      id: 'ap_team_revive',
      game: 'astro-purge',
      gameTitle: 'Astro Purge',
      icon: '💖',
      title: 'Couch Medic',
      desc: 'Revive a downed teammate in Astro Purge.',
    },
    {
      id: 'ap_couch_crew',
      game: 'astro-purge',
      gameTitle: 'Astro Purge',
      icon: '🎉',
      title: 'UFO Squadron',
      desc: 'Play Astro Purge in a room with 2 or more pilots.',
    },

    // Wordle Arena
    {
      id: 'wa_first_word',
      game: 'wordle-arena',
      gameTitle: 'Wordle Arena',
      icon: '🔤',
      title: 'Word Sprout',
      desc: 'Solve your first secret 5-letter word in Wordle Arena.',
    },
    {
      id: 'wa_genius_2',
      game: 'wordle-arena',
      gameTitle: 'Wordle Arena',
      icon: '🧠',
      title: 'Mind Reader!',
      desc: 'Solve a secret word in 2 tries or fewer.',
    },
    {
      id: 'wa_marathon_5',
      game: 'wordle-arena',
      gameTitle: 'Wordle Arena',
      icon: '🏅',
      title: '5-Word Champion!',
      desc: 'Solve all 5 words in a single Wordle Arena marathon.',
    },
    {
      id: 'wa_swedish_star',
      game: 'wordle-arena',
      gameTitle: 'Wordle Arena',
      icon: '🇸🇪',
      title: 'Svenska Mästaren',
      desc: 'Solve a secret word in Svenska (ÅÄÖ) mode.',
    },
    {
      id: 'wa_winner',
      game: 'wordle-arena',
      gameTitle: 'Wordle Arena',
      icon: '👑',
      title: 'Arena Winner!',
      desc: 'Finish #1 in a multiplayer Wordle Arena match.',
    },

    // Couch Arcade Party
    {
      id: 'hub_tv_party',
      game: 'couch-arcade',
      gameTitle: 'Couch Arcade',
      icon: '📺',
      title: 'Living Room Legend',
      desc: 'Connect your phone as a controller to a TV Screen.',
    },
    {
      id: 'hub_dual_star',
      game: 'couch-arcade',
      gameTitle: 'Couch Arcade',
      icon: '🎡',
      title: 'Arcade All-Star',
      desc: 'Play both Astro Purge and Wordle Arena on your account.',
    },
  ];

  const listeners = new Set();

  function hashPin(pin) {
    const clean = String(pin || '').trim();
    if (!clean) return '';
    let h = 2166136261;
    const str = 'ca_salt_v1_' + clean;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'h' + (h >>> 0).toString(36);
  }

  function normalizeHandle(username) {
    return String(username || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function loadAllMap() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveAllMap(map) {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function getActiveHandle() {
    try {
      return localStorage.getItem(ACTIVE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setActiveHandle(handle) {
    try {
      if (handle) localStorage.setItem(ACTIVE_KEY, handle);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch (e) {}
  }

  function notifyChange() {
    const active = getActiveAccount();
    if (active) {
      try {
        localStorage.setItem('couch_arcade_name', active.username);
        localStorage.setItem('wa_nickname', active.username);
      } catch (e) {}
    }
    listeners.forEach((fn) => {
      try { fn(active); } catch (e) {}
    });
  }

  function getActiveAccount() {
    const h = getActiveHandle();
    if (!h) return null;
    const map = loadAllMap();
    return map[h] || null;
  }

  function listAccounts() {
    return Object.values(loadAllMap()).sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
  }

  function ensureAccountShape(acc) {
    if (!acc.achievements || typeof acc.achievements !== 'object') acc.achievements = {};
    if (!acc.stats || typeof acc.stats !== 'object') acc.stats = {};
    if (!acc.stats.gamesPlayed || typeof acc.stats.gamesPlayed !== 'object') acc.stats.gamesPlayed = {};
    if (!acc.avatar) acc.avatar = '🛸';
    return acc;
  }

  function createAccount({ username, pin = '', avatar = '🛸' }) {
    const cleanName = String(username || '').trim().slice(0, 18);
    if (cleanName.length < 2) {
      return { ok: false, error: 'Pick a name with at least 2 characters!' };
    }
    const handle = normalizeHandle(cleanName);
    const map = loadAllMap();
    if (map[handle]) {
      return { ok: false, error: `"${cleanName}" already exists — switch to Sign In instead!` };
    }
    const cleanPin = String(pin || '').trim();
    if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
      return { ok: false, error: 'PIN must be 4 digits (or leave it blank).' };
    }

    const acc = ensureAccountShape({
      id: 'acc_' + Math.random().toString(36).slice(2, 10),
      username: cleanName,
      handle,
      pinHash: hashPin(cleanPin),
      hasPin: Boolean(cleanPin),
      avatar: AVATARS.includes(avatar) ? avatar : '🛸',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      achievements: {},
      stats: { gamesPlayed: {} },
    });
    map[handle] = acc;
    saveAllMap(map);
    setActiveHandle(handle);
    notifyChange();
    return { ok: true, account: acc };
  }

  function verifyAccountCredentials(username, pin = '') {
    const handle = normalizeHandle(username);
    if (!handle) return { ok: false, error: 'Enter your account name.' };
    const map = loadAllMap();
    const acc = map[handle];
    if (!acc) return { ok: false, notFound: true, error: `No account named "${username.trim()}" found.` };
    const providedHash = hashPin(pin);
    if (acc.pinHash && acc.pinHash !== providedHash) {
      return { ok: false, wrongPin: true, error: 'Incorrect 4-digit PIN — try again!' };
    }
    return { ok: true, account: ensureAccountShape(acc) };
  }

  function loginAccount({ username, pin = '' }) {
    const res = verifyAccountCredentials(username, pin);
    if (!res.ok) return res;
    const map = loadAllMap();
    map[res.account.handle] = { ...res.account, lastLoginAt: Date.now() };
    saveAllMap(map);
    setActiveHandle(res.account.handle);
    notifyChange();
    return { ok: true, account: map[res.account.handle] };
  }

  function importRemoteAccount(remoteAcc, activate = true) {
    if (!remoteAcc || !remoteAcc.username) return null;
    const handle = normalizeHandle(remoteAcc.username);
    const map = loadAllMap();
    const existing = map[handle];
    const mergedAch = { ...(existing ? existing.achievements : {}), ...(remoteAcc.achievements || {}) };
    const mergedGames = {
      ...(existing && existing.stats ? existing.stats.gamesPlayed : {}),
      ...(remoteAcc.stats ? remoteAcc.stats.gamesPlayed : {}),
    };
    const merged = ensureAccountShape({
      ...(existing || {}),
      ...remoteAcc,
      handle,
      achievements: mergedAch,
      stats: { ...(existing ? existing.stats : {}), ...(remoteAcc.stats || {}), gamesPlayed: mergedGames },
      lastLoginAt: Date.now(),
    });
    map[handle] = merged;
    saveAllMap(map);
    if (activate) {
      setActiveHandle(handle);
      notifyChange();
    }
    return merged;
  }

  function logout() {
    setActiveHandle('');
    notifyChange();
  }

  function getTrophyCount(acc = getActiveAccount()) {
    if (!acc || !acc.achievements) return 0;
    return Object.keys(acc.achievements).length;
  }

  function unlockAchievement(achievementId, opts = {}) {
    const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!def) return false;
    const active = getActiveAccount();
    if (!active) return false;
    const map = loadAllMap();
    const acc = ensureAccountShape(map[active.handle] || active);
    if (acc.achievements[achievementId]) return false;

    acc.achievements[achievementId] = Date.now();
    map[acc.handle] = acc;
    saveAllMap(map);
    notifyChange();

    if (!opts.silent) {
      showAchievementToast(def);
    }
    return true;
  }

  function recordGamePlayed(gameId) {
    const active = getActiveAccount();
    if (!active) return;
    const map = loadAllMap();
    const acc = ensureAccountShape(map[active.handle] || active);
    acc.stats.gamesPlayed[gameId] = (acc.stats.gamesPlayed[gameId] || 0) + 1;
    map[acc.handle] = acc;
    saveAllMap(map);
    if (acc.stats.gamesPlayed['astro-purge'] > 0 && acc.stats.gamesPlayed['wordle-arena'] > 0) {
      unlockAchievement('hub_dual_star');
    }
  }

  function getPublicProfile() {
    const acc = getActiveAccount();
    if (!acc) {
      return {
        loggedIn: false,
        username: (localStorage.getItem('couch_arcade_name') || localStorage.getItem('wa_nickname') || '').trim(),
        avatar: '🎮',
        trophyCount: 0,
        handle: '',
      };
    }
    return {
      loggedIn: true,
      username: acc.username,
      avatar: acc.avatar || '🛸',
      trophyCount: getTrophyCount(acc),
      handle: acc.handle,
    };
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // ---- Scoped Retro-Disney Cartoon Styles for Account Modal & Trophy Toasts ----
  function injectStyles() {
    if (document.getElementById('ca-accounts-style')) return;
    const style = document.createElement('style');
    style.id = 'ca-accounts-style';
    style.textContent = `
      .ca-toast-stack {
        position: fixed;
        top: max(16px, env(safe-area-inset-top));
        right: 16px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      .ca-ach-toast {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #fffbeb;
        color: #1e1b2e;
        border: 3px solid #1e1b2e;
        border-radius: 18px;
        padding: 12px 16px;
        box-shadow: 0 5px 0 #1e1b2e, 0 12px 24px rgba(30, 27, 46, 0.28);
        font-family: 'Nunito', system-ui, sans-serif;
        max-width: 330px;
        animation: caToastPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes caToastPop {
        0% { transform: translateY(-20px) scale(0.86); opacity: 0; }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
      .ca-ach-toast-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: #fde047;
        border: 2.5px solid #1e1b2e;
        box-shadow: 0 2px 0 #1e1b2e;
        display: grid;
        place-items: center;
        font-size: 1.45rem;
        flex-shrink: 0;
      }
      .ca-ach-toast-kicker {
        font-family: 'Fredoka', system-ui, sans-serif;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #d97706;
        font-weight: 700;
      }
      .ca-ach-toast-title {
        font-family: 'Fredoka', system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: #1e1b2e;
        line-height: 1.15;
      }
      .ca-ach-toast-desc {
        font-size: 0.78rem;
        font-weight: 700;
        color: #5b5575;
        margin-top: 2px;
      }

      .ca-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 99990;
        background: rgba(30, 27, 46, 0.62);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        overflow-y: auto;
        font-family: 'Nunito', system-ui, sans-serif;
      }
      .ca-modal-card {
        width: 100%;
        max-width: 520px;
        max-height: 90dvh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        background: #fff8ec;
        color: #1e1b2e;
        border: 3.5px solid #1e1b2e;
        border-radius: 26px;
        box-shadow: 0 8px 0 #1e1b2e, 0 22px 44px rgba(30, 27, 46, 0.35);
        padding: 22px 22px 20px;
      }
      .ca-modal-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .ca-modal-title {
        font-family: 'Fredoka', system-ui, sans-serif;
        font-size: 1.45rem;
        font-weight: 700;
        margin: 0;
        color: #1e1b2e;
      }
      .ca-close-btn {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 2.5px solid #1e1b2e;
        background: #ffffff;
        color: #1e1b2e;
        font-size: 1.1rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 2px 0 #1e1b2e;
      }
      .ca-close-btn:active { transform: translateY(2px); box-shadow: none; }

      .ca-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .ca-tab {
        flex: 1;
        min-width: 110px;
        padding: 9px 12px;
        border-radius: 14px;
        border: 2.5px solid #1e1b2e;
        background: #ffffff;
        color: #5b5575;
        font-family: 'Fredoka', system-ui, sans-serif;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 3px 0 #1e1b2e;
      }
      .ca-tab.active {
        background: #fde047;
        color: #1e1b2e;
      }

      .ca-field { margin-bottom: 12px; }
      .ca-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #5b5575;
        margin-bottom: 5px;
      }
      .ca-input {
        width: 100%;
        padding: 11px 14px;
        border-radius: 14px;
        border: 2.5px solid #1e1b2e;
        background: #ffffff;
        color: #1e1b2e;
        font-family: 'Nunito', system-ui, sans-serif;
        font-size: 16px;
        font-weight: 800;
        box-shadow: inset 0 2px 0 rgba(30,27,46,0.06);
      }
      .ca-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      }

      .ca-avatar-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 6px;
      }
      .ca-avatar-opt {
        aspect-ratio: 1;
        border-radius: 12px;
        border: 2.5px solid #1e1b2e;
        background: #ffffff;
        font-size: 1.3rem;
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 2px 0 #1e1b2e;
      }
      .ca-avatar-opt.selected {
        background: #fde047;
        transform: translateY(-2px);
        box-shadow: 0 4px 0 #1e1b2e;
      }

      .ca-btn-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
      }
      .ca-btn {
        flex: 1;
        min-width: 130px;
        padding: 11px 16px;
        border-radius: 14px;
        border: 2.5px solid #1e1b2e;
        font-family: 'Fredoka', system-ui, sans-serif;
        font-size: 0.98rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 0 #1e1b2e;
        transition: transform 0.1s ease;
      }
      .ca-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #1e1b2e; }
      .ca-btn-primary { background: #22c55e; color: #ffffff; text-shadow: 0 1px 0 rgba(30,27,46,0.3); }
      .ca-btn-gold { background: #fde047; color: #1e1b2e; }
      .ca-btn-ghost { background: #ffffff; color: #1e1b2e; }
      .ca-btn-danger { background: #fb7185; color: #ffffff; }

      .ca-error {
        background: #ffe4e6;
        border: 2px solid #e11d48;
        color: #9f1239;
        border-radius: 12px;
        padding: 8px 12px;
        font-size: 0.86rem;
        font-weight: 800;
        margin-bottom: 12px;
      }

      .ca-saved-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .ca-saved-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        border-radius: 999px;
        border: 2.5px solid #1e1b2e;
        background: #ffffff;
        color: #1e1b2e;
        font-weight: 800;
        font-size: 0.85rem;
        cursor: pointer;
        box-shadow: 0 2px 0 #1e1b2e;
      }
      .ca-saved-chip:hover { background: #fef3c7; }

      .ca-profile-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: linear-gradient(135deg, #fef3c7, #e0f2fe);
        border: 2.5px solid #1e1b2e;
        border-radius: 18px;
        padding: 14px;
        margin-bottom: 14px;
      }
      .ca-profile-id {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ca-profile-ava {
        width: 50px;
        height: 50px;
        border-radius: 16px;
        background: #ffffff;
        border: 2.5px solid #1e1b2e;
        box-shadow: 0 3px 0 #1e1b2e;
        display: grid;
        place-items: center;
        font-size: 1.7rem;
      }
      .ca-ach-filter {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .ca-filter-pill {
        padding: 5px 11px;
        border-radius: 999px;
        border: 2px solid #1e1b2e;
        background: #ffffff;
        color: #5b5575;
        font-size: 0.78rem;
        font-weight: 800;
        cursor: pointer;
      }
      .ca-filter-pill.active { background: #14b8a6; color: #ffffff; }
      .ca-ach-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .ca-ach-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 16px;
        border: 2.5px solid #1e1b2e;
        background: #ffffff;
      }
      .ca-ach-item.locked {
        opacity: 0.62;
        background: #f1f5f9;
      }
      .ca-ach-item.unlocked {
        background: #fffbeb;
        box-shadow: 0 3px 0 #1e1b2e;
      }
      .ca-ach-badge {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 2px solid #1e1b2e;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        font-size: 1.3rem;
        flex-shrink: 0;
      }
      .ca-ach-item.unlocked .ca-ach-badge { background: #fde047; }
      .ca-ach-meta { flex: 1; min-width: 0; }
      .ca-ach-name {
        font-family: 'Fredoka', system-ui, sans-serif;
        font-size: 0.96rem;
        font-weight: 700;
        color: #1e1b2e;
      }
      .ca-ach-sub { font-size: 0.78rem; font-weight: 700; color: #5b5575; }
      .ca-ach-tag {
        font-size: 0.7rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 999px;
        border: 1.5px solid #1e1b2e;
        background: #dcfce7;
        color: #15803d;
        flex-shrink: 0;
      }
      .ca-ach-item.locked .ca-ach-tag { background: #e2e8f0; color: #475569; }
    `;
    document.head.appendChild(style);
  }

  function showAchievementToast(def) {
    injectStyles();
    let stack = document.getElementById('ca-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'ca-toast-stack';
      stack.className = 'ca-toast-stack';
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'ca-ach-toast';
    toast.innerHTML = `
      <div class="ca-ach-toast-icon">${def.icon}</div>
      <div>
        <div class="ca-ach-toast-kicker">🏆 Achievement Unlocked · ${escapeHtml(def.gameTitle)}</div>
        <div class="ca-ach-toast-title">${escapeHtml(def.title)}</div>
        <div class="ca-ach-toast-desc">${escapeHtml(def.desc)}</div>
      </div>
    `;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
      setTimeout(() => toast.remove(), 320);
    }, 4200);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }

  function openAccountModal(opts = {}) {
    injectStyles();
    const existing = document.getElementById('ca-account-modal');
    if (existing) existing.remove();

    const active = getActiveAccount();
    let tab = opts.tab || (active ? 'profile' : listAccounts().length > 0 ? 'login' : 'signup');
    let selectedAvatar = '🛸';
    let achFilter = 'all';
    let errorMsg = '';

    const backdrop = document.createElement('div');
    backdrop.id = 'ca-account-modal';
    backdrop.className = 'ca-modal-backdrop';

    const closeModal = (result) => {
      backdrop.remove();
      if (opts.onClose) opts.onClose(result || getActiveAccount());
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && opts.allowDismiss !== false) closeModal(getActiveAccount());
    });

    function render() {
      const cur = getActiveAccount();
      const saved = listAccounts();

      let bodyHtml = '';
      if (errorMsg) {
        bodyHtml += `<div class="ca-error" id="ca-auth-error">${escapeHtml(errorMsg)}</div>`;
      }

      if (tab === 'profile' && cur) {
        const totalAch = ACHIEVEMENTS.length;
        const earned = getTrophyCount(cur);
        const filtered = achFilter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.game === achFilter);
        bodyHtml += `
          <div class="ca-profile-banner">
            <div class="ca-profile-id">
              <div class="ca-profile-ava">${cur.avatar}</div>
              <div>
                <div style="font-family:'Fredoka',sans-serif; font-size:1.2rem; font-weight:700;">${escapeHtml(cur.username)}</div>
                <div style="font-size:0.82rem; font-weight:800; color:#5b5575;">🏆 ${earned} / ${totalAch} Achievements Unlocked</div>
              </div>
            </div>
            <button type="button" class="ca-btn ca-btn-danger" id="ca-btn-logout" style="flex:0 0 auto; min-width:auto; padding:8px 14px; font-size:0.84rem;">Sign Out</button>
          </div>
          <div class="ca-ach-filter">
            <button type="button" class="ca-filter-pill ${achFilter === 'all' ? 'active' : ''}" data-filter="all">All (${earned}/${totalAch})</button>
            <button type="button" class="ca-filter-pill ${achFilter === 'astro-purge' ? 'active' : ''}" data-filter="astro-purge">🛸 Astro Purge</button>
            <button type="button" class="ca-filter-pill ${achFilter === 'wordle-arena' ? 'active' : ''}" data-filter="wordle-arena">🔤 Wordle Arena</button>
            <button type="button" class="ca-filter-pill ${achFilter === 'couch-arcade' ? 'active' : ''}" data-filter="couch-arcade">📺 Party</button>
          </div>
          <div class="ca-ach-list">
            ${filtered.map((a) => {
              const unlocked = Boolean(cur.achievements && cur.achievements[a.id]);
              return `
                <div class="ca-ach-item ${unlocked ? 'unlocked' : 'locked'}">
                  <div class="ca-ach-badge">${a.icon}</div>
                  <div class="ca-ach-meta">
                    <div class="ca-ach-name">${escapeHtml(a.title)}</div>
                    <div class="ca-ach-sub">${escapeHtml(a.desc)}</div>
                  </div>
                  <span class="ca-ach-tag">${unlocked ? '✓ EARNED' : 'LOCKED'}</span>
                </div>
              `;
            }).join('')}
          </div>
          ${opts.confirmLabel ? `
            <div class="ca-btn-row">
              <button type="button" class="ca-btn ca-btn-primary" id="ca-btn-confirm-active">${escapeHtml(opts.confirmLabel)}</button>
            </div>
          ` : ''}
        `;
      } else if (tab === 'login') {
        bodyHtml += `
          ${saved.length > 0 ? `
            <div class="ca-label">Quick Pick Saved Account</div>
            <div class="ca-saved-list">
              ${saved.map((a) => `
                <button type="button" class="ca-saved-chip" data-pick-user="${escapeHtml(a.username)}">
                  <span>${a.avatar}</span>
                  <span>${escapeHtml(a.username)}</span>
                  <span style="color:#d97706;">🏆${getTrophyCount(a)}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}
          <form id="ca-login-form">
            <div class="ca-field">
              <label class="ca-label" for="ca-login-user">Account Name</label>
              <input type="text" id="ca-login-user" class="ca-input" maxlength="18" placeholder="Enter your username..." required />
            </div>
            <div class="ca-field">
              <label class="ca-label" for="ca-login-pin">4-Digit PIN (if you set one)</label>
              <input type="password" inputmode="numeric" id="ca-login-pin" class="ca-input" maxlength="4" placeholder="Optional 4-digit PIN" />
            </div>
            <div class="ca-btn-row">
              <button type="submit" class="ca-btn ca-btn-primary" id="ca-btn-login-submit">Sign In &amp; Sync Trophies</button>
              ${opts.showGuestButton ? `<button type="button" class="ca-btn ca-btn-ghost" id="ca-btn-guest">Continue as Guest</button>` : ''}
            </div>
          </form>
        `;
      } else {
        bodyHtml += `
          <form id="ca-signup-form">
            <div class="ca-field">
              <label class="ca-label" for="ca-signup-user">Pick Your Cartoon Pilot Name</label>
              <input type="text" id="ca-signup-user" class="ca-input" maxlength="18" placeholder="e.g. Sara, Alex..." required />
            </div>
            <div class="ca-field">
              <label class="ca-label">Choose Your Avatar</label>
              <div class="ca-avatar-grid">
                ${AVATARS.map((av) => `
                  <button type="button" class="ca-avatar-opt ${selectedAvatar === av ? 'selected' : ''}" data-avatar="${av}">${av}</button>
                `).join('')}
              </div>
            </div>
            <div class="ca-field">
              <label class="ca-label" for="ca-signup-pin">4-Digit PIN (Optional — protects login on shared devices)</label>
              <input type="password" inputmode="numeric" id="ca-signup-pin" class="ca-input" maxlength="4" placeholder="e.g. 1234 (or leave blank)" />
            </div>
            <div class="ca-btn-row">
              <button type="submit" class="ca-btn ca-btn-primary" id="ca-btn-signup-submit">✨ Create Account</button>
              ${opts.showGuestButton ? `<button type="button" class="ca-btn ca-btn-ghost" id="ca-btn-guest">Continue as Guest</button>` : ''}
            </div>
          </form>
        `;
      }

      backdrop.innerHTML = `
        <div class="ca-modal-card" role="dialog" aria-modal="true">
          <div class="ca-modal-top">
            <h2 class="ca-modal-title">${escapeHtml(opts.title || '⭐ Couch Arcade Account')}</h2>
            ${opts.allowDismiss !== false ? `<button type="button" class="ca-close-btn" id="ca-modal-close" aria-label="Close">✕</button>` : ''}
          </div>
          <div class="ca-tabs">
            ${cur ? `<button type="button" class="ca-tab ${tab === 'profile' ? 'active' : ''}" data-tab="profile">🏆 Trophies</button>` : ''}
            <button type="button" class="ca-tab ${tab === 'login' ? 'active' : ''}" data-tab="login">🔑 Sign In</button>
            <button type="button" class="ca-tab ${tab === 'signup' ? 'active' : ''}" data-tab="signup">✨ Create Account</button>
          </div>
          ${bodyHtml}
        </div>
      `;

      const closeBtn = backdrop.querySelector('#ca-modal-close');
      if (closeBtn) closeBtn.addEventListener('click', () => closeModal(getActiveAccount()));

      backdrop.querySelectorAll('.ca-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          tab = btn.dataset.tab;
          errorMsg = '';
          render();
        });
      });

      backdrop.querySelectorAll('.ca-filter-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          achFilter = btn.dataset.filter;
          render();
        });
      });

      backdrop.querySelectorAll('.ca-avatar-opt').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedAvatar = btn.dataset.avatar;
          render();
        });
      });

      backdrop.querySelectorAll('.ca-saved-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          const inp = backdrop.querySelector('#ca-login-user');
          if (inp) inp.value = btn.dataset.pickUser || '';
          const pinInp = backdrop.querySelector('#ca-login-pin');
          const picked = loadAllMap()[normalizeHandle(btn.dataset.pickUser)];
          if (picked && !picked.pinHash) {
            const res = loginAccount({ username: picked.username, pin: '' });
            if (res.ok) {
              if (opts.onAuth) opts.onAuth(res.account);
              if (opts.closeOnAuth) closeModal(res.account);
              else { tab = 'profile'; errorMsg = ''; render(); }
            }
          } else if (pinInp) {
            pinInp.focus();
          }
        });
      });

      const logoutBtn = backdrop.querySelector('#ca-btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          logout();
          tab = 'login';
          errorMsg = '';
          render();
        });
      }

      const confirmActiveBtn = backdrop.querySelector('#ca-btn-confirm-active');
      if (confirmActiveBtn) {
        confirmActiveBtn.addEventListener('click', () => {
          const a = getActiveAccount();
          if (opts.onAuth) opts.onAuth(a);
          closeModal(a);
        });
      }

      const guestBtn = backdrop.querySelector('#ca-btn-guest');
      if (guestBtn) {
        guestBtn.addEventListener('click', () => {
          if (opts.onGuest) opts.onGuest();
          closeModal(null);
        });
      }

      const loginForm = backdrop.querySelector('#ca-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = backdrop.querySelector('#ca-login-user').value.trim();
          const pin = backdrop.querySelector('#ca-login-pin').value.trim();
          let res = loginAccount({ username, pin });
          if (!res.ok && res.notFound && typeof opts.remoteLookupFn === 'function') {
            try {
              const remote = await opts.remoteLookupFn(username, pin);
              if (remote && remote.ok && remote.account) {
                const imported = importRemoteAccount(remote.account, true);
                res = { ok: true, account: imported };
              } else if (remote && remote.error) {
                res = { ok: false, error: remote.error };
              }
            } catch (err) {}
          }
          if (!res.ok) {
            errorMsg = res.error || 'Could not sign in.';
            render();
            return;
          }
          errorMsg = '';
          if (opts.onAuth) opts.onAuth(res.account);
          if (opts.closeOnAuth) {
            closeModal(res.account);
          } else {
            tab = 'profile';
            render();
          }
        });
      }

      const signupForm = backdrop.querySelector('#ca-signup-form');
      if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const username = backdrop.querySelector('#ca-signup-user').value.trim();
          const pin = backdrop.querySelector('#ca-signup-pin').value.trim();
          const res = createAccount({ username, pin, avatar: selectedAvatar });
          if (!res.ok) {
            errorMsg = res.error || 'Could not create account.';
            render();
            return;
          }
          errorMsg = '';
          if (opts.onAuth) opts.onAuth(res.account);
          if (opts.closeOnAuth) {
            closeModal(res.account);
          } else {
            tab = 'profile';
            render();
          }
        });
      }
    }

    document.body.appendChild(backdrop);
    render();
  }

  global.CouchAccounts = {
    AVATARS,
    ACHIEVEMENTS,
    getActiveAccount,
    listAccounts,
    createAccount,
    loginAccount,
    verifyAccountCredentials,
    importRemoteAccount,
    logout,
    getTrophyCount,
    unlockAchievement,
    recordGamePlayed,
    getPublicProfile,
    onChange,
    openAccountModal,
    showAchievementToast,
  };
})(window);
