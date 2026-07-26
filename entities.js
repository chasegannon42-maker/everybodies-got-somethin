/* =========================================================
   EVERYBODIES GOT SOMETHIN — entities.js
   Player, enemies, tears, familiars, pickups, bombs, particles.
   ========================================================= */
'use strict';

/* ---------------- familiars ---------------- */
class Familiar {
  constructor(type) {
    this.type = type;
    this.x = CW / 2; this.y = CH / 2;
    this.ang = U.rand(0, TAU); this.t = 0;
    this.blockR = type === 'plush' ? 26 : type === 'spinner' ? 20 : 0;
    this.squeakCd = 0;
  }
  update(dt, G) {
    const p = G.player;
    this.t += dt; this.squeakCd -= dt;
    if (this.type === 'spinner') {
      this.ang += 3.4 * dt;
      this.x = p.x + Math.cos(this.ang) * 56;
      this.y = p.y + Math.sin(this.ang) * 56;
      for (const e of G.enemies) {
        if (e.spawnT > 0 || e.dying) continue;
        if (U.dist(this.x, this.y, e.x, e.y) < 18 + e.r) e.hurt(9 * dt, G, true);
      }
      if (G.boss && !G.boss.dead && U.dist(this.x, this.y, G.boss.x, G.boss.y) < 18 + G.boss.r) G.boss.hurt(7 * dt, G, true);
    } else if (this.type === 'dog') {
      let best = null, bd = 1e9;
      for (const e of G.enemies) { if (e.fake || e.spawnT > 0) continue; const d = U.dist(this.x, this.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (!best && G.boss && !G.boss.dead) { best = G.boss; bd = U.dist(this.x, this.y, best.x, best.y); }
      const tgt = best || p;
      const a = U.ang(this.x, this.y, tgt.x, tgt.y);
      const spd = best ? 240 : 180;
      if (U.dist(this.x, this.y, tgt.x, tgt.y) > (best ? 6 : 40)) {
        this.x += Math.cos(a) * spd * dt;
        this.y += Math.sin(a) * spd * dt;
      }
      const c = collideTiles(G.room.layout, this.x, this.y, 10);
      this.x = c.x; this.y = c.y;
      this.x = U.clamp(this.x, RX + 12, RX + RW - 12); this.y = U.clamp(this.y, RY + 12, RY + RH - 12);
      if (best && bd < best.r + 12) best.hurt(11 * dt, G, true);
    } else if (this.type === 'plush') {
      const a = U.ang(this.x, this.y, p.x, p.y);
      const d = U.dist(this.x, this.y, p.x, p.y);
      if (d > 42) { this.x += Math.cos(a) * (d - 42) * 6 * dt; this.y += Math.sin(a) * (d - 42) * 6 * dt; }
    }
  }
  block(G) { // called when this familiar eats a bullet
    if (this.type === 'plush' && this.squeakCd <= 0) { SFX.play('squeak'); this.squeakCd = 0.4; }
    for (let i = 0; i < 4; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-60, 60), U.rand(-60, 60), 0.3, '#fff', 3));
  }
}

/* ---------------- player ---------------- */
class Player {
  constructor(diagId) {
    this.x = CW / 2; this.y = RY + RH - 90;
    this.r = 15;
    this.diag = diagId;
    this.maxhp = 6; this.hp = 6;
    this.spd = 225;
    this.tearDelay = 0.40; this.tearTimer = 0;
    this.dmg = 4.0; this.shotSpd = 440; this.range = 0.9;
    this.wobble = 0; this.luck = 0;
    this.coins = 3; this.keys = 1; this.bombs = 1;
    this.pill = U.randi(0, 9);
    this.flags = {};
    this.items = [];
    this.familiars = [];
    this.iframes = 0; this.iframeTime = 1.2;
    this.tempSlow = 0;
    this.moodT = 0; this.mania = true;
    this.focusT = 0; this.focused = false;
    this.adren = false;
    this.blanket = (diagId === 'depression');
    this.pillsThisFloor = 0;
    this.aimAng = -Math.PI / 2;
    this.moving = false;
    this.hurtFlash = 0;
    this.dead = false;
    this.itemHold = 0; this.itemHoldName = ''; this.itemHoldQuote = '';
    this.inZoneSlow = false;

    if (diagId === 'adhd') { this.spd *= 1.22; this.tearDelay *= 0.88; this.wobble = 0.11; }
    if (diagId === 'depression') { this.spd *= 0.85; this.maxhp = 8; this.hp = 8; this.dmg *= 1.3; this.range *= 0.92; }
    if (diagId === 'anxiety') { this.maxhp = 4; this.hp = 4; this.spd *= 1.1; }
    if (diagId === 'schizo') { this.dmg *= 1.2; }
    if (diagId === 'fine') { this.flags.fineMode = true; }
    const D = DATA.DIAG[diagId];
    if (D && D.rx) this.addItem(D.rx, null, true);
  }

