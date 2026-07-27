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
  seed: null, daily: false, dailyKey: null,   // Daily Ward: a fixed date-seeded run
  debug: /[?&]debug=1/.test(location.search),

  /* ---------- helpers ---------- */
  roomAt(gx, gy) { return this.grid ? (this.grid.get(U.key(gx, gy)) || null) : null; },
  /* Run a generation step with RAND seeded from the run seed + a label. A normal run
     has seed == null, so this just calls fn() on Math.random — behavior unchanged.
     Reseeding per floor/room/reward means the daily dungeon is identical for everyone
     regardless of play order, while combat keeps using Math.random. */
  genSeed(parts, fn) { return this.seed == null ? fn() : withSeed(hashSeed(this.seed, parts), fn); },
  /* codex completion → perks. a tab counts complete when every listed id is seen. */
  codexTabComplete(cat) {
    const seen = (Meta.data.seen && Meta.data.seen[cat]) || {};
    let ids;
    if (cat === 'enemies') ids = Object.keys(DATA.ENEMIES).filter(id => id !== 'form');
    else if (cat === 'bosses') ids = Object.keys(DATA.BOSSES);
    else if (cat === 'items') ids = Object.keys(DATA.ITEMS);
    else ids = DATA.PILLS.map((_, i) => i);
    return ids.every(id => seen[id]);
  },
  applyCodexPerks(p) {
    if (this.codexTabComplete('pills')) p.flags.pillsKnown = true;   // all pills documented → pre-identified
    if (this.codexTabComplete('enemies')) p.flags.hpBars = true;     // all patients → Clinician's Eye (HP bars)
  },
  /* comorbidity synergies: fuse owned pairs into a named bonus condition */
  checkComorbidSynergy() {
    const owned = this.player.comorbidities || [];
    this.player._synergies = this.player._synergies || [];
    for (const s of (DATA.COMORBID_SYNERGY || [])) {
      if (this.player._synergies.includes(s.name)) continue;
      if (s.need.every(id => owned.includes(id))) {
        this.player._synergies.push(s.name);
        try { s.apply(this.player, this); } catch (e) { }
        this.toast('🧬 SYNERGY: ' + s.name + ' — ' + s.note, '#e8c84c');
        SFX.play('item');
      }
    }
  },
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

  /* ---------- daily ward (a date-seeded run everyone shares) ---------- */
  DAILY_DIAGS: ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo'],
  todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  seedFromKey(key) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    return h >>> 0;
  },
  dailyInfo() {
    const key = this.todayKey(), seed = this.seedFromKey(key);
    return { key, seed, diag: this.DAILY_DIAGS[seed % this.DAILY_DIAGS.length] };
  },
  seedCode(n) { return (n >>> 0).toString(36); },
  parseSeedCode(s) { const n = parseInt(String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''), 36); return isNaN(n) ? null : (n >>> 0); },
  prevDayKey(key) {
    const p = key.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _dailyCalendar() {
    const now = new Date();
    const Y = now.getFullYear(), M = now.getMonth();
    const first = new Date(Y, M, 1).getDay();
    const days = new Date(Y, M + 1, 0).getDate();
    const hist = Meta.data.dailyHistory || {};
    const todayD = now.getDate();
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="calh">${d}</div>`).join('');
    for (let i = 0; i < first; i++) cells += `<div class="calcell empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const key = Y + '-' + String(M + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const rec = hist[key];
      const cls = 'calcell' + (rec ? ' played' : '') + (d === todayD ? ' today' : '');
      cells += `<div class="${cls}">${rec ? `<span class="calward">${rec.best}</span>` : `<span class="caldd">${d}</span>`}</div>`;
    }
    return `<div class="calgrid">${cells}</div>`;
  },
  showDaily() {
    this.state = 'daily';
    SFX.setMusic('menu');
    document.body.classList.remove('inrun');
    const info = this.dailyInfo();
    const D = DATA.DIAG[info.diag];
    const rec = (Meta.data.daily && Meta.data.daily.key === info.key) ? Meta.data.daily : null;
    const bestLine = rec
      ? `<div class="stats-line">today's best: <b>Ward ${rec.best}</b>${rec.win ? ' · 🦭 beat the Walrus' : ''}</div>`
      : `<div class="stats-line">not attempted yet today — go set the bar</div>`;
    const ds = Meta.data.dailyStreak || { count: 0, best: 0 };
    const streakLine = (ds.count > 0)
      ? `<div class="stats-line">🔥 ${ds.count}-day streak${ds.best > ds.count ? ` · best ${ds.best}` : ''}</div>` : '';
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:28px">🗓️ DAILY WARD</h1>
        <div class="tagline">${info.key} · everyone gets THIS exact dungeon today</div>
        <div class="walrusbox">
          <canvas width="84" height="84" id="dailyPortrait" style="width:92px;height:92px;flex:0 0 auto"></canvas>
          <div class="bubble">Today you're <b style="color:${D.color}">${D.name}</b>. Same rooms, same items, same bosses for every player — combat's still live, so it's pure skill. Screenshot your card and dare your friends.</div>
        </div>
        ${bestLine}${streakLine}
        ${this._dailyCalendar()}
        <button class="btn" id="bDailyPlay">▶ PLAY TODAY'S WARD</button>
        <div class="btnrow">
          ${rec ? `<button class="btn minor" id="bDailyShare">📤 SHARE</button>` : ''}
          <button class="btn minor" id="bDailyChallenge">🔗 CHALLENGE</button>
        </div>
        <button class="btn minor" id="bDailyBack">BACK</button>
        <div class="smallprint">Seed resets at local midnight. Replays allowed — only your best counts.</div>
      </div>`);
    const pc = document.getElementById('dailyPortrait');
    if (pc) Render.drawCharPortrait(pc.getContext('2d'), info.diag);
    document.getElementById('bDailyPlay').onclick = () => { SFX.init(); SFX.play('ui'); this.beginRun(info.diag, { seed: info.seed, key: info.key, isDaily: true }); };
    const sh = document.getElementById('bDailyShare');
    if (sh) sh.onclick = () => { SFX.play('ui'); Render.shareCard({ diag: info.diag, depth: rec.best, daily: true, key: info.key, win: rec.win, stats: rec.stats, code: this.seedCode(info.seed) }); };
    document.getElementById('bDailyChallenge').onclick = () => { SFX.play('ui'); this.showChallenge(() => this.showDaily()); };
    document.getElementById('bDailyBack').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* copy/paste an arbitrary dungeon seed to challenge a friend */
  showChallenge(returnTo) {
    this.state = 'challenge';
    const info = this.dailyInfo();
    const code = this.seedCode(info.seed);
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🔗 CHALLENGE</h1>
        <div class="tagline">play a friend's exact dungeon</div>
        <div class="rx" style="border-color:#3a6ad0">
          <div class="mech">Today's code: <b class="seedcode" id="todayCode">${code}</b></div>
          <div class="presc">Send it to a friend — anyone who plays it gets this identical run.</div>
        </div>
        <button class="btn" id="bCopyCode">📋 COPY TODAY'S CODE</button>
        <div class="setrow" style="margin-top:14px">
          <label>Got a code? Play it:</label>
          <input type="text" id="seedInput" class="seedfield" placeholder="e.g. ${code}" autocomplete="off" autocapitalize="off" spellcheck="false">
        </div>
        <button class="btn" id="bPlayCode">▶ PLAY THIS SEED</button>
        <div class="smallprint" id="seedMsg">The code is just the dungeon seed — the diagnosis is baked in too.</div>
        <button class="btn minor" id="bChalBack">BACK</button>
      </div>`);
    document.getElementById('bCopyCode').onclick = (e) => {
      SFX.play('ui');
      const txt = 'Beat my dungeon in Everybodies Got Somethin — code ' + code + '  →  https://chasegannon42-maker.github.io/everybodies-got-somethin/';
      const done = () => { e.target.textContent = '✓ COPIED — SEND IT'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(done);
      else { const s = document.getElementById('seedMsg'); if (s) s.textContent = 'Copy this code: ' + code; }
    };
    const play = () => {
      const seed = this.parseSeedCode(document.getElementById('seedInput').value);
      if (seed == null) { SFX.play('error'); const s = document.getElementById('seedMsg'); if (s) { s.textContent = "That code doesn't look right — try again."; s.style.color = '#b03030'; } return; }
      SFX.init(); SFX.play('ui');
      const diag = this.DAILY_DIAGS[seed % this.DAILY_DIAGS.length];
      this.beginRun(diag, { seed, key: 'seed-' + this.seedCode(seed), isDaily: false });
    };
    document.getElementById('bPlayCode').onclick = play;
    document.getElementById('seedInput').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') play(); });
    document.getElementById('bChalBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showDaily()))(); };
  },

  /* ---------- flow: title / quiz / card ---------- */
  showTitle() {
    this.state = 'title';
    SFX.setMusic('menu');
    document.body.classList.remove('inrun');
    const m = Meta.data;
    this._startChronic = false; this._startBossRush = false;
    const chronicOn = !!m.chronicUnlocked, bossRushOn = this.codexTabComplete('bosses');
    const ngRow = (chronicOn || bossRushOn) ? `<div class="btnrow">${chronicOn ? '<button class="btn minor" id="bChronic">🩸 CHRONIC MODE</button>' : ''}${bossRushOn ? '<button class="btn minor" id="bBossRush">☠ BOSS RUSH</button>' : ''}</div>` : '';
    const statsLine = m.runs > 0
      ? `<button class="btn minor" id="bRunHist" style="margin-top:6px">📊 runs: ${m.runs} · deepest ward: ${m.bestFloor} · tap for history</button>`
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
        <button class="btn" id="bDaily">🗓️ DAILY WARD</button>
        <button class="btn minor" id="bFiles">📁 PATIENT FILES (choose your diagnosis)</button>
        <button class="btn minor" id="bChart">📋 PATIENT CHART (codex)</button>
        <div class="btnrow">
          <button class="btn minor" id="bStoryT">📖 CHART NOTES</button>
          <button class="btn minor" id="bBestiaryT">☠ BESTIARY</button>
        </div>
        ${ngRow}
        <div class="btnrow">
          <button class="btn minor" id="bHow">HOW TO PLAY</button>
          <button class="btn minor" id="bUnlocksT">🏆 UNLOCKS</button>
          <button class="btn minor" id="bSettings">⚙ SETTINGS</button>
        </div>
        ${statsLine}
        <div class="smallprint">A satire about a system that hands out labels like candy — not about the people living with them. Be kind, including to yourself. ♥</div>
      </div>`);
    document.getElementById('overlay').classList.add('lightbg');   // let the atmospheric backdrop show on the title
    this.paintWalrus('titleWalrus');
    document.getElementById('bStart').onclick = () => { SFX.init(); SFX.play('ui'); this.startCheckup(); };
    document.getElementById('bDaily').onclick = () => { SFX.init(); SFX.play('ui'); this.showDaily(); };
    document.getElementById('bFiles').onclick = () => { SFX.init(); SFX.play('ui'); this.showFiles(); };
    document.getElementById('bChart').onclick = () => { SFX.init(); SFX.play('ui'); this.showCodex(() => this.showTitle()); };
    document.getElementById('bStoryT').onclick = () => { SFX.init(); SFX.play('ui'); this.showStoryGallery(); };
    document.getElementById('bBestiaryT').onclick = () => { SFX.init(); SFX.play('ui'); this.showBestiary(() => this.showTitle()); };
    const bc = document.getElementById('bChronic'); if (bc) bc.onclick = () => { SFX.init(); SFX.play('ui'); this._startChronic = true; this.startQuiz(); };
    const bbr = document.getElementById('bBossRush'); if (bbr) bbr.onclick = () => { SFX.init(); SFX.play('ui'); this._startBossRush = true; this.startQuiz(); };
    document.getElementById('bHow').onclick = () => { SFX.init(); SFX.play('ui'); this.showHow(); };
    document.getElementById('bUnlocksT').onclick = () => { SFX.init(); SFX.play('ui'); this.showUnlocks(() => this.showTitle()); };
    document.getElementById('bSettings').onclick = () => { SFX.init(); SFX.play('ui'); this.showSettings(() => this.showTitle()); };
    const brh = document.getElementById('bRunHist'); if (brh) brh.onclick = () => { SFX.init(); SFX.play('ui'); this.showStats(() => this.showTitle()); };
  },

  /* settings overlay with SFX + music volume sliders; returnTo() restores the prior screen */
  showSettings(returnTo) {
    SFX.init();
    const pct = v => Math.round(v * 100);
    const a = Meta.data.a11y || (Meta.data.a11y = { bulletContrast: false, reduceMotion: false, easy: false });
    const ct = (on, label) => (on ? '✅ ' : '⬜ ') + label;
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
        <div class="tagline" style="margin:10px 0 2px">Accessibility</div>
        <button class="btn minor" id="bA11yContrast">${ct(a.bulletContrast, 'High-contrast bullets')}</button>
        <button class="btn minor" id="bA11yMotion">${ct(a.reduceMotion, 'Reduced motion')}</button>
        <button class="btn minor" id="bA11yEasy">${ct(a.easy, 'Second Opinion (easier)')}</button>
        <button class="btn minor" id="bStoryToggle">${ct(!Meta.data.storyOff, 'Story cutscenes')}</button>
        <button class="btn" id="bSetBack">BACK</button>
        <div class="smallprint">Tip: press <span class="kbd">M</span> anytime to mute. Easy mode applies to your next run. Settings are saved on this device.</div>
      </div>`);
    const sfx = document.getElementById('sfxSlider'), mus = document.getElementById('musSlider');
    sfx.oninput = () => { SFX.init(); SFX.setSfxVol(sfx.value / 100); document.getElementById('sfxPct').textContent = sfx.value + '%'; };
    sfx.onchange = () => { if (!SFX.muted) SFX.play('coin'); }; // preview level on release
    mus.oninput = () => { SFX.init(); SFX.setMusicVol(mus.value / 100); document.getElementById('musPct').textContent = mus.value + '%'; };
    document.getElementById('bMuteAll').onclick = (e) => { SFX.init(); const mu = SFX.toggleMute(); e.target.textContent = mu ? '🔇 UNMUTE ALL' : '🔊 MUTE ALL'; };
    const hb = document.getElementById('bHaptics');
    if (hb) hb.onclick = (e) => { Input.usingTouch = true; const on = Haptics.toggle(); e.target.textContent = on ? '📳 HAPTICS: ON' : '📴 HAPTICS: OFF'; };
    const tog = (id, key, label) => { const b = document.getElementById(id); if (b) b.onclick = () => { SFX.play('ui'); a[key] = !a[key]; Meta.save(); b.textContent = ct(a[key], label); }; };
    tog('bA11yContrast', 'bulletContrast', 'High-contrast bullets');
    tog('bA11yMotion', 'reduceMotion', 'Reduced motion');
    tog('bA11yEasy', 'easy', 'Second Opinion (easier)');
    const bst = document.getElementById('bStoryToggle');
    if (bst) bst.onclick = () => { SFX.play('ui'); Meta.data.storyOff = Meta.data.storyOff ? 0 : 1; Meta.save(); bst.textContent = ct(!Meta.data.storyOff, 'Story cutscenes'); };
    document.getElementById('bSetBack').onclick = () => { SFX.play('ui'); returnTo(); };
  },

  /* first-run orientation, shown once before the first checkup */
  showTutorial(then) {
    this.state = 'tutorial';
    Meta.data.onboarded = 1; Meta.save();
    const touch = Input.usingTouch || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:28px">FIRST VISIT?</h1>
        <div class="tagline">a 15-second orientation</div>
        <div class="controls-grid">
          <b>Goal:</b> clear each room, beat the ward's boss, take the trapdoor down — forever.<br><br>
          <b>Move:</b> ${touch ? 'left thumb' : '<span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>'}<br>
          <b>Shoot:</b> ${touch ? 'right thumb' : 'arrow keys or the mouse'}<br>
          <b>Pill / Claim:</b> ${touch ? 'the 💊 and 📄 buttons' : '<span class="kbd">Q</span> and <span class="kbd">E</span>'}<br><br>
          Dr. Walrus gives a quick quiz, then a diagnosis — each one plays differently. Doors open once a room is clear. Copays (¢) buy refills; Referrals (🔑) open the Specialist.<br><br>
          <i>It's a satire about over-diagnosis — be kind to yourself out there. ♥</i>
        </div>
        <button class="btn" id="bTutGo">GOT IT — SEE THE DOCTOR</button>
        <button class="btn minor" id="bTutSkip">skip</button>
      </div>`);
    const go = () => { SFX.play('ui'); (then || (() => this.startQuiz()))(); };
    document.getElementById('bTutGo').onclick = go;
    document.getElementById('bTutSkip').onclick = go;
  },

  /* Isaac-style character select — every diagnosis is its own character */
  showFiles() {
    this.state = 'files';
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'fine'];
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

  // first checkup: play the prologue cutscene once, then tutorial (once), then the quiz
  startCheckup() {
    const go = () => { if (!Meta.data.onboarded) this.showTutorial(() => this.startQuiz()); else this.startQuiz(); };
    if (!Meta.data.storyOff && typeof Story !== 'undefined' && !(Meta.data.seenStory && Meta.data.seenStory.prologue)) {
      Story.play('prologue', go);
    } else go();
  },
  // story interlude when first reaching a milestone ward; returns true if one is now playing
  maybeInterlude() {
    if (Meta.data.storyOff || typeof Story === 'undefined' || this.bossRush) return false;
    const id = { 5: 'ward5', 10: 'ward10', 15: 'ward15', 20: 'ward20', 50: 'ward50pre' }[this.depth];
    // the interlude interrupts the descend animation, so its onDone must rebuild the floor AND restore play
    if (id && !(Meta.data.seenStory && Meta.data.seenStory[id])) { Story.play(id, () => { this.newFloor(); this.state = 'run'; }); return true; }
    return false;
  },

  startQuiz() {
    this.state = 'quiz';
    this.quiz = {
      qs: U.shuffle(DATA.QUESTIONS).slice(0, 5),
      idx: 0,
      scores: { adhd: 0, bipolar: 0, depression: 0, anxiety: 0, schizo: 0, ocd: 0, fine: 0 }
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
  beginRun(diagId, daily) {
    this.daily = !!daily;
    this.dailyKind = daily ? (daily.isDaily ? 'daily' : 'challenge') : null;
    this.seed = daily ? (daily.seed >>> 0) : null;
    this.dailyKey = daily ? daily.key : null;
    this._startWalrusKills = Meta.data.walrusKills || 0;   // for daily "beat the Walrus" flag
    // run modifiers: Chronic Mode (NG+), Boss Rush, and the 'Second Opinion' easy toggle
    this.chronic = !!this._startChronic; this._startChronic = false;
    this.bossRush = !!this._startBossRush; this._startBossRush = false;
    this.easy = !!(Meta.data.a11y && Meta.data.a11y.easy);
    this.wardPath = 'day';   // set by the Treatment Plan each descent
    this._cureBeaten = false;
    // daily streak (real daily only, counted once per day on first play)
    if (this.dailyKind === 'daily') {
      const ds = Meta.data.dailyStreak || (Meta.data.dailyStreak = { last: null, count: 0, best: 0 });
      if (ds.last !== daily.key) {
        ds.count = (ds.last === this.prevDayKey(daily.key)) ? (ds.count + 1) : 1;
        ds.last = daily.key;
        ds.best = Math.max(ds.best || 0, ds.count);
      }
    }
    Meta.data.runs++;
    if (!Meta.data.diagsPlayed) Meta.data.diagsPlayed = {};
    Meta.data.diagsPlayed[diagId] = 1;
    Meta.save();
    this.player = this.genSeed(['player'], () => new Player(diagId));
    this.applyCodexPerks(this.player);   // rewards earned by completing chart tabs
    this.pillAssign = this.genSeed(['pills'], () => U.shuffle(DATA.PILLS.map((_, i) => i)).slice(0, 10));
    this.pillKnown = new Set();
    this.depth = 1;
    this.lastBoss = null;
    this.stats = { kills: 0, rooms: 0, items: 0, bosses: 0, pills: 0 };
    this.runUnlocks = [];
    this.floorHits = 0;
    this._deathRecorded = false;
    this._runLogged = false;
    this._runCured = false;
    this._runStart = Date.now();
    this.larperToastShown = false;
    this.deathT = 0;
    this.newFloor();
    this.state = 'run';
    this.hideOverlay();
    SFX.setMusic('run');
    document.body.classList.add('inrun');
  },

  // Silent run-stats logger: one record per run (death / cure / quit) to localStorage.
  // Powers the Run History screen and accumulates real win-rate data over time.
  recordRun(out) {
    if (this._runLogged || !this.player) return;
    this._runLogged = true;
    const p = this.player;
    const mode = this.chronic ? 'chronic' : this.bossRush ? 'bossrush' : this.dailyKind === 'daily' ? 'daily' : this.dailyKind === 'challenge' ? 'challenge' : 'normal';
    const cured = !!this._runCured || out === 'cured';
    const walrus = (Meta.data.walrusKills || 0) > (this._startWalrusKills || 0);
    const cause = out === 'dead' ? (p._lastSrc || 'unknown') : out;
    const secs = Math.max(0, Math.round((Date.now() - (this._runStart || Date.now())) / 1000));
    const rec = { t: this.todayKey(), diag: p.diag, mode, ward: this.depth, out, cause, cured: cured ? 1 : 0, walrus: walrus ? 1 : 0, kills: this.stats.kills, bosses: this.stats.bosses, items: this.stats.items, pills: this.stats.pills, secs };
    const log = Meta.data.runlog || (Meta.data.runlog = []);
    log.push(rec);
    while (log.length > 200) log.shift();
    const A = Meta.data.runAgg || (Meta.data.runAgg = {});
    const a = A[p.diag] || (A[p.diag] = { runs: 0, dead: 0, quit: 0, cured: 0, walrus: 0, wardSum: 0, bestWard: 0 });
    a.runs++;
    if (out === 'quit') a.quit++; else if (out === 'dead') a.dead++;
    if (cured) a.cured++;
    if (walrus) a.walrus++;
    a.wardSum += this.depth;
    a.bestWard = Math.max(a.bestWard, this.depth);
    if (out === 'dead') { const C = Meta.data.causeAgg || (Meta.data.causeAgg = {}); C[cause] = (C[cause] || 0) + 1; }
    Meta.save();
  },

  newFloor() {
    if (this.maybeInterlude()) return;   // story beat first; it re-calls newFloor when done
    const gen = this.genSeed(['floor', this.depth], () => generateFloor(this.depth, this.lastBoss));
    this.grid = gen.grid;
    this.floorRooms = gen.rooms;
    this.bossId = gen.bossId;
    // Boss Rush: skip the fighting between rooms — empty every normal room so it's a straight shot to the boss
    if (this.bossRush) this.floorRooms.forEach(r => { if (r.type === 'normal') { r.spawned = true; r.cleared = true; } r.discovered = true; });
    this.lastBoss = gen.bossId === 'walrus' ? this.lastBoss : gen.bossId;
    this.secretFound = false;
    this.boss = null;
    this.trapdoor = null;
    this.tearsAura = false;
    this.darkTarget = 0;
    this.enemySlow = 0;
    this.floorHits = 0;
    // endless difficulty: roll this floor's ward complications
    this.complications = this.genSeed(['comp', this.depth], () => DATA.rollComplications(this.depth));
    this.floorMods = {};
    for (const c of this.complications) Object.assign(this.floorMods, c.mods);
    this.floorDark = this.floorMods.dark || 0;
    // ward side-effect (satirical "curse") — a whole-floor modifier rolled at deeper wards
    this.sideEffect = (this.depth >= 3)
      ? this.genSeed(['sideeffect', this.depth], () => U.chance(0.35) ? U.choice(DATA.SIDE_EFFECTS).id : null)
      : null;
    const p = this.player;
    p.pillsThisFloor = 0;
    if (p.diag === 'depression') p.blanket = true;
    if (p._gymAdd) { p.dmg -= p._gymAdd; }
    p._gymAdd = 0;
    if (p.flags.pillowHeal) p.heal(2);
    if (p.flags.floorPill && p.pill == null) { p.pill = U.randi(0, 9); }   // Executive Dysfunction: a free pill each floor
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
    // announce ward complications + side-effect
    if (this.complications.length || this.sideEffect) setTimeout(() => {
      if (this.state !== 'run') return;
      SFX.play('error');
      for (const c of this.complications) this.toast('⚠ ' + c.name + ' — ' + c.desc, '#e0955a');
      if (this.sideEffect) { const se = DATA.SIDE_EFFECTS.find(s => s.id === this.sideEffect); if (se) this.toast(se.icon + ' SIDE EFFECT: ' + se.name + ' — ' + se.desc, '#b58ad0'); }
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
    this.genSeed(['room', this.depth, room.gx, room.gy], () => {
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
        if (this.wardPath === 'inpatient') {   // tougher ward, richer loot
          room.pickups.push(new Pickup('full', CW / 2 - 60, RY + RH / 2 + 64));
          room.pickups.push(new Pickup('nickel', CW / 2 + 60, RY + RH / 2 + 64));
        }
        break;
      }
      case 'shop': {
        room.cleared = true;
        const copayMul = 1 + (this.depth - 1) * 0.07;   // copays climb with the ward (it's the healthcare system, baby)
        const disc = p.flags.discount ? 0.5 : (this.wardPath === 'outpatient' ? 0.75 : 1);
        const px = (n) => Math.max(1, Math.ceil(n * disc * copayMul));
        const yc = RY + RH / 2 + 30, yi = RY + RH / 2 - 80;
        room.stock = [
          { type: 'half', price: px(3), x: RX + 90, y: yc, taken: false },
          { type: 'pill', price: px(4), x: RX + 230, y: yc, colorIdx: U.randi(0, 9), taken: false },
          { type: 'bomb', price: px(5), x: RX + 370, y: yc, taken: false },
          { type: 'coupon', price: px(4), x: RX + 510, y: yc, taken: false },
          { type: 'key', price: px(5), x: RX + 650, y: yc, taken: false }
        ];
        // Generic vs Brand: two different meds — Brand (full price, clean) and Generic (cheaper, minor side-effect)
        const pool = U.shuffle(DATA.pickPool('shop', p.items));
        const src = pool.length ? pool : U.shuffle(DATA.POOLS.shop.slice());
        room.peds.push({ x: RX + 500, y: yi, itemId: src[0], kind: 'shop', price: px(12), taken: false, variant: 'brand' });
        room.peds.push({ x: RX + 300, y: yi, itemId: src[1] || src[0], kind: 'shop', price: px(7), taken: false, variant: 'generic' });
        room.peds.push({ x: RX + 110, y: yi, kind: 'restock', price: px(6), taken: false });
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
      case 'event': {
        room.cleared = true;
        const ev = U.randi(0, DATA.EVENTS.length - 1);
        room.peds.push({ x: CW / 2, y: RY + RH / 2, kind: 'event', eventId: ev, taken: false });
        break;
      }
    }
    });
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
    // Rumination side-effect: the thought comes back once before the room truly clears
    if (this.sideEffect === 'rumination' && room.spawned && !room._ruminated) {
      room._ruminated = true;
      const n = this.depth >= 5 ? 3 : 2;
      this.genSeed(['ruminate', this.depth, room.gx, room.gy], () => {
        for (let i = 0; i < n; i++) {
          const a = U.rand(0, TAU);
          const ex = U.clamp(CW / 2 + Math.cos(a) * 100, RX + 40, RX + RW - 40);
          const ey = U.clamp(RY + RH / 2 + Math.sin(a) * 100, RY + 40, RY + RH - 40);
          const e = new Enemy(DATA.pickEnemy(this.depth), ex, ey, this.depth, false, 0.7);
          this.enemies.push(e);
        }
      });
      this.toast('…but you keep coming back to it.', '#b58ad0');
      SFX.play('voice');
      return;   // room not cleared yet — deal with it again
    }
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
    // THE CURE (Ward 25): the (non-)finale — mark cured, unlock Chronic Mode
    if (this.bossId === 'thecure') {
      this._cureBeaten = true;
      this._runCured = true;   // run log: this run reached the ending
      if (!Meta.data.cured) { Meta.data.cured = 1; Meta.data.chronicUnlocked = 1; }
      if (this.chronic) Meta.data.chronicBest = Math.max(Meta.data.chronicBest || 0, this.depth);
    }
    // THE FOUNDER (Ward 50): the real superboss — prestige
    if (this.bossId === 'founder') {
      this._founderBeaten = true;
      this._runFounder = true;
      Meta.data.founderKills = (Meta.data.founderKills || 0) + 1;
    }
    Meta.save();
    this.checkUnlocks();
    // rewards (seeded per ward so a daily's boss loot & OON door match for everyone)
    this.genSeed(['reward', this.depth], () => {
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
    });
    SFX.setMusic('run');
    const storyOn = !Meta.data.storyOff && typeof Story !== 'undefined';
    if (this._cureBeaten) { this._cureBeaten = false; setTimeout(() => { if (this.state === 'run') { if (storyOn) Story.play('cure', () => this.showEnding()); else this.showEnding(); } }, 900); }
    if (this._founderBeaten) { this._founderBeaten = false; setTimeout(() => { if (this.state === 'run') { if (storyOn) Story.play('founder', () => this.showFounderEnding()); else this.showFounderEnding(); } }, 900); }
  },

  /* ---------- explosions / paperwork ---------- */
  explode(x, y, rad, dmg) {
    SFX.play('boom');
    Haptics.buzz([30, 30, 60], 0);
    this.shake = Math.max(this.shake, 12);
    for (let i = 0; i < 26; i++) this.parts.push(new Particle(x, y, U.rand(-240, 240), U.rand(-240, 240), U.rand(0.3, 0.7), U.choice(['#e0a03a', '#e06a3a', '#8a8078', '#f0e8d0']), U.rand(3, 6)));
    const p = this.player;
    if (U.dist(x, y, p.x, p.y) < rad - 15) p.hurt(2, this, 'explosion');
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
    Meta.see('pills', pillIdx);   // codex
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

  /* ---------- comorbidity choice on descent ---------- */
  doDescend() {
    this.state = 'descend';
    this.descendT = 0;
    this._descended = false;
    SFX.play('descend');
  },
  offerComorbidity() {   // the Treatment Plan: choose your next ward (each bundles a comorbidity)
    if (!DATA.COMORBIDITIES || !DATA.COMORBIDITIES.length) { this.doDescend(); return; }
    // seeded so a daily's options match for everyone — the pick is still yours
    const picks = this.genSeed(['ward', this.depth], () => {
      const cos = U.shuffle(DATA.COMORBIDITIES).slice(0, 3);
      return ['inpatient', 'outpatient', 'day'].map((pk, i) => ({ path: pk, co: cos[i] }));
    });
    this.state = 'comorbid';
    SFX.play('voice');
    const cards = picks.map((it, i) => {
      const w = DATA.WARD_PATHS[it.path];
      return `<button class="cmcard wardcard" data-i="${i}">
        <div class="wardname">${w.name}</div>
        <div class="cmdesc">${w.desc}</div>
        <div class="cmtag">🧬 ${it.co.name} — ${it.co.desc}</div>
      </button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">TREATMENT PLAN</h1>
        <div class="tagline">choose your next ward — each comes with a comorbidity</div>
        <div class="cmgrid">${cards}</div>
        <button class="btn minor" id="bComorbidSkip">walk it off (no ward bonus, no comorbidity)</button>
      </div>`);
    document.querySelectorAll('.wardcard').forEach(b => b.onclick = () => {
      const it = picks[+b.dataset.i];
      SFX.play('item');
      this.wardPath = it.path;
      try { it.co.apply(this.player, this); } catch (e) { }
      (this.player.comorbidities || (this.player.comorbidities = [])).push(it.co.id);
      this.checkComorbidSynergy();
      this.toast('→ ' + DATA.WARD_PATHS[it.path].name + ' · ' + it.co.name, '#b8e0a0');
      this.hideOverlay();
      this.doDescend();
    });
    document.getElementById('bComorbidSkip').onclick = () => { SFX.play('ui'); this.wardPath = 'day'; this.hideOverlay(); this.doDescend(); };
  },

  /* ---------- mini-event choice room ---------- */
  showEvent(ev, ped) {
    this.state = 'event';
    SFX.play('voice');
    const cards = ev.choices.map((c, i) => `<button class="cmcard" data-i="${i}"><div class="cmname">${c.label}</div><div class="cmdesc">${c.note}</div></button>`).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">${ev.name}</h1>
        <div class="tagline">${ev.prompt}</div>
        <div class="cmgrid">${cards}</div>
      </div>`);
    document.querySelectorAll('.cmcard').forEach(b => b.onclick = () => {
      const c = ev.choices[+b.dataset.i];
      SFX.play('ui');
      try { c.apply(this.player, this); } catch (e) { }
      ped.taken = true;
      this.hideOverlay();
      this.state = 'run';
      this.toast('“' + c.label + '”', '#b8e0a0');
    });
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
    const bossDark = this.boss && !this.boss.dead && (this.boss.id === 'stigma' || this.boss.id === 'dsm');
    if (!bossDark) {
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
    if (Input.take('ability')) p.useAbility(this);
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
        if (U.dist(s.x, s.y, p.x, p.y) < s.r) p.hurt(1, this, 'adjuster');
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
      if (ped.kind === 'event') {
        this.showEvent(DATA.EVENTS[ped.eventId], ped);
        return;   // pause the loop; modal is up
      } else if (ped.kind === 'oon') {
        if (p.maxhp >= 4) {
          p.maxhp -= 2; p.hp = Math.min(p.hp, p.maxhp);
          ped.taken = true;
          p.addItem(ped.itemId, this);
          this.stats.items++;
          this.toast('Paid out of pocket. Literally.', '#e08a8a');
        } else if (this.lockCd <= 0) { this.lockCd = 1.4; this.toast(DATA.TOASTS.oonPoor, '#e08a8a'); SFX.play('error'); }
      } else if (ped.kind === 'restock') { // Pharmacy: pay to reroll the Brand/Generic shelf
        if (p.coins >= ped.price) {
          p.coins -= ped.price;
          ped.taken = true;
          const pool = U.shuffle(DATA.pickPool('shop', p.items));
          const src = pool.length ? pool : U.shuffle(DATA.POOLS.shop.slice());
          let i = 0;
          for (const o of this.peds) if (o.kind === 'shop' && o.variant) { o.itemId = src[i % src.length] || o.itemId; o.taken = false; i++; }
          SFX.play('coin'); this.toast('Shelves restocked.', '#9db85a');
        } else if (this.lockCd <= 0) { this.lockCd = 1.4; this.texts.push(new FloatText(ped.x, ped.y - 40, 'need ' + ped.price + '¢', '#e8c84c')); SFX.play('error'); }
      } else if (ped.price) { // shop item (Brand or Generic), GoodRx coupon halves it
        const useCoupon = (p.coupons || 0) > 0;
        const price = useCoupon ? Math.max(1, Math.ceil(ped.price * 0.5)) : ped.price;
        if (p.coins >= price) {
          p.coins -= price;
          ped.taken = true;
          if (useCoupon) { p.coupons--; this.toast('🎟 GoodRx: 50% off!', '#9db85a'); }
          p.addItem(ped.itemId, this);
          this.stats.items++;
          if (ped.variant === 'generic') {   // generics come with a little something extra
            const se = U.choice([
              () => { p.wobble += 0.05; return 'shaky hands'; },
              () => { p.tearDelay *= 1.05; return 'dry mouth'; },
              () => { p.spd *= 0.97; return 'drowsiness'; }
            ])();
            this.toast('Generic side effect: ' + se, '#e0a05a');
          }
          SFX.play('coin');
        } else if (this.lockCd <= 0) { this.lockCd = 1.4; this.texts.push(new FloatText(ped.x, ped.y - 40, 'need ' + price + '¢', '#e8c84c')); SFX.play('error'); }
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
      if (s.type === 'coupon' && (p.coupons || 0) >= 3) continue;
      p.coins -= s.price;
      s.taken = true;
      SFX.play('coin');
      if (s.type === 'half') p.heal(1);
      if (s.type === 'pill') p.pill = s.colorIdx;
      if (s.type === 'bomb') p.bombs++;
      if (s.type === 'key') p.keys++;
      if (s.type === 'coupon') { p.coupons = (p.coupons || 0) + 1; this.toast('🎟 GoodRx coupon — 50% off your next med', '#9db85a'); }
    }

    // trapdoor
    if (this.trapdoor && U.dist(this.trapdoor.x, this.trapdoor.y, p.x, p.y) < 26) {
      if (this.floorHits === 0 && !Meta.data.everNoHitFloor) { Meta.data.everNoHitFloor = 1; this.checkUnlocks(); }
      this.offerComorbidity();
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
    document.getElementById('bQuit').onclick = () => { SFX.play('ui'); this.recordRun('quit'); this.showTitle(); };
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
      // daily ward: keep the deepest result for today (real daily only, not challenges)
      if (this.dailyKind === 'daily' && this.dailyKey) {
        const prev = (Meta.data.daily && Meta.data.daily.key === this.dailyKey) ? Meta.data.daily : null;
        const best = Math.max(prev ? prev.best : 0, this.depth);
        const win = !!(prev && prev.win) || (Meta.data.walrusKills > (this._startWalrusKills || 0));
        const stats = { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills, rooms: this.stats.rooms };
        Meta.data.daily = { key: this.dailyKey, diag: diagId, best, win, stats };
        if (!Meta.data.dailyHistory) Meta.data.dailyHistory = {};
        Meta.data.dailyHistory[this.dailyKey] = { best, diag: diagId, win };
      }
      Meta.save();
      this.checkUnlocks(); // catch kills/ward/etc. milestones reached this run
      this.recordRun('dead');   // silent run-stats log (ward, cause of death, mode)
      this._deathQuip = U.choice(DATA.DEATH_LINES);
    }
    this.state = 'dead';
    const daily = this.daily, dkind = this.dailyKind, dseed = this.seed, dkey = this.dailyKey;
    const dcode = dseed != null ? this.seedCode(dseed) : '';
    const ribbon = dkind === 'daily' ? ('🗓️ DAILY WARD · ' + dkey) : dkind === 'challenge' ? ('🔗 CHALLENGE · ' + dcode) : '';
    const dailyWin = Meta.data.walrusKills > (this._startWalrusKills || 0);
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
          ${ribbon ? `<div class="sub" style="color:#e0a05a;font-weight:bold">${ribbon}</div>` : ''}
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
        ${dkind === 'daily'
          ? `<button class="btn" id="bRetryDaily">🗓️ RETRY TODAY'S DAILY</button>`
          : dkind === 'challenge'
            ? `<button class="btn" id="bRetryDaily">🔗 RETRY THIS SEED</button>`
            : `<button class="btn" id="bAgainSame">SAME DIAGNOSIS, RUN IT BACK</button>`}
        <button class="btn" id="bShare">📤 SHARE DIAGNOSIS CARD</button>
        <div class="btnrow">
          <button class="btn minor" id="bAgainNew">RE-DIAGNOSE</button>
          <button class="btn minor" id="bUnlocks">🏆 UNLOCKS</button>
          <button class="btn minor" id="bHist">📊 HISTORY</button>
        </div>
        <button class="btn minor" id="bTitle">TITLE</button>
      </div>`);
    this.paintWalrus('deadWalrus');
    if (daily) document.getElementById('bRetryDaily').onclick = () => { SFX.play('ui'); this.beginRun(diagId, { seed: dseed, key: dkey, isDaily: dkind === 'daily' }); };
    else document.getElementById('bAgainSame').onclick = () => { SFX.play('ui'); this.beginRun(diagId); };
    document.getElementById('bShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: diagId, depth: this.depth, daily, key: dkind === 'challenge' ? dcode : dkey, label: dkind === 'challenge' ? 'CHALLENGE' : 'DAILY WARD', win: dailyWin, stats: { kills: st.kills, bosses: st.bosses, pills: st.pills }, code: dcode }); };
    document.getElementById('bAgainNew').onclick = () => { SFX.play('ui'); this.startQuiz(); };
    document.getElementById('bUnlocks').onclick = () => { SFX.play('ui'); this.showUnlocks(() => this.showDead()); };
    document.getElementById('bHist').onclick = () => { SFX.play('ui'); this.showStats(() => this.showDead()); };
    document.getElementById('bTitle').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* ---------- the (non-)ending ---------- */
  showEnding() {
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('item');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:32px">YOU REACHED<br>THE CURE</h1>
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="endWalrus"></canvas>
          <div class="bubble">There is no cure. There never was. But you fought all the way to Ward 25 through a system with a label for every breath you take — and you're still standing. That's not nothing. That's the whole thing.</div>
        </div>
        <div class="rx" style="border-color:#c8a020">
          <div class="stamp" style="color:#c8a020;border-color:#c8a020">CURED*</div>
          <div class="sub">*allegedly. ${DATA.DIAG[this.player.diag].name} · Ward ${this.depth}${this.chronic ? ' · CHRONIC MODE' : ''}</div>
          <div class="mech">Everybody's got somethin. You've just got somethin AND a high score.</div>
        </div>
        ${Meta.data.chronicUnlocked ? `<div class="newunlocks"><div class="nutitle">🏆 CHRONIC MODE UNLOCKED</div><div class="nurow"><span>A harder New Game+ — find it on the title screen.</span></div></div>` : ''}
        <button class="btn" id="bEndKeep">▶ KEEP CLIMBING (endless)</button>
        <div class="btnrow">
          <button class="btn minor" id="bEndShare">📤 SHARE</button>
          <button class="btn minor" id="bEndTitle">TITLE</button>
        </div>
      </div>`);
    this.paintWalrus('endWalrus');
    document.getElementById('bEndKeep').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bEndShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: this.player.diag, depth: this.depth, daily: true, key: 'WARD 25', label: this.chronic ? 'CURED · CHRONIC' : 'CURED (ALLEGEDLY)', win: true, stats: { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills } }); };
    document.getElementById('bEndTitle').onclick = () => { SFX.play('ui'); this.recordRun('cured'); this.showTitle(); };
  },

  /* ---------- THE FOUNDER ending (Ward 50 superboss) ---------- */
  showFounderEnding() {
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('item');
    const fk = Meta.data.founderKills || 1;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:30px">YOU TOPPLED<br>THE FOUNDER</h1>
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="endWalrusF"></canvas>
          <div class="bubble">Fifty wards. You climbed the whole ladder and found the man at the top — the one who turned every feeling into a product line. He's done. The machine isn't… but for one shining moment the stock is crashing, and you did that.</div>
        </div>
        <div class="rx" style="border-color:#4a8a3a">
          <div class="stamp" style="color:#4a8a3a;border-color:#4a8a3a">DELISTED</div>
          <div class="sub">${DATA.DIAG[this.player.diag].name} · Ward ${this.depth}${this.chronic ? ' · CHRONIC' : ''}</div>
          <div class="mech">THE FOUNDER defeated ×${fk}. The rarest line on your chart.</div>
        </div>
        <button class="btn" id="bEndKeep">▶ KEEP CLIMBING (endless)</button>
        <div class="btnrow">
          <button class="btn minor" id="bEndShare">📤 SHARE</button>
          <button class="btn minor" id="bEndTitle">TITLE</button>
        </div>
      </div>`);
    this.paintWalrus('endWalrusF');
    document.getElementById('bEndKeep').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bEndShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: this.player.diag, depth: this.depth, daily: true, key: 'WARD 50', label: 'TOPPLED THE FOUNDER', win: true, stats: { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills } }); };
    document.getElementById('bEndTitle').onclick = () => { SFX.play('ui'); this.recordRun('cured'); this.showTitle(); };
  },

  /* ---------- patient chart (codex) ---------- */
  showCodex(returnTo) {
    this.state = 'codex';
    this._codexReturn = returnTo || (() => this.showTitle());
    if (!this._codexTab) this._codexTab = 'enemies';
    this._renderCodex();
  },
  _renderCodex() {
    const tab = this._codexTab;
    const seen = Meta.data.seen || { enemies: {}, bosses: {}, items: {}, pills: {} };
    const tabs = [['enemies', '🧟 Patients'], ['bosses', '☠ Bosses'], ['items', '℞ Meds'], ['pills', '💊 Pills']];
    let entries = [];
    if (tab === 'enemies') entries = Object.keys(DATA.ENEMIES).filter(id => id !== 'form').map(id => ({ id, name: DATA.ENEMIES[id].name, text: (DATA.CODEX_CHART.enemies[id] || ''), seen: !!(seen.enemies && seen.enemies[id]) }));
    else if (tab === 'bosses') entries = Object.keys(DATA.BOSSES).map(id => ({ id, name: DATA.BOSSES[id].name, text: (DATA.CODEX_CHART.bosses[id] || ''), seen: !!(seen.bosses && seen.bosses[id]) }));
    else if (tab === 'items') entries = Object.keys(DATA.ITEMS).map(id => ({ id, name: DATA.ITEMS[id].name, text: DATA.ITEMS[id].desc, seen: !!(seen.items && seen.items[id]) }));
    else entries = DATA.PILLS.map((p, idx) => ({ id: idx, name: p.name, text: p.msg, seen: !!(seen.pills && seen.pills[idx]) }));
    const total = entries.length, got = entries.filter(e => e.seen).length;
    const rows = entries.map(e => {
      if (!e.seen) return `<div class="ach locked"><div class="codexicon locked">?</div><div class="achbody"><div class="achname">???</div><div class="achdesc">not yet encountered</div></div></div>`;
      return `<div class="ach got"><canvas class="codexicon" width="48" height="48" data-kind="${tab}" data-id="${e.id}"></canvas><div class="achbody"><div class="achname">${e.name}</div><div class="achdesc">${e.text}</div></div></div>`;
    }).join('');
    const tabBtns = tabs.map(([k, label]) => `<button class="btn minor codextab${k === tab ? ' active' : ''}" data-tab="${k}">${label}</button>`).join('');
    const rewardText = { enemies: "Clinician's Eye (always see enemy health)", bosses: 'Boss Rush mode', pills: 'pills always pre-identified' };
    const done = this.codexTabComplete(tab);
    const perkLine = rewardText[tab]
      ? `<div class="stats-line" style="color:${done ? '#2c8a3a' : '#8a7a68'}">${done ? '✓ unlocked: ' : 'complete this tab → '}${rewardText[tab]}</div>` : '';
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">PATIENT CHART</h1>
        <div class="tagline">${got} / ${total} ${tab === 'items' ? 'meds' : tab} documented</div>
        ${perkLine}
        <div class="codextabs">${tabBtns}</div>
        <div class="achlist">${rows}</div>
        <button class="btn" id="bCodexBack">BACK</button>
      </div>`);
    document.querySelectorAll('canvas.codexicon').forEach(c => {
      const kind = c.dataset.kind;
      Render.drawCodexIcon(c.getContext('2d'), kind, kind === 'pills' ? parseInt(c.dataset.id, 10) : c.dataset.id, 48);
    });
    document.querySelectorAll('.codextab').forEach(b => b.onclick = () => { SFX.play('ui'); this._codexTab = b.dataset.tab; this._renderCodex(); });
    document.getElementById('bCodexBack').onclick = () => { SFX.play('ui'); this._codexReturn(); };
  },

  /* ---------- CHART NOTES story gallery (re-watch unlocked cutscenes) ---------- */
  showStoryGallery(returnTo) {
    this.state = 'storygallery';
    const seen = Meta.data.seenStory || {};
    const chapters = (typeof STORY_CHAPTERS !== 'undefined') ? STORY_CHAPTERS : [];
    const rows = chapters.map(ch => {
      const got = !!seen[ch.id];
      return `<div class="ach ${got ? 'got' : 'locked'}" ${got ? `data-s="${ch.id}" style="cursor:pointer"` : ''}>
        <div class="achicon">${got ? '📖' : '🔒'}</div>
        <div class="achbody">
          <div class="achname">${got ? ch.title : '??? — not yet reached'}</div>
          <div class="achdesc">${got ? 'tap to re-read this chapter' : 'unfolds as you descend'}</div>
        </div>
      </div>`;
    }).join('');
    const done = chapters.filter(c => seen[c.id]).length;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">CHART NOTES</h1>
        <div class="tagline">${done} / ${chapters.length} chapters · the story under the satire</div>
        <div class="achlist">${rows}</div>
        <button class="btn" id="bStoryBack">BACK</button>
      </div>`);
    document.querySelectorAll('.ach[data-s]:not(.locked)').forEach(b => b.onclick = () => { SFX.play('ui'); Story.play(b.dataset.s, () => this.showStoryGallery(returnTo)); });
    document.getElementById('bStoryBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- BESTIARY: a rogues' gallery of live-animated boss portraits ---------- */
  showBestiary(returnTo) {
    this.state = 'bestiary';
    const seen = (Meta.data.seen && Meta.data.seen.bosses) || {};
    const order = ['gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'withdrawal', 'burnout', 'walrus', 'thecure', 'founder'];
    const got = order.filter(id => seen[id]).length;
    const cards = order.map(id => {
      const B = DATA.BOSSES[id];
      const note = (DATA.CODEX_CHART.bosses && DATA.CODEX_CHART.bosses[id]) || '';
      const s = !!seen[id];
      return `<div class="bcard ${s ? 'got' : 'locked'}">
        <div class="bframe">${s ? `<canvas class="bportrait" width="150" height="132" data-b="${id}"></canvas>` : '<div class="bqm">?</div>'}</div>
        <div class="bname">${s ? B.name : '? ? ?'}</div>
        <div class="bsub">${s ? B.sub : 'not yet encountered'}</div>
        ${s ? `<div class="bnote">${note}</div>` : ''}
      </div>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">BESTIARY</h1>
        <div class="tagline">${got} / ${order.length} adversaries catalogued · the management, itemized</div>
        <div class="bgrid">${cards}</div>
        <button class="btn" id="bBestBack">BACK</button>
      </div>`);
    // construct each SEEN boss once (unseen ones are never constructed, so they stay hidden) and animate live
    this._bestiary = [];
    const bstub = { player: { flags: {} }, chronic: false, easy: false };
    document.querySelectorAll('canvas.bportrait').forEach(c => {
      try {
        const b = new Boss(c.dataset.b, 1, bstub);
        b.x = 0; b.y = 0; b.page = 0; b.vulnerable = (c.dataset.b !== 'priorauth');
        if (c.dataset.b === 'founder') b.hp = b.maxhp * 0.3;   // phase-3 pose (both fists of cash)
        this._bestiary.push({ boss: b, ctx: c.getContext('2d'), w: 150, h: 132 });
      } catch (e) { }
    });
    this._bestClock = 0;
    document.getElementById('bBestBack').onclick = () => { SFX.play('ui'); this._bestiary = null; (returnTo || (() => this.showTitle()))(); };
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

  /* ---------- run history / real win-rate data ---------- */
  _causeName(c) {
    const map = { spikes: 'Spike pit', ember: 'Burnout embers', explosion: 'an explosion', adjuster: "The Adjuster's stamp", bullet: 'a stray bullet', 'ocd-intrusive': 'intrusive thoughts', unknown: 'unknown causes', quit: 'walked away', cured: 'reached the Cure' };
    if (map[c]) return map[c];
    if (DATA.ENEMIES[c]) return DATA.ENEMIES[c].name;
    if (DATA.BOSSES[c]) return DATA.BOSSES[c].name;
    return c;
  },
  showStats(returnTo) {
    this.state = 'stats';
    const A = Meta.data.runAgg || {}, C = Meta.data.causeAgg || {}, log = Meta.data.runlog || [];
    let tRuns = 0, tCured = 0, tWalrus = 0, tWardSum = 0, tBest = 0;
    for (const k in A) { const a = A[k]; tRuns += a.runs; tCured += a.cured; tWalrus += a.walrus; tWardSum += a.wardSum; tBest = Math.max(tBest, a.bestWard); }
    const pct = (n, d) => d > 0 ? Math.round(n / d * 100) + '%' : '—';
    const row = (l, v) => `<div class="sumrow"><span>${l}</span><b>${v}</b></div>`;
    let body;
    if (tRuns === 0) {
      body = `<div class="stats-line" style="margin:18px 4px">No runs logged yet — your ward-by-ward history, causes of death, and per-diagnosis win-rates will build up here as you and your friends play. (Runs from before this update aren't counted.)</div>`;
    } else {
      const overall = `<div class="summary">
        ${row('Runs logged', tRuns)}
        ${row('Avg ward reached', (tWardSum / tRuns).toFixed(1))}
        ${row('Deepest ward', tBest)}
        ${row('Beat Dr. Walrus', tWalrus + ' (' + pct(tWalrus, tRuns) + ')')}
        ${row('Reached THE CURE', tCured + ' (' + pct(tCured, tRuns) + ')')}
        ${Meta.data.founderKills ? row('👑 Toppled THE FOUNDER', Meta.data.founderKills) : ''}
      </div>`;
      const diagRows = Object.keys(DATA.DIAG).map(id => {
        const a = A[id]; if (!a || !a.runs) return '';
        return row(DATA.DIAG[id].name, `${a.runs}× · avg ${(a.wardSum / a.runs).toFixed(1)} · best ${a.bestWard} · ${pct(a.cured, a.runs)} cure`);
      }).join('');
      const causeKeys = Object.keys(C).sort((x, y) => C[y] - C[x]).slice(0, 6);
      const causeRows = causeKeys.length
        ? causeKeys.map(c => row(this._causeName(c), C[c])).join('')
        : `<div class="stats-line">no deaths logged (nice)</div>`;
      const recent = log.slice(-8).reverse().map(r => {
        const tag = (r.out === 'cured' || r.cured) ? '✓ cured' : r.out === 'quit' ? 'left' : '☠ ' + this._causeName(r.cause);
        const mode = (r.mode && r.mode !== 'normal') ? ` <i style="color:#8a7a68">[${r.mode}]</i>` : '';
        return row(`${DATA.DIAG[r.diag] ? DATA.DIAG[r.diag].name : r.diag}${mode}`, `ward ${r.ward} · ${tag}`);
      }).join('');
      const head = t => `<div class="stats-line" style="font-weight:bold;letter-spacing:1px;color:#2c2333;margin:14px 4px 2px">${t}</div>`;
      body = `${overall}
        ${head('BY DIAGNOSIS')}<div class="summary">${diagRows}</div>
        ${head('TOP CAUSES OF DEATH')}<div class="summary">${causeRows}</div>
        ${head('RECENT RUNS')}<div class="summary">${recent}</div>`;
    }
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">RUN HISTORY</h1>
        <div class="tagline">real playthrough data — stored on this device only</div>
        <div class="achlist" style="gap:0">${body}</div>
        <button class="btn" id="bStatsBack">BACK</button>
      </div>`);
    document.getElementById('bStatsBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- overlay plumbing ---------- */
  overlay(html) {
    this._bestiary = null;   // stop animating any bestiary portraits from a prior screen
    const o = document.getElementById('overlay');
    o.innerHTML = html;
    o.classList.remove('lightbg');   // screens default to the dark scrim; the title opts into the lighter one
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
    if (G.state === 'cutscene' && typeof Story !== 'undefined' && Story.active) {
      try { Story.update(dt); Story.draw(); } catch (e) { Story.active = false; if (G.showTitle) G.showTitle(); }
    } else {
      if (G.state === 'run' || G.state === 'descend') G.update(dt);
      Render.draw(G);
    }
    if (G.state === 'bestiary' && G._bestiary) {
      G._bestClock += dt;
      for (const e of G._bestiary) Render.drawBossCard(e.ctx, e.boss, e.w, e.h, G._bestClock);
    }
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
    depth: () => G.depth,
    story: (id) => { SFX.muted = true; if (!G.player) G.beginRun('adhd'); Story.play(id || 'prologue', () => G.showTitle()); },
    bestiary: (all) => { SFX.muted = true; if (all !== false) { if (!Meta.data.seen) Meta.data.seen = {}; if (!Meta.data.seen.bosses) Meta.data.seen.bosses = {}; for (const id in DATA.BOSSES) Meta.data.seen.bosses[id] = 1; } G.showBestiary(() => G.showTitle()); },
    storyList: () => Object.keys(STORY),
    storyTick: (n) => { for (let i = 0; i < (n || 40); i++) if (G.state === 'cutscene') Story.update(0.05); if (G.state === 'cutscene') Story.draw(); return G.state === 'cutscene' ? { idx: Story.idx, typed: Math.floor(Story.typed), of: Story.fullText.length } : { done: true }; },
    storyPress: () => { if (G.state === 'cutscene') Story.press(); return G.state; },
    storyGoto: (i) => { if (G.state === 'cutscene') { Story.idx = i; Story._loadPanel(); for (let k = 0; k < 60; k++) Story.update(0.05); Story.draw(); } }
  };

  G.showTitle();
  requestAnimationFrame(frame);
})();
