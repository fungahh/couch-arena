/**
 * Wonder Tetris — Joyful Disney-Style Procedural Web Audio Engine
 * Warm marimba, celesta/music-box sparkles, playful pizzicato bass,
 * and expressive cartoon sound effects. Zero external assets required!
 */
(function (global) {
  'use strict';

  class WonderAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.muted = false;
      this.musicOn = true;
      this.playingBgm = false;
      this.bgmTimer = null;
      this.step = 0;
      this.tempo = 132; // BPM, gently rises with level!
      this.dangerMode = false;

      try {
        const savedMuted = localStorage.getItem('wt_muted');
        const savedMusic = localStorage.getItem('wt_music');
        if (savedMuted === '1') this.muted = true;
        if (savedMusic === '0') this.musicOn = false;
      } catch (e) {}
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return true;
      }
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.72;
        this.master.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicOn ? 0.32 : 0;
        this.musicGain.connect(this.master);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.78;
        this.sfxGain.connect(this.master);
        return true;
      } catch (e) {
        return false;
      }
    }

    setMuted(flag) {
      this.muted = Boolean(flag);
      try { localStorage.setItem('wt_muted', this.muted ? '1' : '0'); } catch (e) {}
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.03);
      }
    }

    setMusicOn(flag) {
      this.musicOn = Boolean(flag);
      try { localStorage.setItem('wt_music', this.musicOn ? '1' : '0'); } catch (e) {}
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.32 : 0, this.ctx.currentTime, 0.06);
      }
    }

    setLevel(level) {
      // Gently upbeat tempo scaling from 132 BPM up to 164 BPM
      this.tempo = Math.min(164, 130 + Math.max(0, level - 1) * 3.5);
    }

    setDanger(isDanger) {
      this.dangerMode = Boolean(isDanger);
    }

    midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    _playTone({ freq, type = 'triangle', start = 0, dur = 0.14, gain = 0.25, dest = 'sfx', slideTo = null, attack = 0.008 }) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime + start;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, freq), now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
      }
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(gain, now + attack);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(env);
      env.connect(dest === 'music' ? this.musicGain : this.sfxGain);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }

    // ---- Happy Storybook Disney-Style BGM Loop ----
    // Playful bouncy 32-step major melody (C major -> F major -> G7 -> C major,
    // with a whimsical waltz-march bounce like classic cartoon shorts!)
    startBgm() {
      this.init();
      if (this.playingBgm) return;
      this.playingBgm = true;
      this.step = 0;

      // Melody MIDI notes (0 = rest) — bright, joyful, whistling-Disney bounce!
      const melodyA = [
        72, 0, 76, 79, 84, 0, 79, 76,
        74, 0, 77, 81, 79, 0, 76, 0,
        72, 74, 76, 79, 81, 0, 84, 81,
        79, 76, 74, 72, 74, 0, 0, 0,
      ];
      const melodyB = [
        81, 0, 84, 86, 84, 81, 79, 0,
        77, 0, 81, 84, 79, 76, 72, 0,
        74, 76, 77, 79, 81, 83, 84, 0,
        86, 0, 83, 79, 84, 0, 0, 0,
      ];
      // Bouncy pizzicato oom-pah bassline
      const bassA = [
        48, 0, 55, 0, 48, 0, 55, 0,
        53, 0, 57, 0, 48, 0, 55, 0,
        48, 0, 52, 0, 53, 0, 57, 0,
        55, 0, 50, 0, 55, 0, 50, 0,
      ];
      const bassB = [
        53, 0, 57, 0, 53, 0, 60, 0,
        48, 0, 55, 0, 48, 0, 55, 0,
        50, 0, 53, 0, 55, 0, 59, 0,
        55, 0, 59, 0, 48, 0, 55, 0,
      ];
      // Sparkling harp/celesta chord accents on offbeats
      const chords = [
        [60, 64, 67], [60, 64, 67], [65, 69, 72], [60, 64, 67],
        [60, 64, 67], [65, 69, 72], [62, 67, 71], [62, 67, 71],
      ];

      const tick = () => {
        if (!this.playingBgm) return;
        const effectiveBpm = this.dangerMode ? Math.min(182, this.tempo + 16) : this.tempo;
        const stepMs = (60000 / effectiveBpm) / 2; // 8th notes

        if (this.ctx && this.ctx.state === 'running' && this.musicOn && !this.muted) {
          const idx = this.step % 64;
          const isB = idx >= 32;
          const local = idx % 32;
          const mel = (isB ? melodyB : melodyA)[local];
          const bas = (isB ? bassB : bassA)[local];

          // Lead marimba + celesta shimmer
          if (mel > 0) {
            const f = this.midiToFreq(mel);
            this._playTone({ freq: f, type: 'triangle', dur: 0.16, gain: 0.24, dest: 'music', attack: 0.006 });
            this._playTone({ freq: f * 2, type: 'sine', dur: 0.11, gain: 0.07, dest: 'music', attack: 0.004 });
          }

          // Pizzicato bouncy bass
          if (bas > 0) {
            this._playTone({ freq: this.midiToFreq(bas), type: 'sine', dur: 0.15, gain: 0.30, dest: 'music', attack: 0.008 });
          }

          // Offbeat cheerful music-box chord pluck
          if (local % 4 === 2) {
            const c = chords[Math.floor(local / 4) % chords.length];
            c.forEach((n, ci) => {
              this._playTone({
                freq: this.midiToFreq(n),
                type: 'sine',
                start: ci * 0.012,
                dur: 0.12,
                gain: 0.06,
                dest: 'music',
              });
            });
          }
        }

        this.step++;
        this.bgmTimer = setTimeout(tick, stepMs);
      };

      tick();
    }

    stopBgm() {
      this.playingBgm = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }

    // ---- Expressive Cartoon Sound Effects ----
    playMove() {
      this.init();
      this._playTone({ freq: 520, slideTo: 600, type: 'sine', dur: 0.045, gain: 0.14 });
    }

    playRotate() {
      this.init();
      this._playTone({ freq: 560, slideTo: 880, type: 'triangle', dur: 0.075, gain: 0.2 });
      this._playTone({ freq: 880, slideTo: 1180, type: 'sine', start: 0.03, dur: 0.06, gain: 0.1 });
    }

    playHold() {
      this.init();
      this._playTone({ freq: 660, slideTo: 495, type: 'triangle', dur: 0.07, gain: 0.18 });
      this._playTone({ freq: 520, slideTo: 780, type: 'sine', start: 0.055, dur: 0.09, gain: 0.18 });
    }

    playSoftDrop() {
      this.init();
      this._playTone({ freq: 340, slideTo: 280, type: 'sine', dur: 0.035, gain: 0.09 });
    }

    playHardDrop() {
      this.init();
      // Cartoonish bouncy thump + little sparkle pop!
      this._playTone({ freq: 240, slideTo: 95, type: 'triangle', dur: 0.11, gain: 0.34 });
      this._playTone({ freq: 440, slideTo: 680, type: 'sine', start: 0.025, dur: 0.08, gain: 0.14 });
    }

    playLock() {
      this.init();
      this._playTone({ freq: 300, slideTo: 180, type: 'triangle', dur: 0.08, gain: 0.22 });
    }

    playLineClear(lines, combo = 0, isTSpin = false) {
      this.init();
      // Major pentatonic lift based on combo!
      const boost = Math.min(12, combo * 2);
      if (lines >= 4 || isTSpin) {
        // Grand Disney Harp Glissando + Major-9th Sparkle Fanfare!
        const arp = [60, 64, 67, 71, 72, 76, 79, 84, 88].map((n) => n + Math.min(5, combo));
        arp.forEach((n, i) => {
          this._playTone({
            freq: this.midiToFreq(n),
            type: i % 2 === 0 ? 'triangle' : 'sine',
            start: i * 0.038,
            dur: 0.32,
            gain: 0.22,
          });
        });
        // Warm brassy sparkle chord
        [60, 67, 76, 84].forEach((n) => {
          this._playTone({
            freq: this.midiToFreq(n),
            type: 'triangle',
            start: 0.22,
            dur: 0.5,
            gain: 0.16,
          });
        });
        return;
      }

      const patterns = {
        1: [64, 67, 72],
        2: [64, 67, 72, 76],
        3: [64, 67, 72, 76, 79],
      };
      const notes = patterns[Math.min(3, Math.max(1, lines))] || patterns[1];
      notes.forEach((n, i) => {
        this._playTone({
          freq: this.midiToFreq(n + boost),
          type: 'triangle',
          start: i * 0.05,
          dur: 0.22,
          gain: 0.22,
        });
        this._playTone({
          freq: this.midiToFreq(n + boost + 12),
          type: 'sine',
          start: i * 0.05 + 0.015,
          dur: 0.16,
          gain: 0.09,
        });
      });
    }

    playAttackSend() {
      this.init();
      // Magical wand swoosh!
      this._playTone({ freq: 620, slideTo: 1320, type: 'sine', dur: 0.18, gain: 0.18 });
      this._playTone({ freq: 880, slideTo: 1760, type: 'triangle', start: 0.05, dur: 0.16, gain: 0.12 });
    }

    playGarbageHit() {
      this.init();
      // Playful cartoon bubble-boing!
      this._playTone({ freq: 180, slideTo: 360, type: 'sine', dur: 0.12, gain: 0.28 });
      this._playTone({ freq: 290, slideTo: 150, type: 'triangle', start: 0.09, dur: 0.14, gain: 0.24 });
    }

    playCountdown(isGo = false) {
      this.init();
      if (isGo) {
        [72, 76, 79, 84].forEach((n, i) => {
          this._playTone({ freq: this.midiToFreq(n), type: 'triangle', start: i * 0.045, dur: 0.34, gain: 0.24 });
        });
      } else {
        this._playTone({ freq: 660, type: 'triangle', dur: 0.14, gain: 0.22 });
      }
    }

    playKo() {
      this.init();
      // Silly descending cartoon slide-whistle boing
      this._playTone({ freq: 520, slideTo: 160, type: 'triangle', dur: 0.36, gain: 0.28 });
      this._playTone({ freq: 320, slideTo: 110, type: 'sine', start: 0.16, dur: 0.32, gain: 0.22 });
    }

    playVictory() {
      this.init();
      const notes = [60, 64, 67, 72, 71, 72, 76, 79, 84];
      const times = [0, 0.09, 0.18, 0.28, 0.42, 0.50, 0.62, 0.74, 0.88];
      notes.forEach((n, i) => {
        this._playTone({
          freq: this.midiToFreq(n),
          type: 'triangle',
          start: times[i],
          dur: i === notes.length - 1 ? 0.75 : 0.22,
          gain: 0.26,
        });
        this._playTone({
          freq: this.midiToFreq(n + 12),
          type: 'sine',
          start: times[i] + 0.015,
          dur: i === notes.length - 1 ? 0.6 : 0.15,
          gain: 0.1,
        });
      });
    }
  }

  global.WonderAudio = WonderAudio;
})(window);
