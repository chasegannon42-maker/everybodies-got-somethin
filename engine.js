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
  data: { runs: 0, deaths: 0, kills: 0, bestFloor: 0, walrusKills: 0, itemsSeen: 0, diagBest: {}, fineSeen: 0 },
  load() { try { const j = localStorage.getItem('egs_meta'); if (j) Object.assign(this.data, JSON.parse(j)); } catch (e) { } },
  save() { try { localStorage.setItem('egs_meta', JSON.stringify(this.data)); } catch (e) { } }
};

/* ---------------- audio ---------------- */
const SFX = {
  ctx: null, master: null, muted: false, musicMode: null, _mtimer: null, _next: 0, _step: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      try { this.muted = localStorage.getItem('egs_mute') === '1'; } catch (e) { }
      if (this.muted) this.master.gain.value = 0;
      this._mtimer = setInterval(() => this._musicTick(), 60);
    } catch (e) { this.ctx = null; }
  },
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    try { localStorage.setItem('egs_mute', this.muted ? '1' : '0'); } catch (e) { }
    return this.muted;
  },
  tone(freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, filt, delay) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt || 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.1, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },
  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'ui': this.tone(660, 0.05, 'square', 0.05); break;
      case 'shot': this.noise(0.03, 0.035, 3500); this.tone(760, 0.05, 'sine', 0.03, 420); break;
      case 'hit': this.tone(320, 0.05, 'square', 0.045, 240); break;
      case 'pop': this.tone(520, 0.05, 'triangle', 0.07, 900); break;
      case 'hurt': this.tone(150, 0.28, 'sawtooth', 0.14, 55); this.noise(0.15, 0.1, 900); break;
      case 'die': this.tone(300, 0.4, 'sawtooth', 0.14, 40); this.tone(200, 0.7, 'triangle', 0.12, 30, 0.15); this.noise(0.5, 0.12, 600, 0.1); break;
      case 'pickup': this.tone(523, 0.07, 'square', 0.06); this.tone(784, 0.1, 'square', 0.06, null, 0.07); break;
      case 'item': this.tone(392, 0.12, 'triangle', 0.09); this.tone(523, 0.12, 'triangle', 0.09, null, 0.11); this.tone(659, 0.2, 'triangle', 0.1, null, 0.22); this.tone(784, 0.3, 'triangle', 0.1, null, 0.33); break;
      case 'coin': this.tone(1174, 0.05, 'square', 0.05); this.tone(1567, 0.11, 'square', 0.05, null, 0.05); break;
      case 'pill': this.tone(320, 0.16, 'sine', 0.11, 90); this.noise(0.05, 0.05, 1200, 0.12); break;
      case 'door': this.tone(190, 0.09, 'square', 0.06, 120); break;
      case 'lock': this.tone(220, 0.05, 'square', 0.07); this.tone(170, 0.08, 'square', 0.07, null, 0.06); break;
      case 'boom': this.noise(0.5, 0.28, 800); this.tone(75, 0.4, 'sine', 0.22, 30); break;
      case 'boss': this.tone(110, 0.7, 'sawtooth', 0.1); this.tone(165, 0.7, 'sawtooth', 0.08); this.tone(220, 0.7, 'sawtooth', 0.06); this.noise(0.4, 0.08, 500); break;
      case 'heal': this.tone(523, 0.09, 'sine', 0.09); this.tone(659, 0.09, 'sine', 0.09, null, 0.08); this.tone(784, 0.16, 'sine', 0.09, null, 0.16); break;
      case 'error': this.tone(155, 0.16, 'square', 0.07); this.tone(147, 0.16, 'square', 0.07); break;
      case 'stamp': this.noise(0.07, 0.2, 600); this.tone(95, 0.13, 'sine', 0.16, 50); break;
      case 'squeak': this.tone(880, 0.1, 'sine', 0.08, 1500); break;
      case 'whoosh': this.noise(0.25, 0.07, 1400); break;
      case 'descend': this.tone(392, 0.1, 'triangle', 0.09); this.tone(311, 0.1, 'triangle', 0.09, null, 0.1); this.tone(233, 0.1, 'triangle', 0.09, null, 0.2); this.tone(174, 0.25, 'triangle', 0.1, null, 0.3); break;
      case 'voice': this.tone(700, 0.06, 'sine', 0.04, 900); this.tone(500, 0.08, 'sine', 0.04, 650, 0.07); break;
      case 'charge': this.tone(180, 0.4, 'sawtooth', 0.06, 420); break;
    }
  },
  setMusic(mode) { if (this.musicMode === mode) return; this.musicMode = mode; this._step = 0; this._next = this.ctx ? this.ctx.currentTime + 0.05 : 0; },
  _mnote(freq, dur, type, vol, t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  _musicTick() {
    if (!this.ctx || this.muted || !this.musicMode) return;
    const now = this.ctx.currentTime;
    if (this._next < now - 0.3) this._next = now + 0.02;
    // menu: slow sad pad | run: bass groove | boss: fast tense
    const M = {
      menu: { bpm: 60, bass: [110, 0, 130.8, 0, 98, 0, 87.3, 0], type: 'triangle', vol: 0.055, hat: false, lead: [220, 261.6, 196, 174.6] },
      run: { bpm: 132, bass: [110, 110, 0, 110, 130.8, 0, 98, 98], type: 'square', vol: 0.045, hat: true, lead: null },
      boss: { bpm: 160, bass: [110, 110, 116.5, 110, 130.8, 130.8, 98, 103.8], type: 'sawtooth', vol: 0.05, hat: true, lead: null }
    }[this.musicMode];
    if (!M) return;
    const stepDur = 60 / M.bpm / 2;
    while (this._next < now + 0.18) {
      const s = this._step % M.bass.length;
      const f = M.bass[s];
      if (f) this._mnote(f, stepDur * 0.9, M.type, M.vol, this._next);
      if (M.hat && s % 2 === 0) {
        const t0 = this._next, n = Math.floor(this.ctx.sampleRate * 0.03);
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
        const g = this.ctx.createGain(); g.gain.value = 0.02;
        src.connect(hp); hp.connect(g); g.connect(this.master); src.start(t0);
      }
      if (M.lead && s % 8 === 0) {
        const L = M.lead[(Math.floor(this._step / 8)) % M.lead.length];
        this._mnote(L, stepDur * 6, 'sine', 0.03, this._next);
      }
      this._next += stepDur;
      this._step++;
    }
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

    /* touch: left half = float move stick, right half = float aim stick */
    const onTouch = (e) => {
      this.usingTouch = true;
      document.body.classList.add('touch');
      SFX.init();
      for (const t of e.changedTouches) {
        const half = t.clientX < window.innerWidth * 0.5;
        const st = half ? this.moveStick : this.aimStick;
        if (e.type === 'touchstart' && !st.active) {
          st.active = true; st.id = t.identifier;
          st.ax = t.clientX; st.ay = t.clientY; st.dx = 0; st.dy = 0;
        }
      }
      e.preventDefault();
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        for (const st of [this.moveStick, this.aimStick]) {
          if (st.active && st.id === t.identifier) {
            let dx = (t.clientX - st.ax) / 55, dy = (t.clientY - st.ay) / 55;
            const l = Math.sqrt(dx * dx + dy * dy);
            if (l > 1) { dx /= l; dy /= l; }
            st.dx = dx; st.dy = dy;
          }
        }
      }
      e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        for (const st of [this.moveStick, this.aimStick]) {
          if (st.active && st.id === t.identifier) { st.active = false; st.dx = 0; st.dy = 0; st.id = -1; }
        }
      }
      e.preventDefault();
    };
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });

    /* touch buttons */
    const bind = (id, name) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => { this._edge[name] = true; this.usingTouch = true; document.body.classList.add('touch'); SFX.init(); e.preventDefault(); e.stopPropagation(); }, { passive: false });
      el.addEventListener('mousedown', e => { this._edge[name] = true; e.preventDefault(); e.stopPropagation(); });
    };
    bind('btnPill', 'pill'); bind('btnBomb', 'bomb'); bind('btnPause', 'pause');
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
