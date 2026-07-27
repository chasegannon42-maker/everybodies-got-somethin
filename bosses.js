/* =========================================================
   EVERYBODIES GOT SOMETHIN — bosses.js
   The Gatekeeper, The Adjuster, The Larper King, Withdrawal,
   The Stigma, Burnout, The Manual (DSM), and Dr. Walrus himself.
   ========================================================= */
'use strict';

/* THE MANUAL flips to a "chapter" and unleashes that disorder's bullet pattern */
const DSM_PAGES = [
  {
    label: "CH. 1 — ATTENTION", cd: 0.34, clr: '#f7b32b',
    fire(b, G, P2) {
      b.bullet(b.aimP(G) + U.rand(-0.5, 0.5), 250, '#f7b32b');
      if (P2) b.bullet(b.aimP(G) + U.rand(-0.8, 0.8), 260, '#f7b32b');
    }
  },
  {
    label: "CH. 2 — MOOD", cd: 1.5, clr: '#b86bff',
    fire(b, G, P2) {
      b._sub = !b._sub;
      if (b._sub) b.ring(P2 ? 16 : 12, 155, '#b86bff', U.rand(0, TAU));
      else for (let i = 0; i < 5; i++) b.bullet(b.aimP(G) + (i - 2) * 0.26, 300, '#e8c84c');
    }
  },
  {
    label: "CH. 3 — ANXIETY", cd: 1.9, clr: '#43b8a5',
    fire(b, G, P2) {
      for (let i = 0; i < (P2 ? 8 : 6); i++) {
        const bl = b.bullet(b.aimP(G) + U.rand(-0.85, 0.85), 135, '#43b8a5', { life: 3.5 });
        bl.home = 0.8;
      }
    }
  },
  {
    label: "CH. 4 — PSYCHOSIS", cd: 1.6, clr: '#ff7a9e',
    fire(b, G, P2) {
      const gap = b.aimP(G) + Math.PI; // gap points away from the player so it's dodgeable
      b.ring(P2 ? 22 : 16, 175, '#ff7a9e', U.rand(0, TAU), gap, 0.7);
      // a couple of harmless hallucinated shots for flavor
      for (let i = 0; i < 2; i++) { const bl = b.bullet(U.rand(0, TAU), 150, '#ffc0d4'); bl.fake = true; }
    }
  },
  {
    label: "CH. 5 — MOOD (SEVERE)", cd: 2.0, clr: '#5d8aa8',
    fire(b, G, P2) {
      for (const off of [-0.4, 0, 0.4]) b.bullet(b.aimP(G) + off, 120, '#5d8aa8', { r: 13, life: 4 });
      G.darkTarget = 0.5;
    }
  }
];

class Boss {
  constructor(id, depth, G) {
    const M = DATA.BOSSES[id];
    const dif = DATA.difficulty(depth);
    this.id = id;
    this.name = M.name; this.sub = M.sub;
    const fineMult = G.player.flags.fineMode ? 1.15 : 1;
    this.maxhp = this.hp = M.hp * dif.bossHp * fineMult * (G.chronic ? 1.4 : 1) * (G.easy ? 0.75 : 1);
    this.hp = this.maxhp;
    this.depth = depth;
    this._feed = { x: 0, y: 0 };   // THE ALGORITHM: smoothed read of how the player moves
    this.aggr = dif.bossAggr;              // deeper bosses move & attack faster
    this.x = CW / 2; this.y = RY + 130;
    this.r = id === 'walrus' ? 46 : id === 'fogless' ? 40 : 40;
    this.dmg = dif.bossDmg;
    this.t = 0; this.atkT = 2; this.spT = 6; this.dashT = 3;
    this.state = 0; this.stateT = 0;
    this.phase = 1;
    this.vulnerable = true;
    this.dead = false; this.deathT = 0;
    this.hitFlash = 0;
    this.vx = 95; this.vy = 72;
    this.spiralA = 0;
    this.mask = 'adhd'; this.maskT = 0; this.maskIdx = 0;
    this.stolen = 0;
    this.summonedAt = [];
    this.enrage = 0; this.emberT = 3;
    this.dashDir = null;
    this.pullT = 0;
    this.page = 0; this.pageT = 2.6; this._sub = false; // THE MANUAL
    this._paInit = false; // PRIOR AUTHORIZATION form state
    this.introT = 1.6; // brief intro pause
    Meta.see('bosses', id);
    if (id === 'priorauth') this.vulnerable = false; // must "fill the forms" before it can be hit
  }

