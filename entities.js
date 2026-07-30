/* =========================================================
   EVERYBODIES GOT SOMETHIN — entities.js
   Player, enemies, tears, familiars, pickups, bombs, particles.
   ========================================================= */
'use strict';

/* ---------------- familiars ---------------- */
/* ---------------- emotional support animals (one equipped, Meta-level) ---------------- */
class Pet {
  constructor(type) {
    this.type = type;
    this.x = CW / 2; this.y = CH / 2 + 30;
    this.t = U.rand(0, 3); this.actT = 2; this.vx = 0; this.vy = 0;
    this.segs = [];   // the Metaphor's body
    this.evo = ((Meta.data.petXp || {})[type] || 0) >= 40;   // 40 rooms together changes an animal
  }
  update(dt, G) {
    const p = G.player;
    this.t += dt; this.actT -= dt;
    if (this.cmdCd > 0) this.cmdCd -= dt;
    if (G._fetchT > 0) G._fetchT -= dt;
    // GUARD MODE: the cat swats everything, every frame, for a moment
    if (this._guardT > 0) {
      this._guardT -= dt;
      for (const b of G.eBullets) {
        if (b.dead || b.fake) continue;
        if (U.dist(this.x, this.y, b.x, b.y) < 110) { this._swipeT = 0.15; this._swipeAt = { x: b.x, y: b.y }; b.fizzle ? b.fizzle(G) : (b.dead = true); }
      }
    }
    // STRIKE: the snake lunges along the aim, biting through
    if (this._lungeT > 0) {
      this._lungeT -= dt;
      this.x += Math.cos(this._lungeA) * 640 * dt;
      this.y += Math.sin(this._lungeA) * 640 * dt;
      this.x = U.clamp(this.x, RX + 10, RX + RW - 10); this.y = U.clamp(this.y, RY + 10, RY + RH - 10);
      for (const e of G.enemies) {
        if (e.fake || e.dying || e.spawnT > 0 || e.charmed) continue;
        if (U.dist(this.x, this.y, e.x, e.y) < 20 + e.r && !(this._bit && this._bit.has(e))) {
          (this._bit || (this._bit = new Set())).add(e);
          e.hurt(Math.max(6, p.dmg * 1.2), G);
        }
      }
      this.segs.unshift({ x: this.x, y: this.y });
      if (this.segs.length > (this.evo ? 16 : 9)) this.segs.pop();
      if (this._lungeT <= 0) this._bit = null;
      return;   // the lunge overrides normal slither
    }
    if (this.type === 'pigeon') {   // flutters near you; periodically finds change
      const a = U.ang(this.x, this.y, p.x - 34, p.y - 8);
      const d = U.dist(this.x, this.y, p.x - 34, p.y - 8);
      if (d > 20) { this.x += Math.cos(a) * Math.min(d * 3, 260) * dt; this.y += Math.sin(a) * Math.min(d * 3, 260) * dt; }
      if (this.actT <= 0) {
        this.actT = this.evo ? 25 : 45;
        G.pickups.push(new Pickup(this.evo && U.chance(0.25) ? 'nickel' : 'coin', this.x, this.y));
        G.texts.push(new FloatText(this.x, this.y - 18, '🕊 found this somewhere', '#c8c0b8'));
        SFX.play('coin');
      }
    } else if (this.type === 'cat') {   // trails you; swats the nearest bullet
      const a = U.ang(this.x, this.y, p.x + 30, p.y + 6);
      const d = U.dist(this.x, this.y, p.x + 30, p.y + 6);
      if (d > 24) { this.x += Math.cos(a) * Math.min(d * 2.6, 240) * dt; this.y += Math.sin(a) * Math.min(d * 2.6, 240) * dt; }
      if (this.actT <= 0) {
        let swatted = 0;
        const cap = this.evo ? 2 : 1;
        for (const b of G.eBullets) {
          if (b.dead || b.fake || swatted >= cap) continue;
          if (U.dist(this.x, this.y, b.x, b.y) < 95) { this._swipeT = 0.2; this._swipeAt = { x: b.x, y: b.y }; b.fizzle ? b.fizzle(G) : (b.dead = true); swatted++; }
        }
        if (swatted) { this.actT = this.evo ? 1.3 : 2.4; SFX.play('swat'); }
      }
      if (this._swipeT > 0) this._swipeT -= dt;
    } else if (this.type === 'snake') {   // slithers at your problems
      let best = null, bd = 1e9;
      for (const e of G.enemies) { if (e.fake || e.spawnT > 0 || e.dying || e.charmed) continue; const d = U.dist(this.x, this.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      const tgt = best || { x: p.x - 26, y: p.y + 14 };
      const a = U.ang(this.x, this.y, tgt.x, tgt.y) + Math.sin(this.t * 5) * 0.5;
      const spd = best ? 150 : 120;
      if (U.dist(this.x, this.y, tgt.x, tgt.y) > (best ? 4 : 30)) { this.x += Math.cos(a) * spd * dt; this.y += Math.sin(a) * spd * dt; }
      if (best && U.dist(this.x, this.y, best.x, best.y) < (this.evo ? 23 : 19) + best.r) best.hurt((this.evo ? 9 : 6) * dt, G, true);
      this.segs.unshift({ x: this.x, y: this.y });
      if (this.segs.length > (this.evo ? 16 : 9)) this.segs.pop();
    } else if (this.type === 'goldfish') {   // bowl bobs beside you; nearby enemies forget
      this.x = p.x - 30 + Math.sin(this.t * 1.3) * 5;
      this.y = p.y - 22 + Math.sin(this.t * 2.1) * 3;
      if (this.actT <= 0) {
        let dazed = 0;
        const cap = this.evo ? 2 : 1;
        const sorted = G.enemies.filter(e => !e.fake && e.spawnT <= 0 && !e.dying && U.dist(this.x, this.y, e.x, e.y) < 140)
          .sort((a, b2) => U.dist(this.x, this.y, a.x, a.y) - U.dist(this.x, this.y, b2.x, b2.y));
        for (const e of sorted) { if (dazed >= cap) break; e._dazeT = 1.3; G.texts.push(new FloatText(e.x, e.y - 20, '…who?', '#8fd0e0')); dazed++; }
        if (dazed) { this.actT = this.evo ? 5 : 8; SFX.play('voice'); }
      }
    }
    this.x = U.clamp(this.x, RX + 10, RX + RW - 10);
    this.y = U.clamp(this.y, RY + 10, RY + RH - 10);
  }
}

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

/* ---------------- Support Group allies ----------------
   Recruited patients that trail the player and lay down diagnosis-flavored fire.
   They take chip damage from enemy shots; at 0 HP they're "downed" until you
   clear the room (revive()). Persist on p.allies across rooms and floors. */
class Ally {
  constructor(id) {
    const A = DATA.ALLIES.find(a => a.id === id) || DATA.ALLIES[0];
    this.id = A.id; this.name = A.name; this.diag = A.diag; this.tint = A.tint; this.kind = A.kind;
    this.x = CW / 2; this.y = CH / 2;
    this.maxhp = 3; this.hp = 3; this.dmgMul = 1;   // dmgMul bumped by the Facilitator talent
    this.fireCd = U.rand(0, 0.8); this.downT = 0;   // downT >= 999 = knocked out until room clear
    this.t = U.rand(0, TAU); this.hitFlash = 0; this.orbit = U.rand(0, TAU);
  }
  fireRate() { return this.kind === 'anxious' ? 0.5 : this.kind === 'manic' ? 0.95 : this.kind === 'heavy' ? 1.5 : this.kind === 'paranoid' ? 1.2 : 1.05; }
  fire(G, tgt) {
    const a = U.ang(this.x, this.y, tgt.x, tgt.y);
    const mk = (ang, spd, dmg, big) => { const tr = new Tear(this.x, this.y, Math.cos(ang) * spd, Math.sin(ang) * spd, dmg * this.dmgMul, 0.85, big); tr._ally = true; tr.clr = this.tint; G.tears.push(tr); };
    if (this.kind === 'anxious') mk(a + U.rand(-0.22, 0.22), 380, 1.8);
    else if (this.kind === 'manic') { for (let i = -1; i <= 1; i++) mk(a + i * 0.17, 400, 2.0); }
    else if (this.kind === 'heavy') mk(a, 300, 6, true);
    else if (this.kind === 'paranoid') { const tr = new Tear(this.x, this.y, Math.cos(a) * 340, Math.sin(a) * 340, 3 * this.dmgMul, 1.1, false); tr._ally = true; tr.home = 2.4; tr.clr = this.tint; G.tears.push(tr); }
    else if (this.kind === 'precise') { mk(a - 0.09, 360, 2.3); mk(a + 0.09, 360, 2.3); }
    else mk(a, 360, 3);
    SFX.play('shot');
  }
  revive() { if (this.downT >= 999) { this.downT = 0; this.hp = this.maxhp; } }
  update(dt, G) {
    this.t += dt; this.hitFlash -= dt;
    const p = G.player;
    if (this.downT > 0) {   // knocked out: slump near the player, wait for the room to clear
      const a2 = U.ang(this.x, this.y, p.x, p.y);
      if (U.dist(this.x, this.y, p.x, p.y) > 70) { this.x += Math.cos(a2) * 60 * dt; this.y += Math.sin(a2) * 60 * dt; }
      return;
    }
    // trail the player at a comfortable orbit
    this.orbit += dt * 0.6;
    const tx = p.x + Math.cos(this.orbit) * 60, ty = p.y + Math.sin(this.orbit) * 48;
    this.x += (tx - this.x) * Math.min(1, dt * 4); this.y += (ty - this.y) * Math.min(1, dt * 4);
    this.x = U.clamp(this.x, RX + 12, RX + RW - 12); this.y = U.clamp(this.y, RY + 12, RY + RH - 12);
    // pick a target and lay down fire
    let best = null, bd = 1e9;
    for (const e of G.enemies) { if (e.fake || e.dying || e.spawnT > 0 || e.charmed) continue; const d = U.dist(this.x, this.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    if (!best && G.boss && !G.boss.dead && G.boss.vulnerable !== false) { best = G.boss; }
    this.fireCd -= dt;
    if (best && this.fireCd <= 0) { this.fireCd = this.fireRate(); this.fire(G, best); }
    // enemy fire can wear an ally down
    for (const b of G.eBullets) {
      if (b.fake || b.dead) continue;
      if (U.dist(this.x, this.y, b.x, b.y) < 12 + b.r) {
        b.dead = true; this.hp -= 1; this.hitFlash = 0.3; SFX.play('hurt');
        for (let i = 0; i < 3; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-50, 50), U.rand(-50, 50), 0.3, this.tint, 2.5));
        if (this.hp <= 0) { this.downT = 999; G.toast(this.name + ' is overwhelmed…', this.tint); for (let i = 0; i < 6; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-90, 90), U.rand(-90, 90), 0.5, this.tint, 3)); }
        break;
      }
    }
  }
}

