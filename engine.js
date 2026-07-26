/* =========================================================
   EVERYBODIES GOT SOMETHIN — engine.js
   Core constants, utils, audio synth, input (kb/mouse/touch)
   ========================================================= */
'use strict';

const CW = 960, CH = 640;            // internal canvas size
const TILE = 64, COLS = 13, ROWS = 7;
const RX = (CW - COLS * TILE) / 2;   // room interior left (64)
const RY = 140;                      // room interior top
const RW = COLS * TILE, RH = ROWS * TILE;
const TAU = Math.PI * 2;

/* ---------------- utils ---------------- */
const U = {
  rand(a, b) { return a + Math.random() * (b - a); },
  randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); },
  ang(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  norm(x, y) { const l = Math.sqrt(x * x + y * y); return l > 0.0001 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; },
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  roman(n) { const R = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']; return R[U.clamp(n, 0, 10)] || ('x' + n); },
  key(x, y) { return x + ',' + y; }
};

/* tile helpers — layout is [ROWS][COLS], 0 empty 1 rock 2 paperwork 3 spikes */
function tileToPx(c, r) { return { x: RX + c * TILE + TILE / 2, y: RY + r * TILE + TILE / 2 }; }
function pxToTile(x, y) { return { c: Math.floor((x - RX) / TILE), r: Math.floor((y - RY) / TILE) }; }
function tileSolid(layout, c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  const t = layout[r][c];
  return t === 1 || t === 2;
}
/* circle vs solid tiles collision resolve. returns corrected {x,y} */
function collideTiles(layout, x, y, rad) {
  const c0 = Math.max(0, Math.floor((x - rad - RX) / TILE)), c1 = Math.min(COLS - 1, Math.floor((x + rad - RX) / TILE));
  const r0 = Math.max(0, Math.floor((y - rad - RY) / TILE)), r1 = Math.min(ROWS - 1, Math.floor((y + rad - RY) / TILE));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (!tileSolid(layout, c, r)) continue;
    const tx = RX + c * TILE, ty = RY + r * TILE;
    const nx = U.clamp(x, tx, tx + TILE), ny = U.clamp(y, ty, ty + TILE);
    const dx = x - nx, dy = y - ny, d2 = dx * dx + dy * dy;
    if (d2 < rad * rad && d2 > 0.0001) {
      const d = Math.sqrt(d2), push = (rad - d) / d;
      x += dx * push; y += dy * push;
    } else if (d2 <= 0.0001) { y = ty - rad; }
  }
  return { x, y };
}

/* ---------------- persistent meta ---------------- */
const Meta = {
  data: { runs: 0, deaths: 0, kills: 0, bestFloor: 0, walrusKills: 0, itemsSeen: 0, diagBest: {}, fineSeen: 0, unlocks: {}, diagsPlayed: {}, everOverRx: 0, everNoHitFloor: 0 },
  load() { try { const j = localStorage.getItem('egs_meta'); if (j) Object.assign(this.data, JSON.parse(j)); } catch (e) { } },
  save() { try { localStorage.setItem('egs_meta', JSON.stringify(this.data)); } catch (e) { } }
};