  addItem(id, G, silent) {
    const it = DATA.ITEMS[id];
    if (!it) return;
    this.items.push(id);
    it.apply(this, G);
    Meta.data.itemsSeen++;
    if (!silent) {
      this.itemHold = 2.0; this.itemHoldName = it.name; this.itemHoldQuote = it.quote;
      this.iframes = Math.max(this.iframes, 2.0);
      SFX.play('item');
    }
  }

  effSpd() {
    let s = this.spd;
    if (this.diag === 'bipolar') {
      if (this.flags.stable) s *= 1.15;
      else s *= this.mania ? 1.3 : 0.85;
    }
    if (this.adren) s *= 1.2;
    if (this.tempSlow > 0) s *= 0.6;
    if (this.inZoneSlow) s *= 0.62;
    return s;
  }
  effDmg() {
    let d = this.dmg;
    if (this.diag === 'bipolar') {
      if (this.flags.stable) d *= 1.15;
      else d *= this.mania ? 1.3 : 0.85;
    }
    if (this.focused) d *= 1.5;
    if (this.flags.fineMode) d *= 1.15;
    return d;
  }
  effTearDelay() {
    let t = this.tearDelay;
    if (this.adren) t *= 0.85;
    if (this.flags.fineMode) t *= 0.94;
    if (G && G.tearsAura) t *= 1.3;
    return Math.max(0.09, t);
  }

  update(dt, G) {
    this.iframes -= dt; this.hurtFlash -= dt; this.itemHold -= dt;
    this.tempSlow -= dt; this.tearTimer -= dt;

    // mood cycle
    if (this.diag === 'bipolar' && !this.flags.stable) {
      this.moodT += dt;
      if (this.moodT >= 10) { this.moodT = 0; this.mania = !this.mania; SFX.play('voice'); }
    }

    // movement
    const mv = Input.getMove();
    this.moving = (Math.abs(mv.x) > 0.05 || Math.abs(mv.y) > 0.05);
    if (this.itemHold > 0.6) { /* holding item up: brief pause */ }
    else {
      const s = this.effSpd();
      this.x += mv.x * s * dt;
      this.y += mv.y * s * dt;
    }

    // hyperfocus (adhd)
    if (this.diag === 'adhd') {
      if (!this.moving) { this.focusT += dt; this.focused = this.focusT >= 1; }
      else { this.focusT = 0; this.focused = false; }
    }

    // adrenaline (anxiety)
    if (this.diag === 'anxiety') {
      this.adren = false;
      for (const e of G.enemies) if (!e.fake && U.dist(this.x, this.y, e.x, e.y) < 150) { this.adren = true; break; }
      if (!this.adren && G.boss && !G.boss.dead && U.dist(this.x, this.y, G.boss.x, G.boss.y) < 190) this.adren = true;
    }

    // zone effects
    this.inZoneSlow = false;
    for (const z of G.zones) {
      if (U.dist(this.x, this.y, z.x, z.y) < z.r + this.r * 0.4) {
        if (z.kind === 'slow' || z.kind === 'ash' || z.kind === 'tolerance') this.inZoneSlow = true;
        if (z.kind === 'ember' && this.iframes <= 0) this.hurt(1, G);
      }
    }

    // collide walls & tiles
    const cc = collideTiles(G.room.layout, this.x, this.y, this.r - 2);
    this.x = cc.x; this.y = cc.y;
    this.x = U.clamp(this.x, RX + this.r - 6, RX + RW - this.r + 6);
    this.y = U.clamp(this.y, RY + this.r - 6, RY + RH - this.r + 6);

    // spikes
    const t = pxToTile(this.x, this.y);
    if (t.c >= 0 && t.r >= 0 && t.c < COLS && t.r < ROWS && G.room.layout[t.r][t.c] === 3 && this.iframes <= 0) this.hurt(1, G);

    // shooting
    const aim = Input.getAim(this.x, this.y);
    if (aim) this.aimAng = Math.atan2(aim.y, aim.x);
    if (aim && this.tearTimer <= 0 && this.itemHold <= 0.6) {
      this.tearTimer = this.effTearDelay();
      let a = Math.atan2(aim.y, aim.x);
      let wob = this.flags.noWobble ? 0 : this.wobble * (this.focused ? 0.3 : 1);
      a += U.rand(-wob, wob);
      const mvBoost = 0.22;
      const vx = Math.cos(a) * this.shotSpd + mv.x * this.effSpd() * mvBoost;
      const vy = Math.sin(a) * this.shotSpd + mv.y * this.effSpd() * mvBoost;
      const big = this.diag === 'depression';
      G.tears.push(new Tear(this.x + Math.cos(a) * 12, this.y + Math.sin(a) * 12 - 6, vx, vy, this.effDmg(), this.range, big));
      G.playerFired = true;
      SFX.play('shot');
    }

    for (const f of this.familiars) f.update(dt, G);
  }

