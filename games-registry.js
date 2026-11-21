/**
 * Couch Arcade — Game Hub Registry
 * Add new games here as you build them together!
 */
window.GAME_HUB_REGISTRY = [
  {
    id: 'wonder-tetris',
    codePrefix: 'T',
    title: 'Wonder Tetris',
    tagline: 'Animated Storybook Block Party',
    description:
      'Stack cheerful cartoon blocks with expressive eyes in a sunny fairy-tale kingdom! Spark rainbow combos, fling playful giggle-bubbles at rivals, and play 1–5P live or on TV with phone controllers!',
    path: 'games/wonder-tetris/index.html',
    launchParams: 'host=1',
    players: '1–5P Room · + Cute Bots',
    input: 'Keyboard, Touch & TV Phone',
    accent: '#ec4899',
    ctaBg: '#f59e0b',
    badge: 'NEW!',
    roomFlair: {
      icon: '🧱',
      themeClass: 'flair-tetris',
      eyebrow: 'Storybook Kingdom · Animated Block Party',
      bannerBg: 'linear-gradient(135deg, #38bdf8 0%, #f472b6 54%, #facc15 100%)',
      bannerText: '#fffdf8',
      accent: '#ec4899',
      pillBg: '#fef08a',
      pillText: '#9a3412',
      launchLabel: 'Start Wonder Tetris!',
      controlsTip: 'Move with Arrows/WASD · Rotate with Up/X/Z · Hard Drop with Space · Hold with C · On TV, everyone plays on their phone controller!',
    },
    statKey: 'wonder_tetris_best',
    formatStat: (raw) => {
      try {
        const d = JSON.parse(raw);
        if (!d || !d.games) return null;
        if (d.wins > 0) {
          return `👑 ${d.wins} Wins · Best ${Number(d.bestScore || 0).toLocaleString()} pts`;
        }
        return `★ Best: ${Number(d.bestScore || 0).toLocaleString()} pts · ${d.bestLines || 0} Lines`;
      } catch {
        return null;
      }
    },
    artSvg: `
      <svg viewBox="0 0 360 195" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Sunny Disney Storybook Sky -->
        <rect width="360" height="195" fill="#7dd3fc"/>
        <!-- Pastel Rainbow Arch -->
        <path d="M30 175 A150 132 0 0 1 330 175" stroke="#fb7185" stroke-width="11" fill="none" opacity="0.55"/>
        <path d="M40 175 A140 122 0 0 1 320 175" stroke="#facc15" stroke-width="11" fill="none" opacity="0.6"/>
        <path d="M50 175 A130 112 0 0 1 310 175" stroke="#4ade80" stroke-width="11" fill="none" opacity="0.55"/>
        <path d="M60 175 A120 102 0 0 1 300 175" stroke="#38bdf8" stroke-width="11" fill="none" opacity="0.55"/>
        <!-- Smiling Golden Sun -->
        <g transform="translate(236, 38)">
          <circle r="21" fill="#facc15" stroke="#1e1b2e" stroke-width="2.8"/>
          <circle cx="-6.5" cy="-3" r="2.2" fill="#1e1b2e"/>
          <circle cx="6.5" cy="-3" r="2.2" fill="#1e1b2e"/>
          <circle cx="-10.5" cy="3" r="3" fill="#fda4af" opacity="0.8"/>
          <circle cx="10.5" cy="3" r="3" fill="#fda4af" opacity="0.8"/>
          <path d="M-5.5 4 Q0 9.5 5.5 4" stroke="#1e1b2e" stroke-width="2.2" stroke-linecap="round"/>
        </g>
        <!-- Fluffy Cartoon Clouds -->
        <g fill="#ffffff" stroke="#1e1b2e" stroke-width="2.5" stroke-linejoin="round">
          <path d="M20 52 Q20 36 36 36 Q44 24 60 30 Q74 26 78 42 Q88 44 85 55 L22 55 Z"/>
        </g>
        <!-- Fairy-Tale Storybook Castle Silhouette on Left Hill -->
        <path d="M-10 195 Q70 132 165 162 Q265 130 370 156 L370 195 Z" fill="#4ade80" stroke="#1e1b2e" stroke-width="2.8"/>
        <g transform="translate(58, 128)">
          <rect x="-22" y="-12" width="44" height="34" fill="#fffbeb" stroke="#1e1b2e" stroke-width="2.4"/>
          <rect x="-24" y="-32" width="14" height="36" fill="#fffbeb" stroke="#1e1b2e" stroke-width="2.2"/>
          <path d="M-27 -32 L-17 -50 L-7 -32 Z" fill="#38bdf8" stroke="#1e1b2e" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="10" y="-32" width="14" height="36" fill="#fffbeb" stroke="#1e1b2e" stroke-width="2.2"/>
          <path d="M7 -32 L17 -50 L27 -32 Z" fill="#38bdf8" stroke="#1e1b2e" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="-8" y="-44" width="16" height="44" fill="#fffbeb" stroke="#1e1b2e" stroke-width="2.2"/>
          <path d="M-12 -44 L0 -66 L12 -44 Z" fill="#ec4899" stroke="#1e1b2e" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M-7 22 L-7 10 A7 7 0 0 1 7 10 L7 22 Z" fill="#fbbf24" stroke="#1e1b2e" stroke-width="2"/>
        </g>
        <!-- Sparkly 4-Point Disney Stars -->
        <path d="M108 26 L111 35 L120 38 L111 41 L108 50 L105 41 L96 38 L105 35 Z" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.6"/>
        <path d="M256 26 L258 33 L265 35 L258 37 L256 44 L254 37 L247 35 L254 33 Z" fill="#fbcfe8" stroke="#1e1b2e" stroke-width="1.5"/>
        <path d="M294 114 L297 122 L305 125 L297 128 L294 136 L291 128 L283 125 L291 122 Z" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.6"/>
        <!-- Cheerful Animated Storybook Tetromino Blocks with Cute Eyes! -->
        <!-- Pink T-Piece Floating Happily -->
        <g transform="translate(154, 46) rotate(-7)">
          <rect x="28" y="0" width="28" height="28" rx="7" fill="#ec4899" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="33" y="4" width="18" height="6" rx="3" fill="#fbcfe8" opacity="0.8"/>
          <rect x="0" y="28" width="28" height="28" rx="7" fill="#ec4899" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="28" y="28" width="28" height="28" rx="7" fill="#ec4899" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="56" y="28" width="28" height="28" rx="7" fill="#ec4899" stroke="#1e1b2e" stroke-width="2.8"/>
          <!-- Cute Expressive Face on Center Block -->
          <circle cx="37" cy="40" r="4" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.8"/>
          <circle cx="47" cy="40" r="4" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.8"/>
          <circle cx="38" cy="40" r="2" fill="#1e1b2e"/>
          <circle cx="48" cy="40" r="2" fill="#1e1b2e"/>
          <path d="M38 47 Q42 52 46 47" stroke="#1e1b2e" stroke-width="2" stroke-linecap="round"/>
        </g>
        <!-- Bottom Joyful Stacked Candy Blocks -->
        <g transform="translate(116, 122)">
          <!-- Mint S-Block -->
          <rect x="0" y="28" width="28" height="28" rx="7" fill="#4ade80" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="28" y="28" width="28" height="28" rx="7" fill="#4ade80" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="28" y="0" width="28" height="28" rx="7" fill="#4ade80" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="56" y="0" width="28" height="28" rx="7" fill="#4ade80" stroke="#1e1b2e" stroke-width="2.8"/>
          <circle cx="37" cy="12" r="3.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.6"/>
          <circle cx="47" cy="12" r="3.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.6"/>
          <circle cx="37.8" cy="12" r="1.8" fill="#1e1b2e"/>
          <circle cx="47.8" cy="12" r="1.8" fill="#1e1b2e"/>
          <path d="M39 18 Q42 22 45 18" stroke="#1e1b2e" stroke-width="1.8" stroke-linecap="round"/>
          <!-- Sunny O-Block -->
          <rect x="56" y="28" width="28" height="28" rx="7" fill="#facc15" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="84" y="28" width="28" height="28" rx="7" fill="#facc15" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="84" y="0" width="28" height="28" rx="7" fill="#facc15" stroke="#1e1b2e" stroke-width="2.8"/>
          <circle cx="93" cy="12" r="3.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.6"/>
          <circle cx="103" cy="12" r="3.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.6"/>
          <circle cx="92.5" cy="12" r="1.8" fill="#1e1b2e"/>
          <circle cx="102.5" cy="12" r="1.8" fill="#1e1b2e"/>
          <path d="M95 18 Q98 22 101 18" stroke="#1e1b2e" stroke-width="1.8" stroke-linecap="round"/>
          <!-- Sky Ribbon I-Block -->
          <rect x="112" y="28" width="28" height="28" rx="7" fill="#38bdf8" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="140" y="28" width="28" height="28" rx="7" fill="#38bdf8" stroke="#1e1b2e" stroke-width="2.8"/>
          <rect x="112" y="0" width="28" height="28" rx="7" fill="#fb923c" stroke="#1e1b2e" stroke-width="2.8"/>
          <circle cx="121" cy="40" r="3.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.6"/>
          <circle cx="131" cy="40" r="3.6" fill="#ffffff" stroke="#1e1b2e" stroke-width="1.6"/>
          <circle cx="121.5" cy="40" r="1.8" fill="#1e1b2e"/>
          <circle cx="131.5" cy="40" r="1.8" fill="#1e1b2e"/>
          <path d="M123 46 Q126 50 129 46" stroke="#1e1b2e" stroke-width="1.8" stroke-linecap="round"/>
        </g>
      </svg>
    `,
  },
  {
    id: 'suncoast-kart',
    codePrefix: 'S',
    title: 'Suncoast Kart',
    tagline: '3D Coastal Drift Grand Prix',
    description:
      'Drift across Suncoast Grand Circuit in vibrant 3D! Charge 3-tier spark mini-turbos, launch off jump ramps, blast through the Palm Dune shortcut, and fling shells in online rooms.',
    path: 'games/suncoast-kart/index.html',
    launchParams: 'host=1',
    players: '1–5P Room · + AI Rivals',
    input: 'Keyboard & Touch',
    accent: '#0284c7',
    ctaBg: '#ef4444',
    badge: '3D RACE',
    roomFlair: {
      icon: '🏎️',
      themeClass: 'flair-kart',
      eyebrow: 'Suncoast Grand Circuit · 3D Drift Grand Prix',
      bannerBg: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 52%, #f59e0b 100%)',
      bannerText: '#fffdf8',
      accent: '#ef4444',
      pillBg: '#fef08a',
      pillText: '#9a3412',
      launchLabel: 'Start 3D Grand Prix!',
      controlsTip: 'Drive with WASD/Arrows or Touch · Hold Space to Hop & Drift Turbo · Tap Space on Ramps for Jump Tricks · Press E for Items!',
    },
    statKey: 'suncoast_kart_best',
    formatStat: (raw) => {
      try {
        const d = JSON.parse(raw);
        if (!d || !d.races) return null;
        const ord = d.bestPlace === 1 ? '1st' : d.bestPlace === 2 ? '2nd' : d.bestPlace === 3 ? '3rd' : `#${d.bestPlace}`;
        if (d.bestLapMs) {
          const sec = (d.bestLapMs / 1000).toFixed(2);
          return `🏆 Best: ${ord} · Lap ${sec}s`;
        }
        return `🏆 Best: ${ord} · ${d.wins || 0} Wins`;
      } catch {
        return null;
      }
    },
    artSvg: `
      <svg viewBox="0 0 360 195" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Sunny Mediterranean Sky & Golden Sun -->
        <rect width="360" height="195" fill="#7dd3fc"/>
        <circle cx="304" cy="40" r="24" fill="#fde047" stroke="#1e1b2e" stroke-width="3"/>
        <!-- Fluffy Cartoon Clouds -->
        <g fill="#ffffff" stroke="#1e1b2e" stroke-width="2.6" stroke-linejoin="round">
          <path d="M26 48 Q26 32 42 32 Q50 20 66 26 Q82 22 86 38 Q98 40 94 52 L28 52 Z"/>
          <path d="M168 38 Q168 26 180 26 Q188 18 200 24 Q212 22 214 36 L168 38 Z"/>
        </g>
        <!-- Sparkling Turquoise Ocean Bay -->
        <rect x="0" y="96" width="360" height="52" fill="#06b6d4"/>
        <path d="M18 112 Q34 106 50 112 M270 114 Q288 108 306 114 M220 124 Q236 118 252 124" stroke="#cffafe" stroke-width="3" stroke-linecap="round"/>
        <!-- Emerald Coastal Hill & Striped Lighthouse -->
        <path d="M210 112 Q278 52 360 84 L360 124 L210 124 Z" fill="#22c55e" stroke="#1e1b2e" stroke-width="3"/>
        <g transform="translate(274, 34)">
          <rect x="-7" y="14" width="14" height="36" fill="#ffffff" stroke="#1e1b2e" stroke-width="2.6"/>
          <rect x="-7" y="22" width="14" height="8" fill="#ef4444" stroke="#1e1b2e" stroke-width="2"/>
          <rect x="-7" y="38" width="14" height="8" fill="#ef4444" stroke="#1e1b2e" stroke-width="2"/>
          <rect x="-8" y="8" width="16" height="7" fill="#fef08a" stroke="#1e1b2e" stroke-width="2.2"/>
          <path d="M-10 8 L0 -4 L10 8 Z" fill="#ef4444" stroke="#1e1b2e" stroke-width="2.4" stroke-linejoin="round"/>
        </g>
        <!-- Sweeping Coastal Road & Red/White Curbs -->
        <path d="M-10 195 Q70 120 198 122 Q294 124 370 144 L370 195 Z" fill="#4ade80" stroke="#1e1b2e" stroke-width="3"/>
        <path d="M-15 195 Q75 116 205 126 Q292 132 375 162 L375 195 Z" fill="#ef4444" stroke="#1e1b2e" stroke-width="3"/>
        <path d="M-4 195 Q80 124 202 133 Q286 139 375 170 L375 195 Z" fill="#334155" stroke="#1e1b2e" stroke-width="2.8"/>
        <path d="M22 184 Q96 146 196 154 Q266 160 332 182" stroke="#facc15" stroke-width="4" stroke-dasharray="14 12" stroke-linecap="round"/>
        <!-- Palm Tree on Left Coast -->
        <g transform="translate(42, 74)">
          <path d="M0 54 Q6 28 2 4" stroke="#92400e" stroke-width="7" stroke-linecap="round"/>
          <path d="M2 4 Q-20 -4 -28 12 Q-12 6 2 8 Z" fill="#16a34a" stroke="#1e1b2e" stroke-width="2.2"/>
          <path d="M2 4 Q20 -8 30 6 Q14 4 2 8 Z" fill="#22c55e" stroke="#1e1b2e" stroke-width="2.2"/>
          <path d="M2 4 Q-8 -18 14 -14 Q6 -4 2 4 Z" fill="#4ade80" stroke="#1e1b2e" stroke-width="2.2"/>
        </g>
        <!-- Floating Mystery ? Item Box -->
        <g transform="translate(230, 86) rotate(12)">
          <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#facc15" stroke="#1e1b2e" stroke-width="3"/>
          <text x="0" y="7" text-anchor="middle" fill="#1e1b2e" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="20">?</text>
        </g>
        <!-- Blue Drift Sparks -->
        <path d="M74 166 L54 156 M76 172 L48 172 M80 178 L58 184" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
        <circle cx="50" cy="162" r="4" fill="#fef08a" stroke="#1e1b2e" stroke-width="1.8"/>
        <circle cx="44" cy="174" r="3.5" fill="#38bdf8" stroke="#1e1b2e" stroke-width="1.8"/>
        <!-- Cartoon Red Hero Kart Drifting! -->
        <g transform="translate(132, 148) rotate(-8)">
          <!-- Exhaust Flame -->
          <path d="M-40 4 Q-58 -6 -66 4 Q-56 14 -40 4 Z" fill="#38bdf8" stroke="#1e1b2e" stroke-width="2.4"/>
          <path d="M-40 4 Q-51 -1 -55 4 Q-50 9 -40 4 Z" fill="#fef08a"/>
          <!-- Chassis -->
          <rect x="-36" y="-4" width="70" height="20" rx="8" fill="#ef4444" stroke="#1e1b2e" stroke-width="3.2"/>
          <rect x="-8" y="-2" width="38" height="6" rx="3" fill="#ffffff"/>
          <!-- Spoiler -->
          <path d="M-36 -4 L-44 -18 L-26 -18 L-24 -4 Z" fill="#facc15" stroke="#1e1b2e" stroke-width="2.6" stroke-linejoin="round"/>
          <!-- Driver Head & Cap -->
          <circle cx="-4" cy="-18" r="12" fill="#fdba74" stroke="#1e1b2e" stroke-width="2.8"/>
          <path d="M-16 -20 A12 12 0 0 1 10 -20 Z" fill="#ef4444" stroke="#1e1b2e" stroke-width="2.6"/>
          <rect x="2" y="-23" width="14" height="5" rx="2.5" fill="#ef4444" stroke="#1e1b2e" stroke-width="2.2"/>
          <circle cx="2" cy="-16" r="2" fill="#1e1b2e"/>
          <!-- Wheels -->
          <circle cx="-22" cy="16" r="11" fill="#1e293b" stroke="#1e1b2e" stroke-width="3"/>
          <circle cx="-22" cy="16" r="4.5" fill="#f8fafc"/>
          <circle cx="22" cy="16" r="10" fill="#1e293b" stroke="#1e1b2e" stroke-width="3"/>
          <circle cx="22" cy="16" r="4" fill="#f8fafc"/>
        </g>
        <!-- Rival Teal Kart Behind -->
        <g transform="translate(232, 134) scale(0.72) rotate(5)">
          <rect x="-34" y="-4" width="66" height="19" rx="8" fill="#0ea5e9" stroke="#1e1b2e" stroke-width="3.4"/>
          <circle cx="-4" cy="-17" r="11" fill="#fdba74" stroke="#1e1b2e" stroke-width="3"/>
          <path d="M-15 -19 A11 11 0 0 1 9 -19 Z" fill="#facc15" stroke="#1e1b2e" stroke-width="2.8"/>
          <circle cx="-20" cy="15" r="10" fill="#1e293b" stroke="#1e1b2e" stroke-width="3.2"/>
          <circle cx="20" cy="15" r="9.5" fill="#1e293b" stroke="#1e1b2e" stroke-width="3.2"/>
        </g>
      </svg>
    `,
  },
  {
    id: 'astro-purge',
    codePrefix: 'A',
    title: 'Astro Purge',
    tagline: 'Cartoon UFO Co-op Adventure',
    description:
      'Pilot cartoon UFOs together against grumpy space viruses! Earn personal visual saucer upgrades, climb the live damage meter, and battle a giant boss every 10 levels.',
    path: 'games/astro-purge/index.html',
    launchParams: 'host=1',
    players: '1–5P Room · Co-op',
    input: 'Touch, Keyboard & Pad',
    accent: '#0d9488',
    ctaBg: '#14b8a6',
    badge: 'CO-OP',
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
    players: '1–5P Room · Online',
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
