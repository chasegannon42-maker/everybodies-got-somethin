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
        SFX.play('fanfare'); if (typeof Haptics !== 'undefined') Haptics.buzz([30, 40, 60], 0);
      }
    }
  },

  /* ---------- daily ward (a date-seeded run everyone shares) ---------- */
  DAILY_DIAGS: ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia'],
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
  /* ISO week key for the Quarterly Review (Mon-anchored) */
  weekKey() {
    const d = new Date();
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    const fday = (firstThu.getUTCDay() + 6) % 7;
    firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
    const wk = 1 + Math.round((t - firstThu) / (7 * 86400000));
    return t.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
  },
  quarterlyInfo() {
    const key = this.weekKey();
    const seed = hashSeed(7770707, [key]);
    const diag = this.DAILY_DIAGS[seed % this.DAILY_DIAGS.length];
    return { key, seed, diag };
  },
  _quarterly() {   // current-week record (reset when the week rolls)
    let Q = Meta.data.quarterly;
    const key = this.weekKey();
    if (!Q || Q.key !== key) { Q = Meta.data.quarterly = { key, bills: [] }; Meta.save(); }
    return Q;
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
        ${(() => {
          const Q = this._quarterly(), qi = this.quarterlyInfo();
          const fmt = n => '$' + n.toLocaleString('en-US');
          const total = Q.bills.reduce((a, b) => a + b, 0);
          const slots = [0, 1, 2].map(i => Q.bills[i] != null ? fmt(Q.bills[i]) : '—').join(' · ');
          const best = Meta.data.quarterlyBest || 0;
          return `<div class="rx" style="border-color:#8a6ad0;margin-top:8px">
            <div class="stamp" style="color:#8a6ad0;border-color:#8a6ad0">QUARTERLY REVIEW</div>
            <div class="sub">${qi.key} · one shared seed · your three bills stack</div>
            <div class="mech">Runs: ${slots}<br>This week's total: <b>${fmt(total)}</b>${best ? ' · personal best: ' + fmt(best) : ''}</div>
            ${Q.bills.length < 3 ? `<button class="btn minor" id="bQuarterly" style="margin-top:6px">🧾 FILE RUN ${Q.bills.length + 1} OF 3</button>` : `<div class="stats-line">review closed — new week, new audit</div>`}
          </div>`;
        })()}
        <button class="btn" id="bDailyPlay">▶ PLAY TODAY'S WARD</button>
        <div class="btnrow">
          ${rec ? `<button class="btn minor" id="bDailyShare">📤 SHARE</button>` : ''}
          <button class="btn minor" id="bDailyChallenge">🔗 CHALLENGE</button>
          <button class="btn minor" id="bDailyCp">📦 CARE PKG</button>
        </div>
        <button class="btn minor" id="bDailyBack">BACK</button>
        <div class="smallprint">Seed resets at local midnight. Replays allowed — only your best counts.</div>
      </div>`);
    const pc = document.getElementById('dailyPortrait');
    if (pc) Render.drawCharPortrait(pc.getContext('2d'), info.diag);
    document.getElementById('bDailyPlay').onclick = () => { SFX.init(); SFX.play('ui'); this.beginRun(info.diag, { seed: info.seed, key: info.key, isDaily: true }); };
    const bq = document.getElementById('bQuarterly');
    if (bq) bq.onclick = () => { SFX.init(); SFX.play('ui'); const qi = this.quarterlyInfo(); this.beginRun(qi.diag, { seed: qi.seed, key: qi.key, isQuarterly: true }); };
    const sh = document.getElementById('bDailyShare');
    if (sh) sh.onclick = () => { SFX.play('ui'); Render.shareCard({ diag: info.diag, depth: rec.best, daily: true, key: info.key, win: rec.win, stats: rec.stats, code: this.seedCode(info.seed) }); };
    document.getElementById('bDailyChallenge').onclick = () => { SFX.play('ui'); this.showChallenge(() => this.showDaily()); };
    document.getElementById('bDailyCp').onclick = () => { SFX.play('ui'); this.showCarePackage(() => this.showDaily()); };
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

  /* ---------- CARE PACKAGES (gift an item + a note; no servers, just a code) ---------- */
  makeGiftCode(itemId, note) {
    try { return 'EGSCP' + btoa(unescape(encodeURIComponent(JSON.stringify({ i: itemId, n: String(note || '').slice(0, 40) })))).replace(/=+$/, ''); } catch (e) { return null; }
  },
  parseGiftCode(str) {
    try {
      const s = String(str || '').trim();
      if (!s.startsWith('EGSCP')) return null;
      const o = JSON.parse(decodeURIComponent(escape(atob(s.slice(5)))));
      if (!o || !DATA.ITEMS[o.i]) return null;
      return { i: o.i, n: String(o.n || '').slice(0, 40) };
    } catch (e) { return null; }
  },
  showCarePackage(returnTo) {
    this.state = 'carepkg';
    const seen = Object.keys((Meta.data.seen && Meta.data.seen.items) || {}).filter(id => DATA.ITEMS[id]);
    const opts = seen.map(id => `<option value="${id}">${DATA.ITEMS[id].name}</option>`).join('');
    const pending = Meta.data.pendingGift;
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">📦 CARE PACKAGES</h1>
        <div class="tagline">gift a friend one item you've seen + a note. dr. walrus reads all mail. for safety.</div>
        ${seen.length ? `
        <div class="setrow"><label>Send an item:</label>
          <select id="cpItem" class="seedfield">${opts}</select></div>
        <div class="setrow"><label>Your note (40):</label>
          <input type="text" id="cpNote" class="seedfield" maxlength="40" placeholder="get well never" autocomplete="off"></div>
        <button class="btn" id="bCpMake">✉ MAKE THE CODE</button>
        <div class="smallprint" id="cpMsg">the code carries the item + your note. paste it anywhere.</div>` : `<div class="tagline">see some items first — you can't gift what you haven't met.</div>`}
        <div class="setrow" style="margin-top:14px"><label>Got a package?</label>
          <input type="text" id="cpIn" class="seedfield" placeholder="EGSCP…" autocomplete="off" spellcheck="false"></div>
        <button class="btn" id="bCpRedeem">🎁 REDEEM</button>
        ${pending ? `<div class="tagline" style="color:#8fd08a">waiting for you next run: <b>${DATA.ITEMS[pending.i].name}</b> — “${pending.n}”</div>` : ''}
        <button class="btn minor" id="bCpBack">BACK</button>
      </div>`);
    const bm = document.getElementById('bCpMake');
    if (bm) bm.onclick = () => {
      SFX.play('ui');
      const code = this.makeGiftCode(document.getElementById('cpItem').value, document.getElementById('cpNote').value);
      const msg = document.getElementById('cpMsg');
      if (!code) { msg.textContent = 'that didn\'t wrap right — try again.'; return; }
      const txt = 'A care package from the ward: ' + code + '  →  https://chasegannon42-maker.github.io/everybodies-got-somethin/';
      const done = () => { msg.textContent = '✓ copied — send it to someone who needs ' + DATA.ITEMS[document.getElementById('cpItem').value].name + '.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => { msg.textContent = 'copy this: ' + code; });
      else msg.textContent = 'copy this: ' + code;
    };
    document.getElementById('bCpRedeem').onclick = () => {
      const g = this.parseGiftCode(document.getElementById('cpIn').value);
      if (!g) { SFX.play('error'); this.toast('That package is empty. Or cursed. Either way: no.', '#e08a8a'); return; }
      Meta.data.pendingGift = g;
      Meta.save();
      SFX.play('fanfare');
      this.toast('📦 Signed for. It arrives at your next run.', '#8fd08a');
      this.showCarePackage(returnTo);
    };
    document.getElementById('bCpBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showDaily()))(); };
  },

  /* ---------- flow: title / quiz / card ---------- */
  showTitle() {
    this.state = 'title';
    SFX.setMusic('menu');
    document.body.classList.remove('inrun');
    const m = Meta.data;
    this._startChronic = false; this._startBossRush = false; this._startPrognosis = null;
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
        ${(() => { const S = this.loadCheckpoint(); if (!S || !DATA.DIAG[S.diag]) return ''; const nm = S.variant && DATA.DIAG2 && DATA.DIAG2[S.diag] ? DATA.DIAG2[S.diag].name : DATA.DIAG[S.diag].name; return `<button class="btn" id="bContinue" style="border-color:#8fd0e0">📂 CONTINUE — ${nm} · WARD ${S.depth}</button>`; })()}
        <button class="btn" id="bStart">🩺 START CHECKUP</button>
        <button class="btn minor" id="bHub">🚪 THE WAITING ROOM (walk around)</button>
        <button class="btn" id="bDaily">🗓️ DAILY WARD</button>
        <button class="btn minor" id="bFiles">📁 PATIENT FILES (choose your diagnosis)</button>
        <div class="btnrow">
          <button class="btn minor" id="bPrognosis">🎲 PROGNOSIS</button>
          <button class="btn minor" id="bProtocols">🧪 PROTOCOLS</button>
          ${(Meta.data.runs || 0) >= 1 ? '<button class="btn minor" id="bOvertime">⏰ OVERTIME</button>' : ''}
        </div>
        <button class="btn minor" id="bTreatment">🧠 TREATMENT PLAN (skill tree) · ◆ ${Meta.data.insight || 0}</button>
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
    const bCont = document.getElementById('bContinue');
    if (bCont) bCont.onclick = () => { SFX.init(); SFX.play('ui'); const S = this.loadCheckpoint(); if (S) this.resumeRun(S); else this.showTitle(); };
    document.getElementById('bStart').onclick = () => { SFX.init(); SFX.play('ui'); this.startCheckup(); };
    const bh = document.getElementById('bHub'); if (bh) bh.onclick = () => { SFX.init(); SFX.play('ui'); this.showHub(); };
    const bot2 = document.getElementById('bOvertime'); if (bot2) bot2.onclick = () => { SFX.init(); SFX.play('ui'); this.showOvertime(); };
    document.getElementById('bDaily').onclick = () => { SFX.init(); SFX.play('ui'); this.showDaily(); };
    document.getElementById('bFiles').onclick = () => { SFX.init(); SFX.play('ui'); this.showFiles(); };
    document.getElementById('bPrognosis').onclick = () => { SFX.init(); SFX.play('ui'); this.showPrognosis(); };
    document.getElementById('bProtocols').onclick = () => { SFX.init(); SFX.play('ui'); this.showProtocols(); };
    document.getElementById('bTreatment').onclick = () => { SFX.init(); SFX.play('ui'); this.showTreatmentPlan(() => this.showTitle()); };
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
    this.state = 'settings';   // (also stops the hub from walking behind this overlay)
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
        <button class="btn minor" id="bA11yAim">${ct(a.aimAssist !== false, 'Aim assist (stick/touch)')}</button>
        <button class="btn minor" id="bA11yDmg">${ct(!!a.dmgNums, 'Damage numbers')}</button>
        <button class="btn minor" id="bStoryToggle">${ct(!Meta.data.storyOff, 'Story cutscenes')}</button>
        ${(() => {
          const owned = DATA.HATS.filter(h => (Meta.data.unlocks || {})[h.ach]);
          if (!owned.length) return '<div class="smallprint">👒 Hats are earned by achievements — go do something impressive.</div>';
          const btns = [{ id: null, name: 'No hat' }].concat(owned).map(h =>
            `<button class="btn minor" data-hat="${h.id || ''}" style="${Meta.data.hat === h.id ? 'outline:2px solid #e8c84c' : ''}">${h.name}</button>`).join('');
          return `<div class="tagline" style="margin:10px 0 2px">Hat (earned)</div><div class="btnrow" style="flex-wrap:wrap">${btns}</div>`;
        })()}
        ${(() => {   // emotional support animal picker
          const rows = [{ id: '', icon: '∅', name: 'none', note: 'you are alone. clinically.', ok: true }]
            .concat(DATA.PETS.map(pt => {
              const xp = (Meta.data.petXp || {})[pt.id] || 0;
              const tag = xp >= 40 ? ' ★' : (xp > 0 ? ' · ' + xp + '/40' : '');
              return { id: pt.id, icon: pt.icon, name: pt.name + tag, note: pt.unlock(Meta.data) ? pt.note : '🔒 ' + pt.unlockHint, ok: pt.unlock(Meta.data) };
            }));
          const btns = rows.map(pt =>
            `<button class="btn minor" data-pet="${pt.id}" ${pt.ok ? '' : 'disabled'} style="${(Meta.data.pet || '') === pt.id ? 'outline:2px solid #e8c84c' : ''}${pt.ok ? '' : ';opacity:.5'}" title="${pt.note}">${pt.icon} ${pt.name}</button>`).join('');
          return `<div class="tagline" style="margin:10px 0 2px">Emotional Support Animal</div><div class="btnrow" style="flex-wrap:wrap">${btns}</div>`;
        })()}
        <button class="btn minor" id="bPaToggle">${ct(!Meta.data.paOff, 'Intercom (Dr. Walrus PA)')}</button>
        <button class="btn minor" id="bSpeedrun">${ct(!!Meta.data.speedrun, 'Speedrun timer + splits')}</button>
        <button class="btn minor" id="bSaveData">💾 SAVE DATA (backup / transfer)</button>
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
    const bAim = document.getElementById('bA11yAim');
    if (bAim) bAim.onclick = () => { SFX.play('ui'); a.aimAssist = a.aimAssist === false; Meta.save(); bAim.textContent = ct(a.aimAssist !== false, 'Aim assist (stick/touch)'); };
    tog('bA11yDmg', 'dmgNums', 'Damage numbers');
    const bst = document.getElementById('bStoryToggle');
    if (bst) bst.onclick = () => { SFX.play('ui'); Meta.data.storyOff = Meta.data.storyOff ? 0 : 1; Meta.save(); bst.textContent = ct(!Meta.data.storyOff, 'Story cutscenes'); };
    document.querySelectorAll('[data-hat]').forEach(b => b.onclick = () => { SFX.play('ui'); Meta.data.hat = b.dataset.hat || null; Meta.save(); this.showSettings(returnTo); });
    document.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { SFX.play('ui'); Meta.data.pet = b.dataset.pet || null; Meta.save(); this.showSettings(returnTo); });
    const bpa = document.getElementById('bPaToggle');
    if (bpa) bpa.onclick = () => { SFX.play('ui'); Meta.data.paOff = Meta.data.paOff ? 0 : 1; Meta.save(); bpa.textContent = ct(!Meta.data.paOff, 'Intercom (Dr. Walrus PA)'); };
    const bsr = document.getElementById('bSpeedrun');
    if (bsr) bsr.onclick = () => { SFX.play('ui'); Meta.data.speedrun = Meta.data.speedrun ? 0 : 1; Meta.save(); bsr.textContent = ct(!!Meta.data.speedrun, 'Speedrun timer + splits'); };
    const bsd = document.getElementById('bSaveData');
    if (bsd) bsd.onclick = () => { SFX.play('ui'); this.showSaveData(() => this.showSettings(returnTo)); };
    document.getElementById('bSetBack').onclick = () => { SFX.play('ui'); returnTo(); };
  },

  /* ---------- THE CREDITS (roll them. you earned them. someone will be billed.) ---------- */
  showCredits() {
    this.state = 'credits';
    this.creditsT = 0;
    this.hideOverlay();
    SFX.setMusic('cutscene');
    if (!this._credTapBound) {
      this._credTapBound = () => { if (this.state === 'credits') this._credSkip = true; };
      document.getElementById('game').addEventListener('pointerdown', this._credTapBound);
    }
    this._credSkip = false;
  },
  creditsUpdate(dt) {
    this.creditsT = (this.creditsT || 0) + dt;
    const done = this.creditsT * 34 > DATA.CREDITS.length * 34 + CH + 200;   // scrolled past the walrus
    if (done || this._credSkip || Input.take('confirm') || Input.take('pause')) {
      this._credSkip = false;
      this.showTitle();
    }
  },

  /* ---------- BOSS NEGOTIATION (the fight stops; something is offered) ---------- */
  showBossDeal(boss) {
    this.state = 'bossdeal';
    SFX.play('deal');
    const D = DATA.BOSS_DEALS[boss.id];
    const B = DATA.BOSSES[boss.id] || { name: boss.id };
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:24px">🏳 ${B.name} STOPS FIGHTING</h1>
        <div class="tagline">${D.offer}</div>
        <div class="cmgrid">
          <button class="cmcard" id="bDealSpare"><div class="cmname" style="color:#8fd0e0">✌ SPARE — take the deal</div><div class="cmdesc">${D.give}</div><div class="cmtag">no kill credit. the codex will remember your mercy.</div></button>
          <button class="cmcard" id="bDealFinish"><div class="cmname" style="color:#e05a5a">⚔ FINISH IT</div><div class="cmdesc">No deals. This is a healthcare facility.</div><div class="cmtag">the fight resumes. slightly personally now.</div></button>
        </div>
      </div>`);
    document.getElementById('bDealSpare').onclick = () => {
      SFX.play('spare');
      try { D.apply(this.player, this); } catch (e) { }
      boss._spared = true;
      boss._dealHold = false;
      this.hideOverlay(); this.state = 'run';
      boss.die(this);
    };
    document.getElementById('bDealFinish').onclick = () => {
      SFX.play('stamp');
      boss._dealHold = false;
      boss.vulnerable = true;
      boss.aggr = (boss.aggr || 1) * 1.08;
      this.hideOverlay(); this.state = 'run';
      this.toast('“…so be it. HR will hear about this.”', '#e05a5a');
    };
  },

  /* ---------- THE JANITOR'S BASEMENT (forty years down here. mind the mop water.) ---------- */
  enterBasement() {
    const p = this.player;
    this._basementReturn = { room: this.room, x: p.x, y: p.y };
    const br = makeRoom(499, 499, 'dayroom');
    br._basement = true; br.visited = true; br.spawned = true; br.cleared = true;
    br.doors = {}; br.secretDoors = {};
    buildLayout(br, 1);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) br.layout[r][c] = 0;
    this.enterRoom(br, null);
    p.x = CW / 2; p.y = RY + RH - 70;
    // his break room: two keystones at cost, the good shelf, the truth on the wall
    const ks = U.shuffle(['cryitout', 'spiralthoughts', 'radicalhonesty', 'xrdose', 'boomerchart', 'uglycry'].filter(id => !p.items.includes(id)));
    if (ks[0]) this.peds.push({ x: CW / 2 - 130, y: RY + RH / 2 - 20, itemId: ks[0], kind: 'shop', price: 8, taken: false });
    if (ks[1]) this.peds.push({ x: CW / 2 + 130, y: RY + RH / 2 - 20, itemId: ks[1], kind: 'shop', price: 8, taken: false });
    this.peds.push({ x: RX + 80, y: RY + 90, kind: 'diploma', taken: false });
    this.peds.push({ x: CW / 2, y: RY + 80, kind: 'basementexit', taken: false });
    this.pickups.push(new Pickup('full', CW / 2 - 40, RY + RH - 130));
    this.pickups.push(new Pickup('pill', CW / 2 + 40, RY + RH - 130));
    for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-90, 90), RY + RH / 2 + 60));
    this.setBanner('🕯 THE BASEMENT', 'forty years of finding things', 2.6);
    this.toast('🧹 “Touch whatever. The walrus doesn\'t know this floor exists.”', '#b8b0a0');
    SFX.setMusic('basement');
  },
  exitBasement() {
    const R = this._basementReturn;
    if (!R || !R.room) { this.showTitle(); return; }
    this.enterRoom(R.room, null);
    this.player.x = R.x; this.player.y = R.y;
    this._basementReturn = null;
    this.toast('🧹 “Mind the stairs. And the everything else.”', '#b8b0a0');
  },

  /* ---------- THE COMPLAINT DEPARTMENT (your feedback, weaponized) ---------- */
  showComplaints(returnTo) {
    this.state = 'complaints';
    const pending = Meta.data.pendingComplaint;
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">📋 THE COMPLAINT DEPARTMENT</h1>
        <div class="tagline">file a formal grievance. next run, it will be assigned a body. kill it for ◆6.</div>
        ${pending ? `<div class="rx" style="border-color:#e0a05a"><div class="stamp">PENDING</div><div class="mech">“${pending}”</div><div class="presc">awaiting embodiment. it will find you next run.</div></div>` : ''}
        <div class="setrow"><label>Your grievance (40):</label>
          <input type="text" id="cplIn" class="seedfield" maxlength="40" placeholder="the vending machine ate my 3¢" autocomplete="off"></div>
        <button class="btn" id="bCplFile">✍ FILE IT (in triplicate)</button>
        <div class="smallprint">complaints filed: ${Meta.data.complaintsFiled || 0} · resolution rate: disputed</div>
        <button class="btn minor" id="bCplBack">BACK</button>
      </div>`);
    document.getElementById('bCplFile').onclick = () => {
      const v = String(document.getElementById('cplIn').value || '').trim().slice(0, 40);
      if (!v) { SFX.play('error'); this.toast('The form requires words. Any words.', '#e08a8a'); return; }
      Meta.data.pendingComplaint = v;
      Meta.data.complaintsFiled = (Meta.data.complaintsFiled || 0) + 1;
      Meta.save();
      SFX.play('paper'); SFX.play('stamp');
      this.toast('📋 Filed. Processed. Weaponized. See you next run.', '#e0a05a');
      this.showComplaints(returnTo);
    };
    document.getElementById('bCplBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- SAVE DATA (backup & cross-device transfer, no servers involved) ---------- */
  showSaveData(returnTo) {
    this.state = 'savedata';
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">💾 SAVE DATA</h1>
        <div class="tagline">your progress saves automatically on this device. to move it — or bulletproof it — use a save code.</div>
        <button class="btn" id="bSaveExport">📋 COPY MY SAVE CODE</button>
        <div class="smallprint" id="saveMsg">everything: unlocks, the skill tree, the fund, pets, bests. paste it on any device.</div>
        <div class="setrow" style="margin-top:12px"><label>Got a code?</label>
          <input type="text" id="saveIn" class="seedfield" placeholder="EGSSAVE…" autocomplete="off" spellcheck="false"></div>
        <button class="btn" id="bSaveImport">📥 RESTORE FROM CODE</button>
        <div class="smallprint" style="color:#e0a05a">⚠ tip: if you opened this game from a chat app, the built-in browser may not keep saves. open it in your real browser (Safari/Chrome) and add it to your home screen — then it keeps.</div>
        <button class="btn minor" id="bSaveBack">BACK</button>
      </div>`);
    document.getElementById('bSaveExport').onclick = (e) => {
      SFX.play('ui');
      const code = Meta.exportCode();
      const msg = document.getElementById('saveMsg');
      if (!code) { msg.textContent = 'export failed — that shouldn\'t happen. tell the walrus.'; return; }
      const done = () => { e.target.textContent = '✓ COPIED — KEEP IT SOMEWHERE SAFE'; msg.textContent = code.length > 900 ? 'long code — paste it into a note.' : 'paste it on your other device, or keep it as a backup.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done).catch(() => { msg.textContent = code; });
      else msg.textContent = code;
    };
    document.getElementById('bSaveImport').onclick = () => {
      const ok = Meta.importCode(document.getElementById('saveIn').value);
      if (!ok) { SFX.play('error'); this.toast('That code didn\'t take. Check you copied all of it.', '#e08a8a'); return; }
      SFX.play('fanfare');
      this.toast('💾 Save restored. Welcome back to the ward.', '#8fd08a');
      setTimeout(() => location.reload(), 900);
    };
    document.getElementById('bSaveBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
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
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout'];
    this._fvar = this._fvar || {};   // which cards are flipped to their Second Opinion
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const cards = order.map(id => {
      const D = DATA.DIAG[id];
      const nineDone = ['adhd','bipolar','depression','anxiety','schizo','ocd','ptsd','insomnia','fine'].filter(d => (Meta.data.diagsPlayed||{})[d]).length >= 9;
      const locked = (id === 'fine' && !fineOpen) || (id === 'undiag' && !nineDone) || (id === 'burnout' && !burnoutOpen);
      const best = (Meta.data.diagBest || {})[id];
      const soOpen = !locked && (best || 0) >= 6 && DATA.DIAG2 && DATA.DIAG2[id];   // beat the Ward-5 Walrus with the base
      const flipped = soOpen && this._fvar[id];
      const D2 = flipped ? DATA.DIAG2[id] : null;
      return `<button class="charCard ${locked ? 'locked' : ''}" data-d="${id}" ${locked ? 'disabled' : ''} style="${flipped ? 'outline:2px solid ' + D.color : ''}">
        ${soOpen ? `<span class="soflip" data-f="${id}" title="Second Opinion" style="position:absolute;top:4px;right:6px;font-size:13px;cursor:pointer">⇄${flipped ? 'Ⅱ' : ''}</span>` : ''}
        <canvas width="84" height="84" data-cd="${id}" data-cv="${flipped ? 1 : 0}"></canvas>
        <div class="cname" style="color:${locked ? '#8a8078' : D.color}">${locked ? '?????' : (flipped ? D2.name : D.name)}</div>
        <div class="cline">${locked ? (id === 'undiag' ? 'play all nine diagnoses' : id === 'burnout' ? 'reach Ward 10 three ways' : 'tell the truth at a checkup') : (flipped ? D2.tag : D.tag)}</div>
        <div class="cbest">${locked ? (id === 'undiag' ? 'every chart, once' : id === 'burnout' ? 'three diagnoses, ward 10 each' : 'or defeat Dr. Walrus') : (flipped ? 'Ⅱ · second opinion' : (best ? 'best: ward ' + best : 'no chart yet'))}</div>
      </button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">PATIENT FILES</h1>
        <div class="tagline">returning patients — skip the checkup, keep the label · ⇄ = a Second Opinion, earned at ward 6</div>
        <div class="charGrid">${cards}</div>
        <button class="btn minor" id="bBack2">BACK</button>
      </div>`);
    document.querySelectorAll('.charCard').forEach(c => { c.style.position = 'relative'; });
    document.querySelectorAll('.charCard canvas').forEach(c => {
      Render.drawCharPortrait(c.getContext('2d'), c.dataset.cd, c.dataset.cv === '1');
    });
    document.querySelectorAll('.soflip').forEach(s => {
      s.onclick = (ev) => { ev.stopPropagation(); SFX.play('ui'); this._fvar[s.dataset.f] = !this._fvar[s.dataset.f]; this.showFiles(); };
    });
    document.querySelectorAll('.charCard:not(.locked)').forEach(c => {
      c.onclick = () => { SFX.play('ui'); this.showCard(c.dataset.d, !!this._fvar[c.dataset.d]); };
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
          <b>Gamepad:</b> sticks move & shoot · <span class="kbd">A</span> ability · <span class="kbd">X</span> pill · <span class="kbd">B</span> claim ·
          <span class="kbd">SELECT</span> drops <b>Patient Two</b> in (couch co-op — they pick their own chart) · <span class="kbd">START</span> pause<br><br>
          <b>The rest:</b> clear rooms, take your meds (or don't), find the Specialist
          (needs a <b>Referral</b> 🔑), buy things with <b>Copays</b> ¢, beat the boss,
          descend forever. Dr. Walrus is waiting on every 5th ward.<br><br>
          <b>Patient Files</b> on the title screen is the character select — every diagnosis
          plays differently, Isaac-style. The checkup just picks one for you.<br><br>
          <b>Between runs:</b> pick your <b>Insurance Plan</b> at enrollment · walk <b>The Waiting Room</b> hub —
          the Wellness Fund upgrades the building, the Complaint Department weaponizes your feedback ·
          earn an <b>Emotional Support Animal</b> in Settings · leftover coins are "donated" when you're discharged.
          Your save keeps itself on this device — back it up or move it in <b>Settings → SAVE DATA</b>.
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
    if (Meta.data.storyOff || typeof Story === 'undefined' || this.bossRush || this.ascent) return false;
    const id = { 5: 'ward5', 10: 'ward10', 15: 'ward15', 20: 'ward20', 50: 'ward50pre', 100: 'ward100pre' }[this.depth];
    // the interlude interrupts the descend animation, so its onDone must rebuild the floor AND restore play
    if (id && !(Meta.data.seenStory && Meta.data.seenStory[id])) { Story.play(id, () => { this.newFloor(); this.state = 'run'; }); return true; }
    return false;
  },

  startQuiz() {
    this.state = 'quiz';
    this.quiz = {
      qs: U.shuffle(DATA.QUESTIONS).slice(0, 5),
      idx: 0,
      scores: { adhd: 0, bipolar: 0, depression: 0, anxiety: 0, schizo: 0, ocd: 0, ptsd: 0, insomnia: 0, fine: 0 }
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
    if (bestV <= 0) best = U.choice(['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia']);
    setTimeout(() => { if (this.state === 'quiz') this.showCard(best); }, 900);
  },

  showCard(diagId, variant) {
    this.state = 'card';
    if (diagId === 'fine' && !Meta.data.fineSeen) { Meta.data.fineSeen = 1; Meta.save(); }
    const D = DATA.DIAG[diagId];
    const D2 = variant && DATA.DIAG2 ? DATA.DIAG2[diagId] : null;
    const rxItem = D.rx ? DATA.ITEMS[D.rx] : null;
    SFX.play('stamp');
    this.overlay(`
      <div class="panel wide">
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="cardWalrus"></canvas>
          <div class="bubble">${D2 ? 'Back again? The chart says otherwise. The chart says several things now, actually. This is the other reading of you — the second opinion. It is not gentler.' : D.blurb}</div>
        </div>
        <div class="rx" ${D2 ? 'style="border-color:' + D.color + '"' : ''}>
          <div class="stamp">${D2 ? 'SECOND OPINION' : 'DIAGNOSIS'}</div>
          <h2 style="color:${D.color}">${D2 ? D2.name : D.name}</h2>
          <div class="sub">${D2 ? 'Ⅱ · ' + D2.tag : D.short}</div>
          <div class="mech">${D2 ? D2.mech : D.mech}</div>
          <div class="presc">℞ ${rxItem ? `<b>${rxItem.name}</b> — <i>${rxItem.quote}</i>` : "<b>Nothing.</b> <i>Walk it off.</i>"} Plus one (1) mystery pill. Standard.</div>
        </div>
        <div class="deathline">“${U.choice(DATA.CARD_LINES)}”</div>
        ${(() => {   // Midnight Ward mastery skin (Ward 10 with this diagnosis)
          const mastered = ((Meta.data.diagBest || {})[diagId] || 0) >= 10;
          const on = !!(Meta.data.skinOn || {})[diagId];
          return mastered
            ? `<button class="btn minor" id="bSkinT">${on ? '🌙 MIDNIGHT WARD SKIN: ON' : '🌙 MIDNIGHT WARD SKIN: OFF'}</button>`
            : `<div class="tagline" style="opacity:.55">🌙 reach Ward 10 as ${D.name} to unlock the Midnight Ward skin</div>`;
        })()}
        <button class="btn" id="bBegin2">BEGIN TREATMENT</button>
      </div>`);
    this.paintWalrus('cardWalrus');
    const bsk = document.getElementById('bSkinT');
    if (bsk) bsk.onclick = () => {
      SFX.play('ui');
      if (!Meta.data.skinOn) Meta.data.skinOn = {};
      Meta.data.skinOn[diagId] = Meta.data.skinOn[diagId] ? 0 : 1;
      Meta.save();
      bsk.textContent = Meta.data.skinOn[diagId] ? '🌙 MIDNIGHT WARD SKIN: ON' : '🌙 MIDNIGHT WARD SKIN: OFF';
    };
    document.getElementById('bBegin2').onclick = () => { SFX.play('ui'); this.showEnrollment(diagId, null, !!D2); };
  },

  /* ---------- run setup ---------- */
  /* ---------- ENROLLMENT (pick your coverage; dailies are exchange plans, no choice) ---------- */
  showEnrollment(diagId, daily, variant) {
    this.state = 'enroll';
    SFX.play('stamp');
    const cards = DATA.PLANS.map(pl => `
      <button class="cmcard" data-plan="${pl.id}">
        <div class="cmname" style="color:${pl.clr}">${pl.icon} ${pl.name}</div>
        <div class="cmdesc">${pl.tag} — ${pl.desc}</div>
        <div class="cmtag">${pl.lines.join(' · ')}</div>
      </button>`).join('');
    const heatOk = !!Meta.data.cured;
    const bestHeat = Math.max(0, ...Object.values(Meta.data.intensityBest || {}).concat(0));
    this._enrollHeat = 0;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">OPEN ENROLLMENT</h1>
        <div class="tagline">choose your coverage. this is the only choice the system will offer you.</div>
        <div class="cmgrid">${cards}</div>
        ${heatOk ? `
        <div class="setrow" style="justify-content:center;gap:10px;margin-top:6px">
          <button class="btn minor" id="bHeatDn" style="min-width:44px">−</button>
          <span id="heatLbl" style="font-weight:bold;color:#e08a5a;min-width:220px;text-align:center">🔥 TREATMENT INTENSITY 0 — standard care</span>
          <button class="btn minor" id="bHeatUp" style="min-width:44px">+</button>
        </div>
        <div class="tagline" style="opacity:.7" id="heatDesc">each notch stacks a complication — and multiplies ◆ Insight. best so far: ${bestHeat}</div>` : ''}
        <div class="tagline" style="opacity:.6">seeded runs (daily / quarterly / challenge) are assigned SILVER. you don't get to pick. that's the joke.</div>
      </div>`);
    if (heatOk) {
      const NOTCHES = ['standard care', '+10% patient vitality', 'copays +25%', 'management hustles', '−1 heart container', 'champions everywhere', 'a side-effect every ward', 'faster paperwork (bullets)', 'the ward stops tipping', 'constant CODE GRAY risk', 'desperation comes early'];
      const upd = () => {
        const h = this._enrollHeat;
        document.getElementById('heatLbl').textContent = '🔥 TREATMENT INTENSITY ' + h + ' — ' + NOTCHES[h];
        document.getElementById('heatDesc').textContent = h > 0 ? ('stacked: ' + NOTCHES.slice(1, h + 1).join(' · ') + ' — Insight ×' + (1 + h * 0.15).toFixed(2)) : ('each notch stacks a complication — and multiplies ◆ Insight. best so far: ' + bestHeat);
      };
      document.getElementById('bHeatUp').onclick = () => { SFX.play('ui'); this._enrollHeat = Math.min(10, this._enrollHeat + 1); upd(); };
      document.getElementById('bHeatDn').onclick = () => { SFX.play('ui'); this._enrollHeat = Math.max(0, this._enrollHeat - 1); upd(); };
    }
    document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
      SFX.play('item');
      this._startPlan = b.dataset.plan;
      this._startIntensity = this._enrollHeat || 0;
      this.beginRun(diagId, daily, variant);
    });
  },

  beginRun(diagId, daily, variant) {
    this.variantRun = !!variant && !daily;   // Second Opinion runs (never in dailies)
    this.daily = !!daily;
    this.dailyKind = daily ? (daily.isQuarterly ? 'quarterly' : daily.isDaily ? 'daily' : 'challenge') : null;
    this.seed = daily ? (daily.seed >>> 0) : null;
    this.dailyKey = daily ? daily.key : null;
    this._startWalrusKills = Meta.data.walrusKills || 0;   // for daily "beat the Walrus" flag
    // run modifiers: Chronic Mode (NG+), Boss Rush, and the 'Second Opinion' easy toggle
    this.chronic = !!this._startChronic; this._startChronic = false;
    this.bossRush = !!this._startBossRush; this._startBossRush = false;
    this.prognosis = this._startPrognosis || null; this._startPrognosis = null;   // challenge-run modifier
    this.protocol = this._startProtocol || null; this._startProtocol = null;      // Challenge Protocol rule-set
    if (this.protocol === 'understaffed') this.bossRush = true;
    this.protoT = this.protocol === 'timeslot' ? 1200 : null;   // the 20-minute slot
    this.ascent = false; this.ascentBase = 0;
    this.rapidMods = { dmg: 1, spd: 1, tears: 1, def: 1 };
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
    if (!this._resuming) {   // a resumed run isn't a new run
      Meta.data.runs++;
      if (!Meta.data.diagsPlayed) Meta.data.diagsPlayed = {};
      Meta.data.diagsPlayed[diagId] = 1;
      Meta.save();
    }
    Meta.data.lastDiag = diagId; Meta.save();
    this.player = this.genSeed(['player'], () => new Player(diagId, this.variantRun));
    this.applyCodexPerks(this.player);   // rewards earned by completing chart tabs
    this.applyPrognosis(this.player);    // challenge-run start effects
    if (this.protocol === 'waitingroom') { this.player.maxhp = 2; this.player.hp = 2; this.player.flags.noHeal = true; }   // one heart, no healing
    this.applyTalents(this.player);      // Treatment Plan (permanent skill-tree perks)
    this.applyFacility(this.player);     // Waiting Room furniture perks (the Wellness Fund at work)
    // emotional support animal (equipped in Settings; must still be earned)
    if (Meta.data.pet) {
      const pd = DATA.PETS.find(x => x.id === Meta.data.pet);
      if (pd && pd.unlock(Meta.data)) this.player.pet = new Pet(pd.id);
    }
    // a care package arrived (someone out there is thinking of you)
    if (Meta.data.pendingGift && !daily) {
      const g = Meta.data.pendingGift;
      if (DATA.ITEMS[g.i]) {
        this.player.addItem(g.i, this);
        this.toast('📦 CARE PACKAGE: ' + DATA.ITEMS[g.i].name + (g.n ? ' — “' + g.n + '”' : '') + ' (inspected. for safety.)', '#8fd08a');
        SFX.play('fanfare');
        Meta.data.giftsGot = (Meta.data.giftsGot || 0) + 1;
      }
      Meta.data.pendingGift = null;
      Meta.save();
      this.checkUnlocks();
    }
    // insurance plan (dailies & seeded runs are assigned SILVER — no marketplace for you)
    this.plan = (!daily && this._startPlan) ? this._startPlan : 'silver';
    this._startPlan = null;
    // Treatment Intensity (heat) — post-cure difficulty dial, dailies stay standard
    this.intensity = (!daily && this._startIntensity) ? this._startIntensity : 0;
    this._startIntensity = 0;
    if (this.intensity >= 4) { this.player.maxhp = Math.max(2, this.player.maxhp - 2); this.player.hp = Math.min(this.player.hp, this.player.maxhp); }
    if (this.intensity > 0) this.toast('🔥 TREATMENT INTENSITY ' + this.intensity + ' — Insight ×' + (1 + this.intensity * 0.15).toFixed(2), '#e08a5a');
    if (this.plan === 'bronze') { this.player.coins += 15; }
    if (this.plan === 'gold') { this.player.maxhp = Math.max(2, this.player.maxhp - 2); this.player.hp = Math.min(this.player.hp, this.player.maxhp); }
    if (this.plan !== 'silver') { const PL = DATA.PLANS.find(x => x.id === this.plan); this.toast(PL.icon + ' Enrolled: ' + PL.name + ' — ' + PL.tag, PL.clr); }
    if (this.protocol === 'waitingroom') { this.player.maxhp = 2; this.player.hp = Math.min(this.player.hp, 2); }   // talents can't buy hearts here either
    this._appealUsed = false; this._appealOffered = false;   // one appeal per run
    this.pillAssign = this.genSeed(['pills'], () => U.shuffle(DATA.PILLS.map((_, i) => i)).slice(0, 10));
    this.pillKnown = new Set();
    this.depth = 1;
    this.lastBoss = null;
    this.stats = { kills: 0, rooms: 0, items: 0, bosses: 0, pills: 0 };
    this.runUnlocks = [];
    this.floorHits = 0;
    this._deathRecorded = false;
    this._runLogged = false;
    this._insightGained = 0;
    this._goalInsight = 0;
    // Treatment Goals: 3 objectives for this run (seeded so a daily's goals match for everyone)
    this.goals = this.genSeed(['goals'], () => U.shuffle(DATA.GOALS.slice()).slice(0, 3))
      .map(g => ({ id: g.id, name: g.name, desc: g.desc, ev: g.ev, n: g.n, insight: g.insight, prog: 0, done: false }));
    this.contracts = [];   // Day Room side jobs (max 2 active)
    this.amaRun = null;    // Against Medical Advice escape state
    this._amaFailed = false; this._amaDone = false;
    this.p2 = null;   // Patient Two rejoins per run (Select on the pad)
    this.overtime = null;   // OVERTIME arms below if _startOvertime
    this.runTime = 0; this.splits = []; this._lastSplitDelta = null;   // speedrun clock
    this._basementOffered = false; this._basementReturn = null; this._diplomaSeen = false;
    this._billMul = 1; this._preApproved = 0; this._routeMod = null; this.practice = false;
    // THE COMPLAINT DEPARTMENT: your grievance reports for duty
    this._complaint = (!daily && Meta.data.pendingComplaint) ? String(Meta.data.pendingComplaint).slice(0, 40) : null;
    this._complaintSpawned = false;
    if (this._complaint) { Meta.data.pendingComplaint = null; Meta.save(); }
    // intercom state + your recurring nemesis (last two deaths, same cause)
    this._ic = null; this._cleanStreak = 0; this._icFloors = {}; this._icPattern = null;
    const deads = (Meta.data.runlog || []).filter(r => r.out === 'dead').slice(-2);
    if (deads.length === 2 && deads[0].cause === deads[1].cause && deads[0].cause) this._icPattern = this._causeName(deads[0].cause);
    // IT REMEMBERS YOU: whatever got you last run is coming back for a look (regular patients only)
    const lastDead = deads[deads.length - 1];
    this.nemesisId = (!daily && lastDead && DATA.ENEMIES[lastDead.cause] && lastDead.cause !== 'auditor' && lastDead.cause !== 'form') ? lastDead.cause : null;
    this._nemesisSpawned = false;
    this._runCured = false;
    this._runStart = Date.now();
    this.larperToastShown = false;
    this.deathT = 0;
    this.newFloor();
    this.state = 'run';
    this.hideOverlay();
    SFX.setMusic('run');
    document.body.classList.add('inrun');
    if (this._startOvertime) { this._startOvertime = false; this.setupOvertime(); }   // OVERTIME: one room, all of it
  },

  /* ---------- The Waiting Room (walkable hub) ---------- */
  showHub() {
    this.state = 'hub';
    this.hideOverlay();
    document.body.classList.add('inrun');   // phones need the move stick in here
    SFX.setMusic('dayroom');
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout'];
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const nineDone = order.slice(0, 9).filter(d => (Meta.data.diagsPlayed || {})[d]).length >= 9;
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const unlocked = order.filter(id => !(id === 'fine' && !fineOpen) && !(id === 'undiag' && !nineDone) && !(id === 'burnout' && !burnoutOpen));
    const hp = new Player(Meta.data.lastDiag && DATA.DIAG[Meta.data.lastDiag] ? Meta.data.lastDiag : 'adhd');
    hp.x = CW / 2; hp.y = 470;
    const seats = unlocked.map((id, i) => {
      const pl = new Player(id);
      pl.x = 0; pl.y = 0; pl.aimAng = -Math.PI / 2; pl.noHat = true;   // the hat is yours, not theirs
      return { id, pl, x: 175 + (i % 5) * 90, y: 300 + Math.floor(i / 5) * 92 };
    });
    this.hub = {
      p: hp, seats, prompt: null,
      stations: [
        { x: 220, y: 118, r: 52, door: true, label: '🗓 DAILY',      act: () => this.showDaily() },
        { x: 480, y: 150, r: 62, door: false, label: '🩺 CHECKUP',   hint: 'see Dr. Walrus (new run)', act: () => this.startCheckup() },
        { x: 740, y: 118, r: 52, door: true, label: '🧪 PROTOCOLS',  act: () => this.showProtocols(() => this.showHub()) },
        { x: 78, y: 300, r: 50, door: false, label: '🎲 PROGNOSIS',  hint: 'challenge runs', act: () => this.showPrognosis(() => this.showHub()) },
        { x: 78, y: 440, r: 50, door: false, label: '🧠 TREATMENT',  hint: 'spend ◆ ' + (Meta.data.insight || 0), act: () => this.showTreatmentPlan(() => this.showHub()) },
        { x: 884, y: 300, r: 50, door: false, label: '📖 CHART NOTES', hint: 'the story so far', act: () => this.showStoryGallery() },
        { x: 884, y: 440, r: 50, door: false, label: '☠ BESTIARY',   hint: 'the management, itemized', act: () => this.showBestiary(() => this.showHub()) },
        { x: 360, y: 96, r: 46, door: false, label: '📊 RUN HISTORY', hint: 'your receipts', act: () => this.showStats(() => this.showHub()) },
        { x: 600, y: 96, r: 46, door: false, label: '🏆 UNLOCKS',    hint: 'the corkboard', act: () => this.showUnlocks(() => this.showHub()) },
        { x: 140, y: 560, r: 48, door: false, label: '⚙ SETTINGS',   hint: 'the janitor closet', act: () => this.showSettings(() => this.showHub()) },
        { x: 820, y: 560, r: 48, door: false, label: '📋 PATIENT CHART', hint: 'the codex', act: () => this.showCodex(() => this.showHub()) },
        { x: 330, y: 565, r: 46, door: false, label: '🫙 WELLNESS FUND', hint: 'balance: ' + (Meta.data.fund || 0) + '¢', act: () => this.showFacility(() => this.showHub()) },
        { x: 480, y: 565, r: 44, door: false, label: '📋 COMPLAINTS', hint: Meta.data.pendingComplaint ? 'one pending' : 'file a grievance', act: () => this.showComplaints(() => this.showHub()) }
      ]
    };
  },
  /* ---------- Facility Improvements (spend the Wellness Fund on the room itself) ---------- */
  showFacility(returnTo) {
    this.state = 'facility';
    const fund = Meta.data.fund || 0;
    const fac = Meta.data.facility || (Meta.data.facility = {});
    const cards = DATA.FACILITY.map(f => {
      const owned = !!fac[f.id], can = fund >= f.cost;
      return `<button class="cmcard" data-fac="${f.id}" ${owned ? 'disabled' : ''} style="${owned ? 'opacity:.55' : can ? '' : 'opacity:.75'}">
        <div class="cmname">${f.icon} ${f.name} ${owned ? '· INSTALLED' : `· ${f.cost}¢`}</div>
        <div class="cmdesc">${f.desc}</div>
        <div class="cmtag">${owned ? '✓ ' : ''}${f.perk}</div>
      </button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">🫙 THE WELLNESS FUND</h1>
        <div class="tagline">your leftover copays, "donated" at discharge — balance: <b style="color:#e8c84c">${fund}¢</b></div>
        <div class="cmgrid">${cards}</div>
        <div class="tagline" style="opacity:.65">improvements are permanent. the walrus thanks you for your generosity, which was mandatory.</div>
        <button class="btn minor" id="bFacBack">BACK</button>
      </div>`);
    document.querySelectorAll('[data-fac]').forEach(b => b.onclick = () => {
      const f = DATA.FACILITY.find(x => x.id === b.dataset.fac);
      if (!f || fac[f.id] || (Meta.data.fund || 0) < f.cost) { SFX.play('error'); return; }
      Meta.data.fund -= f.cost; fac[f.id] = 1; Meta.save();
      SFX.play('fanfare');
      this.showFacility(returnTo);
    });
    document.getElementById('bFacBack').onclick = () => { SFX.play('ui'); this.hideOverlay(); (returnTo || (() => this.showTitle()))(); };
  },

  hubUpdate(dt) {
    const H = this.hub; if (!H) { this.showTitle(); return; }
    const p = H.p;
    const mv = Input.getMove();
    p.moving = (Math.abs(mv.x) > 0.05 || Math.abs(mv.y) > 0.05);
    if (p.moving) p.aimAng = Math.atan2(mv.y, mv.x);
    p.x = U.clamp(p.x + mv.x * 250 * dt, 46, CW - 46);
    p.y = U.clamp(p.y + mv.y * 250 * dt, 78, CH - 40);
    if (Input.take('pause')) { document.body.classList.remove('inrun'); this.showTitle(); return; }
    const go = (fn, snd) => { document.body.classList.remove('inrun'); SFX.play(snd || 'door'); fn(); };
    const touch = Input.usingTouch;
    // stations — on touch, standing still inside one for a beat opens it
    const lastPrompt = H.prompt;
    H.prompt = null;
    for (const s of H.stations) {
      if (U.dist(p.x, p.y, s.x, s.y) < s.r) {
        H.prompt = s;
        H.dwell = (lastPrompt === s && !p.moving) ? (H.dwell || 0) + dt : 0;
        if (s.door || Input.take('confirm') || Input.take('ability') || (touch && H.dwell > 0.55)) { go(s.act); return; }
        break;
      }
    }
    // seated patients: walk up + confirm (or hold still, on touch) to open their chart
    if (!H.prompt) for (const seat of H.seats) {
      if (U.dist(p.x, p.y, seat.x, seat.y) < 44) {
        H.prompt = { label: DATA.DIAG[seat.id].name, hint: touch ? 'hold still to open their chart' : 'open their chart (start a run)', seat };
        H.dwell = (lastPrompt && lastPrompt.seat === seat && !p.moving) ? (H.dwell || 0) + dt : 0;
        if (Input.take('confirm') || Input.take('ability') || (touch && H.dwell > 0.55)) { go(() => this.showCard(seat.id), 'ui'); return; }
        break;
      }
    }
    if (!H.prompt) H.dwell = 0;
  },

  /* ---------- The Itemized Bill (post-run insurance statement) ---------- */
  runBill() {
    const st = this.stats || {}, d = this.depth || 1;
    const rows = [
      ['Facility fee', d + (d === 1 ? ' ward' : ' wards'), d * 5000],
      ['Room turnover fee', st.rooms, (st.rooms || 0) * 850],
      ['Symptom management', st.kills, (st.kills || 0) * 120],
      ['Boss consultation', st.bosses, (st.bosses || 0) * 35000],
      ['Dispensing fee', st.items, (st.items || 0) * 1200],
      ['Pills, misc.', st.pills, (st.pills || 0) * 90]
    ].filter(r => r[2] > 0);
    let total = rows.reduce((a, r) => a + r[2], 0);
    if (this._billMul > 1) { rows.push(['Settlement adjustment (the Adjuster)', '×' + this._billMul, Math.round(total * (this._billMul - 1))]); total = Math.round(total * this._billMul); }
    if (this._amaFailed) { rows.push(['AMA elopement surcharge', '×2', total]); total *= 2; }   // you tried to LEAVE?
    return { rows, total };
  },
  billHtml() {
    const B = this.runBill();
    const fmt = n => '$' + n.toLocaleString('en-US');
    return `<div class="summary" style="margin-top:8px">
      <div class="sumrow"><span><b>🧾 ITEMIZED STATEMENT</b> <i style="opacity:.6">(not a bill*)</i></span><b></b></div>
      ${B.rows.map(r => `<div class="sumrow"><span>${r[0]} × ${r[1]}</span><b>${fmt(r[2])}</b></div>`).join('')}
      <div class="sumrow"><span>Amount covered by insurance</span><b>$0.00</b></div>
      <div class="sumrow"><span><b>PATIENT RESPONSIBILITY</b></span><b style="color:#c05050">${fmt(B.total)}</b></div>
      <div class="sumrow"><span style="opacity:.55;font-size:11px">*it is a bill</span><b></b></div>
    </div>`;
  },

  /* ---------- Save & Continue (floor checkpoints) ----------
     A snapshot at the start of every floor; CONTINUE on the title resumes it.
     Seeded runs (daily/challenge) are excluded — those are meant to be one sitting. */
  SAVE_KEY: 'egs_save1',
  SAVE_FIELDS: ['hp', 'maxhp', 'spd', 'tearDelay', 'dmg', 'shotSpd', 'range', 'wobble', 'luck', 'coins', 'keys', 'bombs', 'coupons', 'pill', 'iframeTime', 'abilMax', 'sleep', 'compulsion', '_scar', '_recRooms', 'trinket', '_rosaryUsed', 'battery'],
  saveCheckpoint() {
    if (this.dailyKind || this.overtime || !this.player || this.player.dead) return;
    const p = this.player;
    try {
      const S = {
        v: 1, diag: p.baseDiag === 'undiag' ? 'undiag' : p.diag, variant: p.variant ? 1 : 0, depth: this.depth,
        chronic: this.chronic ? 1 : 0, bossRush: this.bossRush ? 1 : 0, prognosis: this.prognosis || null, protocol: this.protocol || null, protoT: this.protoT, ascent: this.ascent ? 1 : 0, ascentBase: this.ascentBase || 0, apl: this._appealUsed ? 1 : 0, plan: this.plan || 'silver', contracts: (this.contracts || []).map(c => ({ id: c.id, prog: c.prog, done: c.done ? 1 : 0 })),
        lastBoss: this.lastBoss || null,
        flags: p.flags, items: p.items, comorbidities: p.comorbidities || [],
        transforms: p._transforms || [], transformTint: p.transformTint || null,
        familiars: p.familiars.map(f => f.type),
        allies: p.allies.map(a => a.id),
        goals: this.goals, stats: this.stats, goalInsight: this._goalInsight || 0
      };
      for (const f of this.SAVE_FIELDS) S[f] = p[f];
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(S));
      Meta._idbQueue();   // keep the IndexedDB mirror current too
    } catch (e) { }
  },
  clearCheckpoint() { try { localStorage.removeItem(this.SAVE_KEY); } catch (e) { } },
  loadCheckpoint() {
    try { const j = localStorage.getItem(this.SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; }
  },
  resumeRun(S) {
    this._resuming = true;
    this._startChronic = !!S.chronic; this._startBossRush = !!S.bossRush; this._startPrognosis = S.prognosis || null; this._startProtocol = S.protocol || null;
    this.beginRun(S.diag, null, !!S.variant);
    this._resuming = false;
    const p = this.player;
    // wholesale restore: numeric stats, flags, inventory (item effects live in the numbers/flags)
    for (const f of this.SAVE_FIELDS) if (S[f] !== undefined) p[f] = S[f];
    p.flags = S.flags || {};
    p.items = S.items || p.items;
    p.comorbidities = S.comorbidities || [];
    p._transforms = S.transforms || []; p.transformTint = S.transformTint || null;
    p.familiars = (S.familiars || []).map(t => new Familiar(t));
    p.allies = [];
    (S.allies || []).forEach(id => { try { p.recruitAlly(null, id); } catch (e) { } });
    if (S.goals) this.goals = S.goals;
    if (S.stats) this.stats = S.stats;
    this._goalInsight = S.goalInsight || 0;
    this.depth = S.depth || 1;
    this.lastBoss = S.lastBoss || null;
    if (S.protoT != null) this.protoT = S.protoT;
    this.ascent = !!S.ascent; this.ascentBase = S.ascentBase || 0;
    this._appealUsed = !!S.apl;
    this.plan = S.plan || 'silver';
    this.contracts = (S.contracts || []).map(sc => { const def = DATA.CONTRACTS.find(c => c.id === sc.id); return def ? { id: sc.id, def, prog: sc.prog || 0, done: !!sc.done } : null; }).filter(Boolean);
    this.newFloor();
    this.toast('📂 Chart reopened — ward ' + this.depth + '. Welcome back.', '#8fd0e0');
  },

  // Treatment Goals: advance any active objective listening for this event
  goalEvent(ev, amt) {
    this.contractEvent(ev, amt);
    if (!this.goals) return;
    for (const g of this.goals) {
      if (g.done || g.ev !== ev) continue;
      g.prog += (amt || 1);
      if (g.prog >= g.n) {
        g.done = true;
        Meta.data.insight = (Meta.data.insight || 0) + g.insight;
        this._goalInsight += g.insight;
        Meta.save();
        this.toast('🎯 GOAL: ' + g.name + ' — +◆' + g.insight + ' Insight', '#8fd0e0');
        SFX.play('goalJingle');
      }
    }
  },

  /* ---------- Day Room Contracts (the other patients need things) ---------- */
  contractEvent(ev, amt) {
    if (!this.contracts || !this.contracts.length) return;
    for (const c of this.contracts) {
      if (c.done || c.def.ev !== ev) continue;
      c.prog += (amt || 1);
      if (c.prog >= c.def.n) {
        c.done = true;
        Meta.data.contractsDone = (Meta.data.contractsDone || 0) + 1;
        this.applyContractReward(c.def);
        Meta.save();
        this.checkUnlocks();
      }
    }
  },
  applyContractReward(def) {
    const p = this.player; if (!p) return;
    const say = (s) => { this.toast('📝 CONTRACT PAID: ' + def.name + ' — ' + s, '#8fd08a'); SFX.play('bell'); };
    switch (def.reward) {
      case 'coins': { const n = def.id === 'secret1' ? 12 : 9; p.coins += n; say('+' + n + '¢'); break; }
      case 'hearts': {
        if (def.id === 'bombs2') { p.maxhp += 2; p.heal(2); say('+1 heart container'); }
        else { p.heal(99); say('healed up'); }
        break;
      }
      case 'item': {
        const pool = DATA.pickPool('special', p.items);
        this.peds.push({ x: U.clamp(p.x, RX + 40, RX + RW - 40), y: U.clamp(p.y - 50, RY + 40, RY + RH - 40), itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
        say('your prescription, delivered');
        break;
      }
      case 'trinket': { this.pickups.push(new Pickup('trinket', p.x + 30, p.y)); say('a personal effect'); break; }
      case 'insight': { Meta.data.insight = (Meta.data.insight || 0) + 8; this._goalInsight += 8; say('+◆8 Insight'); break; }
      case 'fund': { Meta.data.fund = (Meta.data.fund || 0) + 20; say('+20¢ to the Fund, in your name'); break; }
    }
  },

  // Treatment Plan: apply every learned talent's start-of-run effect
  applyTalents(p) {
    const tal = Meta.data.talents || {};
    for (const t of (DATA.TALENTS || [])) if (tal[t.id]) { try { t.apply(p, this); } catch (e) { } }
    if (p.flags.allyTough) for (const a of p.allies) { a.maxhp = 4; a.hp = 4; a.dmgMul = 1.35; }   // retro-apply Facilitator to starting allies
  },

  // Facility Improvements: every owned Waiting Room upgrade's start-of-run perk
  applyFacility(p) {
    const fac = Meta.data.facility || {};
    for (const f of (DATA.FACILITY || [])) if (fac[f.id]) { try { f.apply(p, this); } catch (e) { } }
  },

  // challenge-run start effects (Prognosis)
  applyPrognosis(p) {
    const pr = this.prognosis; if (!pr) return;
    if (pr === 'glass') { p.maxhp = 2; p.hp = 2; p.dmg *= 3; }
    if (pr === 'coldturkey') { p.pill = null; p.flags.noPills = true; }
    if (pr === 'untreated') { p.flags.untreated = true; }
    if (pr === 'pacifist') {
      p.flags.pacifist = true;
      ['dog', 'spinner', 'plush'].forEach(t => p.familiars.push(new Familiar(t)));   // a support crew, since you can't fire
      p.bombs += 3;
    }
  },

  // Silent run-stats logger: one record per run (death / cure / quit) to localStorage.
  // Powers the Run History screen and accumulates real win-rate data over time.
  recordRun(out) {
    if (this._runLogged || !this.player) return;
    this._runLogged = true;
    this.clearCheckpoint();   // the run ended — no continuing past this

    const p = this.player;
    // your remaining change is "donated" to the clinic's Wellness Fund. you were not asked.
    if (p.coins > 0) { Meta.data.fund = (Meta.data.fund || 0) + p.coins; this._fundDonated = p.coins; p.coins = 0; }
    else this._fundDonated = 0;
    const mode = this.overtime ? 'overtime' : this.protocol ? this.protocol : this.prognosis ? this.prognosis : this.chronic ? 'chronic' : this.bossRush ? 'bossrush' : this.dailyKind === 'daily' ? 'daily' : this.dailyKind === 'quarterly' ? 'quarterly' : this.dailyKind === 'challenge' ? 'challenge' : 'normal';
    if (this.prognosis) { const pb = Meta.data.prognosisBest || (Meta.data.prognosisBest = {}); pb[this.prognosis] = Math.max(pb[this.prognosis] || 0, this.depth); }
    const cured = !!this._runCured || out === 'cured';
    const walrus = (Meta.data.walrusKills || 0) > (this._startWalrusKills || 0);
    const cause = out === 'dead' ? (p._lastSrc || 'unknown') : out;
    const secs = Math.max(0, Math.round((Date.now() - (this._runStart || Date.now())) / 1000));
    const rec = { t: this.todayKey(), diag: p.baseDiag === 'undiag' ? 'undiag' : p.diag, mode, ward: this.depth, out, cause, cured: cured ? 1 : 0, walrus: walrus ? 1 : 0, kills: this.stats.kills, bosses: this.stats.bosses, items: this.stats.items, pills: this.stats.pills, secs, variant: p.variant ? 1 : 0, bill: this.runBill().total };
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
    // Quarterly Review: file this run's bill into the week (3 slots)
    if (this.dailyKind === 'quarterly') {
      const Q = this._quarterly();
      if (Q.bills.length < 3) {
        Q.bills.push(this.runBill().total);
        const total = Q.bills.reduce((a, b) => a + b, 0);
        if (Q.bills.length === 3) Meta.data.quarterlyBest = Math.max(Meta.data.quarterlyBest || 0, total);
      }
    }
    // Treatment Plan currency: Insight scales with how far you got this run
    let gained = Math.max(1, Math.round(this.depth * 1.5 + this.stats.bosses * 3 + this.stats.kills * 0.05 + (cured ? 15 : 0) + (walrus ? 5 : 0)));
    if (out === 'ama') gained = Math.round(gained * 1.5);   // leaving AMA banks a premium
    if (this.intensity > 0) {
      gained = Math.round(gained * (1 + this.intensity * 0.15));   // heat pays
      if (this.depth >= 5) { const ib = Meta.data.intensityBest || (Meta.data.intensityBest = {}); const k = p.baseDiag === 'undiag' ? 'undiag' : p.diag; ib[k] = Math.max(ib[k] || 0, this.intensity); }
    }
    Meta.data.insight = (Meta.data.insight || 0) + gained;
    this._insightGained = gained;
    Meta.save();
  },

  newFloor() {
    if (this.maybeInterlude()) return;   // story beat first; it re-calls newFloor when done
    const gen = this.genSeed(['floor', this.depth], () => generateFloor(this.depth, this.lastBoss));
    this.grid = gen.grid;
    this.floorRooms = gen.rooms;
    this.bossId = gen.bossId;
    if (this.ascent && this.depth - this.ascentBase >= 5) this.bossId = 'theboard';   // A5: the top of the elevator
    // GOLD plan: one extra pharmacy room per floor, lock already open — executive access
    if (this.plan === 'gold') this.genSeed(['goldroom', this.depth], () => {
      const normals = this.floorRooms.filter(r => r.type === 'normal');
      if (normals.length > 1) {
        const r = U.choice(normals); r.type = 'item'; r.lockOpen = true;
        if (r.layout) for (let rr = 2; rr <= 4; rr++) for (let cc = 5; cc <= 7; cc++) r.layout[rr][cc] = 0;   // clear floor for the pedestal
      }
    });
    this._janitorFloor = false;   // the Janitor makes one appearance per floor, tops
    // THE ELEVATOR: the route you picked shapes this floor
    const RM = this._routeMod; this._routeMod = null;
    this._forceShadow = !!(RM && RM.mod === 'shadow');
    this._routeWing = (RM && RM.mod === 'wing') ? RM.wing : null;
    this.quietFloor = !!(RM && RM.mod === 'quiet');
    if (RM && RM.mod === 'pharm') {
      const normals = this.floorRooms.filter(r => r.type === 'normal');
      if (normals.length > 1) { const r = U.choice(normals); r.type = 'item'; r.lockOpen = true; if (r.layout) for (let rr = 2; rr <= 4; rr++) for (let cc = 5; cc <= 7; cc++) r.layout[rr][cc] = 0; }
    }
    if (RM && RM.mod === 'dayroom' && !this.floorRooms.some(r => r.type === 'dayroom')) {
      const normals = this.floorRooms.filter(r => r.type === 'normal');
      if (normals.length > 1) U.choice(normals).type = 'dayroom';
    }
    // THE THIRTEENTH WARD: not generated. curated. it was always going to be ward 13.
    this.ward13 = (this.depth === 13 && !this.ascent && !this.bossRush && !this.overtime);
    if (this.ward13) {
      const cycle = ['seclusion', 'ect', 'padded', 'observation', 'clinic', 'dayroom'];
      let ci = 0;
      for (const r of this.floorRooms) {
        if (r.type === 'normal') { r.type = cycle[ci % cycle.length]; ci++; }
        if (r.type === 'item') r.lockOpen = true;   // the doors here don't believe in keys
      }
      this.setBanner('🕯 THE THIRTEENTH WARD', 'there is no room 13. there is only ward 13.', 3.2);
      SFX.play('sting');
      SFX.setMusic('ward13');
    } else if (SFX.musicMode === 'ward13' && !this.overtime) SFX.setMusic('run');   // ward 14 lets the building breathe again
    // SHADOW WARD: some floors flip dark — mirrored halls, shadow patients, double loot
    this.shadowWard = (this.depth >= 6 && !this.ascent && !this.bossRush)
      ? this.genSeed(['shadow', this.depth], () => U.chance(0.18))
      : false;
    if (this._forceShadow && !this.ward13) this.shadowWard = true;   // the elevator said so
    if (this.shadowWard) {
      for (const r of this.floorRooms) if (r.layout) r.layout = r.layout.map(row => row.slice().reverse());   // the halls are wrong-handed here
      this.setBanner('🌑 SHADOW WARD', 'the lights hum wrong here', 2.6);
      SFX.play('sting');
    }
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
    if (this.quietFloor) this.floorMods.countMul = (this.floorMods.countMul || 1) * 0.65;   // the quiet route: fewer patients
    this.floorDark = this.floorMods.dark || 0;
    // ward side-effect (satirical "curse") — a whole-floor modifier rolled at deeper wards
    this.sideEffect = (this.depth >= 3)
      ? this.genSeed(['sideeffect', this.depth], () => U.chance((this.intensity || 0) >= 6 ? 1 : 0.35) ? U.choice(DATA.SIDE_EFFECTS).id : null)
      : ((this.intensity || 0) >= 6 && this.depth >= 2 ? this.genSeed(['sideeffect', this.depth], () => U.choice(DATA.SIDE_EFFECTS).id) : null);
    // SPECIALTY WING: some wards belong to a themed wing — its own palette and crowd
    this.wing = this._routeWing || ((this.depth >= 4)
      ? this.genSeed(['wing', this.depth], () => U.chance(0.3) ? U.choice(DATA.WINGS.filter(w => !w.noRoll)).id : null)
      : null);
    if (this.ascent) this.wing = 'boardroom';   // the Ascent is Administration all the way up
    const wingDef = this.wing ? DATA.WINGS.find(w => w.id === this.wing) : null;
    this.wingPal = wingDef ? wingDef.pal : null;
    if (wingDef && wingDef.dark) this.floorDark = Math.max(this.floorDark, wingDef.dark);
    if (this.protocol === 'nightshift') this.floorDark = Math.max(this.floorDark, 0.55);   // the lights never come on
    if (this.shadowWard) {   // the shadow swallows whatever wing this was
      this.wingPal = { floor: '#2e2440', line: '#241c34', wall: '#3c2c52', trim: '#161020' };
      this.floorDark = Math.max(this.floorDark, 0.35);
    }
    if (this.ward13) {   // candlelit rot — ward 13 has its own weather
      this.wingPal = { floor: '#332838', line: '#281f2c', wall: '#452e3e', trim: '#140e16' };
      this.floorDark = Math.max(this.floorDark, 0.4);
    }
    // intercom floor commentary (once per run per floor)
    if (!this._icFloors) this._icFloors = {};
    for (const fd of [3, 7, 12]) if (this.depth === fd && !this._icFloors[fd]) { this._icFloors[fd] = 1; this.pa('floor' + fd); }
    if (this.player && this.player.pill == null) this._pillFloorMark = this.depth;   // the Intercom tracks pill neglect
    // THE AUDITOR: some floors, your file gets flagged (depth 6+)
    this.auditorArmed = (this.depth >= 6 && !this.bossRush)
      ? this.genSeed(['auditor', this.depth], () => U.chance(0.18))
      : false;
    this.auditorHp = null; this.auditorDown = false;
    // CODE GRAY: occasionally a whole ward goes into crisis (depth 4+)
    this.crisis = (this.depth >= 4)
      ? this.genSeed(['crisis', this.depth], () => U.chance((this.intensity || 0) >= 9 ? 0.45 : 0.2) ? U.choice(DATA.CRISES).id : null)
      : null;
    this.crisisT = this.crisis === 'lockdown' ? 75 : 0;
    this.crisisDone = false; this.crisisFail = false;
    if (this.crisis === 'outage') this.floorDark = Math.max(this.floorDark, 0.6);
    const p = this.player;
    // The Undiagnosed: a fresh opinion every floor
    if (p.baseDiag === 'undiag') {
      const pool = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia'].filter(d => d !== p.diag);
      const nd = this.genSeed(['rediag', this.depth], () => U.choice(pool));
      p.rediagnose(nd);
      this.toast('🦭 “Actually… it\'s ' + DATA.DIAG[nd].name + '. Definitely. Probably.”', DATA.DIAG[nd].color);
      SFX.play('stamp');
    }
    p.pillsThisFloor = 0;
    if (p.diag === 'depression' && !p.variant) p.blanket = true;   // High-Functioning has no blanket, only the mask
    if (p.variant && p.diag === 'ptsd') p._scar = 0;               // Weathered: the scars fade between floors
    p._rosaryUsed = false;   // the rosary recovers its one grace each floor
    if (p._gymAdd) { p.dmg -= p._gymAdd; }
    p._gymAdd = 0;
    if (p.flags.pillowHeal) p.heal(p.flags.synRested ? 4 : 2);
    if (p.flags.floorGrace) p.iframes = Math.max(p.iframes, 1.5);   // EMDR Reprocessing: a breath of grace each floor
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
    if (this.complications.length || this.sideEffect || this.crisis) setTimeout(() => {
      if (this.state !== 'run') return;
      SFX.play('error');
      for (const c of this.complications) this.toast('⚠ ' + c.name + ' — ' + c.desc, '#e0955a');
      if (this.sideEffect) { const se = DATA.SIDE_EFFECTS.find(s => s.id === this.sideEffect); if (se) this.toast(se.icon + ' SIDE EFFECT: ' + se.name + ' — ' + se.desc, '#b58ad0'); }
      if (this.crisis) { const cr = DATA.CRISES.find(c => c.id === this.crisis); if (cr) { this.toast(cr.icon + ' ' + cr.name + ' — ' + cr.desc, '#e06060'); SFX.play('boss'); } }
    }, 500);
    if (wingDef) { this.setBanner(wingDef.icon + ' ' + wingDef.name, wingDef.sub, 2.6); }
    if (p.diag === 'schizo' && U.chance(0.5)) setTimeout(() => { if (this.state === 'run') { this.toast(U.choice(DATA.VOICE_LINES), '#cbb8e8'); SFX.play('voice'); } }, 2500);
    this.saveCheckpoint();   // floor-start checkpoint (Continue on the title)
  },

  /* ---------- rooms ---------- */
  enterRoom(room, entryDir) {
    this.room = room;
    room.discovered = true;
    room.visited = true;
    // achievement tracking: the hazard-room tour
    if (['seclusion', 'ect', 'padded', 'observation'].includes(room.type)) {
      const hs = Meta.data.hazardsSeen || (Meta.data.hazardsSeen = {});
      if (!hs[room.type]) { hs[room.type] = 1; Meta.save(); this.checkUnlocks(); }
      this.goalEvent('hazard');
    }
    if (room.type === 'secret' && !room._goalCounted) { room._goalCounted = true; this.goalEvent('secret'); }
    for (const d in DIRS) {
      const n = this.roomAt(room.gx + DIRS[d].dx, room.gy + DIRS[d].dy);
      if (n && room.doors[d]) n.discovered = true;
    }
    // clear transients; contents live on the room object (shared refs)
    this.tears = []; this.eBullets = []; this.enemies = []; this.bombs = [];
    this.parts = []; this.texts = []; this.zones = []; this.stamps = [];
    this.playerFired = false; this.healBeam = null; this.slowmo = 0;
    this.tearsAura = false;
    this.hyperfixType = null;
    this.roomFade = 0.22;   // a soft blink crossing the threshold
    this._roomHits = 0;     // per-room damage tally (Day Room contracts)
    this._roomT0 = this.t;  // room-entry clock (the Intercom bills hourly)
    this._recap = [];       // fresh reel for the incident reconstruction
    // Rapid Cycling: every room re-prescribes you
    if (this.prognosis === 'rapid') {
      const sw = U.choice(DATA.RAPID_SWINGS);
      this.rapidMods = Object.assign({ dmg: 1, spd: 1, tears: 1, def: 1 }, sw.mods);
      this.toast('℞ ' + sw.name + ' — ' + sw.note, '#b86bff');
    }
    // Ultradian bipolar: the weather changes with every door
    if (this.player && this.player.variant && this.player.diag === 'bipolar' && !this.player.flags.stable) {
      this.player.mania = !this.player.mania; this.player.moodT = 0;
      if (room.type === 'normal' && !room.cleared) this.toast(this.player.mania ? '▲ mania rolls in' : '▼ the dip rolls in', this.player.mania ? '#e8c84c' : '#7a88b8');
    }
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
    if (p.allies) for (const a of p.allies) { a.x = p.x + U.rand(-36, 36); a.y = p.y + U.rand(-36, 36); }   // group files in with you
    if (p.pet) { p.pet.x = p.x - 30; p.pet.y = p.y + 14; p.pet.segs = []; }   // the animal keeps up
    if (this.p2) { this.p2.x = U.clamp(p.x + 38, RX + 16, RX + RW - 16); this.p2.y = p.y; }   // Patient Two files in behind you

    // THE AUDITOR follows you through the door
    if (this.auditorHp > 0 && !this.auditorDown) {
      const a = new Enemy('auditor', p.x < CW / 2 ? RX + RW - 70 : RX + 70, p.y < RY + RH / 2 ? RY + RH - 70 : RY + 70, this.depth, false, 1);
      a.hp = this.auditorHp; a.spawnT = 1.0;
      this.enemies.push(a);
    }
    // FIRE DRILL: the rooms you've already cleared are burning behind you
    if (this.crisis === 'firedrill' && room.cleared && (room.type === 'normal' || room.type === 'padded') && room.spawned) {
      for (let i = 0; i < 2; i++) {
        const zx = U.clamp(CW / 2 + U.rand(-RW * 0.3, RW * 0.3), RX + 60, RX + RW - 60);
        const zy = U.clamp(RY + RH / 2 + U.rand(-RH * 0.26, RH * 0.26), RY + 60, RY + RH - 60);
        if (U.dist(zx, zy, p.x, p.y) < 90) continue;
        this.zones.push(new Zone(zx, zy, 34, 40, 'ember', '#e07830'));
      }
    }

    if (!room.spawned) this.populateRoom(room);
    this.doorsOpen = room.cleared;
    const bossTheme = ['founder', 'thesystem', 'thecure'].includes(this.bossId) ? 'superboss' : 'boss';   // the big three get the dread theme
    if (room.type === 'boss' && !room.cleared && room.bossPending) {
      this.boss = new Boss(this.bossId, this.depth, this);
      if ((this.intensity || 0) >= 3) this.boss.aggr = (this.boss.aggr || 1) * 1.1;   // Intensity: management hustles
      // champion roll: past Ward 8, the rotation bosses can come back wrong
      if (this.depth >= 8 && !['walrus', 'thecure', 'founder', 'thesystem', 'theboard'].includes(this.bossId)) {
        const affix = this.genSeed(['champ', this.depth], () => U.chance(0.3) ? U.choice(DATA.BOSS_AFFIXES).id : null);
        if (affix) {
          const A = DATA.BOSS_AFFIXES.find(a => a.id === affix);
          this.boss.affix = affix; this.boss.affixTint = A.tint;
          if (affix === 'swift') this.boss.aggr = (this.boss.aggr || 1) * 1.25;
          this.boss.name = A.name + ' ' + this.boss.name;
          this.boss.sub = A.note;
        }
      }
      room.bossPending = false;
      SFX.play('vs');
      SFX.play('boss');
      SFX.setMusic(bossTheme);
    } else if (room.type === 'boss' && !room.cleared && room.bossObj) {
      this.boss = room.bossObj;
      SFX.setMusic(bossTheme);
    } else if (room.type === 'dayroom') {
      SFX.setMusic(this.room && this.room._basement ? 'basement' : 'dayroom');   // the one calm corner of the building
    } else {
      SFX.setMusic(this.ward13 ? 'ward13' : 'run');
    }
    if (room.type === 'clinic' && !room.cleared && room._minibossName && !room.greeted) { room.greeted = true; this.setBanner('⚕ ' + room._minibossName, 'office hours', 2.2); SFX.play('boss'); }
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
        if (p.flags.untreated) {   // Untreated: the Specialist has nothing for you — just a copay refund
          room.pickups.push(new Pickup('pill', CW / 2, RY + RH / 2));
          for (let i = 0; i < 3; i++) room.pickups.push(new Pickup('coin', CW / 2 + U.rand(-70, 70), RY + RH / 2 + U.rand(-40, 40)));
          break;
        }
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
        if (this.protocol === 'deductible') for (const pd of room.peds) if (pd.kind === 'item') pd.price = 10;   // nothing is free
        break;
      }
      case 'shop': {
        room.cleared = true;
        const copayMul = (1 + (this.depth - 1) * 0.07) * (this.protocol === 'deductible' ? 2 : 1) * (this.plan === 'bronze' ? 1.5 : this.plan === 'gold' ? 0.6 : 1) * ((this.intensity || 0) >= 2 ? 1.25 : 1);   // copays climb with the ward (it's the healthcare system, baby)
        const disc = (p.flags.discount ? 0.5 : (this.wardPath === 'outpatient' ? 0.75 : 1)) * (p.trinket === 'expiredcoupon' ? 0.7 : 1) * (p._facShopMul || 1);
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
        if (!p.flags.untreated) {   // Untreated keeps the consumables shelf, but no med pedestals
          const pool = U.shuffle(DATA.pickPool('shop', p.items));
          const src = pool.length ? pool : U.shuffle(DATA.POOLS.shop.slice());
          room.peds.push({ x: RX + 500, y: yi, itemId: src[0], kind: 'shop', price: px(12), taken: false, variant: 'brand' });
          room.peds.push({ x: RX + 300, y: yi, itemId: src[1] || src[0], kind: 'shop', price: px(7), taken: false, variant: 'generic' });
          room.peds.push({ x: RX + 110, y: yi, kind: 'restock', price: px(6), taken: false });
        }
        if (U.chance(0.3)) room.peds.push({ x: RX + RW - 90, y: yi, kind: U.choice(['vending', 'horoscope']), taken: false, uses: 3 });   // commissary corner
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
        if (U.chance(0.3)) room.peds.push({ x: RX + 90, y: RY + 100, kind: 'claw', taken: false, uses: 3 });   // a claw machine, walled up in here
        if (U.chance(0.4)) room.pickups.push(new Pickup('trinket', CW / 2 + U.rand(-60, 60), RY + RH / 2 - 60));   // someone's personal effects
        for (let i = 0; i < U.randi(2, 4); i++) room.pickups.push(new Pickup(U.choice(['coin', 'coin', 'nickel', 'pill']), CW / 2 + U.rand(-90, 90), RY + RH / 2 + U.rand(-60, 60)));
        if (U.chance(0.3) && !p.flags.untreated) {
          const pool = DATA.pickPool('special', p.items);
          room.peds.push({ x: CW / 2, y: RY + RH / 2, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
        }
        break;
      }
      case 'oon': {
        room.cleared = true;
        if (p.flags.untreated) { for (let i = 0; i < 4; i++) room.pickups.push(new Pickup('nickel', CW / 2 + U.rand(-70, 70), RY + RH / 2 + U.rand(-40, 40))); break; }
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
      case 'dayroom': {   // The Day Room — a sanctuary: a water cooler + a few other patients
        room.cleared = true;
        room.peds.push({ x: RX + 90, y: RY + RH / 2, kind: 'cooler', taken: false });
        if (U.chance(0.3)) room.pickups.push(new Pickup('trinket', CW / 2 - 120, RY + RH / 2 + 70));   // lost property
        const npcs = U.shuffle(DATA.DAYROOM.map((_, i) => i)).slice(0, 3);
        npcs.forEach((ni, k) => room.peds.push({ x: CW / 2 - 20 + k * 150, y: RY + RH / 2 + (k % 2 ? 40 : -20), kind: 'npc', npcId: ni, taken: false }));
        // and one patient looking for a group to join (The Support Group)
        room.peds.push({ x: RX + RW - 96, y: RY + RH / 2 - 30, kind: 'recruit', allyId: DATA.ALLIES[U.randi(0, DATA.ALLIES.length - 1)].id, taken: false });
        // the commissary corner: one machine per Day Room
        room.peds.push({ x: RX + 90, y: RY + 96, kind: U.choice(['vending', 'claw', 'horoscope']), taken: false, uses: 3 });
        // one patient has a side job for you (Day Room contract)
        room.peds.push({ x: CW / 2 + 40, y: RY + RH / 2 + 96, kind: 'contract', contractId: U.choice(DATA.CONTRACTS).id, taken: false });
        // Ward 8+: the exit is right there. it says so on the sign.
        if (this.depth >= 8) room.peds.push({ x: RX + RW - 90, y: RY + 96, kind: 'ama', taken: false });
        break;
      }
      case 'clinic': {   // The Clinic — a miniboss is holding office hours
        room.cleared = false;
        const mb = new Enemy(U.choice(['chargenurse', 'resident', 'orderly']), CW / 2, RY + 120, this.depth, false, 1);
        mb.noDrop = true; mb._miniboss = true;
        this.enemies.push(mb);
        room._minibossName = DATA.ENEMIES[mb.id].name;
        break;
      }
      case 'seclusion': {   // Seclusion Room — a sacrifice altar: bleed for escalating loot
        room.cleared = true;
        room.peds.push({ x: CW / 2, y: RY + RH / 2, kind: 'sacrifice', taken: false, count: 0 });
        break;
      }
      case 'ect': {   // ECT Suite — a prize under a pulsing electrical discharge
        room.cleared = true; room._ectActive = true; room._shockT = 1.2;
        const pool = DATA.pickPool('special', p.items);
        room.peds.push({ x: CW / 2, y: RY + RH / 2 + 10, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false, ectGuard: true });
        break;
      }
      case 'padded': {   // Padded Cell — every bullet bounces; a combat room with extra reward
        room.cleared = false; room.bouncy = true;
        spawnEnemiesForRoom(room, this.depth, this);
        room.pickups.push(new Pickup('half', RX + 70, RY + 70));
        room.pickups.push(new Pickup('nickel', RX + RW - 70, RY + RH - 70));
        break;
      }
      case 'observation': {   // Observation Room — evade the surveillance sweep long enough and you're discharged
        room.cleared = true; room._watchT = 0; room._watchAng = 0; room._watchDone = false;
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
      if (this.player.trinket === 'masterkey') {   // the Janitor's copy — everything opens
        target.lockOpen = true;
        this.toast('🗝 The Master Key turns. Of course it does.', '#e8c84c');
        SFX.play('keyturn');
      } else if (this._preApproved > 0) {   // PRIOR AUTHORIZATION's parting gift
        this._preApproved--;
        target.lockOpen = true;
        this.toast('✅ PRE-APPROVED. (' + this._preApproved + ' left)', '#8fd05a');
        SFX.play('keyturn');
      } else if (this.player.keys > 0) {
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
    this.goalEvent('room');
    if ((this._roomHits || 0) === 0) this.contractEvent('cleanroom');   // Look Untouchable
    if (room.type === 'clinic') this.contractEvent('miniboss');        // Office Politics
    this._cleanStreak = (this._roomHits || 0) === 0 ? (this._cleanStreak || 0) + 1 : 0;
    if (this._ic && !(this._ic.cds.fast > 0) && this.t - (this._roomT0 || 0) < 5) { this._ic.cds.fast = 110; this.pa('fast'); }
    // Shadow Ward: the dark pays double
    if (this.shadowWard) for (let i = 0; i < 2; i++) this.pickups.push(new Pickup(U.choice(['coin', 'coin', 'nickel', 'half']), CW / 2 + U.rand(-60, 60), RY + RH / 2 + U.rand(-40, 40)));
    // pet XP: 40 rooms together changes an animal
    if (p.pet) {
      const xp = Meta.data.petXp || (Meta.data.petXp = {});
      xp[p.pet.type] = (xp[p.pet.type] || 0) + 1;
      if (xp[p.pet.type] === 40) {
        p.pet.evo = true;
        const names = { pigeon: 'THE CARRIER PIGEON', cat: 'SENIOR OFFICE CAT', snake: 'THE EXTENDED METAPHOR', goldfish: 'TWO GOLDFISH (they remember each other)' };
        this.toast('✨ Your companion evolved: ' + (names[p.pet.type] || p.pet.type) + '!', '#e8c84c');
        SFX.play('evolve');
        Meta.save();
        this.checkUnlocks();
      }
    }
    // THE JANITOR: he appears where the mess was (10%, once a floor)
    if (!this._janitorFloor && (room.type === 'normal' || room.type === 'padded') && U.chance(0.1)) {
      this._janitorFloor = true;
      const pool = U.shuffle([].concat(DATA.POOLS.special, DATA.POOLS.shop)).filter(id => !p.items.includes(id));
      this.peds.push({ x: CW / 2 + U.rand(-80, 80), y: RY + RH / 2 + U.rand(-30, 30), kind: 'janitor', itemId: pool[0] || DATA.POOLS.special[0], price: U.randi(5, 9), taken: false, _greeted: false });
      SFX.play('door');
    }
    SFX.play('door');
    if (p.flags.gratitude && U.chance(0.25)) { p.heal(1); this.texts.push(new FloatText(p.x, p.y - 24, 'grateful +♥', '#8fd05a')); }
    if (p.diag === 'insomnia') {
      if (p.wired && !Meta.data.everWiredClear) { Meta.data.everWiredClear = 1; Meta.save(); this.checkUnlocks(); }   // Tired & Wired
      p.sleep = U.clamp(p.sleep + 16, 0, 100);   // a moment's quiet lets you catch your breath
    }
    if (p.diag === 'burnout') p.battery = U.clamp(p.battery + 25, 0, 100);   // the room is done. breathe.
    if (p.allies) for (const a of p.allies) a.revive();   // downed group members get back up between rooms
    if (this.p2 && this.p2._downT > 0) { this.p2._downT = 0; this.p2.hp = Math.max(2, Math.ceil(this.p2.maxhp / 2)); this.p2.iframes = 2; this.toast('🎮 PATIENT TWO is back up. They saw everything.', '#8fd08a'); }
    // SURPRISE INSPECTION: the sweep may confiscate the pill you're holding
    if (this.crisis === 'inspection' && p.pill != null && U.chance(0.25)) {
      p.pill = null;
      this.toast('📋 Contraband confiscated. "It\'s policy."', '#e0955a');
      SFX.play('error');
    }
    if (p.flags.gym && p._gymAdd < 1.5) { p._gymAdd += 0.15; p.dmg += 0.15; }
    if (U.chance(0.03)) this.pickups.push(new Pickup('trinket', CW / 2 + U.rand(-50, 50), RY + RH / 2));
    if (U.chance((this.intensity || 0) >= 8 ? 0.2 : this.quietFloor ? 0.25 : 0.4)) {   // Intensity 8+/quiet route: the ward stops tipping
      const type = U.choice(['coin', 'coin', 'half', 'pill', 'coin', 'key', 'bomb']);
      this.pickups.push(new Pickup(type, CW / 2 + U.rand(-40, 40), RY + RH / 2 + U.rand(-30, 30)));
    }
    // Challenge Protocols with room-clear clauses
    if (this.protocol === 'maximumdose') this.pickups.push(new Pickup('pill', CW / 2 + U.rand(-50, 50), RY + RH / 2 + U.rand(-30, 30)));
    if (this.protocol === 'wordsalad' && U.chance(0.3)) {
      const pool = DATA.pickPool('special', p.items);
      const id = U.choice(pool.length ? pool : DATA.POOLS.special);
      p.addItem(id, this);
      this.toast('🥗 dispensed: ' + DATA.ITEMS[id].name, '#9db85a');
    }
    // THE AUDITOR wakes: your first cleared room opened the file
    if (this.auditorArmed && this.auditorHp == null && !this.auditorDown && room.type === 'normal') {
      this.auditorArmed = false;
      const a = new Enemy('auditor', RX + 60, RY + 60, this.depth, false, 1);
      a.spawnT = 0.8;
      this.enemies.push(a);
      this.auditorHp = a.hp;
      this.setBanner('🔔 THE AUDITOR', 'a discrepancy was found — it has your file', 2.8);
      this.toast('It will follow you. Doors mean nothing to it.', '#e05a5a');
      SFX.play('boss');
    }
    // The Clinic pays out: the miniboss was guarding a med
    if (room.type === 'clinic' && !room._clinicPaid) {
      room._clinicPaid = true;
      this.genSeed(['clinic', this.depth, room.gx, room.gy], () => {
        const pool = DATA.pickPool('special', p.items);
        room.peds.push({ x: CW / 2, y: RY + RH / 2, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
      });
      this.toast('⚕ Office hours are over.', '#8fd05a');
    }
    // In Recovery: the work pays off — heal every 2nd room cleared
    if (p.flags.recovery) {
      p._recRooms = (p._recRooms || 0) + 1;
      if (p._recRooms % 2 === 0) { p.heal(1); this.texts.push(new FloatText(p.x, p.y - 24, 'the work helps +♥', '#8fd05a')); }
    }
    // Ultradian bipolar: clearing a room in the dip mends a heart
    if (p.variant && p.diag === 'bipolar' && !p.mania && !p.flags.stable) { p.heal(2); this.texts.push(new FloatText(p.x, p.y - 24, 'rest, in the dip +♥', '#7a88b8')); }
    // PTSD: the room you just fought in doesn't stay safe — flashback trigger-zones linger (base only)
    if (p.diag === 'ptsd' && !p.variant && room.spawned) {
      for (let i = 0; i < 2; i++) {
        const zx = U.clamp(CW / 2 + U.rand(-RW * 0.32, RW * 0.32), RX + 60, RX + RW - 60);
        const zy = U.clamp(RY + RH / 2 + U.rand(-RH * 0.28, RH * 0.28), RY + 60, RY + RH - 60);
        if (U.dist(zx, zy, p.x, p.y) < 90) continue;   // don't drop one on top of you
        this.zones.push(new Zone(zx, zy, 26, 40, 'trigger', '#c25a52'));
      }
    }
  },

  onBossDead() {
    const room = this.room, p = this.player;
    // SPARRING: bow, towel off, back to the gallery
    if (this.practice) {
      room.cleared = true;
      this.toast('🥊 Bout won. The chart is unimpressed but you know.', '#8fd0e0');
      SFX.play('fanfare');
      setTimeout(() => { if (this.practice) { this.practice = false; this.showBestiary(); } }, 1800);
      return;
    }
    // OVERTIME: no rewards, no trapdoor — just the next wave
    if (this.overtime) {
      this.stats.bosses++;
      room.cleared = false;
      if (this.p2 && this.p2._downT > 0) { this.p2._downT = 0; this.p2.hp = Math.max(2, Math.ceil(this.p2.maxhp / 2)); this.p2.iframes = 2; }
      this.pickups.push(new Pickup('full', CW / 2, RY + RH / 2));
      this.toast('⏰ Management clocked out. The floor didn\'t.', '#e8c84c');
      this.overtime.spawnT = 3.5;
      return;
    }
    room.cleared = true;
    this.doorsOpen = true;
    const spared = this.boss && this.boss._spared;
    if (!spared) { this.stats.bosses++; }
    else {
      (Meta.data.sparedBosses || (Meta.data.sparedBosses = {}))[this.bossId] = 1;
      Meta.save();
      this.toast('✌ Spared. The chart will say "resolved amicably." The chart is lying, but kindly.', '#8fd0e0');
    }
    if (this.p2 && this.p2._downT > 0) { this.p2._downT = 0; this.p2.hp = Math.max(2, Math.ceil(this.p2.maxhp / 2)); this.p2.iframes = 2; this.toast('🎮 PATIENT TWO is back up. They saw everything.', '#8fd08a'); }
    if (!spared) this.goalEvent('boss');
    Meta.data.bestFloor = Math.max(Meta.data.bestFloor, this.depth);
    if (!Meta.data.diagBest) Meta.data.diagBest = {};
    Meta.data.diagBest[p.diag] = Math.max(Meta.data.diagBest[p.diag] || 0, this.depth);
    // THE CURE (Ward 25): the (non-)finale — mark cured, unlock Chronic Mode
    if (this.bossId === 'thecure') {
      this._cureBeaten = true;
      this._runCured = true;   // run log: this run reached the ending
      if (!Meta.data.cured) { Meta.data.cured = 1; Meta.data.chronicUnlocked = 1; }
      (Meta.data.seenStory || (Meta.data.seenStory = {})).epilogue = 1;   // the epilogue opens in Chart Notes
      if (this.chronic) Meta.data.chronicBest = Math.max(Meta.data.chronicBest || 0, this.depth);
    }
    // THE FOUNDER (Ward 50): the real superboss — prestige
    if (this.bossId === 'founder') {
      this._founderBeaten = true;
      this._runFounder = true;
      Meta.data.founderKills = (Meta.data.founderKills || 0) + 1;
    }
    // Challenge Protocol completed: survive the rule-set to the Ward-5 boss
    if (this.protocol && this.depth >= 5 && !(Meta.data.protocolsDone || {})[this.protocol]) {
      (Meta.data.protocolsDone || (Meta.data.protocolsDone = {}))[this.protocol] = 1;
      Meta.data.insight = (Meta.data.insight || 0) + 25;
      const P = DATA.PROTOCOLS.find(x => x.id === this.protocol);
      this.toast('🧪 PROTOCOL COMPLETE: ' + (P ? P.name : this.protocol) + ' — +◆25 Insight', '#8fd0e0');
      SFX.play('fanfare');
    }
    // THE SYSTEM (Ward 100): the true ceiling
    if (this.bossId === 'thesystem') {
      this._systemBeaten = true;
      Meta.data.systemKills = (Meta.data.systemKills || 0) + 1;
    }
    // THE BOARD (top of the Ascent): motion denied
    if (this.bossId === 'theboard') {
      this._boardBeaten = true;
      this.ascent = false;   // the only way from here is back down
      Meta.data.boardKills = (Meta.data.boardKills || 0) + 1;
    }
    Meta.save();
    this.checkUnlocks();
    // rewards (seeded per ward so a daily's boss loot & OON door match for everyone)
    this.genSeed(['reward', this.depth], () => {
      const bossPool = DATA.POOLS.boss;
      if (p.flags.untreated) { for (let i = 0; i < 4; i++) this.pickups.push(new Pickup(i ? 'coin' : 'pill', CW / 2 + U.rand(-70, 70), RY + RH / 2 + U.rand(-30, 30))); }
      else room.peds.push({ x: CW / 2 - 90, y: RY + RH / 2 + 40, itemId: U.choice(bossPool), kind: 'boss', taken: false, price: this.plan === 'bronze' ? 6 : 0 });   // BRONZE: nothing is covered
      if (this.bossId === 'walrus' && !p.flags.untreated) {
        const pool = DATA.pickPool('special', p.items);
        room.peds.push({ x: CW / 2 + 90, y: RY + RH / 2 + 40, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'boss', taken: false });
      }
      this.pickups.push(new Pickup('full', CW / 2 + U.rand(-60, 60), RY + RH / 2 - 40));
      this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-80, 80), RY + RH / 2));
      if (this.boss && this.boss.affix) {   // champion bounty
        this.pickups.push(new Pickup('nickel', CW / 2 - 50, RY + RH / 2 + 30));
        this.pickups.push(new Pickup('pill', CW / 2 + 50, RY + RH / 2 + 30));
      }
      // THE DRUG REP (35%, depth 3+): free samples. every one of them comes with a string attached.
      if (this.depth >= 3 && !p.flags.untreated && U.chance(0.35)) {
        const rx0 = CW / 2 + 190, ry0 = RY + RH / 2 + 70;
        room.peds.push({ x: rx0, y: ry0 - 46, kind: 'drugrep', taken: false });
        const pool = DATA.pickPool('boss', p.items);
        const src = U.shuffle(pool.length >= 2 ? pool : DATA.POOLS.boss.slice());
        const fxs = U.shuffle(DATA.SAMPLE_FX.map(f => f.id));
        for (let i = 0; i < 2; i++) {
          room.peds.push({ x: rx0 - 55 + i * 110, y: ry0 + 34, itemId: src[i % src.length], kind: 'sample', fx: fxs[i], taken: false, repGroup: 'rep' + this.depth });
        }
        this.toast('“Doctor! Great news about your condition. Have you met our new friend?”', '#8fd08a');
      }
      // WARD 13 pays out the one thing the building never meant to give you
      if (this.ward13) {
        const mk = new Pickup('trinket', CW / 2 + 130, RY + RH / 2 - 40);
        mk.trinketId = 'masterkey';
        this.pickups.push(mk);
        this.toast('🗝 Something fell from the rafters. It looks… important.', '#e8c84c');
      }
      room.trapdoor = this.trapdoor = { x: CW / 2, y: RY + RH / 2 - 100 };
      // Ward 5 only: the service elevator opens beside the trapdoor — the other direction
      if (this.depth === 5 && !this.ascent) {
        room.peds.push({ x: CW / 2 + 170, y: RY + RH / 2 - 100, kind: 'elevator', taken: false });
        this.toast('🛗 A service elevator dings open. It only goes UP.', '#c8a24a');
      }
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
    if (this._systemBeaten) { this._systemBeaten = false; setTimeout(() => { if (this.state === 'run') this.showSystemEnding(); }, 900); }
    if (this._boardBeaten) { this._boardBeaten = false; setTimeout(() => { if (this.state === 'run') { if (storyOn) Story.play('board', () => this.showBoardEnding()); else this.showBoardEnding(); } }, 900); }
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
    if (p.flags.noPills) { if (this.lockCd <= 0) { this.lockCd = 1.2; this.toast('Cold turkey. No pills.', '#8ab0d0'); SFX.play('error'); } return; }
    if (p.pill == null) return;
    const pillIdx = this.pillAssign[p.pill];
    const pill = DATA.PILLS[pillIdx];
    p.pill = null;
    p.pillsThisFloor++;
    this.goalEvent('pill');
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
    if (this.floorHits === 0) this.goalEvent('floorclean');   // Clean Bill
    if (this.p2 && !Meta.data.everCoop) { Meta.data.everCoop = 1; Meta.save(); this.checkUnlocks(); }   // Group Rate
    // speedrun split: time-to-clear this ward vs your PB
    if (Meta.data.speedrun && this.runTime != null && !this.dailyKind && !this.overtime) {
      this.splits = this.splits || [];
      this.splits.push(this.runTime);
      const key = this.player.baseDiag === 'undiag' ? 'undiag' : this.player.diag;
      const pb = (Meta.data.splitsPB || (Meta.data.splitsPB = {}))[key];
      const i = this.splits.length - 1;
      const prev = pb && pb.splits && pb.splits[i] != null ? pb.splits[i] : null;
      this._lastSplitDelta = prev != null ? this.runTime - prev : null;
      const fmt = (t) => Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2);
      this.toast('⏱ Ward ' + this.depth + ' — ' + fmt(this.runTime) + (this._lastSplitDelta != null ? ' (' + (this._lastSplitDelta <= 0 ? '−' : '+') + Math.abs(this._lastSplitDelta).toFixed(1) + 's)' : ''), this._lastSplitDelta != null && this._lastSplitDelta <= 0 ? '#8fd05a' : '#e0a05a');
      // PB: deepest, then fastest to that depth
      if (!pb || this.splits.length > pb.splits.length || (this.splits.length === pb.splits.length && this.runTime < pb.total)) {
        Meta.data.splitsPB[key] = { total: this.runTime, splits: this.splits.slice() };
        Meta.save();
      }
    }
    // ALL-NIGHTER: the candle burns at both ends
    if (this.player && this.player.variant && this.player.diag === 'insomnia') {
      this.player.hp = Math.max(1, this.player.hp - 1);
      this.toast('☕ another floor, no sleep. −½♥', '#c8a878');
    }
    // CODE GRAY hazard pay: you worked the crisis ward and lived
    if (this.crisis && !this.crisisFail) {
      const p = this.player;
      if (this.crisis === 'inspection' && p.pill != null) { p.luck += 1; p.coins += 4; this.toast('📋 Passed inspection, contraband intact. +4¢, +1 luck.', '#8fd05a'); Meta.data.crisesSurvived = (Meta.data.crisesSurvived || 0) + 1; }
      else if (this.crisis !== 'lockdown' && this.crisis !== 'inspection') { p.coins += 4; this.toast(DATA.CRISES.find(c => c.id === this.crisis).icon + ' Hazard pay: +4¢.', '#8fd05a'); Meta.data.crisesSurvived = (Meta.data.crisesSurvived || 0) + 1; }
      else if (this.crisis === 'lockdown' && this.crisisDone) { Meta.data.crisesSurvived = (Meta.data.crisesSurvived || 0) + 1; }
      Meta.save();
      this.checkUnlocks();   // Crisis Counselor may have just landed
    }
    this.state = 'descend';
    this.descendT = 0;
    this._descended = false;
    SFX.play('descend');
  },
  offerComorbidity() {   // THE ELEVATOR: choose your next ward — comorbidity bundled, floor forecast posted
    if (!DATA.COMORBIDITIES || !DATA.COMORBIDITIES.length) { this.doDescend(); return; }
    // seeded so a daily's options match for everyone — the pick is still yours
    const ROUTES = [
      { id: 'none',    tag: '🏥 standard rotation — as forecast', mod: null },
      { id: 'wing',    tag: null, mod: 'wing' },
      { id: 'shadow',  tag: '🌑 the SHADOW WARD — dark, mirrored, double loot', mod: 'shadow' },
      { id: 'pharm',   tag: '💊 an extra pharmacy is stocked on this route', mod: 'pharm' },
      { id: 'dayroom', tag: '☕ a Day Room is guaranteed down there', mod: 'dayroom' },
      { id: 'quiet',   tag: '🕊 a quiet ward — fewer patients, less loot', mod: 'quiet' }
    ];
    const picks = this.genSeed(['ward', this.depth], () => {
      const cos = U.shuffle(DATA.COMORBIDITIES).slice(0, 3);
      const rts = U.shuffle(ROUTES.slice());
      return ['inpatient', 'outpatient', 'day'].map((pk, i) => {
        const rt = rts[i % rts.length];
        const wingPick = rt.mod === 'wing' ? U.choice(DATA.WINGS.filter(w => !w.noRoll)) : null;
        return { path: pk, co: cos[i], route: rt.id, routeMod: rt.mod, wingPick: wingPick ? wingPick.id : null, routeTag: wingPick ? (wingPick.icon + ' this route runs through ' + wingPick.name) : rt.tag };
      });
    });
    this.state = 'comorbid';
    SFX.play('elevator');
    const cards = picks.map((it, i) => {
      const w = DATA.WARD_PATHS[it.path];
      return `<button class="cmcard wardcard" data-i="${i}">
        <div class="wardname">${w.name}</div>
        <div class="cmdesc">${w.desc}</div>
        <div class="cmtag">🧬 ${it.co.name} — ${it.co.desc}</div>
        <div class="cmtag" style="color:#8fb8d0">${it.routeTag}</div>
      </button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">🛗 THE ELEVATOR</h1>
        <div class="tagline">B${this.depth + 1} — three routes down. each bundles a comorbidity; the forecast is posted. the elevator music is not optional.</div>
        <div class="cmgrid">${cards}</div>
        <button class="btn minor" id="bComorbidSkip">take the stairs (no ward bonus, no comorbidity, standard floor)</button>
      </div>`);
    document.querySelectorAll('.wardcard').forEach(b => b.onclick = () => {
      const it = picks[+b.dataset.i];
      SFX.play('elevator');
      this.wardPath = it.path;
      this._routeMod = { mod: it.routeMod, wing: it.wingPick };
      try { it.co.apply(this.player, this); } catch (e) { }
      (this.player.comorbidities || (this.player.comorbidities = [])).push(it.co.id);
      this.checkComorbidSynergy();
      this.toast('→ ' + DATA.WARD_PATHS[it.path].name + ' · ' + it.co.name, '#b8e0a0');
      this.hideOverlay();
      this.doDescend();
    });
    document.getElementById('bComorbidSkip').onclick = () => { SFX.play('ui'); this.wardPath = 'day'; this._routeMod = null; this.hideOverlay(); this.doDescend(); };
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
    if (this.state === 'hub') { this.t += dt; this.hubUpdate(dt); return; }
    if (this.state === 'appeal') { this.t += dt; this.appealUpdate(dt); return; }
    if (this.state === 'credits') { this.t += dt; this.creditsUpdate(dt); return; }
    if (this.state !== 'run') return;
    this.t += dt;
    this.doorCd -= dt; this.lockCd -= dt; this.machineCd = (this.machineCd || 0) - dt;
    if (this.roomFade > 0) this.roomFade -= dt;
    this.shake *= Math.pow(0.001, dt); if (this.shake < 0.3) this.shake = 0;
    this.enemySlow -= dt;
    let dtarget = this.darkTarget;
    const bossDark = this.boss && !this.boss.dead && (this.boss.id === 'stigma' || this.boss.id === 'dsm');
    if (!bossDark) {
      dtarget = Math.max(this.player.diag === 'depression' ? 0.14 : 0, this.floorDark || 0);
      if (this.player.diag === 'insomnia' && this.player.wired) dtarget = Math.max(dtarget, 0.16 + (1 - this.player.sleep / 35) * 0.34);   // the ward dims as you tire
      this.darkTarget = dtarget;
    }
    this.dark = U.lerp(this.dark, dtarget, U.clamp(dt * 2.5, 0, 1));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter(t => t.t < t.dur);
    if (this.healBeam) { this.healBeam.t -= dt; if (this.healBeam.t <= 0) this.healBeam = null; }

    const p = this.player;
    this.playerFired = false;
    this.slowmo = Math.max(0, (this.slowmo || 0) - dt * (p.trinket === 'batteredwatch' ? 0.5 : 1));
    p.update(dt, this);   // PTSD near-miss / 5-4-3-2-1 may bump this.slowmo
    const smf = this.slowmo > 0 ? 0.4 : 1;   // hypervigilance: the threats crawl, you don't

    // inputs
    if (Input.take('ability')) p.useAbility(this);
    if (Input.take('pill')) this.usePill();
    if (Input.take('bomb') && p.bombs > 0 && this.state === 'run') {
      p.bombs--;
      this.bombs.push(new BombEnt(p.x, p.y));
      this.goalEvent('bomb');
      SFX.play('ui');
    }
    if (Input.take('pause')) { this.showPause(); return; }
    if (Input.take('mute')) { const mu = SFX.toggleMute(); this.toast(mu ? 'muted' : 'unmuted'); }

    // entities (slowmo scales the threats; the player and their tears stay at full speed)
    for (const e of this.enemies) e.update(dt * smf, this);
    this.enemies = this.enemies.filter(e => !e.dying);
    if (this.boss) this.boss.update(dt * smf, this);
    for (const t of this.tears) t.update(dt, this);
    this.tears = this.tears.filter(t => !t.dead);
    for (const b of this.eBullets) b.update(dt * smf, this);
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

    // THE 20-MINUTE SLOT: the appointment is ending
    if (this.protocol === 'timeslot' && this.protoT != null && !p.dead) {
      this.protoT -= dt;
      if (this.protoT <= 60 && !this._slotWarned) { this._slotWarned = true; this.toast('⏰ One minute remaining in your slot.', '#e0a05a'); SFX.play('error'); }
      if (this.protoT <= 0) {
        p._lastSrc = 'timeslot'; p.hp = 0; p.dead = true;
        this.toast('⏰ Your time is up. Thank you for choosing us.', '#e05a5a');
        SFX.play('die');
      }
    }

    // CODE GRAY: LOCKDOWN — clear every ward room before the doors seal
    if (this.crisis === 'lockdown' && !this.crisisDone && !this.crisisFail) {
      this.crisisT -= dt;
      const combat = this.floorRooms.filter(r => r.type === 'normal' || r.type === 'padded');
      if (combat.length && combat.every(r => r.cleared)) {
        this.crisisDone = true;
        p.heal(2); p.coins += 5;
        this.toast('🚨 LOCKDOWN CLEARED — hazard pay: +5¢, patched up.', '#8fd05a');
        SFX.play('item');
      } else if (this.crisisT <= 0) {
        this.crisisFail = true;
        this.toast('🚨 Lockdown lifted. The moment passed you by.', '#e0955a');
        SFX.play('error');
      }
    }

    // hazard rooms — the per-frame threats
    const room = this.room;
    if (room.type === 'ect') {   // ECT Suite: the fixture discharges on a cycle until the prize is claimed
      room._ectActive = room.peds.some(pd => pd.ectGuard && !pd.taken);
      if (room._ectActive) {
        room._shockT = (room._shockT || 0) - dt;
        if (room._shockT <= 0) {
          room._shockT = 2.7;
          const cx = CW / 2, cy = RY + 40, n = 10 + Math.min(9, this.depth);
          for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (room._spin = (room._spin || 0) + 0.35); const b = new EBullet(cx, cy, Math.cos(a) * 210, Math.sin(a) * 210, 1, '#bfe3ff'); b._src = 'ect'; this.eBullets.push(b); }
          this.shake = Math.max(this.shake, 7); SFX.play('boom');
        }
      }
    } else if (room.type === 'observation' && !room._watchDone) {   // Observation: dodge the surveillance sweep to earn discharge
      room._watchAng = (room._watchAng || 0) + dt * 1.15;
      room._watchT = (room._watchT || 0) + dt;
      const camX = CW / 2, camY = RY + 26;
      const beamA = Math.sin(room._watchAng) * 1.15 + Math.PI / 2;   // sweeps a cone across the floor
      const toP = Math.atan2(p.y - camY, p.x - camX);
      const da = Math.atan2(Math.sin(toP - beamA), Math.cos(toP - beamA));
      if (Math.abs(da) < 0.12 && p.iframes <= 0) { p.hurt(1, this, 'observation'); room._watchT = Math.max(0, room._watchT - 3.5); this.toast('SEEN.', '#e0d060'); }
      if (room._watchT >= 9) {
        room._watchDone = true;
        const pool = DATA.pickPool('special', this.player.items);
        this.peds.push({ x: CW / 2, y: RY + RH / 2, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
        this.toast('Cleared for discharge.', '#8fd05a'); SFX.play('item');
      }
    }

    // room clear (charmed allies don't count as threats keeping the doors shut)
    const aud = this.enemies.find(e => e.id === 'auditor' && !e.dying);
    if (aud) this.auditorHp = aud.hp;   // the file follows you
    // lone-survivor impatience: the last patient in a room eventually comes to YOU
    const liveNow = this.enemies.filter(e => !e.dying && !e.charmed && e.id !== 'auditor' && !e.fake);
    const noAggro = liveNow.length > 0 && liveNow.every(e => ['mirror', 'mimic', 'shooter', 'larper', 'bounce', 'ticket', 'buffer', 'shieldbot'].includes(e.beh));
    if ((liveNow.length === 1 || noAggro) && this.room && !this.room.cleared) {
      this._loneT = (this._loneT || 0) + dt;
      if (this._loneT > 14) for (const e of liveNow) e._impatient = true;   // even the symptoms get bored
    } else this._loneT = 0;
    const hostiles = this.enemies.some(e => !e.charmed && e.id !== 'auditor');   // the Auditor never blocks the doors — run if you want
    if (!room.cleared && (room.type === 'normal' || room.type === 'padded' || room.type === 'clinic') && room.spawned && !hostiles) this.onRoomCleared();
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
      } else if (ped.kind === 'cooler') {   // Day Room water cooler
        if (p.hp < p.maxhp) { p.heal(p.flags.bigCooler ? 3 : 2); ped.taken = true; this.texts.push(new FloatText(ped.x, ped.y - 30, '+♥ hydrated', '#8fd0e0')); SFX.play('heal'); }
        else if (this.lockCd <= 0) { this.lockCd = 1.0; this.toast('You feel fine. Physically.', '#8fd0e0'); }
      } else if (ped.kind === 'sacrifice') {   // Seclusion Room — bleed on the altar for escalating loot
        if (p.iframes <= 0 && this.lockCd <= 0) {
          this.lockCd = 0.6;
          ped.count = (ped.count || 0) + 1;
          if (ped.count >= 4 && U.chance(0.55)) {   // a deep sacrifice: the ward finally provides
            const pool = DATA.pickPool('special', p.items);
            this.peds.push({ x: ped.x, y: ped.y - 62, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
            ped.taken = true;
            this.toast('The ward provides.', '#d08a8a'); SFX.play('item');
          } else {
            const n = 1 + Math.floor(ped.count / 2);
            for (let i = 0; i < n; i++) this.pickups.push(new Pickup(U.choice(['coin', 'coin', 'nickel', 'pill', 'bomb', 'key']), ped.x + U.rand(-46, 46), ped.y + U.rand(34, 64)));
            this.texts.push(new FloatText(ped.x, ped.y - 30, '−♥ offered', '#d08a8a'));
          }
          p.hurt(1, this, 'sacrifice');   // hurt() sets i-frames, so you can't spam the altar
          this.shake = Math.max(this.shake, 6);
        }
      } else if (ped.kind === 'elevator') {   // the Ascent: ride up into Administration
        ped.taken = true;
        this.ascent = true; this.ascentBase = this.depth;
        this.wardPath = 'inpatient';   // executive floors: tougher, richer
        this.setBanner('🏢 THE ASCENT', 'administration level A1', 2.4);
        this.toast('The doors close. The muzak is somehow worse up here.', '#c8a24a');
        SFX.play('descend');
        this.doDescend();
        return;
      } else if (ped.kind === 'vending') {   // Commissary: 3¢ for whatever falls
        if (this.machineCd <= 0) {
          if (p.coins < (p.trinket === 'wristband' ? 2 : 3)) { if (this.lockCd <= 0) { this.lockCd = 1.2; this.texts.push(new FloatText(ped.x, ped.y - 44, 'need 3¢', '#e8c84c')); SFX.play('error'); } }
          else {
            this.machineCd = 1.1; p.coins -= (p.trinket === 'wristband' ? 2 : 3); ped.uses--;
            const roll = Math.random(); SFX.play('coin');
            if (roll < 0.42) { p.heal(1); this.texts.push(new FloatText(ped.x, ped.y - 40, '🍫 snack +♥', '#8fd05a')); }
            else if (roll < 0.60) { this.pickups.push(new Pickup('pill', ped.x + 26, ped.y + 30)); this.texts.push(new FloatText(ped.x, ped.y - 40, '💊 something rolled out', '#b86bff')); }
            else if (roll < 0.74) { this.pickups.push(new Pickup('bomb', ped.x + 26, ped.y + 30)); this.texts.push(new FloatText(ped.x, ped.y - 40, '📄 claim form!', '#e0a05a')); }
            else if (roll < 0.86) { p.coins += 7; this.toast('🎰 JACKPOT — the machine pays out.', '#e8c84c'); SFX.play('item'); }
            else { this.texts.push(new FloatText(ped.x, ped.y - 40, 'CLUNK. nothing falls.', '#a89a8a')); SFX.play('error'); this.shake = Math.max(this.shake, 3); }
            if (ped.uses <= 0) { ped.taken = true; this.toast('The vending machine flickers: OUT OF ORDER.', '#a89a8a'); }
          }
        }
      } else if (ped.kind === 'claw') {   // Commissary: 5¢, three tries at the plush
        if (this.machineCd <= 0) {
          if (p.coins < (p.trinket === 'wristband' ? 4 : 5)) { if (this.lockCd <= 0) { this.lockCd = 1.2; this.texts.push(new FloatText(ped.x, ped.y - 44, 'need 5¢', '#e8c84c')); SFX.play('error'); } }
          else {
            this.machineCd = 1.2; p.coins -= (p.trinket === 'wristband' ? 4 : 5); ped.uses--;
            const chance = Math.min(0.6, 0.25 + (p.luck || 0) * 0.05);
            if (U.chance(chance)) {
              ped.taken = true;
              p.familiars.push(new Familiar('plush'));
              this.toast('🧸 THE CLAW CAME THROUGH — a plush walrus joins you!', '#e8c84c'); SFX.play('item');
            } else {
              this.texts.push(new FloatText(ped.x, ped.y - 40, 'the claw dropped it…', '#a89a8a')); SFX.play('error');
              if (ped.uses <= 0) { ped.taken = true; this.toast('The claw machine has taken enough from you.', '#a89a8a'); }
            }
          }
        }
      } else if (ped.kind === 'horoscope') {   // Commissary: 2¢ for your fortune (it's binding)
        if (this.machineCd <= 0) {
          if (p.coins < (p.trinket === 'wristband' ? 1 : 2)) { if (this.lockCd <= 0) { this.lockCd = 1.2; this.texts.push(new FloatText(ped.x, ped.y - 44, 'need 2¢', '#e8c84c')); SFX.play('error'); } }
          else {
            this.machineCd = 1.4; p.coins -= (p.trinket === 'wristband' ? 1 : 2); ped.taken = true;
            const f = U.choice(DATA.HOROSCOPES);
            try { f.apply(p, this); } catch (e) { }
            this.toast('🔮 ' + f.text, '#c8b0e0'); SFX.play('voice');
          }
        }
      } else if (ped.kind === 'recruit') {   // Support Group — a fellow patient asks to join your party
        if (p.allies.length >= 3) { if (this.lockCd <= 0) { this.lockCd = 1.2; this.toast('Your group is full (3).', '#8fd05a'); SFX.play('error'); } }
        else { ped.taken = true; p.recruitAlly(this, ped.allyId); this.texts.push(new FloatText(ped.x, ped.y - 34, 'joined the group', '#8fd05a')); }
      } else if (ped.kind === 'npc') {   // Day Room patient — a line + a one-time boon
        const npc = DATA.DAYROOM[ped.npcId] || DATA.DAYROOM[0];
        ped.taken = true;
        try { npc.apply(p, this); } catch (e) { }
        this.toast('“' + npc.line + '”', '#c8b0e0');
        this.texts.push(new FloatText(ped.x, ped.y - 34, npc.note, '#8fd05a'));
        SFX.play('voice');
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
      } else if (ped.price && ped.kind !== 'janitor' && ped.kind !== 'boss') { // shop item (Brand or Generic), GoodRx coupon halves it
        const useCoupon = (p.coupons || 0) > 0;
        const price = useCoupon ? Math.max(1, Math.ceil(ped.price * 0.5)) : ped.price;
        if (p.coins >= price) {
          p.coins -= price;
          ped.taken = true;
          if (useCoupon) { p.coupons--; this.toast('🎟 GoodRx: 50% off!', '#9db85a'); }
          p.addItem(ped.itemId, this);
          this.stats.items++;
          this.goalEvent('buy');
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
      } else if (ped.kind === 'janitor') {   // forty years of mopping, one bucket of found items
        if (!ped._greeted) {
          ped._greeted = true;
          const met = (Meta.data.janitorMet || 0) > 0;
          Meta.data.janitorMet = (Meta.data.janitorMet || 0) + 1; Meta.save();
          this.toast('🧹 ' + U.choice(met ? DATA.JANITOR.again : DATA.JANITOR.greet), '#b8b0a0');
          SFX.play('voice');
        }
        if (p.coins >= ped.price) {
          if (this.lockCd <= 0) {
            this.lockCd = 1.2;
            p.coins -= ped.price;
            ped.taken = true;
            p.addItem(ped.itemId, this);
            this.stats.items++;
            this.goalEvent('buy');
            Meta.data.janitorBuys = (Meta.data.janitorBuys || 0) + 1; Meta.save();
            this.toast('🧹 ' + U.choice(DATA.JANITOR.buy), '#b8b0a0');
            if (U.chance(0.35)) setTimeout(() => { if (this.state === 'run') this.toast('🧹 ' + U.choice(DATA.JANITOR.wisdom), '#b8b0a0'); }, 2600);
            SFX.play('coin');
            this.checkUnlocks();
            // five purchases in: he finally trusts you
            if ((Meta.data.janitorBuys || 0) >= 5 && !this._basementOffered) {
              this._basementOffered = true;
              this.peds.push({ x: ped.x + 60, y: ped.y + 20, kind: 'basementdoor', taken: false });
              setTimeout(() => { if (this.state === 'run') { this.toast('🧹 “I\'ve seen the basement. Want to?”', '#e8c84c'); SFX.play('voice'); } }, 1400);
            }
          }
        } else if (this.lockCd <= 0) { this.lockCd = 1.6; this.toast('🧹 ' + U.choice(DATA.JANITOR.broke), '#b8b0a0'); SFX.play('denied'); }
      } else if (ped.kind === 'contract') {   // a fellow patient with a side job
        const def = DATA.CONTRACTS.find(c => c.id === ped.contractId) || DATA.CONTRACTS[0];
        const active = (this.contracts || []).filter(c => !c.done).length;
        const dup = (this.contracts || []).some(c => c.id === def.id);
        if (dup) { if (this.lockCd <= 0) { this.lockCd = 1.4; this.toast('“You\'re already on it. I believe in you.”', '#c8b0e0'); } }
        else if (active >= 2) { if (this.lockCd <= 0) { this.lockCd = 1.4; this.toast('“You look busy. Come back when you\'ve got room on your plate.”', '#c8b0e0'); } }
        else {
          ped.taken = true;
          this.contracts.push({ id: def.id, def, prog: 0, done: false });
          this.toast('📝 CONTRACT: ' + def.name + ' — ' + def.desc + ' → ' + def.rtext, '#8fd08a');
          SFX.play('paper');
        }
      } else if (ped.kind === 'basementdoor') {   // STAFF ONLY. you're staff now, apparently.
        ped.taken = true;
        this.enterBasement();
        return;
      } else if (ped.kind === 'basementexit') {   // back up the stairs
        ped.taken = true;
        this.exitBasement();
        return;
      } else if (ped.kind === 'diploma') {   // the framed truth
        if (this.lockCd <= 0) {
          this.lockCd = 2.4;
          this.toast('🎓 “CRUISE SHIP MEDICAL ACADEMY — Doctor of Vibes, D. WALRUS.” It\'s laminated.', '#c8b0e0');
          if (!this._diplomaSeen) { this._diplomaSeen = true; setTimeout(() => { if (this.state === 'run') this.toast('🧹 “Told you. Decent tipper, though.”', '#b8b0a0'); }, 2600); }
          SFX.play('voice');
        }
      } else if (ped.kind === 'ama') {   // the exit. you can just... leave?
        if (this.amaRun) { /* already signed */ }
        else if (this.lockCd <= 0) {
          this.lockCd = 2.0;
          this.showAmaOffer(ped);
          return;
        }
      } else if (ped.kind === 'amaexit') {   // daylight
        ped.taken = true;
        this.finishAma();
        return;
      } else if (ped.kind === 'drugrep') {   // the rep himself: all smile, no collision
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.toast('“No pressure! The samples are FREE. Completely free.”', '#8fd08a'); SFX.play('voice'); }
      } else if (ped.kind === 'sample') {    // free sample — the string attaches immediately
        ped.taken = true;
        p.addItem(ped.itemId, this);
        this.stats.items++;
        const fx = DATA.SAMPLE_FX.find(f => f.id === ped.fx) || DATA.SAMPLE_FX[0];
        try { fx.apply(p, this); } catch (e) { }
        (p.sampleFx || (p.sampleFx = [])).push(fx.name);
        for (const o of this.peds) if (o !== ped && (o.repGroup === ped.repGroup || o.kind === 'drugrep')) o.taken = true;   // his time is valuable
        this.toast('FREE SAMPLE! Side effects include: ' + fx.name + '.', '#8fd08a');
        SFX.play('item');
      } else {
        if (ped.price > 0) {   // BRONZE boss rewards: the copay applies even here
          if (p.coins < ped.price) { if (this.lockCd <= 0) { this.lockCd = 1.2; this.texts.push(new FloatText(ped.x, ped.y - 40, 'need ' + ped.price + '¢ (bronze)', '#e8c84c')); SFX.play('error'); } continue; }
          p.coins -= ped.price; SFX.play('coin');
        }
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
      this.goalEvent('buy');
      if (s.type === 'half') p.heal(1);
      if (s.type === 'pill') p.pill = s.colorIdx;
      if (s.type === 'bomb') p.bombs++;
      if (s.type === 'key') p.keys++;
      if (s.type === 'coupon') { p.coupons = (p.coupons || 0) + 1; this.toast('🎟 GoodRx coupon — 50% off your next med', '#9db85a'); }
    }

    // trapdoor (during the Ascent it's the elevator to the next Administration level — no treatment plan up here)
    if (this.trapdoor && U.dist(this.trapdoor.x, this.trapdoor.y, p.x, p.y) < 26) {
      if (this.floorHits === 0 && !Meta.data.everNoHitFloor) { Meta.data.everNoHitFloor = 1; this.checkUnlocks(); }
      if (this.ascent) { this.wardPath = 'inpatient'; this.doDescend(); }
      else this.offerComorbidity();
      return;
    }

    // door traversal
    if (this.doorsOpen && this.doorCd <= 0) {
      const midX = CW / 2, midY = RY + RH / 2;
      const nearMidX = Math.abs(p.x - midX) < 40, nearMidY = Math.abs(p.y - midY) < 40;
      if (this.amaRun && !this.amaRun.done) {   // you signed the form. the doors know.
        if ((p.y <= RY + 14 || p.y >= RY + RH - 14 || p.x <= RX + 14 || p.x >= RX + RW - 14) && this.lockCd <= 0) { this.lockCd = 1.6; this.toast('🔒 Locked. You SIGNED it.', '#e08a8a'); SFX.play('error'); }
      }
      else if (p.y <= RY + 12 && nearMidX && (room.doors.N || (room.secretDoors.N && this.secretFound))) this.moveRoom('N');
      else if (p.y >= RY + RH - 12 && nearMidX && (room.doors.S || (room.secretDoors.S && this.secretFound))) this.moveRoom('S');
      else if (p.x <= RX + 12 && nearMidY && (room.doors.W || (room.secretDoors.W && this.secretFound))) this.moveRoom('W');
      else if (p.x >= RX + RW - 12 && nearMidY && (room.doors.E || (room.secretDoors.E && this.secretFound))) this.moveRoom('E');
    }

    // AMA escape waves
    if (this.amaRun) this.amaUpdate(dt);
    // the PA crackles
    this.intercomTick(dt);
    // Patient Two (couch co-op)
    if (Input.take('p2join')) { this.p2 ? this.p2Leave() : this.showP2Pick(); if (this.state !== 'run') return; }
    if (this.p2) this.p2Update(dt);
    // OVERTIME waves
    if (this.overtime) this.overtimeUpdate(dt);
    // speedrun clock
    if (Meta.data.speedrun) this.runTime = (this.runTime || 0) + dt;
    // death recap ring buffer (the last ~6 seconds, reconstructed at the morgue)
    this._recapT = (this._recapT || 0) + dt;
    if (this._recapT >= 0.1 && p && !p.dead) {
      this._recapT = 0;
      const R = this._recap || (this._recap = []);
      R.push({ x: p.x, y: p.y, hp: p.hp, b: this.eBullets.filter(b => !b.dead && !b.fake).slice(0, 40).map(b => [Math.round(b.x), Math.round(b.y)]), e: this.enemies.filter(e => !e.dying).slice(0, 12).map(e => [Math.round(e.x), Math.round(e.y)]) });
      if (R.length > 60) R.shift();
    }
    // death — but everyone deserves one appeal
    if (p.dead) {
      if (this.amaRun && !this.amaRun.done) this._amaFailed = true;   // died mid-elopement: the bill doubles
      this.deathT += dt;
      if (this.deathT > 0.9) {
        if (this.practice) { this.practice = false; this.toast('🥊 Called it. Back to the gallery.', '#8fd0e0'); this.showBestiary(); return; }
        if (!this._appealUsed && !this._appealOffered && !this.dailyKind && this.depth >= 2) { this._appealOffered = true; this.showAppealOffer(); }
        else this.showDead();
      }
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
    const goalRows = (this.goals || []).map(g =>
      `<div class="sumrow"><span>${g.done ? '✓' : '🎯'} <span style="color:${g.done ? '#2c5a33' : '#55445e'}">${g.name}</span> <i style="opacity:.7">— ${g.desc}</i></span><b>${g.done ? '+◆' + g.insight : (g.n > 1 ? Math.min(g.prog, g.n) + '/' + g.n : '·')}</b></div>`).join('')
      + (this.contracts || []).filter(c => !c.done).map(c =>
      `<div class="sumrow"><span>📝 <span style="color:#3c6a42">${c.def.name}</span> <i style="opacity:.7">— ${c.def.desc}</i></span><b>${c.def.n > 1 ? Math.min(c.prog, c.def.n) + '/' + c.def.n : '·'}</b></div>`).join('');
    const PL = DATA.PLANS.find(x => x.id === (this.plan || 'silver'));
    const petD = this.player.pet ? DATA.PETS.find(x => x.id === this.player.pet.type) : null;
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:30px">PAUSED</h1>
        <div class="stats-line">${DATA.DIAG[this.player.diag].name} · ward ${this.depth} · ${this.stats.kills} symptoms managed</div>
        <div class="stats-line" style="opacity:.75">${PL ? PL.icon + ' ' + PL.name + ' plan' : ''}${petD ? ' · ' + petD.icon + ' ' + petD.name + (this.player.pet.evo ? ' ★' : '') : ''}${this.player.trinket ? ' · ' + (DATA.TRINKETS.find(t => t.id === this.player.trinket) || {}).name : ''}</div>
        ${goalRows ? `<div class="summary" style="margin-top:8px">${goalRows}</div>` : ''}
        <button class="btn" id="bResume">RESUME</button>
        <button class="btn minor" id="bP2Toggle">🎮 ${this.p2 ? 'PATIENT TWO LEAVES' : 'PATIENT TWO JOINS (pad)'}</button>
        <button class="btn minor" id="bSettings2">⚙ SETTINGS</button>
        <button class="btn minor" id="bQuit">${this.dailyKind ? 'QUIT TO TITLE' : '💾 SAVE & QUIT'}</button>
      </div>`);
    document.getElementById('bResume').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bP2Toggle').onclick = () => {
      SFX.play('ui');
      if (this.p2) { this.p2Leave(); this.hideOverlay(); this.state = 'run'; }
      else { this.hideOverlay(); this.showP2Pick(); }
    };
    document.getElementById('bSettings2').onclick = () => { SFX.play('ui'); this.showSettings(() => this.showPause()); };
    document.getElementById('bQuit').onclick = () => {
      SFX.play('ui');
      if (this.dailyKind) { this.recordRun('quit'); }   // seeded runs can't be resumed — log the quit
      else { this.saveCheckpoint(); this._runLogged = true; }   // keep the checkpoint; don't log a death/quit
      this.showTitle();
    };
  },

  /* ---------- OVERTIME (one room; the ward sends everything; you clock out when you drop) ---------- */
  showOvertime() {
    this.state = 'overtimepick';
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout'];
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const nineDone = order.slice(0, 9).filter(d => (Meta.data.diagsPlayed || {})[d]).length >= 9;
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const unlocked = order.filter(id => !(id === 'fine' && !fineOpen) && !(id === 'undiag' && !nineDone) && !(id === 'burnout' && !burnoutOpen));
    const cards = unlocked.map(id => {
      const D = DATA.DIAG[id];
      return `<button class="cmcard" data-otdiag="${id}"><div class="cmname" style="color:${D.color}">${D.name}</div><div class="cmdesc">${D.short}</div></button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">⏰ OVERTIME</h1>
        <div class="tagline">one room. escalating waves of everything the ward has. best: <b style="color:#e8c84c">wave ${Meta.data.overtimeBest || 0}</b></div>
        <div class="cmgrid">${cards}</div>
        <div class="tagline" style="opacity:.6">the bill runs the whole time. obviously.</div>
        <button class="btn minor" id="bOtBack">BACK</button>
      </div>`);
    document.querySelectorAll('[data-otdiag]').forEach(b => b.onclick = () => {
      SFX.play('stamp');
      this._startOvertime = true;
      this.beginRun(b.dataset.otdiag);
    });
    document.getElementById('bOtBack').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },
  setupOvertime() {
    const room = this.floorRooms.find(r => r.type === 'start') || this.room || this.floorRooms[0];
    room.doors = {}; room.secretDoors = {}; room.cleared = false; room.spawned = true;
    if (room.layout) for (let r = 1; r < ROWS - 1; r++) for (let c = 2; c < COLS - 2; c++) if (U.chance(0.9)) room.layout[r][c] = 0;   // mostly open floor
    this.floorRooms = [room]; this.grid = new Map([[U.key(room.gx, room.gy), room]]);
    this.enterRoom(room, null);
    this.overtime = { wave: 0, spawnT: 2.2, bestShown: false };
    this.setBanner('⏰ OVERTIME', 'the ward would like a word. all of it.', 2.6);
    SFX.setMusic('overtime');
  },
  overtimeUpdate(dt) {
    const OT = this.overtime; if (!OT) return;
    const live = this.enemies.some(e => !e.dying && e.id !== 'auditor') || (this.boss && !this.boss.dead);
    if (live) return;
    OT.spawnT -= dt;
    if (OT.spawnT > 0) return;
    OT.wave++;
    OT.spawnT = 2.2;
    const w = OT.wave, depth = 1 + Math.floor(w / 3) * 2;
    if (w % 10 === 0) {   // every 10th wave: management personally attends
      const bosses = ['gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'peerreview', 'withdrawal', 'burnout'];
      this.bossId = bosses[(w / 10 - 1) % bosses.length];
      this.boss = new Boss(this.bossId, depth, this);
      this.boss.introT = 1.2;
      this.setBanner('WAVE ' + w, DATA.BOSSES[this.bossId].name + ' clocks in', 2.2);
    } else {
      const n = Math.min(14, 3 + Math.ceil(w * 0.8));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.random();
        const id = (w % 3 === 0 && i === 0) ? U.choice(['chargenurse', 'resident', 'orderly']) : DATA.pickEnemy(depth, null);
        const e = new Enemy(id, U.clamp(CW / 2 + Math.cos(a) * U.rand(150, 300), RX + 36, RX + RW - 36), U.clamp(RY + RH / 2 + Math.sin(a) * U.rand(90, 200), RY + 36, RY + RH - 36), depth, false, 1, (w >= 5 && U.chance(Math.min(0.5, w * 0.03))) ? U.choice(DATA.ELITES).id : null);
        e.spawnT = 0.6 + i * 0.1;
        this.enemies.push(e);
      }
      this.setBanner('WAVE ' + w, w % 3 === 0 ? 'a supervisor joins the floor' : '', 1.6);
    }
    if (w > (Meta.data.overtimeBest || 0)) { Meta.data.overtimeBest = w; Meta.save(); this.checkUnlocks(); }
    // a small mercy every third wave
    if (w % 3 === 0) { this.pickups.push(new Pickup('half', CW / 2 + U.rand(-50, 50), RY + RH / 2 + U.rand(-30, 30))); this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-70, 70), RY + RH / 2)); }
    SFX.play(w % 10 === 0 ? 'boss' : 'wave');
  },

  /* ---------- PATIENT TWO (couch co-op: the pad is theirs now) ---------- */
  showP2Pick() {
    this.state = 'p2pick';
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout'];
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const nineDone = order.slice(0, 9).filter(d => (Meta.data.diagsPlayed || {})[d]).length >= 9;
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const unlocked = order.filter(id => !(id === 'fine' && !fineOpen) && !(id === 'undiag' && !nineDone) && !(id === 'burnout' && !burnoutOpen));
    const cards = unlocked.map(id => {
      const D = DATA.DIAG[id];
      return `<button class="cmcard" data-p2diag="${id}"><div class="cmname" style="color:${D.color}">${D.name}</div><div class="cmdesc">${D.short}</div></button>`;
    }).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">🎮 PATIENT TWO</h1>
        <div class="tagline">someone else checks in. pick their chart — left stick walks, right stick argues.</div>
        <div class="cmgrid">${cards}</div>
        <button class="btn minor" id="bP2Never">actually, they left</button>
      </div>`);
    document.querySelectorAll('[data-p2diag]').forEach(b => b.onclick = () => {
      SFX.play('stamp');
      const q = new Player(b.dataset.p2diag);
      q.x = this.player.x + 40; q.y = this.player.y;
      q.maxhp = 8; q.hp = 8; q.noHat = true; q._downT = 0; q._tearT = 0; q.iframes = 1.5;
      this.p2 = q;
      this.hideOverlay(); this.state = 'run';
      this.toast('🎮 PATIENT TWO checked in: ' + DATA.DIAG[q.diag].name + '. The intake form is shared now.', DATA.DIAG[q.diag].color);
    });
    document.getElementById('bP2Never').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
  },
  p2Leave() {
    if (!this.p2) return;
    this.toast('🎮 PATIENT TWO discharged themselves. Typical.', '#b3a7b8');
    this.p2 = null;
  },
  p2Update(dt) {
    const q = this.p2, p = this.player;
    q.iframes -= dt; q.hurtFlash = Math.max(0, (q.hurtFlash || 0) - dt);
    if (q._downT > 0) return;   // waiting on a room clear (or a kind word)
    const mv = Input._gpMove, aim = Input._gpAim;
    q.moving = Math.abs(mv.x) > 0.05 || Math.abs(mv.y) > 0.05;
    if (q.moving) {
      const sp = 215;
      const nx = U.clamp(q.x + mv.x * sp * dt, RX + 12, RX + RW - 12);
      const ny = U.clamp(q.y + mv.y * sp * dt, RY + 12, RY + RH - 12);
      const tx = pxToTile(nx, q.y);
      if (!(tx.c >= 0 && tx.r >= 0 && tx.c < COLS && tx.r < ROWS && tileSolid(this.room.layout, tx.c, tx.r))) q.x = nx;
      const ty = pxToTile(q.x, ny);
      if (!(ty.c >= 0 && ty.r >= 0 && ty.c < COLS && ty.r < ROWS && tileSolid(this.room.layout, ty.c, ty.r))) q.y = ny;
      if (!aim) q.aimAng = Math.atan2(mv.y, mv.x);
    }
    q._tearT -= dt;
    if (aim && q._tearT <= 0 && !p.flags.pacifist) {
      q._tearT = 0.36;
      q.aimAng = Math.atan2(aim.y, aim.x);
      const dmg = Math.max(1.5, p.dmg * 0.7);
      this.tears.push(new Tear(q.x, q.y - 4, aim.x * 430, aim.y * 430, dmg, 0.85, false));
      SFX.play('shoot');
    }
    // contact damage (they are also a patient)
    if (q.iframes <= 0) {
      for (const e of this.enemies) {
        if (e.dying || e.fake || e.spawnT > 0 || e.charmed || !(e.dmg > 0)) continue;
        if (U.dist(q.x, q.y, e.x, e.y) < e.r + 11) { this.p2Hurt(1); break; }
      }
      if (this.boss && !this.boss.dead && this.boss.introT <= 0 && U.dist(q.x, q.y, this.boss.x, this.boss.y) < this.boss.r + 11) this.p2Hurt(1);
    }
  },
  p2Hurt(n) {
    const q = this.p2; if (!q || q.iframes > 0 || q._downT > 0) return;
    q.hp -= n; q.iframes = 1.3; q.hurtFlash = 0.35;
    SFX.play('hurt');
    if (q.hp <= 0) {
      q._downT = 999;
      this.toast('🎮 PATIENT TWO is down — clear the room to get them up.', '#e08a8a');
      SFX.play('error');
    }
  },

  /* ---------- THE INTERCOM (Dr. Walrus is watching. commenting, even.) ---------- */
  pa(key, sub) {
    if (Meta.data.paOff) return;
    const pool = DATA.INTERCOM[key]; if (!pool || !pool.length) return;
    let line = U.choice(pool);
    if (sub) line = line.replace('{X}', String(sub).replace(/^the /i, ''));
    this.toast('📢 ' + line, '#c8b8d8');
    SFX.play('voice');
  },
  intercomTick(dt) {
    if (Meta.data.paOff || !this.player || this.state !== 'run') return;
    const ic = this._ic || (this._ic = { cds: {}, idleT: 0, lastPos: null, roomT0: 0 });
    const p = this.player;
    for (const k in ic.cds) ic.cds[k] -= dt;
    const ready = (k) => !(ic.cds[k] > 0);
    const fire = (k, cd, sub) => { ic.cds[k] = cd; this.pa(k, sub); };
    // low hp
    if (p.hp <= 2 && p.hp > 0 && ready('lowhp')) fire('lowhp', 75);
    // hoarding
    if (p.coins >= 25 && ready('hoard')) fire('hoard', 120);
    // pill untouched for 2+ floors
    if (p.pill != null && (this.depth - (this._pillFloorMark || this.depth)) >= 2 && ready('nopills')) fire('nopills', 150);
    // your recurring nemesis (same cause, twice running — the chart knows)
    if (this._icPattern && this.t > 4 && ready('pattern')) { fire('pattern', 99999, this._icPattern); this._icPattern = null; }
    // no-hit streak (3 clean rooms in a row)
    if ((this._cleanStreak || 0) >= 3 && ready('streak')) { fire('streak', 140); this._cleanStreak = 0; }
    // idling
    if (ic.lastPos && U.dist(p.x, p.y, ic.lastPos.x, ic.lastPos.y) < 6 && this.room && this.room.cleared) {
      ic.idleT += dt;
      if (ic.idleT > 20 && ready('idle')) { fire('idle', 90); ic.idleT = 0; }
    } else ic.idleT = 0;
    if (!ic.lastPos) ic.lastPos = { x: p.x, y: p.y };
    ic.lastPos.x = p.x; ic.lastPos.y = p.y;
  },

  /* ---------- LEAVING AMA (sign the form; survive the ward's objection) ---------- */
  showAmaOffer(ped) {
    this.state = 'event';
    SFX.play('voice');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">🚪 SELF-DISCHARGE (AMA)</h1>
        <div class="tagline">“You are leaving AGAINST MEDICAL ADVICE. Sign here. The ward will have… objections.”</div>
        <div class="cmgrid">
          <button class="cmcard" id="bAmaSign"><div class="cmname">✍ SIGN THE FORM</div><div class="cmdesc">Doors lock. Three waves. Survive them and walk out — banked Insight ×1.5, a fourth ending.</div><div class="cmtag">die on the way out and the bill DOUBLES</div></button>
          <button class="cmcard" id="bAmaBack"><div class="cmname">go back to bed</div><div class="cmdesc">The blanket is right there. It knows you.</div><div class="cmtag">no judgment (some judgment)</div></button>
        </div>
      </div>`);
    document.getElementById('bAmaSign').onclick = () => {
      SFX.play('stamp');
      ped.taken = true;
      this.hideOverlay(); this.state = 'run';
      this.amaRun = { wave: 0, total: 3, spawnT: 1.2, done: false };
      this.setBanner('🏃 AGAINST MEDICAL ADVICE', 'the ward disagrees. loudly.', 2.6);
      this.toast('The doors slam shut. Somewhere, a clipboard drops.', '#e08a8a');
      SFX.play('descend');
    };
    document.getElementById('bAmaBack').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; this.toast('The blanket forgives you.', '#8fd0e0'); };
  },
  amaUpdate(dt) {
    const A = this.amaRun; if (!A || A.done) return;
    const live = this.enemies.some(e => !e.dying && e.id !== 'auditor');
    if (live) return;
    if (A.wave >= A.total) {   // all waves down — the exit opens
      A.done = true;
      this.peds.push({ x: RX + RW - 90, y: RY + 96, kind: 'amaexit', taken: false });
      this.toast('🌤 The exit is open. Actual daylight.', '#e8c84c');
      SFX.play('fanfare');
      return;
    }
    A.spawnT -= dt;
    if (A.spawnT <= 0) {
      A.wave++;
      A.spawnT = 1.6;
      const n = 3 + A.wave + Math.min(3, Math.floor(this.depth / 6));
      for (let i = 0; i < n; i++) {
        const a = U.rand(0, TAU);
        const e = new Enemy(DATA.pickEnemy(this.depth, this.wing), U.clamp(CW / 2 + Math.cos(a) * U.rand(120, 250), RX + 36, RX + RW - 36), U.clamp(RY + RH / 2 + Math.sin(a) * U.rand(80, 170), RY + 36, RY + RH - 36), this.depth, false, 1);
        e.spawnT = 0.5 + i * 0.12;
        this.enemies.push(e);
      }
      this.setBanner('WAVE ' + A.wave + ' / ' + A.total, ['“Sir, please return to your room.”', '“SIR. Your paperwork—”', '“SECURITY to the Day Room.”'][A.wave - 1] || '', 2.0);
      SFX.play('boss');
    }
  },
  finishAma() {
    const p = this.player;
    this._amaDone = true;
    Meta.data.amaDone = (Meta.data.amaDone || 0) + 1;
    Meta.save();
    this.checkUnlocks();
    this.recordRun('ama');
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('sting');
    const D = DATA.DIAG[p.diag];
    this.overlay(`
      <div class="panel wide">
        <div class="rx" style="border-color:#c8a24a">
          <div class="stamp" style="color:#c8a24a;border-color:#c8a24a">AMA</div>
          <h2 style="color:${D.color}">DISCHARGED — AGAINST MEDICAL ADVICE</h2>
          <div class="sub">Ward ${this.depth} · you signed yourself out. the door was unlocked the whole time, legally speaking.</div>
        </div>
        <div class="tagline">Outside: weather. Traffic. A bird doing fine without a diagnosis. Dr. Walrus watches from the window, misting up.</div>
        <div class="summary">
          <div class="sumrow"><span>Symptoms managed on the way out</span><b>${this.stats.kills}</b></div>
          <div class="sumrow"><span><span style="color:#8fd0e0">◆ Insight banked (AMA bonus ×1.5)</span></span><b style="color:#8fd0e0">+${(this._insightGained || 0)}</b></div>
          ${this._fundDonated ? `<div class="sumrow"><span style="color:#e8c84c">🫙 “Donated” on the way out</span><b style="color:#e8c84c">${this._fundDonated}¢</b></div>` : ''}
        </div>
        ${this.billHtml()}
        <button class="btn" id="bAmaShare">📤 SHARE DIAGNOSIS CARD</button>
        <button class="btn minor" id="bAmaTitle">TITLE</button>
      </div>`);
    document.getElementById('bAmaShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: p.diag, depth: this.depth, label: 'LEFT AMA', win: true, stats: { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills } }); };
    document.getElementById('bAmaTitle').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* ---------- THE APPEALS PROCESS (once per run, the denial can be argued) ---------- */
  showAppealOffer() {
    this.state = 'appealoffer';
    SFX.setMusic('menu'); SFX.play('stamp');
    const p = this.player;
    const cause = this._causeName(p._lastSrc || 'unknown');
    this.overlay(`
      <div class="panel wide">
        <div class="rx" style="border-color:#8a3030">
          <div class="stamp">DENIED</div>
          <h2 style="color:#c05050">FINAL NOTICE</h2>
          <div class="sub">Cause of discharge: <b>${cause}</b> · Ward ${this.depth}</div>
        </div>
        ${this.billHtml()}
        <div class="tagline">You may appeal this decision <b>once</b>. The processing fee is <b style="color:#e8c84c">${p.coins}¢</b> — which is, coincidentally, everything you have.</div>
        <button class="btn" id="bFileAppeal">📄 FILE AN APPEAL (${p.coins}¢ fee)</button>
        <button class="btn minor" id="bAcceptDeath">ACCEPT THE DECISION</button>
      </div>`);
    document.getElementById('bFileAppeal').onclick = () => { SFX.play('stamp'); this._appealFee = p.coins; p.coins = 0; this.showAppeal(); };
    document.getElementById('bAcceptDeath').onclick = () => { SFX.play('ui'); this.showDead(); };
  },
  showAppeal() {
    this.hideOverlay();
    this.state = 'appeal';
    const spd = Math.min(1.9, 0.85 + this.depth * 0.045);   // deeper wards argue faster
    this.appeal = { t: 0, needle: Math.random(), dir: 1, speed: spd, zoneC: U.rand(0.3, 0.7), zoneW: 0.17, tries: 3, stamps: [], result: null, doneT: 0, flash: 0 };
    this._appealTap = false;
    if (!this._appealTapBound) {
      this._appealTapBound = (e) => { if (this.state === 'appeal') { this._appealTap = true; e.preventDefault(); } };
      const cv = document.getElementById('game');
      cv.addEventListener('pointerdown', this._appealTapBound);
    }
    SFX.play('voice');
  },
  appealUpdate(dt) {
    const A = this.appeal; if (!A) { this.showDead(); return; }
    A.t += dt; A.flash -= dt;
    if (A.result) {   // stamp landed — hold the moment, then resolve
      A.doneT -= dt;
      if (A.doneT <= 0) {
        if (A.result === 'won') {
          const p = this.player;
          this._appealUsed = true;
          Meta.data.appealsWon = (Meta.data.appealsWon || 0) + 1; Meta.save();
          p.dead = false;
          p.hp = Math.max(2, Math.ceil(p.maxhp / 2));
          p.iframes = 2.8;
          this.deathT = 0;
          this.eBullets.length = 0; this.zones.length = 0;
          this.state = 'run';
          SFX.setMusic(this.boss && !this.boss.dead ? 'boss' : 'run');
          SFX.play('fanfare');
          this.toast('🗎 DENIAL OVERTURNED — resume treatment.', '#8fd05a');
          this.setBanner('OVERTURNED', 'the reviewer sighed audibly', 2.2);
        } else {
          this._appealUsed = true;
          this.showDead();
        }
        return;
      }
      return;
    }
    // the needle sweeps; catch it in the green
    A.needle += A.dir * A.speed * dt;
    if (A.needle > 1) { A.needle = 1; A.dir = -1; }
    if (A.needle < 0) { A.needle = 0; A.dir = 1; }
    const press = Input.take('confirm') || Input.take('ability') || this._appealTap;
    this._appealTap = false;
    if (press) {
      if (Math.abs(A.needle - A.zoneC) <= A.zoneW / 2) {
        A.result = 'won'; A.doneT = 1.4; A.stampNow = 'APPROVED';
        SFX.play('item');
      } else {
        A.tries--;
        A.stamps.push(A.needle);
        A.flash = 0.35;
        SFX.play('stamp');
        A.zoneC = U.rand(0.25, 0.75); A.zoneW = Math.max(0.11, A.zoneW - 0.02); A.speed *= 1.12;
        if (A.tries <= 0) { A.result = 'lost'; A.doneT = 1.6; A.stampNow = 'UPHELD'; SFX.play('denied'); }
      }
    }
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
          ${this.overtime ? row('<span style="color:#e8c84c">⏰ OVERTIME — wave reached</span>', '<span style="color:#e8c84c">' + this.overtime.wave + (this.overtime.wave >= (Meta.data.overtimeBest || 0) ? ' ⭐' : '') + '</span>') : ''}
          ${Meta.data.speedrun && this.runTime ? row('⏱ Final time', Math.floor(this.runTime / 60) + ':' + ('0' + Math.floor(this.runTime % 60)).slice(-2)) : ''}
          ${row('Symptoms managed', st.kills)}
          ${row('Bosses defeated', st.bosses)}
          ${row('Prescriptions collected', st.items)}
          ${row('Pills swallowed', st.pills)}
          ${row('Rooms survived', st.rooms)}
          ${(this.goals || []).map(g => row((g.done ? '✓ ' : '✗ ') + '<span style="color:' + (g.done ? '#8fd05a' : '#8a7c88') + '">' + g.name + '</span>', g.done ? '<span style="color:#8fd0e0">+◆' + g.insight + '</span>' : (g.n > 1 ? g.prog + '/' + g.n : '—'))).join('')}
          ${this._insightGained || this._goalInsight ? row('<span style="color:#8fd0e0">◆ Insight earned</span>', '<span style="color:#8fd0e0">+' + ((this._insightGained || 0) + (this._goalInsight || 0)) + '</span>') : ''}
          ${this._fundDonated ? row('<span style="color:#e8c84c">🫙 “Donated” to the Wellness Fund</span>', '<span style="color:#e8c84c">' + this._fundDonated + '¢</span>') : ''}
        </div>
        ${this._insightGained ? `<div class="tagline" style="margin-top:-6px">spend it in the 🧠 Treatment Plan on the title screen</div>` : ''}
        ${this.billHtml()}
        ${unlockHtml}
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="deadWalrus"></canvas>
          <div class="bubble"><i>“${this._deathQuip}”</i></div>
        </div>
        ${(this._recap && this._recap.length > 4) ? `
        <div style="text-align:center;margin-top:6px">
          <canvas id="recapCv" width="300" height="190" style="border-radius:8px;max-width:100%"></canvas>
          <div class="tagline" style="margin-top:2px">the incident, reconstructed — cause: <b style="color:#e05a5a">${this._causeName(this.player._lastSrc || 'unknown')}</b></div>
        </div>` : ''}
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
    const rcv = document.getElementById('recapCv');
    if (rcv) try { Render.drawRecap(rcv, this); } catch (e) { }
    if (daily) document.getElementById('bRetryDaily').onclick = () => { SFX.play('ui'); this.beginRun(diagId, { seed: dseed, key: dkey, isDaily: dkind === 'daily' }); };
    else document.getElementById('bAgainSame').onclick = () => { SFX.play('ui'); this.showEnrollment(diagId); };
    document.getElementById('bShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: diagId, depth: this.depth, daily, key: dkind === 'challenge' ? dcode : dkey, label: dkind === 'challenge' ? 'CHALLENGE' : 'DAILY WARD', win: dailyWin, stats: { kills: st.kills, bosses: st.bosses, pills: st.pills }, code: dcode }); };
    document.getElementById('bAgainNew').onclick = () => { SFX.play('ui'); this.startQuiz(); };
    document.getElementById('bUnlocks').onclick = () => { SFX.play('ui'); this.showUnlocks(() => this.showDead()); };
    document.getElementById('bHist').onclick = () => { SFX.play('ui'); this.showStats(() => this.showDead()); };
    document.getElementById('bTitle').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* ---------- the (non-)ending ---------- */
  showEnding() {
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('sting');
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
        ${this.billHtml()}
        <button class="btn" id="bEndKeep">▶ KEEP CLIMBING (endless)</button>
        <div class="btnrow">
          <button class="btn minor" id="bEndShare">📤 SHARE</button>
          <button class="btn minor" id="bEndCredits">🎬 ROLL CREDITS</button>
          <button class="btn minor" id="bEndTitle">TITLE</button>
        </div>
      </div>`);
    this.paintWalrus('endWalrus');
    document.getElementById('bEndCredits').onclick = () => { SFX.play('ui'); this.recordRun('cured'); this.showCredits(); };
    document.getElementById('bEndKeep').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bEndShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: this.player.diag, depth: this.depth, daily: true, key: 'WARD 25', label: this.chronic ? 'CURED · CHRONIC' : 'CURED (ALLEGEDLY)', win: true, stats: { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills } }); };
    document.getElementById('bEndTitle').onclick = () => { SFX.play('ui'); this.recordRun('cured'); this.showTitle(); };
  },

  /* ---------- THE BOARD ending (top of the Ascent) ---------- */
  showBoardEnding() {
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('sting');
    const bk = Meta.data.boardKills || 1;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:30px">MOTION<br>DENIED</h1>
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="endWalrusB"></canvas>
          <div class="bubble">You took the elevator UP. Nobody takes the elevator up. Five executive floors, and at the top — three suits voting on your care without ever having met you. The vote just failed. Permanently.</div>
        </div>
        <div class="rx" style="border-color:#c8a24a">
          <div class="stamp" style="color:#c8a24a;border-color:#c8a24a">RESTRUCTURED</div>
          <div class="sub">${DATA.DIAG[this.player.diag].name} · the Ascent${this.chronic ? ' · CHRONIC' : ''}</div>
          <div class="mech">THE BOARD dissolved ×${bk}. The wards are still down there — but the top floor answers to nobody now.</div>
        </div>
        ${this.billHtml()}
        <button class="btn" id="bEndKeep">▼ BACK TO THE WARDS (descend on)</button>
        <div class="btnrow">
          <button class="btn minor" id="bEndShare">📤 SHARE</button>
          <button class="btn minor" id="bEndTitle">TITLE</button>
        </div>
      </div>`);
    this.paintWalrus('endWalrusB');
    document.getElementById('bEndKeep').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bEndShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: this.player.diag, depth: this.depth, daily: true, key: 'THE ASCENT', label: 'DISSOLVED THE BOARD', win: true, stats: { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills } }); };
    document.getElementById('bEndTitle').onclick = () => { SFX.play('ui'); this.recordRun('cured'); this.showTitle(); };
  },

  /* ---------- THE SYSTEM ending (Ward 100 — the true ceiling) ---------- */
  showSystemEnding() {
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('sting');
    const sk = Meta.data.systemKills || 1;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:30px">YOU BEAT<br>THE SYSTEM</h1>
        <div class="walrusbox">
          <canvas class="walrusCanvas" width="132" height="132" id="endWalrusS"></canvas>
          <div class="bubble">One hundred wards. The denials, the pharmacy, the feed — the whole machine, and you walked through all of it. There's nothing below this floor. There never was. There's just the way back up, and you know every step now.</div>
        </div>
        <div class="rx" style="border-color:#5a9de0">
          <div class="stamp" style="color:#5a9de0;border-color:#5a9de0">OUT OF NETWORK</div>
          <div class="sub">${DATA.DIAG[this.player.diag].name} · Ward ${this.depth}${this.chronic ? ' · CHRONIC' : ''}</div>
          <div class="mech">THE SYSTEM dismantled ×${sk}. The rarest line on any chart, anywhere.</div>
        </div>
        ${this.billHtml()}
        <button class="btn" id="bEndKeep">▶ KEEP CLIMBING (why not)</button>
        <div class="btnrow">
          <button class="btn minor" id="bEndShare">📤 SHARE</button>
          <button class="btn minor" id="bEndTitle">TITLE</button>
        </div>
      </div>`);
    this.paintWalrus('endWalrusS');
    document.getElementById('bEndKeep').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bEndShare').onclick = () => { SFX.play('ui'); Render.shareCard({ diag: this.player.diag, depth: this.depth, daily: true, key: 'WARD 100', label: 'BEAT THE SYSTEM', win: true, stats: { kills: this.stats.kills, bosses: this.stats.bosses, pills: this.stats.pills } }); };
    document.getElementById('bEndTitle').onclick = () => { SFX.play('ui'); this.recordRun('cured'); this.showTitle(); };
  },

  /* ---------- THE FOUNDER ending (Ward 50 superboss) ---------- */
  showFounderEnding() {
    this.state = 'ending';
    SFX.setMusic('menu'); SFX.play('sting');
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
        ${this.billHtml()}
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
        ${Meta.data.cured ? '<button class="btn minor" id="bRollCredits">🎬 ROLL CREDITS</button>' : ''}
        <button class="btn" id="bStoryBack">BACK</button>
      </div>`);
    document.querySelectorAll('.ach[data-s]:not(.locked)').forEach(b => b.onclick = () => { SFX.play('ui'); Story.play(b.dataset.s, () => this.showStoryGallery(returnTo)); });
    const brc = document.getElementById('bRollCredits');
    if (brc) brc.onclick = () => { SFX.play('ui'); this.showCredits(); };
    document.getElementById('bStoryBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- BESTIARY: a rogues' gallery of live-animated boss portraits ---------- */
  showBestiary(returnTo) {
    this.state = 'bestiary';
    const seen = (Meta.data.seen && Meta.data.seen.bosses) || {};
    const order = ['gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'peerreview', 'withdrawal', 'burnout', 'walrus', 'thecure', 'founder', 'thesystem', 'theboard'];
    const got = order.filter(id => seen[id]).length;
    const cards = order.map(id => {
      const B = DATA.BOSSES[id];
      const note = (DATA.CODEX_CHART.bosses && DATA.CODEX_CHART.bosses[id]) || '';
      const s = !!seen[id];
      const sparedTag = s && Meta.data.sparedBosses && Meta.data.sparedBosses[id] ? ' <span style="color:#8fd0e0">✌ spared</span>' : '';
      return `<div class="bcard ${s ? 'got' : 'locked'}">
        <div class="bframe">${s ? `<canvas class="bportrait" width="150" height="132" data-b="${id}"></canvas>` : '<div class="bqm">?</div>'}</div>
        <div class="bname">${s ? B.name + sparedTag : '? ? ?'}</div>
        <div class="bsub">${s ? B.sub : 'not yet encountered'}</div>
        ${s ? `<div class="bnote">${note}</div><button class="btn minor" data-spar="${id}" style="margin-top:4px;font-size:10px;padding:4px 8px">🥊 PRACTICE</button>` : ''}
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
    document.querySelectorAll('[data-spar]').forEach(b => b.onclick = (ev) => {
      ev.stopPropagation();
      SFX.play('stamp');
      this._bestiary = null;
      this.startPractice(b.dataset.spar);
    });
    document.getElementById('bBestBack').onclick = () => { SFX.play('ui'); this._bestiary = null; (returnTo || (() => this.showTitle()))(); };
  },
  // 🥊 sparring: a no-stakes rematch straight from the bestiary — nothing counts, nothing saves
  startPractice(bossId) {
    this.beginRun(Meta.data.lastDiag && DATA.DIAG[Meta.data.lastDiag] ? Meta.data.lastDiag : 'adhd');
    this.practice = true;
    this._runLogged = true;   // nothing about this run is ever recorded
    const p = this.player;
    p.dmg += 2; p.maxhp = 12; p.hp = 12;
    this.depth = Math.max(this.depth, bossId === 'thesystem' ? 100 : bossId === 'founder' ? 50 : bossId === 'thecure' ? 25 : 5);
    this.newFloor();
    this.bossId = bossId;
    const br = this.floorRooms.find(r => r.type === 'boss');
    if (br) this.enterRoom(br, null);
    this.setBanner('🥊 SPARRING — ' + (DATA.BOSSES[bossId] || { name: bossId }).name, 'nothing counts. everything hurts.', 2.6);
    this.toast('Practice bout. Dying just sends you back to the Bestiary.', '#8fd0e0');
  },

  /* ---------- PROGNOSIS: challenge-run picker ---------- */
  showPrognosis(returnTo) {
    this.state = 'prognosis';
    const best = Meta.data.prognosisBest || {};
    const cards = DATA.PROGNOSES.map(pr => `
      <button class="cmcard" data-p="${pr.id}">
        <div class="cmname">${pr.icon} ${pr.name}</div>
        <div class="cmdesc">${pr.desc}</div>
        <div class="cmtag">${best[pr.id] ? '★ best: ward ' + best[pr.id] : 'unattempted'}</div>
      </button>`).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">PROGNOSIS</h1>
        <div class="tagline">challenge runs · pick your poison, then your patient</div>
        <div class="cmgrid">${cards}</div>
        <button class="btn minor" id="bPrognBack">BACK</button>
      </div>`);
    document.querySelectorAll('.cmcard[data-p]').forEach(b => b.onclick = () => { SFX.play('ui'); this._startPrognosis = b.dataset.p; this.showFiles(); });
    document.getElementById('bPrognBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- Challenge Protocols (curated rule-set runs) ---------- */
  showProtocols(returnTo) {
    this.state = 'protocols';
    const done = Meta.data.protocolsDone || {};
    const cards = DATA.PROTOCOLS.map(pr => `
      <button class="cmcard" data-p="${pr.id}" ${done[pr.id] ? 'style="outline:2px solid #3a7a3a"' : ''}>
        <div class="cmname">${pr.icon} ${pr.name} ${done[pr.id] ? '✓' : ''}</div>
        <div class="cmdesc">${pr.desc}</div>
        <div class="cmtag">${done[pr.id] ? 'completed — protocol on file' : 'incomplete · reach Ward 6 to file it (+◆25)'}</div>
      </button>`).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">PROTOCOLS</h1>
        <div class="tagline">${Object.keys(done).length} / ${DATA.PROTOCOLS.length} filed · curated ways to make it worse</div>
        <div class="cmgrid">${cards}</div>
        <button class="btn minor" id="bProtoBack">BACK</button>
      </div>`);
    document.querySelectorAll('.cmcard[data-p]').forEach(b => b.onclick = () => { SFX.play('ui'); this._startProtocol = b.dataset.p; this.showFiles(); });
    document.getElementById('bProtoBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- Treatment Plan (between-run skill tree) ---------- */
  showTreatmentPlan(returnTo) {
    this.state = 'treatment';
    const tal = Meta.data.talents || (Meta.data.talents = {});
    const insight = Meta.data.insight || 0;
    const owned = id => !!tal[id];
    const canBuy = t => !owned(t.id) && insight >= t.cost && (!t.req || owned(t.req));
    const cols = DATA.TALENT_BRANCHES.map(br => {
      const nodes = DATA.TALENTS.filter(t => t.branch === br.id).sort((a, b) => a.tier - b.tier).map((t, i) => {
        const state = owned(t.id) ? 'owned' : canBuy(t) ? 'avail' : 'locked';
        return `${i ? '<div class="tallink"></div>' : ''}<button class="talnode ${state}" data-t="${t.id}" ${state === 'avail' ? '' : 'disabled'}>
          <div class="talname">${t.name}</div>
          <div class="taldesc">${t.desc}</div>
          <div class="talcost">${owned(t.id) ? '✓ learned' : '◆ ' + t.cost}</div>
        </button>`;
      }).join('');
      return `<div class="talcol"><div class="talhead">${br.icon} ${br.name}</div>${nodes}</div>`;
    }).join('');
    this.overlay(`
      <div class="panel wide treat">
        <h1 class="logo" style="font-size:26px">TREATMENT PLAN</h1>
        <div class="tagline">permanent therapy skills · you have <b style="color:#8fd0e0">◆ ${insight} Insight</b></div>
        <div class="talgrid">${cols}</div>
        <button class="btn minor" id="bTreatBack">BACK</button>
      </div>`);
    document.querySelectorAll('.talnode[data-t]').forEach(b => b.onclick = () => {
      const t = DATA.TALENTS.find(x => x.id === b.dataset.t);
      if (!t || !canBuy(t)) { SFX.play('error'); return; }
      Meta.data.insight -= t.cost; tal[t.id] = 1; Meta.save();
      SFX.play('item');
      DATA.checkAchievements(Meta.data); Meta.save();   // Modality Mastered can land mid-menu
      this.showTreatmentPlan(returnTo);
    });
    document.getElementById('bTreatBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
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
    const map = { spikes: 'Spike pit', ember: 'Burnout embers', explosion: 'an explosion', adjuster: "The Adjuster's stamp", bullet: 'a stray bullet', 'ocd-intrusive': 'intrusive thoughts', flashback: 'a flashback', timeslot: 'the 20-minute slot', panic: 'the crowd', sacrifice: 'the Seclusion altar', ect: 'the ECT Suite', observation: 'the Observation sweep', unknown: 'unknown causes', quit: 'walked away', cured: 'reached the Cure' };
    if (map[c]) return map[c];
    if (DATA.ENEMIES[c]) return DATA.ENEMIES[c].name;
    if (DATA.BOSSES[c]) return DATA.BOSSES[c].name;
    return c;
  },
  // 🏆 the trophy wall: everything you've survived, framed
  trophyHtml() {
    const m = Meta.data;
    const plq = (icon, title, val) => `<div style="flex:0 0 auto;background:#efe6cc;border:3px solid #a8926a;border-radius:6px;padding:6px 10px;min-width:104px;text-align:center;box-shadow:0 2px 0 rgba(0,0,0,0.25)">
      <div style="font-size:17px">${icon}</div><div style="font-size:9px;color:#7a6a4a;font-weight:bold;letter-spacing:0.5px">${title}</div><div style="font-size:13px;font-weight:bold;color:#3a3020">${val}</div></div>`;
    const plaques = [];
    if (m.bestFloor > 0) plaques.push(plq('🏥', 'DEEPEST WARD', m.bestFloor));
    const heatBest = Math.max(0, ...Object.values(m.intensityBest || {}).concat(0));
    if (heatBest > 0) plaques.push(plq('🔥', 'MAX INTENSITY', heatBest));
    if (m.overtimeBest > 0) plaques.push(plq('⏰', 'OVERTIME WAVE', m.overtimeBest));
    const spared = Object.keys(m.sparedBosses || {}).length;
    if (spared > 0) plaques.push(plq('✌', 'BOSSES SPARED', spared));
    const petStars = Object.values(m.petXp || {}).filter(v => v >= 40).length;
    if (petStars > 0) plaques.push(plq('★', 'PETS EVOLVED', petStars));
    if (m.walrusKills > 0) plaques.push(plq('🦭', 'WALRUS DEFEATS', m.walrusKills));
    if (m.cured) plaques.push(plq('✨', 'CURED', '“allegedly”'));
    if (m.amaDone > 0) plaques.push(plq('🚪', 'LEFT AMA', m.amaDone + '×'));
    if (m.contractsDone > 0) plaques.push(plq('📝', 'CONTRACTS', m.contractsDone));
    if (m.janitorBuys > 0) plaques.push(plq('🧹', 'JANITOR TAB', m.janitorBuys + ' items'));
    const sp = Meta.data.splitsPB || {};
    const bestSplit = Object.keys(sp).map(k => ({ k, t: sp[k].total })).sort((a, b) => a.t - b.t)[0];
    if (bestSplit) plaques.push(plq('⏱', 'BEST PACE', Math.floor(bestSplit.t / 60) + ':' + ('0' + Math.floor(bestSplit.t % 60)).slice(-2)));
    if (!plaques.length) return '';
    return `<div class="tagline" style="margin-bottom:2px">🏆 THE TROPHY WALL</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px">${plaques.join('')}</div>`;
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
        ${this.trophyHtml()}
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
  Meta.idbRestore();   // if localStorage came up empty but the IndexedDB mirror has a save, recover it
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Meta.save(); });
  window.addEventListener('pagehide', () => Meta.save());
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
  let _deckRect = null;
  window.addEventListener('resize', () => { _deckRect = null; });
  function updateDeckStatus() {
    if (!dsCtx || !deckStatusEl.offsetParent) { _deckRect = null; return; } // offsetParent is null when the deck is display:none
    const hub = G.state === 'hub';
    if (!hub && !G.player) return;
    if (!hub && G.state !== 'run' && G.state !== 'pause' && G.state !== 'descend' && G.state !== 'dead' && G.state !== 'appeal') return;
    if (!_deckRect) _deckRect = deckStatusEl.getBoundingClientRect();   // measured once; resize invalidates (per-frame reads force layout)
    const rect = _deckRect;
    const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (deckStatusEl.width !== Math.round(w * dpr) || deckStatusEl.height !== Math.round(h * dpr)) {
      deckStatusEl.width = Math.round(w * dpr); deckStatusEl.height = Math.round(h * dpr);
    }
    dsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (hub) Render.drawDeckHub(dsCtx, w, h, G);
    else Render.drawDeckStatus(dsCtx, w, h, G);
  }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    Input.pollGamepad();
    if (G.state === 'cutscene' && typeof Story !== 'undefined' && Story.active) {
      try { Story.update(dt); Story.draw(); } catch (e) { Story.active = false; if (G.showTitle) G.showTitle(); }
    } else {
      if (G.state === 'run' || G.state === 'descend' || G.state === 'hub' || G.state === 'appeal' || G.state === 'credits') G.update(dt);
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
    storyGoto: (i) => { if (G.state === 'cutscene') { Story.idx = i; Story._loadPanel(); for (let k = 0; k < 60; k++) Story.update(0.05); Story.draw(); } },
    treatment: () => { G.showTreatmentPlan(() => G.showTitle()); },
    grantInsight: (n) => { Meta.data.insight = (Meta.data.insight || 0) + (n || 100); Meta.save(); return Meta.data.insight; },
    learn: (id) => { (Meta.data.talents || (Meta.data.talents = {}))[id] = 1; Meta.save(); }
  };

  G.showTitle();
  requestAnimationFrame(frame);
})();