  hurt(n, G) {
    if (this.iframes > 0 || this.dead) return;
    if (this.diag === 'depression' && this.blanket) {
      this.blanket = false;
      this.iframes = 1.2;
      G.toast(DATA.TOASTS.blanket);
      SFX.play('whoosh');
      return;
    }
    if (this.diag === 'bipolar' && !this.flags.stable && !this.mania) n = Math.max(1, Math.floor(n / 2));
    this.hp -= n;
    this.iframes = this.iframeTime;
    this.hurtFlash = 0.35;
    G.shake = Math.max(G.shake, 9);
    SFX.play('hurt');
    if (this.flags.hurtNova) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        G.tears.push(new Tear(this.x, this.y, Math.cos(a) * 380, Math.sin(a) * 380, this.effDmg(), 0.5, false));
      }
    }
    if (this.hp <= 0) { this.dead = true; SFX.play('die'); }
  }
  heal(n) { this.hp = Math.min(this.maxhp, this.hp + n); }
}

/* ---------------- tears (player shots) ---------------- */
class Tear {
  constructor(x, y, vx, vy, dmg, range, big) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.life = range;
    this.r = big ? 10 : U.clamp(5 + dmg * 0.35, 5, 9);
    this.big = big;
    this.dead = false;
  }
  update(dt, G) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) { this.splash(G); return; }
    if (this.x < RX - 8 || this.x > RX + RW + 8 || this.y < RY - 8 || this.y > RY + RH + 8) { this.splash(G); return; }
    const t = pxToTile(this.x, this.y);
    if (t.c >= 0 && t.r >= 0 && t.c < COLS && t.r < ROWS) {
      const tile = G.room.layout[t.r][t.c];
      if (tile === 1) { this.splash(G); return; }
      if (tile === 2) { G.damagePaper(t.c, t.r, this.dmg); this.splash(G); return; }
    }
    // hit enemies
    for (const e of G.enemies) {
      if (e.dying || e.spawnT > 0.15) continue;
      if (U.dist(this.x, this.y, e.x, e.y) < this.r + e.r) {
        let d = this.dmg;
        if (G.player.flags.hyperfix && G.hyperfixType === e.id) d *= 1.5;
        if (G.player.flags.hpBars && e.hp >= e.maxhp) d *= 1.15;
        e.hurt(d, G);
        e.x += this.vx * 0.014; e.y += this.vy * 0.014; // knockback
        this.splash(G);
        return;
      }
    }
    if (G.boss && !G.boss.dead && G.boss.vulnerable && U.dist(this.x, this.y, G.boss.x, G.boss.y) < this.r + G.boss.r) {
      G.boss.hurt(this.dmg, G);
      this.splash(G);
      return;
    }
  }
  splash(G) {
    this.dead = true;
    for (let i = 0; i < 5; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-70, 70), U.rand(-90, 10), 0.35, '#7ab8e8', U.rand(2, 4)));
  }
}

