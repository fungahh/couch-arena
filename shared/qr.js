/**
 * Couch Arcade — Self-Contained QR Code SVG Generator (ISO/IEC 18004)
 * Supports Byte-mode URLs up to ~150 characters (Versions 1–8, ECC Level L/M)
 * Zero external dependencies — renders crisp vector QR codes offline & on TVs.
 */
(function (global) {
  'use strict';

  // GF(256) log/exp tables with primitive polynomial 0x11d
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const root = EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], root);
      }
      poly = next;
    }
    return poly;
  }

  function rsCompute(data, ecCount) {
    const gen = rsGenerator(ecCount);
    const rem = new Uint8Array(ecCount);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ rem[0];
      for (let j = 0; j < ecCount - 1; j++) rem[j] = rem[j + 1];
      rem[ecCount - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecCount; j++) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return rem;
  }

  // Version specs for ECC Level L (clean, lower density = easier to scan from couch!)
  // [version, totalCodewords, ecPerBlock, numBlocksGroup1, dataPerBlockG1, numBlocksGroup2, dataPerBlockG2, alignCenters]
  const VERSIONS_L = [
    null,
    [1,  26,  7,  1, 19, 0, 0, []],
    [2,  44, 10,  1, 34, 0, 0, [6, 18]],
    [3,  70, 15,  1, 55, 0, 0, [6, 22]],
    [4, 100, 20,  1, 80, 0, 0, [6, 26]],
    [5, 134, 26,  1, 108, 0, 0, [6, 30]],
    [6, 172, 18,  2, 68, 0, 0, [6, 34]],
    [7, 196, 20,  2, 78, 0, 0, [6, 22, 38]],
    [8, 242, 24,  2, 97, 0, 0, [6, 24, 42]],
    [9, 292, 30,  2, 116, 0, 0, [6, 26, 46]],
    [10, 346, 18, 2, 68, 2, 69, [6, 28, 50]],
  ];

  // Precomputed 15-bit format strings for ECC Level L (01) and masks 0..7 (with XOR mask 101010000010010)
  const FORMAT_BITS_L = [
    0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
  ];

  // Precomputed 18-bit version info for versions 7..10
  const VERSION_BITS = {
    7: 0x07c94,
    8: 0x085bc,
    9: 0x09a99,
    10: 0x0a4d3,
  };

  function encodeQrMatrix(text) {
    const bytes = new TextEncoder().encode(String(text));
    let spec = null;
    for (let v = 1; v < VERSIONS_L.length; v++) {
      const s = VERSIONS_L[v];
      const totalData = s[3] * s[4] + s[5] * s[6];
      const countBits = v < 10 ? 8 : 16;
      const capacityBytes = Math.floor((totalData * 8 - 4 - countBits) / 8);
      if (bytes.length <= capacityBytes) {
        spec = s;
        break;
      }
    }
    if (!spec) throw new Error('QR payload too long');

    const [version, , ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data, align] = spec;
    const totalDataCodewords = g1Blocks * g1Data + g2Blocks * g2Data;

    // 1. Build bit stream: Mode (0100 = Byte) + Count + Data + Terminator + Padding
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };
    pushBits(0b0100, 4);
    pushBits(bytes.length, version < 10 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
    // Terminator (up to 4 zeros)
    const maxBits = totalDataCodewords * 8;
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataBytes.push(b);
    }
    let padToggle = true;
    while (dataBytes.length < totalDataCodewords) {
      dataBytes.push(padToggle ? 0xec : 0x11);
      padToggle = !padToggle;
    }

    // 2. Split into RS blocks & interleave
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (let i = 0; i < g1Blocks; i++) {
      const blk = dataBytes.slice(offset, offset + g1Data);
      offset += g1Data;
      dataBlocks.push(blk);
      ecBlocks.push(rsCompute(blk, ecPerBlock));
    }
    for (let i = 0; i < g2Blocks; i++) {
      const blk = dataBytes.slice(offset, offset + g2Data);
      offset += g2Data;
      dataBlocks.push(blk);
      ecBlocks.push(rsCompute(blk, ecPerBlock));
    }

    const finalBytes = [];
    const maxDataLen = Math.max(g1Data, g2Data);
    for (let i = 0; i < maxDataLen; i++) {
      for (let b = 0; b < dataBlocks.length; b++) {
        if (i < dataBlocks[b].length) finalBytes.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < ecBlocks.length; b++) {
        finalBytes.push(ecBlocks[b][i]);
      }
    }

    // 3. Build function module grid
    const size = version * 4 + 17;
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));
    const base = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, dark) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return;
      isFunc[r][c] = 1;
      base[r][c] = dark ? 1 : 0;
    };

    const drawFinder = (r0, c0) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          const dark = inBox && (
            dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
          );
          setFunc(r, c, dark);
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    // Alignment patterns (skip only the 3 corners overlapping finder patterns)
    for (let i = 0; i < align.length; i++) {
      for (let j = 0; j < align.length; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === align.length - 1) ||
          (i === align.length - 1 && j === 0)
        ) {
          continue;
        }
        const cr = align[i];
        const cc = align[j];
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            setFunc(cr + dr, cc + dc, dist === 0 || dist === 2);
          }
        }
      }
    }

    // Reserve format info strips + dark module
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        setFunc(8, i, false);
        setFunc(i, 8, false);
      }
    }
    for (let i = size - 8; i < size; i++) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
    setFunc(size - 8, 8, true);

    // Version info for v >= 7
    if (version >= 7 && VERSION_BITS[version]) {
      const vb = VERSION_BITS[version];
      for (let i = 0; i < 18; i++) {
        const bit = ((vb >>> i) & 1) === 1;
        const r = Math.floor(i / 3);
        const c = size - 11 + (i % 3);
        setFunc(r, c, bit);
        setFunc(c, r, bit);
      }
    }

    // 4. Place data bits in upward/downward zigzag
    const dataBits = [];
    for (let i = 0; i < finalBytes.length; i++) {
      for (let b = 7; b >= 0; b--) dataBits.push((finalBytes[i] >>> b) & 1);
    }

    let bitIdx = 0;
    let upward = true;
    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      for (let step = 0; step < size; step++) {
        const row = upward ? size - 1 - step : step;
        for (let dx = 0; dx < 2; dx++) {
          const c = col - dx;
          if (!isFunc[row][c]) {
            base[row][c] = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          }
        }
      }
      upward = !upward;
    }

    // 5. Evaluate all 8 mask patterns and pick lowest penalty
    const maskPred = [
      (r, c) => (r + c) % 2 === 0,
      (r, c) => r % 2 === 0,
      (r, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
      (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
      (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
    ];

    function applyFormat(grid, maskIdx) {
      const fb = FORMAT_BITS_L[maskIdx];
      // Bits 0..14 (bit 14 is MSB placed at (8,0) and (size-1,8))
      const coords1 = [
        [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
        [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
      ];
      const coords2 = [
        [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
        [size - 5, 8], [size - 6, 8], [size - 7, 8],
        [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
        [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
      ];
      for (let i = 0; i < 15; i++) {
        const dark = ((fb >>> (14 - i)) & 1) === 1 ? 1 : 0;
        grid[coords1[i][0]][coords1[i][1]] = dark;
        grid[coords2[i][0]][coords2[i][1]] = dark;
      }
    }

    function penalty(grid) {
      let score = 0;
      // Rule 1: adjacent runs >= 5
      for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
          if (grid[r][c] === grid[r][c - 1]) run++;
          else { if (run >= 5) score += 3 + (run - 5); run = 1; }
        }
        if (run >= 5) score += 3 + (run - 5);
      }
      for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) {
          if (grid[r][c] === grid[r - 1][c]) run++;
          else { if (run >= 5) score += 3 + (run - 5); run = 1; }
        }
        if (run >= 5) score += 3 + (run - 5);
      }
      // Rule 2: 2x2 blocks
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          const v = grid[r][c];
          if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) {
            score += 3;
          }
        }
      }
      return score;
    }

    let bestGrid = null;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      const grid = base.map((row, r) => {
        const copy = new Uint8Array(size);
        for (let c = 0; c < size; c++) {
          copy[c] = isFunc[r][c] ? row[c] : (maskPred[m](r, c) ? row[c] ^ 1 : row[c]);
        }
        return copy;
      });
      applyFormat(grid, m);
      const sc = penalty(grid);
      if (sc < bestScore) {
        bestScore = sc;
        bestGrid = grid;
      }
    }

    return bestGrid;
  }

  function renderSvg(text, opts = {}) {
    const fg = opts.fg || '#111827';
    const bg = opts.bg || '#ffffff';
    const quiet = opts.quiet ?? 3;
    try {
      const grid = encodeQrMatrix(text);
      const n = grid.length;
      const total = n + quiet * 2;
      let path = '';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (grid[r][c]) {
            path += `M${c + quiet},${r + quiet}h1v1h-1z`;
          }
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${total}" height="${total}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`;
    } catch (e) {
      return '';
    }
  }

  global.CouchQR = { encodeQrMatrix, renderSvg };
})(window);
