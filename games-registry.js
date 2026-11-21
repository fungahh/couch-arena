/**
 * Couch Arcade — Game Hub Registry
 * Add new games here as you build them together!
 */
window.GAME_HUB_REGISTRY = [
  {
    id: 'astro-purge',
    codePrefix: 'A',
    title: 'Astro Purge',
    tagline: 'Cartoon UFO Co-op Adventure',
    description:
      'Pilot cartoon UFOs together against grumpy space viruses! Earn personal visual saucer upgrades, climb the live damage meter, and battle a giant boss every 10 levels.',
    path: 'games/astro-purge/index.html',
    launchParams: 'host=1',
    players: '1–4P Room · Co-op',
    input: 'Touch, Keyboard & Pad',
    accent: '#0d9488',
    ctaBg: '#14b8a6',
    badge: 'NEW!',
    roomFlair: {
      icon: '🛸',
      themeClass: 'flair-astro',
      eyebrow: 'Space Saucer Squadron · Co-op Launch Pad',
      bannerBg: 'linear-gradient(135deg, #182644 0%, #0f3a52 58%, #134e4a 100%)',
      bannerText: '#fff8ec',
      accent: '#14b8a6',
      pillBg: '#ccfbf1',
      pillText: '#0f766e',
      launchLabel: 'Launch UFO Mission!',
      controlsTip: 'Steer with Touch/Joystick, WASD, or Gamepad · Tap DASH to zip through space hazards!',
      supportsLocalAdd: true,
    },
    statKey: 'astro_purge_best',
    formatStat: (raw) => {
      try {
        const d = JSON.parse(raw);
        if (!d || !d.bestLevel) return null;
        return `★ Best: Lv ${d.bestLevel} · ${Number(d.bestScore || 0).toLocaleString()} pts`;
      } catch {
        return null;
      }
    },
    artSvg: `
      <svg viewBox="0 0 360 195" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Vintage Cartoon Night Sky -->
        <rect width="360" height="195" fill="#182644"/>
        <circle cx="56" cy="48" r="28" fill="#fef08a" stroke="#1e1b2e" stroke-width="3"/>
        <circle cx="67" cy="42" r="23" fill="#182644"/>
        <!-- Twinkling 4-point Retro Disney Stars -->
        <path d="M138 22 L141 31 L150 34 L141 37 L138 46 L135 37 L126 34 L135 31 Z" fill="#fef08a"/>
        <path d="M214 148 L216 154 L222 156 L216 158 L214 164 L212 158 L206 156 L212 154 Z" fill="#bae6fd"/>
        <path d="M322 26 L324 32 L330 34 L324 36 L322 42 L320 36 L314 34 L320 32 Z" fill="#fde68a"/>
        <circle cx="34" cy="148" r="3" fill="#fef08a" opacity="0.8"/>
        <circle cx="176" cy="24" r="2.5" fill="#ffffff" opacity="0.85"/>
        <!-- Ringed Pastel Planet -->
        <circle cx="316" cy="154" r="18" fill="#f9a8d4" stroke="#1e1b2e" stroke-width="2.5"/>
        <ellipse cx="316" cy="154" rx="32" ry="8" transform="rotate(-14 316 154)" stroke="#fde68a" stroke-width="3.5" fill="none"/>
        <!-- Grumpy Cartoon Virus Boss -->
        <g transform="translate(264, 88)">
          <path d="M0 -34 L0 -48 M24 -24 L35 -35 M34 0 L48 0 M24 24 L35 35 M0 34 L0 48 M-24 24 L-35 35 M-34 0 L-48 0 M-24 -24 L-35 -35" stroke="#1e1b2e" stroke-width="7" stroke-linecap="round"/>
          <path d="M0 -34 L0 -48 M24 -24 L35 -35 M34 0 L48 0 M24 24 L35 35 M0 34 L0 48 M-24 24 L-35 35 M-34 0 L-48 0 M-24 -24 L-35 -35" stroke="#f43f5e" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="0" cy="-49" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="36" cy="-36" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="49" cy="0" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="36" cy="36" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="0" cy="49" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="-36" cy="36" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="-49" cy="0" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle cx="-36" cy="-36" r="5" fill="#fda4af" stroke="#1e1b2e" stroke-width="2"/>
          <circle r="35" fill="#f43f5e" stroke="#1e1b2e" stroke-width="3.5"/>
          <ellipse cx="-11" cy="-6" rx="7" ry="9" fill="#ffffff" stroke="#1e1b2e" stroke-width="2.2"/>
          <ellipse cx="11" cy="-6" rx="7" ry="9" fill="#ffffff" stroke="#1e1b2e" stroke-width="2.2"/>
          <circle cx="-13" cy="-5" r="3.2" fill="#1e1b2e"/>
          <circle cx="9" cy="-5" r="3.2" fill="#1e1b2e"/>
          <path d="M-20 -17 L-4 -11 M20 -17 L4 -11" stroke="#1e1b2e" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M-16 12 L-8 17 L0 13 L8 17 L16 12 L10 24 L-10 24 Z" fill="#1e1b2e"/>
        </g>
        <!-- Happy Ray Bolts -->
        <circle cx="176" cy="78" r="5" fill="#5eead4" stroke="#1e1b2e" stroke-width="2"/>
        <circle cx="198" cy="83" r="5" fill="#fde047" stroke="#1e1b2e" stroke-width="2"/>
        <circle cx="164" cy="120" r="5" fill="#fde68a" stroke="#1e1b2e" stroke-width="2"/>
        <!-- Cartoon UFO 1 (Cyan) with Thruster Flame & Smiling Alien -->
        <g transform="translate(116, 72) rotate(8)">
          <path d="M-24 2 Q-42 -8 -52 2 Q-42 12 -24 2 Z" fill="#f97316" stroke="#1e1b2e" stroke-width="2.5"/>
          <path d="M-24 2 Q-36 -4 -42 2 Q-36 8 -24 2 Z" fill="#fde047"/>
          <ellipse cx="0" cy="4" rx="28" ry="12" fill="#14b8a6" stroke="#1e1b2e" stroke-width="3"/>
          <circle cx="-14" cy="6" r="2.8" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.3"/>
          <circle cx="0" cy="8" r="2.8" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.3"/>
          <circle cx="14" cy="6" r="2.8" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.3"/>
          <path d="M-16 1 A16 16 0 0 1 16 1 Z" fill="#bae6fd" stroke="#1e1b2e" stroke-width="3"/>
          <circle cx="0" cy="-4" r="7.5" fill="#86efac" stroke="#1e1b2e" stroke-width="1.8"/>
          <circle cx="-3" cy="-5.5" r="2.4" fill="#fff" stroke="#1e1b2e" stroke-width="1.2"/>
          <circle cx="3" cy="-5.5" r="2.4" fill="#fff" stroke="#1e1b2e" stroke-width="1.2"/>
          <circle cx="-2.4" cy="-5.5" r="1.1" fill="#1e1b2e"/>
          <circle cx="3.6" cy="-5.5" r="1.1" fill="#1e1b2e"/>
          <path d="M-2.5 -2 Q0 0.5 2.5 -2" stroke="#1e1b2e" stroke-width="1.4" stroke-linecap="round"/>
        </g>
        <!-- Cartoon UFO 2 (Amber) -->
        <g transform="translate(94, 134) rotate(-10)">
          <path d="M-24 2 Q-40 -7 -48 2 Q-40 11 -24 2 Z" fill="#f97316" stroke="#1e1b2e" stroke-width="2.5"/>
          <path d="M-24 2 Q-35 -3 -40 2 Q-35 7 -24 2 Z" fill="#fde047"/>
          <ellipse cx="0" cy="4" rx="26" ry="11" fill="#f59e0b" stroke="#1e1b2e" stroke-width="3"/>
          <circle cx="-12" cy="6" r="2.6" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.3"/>
          <circle cx="0" cy="7.5" r="2.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.3"/>
          <circle cx="12" cy="6" r="2.6" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.3"/>
          <path d="M-14.5 1 A14.5 14.5 0 0 1 14.5 1 Z" fill="#bae6fd" stroke="#1e1b2e" stroke-width="3"/>
          <circle cx="0" cy="-3.5" r="6.8" fill="#86efac" stroke="#1e1b2e" stroke-width="1.8"/>
          <circle cx="-2.8" cy="-5" r="2.2" fill="#fff" stroke="#1e1b2e" stroke-width="1.2"/>
          <circle cx="2.8" cy="-5" r="2.2" fill="#fff" stroke="#1e1b2e" stroke-width="1.2"/>
          <circle cx="-2.2" cy="-5" r="1" fill="#1e1b2e"/>
          <circle cx="3.4" cy="-5" r="1" fill="#1e1b2e"/>
        </g>
      </svg>
    `,
  },
  {
    id: 'wordle-arena',
    codePrefix: 'W',
    title: 'Wordle Arena',
    tagline: '5-Word Live Race Marathon',
    description:
      'Race friends across 5 secret words in English or Swedish with 25 total guesses. Share your room link and watch colorful tiles flip live!',
    path: 'games/wordle-arena/index.html',
    launchParams: 'autocreate=1',
    players: '1–4P Room · Online',
    input: 'Keyboard / Touch',
    accent: '#15803d',
    ctaBg: '#22c55e',
    badge: 'CLASSIC',
    roomFlair: {
      icon: '🔤',
      themeClass: 'flair-wordle',
      eyebrow: '5-Word Crossword Derby · Live Tile Race',
      bannerBg: 'linear-gradient(135deg, #fef3c7 0%, #dcfce7 55%, #bbf7d0 100%)',
      bannerText: '#1e1b2e',
      accent: '#22c55e',
      pillBg: '#dcfce7',
      pillText: '#15803d',
      launchLabel: 'Start 5-Word Race!',
      controlsTip: 'Guess 5 secret words within 25 total tries · On TV, everyone types privately on their own phone!',
      supportsLanguage: true,
    },
    statKey: null,
    artSvg: `
      <svg viewBox="0 0 360 195" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Sunny Retro Storybook Sky -->
        <rect width="360" height="195" fill="#fef3c7"/>
        <circle cx="52" cy="36" r="24" fill="#fde68a"/>
        <circle cx="314" cy="158" r="34" fill="#fde68a"/>
        <!-- Sparkling Disney Stars -->
        <path d="M38 142 L41 151 L50 154 L41 157 L38 166 L35 157 L26 154 L35 151 Z" fill="#f59e0b"/>
        <path d="M322 24 L325 33 L334 36 L325 39 L322 48 L319 39 L310 36 L319 33 Z" fill="#f43f5e"/>
        <path d="M298 62 L300 68 L306 70 L300 72 L298 78 L296 72 L290 70 L296 68 Z" fill="#14b8a6"/>
        <!-- Chunky Inked Cartoon Wordle Tiles -->
        <g transform="translate(62, 26)">
          <!-- Row 1 -->
          <rect x="0" y="3" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="0" y="0" width="40" height="40" rx="10" fill="#cbd5e1" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="48" y="3" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="48" y="0" width="40" height="40" rx="10" fill="#fbbf24" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="96" y="3" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="96" y="0" width="40" height="40" rx="10" fill="#cbd5e1" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="144" y="3" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="144" y="0" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="192" y="3" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="192" y="0" width="40" height="40" rx="10" fill="#cbd5e1" stroke="#1e1b2e" stroke-width="2.8"/>
          <!-- Row 2 -->
          <rect x="0" y="51" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="0" y="48" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="48" y="51" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="48" y="48" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="96" y="51" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="96" y="48" width="40" height="40" rx="10" fill="#fbbf24" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="144" y="51" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="144" y="48" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="192" y="51" width="40" height="40" rx="10" fill="#1e1b2e"/>
          <rect x="192" y="48" width="40" height="40" rx="10" fill="#fbbf24" stroke="#1e1b2e" stroke-width="2.8"/>
          <!-- Row 3 (Joyful Solved Row!) -->
          <g transform="translate(0, 96)">
            <rect x="0" y="4" width="40" height="40" rx="10" fill="#1e1b2e"/>
            <rect x="0" y="0" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="3"/>
            <text x="20" y="27" text-anchor="middle" fill="#ffffff" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="21">W</text>
            <rect x="48" y="4" width="40" height="40" rx="10" fill="#1e1b2e"/>
            <rect x="48" y="0" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="3"/>
            <text x="68" y="27" text-anchor="middle" fill="#ffffff" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="21">O</text>
            <rect x="96" y="4" width="40" height="40" rx="10" fill="#1e1b2e"/>
            <rect x="96" y="0" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="3"/>
            <text x="116" y="27" text-anchor="middle" fill="#ffffff" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="21">R</text>
            <rect x="144" y="4" width="40" height="40" rx="10" fill="#1e1b2e"/>
            <rect x="144" y="0" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="3"/>
            <text x="164" y="27" text-anchor="middle" fill="#ffffff" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="21">D</text>
            <rect x="192" y="4" width="40" height="40" rx="10" fill="#1e1b2e"/>
            <rect x="192" y="0" width="40" height="40" rx="10" fill="#22c55e" stroke="#1e1b2e" stroke-width="3"/>
            <text x="212" y="27" text-anchor="middle" fill="#ffffff" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="21">S</text>
          </g>
        </g>
      </svg>
    `,
  },
];

window.CouchGames = {
  getAll() {
    return window.GAME_HUB_REGISTRY || [];
  },
  getById(id) {
    return (window.GAME_HUB_REGISTRY || []).find((g) => g.id === id) || null;
  },
  getPrefix(gameOrId) {
    const g = typeof gameOrId === 'string' ? this.getById(gameOrId) : gameOrId;
    if (!g) return 'G';
    return (g.codePrefix || g.title[0] || 'G').toUpperCase();
  },
  generateRoomCode(gameOrId) {
    const prefix = this.getPrefix(gameOrId);
    const digits = String(Math.floor(100 + Math.random() * 900));
    return prefix + digits;
  },
  getByCode(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return null;
    const prefix = clean[0];
    const match = (window.GAME_HUB_REGISTRY || []).find((g) => this.getPrefix(g) === prefix);
    return match || null;
  },
  isValidGameCode(code) {
    return /^[A-Z]\d{3}$/.test(String(code || '').trim().toUpperCase());
  },
};