/* ---------------- enemy bullets ---------------- */
class EBullet {
  constructor(x, y, vx, vy, dmg, clr, fake) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.r = 7; this.life = 4;
    this.clr = clr || '#d05050';
    this.fake = !!fake;
    this.dud = false; this.dead = false;
    this.t = 0;
  }
  update(dt, G) {
    this.t += dt;
    let f = 1;
    if (G.enemySlow > 0) f *= 0.6;
    if (G.player.flags.slowBullets && U.dist(this.x, this.y, G.player.x, G.player.y) < 140) f *= 0.7;
    if (this.home) {
      const want = U.ang(this.x, this.y, G.player.x, G.player.y);
      const cur = Math.atan2(this.vy, this.vx);
      let da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      const turn = U.clamp(da, -this.home * dt, this.home * dt);
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = Math.cos(cur + turn) * spd; this.vy = Math.sin(cur + turn) * spd;
    }
    this.x += this.vx * f * dt; this.y += this.vy * f * dt;
    this.life -= dt;
    if (this.dud && this.t > 0.5) { this.fizzle(G); return; }
    if (this.life <= 0) { this.dead = true; return; }
    if (this.x < RX - 6 || this.x > RX + RW + 6 || this.y < RY - 6 || this.y > RY + RH + 6) { this.dead = true; return; }
    const t = pxToTile(this.x, this.y);
    if (t.c >= 0 && t.r >= 0 && t.c < COLS && t.r < ROWS && G.room.layout[t.r][t.c] === 1) { this.fizzle(G); return; }
    // familiars block
    for (const fam of G.player.familiars) {
      if (fam.blockR > 0 && U.dist(this.x, this.y, fam.x, fam.y) < fam.blockR) { fam.block(G); this.dead = true; return; }
    }
    // hit player
    const p = G.player;
    if (U.dist(this.x, this.y, p.x, p.y) < this.r + p.r - 3) {
      if (this.fake) { this.fizzle(G); return; }
      p.hurt(this.dmg, G);
      this.dead = true;
    }
  }
  fizzle(G) {
    this.dead = true;
    for (let i = 0; i < 3; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-40, 40), U.rand(-40, 40), 0.25, this.clr, 2.5));
  }
}

/* ---------------- enemies ---------------- */
class Enemy {
  constructor(id, x, y, depth, fake, hpMult, elite) {
    const D = DATA.ENEMIES[id];
    const dif = DATA.difficulty(depth);
    const E = elite ? DATA.ELITES.find(e => e.id === elite) : null;
    this.id = id;
    this.elite = E ? E.id : null;
    this.eliteTint = E ? E.tint : null;
    this.x = x; this.y = y; this.r = D.r * (E ? E.sz : 1);
    const hp = D.hp * dif.enemyHp * (hpMult || 1) * (E ? E.hp : 1);
    this.maxhp = this.hp = fake ? 1 : hp;
    this.spd = D.spd * dif.enemySpd * (E ? E.spd : 1);
    this.dmg = D.dmg * dif.enemyDmg + (E ? (E.dmg - 1) : 0);
    this.fake = !!fake;
    this.beh = D.beh; this.clr = D.clr;
    this.t = U.rand(0, 3); this.state = 0; this.stateT = 0;
    this.vx = 0; this.vy = 0;
    this.shotCd = (D.shotCd || 0) * dif.shotRate;
    this.shotT = U.rand(0.6, (this.shotCd || 1.5));
    this.bulSpd = (D.bulSpd || 180) * (1 + Math.min(0.4, 0.012 * (depth - 1)));
    this.hitFlash = 0;
    this.spawnT = 0.55;
    this.dying = false; this.deadDone = false;
    this.noDrop = false;
    this.fuse = -1; // redflag
    this.dashDir = null;
    this.wanderA = U.rand(0, TAU);
    if (this.beh === 'bounce') { const a = U.choice([1, 3, 5, 7]) * Math.PI / 4; this.vx = Math.cos(a) * this.spd; this.vy = Math.sin(a) * this.spd; }
  }

