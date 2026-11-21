/**
 * Wonder Tetris — SRS Guideline Tetris Engine + Cartoon Animation State + Friendly Bot AI
 * Deterministic 7-bag randomizer, full SRS wall kicks, T-Spins, combos, garbage canceling,
 * expressive character animations, and compact state serialization for 1–5P online & TV play.
 */
(function (global) {
  'use strict';

  const COLS = 10;
  const VISIBLE_ROWS = 20;
  const BUFFER_ROWS = 4;
  const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS;

  // Joyful Disney Storybook Candy-Gloss Piece Palette!
  const PIECES = {
    I: {
      code: 'I',
      name: 'Sky Ribbon',
      fill: '#38bdf8',
      light: '#bae6fd',
      dark: '#0284c7',
      cheek: '#fda4af',
      cells: [
        [[0, 1], [1, 1], [2, 1], [3, 1]],
        [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]],
        [[1, 0], [1, 1], [1, 2], [1, 3]],
      ],
    },
    O: {
      code: 'O',
      name: 'Sunny Honey',
      fill: '#facc15',
      light: '#fef08a',
      dark: '#ca8a04',
      cheek: '#fb7185',
      cells: [
        [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [2, 1]],
      ],
    },
    T: {
      code: 'T',
      name: 'Magic Berry',
      fill: '#ec4899',
      light: '#fbcfe8',
      dark: '#be185d',
      cheek: '#fde047',
      cells: [
        [[1, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [1, 2]],
        [[1, 0], [0, 1], [1, 1], [1, 2]],
      ],
    },
    S: {
      code: 'S',
      name: 'Meadow Mint',
      fill: '#4ade80',
      light: '#bbf7d0',
      dark: '#16a34a',
      cheek: '#fda4af',
      cells: [
        [[1, 0], [2, 0], [0, 1], [1, 1]],
        [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[1, 1], [2, 1], [0, 2], [1, 2]],
        [[0, 0], [0, 1], [1, 1], [1, 2]],
      ],
    },
    Z: {
      code: 'Z',
      name: 'Candy Coral',
      fill: '#fb7185',
      light: '#fecdd3',
      dark: '#e11d48',
      cheek: '#fef08a',
      cells: [
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[2, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 2]],
        [[1, 0], [0, 1], [1, 1], [0, 2]],
      ],
    },
    J: {
      code: 'J',
      name: 'Royal Splash',
      fill: '#60a5fa',
      light: '#bfdbfe',
      dark: '#2563eb',
      cheek: '#fda4af',
      cells: [
        [[0, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [0, 2], [1, 2]],
      ],
    },
    L: {
      code: 'L',
      name: 'Tangerine Pop',
      fill: '#fb923c',
      light: '#fed7aa',
      dark: '#ea580c',
      cheek: '#fef08a',
      cells: [
        [[2, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 1], [0, 2]],
        [[0, 0], [1, 0], [1, 1], [1, 2]],
      ],
    },
    G: {
      code: 'G',
      name: 'Giggle Cloud',
      fill: '#e2e8f0',
      light: '#ffffff',
      dark: '#94a3b8',
      cheek: '#fda4af',
      cells: [[[]]],
    },
  };

  const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  // Official SRS Wall Kick Tables (in screen coordinates: +x right, +y down)
  const JLSTZ_KICKS = {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  };

  const I_KICKS = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  };

  // Seeded PRNG (mulberry32) so every player gets the same fair 7-bag sequence
  function createRng(seed) {
    let a = (seed >>> 0) || 123456789;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeEmptyGrid() {
    const g = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      g.push(new Array(COLS).fill(null));
    }
    return g;
  }

  // Gravity interval (seconds per row) — gentle, joyful ramp!
  function gravityInterval(level, speedPreset = 'normal') {
    const mult = speedPreset === 'chill' ? 1.25 : speedPreset === 'turbo' ? 0.72 : 1.0;
    const base = Math.max(0.065, Math.pow(0.84, Math.min(18, level - 1)) * 0.82);
    return base * mult;
  }

  class TetrisBoard {
    constructor(opts = {}) {
      this.id = opts.id || 'p1';
      this.name = opts.name || 'Player 1';
      this.avatar = opts.avatar || '🌟';
      this.color = opts.color || '#14b8a6';
      this.slot = opts.slot || 0;
      this.isBot = Boolean(opts.isBot);
      this.botSkill = opts.botSkill || 0.65;
      this.veteran = opts.veteran || null;
      this.speedPreset = opts.speedPreset || 'normal';
      this.onEvent = opts.onEvent || (() => {});

      this.reset(opts.seed || Math.floor(Math.random() * 1e9));
    }

    reset(seed) {
      this.seed = seed >>> 0;
      this.rng = createRng(this.seed);
      this.grid = makeEmptyGrid();
      this.bag = [];
      this.queue = [];
      for (let i = 0; i < 6; i++) this.queue.push(this._drawFromBag());

      this.active = null; // { type, rot, x, y }
      this.hold = null;
      this.holdUsed = false;

      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.combo = -1;
      this.maxCombo = 0;
      this.b2b = false;
      this.tetrises = 0;
      this.sentLines = 0;
      this.koCount = 0;
      this.alive = true;
      this.finishedAt = 0;
      this.lastAttackerId = null;

      this.dropTimer = 0;
      this.lockTimer = 0;
      this.lockMoves = 0;
      this.lastActionRotate = false;
      this.lastKickIndex = 0;

      // Line clear celebratory flash phase
      this.clearingRows = [];
      this.clearTimer = 0;
      this.clearDuration = 0.34;

      // Pending giggle-garbage bubbles
      this.pendingGarbage = []; // [{ count, timer, fromId, fromName, color }]

      // Expressive Cartoon Animation State!
      this.lookDir = 0;
      this.lookTimer = 0;
      this.faceMood = 'happy';
      this.moodTimer = 0;
      this.rotSpring = 0;
      this.squashY = 0;
      this.squashVel = 0;
      this.shakeTime = 0;
      this.shakeMag = 0;
      this.danger = false;
      this.blinkTimer = 1.4 + Math.random() * 2.5;
      this.isBlinking = false;
      this.time = 0;

      // Visual FX arrays (rendered in board local coordinates)
      this.trails = []; // [{ x, y1, y2, w, color, life, maxLife }]
      this.lockFlashes = []; // [{ x, y, life, maxLife }]
      this.particles = []; // [{ x, y, vx, vy, size, color, kind, rot, vrot, life, maxLife }]
      this.popups = []; // [{ text, sub, x, y, color, life, maxLife, scale }]

      this._spawnNext();
    }

    _drawFromBag() {
      if (this.bag.length === 0) {
        this.bag = PIECE_TYPES.slice();
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.rng() * (i + 1));
          const tmp = this.bag[i];
          this.bag[i] = this.bag[j];
          this.bag[j] = tmp;
        }
      }
      return this.bag.pop();
    }

    _getCells(type, rot, ox, oy) {
      const shape = PIECES[type].cells[rot & 3];
      const out = [];
      for (let i = 0; i < shape.length; i++) {
        out.push([ox + shape[i][0], oy + shape[i][1]]);
      }
      return out;
    }

    _collides(type, rot, ox, oy) {
      const cells = this._getCells(type, rot, ox, oy);
      for (let i = 0; i < cells.length; i++) {
        const cx = cells[i][0];
        const cy = cells[i][1];
        if (cx < 0 || cx >= COLS || cy >= TOTAL_ROWS) return true;
        if (cy >= 0 && this.grid[cy][cx]) return true;
      }
      return false;
    }

    _spawnNext() {
      const type = this.queue.shift();
      this.queue.push(this._drawFromBag());
      this.holdUsed = false;
      this.dropTimer = 0;
      this.lockTimer = 0;
      this.lockMoves = 0;
      this.lastActionRotate = false;
      this.lastKickIndex = 0;

      const startX = 3;
      const startY = type === 'I' ? BUFFER_ROWS - 1 : BUFFER_ROWS; // immediately visible smiling piece at top!
      if (!this._collides(type, 0, startX, startY)) {
        this.active = { type, rot: 0, x: startX, y: startY };
      } else if (!this._collides(type, 0, startX, startY - 1)) {
        this.active = { type, rot: 0, x: startX, y: startY - 1 };
      } else if (!this._collides(type, 0, startX, startY - 2)) {
        this.active = { type, rot: 0, x: startX, y: startY - 2 };
      } else {
        // Top out!
        this.active = { type, rot: 0, x: startX, y: startY - 2 };
        this._triggerKO();
      }
      this._updateDanger();
    }

    _triggerKO() {
      if (!this.alive) return;
      this.alive = false;
      this.finishedAt = Date.now();
      this.faceMood = 'ko';
      this.shakeTime = 0.45;
      this.shakeMag = 7;
      this._addPopup('WHOA! TOPPED OUT!', 'Great try!', 5, 8, '#f43f5e', 1.15);
      this.onEvent({ type: 'KO', board: this, attackerId: this.lastAttackerId });
    }

    _updateDanger() {
      let topOccupied = TOTAL_ROWS;
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c]) {
            topOccupied = r;
            break;
          }
        }
        if (topOccupied < TOTAL_ROWS) break;
      }
      this.danger = topOccupied <= BUFFER_ROWS + 4;
    }

    getGhostY() {
      if (!this.active) return 0;
      let gy = this.active.y;
      while (!this._collides(this.active.type, this.active.rot, this.active.x, gy + 1)) {
        gy++;
      }
      return gy;
    }

    getTotalPendingGarbage() {
      let sum = 0;
      for (let i = 0; i < this.pendingGarbage.length; i++) {
        sum += this.pendingGarbage[i].count;
      }
      return sum;
    }

    // ---- Player Actions ----
    move(dx) {
      if (!this.alive || !this.active || this.clearingRows.length > 0) return false;
      if (!this._collides(this.active.type, this.active.rot, this.active.x + dx, this.active.y)) {
        this.active.x += dx;
        this.lookDir = dx > 0 ? 1 : -1;
        this.lookTimer = 0.35;
        this.lastActionRotate = false;
        this._resetLockIfGrounded();
        this.onEvent({ type: 'MOVE', board: this });
        return true;
      }
      return false;
    }

    rotate(dir) {
      if (!this.alive || !this.active || this.clearingRows.length > 0) return false;
      const from = this.active.rot;
      const to = (from + (dir > 0 ? 1 : 3)) & 3;
      const type = this.active.type;
      const key = `${from}>${to}`;
      const kicks = type === 'I' ? I_KICKS[key] : type === 'O' ? [[0, 0]] : JLSTZ_KICKS[key];

      for (let i = 0; i < kicks.length; i++) {
        const kx = kicks[i][0];
        const ky = kicks[i][1];
        if (!this._collides(type, to, this.active.x + kx, this.active.y + ky)) {
          this.active.rot = to;
          this.active.x += kx;
          this.active.y += ky;
          this.rotSpring = dir > 0 ? 1 : -1;
          this.faceMood = 'dizzy';
          this.moodTimer = 0.28;
          this.lastActionRotate = true;
          this.lastKickIndex = i;
          this._resetLockIfGrounded();
          this.onEvent({ type: 'ROTATE', board: this });
          return true;
        }
      }
      return false;
    }

    softDrop() {
      if (!this.alive || !this.active || this.clearingRows.length > 0) return false;
      if (!this._collides(this.active.type, this.active.rot, this.active.x, this.active.y + 1)) {
        this.active.y++;
        this.score += 1;
        this.dropTimer = 0;
        this.lastActionRotate = false;
        this.faceMood = 'whee';
        this.moodTimer = 0.16;
        this.onEvent({ type: 'SOFT_DROP', board: this });
        return true;
      }
      return false;
    }

    hardDrop() {
      if (!this.alive || !this.active || this.clearingRows.length > 0) return false;
      const startY = this.active.y;
      const gy = this.getGhostY();
      const dist = Math.max(0, gy - startY);
      if (dist > 0) {
        this.score += dist * 2;
        this.lastActionRotate = false;
        // Add joyful cartoon motion trail!
        const cells = this._getCells(this.active.type, this.active.rot, this.active.x, gy);
        let minX = 99, maxX = -1;
        for (const [cx] of cells) {
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
        }
        this.trails.push({
          x: minX,
          w: maxX - minX + 1,
          y1: Math.max(0, startY - BUFFER_ROWS),
          y2: Math.max(0, gy - BUFFER_ROWS + 1),
          color: PIECES[this.active.type].light,
          life: 0.24,
          maxLife: 0.24,
        });
      }
      this.active.y = gy;
      // Cartoon squash-and-stretch impact!
      this.squashY = Math.min(0.18, 0.06 + dist * 0.008);
      this.squashVel = -1.6;
      this.faceMood = 'whee';
      this.moodTimer = 0.3;
      this.onEvent({ type: 'HARD_DROP', board: this, dist });
      this._lockActive(true);
      return true;
    }

    holdPiece() {
      if (!this.alive || !this.active || this.holdUsed || this.clearingRows.length > 0) return false;
      const currentType = this.active.type;
      this.holdUsed = true;
      this.dropTimer = 0;
      this.lockTimer = 0;
      this.lockMoves = 0;
      this.lastActionRotate = false;

      if (this.hold) {
        const swapType = this.hold;
        this.hold = currentType;
        this.active = { type: swapType, rot: 0, x: 3, y: BUFFER_ROWS - 2 };
      } else {
        this.hold = currentType;
        this._spawnNext();
        this.holdUsed = true; // keep locked for this turn
      }
      this.rotSpring = 0.9;
      this.onEvent({ type: 'HOLD', board: this });
      return true;
    }

    _resetLockIfGrounded() {
      if (!this.active) return;
      if (this._collides(this.active.type, this.active.rot, this.active.x, this.active.y + 1)) {
        if (this.lockMoves < 15) {
          this.lockTimer = 0;
          this.lockMoves++;
        }
      }
    }

    _detectTSpin() {
      if (!this.active || this.active.type !== 'T' || !this.lastActionRotate) return false;
      const cx = this.active.x + 1;
      const cy = this.active.y + 1;
      const corners = [
        [cx - 1, cy - 1],
        [cx + 1, cy - 1],
        [cx - 1, cy + 1],
        [cx + 1, cy + 1],
      ];
      let occupied = 0;
      for (const [x, y] of corners) {
        if (x < 0 || x >= COLS || y >= TOTAL_ROWS || (y >= 0 && this.grid[y][x])) {
          occupied++;
        }
      }
      return occupied >= 3;
    }

    _lockActive(fromHardDrop = false) {
      if (!this.active) return;
      const isTSpin = this._detectTSpin();
      const cells = this._getCells(this.active.type, this.active.rot, this.active.x, this.active.y);
      let allAboveVisible = true;

      for (const [cx, cy] of cells) {
        if (cy >= BUFFER_ROWS) allAboveVisible = false;
        if (cy >= 0 && cy < TOTAL_ROWS && cx >= 0 && cx < COLS) {
          this.grid[cy][cx] = this.active.type;
          this.lockFlashes.push({ x: cx, y: cy - BUFFER_ROWS, life: 0.24, maxLife: 0.24 });
          // Cute puff-dust particles on landing!
          if (fromHardDrop) {
            this._spawnBurst(cx + 0.5, cy - BUFFER_ROWS + 0.9, PIECES[this.active.type].light, 3, 'puff');
          }
        }
      }

      this.active = null;
      if (!fromHardDrop) {
        this.squashY = 0.06;
        this.squashVel = -0.9;
        this.onEvent({ type: 'LOCK', board: this });
      }

      if (allAboveVisible) {
        this._triggerKO();
        return;
      }

      // Check full rows
      const fullRows = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        let full = true;
        for (let c = 0; c < COLS; c++) {
          if (!this.grid[r][c]) {
            full = false;
            break;
          }
        }
        if (full) fullRows.push(r);
      }

      if (fullRows.length > 0) {
        this.clearingRows = fullRows;
        this.clearTimer = this.clearDuration;
        this._pendingClearMeta = { count: fullRows.length, isTSpin };
        this.faceMood = 'celebrate';
        this.moodTimer = 0.75;

        // Immediately celebrate with sparkle explosions & sound!
        const palette = ['#fde047', '#38bdf8', '#f472b6', '#4ade80', '#fb923c', '#ffffff'];
        for (const row of fullRows) {
          const vy = row - BUFFER_ROWS + 0.5;
          for (let c = 0; c < COLS; c++) {
            const col = palette[(c + row) % palette.length];
            this._spawnBurst(c + 0.5, vy, col, fullRows.length >= 4 ? 5 : 3, c % 3 === 0 ? 'note' : 'star');
          }
        }
        this._evaluateClearRewards(fullRows.length, isTSpin);
      } else {
        this.combo = -1;
        // Apply any ready incoming garbage now!
        this._flushReadyGarbage();
        this._updateDanger();
        if (this.alive) this._spawnNext();
      }
    }

    _evaluateClearRewards(count, isTSpin) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const difficult = count === 4 || isTSpin;
      const isB2B = difficult && this.b2b;
      if (difficult) this.b2b = true;
      else this.b2b = false;

      // Score table
      const basePoints = isTSpin
        ? [0, 800, 1200, 1600, 2000][count]
        : [0, 100, 300, 500, 800][count];
      let pts = basePoints * this.level;
      if (isB2B) pts = Math.round(pts * 1.5);
      if (this.combo > 0) pts += 50 * this.combo * this.level;

      // Check Perfect Clear (all remaining cells outside clearingRows are empty)
      let remainingBlocks = 0;
      const clearSet = new Set(this.clearingRows);
      for (let r = 0; r < TOTAL_ROWS; r++) {
        if (clearSet.has(r)) continue;
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c]) remainingBlocks++;
        }
      }
      const isPerfectClear = remainingBlocks === 0;
      if (isPerfectClear) pts += 2400 * this.level;

      this.score += pts;
      this.lines += count;
      if (count === 4) this.tetrises++;
      const newLevel = Math.floor(this.lines / 10) + 1;
      const leveledUp = newLevel > this.level;
      this.level = newLevel;

      // Calculate multiplayer attack lines (Giggle-Garbage!)
      let attack = 0;
      if (isTSpin) {
        attack = count * 2;
      } else {
        attack = [0, 0, 1, 2, 4][count] || 0;
      }
      if (isB2B && attack > 0) attack += 1;
      if (this.combo >= 1) attack += Math.min(4, Math.floor((this.combo + 1) / 2));
      if (isPerfectClear) attack += 6;

      // Cancel incoming pending garbage first!
      let canceled = 0;
      while (attack > 0 && this.pendingGarbage.length > 0) {
        const first = this.pendingGarbage[0];
        const take = Math.min(attack, first.count);
        first.count -= take;
        attack -= take;
        canceled += take;
        if (first.count <= 0) this.pendingGarbage.shift();
      }

      if (attack > 0) {
        this.sentLines += attack;
      }

      // Joyful Disney Comic Callouts!
      const midRow = (this.clearingRows[0] + this.clearingRows[this.clearingRows.length - 1]) / 2 - BUFFER_ROWS;
      let headline = 'LOVELY!';
      let color = '#22c55e';
      let scale = 1.0;

      if (isPerfectClear) {
        headline = 'PERFECT CLEAR! 🌟';
        color = '#f59e0b';
        scale = 1.38;
      } else if (isTSpin) {
        headline = count >= 2 ? 'T-SPIN MAGIC! ✨' : 'T-SPIN TWIRL!';
        color = '#ec4899';
        scale = 1.28;
      } else if (count === 4) {
        headline = isB2B ? 'SUPER FANTASIA! 🎆' : 'FANTASIA TETRIS! ✨';
        color = '#f59e0b';
        scale = 1.35;
      } else if (count === 3) {
        headline = 'WONDERFUL! ×3';
        color = '#38bdf8';
        scale = 1.2;
      } else if (count === 2) {
        headline = 'SPLENDID! ×2';
        color = '#14b8a6';
        scale = 1.1;
      }

      const subParts = [];
      if (this.combo >= 1) subParts.push(`🌈 ${this.combo + 1}x COMBO!`);
      if (canceled > 0) subParts.push(`🛡️ Blocked ${canceled}`);
      if (attack > 0) subParts.push(`✨ Sent +${attack}!`);
      if (leveledUp) subParts.push(`⭐ LEVEL ${this.level}!`);

      this._addPopup(headline, subParts.join(' · '), 5, Math.max(2.5, midRow), color, scale);

      if (count >= 4 || isTSpin || isPerfectClear) {
        this.shakeTime = 0.28;
        this.shakeMag = 4.5;
      }

      this.onEvent({
        type: 'LINE_CLEAR',
        board: this,
        lines: count,
        combo: this.combo,
        isTSpin,
        isB2B,
        isPerfectClear,
        leveledUp,
        attack,
        canceled,
      });
    }

    _finishLineClear() {
      const clearSet = new Set(this.clearingRows);
      const kept = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        if (!clearSet.has(r)) kept.push(this.grid[r]);
      }
      while (kept.length < TOTAL_ROWS) {
        kept.unshift(new Array(COLS).fill(null));
      }
      this.grid = kept;
      this.clearingRows = [];
      this._pendingClearMeta = null;
      this._updateDanger();
      if (this.alive) this._spawnNext();
    }

    queueGarbage(count, fromId, fromName, color = '#f472b6') {
      if (!this.alive || count <= 0) return;
      this.pendingGarbage.push({
        count: Math.min(10, count),
        timer: 2.35, // 2.35s to counter-clear before rising!
        fromId: fromId || null,
        fromName: fromName || 'Rival',
        color,
      });
      this._addPopup(`🫧 +${count} Bubbles!`, fromName ? `from ${fromName}` : '', 5, 3.2, '#ec4899', 0.95);
    }

    _flushReadyGarbage() {
      let totalRise = 0;
      let latestAttacker = null;
      const stillWaiting = [];
      for (let i = 0; i < this.pendingGarbage.length; i++) {
        const g = this.pendingGarbage[i];
        if (g.timer <= 0) {
          totalRise += g.count;
          if (g.fromId) latestAttacker = g.fromId;
        } else {
          stillWaiting.push(g);
        }
      }
      this.pendingGarbage = stillWaiting;
      if (totalRise <= 0) return;

      totalRise = Math.min(8, totalRise); // cap per lock for fairness
      if (latestAttacker) this.lastAttackerId = latestAttacker;

      // Single consistent hole per garbage wave (fair modern multiplayer feel!)
      const hole = Math.floor(Math.random() * COLS);
      for (let i = 0; i < totalRise; i++) {
        // Check if top row pushes out
        const shifted = this.grid.shift();
        const row = new Array(COLS).fill('G');
        row[hole] = null;
        this.grid.push(row);
        if (shifted && shifted.some((c) => c !== null)) {
          // If blocks were pushed past buffer ceiling
        }
      }
      this.shakeTime = 0.24;
      this.shakeMag = 3.5;
      this.faceMood = 'nervous';
      this.moodTimer = 0.65;
      this.onEvent({ type: 'GARBAGE_RISE', board: this, count: totalRise });
    }

    _spawnBurst(x, y, color, count, kind = 'star') {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (kind === 'puff' ? 1.5 : 3.2) + Math.random() * (kind === 'puff' ? 2.2 : 5.2);
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (kind === 'puff' ? 1.2 : 3.4),
          size: kind === 'puff' ? 0.28 + Math.random() * 0.25 : 0.22 + Math.random() * 0.26,
          color,
          kind,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 8,
          life: 0.55 + Math.random() * 0.45,
          maxLife: 1.0,
        });
      }
      if (this.particles.length > 140) {
        this.particles.splice(0, this.particles.length - 140);
      }
    }

    _addPopup(text, sub, x, y, color, scale = 1.0) {
      this.popups.push({
        text,
        sub: sub || '',
        x,
        y,
        color,
        scale,
        life: 1.25,
        maxLife: 1.25,
      });
      if (this.popups.length > 6) this.popups.shift();
    }

    update(dt) {
      this.time += dt;

      // Natural cartoon blinking!
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        if (this.isBlinking) {
          this.isBlinking = false;
          this.blinkTimer = 1.8 + Math.random() * 3.0;
        } else {
          this.isBlinking = true;
          this.blinkTimer = 0.13;
        }
      }

      if (this.lookTimer > 0) {
        this.lookTimer -= dt;
        if (this.lookTimer <= 0) this.lookDir = 0;
      }

      if (this.moodTimer > 0) {
        this.moodTimer -= dt;
        if (this.moodTimer <= 0 && this.alive) {
          this.faceMood = this.danger ? 'nervous' : 'happy';
        }
      } else if (this.alive) {
        this.faceMood = this.danger ? 'nervous' : 'happy';
      }

      // Elastic springs
      this.rotSpring *= Math.pow(0.001, dt);
      const k = 90;
      const damp = 12;
      this.squashVel += (-k * this.squashY - damp * this.squashVel) * dt;
      this.squashY += this.squashVel * dt;
      if (Math.abs(this.squashY) < 0.001 && Math.abs(this.squashVel) < 0.01) {
        this.squashY = 0;
        this.squashVel = 0;
      }

      if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);

      // Update FX
      for (let i = this.trails.length - 1; i >= 0; i--) {
        this.trails[i].life -= dt;
        if (this.trails[i].life <= 0) this.trails.splice(i, 1);
      }
      for (let i = this.lockFlashes.length - 1; i >= 0; i--) {
        this.lockFlashes[i].life -= dt;
        if (this.lockFlashes[i].life <= 0) this.lockFlashes.splice(i, 1);
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.kind === 'puff' ? -1.5 : 10.5) * dt;
        p.rot += p.vrot * dt;
      }
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.life -= dt;
        pop.y -= 1.35 * dt;
        if (pop.life <= 0) this.popups.splice(i, 1);
      }

      if (!this.alive) return;

      // Tick incoming garbage countdowns
      for (let i = 0; i < this.pendingGarbage.length; i++) {
        this.pendingGarbage[i].timer = Math.max(0, this.pendingGarbage[i].timer - dt);
      }

      // Line clear celebratory flash timer
      if (this.clearingRows.length > 0) {
        this.clearTimer -= dt;
        if (this.clearTimer <= 0) {
          this._finishLineClear();
        }
        return;
      }

      if (!this.active) return;

      // Gravity & Lock delay
      const grounded = this._collides(this.active.type, this.active.rot, this.active.x, this.active.y + 1);
      if (grounded) {
        this.lockTimer += dt;
        if (this.lockTimer >= 0.52) {
          this._lockActive(false);
        }
      } else {
        this.lockTimer = 0;
        this.dropTimer += dt;
        const interval = gravityInterval(this.level, this.speedPreset);
        while (this.dropTimer >= interval) {
          this.dropTimer -= interval;
          if (!this._collides(this.active.type, this.active.rot, this.active.x, this.active.y + 1)) {
            this.active.y++;
            this.lastActionRotate = false;
          } else {
            break;
          }
        }
      }
    }

    // Compact snapshot for fast multiplayer sync!
    serialize() {
      let cells = '';
      for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          cells += this.grid[r][c] || '.';
        }
      }
      return {
        id: this.id,
        name: this.name,
        avatar: this.avatar,
        color: this.color,
        slot: this.slot,
        isBot: this.isBot,
        v: this.veteran || null,
        g: cells,
        a: this.active ? [this.active.type, this.active.rot, this.active.x, this.active.y - BUFFER_ROWS] : null,
        gy: this.active ? this.getGhostY() - BUFFER_ROWS : 0,
        h: this.hold,
        q: this.queue.slice(0, 3),
        s: this.score,
        l: this.lines,
        lv: this.level,
        cb: this.combo,
        ko: this.koCount,
        al: this.alive ? 1 : 0,
        dg: this.danger ? 1 : 0,
        pg: this.getTotalPendingGarbage(),
        md: this.faceMood,
        cr: this.clearingRows.map((r) => r - BUFFER_ROWS),
      };
    }

    applySnapshot(snap) {
      if (!snap || typeof snap.g !== 'string' || snap.g.length !== VISIBLE_ROWS * COLS) return;
      this.name = snap.name || this.name;
      this.avatar = snap.avatar || this.avatar;
      this.color = snap.color || this.color;
      this.slot = snap.slot !== undefined ? snap.slot : this.slot;
      this.isBot = Boolean(snap.isBot);
      if (snap.v) this.veteran = snap.v;

      let idx = 0;
      for (let r = 0; r < BUFFER_ROWS; r++) {
        for (let c = 0; c < COLS; c++) this.grid[r][c] = null;
      }
      for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const ch = snap.g[idx++];
          this.grid[r][c] = ch === '.' ? null : ch;
        }
      }
      this.active = snap.a
        ? { type: snap.a[0], rot: snap.a[1], x: snap.a[2], y: snap.a[3] + BUFFER_ROWS }
        : null;
      this.hold = snap.h || null;
      if (Array.isArray(snap.q)) this.queue = snap.q.slice();
      this.score = snap.s || 0;
      this.lines = snap.l || 0;
      this.level = snap.lv || 1;
      this.combo = snap.cb !== undefined ? snap.cb : -1;
      this.koCount = snap.ko || 0;
      this.alive = Boolean(snap.al);
      this.danger = Boolean(snap.dg);
      this.faceMood = snap.md || (this.alive ? 'happy' : 'ko');
      this.clearingRows = Array.isArray(snap.cr) ? snap.cr.map((r) => r + BUFFER_ROWS) : [];

      const pgCount = snap.pg || 0;
      this.pendingGarbage = pgCount > 0 ? [{ count: pgCount, timer: 1.5 }] : [];
    }
  }

  // ---- Friendly Cartoon AI Bot Brain ----
  // Evaluates clean placements and moves step-by-step like a cheerful couch buddy!
  const BOT_ROSTER = [
    { name: 'Bouncy Barnaby', avatar: '🐻', color: '#f59e0b', skill: 0.62 },
    { name: 'Sunny Pip', avatar: '🐥', color: '#f43f5e', skill: 0.72 },
    { name: 'Captain Clover', avatar: '🦊', color: '#22c55e', skill: 0.78 },
    { name: 'Twinkle Tilly', avatar: '🦄', color: '#a855f7', skill: 0.56 },
  ];

  class BotBrain {
    constructor(board, skill = 0.65) {
      this.board = board;
      this.skill = skill;
      this.target = null; // { rot, x }
      this.lastPieceRef = null;
      this.stepTimer = 0.2;
    }

    _planPlacement() {
      const b = this.board;
      if (!b.active) return null;
      const type = b.active.type;
      let bestScore = -1e9;
      let bestPlan = { rot: 0, x: b.active.x };

      // Slight cheerful imperfection based on skill so players can beat bots fairly
      const noiseAmp = (1 - this.skill) * 4.5;

      for (let rot = 0; rot < 4; rot++) {
        for (let x = -2; x < COLS + 1; x++) {
          if (b._collides(type, rot, x, b.active.y)) continue;
          let y = b.active.y;
          while (!b._collides(type, rot, x, y + 1)) y++;

          // Simulate placing piece
          const cells = b._getCells(type, rot, x, y);
          const tempGrid = b.grid.map((row) => row.slice());
          let outOfBounds = false;
          for (const [cx, cy] of cells) {
            if (cy < 0 || cy >= TOTAL_ROWS || cx < 0 || cx >= COLS) {
              outOfBounds = true;
              break;
            }
            tempGrid[cy][cx] = type;
          }
          if (outOfBounds) continue;

          // Evaluate board heuristics
          let completed = 0;
          for (let r = 0; r < TOTAL_ROWS; r++) {
            let full = true;
            for (let c = 0; c < COLS; c++) {
              if (!tempGrid[r][c]) { full = false; break; }
            }
            if (full) completed++;
          }

          const heights = new Array(COLS).fill(0);
          let holes = 0;
          for (let c = 0; c < COLS; c++) {
            let seenBlock = false;
            for (let r = 0; r < TOTAL_ROWS; r++) {
              if (tempGrid[r][c]) {
                if (!seenBlock) {
                  seenBlock = true;
                  heights[c] = TOTAL_ROWS - r;
                }
              } else if (seenBlock) {
                holes++;
              }
            }
          }

          let aggHeight = 0;
          let bumpiness = 0;
          for (let c = 0; c < COLS; c++) {
            aggHeight += heights[c];
            if (c > 0) bumpiness += Math.abs(heights[c] - heights[c - 1]);
          }

          const score =
            completed * (completed >= 4 ? 12 : 4.2) -
            aggHeight * 0.48 -
            holes * 3.8 -
            bumpiness * 0.34 +
            (Math.random() - 0.5) * noiseAmp;

          if (score > bestScore) {
            bestScore = score;
            bestPlan = { rot, x };
          }
        }
      }
      return bestPlan;
    }

    update(dt) {
      const b = this.board;
      if (!b.alive || !b.active || b.clearingRows.length > 0) return;

      if (this.lastPieceRef !== b.active) {
        this.lastPieceRef = b.active;
        this.target = this._planPlacement();
        this.stepTimer = 0.14 + (1 - this.skill) * 0.14;
      }

      this.stepTimer -= dt;
      if (this.stepTimer > 0) return;

      // Lively step cadence (slightly faster when in danger!)
      const baseStep = 0.155 - this.skill * 0.065;
      this.stepTimer = b.danger ? Math.max(0.06, baseStep * 0.72) : baseStep;

      if (!this.target) return;

      if (b.active.rot !== this.target.rot) {
        if (!b.rotate(1)) {
          this.target.rot = b.active.rot;
        }
        return;
      }
      if (b.active.x < this.target.x) {
        if (!b.move(1)) b.hardDrop();
        return;
      }
      if (b.active.x > this.target.x) {
        if (!b.move(-1)) b.hardDrop();
        return;
      }
      b.hardDrop();
    }
  }

  global.WonderEngine = {
    COLS,
    VISIBLE_ROWS,
    BUFFER_ROWS,
    TOTAL_ROWS,
    PIECES,
    PIECE_TYPES,
    BOT_ROSTER,
    TetrisBoard,
    BotBrain,
  };
})(window);
