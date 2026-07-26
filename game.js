/* =========================================================
   EVERYBODIES GOT SOMETHIN — game.js
   State machine, room flow, overlays, and the main loop.
   ========================================================= */
'use strict';

const G = {
  state: 'boot',
  t: 0,
  depth: 1,
  grid: null, floorRooms: [], room: null, lastBoss: null, bossId: null,
  player: null,
  tears: [], eBullets: [], enemies: [], pickups: [], bombs: [], parts: [], texts: [], zones: [],
  peds: [], shopStock: [], stamps: [],
  boss: null, trapdoor: null,
  shake: 0, dark: 0, darkTarget: 0,
  enemySlow: 0, tearsAura: false, playerFired: false, healBeam: null,
  complications: [], floorMods: {}, floorDark: 0,
  doorsOpen: true, secretFound: false,
  pillAssign: [], pillKnown: new Set(),
  banner: null, toasts: [],
  stats: { kills: 0, rooms: 0, items: 0, bosses: 0, pills: 0 },
  runUnlocks: [], floorHits: 0,
  hyperfixType: null,
  larperToastShown: false,
  descendT: 0,
  doorCd: 0, lockCd: 0, deathT: 0,
  quiz: null,
  debug: /[?&]debug=1/.test(location.search),

  /* ---------- helpers ---------- */
  roomAt(gx, gy) { return this.grid ? (this.grid.get(U.key(gx, gy)) || null) : null; },
  toast(txt, clr) {
    this.toasts.push({ txt, t: 0, dur: 2.8, clr });
    if (this.toasts.length > 3) this.toasts.shift();
  },
  setBanner(text, sub, dur) { this.banner = { text, sub, t: 0, dur: dur || 2.2 }; },
  checkUnlocks() {
    const fresh = DATA.checkAchievements(Meta.data);
    if (!fresh.length) return;
    Meta.save();
    for (const a of fresh) {
      this.runUnlocks.push(a);
      if (this.state === 'run' || this.state === 'descend') {
        this.toast('🏆 UNLOCKED: ' + a.name, '#e8c84c');
        SFX.play('item'); if (typeof Haptics !== 'undefined') Haptics.buzz([30, 40, 60], 0);
      }
    }
  },

  /* ---------- flow: title / quiz / card ---------- */
  showTitle() {
    this.state = 'title';
    SFX.setMusic('menu');
    document.body.classList.remove('inrun');
    const m = Meta.data;
    const statsLine = m.runs > 0
      ? `<div class="stats-line">runs: ${m.runs} · deepest ward: ${m.bestFloor} · walruses defeated: ${m.walrusKills}</div>`
      : '';
    this.overlay(`
      <div class="panel">
        <h1 class="logo">EVERYBODIES<br>GOT SOMETHIN</h1>
        <div class="tagline">a roguelike about getting diagnosed with Everything™</div>
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="titleWalrus"></canvas>
          <div class="bubble" id="titleBubble">The doctor will see you now. He sees everyone. That's the problem.</div>
        </div>
        <button class="btn" id="bStart">🩺 START CHECKUP</button>
        <button class="btn minor" id="bFiles">📁 PATIENT FILES (choose your diagnosis)</button>
        <div class="btnrow">
          <button class="btn minor" id="bHow">HOW TO PLAY</button>
          <button class="btn minor" id="bUnlocksT">🏆 UNLOCKS</button>
          <button class="btn minor" id="bSettings">⚙ SETTINGS</button>
        </div>
        ${statsLine}
        <div class="smallprint">A satire about a system that hands out labels like candy — not about the people living with them. Be kind, including to yourself. ♥</div>
      </div>`);
    this.paintWalrus('titleWalrus');
    document.getElementById('bStart').onclick = () => { SFX.init(); SFX.play('ui'); this.startQuiz(); };
    document.getElementById('bFiles').onclick = () => { SFX.init(); SFX.play('ui'); this.showFiles(); };
    document.getElementById('bHow').onclick = () => { SFX.init(); SFX.play('ui'); this.showHow(); };
    document.getElementById('bUnlocksT').onclick = () => { SFX.init(); SFX.play('ui'); this.showUnlocks(() => this.showTitle()); };
    document.getElementById('bSettings').onclick = () => { SFX.init(); SFX.play('ui'); this.showSettings(() => this.showTitle()); };
  },

  /* settings overlay with SFX + music volume sliders; returnTo() restores the prior screen */
  showSettings(returnTo) {
    SFX.init();
    const pct = v => Math.round(v * 100);
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:30px">SETTINGS</h1>
        <div class="setrow">
          <label>🔊 Sound FX <span id="sfxPct">${pct(SFX.sfxVol)}%</span></label>
          <input type="range" class="slider" id="sfxSlider" min="0" max="100" value="${pct(SFX.sfxVol)}">
        </div>
        <div class="setrow">
          <label>🎵 Music <span id="musPct">${pct(SFX.musicVol)}%</span></label>
          <input type="range" class="slider" id="musSlider" min="0" max="100" value="${pct(SFX.musicVol)}">
        </div>
        <button class="btn minor" id="bMuteAll">${SFX.muted ? '🔇 UNMUTE ALL' : '🔊 MUTE ALL'}</button>
        ${Haptics.supported ? `<button class="btn minor" id="bHaptics">${Haptics.enabled ? '📳 HAPTICS: ON' : '📴 HAPTICS: OFF'}</button>` : ''}
        <button class="btn" id="bSetBack">BACK</button>
        <div class="smallprint">Tip: press <span class="kbd">M</span> anytime to mute. Settings are saved on this device.</div>
      </div>`);
    const sfx = document.getElementById('sfxSlider'), mus = document.getElementById('musSlider');
    sfx.oninput = () => { SFX.init(); SFX.setSfxVol(sfx.value / 100); document.getElementById('sfxPct').textContent = sfx.value + '%'; };
    sfx.onchange = () => { if (!SFX.muted) SFX.play('coin'); }; // preview level on release
    mus.oninput = () => { SFX.init(); SFX.setMusicVol(mus.value / 100); document.getElementById('musPct').textContent = mus.value + '%'; };
    document.getElementById('bMuteAll').onclick = (e) => { SFX.init(); const mu = SFX.toggleMute(); e.target.textContent = mu ? '🔇 UNMUTE ALL' : '🔊 MUTE ALL'; };
    const hb = document.getElementById('bHaptics');
    if (hb) hb.onclick = (e) => { Input.usingTouch = true; const on = Haptics.toggle(); e.target.textContent = on ? '📳 HAPTICS: ON' : '📴 HAPTICS: OFF'; };
    document.getElementById('bSetBack').onclick = () => { SFX.play('ui'); returnTo(); };
  },

  /* Isaac-style character select — every diagnosis is its own character */
  showFiles() {
    this.state = 'files';
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'fine'];
    const cards = order.map(id => {
      const D = DATA.DIAG[id];
      const locked = id === 'fine' && !fineOpen;
      const best = (Meta.data.diagBest || {})[id];
      return `<button class="charCard ${locked ? 'locked' : ''}" data-d="${id}" ${locked ? 'disabled' : ''}>
        <canvas width="84" height="84" data-cd="${id}"></canvas>
        <div class="cname" style="color:${locked ? '#8a8078' : D.color}">${locked ? '?????' : D.name}</div>
        <div class="cline">${locked ? 'tell the truth at a checkup' : D.tag}</div>
        <div class="cbest">${locked ? 'or defeat Dr. Walrus' : (best ? 'best: ward ' + best : 'no chart yet')}</div>
      </button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">PATIENT FILES</h1>
        <div class="tagline">returning patients — skip the checkup, keep the label</div>
        <div class="charGrid">${cards}</div>
        <button class="btn minor" id="bBack2">BACK</button>
      </div>`);
    document.querySelectorAll('.charCard canvas').forEach(c => {
      Render.drawCharPortrait(c.getContext('2d'), c.dataset.cd);
    });
    document.querySelectorAll('.charCard:not(.locked)').forEach(c => {
      c.onclick = () => { SFX.play('ui'); this.showCard(c.dataset.d); };
    });
    document.getElementById('bBack2').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  showHow() {
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:28px">HOW TO PLAY</h1>
        <div class="controls-grid">
          <b>PC:</b><br>
          <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> move ·
          <span class="kbd">←→↑↓</span> or <span class="kbd">mouse</span> shoot tears<br>
          <span class="kbd">Q</span> swallow pill · <span class="kbd">E</span> place Claim Form (it explodes) ·
          <span class="kbd">P</span> pause · <span class="kbd">M</span> mute<br><br>
          <b>Mobile:</b> left thumb moves, right thumb shoots. Buttons for pills & claims.<br><br>
          <b>The rest:</b> clear rooms, take your meds (or don't), find the Specialist
          (needs a <b>Referral</b> 🔑), buy things with <b>Copays</b> ¢, beat the boss,
          descend forever. Dr. Walrus is waiting on every 5th ward.<br><br>
          <b>Patient Files</b> on the title screen is the character select — every diagnosis
          plays differently, Isaac-style. The checkup just picks one for you.
        </div>
        <button class="btn" id="bBack">BACK</button>
      </div>`);
    document.getElementById('bBack').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  startQuiz() {
    this.state = 'quiz';
    this.quiz = {
      qs: U.shuffle(DATA.QUESTIONS).slice(0, 5),
      idx: 0,
      scores: { adhd: 0, bipolar: 0, depression: 0, anxiety: 0, schizo: 0, fine: 0 }
    };
    this.overlay(`
      <div class="panel">
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="quizWalrus"></canvas>
          <div class="bubble" id="quizBubble">${U.choice(DATA.WALRUS_INTROS)}</div>
        </div>
        <div id="quizArea"><button class="btn" id="bBegin">Take the questionnaire</button></div>
      </div>`);
    this.paintWalrus('quizWalrus');
    document.getElementById('bBegin').onclick = () => { SFX.play('ui'); this.showQuestion(); };
  },

  showQuestion() {
    const q = this.quiz.qs[this.quiz.idx];
    document.getElementById('quizBubble').innerHTML =
      `<div class="qcount">QUESTION ${this.quiz.idx + 1} OF 5</div>${q.q}`;
    const area = document.getElementById('quizArea');
    area.innerHTML = '';
    U.shuffle(q.a).forEach(ans => {
      const b = document.createElement('button');
      b.className = 'btn answer';
      b.textContent = ans.t;
      b.onclick = () => this.answer(ans);
      area.appendChild(b);
    });
  },

  answer(ans) {
    SFX.play('ui');
    for (const k in ans.w) this.quiz.scores[k] += ans.w[k];
    document.getElementById('quizBubble').innerHTML = `<i>${ans.quip || 'Mm. Noted.'}</i>`;
    document.getElementById('quizArea').innerHTML = '';
    this.quiz.idx++;
    setTimeout(() => {
      if (this.state !== 'quiz') return;
      if (this.quiz.idx < 5) this.showQuestion();
      else this.finishQuiz();
    }, 1100);
  },

  finishQuiz() {
    document.getElementById('quizBubble').innerHTML = '<i>Mm-hm. Mm-hm. *scribbles violently*</i>';
    const s = this.quiz.scores;
    let best = null, bestV = -1;
    for (const k of U.shuffle(Object.keys(s))) if (s[k] > bestV) { bestV = s[k]; best = k; }
    if (bestV <= 0) best = U.choice(['adhd', 'bipolar', 'depression', 'anxiety', 'schizo']);
    setTimeout(() => { if (this.state === 'quiz') this.showCard(best); }, 900);
  },

  showCard(diagId) {
    this.state = 'card';
    if (diagId === 'fine' && !Meta.data.fineSeen) { Meta.data.fineSeen = 1; Meta.save(); }
    const D = DATA.DIAG[diagId];
    const rxItem = D.rx ? DATA.ITEMS[D.rx] : null;
    SFX.play('stamp');
    this.overlay(`
      <div class="panel wide">
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="cardWalrus"></canvas>
          <div class="bubble">${D.blurb}</div>
        </div>
        <div class="rx">
          <div class="stamp">DIAGNOSIS</div>
          <h2 style="color:${D.color}">${D.name}</h2>
          <div class="sub">${D.short}</div>
          <div class="mech">${D.mech}</div>
          <div class="presc">℞ ${rxItem ? `<b>${rxItem.name}</b> — <i>${rxItem.quote}</i>` : "<b>Nothing.</b> <i>Walk it off.</i>"} Plus one (1) mystery pill. Standard.</div>
        </div>
        <div class="deathline">“${U.choice(DATA.CARD_LINES)}”</div>
        <button class="btn" id="bBegin2">BEGIN TREATMENT</button>
      </div>`);
    this.paintWalrus('cardWalrus');
    document.getElementById('bBegin2').onclick = () => { SFX.play('ui'); this.beginRun(diagId); };
  },

  /* ---------- run setup ---------- */
  beginRun(diagId) {
    Meta.data.runs++;
    if (!Meta.data.diagsPlayed) Meta.data.diagsPlayed = {};
    Meta.data.diagsPlayed[diagId] = 1;
    Meta.save();
    this.player = new Player(diagId);
    this.pillAssign = U.shuffle(DATA.PILLS.map((_, i) => i)).slice(0, 10);
    this.pillKnown = new Set();
    this.depth = 1;
    this.lastBoss = null;
    this.stats = { kills: 0, rooms: 0, items: 0, bosses: 0, pills: 0 };
    this.runUnlocks = [];
    this.floorHits = 0;
    this._deathRecorded = false;
    this.larperToastShown = false;
    this.deathT = 0;
    this.newFloor();
    this.state = 'run';
    this.hideOverlay();
    SFX.setMusic('run');
    document.body.classList.add('inrun');
  },

  newFloor() {
    const gen = generateFloor(this.depth, this.lastBoss);
    this.grid = gen.grid;
    this.floorRooms = gen.rooms;
    this.bossId = gen.bossId;
    this.lastBoss = gen.bossId === 'walrus' ? this.lastBoss : gen.bossId;
    this.secretFound = false;
    this.boss = null;
    this.trapdoor = null;
    this.tearsAura = false;
    this.darkTarget = 0;
    this.enemySlow = 0;
    this.floorHits = 0;
    // endless difficulty: roll this floor's ward complications
    this.complications = DATA.rollComplications(this.depth);
    this.floorMods = {};
    for (const c of this.complications) Object.assign(this.floorMods, c.mods);
    this.floorDark = this.floorMods.dark || 0;
    const p = this.player;
    p.pillsThisFloor = 0;
    if (p.diag === 'depression') p.blanket = true;
    if (p._gymAdd) { p.dmg -= p._gymAdd; }
    p._gymAdd = 0;
    if (p.flags.pillowHeal) p.heal(2);
    if (p.flags.crystals) {
      const roll = U.choice(['dmg', 'spd', 'tears', 'luck']);
      if (roll === 'dmg') p.dmg += 0.3;
      if (roll === 'spd') p.spd *= 1.03;
      if (roll === 'tears') p.tearDelay *= 0.97;
      if (roll === 'luck') p.luck += 0.5;
      this.toast('The crystals hum: +' + roll);
    }
    if (p.flags.sideEffects && this.depth > 1) {
      const eff = U.choice([
        () => { p.spd *= 0.96; return 'mild sluggishness'; },
        () => { p.wobble += 0.04; return 'hand tremors'; },
        () => { p.tearDelay *= 1.05; return 'dry mouth (somehow)'; },
        () => { p.luck -= 0.3; return 'a vague sense of doom'; }
      ])();
      this.toast('Side effect: ' + eff, '#e0a05a');
    }
    if (p.flags.mapReveal) this.floorRooms.forEach(r => r.discovered = true);
    this.enterRoom(gen.start, null);
    // announce ward complications
    if (this.complications.length) setTimeout(() => {
      if (this.state !== 'run') return;
      SFX.play('error');
      for (const c of this.complications) this.toast('⚠ ' + c.name + ' — ' + c.desc, '#e0955a');
    }, 500);
    if (p.diag === 'schizo' && U.chance(0.5)) setTimeout(() => { if (this.state === 'run') { this.toast(U.choice(DATA.VOICE_LINES), '#cbb8e8'); SFX.play('voice'); } }, 2500);
  },

  /* ---------- rooms ---------- */
  enterRoom(room, entryDir) {
    this.room = room;
    room.discovered = true;
    room.visited = true;
    for (const d in DIRS) {
      const n = this.roomAt(room.gx + DIRS[d].dx, room.gy + DIRS[d].dy);
      if (n && room.doors[d]) n.discovered = true;
    }
    // clear transients; contents live on the room object (shared refs)
    this.tears = []; this.eBullets = []; this.enemies = []; this.bombs = [];
    this.parts = []; this.texts = []; this.zones = []; this.stamps = [];
    this.playerFired = false; this.healBeam = null;
    this.tearsAura = false;
    this.hyperfixType = null;
    this.boss = null;
    this.trapdoor = room.trapdoor || null;
    this.pickups = room.pickups;
    this.peds = room.peds;
    this.shopStock = room.stock || [];
    this.doorCd = 0.35;

    // position player
    const p = this.player;
    const midX = CW / 2, midY = RY + RH / 2;
    if (entryDir === 'N') { p.x = midX; p.y = RY + RH - 42; }
    else if (entryDir === 'S') { p.x = midX; p.y = RY + 42; }
    else if (entryDir === 'E') { p.x = RX + 42; p.y = midY; }
    else if (entryDir === 'W') { p.x = RX + RW - 42; p.y = midY; }
    else { p.x = midX; p.y = RY + RH - 90; }

    if (!room.spawned) this.populateRoom(room);
    this.doorsOpen = room.cleared;
    if (room.type === 'boss' && !room.cleared && room.bossPending) {
      this.boss = new Boss(this.bossId, this.depth, this);
      room.bossPending = false;
      this.setBanner(this.boss.name, this.boss.sub, 2.4);
      SFX.play('boss');
      SFX.setMusic('boss');
    } else if (room.type === 'boss' && !room.cleared && room.bossObj) {
      this.boss = room.bossObj;
      SFX.setMusic('boss');
    } else {
      SFX.setMusic('run');
    }
    if (room.type === 'secret' && !room.greeted) { room.greeted = true; this.toast(DATA.TOASTS.secret); }
    if (room.type === 'oon' && !room.greeted) { room.greeted = true; this.toast(DATA.TOASTS.oon, '#e08a8a'); }
  },

  populateRoom(room) {
    room.spawned = true;
    const p = this.player;
    switch (room.type) {
      case 'start':
        room.cleared = true;
        break;
      case 'normal': {
        room.cleared = false;
        spawnEnemiesForRoom(room, this.depth, this);
        break;
      }
      case 'item': {
        room.cleared = true;
        const pool = DATA.pickPool('special', p.items);
        const id1 = U.choice(pool.length ? pool : DATA.POOLS.special);
        if (p.flags.twoChoice) {
          let pool2 = pool.filter(id => id !== id1);
          const id2 = U.choice(pool2.length ? pool2 : DATA.POOLS.special);
          room.peds.push({ x: CW / 2 - 70, y: RY + RH / 2, itemId: id1, kind: 'item', taken: false, exclusive: true });
          room.peds.push({ x: CW / 2 + 70, y: RY + RH / 2, itemId: id2, kind: 'item', taken: false, exclusive: true });
        } else {
          room.peds.push({ x: CW / 2, y: RY + RH / 2, itemId: id1, kind: 'item', taken: false });
        }
        break;
      }
      case 'shop': {
        room.cleared = true;
        const disc = p.flags.discount ? 0.5 : 1;
        const px = (n) => Math.max(1, Math.ceil(n * disc));
        const y = RY + RH / 2 - 20;
        room.stock = [
          { type: 'half', price: px(3), x: RX + 140, y, taken: false },
          { type: 'pill', price: px(4), x: RX + 280, y, colorIdx: U.randi(0, 9), taken: false },
          { type: 'bomb', price: px(5), x: RX + 420, y, taken: false },
          { type: 'key', price: px(5), x: RX + 560, y, taken: false }
        ];
        const pool = DATA.pickPool('shop', p.items);
        room.peds.push({ x: RX + 690, y: y + 6, itemId: U.choice(pool.length ? pool : DATA.POOLS.shop), kind: 'shop', price: px(12), taken: false });
        this.shopStock = room.stock;
        break;
      }
      case 'boss': {
        room.cleared = false;
        room.bossPending = true;
        break;
      }
      case 'secret': {
        room.cleared = true;
        for (let i = 0; i < U.randi(2, 4); i++) room.pickups.push(new Pickup(U.choice(['coin', 'coin', 'nickel', 'pill']), CW / 2 + U.rand(-90, 90), RY + RH / 2 + U.rand(-60, 60)));
        if (U.chance(0.3)) {
          const pool = DATA.pickPool('special', p.items);
          room.peds.push({ x: CW / 2, y: RY + RH / 2, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
        }
        break;
      }
      case 'oon': {
        room.cleared = true;
        const pool = DATA.pickPool('oon', p.items);
        room.peds.push({ x: CW / 2, y: RY + RH / 2, itemId: U.choice(pool.length ? pool : DATA.POOLS.oon), kind: 'oon', price: 1, taken: false });
        break;
      }
    }
  },

  moveRoom(dir) {
    const cur = this.room;
    const target = this.roomAt(cur.gx + DIRS[dir].dx, cur.gy + DIRS[dir].dy);
    if (!target) return;
    // locked specialist door
    if (target.type === 'item' && !target.lockOpen) {
      if (this.player.keys > 0) {
        this.player.keys--;
        target.lockOpen = true;
        SFX.play('pickup');
      } else {
        if (this.lockCd <= 0) { this.toast(DATA.TOASTS.referral, '#e8c84c'); SFX.play('lock'); this.lockCd = 1.2; }
        // bounce back
        const p = this.player;
        p.x -= DIRS[dir].dx * 26; p.y -= DIRS[dir].dy * 26;
        return;
      }
    }
    if (target.type === 'secret' && !this.secretFound) return;
    SFX.play('door');
    this.enterRoom(target, DIRS[dir].opp);
  },

  onRoomCleared() {
    const room = this.room, p = this.player;
    room.cleared = true;
    this.doorsOpen = true;
    this.stats.rooms++;
    SFX.play('door');
    if (p.flags.gratitude && U.chance(0.25)) { p.heal(1); this.texts.push(new FloatText(p.x, p.y - 24, 'grateful +♥', '#8fd05a')); }
    if (p.flags.gym && p._gymAdd < 1.5) { p._gymAdd += 0.15; p.dmg += 0.15; }
    if (U.chance(0.4)) {
      const type = U.choice(['coin', 'coin', 'half', 'pill', 'coin', 'key', 'bomb']);
      this.pickups.push(new Pickup(type, CW / 2 + U.rand(-40, 40), RY + RH / 2 + U.rand(-30, 30)));
    }
  },

  onBossDead() {
    const room = this.room, p = this.player;
    room.cleared = true;
    this.doorsOpen = true;
    this.stats.bosses++;
    Meta.data.bestFloor = Math.max(Meta.data.bestFloor, this.depth);
    if (!Meta.data.diagBest) Meta.data.diagBest = {};
    Meta.data.diagBest[p.diag] = Math.max(Meta.data.diagBest[p.diag] || 0, this.depth);
    Meta.save();
    this.checkUnlocks();
    // rewards
    const bossPool = DATA.POOLS.boss;
    room.peds.push({ x: CW / 2 - 90, y: RY + RH / 2 + 40, itemId: U.choice(bossPool), kind: 'boss', taken: false });
    if (this.bossId === 'walrus') {
      const pool = DATA.pickPool('special', p.items);
      room.peds.push({ x: CW / 2 + 90, y: RY + RH / 2 + 40, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'boss', taken: false });
    }
    this.pickups.push(new Pickup('full', CW / 2 + U.rand(-60, 60), RY + RH / 2 - 40));
    this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-80, 80), RY + RH / 2));
    room.trapdoor = this.trapdoor = { x: CW / 2, y: RY + RH / 2 - 100 };
    // out-of-network door (25%)
    if (U.chance(0.25)) {
      for (const d of U.shuffle(Object.keys(DIRS))) {
        const nx = room.gx + DIRS[d].dx, ny = room.gy + DIRS[d].dy;
        if (!this.roomAt(nx, ny)) {
          const oon = makeRoom(nx, ny, 'oon');
          oon.doors[DIRS[d].opp] = true;
          room.doors[d] = true;
          buildLayout(oon, this.depth);
          this.grid.set(U.key(nx, ny), oon);
          this.floorRooms.push(oon);
          oon.discovered = true;
          this.toast('A red door creaks open. Out-of-network...', '#e08a8a');
          break;
        }
      }
    }
    SFX.setMusic('run');
  },

  /* ---------- explosions / paperwork ---------- */
  explode(x, y, rad, dmg) {
    SFX.play('boom');
    Haptics.buzz([30, 30, 60], 0);
    this.shake = Math.max(this.shake, 12);
    for (let i = 0; i < 26; i++) this.parts.push(new Particle(x, y, U.rand(-240, 240), U.rand(-240, 240), U.rand(0.3, 0.7), U.choice(['#e0a03a', '#e06a3a', '#8a8078', '#f0e8d0']), U.rand(3, 6)));
    const p = this.player;
    if (U.dist(x, y, p.x, p.y) < rad - 15) p.hurt(2, this);
    for (const e of this.enemies) {
      if (e.dying) continue;
      if (U.dist(x, y, e.x, e.y) < rad + e.r) e.hurt(dmg, this, true);
    }
    if (this.boss && !this.boss.dead && U.dist(x, y, this.boss.x, this.boss.y) < rad + this.boss.r) this.boss.hurt(dmg, this);
    // destroy tiles
    const room = this.room;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = room.layout[r][c];
      if (t !== 1 && t !== 2) continue;
      const px = tileToPx(c, r);
      if (U.dist(x, y, px.x, px.y) < rad + 20) {
        room.layout[r][c] = 0;
        for (let i = 0; i < 5; i++) this.parts.push(new Particle(px.x, px.y, U.rand(-100, 100), U.rand(-100, 100), 0.4, t === 1 ? '#8f8a80' : '#e8e0ce', 4));
        if (t === 2) this.paperDrop(px.x, px.y);
      }
    }
    // secret walls
    const midX = CW / 2, midY = RY + RH / 2;
    const doorPos = { N: { x: midX, y: RY - 12 }, S: { x: midX, y: RY + RH + 12 }, W: { x: RX - 12, y: midY }, E: { x: RX + RW + 12, y: midY } };
    for (const d in DIRS) {
      if (!room.secretDoors[d]) continue;
      if (U.dist(x, y, doorPos[d].x, doorPos[d].y) < rad + 42 && !this.secretFound) {
        this.secretFound = true;
        this.toast('You hear paperwork settle behind the wall...', '#cbb8e8');
        SFX.play('pop');
      }
    }
  },

  damagePaper(c, r, dmg) {
    const room = this.room;
    const k = c + ',' + r;
    if (room.paperHp[k] == null) return;
    room.paperHp[k] -= dmg;
    const px = tileToPx(c, r);
    this.parts.push(new Particle(px.x + U.rand(-10, 10), px.y + U.rand(-10, 10), U.rand(-60, 60), U.rand(-80, -20), 0.4, '#e8e0ce', 3));
    if (room.paperHp[k] <= 0) {
      delete room.paperHp[k];
      room.layout[r][c] = 0;
      SFX.play('pop');
      for (let i = 0; i < 8; i++) this.parts.push(new Particle(px.x, px.y, U.rand(-120, 120), U.rand(-120, 20), 0.5, '#e8e0ce', 4));
      this.paperDrop(px.x, px.y);
    }
  },
  paperDrop(x, y) {
    const p = this.player;
    const chance = p.flags.paperTrail ? 1 : 0.28;
    if (U.chance(chance)) {
      const type = U.choice(['coin', 'coin', 'coin', 'nickel', 'half', 'pill', 'key']);
      this.pickups.push(new Pickup(type, x, y));
    }
  },

  /* ---------- pills ---------- */
  usePill() {
    const p = this.player;
    if (p.pill == null) return;
    const pillIdx = this.pillAssign[p.pill];
    const pill = DATA.PILLS[pillIdx];
    p.pill = null;
    p.pillsThisFloor++;
    this.stats.pills++;
    SFX.play('pill');
    pill.apply(p, this);
    const known = this.pillKnown.has(pillIdx) || p.flags.pillsKnown;
    this.pillKnown.add(pillIdx);
    this.toast((known ? '' : 'It was... ') + pill.name + '! ' + pill.msg, pill.bad ? '#e0a05a' : '#b8e0a0');
    if (p.pillsThisFloor >= 4) {
      if (!Meta.data.everOverRx) { Meta.data.everOverRx = 1; this.checkUnlocks(); }
      if (!p.flags.noOverRx) {
        const eff = U.choice([
          () => { p.dmg = Math.max(1, p.dmg - 0.3); return 'damage down'; },
          () => { p.spd *= 0.94; return 'speed down'; },
          () => { p.tearDelay *= 1.07; return 'tears down'; },
          () => { p.tempSlow = 8; return 'sudden drowsiness'; }
        ])();
        this.toast(DATA.TOASTS.overrx + ' (' + eff + ')', '#e05a5a');
        SFX.play('error');
      } else {
        this.toast('Placebo Effect: no side effects!', '#b8e0a0');
      }
    }
  },

  /* ---------- update ---------- */
  update(dt) {
    if (this.state === 'descend') {
      this.descendT += dt;
      if (this.descendT >= 0.55 && !this._descended) {
        this._descended = true;
        this.depth++;
        this.newFloor();
      }
      if (this.descendT >= 1.25) { this.state = 'run'; }
      return;
    }
    if (this.state !== 'run') return;
    this.t += dt;
    this.doorCd -= dt; this.lockCd -= dt;
    this.shake *= Math.pow(0.001, dt); if (this.shake < 0.3) this.shake = 0;
    this.enemySlow -= dt;
    let dtarget = this.darkTarget;
    if (!(this.boss && !this.boss.dead && this.boss.id === 'stigma')) {
      dtarget = Math.max(this.player.diag === 'depression' ? 0.14 : 0, this.floorDark || 0);
      this.darkTarget = dtarget;
    }
    this.dark = U.lerp(this.dark, dtarget, U.clamp(dt * 2.5, 0, 1));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter(t => t.t < t.dur);
    if (this.healBeam) { this.healBeam.t -= dt; if (this.healBeam.t <= 0) this.healBeam = null; }

    const p = this.player;
    this.playerFired = false;
    p.update(dt, this);

    // inputs
    if (Input.take('pill')) this.usePill();
    if (Input.take('bomb') && p.bombs > 0 && this.state === 'run') {
      p.bombs--;
      this.bombs.push(new BombEnt(p.x, p.y));
      SFX.play('ui');
    }
    if (Input.take('pause')) { this.showPause(); return; }
    if (Input.take('mute')) { const mu = SFX.toggleMute(); this.toast(mu ? 'muted' : 'unmuted'); }

    // entities
    for (const e of this.enemies) e.update(dt, this);
    this.enemies = this.enemies.filter(e => !e.dying);
    if (this.boss) this.boss.update(dt, this);
    for (const t of this.tears) t.update(dt, this);
    this.tears = this.tears.filter(t => !t.dead);
    for (const b of this.eBullets) b.update(dt, this);
    this.eBullets = this.eBullets.filter(b => !b.dead);
    for (const b of this.bombs) b.update(dt, this);
    this.bombs = this.bombs.filter(b => !b.dead);
    for (const z of this.zones) z.update(dt);
    this.zones = this.zones.filter(z => !z.dead);
    for (const pt of this.parts) pt.update(dt);
    this.parts = this.parts.filter(pt => !pt.dead);
    for (const tx of this.texts) tx.update(dt);
    this.texts = this.texts.filter(tx => !tx.dead);
    for (const pk of this.pickups) pk.update(dt, this);
    const alivePickups = this.pickups.filter(pk => !pk.dead);
    this.pickups.length = 0; Array.prototype.push.apply(this.pickups, alivePickups);

    // stamps (adjuster)
    for (const s of this.stamps) {
      s.t -= dt;
      if (s.t <= 0 && !s.done) {
        s.done = true;
        SFX.play('stamp');
        this.shake = Math.max(this.shake, 6);
        if (U.dist(s.x, s.y, p.x, p.y) < s.r) p.hurt(1, this);
      }
    }
    this.stamps = this.stamps.filter(s => s.t > -0.2);

    // room clear
    const room = this.room;
    if (!room.cleared && room.type === 'normal' && room.spawned && this.enemies.length === 0) this.onRoomCleared();
    if (!room.cleared && room.type === 'boss' && this.boss && this.boss.dead && this.enemies.length === 0 && !room.cleared) {
      // onBossDead already ran via boss.die
    }
    if (room.type === 'boss' && !room.cleared && this.boss) room.bossObj = this.boss;

    // pedestals
    for (const ped of this.peds) {
      if (ped.taken) continue;
      if (U.dist(ped.x, ped.y, p.x, p.y) > 26 + p.r) continue;
      if (ped.kind === 'oon') {
        if (p.maxhp >= 4) {
          p.maxhp -= 2; p.hp = Math.min(p.hp, p.maxhp);
          ped.taken = true;
          p.addItem(ped.itemId, this);
          this.stats.items++;
          this.toast('Paid out of pocket. Literally.', '#e08a8a');
        } else if (this.lockCd <= 0) { this.lockCd = 1.4; this.toast(DATA.TOASTS.oonPoor, '#e08a8a'); SFX.play('error'); }
      } else if (ped.price) { // shop item
        if (p.coins >= ped.price) {
          p.coins -= ped.price;
          ped.taken = true;
          p.addItem(ped.itemId, this);
          this.stats.items++;
          SFX.play('coin');
        } else if (this.lockCd <= 0) { this.lockCd = 1.4; this.texts.push(new FloatText(ped.x, ped.y - 40, 'need ' + ped.price + '¢', '#e8c84c')); SFX.play('error'); }
      } else {
        ped.taken = true;
        p.addItem(ped.itemId, this);
        this.stats.items++;
        if (ped.exclusive) for (const o of this.peds) if (o !== ped) o.taken = true;
      }
    }

    // shop stock
    for (const s of this.shopStock) {
      if (s.taken) continue;
      if (U.dist(s.x, s.y, p.x, p.y) > 22 + p.r) continue;
      if (p.coins < s.price) {
        if (this.lockCd <= 0) { this.lockCd = 1.4; this.texts.push(new FloatText(s.x, s.y - 30, 'need ' + s.price + '¢', '#e8c84c')); SFX.play('error'); }
        continue;
      }
      if (s.type === 'half' && p.hp >= p.maxhp) continue;
      if (s.type === 'pill' && p.pill != null) continue;
      p.coins -= s.price;
      s.taken = true;
      SFX.play('coin');
      if (s.type === 'half') p.heal(1);
      if (s.type === 'pill') p.pill = s.colorIdx;
      if (s.type === 'bomb') p.bombs++;
      if (s.type === 'key') p.keys++;
    }

    // trapdoor
    if (this.trapdoor && U.dist(this.trapdoor.x, this.trapdoor.y, p.x, p.y) < 26) {
      if (this.floorHits === 0 && !Meta.data.everNoHitFloor) { Meta.data.everNoHitFloor = 1; this.checkUnlocks(); }
      this.state = 'descend';
      this.descendT = 0;
      this._descended = false;
      SFX.play('descend');
      return;
    }

    // door traversal
    if (this.doorsOpen && this.doorCd <= 0) {
      const midX = CW / 2, midY = RY + RH / 2;
      const nearMidX = Math.abs(p.x - midX) < 40, nearMidY = Math.abs(p.y - midY) < 40;
      if (p.y <= RY + 12 && nearMidX && (room.doors.N || (room.secretDoors.N && this.secretFound))) this.moveRoom('N');
      else if (p.y >= RY + RH - 12 && nearMidX && (room.doors.S || (room.secretDoors.S && this.secretFound))) this.moveRoom('S');
      else if (p.x <= RX + 12 && nearMidY && (room.doors.W || (room.secretDoors.W && this.secretFound))) this.moveRoom('W');
      else if (p.x >= RX + RW - 12 && nearMidY && (room.doors.E || (room.secretDoors.E && this.secretFound))) this.moveRoom('E');
    }

    // death
    if (p.dead) {
      this.deathT += dt;
      if (this.deathT > 0.9) this.showDead();
    }

    // debug keys
    if (this.debug) {
      if (Input.keys['KeyN'] && !this._dbN) { this.depth++; this.newFloor(); }
      this._dbN = !!Input.keys['KeyN'];
      if (Input.keys['KeyB'] && !this._dbB) { const br = this.floorRooms.find(r => r.type === 'boss'); if (br) this.enterRoom(br, null); }
      this._dbB = !!Input.keys['KeyB'];
      if (Input.keys['KeyK'] && !this._dbK) { for (const e of this.enemies) e.hurt(9999, this, true); if (this.boss && !this.boss.dead) this.boss.hurt(9999, this); }
      this._dbK = !!Input.keys['KeyK'];
      if (Input.keys['KeyH'] && !this._dbH) { p.hp = p.maxhp; }
      this._dbH = !!Input.keys['KeyH'];
      if (Input.keys['KeyG'] && !this._dbG) { p.coins += 20; p.keys += 3; p.bombs += 3; }
      this._dbG = !!Input.keys['KeyG'];
    }
  },

  /* ---------- pause / death overlays ---------- */
  showPause() {
    this.state = 'pause';
    SFX.play('ui');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:30px">PAUSED</h1>
        <div class="stats-line">${DATA.DIAG[this.player.diag].name} · ward ${this.depth} · ${this.stats.kills} symptoms managed</div>
        <button class="btn" id="bResume">RESUME</button>
        <button class="btn minor" id="bSettings2">⚙ SETTINGS</button>
        <button class="btn minor" id="bQuit">QUIT TO TITLE</button>
      </div>`);
    document.getElementById('bResume').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bSettings2').onclick = () => { SFX.play('ui'); this.showSettings(() => this.showPause()); };
    document.getElementById('bQuit').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  showDead() {
    const diagId = this.player.diag;
    // record meta exactly once per death (this screen can be re-opened from Unlocks)
    if (!this._deathRecorded) {
      this._deathRecorded = true;
      Meta.data.deaths++;
      Meta.data.bestFloor = Math.max(Meta.data.bestFloor, this.depth);
      if (!Meta.data.diagBest) Meta.data.diagBest = {};
      this._prevBest = Meta.data.diagBest[diagId] || 0;
      Meta.data.diagBest[diagId] = Math.max(this._prevBest, this.depth);
      Meta.save();
      this.checkUnlocks(); // catch kills/ward/etc. milestones reached this run
      this._deathQuip = U.choice(DATA.DEATH_LINES);
    }
    this.state = 'dead';
    const prevBest = this._prevBest, newBest = this.depth > prevBest;
    SFX.setMusic('menu');
    const D = DATA.DIAG[diagId];
    const st = this.stats;
    const row = (label, val) => `<div class="sumrow"><span>${label}</span><b>${val}</b></div>`;
    const unlockHtml = this.runUnlocks.length ? `
      <div class="newunlocks">
        <div class="nutitle">🏆 NEW UNLOCK${this.runUnlocks.length > 1 ? 'S' : ''}!</div>
        ${this.runUnlocks.map(a => `<div class="nurow"><b>${a.name}</b><span>${a.desc}</span></div>`).join('')}
      </div>` : '';
    this.overlay(`
      <div class="panel wide">
        <div class="rx" style="border-color:#8a3030">
          <div class="stamp">DISCHARGED</div>
          <h2 style="color:${D.color}">${D.name}</h2>
          <div class="sub">Reached ${DATA.floorName(this.depth)} · Ward ${this.depth} · ${DATA.tierName(this.depth)}${newBest ? ' &nbsp;⭐ NEW BEST' : (prevBest ? ' (best: ward ' + prevBest + ')' : '')}</div>
        </div>
        <div class="summary">
          ${row('Symptoms managed', st.kills)}
          ${row('Bosses defeated', st.bosses)}
          ${row('Prescriptions collected', st.items)}
          ${row('Pills swallowed', st.pills)}
          ${row('Rooms survived', st.rooms)}
        </div>
        ${unlockHtml}
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="deadWalrus"></canvas>
          <div class="bubble"><i>“${this._deathQuip}”</i></div>
        </div>
        <button class="btn" id="bAgainSame">SAME DIAGNOSIS, RUN IT BACK</button>
        <div class="btnrow">
          <button class="btn minor" id="bAgainNew">RE-DIAGNOSE</button>
          <button class="btn minor" id="bUnlocks">🏆 UNLOCKS</button>
        </div>
        <button class="btn minor" id="bTitle">TITLE</button>
      </div>`);
    this.paintWalrus('deadWalrus');
    document.getElementById('bAgainSame').onclick = () => { SFX.play('ui'); this.beginRun(diagId); };
    document.getElementById('bAgainNew').onclick = () => { SFX.play('ui'); this.startQuiz(); };
    document.getElementById('bUnlocks').onclick = () => { SFX.play('ui'); this.showUnlocks(() => this.showDead()); };
    document.getElementById('bTitle').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* ---------- unlocks / achievements screen ---------- */
  showUnlocks(returnTo) {
    this.state = 'unlocks';
    const m = Meta.data;
    const cards = DATA.ACHIEVEMENTS.map(a => {
      const got = !!(m.unlocks && m.unlocks[a.id]);
      return `<div class="ach ${got ? 'got' : 'locked'}">
        <div class="achicon">${got ? '🏆' : '🔒'}</div>
        <div class="achbody">
          <div class="achname">${got ? a.name : '???'}</div>
          <div class="achdesc">${got ? a.desc : a.hint}</div>
          ${a.reward ? `<div class="achreward">unlocks: ${a.reward}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    const total = DATA.ACHIEVEMENTS.length;
    const done = DATA.ACHIEVEMENTS.filter(a => m.unlocks && m.unlocks[a.id]).length;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">UNLOCKS</h1>
        <div class="tagline">${done} / ${total} earned · your permanent record</div>
        <div class="achlist">${cards}</div>
        <button class="btn" id="bUnlBack">BACK</button>
      </div>`);
    document.getElementById('bUnlBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- overlay plumbing ---------- */
  overlay(html) {
    const o = document.getElementById('overlay');
    o.innerHTML = html;
    o.classList.add('show');
  },
  hideOverlay() { document.getElementById('overlay').classList.remove('show'); },
  paintWalrus(id) {
    const c = document.getElementById(id);
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 132, 132);
    Render.drawWalrusFace(ctx, 66, 72, 0.82, 0);
  }
};

