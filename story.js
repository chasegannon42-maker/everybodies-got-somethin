/* =========================================================
   EVERYBODIES GOT SOMETHIN — story.js
   CHART NOTES: bright in-engine cutscenes. Each panel is a
   staged scene built from the REAL game models (the walrus,
   your patient, the bosses) with an RPG dialogue box below.
   State: 'cutscene'.
   ========================================================= */
'use strict';

const Story = {
  active: false,
  scene: null, sceneId: null, idx: 0, onDone: null,
  t: 0, panelT: 0, typed: 0, fullText: '', fade: 0, trans: 0,
  _init: false, ctx: null, _tickAt: 0,
  _plCache: {}, _bossCache: {},

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
    if (typeof SFX !== 'undefined' && SFX.setMusic) SFX.setMusic('cutscene');
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
  skipScene() { if (this.active) { if (typeof G !== 'undefined' && this.sceneId === 'orientation') G._orientSkipped = true; this.finish(); } },
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
    if (sx > CW - 150 && sy < 52) { this.skipScene(); return; }  // skip button (top-right)
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

  /* ---------- actor helpers: the REAL in-game models ---------- */
  _playerModel(diag) {
    const key = diag || 'none';
    if (!this._plCache[key]) {
      const pl = new Player(key);
      pl.x = 0; pl.y = 0; pl.aimAng = -Math.PI / 2; pl.iframes = 0; pl.moving = false;
      if (key === 'bipolar') pl.mania = true;
      this._plCache[key] = pl;
    }
    return this._plCache[key];
  },
  drawYou(x, y, s, opts) {
    const ctx = this.ctx;
    const diag = (opts && opts.diag) || (G.player ? G.player.diag : 'none');
    const pl = this._playerModel(diag);
    pl.lastHitT = 999; pl.wired = false; pl.napActive = 0; pl.hurtFlash = 0; pl.dashT = 0; pl.cocoonT = 0;
    const prev = Render.ctx; Render.ctx = ctx;
    ctx.save();
    ctx.translate(x, y + Math.sin(this.panelT * 1.8) * 2);
    if (opts && opts.flip) ctx.scale(-s, s); else ctx.scale(s, s);
    try { Render.drawPlayer(pl, { t: this.panelT }); } catch (e) { }
    ctx.restore();
    Render.ctx = prev;
  },
  drawDoc(x, y, s, opts) {
    const ctx = this.ctx;
    // white coat under the good doctor's face
    ctx.save(); ctx.translate(x, y);
    const bob = Math.sin(this.panelT * 2) * 3 * s;
    ctx.fillStyle = '#f0eee6';
    Render.rr(ctx, -66 * s, 40 * s + bob, 132 * s, 96 * s, 26 * s); ctx.fill();
    ctx.strokeStyle = '#c9c4b4'; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.moveTo(0, 46 * s + bob); ctx.lineTo(0, 118 * s + bob); ctx.stroke();
    ctx.fillStyle = '#8fb4c8';   // little clip-on badge
    Render.rr(ctx, 26 * s, 62 * s + bob, 26 * s, 18 * s, 3 * s); ctx.fill();
    ctx.restore();
    Render.drawWalrusFace(ctx, x, y, s, this.panelT);
  },
  drawBossActor(id, x, y, s, pose) {
    const ctx = this.ctx;
    if (!this._bossCache[id]) {
      try {
        const b = new Boss(id, 1, { player: { flags: {} }, chronic: false, easy: false });
        b.x = 0; b.y = 0; b.vulnerable = (id !== 'priorauth');
        this._bossCache[id] = b;
      } catch (e) { return; }
    }
    const b = this._bossCache[id];
    if (pose === 'low') b.hp = b.maxhp * 0.3; else b.hp = b.maxhp;
    b.t = this.panelT; b.introT = 0; b.dead = false; b.deathT = 0; b.hitFlash = 0;
    b.spiralA = this.panelT * 2;
    const prev = Render.ctx; Render.ctx = ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    try { Render.drawBoss(b, { t: this.panelT, player: { x: 0, y: -140, flags: {}, diag: 'adhd' }, enemies: [], boss: null }); } catch (e) { }
    ctx.restore();
    Render.ctx = prev;
  },

  /* ---------- scene furniture (bright, chunky, game-styled) ---------- */
  _room(wallA, wallB, floorA, floorB, horizon) {
    const ctx = this.ctx, hz = horizon || CH * 0.58;
    const wg = ctx.createLinearGradient(0, 0, 0, hz);
    wg.addColorStop(0, wallA); wg.addColorStop(1, wallB);
    ctx.fillStyle = wg; ctx.fillRect(0, 0, CW, hz);
    const fg = ctx.createLinearGradient(0, hz, 0, CH);
    fg.addColorStop(0, floorA); fg.addColorStop(1, floorB);
    ctx.fillStyle = fg; ctx.fillRect(0, hz, CW, CH - hz);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, hz - 6, CW, 6);                        // baseboard highlight
    ctx.fillStyle = 'rgba(40,30,45,0.18)';
    ctx.fillRect(0, hz, CW, 4);                            // baseboard shadow
    // soft ceiling light pools
    for (let i = 0; i < 3; i++) {
      const lx = CW * (0.22 + i * 0.28);
      const lg = ctx.createRadialGradient(lx, 40, 10, lx, 40, 220);
      lg.addColorStop(0, 'rgba(255,250,230,0.30)'); lg.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, 40, 220, 0, TAU); ctx.fill();
    }
  },
  _spot(x, y, rx, a) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(30,22,36,' + (a || 0.18) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.3, 0, 0, TAU); ctx.fill();
  },
  _door(x, y, w, h, clr) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(40,30,45,0.16)'; Render.rr(ctx, x - w / 2 + 5, y - h + 8, w, h, 8); ctx.fill();
    ctx.fillStyle = clr; Render.rr(ctx, x - w / 2, y - h, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; Render.rr(ctx, x - w / 2 + 5, y - h + 5, w - 10, 12, 5); ctx.fill();
    ctx.fillStyle = 'rgba(230,240,250,0.9)'; Render.rr(ctx, x - w * 0.22, y - h * 0.82, w * 0.44, h * 0.3, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(60,45,70,0.5)'; ctx.lineWidth = 2; Render.rr(ctx, x - w * 0.22, y - h * 0.82, w * 0.44, h * 0.3, 5); ctx.stroke();
    ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(x + w * 0.3, y - h * 0.42, 4.5, 0, TAU); ctx.fill();
  },
  _chair(x, y, s, clr) {
    const ctx = this.ctx, c = clr || '#8a7a68';
    const dark = 'rgba(40,30,45,0.25)';
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 20 * s, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c;
    Render.rr(ctx, x - 17 * s, y - 46 * s, 8 * s, 46 * s, 3 * s); ctx.fill();     // back post
    Render.rr(ctx, x - 17 * s, y - 52 * s, 34 * s, 16 * s, 5 * s); ctx.fill();    // back rest
    Render.rr(ctx, x - 17 * s, y - 27 * s, 36 * s, 9 * s, 4 * s); ctx.fill();     // seat
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    Render.rr(ctx, x - 15 * s, y - 50 * s, 30 * s, 5 * s, 3 * s); ctx.fill();
    ctx.fillStyle = c;
    Render.rr(ctx, x - 15 * s, y - 19 * s, 6 * s, 19 * s, 2 * s); ctx.fill();     // legs
    Render.rr(ctx, x + 11 * s, y - 19 * s, 6 * s, 19 * s, 2 * s); ctx.fill();
  },
  _pillProp(x, y, s, rot, cA, cB) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = cA; Render.rr(ctx, -16 * s, -8 * s, 16 * s, 16 * s, 8 * s); ctx.fill();
    ctx.fillStyle = cB; Render.rr(ctx, 0, -8 * s, 16 * s, 16 * s, 8 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(-6 * s, -3 * s, 5 * s, 2.6 * s, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,45,70,0.35)'; ctx.lineWidth = 1.6 * s;
    Render.rr(ctx, -16 * s, -8 * s, 32 * s, 16 * s, 8 * s); ctx.stroke();
    ctx.restore();
  },
  _coin(x, y, s) {
    const ctx = this.ctx;
    ctx.fillStyle = '#e0b93e'; ctx.beginPath(); ctx.arc(x, y, 12 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a8862a'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.arc(x, y, 12 * s, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#a8862a'; ctx.font = 'bold ' + Math.round(13 * s) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('¢', x, y + 4.5 * s);
  },

  /* ---------- master draw: scene + dialogue box ---------- */
  draw() {
    const ctx = this.ctx; if (!ctx || !this.active) return;
    const p = this.scene[this.idx];
    ctx.save();
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#17131a'; ctx.fillRect(0, 0, CW, CH);

    // ---- the scene (fades in, slides slightly on panel turn) ----
    ctx.save();
    ctx.globalAlpha = this.fade * (1 - this.trans * 0.9);
    ctx.translate(this.trans * 46, 0);
    const fn = this.SCENES[p.art] || this.SCENES._placeholder;
    try { fn.call(this, ctx, this.panelT, p); } catch (e) { }
    ctx.restore();

    // gentle vignette so the scene sits in the frame
    const vig = ctx.createRadialGradient(CW / 2, CH * 0.4, CH * 0.35, CW / 2, CH * 0.4, CH * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(12,9,16,0.42)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

    // ---- dialogue box ----
    const BX = 26, BH = 138, BY = CH - BH - 20, BW = CW - 52;
    ctx.globalAlpha = this.fade;
    ctx.fillStyle = 'rgba(16,12,20,0.5)'; this._round(ctx, BX + 4, BY + 6, BW, BH, 14); ctx.fill();
    const bg = ctx.createLinearGradient(0, BY, 0, BY + BH);
    bg.addColorStop(0, 'rgba(38,30,46,0.97)'); bg.addColorStop(1, 'rgba(24,19,30,0.97)');
    ctx.fillStyle = bg; this._round(ctx, BX, BY, BW, BH, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(240,232,216,0.85)'; ctx.lineWidth = 3;
    this._round(ctx, BX, BY, BW, BH, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,232,216,0.22)'; ctx.lineWidth = 1;
    this._round(ctx, BX + 5, BY + 5, BW - 10, BH - 10, 10); ctx.stroke();

    // nameplate chip (the panel's chart stamp)
    if (p.stamp) {
      ctx.font = 'bold 14px Impact,"Arial Black",sans-serif';
      const tw = ctx.measureText(p.stamp).width + 26;
      ctx.fillStyle = '#e8c84c'; this._round(ctx, BX + 18, BY - 14, tw, 26, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(60,45,20,0.55)'; ctx.lineWidth = 2; this._round(ctx, BX + 18, BY - 14, tw, 26, 8); ctx.stroke();
      ctx.fillStyle = '#3a2d10'; ctx.textAlign = 'center';
      ctx.fillText(p.stamp, BX + 18 + tw / 2, BY + 4);
    }

    // typewritten narration
    const shown = this.fullText.slice(0, Math.floor(this.typed));
    ctx.fillStyle = '#f0e8d8'; ctx.textAlign = 'left';
    ctx.font = 'bold 17px "Trebuchet MS","Segoe UI",Verdana,sans-serif';
    const tx = BX + 26, ty0 = BY + 36;
    const lines = shown.split('\n');
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], tx, ty0 + i * 23);
    if (this.typed < this.fullText.length && Math.floor(this.t * 2) % 2 === 0) {
      const last = lines[lines.length - 1] || '';
      const cw2 = ctx.measureText(last).width;
      ctx.fillStyle = 'rgba(240,232,216,0.8)';
      ctx.fillRect(tx + cw2 + 3, ty0 + (lines.length - 1) * 23 - 13, 9, 16);
    }

    // continue arrow + sheet counter
    if (this.typed >= this.fullText.length && this.trans <= 0) {
      ctx.globalAlpha = this.fade * (0.55 + Math.sin(this.t * 4) * 0.35);
      ctx.fillStyle = '#e8c84c'; ctx.textAlign = 'right';
      ctx.font = 'bold 18px Impact,"Arial Black",sans-serif';
      ctx.fillText('▸', BX + BW - 20, BY + BH - 14);
      ctx.globalAlpha = this.fade;
    }
    ctx.fillStyle = 'rgba(240,232,216,0.4)'; ctx.textAlign = 'right';
    ctx.font = 'bold 11px "Trebuchet MS","Segoe UI",Verdana,sans-serif';
    ctx.fillText(this.idx + 1 + ' / ' + this.scene.length, BX + BW - 18, BY + 18);

    // hint under the box
    ctx.globalAlpha = this.fade * 0.55;
    ctx.fillStyle = '#8a7c68'; ctx.textAlign = 'center'; ctx.font = 'bold 12px "Trebuchet MS","Segoe UI",Verdana,sans-serif';
    ctx.fillText((typeof Input !== 'undefined' && Input.usingTouch) ? 'tap to continue' : 'space / click to continue', CW / 2, CH - 6);
    ctx.globalAlpha = this.fade;

    // skip button (top-right)
    ctx.fillStyle = 'rgba(30,24,32,0.62)'; this._round(ctx, CW - 138, 14, 116, 30, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(240,232,216,0.35)'; ctx.lineWidth = 1.5; this._round(ctx, CW - 138, 14, 116, 30, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(240,232,216,0.85)'; ctx.textAlign = 'center';
    ctx.font = 'bold 13px Impact,"Arial Black",sans-serif';
    ctx.fillText('SKIP ⏭', CW - 80, 34);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  },

  _round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  },

  SCENES: {}   // filled below
};

/* ============ SCENES (bright, in-engine staging) ============ */
(function (S) {
  const SC = S.SCENES;
  const MIDY = 385;   // actor baseline (dialogue box starts ~CH-158)

  SC._placeholder = function (ctx, t) {
    this._room('#c8bfd4', '#a89cc0', '#b0a894', '#948a76', CH * 0.58);
    this.drawYou(CW / 2, MIDY, 1.6);
  };

  /* -- prologue -- */
  SC.intakeRoom = function (ctx, t) {   // a bright waiting room, you in the middle of it
    this._room('#cfe4e2', '#a8ccc8', '#cbbfa4', '#a89a7e', CH * 0.6);
    for (let i = 0; i < 4; i++) this._chair(150 + i * 92, CH * 0.6 - 4, 1.15, '#7a8a90');
    for (let i = 0; i < 3; i++) this._chair(640 + i * 92, CH * 0.6 - 4, 1.15, '#7a8a90');
    // wall clock
    ctx.strokeStyle = '#5a6a70'; ctx.lineWidth = 4; ctx.fillStyle = '#f2f4f0';
    ctx.beginPath(); ctx.arc(CW / 2, 120, 34, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a4a50'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(CW / 2, 120); ctx.lineTo(CW / 2, 98); ctx.moveTo(CW / 2, 120); ctx.lineTo(CW / 2 + 16, 128); ctx.stroke();
    // PLEASE WAIT sign
    ctx.fillStyle = '#e8dcc0'; Render.rr(ctx, CW / 2 - 92, 170, 184, 34, 6); ctx.fill();
    ctx.fillStyle = '#7a6a4a'; ctx.font = 'bold 16px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PLEASE WAIT', CW / 2, 193);
    this._spot(CW / 2, MIDY + 58, 90);
    this.drawYou(CW / 2, MIDY, 1.9);
  };

  SC.walrusLoom = function (ctx, t) {   // the doctor looms across the desk
    this._room('#d8cfc0', '#bcae9a', '#a09078', '#84765e', CH * 0.62);
    // framed diploma
    ctx.fillStyle = '#f0ead6'; Render.rr(ctx, 96, 96, 120, 86, 4); ctx.fill();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 5; Render.rr(ctx, 96, 96, 120, 86, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,70,50,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(112, 122); ctx.lineTo(200, 122); ctx.moveTo(112, 140); ctx.lineTo(200, 140); ctx.moveTo(130, 158); ctx.lineTo(182, 158); ctx.stroke();
    // the desk
    ctx.fillStyle = '#8a6a44'; Render.rr(ctx, CW / 2 - 30, CH * 0.62 - 6, 460, 120, 10); ctx.fill();
    ctx.fillStyle = '#9d7c52'; Render.rr(ctx, CW / 2 - 30, CH * 0.62 - 18, 460, 22, 8); ctx.fill();
    // clipboard on the desk
    ctx.save(); ctx.translate(CW / 2 + 120, CH * 0.62 + 6); ctx.rotate(0.08);
    ctx.fillStyle = '#8a6a3a'; Render.rr(ctx, -34, -24, 68, 48, 5); ctx.fill();
    ctx.fillStyle = '#f4ecd8'; Render.rr(ctx, -29, -19, 58, 38, 3); ctx.fill();
    ctx.strokeStyle = '#c05050'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.moveTo(-20, 4); ctx.lineTo(8, 4); ctx.stroke();
    ctx.restore();
    // you, small, this side of the desk — him, enormous
    this._spot(240, MIDY + 72, 80);
    this.drawYou(240, MIDY + 16, 1.65);
    this._spot(CW / 2 + 190, CH * 0.62 - 20, 150, 0.14);
    this.drawDoc(CW / 2 + 190, 240, 1.55);
  };

  SC.vhs = function (ctx, t) {   // WELCOME TO THE WARD (1987) -- tracking damaged, chroma bleeding
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = 'rgba(200,200,210,' + (Math.random() * 0.08) + ')'; ctx.fillRect(Math.random() * CW, Math.random() * CH, 2, 2); }
    const tb = (t * 47) % (CH + 120) - 60;   // the tracking bar, forever
    ctx.fillStyle = 'rgba(220,220,235,0.10)'; ctx.fillRect(0, tb, CW, 26);
    ctx.fillStyle = 'rgba(120,220,180,0.05)'; ctx.fillRect(0, tb + 30, CW, 8);
    ctx.save(); ctx.translate(CW / 2 + Math.sin(t * 9) * 1.6, CH * 0.34);
    ctx.fillStyle = '#d8d4c8'; ctx.font = 'bold 34px "Courier New", monospace'; ctx.textAlign = 'center';
    ctx.fillText('WELCOME TO THE WARD', 0, 0);
    ctx.fillStyle = 'rgba(224,120,120,0.5)'; ctx.fillText('WELCOME TO THE WARD', 2.4, 1.2);
    ctx.fillStyle = '#8fa89a'; ctx.font = '16px "Courier New", monospace';
    ctx.fillText('A HealthCorp Family Orientation -- 1987', 0, 34);
    ctx.restore();
    ctx.fillStyle = '#e8dcc0'; ctx.font = 'bold 13px "Courier New", monospace'; ctx.textAlign = 'left';
    ctx.fillText('PLAY >', 26, 34);
    if (Math.sin(t * 2.2) > 0) { ctx.textAlign = 'right'; ctx.fillText('SP 0:0' + (Math.floor(t) % 10), CW - 26, 34); }
    for (let y = 0; y < CH; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, CW, 1); }
  };

  SC.labelStamp = function (ctx, t) {   // the diagnosis lands
    const D = (typeof DATA !== 'undefined' && G.player && DATA.DIAG[G.player.diag]) ? DATA.DIAG[G.player.diag] : null;
    const clr = D ? D.color : '#b86bff';
    this._room('#d4cade', '#b2a4c6', '#b0a894', '#93897a', CH * 0.6);
    this._spot(CW / 2, MIDY + 62, 96);
    this.drawYou(CW / 2, MIDY, 2.0);
    // the big label card swinging down overhead
    const drop = Math.min(1, t * 1.6), yy = -80 + drop * 210 + Math.sin(Math.max(0, t - 0.8) * 2.2) * 4;
    ctx.save(); ctx.translate(CW / 2, yy); ctx.rotate(Math.sin(t * 1.4) * 0.04);
    ctx.fillStyle = 'rgba(30,22,38,0.25)'; Render.rr(ctx, -134, 66, 268, 16, 8); ctx.fill();
    ctx.fillStyle = '#f6f1e2'; Render.rr(ctx, -140, -44, 280, 108, 12); ctx.fill();
    ctx.strokeStyle = clr; ctx.lineWidth = 6; Render.rr(ctx, -140, -44, 280, 108, 12); ctx.stroke();
    ctx.fillStyle = '#8a7c68'; ctx.font = 'bold 13px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HELLO, MY DIAGNOSIS IS', 0, -18);
    ctx.fillStyle = clr; ctx.font = 'bold 30px Impact,"Arial Black",sans-serif';
    const nm = D ? D.name : 'SOMETHIN';
    ctx.fillText(nm.length > 22 ? nm.slice(0, 21) + '…' : nm, 0, 18);
    ctx.fillStyle = '#8a7c68'; ctx.font = 'bold 12px "Trebuchet MS","Segoe UI",Verdana,sans-serif';
    ctx.fillText('(everybody\'s got somethin)', 0, 46);
    ctx.restore();
  };

  SC.floorOpens = function (ctx, t) {   // the trapdoor yawns open
    this._room('#c6ccd8', '#a2aabc', '#b0a894', '#8e8472', CH * 0.56);
    this._door(180, CH * 0.56, 96, 170, '#7a8a99');
    this._door(CW - 180, CH * 0.56, 96, 170, '#7a8a99');
    // the hole
    ctx.fillStyle = '#241c2e'; ctx.beginPath(); ctx.ellipse(CW / 2, MIDY + 66, 130, 42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a3c5a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(CW / 2, MIDY + 66, 130, 42, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(120,100,150,0.28)';
    ctx.beginPath(); ctx.ellipse(CW / 2, MIDY + 66, 96, 28, 0, 0, TAU); ctx.fill();
    // a ladder into the dark
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(CW / 2 - 26, MIDY + 48); ctx.lineTo(CW / 2 - 26, MIDY + 96); ctx.moveTo(CW / 2 + 26, MIDY + 48); ctx.lineTo(CW / 2 + 26, MIDY + 96); ctx.stroke();
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(CW / 2 - 26, MIDY + 58 + i * 15); ctx.lineTo(CW / 2 + 26, MIDY + 58 + i * 15); ctx.stroke(); }
    this._spot(CW / 2 - 190, MIDY + 62, 84);
    this.drawYou(CW / 2 - 190, MIDY + 4, 1.8);
  };

  /* -- interludes -- */
  SC.hallOfDoors = function (ctx, t) {   // ward 5: identical doors forever
    this._room('#c2ccd6', '#9aa6ba', '#a89a82', '#877a64', CH * 0.58);
    const xs = [120, 300, 480, 660, 840];
    for (const dx of xs) this._door(dx, CH * 0.58, 88, 158, '#7a8a99');
    for (const dx of xs) {   // ward plates
      ctx.fillStyle = '#e8dcc0'; Render.rr(ctx, dx - 22, CH * 0.58 - 190, 44, 20, 4); ctx.fill();
      ctx.fillStyle = '#7a6a4a'; ctx.font = 'bold bold 12px "Trebuchet MS","Segoe UI",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('5', dx, CH * 0.58 - 175);
    }
    this._spot(CW / 2, MIDY + 74, 86);
    this.drawYou(CW / 2, MIDY + 16, 1.8);
  };

  SC.pillMountain = function (ctx, t) {   // ward 10: the prescriptions add up
    this._room('#d8d0c2', '#bcae9c', '#b4a68c', '#93876e', CH * 0.6);
    // a cheerful, horrible mound of pills
    const combos = [['#e05a6a', '#f0f0e8'], ['#5a9de0', '#f0f0e8'], ['#8fd05a', '#ffffff'], ['#e8c84c', '#f0f0e8'], ['#b86bff', '#ffffff'], ['#43b8a5', '#f0ead8']];
    let k = 0;
    for (let row = 5; row >= 0; row--) {
      const n = row + 3, y = CH * 0.6 + 26 - (5 - row) * 26;
      for (let i = 0; i < n; i++) {
        const x = CW / 2 + (i - (n - 1) / 2) * 42 + ((5 - row) % 2 ? 12 : -8);
        const c = combos[(k++) % combos.length];
        this._pillProp(x, y, 1.25, ((k * 37) % 10 - 5) * 0.06, c[0], c[1]);
      }
    }
    this._spot(200, MIDY + 74, 84);
    this.drawYou(200, MIDY + 16, 1.8);
  };

  SC.copayRegister = function (ctx, t) {   // ward 15: every step has a copay
    this._room('#cfd8cc', '#a8b8a6', '#b0a48a', '#8e8268', CH * 0.6);
    // the counter + register
    ctx.fillStyle = '#8a6a44'; Render.rr(ctx, CW / 2 + 10, CH * 0.6 - 40, 330, 150, 10); ctx.fill();
    ctx.fillStyle = '#9d7c52'; Render.rr(ctx, CW / 2 + 2, CH * 0.6 - 54, 346, 24, 8); ctx.fill();
    ctx.fillStyle = '#5a6a72'; Render.rr(ctx, CW / 2 + 60, CH * 0.6 - 128, 130, 80, 8); ctx.fill();
    ctx.fillStyle = '#c8e0d8'; Render.rr(ctx, CW / 2 + 70, CH * 0.6 - 118, 110, 34, 4); ctx.fill();
    ctx.fillStyle = '#3a5a4a'; ctx.font = 'bold 17px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('¢ 9999', CW / 2 + 125, CH * 0.6 - 94);
    // coins arcing from you to the register
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.55 + i * 0.25) % 1);
      const cx = 300 + u * (CW / 2 - 190), cy = MIDY - 30 - Math.sin(u * Math.PI) * 90;
      this._coin(cx, cy, 1 - u * 0.25);
    }
    this._spot(280, MIDY + 74, 84);
    this.drawYou(280, MIDY + 16, 1.8);
  };

  SC.mirrorWard = function (ctx, t) {   // ward 20: the chart wearing your face
    this._room('#ccc4d8', '#a89cc0', '#aaa08c', '#8a8070', CH * 0.6);
    // the mirror
    ctx.fillStyle = '#8a6a44'; Render.rr(ctx, CW / 2 + 60, 120, 220, 300, 14); ctx.fill();
    ctx.fillStyle = '#cfe0e8'; Render.rr(ctx, CW / 2 + 74, 134, 192, 272, 10); ctx.fill();
    const sheen = ctx.createLinearGradient(CW / 2 + 74, 134, CW / 2 + 266, 406);
    sheen.addColorStop(0, 'rgba(255,255,255,0.5)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,0.25)');
    ctx.fillStyle = sheen; Render.rr(ctx, CW / 2 + 74, 134, 192, 272, 10); ctx.fill();
    // in the mirror: a stack of forms wearing your silhouette
    ctx.save(); Render.rr(ctx, CW / 2 + 74, 134, 192, 272, 10); ctx.clip();
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(CW / 2 + 170 + (i - 1) * 8, 300 + i * 6); ctx.rotate((i - 1) * 0.08);
      ctx.fillStyle = '#f4ecd8'; Render.rr(ctx, -46, -62, 92, 124, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,50,0.35)'; ctx.lineWidth = 2;
      for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(-32, -40 + l * 20); ctx.lineTo(32, -40 + l * 20); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(60,45,70,0.5)';
    ctx.beginPath(); ctx.arc(CW / 2 + 170, 240, 26, 0, TAU); ctx.fill();   // the face-shaped hole in the paper
    ctx.restore();
    ctx.strokeStyle = '#6a5438'; ctx.lineWidth = 4; Render.rr(ctx, CW / 2 + 74, 134, 192, 272, 10); ctx.stroke();
    this._spot(CW / 2 - 160, MIDY + 74, 86);
    this.drawYou(CW / 2 - 160, MIDY + 16, 1.85);
  };

  SC.foundersTower = function (ctx, t) {   // ward 50 approach
    // dusk sky
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#3a3454'); sky.addColorStop(0.55, '#6a5474'); sky.addColorStop(1, '#8a6a64');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#4c4258'; ctx.fillRect(0, CH * 0.72, CW, CH * 0.28);
    // the tower of money
    const bx = CW / 2 + 120;
    for (let i = 0; i < 6; i++) {
      const w = 186 - i * 15, y = CH * 0.72 - (i + 1) * 56;
      ctx.fillStyle = i % 2 ? '#4a7a4a' : '#568a56';
      Render.rr(ctx, bx - w / 2, y, w, 52, 6); ctx.fill();
      ctx.fillStyle = 'rgba(230,240,200,0.75)';
      for (let wnd = 0; wnd < Math.max(2, 5 - i); wnd++) Render.rr(ctx, bx - w / 2 + 14 + wnd * 34, y + 14, 20, 24, 3), ctx.fill();
      ctx.fillStyle = '#8fd05a'; ctx.font = 'bold 15px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', bx + w / 2 - 16, y + 34);
    }
    // the founder at the top, in the last light
    this.drawBossActor('founder', bx, CH * 0.72 - 6 * 56 - 40, 0.62, 'low');
    this._spot(220, 470, 74, 0.26);
    this.drawYou(220, 428, 1.7);
  };

  /* -- the cure -- */
  SC.cureCapsule = function (ctx, t) {   // the radiant capsule
    this._room('#d8d2c0', '#c0b49a', '#b4a68c', '#93876e', CH * 0.62);
    const glow = ctx.createRadialGradient(CW / 2, 260, 30, CW / 2, 260, 300);
    glow.addColorStop(0, 'rgba(255,225,140,0.55)'); glow.addColorStop(1, 'rgba(255,225,140,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 10; i++) {   // rays
      const a = (i / 10) * TAU + t * 0.25;
      ctx.strokeStyle = 'rgba(255,220,120,0.35)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(CW / 2 + Math.cos(a) * 96, 260 + Math.sin(a) * 96);
      ctx.lineTo(CW / 2 + Math.cos(a) * (150 + Math.sin(t * 2 + i) * 12), 260 + Math.sin(a) * (150 + Math.sin(t * 2 + i) * 12)); ctx.stroke();
    }
    // pedestal
    ctx.fillStyle = '#a89478'; Render.rr(ctx, CW / 2 - 70, CH * 0.62 - 6, 140, 74, 8); ctx.fill();
    ctx.fillStyle = '#c0ac8c'; Render.rr(ctx, CW / 2 - 80, CH * 0.62 - 18, 160, 22, 8); ctx.fill();
    // the capsule itself (big, gold and white)
    ctx.save(); ctx.translate(CW / 2, 262 + Math.sin(t * 1.6) * 6); ctx.rotate(-0.5);
    ctx.fillStyle = '#f6f0dc'; Render.rr(ctx, -84, -40, 84, 80, 40); ctx.fill();
    ctx.fillStyle = '#e8c84c'; Render.rr(ctx, 0, -40, 84, 80, 40); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-38, -18, 24, 12, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,30,0.4)'; ctx.lineWidth = 4; Render.rr(ctx, -84, -40, 168, 80, 40); ctx.stroke();
    ctx.restore();
    this._spot(CW / 2 - 210, MIDY + 74, 86);
    this.drawYou(CW / 2 - 210, MIDY + 16, 1.85);
  };

  SC.cureEmpty = function (ctx, t) {   // opened: nothing inside but a mirror
    this._room('#d0cabc', '#b2a795', '#aca084', '#8b7f66', CH * 0.62);
    // capsule halves, discarded
    ctx.save(); ctx.translate(CW / 2 - 150, CH * 0.62 + 26); ctx.rotate(0.5);
    ctx.fillStyle = '#f6f0dc'; Render.rr(ctx, -60, -30, 60, 60, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,30,0.35)'; ctx.lineWidth = 3.5; Render.rr(ctx, -60, -30, 60, 60, 30); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(CW / 2 + 170, CH * 0.62 + 40); ctx.rotate(-0.35);
    ctx.fillStyle = '#e8c84c'; Render.rr(ctx, 0, -30, 60, 60, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,30,0.35)'; ctx.lineWidth = 3.5; Render.rr(ctx, 0, -30, 60, 60, 30); ctx.stroke();
    ctx.restore();
    // the little hand mirror between them
    ctx.save(); ctx.translate(CW / 2, CH * 0.62 - 26);
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, 74); ctx.stroke();
    ctx.fillStyle = '#8a6a44'; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
    ctx.fillStyle = '#cfe0e8'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-12, -12, 14, 8, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    this._spot(CW / 2 - 240, MIDY + 74, 86);
    this.drawYou(CW / 2 - 240, MIDY + 16, 1.85);
  };

  SC.daylight = function (ctx, t) {   // the way out is bright
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#9ecbe8'); sky.addColorStop(0.6, '#cfe4ea'); sky.addColorStop(1, '#e8e2c8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    // sun + rays
    const sunX = CW / 2 + 190, sunY = 150;
    const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
    sg.addColorStop(0, 'rgba(255,240,180,0.95)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, 190, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(sunX, sunY, 44, 0, TAU); ctx.fill();
    // grass
    ctx.fillStyle = '#9ec87e'; ctx.fillRect(0, CH * 0.68, CW, CH * 0.32);
    ctx.fillStyle = '#8ab86e'; ctx.beginPath(); ctx.ellipse(CW / 2, CH * 0.68 + 8, CW * 0.6, 18, 0, 0, TAU); ctx.fill();
    // the open door you came out of, standing alone
    this._door(210, CH * 0.68, 100, 176, '#8a97a4');
    ctx.fillStyle = 'rgba(40,32,52,0.55)'; Render.rr(ctx, 168, CH * 0.68 - 170, 42, 164, 6); ctx.fill();   // dark hallway behind
    this._spot(CW / 2 + 40, CH * 0.68 + 52, 90, 0.14);
    this.drawYou(CW / 2 + 40, CH * 0.68 - 4, 1.95);
  };

  /* -- the founder -- */
  SC.towerFalls = function (ctx, t) {   // the tower comes down
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#4a3450'); sky.addColorStop(1, '#8a5a54');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#443a50'; ctx.fillRect(0, CH * 0.74, CW, CH * 0.26);
    const bx = CW / 2 + 110, lean = Math.min(0.3, t * 0.05 + 0.14);
    ctx.save(); ctx.translate(bx, CH * 0.74); ctx.rotate(lean);
    for (let i = 0; i < 6; i++) {
      const w = 180 - i * 14, y = -(i + 1) * 60;
      ctx.fillStyle = i % 2 ? '#4a7a4a' : '#568a56';
      Render.rr(ctx, -w / 2, y, w, 56, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,30,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 8 + (i * 13) % 40, y + 8); ctx.lineTo(-w / 2 + 38 + (i * 13) % 40, y + 44); ctx.stroke();   // cracks
    }
    ctx.restore();
    // red ticker arrows raining
    for (let i = 0; i < 7; i++) {
      const ax = (i * 137 + t * 60) % CW, ay = (i * 97 + t * 130) % (CH * 0.7);
      ctx.strokeStyle = 'rgba(230,90,90,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 26, ay + 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax + 26, ay + 10); ctx.lineTo(ax + 26, ay + 26); ctx.lineTo(ax + 10, ay + 26); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // the founder, toppling
    ctx.save(); ctx.translate(CW / 2 + 240, 190 + Math.min(t * 26, 90)); ctx.rotate(0.5 + Math.min(t * 0.2, 0.6));
    this.drawBossActor('founder', 0, 0, 0.8, 'low');
    ctx.restore();
    this._spot(190, 470, 76, 0.26);
    this.drawYou(190, 428, 1.75);
  };

  SC.systemTower = function (ctx, t) {   // ward 100 approach: the whole machine at once
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#1c1c30'); sky.addColorStop(0.6, '#343050'); sky.addColorStop(1, '#4c3a54');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = '#242034'; ctx.fillRect(0, CH * 0.74, CW, CH * 0.26);
    // the SYSTEM tower, floor by lit floor
    const bx = CW / 2 + 130;
    for (let i = 0; i < 8; i++) {
      const w = 200 - i * 12, y = CH * 0.74 - (i + 1) * 52;
      ctx.fillStyle = i % 2 ? '#3c3850' : '#464258';
      Render.rr(ctx, bx - w / 2, y, w, 48, 5); ctx.fill();
      const litClr = ['#e08a8a', '#8fd05a', '#5a9de0'][i % 3];
      ctx.fillStyle = (Math.floor(t * 1.5) + i) % 3 === 0 ? litClr : 'rgba(230,235,245,0.16)';
      for (let wnd = 0; wnd < 4; wnd++) Render.rr(ctx, bx - w / 2 + 16 + wnd * 34, y + 14, 20, 20, 3), ctx.fill();
    }
    ctx.fillStyle = '#e8e2f0'; Render.rr(ctx, bx - 26, CH * 0.74 - 8 * 52 - 26, 52, 20, 4); ctx.fill();
    ctx.fillStyle = '#4a4458'; ctx.font = 'bold 15px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('☤', bx, CH * 0.74 - 8 * 52 - 11);
    this._spot(210, 470, 76, 0.3);
    this.drawYou(210, 428, 1.7);
  };

  SC.boardTable = function (ctx, t) {   // the boardroom, after the vote
    this._room('#4c4258', '#38304a', '#5a4a3a', '#463a2c', CH * 0.6);
    // a long mahogany table
    ctx.fillStyle = '#6a4a2e'; Render.rr(ctx, CW / 2 - 250, CH * 0.6 - 26, 500, 34, 10); ctx.fill();
    ctx.fillStyle = '#7d5a38'; Render.rr(ctx, CW / 2 - 250, CH * 0.6 - 34, 500, 14, 8); ctx.fill();
    // scattered papers + a fallen gavel
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.translate(CW / 2 - 170 + i * 84, CH * 0.6 - 30); ctx.rotate((i - 2) * 0.2);
      ctx.fillStyle = '#f4ecd8'; Render.rr(ctx, -18, -12, 36, 24, 2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.translate(CW / 2 + 190, CH * 0.6 + 24); ctx.rotate(0.9);
    ctx.fillStyle = '#5a3a22'; Render.rr(ctx, -16, -7, 32, 14, 5); ctx.fill();
    ctx.fillStyle = '#6a4a2e'; Render.rr(ctx, -3, 5, 6, 22, 2); ctx.fill();
    ctx.restore();
    // the board itself, mid-collapse
    this.drawBossActor('theboard', CW / 2 + 60, 240, 1.05, 'low');
    this._spot(190, 470, 76, 0.26);
    this.drawYou(190, 428, 1.8);
  };

  SC.kindness = function (ctx, t) {   // the note at the end
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#f0d8b8'); sky.addColorStop(1, '#e0b898');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    // a big warm heart
    const beat = 1 + Math.sin(t * 2.4) * 0.04;
    ctx.save(); ctx.translate(CW / 2, 218); ctx.scale(beat * 2.6, beat * 2.6);
    ctx.fillStyle = '#e05a6a';
    ctx.beginPath();
    ctx.moveTo(0, 26); ctx.bezierCurveTo(-40, -6, -26, -34, 0, -16); ctx.bezierCurveTo(26, -34, 40, -6, 0, 26);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-10, -12, 8, 5, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    // you and the walrus, together, small
    this._spot(CW / 2 - 130, MIDY + 70, 80, 0.12);
    this.drawYou(CW / 2 - 130, MIDY + 14, 1.75);
    this.drawDoc(CW / 2 + 150, MIDY - 40, 0.95);
  };
})(Story);

/* ============ STORY DATA ============
   Each scene: array of panels { art, stamp?, lines: [] | (G)=>[] }.
   Ordered as the chart is meant to be read. */
const STORY = {
  prologue: [
    { art: 'intakeRoom', stamp: 'INTAKE', lines: ['It started with something small.', 'Trouble sleeping. A little tired. The', 'ordinary weather of being a person.'] },
    { art: 'walrusLoom', stamp: 'CONSULT', lines: ['The doctor will see you now.', 'He sees everyone. That\'s the problem.', 'Five questions. He didn\'t wait for', 'the answers.'] },
    { art: 'labelStamp', stamp: 'DX', lines: (G) => ['He found something.', 'He always finds something.', '', 'Everybody\'s got somethin — and now,', 'officially, so did you.'] },
    { art: 'floorOpens', stamp: 'ADMIT', lines: ['The paperwork went through.', 'The floor opened.', 'Down you go, into the wards.'] }
  ],
  ward5: [
    { art: 'hallOfDoors', stamp: 'WARD 5', lines: ['Ward 5. The doors all look the same', 'down here.', 'Behind each one, someone waiting to', 'give you a name for how you feel.'] }
  ],
  ward10: [
    { art: 'pillMountain', stamp: 'WARD 10', lines: (G) => {
        const D = (typeof DATA !== 'undefined' && G.player && DATA.DIAG[G.player.diag]) ? DATA.DIAG[G.player.diag].name : 'the condition';
        return ['Ward 10. The prescriptions add up.', 'A pill for the ' + D.toLowerCase() + '.', 'A pill for the pills. You\'ve stopped', 'reading the labels.'];
      } }
  ],
  ward15: [
    { art: 'copayRegister', stamp: 'WARD 15', lines: ['Ward 15. Every step has a copay.', 'They take a little piece of you at the', 'counter and call it your share.', 'You paid. You always pay.'] }
  ],
  ward20: [
    { art: 'mirrorWard', stamp: 'WARD 20', lines: ['Ward 20. You\'ve been in here so long', 'you answer to the chart.', 'You look for your face and find a', 'stack of forms wearing it.', 'But there\'s someone under the paper.'] }
  ],
  ward50pre: [
    { art: 'foundersTower', stamp: 'WARD 50', lines: ['Ward 50. The top of the ladder.', 'A tower built of copays and slogans,', 'and at the very top, the man who', 'turned each feeling into a product line.'] }
  ],
  cure: [
    { art: 'cureCapsule', stamp: 'WARD 25', lines: ['They said there was a cure at the', 'bottom of all this.', 'Twenty-five wards. You reached it.', 'It glowed like it meant something.'] },
    { art: 'cureEmpty', stamp: 'OPENED', lines: ['You opened it.', 'There was nothing inside.', 'There was never anything inside.', 'Just a small mirror, and your own', 'tired face looking back.'] },
    { art: 'daylight', stamp: 'DISCH?', lines: ['There\'s no cure. There never was.', 'There\'s just you, still here, still', 'standing after all of it.', 'That\'s not nothing. That\'s the', 'whole entire thing.'] }
  ],
  founder: [
    { art: 'towerFalls', stamp: 'DELISTED', lines: ['You toppled him.', 'For one shining moment the ticker is', 'red and the tower is coming down.'] },
    { art: 'kindness', stamp: 'NOTE', lines: ['The machine isn\'t gone. It never', 'really goes. But you did that — you,', 'with your tears and your bad sleep.', '', 'Everybody\'s got somethin. Be kind.', 'Including to yourself.'] }
  ],
  ward100pre: [
    { art: 'systemTower', stamp: 'WARD 100', lines: ['Ward 100. Below the founders, below', 'the cures, below everything — the', 'building itself has been waiting.', 'Every denial, every refill, every feed.', 'All of it, at once. The last argument.'] }
  ],
  board: [
    { art: 'boardTable', stamp: 'RESTRUCTURED', lines: ['The vote failed. The gavel is on the', 'floor and nobody is chairing anything.', 'Minutes were not taken.', '', 'You rode the elevator UP, and it', 'turned out the top was just people.'] }
  ],
  amaend: [
    { art: 'daylight', stamp: 'AMA', lines: ['You signed the form. You fought the', 'whole ward to the door. And then —', 'weather. Traffic. A bird, doing fine', 'without a diagnosis.', '', 'Nobody chased you past the parking lot.'] }
  ],
  epilogue: [
    { art: 'daylight', stamp: 'LATER', lines: ['Recovery, it turns out, isn\'t a', 'capsule or a discharge form.', 'It\'s Tuesdays. It\'s water and sleep', 'and answering one (1) text.', 'Some days the ward. Some days the sun.'] },
    { art: 'kindness', stamp: 'ONGOING', lines: ['You still have the chart. You keep it', 'in a drawer now, not in your chest.', '', 'Everybody\'s got somethin.', 'You have several. You are, somehow,', 'still entirely yourself.'] }
  ]
};

STORY.orientation = [
  { art: 'vhs', stamp: 'PLAY', lines: ['(tracking...)', 'WELCOME to the WARD family!', 'You have made an excellent choice,', 'or a series of events has.', 'Either way: welcome.'] },
  { art: 'vhs', stamp: '1987', lines: ['Our facility features hallways,', 'a policy regarding the hallways,', 'and the future of wellness:', 'a machine that bills while you sleep.', '', '(a chair is heard, offscreen)'] },
  { art: 'vhs', stamp: 'FIN', lines: ['Remember: everybody has got', 'something. That is our founder\'s', 'promise, and legally his defense.', '', 'This tape will now rewind', 'for the next new friend. (it will not)'] }
];

/* chapter list for the STORY gallery (title → re-watch) */
const STORY_CHAPTERS = [
  { id: 'prologue',  title: 'Prologue — Intake' },
  { id: 'ward5',     title: 'Ward 5 — The Doors' },
  { id: 'ward10',    title: 'Ward 10 — The Pills' },
  { id: 'ward15',    title: 'Ward 15 — The Copay' },
  { id: 'ward20',    title: 'Ward 20 — The Mirror' },
  { id: 'cure',      title: 'Ward 25 — The Cure' },
  { id: 'ward50pre', title: 'Ward 50 — The Tower' },
  { id: 'founder',   title: 'Ward 50 — The Fall' },
  { id: 'board',     title: 'The Ascent — The Board' },
  { id: 'ward100pre', title: 'Ward 100 — The Building' },
  { id: 'amaend',    title: 'The Door — Against Medical Advice' },
  { id: 'epilogue',  title: 'Epilogue — Tuesdays' }
];