/* ---------------- audio ----------------
   Master -> compressor -> destination, with a convolver reverb bus.
   Voices (osc/noise) send dry to master and optional wet to the reverb.
*/
const SFX = {
  ctx: null, master: null, comp: null, reverbIn: null, musicGain: null, sfxGain: null, _dest: null, muted: false,
  musicMode: null, _mtimer: null, _next: 0, _step: 0, _vol: 0.6,
  sfxVol: 0.85, musicVol: 0.5,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = this.ctx = new AC();
      try {
        this.muted = localStorage.getItem('egs_mute') === '1';
        const sv = parseFloat(localStorage.getItem('egs_sfxvol')); if (sv >= 0 && sv <= 1) this.sfxVol = sv;
        const mv = parseFloat(localStorage.getItem('egs_musvol')); if (mv >= 0 && mv <= 1) this.musicVol = mv;
      } catch (e) { }
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this._vol;
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.knee.value = 22; this.comp.ratio.value = 4;
      this.comp.attack.value = 0.003; this.comp.release.value = 0.22;
      this.master.connect(this.comp); this.comp.connect(ctx.destination);
      // reverb bus feeds back into master so the master gain (mute) governs it too
      this.reverbIn = ctx.createConvolver();
      this.reverbIn.buffer = this._impulse(1.2, 2.8);
      const rg = ctx.createGain(); rg.gain.value = 0.55;
      this.reverbIn.connect(rg); rg.connect(this.master);
      // separate SFX and music buses so each has its own volume
      this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      this.musicGain = ctx.createGain(); this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.master);
      this._mtimer = setInterval(() => this._musicTick(), 55);
    } catch (e) { this.ctx = null; }
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this._vol, this.ctx.currentTime, 0.02);
    try { localStorage.setItem('egs_mute', this.muted ? '1' : '0'); } catch (e) { }
    return this.muted;
  },
  setSfxVol(v) {
    this.sfxVol = U.clamp(v, 0, 1);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.01);
    try { localStorage.setItem('egs_sfxvol', String(this.sfxVol)); } catch (e) { }
  },
  setMusicVol(v) {
    this.musicVol = U.clamp(v, 0, 1);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.02);
    try { localStorage.setItem('egs_musvol', String(this.musicVol)); } catch (e) { }
  },
  _impulse(dur, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  },
  _nf(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  // one oscillator voice with an exp attack/decay envelope
  v(freq, t0, dur, o) {
    if (!this.ctx || this.muted) return;
    o = o || {};
    const ctx = this.ctx;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'triangle';
    if (o.detune) osc.detune.value = o.detune;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(18, o.slide), t0 + dur);
    const vol = o.vol == null ? 0.08 : o.vol, a = o.attack == null ? 0.006 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = g;
    if (o.filter) { const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.cutoff || 1200; if (o.q) f.Q.value = o.q; g.connect(f); out = f; }
    osc.connect(g); out.connect(this._dest || this.sfxGain);
    if (o.wet) { const s = ctx.createGain(); s.gain.value = o.wet * (this._dest === this.musicGain ? this.musicVol : this.sfxVol); out.connect(s); s.connect(this.reverbIn); }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },
  // filtered noise burst
  n(t0, dur, o) {
    if (!this.ctx || this.muted) return;
    o = o || {};
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    const dec = o.decay || 0;
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (dec ? Math.pow(1 - i / len, dec) : 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.value = o.freq || 2000; if (o.q) f.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.1, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this._dest || this.sfxGain);
    if (o.wet) { const s = ctx.createGain(); s.gain.value = o.wet * (this._dest === this.musicGain ? this.musicVol : this.sfxVol); g.connect(s); s.connect(this.reverbIn); }
    src.start(t0);
  },
  // drum voices
  kick(t, vol) {
    if (!this.ctx || this.muted) return;
    vol = vol || 0.5; const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(g); g.connect(this._dest || this.sfxGain); o.start(t); o.stop(t + 0.19);
    this.n(t, 0.02, { filter: 'bandpass', freq: 1800, vol: vol * 0.28 });
  },
  snare(t, vol) {
    if (!this.ctx || this.muted) return;
    vol = vol || 0.26; const ctx = this.ctx;
    this.n(t, 0.15, { filter: 'highpass', freq: 1500, vol: vol, decay: 1.4 });
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 190;
    g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(this._dest || this.sfxGain); o.start(t); o.stop(t + 0.1);
  },
  hat(t, vol, open) {
    if (!this.ctx || this.muted) return;
    this.n(t, open ? 0.13 : 0.035, { filter: 'highpass', freq: 8500, vol: vol || 0.1, decay: open ? 0.5 : 1.6 });
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, v = this.v.bind(this), n = this.n.bind(this);
    switch (name) {
      case 'ui': v(620, t, 0.06, { type: 'square', vol: 0.05, attack: 0.002, slide: 700 }); break;
      case 'shot': {
        const f = 660 + Math.random() * 120;
        v(f, t, 0.09, { type: 'triangle', vol: 0.075, slide: f * 0.55, attack: 0.002, wet: 0.06 });
        n(t, 0.02, { filter: 'highpass', freq: 4200, vol: 0.03 });
        break;
      }
      case 'hit': v(300, t, 0.07, { type: 'square', vol: 0.11, slide: 170 }); n(t, 0.025, { filter: 'bandpass', freq: 1100, vol: 0.05, q: 1 }); break;
      case 'pop': v(520, t, 0.08, { type: 'triangle', vol: 0.095, slide: 1040, attack: 0.002, wet: 0.1 }); break;
      case 'hurt': v(180, t, 0.26, { type: 'sawtooth', vol: 0.13, slide: 52, filter: 'lowpass', cutoff: 1200 }); n(t, 0.16, { filter: 'lowpass', freq: 900, vol: 0.08, decay: 1.6 }); break;
      case 'die': {
        [415, 311, 247, 185].forEach((f, i) => v(f, t + i * 0.11, 0.32, { type: 'sawtooth', vol: 0.11, wet: 0.25, filter: 'lowpass', cutoff: 1600 }));
        v(92, t + 0.1, 0.7, { type: 'sine', vol: 0.12, slide: 46 });
        n(t + 0.05, 0.5, { filter: 'lowpass', freq: 700, vol: 0.08, decay: 1 });
        break;
      }
      case 'pickup': v(523, t, 0.06, { type: 'square', vol: 0.08 }); v(784, t + 0.06, 0.1, { type: 'square', vol: 0.08, wet: 0.1 }); break;
      case 'item': {
        [523, 659, 784, 1046].forEach((f, i) => v(f, t + i * 0.09, 0.34, { type: 'triangle', vol: 0.09, wet: 0.3, attack: 0.004 }));
        v(261, t, 0.5, { type: 'sine', vol: 0.05, attack: 0.05, wet: 0.3 });
        break;
      }
      case 'coin': v(1318, t, 0.05, { type: 'square', vol: 0.07 }); v(1760, t + 0.05, 0.11, { type: 'square', vol: 0.07, wet: 0.12 }); break;
      case 'pill': v(300, t, 0.14, { type: 'sine', vol: 0.11, slide: 88 }); n(t + 0.02, 0.06, { filter: 'lowpass', freq: 760, vol: 0.05, decay: 2 }); break;
      case 'door': v(200, t, 0.1, { type: 'sine', vol: 0.07, slide: 128 }); n(t, 0.05, { filter: 'lowpass', freq: 480, vol: 0.05, decay: 1 }); break;
      case 'lock': v(220, t, 0.06, { type: 'square', vol: 0.07, detune: -8 }); v(165, t + 0.07, 0.1, { type: 'square', vol: 0.07, detune: 8 }); break;
      case 'boom': {
        n(t, 0.5, { filter: 'lowpass', freq: 900, vol: 0.26, decay: 1, wet: 0.2 });
        v(80, t, 0.4, { type: 'sine', vol: 0.24, slide: 30 });
        n(t, 0.06, { filter: 'highpass', freq: 3000, vol: 0.1 });
        break;
      }
      case 'boss': {
        [110, 138.6, 164.8].forEach((f, i) => v(f, t, 0.9, { type: 'sawtooth', vol: 0.07, attack: 0.06, wet: 0.3, filter: 'lowpass', cutoff: 900, detune: (i - 1) * 6 }));
        v(55, t, 1.0, { type: 'sine', vol: 0.1, slide: 82, attack: 0.05 });
        n(t, 0.5, { filter: 'bandpass', freq: 500, vol: 0.07, decay: 0.6, q: 0.7, wet: 0.2 });
        break;
      }
      case 'heal': [523, 659, 784].forEach((f, i) => v(f, t + i * 0.07, 0.3, { type: 'sine', vol: 0.09, wet: 0.35, attack: 0.01 })); break;
      case 'error': v(160, t, 0.14, { type: 'square', vol: 0.07 }); v(150, t + 0.13, 0.16, { type: 'square', vol: 0.07 }); break;
      case 'stamp': n(t, 0.07, { filter: 'lowpass', freq: 620, vol: 0.2, decay: 1.2 }); v(95, t, 0.13, { type: 'sine', vol: 0.16, slide: 46 }); break;
      case 'squeak': v(900, t, 0.1, { type: 'sine', vol: 0.07, slide: 1650, wet: 0.1 }); break;
      case 'whoosh': n(t, 0.26, { filter: 'bandpass', freq: 1400, vol: 0.06, q: 1.2, decay: 0.4 }); break;
      case 'descend': [392, 311, 247, 174].forEach((f, i) => v(f, t + i * 0.1, 0.3, { type: 'triangle', vol: 0.09, wet: 0.35 })); v(87, t + 0.3, 0.5, { type: 'sine', vol: 0.08 }); break;
      case 'voice': v(700, t, 0.06, { type: 'sine', vol: 0.04, slide: 920 }); v(500, t + 0.07, 0.08, { type: 'sine', vol: 0.04, slide: 660 }); break;
      case 'charge': v(180, t, 0.4, { type: 'sawtooth', vol: 0.06, slide: 460, wet: 0.1, filter: 'lowpass', cutoff: 1400 }); break;
    }
  },

  setMusic(mode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode; this._step = 0;
    this._next = this.ctx ? this.ctx.currentTime + 0.06 : 0;
  },

  /* ------- multi-track step sequencer (16th notes) ------- */
  _musicTick() {
    if (!this.ctx || this.muted || !this.musicMode) return;
    const now = this.ctx.currentTime;
    if (this._next < now - 0.3) this._next = now + 0.02;
    const bpm = { menu: 76, run: 128, boss: 152 }[this.musicMode] || 120;
    const sd = 60 / bpm / 4;
    this._dest = this.musicGain; // music routes through its own quieter bus
    while (this._next < now + 0.2) {
      try { this['_mus_' + this.musicMode](this._step, this._next, sd); } catch (e) { }
      this._next += sd; this._step++;
    }
    this._dest = null;
  },
  // waiting-room muzak: soft sad pads + a music-box melody, no drums
  _mus_menu(step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [52, 56, 59]]; // Am F C/G E
    const ch = chords[bar];
    if (s === 0) {
      ch.forEach(m => this.v(this._nf(m), t, sd * 15.5, { type: 'triangle', vol: 0.026, attack: 0.5, wet: 0.4 }));
      this.v(this._nf(ch[0] - 12), t, sd * 15.5, { type: 'sine', vol: 0.03, attack: 0.35, wet: 0.2 });
    }
    const mel = [
      69, -1, 72, -1, 76, -1, 72, -1,
      69, -1, 72, -1, 77, -1, 72, -1,
      67, -1, 72, -1, 76, -1, 79, -1,
      76, -1, 71, -1, 68, -1, 71, -1
    ];
    const m = mel[bar * 8 + (s >> 1)];
    if (s % 2 === 0 && m > 0) this.v(this._nf(m + 12), t, sd * 3.2, { type: 'triangle', vol: 0.032, attack: 0.008, wet: 0.4 });
  },
  // dungeon groove: 4-on-floor drums, square bass riff, bright arp
  _mus_run(step, t, sd) {
    const s = step % 16, bar = Math.floor(step / 16) % 4;
    if (s === 0 || s === 8) this.kick(t, 0.5);
    if (s === 4 || s === 12) this.snare(t, 0.22);
    if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.09 : 0.05, s === 14);
    const bass = [45, 0, 45, 0, 48, 0, 0, 45, 43, 0, 43, 0, 41, 0, 45, 0];
    if (bass[s]) this.v(this._nf(bass[s]), t, sd * 1.5, { type: 'square', vol: 0.06, attack: 0.004, filter: 'lowpass', cutoff: 700 });
    const arpA = [69, 72, 76, 72, 74, 72, 69, 67, 69, 72, 76, 79, 76, 72, 69, 64];
    const arpB = [72, 76, 79, 76, 77, 76, 72, 69, 71, 74, 79, 74, 72, 69, 67, 64];
    const arp = (bar < 2 ? arpA : arpB)[s];
    if (arp) this.v(this._nf(arp), t, sd * 0.9, { type: 'triangle', vol: 0.033, attack: 0.003, wet: 0.18 });
  },
  // boss: heavier drums, aggressive detuned-saw bass, menacing motif
  _mus_boss(step, t, sd) {
    const s = step % 16, bar = Math.floor(step / 16) % 2;
    if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) this.kick(t, 0.5);
    if (s === 4 || s === 12) this.snare(t, 0.26);
    this.hat(t, s % 2 === 0 ? 0.06 : 0.035);
    const bass = [45, 45, 48, 45, 46, 46, 43, 46, 41, 41, 44, 41, 43, 45, 46, 47];
    const bf = this._nf(bass[s]);
    this.v(bf, t, sd * 1.1, { type: 'sawtooth', vol: 0.05, attack: 0.003, detune: -7, filter: 'lowpass', cutoff: 800 });
    this.v(bf, t, sd * 1.1, { type: 'sawtooth', vol: 0.04, attack: 0.003, detune: 7, filter: 'lowpass', cutoff: 800 });
    const leadA = [-1, -1, -1, -1, 81, -1, 80, -1, -1, -1, 84, -1, 83, -1, 80, 79];
    const leadB = [-1, -1, -1, -1, 84, -1, 83, -1, -1, -1, 87, -1, 84, 83, 80, 79];
    const L = (bar ? leadB : leadA)[s];
    if (L > 0) this.v(this._nf(L), t, sd * 1.6, { type: 'square', vol: 0.04, attack: 0.004, wet: 0.28, detune: 4 });
  }
};