/* ---------------- boot & loop ---------------- */
(function boot() {
  const canvas = document.getElementById('game');
  Render.ctx = canvas.getContext('2d');
  Meta.load();
  Haptics.init();
  Input.init(canvas);

  // treat coarse-pointer devices (phones/tablets) as touch from the start so the
  // portrait deck / landscape overlay lay out correctly before the first tap
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    Render.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const iw = window.innerWidth, ih = window.innerHeight;
    const touch = document.body.classList.contains('touch');
    const portrait = ih > iw;
    let scale;
    if (touch && portrait) {
      // Game Boy layout: game at the top, deck fills the rest — cap game height so the deck always fits
      scale = Math.min(iw / CW, (ih * 0.58) / CH);
    } else {
      scale = Math.min(iw / CW, ih / CH);
    }
    canvas.style.width = Math.floor(CW * scale) + 'px';
    canvas.style.height = Math.floor(CH * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  resize();

  // touch stick visuals — floating rings (landscape) + deck nubs (portrait)
  function updateSticks() {
    const live = G.state === 'run';
    for (const [stick, ringId, nubId] of [[Input.moveStick, 'stickLvis', 'nubMove'], [Input.aimStick, 'stickRvis', 'nubAim']]) {
      const ring = document.getElementById(ringId);
      if (ring) {
        if (live && stick.active && stick.mode === 'float') {
          ring.style.display = 'block';
          ring.style.left = stick.ax + 'px';
          ring.style.top = stick.ay + 'px';
          ring.firstElementChild.style.transform = `translate(${stick.dx * 34}px, ${stick.dy * 34}px)`;
        } else ring.style.display = 'none';
      }
      const nub = document.getElementById(nubId);
      if (nub) {
        const on = live && stick.active && stick.mode === 'pad';
        nub.style.transform = `translate(${(on ? stick.dx : 0) * 40}px, ${(on ? stick.dy : 0) * 40}px)`;
      }
    }
  }

  // big status readout in the portrait deck (its own canvas, only when the deck is visible)
  const deckStatusEl = document.getElementById('deckStatus');
  const dsCtx = deckStatusEl ? deckStatusEl.getContext('2d') : null;
  function updateDeckStatus() {
    if (!dsCtx || !deckStatusEl.offsetParent || !G.player) return; // offsetParent is null when the deck is display:none
    if (G.state !== 'run' && G.state !== 'pause' && G.state !== 'descend' && G.state !== 'dead') return;
    const rect = deckStatusEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (deckStatusEl.width !== Math.round(w * dpr) || deckStatusEl.height !== Math.round(h * dpr)) {
      deckStatusEl.width = Math.round(w * dpr); deckStatusEl.height = Math.round(h * dpr);
    }
    dsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Render.drawDeckStatus(dsCtx, w, h, G);
  }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (G.state === 'run' || G.state === 'descend') G.update(dt);
    Render.draw(G);
    updateSticks();
    updateDeckStatus();
    requestAnimationFrame(frame);
  }

  // test hooks
  window.__egsTest = {
    G,
    state: () => G.state,
    start: (d) => { SFX.muted = true; G.beginRun(d || 'adhd'); },
    warpBoss: () => { const br = G.floorRooms.find(r => r.type === 'boss'); if (br) G.enterRoom(br, null); },
    killAll: () => { for (const e of G.enemies) e.hurt(9999, G, true); if (G.boss && !G.boss.dead) G.boss.hurt(9999, G); },
    player: () => G.player,
    depth: () => G.depth
  };

  G.showTitle();
  requestAnimationFrame(frame);
})();
