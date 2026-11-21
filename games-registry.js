/**
 * Game Hub Registry
 * Add new games here as you build them together!
 */
window.GAME_HUB_REGISTRY = [
  {
    id: 'astro-purge',
    title: 'Astro Purge',
    tagline: 'Co-op Space Virus Asteroids',
    description:
      'Pilot twin starships together against waves of space viruses and infected asteroids. Share XP, unlock new weapons, and face a mutant boss every 10 levels.',
    path: 'games/astro-purge/index.html',
    players: '1–2P Couch Co-op',
    input: 'Keyboard + Controllers',
    accent: '#14b8a6',
    accentSoft: 'rgba(20, 184, 166, 0.14)',
    badge: 'NEW',
    statKey: 'astro_purge_best',
    formatStat: (raw) => {
      try {
        const d = JSON.parse(raw);
        if (!d || !d.bestLevel) return null;
        return `Best: Lv ${d.bestLevel} · ${Number(d.bestScore || 0).toLocaleString()} pts`;
      } catch {
        return null;
      }
    },
    artSvg: `
      <svg viewBox="0 0 360 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="360" height="190" fill="#0b1320"/>
        <circle cx="42" cy="36" r="1.5" fill="#94a3b8" opacity="0.6"/>
        <circle cx="110" cy="24" r="1.2" fill="#e2e8f0" opacity="0.7"/>
        <circle cx="192" cy="48" r="1.8" fill="#cbd5e1" opacity="0.5"/>
        <circle cx="318" cy="30" r="1.4" fill="#94a3b8" opacity="0.7"/>
        <circle cx="76" cy="148" r="1.3" fill="#e2e8f0" opacity="0.5"/>
        <circle cx="290" cy="156" r="1.6" fill="#94a3b8" opacity="0.6"/>
        <!-- Virus Boss Silhouette -->
        <g transform="translate(262, 92)">
          <circle r="38" fill="#1f1620" stroke="#f43f5e" stroke-width="2.5"/>
          <circle r="24" fill="#3a1626"/>
          <circle cx="-8" cy="-4" r="5" fill="#fb7185"/>
          <circle cx="10" cy="6" r="3.5" fill="#fb7185"/>
          <circle cx="4" cy="-12" r="2.5" fill="#fda4af"/>
          <path d="M0 -38 L0 -50 M27 -27 L36 -36 M38 0 L50 0 M27 27 L36 36 M0 38 L0 50 M-27 27 L-36 36 M-38 0 L-50 0 M-27 -27 L-36 -36" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/>
          <circle cx="0" cy="-52" r="4" fill="#fb7185"/>
          <circle cx="38" cy="-38" r="4" fill="#fb7185"/>
          <circle cx="52" cy="0" r="4" fill="#fb7185"/>
          <circle cx="38" cy="38" r="4" fill="#fb7185"/>
          <circle cx="0" cy="52" r="4" fill="#fb7185"/>
          <circle cx="-38" cy="38" r="4" fill="#fb7185"/>
          <circle cx="-52" cy="0" r="4" fill="#fb7185"/>
          <circle cx="-38" cy="-38" r="4" fill="#fb7185"/>
        </g>
        <!-- Laser Streams -->
        <line x1="126" y1="68" x2="206" y2="82" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
        <line x1="120" y1="126" x2="208" y2="104" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
        <!-- Ship 1 (Cyan) -->
        <g transform="translate(96, 64) rotate(10)">
          <polygon points="24,0 -14,-13 -8,0 -14,13" fill="#14b8a6" stroke="#99f6e4" stroke-width="1.8"/>
          <polygon points="-14,-5 -24,0 -14,5" fill="#5eead4" opacity="0.8"/>
        </g>
        <!-- Ship 2 (Amber) -->
        <g transform="translate(88, 130) rotate(-14)">
          <polygon points="24,0 -14,-13 -8,0 -14,13" fill="#f59e0b" stroke="#fde68a" stroke-width="1.8"/>
          <polygon points="-14,-5 -24,0 -14,5" fill="#fcd34d" opacity="0.8"/>
        </g>
        <!-- Small Asteroid -->
        <polygon points="164,146 178,136 194,144 190,162 172,166 158,158" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      </svg>
    `,
  },
  {
    id: 'wordle-arena',
    title: 'Wordle Arena',
    tagline: '5-Word Live Multiplayer Marathon',
    description:
      'Race across 5 secret words in English or Swedish with 25 total guesses. Create a room to play live together or practice solo against bots.',
    path: 'games/wordle-arena/index.html',
    players: 'Solo or Online',
    input: 'Keyboard / Touch',
    accent: '#22c55e',
    accentSoft: 'rgba(34, 197, 94, 0.14)',
    badge: 'CLASSIC',
    statKey: null,
    artSvg: `
      <svg viewBox="0 0 360 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="360" height="190" fill="#0d1522"/>
        <g transform="translate(68, 34)">
          <!-- Row 1 -->
          <rect x="0" y="0" width="38" height="38" rx="7" fill="#334155"/>
          <rect x="46" y="0" width="38" height="38" rx="7" fill="#eab308"/>
          <rect x="92" y="0" width="38" height="38" rx="7" fill="#334155"/>
          <rect x="138" y="0" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="184" y="0" width="38" height="38" rx="7" fill="#334155"/>
          <!-- Row 2 -->
          <rect x="0" y="46" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="46" y="46" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="92" y="46" width="38" height="38" rx="7" fill="#334155"/>
          <rect x="138" y="46" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="184" y="46" width="38" height="38" rx="7" fill="#eab308"/>
          <!-- Row 3 (Solved) -->
          <rect x="0" y="92" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="46" y="92" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="92" y="92" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="138" y="92" width="38" height="38" rx="7" fill="#22c55e"/>
          <rect x="184" y="92" width="38" height="38" rx="7" fill="#22c55e"/>
          <text x="19" y="117" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="18">W</text>
          <text x="65" y="117" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="18">O</text>
          <text x="111" y="117" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="18">R</text>
          <text x="157" y="117" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="18">D</text>
          <text x="203" y="117" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="18">S</text>
        </g>
      </svg>
    `,
  },
];