/* ---------------- input ---------------- */
const Input = {
  keys: {}, mouse: { x: CW / 2, y: CH / 2, down: false },
  usingTouch: false,
  moveStick: { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 },
  aimStick: { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 },
  _edge: { pill: false, bomb: false, pause: false, confirm: false, mute: false, map: false },
  canvas: null,

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', e => {
      if (e.repeat) { if (['Space', 'Enter'].includes(e.code)) e.preventDefault(); return; }
      this.keys[e.code] = true;
      if (e.code === 'KeyQ') this._edge.pill = true;
      if (e.code === 'KeyE') this._edge.bomb = true;
      if (e.code === 'KeyP' || e.code === 'Escape') this._edge.pause = true;
      if (e.code === 'Enter' || e.code === 'Space') this._edge.confirm = true;
      if (e.code === 'KeyM') this._edge.mute = true;
      if (e.code === 'Tab') { this._edge.map = true; e.preventDefault(); }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    const toCanvas = (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      return { x: (cx - r.left) / r.width * CW, y: (cy - r.top) / r.height * CH };
    };
    canvas.addEventListener('mousemove', e => { const p = toCanvas(e.clientX, e.clientY); this.mouse.x = p.x; this.mouse.y = p.y; });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) { this.mouse.down = true; SFX.init(); } });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    /* touch input: dedicated zones start a stick; the finger is then tracked globally.
       'float' zones (landscape) anchor to the touch point; 'pad' zones (portrait
       Game Boy deck) anchor to the pad centre for a proper joystick feel. */
    const markTouch = () => {
      this.usingTouch = true;
      if (!document.body.classList.contains('touch')) {
        document.body.classList.add('touch');
        window.dispatchEvent(new Event('resize'));
      }
    };
    const registerZone = (id, stick, mode) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => {
        markTouch(); SFX.init();
        for (const t of e.changedTouches) {
          if (stick.active) break;
          const r = el.getBoundingClientRect();
          if (mode === 'pad') { stick.ax = r.left + r.width / 2; stick.ay = r.top + r.height / 2; stick.radius = Math.min(r.width, r.height) * 0.42; }
          else { stick.ax = t.clientX; stick.ay = t.clientY; stick.radius = 58; }
          stick.active = true; stick.id = t.identifier; stick.dx = 0; stick.dy = 0; stick.mode = mode;
          break;
        }
        e.preventDefault();
      }, { passive: false });
    };
    registerZone('zoneMoveL', this.moveStick, 'float');
    registerZone('zoneAimL', this.aimStick, 'float');
    registerZone('deckMove', this.moveStick, 'pad');
    registerZone('deckAim', this.aimStick, 'pad');

    const onMove = (e) => {
      let handled = false;
      for (const t of e.changedTouches) {
        for (const st of [this.moveStick, this.aimStick]) {
          if (st.active && st.id === t.identifier) {
            let dx = (t.clientX - st.ax) / st.radius, dy = (t.clientY - st.ay) / st.radius;
            const l = Math.sqrt(dx * dx + dy * dy);
            if (l > 1) { dx /= l; dy /= l; }
            st.dx = dx; st.dy = dy; handled = true;
          }
        }
      }
      if (handled) e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        for (const st of [this.moveStick, this.aimStick]) {
          if (st.active && st.id === t.identifier) { st.active = false; st.dx = 0; st.dy = 0; st.id = -1; }
        }
      }
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    /* touch buttons (both landscape overlay and portrait deck ids) */
    const bind = (id, name) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => { this._edge[name] = true; markTouch(); SFX.init(); e.preventDefault(); e.stopPropagation(); }, { passive: false });
      el.addEventListener('mousedown', e => { this._edge[name] = true; SFX.init(); e.preventDefault(); e.stopPropagation(); });
    };
    ['btnPillL', 'btnPillD'].forEach(id => bind(id, 'pill'));
    ['btnBombL', 'btnBombD'].forEach(id => bind(id, 'bomb'));
    ['btnPauseL', 'btnPauseD'].forEach(id => bind(id, 'pause'));
  },

  getMove() {
    let x = 0, y = 0;
    if (this.keys['KeyA']) x -= 1; if (this.keys['KeyD']) x += 1;
    if (this.keys['KeyW']) y -= 1; if (this.keys['KeyS']) y += 1;
    if (x === 0 && y === 0 && this.moveStick.active) { x = this.moveStick.dx; y = this.moveStick.dy; }
    const l = Math.sqrt(x * x + y * y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  getAim(px, py) {
    let x = 0, y = 0;
    if (this.keys['ArrowLeft']) x -= 1; if (this.keys['ArrowRight']) x += 1;
    if (this.keys['ArrowUp']) y -= 1; if (this.keys['ArrowDown']) y += 1;
    if (x !== 0 || y !== 0) return U.norm(x, y);
    if (this.aimStick.active && (Math.abs(this.aimStick.dx) > 0.25 || Math.abs(this.aimStick.dy) > 0.25))
      return U.norm(this.aimStick.dx, this.aimStick.dy);
    if (this.mouse.down) return U.norm(this.mouse.x - px, this.mouse.y - py);
    return null;
  },
  take(name) { if (this._edge[name]) { this._edge[name] = false; return true; } return false; },
  clearEdges() { for (const k in this._edge) this._edge[k] = false; }
};

/* ---------------- haptics (mobile vibration) ---------------- */
const Haptics = {
  enabled: true,
  supported: (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'),
  _last: 0,
  init() { try { this.enabled = localStorage.getItem('egs_haptics') !== '0'; } catch (e) { } },
  // pattern: ms or [buzz,pause,buzz,...]; gap throttles bursts (mass deaths -> one buzz)
  buzz(pattern, gap) {
    if (!this.enabled || !this.supported || !Input.usingTouch) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : 0);
    if (now - this._last < (gap == null ? 22 : gap)) return;
    this._last = now;
    try { navigator.vibrate(pattern); } catch (e) { }
  },
  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('egs_haptics', this.enabled ? '1' : '0'); } catch (e) { }
    if (this.enabled && this.supported) { try { navigator.vibrate(28); } catch (e) { } }
    return this.enabled;
  }
};
