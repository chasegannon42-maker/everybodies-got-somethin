/* =========================================================
   EVERYBODIES GOT SOMETHIN — story.js
   CHART NOTES: ink-&-wash storybook cutscenes.
   A patient chart on a desk under a lamp; each panel is an
   inked illustration + typewritten notes. State: 'cutscene'.
   ========================================================= */
'use strict';

const Story = {
  active: false,
  scene: null, sceneId: null, idx: 0, onDone: null,
  t: 0, panelT: 0, typed: 0, fullText: '', fade: 0, trans: 0,
  _init: false, ctx: null, _tickAt: 0,

  init() {
    if (this._init) return; this._init = true;
    const canvas = document.getElementById('game');
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      canvas.addEventListener('pointerdown', (e) => this._onPointer(e));
    }
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); this.press(); }
      else if (e.code === 'Escape') { e.preventDefault(); this.skipScene(); }
    });
  },

  // play a scene by id; onDone runs when it finishes (and should set the next state)
  play(id, onDone) {
    this.init();
    const sc = STORY[id];
    if (!sc || !this.ctx) { if (onDone) onDone(); return; }
    if (typeof Meta !== 'undefined' && Meta.data) {
      if (!Meta.data.seenStory) Meta.data.seenStory = {};
      Meta.data.seenStory[id] = 1; Meta.save();
    }
    this.active = true; this.sceneId = id; this.scene = sc; this.idx = 0;
    this.onDone = onDone || null; this.t = 0; this.fade = 0;
    G.state = 'cutscene';
    if (G.hideOverlay) G.hideOverlay();
    document.body.classList.remove('inrun');
    if (typeof SFX !== 'undefined' && SFX.setMusic) SFX.setMusic('menu');
    this._loadPanel();
  },

  _loadPanel() {
    const p = this.scene[this.idx];
    this.panelT = 0; this.typed = 0; this.trans = 1;
    const lines = (typeof p.lines === 'function') ? p.lines(G) : (p.lines || []);
    this.fullText = lines.join('\n');
    if (typeof SFX !== 'undefined' && SFX.play) SFX.play('whoosh');
  },

  press() {
    if (!this.active || this.trans > 0.35) return;
    if (this.typed < this.fullText.length) { this.typed = this.fullText.length; return; }
    this.advance();
  },
  advance() {
    if (this.idx < this.scene.length - 1) { this.idx++; this._loadPanel(); }
    else this.finish();
  },
  skipScene() { if (this.active) this.finish(); },
  finish() {
    this.active = false;
    const cb = this.onDone; this.onDone = null; this.scene = null;
    if (cb) cb(); else if (G.showTitle) G.showTitle();
  },

  _onPointer(e) {
    if (!this.active) return;
    const canvas = document.getElementById('game');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) { this.press(); return; }
    const sx = (e.clientX - rect.left) / rect.width * CW;
    const sy = (e.clientY - rect.top) / rect.height * CH;
    if (sx > CW - 150 && sy > CH - 52) { this.skipScene(); return; }  // skip button region
    this.press();
  },

  update(dt) {
    if (!this.active) return;
    this.t += dt; this.panelT += dt;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * 2.4);
    if (this.trans > 0) this.trans = Math.max(0, this.trans - dt * 3.4);
    if (this.trans <= 0.16 && this.typed < this.fullText.length) {
      const before = Math.floor(this.typed);
      this.typed = Math.min(this.fullText.length, this.typed + dt * 42);
      // soft typewriter tick
      if (typeof SFX !== 'undefined' && SFX.play && Math.floor(this.typed) > before && this.t - this._tickAt > 0.045) {
        this._tickAt = this.t;
        const ch = this.fullText[Math.floor(this.typed) - 1];
        if (ch && ch !== ' ' && ch !== '\n') SFX.play('tick');
      }
    }
  },

  /* ---------- ink helpers (stable hand-drawn wobble, no per-frame jitter) ---------- */
  _wob(x, y, k) { return Math.sin(x * 0.07 + y * 0.05 + (k || 0)) * 1.2 + Math.sin(x * 0.021 - y * 0.03) * 0.8; },
  ink(ctx, x1, y1, x2, y2, w, k) {
    ctx.lineWidth = w || 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const segs = Math.max(2, Math.round(len / 16));
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs, x = x1 + dx * u, y = y1 + dy * u;
      const n = (i === 0 || i === segs) ? 0 : this._wob(x, y, k);
      const px = x + nx * n, py = y + ny * n;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  },
  inkPoly(ctx, pts, w, close, k) {
    for (let i = 0; i < pts.length - 1; i++) this.ink(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, (k || 0) + i);
    if (close && pts.length > 2) this.ink(ctx, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], w, (k || 0) + 99);
  },
  inkRect(ctx, x, y, w, h, lw, k) { this.inkPoly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], lw, true, k); },
  inkCircle(ctx, cx, cy, r, w, k) {
    ctx.lineWidth = w || 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    const segs = 26;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * TAU, rr = r + Math.sin(a * 3 + (k || 0)) * (r * 0.02 + 0.6);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },
  hatch(ctx, x, y, w, h, gap, ang, alpha) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(28,24,32,' + (alpha == null ? 0.5 : alpha) + ')'; ctx.lineWidth = 1.1;
    const a = ang == null ? -0.6 : ang, dx = Math.cos(a), dy = Math.sin(a);
    const diag = (Math.abs(w) + Math.abs(h)) * 1.4;
    for (let d = -diag; d < diag; d += (gap || 6)) {
      const mx = x + w / 2 + (-dy) * d, my = y + h / 2 + dx * d;
      ctx.beginPath(); ctx.moveTo(mx - dx * diag, my - dy * diag); ctx.lineTo(mx + dx * diag, my + dy * diag); ctx.stroke();
    }
    ctx.restore();
  },
  wash(ctx, cx, cy, r, alpha) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, 'rgba(60,58,66,' + (alpha == null ? 0.35 : alpha) + ')');
    g.addColorStop(1, 'rgba(60,58,66,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  },

  /* ---------- main paint ---------- */
  draw() {
    const ctx = this.ctx; if (!ctx || !this.active) return;
    const p = this.scene[this.idx];
    // desk / lamp
    ctx.fillStyle = '#0f0c12'; ctx.fillRect(0, 0, CW, CH);
    const lamp = ctx.createRadialGradient(CW / 2, CH * 0.42, 60, CW / 2, CH * 0.42, CW * 0.62);
    lamp.addColorStop(0, 'rgba(60,52,40,0.55)'); lamp.addColorStop(1, 'rgba(20,16,22,0)');
    ctx.fillStyle = lamp; ctx.fillRect(0, 0, CW, CH);

    // chart page (with a soft drop shadow), slight fade-in
    ctx.globalAlpha = this.fade;
    const PX = 66, PY = 40, PW = CW - 132, PH = CH - 84;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; this._round(ctx, PX + 6, PY + 10, PW, PH, 8); ctx.fill();
    const paper = ctx.createLinearGradient(0, PY, 0, PY + PH);
    paper.addColorStop(0, '#efe9da'); paper.addColorStop(1, '#e2dac6');
    ctx.fillStyle = paper; this._round(ctx, PX, PY, PW, PH, 8); ctx.fill();
    // ruled chart lines + red margin
    ctx.save(); this._round(ctx, PX, PY, PW, PH, 8); ctx.clip();
    ctx.strokeStyle = 'rgba(90,120,150,0.18)'; ctx.lineWidth = 1;
    for (let y = PY + 92; y < PY + PH; y += 26) { ctx.beginPath(); ctx.moveTo(PX, y); ctx.lineTo(PX + PW, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(190,70,70,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PX + 118, PY); ctx.lineTo(PX + 118, PY + PH); ctx.stroke();
    // coffee-ring / age stains
    ctx.strokeStyle = 'rgba(150,110,60,0.12)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(PX + PW - 70, PY + PH - 60, 34, 0.3, 5.6); ctx.stroke();
    ctx.restore();

    // page header
    ctx.fillStyle = '#3a3038'; ctx.textAlign = 'left';
    ctx.font = 'bold 15px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText('PATIENT CHART', PX + 20, PY + 30);
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(58,48,56,0.65)';
    ctx.fillText('EVERYBODIES GOT SOMETHIN CLINIC  ·  CONFIDENTIAL', PX + 20, PY + 48);
    ctx.textAlign = 'right';
    ctx.fillText('SHEET ' + (this.idx + 1) + ' / ' + this.scene.length, PX + PW - 20, PY + 30);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(58,48,56,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX + 20, PY + 58); ctx.lineTo(PX + PW - 20, PY + 58); ctx.stroke();

    // illustration box
    const BX = PX + 150, BY = PY + 78, BW = PW - 200, BH = 250;
    ctx.fillStyle = '#f6f1e4'; ctx.fillRect(BX, BY, BW, BH);
    ctx.save(); ctx.beginPath(); ctx.rect(BX + 2, BY + 2, BW - 4, BH - 4); ctx.clip();
    ctx.strokeStyle = '#1c1820'; ctx.fillStyle = '#1c1820';
    const fn = this.ILLUS[p.art] || this.ILLUS._placeholder;
    try { fn.call(this, ctx, BX, BY, BW, BH, this.panelT, p); } catch (e) { }
    // page-turn wipe
    if (this.trans > 0) {
      ctx.fillStyle = '#e8e1d0';
      const w = BW * this.trans;
      ctx.fillRect(BX + BW - w, BY, w, BH);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(BX + BW - w, BY); ctx.lineTo(BX + BW - w, BY + BH); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#1c1820'; this.inkRect(ctx, BX, BY, BW, BH, 2.4, 7);

    // stamped caption (red, slightly rotated)
    if (p.stamp) {
      ctx.save();
      ctx.translate(BX + BW - 6, BY + 20); ctx.rotate(-0.14);
      ctx.strokeStyle = 'rgba(178,54,54,0.85)'; ctx.fillStyle = 'rgba(178,54,54,0.9)';
      ctx.lineWidth = 2; ctx.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
      const tw = ctx.measureText(p.stamp).width;
      this.inkRect(ctx, -tw - 16, -18, tw + 20, 26, 2, 3);
      ctx.textAlign = 'left'; ctx.fillText(p.stamp, -tw - 6, 0);
      ctx.restore();
    }

    // narration — typewritten notes
    const shown = this.fullText.slice(0, Math.floor(this.typed));
    ctx.fillStyle = '#2a2028'; ctx.textAlign = 'left';
    ctx.font = '17px ui-monospace, Menlo, Consolas, monospace';
    const tx = PX + 40, ty0 = BY + BH + 42;
    const lines = shown.split('\n');
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], tx, ty0 + i * 26);
    // caret
    if (this.typed < this.fullText.length && Math.floor(this.t * 2) % 2 === 0) {
      const last = lines[lines.length - 1] || '';
      const cw = ctx.measureText(last).width;
      ctx.fillRect(tx + cw + 2, ty0 + (lines.length - 1) * 26 - 13, 9, 16);
    }
    ctx.globalAlpha = 1;

    // prompt + skip
    if (this.typed >= this.fullText.length && this.trans <= 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 4) * 0.3;
      ctx.fillStyle = '#8a7c68'; ctx.textAlign = 'center';
      ctx.font = '13px ui-monospace, Menlo, Consolas, monospace';
      const lastPanel = this.idx >= this.scene.length - 1;
      ctx.fillText((Input && Input.usingTouch ? 'tap to continue' : '▸ space / click to continue') + (lastPanel ? '' : ''), CW / 2, CH - 22);
      ctx.globalAlpha = 1;
    }
    // skip button
    ctx.fillStyle = 'rgba(30,24,32,0.55)'; this._round(ctx, CW - 142, CH - 44, 118, 26, 6); ctx.fill();
    ctx.fillStyle = 'rgba(240,232,216,0.8)'; ctx.textAlign = 'center';
    ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText('SKIP  ⏭', CW - 83, CH - 26);
    ctx.textAlign = 'left';
  },

  _round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  },

  ILLUS: {}   // filled below
};

