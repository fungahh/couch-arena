/**
 * Wonder Tetris — Animated Disney-Storybook Canvas Renderer
 * Living fairy-tale kingdom backdrop, expressive cartoon character blocks,
 * Sparky the animated star mascot, rainbow attack projectiles, and TV multi-board cinema view.
 */
(function (global) {
  'use strict';

  const E = global.WonderEngine;

  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function drawFourPointStar(ctx, x, y, r, rot = 0, fill = '#fef08a', stroke = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r : r * 0.34;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1.2, r * 0.14);
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFivePointStar(ctx, x, y, outerR, innerR, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = rot + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? outerR : innerR;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // =========================================================================
  // 1. LIVING DISNEY STORYBOOK KINGDOM BACKDROP
  // =========================================================================
  class StorybookBackdrop {
    constructor() {
      this.time = 0;
      this.rainbowAlpha = 0.25;
      this.rainbowTarget = 0.25;
      this.clouds = [
        { x: 0.12, y: 0.16, s: 1.05, spd: 0.008 },
        { x: 0.44, y: 0.11, s: 0.82, spd: 0.0055 },
        { x: 0.78, y: 0.19, s: 1.15, spd: 0.007 },
        { x: 0.94, y: 0.09, s: 0.7, spd: 0.0045 },
      ];
      this.sparkles = [];
      for (let i = 0; i < 24; i++) {
        this.sparkles.push({
          x: Math.random(),
          y: Math.random(),
          vy: 0.015 + Math.random() * 0.025,
          size: 4 + Math.random() * 6,
          phase: Math.random() * Math.PI * 2,
          color: ['#fef08a', '#ffffff', '#fbcfe8', '#bae6fd', '#fde68a'][i % 5],
        });
      }
      this.fireworks = [];
    }

    boostRainbow(intensity = 1.0) {
      this.rainbowTarget = Math.min(1.0, Math.max(this.rainbowTarget, intensity));
    }

    spawnCelebrationBurst(normX, normY) {
      const cols = ['#fde047', '#38bdf8', '#f472b6', '#4ade80', '#fb923c'];
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + Math.random() * 0.2;
        const spd = 70 + Math.random() * 140;
        this.fireworks.push({
          nx: normX,
          ny: normY,
          dx: 0,
          dy: 0,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 40,
          size: 5 + Math.random() * 6,
          color: cols[i % cols.length],
          life: 1.1 + Math.random() * 0.4,
          maxLife: 1.4,
        });
      }
    }

    update(dt) {
      this.time += dt;
      this.rainbowTarget = Math.max(0.22, this.rainbowTarget - dt * 0.12);
      this.rainbowAlpha += (this.rainbowTarget - this.rainbowAlpha) * Math.min(1, dt * 3);

      for (const c of this.clouds) {
        c.x += c.spd * dt;
        if (c.x > 1.18) c.x = -0.18;
      }
      for (const sp of this.sparkles) {
        sp.y -= sp.vy * dt;
        if (sp.y < -0.05) {
          sp.y = 1.05;
          sp.x = Math.random();
        }
      }
      for (let i = this.fireworks.length - 1; i >= 0; i--) {
        const f = this.fireworks[i];
        f.life -= dt;
        if (f.life <= 0) {
          this.fireworks.splice(i, 1);
          continue;
        }
        f.dx += f.vx * dt;
        f.dy += f.vy * dt;
        f.vy += 210 * dt;
      }
    }

    render(ctx, w, h, maxLevel = 1) {
      const t = this.time;
      // Warm cheerful Disney morning-to-golden-afternoon sky gradient
      const warmth = Math.min(1, (maxLevel - 1) / 10);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, warmth > 0.5 ? '#60a5fa' : '#7dd3fc');
      sky.addColorStop(0.55, warmth > 0.5 ? '#fde68a' : '#e0f2fe');
      sky.addColorStop(1, '#fff7ed');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Magical Rainbow Arch in the sky!
      if (this.rainbowAlpha > 0.04) {
        ctx.save();
        ctx.globalAlpha = this.rainbowAlpha * 0.48;
        const rx = w * 0.52;
        const ry = h * 0.88;
        const baseR = Math.min(w, h) * 0.72;
        const bands = ['#fb7185', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
        bands.forEach((col, bi) => {
          ctx.beginPath();
          ctx.arc(rx, ry, baseR - bi * 11, Math.PI * 1.04, Math.PI * 1.96);
          ctx.strokeStyle = col;
          ctx.lineWidth = 11;
          ctx.stroke();
        });
        ctx.restore();
      }

      // Smiling Golden Storybook Sun (top-right)
      const sunX = w * 0.89;
      const sunY = Math.max(72, h * 0.14);
      const sunR = Math.min(46, Math.max(28, Math.min(w, h) * 0.055));
      ctx.save();
      ctx.translate(sunX, sunY);
      // Spinning golden rays
      ctx.save();
      ctx.rotate(t * 0.22);
      for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12);
        ctx.beginPath();
        ctx.moveTo(sunR + 5, 0);
        ctx.lineTo(sunR + 17 + Math.sin(t * 3 + i) * 2.5, -5);
        ctx.lineTo(sunR + 17 + Math.sin(t * 3 + i) * 2.5, 5);
        ctx.closePath();
        ctx.fillStyle = '#fde047';
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,27,46,0.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();

      // Sun face circle
      ctx.beginPath();
      ctx.arc(0, 0, sunR, 0, Math.PI * 2);
      const sunGrad = ctx.createRadialGradient(-sunR * 0.25, -sunR * 0.25, 4, 0, 0, sunR);
      sunGrad.addColorStop(0, '#fef9c3');
      sunGrad.addColorStop(1, '#facc15');
      ctx.fillStyle = sunGrad;
      ctx.fill();
      ctx.strokeStyle = '#1e1b2e';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Happy blinking sun eyes & rosy cheeks
      const sunBlink = Math.sin(t * 0.9) > 0.975;
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.ellipse(-sunR * 0.42, sunR * 0.12, sunR * 0.16, sunR * 0.1, 0, 0, Math.PI * 2);
      ctx.ellipse(sunR * 0.42, sunR * 0.12, sunR * 0.16, sunR * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1e1b2e';
      ctx.fillStyle = '#1e1b2e';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      if (sunBlink) {
        ctx.beginPath();
        ctx.moveTo(-sunR * 0.34, -sunR * 0.08);
        ctx.quadraticCurveTo(-sunR * 0.24, -sunR * 0.18, -sunR * 0.14, -sunR * 0.08);
        ctx.moveTo(sunR * 0.14, -sunR * 0.08);
        ctx.quadraticCurveTo(sunR * 0.24, -sunR * 0.18, sunR * 0.34, -sunR * 0.08);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(-sunR * 0.24, -sunR * 0.08, sunR * 0.1, 0, Math.PI * 2);
        ctx.arc(sunR * 0.24, -sunR * 0.08, sunR * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-sunR * 0.21, -sunR * 0.11, sunR * 0.036, 0, Math.PI * 2);
        ctx.arc(sunR * 0.27, -sunR * 0.11, sunR * 0.036, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, sunR * 0.06, sunR * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // Fluffy Cartoon Clouds
      for (const c of this.clouds) {
        const cx = c.x * w;
        const cy = c.y * h + Math.sin(t * 0.9 + c.x * 8) * 5;
        this._drawCloud(ctx, cx, cy, 46 * c.s);
      }

      // Rolling Emerald Storybook Hills + Fairy-Tale Castle Silhouette!
      const horizonY = h * 0.84;

      // Distant soft hill
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, horizonY - 12);
      ctx.quadraticCurveTo(w * 0.25, horizonY - 68, w * 0.52, horizonY - 22);
      ctx.quadraticCurveTo(w * 0.78, horizonY - 76, w, horizonY - 18);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = '#86efac';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,27,46,0.22)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Whimsical Disney Castle tucked on the left-side hill!
      this._drawStorybookCastle(ctx, w * 0.11, horizonY - 40, Math.min(1.05, Math.max(0.62, w / 1280)), t);

      // Foreground lush meadow hill
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, horizonY + 18);
      ctx.quadraticCurveTo(w * 0.34, horizonY - 26, w * 0.68, horizonY + 16);
      ctx.quadraticCurveTo(w * 0.86, horizonY + 34, w, horizonY + 6);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = '#4ade80';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,27,46,0.28)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Floating Magical Pixie Dust & 4-Point Disney Stars
      for (const sp of this.sparkles) {
        const pulse = 0.45 + 0.55 * Math.sin(t * 3.1 + sp.phase);
        ctx.save();
        ctx.globalAlpha = pulse * 0.72;
        drawFourPointStar(ctx, sp.x * w, sp.y * h, sp.size * (0.7 + pulse * 0.35), t * 0.6 + sp.phase, sp.color);
        ctx.restore();
      }

      // Celebratory Background Fireworks
      for (const f of this.fireworks) {
        const a = Math.max(0, f.life / f.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        drawFourPointStar(ctx, f.nx * w + f.dx, f.ny * h + f.dy, f.size * a + 2, f.life * 6, f.color, '#1e1b2e');
        ctx.restore();
      }
    }

    _drawCloud(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = 'rgba(30, 27, 46, 0.24)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(-s * 0.55, 0, s * 0.36, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(-s * 0.18, -s * 0.22, s * 0.42, Math.PI, Math.PI * 1.9);
      ctx.arc(s * 0.28, -s * 0.14, s * 0.36, Math.PI * 1.15, Math.PI * 2);
      ctx.arc(s * 0.58, 0.04 * s, s * 0.28, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    _drawStorybookCastle(ctx, x, y, scale, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      const ink = 'rgba(30, 27, 46, 0.42)';
      // Main castle body
      ctx.fillStyle = '#fff8ec';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.4;
      roundRectPath(ctx, -44, -30, 88, 62, 6);
      ctx.fill();
      ctx.stroke();

      // Side & Center Turrets
      const towers = [
        { tx: -40, ty: -62, tw: 22, th: 72, spireH: 34, spireCol: '#38bdf8', flagCol: '#facc15' },
        { tx: 18, ty: -62, tw: 22, th: 72, spireH: 34, spireCol: '#38bdf8', flagCol: '#f472b6' },
        { tx: -14, ty: -86, tw: 28, th: 86, spireH: 44, spireCol: '#f472b6', flagCol: '#fde047' },
      ];
      for (const tw of towers) {
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(tw.tx, tw.ty, tw.tw, tw.th);
        ctx.strokeRect(tw.tx, tw.ty, tw.tw, tw.th);

        // Pointed Fairy-Tale Spire Roof
        ctx.beginPath();
        ctx.moveTo(tw.tx - 4, tw.ty);
        ctx.lineTo(tw.tx + tw.tw / 2, tw.ty - tw.spireH);
        ctx.lineTo(tw.tx + tw.tw + 4, tw.ty);
        ctx.closePath();
        ctx.fillStyle = tw.spireCol;
        ctx.fill();
        ctx.stroke();

        // Waving little pennant flag!
        const fx = tw.tx + tw.tw / 2;
        const fy = tw.ty - tw.spireH;
        const wave = Math.sin(t * 4.5 + tw.tx) * 3;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx, fy - 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx, fy - 14);
        ctx.quadraticCurveTo(fx + 8, fy - 14 + wave, fx + 16, fy - 10 + wave * 0.5);
        ctx.lineTo(fx, fy - 6);
        ctx.closePath();
        ctx.fillStyle = tw.flagCol;
        ctx.fill();
      }

      // Cozy Storybook Arch Gate
      ctx.beginPath();
      ctx.arc(0, 12, 13, Math.PI, 0);
      ctx.lineTo(13, 32);
      ctx.lineTo(-13, 32);
      ctx.closePath();
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  // =========================================================================
  // 2. EXPRESSIVE CARTOON BLOCKS & CHARACTER FACES
  // =========================================================================
  function drawBlock(ctx, x, y, size, typeCode, opts = {}) {
    const info = E.PIECES[typeCode] || E.PIECES.I;
    const pad = Math.max(0.8, size * 0.045);
    const bx = x + pad;
    const by = y + pad;
    const bs = size - pad * 2;
    const r = Math.max(3, bs * 0.24);

    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

    // Slight bounce scale for active piece rotate / lock flash
    if (opts.scale && opts.scale !== 1) {
      ctx.translate(x + size / 2, y + size / 2);
      ctx.scale(opts.scale, opts.scale);
      ctx.translate(-(x + size / 2), -(y + size / 2));
    }

    // Soft bottom shadow rim
    roundRectPath(ctx, bx, by, bs, bs, r);
    ctx.fillStyle = info.dark;
    ctx.fill();

    // Main candy-gloss body
    roundRectPath(ctx, bx, by, bs, bs * 0.9, r);
    ctx.fillStyle = opts.flash ? '#ffffff' : info.fill;
    ctx.fill();

    // Glossy Disney top shine highlight!
    if (!opts.flash && bs >= 10) {
      roundRectPath(ctx, bx + bs * 0.14, by + bs * 0.1, bs * 0.72, bs * 0.26, r * 0.7);
      ctx.fillStyle = info.light;
      ctx.globalAlpha = (opts.alpha !== undefined ? opts.alpha : 1) * 0.72;
      ctx.fill();
      ctx.globalAlpha = opts.alpha !== undefined ? opts.alpha : 1;
    }

    // Crisp cartoon ink outline
    roundRectPath(ctx, bx, by, bs, bs, r);
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = Math.max(1.2, Math.min(2.6, bs * 0.095));
    ctx.stroke();

    // Cute Animated Character Face!
    if (opts.drawFace && bs >= 14 && !opts.flash) {
      drawBlockFace(ctx, bx, by, bs, typeCode, info, opts);
    }

    ctx.restore();
  }

  function drawBlockFace(ctx, bx, by, bs, typeCode, info, opts) {
    const cx = bx + bs * 0.5;
    const cy = by + bs * 0.54;
    const mood = opts.mood || 'happy';
    const lookX = (opts.lookDir || 0) * bs * 0.055;
    const blink = Boolean(opts.blink);
    const eyeOffX = bs * 0.185;
    const eyeY = cy - bs * 0.06;
    const eyeR = Math.max(1.7, bs * 0.125);

    // Rosy cartoon cheeks
    ctx.fillStyle = info.cheek || '#fda4af';
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(cx - bs * 0.26, cy + bs * 0.1, bs * 0.1, bs * 0.06, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + bs * 0.26, cy + bs * 0.1, bs * 0.1, bs * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#1e1b2e';
    ctx.fillStyle = '#1e1b2e';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, bs * 0.075);

    if (typeCode === 'G') {
      // Silly giggling cloud block face (cheeky wink!)
      ctx.beginPath();
      ctx.arc(cx - eyeOffX, eyeY, eyeR * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + eyeOffX - eyeR * 0.8, eyeY);
      ctx.quadraticCurveTo(cx + eyeOffX, eyeY - eyeR * 0.8, cx + eyeOffX + eyeR * 0.8, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + bs * 0.07, bs * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      return;
    }

    if (mood === 'ko') {
      // Comical cartoon X eyes
      const xr = eyeR * 0.75;
      [-1, 1].forEach((s) => {
        const ex = cx + s * eyeOffX;
        ctx.beginPath();
        ctx.moveTo(ex - xr, eyeY - xr);
        ctx.lineTo(ex + xr, eyeY + xr);
        ctx.moveTo(ex + xr, eyeY - xr);
        ctx.lineTo(ex - xr, eyeY + xr);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.arc(cx, cy + bs * 0.2, bs * 0.1, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      return;
    }

    if (mood === 'celebrate' || blink) {
      // Joyful laughing "^ ^" arc eyes!
      [-1, 1].forEach((s) => {
        const ex = cx + s * eyeOffX;
        ctx.beginPath();
        ctx.moveTo(ex - eyeR * 0.85, eyeY + eyeR * 0.2);
        ctx.quadraticCurveTo(ex, eyeY - eyeR * 0.95, ex + eyeR * 0.85, eyeY + eyeR * 0.2);
        ctx.stroke();
      });
    } else if (mood === 'dizzy') {
      // Sparkle star eyes when rotating!
      drawFourPointStar(ctx, cx - eyeOffX, eyeY, eyeR * 1.15, 0, '#ffffff', '#1e1b2e');
      drawFourPointStar(ctx, cx + eyeOffX, eyeY, eyeR * 1.15, 0, '#ffffff', '#1e1b2e');
    } else {
      // Big expressive Disney eyes with white sclera + glossy glint!
      const rScale = mood === 'whee' || mood === 'nervous' ? 1.16 : 1.0;
      [-1, 1].forEach((s) => {
        const ex = cx + s * eyeOffX;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR * rScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e1b2e';
        ctx.beginPath();
        ctx.arc(ex + lookX, eyeY + bs * 0.01, eyeR * 0.56 * rScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + lookX - eyeR * 0.2, eyeY - eyeR * 0.22, eyeR * 0.22, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Mouth expression
    if (mood === 'whee' || mood === 'celebrate') {
      // Big thrilled open smile!
      ctx.fillStyle = '#1e1b2e';
      ctx.beginPath();
      ctx.arc(cx, cy + bs * 0.08, bs * 0.13, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(cx, cy + bs * 0.16, bs * 0.06, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'nervous') {
      // Cute tiny "o" mouth + little sweat drop
      ctx.beginPath();
      ctx.arc(cx, cy + bs * 0.15, bs * 0.065, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bx + bs * 0.82, by + bs * 0.24, bs * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Classic happy smile!
      ctx.beginPath();
      ctx.arc(cx, cy + bs * 0.07, bs * 0.125, 0.14 * Math.PI, 0.86 * Math.PI);
      ctx.stroke();
    }
  }

  // =========================================================================
  // 3. SPARKY THE ANIMATED DISNEY STAR MASCOT
  // =========================================================================
  function drawMascot(ctx, x, y, radius, mascotState, time) {
    ctx.save();
    const bob = Math.sin(time * 4.2) * (radius * 0.12);
    const jump = mascotState.jump > 0 ? Math.sin(mascotState.jump * Math.PI) * radius * 0.65 : 0;
    const tilt = Math.sin(time * 2.5) * 0.08 + (mascotState.spin || 0);

    ctx.translate(x, y + bob - jump);
    ctx.rotate(tilt);

    // Soft sunny aura glow
    const glow = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 1.45);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
    glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Magic Wand on the right side!
    ctx.save();
    const wandWave = Math.sin(time * 6 + (mascotState.jump > 0 ? 12 : 0)) * 0.24;
    ctx.translate(radius * 0.68, radius * 0.12);
    ctx.rotate(-0.45 + wandWave);
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, radius * 0.35);
    ctx.lineTo(0, -radius * 0.52);
    ctx.stroke();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    drawFourPointStar(ctx, 0, -radius * 0.58, radius * 0.26, time * 2, '#38bdf8', '#1e1b2e');
    ctx.restore();

    // Golden Plump 5-Point Star Body
    drawFivePointStar(ctx, 0, 0, radius, radius * 0.56);
    const bodyGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    bodyGrad.addColorStop(0, '#fef08a');
    bodyGrad.addColorStop(0.6, '#facc15');
    bodyGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Cute Expressive Mascot Face
    const excited = mascotState.mood === 'celebrate' || mascotState.jump > 0;
    const blink = Math.sin(time * 1.3) > 0.97;
    ctx.fillStyle = '#fb7185';
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(-radius * 0.32, radius * 0.12, radius * 0.13, radius * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(radius * 0.32, radius * 0.12, radius * 0.13, radius * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#1e1b2e';
    ctx.fillStyle = '#1e1b2e';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    if (excited || blink) {
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s * radius * 0.26 - 5, -radius * 0.04);
        ctx.quadraticCurveTo(s * radius * 0.2, -radius * 0.2, s * radius * 0.14 + 5, -radius * 0.04);
        ctx.stroke();
      });
    } else {
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.arc(s * radius * 0.2, -radius * 0.08, radius * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s * radius * 0.2 - 2, -radius * 0.12, radius * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1b2e';
      });
    }

    if (excited) {
      ctx.fillStyle = '#1e1b2e';
      ctx.beginPath();
      ctx.arc(0, radius * 0.08, radius * 0.18, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(0, radius * 0.19, radius * 0.09, Math.PI, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, radius * 0.06, radius * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();

    // Cheerful Speech Bubble!
    if (mascotState.bubbleText && mascotState.bubbleTimer > 0) {
      const a = Math.min(1, mascotState.bubbleTimer * 2.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '700 13px Fredoka, system-ui, sans-serif';
      const tw = ctx.measureText(mascotState.bubbleText).width;
      const bw = tw + 22;
      const bh = 28;
      const bx = x - bw / 2;
      const by = y - radius - 42 + bob * 0.5;
      roundRectPath(ctx, bx, by, bw, bh, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1e1b2e';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.fillStyle = '#1e1b2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mascotState.bubbleText, x, by + bh / 2 + 1);
      ctx.restore();
    }
  }

  // =========================================================================
  // 4. PLAYFIELD BOARD RENDERER (WORKS FOR SOLO, ONLINE, MINI & TV 5P!)
  // =========================================================================
  function drawBoard(ctx, board, rect, opts = {}) {
    const { x, y, w, h } = rect;
    const cell = Math.min(w / E.COLS, h / E.VISIBLE_ROWS);
    const gridW = cell * E.COLS;
    const gridH = cell * E.VISIBLE_ROWS;
    const gx = x + (w - gridW) / 2;
    const gy = y + (h - gridH) / 2;

    const showFaces = opts.showFaces !== undefined ? opts.showFaces : cell >= 16;
    const showNameHeader = Boolean(opts.showNameHeader);
    const isLeader = Boolean(opts.isLeader);
    const isTargeted = Boolean(opts.isTargeted);

    ctx.save();

    // Board shake + squash-and-stretch impact!
    let shakeX = 0;
    let shakeY = 0;
    if (board.shakeTime > 0) {
      const m = board.shakeMag * (board.shakeTime / 0.35);
      shakeX = (Math.random() - 0.5) * m * 2;
      shakeY = (Math.random() - 0.5) * m * 2;
    }
    const sy = 1 - (board.squashY || 0) * 0.32;
    const sx = 1 + (board.squashY || 0) * 0.24;

    ctx.translate(gx + gridW / 2 + shakeX, gy + gridH + shakeY);
    ctx.scale(sx, sy);
    ctx.translate(-(gx + gridW / 2), -(gy + gridH));

    // Chunky Retro-Cartoon Drop Shadow
    const framePad = Math.max(5, Math.min(10, cell * 0.32));
    roundRectPath(ctx, gx - framePad + 3, gy - framePad + 6, gridW + framePad * 2, gridH + framePad * 2, 16);
    ctx.fillStyle = 'rgba(30, 27, 46, 0.22)';
    ctx.fill();

    // Storybook Frame (golden trim or player color accent, warm coral glow when in danger!)
    const dangerPulse = board.danger && board.alive ? 0.5 + 0.5 * Math.sin(board.time * 9) : 0;
    roundRectPath(ctx, gx - framePad, gy - framePad, gridW + framePad * 2, gridH + framePad * 2, 16);
    ctx.fillStyle = dangerPulse > 0.3 ? '#ffe4e6' : '#fffdf7';
    ctx.fill();
    ctx.strokeStyle = isTargeted ? '#f43f5e' : '#1e1b2e';
    ctx.lineWidth = isTargeted ? 4 : 3.2;
    ctx.stroke();

    // Colored top stripe matching player color
    ctx.save();
    roundRectPath(ctx, gx - framePad, gy - framePad, gridW + framePad * 2, gridH + framePad * 2, 16);
    ctx.clip();
    ctx.fillStyle = board.color || '#14b8a6';
    ctx.fillRect(gx - framePad, gy - framePad, gridW + framePad * 2, framePad * 0.95);
    ctx.restore();

    // Warm Cream Parchment Playfield Interior
    roundRectPath(ctx, gx, gy, gridW, gridH, 8);
    ctx.fillStyle = board.alive ? '#fff9ee' : '#f1f5f9';
    ctx.fill();

    // Soft alternating storybook grid tiles
    ctx.save();
    roundRectPath(ctx, gx, gy, gridW, gridH, 8);
    ctx.clip();

    for (let r = 0; r < E.VISIBLE_ROWS; r++) {
      for (let c = 0; c < E.COLS; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
          ctx.fillRect(gx + c * cell, gy + r * cell, cell, cell);
        }
      }
    }

    // Subtle danger threshold line near top
    if (board.danger && board.alive) {
      ctx.fillStyle = `rgba(244, 63, 94, ${0.07 + dangerPulse * 0.1})`;
      ctx.fillRect(gx, gy, gridW, cell * 4);
    }

    // Hard-drop cartoon motion wind streaks!
    for (const tr of board.trails) {
      const a = Math.max(0, tr.life / tr.maxLife);
      const grad = ctx.createLinearGradient(0, gy + tr.y1 * cell, 0, gy + tr.y2 * cell);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, tr.color || '#bae6fd');
      ctx.save();
      ctx.globalAlpha = a * 0.58;
      ctx.fillStyle = grad;
      ctx.fillRect(gx + tr.x * cell + 2, gy + tr.y1 * cell, tr.w * cell - 4, (tr.y2 - tr.y1) * cell);
      ctx.restore();
    }

    // Settled Blocks on Grid
    const clearSet = new Set(board.clearingRows || []);
    const clearProgress = clearSet.size > 0 ? 1 - Math.max(0, board.clearTimer / board.clearDuration) : 0;

    for (let r = E.BUFFER_ROWS; r < E.TOTAL_ROWS; r++) {
      const vr = r - E.BUFFER_ROWS;
      const isClearing = clearSet.has(r);
      for (let c = 0; c < E.COLS; c++) {
        const type = board.grid[r][c];
        if (!type) continue;
        // Draw cute faces on top-exposed blocks & cloud garbage blocks so the stack feels alive!
        const exposedTop = r === E.BUFFER_ROWS || !board.grid[r - 1][c];
        const drawCute = showFaces && (type === 'G' || (exposedTop && (r + c) % 2 === 0));
        if (isClearing) {
          const popScale = 1 + Math.sin(clearProgress * Math.PI) * 0.25;
          drawBlock(ctx, gx + c * cell, gy + vr * cell, cell, type, {
            flash: Math.floor(clearProgress * 6) % 2 === 0,
            scale: popScale,
            alpha: Math.max(0.15, 1 - clearProgress * 0.85),
            drawFace: drawCute,
            mood: 'celebrate',
          });
        } else {
          drawBlock(ctx, gx + c * cell, gy + vr * cell, cell, type, {
            drawFace: drawCute,
            mood: !board.alive ? 'ko' : board.danger && vr < 6 ? 'nervous' : 'happy',
            blink: board.isBlinking && (r + c) % 3 === 0,
            lookDir: 0,
          });
        }
      }
    }

    // Lock-in golden sparkle glow
    for (const lf of board.lockFlashes) {
      const a = Math.max(0, lf.life / lf.maxLife);
      ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.6})`;
      ctx.fillRect(gx + lf.x * cell, gy + lf.y * cell, cell, cell);
    }

    // Ghost Piece (soft candy sparkle preview)
    if (board.active && board.alive && clearSet.size === 0) {
      const gyRow = board.getGhostY();
      const ghostCells = board._getCells(board.active.type, board.active.rot, board.active.x, gyRow);
      const pInfo = E.PIECES[board.active.type];
      for (const [cx, cy] of ghostCells) {
        const vr = cy - E.BUFFER_ROWS;
        if (vr < 0) continue;
        const px = gx + cx * cell + 2;
        const py = gy + vr * cell + 2;
        const ps = cell - 4;
        roundRectPath(ctx, px, py, ps, ps, Math.max(3, ps * 0.24));
        ctx.fillStyle = pInfo.fill;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = pInfo.dark;
        ctx.lineWidth = Math.max(1.4, cell * 0.075);
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Active Falling Character Piece!
      const actCells = board._getCells(board.active.type, board.active.rot, board.active.x, board.active.y);
      const springScale = 1 + Math.abs(board.rotSpring || 0) * 0.09;
      // Pick one signature block on the piece (index 1 or 2) to always show the hero character face,
      // and on larger cells show adorable faces on every block!
      for (let i = 0; i < actCells.length; i++) {
        const [cx, cy] = actCells[i];
        const vr = cy - E.BUFFER_ROWS;
        if (vr < -1) continue;
        drawBlock(ctx, gx + cx * cell, gy + vr * cell, cell, board.active.type, {
          scale: springScale,
          drawFace: showFaces && (cell >= 22 || i === 1),
          mood: board.faceMood,
          blink: board.isBlinking,
          lookDir: board.lookDir,
        });
      }
    }

    // Playfield Inner Border
    roundRectPath(ctx, gx, gy, gridW, gridH, 8);
    ctx.strokeStyle = 'rgba(30, 27, 46, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Board Particles (stars, confetti, musical notes, puffs!)
    for (const p of board.particles) {
      const a = Math.max(0, Math.min(1, p.life / (p.maxLife * 0.6)));
      const px = gx + p.x * cell;
      const py = gy + p.y * cell;
      const ps = p.size * cell;
      ctx.save();
      ctx.globalAlpha = a;
      if (p.kind === 'puff') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, ps, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'note') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#1e1b2e';
        ctx.lineWidth = 2;
        ctx.font = `700 ${Math.max(12, Math.round(ps * 2.2))}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText('♪', px, py);
        ctx.fillText('♪', px, py);
      } else {
        drawFourPointStar(ctx, px, py, ps * 1.15, p.rot, p.color, '#1e1b2e');
      }
      ctx.restore();
    }

    // KO Banner Overlay
    if (!board.alive) {
      ctx.fillStyle = 'rgba(255, 248, 236, 0.56)';
      ctx.fillRect(gx, gy, gridW, gridH);
      ctx.save();
      ctx.translate(gx + gridW / 2, gy + gridH * 0.45);
      ctx.rotate(-0.08);
      const pillW = Math.min(gridW * 0.86, 175);
      const pillH = Math.max(34, cell * 1.65);
      roundRectPath(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 14);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.strokeStyle = '#1e1b2e';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.max(13, Math.round(cell * 0.72))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ KNOCKED OUT ★', 0, 1);
      ctx.restore();
    }

    // Comic Floating Popups!
    for (const pop of board.popups) {
      const a = Math.min(1, pop.life * 2.2);
      const px = gx + pop.x * cell;
      const py = gy + pop.y * cell;
      const fontSize = Math.max(13, Math.round(cell * 0.78 * (pop.scale || 1)));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 ${fontSize}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3.5, fontSize * 0.22);
      ctx.strokeStyle = '#1e1b2e';
      ctx.strokeText(pop.text, px, py);
      ctx.fillStyle = pop.color || '#fde047';
      ctx.fillText(pop.text, px, py);

      if (pop.sub) {
        const subSize = Math.max(10, Math.round(fontSize * 0.58));
        ctx.font = `700 ${subSize}px Fredoka, system-ui, sans-serif`;
        ctx.lineWidth = Math.max(2.6, subSize * 0.22);
        ctx.strokeText(pop.sub, px, py + fontSize * 0.86);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pop.sub, px, py + fontSize * 0.86);
      }
      ctx.restore();
    }

    ctx.restore(); // end clip

    // Incoming Giggle-Garbage Bubble Meter (left border!)
    const totalPending = board.getTotalPendingGarbage();
    if (totalPending > 0 && board.alive) {
      const barW = Math.max(7, Math.min(12, cell * 0.36));
      const bubbleCount = Math.min(14, totalPending);
      const bubbleStep = Math.min(cell * 0.9, (gridH - 8) / bubbleCount);
      for (let i = 0; i < bubbleCount; i++) {
        const by = gy + gridH - 6 - i * bubbleStep - bubbleStep * 0.5;
        const wobble = Math.sin(board.time * 10 + i * 0.9) * 1.4;
        ctx.beginPath();
        ctx.arc(gx - framePad * 0.5 + wobble, by, barW * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#1e1b2e';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // Optional Nameplate Header (used in TV 5P & Rival Mini-Boards)
    if (showNameHeader) {
      const badgeH = Math.max(24, Math.min(34, cell * 1.25));
      const badgeY = gy - framePad - badgeH - 5;
      roundRectPath(ctx, gx - framePad, badgeY, gridW + framePad * 2, badgeH, 11);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1e1b2e';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Player color dot + avatar + name + score
      ctx.font = `700 ${Math.max(11, Math.round(badgeH * 0.48))}px Fredoka, system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e1b2e';
      const crown = isLeader ? '👑 ' : '';
      const label = `${crown}${board.avatar || '🌟'} ${board.name}`;
      ctx.fillText(label.slice(0, 22), gx - framePad + 8, badgeY + badgeH / 2 + 1);

      ctx.textAlign = 'right';
      ctx.fillStyle = board.color || '#0f766e';
      ctx.fillText(Number(board.score || 0).toLocaleString(), gx + gridW + framePad - 8, badgeY + badgeH / 2 + 1);
    }

    ctx.restore();

    return { gx, gy, gridW, gridH, cell, cx: gx + gridW / 2, cy: gy + gridH / 2 };
  }

  // =========================================================================
  // 5. MINI PIECE PREVIEW (HOLD / NEXT BOXES & PHONE CONTROLLER)
  // =========================================================================
  function drawPiecePreview(ctx, typeCode, x, y, boxW, boxH, time = 0) {
    if (!typeCode || !E.PIECES[typeCode]) return;
    const shape = E.PIECES[typeCode].cells[0];
    let minX = 9, maxX = -1, minY = 9, maxY = -1;
    for (const [cx, cy] of shape) {
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    }
    const cols = maxX - minX + 1;
    const rows = maxY - minY + 1;
    const cell = Math.min((boxW * 0.78) / cols, (boxH * 0.78) / rows);
    const totalW = cols * cell;
    const totalH = rows * cell;
    const ox = x + (boxW - totalW) / 2;
    const oy = y + (boxH - totalH) / 2 + Math.sin(time * 3.2) * 1.4;

    for (let i = 0; i < shape.length; i++) {
      const [cx, cy] = shape[i];
      drawBlock(ctx, ox + (cx - minX) * cell, oy + (cy - minY) * cell, cell, typeCode, {
        drawFace: i === 1 && cell >= 13,
        mood: 'happy',
      });
    }
  }

  // =========================================================================
  // 6. FLYING RAINBOW GARBAGE PROJECTILE ARCS
  // =========================================================================
  function drawAttackArcs(ctx, arcs) {
    for (const arc of arcs) {
      const p = Math.max(0, Math.min(1, 1 - arc.life / arc.maxLife));
      // Quadratic Bezier curve with high joyful Disney rainbow apex!
      const mx = (arc.x1 + arc.x2) / 2;
      const my = Math.min(arc.y1, arc.y2) - 90;
      const inv = 1 - p;
      const cx = inv * inv * arc.x1 + 2 * inv * p * mx + p * p * arc.x2;
      const cy = inv * inv * arc.y1 + 2 * inv * p * my + p * p * arc.y2;

      // Trailing sparkly rainbow dots
      for (let t = 1; t <= 6; t++) {
        const tp = Math.max(0, p - t * 0.045);
        const tinv = 1 - tp;
        const tx = tinv * tinv * arc.x1 + 2 * tinv * tp * mx + tp * tp * arc.x2;
        const ty = tinv * tinv * arc.y1 + 2 * tinv * tp * my + tp * tp * arc.y2;
        const cols = ['#fde047', '#f472b6', '#38bdf8', '#4ade80', '#fb923c', '#ffffff'];
        ctx.save();
        ctx.globalAlpha = (1 - t / 7) * 0.85;
        drawFourPointStar(ctx, tx, ty, (8 - t) * 1.35, tp * 10, cols[t % cols.length]);
        ctx.restore();
      }

      // Main star comet + count badge
      drawFourPointStar(ctx, cx, cy, 16, p * 8, arc.color || '#fde047', '#1e1b2e');
      ctx.font = '700 12px Fredoka, sans-serif';
      ctx.fillStyle = '#1e1b2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${arc.count}`, cx, cy + 1);
    }
  }

  global.WonderRenderer = {
    StorybookBackdrop,
    drawBlock,
    drawMascot,
    drawBoard,
    drawPiecePreview,
    drawAttackArcs,
    drawFourPointStar,
    roundRectPath,
  };
})(window);