/* ---------------- player ---------------- */
class Player {
  constructor(diagId, variant) {
    this.x = CW / 2; this.y = RY + RH - 90;
    this.r = 15;
    this.diag = diagId;
    this.variant = !!variant;   // Second Opinion (unlockable alt version)
    this.maxhp = 6; this.hp = 6;
    this.spd = 225;
    this.tearDelay = 0.40; this.tearTimer = 0;
    this.dmg = 4.0; this.shotSpd = 440; this.range = 0.9;
    this.wobble = 0; this.luck = 0;
    this.coins = 3; this.keys = 1; this.bombs = 1; this.coupons = 0;
    this.pill = U.randi(0, 9);
    this.flags = {};
    this.items = [];
    this.familiars = [];
    this.allies = [];   // The Support Group (recruited AI companions)
    this.iframes = 0; this.iframeTime = 1.2;
    this.tempSlow = 0;
    this.moodT = 0; this.mania = true;
    this.focusT = 0; this.focused = false;
    this.compulsion = 0; this.buffT = 0; this._hadLive = false;   // OCD
    this.lastHitT = 999; this.startleT = 0;   // PTSD (On Edge timer + startle cooldown)
    this.sleep = 100; this.wired = false; this.napActive = 0; this._halluCd = 0; this._microCd = 0;   // Insomnia
    this.battery = 100; this.overdrive = false;   // Burnout: the tank
    this.trinket = null; this._rosaryUsed = false;   // Personal Effects (held charm)
    this.adren = false;
    this.blanket = (diagId === 'depression');
    this.pillsThisFloor = 0;
    this.aimAng = -Math.PI / 2;
    this.moving = false;
    this.hurtFlash = 0;
    this._lastSrc = null;
    this.dead = false;
    this.itemHold = 0; this.itemHoldName = ''; this.itemHoldQuote = '';
    this.inZoneSlow = false;
    // signature ability
    this.abil = (DATA.ABILITIES && DATA.ABILITIES[diagId]) || null;
    this.abilCd = 0; this.abilMax = this.abil ? this.abil.cd : 0;
    this.dashT = 0; this.dashDir = { x: 0, y: 0 };  // ADHD blink
    this.cocoonT = 0;                                // Depression cocoon (invuln + slow)
    this._transforms = []; this.transformTint = null;

    if (diagId === 'adhd') { this.spd *= 1.22; this.tearDelay *= 0.88; this.wobble = 0.11; }
    if (diagId === 'depression') { this.spd *= 0.85; this.maxhp = 8; this.hp = 8; this.dmg *= 1.3; this.range *= 0.92; }
    if (diagId === 'anxiety') { this.maxhp = 4; this.hp = 4; this.spd *= 1.1; }
    if (diagId === 'schizo') { this.dmg *= 1.2; }
    if (diagId === 'ocd') { this.tearDelay *= 1.06; this.wobble = 0; this.flags.noWobble = true; }   // twin symmetric shot, no wander
    if (diagId === 'ptsd') { this.maxhp = 6; this.hp = 6; this.iframeTime = 1.4; }   // hypervigilant; a hit lingers longer
    if (diagId === 'insomnia') { this.maxhp = 6; this.hp = 6; }   // you don't run on hearts, you run on Sleep
    if (diagId === 'fine') { this.flags.fineMode = true; }
    this.baseDiag = diagId;   // the Undiagnosed keeps 'undiag' here while p.diag swaps per floor
    // Second Opinion overrides — one strong rule-flip each, applied over the base kit
    if (this.variant) {
      if (diagId === 'adhd') { this._lastMv = { x: 0, y: -1 }; }                               // NO BRAKES
      if (diagId === 'depression') { this.spd = 225; this.maxhp = 6; this.hp = 6; this.dmg = 4.0; this.range = 0.9; this.blanket = false; }   // THE MASK
      if (diagId === 'anxiety') { this.adren = true; this._panicT = 0; }                       // ALWAYS ON
      if (diagId === 'schizo') { this.dmg *= 1.125; }                                          // TUNNEL (1.2 × 1.125 = 1.35)
      if (diagId === 'ptsd') { this._scar = 0; }                                               // SCAR TISSUE
      if (diagId === 'insomnia') { this.sleep = 0; this.wired = true; this.espT = 0; this.abil = { name: 'Espresso', cd: 9, blurb: 'Knock one back: a hard burst of speed and every nearby shot fizzles. Sleep remains cancelled.' }; this.abilMax = 9; }   // ALL-NIGHTER
      if (diagId === 'fine') { this._recRooms = 0; this.flags.recovery = true; }               // IN RECOVERY
    }
    const D = DATA.DIAG[diagId];
    if (D && D.rx) this.addItem(D.rx, null, true);
  }

  addItem(id, G, silent) {
    const it = DATA.ITEMS[id];
    if (!it) return;
    this.items.push(id);
    it.apply(this, G);
    Meta.data.itemsSeen++;
    Meta.see('items', id);
    if (!silent) {
      this.itemHold = 2.0; this.itemHoldName = it.name; this.itemHoldQuote = it.quote;
      this.iframes = Math.max(this.iframes, 2.0);
      SFX.play('item');
      Haptics.buzz([20, 40, 30], 0);
    }
    // item synergies: some prescriptions were meant for each other
    if (G && DATA.SYNERGIES) {
      this._synergies = this._synergies || [];
      for (const sy of DATA.SYNERGIES) {
        if (this._synergies.includes(sy.id)) continue;
        if (this.items.includes(sy.a) && this.items.includes(sy.b)) {
          this._synergies.push(sy.id);
          try { sy.apply(this, G); } catch (e) { }
          if (G.setBanner) G.setBanner('✨ SYNERGY: ' + sy.name, sy.desc, 3.0);
          if (G.toast) G.toast('✨ ' + DATA.ITEMS[sy.a].name + ' + ' + DATA.ITEMS[sy.b].name + ' = ' + sy.name, '#e8c84c');
          SFX.play('evolve');
        }
      }
    }
    // prescription transformations: 3 of a theme -> transform
    if (G && DATA.TRANSFORMS) {
      for (const t of DATA.TRANSFORMS) {
        if (this._transforms.includes(t.name)) continue;
        const owned = this.items.filter(x => DATA.ITEM_THEMES[t.theme].indexOf(x) >= 0).length;
        if (owned >= t.need) {
          this._transforms.push(t.name); this.transformTint = t.tint;
          try { t.apply(this); } catch (e) { }
          G.toast('✨ TRANSFORMATION: ' + t.name + '!', '#e8c84c');
          SFX.play('item'); Haptics.buzz([30, 40, 60], 0);
        }
      }
    }
    if (G && G.checkUnlocks) G.checkUnlocks();   // item-driven achievements land immediately
    if (G && G.goalEvent && !silent) G.goalEvent('item');   // Treatment Adherent (starters don't count)
  }

