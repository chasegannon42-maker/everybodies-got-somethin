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

/* ---------------- seedable rng ----------------
   RAND is the source every U.* random helper (and DATA.pickEnemy) draws from.
   Normally it's Math.random. For Daily Ward runs we temporarily swap in a seeded
   generator around the deterministic sections (floor gen, room population, etc.)
   via withSeed(), so the same day yields the same dungeon for everyone — while
   moment-to-moment combat keeps using Math.random and stays lively. */
let RAND = Math.random;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* combine a base seed with label parts (numbers/strings) into a stable 32-bit int */
function hashSeed(base, parts) {
  let h = (base >>> 0) ^ 0x9e3779b9;
  const s = (parts || []).join('|');
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 2654435761); h ^= h >>> 15; }
  return h >>> 0;
}
/* run fn with RAND driven by a fresh seeded stream, then always restore the previous source */
function withSeed(seedInt, fn) {
  const prev = RAND;
  RAND = mulberry32(seedInt >>> 0);
  try { return fn(); } finally { RAND = prev; }
}

/* ---------------- utils ---------------- */
const U = {
  rand(a, b) { return a + RAND() * (b - a); },
  randi(a, b) { return Math.floor(a + RAND() * (b - a + 1)); },
  choice(arr) { return arr[Math.floor(RAND() * arr.length)]; },
  chance(p) { return RAND() < p; },
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); },
  ang(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  norm(x, y) { const l = Math.sqrt(x * x + y * y); return l > 0.0001 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; },
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(RAND() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
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
  data: { runs: 0, deaths: 0, kills: 0, bestFloor: 0, walrusKills: 0, itemsSeen: 0, diagBest: {}, fineSeen: 0, unlocks: {}, diagsPlayed: {}, everOverRx: 0, everNoHitFloor: 0, daily: null, seen: { enemies: {}, bosses: {}, items: {}, pills: {} }, dailyStreak: { last: null, count: 0, best: 0 }, dailyHistory: {}, a11y: { bulletContrast: false, reduceMotion: false, easy: false, aimAssist: true, dmgNums: false }, onboarded: 0, chronicUnlocked: 0, cured: 0, chronicBest: 0, founderKills: 0, runlog: [], runAgg: {}, causeAgg: {}, seenStory: {}, storyOff: 0, insight: 0, talents: {}, influencerKills: 0, crisesSurvived: 0, hazardsSeen: {}, everWiredClear: 0, everFullGroup: 0, everKeystone: 0, systemKills: 0, protocolsDone: {}, boardKills: 0, auditorKills: 0, quarterly: null, quarterlyBest: 0, hat: null, fund: 0, facility: {}, appealsWon: 0, amaDone: 0, contractsDone: 0, everGoldWalrus: 0, pet: null, paOff: 0, skinOn: {}, revenges: 0, giftsGot: 0, everCoop: 0, pendingGift: null, overtimeBest: 0, janitorMet: 0, janitorBuys: 0, petXp: {}, speedrun: 0, splitsPB: {}, pendingComplaint: null, complaintsFiled: 0, intensityBest: {}, sparedBosses: {}, lostItem: null, exitDone: 0, internGrad: 0, internLost: 0, unionsSettled: 0, everVolunteer: 0, docs: {}, diary: [], dayCount: 0, carePlans: {}, carePlanDeep: 0, tester: 0, fpsHud: 0, rival: null, giftCart: {}, giftBuys: 0, bingo: null, nightFloors: 0, bingoBlackouts: 0, bingoLines: 0, arcade: null, jointsCleared: 0, compounds: 0, incident: null, incidentsCleared: 0, stairsClean: 0, actuaryWins: 0, actuaryCorrect: 0, tracksHeard: {}, hubTrack: null, fileStolen: 0, heistsClean: 0, mergerKills: 0, calDays: {}, walkinBest: null, roofVisits: 0, momCalls: 0, seasonsSeen: {}, inspections: 0, mixups: 0, handoffDone: 0, playdates: 0, pet2: null, annexClears: 0, alarmPulls: 0, micSupports: 0, ghostPB: {} },
  load() { try { const j = localStorage.getItem('egs_meta'); if (j) Object.assign(this.data, JSON.parse(j)); } catch (e) { } if (!this.data.seen) this.data.seen = { enemies: {}, bosses: {}, items: {}, pills: {} }; if (!this.data.dailyStreak) this.data.dailyStreak = { last: null, count: 0, best: 0 }; if (!this.data.dailyHistory) this.data.dailyHistory = {}; if (!this.data.a11y) this.data.a11y = { bulletContrast: false, reduceMotion: false, easy: false }; if (!this.data.runlog) this.data.runlog = []; if (!this.data.runAgg) this.data.runAgg = {}; if (!this.data.causeAgg) this.data.causeAgg = {}; if (this.data.insight == null) this.data.insight = 0; if (!this.data.talents) this.data.talents = {}; if (!this.data.hazardsSeen) this.data.hazardsSeen = {}; if (!this.data.protocolsDone) this.data.protocolsDone = {}; if (this.data.fund == null) this.data.fund = 0; if (!this.data.facility) this.data.facility = {}; if (!this.data.skinOn) this.data.skinOn = {}; if (!this.data.petXp) this.data.petXp = {}; if (!this.data.docs) this.data.docs = {}; if (!this.data.diary) this.data.diary = []; if (!this.data.carePlans) this.data.carePlans = {}; if (!this.data.giftCart) this.data.giftCart = {}; },
  save() {
    if (this._noSave) return;   // sandbox: the run is imaginary; the disk stays real
    try { localStorage.setItem('egs_meta', JSON.stringify(this.data)); } catch (e) { }
    this._idbQueue();   // mirror to IndexedDB — sturdier than localStorage on mobile browsers
  },
  /* ---- IndexedDB mirror: localStorage gets evicted (iOS) or is ephemeral (in-app browsers);
         a second copy in IDB survives more of those, and boot restores from it if LS came up empty. ---- */
  _idb(cb) {
    try {
      const rq = indexedDB.open('egs_db', 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore('kv'); };
      rq.onsuccess = () => cb(rq.result);
      rq.onerror = () => { };
    } catch (e) { }
  },
  _idbQueue() {
    if (this._idbT) return;
    this._idbT = setTimeout(() => {
      this._idbT = null;
      this._idb(db => {
        try {
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(JSON.stringify(this.data), 'egs_meta');
          const cp = localStorage.getItem('egs_save1');
          if (cp) tx.objectStore('kv').put(cp, 'egs_save1'); else tx.objectStore('kv').delete('egs_save1');
        } catch (e) { }
      });
    }, 800);
  },
  idbRestore() {   // called at boot AFTER load(): if localStorage was empty but the mirror isn't, take the mirror
    const lsEmpty = !localStorage.getItem('egs_meta');
    this._idb(db => {
      try {
        const tx = db.transaction('kv', 'readonly');
        const rq = tx.objectStore('kv').get('egs_meta');
        const rq2 = tx.objectStore('kv').get('egs_save1');
        rq.onsuccess = () => {
          try {
            if (lsEmpty && rq.result && !sessionStorage.getItem('egs_restored')) {
              sessionStorage.setItem('egs_restored', '1');
              localStorage.setItem('egs_meta', rq.result);
              if (rq2.result) localStorage.setItem('egs_save1', rq2.result);
              location.reload();   // come back up with the recovered save
            }
          } catch (e) { }
        };
      } catch (e) { }
    });
    // and ask the browser, politely, to stop deleting us
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  },
  /* ---- portable save codes: the only true cross-device answer without a server ---- */
  exportCode() {
    try {
      const d = JSON.parse(JSON.stringify(this.data));
      if (d.runlog && d.runlog.length > 15) d.runlog = d.runlog.slice(-15);   // keep the code pasteable
      if (d.diary && d.diary.length > 8) d.diary = d.diary.slice(-8);         // the journal travels abridged
      d.ghostPB = {};                                                          // ghosts are too heavy to travel
      if (d.dailyHistory) { const ks = Object.keys(d.dailyHistory).slice(-30); const dh = {}; for (const k of ks) dh[k] = d.dailyHistory[k]; d.dailyHistory = dh; }
      return 'EGSSAVE' + btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/=+$/, '');
    } catch (e) { return null; }
  },
  importCode(str) {
    try {
      const s = String(str || '').trim();
      if (!s.startsWith('EGSSAVE')) return false;
      const d = JSON.parse(decodeURIComponent(escape(atob(s.slice(7)))));
      if (!d || typeof d.runs !== 'number') return false;
      Object.assign(this.data, d);
      this.save();
      return true;
    } catch (e) { return false; }
  },
  /* mark a codex entry encountered (cat: enemies|bosses|items|pills) */
  see(cat, id) { if (!this.data.seen) this.data.seen = { enemies: {}, bosses: {}, items: {}, pills: {} }; if (!this.data.seen[cat]) this.data.seen[cat] = {}; this.data.seen[cat][id] = 1; }
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
    // anti-abrasion: rapid-fire repeats of the same effect get swallowed (contact sounds especially)
    this._lastPlay = this._lastPlay || {};
    const TH = { hit: 0.05, pop: 0.055, error: 0.38, denied: 0.55, shot: 0.03, coin: 0.04, swat: 0.06 };
    if (TH[name] != null && t - (this._lastPlay[name] || -9) < TH[name]) return;
    this._lastPlay[name] = t;
    switch (name) {
      case 'ui': v(620, t, 0.06, { type: 'square', vol: 0.05, attack: 0.002, slide: 700 }); break;
      case 'shot': {
        const f = 660 + Math.random() * 120;
        v(f, t, 0.09, { type: 'triangle', vol: 0.075, slide: f * 0.55, attack: 0.002, wet: 0.06 });
        n(t, 0.02, { filter: 'highpass', freq: 4200, vol: 0.03 });
        break;
      }
      case 'hit': { const hf = 230 + Math.random() * 50; v(hf, t, 0.055, { type: 'triangle', vol: 0.06, slide: 110, filter: 'lowpass', cutoff: 1300 }); n(t, 0.02, { filter: 'lowpass', freq: 850, vol: 0.03 }); break; }
      case 'pop': v(500, t, 0.07, { type: 'triangle', vol: 0.07, slide: 900, attack: 0.002, wet: 0.1 }); break;
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
      case 'error': v(165, t, 0.12, { type: 'triangle', vol: 0.055, filter: 'lowpass', cutoff: 900 }); v(150, t + 0.12, 0.14, { type: 'triangle', vol: 0.05, filter: 'lowpass', cutoff: 800 }); break;
      case 'stamp': n(t, 0.07, { filter: 'lowpass', freq: 620, vol: 0.2, decay: 1.2 }); v(95, t, 0.13, { type: 'sine', vol: 0.16, slide: 46 }); break;
      case 'squeak': v(900, t, 0.1, { type: 'sine', vol: 0.07, slide: 1650, wet: 0.1 }); break;
      case 'whoosh': n(t, 0.26, { filter: 'bandpass', freq: 1400, vol: 0.06, q: 1.2, decay: 0.4 }); break;
      case 'descend': [392, 311, 247, 174].forEach((f, i) => v(f, t + i * 0.1, 0.3, { type: 'triangle', vol: 0.09, wet: 0.35 })); v(87, t + 0.3, 0.5, { type: 'sine', vol: 0.08 }); break;
      case 'voice': v(700, t, 0.06, { type: 'sine', vol: 0.04, slide: 920 }); v(500, t + 0.07, 0.08, { type: 'sine', vol: 0.04, slide: 660 }); break;
      case 'charge': v(180, t, 0.4, { type: 'sawtooth', vol: 0.06, slide: 460, wet: 0.1, filter: 'lowpass', cutoff: 1400 }); break;
      // --- identity jingles ---
      case 'goalJingle':   // 🎯 objective complete: a bright little climb
        [523, 659, 784].forEach((f, i) => v(f, t + i * 0.09, 0.16, { type: 'triangle', vol: 0.07, wet: 0.3 }));
        v(1047, t + 0.27, 0.3, { type: 'sine', vol: 0.05, wet: 0.4 });
        break;
      case 'fanfare':   // 🏆 achievement: a proper ta-da
        [392, 523, 659, 784].forEach((f, i) => v(f, t + i * 0.11, i === 3 ? 0.5 : 0.14, { type: 'square', vol: 0.05, wet: 0.3 }));
        [523, 659, 784].forEach(f => v(f, t + 0.33, 0.5, { type: 'triangle', vol: 0.035, wet: 0.45, attack: 0.02 }));
        break;
      case 'sting':   // ending: a warm slow resolve
        [262, 330, 392].forEach(f => v(f, t, 1.4, { type: 'triangle', vol: 0.045, attack: 0.3, wet: 0.5 }));
        v(523, t + 0.5, 1.2, { type: 'sine', vol: 0.05, attack: 0.15, wet: 0.5 });
        v(131, t, 1.6, { type: 'sine', vol: 0.05, attack: 0.2, wet: 0.3 });
        break;
      // --- round 14: every system gets its own voice ---
      case 'elevator':   // the ding. THE ding.
        v(880, t, 0.28, { type: 'sine', vol: 0.09, wet: 0.35, attack: 0.004 });
        v(1318, t + 0.16, 0.4, { type: 'sine', vol: 0.07, wet: 0.45, attack: 0.004 });
        break;
      case 'evolve':   // a companion grows up: sparkly climb with a proud tail
        [523, 659, 880, 1046, 1318].forEach((f, i) => v(f, t + i * 0.07, 0.22, { type: 'triangle', vol: 0.06, wet: 0.35, attack: 0.003 }));
        v(1568, t + 0.38, 0.5, { type: 'sine', vol: 0.05, wet: 0.5, attack: 0.02 });
        v(262, t + 0.3, 0.6, { type: 'sine', vol: 0.04, attack: 0.06, wet: 0.3 });
        break;
      case 'keyturn':   // heavy tumblers, then the give
        n(t, 0.04, { filter: 'bandpass', freq: 900, vol: 0.12, q: 2 });
        v(140, t, 0.08, { type: 'square', vol: 0.09, slide: 110 });
        v(523, t + 0.12, 0.14, { type: 'square', vol: 0.06, wet: 0.2 });
        v(784, t + 0.2, 0.22, { type: 'triangle', vol: 0.06, wet: 0.3 });
        break;
      case 'paper':   // forms being shuffled by someone who hates forms
        n(t, 0.09, { filter: 'highpass', freq: 2600, vol: 0.08, decay: 0.8 });
        n(t + 0.09, 0.1, { filter: 'highpass', freq: 3400, vol: 0.06, decay: 1.2 });
        n(t + 0.2, 0.05, { filter: 'bandpass', freq: 1600, vol: 0.05, q: 1 });
        break;
      case 'deal':   // the fight stops. something is being offered. it is probably fine.
        [220, 261.6, 311.1].forEach((f, i) => v(f, t, 1.1, { type: 'sawtooth', vol: 0.05, attack: 0.12, wet: 0.45, filter: 'lowpass', cutoff: 900, detune: (i - 1) * 5 }));
        v(660, t + 0.5, 0.5, { type: 'sine', vol: 0.035, attack: 0.08, wet: 0.5 });
        break;
      case 'spare':   // mercy: one warm chord, no drums, no regrets (some regrets)
        [262, 330, 392, 494].forEach((f, i) => v(f, t + i * 0.05, 0.9, { type: 'triangle', vol: 0.05, attack: 0.05, wet: 0.5 }));
        v(131, t, 1.1, { type: 'sine', vol: 0.06, attack: 0.1, wet: 0.35 });
        break;
      case 'wave':   // OVERTIME: the shift horn
        [98, 98].forEach((f, i) => v(f, t + i * 0.22, 0.18, { type: 'sawtooth', vol: 0.11, filter: 'lowpass', cutoff: 700, wet: 0.2 }));
        v(196, t + 0.44, 0.3, { type: 'sawtooth', vol: 0.08, filter: 'lowpass', cutoff: 900, wet: 0.25 });
        break;
      case 'swat':   // the cat, doing its one job
        n(t, 0.03, { filter: 'highpass', freq: 5000, vol: 0.09, decay: 1.5 });
        v(1200, t, 0.05, { type: 'triangle', vol: 0.05, slide: 500 });
        break;
      case 'denied':   // the womp-womp the situation deserves
        v(311, t, 0.22, { type: 'sawtooth', vol: 0.07, slide: 293, filter: 'lowpass', cutoff: 1100 });
        v(277, t + 0.24, 0.42, { type: 'sawtooth', vol: 0.08, slide: 233, filter: 'lowpass', cutoff: 900, wet: 0.2 });
        break;
      case 'bell':   // the reception bell: paid, resolved, next please
        v(1046, t, 0.4, { type: 'sine', vol: 0.08, wet: 0.4, attack: 0.002 });
        v(2093, t, 0.25, { type: 'sine', vol: 0.03, wet: 0.4, attack: 0.002 });
        break;
      case 'vs':   // boss VS card: the slam and the riser
        n(t, 0.3, { filter: 'lowpass', freq: 500, vol: 0.22, decay: 1.2, wet: 0.25 });
        v(65, t, 0.5, { type: 'sine', vol: 0.2, slide: 40 });
        v(220, t + 0.15, 0.7, { type: 'sawtooth', vol: 0.05, slide: 660, attack: 0.1, filter: 'lowpass', cutoff: 1600, wet: 0.3 });
        break;
    }
  },

  setMusic(mode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode; this._step = 0;
    this._next = this.ctx ? this.ctx.currentTime + 0.06 : 0;
    // WWRD: every track you hear joins the jukebox
    try {
      if (mode && typeof Meta !== 'undefined' && !Meta._noSave) {
        if (!Meta.data.tracksHeard) Meta.data.tracksHeard = {};
        if (!Meta.data.tracksHeard[mode]) { Meta.data.tracksHeard[mode] = 1; Meta.save(); }
      }
    } catch (e) { }
  },

  /* ------- multi-track step sequencer (16th notes) ------- */
  _musicTick() {
    if (!this.ctx || this.muted || !this.musicMode) return;
    const now = this.ctx.currentTime;
    if (this._next < now - 0.3) this._next = now + 0.02;
    const bpm = { menu: 76, run: 128, boss: 152, superboss: 140, dayroom: 84, cutscene: 72, overtime: 160, basement: 66, ward13: 60 }[this.musicMode] || 120;
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
  },
  // superboss (FOUNDER / THE SYSTEM / THE CURE): slow dread — drone, tritone stabs, tolling bell
  _mus_superboss(step, t, sd) {
    const s = step % 16, bar = Math.floor(step / 16) % 4;
    if (s === 0) {   // the drone breathes once a bar
      this.v(this._nf(33), t, sd * 15.5, { type: 'sawtooth', vol: 0.045, attack: 0.4, filter: 'lowpass', cutoff: 300, detune: -5 });
      this.v(this._nf(45), t, sd * 15.5, { type: 'sine', vol: 0.04, attack: 0.5, wet: 0.3 });
    }
    if (s === 0 || s === 7 || s === 10) this.kick(t, 0.6);
    if (s === 12) this.snare(t, 0.3);
    // tritone stabs on the off-beats — the paperwork chord
    if ((bar % 2 === 0 && s === 8) || (bar % 2 === 1 && (s === 8 || s === 14))) {
      [51, 57].forEach(m => this.v(this._nf(m), t, sd * 2.2, { type: 'square', vol: 0.038, attack: 0.005, wet: 0.35, detune: 6 }));
    }
    // the bell tolls every other bar
    if (bar % 2 === 0 && s === 4) this.v(this._nf(69), t, sd * 8, { type: 'sine', vol: 0.05, attack: 0.01, wet: 0.6 });
    if (bar === 3 && s === 12) this.v(this._nf(68), t, sd * 4, { type: 'sine', vol: 0.04, attack: 0.01, wet: 0.6 });
  },
  // day room: warm and unhurried — soft chords, kalimba plinks, no drums at all
  _mus_dayroom(step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const chords = [[60, 64, 67], [57, 60, 64], [62, 65, 69], [59, 62, 67]];   // C Am Dm G
    if (s === 0) chords[bar].forEach(m => this.v(this._nf(m), t, sd * 15, { type: 'sine', vol: 0.028, attack: 0.6, wet: 0.45 }));
    const plink = [-1, -1, 79, -1, -1, 76, -1, -1, 81, -1, -1, 79, -1, 76, -1, 72];
    if (plink[s] > 0 && Math.floor(step / 16) % 2 === 0) this.v(this._nf(plink[s]), t, sd * 2.5, { type: 'triangle', vol: 0.03, attack: 0.005, wet: 0.5 });
  },
  // cutscene: a sparse, patient piano motif for the chart notes
  _mus_cutscene(step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const roots = [45, 41, 43, 40];   // Am F G E
    if (s === 0) this.v(this._nf(roots[bar]), t, sd * 15, { type: 'sine', vol: 0.035, attack: 0.4, wet: 0.4 });
    const mel = [
      -1, -1, -1, -1, 69, -1, -1, -1, 72, -1, -1, -1, 71, -1, 69, -1,
      -1, -1, -1, -1, 65, -1, -1, -1, 69, -1, -1, -1, 67, -1, 64, -1
    ];
    const m = mel[(bar % 2) * 16 + s];
    if (m > 0) this.v(this._nf(m), t, sd * 3.4, { type: 'triangle', vol: 0.034, attack: 0.01, wet: 0.5 });
  },
  // OVERTIME: the shift that never ends — driving four-on-the-floor with an alarm in the walls
  _mus_overtime(step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    if (s % 4 === 0) this.kick(t, 0.5);
    if (s === 4 || s === 12) this.snare(t, 0.24);
    if (s % 2 === 1) this.hat(t, 0.08, s === 15);
    const bass = [33, 33, 36, 31][bar];   // A A C G — grinding
    if (s % 4 === 2) this.v(this._nf(bass), t, sd * 1.8, { type: 'sawtooth', vol: 0.075, filter: 'lowpass', cutoff: 500 });
    if (s === 0 && bar % 2 === 0) [57, 60, 64].forEach((m, i) => this.v(this._nf(m), t, sd * 6, { type: 'square', vol: 0.02, attack: 0.03, wet: 0.3, detune: (i - 1) * 7 }));
    if (s === 8 && bar === 3) this.v(1760, t, sd * 3, { type: 'sine', vol: 0.028, wet: 0.4 });   // the alarm, far away, ignored
  },
  // the basement: the janitor's radio — warm, worn, forty years of the same tape
  _mus_basement(step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]];   // Am F G Am
    if (s === 0) chords[bar].forEach((m, i) => this.v(this._nf(m) * (1 + Math.sin(step * 0.7 + i) * 0.0022), t, sd * 15, { type: 'triangle', vol: 0.03, attack: 0.5, wet: 0.55, detune: (i - 1) * 4 }));   // tape warble
    const walk = [45, -1, -1, -1, 48, -1, -1, -1, 43, -1, -1, -1, 45, -1, 41, -1];
    if (walk[s] > 0) this.v(this._nf(walk[s]), t, sd * 3.2, { type: 'sine', vol: 0.05, attack: 0.02, wet: 0.2 });
    if (s === 8) this.hat(t, 0.035, false);   // a soft brush, like sweeping
    const plink = [-1, -1, -1, -1, -1, -1, 72, -1, -1, -1, -1, -1, 76, -1, -1, 69];
    if (plink[s] > 0 && bar % 2 === 1) this.v(this._nf(plink[s]), t, sd * 4, { type: 'triangle', vol: 0.026, attack: 0.006, wet: 0.6 });
  },
  // WARD 13: the building holds its breath — drones, a tolling bell, candle ticks
  _mus_ward13(step, t, sd) {
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    if (s === 0) {
      this.v(this._nf(38), t, sd * 15, { type: 'sawtooth', vol: 0.04, attack: 0.8, wet: 0.5, filter: 'lowpass', cutoff: 420 });   // D drone
      if (bar % 2 === 1) this.v(this._nf(44), t, sd * 15, { type: 'sawtooth', vol: 0.028, attack: 1.0, wet: 0.55, filter: 'lowpass', cutoff: 380 });   // tritone breath
    }
    if (s === 0 && bar === 0) { this.v(this._nf(62), t, sd * 12, { type: 'sine', vol: 0.05, attack: 0.004, wet: 0.65 }); this.v(this._nf(62) * 2.01, t, sd * 8, { type: 'sine', vol: 0.02, wet: 0.6 }); }   // the bell, slightly wrong
    if (s === 10 && bar === 2) this.v(this._nf(65), t, sd * 8, { type: 'sine', vol: 0.032, attack: 0.005, wet: 0.6 });
    if (Math.random() < 0.05) this.n(t, 0.02, { filter: 'highpass', freq: 6000, vol: 0.012, decay: 2 });   // candle tick
  }
};