  update(dt, G) {
    this.t += dt; this.hitFlash -= dt;
    if (this.spawnT > 0) { this.spawnT -= dt; return; }
    if (this.dying) return;
    const p = G.player;
    const slowF = G.enemySlow > 0 ? 0.55 : 1;
    const S = this.spd * slowF;

    switch (this.beh) {
      case 'chase': {
        const a = U.ang(this.x, this.y, p.x, p.y) + Math.sin(this.t * 3) * 0.3;
        this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt;
        break;
      }
      case 'bounce': {
        let nx = this.x + this.vx * slowF * dt, ny = this.y + this.vy * slowF * dt;
        if (nx < RX + this.r || nx > RX + RW - this.r) { this.vx *= -1; nx = this.x; }
        if (ny < RY + this.r || ny > RY + RH - this.r) { this.vy *= -1; ny = this.y; }
        const tc = pxToTile(nx, ny);
        if (tc.c >= 0 && tc.r >= 0 && tc.c < COLS && tc.r < ROWS && tileSolid(G.room.layout, tc.c, tc.r)) {
          const tcx = pxToTile(nx, this.y), tcy = pxToTile(this.x, ny);
          if (tileSolid(G.room.layout, tcx.c, tcx.r)) this.vx *= -1;
          if (tileSolid(G.room.layout, tcy.c, tcy.r)) this.vy *= -1;
          nx = this.x; ny = this.y;
        }
        this.x = nx; this.y = ny;
        break;
      }
      case 'larper': {
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a + Math.sin(this.t * 2.2) * 0.8) * S * dt;
        this.y += Math.sin(a + Math.sin(this.t * 2.2) * 0.8) * S * dt;
        this.shotT -= dt;
        if (this.shotT <= 0 && U.dist(this.x, this.y, p.x, p.y) < 330) {
          this.shotT = this.shotCd;
          this.fireAt(G, p.x, p.y, this.bulSpd, '#9db8d8');
        }
        break;
      }
      case 'shooter': {
        const d = U.dist(this.x, this.y, p.x, p.y);
        const a = U.ang(this.x, this.y, p.x, p.y);
        const dir = d > 240 ? 1 : d < 170 ? -1 : 0;
        this.x += Math.cos(a) * S * dir * dt + Math.cos(this.t * 1.7) * 30 * dt;
        this.y += Math.sin(a) * S * dir * dt + Math.sin(this.t * 1.3) * 30 * dt;
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = this.shotCd;
          for (const off of [-0.28, 0, 0.28]) this.fireAt(G, p.x, p.y, this.bulSpd, '#e0a03a', off);
          SFX.play('pop');
        }
        break;
      }
      case 'mirror': {
        const cx = RX + RW / 2, cy = RY + RH / 2;
        const tx = 2 * cx - p.x, ty = 2 * cy - p.y;
        this.x += (tx - this.x) * 2.2 * dt;
        this.y += (ty - this.y) * 2.2 * dt;
        this.shotT -= dt;
        if (G.playerFired && this.shotT <= 0) {
          this.shotT = 1.0;
          this.fireAt(G, p.x, p.y, this.bulSpd, '#8a6be0');
        }
        break;
      }
      case 'charger': {
        if (this.state === 0) {
          this.wanderA += U.rand(-2, 2) * dt;
          this.x += Math.cos(this.wanderA) * S * dt; this.y += Math.sin(this.wanderA) * S * dt;
          const alignX = Math.abs(p.x - this.x) < 26, alignY = Math.abs(p.y - this.y) < 26;
          if (alignX || alignY) {
            this.state = 1; this.stateT = 0.45;
            this.dashDir = alignX ? { x: 0, y: Math.sign(p.y - this.y) } : { x: Math.sign(p.x - this.x), y: 0 };
            SFX.play('charge');
          }
        } else if (this.state === 1) {
          this.stateT -= dt;
          if (this.stateT <= 0) { this.state = 2; }
        } else if (this.state === 2) {
          const dash = 430 * slowF;
          const nx = this.x + this.dashDir.x * dash * dt, ny = this.y + this.dashDir.y * dash * dt;
          const tc = pxToTile(nx + this.dashDir.x * this.r, ny + this.dashDir.y * this.r);
          const hitWall = nx < RX + this.r || nx > RX + RW - this.r || ny < RY + this.r || ny > RY + RH - this.r ||
            (tc.c >= 0 && tc.r >= 0 && tc.c < COLS && tc.r < ROWS && tileSolid(G.room.layout, tc.c, tc.r));
          if (hitWall) { this.state = 3; this.stateT = 0.6; G.shake = Math.max(G.shake, 5); }
          else { this.x = nx; this.y = ny; }
        } else { this.stateT -= dt; if (this.stateT <= 0) this.state = 0; }
        break;
      }
      case 'teleport': {
        this.stateT -= dt;
        if (this.state === 0 && this.stateT <= 0) {
          const a = U.rand(0, TAU), d = U.rand(120, 190);
          this.x = U.clamp(p.x + Math.cos(a) * d, RX + 30, RX + RW - 30);
          this.y = U.clamp(p.y + Math.sin(a) * d, RY + 30, RY + RH - 30);
          this.state = 1; this.stateT = 0.45;
          for (let i = 0; i < 6; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-50, 50), U.rand(-50, 50), 0.4, this.clr, 3));
        } else if (this.state === 1 && this.stateT <= 0) {
          const a = U.ang(this.x, this.y, p.x, p.y);
          this.vx = Math.cos(a) * 330; this.vy = Math.sin(a) * 330;
          this.state = 2; this.stateT = 0.45;
        } else if (this.state === 2) {
          this.x += this.vx * slowF * dt; this.y += this.vy * slowF * dt;
          if (this.stateT <= 0) { this.state = 0; this.stateT = U.rand(1.4, 2.2); }
        }
        break;
      }
      case 'bomber': {
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt;
        if (this.fuse < 0 && U.dist(this.x, this.y, p.x, p.y) < 46) { this.fuse = 0.55; }
        if (this.fuse >= 0) {
          this.fuse -= dt;
          if (this.fuse <= 0) { this.explode(G); return; }
        }
        break;
      }
      case 'fog': {
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt;
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = 3;
          if (!this.fake) G.zones.push(new Zone(this.x, this.y, 62, 4.5, 'slow', 'rgba(150,170,160,0.35)'));
        }
        break;
      }
      case 'buffer': {
        const d = U.dist(this.x, this.y, p.x, p.y);
        const a = U.ang(p.x, p.y, this.x, this.y);
        if (d < 260) { this.x += Math.cos(a + 0.6) * S * dt; this.y += Math.sin(a + 0.6) * S * dt; }
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = 2.6;
          let best = null, most = -1;
          for (const e of G.enemies) {
            if (e === this || e.dying || e.fake) continue;
            const miss = e.maxhp - e.hp;
            if (miss > most) { most = miss; best = e; }
          }
          if (best && most > 0 && !this.fake) {
            best.hp = Math.min(best.maxhp, best.hp + 7);
            G.healBeam = { x1: this.x, y1: this.y, x2: best.x, y2: best.y, t: 0.35 };
            SFX.play('voice');
          }
        }
        break;
      }
    }

    // stay in bounds + tile collide (except bounce/charger handle their own walls)
    if (this.beh !== 'bounce') {
      const c = collideTiles(G.room.layout, this.x, this.y, this.r * 0.8);
      this.x = c.x; this.y = c.y;
      this.x = U.clamp(this.x, RX + this.r * 0.7, RX + RW - this.r * 0.7);
      this.y = U.clamp(this.y, RY + this.r * 0.7, RY + RH - this.r * 0.7);
    }

    // gentle separation
    for (const e of G.enemies) {
      if (e === this || e.dying) continue;
      const d = U.dist(this.x, this.y, e.x, e.y);
      if (d < this.r + e.r && d > 0.01) {
        const push = (this.r + e.r - d) * 0.4;
        const a = U.ang(e.x, e.y, this.x, this.y);
        this.x += Math.cos(a) * push * dt * 8; this.y += Math.sin(a) * push * dt * 8;
      }
    }

    // contact damage
    const p2 = G.player;
    if (!this.fake && p2.iframes <= 0 && U.dist(this.x, this.y, p2.x, p2.y) < this.r + p2.r - 4) {
      p2.hurt(this.dmg, G);
    }
  }

  fireAt(G, tx, ty, spd, clr, angOff) {
    const a = U.ang(this.x, this.y, tx, ty) + (angOff || 0);
    const b = new EBullet(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, this.dmg, clr, this.fake);
    if (G.player.flags.tinfoil && (this.beh === 'shooter' || this.beh === 'mirror' || this.beh === 'larper') && U.chance(0.25)) b.dud = true;
    G.eBullets.push(b);
  }

  hurt(d, G, quiet) {
    if (this.dying || this.spawnT > 0.3) return;
    if (this.fake) {
      this.dying = true; this.deadDone = true;
      SFX.play('pop');
      for (let i = 0; i < 10; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-120, 120), U.rand(-120, 120), 0.5, 'rgba(255,255,255,0.8)', 4));
      G.texts.push(new FloatText(this.x, this.y - 20, "wasn't real", '#cbb8e8'));
      return;
    }
    this.hp -= d;
    this.hitFlash = 0.12;
    if (!quiet) SFX.play('hit');
    if (this.hp <= 0) this.die(G);
  }

  explode(G) {
    this.dying = true; this.deadDone = true;
    SFX.play('boom');
    G.shake = Math.max(G.shake, 10);
    for (let i = 0; i < 20; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-220, 220), U.rand(-220, 220), 0.6, U.choice(['#e06a3a', '#e0a03a', '#d04040']), 5));
    const p = G.player;
    if (!this.fake && U.dist(this.x, this.y, p.x, p.y) < 85 + p.r) p.hurt(1, G);
    for (const e of G.enemies) {
      if (e === this || e.dying) continue;
      if (U.dist(this.x, this.y, e.x, e.y) < 85 + e.r) e.hurt(18, G, true);
    }
  }

  die(G) {
    this.dying = true; this.deadDone = true;
    Meta.data.kills++;
    G.stats.kills++;
    if (!G.hyperfixType) G.hyperfixType = this.id;
    makeGibs(G, this.x, this.y, this.clr, Math.round(6 + this.r * 0.4));
    if (this.beh === 'bomber') { this.explode(G); return; }
    if (this.id === 'larper') {
      if (!G.larperToastShown) { G.larperToastShown = true; G.toast(DATA.TOASTS.larper); }
      return; // larpers drop nothing
    }
    if (this.noDrop) return;
    const p = G.player;
    // elites always pay out, and more generously
    if (this.elite) {
      const n = U.randi(2, 3);
      for (let i = 0; i < n; i++) {
        const roll = Math.random();
        const type = roll < 0.34 ? (U.chance(0.4) ? 'half' : 'full') : roll < 0.55 ? 'nickel' : roll < 0.72 ? 'pill' : roll < 0.86 ? 'key' : 'coin';
        G.pickups.push(new Pickup(type, this.x + U.rand(-14, 14), this.y + U.rand(-14, 14)));
      }
      return;
    }
    const dropChance = 0.20 + p.luck * 0.03;
    if (U.chance(dropChance)) {
      const roll = Math.random();
      let type;
      if (roll < 0.42) type = U.chance(0.1) ? 'nickel' : 'coin';
      else if (roll < 0.64) type = 'half';
      else if (roll < 0.72) type = 'full';
      else if (roll < 0.84) type = 'pill';
      else if (roll < 0.92) type = 'key';
      else type = 'bomb';
      G.pickups.push(new Pickup(type, this.x, this.y));
    }
  }
}