/* ============ ILLUSTRATIONS (ink & wash noir) ============
   Each: fn(ctx, x, y, w, h, t, panel). Origin box is (x,y,w,h);
   draw in black ink + grey wash + occasional red accent. */
(function (S) {
  const I = S.ILLUS;
  const bg = (ctx, x, y, w, h) => { ctx.fillStyle = '#f6f1e4'; ctx.fillRect(x, y, w, h); };

  I._placeholder = function (ctx, x, y, w, h) {
    bg(ctx, x, y, w, h);
    ctx.fillStyle = '#1c1820'; ctx.textAlign = 'center'; ctx.font = '20px ui-monospace, monospace';
    ctx.fillText('[ chart note ]', x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
  };

  // waiting room: rows of chairs, one small figure, a clock, fluorescent hum
  I.intakeRoom = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, fy = y + h - 40;
    // floor line + wall
    ctx.strokeStyle = '#1c1820';
    S.ink(ctx, x + 10, fy, x + w - 10, fy, 2, 1);
    // rows of empty chairs (simple L shapes)
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      const cy = y + 70 + r * 46, scale = 1 + r * 0.16;
      for (let c = 0; c < 5; c++) {
        const chx = x + 40 + c * (w - 80) / 4;
        S.hatch(ctx, chx - 12 * scale, cy - 6, 24 * scale, 10 * scale, 5, -0.6, 0.18);
        S.inkPoly(ctx, [[chx - 12 * scale, cy - 18 * scale], [chx - 12 * scale, cy], [chx + 12 * scale, cy], [chx + 12 * scale, cy - 18 * scale]], 2, false, r * 7 + c);
      }
    }
    // lone figure sitting in the front row, head down
    const px = cx, py = fy - 22;
    S.wash(ctx, px, py - 4, 46, 0.3);
    ctx.fillStyle = '#1c1820';
    ctx.beginPath(); ctx.ellipse(px, py, 12, 16, 0, 0, TAU); ctx.fill();       // hunched body
    S.inkCircle(ctx, px, py - 22, 11, 2.4, 2); ctx.fillStyle = '#f6f1e4';       // head
    ctx.beginPath(); ctx.arc(px, py - 22, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1820'; S.ink(ctx, px - 5, py - 20, px + 5, py - 20, 1.6, 5); // downcast eyes line
    // clock on the wall (time you'll never get back)
    const clkx = x + 46, clky = y + 40;
    S.inkCircle(ctx, clkx, clky, 17, 2.2, 9);
    const ta = t * 0.6;
    S.ink(ctx, clkx, clky, clkx + Math.cos(ta - 1.6) * 11, clky + Math.sin(ta - 1.6) * 11, 1.8, 3);
    S.ink(ctx, clkx, clky, clkx + Math.cos(ta * 12) * 7, clky + Math.sin(ta * 12) * 7, 1.4, 4);
    // flickering fluorescent glow
    if (Math.sin(t * 9) > -0.3) S.wash(ctx, cx, y + 18, 120, 0.14);
  };

  // Dr. Walrus looming behind a desk, clipboard raised
  I.walrusLoom = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2;
    S.wash(ctx, cx, y + 90, 150, 0.4);
    // huge silhouette head (walrus)
    ctx.fillStyle = '#1c1820';
    ctx.beginPath(); ctx.ellipse(cx, y + 96, 92, 78, 0, 0, TAU); ctx.fill();
    // muzzle
    ctx.beginPath(); ctx.ellipse(cx, y + 128, 60, 40, 0, 0, TAU); ctx.fill();
    // tusks (paper-white)
    ctx.fillStyle = '#f6f1e4';
    S.roundBar(ctx, cx - 30, y + 150, 14, 44); S.roundBar(ctx, cx + 16, y + 150, 14, 44);
    // cold little glasses catching the light
    ctx.fillStyle = '#f6f1e4';
    ctx.beginPath(); ctx.arc(cx - 34, y + 70, 15, 0, TAU); ctx.arc(cx + 34, y + 70, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1820';
    ctx.beginPath(); ctx.arc(cx - 34, y + 70, 5, 0, TAU); ctx.arc(cx + 34, y + 70, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1820'; S.ink(ctx, cx - 19, y + 70, cx + 19, y + 70, 2.4, 2);
    // glare streak on glasses
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 40, y + 64); ctx.lineTo(cx - 30, y + 68); ctx.moveTo(cx + 28, y + 64); ctx.lineTo(cx + 38, y + 68); ctx.stroke();
    // desk + a raised clipboard
    ctx.fillStyle = '#1c1820';
    ctx.fillRect(x + 6, y + h - 34, w - 12, 30);
    ctx.save(); ctx.translate(x + w - 70, y + h - 70); ctx.rotate(0.2 + Math.sin(t * 1.5) * 0.03);
    ctx.fillStyle = '#f6f1e4'; ctx.fillRect(-22, -30, 44, 58);
    ctx.strokeStyle = '#1c1820'; S.inkRect(ctx, -22, -30, 44, 58, 2, 4);
    ctx.strokeStyle = 'rgba(28,24,32,0.6)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-16, -18 + i * 10); ctx.lineTo(14, -18 + i * 10); ctx.stroke(); }
    ctx.restore();
  };

  // a rubber stamp coming down onto the chart — the DIAGNOSIS
  I.labelStamp = function (ctx, x, y, w, h, t, panel) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2 + 20;
    // the chart line being stamped
    ctx.strokeStyle = 'rgba(28,24,32,0.5)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 120, cy + 20 + i * 16); ctx.lineTo(cx + 120, cy + 20 + i * 16); ctx.stroke(); }
    // the stamp mark (bounces down)
    const drop = Math.max(0, Math.sin(Math.min(t, 1.2) * 2.4)) * 40;
    const dy = cy - 70 + (t > 1.2 ? 0 : (40 - drop));
    const label = (typeof DATA !== 'undefined' && G.player && DATA.DIAG[G.player.diag]) ? DATA.DIAG[G.player.diag].name.toUpperCase() : 'A DIAGNOSIS';
    ctx.save(); ctx.translate(cx, Math.max(dy, cy - 30)); ctx.rotate(-0.08);
    ctx.strokeStyle = '#b23636'; ctx.fillStyle = '#b23636'; ctx.lineWidth = 3;
    ctx.font = 'bold 20px ui-monospace, monospace'; ctx.textAlign = 'center';
    const tw = Math.min(w - 40, ctx.measureText(label).width + 30);
    S.inkRect(ctx, -tw / 2, -22, tw, 44, 3, 6);
    ctx.fillText(label, 0, 7);
    ctx.restore();
    // the stamp handle above (retracting)
    if (t < 1.2) {
      ctx.fillStyle = '#1c1820';
      const hy = dy - 90 + drop;
      ctx.fillRect(cx - 34, hy - 40, 68, 26);
      ctx.fillRect(cx - 10, hy - 14, 20, 30);
    }
    // impact dust
    if (t > 1.1 && t < 1.5) { ctx.strokeStyle = 'rgba(178,54,54,0.5)'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; S.ink(ctx, cx + Math.cos(a) * 60, cy - 10 + Math.sin(a) * 20, cx + Math.cos(a) * 78, cy - 10 + Math.sin(a) * 26, 1.6, i); } }
  };

  // the floor opens beneath a small figure — the descent begins
  I.floorOpens = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2;
    // the crack / hole (grows)
    const open = Math.min(1, t * 0.7);
    ctx.fillStyle = '#1c1820';
    ctx.beginPath();
    ctx.ellipse(cx, y + h - 40, (w * 0.42) * open + 10, (30) * open + 6, 0, 0, TAU); ctx.fill();
    // darkness with faint doors below
    if (open > 0.5) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, y + h - 40, (w * 0.42) * open, 30 * open, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(180,175,165,0.25)'; ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) { ctx.strokeRect(cx + i * 40 - 10, y + h - 30 + Math.abs(i) * 4, 20, 40); }
      ctx.restore();
    }
    // small figure teetering at the edge, arms out
    const px = cx, py = y + h - 70 - open * 8;
    ctx.fillStyle = '#1c1820';
    ctx.beginPath(); ctx.ellipse(px, py, 10, 13, 0, 0, TAU); ctx.fill();
    S.inkCircle(ctx, px, py - 20, 10, 2.4, 2); ctx.fillStyle = '#f6f1e4';
    ctx.beginPath(); ctx.arc(px, py - 20, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1820';
    S.ink(ctx, px - 8, py - 4, px - 24, py - 14 - Math.sin(t * 6) * 4, 2.4, 1);  // arm
    S.ink(ctx, px + 8, py - 4, px + 24, py - 14 + Math.sin(t * 6) * 4, 2.4, 2);
    // motion lines (falling)
    if (open > 0.7) { ctx.strokeStyle = 'rgba(28,24,32,0.4)'; for (let i = 0; i < 5; i++) { const lx = x + 30 + i * (w - 60) / 4; S.ink(ctx, lx, y + 20, lx, y + 20 + 30 + Math.sin(t * 5 + i) * 8, 1.4, i); } }
  };

  // helper used by walrusLoom
  S.roundBar = function (ctx, x, y, w, h) { S.ILLUS._bar(ctx, x, y, w, h); };
  I._bar = function (ctx, x, y, w, h) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - w / 2); ctx.arc(x + w / 2, y + h - w / 2, w / 2, 0, Math.PI); ctx.closePath(); ctx.fill(); };
})(Story);

