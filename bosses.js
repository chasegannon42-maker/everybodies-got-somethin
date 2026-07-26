/* =========================================================
   EVERYBODIES GOT SOMETHIN — bosses.js
   The Gatekeeper, The Adjuster, The Larper King, Withdrawal,
   The Stigma, Burnout, and Dr. Walrus himself.
   ========================================================= */
'use strict';

class Boss {
  constructor(id, depth, G) {
    const M = DATA.BOSSES[id];
    this.id = id;
    this.name = M.name; this.sub = M.sub;
    const fineMult = G.player.flags.fineMode ? 1.15 : 1;
    this.maxhp = this.hp = M.hp * (1 + 0.20 * (depth - 1)) * fineMult;
    this.depth = depth;
    this.x = CW / 2; this.y = RY + 130;
    this.r = id === 'walrus' ? 46 : id === 'fogless' ? 40 : 40;
    this.dmg = 1 + (depth >= 8 ? 1 : 0);
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
    this.introT = 1.6; // brief intro pause
  }

  bullet(a, spd, clr, opts) {
    const b = new EBullet(this.x + Math.cos(a) * this.r * 0.7, this.y + Math.sin(a) * this.r * 0.7,
      Math.cos(a) * spd, Math.sin(a) * spd, this.dmg, clr);
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
        if (this.spT <= 0) { this.spT = 12; this.state = 1; this.stateT = 1.4; this.vulnerable = false; G.toast('"Prove it."'); }
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
          if (p.iframes <= 0 && U.dist(this.x, this.y, p.x, p.y) < this.r + p.r) p.hurt(2, G);
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
      p.hurt(this.dmg, G);
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