/* ---------------- zones (slow clouds, embers, puddles) ---------------- */
class Zone {
  constructor(x, y, r, life, kind, clr) {
    this.x = x; this.y = y; this.r = r; this.life = life;
    this.kind = kind; this.clr = clr || 'rgba(150,170,160,0.3)';
    this.t = 0; this.dead = false;
  }
  update(dt) { this.t += dt; this.life -= dt; if (this.life <= 0) this.dead = true; }
}

/* ---------------- pickups ---------------- */
class Pickup {
  constructor(type, x, y) {
    this.type = type; this.x = x; this.y = y;
    this.t = U.rand(0, 3); this.dead = false;
    this.colorIdx = type === 'pill' ? U.randi(0, 9) : 0;
    this.vx = U.rand(-40, 40); this.vy = U.rand(-40, 40); this.settle = 0.3;
  }
  update(dt, G) {
    this.t += dt;
    if (this.settle > 0) {
      this.settle -= dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.x = U.clamp(this.x, RX + 14, RX + RW - 14);
      this.y = U.clamp(this.y, RY + 14, RY + RH - 14);
    }
    const p = G.player;
    if (U.dist(this.x, this.y, p.x, p.y) < 20 + p.r) {
      switch (this.type) {
        case 'coin': p.coins++; SFX.play('coin'); break;
        case 'nickel': p.coins += 5; SFX.play('coin'); G.texts.push(new FloatText(this.x, this.y, '+5', '#e8c84c')); break;
        case 'half': if (p.hp >= p.maxhp) return; p.heal(1); SFX.play('heal'); break;
        case 'full': if (p.hp >= p.maxhp) return; p.heal(2); SFX.play('heal'); break;
        case 'pill':
          if (p.pill != null) return;
          p.pill = this.colorIdx; SFX.play('pickup'); break;
        case 'key': p.keys++; SFX.play('pickup'); break;
        case 'bomb': p.bombs++; SFX.play('pickup'); break;
      }
      this.dead = true;
    }
  }
}