  effSpd() {
    let s = this.spd;
    if (this.diag === 'bipolar') {
      if (this.flags.stable) s *= 1.15;
      else if (this.variant) s *= this.mania ? 1.4 : 0.7;   // Ultradian: wilder weather
      else s *= this.mania ? 1.3 : 0.85;
    }
    if (this.espT > 0) s *= 1.5;   // ☕ Espresso Shot
    if (this.trinket === 'hallpass' && G && G.room && G.room.cleared) s *= 1.1;   // allowed to be here
    if (this.adren) s *= 1.2;
    if (this.diag === 'insomnia' && this.wired) s *= 1.08;   // jittery, running on fumes
    if (this.tempSlow > 0) s *= 0.6;
    if (this.inZoneSlow) s *= 0.62;
    if (this.cocoonT > 0) s *= 0.4;   // Under The Covers
    if (G && G.rapidMods) s *= G.rapidMods.spd;   // Rapid Cycling
    return s;
  }
  /* signature 'PRN' ability, one per diagnosis */
  useAbility(G) {
    if (!this.abil || this.abilCd > 0 || this.dead) return;
    this.abilCd = this.abilMax;
    Haptics.buzz([15, 30, 20], 0);
    switch (this.diag) {
      case 'adhd': {   // Blink — dash in the current move/aim direction, briefly untouchable
        const mv = Input.getMove();
        let dx = mv.x, dy = mv.y;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) { dx = Math.cos(this.aimAng); dy = Math.sin(this.aimAng); }
        const n = U.norm(dx, dy); this.dashDir = n; this.dashT = 0.16; this.iframes = Math.max(this.iframes, 0.35);
        SFX.play('whoosh');
        for (let i = 0; i < 8; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-120, 120), U.rand(-120, 120), 0.3, '#f7b32b', 3));
        break;
      }
      case 'bipolar': {   // Mood Swing — force a fresh mania high
        this.flags.stable = false; this.mania = true; this.moodT = 0;
        this.iframes = Math.max(this.iframes, 0.4);
        G.toast('▲ MANIA — on demand', '#e8c84c'); SFX.play('voice');
        for (let i = 0; i < 10; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-160, 160), U.rand(-160, 160), 0.4, '#e8c84c', 3));
        break;
      }
      case 'depression': {   // Under The Covers — cocoon: invulnerable but slowed
        this.cocoonT = 1.6; this.iframes = Math.max(this.iframes, 1.6);
        G.toast('🛏 under the covers…', '#5d8aa8'); SFX.play('whoosh');
        break;
      }
      case 'anxiety': {   // Panic — nova that wipes nearby bullets and shoves enemies
        this.iframes = Math.max(this.iframes, 0.4);
        for (const b of G.eBullets) if (U.dist(this.x, this.y, b.x, b.y) < 170) b.fizzle(G);
        for (const e of G.enemies) { if (e.dying) continue; const d = U.dist(this.x, this.y, e.x, e.y); if (d < 170 && d > 0.01) { const a = U.ang(this.x, this.y, e.x, e.y); e.x += Math.cos(a) * 60; e.y += Math.sin(a) * 60; e.hurt(4, G, true); } }
        G.shake = Math.max(G.shake, 8);
        for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; G.parts.push(new Particle(this.x, this.y, Math.cos(a) * 260, Math.sin(a) * 260, 0.4, '#43b8a5', 4)); }
        G.toast('!!! PANIC !!!', '#43b8a5'); SFX.play('boom');
        break;
      }
      case 'schizo': {   // Reality Check — pop every hallucination in the room
        let popped = 0;
        for (const e of G.enemies) if (e.fake && !e.dying) { e.hurt(1, G); popped++; }
        this.iframes = Math.max(this.iframes, 0.3);
        G.toast(popped ? ('the voice was right: ' + popped + ' weren\'t real') : 'nothing here is fake… this time', '#cbb8e8');
        SFX.play('pop');
        break;
      }
      case 'ocd': {   // Recheck — wipe nearby bullets, reset compulsion, lock in FOCUS
        for (const b of G.eBullets) if (U.dist(this.x, this.y, b.x, b.y) < 150) b.fizzle(G);
        this.compulsion = 0; this.buffT = 5; this.focused = true;
        this.iframes = Math.max(this.iframes, 0.4);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; G.parts.push(new Particle(this.x, this.y, Math.cos(a) * 150, Math.sin(a) * 150, 0.35, '#6c7ff0', 3)); }
        G.toast('checked. everything\'s fine.', '#6c7ff0'); SFX.play('ui');
        break;
      }
      case 'ptsd': {   // 5-4-3-2-1 — ground yourself: wipe nearby danger, slow the room, come back to now
        for (const b of G.eBullets) if (U.dist(this.x, this.y, b.x, b.y) < 160) b.fizzle(G);
        G.slowmo = Math.max(G.slowmo || 0, 2.2);   // the room crawls while you count
        this.iframes = Math.max(this.iframes, 0.5); this.lastHitT = 6; this.startleT = 2.2;
        G.darkTarget = 0;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; G.parts.push(new Particle(this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 22, 0, 0, 0.8, '#c8a878', 4)); }
        G.toast('5… 4… 3… 2… 1.', '#c8a878'); SFX.play('whoosh');
        break;
      }
      case 'insomnia': {
        if (this.variant) {   // ☕ ESPRESSO SHOT — the All-Nighter doesn't nap
          this.espT = 3; this.iframes = Math.max(this.iframes, 0.4);
          for (const b of G.eBullets) if (U.dist(this.x, this.y, b.x, b.y) < 140) b.fizzle(G);
          G.toast('☕ ESPRESSO. sleep remains cancelled.', '#c8a878'); SFX.play('whoosh');
          for (let i = 0; i < 8; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-140, 140), U.rand(-140, 140), 0.35, '#c8a878', 3));
          break;
        }
        // Power Nap — refill Sleep, heal, phase out; but you're helpless for the moment
        this.napActive = 1.0; this.iframes = Math.max(this.iframes, 1.1);
        this.sleep = 100; this.wired = false; this._microCd = 0;
        this.heal(1); G.darkTarget = 0;
        G.toast('😴 power nap…', '#7fd4c8'); SFX.play('whoosh');
        for (let i = 0; i < 6; i++) G.parts.push(new Particle(this.x + U.rand(-14, 14), this.y - 8 - i * 5, U.rand(-8, 8), -26, 1.0, '#7fd4c8', 3));
        break;
      }
      case 'burnout': {   // Clock Out — boundaries, suddenly
        this.battery = 100;
        this.iframes = Math.max(this.iframes, 1.0);
        G.toast('🔋 CLOCKED OUT. Not reachable. Fully charged.', '#d09a3a');
        SFX.play('evolve');
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; G.parts.push(new Particle(this.x, this.y, Math.cos(a) * 150, Math.sin(a) * 150, 0.4, '#e8c05a', 3)); }
        break;
      }
      case 'fine': {   // Denial — briefly refuse to take damage
        this.iframes = Math.max(this.iframes, 1.5);
        G.toast('"I\'m FINE."', '#9e9e9e'); SFX.play('ui');
        for (let i = 0; i < 8; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-80, 80), U.rand(-80, 80), 0.4, '#c8c8c8', 3));
        break;
      }
    }
  }
  effDmg() {
    let d = this.dmg;
    if (this.diag === 'bipolar') {
      if (this.flags.stable) d *= 1.15;
      else if (this.variant) d *= this.mania ? 1.5 : 0.65;   // Ultradian: wilder weather
      else d *= this.mania ? 1.3 : 0.85;
    }
    if (this.focused) d *= 1.5;
    if (this.adren) d *= 1.1;   // anxiety: adrenaline sharpens damage when danger is close
    if (this.flags.fineMode) d *= 1.15;
    if (this.flags.rsd && this.hp >= this.maxhp) d *= 1.22;   // rejection sensitivity: prove them wrong at full HP
    if (this.variant && this.diag === 'adhd' && this.moving) d *= 1.3;   // NO BRAKES: damage on the move
    if (this.variant && this.diag === 'ptsd') d *= 1 + Math.min(0.6, (this._scar || 0) * 0.12);   // SCAR TISSUE
    if (this.diag === 'ptsd' && !this.variant && this.lastHitT > 4) d *= 1.25;   // On Edge: calm and sharp until you're hit
    if (this.diag === 'insomnia' && this.wired) d *= 1.4;   // WIRED: sleep-deprived and dangerous
    if (this.diag === 'burnout') d *= this.battery > 75 ? 1.3 : this.battery < 25 ? 0.55 : 1;   // OVERDRIVE or fumes
    if (G && G.rapidMods) d *= G.rapidMods.dmg;   // Rapid Cycling
    return d;
  }
  effTearDelay() {
    let t = this.tearDelay;
    if (this.adren) t *= 0.85;
    if (this.diag === 'insomnia' && this.wired) t *= 0.8;   // WIRED: twitchy trigger finger
    if (this.diag === 'burnout' && this.battery < 25) t *= 1.2;   // fumes: the trigger finger clocks out too
    if (this.flags.fineMode) t *= 0.94;
    if (G && G.tearsAura) t *= 1.3;
    if (G && G.rapidMods) t *= G.rapidMods.tears;   // Rapid Cycling (tears>1 = slower)
    if (this.flags.beam) t = Math.min(t, 0.075);   // Crying It Out: a continuous stream
    return Math.max(this.flags.beam ? 0.055 : 0.09, t);
  }

  update(dt, G) {
    this.iframes -= dt; this.hurtFlash -= dt; this.itemHold -= dt;
    this.tempSlow -= dt; this.tearTimer -= dt;
    if (this.abilCd > 0) this.abilCd -= dt * (this.trinket === 'fidgetcube' ? 1.25 : 1);   // the cube keeps your hands busy
    // Burnout: THE BATTERY — moving drains, stillness restores
    if (this.diag === 'burnout') {
      const saver = this._battSaver ? 0.75 : 1;
      if (this.moving) this.battery -= 1.6 * saver * dt;
      else this.battery += 9 * dt;
      this.battery = U.clamp(this.battery, 0, 100);
      const od = this.battery > 75;
      if (od && !this.overdrive) G.texts.push(new FloatText(this.x, this.y - 26, '⚡ OVERDRIVE', '#e8c05a'));
      this.overdrive = od;
    }
    if (this.espT > 0) this.espT -= dt;   // ☕ Espresso wears off
    if (this.cocoonT > 0) { this.cocoonT -= dt; this.iframes = Math.max(this.iframes, 0.05); }

    // mood cycle (Ultradian variant flips per ROOM instead — handled in enterRoom)
    if (this.diag === 'bipolar' && !this.flags.stable && !this.variant) {
      this.moodT += dt;
      if (this.moodT >= 10) { this.moodT = 0; this.mania = !this.mania; SFX.play('voice'); }
    }

    // movement
    let mv = Input.getMove();
    this.moving = (Math.abs(mv.x) > 0.05 || Math.abs(mv.y) > 0.05);
    // NO BRAKES: momentum carries you when you try to stop
    if (this.variant && this.diag === 'adhd') {
      if (this.moving) this._lastMv = { x: mv.x, y: mv.y };
      else { mv = { x: this._lastMv.x * 0.55, y: this._lastMv.y * 0.55 }; this.moving = true; }
    }
    if (this.dashT > 0) {   // ADHD Blink: fast, brief, invincible
      this.dashT -= dt;
      this.x += this.dashDir.x * 900 * dt;
      this.y += this.dashDir.y * 900 * dt;
    } else if (this.itemHold > 0.6) { /* holding item up: brief pause */ }
    else if (this.napActive > 0) { /* Power Nap / microsleep: dead to the world */ }
    else {
      const s = this.effSpd();
      this.x += mv.x * s * dt;
      this.y += mv.y * s * dt;
    }

    // hyperfocus (adhd) — impossible when unmedicated (you never stand still)
    if (this.diag === 'adhd' && !this.variant) {
      if (!this.moving) { this.focusT += dt; this.focused = this.focusT >= 1; }
      else { this.focusT = 0; this.focused = false; }
    }

    // adrenaline (anxiety)
    if (this.diag === 'anxiety') {
      if (this.variant) {   // ALWAYS ON — and crowds hurt
        this.adren = true;
        let near = 0;
        for (const e of G.enemies) if (!e.fake && !e.dying && !e.charmed && U.dist(this.x, this.y, e.x, e.y) < 160) near++;
        if (near >= 3) {
          this._panicT = (this._panicT || 0) + dt;
          if (this._panicT >= 3) { this._panicT = 0; this.hurt(1, G, 'panic'); G.toast('too many people. too close.', '#43b8a5'); }
        } else this._panicT = Math.max(0, (this._panicT || 0) - dt * 1.5);
      } else {
        this.adren = false;
        for (const e of G.enemies) if (!e.fake && U.dist(this.x, this.y, e.x, e.y) < 150) { this.adren = true; break; }
        if (!this.adren && G.boss && !G.boss.dead && U.dist(this.x, this.y, G.boss.x, G.boss.y) < 190) this.adren = true;
      }
    }

    // OCD compulsion: clearing a room "clicks" (reset + FOCUS buff); dawdling with things
    // left undone lets intrusive thoughts build until they bite.
    if (this.diag === 'ocd') {
      this.buffT -= dt; this.focused = this.buffT > 0;
      const live = G.enemies.some(e => !e.dying);
      if (this._hadLive && !live) { this.compulsion = 0; this.buffT = 4; this.focused = true; G.toast('…just right.', '#8fd05a'); SFX.play('ui'); }
      this._hadLive = live;
      this.compulsion = U.clamp(this.compulsion + dt * (live ? 7 : 2.2), 0, 100);
      if (this.compulsion >= 100) { this.compulsion = 55; this.hurt(1, G, 'ocd-intrusive'); G.shake = Math.max(G.shake, 4); G.toast('intrusive thought', '#cbb8e8'); }
    }

    // PTSD hypervigilance: track how long since a hit (On Edge), and let a near-miss slow time
    if (this.diag === 'ptsd') {
      this.lastHitT += dt; this.startleT -= dt;
      for (const b of G.eBullets) {
        if (b.fake || b.dead) continue;
        const d = U.dist(this.x, this.y, b.x, b.y);
        if (d < 30 && d > this.r) {   // a shot just grazed you — the world lurches
          const toward = (b.x - this.x) * b.vx + (b.y - this.y) * b.vy < 0;
          if (toward) { G.slowmo = Math.max(G.slowmo || 0, 0.16); break; }
        }
      }
    }

    // Insomnia: Sleep drains as you go. Low Sleep = WIRED (buffed, but the ward dims and
    // hallucinated shots drift in — harmless, but you can't tell). Empty = involuntary microsleeps.
    if (this.diag === 'insomnia') {
      if (this.napActive > 0) this.napActive -= dt;
      const live = G.enemies.some(e => !e.dying && !e.fake);
      if (this.variant) { this.sleep = 0; this.wired = true; }   // ALL-NIGHTER: sleep is cancelled
      else this.sleep = U.clamp(this.sleep - dt * (live ? 4.0 : 2.6), 0, 100);
      const wasWired = this.wired;
      this.wired = this.variant || this.sleep < 35;
      if (this.wired && !wasWired) { G.toast('▲ WIRED', '#7fd4c8'); SFX.play('voice'); }
      if (this.wired) {
        this._halluCd -= dt;
        if (this._halluCd <= 0 && G.eBullets.length < 85) {
          this._halluCd = U.rand(0.45, 1.15) * (this.sleep < 12 ? 0.55 : 1);
          const edge = U.randi(0, 3); let sx, sy;
          if (edge === 0) { sx = RX + U.rand(0, RW); sy = RY + 4; }
          else if (edge === 1) { sx = RX + U.rand(0, RW); sy = RY + RH - 4; }
          else if (edge === 2) { sx = RX + 4; sy = RY + U.rand(0, RH); }
          else { sx = RX + RW - 4; sy = RY + U.rand(0, RH); }
          const a = U.ang(sx, sy, this.x + U.rand(-50, 50), this.y + U.rand(-50, 50));
          const b = new EBullet(sx, sy, Math.cos(a) * 155, Math.sin(a) * 155, 1, '#7fd4c8', true);   // fake: harmless
          b._src = 'hallucination'; b.life = 4.5;
          G.eBullets.push(b);
        }
      }
      if (this.sleep <= 0 && !this.variant) {   // the body takes the sleep it isn't given (the All-Nighter refuses)
        this._microCd -= dt;
        if (this._microCd <= 0) { this._microCd = U.rand(2.6, 4.2); this.napActive = Math.max(this.napActive, 0.3); G.toast('😵 microsleep', '#7fd4c8'); SFX.play('hurt'); }
      }
    }

    // zone effects
    this.inZoneSlow = false;
    for (const z of G.zones) {
      if (U.dist(this.x, this.y, z.x, z.y) < z.r + this.r * 0.4) {
        if (z.kind === 'slow' || z.kind === 'ash' || z.kind === 'tolerance') this.inZoneSlow = true;
        if (z.kind === 'ember' && this.iframes <= 0) this.hurt(1, G, 'ember');
        // PTSD flashback trigger-zone: a cleared room's leftover memory startles you
        if (z.kind === 'trigger' && this.startleT <= 0 && this.iframes <= 0) {
          this.startleT = 1.8; this.hurt(1, G, 'flashback');
          G.shake = Math.max(G.shake, 8); G.darkTarget = Math.max(G.darkTarget || 0, 0.5);
          for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; const b = new EBullet(this.x, this.y, Math.cos(a) * 120, Math.sin(a) * 120, 1, '#c25a52'); b._src = 'flashback'; b.life = 2.2; G.eBullets.push(b); }
          z.dead = true;   // the memory surfaces once, then fades
          G.toast('flashback', '#c25a52'); SFX.play('hurt');
        }
      }
    }

    // collide walls & tiles
    const cc = collideTiles(G.room.layout, this.x, this.y, this.r - 2);
    this.x = cc.x; this.y = cc.y;
    this.x = U.clamp(this.x, RX + this.r - 6, RX + RW - this.r + 6);
    this.y = U.clamp(this.y, RY + this.r - 6, RY + RH - this.r + 6);

    // spikes
    const t = pxToTile(this.x, this.y);
    if (t.c >= 0 && t.r >= 0 && t.c < COLS && t.r < ROWS && G.room.layout[t.r][t.c] === 3 && this.iframes <= 0) this.hurt(1, G, 'spikes');

    // shooting
    let aim = Input.getAim(this.x, this.y);
    // aim assist (sticks/touch only): nudge onto the nearest target within a small cone
    if (aim && Input._aimSrc === 'stick' && (!Meta.data.a11y || Meta.data.a11y.aimAssist !== false)) {
      const aimA = Math.atan2(aim.y, aim.x);
      let best = null, bd = 0.26;   // ~15° cone
      const consider = (e) => {
        if (!e || e.dying || e.dead || e.fake || e.charmed) return;
        const d = U.dist(this.x, this.y, e.x, e.y); if (d < 30 || d > 460) return;
        const da = Math.abs(Math.atan2(Math.sin(U.ang(this.x, this.y, e.x, e.y) - aimA), Math.cos(U.ang(this.x, this.y, e.x, e.y) - aimA)));
        if (da < bd) { bd = da; best = e; }
      };
      for (const e of G.enemies) consider(e);
      if (G.boss && !G.boss.dead && G.boss.vulnerable !== false) consider(G.boss);
      if (best) { const na = U.ang(this.x, this.y, best.x, best.y); aim = { x: Math.cos(na), y: Math.sin(na) }; }
    }
    if (aim) this.aimAng = Math.atan2(aim.y, aim.x);
    if (aim && this.tearTimer <= 0 && this.itemHold <= 0.6 && this.napActive <= 0 && !this.flags.pacifist) {   // Pacifist: no tears — familiars & Claim Forms only
      this.tearTimer = this.effTearDelay();
      if (this.diag === 'burnout') this.battery = U.clamp(this.battery - 2.2 * (this._battSaver ? 0.75 : 1), 0, 100);   // every shot bills the tank
      let a = Math.atan2(aim.y, aim.x);
      let wob = this.flags.noWobble ? 0 : this.wobble * (this.focused ? 0.3 : 1);
      a += U.rand(-wob, wob);
      const mvBoost = 0.22;
      const vx = Math.cos(a) * this.shotSpd + mv.x * this.effSpd() * mvBoost;
      const vy = Math.sin(a) * this.shotSpd + mv.y * this.effSpd() * mvBoost;
      const big = this.diag === 'depression';
      // keystone prescriptions reshape the pattern; else OCD fires a balanced PAIR (symmetry)
      let shots;
      const spdMul = this.flags.beam ? 1.5 : 1;
      if (this.flags.quadShot) shots = [-0.16, -0.055, 0.055, 0.16].map(o => ({ a: a + o, s: 0.45 }));
      else if (this.flags.beam) shots = [{ a: a + U.rand(-0.02, 0.02), s: 0.34 }];
      else if (this.diag === 'ocd' && this.variant) shots = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(o => ({ a: a + o, s: 0.5 }));   // THE RITUAL: the cross must complete
      else if (this.diag === 'ocd') shots = [{ a: a - 0.10, s: 0.6 }, { a: a + 0.10, s: 0.6 }];
      else shots = [{ a: a, s: 1 }];
      for (const sh of shots) {
        const svx = Math.cos(sh.a) * this.shotSpd * spdMul + mv.x * this.effSpd() * mvBoost;
        const svy = Math.sin(sh.a) * this.shotSpd * spdMul + mv.y * this.effSpd() * mvBoost;
        const tear = new Tear(this.x + Math.cos(sh.a) * 12, this.y + Math.sin(sh.a) * 12 - 6, svx, svy, this.effDmg() * sh.s, this.range, big);
        if (this.flags.homingTears) tear.home = 2.2;   // rumination: the tears can't let go
        if (this.flags.spiralTears) tear._spiral = 2.7;         // Spiral Thoughts
        if (this.flags.pierceTears) tear._pierce = 3 + (this._pierceAdd || 0);           // Radical Honesty (+ Open Book)
        if (this.flags.boomTears) { tear._boom = true; tear._life0 = tear.life; }   // Boomerang Chart
        if (this.flags.mortarTears) { tear._mortar = true; tear.r += 2.5; }         // The Ugly Cry
        G.tears.push(tear);
      }
      G.playerFired = true;
      SFX.play('shot');
    }

    for (const f of this.familiars) f.update(dt, G);
    for (const a of this.allies) a.update(dt, G);
    if (this.pet) this.pet.update(dt, G);
  }

  /* The Undiagnosed: Dr. Walrus changes his mind — swap the whole mechanical identity */
  rediagnose(nd) {
    this.diag = nd;
    // reset every per-diagnosis state machine so the new kit starts clean
    this.moodT = 0; this.mania = true;
    this.focusT = 0; this.focused = false; this.buffT = 0;
    this.compulsion = 0; this._hadLive = false;
    this.lastHitT = 999; this.startleT = 0;
    this.sleep = 100; this.wired = false; this.napActive = 0; this._halluCd = 0; this._microCd = 0;
    this.battery = 100; this.overdrive = false;
    this.adren = false; this._panicT = 0;
    this.blanket = (nd === 'depression');
    this.cocoonT = 0; this.dashT = 0; this.espT = 0;
    this._scar = 0;
    this.abil = (DATA.ABILITIES && DATA.ABILITIES[nd]) || null;
    this.abilMax = this.abil ? this.abil.cd : 0;
    this.abilCd = Math.min(this.abilCd, this.abilMax);
  }

  /* keystone prescriptions are exclusive — a new one replaces the old (your prescription changed) */
  clearKeystone() {
    ['beam', 'spiralTears', 'pierceTears', 'quadShot', 'boomTears', 'mortarTears'].forEach(f => delete this.flags[f]);
    Meta.data.everKeystone = 1;   // Off-Label Use (every keystone apply routes through here)
  }

  /* recruit a fellow patient into the Support Group (cap 3, no duplicates while there's fresh blood) */
  recruitAlly(G, id) {
    if (this.allies.length >= 3) { if (G) { G.toast('The group is full (3).', '#8fd05a'); } return false; }
    let pool = DATA.ALLIES.filter(a => !this.allies.some(x => x.id === a.id));
    if (!pool.length) pool = DATA.ALLIES;
    const pick = id ? (DATA.ALLIES.find(a => a.id === id) || U.choice(pool)) : U.choice(pool);
    const ally = new Ally(pick.id);
    ally.x = this.x + U.rand(-40, 40); ally.y = this.y + U.rand(-40, 40);
    if (this.flags.allyTough) { ally.maxhp = 4; ally.hp = 4; ally.dmgMul = 1.35; }   // Facilitator talent
    this.allies.push(ally);
    if (this.allies.length >= 3 && !Meta.data.everFullGroup) { Meta.data.everFullGroup = 1; Meta.save(); if (G && G.checkUnlocks) G.checkUnlocks(); }   // Group Session
    if (G && G.goalEvent) G.goalEvent('ally');
    if (G) { G.toast('🤝 ' + ally.name + ' joined the group!', ally.tint); SFX.play('item'); }
    return true;
  }

  hurt(n, G, src) {
    if (this.iframes > 0 || this.dead) return;
    // Grandma's Rosary: once per floor, a killing blow leaves you standing
    if (this.trinket === 'rosary' && !this._rosaryUsed && this.hp - n <= 0 && src !== 'timeslot') {
      this._rosaryUsed = true;
      this.hp = 1; this.iframes = 1.6; this.hurtFlash = 0.35;
      G.toast('📿 The rosary held. Once.', '#e8c84c');
      G.shake = Math.max(G.shake, 8); SFX.play('whoosh');
      return;
    }
    if (this.diag === 'depression' && this.blanket) {
      this.blanket = false;
      this.iframes = 1.2;
      G.toast(DATA.TOASTS.blanket);
      SFX.play('whoosh');
      Haptics.buzz(22, 0);
      return;
    }
    if (this.diag === 'bipolar' && !this.flags.stable && !this.mania) n = Math.max(1, Math.floor(n / 2));
    if (G.rapidMods && G.rapidMods.def !== 1) n = Math.max(1, Math.round(n * G.rapidMods.def));   // Rapid Cycling defense swing
    if (G.easy) n = Math.max(1, Math.ceil(n * 0.5));   // 'Second Opinion' easy mode
    if (src) this._lastSrc = src;   // cause-of-death tracking for run log
    this.hp -= n;
    this.iframes = this.iframeTime;
    this.hurtFlash = 0.35;
    if (this.diag === 'ptsd') { this.lastHitT = 0; if (this.variant) this._scar = (this._scar || 0) + 1; else if (src !== 'flashback') G.darkTarget = Math.max(G.darkTarget || 0, 0.4); }   // a hit ends On Edge / hardens the Weathered
    if (this.variant && this.diag === 'depression' && this.hp > 0) { this.dmg += 0.35; G.texts.push(new FloatText(this.x, this.y - 30, '“I\'m fine.” +dmg', '#5d8aa8')); }   // THE MASK: it fuels you
    G.floorHits = (G.floorHits || 0) + 1;
    G._roomHits = (G._roomHits || 0) + 1;
    G.shake = Math.max(G.shake, 9);
    // Stress Ball: squeezed on impact — clears the air around you
    if (this.trinket === 'stressball') {
      for (const b of G.eBullets) if (U.dist(this.x, this.y, b.x, b.y) < 130) b.fizzle(G);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; G.parts.push(new Particle(this.x, this.y, Math.cos(a) * 190, Math.sin(a) * 190, 0.3, '#e8c84c', 3)); }
    }
    SFX.play('hurt');
    Haptics.buzz(55, 0);
    Input.rumble(130, 0.8);
    if (this.flags.hurtNova) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        G.tears.push(new Tear(this.x, this.y, Math.cos(a) * 380, Math.sin(a) * 380, this.effDmg(), 0.5, false));
      }
    }
    if (this.flags.hurtCoins) { for (let i = 0; i < 3; i++) G.pickups.push(new Pickup('coin', this.x + U.rand(-30, 30), this.y + U.rand(-30, 30))); }   // oversharing: trauma-dump copays
    // Secondary Infection protocol: every hit breeds a Side Effect
    if (G.protocol === 'infection' && !this.dead) {
      const a2 = U.rand(0, TAU);
      const e = new Enemy('sideeffect', U.clamp(this.x + Math.cos(a2) * 90, RX + 30, RX + RW - 30), U.clamp(this.y + Math.sin(a2) * 90, RY + 30, RY + RH - 30), G.depth, false, 0.5, null, 0);
      e.spawnT = 0.5; e.noDrop = true;
      G.enemies.push(e);
    }
    if (this.hp <= 0) { this.dead = true; SFX.play('die'); Haptics.buzz([90, 60, 150], 0); }
  }
  heal(n) { if (this.flags.noHeal) return; this.hp = Math.min(this.maxhp, this.hp + n); }
}