  bullet(a, spd, clr, opts) {
    const b = new EBullet(this.x + Math.cos(a) * this.r * 0.7, this.y + Math.sin(a) * this.r * 0.7,
      Math.cos(a) * spd, Math.sin(a) * spd, this.dmg, clr);
    b._src = this.id;
    if (opts && opts.home) b.home = opts.home;
    if (opts && opts.r) b.r = opts.r;
    if (opts && opts.life) b.life = opts.life;
    G.eBullets.push(b);
    return b;
  }
  ring(n, spd, clr, off, gapAt, gapSize) {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      if (gapAt != null) {
        let da = Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt));
        if (Math.abs(da) < (gapSize || 0.5)) continue;
      }
      this.bullet(a, spd, clr);
    }
  }
  aimP(G) { return U.ang(this.x, this.y, G.player.x, G.player.y); }
  summon(G, id, n) {
    let cur = 0;
    for (const e of G.enemies) if (!e.dying) cur++;
    for (let i = 0; i < n && cur < 5; i++, cur++) {
      const a = U.rand(0, TAU);
      const e = new Enemy(id, U.clamp(this.x + Math.cos(a) * 90, RX + 40, RX + RW - 40),
        U.clamp(this.y + Math.sin(a) * 90, RY + 40, RY + RH - 40), this.depth, false, 0.6);
      e.noDrop = true;
      G.enemies.push(e);
    }
    SFX.play('whoosh');
  }
  /* PRIOR AUTHORIZATION: scatter n one-hit "form" props the player must clear to un-deny the boss */
  _scatterForms(G, n) {
    const spots = [];
    for (let r = 1; r < ROWS - 1; r++) for (let c = 2; c < COLS - 2; c++) if (G.room.layout[r][c] === 0) spots.push(tileToPx(c, r));
    const chosen = U.shuffle(spots).slice(0, n);
    for (const s of chosen) {
      const e = new Enemy('form', s.x, s.y, this.depth, false, 1);
      e._form = true; e.noDrop = true; e.spawnT = 0.3;
      G.enemies.push(e);
    }
    SFX.play('stamp');
  }
  moveToward(tx, ty, spd, dt) {
    const a = U.ang(this.x, this.y, tx, ty);
    this.x += Math.cos(a) * spd * dt;
    this.y += Math.sin(a) * spd * dt;
  }
  clampPos() {
    this.x = U.clamp(this.x, RX + this.r, RX + RW - this.r);
    this.y = U.clamp(this.y, RY + this.r, RY + RH - this.r);
  }

  update(dt, G) {
    this.t += dt; this.hitFlash -= dt;
    if (this.dead) { this.deathT += dt; return; }
    if (this.introT > 0) { this.introT -= dt; return; }
    dt *= (this.aggr || 1); // endless: deeper bosses move & attack faster
    const p = G.player;
    if (this.hp < this.maxhp * 0.5) this.phase = 2;
    const P2 = this.phase === 2;

    switch (this.id) {
      /* ---------- THE GATEKEEPER ---------- */
      case 'gatekeeper': {
        this.x = CW / 2 + Math.sin(this.t * 0.7) * 180;
        this.y = RY + 120 + Math.sin(this.t * 1.3) * 30;
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atkT = P2 ? 1.7 : 2.3;
          const roll = Math.random();
          if (roll < 0.5) {
            const gap = U.rand(0, TAU);
            const waves = P2 ? 3 : 2;
            for (let wv = 0; wv < waves; wv++) {
              setTimeout(() => { if (!this.dead && G.state === 'run') this.ring(P2 ? 18 : 14, 170 + wv * 25, '#b8b0d0', wv * 0.15, gap, 0.55); }, wv * 260);
            }
            SFX.play('pop');
          } else if (roll < 0.75) {
            this.ring(P2 ? 22 : 16, 200, '#d0c8e8', U.rand(0, TAU), this.aimP(G), 0.7);
            SFX.play('boss');
          } else {
            this.summon(G, 'doubt', 2);
          }
        }
        this.spT -= dt;
        if (this.spT <= 0) { this.spT = 16; this.state = 1; this.stateT = 1.0; this.vulnerable = false; G.toast('"Prove it."'); }
        if (this.state === 1) {
          this.stateT -= dt;
          if (this.stateT <= 0) { this.state = 0; this.vulnerable = true; }
        }
        break;
      }
      /* ---------- THE ADJUSTER ---------- */
      case 'adjuster': {
        // periodically hover so it's actually hittable
        this.pullT -= dt;
        const hover = this.pullT < 0 && this.pullT > -1.1;
        if (this.pullT < -1.1) this.pullT = U.rand(2.5, 4);
        const mv = hover ? 0.15 : (P2 ? 1.25 : 1);
        this.x += this.vx * dt * mv;
        this.y += this.vy * dt * mv;
        if (this.x < RX + this.r || this.x > RX + RW - this.r) this.vx *= -1;
        if (this.y < RY + this.r || this.y > RY + RH - this.r) this.vy *= -1;
        this.clampPos();
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atkT = P2 ? 2.2 : 3.0;
          const n = P2 ? 4 : 3;
          for (let i = 0; i < n; i++) {
            const tx = U.clamp(p.x + U.rand(-70, 70), RX + 30, RX + RW - 30);
            const ty = U.clamp(p.y + U.rand(-70, 70), RY + 30, RY + RH - 30);
            G.stamps.push({ x: tx, y: ty, t: 0.85, r: 52, done: false });
          }
          SFX.play('stamp');
        }
        this.spT -= dt;
        if (this.spT <= 0) {
          this.spT = 7;
          let placed = 0;
          for (let tries = 0; tries < 30 && placed < 3; tries++) {
            const c = U.randi(2, COLS - 3), r = U.randi(1, ROWS - 2);
            if (G.room.layout[r][c] === 0) {
              G.room.layout[r][c] = 2;
              G.room.paperHp[c + ',' + r] = 14;
              placed++;
            }
          }
          if (placed) SFX.play('pop');
        }
        // steal coins on contact
        if (p.iframes <= 0 && U.dist(this.x, this.y, p.x, p.y) < this.r + p.r) {
          if (p.coins > 0) { const take = Math.min(p.coins, 2); p.coins -= take; this.stolen += take; G.texts.push(new FloatText(p.x, p.y - 24, '-' + take + ' copay!', '#e8c84c')); }
        }
        break;
      }
      /* ---------- THE LARPER KING ---------- */
      case 'larperking': {
        this.maskT -= dt;
        if (this.maskT <= 0) {
          this.maskT = 7;
          const masks = ['adhd', 'depression', 'anxiety', 'mania'];
          this.maskIdx = (this.maskIdx + 1) % masks.length;
          this.mask = masks[this.maskIdx];
          G.texts.push(new FloatText(this.x, this.y - 60, 'today I have ' + (this.mask === 'mania' ? 'MANIA' : this.mask.toUpperCase()) + ' too', '#e8e0d0'));
          SFX.play('voice');
          this.state = 0;
        }
        if (this.mask === 'adhd') {
          this.moveToward(p.x + Math.sin(this.t * 5) * 120, p.y + Math.cos(this.t * 4.3) * 120, 150, dt);
          this.atkT -= dt;
          if (this.atkT <= 0) { this.atkT = 0.5; this.bullet(this.aimP(G) + U.rand(-0.5, 0.5), 240, '#c8c0b8'); }
        } else if (this.mask === 'depression') {
          this.moveToward(p.x, p.y, 40, dt);
          this.atkT -= dt;
          if (this.atkT <= 0) {
            this.atkT = 1.6;
            for (const off of [-0.35, 0, 0.35]) this.bullet(this.aimP(G) + off, 120, '#7a98b8', { r: 12 });
            SFX.play('pop');
          }
        } else if (this.mask === 'anxiety') {
          this.atkT -= dt;
          if (this.atkT <= 0) {
            this.atkT = 1.9;
            this.x = U.clamp(p.x + U.rand(-200, 200), RX + 50, RX + RW - 50);
            this.y = U.clamp(p.y + U.rand(-200, 200), RY + 50, RY + RH - 50);
            this.ring(10, 190, '#8fd0c8', U.rand(0, TAU));
            SFX.play('whoosh');
          }
        } else { // mania
          this.atkT -= dt;
          if (this.state === 0 && this.atkT <= 0) {
            this.state = 1; this.stateT = 0.4;
            this.dashDir = this.aimP(G);
            SFX.play('charge');
          } else if (this.state === 1) {
            this.stateT -= dt;
            if (this.stateT <= 0) { this.state = 2; this.stateT = 0.5; }
          } else if (this.state === 2) {
            this.x += Math.cos(this.dashDir) * 460 * dt;
            this.y += Math.sin(this.dashDir) * 460 * dt;
            this.stateT -= dt;
            if (this.stateT <= 0) { this.state = 0; this.atkT = 0.9; }
          }
        }
        this.clampPos();
        if (this.hp < this.maxhp * 0.66 && !this.summonedAt.includes(66)) { this.summonedAt.push(66); this.summon(G, 'larper', 2); }
        if (this.hp < this.maxhp * 0.33 && !this.summonedAt.includes(33)) { this.summonedAt.push(33); this.summon(G, 'larper', 2); }
        break;
      }
      /* ---------- WITHDRAWAL ---------- */
      case 'withdrawal': {
        if (!P2) {
          this.moveToward(p.x, p.y, 46, dt);
          this.spiralA += dt * 2.6;
          this.atkT -= dt;
          if (this.atkT <= 0) {
            this.atkT = 0.16;
            for (const arm of [0, Math.PI]) {
              const a = this.spiralA + arm;
              this.bullet(a, 150, '#e08fb0', { r: 8 });
            }
          }
          this.spT -= dt;
          if (this.spT <= 0) {
            this.spT = 5;
            const tx = U.clamp(p.x + U.rand(-60, 60), RX + 60, RX + RW - 60);
            const ty = U.clamp(p.y + U.rand(-60, 60), RY + 60, RY + RH - 60);
            G.zones.push(new Zone(tx, ty, 74, 12, 'tolerance', 'rgba(200,140,180,0.28)'));
            SFX.play('pop');
          }
        } else {
          this.spiralA += dt * 3.4;
          this.atkT -= dt;
          if (this.atkT <= 0) {
            this.atkT = 0.13;
            for (const arm of [0, TAU / 3, 2 * TAU / 3]) this.bullet(this.spiralA + arm, 165, '#e06a9a', { r: 8 });
          }
          this.dashT -= dt;
          if (this.dashT <= 0) {
            this.dashT = 2.4;
            this.dashDir = this.aimP(G);
            this.state = 2; this.stateT = 0.45;
            SFX.play('charge');
          }
          if (this.state === 2) {
            this.x += Math.cos(this.dashDir) * 380 * dt;
            this.y += Math.sin(this.dashDir) * 380 * dt;
            this.stateT -= dt;
            if (this.stateT <= 0) this.state = 0;
          } else {
            this.moveToward(p.x, p.y, 60, dt);
          }
        }
        // dependency aura: being near slows your tears (handled via G.tearsAura)
        G.tearsAura = U.dist(this.x, this.y, p.x, p.y) < 175;
        this.clampPos();
        break;
      }
      /* ---------- THE STIGMA ---------- */
      case 'stigma': {
        G.darkTarget = 0.72;
        this.moveToward(p.x, p.y, P2 ? 85 : 60, dt);
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atkT = P2 ? 1.8 : 2.6;
          const n = P2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const b = this.bullet(this.aimP(G) + U.rand(-0.7, 0.7), 120, '#5a4a6a', { life: 3 });
            b.home = 0.9; // gentle homing
          }
          SFX.play('voice');
        }
        this.dashT -= dt;
        if (this.dashT <= 0) {
          this.dashT = P2 ? 3 : 4.5;
          this.dashDir = this.aimP(G);
          this.state = 2; this.stateT = 0.5;
          SFX.play('whoosh');
        }
        if (this.state === 2) {
          this.x += Math.cos(this.dashDir) * 430 * dt;
          this.y += Math.sin(this.dashDir) * 430 * dt;
          this.stateT -= dt;
          if (this.stateT <= 0) this.state = 0;
        }
        this.clampPos();
        break;
      }
      /* ---------- BURNOUT ---------- */
      case 'burnout': {
        if (this.enrage > 0) {
          this.enrage -= dt;
          this.moveToward(p.x, p.y, 190, dt);
          if (p.iframes <= 0 && U.dist(this.x, this.y, p.x, p.y) < this.r + p.r) p.hurt(2, G, this.id);
        } else {
          this.x = CW / 2 + Math.sin(this.t * 0.5) * 230;
          this.y = RY + 130 + Math.sin(this.t * 0.9) * 55;
          this.atkT -= dt;
          if (this.atkT <= 0) {
            this.atkT = P2 ? 1.5 : 2.1;
            const n = P2 ? 5 : 3;
            for (let i = 0; i < n; i++) this.bullet(this.aimP(G) + (i - (n - 1) / 2) * 0.22, 200, '#e0883a');
            SFX.play('pop');
          }
          this.emberT -= dt;
          if (this.emberT <= 0) {
            this.emberT = P2 ? 4.5 : 6;
            let embers = G.zones.filter(z => z.kind === 'ember');
            if (embers.length >= 6) embers[0].dead = true;
            G.zones.push(new Zone(p.x, p.y, P2 ? 62 : 50, 999, 'ember', 'rgba(220,120,50,0.3)'));
            G.toast('"Just push through it."');
          }
          this.spT -= dt;
          if (this.spT <= 0) { this.spT = 17; this.enrage = 3.5; G.toast('CRUNCH TIME'); SFX.play('boss'); }
        }
        this.clampPos();
        break;
      }
      /* ---------- THE MANUAL (DSM) ---------- */
      case 'dsm': {
        this.x = CW / 2 + Math.sin(this.t * 0.5) * 150;
        this.y = RY + 118 + Math.sin(this.t * 0.9) * 26;
        this.pageT -= dt;
        if (this.pageT <= 0) {
          this.pageT = P2 ? 4.5 : 6;
          this.page = (this.page + 1 + (Math.random() < 0.3 ? 1 : 0)) % DSM_PAGES.length;
          this.state = 1; this.stateT = 0.5; // page-flip pause (no fire)
          G.toast('“' + DSM_PAGES[this.page].label + '”');
          SFX.play('voice');
        }
        if (this.state === 1) { this.stateT -= dt; if (this.stateT <= 0) this.state = 0; break; }
        this.atkT -= dt;
        const pg = DSM_PAGES[this.page];
        if (this.atkT <= 0) { this.atkT = pg.cd * (P2 ? 0.72 : 1); pg.fire(this, G, P2); SFX.play('pop'); }
        // depression page darkness fades otherwise
        if (this.page !== 4) G.darkTarget = Math.max(0, (G.darkTarget || 0) - dt * 0.6);
        this.clampPos();
        break;
      }
      /* ---------- PRIOR AUTHORIZATION ---------- */
      case 'priorauth': {
        this.x = CW / 2 + Math.sin(this.t * 0.5) * 170;
        this.y = RY + 118 + Math.sin(this.t * 1.0) * 26;
        const formCount = P2 ? 4 : 3;
        if (!this._paInit) { this._paInit = true; this.state = 0; this.vulnerable = false; this._scatterForms(G, formCount); }
        const formsLeft = G.enemies.filter(e => e._form && !e.dying).length;
        if (this.state === 0) {
          // DENIED: cannot be damaged (hurt() shows "DENIED"); clear all forms to force approval
          this.vulnerable = false;
          this.atkT -= dt;
          if (this.atkT <= 0) { this.atkT = P2 ? 1.3 : 1.9; for (const off of [-0.28, 0, 0.28]) this.bullet(this.aimP(G) + off, 175, '#7a86b8', { r: 8 }); SFX.play('pop'); }
          // occasionally demand ONE more form (deep only, and never a full reset)
          this.spT -= dt;
          if (this.spT <= 0) { this.spT = 9; if (P2 && formsLeft > 0 && formsLeft < formCount) { this._scatterForms(G, 1); G.toast('“Additional documentation required.”', '#e0955a'); SFX.play('error'); } }
          if (formsLeft === 0) { this.state = 1; this.stateT = P2 ? 5.5 : 7; this.vulnerable = true; G.toast('APPROVED. Briefly.', '#8fd05a'); SFX.play('heal'); }
        } else {
          // APPROVED: generous vulnerable window, lighter fire, then it denies you again
          this.stateT -= dt;
          this.atkT -= dt;
          if (this.atkT <= 0) { this.atkT = 0.6; this.bullet(this.aimP(G), 150, '#e8c84c'); }
          if (this.stateT <= 0) { this.state = 0; this.vulnerable = false; this._scatterForms(G, formCount); G.toast(U.choice(['“Claim denied.”', '“Please hold.”', '“Resubmit in triplicate.”']), '#e05a5a'); SFX.play('error'); }
        }
        this.clampPos();
        break;
      }
      /* ---------- THE ALGORITHM (adapts to how you move) ---------- */
      case 'algorithm': {
        this.x = CW / 2 + Math.sin(this.t * 0.6) * 180;
        this.y = RY + 120 + Math.sin(this.t * 1.2) * 28;
        const p2 = G.player;
        const mvx = (this._px == null) ? 0 : (p2.x - this._px), mvy = (this._py == null) ? 0 : (p2.y - this._py);
        this._px = p2.x; this._py = p2.y;
        this._feed.x = U.lerp(this._feed.x, mvx, 0.15); this._feed.y = U.lerp(this._feed.y, mvy, 0.15);
        const lead = P2 ? 26 : 18;
        const pfx = U.clamp(p2.x + this._feed.x * lead, RX + 12, RX + RW - 12);
        const pfy = U.clamp(p2.y + this._feed.y * lead, RY + 12, RY + RH - 12);
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atkT = P2 ? 0.9 : 1.3;
          const a = U.ang(this.x, this.y, pfx, pfy);
          for (const off of (P2 ? [-0.22, 0, 0.22] : [-0.16, 0.16])) this.bullet(a + off, 230, '#5a9de0');
        }
        this.spT -= dt;
        if (this.spT <= 0) {
          this.spT = P2 ? 3.2 : 4.6;
          for (let i = 0; i < (P2 ? 5 : 3); i++) { const b = this.bullet(U.ang(this.x, this.y, pfx, pfy) + U.rand(-0.5, 0.5), 150, '#7a6be0', { life: 3.5 }); b.home = 0.7; }
          G.toast('“You might also like: THIS.”', '#9db8e8');
        }
        this.clampPos();
        break;
      }
      /* ---------- THE CURE (Ward 25 finale) ---------- */
      case 'thecure': {
        this.x = CW / 2 + Math.sin(this.t * 0.4) * 150;
        this.y = RY + 120 + Math.sin(this.t * 0.8) * 30;
        this.spiralA += dt * (P2 ? 2.6 : 1.9);
        this.atkT -= dt;
        if (this.atkT <= 0) {
          const roll = Math.random();
          if (roll < 0.45) {
            this.atkT = P2 ? 1.2 : 1.7;
            this.ring(P2 ? 20 : 14, 165, '#ffe6a0', U.rand(0, TAU), this.aimP(G) + Math.PI, 0.6);
          } else if (roll < 0.8) {
            this.atkT = 0.14;
            for (const arm of [0, Math.PI]) this.bullet(this.spiralA + arm, 150, '#a0f0c0', { r: 8 });
          } else {
            this.atkT = P2 ? 1.1 : 1.6;
            for (let i = 0; i < 5; i++) this.bullet(this.aimP(G) + (i - 2) * 0.2, 210, '#ffd070');
          }
        }
        this.dashT -= dt;
        if (this.dashT <= 0) { this.dashT = P2 ? 5 : 7; this.ring(P2 ? 12 : 8, 120, '#b0ffd0', U.rand(0, TAU)); SFX.play('boss'); }
        this.clampPos();
        break;
      }
      /* ---------- THE FOUNDER (Ward 50 superboss) ---------- */
      case 'founder': {
        const P3 = this.hp < this.maxhp * 0.34;   // "hostile takeover" phase
        this.x = CW / 2 + Math.sin(this.t * 0.5) * 190;
        this.y = RY + 120 + Math.sin(this.t * 0.9) * 32;
        this.spiralA += dt * (P3 ? 3.2 : P2 ? 2.4 : 1.7);
        this.atkT -= dt;
        if (this.atkT <= 0) {
          const roll = Math.random();
          if (roll < 0.4) {   // "price hike" — aimed volley of green (money) bullets
            this.atkT = P2 ? 1.0 : 1.5;
            const a = this.aimP(G);
            const spread = P3 ? [-0.3, -0.15, 0, 0.15, 0.3] : P2 ? [-0.22, 0, 0.22] : [-0.14, 0.14];
            for (const off of spread) this.bullet(a + off, 235, '#8fd05a');
            SFX.play('pop');
          } else if (roll < 0.72) {   // "cash flow" — spinning arms of coins
            this.atkT = 0.14;
            const arms = P3 ? 4 : 2;
            for (let i = 0; i < arms; i++) this.bullet(this.spiralA + i * TAU / arms, 155, '#e0c95a', { r: 8 });
          } else {   // "acquisition" — summon subsidiaries
            this.atkT = P2 ? 2.4 : 3.2;
            this.summon(G, P3 ? 'ad' : 'larper', 2);
            G.toast('“We\'re acquiring your competitors.”', '#8fd05a');
          }
        }
        // "stock buyback": periodic ring burst aimed away from the player (leaves an out)
        this.spT -= dt;
        if (this.spT <= 0) {
          this.spT = P2 ? 3.4 : 4.8;
          this.ring(P3 ? 22 : P2 ? 16 : 12, 170, '#c8f0a0', U.rand(0, TAU), this.aimP(G) + Math.PI, 0.55);
          SFX.play('boss');
        }
        // phase 3 "hostile takeover": homing buyout bullets
        if (P3) {
          this.dashT -= dt;
          if (this.dashT <= 0) { this.dashT = 2.6; for (let i = 0; i < 3; i++) { const b = this.bullet(this.aimP(G) + U.rand(-0.4, 0.4), 150, '#5ad07a', { life: 3.5 }); b.home = 0.8; } G.toast('“Hostile takeover.”', '#5ad07a'); }
        }
        this.clampPos();
        break;
      }
      /* ---------- DR. WALRUS ---------- */
      case 'walrus': {
        this.atkT -= dt;
        if (this.state === 0) {
          this.x = CW / 2 + Math.sin(this.t * 0.6) * 200;
          this.y = RY + 120 + Math.sin(this.t * 1.1) * 35;
          if (this.atkT <= 0) {
            const roll = Math.random();
            if (roll < 0.3) {
              // prescription volley: descending rows of pills with a gap
              const gapX = U.rand(RX + 80, RX + RW - 80);
              for (let i = 0; i < 10; i++) {
                const bx = RX + 40 + (i / 9) * (RW - 80);
                if (Math.abs(bx - gapX) < 70) continue;
                const b = new EBullet(bx, RY + 20, 0, 170 + (P2 ? 40 : 0), this.dmg, DATA.PILL_COLORS[U.randi(0, 9)]);
                b.r = 8;
                b._src = this.id;
                G.eBullets.push(b);
              }
              SFX.play('pop');
              this.atkT = P2 ? 1.6 : 2.2;
            } else if (roll < 0.55) {
              // desk charge
              this.state = 1; this.stateT = 0.5;
              this.dashDir = this.aimP(G);
              SFX.play('charge');
            } else if (roll < 0.8) {
              // say ahh: vacuum
              this.state = 3; this.stateT = 1.6;
              G.toast('"Say ahh."');
              SFX.play('boss');
            } else {
              this.summon(G, 'ad', 2);
              this.atkT = 2.2;
            }
          }
        } else if (this.state === 1) {
          this.stateT -= dt;
          if (this.stateT <= 0) { this.state = 2; this.stateT = 0.6; }
        } else if (this.state === 2) {
          this.x += Math.cos(this.dashDir) * 500 * dt;
          this.y += Math.sin(this.dashDir) * 500 * dt;
          this.stateT -= dt;
          const hitWall = this.x <= RX + this.r || this.x >= RX + RW - this.r || this.y <= RY + this.r || this.y >= RY + RH - this.r;
          if (this.stateT <= 0 || hitWall) {
            this.state = 0; this.atkT = 1.4;
            if (hitWall) { G.shake = Math.max(G.shake, 10); SFX.play('stamp'); this.ring(8, 180, '#e8d0a0', U.rand(0, TAU)); }
          }
        } else if (this.state === 3) {
          this.stateT -= dt;
          const a = U.ang(p.x, p.y, this.x, this.y);
          p.x += Math.cos(a) * 170 * dt;
          p.y += Math.sin(a) * 170 * dt;
          if (this.t % 0.4 < dt) this.ring(6, 140, '#a0c8e0', U.rand(0, TAU));
          if (this.stateT <= 0) { this.state = 0; this.atkT = 1.6; }
        }
        this.clampPos();
        break;
      }
    }

    // contact damage (generic)
    if (this.id !== 'burnout' && p.iframes <= 0 && U.dist(this.x, this.y, p.x, p.y) < this.r + p.r - 6) {
      p.hurt(this.dmg, G, this.id);
    }
  }

  hurt(d, G) {
    if (this.dead || this.introT > 0) return;
    if (!this.vulnerable) {
      G.texts.push(new FloatText(this.x, this.y - this.r - 10, 'DENIED', '#e05a5a'));
      SFX.play('error');
      return;
    }
    this.hp -= d;
    this.hitFlash = 0.1;
    SFX.play('hit');
    if (this.hp <= 0) this.die(G);
  }

  die(G) {
    this.dead = true;
    this.deathT = 0;
    G.tearsAura = false;
    G.darkTarget = 0;
    SFX.play('die'); SFX.play('boom');
    Haptics.buzz([60, 50, 90, 50, 140], 0);
    G.shake = 14;
    const clrs = this.id === 'larperking' ? ['#e05a5a', '#5a9de0', '#8fd05a', '#e0c95a', '#b06be0'] : [this.id === 'walrus' ? '#8a6a4a' : '#8a7a6a', '#b0a090', '#d8c8b8'];
    for (let i = 0; i < 34; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-260, 260), U.rand(-260, 260), U.rand(0.5, 1.1), U.choice(clrs), U.rand(3, 6)));
    for (let i = 0; i < 5; i++) makeGibs(G, this.x + U.rand(-this.r, this.r), this.y + U.rand(-this.r, this.r), U.choice(clrs), 6);
    if (this.id === 'adjuster' && this.stolen > 0) {
      for (let i = 0; i < Math.min(this.stolen + 2, 10); i++) G.pickups.push(new Pickup('coin', this.x + U.rand(-30, 30), this.y + U.rand(-30, 30)));
    }
    if (this.id === 'larperking') G.toast('It was never real.');
    if (this.id === 'walrus') {
      Meta.data.walrusKills++;
      G.toast('DR. WALRUS: "' + U.choice(DATA.WALRUS_DEFEAT_LINES) + '"');
    }
    // clear leftover hazards AND summoned minions — beating the boss clears the room
    for (const z of G.zones) z.dead = true;
    for (const b of G.eBullets) b.dead = true;
    for (const e of G.enemies) {
      if (e.dying) continue;
      e.dying = true; e.deadDone = true;
      for (let i = 0; i < 8; i++) G.parts.push(new Particle(e.x, e.y, U.rand(-120, 120), U.rand(-120, 120), 0.45, e.clr, 4));
    }
    G.stamps.length = 0;
    G.onBossDead();
  }
}