/* ============ STORY DATA ============
   Each scene: array of panels { art, stamp?, lines: [] | (G)=>[] }.
   Ordered as the chart is meant to be read. */
const STORY = {
  prologue: [
    { art: 'intakeRoom', stamp: 'INTAKE', lines: ['It started with something small.', 'Trouble sleeping. A little tired. The', 'ordinary weather of being a person.'] },
    { art: 'walrusLoom', stamp: 'CONSULT', lines: ['The doctor will see you now.', 'He sees everyone. That is the problem.', 'Five questions. He did not wait for', 'the answers.'] },
    { art: 'labelStamp', stamp: 'DX', lines: (G) => ['He found something.', 'He always finds something.', '', 'Everybody\'s got somethin — and now,', 'officially, so did you.'] },
    { art: 'floorOpens', stamp: 'ADMIT', lines: ['The paperwork went through.', 'The floor opened.', 'Down you go, into the wards.'] }
  ],
  ward5: [
    { art: 'hallOfDoors', stamp: 'WARD 5', lines: ['Ward 5. The doors all look the same', 'down here.', 'Behind each one, someone waiting to', 'give you a name for how you feel.'] }
  ],
  ward10: [
    { art: 'pillMountain', stamp: 'WARD 10', lines: (G) => {
        const D = (typeof DATA !== 'undefined' && G.player && DATA.DIAG[G.player.diag]) ? DATA.DIAG[G.player.diag].name : 'the condition';
        return ['Ward 10. The prescriptions add up.', 'A pill for the ' + D.toLowerCase() + '.', 'A pill for the pills. You have stopped', 'reading the labels.'];
      } }
  ],
  ward15: [
    { art: 'copayRegister', stamp: 'WARD 15', lines: ['Ward 15. Every step has a copay.', 'They take a little piece of you at the', 'counter and call it your share.', 'You paid. You always pay.'] }
  ],
  ward20: [
    { art: 'mirrorWard', stamp: 'WARD 20', lines: ['Ward 20. You have been in here so long', 'you answer to the chart.', 'You look for your face and find a', 'stack of forms wearing it.', 'But there is still someone under the paper.'] }
  ],
  ward50pre: [
    { art: 'foundersTower', stamp: 'WARD 50', lines: ['Ward 50. The top of the ladder.', 'A tower built of copays and slogans,', 'and at the very top, the man who', 'turned every feeling into a product line.'] }
  ],
  cure: [
    { art: 'cureCapsule', stamp: 'WARD 25', lines: ['They said there was a cure at the', 'bottom of all this.', 'Twenty-five wards. You reached it.', 'It glowed like it meant something.'] },
    { art: 'cureEmpty', stamp: 'OPENED', lines: ['You opened it.', 'There was nothing inside.', 'There was never anything inside.', 'Just a small mirror, and your own', 'tired face looking back.'] },
    { art: 'daylight', stamp: 'DISCH?', lines: ['There is no cure. There never was.', 'There is just you, still here, still', 'standing after all of it.', 'That is not nothing. That is the', 'whole entire thing.'] }
  ],
  founder: [
    { art: 'towerFalls', stamp: 'DELISTED', lines: ['You toppled him.', 'For one shining moment the ticker is', 'red and the tower is coming down.'] },
    { art: 'kindness', stamp: 'NOTE', lines: ['The machine is not gone. It never', 'really goes. But you did that — you,', 'with your tears and your bad sleep.', '', 'Everybody\'s got somethin. Be kind.', 'Including to yourself.'] }
  ]
};