/* ---------------- tears (player shots) ---------------- */
class Tear {
  constructor(x, y, vx, vy, dmg, range, big) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.life = range;
    this.r = big ? 10 : U.clamp(5 + dmg * 0.35, 5, 9);
    this.big = big;
    this.dead = false;
    this.home = 0;
    this.bounces = 0;   // Padded Cell ricochets
  }
  update(dt, G) {
    if (this.home) {   // homing tears (Rumination comorbidity)
      let tx = null, ty = null, bd = 1e9;
      for (const e of G.enemies) { if (e.dying || e.fake || e.spawnT > 0 || e.charmed) continue; const d = U.dist(this.x, this.y, e.x, e.y); if (d < bd) { bd = d; tx = e.x; ty = e.y; } }
      if (tx == null && G.boss && !G.boss.dead) { tx = G.boss.x; ty = G.boss.y; }
      if (tx != null) {
        const want = U.ang(this.x, this.y, tx, ty), cur = Math.atan2(this.vy, this.vx);
        const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        const turn = U.clamp(da, -this.home * dt, this.home * dt);
        const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = Math.cos(cur + turn) * spd; this.vy = Math.sin(cur + turn) * spd;
      }
    }
    // Spiral Thoughts: the velocity vector corkscrews as it travels
    if (this._spiral) {
      const rot = this._spiral * dt, c = Math.cos(rot), s = Math.sin(rot);
      const nvx = this.vx * c - this.vy * s;
      this.vy = this.vx * s + this.vy * c;
      this.vx = nvx;
    }
    // Boomerang Chart: past the apex, the tear arcs back to you
    if (this._boom && !this._ret && this.life < this._life0 * 0.55) this._ret = true;
    if (this._ret) {
      const p2 = G.player;
      const want = U.ang(this.x, this.y, p2.x, p2.y), cur = Math.atan2(this.vy, this.vx);
      const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      const turn = U.clamp(da, -9 * dt, 9 * dt);
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = Math.cos(cur + turn) * spd; this.vy = Math.sin(cur + turn) * spd;
      this.life = Math.max(this.life, 0.2);   // don't expire mid-return
      if (U.dist(this.x, this.y, p2.x, p2.y) < p2.r) { this.dead = true; return; }   // caught
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) { this.splash(G); return; }
    if (this.x < RX - 8 || this.x > RX + RW + 8 || this.y < RY - 8 || this.y > RY + RH + 8) {
      if (G.room.bouncy && this.bounces < 3) {   // Padded Cell: ricochet off the walls
        this.bounces++;
        if (this.x < RX || this.x > RX + RW) this.vx = -this.vx;
        if (this.y < RY || this.y > RY + RH) this.vy = -this.vy;
        this.x = U.clamp(this.x, RX + 5, RX + RW - 5); this.y = U.clamp(this.y, RY + 5, RY + RH - 5);
      } else { this.splash(G); return; }
    }
    const t = pxToTile(this.x, this.y);
    if (t.c >= 0 && t.r >= 0 && t.c < COLS && t.r < ROWS) {
      const tile = G.room.layout[t.r][t.c];
      if (tile === 1) { this.splash(G); return; }
      if (tile === 2) { G.damagePaper(t.c, t.r, this.dmg); this.splash(G); return; }
    }
    // hit enemies
    for (const e of G.enemies) {
      if (e.dying || e.spawnT > 0.15 || e.charmed) continue;   // charmed allies aren't targets
      if (this._hit && this._hit.has(e)) continue;             // Radical Honesty: already passed through them
      if (U.dist(this.x, this.y, e.x, e.y) < this.r + e.r) {
        let d = this.dmg;
        if (G.player.flags.hyperfix && G.hyperfixType === e.id) d *= 1.5;
        if (G.player.flags.hpBars && e.hp >= e.maxhp) d *= 1.15;
        if (G.player.trinket === 'luckypen' && !this._ally && U.chance(0.1)) { d *= 2; G.texts.push(new FloatText(e.x, e.y - 18, 'signed!', '#e8c84c')); }
        e.hurt(d, G);
        // status effects — the compress, the report, the thought
        if (G.player.flags.chillTears && !e.fake) { e._chill = Math.min(4, (e._chill || 0) + 1); e._chillT = 1.4; }
        if (G.player.flags.burnTears && !e.fake && U.chance(G.player.flags.synArson ? 0.45 : 0.25)) { e._burn = 3; e._burnDps = Math.max(0.6, G.player.dmg * 0.5) * (G.player.flags.synShock && e._chill > 0 ? 1.5 : 1); }
        // Peer Support: a chance the shot recruits them to the group instead of just hurting (the Auditor is unrecruitable)
        if (G.player.flags.charm && !e.fake && !e.dying && e.hp > 0 && e.id !== 'auditor' && U.chance(G.player.flags.synHouse ? 0.26 : 0.16)) {
          e.charmed = true; e.charmIdleT = 0; e.hp = Math.max(e.hp, e.maxhp * 0.5);
          G.toast('recruited to the group', '#8fd05a'); SFX.play('heal');
          for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; G.parts.push(new Particle(e.x, e.y, Math.cos(a) * 120, Math.sin(a) * 120, 0.5, '#8fd05a', 3)); }
        }
        e.x += this.vx * 0.014; e.y += this.vy * 0.014; // knockback
        if (this._pierce > 0) {   // Radical Honesty: the truth keeps going
          this._pierce--;
          (this._hit || (this._hit = new Set())).add(e);
          continue;
        }
        this.splash(G);
        return;
      }
    }
    if (G.boss && !G.boss.dead && G.boss.vulnerable && !this._hitBoss && U.dist(this.x, this.y, G.boss.x, G.boss.y) < this.r + G.boss.r) {
      G.boss.hurt(this.dmg, G);
      if (G.player.flags.burnTears && U.chance(0.25)) { G.boss._burn = 3; G.boss._burnDps = Math.max(0.6, G.player.dmg * 0.4); }   // even management burns
      if (this._pierce > 0) { this._pierce--; this._hitBoss = true; return; }
      this.splash(G);
      return;
    }
  }
  splash(G) {
    this.dead = true;
    for (let i = 0; i < 5; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-70, 70), U.rand(-90, 10), 0.35, '#7ab8e8', U.rand(2, 4)));
    // The Ugly Cry: the big one bursts into a ring of little ones
    if (this._mortar && !this._mini && G) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        const mini = new Tear(this.x, this.y, Math.cos(a) * 240, Math.sin(a) * 240, this.dmg * 0.4, 0.28, false);
        mini._mini = true;
        G.tears.push(mini);
      }
      SFX.play('pop');
    }
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
    this._src = 'bullet';   // overwritten with the shooter's id at spawn (cause-of-death)
  }
  update(dt, G) {
    this.t += dt;
    let f = 1;
    if (G.enemySlow > 0) f *= 0.6;
    if (G.player.flags.slowBullets && U.dist(this.x, this.y, G.player.x, G.player.y) < 140) f *= 0.7;
    if (G.player.flags.fastBullets) f *= 1.1;   // Sensory Overload comorbidity
    if (G.sideEffect === 'hypervigilance') f *= 1.12;   // ward side-effect: everything feels sharper
    if ((G.intensity || 0) >= 7) f *= 1.12;   // Treatment Intensity: the ward argues faster
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
    if (this.x < RX - 6 || this.x > RX + RW + 6 || this.y < RY - 6 || this.y > RY + RH + 6) {
      if (G.room.bouncy && !this.fake && (this._bounces || 0) < 3) {   // Padded Cell: enemy fire ricochets too
        this._bounces = (this._bounces || 0) + 1;
        if (this.x < RX || this.x > RX + RW) this.vx = -this.vx;
        if (this.y < RY || this.y > RY + RH) this.vy = -this.vy;
        this.x = U.clamp(this.x, RX + 5, RX + RW - 5); this.y = U.clamp(this.y, RY + 5, RY + RH - 5);
      } else { this.dead = true; return; }
    }
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
      p.hurt(this.dmg, G, this._src);
      this.dead = true;
      return;
    }
    // hit Patient Two (also a patient, also billable)
    const q = G.p2;
    if (q && q._downT <= 0 && !this.fake && U.dist(this.x, this.y, q.x, q.y) < this.r + 8) {
      G.p2Hurt(this.dmg);
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
  constructor(id, x, y, depth, fake, hpMult, elite, tier) {
    const D = DATA.ENEMIES[id];
    const dif = DATA.difficulty(depth);
    const E = elite ? DATA.ELITES.find(e => e.id === elite) : null;
    this.id = id;
    if (!fake) Meta.see('enemies', id);   // codex: record the encounter
    this.depth = depth; this._hpMult = hpMult || 1;
    this.elite = E ? E.id : null;
    this.eliteTint = E ? E.tint : null;
    // splitter tiers: 2 = large (base), 1 = medium, 0 = small (won't split again)
    this.tier = (tier != null) ? tier : (id === 'sideeffect' ? 2 : 0);
    const ts = (id === 'sideeffect') ? { r: [0.52, 0.74, 1][this.tier], hp: [0.22, 0.5, 1][this.tier], spd: [1.5, 1.24, 1][this.tier] } : { r: 1, hp: 1, spd: 1 };
    this.x = x; this.y = y; this.r = D.r * (E ? E.sz : 1) * ts.r;
    const hp = D.hp * dif.enemyHp * (hpMult || 1) * (E ? E.hp : 1) * ts.hp;
    this.maxhp = this.hp = fake ? 1 : hp;
    this.spd = D.spd * dif.enemySpd * (E ? E.spd : 1) * ts.spd;
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
    this.charmed = false; this.charmIdleT = 0;   // Peer Support (recruited ally)
    this.fuse = -1; // redflag
    this.dashDir = null;
    this.wanderA = U.rand(0, TAU);
    this.stolen = 0;                      // Copay Collector loot
    this.count = 9;                       // Now Serving countdown
    this.orbA = U.rand(0, TAU);           // The Spiral
    this._ghost = 1;                      // Gaslighter visibility
    this._shieldT = 0; this._enraged = 0; // Wellness Bot aura / ticket enrage
    if (this.beh === 'bounce') { const a = U.choice([1, 3, 5, 7]) * Math.PI / 4; this.vx = Math.cos(a) * this.spd; this.vy = Math.sin(a) * this.spd; }
  }

  update(dt, G) {
    this.t += dt; this.hitFlash -= dt;
    if (this.spawnT > 0) { this.spawnT -= dt; return; }
    if (this.dying) return;
    const p = G.player;
    // Peer Support: a recruited ally hunts other enemies, harmless to you, and burns out when the danger's gone
    if (this.charmed) {
      let tgt = null, bd = 1e9;
      for (const e of G.enemies) { if (e === this || e.charmed || e.dying || e.fake || e.spawnT > 0) continue; const d = U.dist(this.x, this.y, e.x, e.y); if (d < bd) { bd = d; tgt = e; } }
      if (G.boss && !G.boss.dead && G.boss.vulnerable !== false) { const d = U.dist(this.x, this.y, G.boss.x, G.boss.y); if (d < bd) { bd = d; tgt = G.boss; } }
      if (tgt) {
        this.charmIdleT = 0;
        const a = U.ang(this.x, this.y, tgt.x, tgt.y);
        this.x += Math.cos(a) * this.spd * 1.1 * dt; this.y += Math.sin(a) * this.spd * 1.1 * dt;
        if (bd < this.r + tgt.r + 3) { tgt.hurt(this.dmg * 3.5 * dt, G, true); this.hurt(0.9 * dt, G, true); }   // trades blows, slowly burning out
      } else {   // no threats left — drift to the player, then fade (its work is done)
        this.charmIdleT += dt;
        const a = U.ang(this.x, this.y, p.x, p.y);
        if (U.dist(this.x, this.y, p.x, p.y) > 64) { this.x += Math.cos(a) * this.spd * 0.5 * dt; this.y += Math.sin(a) * this.spd * 0.5 * dt; }
        if (this.charmIdleT > 1.6) { this.dying = true; this.deadDone = true; for (let i = 0; i < 6; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-60, 60), U.rand(-60, 60), 0.5, '#8fd05a', 3)); }
      }
      this.x = U.clamp(this.x, RX + this.r, RX + RW - this.r); this.y = U.clamp(this.y, RY + this.r, RY + RH - this.r);
      return;
    }
    if (this._shieldT > 0) this._shieldT -= dt;   // Wellness Bot aura fades if the bot stops tending you
    if (this._enraged > 0) this._enraged -= dt;   // Now Serving enrage wears off
    if (this._dazeT > 0) { this._dazeT -= dt; return; }   // the Goldfish made it forget what it was doing
    // status effects: chill stacks decay, burn ticks
    if (this._chill > 0) { this._chillT -= dt; if (this._chillT <= 0) { this._chill--; this._chillT = 1.2; } }
    if (this._burn > 0) {
      this._burn -= dt;
      this.hp -= this._burnDps * dt;
      if (Math.random() < dt * 9) G.parts.push(new Particle(this.x + U.rand(-6, 6), this.y + U.rand(-8, 2), U.rand(-20, 20), U.rand(-70, -30), 0.35, U.chance(0.5) ? '#e8944a' : '#e0c050', 3));
      if (this.hp <= 0 && !this.dying) { this.hurt(0.01, G, true); }
    }
    const slowF = (G.enemySlow > 0 ? 0.55 : 1) * (p.flags.slowField ? 0.88 : 1) * (1 - 0.12 * (this._chill || 0));   // Analysis Paralysis + Cold Compress slow the room
    const S = this.spd * slowF * (this._enraged > 0 ? 1.45 : 1);

    // the last patient standing gets impatient — evasive types stop playing keep-away and come to you
    const beh = (this._impatient && !this.fake && ['mirror', 'mimic', 'shooter', 'larper', 'bounce', 'ticket', 'buffer', 'shieldbot', 'charger'].includes(this.beh)) ? 'chase' : this.beh;
    switch (beh) {
      case 'chase': {
        const a = U.ang(this.x, this.y, p.x, p.y) + Math.sin(this.t * 3) * 0.3;
        const sp = this._impatient ? Math.max(S, 84) : S;
        this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt;
        break;
      }
      case 'splitter': {
        const a = U.ang(this.x, this.y, p.x, p.y) + Math.sin(this.t * 2.4) * 0.55;
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
            if (U.dist(this.x, this.y, e.x, e.y) > 280) continue;   // out-of-network: no coverage past the beam's reach
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
      case 'gaslight': {   // The Gaslighter: fades in and out of the record
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = this.state ? 0 : 1;
          this.stateT = this.state ? U.rand(1.4, 1.9) : U.rand(1.8, 2.4);
        }
        this._ghost = U.lerp(this._ghost, this.state ? 0.16 : 1, Math.min(1, dt * 5));
        const a = U.ang(this.x, this.y, p.x, p.y) + Math.sin(this.t * 2.2) * 0.4;
        const sneak = this.state ? 1.35 : 0.85;   // moves faster while you can't quite see it
        this.x += Math.cos(a) * S * sneak * dt; this.y += Math.sin(a) * S * sneak * dt;
        break;
      }
      case 'mimic': {   // The Projection: mirrors your every move back at you
        if (this._ppx != null) {
          this.x -= (p.x - this._ppx);   // your motion, reflected
          this.y -= (p.y - this._ppy);
        }
        this._ppx = p.x; this._ppy = p.y;
        // slow drift toward you so standing still doesn't stalemate forever
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a) * 26 * slowF * dt; this.y += Math.sin(a) * 26 * slowF * dt;
        break;
      }
      case 'thief': {   // Copay Collector: grab your change and run
        if (this.state === 0) {   // closing in
          const a = U.ang(this.x, this.y, p.x, p.y);
          this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt;
          if (U.dist(this.x, this.y, p.x, p.y) < this.r + p.r + 2) {
            const take = Math.min(p.coins, 2);
            if (take > 0) { p.coins -= take; this.stolen += take; G.texts.push(new FloatText(p.x, p.y - 24, '-' + take + '¢ collected!', '#e8c84c')); SFX.play('coin'); }
            else { G.texts.push(new FloatText(this.x, this.y - 22, 'nothing to collect', '#e8c84c')); }
            this.state = 1; this.stateT = 2.6;
          }
        } else {   // fleeing with the goods
          this.stateT -= dt;
          const a = U.ang(p.x, p.y, this.x, this.y);
          this.x += Math.cos(a + Math.sin(this.t * 4) * 0.3) * S * 0.9 * dt;
          this.y += Math.sin(a + Math.sin(this.t * 4) * 0.3) * S * 0.9 * dt;
          if (this.stateT <= 0) this.state = 0;
        }
        break;
      }
      case 'shieldbot': {   // Wellness Bot: drones around casting a protective bubble on its friends
        this.wanderA += 0.7 * dt;
        const cx = RX + RW / 2 + Math.cos(this.wanderA) * 150;
        const cy = RY + RH / 2 + Math.sin(this.wanderA * 1.3) * 90;
        const a = U.ang(this.x, this.y, cx, cy);
        this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt;
        if (!this.fake) for (const e of G.enemies) {
          if (e === this || e.dying || e.fake) continue;
          if (U.dist(this.x, this.y, e.x, e.y) < 120) e._shieldT = 0.25;   // namaste, protected
        }
        break;
      }
      case 'orbit': {   // The Spiral: circles you, tightening
        this.orbA += dt * 2.1;
        const R = Math.max(44, 195 - this.t * 22);
        const tx = p.x + Math.cos(this.orbA) * R, ty = p.y + Math.sin(this.orbA) * R;
        this.x += (tx - this.x) * Math.min(1, dt * 6);
        this.y += (ty - this.y) * Math.min(1, dt * 6);
        break;
      }
      case 'compare': {   // The Comparison: the healthier you are, the harder it comes
        const vigor = 0.72 + (p.hp / Math.max(1, p.maxhp)) * 0.75;
        const a = U.ang(this.x, this.y, p.x, p.y) + Math.sin(this.t * 2.6) * 0.22;
        this.x += Math.cos(a) * S * vigor * dt; this.y += Math.sin(a) * S * vigor * dt;
        break;
      }
      case 'auditor': {   // THE AUDITOR: it has your file and all the time in the world
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt;
        this.shotT -= dt;
        if (this.shotT <= 0 && !this.fake) {
          this.shotT = this.shotCd;
          const aa = this.aimP ? 0 : U.ang(this.x, this.y, p.x, p.y);
          for (let i = 0; i < 4; i++) this.fireAt(G, p.x, p.y, this.bulSpd, '#c8c0b0', (i - 1.5) * 0.22);
          SFX.play('stamp');
        }
        break;
      }
      case 'nursey': {   // THE CHARGE NURSE: if you're moving, you're a problem
        // slow authoritative drift to mid-room
        const tx = RX + RW / 2 + Math.sin(this.t * 0.8) * 120, ty = RY + 120 + Math.sin(this.t * 1.3) * 30;
        const a = U.ang(this.x, this.y, tx, ty);
        if (U.dist(this.x, this.y, tx, ty) > 10) { this.x += Math.cos(a) * S * dt; this.y += Math.sin(a) * S * dt; }
        // track patient movement
        const moved = this._nx != null && U.dist(p.x, p.y, this._nx, this._ny) > 2.4;
        this._nx = p.x; this._ny = p.y;
        this.shotT -= dt;
        if (moved && this.shotT <= 0) {   // caught you out of bed
          this.shotT = this.shotCd;
          for (const off of [-0.14, 0, 0.14]) this.fireAt(G, p.x, p.y, this.bulSpd, '#e8ecf0', off);
        }
        if (!moved && this.shotT < 0.2) this.shotT = 0.2;   // stillness buys you grace
        break;
      }
      case 'resident': {   // THE RESIDENT: 30 hours deep, doing boss impressions (badly)
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a + Math.sin(this.t * 1.8) * 0.9) * S * dt;
        this.y += Math.sin(a + Math.sin(this.t * 1.8) * 0.9) * S * dt;
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = 2.6;
          const roll = U.randi(0, 2);
          if (roll === 0) {   // gatekeeper impression: a wobbly ring with two gaps
            for (let i = 0; i < 10; i++) { const ra = (i / 10) * TAU + U.rand(-0.15, 0.15); if (i === 2 || i === 7) continue; const b = new EBullet(this.x, this.y, Math.cos(ra) * 150, Math.sin(ra) * 150, this.dmg, '#7ab8a0', this.fake); b._src = this.id; G.eBullets.push(b); }
          } else if (roll === 1) {   // algorithm impression: leads you... the wrong way
            for (const off of [-0.2, 0, 0.2]) this.fireAt(G, p.x - (p.x - this.x) * 0.2, p.y - (p.y - this.y) * 0.2, this.bulSpd, '#7ab8a0', off + U.rand(-0.2, 0.2));
          } else if (!this.fake) {   // adjuster impression: one crooked stamp
            const sx2 = U.clamp(p.x + U.rand(-110, 110), RX + 30, RX + RW - 30);
            const sy2 = U.clamp(p.y + U.rand(-110, 110), RY + 30, RY + RH - 30);
            G.stamps.push({ x: sx2, y: sy2, t: 1.0, r: 46, done: false });
          }
        }
        break;
      }
      case 'orderly': {   // THE ORDERLY: never fast. always closer.
        this._calm = (this._calm || 0) + dt;   // patience builds into momentum (resets when hurt)
        const speed = S * (1 + Math.min(2.6, this._calm * 0.35));
        const a = U.ang(this.x, this.y, p.x, p.y);
        this.x += Math.cos(a) * speed * dt; this.y += Math.sin(a) * speed * dt;
        break;
      }
      case 'waitlist': {   // The Waitlist: drifts, and keeps adding names ahead of yours
        const wa = U.ang(this.x, this.y, p.x, p.y) + Math.sin(this.t * 1.4) * 1.2;
        this.x += Math.cos(wa) * S * dt; this.y += Math.sin(wa) * S * dt;
        this.shotT = (this.shotT == null ? 4 : this.shotT) - dt;
        if (this.shotT <= 0 && !this.fake) {
          this.shotT = 4.5;
          const kids = G.enemies.filter(e => !e.dying && e._fromWaitlist === this).length;
          if (kids < 2) {
            const a2 = U.rand(0, TAU);
            const kid = new Enemy('waitingnum', U.clamp(this.x + Math.cos(a2) * 60, RX + 30, RX + RW - 30), U.clamp(this.y + Math.sin(a2) * 60, RY + 30, RY + RH - 30), this.depth, false, 0.8);
            kid._fromWaitlist = this; kid.noDrop = true; kid.spawnT = 0.5;
            G.enemies.push(kid);
            G.texts.push(new FloatText(this.x, this.y - 22, '+1 to the list', '#c8b890'));
            SFX.play('paper');
          }
        }
        break;
      }
      case 'premium': {   // The Premium: untouchable until it bills you
        if (this.state === 0) {   // hunting for the transaction
          const a2 = U.ang(this.x, this.y, p.x, p.y);
          this.x += Math.cos(a2) * S * dt; this.y += Math.sin(a2) * S * dt;
          if (U.dist(this.x, this.y, p.x, p.y) < this.r + p.r + 2 && p.iframes <= 0) {
            if (p.coins > 0) { const take = Math.min(p.coins, 2); p.coins -= take; G.texts.push(new FloatText(p.x, p.y - 24, '-' + take + '¢ premium due', '#e0b83a')); SFX.play('coin'); }
            else { p.hurt(1, G, 'premium'); }
            this.state = 1;
            this._premOpen = true;
            G.texts.push(new FloatText(this.x, this.y - 22, 'PAID IN FULL — now it can die', '#e8c84c'));
          }
        } else if (this._impatient) {   // last one standing: fine, it comes to collect in person
          const a2 = U.ang(this.x, this.y, p.x, p.y);
          this.x += Math.cos(a2) * Math.max(S, 84) * dt; this.y += Math.sin(a2) * Math.max(S, 84) * dt;
        } else {   // billed and mortal: keep-away
          const a2 = U.ang(p.x, p.y, this.x, this.y);
          this.x += Math.cos(a2 + Math.sin(this.t * 3) * 0.4) * S * 0.8 * dt;
          this.y += Math.sin(a2 + Math.sin(this.t * 3) * 0.4) * S * 0.8 * dt;
        }
        break;
      }
      case 'ticket': {   // Now Serving: a countdown the whole room is waiting on
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.stateT = 1;
          this.count--;
          if (this.count <= 0) {
            this.count = 9;
            if (!this.fake) {
              for (const e of G.enemies) if (e !== this && !e.dying) e._enraged = 3;   // the waiting room loses it
              for (let i = 0; i < 8; i++) { const a2 = (i / 8) * TAU; const b = new EBullet(this.x, this.y, Math.cos(a2) * 160, Math.sin(a2) * 160, this.dmg, '#e0c060'); b._src = this.id; G.eBullets.push(b); }
              G.toast('“NOW SERVING: NOBODY.”', '#e0c060');
              G.shake = Math.max(G.shake, 5); SFX.play('boss');
            }
          } else if (this.count <= 3) SFX.play('tick');
        }
        break;
      }
    }

    // stay in bounds + tile collide (except bounce/charger handle their own walls)
    if (beh !== 'bounce') {
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

    // contact damage (dmg > 0 skips harmless props like Prior Auth forms)
    const p2 = G.player;
    if (!this.fake && this.dmg > 0 && p2.iframes <= 0 && U.dist(this.x, this.y, p2.x, p2.y) < this.r + p2.r - 4) {
      p2.hurt(this.dmg, G, this.id);
    }
  }

  fireAt(G, tx, ty, spd, clr, angOff) {
    const a = U.ang(this.x, this.y, tx, ty) + (angOff || 0);
    const b = new EBullet(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, this.dmg, clr, this.fake);
    b._src = this.id;
    if (G.player.flags.tinfoil && (this.beh === 'shooter' || this.beh === 'mirror' || this.beh === 'larper') && U.chance(0.25)) b.dud = true;
    G.eBullets.push(b);
  }

  hurt(d, G, quiet) {
    if (this.dying || this.spawnT > 0.3) return;
    // The Premium: cannot be harmed until it has billed you (forensic nukes exempt)
    if (this.beh === 'premium' && !this._premOpen && !this.fake && d < 9999) {
      if (!quiet && Math.random() < 0.3) { G.texts.push(new FloatText(this.x, this.y - 20, 'PREMIUM — not yet billed', '#e0b83a')); SFX.play('lock'); }
      return;
    }
    if (this.fake) {
      this.dying = true; this.deadDone = true;
      SFX.play('pop');
      for (let i = 0; i < 10; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-120, 120), U.rand(-120, 120), 0.5, 'rgba(255,255,255,0.8)', 4));
      G.texts.push(new FloatText(this.x, this.y - 20, "wasn't real", '#cbb8e8'));
      return;
    }
    if (this._shieldT > 0) d *= 0.55;   // Wellness Bot's bubble takes the edge off
    if (this.id === 'placebo' && d > 0) d = 999;   // dies to literally anything. that's the bit.
    this.hp -= d;
    this.hitFlash = 0.12;
    if (Meta.data.a11y && Meta.data.a11y.dmgNums && !quiet && d >= 0.5 && G.texts.length < 36) {
      const ft = new FloatText(this.x + U.rand(-6, 6), this.y - 16, (Math.round(d * 10) / 10), '#f0e0b0');
      ft.small = true; G.texts.push(ft);
    }
    if (this.beh === 'orderly') this._calm = 0;   // pain resets his patience
    // The Second Opinion: wound it and it produces a colleague who disagrees
    if (this.id === 'secondop' && !this._split && !this.fake && this.hp > 0 && U.chance(0.5)) {
      this._split = true;
      const c = new Enemy('secondop', U.clamp(this.x + U.rand(-50, 50), RX + 26, RX + RW - 26), U.clamp(this.y + U.rand(-40, 40), RY + 26, RY + RH - 26), this.depth, false, 0.6);
      c._split = true; c.spawnT = 0.45; c.noDrop = true;
      G.enemies.push(c);
      G.texts.push(new FloatText(this.x, this.y - 22, '“actually, I disagree—”', '#b06be0'));
      SFX.play('voice');
    }
    // The Gaslighter denies the hit ever happened — and isn't where you thought it was
    if (this.id === 'gaslighter' && !quiet && this.hp > 0 && U.chance(0.4)) {
      const p3 = G.player;
      const a = U.rand(0, TAU), dd = U.rand(90, 150);
      for (let i = 0; i < 5; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-60, 60), U.rand(-60, 60), 0.35, this.clr, 3));
      this.x = U.clamp(p3.x + Math.cos(a) * dd, RX + 26, RX + RW - 26);
      this.y = U.clamp(p3.y + Math.sin(a) * dd, RY + 26, RY + RH - 26);
      if (U.chance(0.5)) G.texts.push(new FloatText(this.x, this.y - 22, 'that never happened', '#b8a8d8'));
    }
    if (!quiet) SFX.play('hit');
    if (this.hp <= 0) this.die(G);
  }

  explode(G) {
    this.dying = true; this.deadDone = true;
    SFX.play('boom');
    Haptics.buzz(45, 0);
    G.shake = Math.max(G.shake, 10);
    for (let i = 0; i < 20; i++) G.parts.push(new Particle(this.x, this.y, U.rand(-220, 220), U.rand(-220, 220), 0.6, U.choice(['#e06a3a', '#e0a03a', '#d04040']), 5));
    const p = G.player;
    if (!this.fake && U.dist(this.x, this.y, p.x, p.y) < 85 + p.r) p.hurt(1, G, this.id);
    for (const e of G.enemies) {
      if (e === this || e.dying) continue;
      if (U.dist(this.x, this.y, e.x, e.y) < 85 + e.r) e.hurt(18, G, true);
    }
  }

  die(G) {
    this.dying = true; this.deadDone = true;
    Meta.data.kills++;
    G.stats.kills++;
    if (G.goalEvent) G.goalEvent('kill');
    if (!G.hyperfixType) G.hyperfixType = this.id;
    // Intrusive Thought: the thought escapes and finds new hosts (chains via _plague)
    if ((G.player.flags.contagion || this._plague) && !this.fake) {
      let spread = 0;
      for (const e of G.enemies) {
        if (e === this || e.dying || e.fake || e.spawnT > 0 || spread >= 3) continue;
        if (U.dist(this.x, this.y, e.x, e.y) < 130) { e.hurt(Math.max(1, G.player.dmg * 0.6), G, true); e._plague = true; if (G.player.flags.synFreeze) { e._chill = Math.min(4, (e._chill || 0) + 2); e._chillT = 1.4; } spread++; }
      }
      if (spread) { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; G.parts.push(new Particle(this.x, this.y, Math.cos(a) * 160, Math.sin(a) * 160, 0.4, '#8fd08a', 3)); } SFX.play('pop'); }
    }
    // THE COMPLAINT DEPARTMENT: feedback, resolved
    if (this._complaint) {
      Meta.data.insight = (Meta.data.insight || 0) + 6;
      G._goalInsight += 6;
      Meta.save();
      G.toast('📋 “' + this._complaint + '” — RESOLVED. +◆6. Thank you for your feedback.', '#8fd08a');
      SFX.play('bell');
    }
    // The Placebo: it was nothing. it was confetti.
    if (this.id === 'placebo' && !this.fake) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        G.parts.push(new Particle(this.x, this.y, Math.cos(a) * U.rand(90, 240), Math.sin(a) * U.rand(90, 240) - 60, U.rand(0.4, 0.8), U.choice(['#e8c84c', '#e05a8a', '#5ad0c8', '#b06be0', '#8fd05a']), U.rand(2.5, 4.5)));
      }
      G.pickups.push(new Pickup('coin', this.x - 10, this.y));
      G.pickups.push(new Pickup('coin', this.x + 10, this.y));
      G.texts.push(new FloatText(this.x, this.y - 22, 'it was nothing', '#e8e0f0'));
      SFX.play('pop');
    }
    // IT REMEMBERS YOU: revenge pays
    if (this._nemesis) {
      G.pickups.push(new Pickup('nickel', this.x - 14, this.y));
      G.pickups.push(new Pickup('full', this.x + 14, this.y));
      G.pickups.push(new Pickup('trinket', this.x, this.y - 18));
      Meta.data.insight = (Meta.data.insight || 0) + 5;
      Meta.data.revenges = (Meta.data.revenges || 0) + 1;
      G._goalInsight += 5;
      Meta.save();
      G.toast('🩸 GRUDGE SETTLED — +◆5, and it dropped everything.', '#e05a5a');
      SFX.play('fanfare');
      if (G.checkUnlocks) G.checkUnlocks();
    }
    Haptics.buzz(this.elite ? 30 : 14, 45); // kill tick; throttled so a burst of deaths = one bump
    makeGibs(G, this.x, this.y, this.clr, Math.round(6 + this.r * 0.4));
    // death pop: a bright radial flash so kills land
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; G.parts.push(new Particle(this.x + Math.cos(a) * 4, this.y + Math.sin(a) * 4, Math.cos(a) * 210, Math.sin(a) * 210, 0.22, 'rgba(255,252,240,0.9)', 2.6)); }
    if (this.elite) G.shake = Math.max(G.shake, 4);
    // Side Effect splits into two smaller ones ("may cause additional side effects")
    if (this.id === 'sideeffect' && this.tier > 0 && !this.fake) {
      for (let i = 0; i < 2; i++) {
        const a = U.rand(0, TAU);
        const child = new Enemy('sideeffect', this.x + Math.cos(a) * 12, this.y + Math.sin(a) * 12, this.depth, false, this._hpMult, this.elite, this.tier - 1);
        child.spawnT = 0.25; child.noDrop = true;
        G.enemies.push(child);
      }
    }
    if (this.beh === 'bomber') { this.explode(G); return; }
    // THE AUDITOR goes down: the books balance in your favor
    if (this.id === 'auditor' && !this.fake) {
      G.auditorHp = 0; G.auditorDown = true;
      for (let i = 0; i < 8; i++) G.pickups.push(new Pickup('coin', this.x + U.rand(-40, 40), this.y + U.rand(-30, 30)));
      G.pickups.push(new Pickup('full', this.x, this.y - 20));
      G.pickups.push(new Pickup('trinket', this.x + 30, this.y + 10));
      Meta.data.auditorKills = (Meta.data.auditorKills || 0) + 1; Meta.save();
      G.toast('🔔 Audit closed. No further action. (For now.)', '#8fd05a');
      if (G.checkUnlocks) G.checkUnlocks();
    }
    // Litigious protocol: everything that goes down drops paperwork
    if (G.protocol === 'litigious' && !this.fake && U.chance(0.25)) G.pickups.push(new Pickup('bomb', this.x + U.rand(-10, 10), this.y + U.rand(-10, 10)));
    // Copay Collector coughs it all back up (plus interest)
    if (this.id === 'copaycollector' && !this.fake) {
      const n = Math.min(this.stolen + 1, 5);
      for (let i = 0; i < n; i++) G.pickups.push(new Pickup('coin', this.x + U.rand(-20, 20), this.y + U.rand(-16, 16)));
    }
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
    this.trinketId = type === 'trinket' ? U.choice(DATA.TRINKETS.filter(t => t.id !== 'masterkey')).id : null;   // the Master Key is never just lying around
    this.vx = U.rand(-40, 40); this.vy = U.rand(-40, 40); this.settle = 0.3;
  }
  update(dt, G) {
    this.t += dt;
    if (this.settle > 0) {
      this.settle -= dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.x = U.clamp(this.x, RX + 14, RX + RW - 14);
      this.y = U.clamp(this.y, RY + 14, RY + RH - 14);
      if (this.settle <= 0 && G.room) {   // landed inside a rock (bouncers die anywhere) — roll to open floor
        const t = pxToTile(this.x, this.y);
        if (tileSolid(G.room.layout, t.c, t.r)) {
          out: for (let rad = 1; rad <= 4; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
            const c2 = t.c + dc, r2 = t.r + dr;
            if (c2 < 0 || r2 < 0 || c2 >= COLS || r2 >= ROWS) continue;
            if (!tileSolid(G.room.layout, c2, r2)) { this.x = RX + (c2 + 0.5) * TILE; this.y = RY + (r2 + 0.5) * TILE; break out; }
          }
        }
      }
    }
    const p = G.player;
    if (this._grabCd > 0) { this._grabCd -= dt; return; }   // a just-dropped trinket won't leap back into your hand
    const wants = (this.type === 'coin' || this.type === 'nickel' || this.type === 'key' || this.type === 'bomb')
      || ((this.type === 'half' || this.type === 'full') && p.hp < p.maxhp)
      || (this.type === 'pill' && p.pill == null);
    const MR = (G._fetchT > 0) ? 9999 : (p.pet && p.pet.type === 'pigeon') ? (p.pet.evo ? 150 : 110) : 56;   // FETCH pulls the whole room; the Pigeon herds loose change your way
    const md = U.dist(this.x, this.y, p.x, p.y);
    if (wants && md < MR && md > 1 && this.settle <= 0) {   // loose change rolls toward you
      const pull = (240 * (1 - md / MR) + 50) * dt;
      this.x += (p.x - this.x) / md * pull; this.y += (p.y - this.y) / md * pull;
    }
    if (U.dist(this.x, this.y, p.x, p.y) < 20 + p.r) {
      switch (this.type) {
        case 'coin': p.coins++; SFX.play('coin'); if (G.goalEvent) G.goalEvent('coin', 1); break;
        case 'nickel': p.coins += 5; SFX.play('coin'); G.texts.push(new FloatText(this.x, this.y, '+5', '#e8c84c')); if (G.goalEvent) G.goalEvent('coin', 5); break;
        case 'half': if (p.hp >= p.maxhp) return; p.heal(1); SFX.play('heal'); break;
        case 'full': if (p.hp >= p.maxhp) return; p.heal(2); SFX.play('heal'); break;
        case 'pill':
          if (p.pill != null) return;
          p.pill = this.colorIdx; SFX.play('pickup'); break;
        case 'key': p.keys++; SFX.play('pickup'); break;
        case 'bomb': p.bombs++; SFX.play('pickup'); break;
        case 'trinket': {   // Personal Effects: one slot — swap what you're holding
          const T2 = DATA.TRINKETS.find(t2 => t2.id === this.trinketId) || DATA.TRINKETS[0];
          if (p.trinket) {
            const old = new Pickup('trinket', this.x + 24, this.y + 8);
            old.trinketId = p.trinket; old.settle = 0.4; old._grabCd = 1.2;
            G.pickups.push(old);
          }
          p.trinket = T2.id;
          G.toast(T2.icon + ' ' + T2.name + ' — ' + T2.desc, '#c8b0e0');
          SFX.play('item');
          break;
        }
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
      const mul = G.player && G.player.trinket === 'paperclip' ? 1.35 : 1;   // the chain holds the claim together
      G.explode(this.x, this.y, 95 * mul, 32 * mul);
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
  const wp = (DATA.WARD_PATHS && DATA.WARD_PATHS[G.wardPath]) || null;
  const hpMult = (p.flags.fineMode ? (p.flags.recovery ? 1.25 : 1.15) : 1) * (mods.hpMul || 1) * (G.chronic ? 1.5 : 1) * (G.easy ? 0.7 : 1) * (wp ? wp.hpMul : 1) * ((G.intensity || 0) >= 1 ? 1.1 : 1) * (G.hasRule && G.hasRule('toughCrowd') ? 1.15 : 1);
  let count = dif.count;
  if (mods.countMul) count = Math.round(count * mods.countMul);
  if (G.chronic) count = Math.round(count * 1.2);
  if (wp) count += (wp.countAdd || 0);
  count = U.clamp(count + U.randi(-1, 1), 3, G.chronic ? 18 : 16);
  const champChance = G.protocol === 'allelites' ? 1 : U.clamp(dif.champChance + (mods.champAdd || 0) + ((G.intensity || 0) >= 5 ? 0.15 : 0), 0, 0.75);   // Grand Rounds: everyone's a champion
  const spots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (room.layout[r][c] !== 0) continue;
    const px = tileToPx(c, r);
    if (U.dist(px.x, px.y, p.x, p.y) < 175) continue;
    spots.push(px);
  }
  const chosen = U.shuffle(spots).slice(0, count);
  const spawned = [];
  // IT REMEMBERS YOU: your last killer walks in wearing a champion's aura
  if (G.nemesisId && !G._nemesisSpawned && room.type === 'normal' && spots.length > count) {
    G._nemesisSpawned = true;
    const s = U.shuffle(spots).find(sp => !chosen.includes(sp)) || spots[0];
    const ne = new Enemy(G.nemesisId, s.x, s.y, depth, false, hpMult * 2.2, U.choice(DATA.ELITES).id);
    ne._nemesis = true; ne.spawnT = 0.8;
    G.enemies.push(ne);
    G.toast('🩸 It remembers you.', '#e05a5a');
    SFX.play('sting');
  }
  // THE COMPLAINT DEPARTMENT: your grievance has been assigned a body
  if (G._complaint && !G._complaintSpawned && room.type === 'normal' && spots.length > count) {
    G._complaintSpawned = true;
    const s = U.shuffle(spots).find(sp => !chosen.includes(sp)) || spots[0];
    const ce = new Enemy(DATA.pickEnemy(depth, G.wing), s.x, s.y, depth, false, hpMult * 1.8, U.choice(DATA.ELITES).id);
    ce._complaint = G._complaint; ce.spawnT = 0.8;
    G.enemies.push(ce);
    G.toast('📋 Your complaint has been processed. It\'s over there.', '#e0a05a');
    SFX.play('stamp');
  }
  for (const s of chosen) {
    const id = DATA.pickEnemy(depth, G.wing);
    const elite = (id !== 'redflag' && U.chance(champChance)) ? U.choice(DATA.ELITES).id : null;
    const e = new Enemy(id, s.x + U.rand(-8, 8), s.y + U.rand(-8, 8), depth, false, hpMult, elite);
    if (G.shadowWard) { e.hp *= 1.3; e.maxhp *= 1.3; e._shadow = true; }   // shadow patients: darker, tougher, better tippers
    if (mods.spdMul) e.spd *= mods.spdMul;
    if (G.hasRule && G.hasRule('fastCrowd')) e.spd *= 1.1;   // house rules: fire drill (ongoing)
    if (G.sideEffect === 'restless') e.spd *= 1.15;   // ward side-effect: Restlessness
    if (mods.dmgAdd) e.dmg += mods.dmgAdd;
    if (mods.fastSpawn) e.spawnT = 0.22;
    G.enemies.push(e);
    spawned.push(id);
  }
  // schizophrenia: add hallucinated duplicates (the Unmedicated variant sees none — everything is real)
  if (p.diag === 'schizo' && !p.variant && spawned.length) {
    const extraSpots = U.shuffle(spots).slice(0, 2);
    for (const s of extraSpots) {
      const id = U.choice(spawned);
      G.enemies.push(new Enemy(id, s.x + U.rand(-8, 8), s.y + U.rand(-8, 8), depth, true, 1));
    }
  }
}