/* ---------------- placed bombs (claim forms) ---------------- */
class BombEnt {
  constructor(x, y) { this.x = x; this.y = y; this.fuse = 1.4; this.dead = false; }
  update(dt, G) {
    this.fuse -= dt;
    if (this.fuse <= 0) {
      this.dead = true;
      G.explode(this.x, this.y, 95, 32);
    }
  }
}

/* ---------------- particles & floating text ---------------- */
class Particle {
  constructor(x, y, vx, vy, life, clr, r) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.max = life; this.clr = clr; this.r = r || 3;
    this.dead = false;
    this.gib = false; this.grav = 0; this.rot = 0; this.vr = 0; this.settled = false;
  }
  update(dt) {
    if (this.settled) { this.life -= dt; if (this.life <= 0) this.dead = true; return; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.grav) {
      this.vy += this.grav * dt;
      this.vx *= 0.985; // gibs keep horizontal momentum longer
      this.rot += this.vr * dt;
      // settle on the floor plane
      if (this.vy > 0 && this.life < this.max * 0.55 && Math.abs(this.vx) < 40) {
        this.settled = true; this.life = Math.min(this.life, 0.9);
      }
    } else {
      this.vx *= 0.92; this.vy *= 0.92;
    }
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

/* chunky gib burst used when things die — Isaac-style viscera */
function makeGibs(G, x, y, clr, n) {
  for (let i = 0; i < n; i++) {
    const p = new Particle(x, y, U.rand(-190, 190), U.rand(-260, -40), U.rand(0.5, 1.0), clr, U.rand(3, 6.5));
    p.gib = true; p.grav = U.rand(900, 1300); p.rot = U.rand(0, TAU); p.vr = U.rand(-12, 12);
    G.parts.push(p);
  }
  if (Render && Render.splat) Render.splat(G.room, x, y, clr);
}
class FloatText {
  constructor(x, y, txt, clr) { this.x = x; this.y = y; this.txt = txt; this.clr = clr || '#fff'; this.life = 1.1; this.dead = false; }
  update(dt) { this.y -= 28 * dt; this.life -= dt; if (this.life <= 0) this.dead = true; }
}

/* ---------------- room population ---------------- */
function spawnEnemiesForRoom(room, depth, G) {
  const p = G.player;
  const dif = DATA.difficulty(depth);
  const mods = G.floorMods || {};
  const hpMult = (p.flags.fineMode ? 1.15 : 1) * (mods.hpMul || 1);
  let count = dif.count;
  if (mods.countMul) count = Math.round(count * mods.countMul);
  count = U.clamp(count + U.randi(-1, 1), 3, 16);
  const champChance = U.clamp(dif.champChance + (mods.champAdd || 0), 0, 0.75);
  const spots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (room.layout[r][c] !== 0) continue;
    const px = tileToPx(c, r);
    if (U.dist(px.x, px.y, p.x, p.y) < 175) continue;
    spots.push(px);
  }
  const chosen = U.shuffle(spots).slice(0, count);
  const spawned = [];
  for (const s of chosen) {
    const id = DATA.pickEnemy(depth);
    const elite = (id !== 'redflag' && U.chance(champChance)) ? U.choice(DATA.ELITES).id : null;
    const e = new Enemy(id, s.x + U.rand(-8, 8), s.y + U.rand(-8, 8), depth, false, hpMult, elite);
    if (mods.spdMul) e.spd *= mods.spdMul;
    if (mods.dmgAdd) e.dmg += mods.dmgAdd;
    if (mods.fastSpawn) e.spawnT = 0.22;
    G.enemies.push(e);
    spawned.push(id);
  }
  // schizophrenia: add hallucinated duplicates
  if (p.diag === 'schizo' && spawned.length) {
    const extraSpots = U.shuffle(spots).slice(0, 2);
    for (const s of extraSpots) {
      const id = U.choice(spawned);
      G.enemies.push(new Enemy(id, s.x + U.rand(-8, 8), s.y + U.rand(-8, 8), depth, true, 1));
    }
  }
}