/* chapter list for the STORY gallery (title → re-watch) */
const STORY_CHAPTERS = [
  { id: 'prologue',  title: 'Prologue — Intake' },
  { id: 'ward5',     title: 'Ward 5 — The Doors' },
  { id: 'ward10',    title: 'Ward 10 — The Pills' },
  { id: 'ward15',    title: 'Ward 15 — The Copay' },
  { id: 'ward20',    title: 'Ward 20 — The Mirror' },
  { id: 'cure',      title: 'Ward 25 — The Cure' },
  { id: 'ward50pre', title: 'Ward 50 — The Tower' },
  { id: 'founder',   title: 'Ward 50 — The Fall' }
];

/* ============ ILLUSTRATIONS, part 2 (interludes + climaxes) ============ */
(function (S) {
  const I = S.ILLUS;
  const bg = (ctx, x, y, w, h) => { ctx.fillStyle = '#f6f1e4'; ctx.fillRect(x, y, w, h); };

  // small ink helpers
  S.pill = function (ctx, cx, cy, w, hh) {
    const r = hh / 2;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 + r, cy - r); ctx.lineTo(cx + w / 2 - r, cy - r);
    ctx.arc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(cx - w / 2 + r, cy + r);
    ctx.arc(cx - w / 2 + r, cy, r, Math.PI / 2, Math.PI * 3 / 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1c1820'; ctx.lineWidth = 2; ctx.stroke();
  };
  S.heart = function (ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.85);
    ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.2, cx - s * 0.5, cy - s * 1.0, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.0, cx + s * 1.2, cy - s * 0.2, cx, cy + s * 0.85);
    ctx.closePath(); ctx.fill();
  };

  // an endless corridor of identical clinical doors (one-point perspective)
  I.hallOfDoors = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const vx = x + w / 2, vy = y + h * 0.46;
    ctx.strokeStyle = '#1c1820';
    S.ink(ctx, x, y, vx, vy, 2, 1); S.ink(ctx, x + w, y, vx, vy, 2, 2);
    S.ink(ctx, x, y + h, vx, vy, 2, 3); S.ink(ctx, x + w, y + h, vx, vy, 2, 4);
    for (let i = 1; i <= 5; i++) {
      const s = Math.pow(0.64, i);
      const dw = (w * 0.15) * s, dh = (h * 0.52) * s;
      const lx = vx - (w * 0.44) * s, rx = vx + (w * 0.44) * s;
      S.inkRect(ctx, lx, vy - dh / 2, dw, dh, 2, i);
      S.inkRect(ctx, rx - dw, vy - dh / 2, dw, dh, 2, i + 10);
      if (i % 2 === 0) { S.hatch(ctx, lx, vy - dh / 2, dw, dh, 5, -0.6, 0.12); S.hatch(ctx, rx - dw, vy - dh / 2, dw, dh, 5, -0.6, 0.12); }
      // door handles
      ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.arc(lx + dw - 4 * s, vy, 2 * s, 0, TAU); ctx.arc(rx - dw + 4 * s, vy, 2 * s, 0, TAU); ctx.fill();
    }
    // lone figure receding down the hall
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.ellipse(vx, vy + 30, 6, 9, 0, 0, TAU); ctx.fill();
    S.inkCircle(ctx, vx, vy + 16, 6, 2, 5); ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(vx, vy + 16, 4.5, 0, TAU); ctx.fill();
    // overhead lights receding (flicker)
    ctx.fillStyle = 'rgba(28,24,32,' + (0.4 + (Math.sin(t * 8) > 0 ? 0.15 : 0)) + ')';
    for (let i = 0; i < 4; i++) { const s = Math.pow(0.62, i + 1); ctx.fillRect(vx - 9 * s, vy - (h * 0.42) * Math.pow(0.74, i), 18 * s, 3 * s); }
  };

  // a mountain of prescriptions with a tiny figure dwarfed beside it
  I.pillMountain = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, base = y + h - 28;
    ctx.fillStyle = 'rgba(60,58,66,0.16)';
    ctx.beginPath(); ctx.moveTo(x + 44, base); ctx.quadraticCurveTo(cx, y + 44, x + w - 44, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1c1820'; ctx.lineWidth = 2;
    for (let i = 0; i < 46; i++) {
      const u = (i * 0.61803) % 1, v = (i * 4.32) % 1;
      const px = x + 54 + u * (w - 108);
      const hillY = base - (1 - Math.abs(px - cx) / (w / 2)) * (h - 96);
      const py = hillY + v * (base - hillY);
      const kind = i % 3;
      if (kind === 0) { ctx.save(); ctx.translate(px, py); ctx.rotate(i * 0.7); ctx.fillStyle = '#f6f1e4'; S.pill(ctx, 0, 0, 12, 6); ctx.restore(); }
      else if (kind === 1) { ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); S.inkCircle(ctx, px, py, 5, 1.6, i); }
      else { ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill(); S.inkCircle(ctx, px, py, 4.5, 1.6, i); ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.stroke(); }
    }
    // dwarfed figure at the foot of the pile
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.ellipse(x + 66, base - 8, 8, 11, 0, 0, TAU); ctx.fill();
    S.inkCircle(ctx, x + 66, base - 24, 8, 2.2, 3); ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(x + 66, base - 24, 6, 0, TAU); ctx.fill();
    // a couple pills tumbling down
    for (let i = 0; i < 3; i++) { const px = cx + (i - 1) * 34; const py = y + 34 + ((t * 55 + i * 40) % 80); ctx.save(); ctx.translate(px, py); ctx.rotate(t * 3 + i); ctx.fillStyle = '#f6f1e4'; S.pill(ctx, 0, 0, 11, 5); ctx.restore(); }
  };

  // the copay counter — paying with a piece of yourself
  I.copayRegister = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, cty = y + h - 66;
    ctx.strokeStyle = '#1c1820'; ctx.fillStyle = '#1c1820';
    ctx.fillRect(x + 30, cty, w - 60, 8);
    S.hatch(ctx, x + 30, cty + 8, w - 60, 38, 6, -0.6, 0.2);
    const rx = x + 74, ry = cty - 66;
    ctx.fillStyle = '#f6f1e4'; S.inkRect(ctx, rx, ry, 92, 66, 2.4, 1);
    ctx.fillStyle = '#f6f1e4'; ctx.fillRect(rx + 10, ry - 26, 72, 26); S.inkRect(ctx, rx + 10, ry - 26, 72, 26, 2, 2);
    ctx.fillStyle = '#b23636'; ctx.font = 'bold 16px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('$  ∞', rx + 46, ry - 7);
    ctx.fillStyle = '#1c1820'; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ctx.fillRect(rx + 14 + c * 18, ry + 14 + r * 15, 12, 10);
    // a hand placing a HEART on the counter
    const hy = cty - 26 + Math.sin(t * 2) * 4;
    ctx.fillStyle = '#b23636'; S.heart(ctx, cx + 128, hy, 15);
    ctx.strokeStyle = '#1c1820'; S.ink(ctx, x + w - 8, hy + 34, cx + 128, hy + 6, 6, 3);
    ctx.save(); ctx.translate(x + 120, y + 42); ctx.rotate(0.05); ctx.fillStyle = '#f6f1e4'; S.inkRect(ctx, -54, -17, 108, 32, 2, 4); ctx.fillStyle = '#1c1820'; ctx.font = 'bold 14px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('PAY HERE', 0, 5); ctx.restore();
    ctx.textAlign = 'left';
  };

  // a mirror whose reflection has become paperwork
  I.mirrorWard = function (ctx, x, y, w, h) {
    bg(ctx, x, y, w, h);
    const cy = y + h / 2;
    ctx.strokeStyle = '#1c1820'; S.ink(ctx, x + w / 2, y + 18, x + w / 2, y + h - 18, 3, 1);
    // real figure (left)
    const lx = x + w * 0.29;
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.ellipse(lx, cy + 36, 16, 22, 0, 0, TAU); ctx.fill();
    S.inkCircle(ctx, lx, cy, 18, 2.6, 2); ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(lx, cy, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.arc(lx - 6, cy - 2, 2.4, 0, TAU); ctx.arc(lx + 6, cy - 2, 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1820'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(lx, cy + 6, 5, Math.PI + 0.3, TAU - 0.3); ctx.stroke();
    // reflection made of forms (right)
    const rx = x + w * 0.71;
    ctx.fillStyle = '#f6f1e4'; S.inkRect(ctx, rx - 22, cy - 4, 44, 76, 2.4, 3);
    ctx.strokeStyle = 'rgba(28,24,32,0.55)'; ctx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(rx - 14, cy + 8 + i * 10); ctx.lineTo(rx + 14, cy + 8 + i * 10); ctx.stroke(); }
    ctx.save(); ctx.translate(rx, cy - 26); ctx.rotate(-0.1); ctx.strokeStyle = '#b23636'; ctx.fillStyle = '#b23636'; ctx.lineWidth = 2.4; S.inkRect(ctx, -30, -14, 60, 28, 2, 5); ctx.font = 'bold 13px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('PATIENT', 0, 5); ctx.restore();
    ctx.textAlign = 'left';
  };

  // the radiant "cure" capsule on a pedestal
  I.cureCapsule = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2 - 8;
    ctx.strokeStyle = 'rgba(28,24,32,0.32)';
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + t * 0.2; const r1 = 46, r2 = 46 + 18 + Math.sin(t * 3 + i) * 5; S.ink(ctx, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, 1.6, i); }
    S.wash(ctx, cx, cy, 72, 0.2);
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.moveTo(cx - 42, y + h - 22); ctx.lineTo(cx - 24, cy + 40); ctx.lineTo(cx + 24, cy + 40); ctx.lineTo(cx + 42, y + h - 22); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.5);
    ctx.fillStyle = '#f6f1e4'; S.pill(ctx, 0, 0, 66, 32);
    ctx.strokeStyle = '#1c1820'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke();
    ctx.restore();
  };

  // the capsule opened — empty, just a small mirror inside
  I.cureEmpty = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2 - 4;
    ctx.fillStyle = '#f6f1e4';
    ctx.save(); ctx.translate(cx - 44, cy + 10); ctx.rotate(-0.4); S.pill(ctx, 0, 0, 44, 30); ctx.restore();
    ctx.save(); ctx.translate(cx + 44, cy - 10); ctx.rotate(-0.4); S.pill(ctx, 0, 0, 44, 30); ctx.restore();
    // the mirror + a faint tired face
    ctx.fillStyle = '#cfc9bb'; S.inkRect(ctx, cx - 17, cy - 26, 34, 52, 2.4, 3);
    ctx.strokeStyle = 'rgba(28,24,32,0.45)'; ctx.lineWidth = 1.6; S.inkCircle(ctx, cx, cy - 2, 12, 1.6, 5);
    ctx.fillStyle = 'rgba(28,24,32,0.45)'; ctx.beginPath(); ctx.arc(cx - 4, cy - 4, 1.6, 0, TAU); ctx.arc(cx + 4, cy - 4, 1.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 4, cy + 4); ctx.lineTo(cx + 4, cy + 4); ctx.stroke();
    ctx.fillStyle = 'rgba(28,24,32,0.28)'; for (let i = 0; i < 8; i++) { const a = i * 0.9 + t; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 42, cy + Math.sin(a * 1.3) * 30 - ((t * 9) % 40), 1.4, 0, TAU); ctx.fill(); }
  };

  // the founder's tower — a ladder of copays & slogans
  I.foundersTower = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, levels = 7, seg = (h - 56) / levels;
    for (let i = 0; i < levels; i++) {
      const bw = (w * 0.5) * (1 - i * 0.09), by = y + h - 26 - i * seg, bh = seg - 3;
      ctx.fillStyle = '#f6f1e4'; S.inkRect(ctx, cx - bw / 2, by - bh, bw, bh, 2, i);
      ctx.fillStyle = '#1c1820'; ctx.font = 'bold ' + Math.max(11, Math.round(bh * 0.42)) + 'px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText(i % 2 ? '$ $ $' : '℞ ℞ ℞', cx, by - bh / 2 + bh * 0.16);
    }
    const topY = y + h - 26 - (levels - 1) * seg - seg;
    ctx.fillStyle = '#1c1820'; ctx.fillRect(cx - 6, topY - 16, 12, 16);
    S.inkCircle(ctx, cx, topY - 22, 6, 2, 3); ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(cx, topY - 22, 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1820'; S.ink(ctx, x + 10, y + h - 14, x + w - 10, y + h - 14, 1.6, 9);
    ctx.fillStyle = '#2c7a3a'; ctx.font = 'bold 12px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillText('▲ FEELINGS INC.  +' + (Math.floor(t * 37) % 89 + 10) + '%', x + 16, y + h - 3);
    ctx.textAlign = 'left';
  };

  // the tower coming down
  I.towerFalls = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2;
    for (let i = 0; i < 7; i++) {
      const p = (i * 0.61803) % 1;
      const bx = cx + (p - 0.5) * w * 0.7 + Math.sin(t * 2 + i) * 10;
      const by = y + 34 + ((t * 70 + i * 34) % (h - 50));
      ctx.save(); ctx.translate(bx, by); ctx.rotate(t * 1.4 + i);
      ctx.fillStyle = '#f6f1e4'; S.inkRect(ctx, -18, -12, 36, 24, 2, i);
      ctx.fillStyle = '#1c1820'; ctx.font = 'bold 12px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 4); ctx.restore();
    }
    for (let i = 0; i < 5; i++) { const px = cx + Math.sin(t * 3 + i * 2) * w * 0.4; const py = y + 26 + ((t * 46 + i * 50) % (h - 34)); ctx.save(); ctx.translate(px, py); ctx.rotate(t * 4 + i); ctx.fillStyle = '#f6f1e4'; S.inkRect(ctx, -8, -10, 16, 20, 1.4, i); ctx.restore(); }
    ctx.strokeStyle = '#b23636'; S.ink(ctx, x + 34, y + 40, x + w - 44, y + h - 44, 4, 1);
    ctx.fillStyle = '#b23636'; ctx.beginPath(); ctx.moveTo(x + w - 44, y + h - 44); ctx.lineTo(x + w - 70, y + h - 46); ctx.lineTo(x + w - 50, y + h - 68); ctx.closePath(); ctx.fill();
    ctx.font = 'bold 13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillText('▼ FEELINGS INC.  DELISTED', x + 16, y + 24); ctx.textAlign = 'left';
  };

  // a doorway to daylight, a figure stepping out
  I.daylight = function (ctx, x, y, w, h, t) {
    ctx.fillStyle = '#1c1820'; ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, dw = w * 0.38, dh = h * 0.84, dx = cx - dw / 2, dy = y + h - dh;
    const grd = ctx.createLinearGradient(0, dy, 0, dy + dh); grd.addColorStop(0, '#fbf6e8'); grd.addColorStop(1, '#efe6cf');
    ctx.fillStyle = grd; ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = 'rgba(255,240,200,0.45)'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const a = -0.55 + i * 0.18; ctx.beginPath(); ctx.moveTo(cx, dy + 18); ctx.lineTo(cx + Math.cos(a) * w, dy + 18 + Math.sin(a) * h); ctx.stroke(); }
    ctx.strokeStyle = '#000'; S.inkRect(ctx, dx, dy, dw, dh, 3, 1);
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.ellipse(cx, dy + dh - 42, 14, 20, 0, 0, TAU); ctx.fill();
    S.inkCircle(ctx, cx, dy + dh - 66, 15, 2.6, 2); ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.arc(cx, dy + dh - 66, 13, 0, TAU); ctx.fill();
  };

  // the warm closing note — a small sun and a figure at peace
  I.kindness = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2 + 22, sy = y + 66;
    S.wash(ctx, cx, sy, 72, 0.18);
    ctx.strokeStyle = 'rgba(200,150,60,0.55)';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 0.3; S.ink(ctx, cx + Math.cos(a) * 34, sy + Math.sin(a) * 34, cx + Math.cos(a) * (46 + Math.sin(t * 2 + i) * 4), sy + Math.sin(a) * (46 + Math.sin(t * 2 + i) * 4), 1.4, i); }
    ctx.strokeStyle = '#1c1820'; S.inkCircle(ctx, cx, sy, 26, 2.4, 3);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, sy + 1, 12, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.arc(cx - 9, sy - 5, 2, 0, TAU); ctx.arc(cx + 9, sy - 5, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.ellipse(cx, cy + 30, 13, 18, 0, 0, TAU); ctx.fill();
    S.inkCircle(ctx, cx, cy, 15, 2.6, 5); ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1c1820'; ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2.2, 0, TAU); ctx.arc(cx + 5, cy - 2, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c1820'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, cy + 2, 5, 0.15, Math.PI - 0.15); ctx.stroke();
  };
})(Story);