/* ---------------- input ---------------- */
const Input = {
  keys: {}, mouse: { x: CW / 2, y: CH / 2, down: false },
  usingTouch: false,
  moveStick: { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 },
  aimStick: { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0 },
  _edge: { pill: false, bomb: false, pause: false, confirm: false, mute: false, map: false, ability: false, p2join: false, petcmd: false },
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
      if (e.code === 'KeyF') this._edge.petcmd = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this._edge.ability = true;
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
    ['btnAbilL', 'btnAbilD'].forEach(id => bind(id, 'ability'));
    ['btnPauseL', 'btnPauseD'].forEach(id => bind(id, 'pause'));
  },

  /* ---------------- gamepad (polled once per frame from the main loop) ---------------- */
  _gp: null, _gpPrev: {}, _gpMove: { x: 0, y: 0 }, _gpAim: null,
  pollGamepad() {
    let gp = null;
    try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of pads) if (g && g.connected) { gp = g; break; } } catch (e) { }
    this._gp = gp;
    if (!gp) { this._gpMove.x = 0; this._gpMove.y = 0; this._gpAim = null; return; }
    const dz = (v) => Math.abs(v) < 0.22 ? 0 : v;
    this._gpMove.x = dz(gp.axes[0] || 0); this._gpMove.y = dz(gp.axes[1] || 0);
    const ax = dz(gp.axes[2] || 0), ay = dz(gp.axes[3] || 0);
    this._gpAim = (Math.abs(ax) > 0.3 || Math.abs(ay) > 0.3) ? U.norm(ax, ay) : null;
    // buttons: A=confirm+ability (like Space), B=bomb, X=pill, Y=map, Select=Patient Two, Start=pause, LB/RB=ability
    const p2On = typeof G !== 'undefined' && G.p2;
    const edgeMap = { 0: ['confirm', 'ability'], 1: ['bomb'], 2: ['pill'], 3: ['petcmd'], 4: ['ability'], 5: ['ability'], 8: ['p2join'], 9: ['pause'] };
    for (const bi in edgeMap) {
      const down = gp.buttons[bi] && gp.buttons[bi].pressed;
      if (down && !this._gpPrev[bi]) for (const name of edgeMap[bi]) {
        if (p2On && (name === 'ability' || name === 'bomb' || name === 'pill')) continue;   // the pad belongs to Patient Two now
        this._edge[name] = true;
      }
      this._gpPrev[bi] = down;
    }
  },
  rumble(ms, strong) {   // a little haptic sympathy (pads only; reduced-motion opts out)
    try {
      if (Meta.data.a11y && Meta.data.a11y.reduceMotion) return;
      if (this._gp && this._gp.vibrationActuator) this._gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong * 0.6 });
    } catch (e) { }
  },
  getMove() {
    let x = 0, y = 0;
    if (this.keys['KeyA']) x -= 1; if (this.keys['KeyD']) x += 1;
    if (this.keys['KeyW']) y -= 1; if (this.keys['KeyS']) y += 1;
    if (x === 0 && y === 0 && this.moveStick.active) { x = this.moveStick.dx; y = this.moveStick.dy; }
    const gpToP2 = typeof G !== 'undefined' && G.p2;   // with Patient Two in the room, the pad is theirs
    if (!gpToP2 && x === 0 && y === 0 && (this._gpMove.x || this._gpMove.y)) { x = this._gpMove.x; y = this._gpMove.y; }
    const l = Math.sqrt(x * x + y * y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  getAim(px, py) {
    let x = 0, y = 0;
    if (this.keys['ArrowLeft']) x -= 1; if (this.keys['ArrowRight']) x += 1;
    if (this.keys['ArrowUp']) y -= 1; if (this.keys['ArrowDown']) y += 1;
    if (x !== 0 || y !== 0) { this._aimSrc = 'keys'; return U.norm(x, y); }
    if (this.aimStick.active && (Math.abs(this.aimStick.dx) > 0.25 || Math.abs(this.aimStick.dy) > 0.25)) {
      this._aimSrc = 'stick';
      return U.norm(this.aimStick.dx, this.aimStick.dy);
    }
    if (this._gpAim && !(typeof G !== 'undefined' && G.p2)) { this._aimSrc = 'stick'; return this._gpAim; }
    if (this.mouse.down) { this._aimSrc = 'mouse'; return U.norm(this.mouse.x - px, this.mouse.y - py); }
    this._aimSrc = null;
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
