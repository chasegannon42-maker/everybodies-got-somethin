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
    if (this.sandbox) return;   // sandbox shifts earn nothing but experience
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
        ${(() => {
          const rules = this.dailyRules(info.seed).map(id => DATA.HOUSE_RULES.find(x => x.id === id)).filter(Boolean);
          return rules.length ? `<div class="rx" style="border-color:#c8a24a;margin-top:6px">
            <div class="stamp" style="color:#c8a24a;border-color:#c8a24a">HOUSE RULES</div>
            <div class="mech">${rules.map(r => r.icon + ' <b>' + r.name + '</b> — ' + r.desc).join('<br>')}</div>
          </div>` : '';
        })()}
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
        ${(() => { const B = this.bingoCard(); const got = Object.keys(B.marks).length; return `<button class="btn minor" id="bDailyBingo">🎱 WARD BINGO — ${got}/24 squares · ${B.linesPaid.length} lines paid</button>`; })()}
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
    const bbg = document.getElementById('bDailyBingo');
    if (bbg) bbg.onclick = () => { SFX.play('paper'); this.showBingo(() => this.showDaily()); };
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
    this.endSandbox();   // any imaginary shift ends at the front desk
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
        <div class="btnrow">
          <button class="btn" id="bDaily">🗓️ DAILY WARD</button>
          <button class="btn minor" id="bHub">🚪 WAITING ROOM</button>
        </div>
        <div class="secdiv">SECOND OPINIONS</div>
        <button class="btn minor" id="bFiles">📁 PATIENT FILES (choose your diagnosis)</button>
        <div class="btnrow">
          <button class="btn minor" id="bPrognosis">🎲 PROGNOSIS</button>
          <button class="btn minor" id="bProtocols">🧪 PROTOCOLS</button>
          ${(Meta.data.runs || 0) >= 1 ? '<button class="btn minor" id="bOvertime">⏰ OVERTIME</button>' : ''}
          <button class="btn minor" id="bWalkin">🚑 WALK-IN</button>
        </div>
        ${ngRow}
        <div class="secdiv">YOUR CHART</div>
        <button class="btn minor" id="bTreatment">🧠 TREATMENT PLAN (skill tree) · ◆ ${Meta.data.insight || 0}</button>
        <div class="btnrow">
          <button class="btn minor" id="bChart">📋 PATIENT CHART</button>
          <button class="btn minor" id="bStoryT">📖 CHART NOTES</button>
        </div>
        <div class="btnrow">
          <button class="btn minor" id="bBestiaryT">☠ BESTIARY</button>
          <button class="btn minor" id="bUnlocksT">🏆 UNLOCKS</button>
        </div>
        ${statsLine}
        <div class="secdiv">FRONT DESK</div>
        <div class="btnrow">
          <button class="btn minor" id="bHow">HOW TO PLAY</button>
          <button class="btn minor" id="bSettings">⚙ SETTINGS</button>
        </div>
        <button class="btn pamphlet" id="bHandbook">📘 THE PATIENT HANDBOOK <span style="font-size:11px;font-style:italic;opacity:.75">— take one, it's free</span></button>
        <button class="btn minor" id="bTester" style="opacity:.55;font-size:10px;padding:5px 10px;margin-top:4px">🔧 ${m.tester ? 'GAME TESTER' : 'STAFF ONLY'}</button>
        <div class="smallprint">A satire about a system that hands out labels like candy — not about the people living with them. Be kind, including to yourself. ♥</div>
      </div>`);
    document.getElementById('overlay').classList.add('lightbg');   // let the atmospheric backdrop show on the title
    this.paintWalrus('titleWalrus');
    const bCont = document.getElementById('bContinue');
    if (bCont) bCont.onclick = () => { SFX.init(); SFX.play('ui'); const S = this.loadCheckpoint(); if (S) this.resumeRun(S); else this.showTitle(); };
    document.getElementById('bStart').onclick = () => { SFX.init(); SFX.play('ui'); this.startCheckup(); };
    const bh = document.getElementById('bHub'); if (bh) bh.onclick = () => { SFX.init(); SFX.play('ui'); this.showHub(); };
    const bot2 = document.getElementById('bOvertime'); if (bot2) bot2.onclick = () => { SFX.init(); SFX.play('ui'); this.showOvertime(); };
    const bwi = document.getElementById('bWalkin'); if (bwi) bwi.onclick = () => { SFX.init(); SFX.play('ui'); this.showWalkin(); };
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
    document.getElementById('bHandbook').onclick = () => { SFX.init(); SFX.play('paper'); this.showHandbook(() => this.showTitle()); };
    document.getElementById('bUnlocksT').onclick = () => { SFX.init(); SFX.play('ui'); this.showUnlocks(() => this.showTitle()); };
    document.getElementById('bSettings').onclick = () => { SFX.init(); SFX.play('ui'); this.showSettings(() => this.showTitle()); };
    const brh = document.getElementById('bRunHist'); if (brh) brh.onclick = () => { SFX.init(); SFX.play('ui'); this.showStats(() => this.showTitle()); };
    const bts = document.getElementById('bTester');
    if (bts) bts.onclick = () => { SFX.init(); SFX.play('ui'); Meta.data.tester ? this.showTester(() => this.showTitle()) : this.showTesterGate(); };
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
          // PLAYDATE: a second slot opens when two animals are fully evolved
          const xp = Meta.data.petXp || {};
          const evolved = DATA.PETS.filter(pt => pt.unlock(Meta.data) && (xp[pt.id] || 0) >= 40);
          let pairRow = '';
          if (Meta.data.pet && evolved.length >= 2) {
            const opts = evolved.filter(pt => pt.id !== Meta.data.pet).map(pt =>
              `<button class="btn minor" data-pet2="${pt.id}" style="font-size:11px;${Meta.data.pet2 === pt.id ? 'outline:2px solid #e8c84c' : ''}">${pt.icon} ${pt.name} ★</button>`).join('');
            pairRow = `<div class="tagline" style="margin:6px 0 2px">🐾 Playdate (second ★ animal)</div><div class="btnrow" style="flex-wrap:wrap"><button class="btn minor" data-pet2="" style="font-size:11px;${!Meta.data.pet2 ? 'outline:2px solid #e8c84c' : ''}">∅ solo shift</button>${opts}</div>`;
          }
          return `<div class="tagline" style="margin:10px 0 2px">Emotional Support Animal</div><div class="btnrow" style="flex-wrap:wrap">${btns}</div>${pairRow}`;
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
    document.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { SFX.play('ui'); Meta.data.pet = b.dataset.pet || null; if (!Meta.data.pet || Meta.data.pet === Meta.data.pet2) Meta.data.pet2 = null; Meta.save(); this.showSettings(returnTo); });
    document.querySelectorAll('[data-pet2]').forEach(b => b.onclick = () => { SFX.play('ui'); Meta.data.pet2 = b.dataset.pet2 || null; Meta.save(); this.showSettings(returnTo); });
    const bpa = document.getElementById('bPaToggle');
    if (bpa) bpa.onclick = () => { SFX.play('ui'); Meta.data.paOff = Meta.data.paOff ? 0 : 1; Meta.save(); bpa.textContent = ct(!Meta.data.paOff, 'Intercom (Dr. Walrus PA)'); };
    const bsr = document.getElementById('bSpeedrun');
    if (bsr) bsr.onclick = () => { SFX.play('ui'); Meta.data.speedrun = Meta.data.speedrun ? 0 : 1; Meta.save(); bsr.textContent = ct(!!Meta.data.speedrun, 'Speedrun timer + splits'); };
    const bsd = document.getElementById('bSaveData');
    if (bsd) bsd.onclick = () => { SFX.play('ui'); this.showSaveData(() => this.showSettings(returnTo)); };
    document.getElementById('bSetBack').onclick = () => { SFX.play('ui'); returnTo(); };
  },

  /* ---------- DAILY HOUSE RULES (posted at the door; same for everyone) ---------- */
  dailyRules(seed) {
    return withSeed(hashSeed(seed, ['houserules']), () => {
      const n = U.chance(0.55) ? 2 : 1;
      return U.shuffle(DATA.HOUSE_RULES.slice()).slice(0, n).map(r => r.id);
    });
  },
  hasRule(id) { return !!(this.houseRules && this.houseRules.includes(id)); },
  hasCal(id) { return this.calDay != null && DATA.CALENDAR[this.calDay] && DATA.CALENDAR[this.calDay].id === id; },

  /* ---------- THE PATIENT DIARY (the run writes itself down) ---------- */
  diaryNote(txt) {
    if (this.practice || this.sandbox || this.overtime) return;
    const D = this._diary || (this._diary = []);
    if (D.length < 22) D.push(txt);
  },
  composeDiary(out) {
    if (this.practice || this.sandbox || this.overtime) return;
    try {
      const p = this.player;
      const day = Meta.data.dayCount = (Meta.data.dayCount || 0) + 1;
      const D = DATA.DIAG[p.diag] || { name: p.diag };
      const open = 'Checked in as ' + D.name + (this.daily ? ' (the house picked)' : '') + '. Made it to ward ' + this.depth + '.';
      const cause = this._causeName ? this._causeName(p._lastSrc || 'unknown') : 'something';
      const closers = {
        dead: 'Then the ' + cause + ' got me. Filed under: recurring.',
        cured: 'They said the word. “Cured.” The building disagreed, quietly, through the vents.',
        ama: 'Left through the fire door, against advice. The morning was free. The bill was not.',
        walkin: 'In and out in one appointment. The bill still found the mailbox first.',
        handoff: 'Took the mop. He walked out into the morning. The floor is mine now.',
        quit: 'Walked out mid-appointment. No regrets. Some regrets. One regret, recurring.'
      };
      const lines = [open].concat((this._diary || []).slice(0, 14)).concat([closers[out] || closers.quit]);
      const log = Meta.data.diary || (Meta.data.diary = []);
      log.push({ day, t: this.todayKey(), diag: p.baseDiag === 'undiag' ? 'undiag' : p.diag, ward: this.depth, out, lines });
      while (log.length > 20) log.shift();
    } catch (e) { }
  },
  showJournal(returnTo) {
    this.state = 'journal';
    SFX.play('paper');
    const log = (Meta.data.diary || []).slice().reverse();
    const tag = e => e.out === 'cured' ? '✓ cured' : e.out === 'ama' ? '🚪 left AMA' : e.out === 'quit' ? 'walked out' : '☠ didn\'t';
    const rows = log.length ? log.map((e, i) => `
      <div class="ach got" data-de="${i}" style="cursor:pointer">
        <div class="achicon">📔</div>
        <div class="achbody">
          <div class="achname">DAY ${e.day} — ${(DATA.DIAG[e.diag] || { name: e.diag }).name}</div>
          <div class="achdesc">ward ${e.ward} · ${tag(e)} · ${e.lines.length} lines</div>
        </div>
      </div>`).join('')
      : '<div class="stats-line">The journal is blank. It\'s waiting. It\'s very patient. It lives here.</div>';
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">📔 THE PATIENT DIARY</h1>
        <div class="tagline">it writes itself, one run at a time. nobody asked it to.</div>
        <div class="achlist">${rows}</div>
        <button class="btn" id="bJournalBack">BACK</button>
      </div>`);
    document.querySelectorAll('[data-de]').forEach(b => b.onclick = () => { SFX.play('paper'); this.showJournalPage(log[+b.dataset.de], returnTo); });
    document.getElementById('bJournalBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },
  showJournalPage(e, returnTo) {
    this.state = 'journal';
    const body = e.lines.map(l => `<div style="margin:7px 0;line-height:1.45">${l}</div>`).join('');
    this.overlay(`
      <div class="panel wide">
        <div class="docpaper">
          <div class="docstamp" style="color:#7a5a9a;border-color:#7a5a9a">DAY ${e.day}</div>
          <div class="doctitle">📔 ${(DATA.DIAG[e.diag] || { name: e.diag }).name} · ward ${e.ward}</div>
          <div class="docsub">${e.t || ''} · patient's own hand · legibility: disputed</div>
          <div class="docbody">${body}</div>
        </div>
        <button class="btn" id="bDiaryPgBack">CLOSE THE JOURNAL</button>
      </div>`);
    document.getElementById('bDiaryPgBack').onclick = () => { SFX.play('paper'); this.showJournal(returnTo); };
  },

  /* ---------- MISFILED DOCUMENTS (the building's paperwork surfaces) ---------- */
  showDocument(id, returnTo) {
    const D = (DATA.DOCUMENTS || []).find(d => d.id === id);
    if (!D) return;
    const wasRun = this.state === 'run';
    this.state = 'document';
    SFX.play('paper');
    const docs = Meta.data.docs || (Meta.data.docs = {});
    if (!docs[id]) {
      docs[id] = 1;
      Meta.save();
      this.diaryNote('Found misfiled paperwork: “' + D.title + '.” Reading it felt like trespassing. Kept it.');
      this.bingoEvent('doc');
    }
    const got = Object.keys(docs).length, total = (DATA.DOCUMENTS || []).length;
    const body = D.body.map(l => `<div style="margin:8px 0;line-height:1.45">${l}</div>`).join('');
    this.overlay(`
      <div class="panel wide">
        <div class="docpaper">
          <div class="docstamp">MISFILED</div>
          <div class="doctitle">${D.icon} ${D.title}</div>
          <div class="docsub">${D.sub}</div>
          <div class="docbody">${body}</div>
          <div class="docfoot">ARCHIVE · ${got} / ${total} recovered · refiled under: you</div>
        </div>
        <button class="btn" id="bDocBack">🗂 FILE IT PROPERLY (keep it)</button>
      </div>`);
    document.getElementById('bDocBack').onclick = () => {
      SFX.play('stamp');
      this.checkUnlocks();
      if (returnTo) returnTo();
      else if (wasRun) { this.hideOverlay(); this.state = 'run'; }
      else this.showTitle();
    };
  },

  /* ============================================================
     GAME TESTER (STAFF ONLY — the secret menu behind the code)
     Sandbox runs and the room designer never touch the real save:
     Meta.save() is latched off and Meta.data is snapshot-restored.
     ============================================================ */
  showTesterGate() {
    this.state = 'testergate';
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🔧 STAFF ONLY</h1>
        <div class="tagline">authorized personnel, contractors, and whoever knows the code</div>
        <div class="setrow"><label>ACCESS CODE:</label>
          <input type="password" id="tgIn" class="seedfield" maxlength="24" placeholder="•••••" autocomplete="off"></div>
        <button class="btn" id="bTgGo">🔓 CLOCK IN</button>
        <div class="smallprint">hint: it's what the building actually runs on.</div>
        <button class="btn minor" id="bTgBack">BACK</button>
      </div>`);
    const tryCode = () => {
      const v = String(document.getElementById('tgIn').value || '').trim().toLowerCase();
      if (v === 'money') {
        Meta.data.tester = 1; Meta.save();
        SFX.play('fanfare');
        this.toast('🔧 Badge accepted. Welcome to the staff side. Mind the wet floor.', '#8fd08a');
        this.showTester(() => this.showTitle());
      } else {
        SFX.play('denied');
        this.toast('That is not the code. This attempt will be billed.', '#e08a8a');
      }
    };
    document.getElementById('bTgGo').onclick = tryCode;
    document.getElementById('tgIn').onkeydown = (e) => { if (e.key === 'Enter') tryCode(); };
    document.getElementById('bTgBack').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },
  /* ============================================================
     GAME TESTER 2.0 — a tabbed staff hub:
     PLAY (sandbox + loadouts) · BOSS LAB · TRIGGERS (scenario
     jumper) · DESIGNER (+ room library) · TOOLS (time, inspector)
     ============================================================ */
  showTester(returnTo) {
    this.endSandbox();   // stepping into the office ends any imaginary shift
    this.state = 'tester';
    this._testerReturn = returnTo || (() => this.showTitle());
    if (!this._testerTab) this._testerTab = 'play';
    const tabs = [['play', '🏖 PLAY'], ['boss', '🥊 BOSS LAB'], ['trig', '⚡ TRIGGERS'], ['design', '🏗 DESIGNER'], ['tools', '🔧 TOOLS']];
    const tabBtns = tabs.map(([k, l]) => `<button class="btn minor codextab${k === this._testerTab ? ' active' : ''}" data-tt="${k}" style="${k === this._testerTab ? 'outline:2px solid #e8c84c' : ''}">${l}</button>`).join('');
    const body = this._testerTab === 'play' ? this._tabPlay()
      : this._testerTab === 'boss' ? this._tabBossLab()
      : this._testerTab === 'trig' ? this._tabTriggers()
      : this._testerTab === 'design' ? this._tabDesign()
      : this._tabTools();
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:24px">🔧 GAME TESTER</h1>
        <div class="tagline">staff hub · sandbox shifts never touch the real save</div>
        <div class="codextabs">${tabBtns}</div>
        ${body}
        <button class="btn" id="bTesterBack">BACK</button>
      </div>`);
    document.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { SFX.play('ui'); this._testerTab = b.dataset.tt; this.showTester(this._testerReturn); });
    this._wireTesterTab();
    document.getElementById('bTesterBack').onclick = () => { SFX.play('ui'); this._testerReturn(); };
  },

  /* ---- PLAY tab: sandbox + loadout presets ---- */
  _tabPlay() {
    this._sbWard = this._sbWard || 1;
    const L = this._sbLoadout || (this._sbLoadout = { preset: 'standard', items: [] });
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout', 'seasonal'];
    const chips = order.map(id => `<button class="btn minor" data-sb="${id}" style="font-size:11px;padding:5px 7px;${(this._sbDiag || 'adhd') === id ? 'outline:2px solid #e8c84c' : ''}">${DATA.DIAG[id] ? DATA.DIAG[id].name : id}</button>`).join('');
    const presets = [['standard', 'STANDARD', 'as checked in'], ['kitted', 'KITTED', '+3 meds, +2 hearts, +20¢'], ['glass', 'GLASS CANNON', 'dmg ×3, two hearts'], ['tank', 'TANK', '+4 hearts, dmg ×0.8'], ['custom', 'CUSTOM', 'hand-pick meds below']];
    const pBtns = presets.map(([id, name, sub]) => `<button class="btn minor" data-lp="${id}" style="font-size:11px;${L.preset === id ? 'outline:2px solid #e8c84c' : ''}" title="${sub}">${name}</button>`).join('');
    const itemOpts = Object.keys(DATA.ITEMS).sort((a, b) => DATA.ITEMS[a].name.localeCompare(DATA.ITEMS[b].name)).map(id => `<option value="${id}">${DATA.ITEMS[id].name}</option>`).join('');
    const customRow = L.preset === 'custom' ? `
      <div class="setrow"><label>℞ add:</label><select id="sbItemSel" class="seedfield">${itemOpts}</select><button class="btn minor" id="bSbAddItem">ADD</button></div>
      <div class="stats-line">${L.items.length ? L.items.map((id, i) => `<button class="btn minor" data-li="${i}" style="font-size:10px;padding:3px 7px">✖ ${(DATA.ITEMS[id] || {}).name || id}</button>`).join(' ') : 'no meds picked — add up to 8'}</div>` : '';
    return `
      <div class="tagline" style="margin-top:2px">pick a patient, a ward, a loadout — nothing counts, everything is possible</div>
      <div class="btnrow" style="flex-wrap:wrap">${chips}</div>
      <div class="setrow" style="justify-content:center;gap:10px">
        <button class="btn minor" id="bSbDn" style="min-width:40px">−</button>
        <span id="sbWardLbl" style="font-weight:bold;min-width:150px;text-align:center">START AT WARD ${this._sbWard}</span>
        <button class="btn minor" id="bSbUp" style="min-width:40px">+</button>
      </div>
      <div class="btnrow" style="flex-wrap:wrap">${pBtns}</div>
      ${customRow}
      <button class="btn" id="bSbGo">▶ CHECK IN (off the record)</button>`;
  },

  /* ---- BOSS LAB tab: any boss, any conditions ---- */
  _tabBossLab() {
    const B = this._labCfg || (this._labCfg = { boss: 'gatekeeper', depth: 5, affix: '', shift2: false, joint: '' });
    const bossIds = ['gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'peerreview', 'withdrawal', 'burnout', 'merger', 'walrus', 'thecure', 'founder', 'thesystem', 'theboard'];
    const bossOpts = bossIds.map(id => `<option value="${id}" ${B.boss === id ? 'selected' : ''}>${(DATA.BOSSES[id] || { name: id }).name}</option>`).join('');
    const affixOpts = ['', ...DATA.BOSS_AFFIXES.map(a => a.id)].map(id => `<option value="${id}" ${B.affix === id ? 'selected' : ''}>${id ? id.toUpperCase() : '— no affix —'}</option>`).join('');
    const jointPool = ['', 'gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'withdrawal', 'burnout', 'peerreview'];
    const jointOpts = jointPool.map(id => `<option value="${id}" ${B.joint === id ? 'selected' : ''}>${id ? '+ ' + (DATA.BOSSES[id] || { name: id }).name : '— solo —'}</option>`).join('');
    const s2ok = ['gatekeeper', 'larperking', 'adjuster'].includes(B.boss);
    return `
      <div class="tagline" style="margin-top:2px">rehearse any manager under any conditions — sandbox rules, nothing records</div>
      <div class="setrow"><label>☠ boss:</label><select id="labBoss" class="seedfield">${bossOpts}</select></div>
      <div class="setrow" style="justify-content:center;gap:10px">
        <button class="btn minor" id="bLabDn" style="min-width:40px">−</button>
        <span id="labDepthLbl" style="font-weight:bold;min-width:150px;text-align:center">AT DEPTH ${B.depth}</span>
        <button class="btn minor" id="bLabUp" style="min-width:40px">+</button>
      </div>
      <div class="setrow"><label>👑 affix:</label><select id="labAffix" class="seedfield">${affixOpts}</select></div>
      <div class="setrow"><label>🏥 joint:</label><select id="labJoint" class="seedfield">${jointOpts}</select></div>
      <button class="btn minor" id="bLabS2" ${s2ok ? '' : 'disabled style="opacity:.5"'}>${B.shift2 && s2ok ? '✅' : '⬜'} SECOND SHIFT (the early three only)</button>
      <button class="btn" id="bLabGo">🥊 START THE FIGHT</button>`;
  },

  /* ---- TRIGGERS tab: the scenario jumper ---- */
  _tabTriggers() {
    const rows = this.TESTER_SCENARIOS.map((s, i) => `<button class="btn minor" data-sc="${i}" style="font-size:11px;padding:6px 9px;text-align:left">${s.icon} <b>${s.name}</b> — <i style="opacity:.75">${s.sub}</i></button>`).join('');
    return `
      <div class="tagline" style="margin-top:2px">one click drops you into the encounter, pre-armed — no RNG required (sandbox)</div>
      <div class="btnrow" style="flex-wrap:wrap;gap:5px">${rows}</div>`;
  },

  /* ---- DESIGNER tab: launch + room library ---- */
  _tabDesign() {
    let lib = [];
    try { lib = JSON.parse(localStorage.getItem('egs_roomlib') || '[]'); } catch (e) { }
    const rows = lib.length ? lib.map((r, i) => `
      <div class="ach got" style="padding:4px 8px">
        <div class="achicon">🏗</div>
        <div class="achbody"><div class="achname">${r.name}</div></div>
        <button class="btn minor" data-libload="${i}" style="font-size:10px;padding:4px 8px">LOAD</button>
        <button class="btn minor" data-libdel="${i}" style="font-size:10px;padding:4px 8px">🗑</button>
      </div>`).join('') : '<div class="stats-line" style="opacity:.7">no saved rooms yet — build one and SAVE AS from the designer</div>';
    return `
      <div class="tagline" style="margin-top:2px">the drafting table, plus your saved-room library (stored on this device, outside the save)</div>
      <button class="btn" id="bTDesign">🏗 OPEN THE ROOM DESIGNER</button>
      <div class="achlist">${rows}</div>`;
  },

  /* ---- TOOLS tab: cheats, time, inspector ---- */
  _tabTools() {
    const ct = on => on ? '✅' : '⬜';
    return `
      <div class="tagline" style="margin-top:2px">session switches — time and inspection work mid-run too (PAUSE → 🔧 TESTER TOOLS)</div>
      <button class="btn minor" id="bTGod">${ct(!!this.god)} GOD MODE (session)</button>
      <button class="btn minor" id="bTDebug">${ct(!!this.debug)} DEBUG KEYS (session) — N floor · B boss · K clear · H heal · G goods</button>
      <button class="btn minor" id="bTFps">${ct(!!Meta.data.fpsHud)} FPS + ENTITY OVERLAY (saved)</button>
      <button class="btn minor" id="bTHitbox">${ct(!!this.hitboxes)} HITBOX OVERLAY (session)</button>
      <button class="btn minor" id="bTInspect">${ct(!!this.inspect)} TAP-TO-INSPECT entities (session)</button>
      <div class="setrow" style="justify-content:center;gap:8px">
        <label>⏱ time:</label>
        ${[0.25, 0.5, 1, 2, 4].map(v => `<button class="btn minor" data-ts="${v}" style="min-width:44px;${(this.timeScale || 1) === v ? 'outline:2px solid #e8c84c' : ''}">${v}×</button>`).join('')}
      </div>
      <div class="smallprint">in-run keys (tester): <span class="kbd">,</span> slower · <span class="kbd">.</span> faster · <span class="kbd">/</span> pause+step one frame</div>
      <button class="btn minor" id="bTLock">🔒 RESET TESTER ACCESS (forget the code)</button>`;
  },

  _wireTesterTab() {
    const R = this._testerReturn;
    // PLAY
    document.querySelectorAll('[data-sb]').forEach(b => b.onclick = () => { SFX.play('ui'); this._sbDiag = b.dataset.sb; this.showTester(R); });
    const upd = () => { const el = document.getElementById('sbWardLbl'); if (el) el.textContent = 'START AT WARD ' + this._sbWard; };
    const bup = document.getElementById('bSbUp'); if (bup) bup.onclick = () => { SFX.play('ui'); this._sbWard = Math.min(40, this._sbWard + 1); upd(); };
    const bdn = document.getElementById('bSbDn'); if (bdn) bdn.onclick = () => { SFX.play('ui'); this._sbWard = Math.max(1, this._sbWard - 1); upd(); };
    document.querySelectorAll('[data-lp]').forEach(b => b.onclick = () => { SFX.play('ui'); this._sbLoadout.preset = b.dataset.lp; this.showTester(R); });
    const bai = document.getElementById('bSbAddItem');
    if (bai) bai.onclick = () => {
      const id = document.getElementById('sbItemSel').value;
      if (DATA.ITEMS[id] && this._sbLoadout.items.length < 8) { this._sbLoadout.items.push(id); SFX.play('ui'); this.showTester(R); }
    };
    document.querySelectorAll('[data-li]').forEach(b => b.onclick = () => { SFX.play('ui'); this._sbLoadout.items.splice(+b.dataset.li, 1); this.showTester(R); });
    const bgo = document.getElementById('bSbGo'); if (bgo) bgo.onclick = () => { SFX.play('stamp'); this.beginSandbox(this._sbDiag || 'adhd', this._sbWard || 1); };
    // BOSS LAB
    const lb = document.getElementById('labBoss');
    if (lb) {
      const B = this._labCfg;
      lb.onchange = () => { B.boss = lb.value; this.showTester(R); };
      document.getElementById('labAffix').onchange = (e) => { B.affix = e.target.value; };
      document.getElementById('labJoint').onchange = (e) => { B.joint = e.target.value; };
      const updL = () => { document.getElementById('labDepthLbl').textContent = 'AT DEPTH ' + B.depth; };
      document.getElementById('bLabUp').onclick = () => { SFX.play('ui'); B.depth = Math.min(40, B.depth + 1); updL(); };
      document.getElementById('bLabDn').onclick = () => { SFX.play('ui'); B.depth = Math.max(1, B.depth - 1); updL(); };
      const bs2 = document.getElementById('bLabS2');
      if (bs2) bs2.onclick = () => { B.shift2 = !B.shift2; SFX.play('ui'); this.showTester(R); };
      document.getElementById('bLabGo').onclick = () => { SFX.play('boss'); this.startBossLab(Object.assign({}, B)); };
    }
    // TRIGGERS
    document.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { SFX.play('stamp'); this.runScenario(+b.dataset.sc); });
    // DESIGNER
    const btd = document.getElementById('bTDesign'); if (btd) btd.onclick = () => { SFX.play('ui'); this.showDesigner(); };
    document.querySelectorAll('[data-libload]').forEach(b => b.onclick = () => {
      try {
        const lib = JSON.parse(localStorage.getItem('egs_roomlib') || '[]');
        const r = lib[+b.dataset.libload];
        if (r && this.parseDesignCode(r.code)) { SFX.play('fanfare'); this.showDesigner(); }
      } catch (e) { }
    });
    document.querySelectorAll('[data-libdel]').forEach(b => b.onclick = () => {
      try {
        const lib = JSON.parse(localStorage.getItem('egs_roomlib') || '[]');
        lib.splice(+b.dataset.libdel, 1);
        localStorage.setItem('egs_roomlib', JSON.stringify(lib));
        SFX.play('paper');
        this.showTester(R);
      } catch (e) { }
    });
    // TOOLS
    const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    wire('bTGod', () => { SFX.play('ui'); this.god = !this.god; this.showTester(R); });
    wire('bTDebug', () => { SFX.play('ui'); this.debug = !this.debug; this.showTester(R); });
    wire('bTFps', () => { SFX.play('ui'); Meta.data.fpsHud = Meta.data.fpsHud ? 0 : 1; Meta.save(); this.showTester(R); });
    wire('bTHitbox', () => { SFX.play('ui'); this.hitboxes = !this.hitboxes; this.showTester(R); });
    wire('bTInspect', () => { SFX.play('ui'); this.inspect = !this.inspect; this.showTester(R); });
    document.querySelectorAll('[data-ts]').forEach(b => b.onclick = () => { SFX.play('ui'); this.timeScale = parseFloat(b.dataset.ts); this.showTester(R); });
    wire('bTLock', () => { SFX.play('stamp'); Meta.data.tester = 0; Meta.save(); this.toast('🔒 Badge surrendered. The code still works, if you still know it.', '#b8b0a0'); this.showTitle(); });
  },
  beginSandbox(diagId, depth, opts) {
    opts = opts || {};
    if (!this._metaSnap) this._metaSnap = JSON.stringify(Meta.data);   // freeze the real save
    Meta._noSave = true;
    this._sandboxStart = true;
    this._startPlan = null; this._startIntensity = 0; this._startVolunteer = false; this._startCustom = null;
    this._startChronic = false; this._startBossRush = false; this._startPrognosis = null; this._startProtocol = null;
    this.beginRun(diagId);
    this._runLogged = true;   // nothing about this run is ever recorded
    // loadout presets (PLAY tab)
    const L = this._sbLoadout;
    if (L && !opts.noLoadout) {
      const p = this.player;
      if (L.preset === 'kitted') {
        const pool = U.shuffle(DATA.POOLS.special.slice());
        for (let i = 0; i < 3 && pool[i]; i++) p.addItem(pool[i], this, true);
        p.maxhp += 4; p.hp = p.maxhp; p.coins += 20;
      } else if (L.preset === 'glass') { p.dmg *= 3; p.maxhp = 2; p.hp = 2; }
      else if (L.preset === 'tank') { p.maxhp += 8; p.hp = p.maxhp; p.dmg *= 0.8; }
      else if (L.preset === 'custom') { for (const id of (L.items || [])) if (DATA.ITEMS[id]) p.addItem(id, this, true); p.hp = p.maxhp; }
      if (L.preset !== 'standard') this.toast('🎒 Loadout: ' + L.preset.toUpperCase() + (L.preset === 'custom' ? ' (' + (L.items || []).length + ' meds)' : ''), '#8fd0e0');
    }
    if (depth > 1) { this.depth = depth; this.newFloor(); }
    if (!opts.silent) {
      this.setBanner('🏖 SANDBOX', 'nothing counts. everything is possible.', 2.6);
      this.toast('🏖 Sandbox shift: saves, unlocks and stats stay untouched. Quit to title to clock out.', '#8fd0e0');
    }
  },
  // scenarios need a live sandbox at a given depth
  ensureSandboxAt(depth) {
    const diag = this._sbDiag || ((Meta.data.lastDiag && DATA.DIAG[Meta.data.lastDiag]) ? Meta.data.lastDiag : 'adhd');
    this.beginSandbox(diag, depth, { silent: true });
  },

  /* ---- THE SCENARIO JUMPER: every special encounter, pre-armed ---- */
  TESTER_SCENARIOS: [
    { icon: '🏁', name: 'Rival race', sub: 'an item room with the race already armed', run(G) {
      G.ensureSandboxAt(3);
      const r = G.floorRooms.find(x => x.type === 'normal' && x !== G.room); r.type = 'item'; r.lockOpen = true; r.spawned = false;
      G.enterRoom(r, null);
      const ped = G.peds.find(pd => pd.kind === 'item' && !pd.taken);
      if (ped && !G.race) {
        const R = G.ensureRival(), p = G.player;
        const d0 = U.dist(p.x, p.y, ped.x, ped.y), a0 = U.ang(p.x, p.y, ped.x, ped.y);
        G.race = { x: U.clamp(ped.x + Math.cos(a0) * d0, RX + 30, RX + RW - 30), y: U.clamp(ped.y + Math.sin(a0) * d0, RY + 30, RY + RH - 30), ped, done: false, spd: Math.max(172, (p.spd || 200) * 0.96), t: 0 };
        G.setBanner('🏁 ' + R.name + ' WANTS IT', 'scenario: beat them to the pedestal', 2.2);
      }
    } },
    { icon: '🥊', name: 'Rival duel', sub: 'the gym, gloves on', run(G) {
      G.ensureSandboxAt(4);
      const r = G.floorRooms.find(x => x.type === 'normal' && x !== G.room); r.type = 'gym'; r.spawned = false;
      G.enterRoom(r, null);
    } },
    { icon: '✊', name: 'Union drive', sub: 'six patients, one rep, live', run(G) {
      G.ensureSandboxAt(4);
      const p = G.player;
      for (let i = 0; i < 6; i++) { const e = new Enemy(DATA.pickEnemy(4, null), U.clamp(p.x + U.rand(-220, 220), RX + 40, RX + RW - 40), U.clamp(p.y + U.rand(-150, 150), RY + 40, RY + RH - 40), 4, false, 1); e.spawnT = 0; G.enemies.push(e); }
      G.room.cleared = false; G.room.spawned = true;
      G.unionize();
    } },
    { icon: '🕴', name: 'THE INSPECTION', sub: 'the tour, 60s, hold your fire', run(G) {
      G.ensureSandboxAt(5);
      G.inspection = { pending: true }; G._inspectionDone = true;
      const r = G.floorRooms.find(x => x.type === 'normal' && !x.cleared && x !== G.room);
      G.enterRoom(r, null);
    } },
    { icon: '📋', name: 'THE MIX-UP', sub: 'someone else\'s chart, right now', run(G) {
      G.ensureSandboxAt(3);
      const p = G.player;
      const pool = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia'].filter(d => d !== p.diag);
      const nd = U.choice(pool);
      G._mixup = { orig: p.baseDiag, depth: G.depth };
      p.rediagnose(nd);
      G.setBanner('📋 THE MIX-UP', 'scenario: you are now ' + DATA.DIAG[nd].name, 2.8);
    } },
    { icon: '🚧', name: 'Incident site', sub: 'your outline, a sleeping guard, evidence', run(G) {
      Meta.data.incident = { depth: 3, diag: 'adhd', cause: 'larper', item: 'bluelight' };
      G.ensureSandboxAt(3);
      const r = G.floorRooms.find(x => x.type === 'normal' && x !== G.room); r.type = 'incident'; r.spawned = false;
      G.enterRoom(r, null);
    } },
    { icon: '🗄', name: 'Records heist', sub: 'three patrols, one original file', run(G) {
      G.ensureSandboxAt(5);
      const r = G.floorRooms.find(x => x.type === 'normal' && x !== G.room); r.type = 'records'; r.spawned = false;
      G.enterRoom(r, null);
    } },
    { icon: '🚪', name: 'THE ANNEX', sub: 'the condemned wing, from the top', run(G) {
      G.ensureSandboxAt(4);
      G.enterAnnex();
    } },
    { icon: '🏥', name: 'Joint Commission', sub: 'two managers, one paycheck', run(G) {
      G.startBossLab({ boss: 'peerreview', depth: 16, affix: '', shift2: false, joint: 'adjuster' });
    } },
    { icon: '🌙', name: 'Second Shift boss', sub: 'the gatekeeper, sixteen hours in', run(G) {
      G.startBossLab({ boss: 'gatekeeper', depth: 12, affix: '', shift2: true, joint: '' });
    } },
    { icon: '📈', name: 'THE MERGER', sub: 'the acquisition, ward 31', run(G) {
      G.startBossLab({ boss: 'merger', depth: 31, affix: '', shift2: false, joint: '' });
    } },
    { icon: '💉', name: 'Night Nurse clinic', sub: 'lights out. it\'s policy.', run(G) {
      G.ensureSandboxAt(4);
      G.nightShift = true;
      const r = G.floorRooms.find(x => x.type === 'normal' && x !== G.room); r.type = 'clinic'; r.spawned = false;
      G.enterRoom(r, null);
    } },
    { icon: '🕯', name: 'Ward 13', sub: 'the curated floor, candles lit', run(G) {
      G.ensureSandboxAt(13);
    } },
    { icon: '🌑', name: 'Shadow ward', sub: 'mirrored halls, shadow patients', run(G) {
      const diag = G._sbDiag || 'adhd';
      G.beginSandbox(diag, 1, { silent: true });
      G.depth = 7; G._forceShadow = true; G.newFloor();
    } },
    { icon: '🚶', name: 'The Stairwell', sub: 'the dodge gauntlet, mid-descent', run(G) {
      G.ensureSandboxAt(3);
      G.startStairs();
    } },
    { icon: '🌤', name: 'The Roof', sub: 'tomatoes, the nest, the view', run(G) {
      G.ensureSandboxAt(6);
      G.enterRoof();
    } },
    { icon: '🧯', name: 'Fire alarm', sub: 'the box, the sign, the handle', run(G) {
      G.ensureSandboxAt(3);
      G.peds.push({ x: G.player.x + 60, y: G.player.y, kind: 'firealarm', taken: false });
    } },
    { icon: '📞', name: 'Payphone', sub: '1¢ a call, all four lines', run(G) {
      G.ensureSandboxAt(3);
      G.player.coins = Math.max(G.player.coins, 5);
      G.peds.push({ x: G.player.x + 60, y: G.player.y, kind: 'payphone', taken: false });
    } },
    { icon: '📉', name: 'The Actuary', sub: 'your odds, one decimal', run(G) {
      G.ensureSandboxAt(3);
      G.player.coins = Math.max(G.player.coins, 10);
      G.peds.push({ x: G.player.x + 60, y: G.player.y, kind: 'actuary', taken: false });
    } },
    { icon: '🎤', name: 'Open mic', sub: 'someone\'s on the step stool', run(G) {
      G.ensureSandboxAt(3);
      G.peds.push({ x: G.player.x + 60, y: G.player.y, kind: 'openmic', performer: U.choice(['larper', 'scroller', 'doubt', 'deadline', 'ad', 'gaslighter']), taken: false });
    } },
    { icon: '🧹', name: 'Janitor + basement', sub: 'the cart, then the stairs down', run(G) {
      G.ensureSandboxAt(3);
      const p = G.player;
      p.coins = Math.max(p.coins, 30);
      const pool = U.shuffle([].concat(DATA.POOLS.special, DATA.POOLS.shop)).filter(id => !p.items.includes(id));
      G.peds.push({ x: p.x + 60, y: p.y, kind: 'janitor', itemId: pool[0] || DATA.POOLS.special[0], price: 6, taken: false, _greeted: false });
      G.peds.push({ x: p.x + 130, y: p.y + 30, kind: 'basementdoor', taken: false });
    } },
    { icon: '💊', name: 'Drug Rep', sub: 'the samples are FREE', run(G) {
      G.ensureSandboxAt(3);
      const p = G.player;
      G.peds.push({ x: p.x + 60, y: p.y - 40, kind: 'drugrep', taken: false });
      const pool = U.shuffle(DATA.POOLS.special.slice());
      [0, 1, 2].forEach(i => G.peds.push({ x: p.x - 40 + i * 90, y: p.y + 70, kind: 'sample', itemId: pool[i], fx: U.choice(DATA.SAMPLE_FX).id, repGroup: 1, taken: false }));
    } },
    { icon: '🔔', name: 'THE AUDITOR', sub: 'it has your file already', run(G) {
      G.ensureSandboxAt(6);
      const a = new Enemy('auditor', RX + 70, RY + 70, 6, false, 1);
      a.spawnT = 0.8;
      G.enemies.push(a);
      G.auditorHp = a.hp; G.auditorDown = false;
      G.room.cleared = false; G.room.spawned = true;
      G.setBanner('🔔 THE AUDITOR', 'scenario: it follows through doors', 2.4);
    } },
    { icon: '🚪', name: 'AMA door', sub: 'ward 8 day room, the exit sign', run(G) {
      G.ensureSandboxAt(8);
      const r = G.floorRooms.find(x => x.type === 'normal' && x !== G.room); r.type = 'dayroom'; r.spawned = false;
      G.enterRoom(r, null);
    } },
    { icon: '🎩', name: 'Casual Friday', sub: 'hats on everything, right now', run(G) {
      G.ensureSandboxAt(3);
      G.calDay = 5;
      const p = G.player;
      for (let i = 0; i < 5; i++) { const e = new Enemy(DATA.pickEnemy(3, null), U.clamp(p.x + U.rand(-200, 200), RX + 40, RX + RW - 40), U.clamp(p.y + U.rand(-140, 140), RY + 40, RY + RH - 40), 3, false, 1); e.spawnT = 0; G.enemies.push(e); }
      G.room.cleared = false; G.room.spawned = true;
      G.toast('🎩 Scenario: it is now, locally and legally, Casual Friday.', '#c8b878');
    } }
  ],
  runScenario(i) {
    const s = this.TESTER_SCENARIOS[i];
    if (!s) return;
    this.endSandbox();
    try { s.run(this); } catch (e) { this.toast('scenario error: ' + e.message, '#e08a8a'); return; }
    if (this.state === 'tester') this.state = 'run';
    this.hideOverlay();
    document.body.classList.add('inrun');
    this.toast('⚡ SCENARIO: ' + s.name + ' — sandbox rules, nothing records.', '#8fd0e0');
  },

  /* ---- THE BOSS LAB: any manager, any conditions ---- */
  startBossLab(cfg) {
    this.endSandbox();
    const diag = this._sbDiag || ((Meta.data.lastDiag && DATA.DIAG[Meta.data.lastDiag]) ? Meta.data.lastDiag : 'adhd');
    this.beginSandbox(diag, Math.max(1, cfg.depth || 5), { silent: true });
    this.bossId = cfg.boss;
    const br = this.floorRooms.find(r => r.type === 'boss');
    if (br) { br.bossPending = true; br.cleared = false; this.enterRoom(br, null); }
    // rebuild the boss to the lab spec (discard whatever the room rolled)
    try {
      this.boss = new Boss(cfg.boss, this.depth, this);
      this.boss2 = null; this._wasJoint = false;
      if (cfg.affix && DATA.BOSS_AFFIXES.some(a => a.id === cfg.affix)) {
        const A = DATA.BOSS_AFFIXES.find(a => a.id === cfg.affix);
        this.boss.affix = cfg.affix; this.boss.affixTint = A.tint;
        if (cfg.affix === 'swift') this.boss.aggr = (this.boss.aggr || 1) * 1.25;
        this.boss.name = A.name + ' ' + this.boss.name;
        this.boss.sub = A.note;
      }
      if (cfg.shift2 && ['gatekeeper', 'larperking', 'adjuster'].includes(cfg.boss)) {
        this.boss._shift2 = true;
        this.boss.hp *= 1.3; this.boss.maxhp *= 1.3;
      }
      if (cfg.joint && DATA.BOSSES[cfg.joint] && cfg.joint !== cfg.boss && !cfg.affix) {
        this.boss2 = new Boss(cfg.joint, this.depth, this);
        this.boss._joint = true; this.boss2._joint = true; this._wasJoint = true;
        this.boss.hp *= 0.82; this.boss.maxhp *= 0.82;
        this.boss2.hp *= 0.82; this.boss2.maxhp *= 0.82;
        this.boss.x = CW / 2 - 120; this.boss2.x = CW / 2 + 120;
        this.boss2.introT = 0; this.boss2._wakeT = 3.6;
      }
    } catch (e) { }
    this.hideOverlay();
    this.state = 'run';
    document.body.classList.add('inrun');
    SFX.setMusic(['founder', 'thesystem', 'thecure'].includes(cfg.boss) ? 'superboss' : 'boss');
    this.setBanner('🥊 BOSS LAB', (DATA.BOSSES[cfg.boss] || {}).name + (cfg.joint ? ' + ' + (DATA.BOSSES[cfg.joint] || {}).name : '') + ' · depth ' + this.depth, 2.8);
  },
  endSandbox() {
    if (!this.sandbox && !this._metaSnap) return;
    this.sandbox = false; this.designTest = false;
    Meta._noSave = false;
    if (this._metaSnap) {
      try {
        const d = JSON.parse(this._metaSnap);
        for (const k of Object.keys(Meta.data)) delete Meta.data[k];
        Object.assign(Meta.data, d);
      } catch (e) { }
      this._metaSnap = null;
    }
  },

  /* ---------- THE ROOM DESIGNER (paint the ward; staff will bill someone for it) ---------- */
  _blankDesign() {
    const layout = [];
    for (let r = 0; r < ROWS; r++) { layout[r] = []; for (let c = 0; c < COLS; c++) layout[r][c] = 0; }
    return { ward: 3, layout, ents: [], picks: [], boss: null, bossPos: null, start: { c: 6, r: 5 }, cond: { night: false, heat: 0, wing: '' } };
  },
  _dgTemplate(name) {
    const D = this._design;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) D.layout[r][c] = 0;
    if (name === 'arena') {   // pillars at the quarters
      for (const [c, r] of [[3, 2], [3, 4], [9, 2], [9, 4], [6, 3]]) D.layout[r][c] = 1;
    } else if (name === 'corridors') {   // two long shelves, three lanes
      for (let r = 1; r <= 5; r++) { D.layout[r][4] = 1; D.layout[r][8] = 1; }
    } else if (name === 'bosspit') {   // open center, blocked corners
      for (const [c, r] of [[1, 1], [2, 1], [1, 2], [11, 1], [10, 1], [11, 2], [1, 5], [2, 5], [1, 4], [11, 5], [10, 5], [11, 4]]) D.layout[r][c] = 1;
    } else if (name === 'cross') {   // a paperwork cross
      for (let c = 2; c <= 10; c++) D.layout[3][c] = 2;
      for (let r = 1; r <= 5; r++) D.layout[r][6] = 2;
      D.layout[3][6] = 0;
    }
    D.layout[D.start.r][D.start.c] = 0;
  },
  _dgPushUndo() {
    const st = this._dgUndo || (this._dgUndo = []);
    st.push(JSON.stringify(this._design));
    if (st.length > 30) st.shift();
  },
  _dgFlood(c, r) {
    const D = this._design;
    const from = D.layout[r][c];
    const to = from === 0 ? 1 : 0;   // toggle-flood: empty regions become wall, solid regions become floor
    const q = [[c, r]], seen = new Set();
    while (q.length) {
      const [cc, rr] = q.pop();
      const k = cc + ',' + rr;
      if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS || seen.has(k) || D.layout[rr][cc] !== from) continue;
      seen.add(k);
      D.layout[rr][cc] = to;
      q.push([cc + 1, rr], [cc - 1, rr], [cc, rr + 1], [cc, rr - 1]);
    }
    D.layout[D.start.r][D.start.c] = 0;
  },
  showDesigner() {
    this.state = 'design';
    if (!this._design) this._design = this._blankDesign();
    if (!this._dgTool) this._dgTool = 'wall';
    const D = this._design;
    const enemyOpts = Object.keys(DATA.ENEMIES).filter(id => id !== 'form').map(id => `<option value="${id}" ${this._dgEnemy === id ? 'selected' : ''}>${DATA.ENEMIES[id].name}</option>`).join('');
    const pickOpts = [['coin', '🪙 coin'], ['nickel', '💰 nickel'], ['half', '❤️ half heart'], ['full', '💗 full heart'], ['pill', '💊 pill'], ['key', '🔑 key'], ['bomb', '📄 claim form'], ['trinket', '🧷 trinket'], ['item', '💊 ITEM PEDESTAL']].map(([v, l]) => `<option value="${v}" ${this._dgPick === v ? 'selected' : ''}>${l}</option>`).join('');
    const bossOpts = ['', 'gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'peerreview', 'withdrawal', 'burnout', 'walrus', 'thecure', 'founder', 'thesystem', 'theboard'].map(id => `<option value="${id}" ${D.boss === id ? 'selected' : ''}>${id ? (DATA.BOSSES[id] || { name: id }).name : '— no boss —'}</option>`).join('');
    const tools = [['wall', '🧱 wall'], ['paper', '📄 paperwork'], ['spikes', '⚠ hazard'], ['floor', '⬜ floor'], ['start', '🎯 start'], ['enemy', '🧟 enemy'], ['pick', '🎁 pickup'], ['boss', '☠ boss spot'], ['fill', '🪣 fill'], ['erase', '✖ erase']];
    const toolBtns = tools.map(([id, l]) => `<button class="btn minor dgt" data-t="${id}" style="font-size:11px;padding:6px 9px;${this._dgTool === id ? 'outline:2px solid #e8c84c' : ''}">${l}</button>`).join('');
    let grid = '';
    for (let r = 0; r < ROWS; r++) {
      grid += '<div class="dgrow">';
      for (let c = 0; c < COLS; c++) grid += `<button class="dgc" data-c="${c}" data-r="${r}"></button>`;
      grid += '</div>';
    }
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:24px">🏗 ROOM DESIGNER</h1>
        <div class="tagline">paint tiles, drop a crowd, playtest it live · ${COLS}×${ROWS} · staff use only</div>
        <div class="btnrow" style="flex-wrap:wrap">${toolBtns}</div>
        <div class="btnrow" style="flex-wrap:wrap;gap:6px">
          <select id="dgEnemy" class="seedfield" style="max-width:180px">${enemyOpts}</select>
          <select id="dgPick" class="seedfield" style="max-width:150px">${pickOpts}</select>
          <select id="dgBoss" class="seedfield" style="max-width:170px">${bossOpts}</select>
        </div>
        <div id="dgWrap">${grid}</div>
        <div class="setrow" style="justify-content:center;gap:10px">
          <button class="btn minor" id="bDgWdn" style="min-width:40px">−</button>
          <span id="dgWardLbl" style="font-weight:bold;min-width:150px;text-align:center">SIMULATED WARD ${D.ward}</span>
          <button class="btn minor" id="bDgWup" style="min-width:40px">+</button>
        </div>
        <div class="btnrow" style="flex-wrap:wrap;gap:5px">
          ${['empty', 'arena', 'corridors', 'bosspit', 'cross'].map(t => `<button class="btn minor" data-tmpl="${t}" style="font-size:10px;padding:5px 8px">▦ ${t}</button>`).join('')}
          <button class="btn minor" id="bDgUndo" style="font-size:10px;padding:5px 8px">↩ undo</button>
          <button class="btn minor" id="bDgMirror" style="font-size:10px;padding:5px 8px">⇋ mirror</button>
        </div>
        <div class="btnrow" style="flex-wrap:wrap;gap:5px">
          <button class="btn minor" id="bDgNight" style="font-size:10px;padding:5px 8px">${D.cond && D.cond.night ? '✅' : '⬜'} 🌙 night</button>
          <button class="btn minor" id="bDgHeat" style="font-size:10px;padding:5px 8px">🔥 heat ${D.cond ? D.cond.heat || 0 : 0} (tap to cycle)</button>
          <select id="dgWing" class="seedfield" style="max-width:150px;font-size:11px">${['', ...(DATA.WINGS || []).map(w => w.id)].map(w => `<option value="${w}" ${D.cond && D.cond.wing === w ? 'selected' : ''}>${w ? '🏥 ' + w : '— standard wing —'}</option>`).join('')}</select>
        </div>
        <div class="btnrow" style="flex-wrap:wrap">
          <button class="btn" id="bDgPlay">▶ PLAYTEST</button>
          <button class="btn minor" id="bDgExport">📤 COPY CODE</button>
          <button class="btn minor" id="bDgClear">🧹 CLEAR</button>
        </div>
        <div class="setrow"><label>💾 save as:</label><input type="text" id="dgName" class="seedfield" maxlength="20" placeholder="my nightmare hallway" autocomplete="off"><button class="btn minor" id="bDgSave">SAVE</button></div>
        <div class="setrow"><label>📥 room code:</label><input type="text" id="dgIn" class="seedfield" placeholder="EGSROOM..." autocomplete="off"><button class="btn minor" id="bDgImport">LOAD</button></div>
        <button class="btn minor" id="bDesignBack">BACK</button>
      </div>`);
    // paint every cell to match the model
    document.querySelectorAll('.dgc').forEach(el => this._dgPaintCell(el));
    const bindCell = (el) => {
      const act = () => { this._dgApply(+el.dataset.c, +el.dataset.r); this._dgPaintCell(el); };
      el.onpointerdown = (e) => { e.preventDefault(); this._dgPushUndo(); this._dgDrag = true; act(); };
      el.onpointerenter = () => { if (this._dgDrag) act(); };
    };
    document.querySelectorAll('.dgc').forEach(bindCell);
    document.getElementById('dgWrap').onpointerup = () => { this._dgDrag = false; };
    window.addEventListener('pointerup', () => { this._dgDrag = false; }, { once: false });
    document.querySelectorAll('.dgt').forEach(b => b.onclick = () => { SFX.play('ui'); this._dgTool = b.dataset.t; this.showDesigner(); });
    document.getElementById('dgEnemy').onchange = (e) => { this._dgEnemy = e.target.value; this._dgTool = 'enemy'; this.showDesigner(); };
    document.getElementById('dgPick').onchange = (e) => { this._dgPick = e.target.value; this._dgTool = 'pick'; this.showDesigner(); };
    document.getElementById('dgBoss').onchange = (e) => { D.boss = e.target.value || null; SFX.play('ui'); };
    const wupd = () => { document.getElementById('dgWardLbl').textContent = 'SIMULATED WARD ' + D.ward; };
    document.getElementById('bDgWup').onclick = () => { SFX.play('ui'); D.ward = Math.min(30, D.ward + 1); wupd(); };
    document.getElementById('bDgWdn').onclick = () => { SFX.play('ui'); D.ward = Math.max(1, D.ward - 1); wupd(); };
    document.getElementById('bDgPlay').onclick = () => { SFX.play('stamp'); this.playtestDesign(); };
    document.getElementById('bDgExport').onclick = () => {
      const code = this.designCode();
      const inp = document.getElementById('dgIn');
      inp.value = code;
      inp.select();
      try { navigator.clipboard && navigator.clipboard.writeText(code); } catch (e) { }
      SFX.play('paper');
      this.toast('📤 Room code staged in the field (and clipboard, where allowed).', '#8fd08a');
    };
    document.getElementById('bDgImport').onclick = () => {
      const ok = this.parseDesignCode(document.getElementById('dgIn').value);
      if (ok) { SFX.play('fanfare'); this.toast('📥 Blueprint accepted. Someone else\'s problem is now yours.', '#8fd08a'); this.showDesigner(); }
      else { SFX.play('denied'); this.toast('That is not a room. Structurally.', '#e08a8a'); }
    };
    document.getElementById('bDgClear').onclick = () => { SFX.play('ui'); this._dgPushUndo(); this._design = this._blankDesign(); this.showDesigner(); };
    document.querySelectorAll('[data-tmpl]').forEach(b => b.onclick = () => { SFX.play('ui'); this._dgPushUndo(); this._dgTemplate(b.dataset.tmpl); this.showDesigner(); });
    document.getElementById('bDgUndo').onclick = () => {
      const st = this._dgUndo || [];
      if (st.length) { try { this._design = JSON.parse(st.pop()); } catch (e) { } SFX.play('paper'); this.showDesigner(); }
      else { SFX.play('denied'); this.toast('nothing to undo. a clean conscience.', '#b8b0a0'); }
    };
    document.getElementById('bDgMirror').onclick = () => {
      SFX.play('ui'); this._dgPushUndo();
      const L = this._design.layout;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < 6; c++) L[r][12 - c] = L[r][c];
      this._design.layout[this._design.start.r][this._design.start.c] = 0;
      this.showDesigner();
    };
    document.getElementById('bDgNight').onclick = () => { SFX.play('ui'); const C = this._design.cond || (this._design.cond = { night: false, heat: 0, wing: '' }); C.night = !C.night; this.showDesigner(); };
    document.getElementById('bDgHeat').onclick = () => { SFX.play('ui'); const C = this._design.cond || (this._design.cond = { night: false, heat: 0, wing: '' }); C.heat = (C.heat + 2) % 12; this.showDesigner(); };
    const dgw = document.getElementById('dgWing');
    if (dgw) dgw.onchange = () => { const C = this._design.cond || (this._design.cond = { night: false, heat: 0, wing: '' }); C.wing = dgw.value; SFX.play('ui'); };
    document.getElementById('bDgSave').onclick = () => {
      const name = String(document.getElementById('dgName').value || '').trim().slice(0, 20);
      if (!name) { SFX.play('denied'); this.toast('name it first. everything here gets a label.', '#e08a8a'); return; }
      try {
        let lib = JSON.parse(localStorage.getItem('egs_roomlib') || '[]');
        lib = lib.filter(r => r.name !== name);
        lib.push({ name, code: this.designCode() });
        while (lib.length > 24) lib.shift();
        localStorage.setItem('egs_roomlib', JSON.stringify(lib));
        SFX.play('fanfare');
        this.toast('💾 “' + name + '” filed in the room library (' + lib.length + '/24).', '#8fd08a');
      } catch (e) { SFX.play('denied'); }
    };
    document.getElementById('bDesignBack').onclick = () => { SFX.play('ui'); this._testerTab = 'design'; this.showTester(() => this.showTitle()); };
  },
  _dgApply(c, r) {
    const D = this._design, t = this._dgTool;
    const clearMarks = () => {
      D.ents = D.ents.filter(e => !(e.c === c && e.r === r));
      D.picks = D.picks.filter(p => !(p.c === c && p.r === r));
    };
    if (t === 'wall' || t === 'paper' || t === 'spikes') { D.layout[r][c] = t === 'wall' ? 1 : t === 'paper' ? 2 : 3; clearMarks(); }
    else if (t === 'floor') { D.layout[r][c] = 0; }
    else if (t === 'erase') { D.layout[r][c] = 0; clearMarks(); }
    else if (t === 'start') { D.layout[r][c] = 0; clearMarks(); D.start = { c, r }; document.querySelectorAll('.dgc').forEach(el => this._dgPaintCell(el)); }
    else if (t === 'enemy') {
      if (D.ents.length + D.picks.length >= 24 && !D.ents.some(e => e.c === c && e.r === r)) { this.toast('24 placements max. This is a room, not a filing backlog.', '#e0a05a'); return; }
      D.layout[r][c] = 0; clearMarks();
      D.ents.push({ id: this._dgEnemy || Object.keys(DATA.ENEMIES)[0], c, r });
    } else if (t === 'pick') {
      if (D.ents.length + D.picks.length >= 24 && !D.picks.some(p => p.c === c && p.r === r)) { this.toast('24 placements max.', '#e0a05a'); return; }
      D.layout[r][c] = 0; clearMarks();
      D.picks.push({ t: this._dgPick || 'coin', c, r });
    } else if (t === 'boss') {
      if (!D.boss) { this.toast('pick a boss in the dropdown first — then place their spot.', '#e0a05a'); return; }
      D.layout[r][c] = 0; clearMarks();
      D.bossPos = { c, r };
      document.querySelectorAll('.dgc').forEach(el => this._dgPaintCell(el));
    } else if (t === 'fill') {
      this._dgFlood(c, r);
      document.querySelectorAll('.dgc').forEach(el => this._dgPaintCell(el));
    }
  },
  _dgPaintCell(el) {
    const D = this._design, c = +el.dataset.c, r = +el.dataset.r;
    const t = D.layout[r][c];
    el.style.background = t === 1 ? '#8a7a66' : t === 2 ? '#efe6cc' : t === 3 ? '#c05050' : '#d8cfc0';
    let mark = '';
    if (D.start && D.start.c === c && D.start.r === r) mark = '🎯';
    if (D.bossPos && D.bossPos.c === c && D.bossPos.r === r) mark = '☠';
    const en = D.ents.find(e => e.c === c && e.r === r);
    if (en) mark = '🧟';
    const pk = D.picks.find(p => p.c === c && p.r === r);
    if (pk) mark = pk.t === 'item' ? '💊' : pk.t === 'key' ? '🔑' : pk.t === 'bomb' ? '📄' : pk.t === 'pill' ? '💊' : (pk.t === 'half' || pk.t === 'full') ? '❤️' : pk.t === 'trinket' ? '🧷' : '🪙';
    el.textContent = mark || (t === 2 ? '📄' : t === 3 ? '⚠' : '');
    el.title = en ? DATA.ENEMIES[en.id].name : '';
  },
  designCode() {
    const D = this._design;
    const o = { v: 2, w: D.ward, l: D.layout.map(row => row.join('')), e: D.ents.map(e => [e.id, e.c, e.r]), p: D.picks.map(p => [p.t, p.c, p.r]), b: D.boss || '', s: [D.start.c, D.start.r], bp: D.bossPos ? [D.bossPos.c, D.bossPos.r] : null, cn: D.cond || null };
    return 'EGSROOM' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '');
  },
  parseDesignCode(str) {
    try {
      const s = String(str || '').trim();
      if (!s.startsWith('EGSROOM')) return false;
      const o = JSON.parse(decodeURIComponent(escape(atob(s.slice(7)))));
      if (!o || !Array.isArray(o.l) || o.l.length !== ROWS) return false;
      const D = this._blankDesign();
      D.ward = U.clamp(parseInt(o.w, 10) || 1, 1, 30);
      for (let r = 0; r < ROWS; r++) {
        const row = String(o.l[r] || '');
        for (let c = 0; c < COLS; c++) { const v = parseInt(row[c], 10); D.layout[r][c] = (v >= 0 && v <= 3) ? v : 0; }
      }
      for (const e of (o.e || []).slice(0, 24)) if (DATA.ENEMIES[e[0]] && e[0] !== 'form') D.ents.push({ id: e[0], c: U.clamp(+e[1] | 0, 0, COLS - 1), r: U.clamp(+e[2] | 0, 0, ROWS - 1) });
      for (const p of (o.p || []).slice(0, 24)) if (['coin', 'nickel', 'half', 'full', 'pill', 'key', 'bomb', 'trinket', 'item'].includes(p[0])) D.picks.push({ t: p[0], c: U.clamp(+p[1] | 0, 0, COLS - 1), r: U.clamp(+p[2] | 0, 0, ROWS - 1) });
      D.boss = (o.b && DATA.BOSSES[o.b]) ? o.b : null;
      if (Array.isArray(o.s)) D.start = { c: U.clamp(+o.s[0] | 0, 0, COLS - 1), r: U.clamp(+o.s[1] | 0, 0, ROWS - 1) };
      if (Array.isArray(o.bp)) D.bossPos = { c: U.clamp(+o.bp[0] | 0, 0, COLS - 1), r: U.clamp(+o.bp[1] | 0, 0, ROWS - 1) };
      if (o.cn && typeof o.cn === 'object') D.cond = { night: !!o.cn.night, heat: U.clamp(parseInt(o.cn.heat, 10) || 0, 0, 10), wing: (DATA.WINGS || []).some(w => w.id === o.cn.wing) ? o.cn.wing : '' };
      D.layout[D.start.r][D.start.c] = 0;
      this._design = D;
      return true;
    } catch (e) { return false; }
  },
  playtestDesign() {
    const D = this._design;
    if (!D) return;
    const diag = (Meta.data.lastDiag && DATA.DIAG[Meta.data.lastDiag]) ? Meta.data.lastDiag : 'adhd';
    this.endSandbox();   // fresh shift every playtest
    this.beginSandbox(diag, Math.max(1, D.ward || 1), { silent: true });
    this.designTest = true;
    const room = makeRoom(499, 499, 'normal');
    room.doors = { N: false, S: false, E: false, W: false };
    room.secretDoors = { N: false, S: false, E: false, W: false };
    room.layout = D.layout.map(row => row.slice());
    room.layout[D.start.r][D.start.c] = 0;
    room.paperHp = {};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (room.layout[r][c] === 2) room.paperHp[c + ',' + r] = 10;
    room.discovered = room.visited = true;
    room.spawned = true;   // the designer decides the crowd, not the generator
    room.theme = 'exam';
    this.grid.set(U.key(499, 499), room);
    this.floorRooms.push(room);
    this.enterRoom(room, null);
    const sp = tileToPx(D.start.c, D.start.r);
    this.player.x = sp.x; this.player.y = sp.y;
    // playtest conditions: wing palette, night, heat
    const CN = D.cond || {};
    if (CN.wing && DATA.WINGS) {
      const wd = DATA.WINGS.find(w => w.id === CN.wing);
      if (wd) { this.wingPal = wd.pal; room._bg = null; }
    }
    if (CN.night) { this.nightShift = true; this.floorDark = Math.max(this.floorDark || 0, 0.26); }
    if (CN.heat >= 4) { this.player.maxhp = Math.max(2, this.player.maxhp - 2); this.player.hp = Math.min(this.player.hp, this.player.maxhp); }
    this.intensity = CN.heat || 0;
    const condMult = (1 + (CN.heat || 0) * 0.05) * (CN.night ? 0.95 : 1);
    for (const en of D.ents) {
      const px = tileToPx(en.c, en.r);
      const e = new Enemy(en.id, px.x, px.y, this.depth, false, condMult);
      if (CN.night) e.spd *= 0.92;
      e.spawnT = 0.9;
      this.enemies.push(e);
    }
    for (const pk of D.picks) {
      const px = tileToPx(pk.c, pk.r);
      if (pk.t === 'item') {
        const pool = DATA.pickPool('special', this.player.items);
        this.peds.push({ x: px.x, y: px.y, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
      } else {
        const p2 = new Pickup(pk.t, px.x, px.y);
        p2.settle = 0; p2.vx = 0; p2.vy = 0;
        this.pickups.push(p2);
      }
    }
    if (D.boss) {
      this.bossId = D.boss;
      try {
        this.boss = new Boss(D.boss, this.depth, this);
        if (D.bossPos) { const bp = tileToPx(D.bossPos.c, D.bossPos.r); this.boss.x = bp.x; this.boss.y = bp.y; }
      } catch (e) { }
    }
    this.setBanner('🏗 PLAYTEST', 'PAUSE to return to the designer · deaths respawn', 2.8);
  },
  showTesterTools() {
    this.state = 'testertools';
    const p = this.player;
    const ct = on => on ? '✅' : '⬜';
    const itemOpts = Object.keys(DATA.ITEMS).sort((a, b) => DATA.ITEMS[a].name.localeCompare(DATA.ITEMS[b].name)).map(id => `<option value="${id}">${DATA.ITEMS[id].name}</option>`).join('');
    const enemyOpts = Object.keys(DATA.ENEMIES).filter(id => id !== 'form').map(id => `<option value="${id}">${DATA.ENEMIES[id].name}</option>`).join('');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:24px">🔧 TESTER TOOLS</h1>
        <div class="tagline">${this.sandbox ? 'sandbox shift — nothing counts anyway' : 'REAL RUN — these cheats affect this run (your call, staff)'}</div>
        <div class="btnrow" style="flex-wrap:wrap">
          <button class="btn minor" id="ttHeal">❤️ FULL HEAL</button>
          <button class="btn minor" id="ttGoods">💰 +20¢ +3🔑 +3📄 +💊</button>
          <button class="btn minor" id="ttKill">☠ CLEAR ROOM</button>
          <button class="btn minor" id="ttFloor">⬇ NEXT FLOOR</button>
        </div>
        <div class="btnrow" style="flex-wrap:wrap">
          <button class="btn minor" id="ttGod">${ct(!!this.god)} GOD</button>
          <button class="btn minor" id="ttDebug">${ct(!!this.debug)} DEBUG KEYS</button>
          <button class="btn minor" id="ttFps">${ct(!!Meta.data.fpsHud)} FPS HUD</button>
          <button class="btn minor" id="ttHit">${ct(!!this.hitboxes)} HITBOXES</button>
          <button class="btn minor" id="ttIns">${ct(!!this.inspect)} INSPECT</button>
        </div>
        <div class="setrow" style="justify-content:center;gap:6px">
          <label>⏱</label>
          ${[0.25, 0.5, 1, 2, 4].map(v => `<button class="btn minor" data-tts="${v}" style="min-width:40px;font-size:11px;${(this.timeScale || 1) === v ? 'outline:2px solid #e8c84c' : ''}">${v}×</button>`).join('')}
        </div>
        <div class="setrow"><label>℞ grant:</label><select id="ttItem" class="seedfield">${itemOpts}</select><button class="btn minor" id="ttGive">GIVE</button></div>
        <div class="setrow"><label>🧟 spawn:</label><select id="ttEnemy" class="seedfield">${enemyOpts}</select><button class="btn minor" id="ttSpawn">SPAWN</button></div>
        <button class="btn" id="ttResume">RESUME</button>
      </div>`);
    document.getElementById('ttHeal').onclick = () => { SFX.play('heal'); p.hp = p.maxhp; this.toast('❤️ topped off', '#8fd08a'); };
    document.getElementById('ttGoods').onclick = () => { SFX.play('coin'); p.coins += 20; p.keys += 3; p.bombs += 3; if (p.pill == null) p.pill = U.randi(0, 9); this.toast('💰 petty cash disbursed', '#e8c84c'); };
    document.getElementById('ttKill').onclick = () => { SFX.play('stamp'); this.hideOverlay(); this.state = 'run'; for (const e of this.enemies) e.hurt(9999, this, true); if (this.boss && !this.boss.dead) this.boss.hurt(9999, this); };
    document.getElementById('ttFloor').onclick = () => { SFX.play('descend'); this.hideOverlay(); this.state = 'run'; this.depth++; this.newFloor(); };
    document.getElementById('ttGod').onclick = (e) => { SFX.play('ui'); this.god = !this.god; e.target.textContent = (this.god ? '✅' : '⬜') + ' GOD'; };
    document.getElementById('ttDebug').onclick = (e) => { SFX.play('ui'); this.debug = !this.debug; e.target.textContent = (this.debug ? '✅' : '⬜') + ' DEBUG KEYS'; };
    document.getElementById('ttFps').onclick = (e) => { SFX.play('ui'); Meta.data.fpsHud = Meta.data.fpsHud ? 0 : 1; Meta.save(); e.target.textContent = (Meta.data.fpsHud ? '✅' : '⬜') + ' FPS HUD'; };
    document.getElementById('ttHit').onclick = (e) => { SFX.play('ui'); this.hitboxes = !this.hitboxes; e.target.textContent = (this.hitboxes ? '✅' : '⬜') + ' HITBOXES'; };
    document.getElementById('ttIns').onclick = (e) => { SFX.play('ui'); this.inspect = !this.inspect; e.target.textContent = (this.inspect ? '✅' : '⬜') + ' INSPECT'; };
    document.querySelectorAll('[data-tts]').forEach(b => b.onclick = () => { SFX.play('ui'); this.timeScale = parseFloat(b.dataset.tts); this.timePaused = false; this.hideOverlay(); this.state = 'run'; this.toast('⏱ ' + this.timeScale + '×', '#8fd0e0'); });
    document.getElementById('ttGive').onclick = () => { const id = document.getElementById('ttItem').value; if (DATA.ITEMS[id]) { p.addItem(id, this); this.stats.items++; SFX.play('item'); this.toast('℞ granted: ' + DATA.ITEMS[id].name, '#8fd08a'); } };
    document.getElementById('ttSpawn').onclick = () => {
      const id = document.getElementById('ttEnemy').value;
      if (!DATA.ENEMIES[id]) return;
      this.hideOverlay(); this.state = 'run';
      const a = U.rand(0, TAU);
      const ex = U.clamp(p.x + Math.cos(a) * 170, RX + 30, RX + RW - 30), ey = U.clamp(p.y + Math.sin(a) * 170, RY + 30, RY + RH - 30);
      const e = new Enemy(id, ex, ey, this.depth, false, 1);
      e.spawnT = 0.8;
      this.enemies.push(e);
      SFX.play('sting');
    };
    document.getElementById('ttResume').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
  },

  /* ============================================================
     WARD BINGO (the activities coordinator finally did something)
     One daily-seeded 5×5 card for everyone; progress is cumulative
     across the whole day; lines pay ◆, blackout pays big.
     ============================================================ */
  bingoCard() {
    const key = this.todayKey();
    let B = Meta.data.bingo;
    if (!B || B.key !== key) {
      B = Meta.data.bingo = { key, prog: {}, marks: {}, linesPaid: [], blackout: 0 };
      Meta.save();
    }
    if (!this._bingoIds || this._bingoKey !== key) {
      this._bingoKey = key;
      this._bingoIds = withSeed(hashSeed(this.seedFromKey(key), ['bingo']), () => U.shuffle(DATA.BINGO_POOL.slice()).slice(0, 24).map(s => s.id));
    }
    return B;
  },
  bingoEvent(ev, amt) {
    if (this.practice || this.sandbox || this.overtime) return;
    try {
      const B = this.bingoCard();
      B.prog[ev] = (B.prog[ev] || 0) + (amt || 1);
      let fresh = false;
      for (const id of this._bingoIds) {
        const S = DATA.BINGO_POOL.find(s => s.id === id);
        if (S && S.ev === ev && !B.marks[id] && (B.prog[ev] || 0) >= S.n) {
          B.marks[id] = 1;
          fresh = true;
          this.toast('🎱 CARD: ' + S.icon + ' ' + S.name + ' ✓', '#8fd0e0');
          SFX.play('tick');
        }
      }
      if (fresh) this._bingoLines();
    } catch (e) { }
  },
  _bingoLines() {
    const B = this.bingoCard(), ids = this._bingoIds;
    const marked = (i) => i === 12 || !!B.marks[ids[i > 12 ? i - 1 : i]];   // center is FREE (nurse's discretion)
    const LINES = [];
    for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map(c => r * 5 + c));
    for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map(r => r * 5 + c));
    LINES.push([0, 6, 12, 18, 24]);
    LINES.push([4, 8, 12, 16, 20]);
    LINES.forEach((line, li) => {
      if (B.linesPaid.includes(li)) return;
      if (line.every(marked)) {
        B.linesPaid.push(li);
        Meta.data.insight = (Meta.data.insight || 0) + 6;
        Meta.data.bingoLines = (Meta.data.bingoLines || 0) + 1;
        this.toast('🎱 B-I-N-G-O! Line complete — +◆6 Insight', '#e8c84c');
        SFX.play('fanfare');
      }
    });
    if (Object.keys(B.marks).length >= 24 && !B.blackout) {
      B.blackout = 1;
      Meta.data.bingoBlackouts = (Meta.data.bingoBlackouts || 0) + 1;
      Meta.data.insight = (Meta.data.insight || 0) + 40;
      Meta.data.fund = (Meta.data.fund || 0) + 25;
      this.setBanner('🎱 BLACKOUT', 'the whole card — +◆40, +25¢ to the Fund. the coordinator WEPT.', 3.4);
      SFX.play('fanfare');
    }
    Meta.save();
    this.checkUnlocks();
  },
  showBingo(returnTo) {
    this.state = 'bingo';
    const B = this.bingoCard(), ids = this._bingoIds;
    const cells = [];
    for (let i = 0; i < 25; i++) {
      if (i === 12) { cells.push(`<div class="bingoc free">☕<span>FREE<br>(nurse's<br>discretion)</span></div>`); continue; }
      const id = ids[i > 12 ? i - 1 : i];
      const S = DATA.BINGO_POOL.find(s => s.id === id);
      const done = !!B.marks[id];
      const prog = Math.min(B.prog[S.ev] || 0, S.n);
      cells.push(`<div class="bingoc${done ? ' done' : ''}" title="${S.name}">${S.icon}<span>${S.name}${S.n > 1 ? `<br>${prog}/${S.n}` : ''}</span>${done ? '<i class="bstamp">✓</i>' : ''}</div>`);
    }
    const got = Object.keys(B.marks).length;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">🎱 WARD BINGO</h1>
        <div class="tagline">${B.key} · one card for the whole building · ${got}/24 squares · ${B.linesPaid.length}/12 lines paid</div>
        <div class="bingogrid">${cells.join('')}</div>
        <div class="tagline" style="opacity:.7">every line +◆6 · BLACKOUT +◆40 and +25¢ to the Fund · progress counts all day, dailies included · new card at midnight</div>
        <button class="btn" id="bBingoBack">BACK</button>
      </div>`);
    document.getElementById('bBingoBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ---------- WWRD — WARD RADIO (the jukebox; DJ Walrus between tracks) ---------- */
  showRadio(returnTo) {
    this.state = 'radio';
    const heard = Meta.data.tracksHeard || {};
    const current = Meta.data.hubTrack;
    const rows = DATA.RADIO_TRACKS.map(t => {
      const ok = !!heard[t.mode];
      const on = current === t.mode;
      if (!ok) return `<div class="ach locked"><div class="achicon">🔇</div><div class="achbody"><div class="achname">???</div><div class="achdesc">not yet heard — keep descending</div></div></div>`;
      return `<div class="ach got" data-track="${t.mode}" style="cursor:pointer${on ? ';outline:2px solid #e8c84c' : ''}">
        <div class="achicon">${on ? '🔊' : '💿'}</div>
        <div class="achbody"><div class="achname">${t.name}${on ? ' · NOW PLAYING' : ''}</div><div class="achdesc">${t.sub}</div></div>
      </div>`;
    }).join('');
    const got = DATA.RADIO_TRACKS.filter(t => heard[t.mode]).length;
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">📻 WWRD — WARD RADIO</h1>
        <div class="tagline">${got}/9 tracks in rotation · pick what the Waiting Room hums</div>
        <div class="achlist">${rows}</div>
        <button class="btn minor" id="bRadioDefault">🔁 BUILDING DEFAULT (Decaf Sunrise)</button>
        <button class="btn" id="bRadioBack">BACK</button>
        <div class="smallprint">every track you hear out in the wards joins the jukebox. DJ Walrus thanks you for listening. He has to.</div>
      </div>`);
    document.querySelectorAll('[data-track]').forEach(b => b.onclick = () => {
      const mode = b.dataset.track;
      Meta.data.hubTrack = mode;
      Meta.save();
      SFX.init();
      SFX.setMusic(mode);
      this.toast('📻 ' + U.choice(DATA.RADIO_DJ), '#c8b8d8');
      SFX.play('voice');
      this.checkUnlocks();
      this.showRadio(returnTo);
    });
    document.getElementById('bRadioDefault').onclick = () => { SFX.play('ui'); Meta.data.hubTrack = null; Meta.save(); SFX.setMusic('dayroom'); this.showRadio(returnTo); };
    document.getElementById('bRadioBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
  },

  /* ============================================================
     THE STAIRWELL (nobody takes the stairs. you take the stairs.)
     A dodge-only descent between floors: carts, buckets, paperwork.
     Clean = heal + coins + ◆. Hits hurt (but the stairs never kill).
     ============================================================ */
  startStairs() {
    this.stairs = {
      t: 0, dur: 22, px: CW / 2, hazards: [], coins: [], hit: 0, got: 0,
      spawnT: 0.8, coinT: 1.6, iframes: 0, done: false
    };
    this.state = 'stairs';
    this.setBanner('🚶 THE STAIRWELL', 'B' + this.depth + ' → B' + (this.depth + 1) + ' · nobody takes the stairs', 2.4);
    SFX.play('door');
    SFX.setMusic('basement');
  },
  stairsUpdate(dt) {
    const S = this.stairs;
    if (!S) { this.doDescend(); return; }
    const p = this.player;
    S.t += dt;
    S.iframes = Math.max(0, S.iframes - dt);
    const mv = Input.getMove();
    S.px = U.clamp(S.px + mv.x * 330 * dt, RX + 44, RX + RW - 44);
    const ramp = 1 + S.t * 0.045;
    // hazards from above: carts roll with drift, buckets fall straight, paper flutters
    S.spawnT -= dt * ramp;
    if (S.spawnT <= 0 && S.t < S.dur - 1.2) {
      S.spawnT = U.rand(0.5, 0.8);
      const kind = U.chance(0.4) ? 'cart' : U.chance(0.55) ? 'bucket' : 'paper';
      S.hazards.push({
        kind, x: U.rand(RX + 50, RX + RW - 50), y: 96,
        vy: (kind === 'paper' ? U.rand(95, 130) : kind === 'cart' ? U.rand(170, 215) : U.rand(210, 250)) * ramp,
        vx: kind === 'cart' ? U.rand(-70, 70) : kind === 'paper' ? U.rand(-40, 40) : 0,
        rot: U.rand(0, TAU), vr: U.rand(-3, 3), r: kind === 'cart' ? 20 : kind === 'bucket' ? 14 : 10
      });
    }
    // loose change on the landings
    S.coinT -= dt;
    if (S.coinT <= 0 && S.t < S.dur - 2) {
      S.coinT = U.rand(1.4, 2.4);
      S.coins.push({ x: U.rand(RX + 60, RX + RW - 60), y: 96, vy: 150 });
    }
    const py = CH - 130;
    for (const h of S.hazards) {
      h.y += h.vy * dt; h.x += (h.vx || 0) * dt; h.rot += h.vr * dt;
      if (h.x < RX + 30 || h.x > RX + RW - 30) h.vx = -(h.vx || 0);
      if (!h.dead && S.iframes <= 0 && Math.abs(h.y - py) < h.r + 12 && Math.abs(h.x - S.px) < h.r + 12) {
        h.dead = true;
        S.hit++;
        S.iframes = 1.0;
        this.shake = Math.max(this.shake, 8);
        SFX.play('hurt');
        if (p.hp > 1) { p.hp = Math.max(1, p.hp - 1); this.toast('🛒 clipped on the landing — ½♥', '#e08a8a'); }
        else if (p.coins > 0) { const c = Math.min(2, p.coins); p.coins -= c; this.toast('you protect your head; your wallet takes it (−' + c + '¢)', '#e0a05a'); }
        else this.toast('you bounce. professionally.', '#e0a05a');
      }
      if (h.y > CH - 40) h.dead = true;
    }
    S.hazards = S.hazards.filter(h => !h.dead);
    for (const c of S.coins) {
      c.y += c.vy * dt;
      if (!c.dead && Math.abs(c.y - py) < 22 && Math.abs(c.x - S.px) < 26) { c.dead = true; S.got++; p.coins++; SFX.play('coin'); }
      if (c.y > CH - 40) c.dead = true;
    }
    S.coins = S.coins.filter(c => !c.dead);
    if (S.t >= S.dur && !S.done) {
      S.done = true;
      const clean = S.hit === 0;
      if (clean) {
        p.heal(2); p.coins += 5;
        Meta.data.insight = (Meta.data.insight || 0) + 2;
        if (!this.sandbox && !this.practice) { Meta.data.stairsClean = (Meta.data.stairsClean || 0) + 1; Meta.save(); this.checkUnlocks(); }
        this.toast('🚶 CLEAN DESCENT — +♥, +5¢, +◆2. Nobody saw. That\'s the point.', '#8fd08a');
        this.diaryNote('Took the stairs down clean. The elevator plays music for a reason: shame.');
        SFX.play('fanfare');
      } else {
        this.toast('🚶 Made it down. ' + S.hit + ' bruise' + (S.hit > 1 ? 's' : '') + '. The handrail saw everything.', '#c8b0a0');
        this.diaryNote('Took the stairs. Got clipped ' + S.hit + ' time' + (S.hit > 1 ? 's' : '') + ' by rolling office equipment. The elevator exists for a reason.');
      }
      this.stairs = null;
      this.doDescend();
    }
  },

  /* ============================================================
     THE BREAKROOM CABINET — "PILL CATCHER" (2¢ from the Fund,
     45 seconds, 3 recalls and you're out. rival keeps score.)
     ============================================================ */
  _arcadeMeta() {
    let A = Meta.data.arcade;
    if (!A) A = Meta.data.arcade = { best: 0, plays: 0, dayKey: null, dayPaid: {}, rivalBeaten: 0 };
    const key = this.todayKey();
    if (A.dayKey !== key) { A.dayKey = key; A.dayPaid = {}; A.freeUsed = 0; }
    return A;
  },
  arcadeRivalScore() {
    const A = this._arcadeMeta();
    if (A.rivalBeaten) return A.rivalBeaten;   // frozen where you finally beat it
    return Math.max(120, Math.ceil((A.best || 0) * 1.15 / 5) * 5);
  },
  showArcade() {
    const A = this._arcadeMeta();
    const R = this.ensureRival();
    const fund = Meta.data.fund || 0;
    const free = fund < 2 && !A.freeUsed;
    this.state = 'arcademenu';
    SFX.setMusic('menu');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🕹 PILL CATCHER</h1>
        <div class="tagline">the breakroom cabinet · catch the scripts · dodge the RECALLS</div>
        <div class="stats-line">your best: <b>${A.best || 0}</b> · plays: ${A.plays || 0}</div>
        <div class="stats-line" style="color:#d08a4a">${A.rivalBeaten ? '🏁 ' + R.name + ': ' + A.rivalBeaten + ' <s>(machine "broken," allegedly)</s>' : '🏁 taped to the screen: “' + R.name + ' — ' + this.arcadeRivalScore() + '. beat THAT.”'}</div>
        <div class="stats-line" style="opacity:.7">score 100 → +◆2 · 250 → +◆5 · new best → +◆3 (daily)</div>
        <button class="btn" id="bArcGo">▶ INSERT 2¢ ${free ? '(the janitor slips you a token)' : '(from the Fund · balance ' + fund + '¢)'}</button>
        <button class="btn minor" id="bArcBack">BACK</button>
        <div class="smallprint">move: WASD / left stick / drag. that's it. that's the machine.</div>
      </div>`);
    document.getElementById('bArcGo').onclick = () => {
      const A2 = this._arcadeMeta();
      if ((Meta.data.fund || 0) >= 2) { Meta.data.fund -= 2; }
      else if (!A2.freeUsed) { A2.freeUsed = 1; this.toast('🧹 “On the house. Don\'t tell the jar.”', '#b8b0a0'); }
      else { SFX.play('denied'); this.toast('The machine wants 2¢. The Fund has ' + (Meta.data.fund || 0) + '¢. The math is unkind.', '#e08a8a'); return; }
      A2.plays = (A2.plays || 0) + 1;
      Meta.save();
      SFX.play('coin');
      this.startArcade();
    };
    document.getElementById('bArcBack').onclick = () => { SFX.play('ui'); this.showHub(); };
  },
  startArcade() {
    this.arcade = {
      t: 45, score: 0, lives: 3, px: CW / 2, items: [], spawnT: 0.5,
      speed: 1, catchFx: [], over: false, shake: 0
    };
    this.state = 'arcade';
    this.hideOverlay();
    document.body.classList.add('inrun');   // phones need the stick
    SFX.setMusic('overtime');
    SFX.play('stamp');
  },
  arcadeUpdate(dt) {
    const A = this.arcade;
    if (!A) { this.showHub(); return; }
    if (Input.take('pause')) { document.body.classList.remove('inrun'); this.arcade = null; this.showArcade(); return; }
    if (A.over) return;
    A.t -= dt;
    A.speed = 1 + (45 - A.t) * 0.028;
    A.shake = Math.max(0, A.shake - dt * 30);
    // paddle
    const mv = Input.getMove();
    A.px = U.clamp(A.px + mv.x * 340 * dt, RX + 40, RX + RW - 40);
    // spawn
    A.spawnT -= dt * A.speed;
    if (A.spawnT <= 0) {
      A.spawnT = U.rand(0.55, 0.85);
      const roll = Math.random();
      const kind = roll < 0.42 ? 'pill' : roll < 0.62 ? 'script' : roll < 0.74 ? 'nickel' : roll < 0.93 ? 'recall' : 'walrus';
      A.items.push({ kind, x: U.rand(RX + 50, RX + RW - 50), y: 120, vy: U.rand(120, 165) * A.speed, rot: U.rand(0, TAU), vr: U.rand(-3, 3), colorIdx: U.randi(0, 9) });
    }
    // fall + catch
    const catchY = CH - 120;
    for (const it of A.items) {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (!it.dead && it.y > catchY - 18 && it.y < catchY + 26 && Math.abs(it.x - A.px) < 44) {
        it.dead = true;
        if (it.kind === 'recall') {
          A.lives--; A.shake = 8;
          A.catchFx.push({ x: it.x, y: catchY, txt: 'RECALL!', clr: '#e05a5a', t: 0.8 });
          SFX.play('hurt');
          if (A.lives <= 0) { this.endArcade(); return; }
        } else {
          const pts = it.kind === 'walrus' ? 50 : it.kind === 'nickel' ? 25 : it.kind === 'script' ? 15 : 10;
          A.score += pts;
          A.catchFx.push({ x: it.x, y: catchY, txt: '+' + pts, clr: it.kind === 'walrus' ? '#e8c84c' : '#8fd08a', t: 0.6 });
          SFX.play(it.kind === 'walrus' ? 'fanfare' : 'coin');
        }
      }
      if (it.y > CH - 60) it.dead = true;
    }
    A.items = A.items.filter(it => !it.dead);
    for (const fx of A.catchFx) fx.t -= dt;
    A.catchFx = A.catchFx.filter(fx => fx.t > 0);
    if (A.t <= 0) this.endArcade();
  },
  endArcade() {
    const A = this.arcade;
    A.over = true;
    const M = this._arcadeMeta();
    const R = this.ensureRival();
    const rivalScore = this.arcadeRivalScore();
    const newBest = A.score > (M.best || 0);
    if (newBest) M.best = A.score;
    let paid = [];
    const payTier = (tier, need, amt) => {
      if (A.score >= need && !M.dayPaid[tier]) { M.dayPaid[tier] = 1; Meta.data.insight = (Meta.data.insight || 0) + amt; paid.push('+◆' + amt); }
    };
    payTier('t100', 100, 2);
    payTier('t250', 250, 5);
    if (newBest && !M.dayPaid.best) { M.dayPaid.best = 1; Meta.data.insight = (Meta.data.insight || 0) + 3; paid.push('+◆3 (new best)'); }
    let rivalLine = '';
    if (!M.rivalBeaten && A.score > rivalScore) {
      M.rivalBeaten = A.score;
      rivalLine = '🏁 ' + R.name + '\'s score: DEMOLISHED. They claim the buttons are "sticky."';
      this.checkUnlocks();
    }
    Meta.save();
    document.body.classList.remove('inrun');
    this.state = 'arcademenu';
    SFX.play(newBest ? 'fanfare' : 'stamp');
    SFX.setMusic('menu');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🕹 ${A.lives <= 0 ? 'RECALLED' : 'TIME'}</h1>
        <div class="tagline">final score: <b style="font-size:22px;color:#e8c84c">${A.score}</b>${newBest ? ' · NEW BEST' : ' · best: ' + M.best}</div>
        ${paid.length ? `<div class="stats-line" style="color:#8fd08a">payout: ${paid.join(' · ')}</div>` : ''}
        ${rivalLine ? `<div class="stats-line" style="color:#d08a4a">${rivalLine}</div>` : (M.rivalBeaten ? '' : `<div class="stats-line" style="opacity:.7">🏁 ${R.name}'s tape still reads ${rivalScore}</div>`)}
        <button class="btn" id="bArcAgain">🔁 AGAIN (2¢)</button>
        <button class="btn minor" id="bArcDone">HANG UP THE TRAY</button>
      </div>`);
    this.arcade = null;
    document.getElementById('bArcAgain').onclick = () => {
      const A2 = this._arcadeMeta();
      if ((Meta.data.fund || 0) >= 2) { Meta.data.fund -= 2; A2.plays++; Meta.save(); SFX.play('coin'); this.startArcade(); }
      else { SFX.play('denied'); this.toast('The Fund is out of change. The machine is unmoved.', '#e08a8a'); }
    };
    document.getElementById('bArcDone').onclick = () => { SFX.play('ui'); this.showHub(); };
  },

  /* ============================================================
     THE RIVAL (same intake day. identical files. one of you is
     "thriving," and they have opinions about which.)
     ============================================================ */
  ensureRival() {
    if (!Meta.data.rival) {
      Meta.data.rival = { name: U.choice(DATA.RIVAL_NAMES), duelW: 0, duelL: 0, raceW: 0, raceL: 0 };
      Meta.save();
    }
    return Meta.data.rival;
  },
  raceUpdate(dt) {
    const RC = this.race;
    if (!RC) return;
    const R = this.ensureRival();
    RC.t += dt;
    if (RC.done) {   // storming off is also cardio
      RC.x += RC.exitVx * dt; RC.y += RC.exitVy * dt;
      if (RC.x < RX - 50 || RC.x > RX + RW + 50 || RC.y < RY - 50 || RC.y > RY + RH + 50 || RC.t > RC.doneAt + 3.5) this.race = null;
      return;
    }
    const ped = RC.ped;
    if (ped.taken) {   // you got there first
      RC.done = true; RC.doneAt = RC.t;
      R.raceW = (R.raceW || 0) + 1; Meta.save();
      this.toast('🏁 ' + R.name + ': ' + U.choice(DATA.RIVAL_TAUNTS.raceLose), '#8fd08a');
      this.diaryNote('Outran ' + R.name + ' to a prescription. They said they let me win. The sweat disagreed.');
      this.bingoEvent('race');
      this.checkUnlocks();
      this.pickups.push(new Pickup('coin', RC.x - 8, RC.y));
      this.pickups.push(new Pickup('coin', RC.x + 8, RC.y));
      if (U.chance(0.5)) this.pa('rivalLost', R.name);
      const ea = RC.x < CW / 2 ? Math.PI : 0;
      RC.exitVx = Math.cos(ea) * 270; RC.exitVy = 0;
      SFX.play('spare');
      return;
    }
    const a = U.ang(RC.x, RC.y, ped.x, ped.y) + Math.sin(RC.t * 6) * 0.1;
    RC.x += Math.cos(a) * RC.spd * dt;
    RC.y += Math.sin(a) * RC.spd * dt;
    if (U.dist(RC.x, RC.y, ped.x, ped.y) < 26) {   // they took it. they will bring it up forever.
      ped.taken = true;
      RC.done = true; RC.doneAt = RC.t;
      RC.stole = (DATA.ITEMS[ped.itemId] || {}).name || 'your prescription';
      R.raceL = (R.raceL || 0) + 1; Meta.save();
      this._raceLostThisRun = true;
      this.toast('🏁 ' + R.name + ' took ' + RC.stole + ' — ' + U.choice(DATA.RIVAL_TAUNTS.raceWin), '#e08a8a');
      this.diaryNote(R.name + ' beat me to ' + RC.stole + '. I let them. (I did not let them.)');
      SFX.play('denied');
      if (U.chance(0.6)) this.pa('rival', R.name);
      const ea = RC.x < CW / 2 ? Math.PI : 0;
      RC.exitVx = Math.cos(ea) * 240; RC.exitVy = 0;
    }
  },
  /* ---------- THE INSPECTION (60 seconds of institutional theater) ---------- */
  inspectionUpdate(dt) {
    const I = this.inspection;
    if (!I || !I.active) return;
    // the Inspector's dignified figure-eight
    if (this.inspector) {
      const ins = this.inspector;
      ins.t += dt;
      ins.x = CW / 2 + Math.sin(ins.t * 0.5) * (RW * 0.32);
      ins.y = RY + RH / 2 + Math.sin(ins.t * 0.9) * (RH * 0.26);
    }
    I.t -= dt;
    if (I.t <= 0) {   // held the whole minute — the building owes you
      this.inspection = null;
      this.inspector = null;
      const p = this.player;
      for (const e of this.enemies) {
        if (e.dying) continue;
        e.dying = true; e.deadDone = true; e.noDrop = true;
        this.texts.push(new FloatText(e.x, e.y - 10, '🙂 (files out, still smiling)', '#a8d0a0'));
      }
      p.heal(99);
      p.coins += 8;
      Meta.data.insight = (Meta.data.insight || 0) + 6;
      if (!this.sandbox && !this.practice) { Meta.data.inspections = (Meta.data.inspections || 0) + 1; Meta.save(); this.checkUnlocks(); }
      this.setBanner('⭐ FIVE STARS', 'the performance holds. everyone is discharged from the scene.', 3.2);
      this.toast('🕴 “Remarkable facility.” Full heal, +8¢, +◆6. Nobody mention the fog.', '#8fd08a');
      this.pa('inspectionPass');
      this.diaryNote('An inspector toured the ward. Everyone performed wellness, including me. We passed. The performance was the healthiest thing in the building.');
      SFX.play('fanfare');
    }
  },
  inspectionBust() {
    const I = this.inspection;
    if (!I || !I.active || I.busted) return;
    I.busted = true;
    this.inspection = null;
    this.inspector = null;
    for (const e of this.enemies) {
      if (e.dying || e.fake) continue;
      e._perform = false;
      e._enraged = 8;
      e.spd *= 1.2;
    }
    this.setBanner('🎭 PERFORMANCE OVER', 'you attacked the show. the show attacks back.', 2.8);
    this.toast('🕴 The Inspector leaves at speed. The smiles come off. All of them. At once.', '#e05a5a');
    this.pa('inspectionBust');
    this.diaryNote('An inspector toured the ward and I opened fire on the performance. Critics: furious. Review: violent.');
    SFX.play('boss');
  },

  /* ---------- THE RECORDS ROOM (stealth: three patrols, one original file) ---------- */
  heistUpdate(dt) {
    const room = this.room;
    const H = room && room._heist;
    if (!H || H.alertedFight || H.stolen) return;
    const p = this.player;
    for (const g of H.guards) {
      const wp = g.wps[g.wi];
      if (g.pauseT > 0) {
        g.pauseT -= dt;
        g.ang += Math.sin(this.t * 1.7 + g.x) * 0.028;   // sweeping the light around
      } else {
        const d = U.dist(g.x, g.y, wp.x, wp.y);
        if (d < 6) { g.wi = (g.wi + 1) % g.wps.length; g.pauseT = U.rand(0.5, 1.1); }
        else {
          const a = U.ang(g.x, g.y, wp.x, wp.y);
          g.ang += Math.atan2(Math.sin(a - g.ang), Math.cos(a - g.ang)) * Math.min(1, dt * 6);
          g.x += Math.cos(a) * g.spd * dt;
          g.y += Math.sin(a) * g.spd * dt;
        }
      }
      // the flashlight finds people
      const pd = U.dist(g.x, g.y, p.x, p.y);
      let seen = false;
      if (pd < 205) {
        const pa2 = U.ang(g.x, g.y, p.x, p.y);
        const diff = Math.abs(Math.atan2(Math.sin(pa2 - g.ang), Math.cos(pa2 - g.ang)));
        if (diff < 0.5) {
          let blocked = false;
          for (let s = 1; s <= 6; s++) {
            const t = pxToTile(g.x + (p.x - g.x) * s / 7, g.y + (p.y - g.y) * s / 7);
            if (tileSolid(room.layout, t.c, t.r)) { blocked = true; break; }
          }
          if (!blocked) {
            seen = true;
            g.alert = (g.alert || 0) + dt;
            if (g.alert > 0.5) { this.heistCaught(); return; }
          }
        }
      }
      if (!seen) g.alert = Math.max(0, (g.alert || 0) - dt * 1.6);
    }
  },
  heistCaught() {
    const room = this.room, H = room._heist;
    H.alertedFight = true;
    H.alerted = true;
    room.cleared = false;
    this.setBanner('🚨 FLAGGED', 'the records department would like a word', 2.6);
    this.toast('“UNAUTHORIZED ACCESS. Forms will be filed. AT you.”', '#e05a5a');
    for (const g of H.guards) {
      const e = new Enemy('recordsguard', g.x, g.y, this.depth, false, 1);
      e.spawnT = 0.6;
      this.enemies.push(e);
    }
    H.guards = [];
    this.diaryNote('Got flagged mid-heist in the Records Room. The patrols were startled. Then armed. With forms.');
    SFX.play('boss');
  },

  /* ---------- THE ACTUARY (your mortality, projected to one decimal place) ---------- */
  showActuary(ped) {
    const p = this.player;
    // the projection is built from your actual history
    const deads = (Meta.data.runlog || []).filter(r => r.out === 'dead');
    const avgW = deads.length ? deads.slice(-6).reduce((a, r) => a + r.ward, 0) / Math.min(6, deads.length) : this.depth + 2;
    const ward = Math.max(this.depth + 1, Math.min(this.depth + 5, Math.round(avgW + U.rand(-0.6, 1.2))));
    const C = Meta.data.causeAgg || {};
    const causes = Object.keys(C).filter(c => DATA.ENEMIES[c]).sort((a, b) => C[b] - C[a]);
    const cause = causes.length ? (U.chance(0.7) ? causes[0] : U.choice(causes)) : DATA.pickEnemy(ward, null);
    const causeName = (DATA.ENEMIES[cause] || { name: 'something billable' }).name;
    const conf = (62 + Math.random() * 33).toFixed(1);
    this.state = 'actuary';
    SFX.play('paper');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:24px">📉 THE ACTUARY</h1>
        <div class="tagline">“I don't make the odds. I just laminate them.”</div>
        <div class="docpaper" style="transform:rotate(0.3deg)">
          <div class="docstamp" style="color:#3a5a8a;border-color:#3a5a8a">PROJECTION</div>
          <div class="doctitle">Mortality Forecast — ${DATA.DIAG[p.diag] ? DATA.DIAG[p.diag].name : p.diag}</div>
          <div class="docsub">prepared from ${deads.length || 'insufficient'} prior incident${deads.length === 1 ? '' : 's'} · not medical advice · worse</div>
          <div class="docbody">
            <div style="margin:6px 0">Projected terminal ward: <b>WARD ${ward}</b></div>
            <div style="margin:6px 0">Probable cause: <b>${causeName}</b></div>
            <div style="margin:6px 0">Confidence: <b>${conf}%</b> <i style="opacity:.6">(the decimal is load-bearing)</i></div>
          </div>
        </div>
        <div class="cmgrid">
          <button class="cmcard" id="bActBet"><div class="cmname" style="color:#8fd0e0">🎲 WAGER 5¢ — outlive the projection</div><div class="cmdesc">Clear Ward ${ward} alive and collect 15¢ + ◆3.</div><div class="cmtag">the model hates losing</div></button>
          <button class="cmcard" id="bActNo"><div class="cmname">decline politely</div><div class="cmdesc">Some numbers you don't need to know.</div><div class="cmtag">the printout goes in your file anyway</div></button>
        </div>
      </div>`);
    document.getElementById('bActBet').onclick = () => {
      if (p.coins < 5) { SFX.play('denied'); this.toast('📉 “Five cents. The odds are free; the wager is not.”', '#e08a8a'); return; }
      p.coins -= 5;
      ped.taken = true;
      this._actuaryDone = true;
      this.actuaryBet = { ward, cause, causeName, paid: false };
      this.hideOverlay(); this.state = 'run';
      this.toast('📉 Wager filed: survive Ward ' + ward + '. The Actuary is already drafting your obituary. In pencil.', '#8fd0e0');
      this.diaryNote('An actuary predicted my death: ward ' + ward + ', ' + causeName + ', ' + conf + '% confidence. I bet 5¢ against the math.');
      SFX.play('stamp');
    };
    document.getElementById('bActNo').onclick = () => {
      ped.taken = true;
      this._actuaryDone = true;
      this.hideOverlay(); this.state = 'run';
      this.toast('📉 “Noted. For the record: Ward ' + ward + '. No hard feelings when.”', '#c8b0a0');
      SFX.play('ui');
    };
  },

  /* ---------- THE COMPOUNDING PHARMACIST (two meds enter. one leaves.) ---------- */
  showCompound(ped) {
    const p = this.player;
    const A = DATA.ITEMS[ped.a], B = DATA.ITEMS[ped.b];
    if (!A || !B) { ped.taken = true; return; }
    this.state = 'compound';
    SFX.play('voice');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:24px">⚗ THE COMPOUNDING PHARMACIST</h1>
        <div class="tagline">${U.choice(DATA.COMPOUND_LINES.greet)}</div>
        <div class="summary" style="margin-top:8px">
          <div class="sumrow"><span>🧪 ${A.name}</span><b><i style="opacity:.6">${A.quote || ''}</i></b></div>
          <div class="sumrow"><span style="text-align:center;width:100%">＋</span><b></b></div>
          <div class="sumrow"><span>🧪 ${B.name}</span><b><i style="opacity:.6">${B.quote || ''}</i></b></div>
        </div>
        <div class="tagline" style="opacity:.75">both are destroyed. what comes out is stronger, and a surprise, and technically a smoothie.</div>
        <div class="cmgrid">
          <button class="cmcard" id="bFuseGo"><div class="cmname" style="color:#b86bff">⚗ COMPOUND THEM — ${ped.price}¢</div><div class="cmdesc">One mystery med, from the good shelf.</div><div class="cmtag">FDA status: don't ask</div></button>
          <button class="cmcard" id="bFuseNo"><div class="cmname">back away slowly</div><div class="cmdesc">The mortar is looking at you.</div><div class="cmtag">it remembers customers</div></button>
        </div>
      </div>`);
    document.getElementById('bFuseGo').onclick = () => {
      if (p.coins < ped.price) { SFX.play('denied'); this.toast('⚗ ' + DATA.COMPOUND_LINES.broke[0], '#e08a8a'); return; }
      p.coins -= ped.price;
      ped.taken = true;
      const pool = DATA.pickPool('boss', p.items);
      const outId = U.choice(pool.length ? pool : DATA.pickPool('special', p.items).length ? DATA.pickPool('special', p.items) : DATA.POOLS.special);
      this.peds.push({ x: ped.x, y: U.clamp(ped.y - 60, RY + 40, RY + RH - 40), itemId: outId, kind: 'item', taken: false, _mystery: true });
      Meta.data.compounds = (Meta.data.compounds || 0) + 1;
      Meta.save();
      this.checkUnlocks();
      this.diaryNote('Let the back-room pharmacist fuse two meds into one. The smoke was normal, they said. Normal-ish.');
      this.hideOverlay(); this.state = 'run';
      this.toast('⚗ ' + U.choice(DATA.COMPOUND_LINES.fuse), '#b86bff');
      this.shake = Math.max(this.shake, 6);
      SFX.play('evolve');
      for (let i = 0; i < 16; i++) this.parts.push(new Particle(ped.x + U.rand(-14, 14), ped.y - 30, U.rand(-60, 60), U.rand(-120, -30), U.rand(0.4, 0.9), U.choice(['#b86bff', '#8fd0e0', '#e8c84c']), 3));
    };
    document.getElementById('bFuseNo').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
  },

  showRivalDuel(ped) {
    const R = this.ensureRival();
    this.state = 'rivalduel';
    SFX.play('voice');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🥊 ${R.name} IS HERE</h1>
        <div class="tagline">${DATA.RIVAL_TAUNTS.duelOffer}</div>
        <div class="stats-line">career vs ${R.name}: duels ${R.duelW || 0}–${R.duelL || 0} · pedestal races ${R.raceW || 0}–${R.raceL || 0}</div>
        <div class="cmgrid">
          <button class="cmcard" id="bDuelGo"><div class="cmname" style="color:#d08a4a">🥊 GLOVE UP</div><div class="cmdesc">Winner takes a prescription off the loser's dignity.</div><div class="cmtag">they fight like your mirror. with a grudge.</div></button>
          <button class="cmcard" id="bDuelNo"><div class="cmname">walk away</div><div class="cmdesc">Recovery is not a competition.</div><div class="cmtag">they will absolutely log this as a forfeit</div></button>
        </div>
      </div>`);
    document.getElementById('bDuelGo').onclick = () => {
      SFX.play('boss');
      ped.taken = true;
      this.hideOverlay(); this.state = 'run';
      const room = this.room;
      room.cleared = false; room.spawned = true;
      const e = new Enemy('rival', CW / 2, RY + 130, this.depth, false, 1 + this.depth * 0.05);
      e._isRival = true; e.noDrop = true; e.spawnT = 0.9;
      this.enemies.push(e);
      this.setBanner('🥊 ' + R.name, '“loser admits their coping is a lifestyle”', 2.6);
    };
    document.getElementById('bDuelNo').onclick = () => {
      SFX.play('ui');
      ped.taken = true;
      this.hideOverlay(); this.state = 'run';
      this.toast('🥊 ' + R.name + ' marks it as a forfeit. Out loud. To the room.', '#c8b0a0');
    };
  },

  /* ============================================================
     THE GIFT SHOP (a real fund sink — gifts deliver at check-in)
     ============================================================ */
  showGiftShop(returnTo) {
    this.state = 'giftshop';
    const fund = Meta.data.fund || 0;
    const cart = Meta.data.giftCart || (Meta.data.giftCart = {});
    const cards = DATA.GIFTS.map(g => {
      const owned = !!cart[g.id], can = fund >= g.cost;
      return `<button class="cmcard" data-gift="${g.id}" ${owned ? 'disabled' : ''} style="${owned ? 'opacity:.55' : can ? '' : 'opacity:.75'}">
        <div class="cmname">${g.icon} ${g.name} ${owned ? '· IN CART' : `· ${g.cost}¢`}</div>
        <div class="cmdesc">${g.desc}</div>
        <div class="cmtag">${owned ? '✓ ' : ''}${g.fx}</div>
      </button>`;
    }).join('');
    const inCart = Object.keys(cart).map(id => (DATA.GIFTS.find(g => g.id === id) || {}).icon || '').join(' ');
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">🎁 THE GIFT SHOP</h1>
        <div class="tagline">spend the Wellness Fund on someone you love (you) — balance: <b style="color:#e8c84c">${fund}¢</b></div>
        ${inCart ? `<div class="stats-line">cart, delivering at your next check-in: ${inCart}</div>` : '<div class="stats-line" style="opacity:.7">the cart is empty. the cashier is judging gently.</div>'}
        <div class="cmgrid">${cards}</div>
        ${inCart ? '<button class="btn minor" id="bGiftRefund">↩ EMPTY CART (full refund, light judgment)</button>' : ''}
        <div class="tagline" style="opacity:.65">gifts deliver at the start of your next regular run. the markup funds the aquarium.</div>
        <button class="btn" id="bGiftBack">BACK</button>
      </div>`);
    document.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => {
      const g = DATA.GIFTS.find(x => x.id === b.dataset.gift);
      if (!g || cart[g.id] || (Meta.data.fund || 0) < g.cost) { SFX.play('error'); return; }
      Meta.data.fund -= g.cost;
      cart[g.id] = 1;
      Meta.data.giftBuys = (Meta.data.giftBuys || 0) + 1;
      Meta.save();
      SFX.play('coin');
      this.toast('🎁 ' + g.quip, '#e8a0c8');
      this.checkUnlocks();
      this.showGiftShop(returnTo);
    });
    const br = document.getElementById('bGiftRefund');
    if (br) br.onclick = () => {
      for (const id of Object.keys(cart)) { const g = DATA.GIFTS.find(x => x.id === id); if (g) Meta.data.fund += g.cost; }
      Meta.data.giftCart = {};
      Meta.save();
      SFX.play('paper');
      this.toast('↩ Refunded in full. The cashier says nothing. Loudly.', '#c8b0a0');
      this.showGiftShop(returnTo);
    };
    document.getElementById('bGiftBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
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
      this.diaryNote('Spared ' + B.name + ' on ward ' + this.depth + '. We shook on it. Their hand was mostly clipboard.');
      this.bingoEvent('spare');
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
    // THE HANDOFF: when your file is closed and he trusts you completely, there are two mops
    if (Meta.data.exitDone && (Meta.data.janitorBuys || 0) >= 10 && !Meta.data.handoffDone) {
      this.peds.push({ x: RX + RW - 80, y: RY + RH - 80, kind: 'secondmop', taken: false });
      setTimeout(() => { if (this.state === 'run') { this.toast('🧹 There are two mops on the rack tonight. There has only ever been one mop.', '#e8c05a'); SFX.play('voice'); } }, 2000);
    }
    // the Compounding Pharmacist works out of the basement (of course they do)
    const cbpool = U.shuffle([].concat(DATA.POOLS.special, DATA.POOLS.shop)).filter(id => !p.items.includes(id));
    if (cbpool.length >= 2) this.peds.push({ x: RX + RW - 90, y: RY + RH / 2 + 40, kind: 'compound', a: cbpool[0], b: cbpool[1], price: 5, taken: false });
    this.pickups.push(new Pickup('full', CW / 2 - 40, RY + RH - 130));
    this.pickups.push(new Pickup('pill', CW / 2 + 40, RY + RH - 130));
    for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-90, 90), RY + RH / 2 + 60));
    // one misfiled document always ends up down here (he files by instinct)
    const undoc = (DATA.DOCUMENTS || []).filter(d => !(Meta.data.docs || {})[d.id]);
    if (undoc.length && !this.sandbox && !this.practice) {
      const dp = new Pickup('coin', RX + RW - 90, RY + 110);
      dp.type = 'document'; dp._docId = U.choice(undoc).id; dp.settle = 0; dp.vx = 0; dp.vy = 0;
      this.pickups.push(dp);
    }
    this.diaryNote('Saw the basement. Forty years of finding things. Bought two of them.');
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

  /* ---------- THE ROOF (the building's one serene place) ---------- */
  enterRoof() {
    const p = this.player;
    this._roofReturn = { room: this.room, x: p.x, y: p.y };
    const rf = makeRoom(497, 497, 'dayroom');
    rf._roof = true; rf.visited = true; rf.spawned = true; rf.cleared = true;
    rf.doors = {}; rf.secretDoors = {};
    buildLayout(rf, 1);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) rf.layout[r][c] = 0;
    this.enterRoom(rf, null);
    p.x = CW / 2; p.y = RY + RH - 70;
    // the garden: the janitor's tomatoes, ripe
    for (let i = 0; i < 3; i++) {
      const tp = new Pickup('half', RX + 120 + i * 54, RY + RH - 110);
      tp._tomato = true; tp.settle = 0; tp.vx = 0; tp.vy = 0;
      this.pickups.push(tp);
    }
    this.peds.push({ x: RX + RW - 110, y: RY + 100, kind: 'roofnest', taken: false });   // the pigeon's nest
    this.peds.push({ x: CW / 2, y: RY + 70, kind: 'roofview', taken: false });           // the railing. the skyline.
    this.peds.push({ x: RX + 80, y: RY + RH - 70, kind: 'roofexit', taken: false });
    if (!this.sandbox && !this.practice) { Meta.data.roofVisits = (Meta.data.roofVisits || 0) + 1; Meta.save(); this.checkUnlocks(); }
    this.setBanner('🌤 THE ROOF', 'the building\'s one serene place', 3.0);
    this.toast('🍅 The janitor\'s tomato garden. The pigeon\'s nest. Actual sky. Take a minute — the wards can wait.', '#8fd0e0');
    this.diaryNote('Found the roof. There is sky up there — the real one. The janitor grows tomatoes. Nobody bills the sun.');
    SFX.setMusic('dayroom');
    SFX.play('fanfare');
  },
  exitRoof() {
    const R = this._roofReturn;
    if (!R || !R.room) { this.showTitle(); return; }
    this.enterRoom(R.room, null);
    this.player.x = R.x; this.player.y = R.y;
    this._roofReturn = null;
    this.toast('🪜 Back down into the hum. The tomatoes wave. Tomatoes can\'t wave. These did.', '#b8b0a0');
  },

  /* ---------- THE ANNEX (the wing they closed; the dust kept the lease) ---------- */
  enterAnnex() {
    this.annexFloor = true;
    this.depth += 1;   // the annex sits at the next ward's depth — but its exit falls one further
    this.newFloor();
    this.setBanner('🚧 THE ANNEX', 'the condemned wing — double loot, no services, one deep exit', 3.4);
    this.toast('🚧 Sheeted furniture. Dust with a pulse. Everything here is 25% more upset about you.', '#b8a890');
    this.diaryNote('Went through the boarded door into the Annex. The furniture is under sheets. Some of the sheets object.');
    SFX.setMusic('basement');
    SFX.play('sting');
  },

  /* ---------- THE FIRE ALARM (the sign has three words) ---------- */
  showFireAlarm(ped) {
    this.state = 'firealarm';
    SFX.play('tick');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🧯 FIRE ALARM</h1>
        <div class="tagline">the box is red. the handle is right there. the sign says <b>DO NOT PULL</b>.</div>
        <div class="cmgrid">
          <button class="cmcard" id="bAlarmYes"><div class="cmname" style="color:#e05a5a">🚨 PULL IT</div><div class="cmdesc">Sprinklers. Evacuation. Every room on this ward empties at once.</div><div class="cmtag">you get soaked (−1 luck this ward) · the bill notices · the intercom never forgets</div></button>
          <button class="cmcard" id="bAlarmNo"><div class="cmname">read the sign again</div><div class="cmdesc">Three words. You can do this.</div><div class="cmtag">the handle will still be here</div></button>
        </div>
      </div>`);
    document.getElementById('bAlarmYes').onclick = () => { ped.taken = true; this.hideOverlay(); this.state = 'run'; this.pullAlarm(); };
    document.getElementById('bAlarmNo').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; this.toast('You read the sign again. It still says that. Character growth.', '#8fd08a'); };
  },
  pullAlarm() {
    const p = this.player;
    this._alarmPulled = true;
    this._sprinkleT = 4.5;
    // the whole ward evacuates (management stays; it's salaried)
    let evac = 0;
    for (const r of this.floorRooms) {
      if (r.type === 'boss' || r.cleared) continue;
      r.cleared = true; r.spawned = true;
      evac++;
    }
    for (const e of this.enemies) {
      if (e.dying || e.fake) continue;
      e.dying = true; e.deadDone = true; e.noDrop = true;
      this.texts.push(new FloatText(e.x, e.y - 10, '(files out, damp)', '#8fb8d8'));
    }
    if (this.room && this.room.type !== 'boss') this.room.cleared = true;
    if (!this._soaked) { this._soaked = true; p.luck -= 1; }
    if (!this.sandbox && !this.practice) { Meta.data.alarmPulls = (Meta.data.alarmPulls || 0) + 1; Meta.save(); this.checkUnlocks(); }
    this.shake = Math.max(this.shake, 10);
    this.setBanner('🚨 EVACUATION', evac + ' rooms empty out. you are SOAKED. worth it? unclear.', 3.2);
    this.toast('🚨 The sprinklers are older than the staff. They work. Everything is wet and now we know.', '#8fb8d8');
    this.pa('firealarm');
    this.diaryNote('The sign said DO NOT PULL, which is three words, all of which I read, and then I pulled. The whole ward evacuated. I regret only the dampness.');
    SFX.play('boss');
    SFX.play('whoosh');
  },

  /* ---------- OPEN MIC NIGHT (the stage is a step stool) ---------- */
  showOpenMic(ped) {
    const p = this.player;
    const M = DATA.OPENMIC[ped.performer] || DATA.OPENMIC.generic;
    const pname = (DATA.ENEMIES[ped.performer] || { name: 'A patient' }).name;
    this.state = 'openmic';
    SFX.play('voice');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:24px">🎤 OPEN MIC NIGHT</h1>
        <div class="tagline">${M.intro}</div>
        <div class="docpaper" style="transform:rotate(0.2deg)">
          <div class="docstamp" style="color:#8a6aa0;border-color:#8a6aa0">LIVE</div>
          <div class="doctitle">🎤 ${pname}</div>
          <div class="docbody"><div style="margin:8px 0;line-height:1.5;font-style:italic">${M.piece}</div></div>
        </div>
        <div class="cmgrid">
          <button class="cmcard" id="bMicYes"><div class="cmname" style="color:#8fd08a">👏 SUPPORT</div><div class="cmdesc">Snap. Clap. Mean it, or fake it well.</div><div class="cmtag">+1 luck · the performer shares their tips</div></button>
          <button class="cmcard" id="bMicNo"><div class="cmname" style="color:#e0a05a">🍅 HECKLE</div><div class="cmdesc">“Read the room!” The room is a psych ward. They wrote it FOR the room.</div><div class="cmtag">+0.5 damage, −0.5 luck · the room remembers</div></button>
        </div>
      </div>`);
    document.getElementById('bMicYes').onclick = () => {
      ped.taken = true;
      this.hideOverlay(); this.state = 'run';
      p.luck += 1;
      for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('coin', ped.x + U.rand(-24, 24), ped.y + 30));
      if (U.chance(0.4)) this.pickups.push(new Pickup('pill', ped.x, ped.y + 50));
      if (!this.sandbox && !this.practice) { Meta.data.micSupports = (Meta.data.micSupports || 0) + 1; Meta.save(); this.checkUnlocks(); }
      this.toast('👏 You snapped. They saw. The set ends STRONG. (+1 luck, and they split the tips.)', '#8fd08a');
      this.diaryNote('Supported ' + pname + ' at open mic. The piece was rough. The courage wasn\'t.');
      SFX.play('fanfare');
    };
    document.getElementById('bMicNo').onclick = () => {
      ped.taken = true;
      this.hideOverlay(); this.state = 'run';
      p.dmg += 0.5; p.luck -= 0.5;
      this.diaryNote('Heckled ' + pname + ' at open mic. Felt powerful for nine seconds. The room took notes.');
      if (U.chance(0.25) && DATA.ENEMIES[ped.performer]) {
        const e = new Enemy(ped.performer, ped.x, ped.y, this.depth, false, 1.4, U.choice(DATA.ELITES).id);
        e.spawnT = 0.7;
        this.enemies.push(e);
        this.room.cleared = false;
        this.toast('🍅 “…say it again.” They left the stool. They brought the MIC STAND.', '#e05a5a');
        SFX.play('boss');
      } else {
        this.toast('🍅 The set ends early. Your cruelty focuses you (+0.5 dmg). The room files it away (−0.5 luck).', '#e0a05a');
        SFX.play('denied');
      }
    };
  },

  /* ---------- THE HANDOFF (forty years, one bucket, two mops) ---------- */
  showHandoffOffer(ped) {
    this.state = 'handoffoffer';
    SFX.play('voice');
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">🧹 THE SECOND MOP</h1>
        <div class="tagline">“Been forty years,” he says, not looking up. “Floor doesn't need me. Needs a person. Doesn't much care which.”</div>
        <div class="stats-line">“You know the prices. You know the vents. You knew about the basement before I showed you — don't lie.”</div>
        <div class="cmgrid">
          <button class="cmcard" id="bMopYes"><div class="cmname" style="color:#e8c05a">🧹 TAKE THE MOP</div><div class="cmdesc">He walks out the front door into the morning. You stay. The floor is yours.</div><div class="cmtag">this ends the run — and changes the building, a little, forever</div></button>
          <button class="cmcard" id="bMopNo"><div class="cmname">not yet</div><div class="cmdesc">“No rush. Floor's not going anywhere. That's the whole problem with floors.”</div><div class="cmtag">the mop will wait</div></button>
        </div>
      </div>`);
    document.getElementById('bMopYes').onclick = () => {
      ped.taken = true;
      this.hideOverlay();
      this.startHandoff();
    };
    document.getElementById('bMopNo').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
  },
  startHandoff() {
    this.state = 'handoff';
    this.handoffT = 0;
    this.hideOverlay();
    document.body.classList.remove('inrun');
    SFX.setMusic('cutscene');
    if (!this._hoTapBound) {
      this._hoTapBound = () => { if (this.state === 'handoff' && this.handoffT > 4) this.handoffT = Math.max(this.handoffT, 13.5); };
      document.getElementById('game').addEventListener('pointerdown', this._hoTapBound);
    }
  },
  handoffUpdate(dt) {
    this.handoffT += dt;
    if (Input.take('confirm') && this.handoffT > 4) this.handoffT = Math.max(this.handoffT, 13.5);
    if (this.handoffT >= 15) {
      Meta.data.handoffDone = 1;
      Meta.data.insight = (Meta.data.insight || 0) + 25;
      Meta.save();
      this.checkUnlocks();
      this.diaryNote('Took the mop. He left through the front door, into the morning, with a wave and no look back. The floor is mine now. It has always needed a person.');
      this.recordRun('handoff');
      this.showTitle();
    }
  },

  /* ---------- THE PAYPHONE (1¢ a call. one feeling at a time.) ---------- */
  showPayphone(ped) {
    const p = this.player;
    this.state = 'payphone';
    SFX.play('tick');
    const broke = p.coins < 1;
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:26px">📞 THE PAYPHONE</h1>
        <div class="tagline">it takes exact change and one feeling at a time · 1¢ a call</div>
        <div class="cmgrid">
          <button class="cmcard" id="bPhMom" ${broke ? 'disabled style="opacity:.6"' : ''}><div class="cmname" style="color:#e8a0c8">📞 CALL MOM</div><div class="cmdesc">She picks up on the first ring. She always does.</div><div class="cmtag">heal a heart · +damage for this ward (guilt is fuel)</div></button>
          <button class="cmcard" id="bPhWork" ${broke ? 'disabled style="opacity:.6"' : ''}><div class="cmname" style="color:#8fa8c8">📞 CALL WORK</div><div class="cmdesc">“Great timing! Quick thing—” It is never quick. It is never a thing.</div><div class="cmtag">+0.4 damage · −0.5 luck (the hustle)</div></button>
          <button class="cmcard" id="bPhSpon" ${broke ? 'disabled style="opacity:.6"' : ''}><div class="cmname" style="color:#8fd08a">📞 CALL YOUR SPONSOR</div><div class="cmdesc">“I was just thinking about you.” They weren't. It still helps.</div><div class="cmtag">clears the ward side-effect · or +1 luck if clean</div></button>
          <button class="cmcard" id="bPhWrong" ${broke ? 'disabled style="opacity:.6"' : ''}><div class="cmname" style="color:#c8b878">📞 MISDIAL</div><div class="cmdesc">You know exactly one digit of this number.</div><div class="cmtag">anything. genuinely anything.</div></button>
        </div>
        <button class="btn minor" id="bPhBack">hang up</button>
      </div>`);
    const call = (fn) => {
      if (p.coins < 1) { SFX.play('denied'); return; }
      p.coins -= 1;
      ped.taken = true;
      this.hideOverlay(); this.state = 'run';
      SFX.play('tick');
      fn();
    };
    document.getElementById('bPhMom').onclick = () => call(() => {
      p.heal(2);
      p._gymAdd = (p._gymAdd || 0) + 0.4; p.dmg += 0.4;   // rides the per-floor reset
      if (!this.sandbox && !this.practice) { Meta.data.momCalls = (Meta.data.momCalls || 0) + 1; Meta.save(); this.checkUnlocks(); }
      this.toast('📞 “Sweetheart. Eat something. DESTROY them.” +♥, +dmg this ward.', '#e8a0c8');
      this.diaryNote('Called Mom from a hallway payphone. She said to eat something and destroy them. Doing both.');
      SFX.play('heal');
    });
    document.getElementById('bPhWork').onclick = () => call(() => {
      p.dmg += 0.4; p.luck -= 0.5;
      this.toast('📞 “While I have you—” You are now thinking about work. +0.4 dmg, −0.5 luck.', '#8fa8c8');
      this.diaryNote('Called work from the ward. Why did I call work from the ward.');
      SFX.play('paper');
    });
    document.getElementById('bPhSpon').onclick = () => call(() => {
      if (this.sideEffect) {
        const se = DATA.SIDE_EFFECTS.find(s => s.id === this.sideEffect);
        this.sideEffect = null;
        this.toast('📞 “Name it and it gets smaller.” ' + (se ? se.name : 'The side effect') + ' lifts.', '#8fd08a');
      } else {
        p.luck += 1;
        this.toast('📞 “Proud of you. That\'s it. That\'s the call.” +1 luck.', '#8fd08a');
      }
      p.heal(1);
      this.diaryNote('Called my sponsor. Two minutes. It held the whole ward up.');
      SFX.play('heal');
    });
    document.getElementById('bPhWrong').onclick = () => call(() => {
      const roll = U.randi(0, 4);
      if (roll === 0) { p.coins += 5; this.toast('📞 “—wait, this isn\'t accounting? Keep the deposit, please, don\'t tell—” +5¢.', '#e8c84c'); SFX.play('coin'); }
      else if (roll === 1) { if (p.pill == null) p.pill = U.randi(0, 9); this.toast('📞 A pharmacy hold line. You were on it 40 seconds and somehow have a prescription.', '#b86bff'); SFX.play('pickup'); }
      else if (roll === 2) {
        for (let i = 0; i < 2; i++) { const e = new Enemy(DATA.pickEnemy(this.depth, this.wing), U.clamp(p.x + U.rand(-160, 160), RX + 40, RX + RW - 40), U.clamp(p.y + U.rand(-120, 120), RY + 40, RY + RH - 40), this.depth, false, 1); e.spawnT = 0.8; this.enemies.push(e); }
        this.room.cleared = false;
        this.toast('📞 “WHO IS THIS?” You woke someone up. They\'re coming.', '#e05a5a'); SFX.play('boss');
      }
      else if (roll === 3) { this.pa('idle'); this.toast('📞 It rang the INTERCOM. He answered. He always answers.', '#c8b8d8'); }
      else { this.toast('📞 A very long silence, then, softly: “good luck in there.” Dial tone.', '#c8b878'); p.luck += 0.5; }
      this.diaryNote('Misdialed on the payphone. It went about how misdials go, which is to say: memorably.');
    });
    document.getElementById('bPhBack').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
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
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout', 'seasonal'];
    this._fvar = this._fvar || {};   // which cards are flipped to their Second Opinion
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const seasonalOpen2 = Object.keys(Meta.data.calDays || {}).length >= 4;
    const cards = order.map(id => {
      const D = DATA.DIAG[id];
      const nineDone = ['adhd','bipolar','depression','anxiety','schizo','ocd','ptsd','insomnia','fine'].filter(d => (Meta.data.diagsPlayed||{})[d]).length >= 9;
      const locked = (id === 'fine' && !fineOpen) || (id === 'undiag' && !nineDone) || (id === 'burnout' && !burnoutOpen) || (id === 'seasonal' && !seasonalOpen2);
      const best = (Meta.data.diagBest || {})[id];
      const soOpen = !locked && (best || 0) >= 6 && DATA.DIAG2 && DATA.DIAG2[id];   // beat the Ward-5 Walrus with the base
      const flipped = soOpen && this._fvar[id];
      const D2 = flipped ? DATA.DIAG2[id] : null;
      return `<button class="charCard ${locked ? 'locked' : ''}" data-d="${id}" ${locked ? 'disabled' : ''} style="${flipped ? 'outline:2px solid ' + D.color : ''}">
        ${soOpen ? `<span class="soflip" data-f="${id}" title="Second Opinion" style="position:absolute;top:4px;right:6px;font-size:13px;cursor:pointer">⇄${flipped ? 'Ⅱ' : ''}</span>` : ''}
        <canvas width="84" height="84" data-cd="${id}" data-cv="${flipped ? 1 : 0}"></canvas>
        <div class="cname" style="color:${locked ? '#8a8078' : D.color}">${locked ? '?????' : (flipped ? D2.name : D.name)}</div>
        <div class="cline">${locked ? (id === 'undiag' ? 'play all nine diagnoses' : id === 'burnout' ? 'reach Ward 10 three ways' : id === 'seasonal' ? 'check in on 4 different weekdays' : 'tell the truth at a checkup') : (flipped ? D2.tag : D.tag)}</div>
        <div class="cbest">${locked ? (id === 'undiag' ? 'every chart, once' : id === 'burnout' ? 'three diagnoses, ward 10 each' : id === 'seasonal' ? 'the calendar is watching back' : 'or defeat Dr. Walrus') : (flipped ? 'Ⅱ · second opinion' : (best ? 'best: ward ' + best : 'no chart yet'))}</div>
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
        <button class="btn pamphlet" id="bHowHb">📘 THE PATIENT HANDBOOK <span style="font-size:11px;font-style:italic;opacity:.75">— the FULL documentation</span></button>
        <button class="btn" id="bBack">BACK</button>
      </div>`);
    document.getElementById('bHowHb').onclick = () => { SFX.play('paper'); this.showHandbook(() => this.showHow()); };
    document.getElementById('bBack').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* ---------- THE PATIENT HANDBOOK (Form EGS-1) ----------
     The complete in-fiction manual: every mechanic, symptom, ward, and
     service. Mostly generated from DATA so new content lists itself;
     the prose sections get a line whenever a feature ships. */
  HB_REV: 28,
  showHandbook(returnTo) {
    this.state = 'handbook';
    if (!this._hbTab) this._hbTab = 'basics';
    const R = (icon, name, desc, tag) => `<div class="hbrow">${icon ? icon + ' ' : ''}<b>${name}</b>${tag ? ` <span class="hbtag">· ${tag}</span>` : ''} — ${desc}</div>`;
    const H = t => `<div class="hbh">${t}</div>`;
    const N = t => `<div class="hbnote">${t}</div>`;
    const EN = DATA.CODEX_CHART.enemies, BO = DATA.CODEX_CHART.bosses;

    const TABS = {
      basics: () => H('WELCOME TO THE PRACTICE')
        + N('You are a patient. The building goes down forever. Clear each room of symptoms, find the trapdoor, descend. Dr. Walrus reviews you every 5th ward; THE CURE waits on Ward 25 (it isn\'t), THE FOUNDER on Ward 50, THE SYSTEM on Ward 100. Dying discharges you — but ◆ Insight, unlocks, and the Wellness Fund persist. You always keep something.')
        + H('CONTROLS')
        + R('⌨️', 'PC', '<span class="kbd">WASD</span> move · arrows/mouse shoot · <span class="kbd">SPACE</span>/<span class="kbd">SHIFT</span> PRN ability · <span class="kbd">Q</span> pill · <span class="kbd">E</span> claim form · <span class="kbd">TAB</span> map · <span class="kbd">P</span> pause · <span class="kbd">M</span> mute')
        + R('📱', 'Touch', 'left thumb moves, right thumb aims & fires; on-screen buttons for the rest')
        + R('🎮', 'Gamepad', 'sticks move/shoot · A ability · X pill · B claim · SELECT drops <b>Patient Two</b> into couch co-op with their own chart · START pause')
        + H('VITALS & RESOURCES')
        + R('♥', 'Hearts', 'your health, in halves. Hit = brief invincibility frames. Zero = discharged')
        + R('¢', 'Copays', 'the currency. Nickels are worth 5. Spent at pharmacies, machines, the Janitor — leftovers are "donated" to the Wellness Fund at discharge')
        + R('🔑', 'Referrals', 'keys. Open the Specialist\'s door, locked treatment rooms, and chests')
        + R('📄', 'Claim Forms', 'bombs. Place one, step back — they break rocks, walls (secret rooms!), and arguments')
        + R('💊', 'Pills', `${DATA.PILLS.length} kinds, unidentified until swallowed. Could be either direction. Sticky Note / Maintenance Dose / Spare Readers identify them`)
        + R('⚡', 'PRN Ability', 'your diagnosis\' signature move on a cooldown — see YOUR FILE below')
        + R('🍀', 'Luck', 'invisible stat: better drops, better room tips, kinder machines')
        + H('YOUR FILE — THE DIAGNOSES')
        + N('The checkup assigns one; PATIENT FILES lets you choose. Every chart plays differently.')
        + Object.entries(DATA.DIAG).map(([k, d]) => R('🩺', d.name, `${d.mech}${DATA.ABILITIES[k] ? ` <span class="hbtag">PRN: ${DATA.ABILITIES[k].name} — ${DATA.ABILITIES[k].blurb}</span>` : ''}`, d.tag)).join('')
        + H('SECOND OPINIONS (unlockable variants)')
        + N('Beat the Ward-5 Walrus with a base diagnosis to unlock its flip side — swap with ⇄ on Patient Files.')
        + Object.values(DATA.DIAG2).map(d => R('⇄', d.name, d.mech, d.tag)).join('')
        + H('SAVING')
        + N('Runs checkpoint at each new floor — CONTINUE resumes them. Everything else saves itself on this device; back up or transfer via <b>Settings → SAVE DATA</b> (EGSSAVE codes). Seeded runs (Daily, Challenge) don\'t checkpoint.'),

      building: () => H('THE DESCENT')
        + N(`Escalation tiers, by depth: ${DATA.TIERS.map(t => `<b>${t.name}</b> (${t.d}+)`).join(' · ')}.`)
        + R('🚪', 'Descending', 'beat the ward boss, take the trapdoor. Some descents offer a CHOICE of ward:')
        + Object.values(DATA.WARD_PATHS).map(w => R('', w.name, w.desc)).join('')
        + H('ROOMS')
        + R('🛏', 'Normal / Padded wards', 'symptoms spawn, doors lock, manage everyone, doors open')
        + R('⭐', 'The Specialist', 'the item room. Needs a Referral 🔑. A free prescription on a pedestal')
        + R('🛍', 'The Gift Shop', 'meds, hearts, and misc at retail markup. Plans, coupons, and talents change prices')
        + R('🏥', 'The Clinic', 'a miniboss office — Charge Nurse, Resident, or Orderly. Pays out a reward')
        + R('🏋', 'The Gym', 'exercise equipment, and where your RIVAL insists on duels')
        + R('🛋', 'The Day Room', 'sanctuary. A water cooler (heals), a patient with a boon, CONTRACTS to sign, and sometimes OPEN MIC NIGHT')
        + R('🗄', 'The Records Room', 'your file is in there. Sneak the stacks past the flashlights for loot — get spotted and Records Patrol comes')
        + R('☕', 'The Breakroom', 'staff only (nobody checks). The cabinet remembers what you feed it')
        + R('⚠️', 'The Incident Site', 'something happened here last run (yours). Clear it for ◆ Insight')
        + R('🪜', 'The Stairwell', 'an alternate descent — a gauntlet with a clean-run bonus')
        + R('🕳', 'Secret rooms', 'bomb a promising wall. Contracts and goals love them')
        + H('SPECIAL FLOORS & WEATHER')
        + R('🌙', 'Night Shift', 'the lights are off, the NIGHT NURSE glides, coins pay a differential')
        + R('👥', 'Shadow Ward', 'dark and generous — cleared rooms pay double')
        + R('🏚', 'THE ANNEX', 'a sealed wing off deep wards. Nobody\'s swept the valuables in years')
        + R('🍂', 'Seasonal wards', 'the weather gets indoors — check your season')
        + R('🕯', 'The Thirteenth Ward', 'candlelit, off the books. The Janitor\'s MASTER KEY is only found here')
        + R('🏙', 'THE ROOF', 'the ascent. Climb instead of descend and THE BOARD votes on you at the top')
        + H('WARD CONDITIONS (rolled at descent)')
        + N('Specialty wings: ' + DATA.WINGS.map(w => `${w.icon} <b>${w.name}</b> <span class="hbtag">${w.sub}</span>`).join(' · '))
        + DATA.COMPLICATIONS.map(c => R('🎲', c.name, c.desc)).join('')
        + DATA.SIDE_EFFECTS.map(s => R(s.icon, s.name, s.desc)).join('')
        + H('CODE GRAY (floor crises, ward 4+)')
        + DATA.CRISES.map(c => R(c.icon, c.name, c.desc)).join('')
        + H('THE WARD CALENDAR')
        + N('The building runs on your real week:')
        + [1, 2, 3, 4, 5, 6, 0].map(d => { const c = DATA.CALENDAR[d]; return R(c.icon, c.name, c.desc); }).join(''),

      symptoms: () => H('THE GENERAL POPULATION')
        + N('Listed with the ward they first appear on. Deeper wards lean harder on the late roster.')
        + DATA.enemyPoolFor(999).map(e => { const d = DATA.ENEMIES[e.id]; return R('', d.name, EN[e.id] || '—', 'ward ' + e.d + '+'); }).join('')
        + H('SPECIAL APPEARANCES')
        + R('', DATA.ENEMIES.form.name, EN.form, 'paperwork')
        + R('', DATA.ENEMIES.auditor.name, EN.auditor, 'roams deep wards')
        + R('', DATA.ENEMIES.rival.name, EN.rival, 'gym duels')
        + R('', DATA.ENEMIES.nightnurse.name, EN.nightnurse, 'night shift')
        + R('', DATA.ENEMIES.recordsguard.name, EN.recordsguard, 'records security')
        + R('', DATA.ENEMIES.chargenurse.name, EN.chargenurse, 'clinic miniboss')
        + R('', DATA.ENEMIES.resident.name, EN.resident, 'clinic miniboss')
        + R('', DATA.ENEMIES.orderly.name, EN.orderly, 'clinic miniboss')
        + H('CHAMPIONS (elite cases, ward 6+)')
        + DATA.ELITES.map(e => R('👑', e.name, `${Math.round(e.hp * 100)}% health${e.dmg > 1 ? ', hits double' : ''}${e.spd > 1 ? ', faster' : e.spd < 1 ? ', slower' : ''} — drops better loot`)).join('')
        + N('Hallucinations: some diagnoses see patients who aren\'t there. Fakes pop in one hit and can\'t hurt you. Foam Earplugs make them shimmer.'),

      staff: () => H('WARD MANAGEMENT (bosses)')
        + Object.entries(DATA.BOSSES).map(([k, b]) => {
          const when = { gatekeeper: 'rotation · ward 1+', larperking: 'rotation · ward 1+', adjuster: 'rotation · ward 2+', priorauth: 'rotation · ward 2+', stigma: 'rotation · ward 3+', dsm: 'rotation · ward 3+', algorithm: 'rotation · ward 3+', influencer: 'rotation · ward 3+', withdrawal: 'rotation · ward 4+', burnout: 'rotation · ward 4+', peerreview: 'rotation · ward 6+', merger: 'rotation · ward 30+', walrus: 'every 5th ward', thecure: 'ward 25', theboard: 'THE ROOF', founder: 'ward 50', thesystem: 'ward 100' }[k];
          return R('☠', `${b.name} <span class="hbtag">${b.sub}</span>`, BO[k] || '—', when);
        }).join('')
        + H('CHAMPION AFFIXES (ward 8+)')
        + DATA.BOSS_AFFIXES.map(a => R('🏷', a.name, a.note)).join('')
        + H('NEGOTIATION')
        + N(`Some management would rather settle: at the end of their rope, ${Object.keys(DATA.BOSS_DEALS).map(k => `<b>${DATA.BOSSES[k].name}</b>`).join(', ')} may offer a deal instead of a second phase. Read the terms.`)
        + H('SECOND PHASES & PAPERWORK')
        + N('Every boss has more chart than it shows. Dr. Walrus in particular has never once been out of moves — the SECOND SHIFT least of all. Bosses drop a reward pedestal and the trapdoor; on some plans the reward bills you.'),

      loot: () => H('PRESCRIPTIONS (items)')
        + N(`${Object.keys(DATA.ITEMS).length} and counting — pedestal items that change your build: damage, tears, movement, familiars, flags, and worse. Pools: the Specialist's shelf (${DATA.POOLS.special.length}), boss rewards (${DATA.POOLS.boss.length}), shop stock (${DATA.POOLS.shop.length}), out-of-network oddities (${DATA.POOLS.oon.length}). The full annotated list — including what you've found — lives in the <b>PATIENT CHART</b> codex.`)
        + H('PRESCRIPTION TRANSFORMATIONS')
        + N('Collect 3 items from one theme and the chart upgrades you:')
        + DATA.TRANSFORMS.map(t => R('✨', t.name, `3 ${t.theme}-themed prescriptions`)).join('')
        + H('KNOWN SYNERGIES')
        + DATA.SYNERGIES.map(s => R('🧪', s.name, `${(DATA.ITEMS[s.a] || {}).name || s.a} + ${(DATA.ITEMS[s.b] || {}).name || s.b}: ${s.desc}`)).join('')
        + H('PERSONAL EFFECTS (trinkets)')
        + N('One slot. Swap freely by walking over another.')
        + DATA.TRINKETS.map(t => R(t.icon, t.name, t.desc)).join('')
        + H('PILLS ON THE FORMULARY')
        + N(DATA.PILLS.map(p => p.name).join(' · '))
        + H('VENDORS & MACHINES')
        + R('🛍', 'The Gift Shop / Pharmacy', 'retail. GoodRx coupons take a med to half price; plans and talents change everything')
        + R('🧹', 'The Janitor', 'a secret shop in the walls. Cash only. Don\'t ask where it\'s been')
        + R('💼', 'The Drug Rep', 'free samples — real stats, plus a lingering side effect from the fine print')
        + R('⚗️', 'The Compounding Pharmacist', 'feed him two meds, get one custom compound back')
        + R('🍫', 'Commissary machines', 'vending (snacks & sundries) and the horoscope printer (a real, small blessing or curse)')
        + R('🎁', 'Care Packages', 'gift codes — mail an item to a friend\'s next run from the DAILY WARD screen'),

      meta: () => H('◆ INSIGHT & THE TREATMENT PLAN')
        + N(`Insight is earned by TREATMENT GOALS, contracts, incidents, protocols, and just surviving. Spend it on the TREATMENT PLAN — six therapy modalities, four tiers each, capstones included. Second opinions are free: a full-refund respec button appears once you've invested.`)
        + DATA.TALENT_BRANCHES.map(b => R(b.icon, b.name, b.blurb)).join('')
        + H('PER-RUN OBJECTIVES')
        + N('3 TREATMENT GOALS roll each run and pay ◆ on the spot. Day Room patients offer CONTRACTS — sign one, deliver, get paid.')
        + H('INSURANCE PLANS (picked at intake)')
        + DATA.PLANS.map(p => R(p.icon, `${p.name} <span class="hbtag">${p.tag}</span>`, p.lines.join(' · '))).join('')
        + H('COMORBIDITIES (between floors)')
        + N('Descending sometimes offers a second label — mild risk/reward, stackable:')
        + DATA.COMORBIDITIES.map(c => R('🏷', c.name, c.desc)).join('')
        + N('Hold both halves of a known pair and they fuse: ' + DATA.COMORBID_SYNERGY.map(s => `<b>${s.name}</b>`).join(', ') + '.')
        + H('MODES & DOORS IN')
        + R('🩺', 'START CHECKUP', 'the standard intake: quiz, diagnosis, descend')
        + R('🗓', 'DAILY WARD', 'one seeded run per day, same for everyone, with posted HOUSE RULES (' + DATA.HOUSE_RULES.length + ' in rotation). Leaderboard-of-one: your calendar')
        + R('🚑', 'WALK-IN CLINIC', 'skip the paperwork — a quick randomized run, no questions asked')
        + R('⏰', 'OVERTIME', 'endless arena floors on a clock. The floor never closes')
        + R('🎲', 'PROGNOSIS', 'challenge modifiers: ' + DATA.PROGNOSES.map(p => p.name).join(', '))
        + R('🧪', 'PROTOCOLS', DATA.PROTOCOLS.length + ' curated rule-set runs; finishing one (Ward-5 boss) pays +25◆')
        + R('🩸', 'CHRONIC MODE', 'the New Game+ loop for finished charts — everything is worse, on purpose')
        + R('☠', 'BOSS RUSH', 'management only, back to back (complete the boss codex to unlock)')
        + R('🎮', 'PATIENT TWO', 'couch co-op — a second pad joins from the pause menu or SELECT')
        + H('COMPANY YOU KEEP')
        + N('Emotional Support Animals (equip one in Settings): ' + DATA.PETS.map(p => `${p.icon} <b>${p.name}</b> — ${p.note} <span class="hbtag">(${p.unlockHint})</span>`).join(' · '))
        + N('THE SUPPORT GROUP (recruited allies, cap 3, revive on room clear): ' + DATA.ALLIES.map(a => `<b>${a.name}</b> (${a.diag}) — ${a.blurb}`).join(' · '))
        + R('🪪', 'The Intern', 'appears on Ward 2, terrified. Keep them alive three floors and they graduate — permanently recruitable')
        + R('🐾', 'Pet Playdates', 'your animals socialize in the Waiting Room. This has gameplay consequences (small, adorable ones)')
        + H('THE WAITING ROOM (hub)')
        + R('💰', 'The Wellness Fund', 'discharge donations buy real furniture with standing perks: ' + DATA.FACILITY.map(f => `${f.icon} ${f.name} (${f.perk})`).join(' · '))
        + R('📬', 'The Complaint Department', 'file your feedback. They weaponize it')
        + R('🎱', 'WARD BINGO', 'a persistent card of ward chores — lines pay ◆')
        + R('📻', 'WWRD Ward Radio', 'the jukebox: ' + DATA.RADIO_TRACKS.length + ' tracks and a DJ with opinions')
        + R('📞', 'The Payphone', 'collect calls from people you\'ve met. Answer it')
        + R('📊', 'The Actuary', 'sets your INTENSITY dial (1-10) — risk and reward, actuarially adjusted')
        + R('👻', 'Ghost of Runs Past', 'your last run haunts the hub. It has notes')
        + R('🐕', 'Reunion', 'lost companions wait in the hub between runs')
        + H('PAPER TRAIL')
        + R('📖', 'Patient Diary', 'the run writes itself — reread your history')
        + R('🗃', 'Misfiled Documents', 'lore, found where it shouldn\'t be')
        + R('📖', 'CHART NOTES', 'the story so far, replayable')
        + R('🏆', 'UNLOCKS', DATA.ACHIEVEMENTS.length + ' achievements; some pay out HATS: ' + DATA.HATS.map(h => `${h.name} (${h.hint})`).join(', ')),

      events: () => H('WARD LIFE (mini-events)')
        + N('Non-combat rooms where someone wants something. Choices have teeth:')
        + DATA.EVENTS.map(e => R('🚪', e.name, e.prompt)).join('')
        + H('SCHEDULED DISRUPTIONS')
        + R('🧯', 'THE FIRE ALARM', 'a red box on a wall, once a run. The sign says DO NOT PULL. Pulling it is a choice with sprinklers')
        + R('📋', 'THE INSPECTION', 'the Joint Commission tours the ward. Everything is fine. Smile with your eyes. Don\'t bust the performance')
        + R('🤝', 'THE HANDOFF', 'shift change mid-run — your care transfers, terms and conditions apply')
        + R('💊', 'THE MIX-UP', 'the pharmacy made an error. It\'s yours now')
        + R('🎤', 'OPEN MIC NIGHT', 'the Day Room has a stage (a step stool). The symptoms perform. Tip accordingly')
        + R('🏆', 'GYM DUELS', 'your RIVAL keeps score across runs and calls you out by name')
        + R('🩻', 'THE MERGER', 'deep wards: the acquisition closed. Management fights with acquired attacks')
        + H('WHO ELSE IS IN THE BUILDING')
        + R('🧹', 'The Janitor', 'forty years. Secret shops, basement wisdom, a master key he\'s not supposed to have')
        + R('📢', 'The Intercom', 'Dr. Walrus watches, and comments. The intercom is not a fan of your streaks')
        + R('🚶', 'Day Room patients', 'The Veteran, The Optimist, The Oversharer, and friends — one boon each')
        + H('REVISION HISTORY')
        + N('This handbook is updated with every patch. If a feature exists, it\'s in here — that\'s the policy. Spot something missing? The Complaint Department is thataway.')
    };

    const tabs = [
      { id: 'basics', icon: '📖', name: 'BASICS' }, { id: 'building', icon: '🏥', name: 'THE BUILDING' },
      { id: 'symptoms', icon: '🩹', name: 'SYMPTOMS' }, { id: 'staff', icon: '☠', name: 'STAFF' },
      { id: 'loot', icon: '💊', name: 'TREATMENT' }, { id: 'meta', icon: '🧠', name: 'YOUR CARE' },
      { id: 'events', icon: '🗂', name: 'WARD LIFE' }
    ];
    this.overlay(`
      <div class="panel wide hb">
        <h1 class="logo" style="font-size:24px">THE PATIENT HANDBOOK</h1>
        <div class="tagline">Form EGS-1 (rev. ${this.HB_REV}) · everything about this place, in writing · issued free of charge (billed later)</div>
        <div class="hbtabs">${tabs.map(t => `<button class="btn minor codextab${this._hbTab === t.id ? ' active' : ''}" data-hb="${t.id}">${t.icon} ${t.name}</button>`).join('')}</div>
        <div class="hbbody" id="hbBody"></div>
        <div class="hbfoot">KEEP THIS DOCUMENT WITH YOUR CHART · THE CHART IS EVERYWHERE · YOU ARE THE CHART</div>
        <button class="btn minor" id="bHbBack">BACK</button>
      </div>`);
    const paint = () => { document.getElementById('hbBody').innerHTML = TABS[this._hbTab](); };
    paint();
    document.querySelectorAll('[data-hb]').forEach(b => b.onclick = () => {
      SFX.play('paper');
      this._hbTab = b.dataset.hb;
      document.querySelectorAll('[data-hb]').forEach(x => x.classList.toggle('active', x.dataset.hb === this._hbTab));
      paint();
      document.getElementById('hbBody').scrollTop = 0;
      const pn = document.querySelector('#overlay .panel'); if (pn) pn.scrollTop = 0;
    });
    document.getElementById('bHbBack').onclick = () => { SFX.play('ui'); (returnTo || (() => this.showTitle()))(); };
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
        ${Meta.data.exitDone ? `<button class="btn minor" id="bVolT">🎗 VOLUNTEER BADGE: OFF — your file is closed. theirs aren't.</button>` : ''}
        ${!daily ? `<button class="btn minor" id="bCustomPlan">📋 DESIGN A CUSTOM CARE PLAN — stack your own rules, share the code</button>` : ''}
        <div class="tagline" style="opacity:.6">seeded runs (daily / quarterly / challenge) are assigned SILVER. you don't get to pick. that's the joke.</div>
      </div>`);
    const bcp = document.getElementById('bCustomPlan');
    if (bcp) bcp.onclick = () => { SFX.play('paper'); this.showPlanBuilder(diagId, daily, variant); };
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
    this._enrollVol = false;
    const bvt = document.getElementById('bVolT');
    if (bvt) bvt.onclick = () => {
      SFX.play('ui');
      this._enrollVol = !this._enrollVol;
      bvt.textContent = this._enrollVol ? '🎗 VOLUNTEER BADGE: ON — companions +50%, the ward +25%, ◆×2' : '🎗 VOLUNTEER BADGE: OFF — your file is closed. theirs aren\'t.';
    };
    document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
      SFX.play('item');
      this._startPlan = b.dataset.plan;
      this._startIntensity = this._enrollHeat || 0;
      this._startVolunteer = !!this._enrollVol;
      this.beginRun(diagId, daily, variant);
    });
  },

  /* ---------- CUSTOM CARE PLANS (design your own complications; share the code) ---------- */
  showPlanBuilder(diagId, daily, variant) {
    this.state = 'planbuilder';
    const B = this._builderMem || (this._builderMem = { name: '', heat: 0, rules: [], plan: 'silver' });
    const heatOk = !!Meta.data.cured;
    if (!heatOk) B.heat = 0;
    const ruleBtns = DATA.HOUSE_RULES.map(r => {
      const on = B.rules.includes(r.id);
      return `<button class="btn minor" data-rule="${r.id}" style="font-size:11px;padding:6px 9px;text-align:left;${on ? 'outline:2px solid #e8c84c' : 'opacity:.8'}">${on ? '✅' : '⬜'} ${r.icon} ${r.name} — <i>${r.desc}</i></button>`;
    }).join('');
    const planChips = DATA.PLANS.map(pl => `<button class="btn minor" data-bplan="${pl.id}" style="${B.plan === pl.id ? 'outline:2px solid ' + pl.clr : ''}">${pl.icon} ${pl.name}</button>`).join('');
    const known = Object.keys(Meta.data.carePlans || {});
    const bestLine = known.length ? `<div class="smallprint">filed protocols: ${known.slice(-4).map(n => { const cp = Meta.data.carePlans[n]; return '“' + n + '” (best: ward ' + (cp.best || 0) + ')'; }).join(' · ')}</div>` : '';
    this.overlay(`
      <div class="panel wide">
        <h1 class="logo" style="font-size:26px">📋 CUSTOM CARE PLAN</h1>
        <div class="tagline">stack the house rules yourself. name it. export it. dare somebody to run it.</div>
        <div class="setrow"><label>PROTOCOL NAME:</label>
          <input type="text" id="cpName" class="seedfield" maxlength="24" placeholder="the tuesday special" value="${(B.name || '').replace(/"/g, '&quot;')}" autocomplete="off"></div>
        ${heatOk ? `<div class="setrow" style="justify-content:center;gap:10px">
          <button class="btn minor" id="bCpHdn" style="min-width:40px">−</button>
          <span id="cpHeatLbl" style="font-weight:bold;color:#e08a5a;min-width:190px;text-align:center">🔥 INTENSITY ${B.heat}</span>
          <button class="btn minor" id="bCpHup" style="min-width:40px">+</button>
        </div>` : '<div class="tagline" style="opacity:.6">🔥 intensity unlocks once you\'ve reached THE CURE</div>'}
        <div class="btnrow" style="flex-wrap:wrap;gap:5px">${ruleBtns}</div>
        <div class="btnrow" style="flex-wrap:wrap;margin-top:6px">${planChips}</div>
        <div class="tagline" style="opacity:.7">◆ Insight pays +8% per stacked rule — the building respects ambition</div>
        <button class="btn" id="bCpBegin">▶ BEGIN THIS PLAN</button>
        <div class="btnrow" style="flex-wrap:wrap">
          <button class="btn minor" id="bCpExport">📤 COPY PLAN CODE</button>
        </div>
        <div class="setrow"><label>📥 plan code:</label><input type="text" id="cpCode" class="seedfield" placeholder="EGSCARE..." autocomplete="off"><button class="btn minor" id="bCpLoad">LOAD</button></div>
        ${bestLine}
        <button class="btn minor" id="bCpBBack">BACK TO ENROLLMENT</button>
      </div>`);
    const nameEl = document.getElementById('cpName');
    nameEl.oninput = () => { B.name = nameEl.value; };
    const hup = document.getElementById('bCpHup');
    if (hup) {
      const updH = () => { document.getElementById('cpHeatLbl').textContent = '🔥 INTENSITY ' + B.heat; };
      hup.onclick = () => { SFX.play('ui'); B.heat = Math.min(10, B.heat + 1); updH(); };
      document.getElementById('bCpHdn').onclick = () => { SFX.play('ui'); B.heat = Math.max(0, B.heat - 1); updH(); };
    }
    document.querySelectorAll('[data-rule]').forEach(b => b.onclick = () => {
      SFX.play('ui');
      const id = b.dataset.rule;
      B.rules = B.rules.includes(id) ? B.rules.filter(x => x !== id) : B.rules.concat(id);
      this.showPlanBuilder(diagId, daily, variant);
    });
    document.querySelectorAll('[data-bplan]').forEach(b => b.onclick = () => { SFX.play('ui'); B.plan = b.dataset.bplan; this.showPlanBuilder(diagId, daily, variant); });
    document.getElementById('bCpBegin').onclick = () => {
      SFX.play('stamp');
      this._startPlan = B.plan;
      this._startIntensity = heatOk ? (B.heat || 0) : 0;
      this._startVolunteer = false;
      this._startCustom = { name: (B.name || '').trim() || 'UNTITLED PROTOCOL', rules: B.rules.slice() };
      this.beginRun(diagId, daily, variant);
    };
    document.getElementById('bCpExport').onclick = () => {
      const code = 'EGSCARE' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: (B.name || '').trim() || 'UNTITLED PROTOCOL', h: B.heat || 0, r: B.rules, p: B.plan })))).replace(/=+$/, '');
      const el = document.getElementById('cpCode');
      el.value = code; el.select();
      try { navigator.clipboard && navigator.clipboard.writeText(code); } catch (e) { }
      SFX.play('paper');
      this.toast('📤 Plan code staged (and copied, where allowed). Inflict it on someone.', '#8fd08a');
    };
    document.getElementById('bCpLoad').onclick = () => {
      try {
        const s = String(document.getElementById('cpCode').value || '').trim();
        if (!s.startsWith('EGSCARE')) throw 0;
        const o = JSON.parse(decodeURIComponent(escape(atob(s.slice(7)))));
        B.name = String(o.n || '').slice(0, 24);
        B.heat = U.clamp(parseInt(o.h, 10) || 0, 0, 10);
        B.rules = (Array.isArray(o.r) ? o.r : []).filter(id => DATA.HOUSE_RULES.some(hr => hr.id === id));
        B.plan = DATA.PLANS.some(pl => pl.id === o.p) ? o.p : 'silver';
        SFX.play('fanfare');
        this.toast('📥 “' + (B.name || 'UNTITLED PROTOCOL') + '” loaded. Somebody built this on purpose.', '#8fd08a');
        this.showPlanBuilder(diagId, daily, variant);
      } catch (e) { SFX.play('denied'); this.toast('That is not a care plan. It may be a cry for help.', '#e08a8a'); }
    };
    document.getElementById('bCpBBack').onclick = () => { SFX.play('ui'); this.showEnrollment(diagId, daily, variant); };
  },

  beginRun(diagId, daily, variant) {
    this.sandbox = !!this._sandboxStart; this._sandboxStart = false;   // GAME TESTER: an off-the-record shift
    this.designTest = false;
    this._diary = [];   // the Patient Diary starts a fresh page
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
    if (!this._resuming && !this.sandbox) {   // a resumed run isn't a new run; a sandbox run isn't a run at all
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
    // PLAYDATE: a second animal clocks in if both are fully evolved
    if (this.player.pet && Meta.data.pet2 && Meta.data.pet2 !== Meta.data.pet) {
      const pd2 = DATA.PETS.find(x => x.id === Meta.data.pet2);
      const xp2 = (Meta.data.petXp || {});
      if (pd2 && pd2.unlock(Meta.data) && (xp2[Meta.data.pet] || 0) >= 40 && (xp2[Meta.data.pet2] || 0) >= 40) {
        this.player.pet2 = new Pet(pd2.id);
        this.toast('🐾 PLAYDATE — both animals are on shift. The kidney dish is crowded.', '#e8c05a');
      }
    }
    // a care package arrived (someone out there is thinking of you)
    if (Meta.data.pendingGift && !daily) {
      const g = Meta.data.pendingGift;
      if (DATA.ITEMS[g.i]) {
        this.player.addItem(g.i, this);
        this.toast('📦 CARE PACKAGE: ' + DATA.ITEMS[g.i].name + (g.n ? ' — “' + g.n + '”' : '') + ' (inspected. for safety.)', '#8fd08a');
        SFX.play('fanfare');
        Meta.data.giftsGot = (Meta.data.giftsGot || 0) + 1;
        this.diaryNote('A care package came: ' + DATA.ITEMS[g.i].name + '. Someone out there believes in me. It was inspected, of course.');
      }
      Meta.data.pendingGift = null;
      Meta.save();
      this.checkUnlocks();
    }
    // the daily itself is a bingo square (play it and it counts)
    if (daily && daily.isDaily) this.bingoEvent('daily');
    // insurance plan (dailies & seeded runs are assigned SILVER — no marketplace for you)
    this.plan = (!daily && this._startPlan) ? this._startPlan : 'silver';
    this._startPlan = null;
    // CUSTOM CARE PLAN: your rules, your problem — stacks any house rules you designed
    this.customPlan = (!daily && this._startCustom) ? this._startCustom : null;
    this._startCustom = null;
    // DAILY HOUSE RULES: posted at the door, enforced by the building
    this.houseRules = (daily && daily.isDaily && daily.seed != null) ? this.dailyRules(daily.seed)
      : (this.customPlan ? (this.customPlan.rules || []).slice() : []);
    if (this.customPlan) {
      this.toast('📋 CUSTOM CARE PLAN — “' + this.customPlan.name + '”', '#8fd0e0');
      this.diaryNote('Ran my own care plan: “' + this.customPlan.name + '.” The building approved it, which worried me.');
    }
    if (this.houseRules.length) {
      const named = this.houseRules.map(id => { const r = DATA.HOUSE_RULES.find(x => x.id === id); return r ? r.icon + ' ' + r.name : id; }).join(' · ');
      this.toast('📜 HOUSE RULES: ' + named, '#c8a24a');
      if (this.hasRule('luckyDay')) this.player.luck += 1;
    }
    // Treatment Intensity (heat) — post-cure difficulty dial, dailies stay standard
    this.intensity = (!daily && this._startIntensity) ? this._startIntensity : 0;
    this._startIntensity = 0;
    if (this.intensity >= 4) { this.player.maxhp = Math.max(2, this.player.maxhp - 2); this.player.hp = Math.min(this.player.hp, this.player.maxhp); }
    if (this.intensity > 0) { this.toast('🔥 TREATMENT INTENSITY ' + this.intensity + ' — Insight ×' + (1 + this.intensity * 0.15).toFixed(2), '#e08a5a'); this.diaryNote('Asked for intensity ' + this.intensity + '. On purpose. In writing.'); }
    // THE VOLUNTEER BADGE: you came back for them
    this.volunteer = !daily && !!this._startVolunteer && !!Meta.data.exitDone;
    this._startVolunteer = false;
    if (this.volunteer) {
      for (const a of this.player.allies) a.dmgMul = (a.dmgMul || 1) * 1.5;
      this.toast('🎗 VOLUNTEER. Not a patient — a regular. The companions can feel it.', '#e8c05a');
      this.diaryNote('Wore the volunteer badge in. Not my circus anymore. Still my monkeys.');
    }
    // THE WARD CALENDAR: the building runs on a real week (regular runs only — dailies stay fair)
    this.calDay = (!daily && !this.practice && !this.sandbox) ? new Date().getDay() : null;
    if (this.calDay != null) {
      const CAL = DATA.CALENDAR[this.calDay];
      if (this.hasCal('monday')) this.player.dmg += 0.3;
      if (this.hasCal('wednesday')) this.player.bombs += 2;
      if (this.hasCal('saturday')) this.player.luck += 1;
      this.toast('📅 ' + CAL.icon + ' ' + CAL.name + ' — ' + CAL.desc, '#c8b878');
      if (!this.sandbox) {
        const cd = Meta.data.calDays || (Meta.data.calDays = {});
        if (!cd[this.calDay]) { cd[this.calDay] = 1; Meta.save(); this.checkUnlocks(); }
      }
    }
    if (this.plan === 'bronze') { this.player.coins += 15; }
    if (this.plan === 'gold') { this.player.maxhp = Math.max(2, this.player.maxhp - 2); this.player.hp = Math.min(this.player.hp, this.player.maxhp); }
    if (this.plan !== 'silver') { const PL = DATA.PLANS.find(x => x.id === this.plan); this.toast(PL.icon + ' Enrolled: ' + PL.name + ' — ' + PL.tag, PL.clr); }
    if (this.protocol === 'waitingroom') { this.player.maxhp = 2; this.player.hp = Math.min(this.player.hp, 2); }   // talents can't buy hearts here either
    this._appealUsed = false; this._appealOffered = false;   // one appeal per run
    this.pillAssign = this.genSeed(['pills'], () => U.shuffle(DATA.PILLS.map((_, i) => i)).slice(0, 10));
    this.pillKnown = new Set();
    // THE GIFT SHOP: the cart delivers at check-in (regular runs only)
    if (!daily && !this.sandbox && Meta.data.giftCart && Object.keys(Meta.data.giftCart).length) {
      const cart = Meta.data.giftCart, names = [];
      const CARD_MSGS = ['“Get well soon. Or at least billable.” — Mom', '“We miss you at work. Your tasks don\'t.” — the team', '“You got this. Whatever they said it is.” — Gran', '“Feel better! I need my casserole dish back.” — Deb'];
      for (const gid of Object.keys(cart)) {
        const gd = DATA.GIFTS.find(g => g.id === gid);
        if (!gd) continue;
        names.push(gd.icon + ' ' + gd.name);
        if (gid === 'flowers') { this.player.maxhp += 2; this.player.heal(2); }
        if (gid === 'balloon') { this.player.luck += 1; this.player._balloon = true; this.player._balloonHits = 0; }
        if (gid === 'card') { this.player.dmg += 0.4; this.toast('💌 ' + U.choice(CARD_MSGS), '#e8a0c8'); }
        if (gid === 'plush') this.player.familiars.push(new Familiar('plush'));
        if (gid === 'visitor') {
          const pool = DATA.ALLIES.filter(a => !a.locked || (a.id === 'intern' && Meta.data.internGrad));
          try { this.player.recruitAlly(this, U.choice(pool).id); } catch (e) { }
        }
        if (gid === 'chocolate') { this.player.coins += 2; if (this.player.pill == null) this.player.pill = U.randi(0, 9); this.pillKnown.add(this.player.pill); }
      }
      Meta.data.giftCart = {};
      Meta.save();
      if (names.length) {
        this.toast('🎀 Delivered at check-in: ' + names.join(' · '), '#e8a0c8');
        SFX.play('fanfare');
        this.bingoEvent('gift');
        this.diaryNote('Checked in carrying gifts: ' + names.join(', ') + '. Staff inspected the chocolate. Twice.');
      }
    }
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
    this.intern = null; this._internOffered = false; this._union = null;
    this.race = null; this._races = 0; this._raceLostThisRun = false; this._icNight = false;   // THE RIVAL + night shift, fresh per run
    this.actuaryBet = null; this._actuaryDone = false; this.nightShift = false; this.stairs = null;   // the Actuary's book opens fresh
    this.walkin = false; this._roofDone = false; this._phoneFloor = false;   // walk-in / roof / payphone, fresh per run
    this.inspection = null; this._inspectionDone = false; this._mixup = null; this._mixupDone = false;   // the tour + the chart mix-up
    this.annexFloor = false; this._alarmSeen = false; this._alarmPulled = false; this._soaked = false; this._ghostRec = {}; this._ghostT = 0;   // annex / alarm / ghost, fresh per run
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
    SFX.setMusic((Meta.data.hubTrack && (Meta.data.tracksHeard || {})[Meta.data.hubTrack]) ? Meta.data.hubTrack : 'dayroom');   // WWRD picks the room's music
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout', 'seasonal'];
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const nineDone = order.slice(0, 9).filter(d => (Meta.data.diagsPlayed || {})[d]).length >= 9;
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const seasonalOpen = Object.keys(Meta.data.calDays || {}).length >= 4;
    const unlocked = order.filter(id => !(id === 'fine' && !fineOpen) && !(id === 'undiag' && !nineDone) && !(id === 'burnout' && !burnoutOpen) && !(id === 'seasonal' && !seasonalOpen));
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
        { x: 480, y: 565, r: 44, door: false, label: '📋 COMPLAINTS', hint: Meta.data.pendingComplaint ? 'one pending' : 'file a grievance', act: () => this.showComplaints(() => this.showHub()) },
        { x: 660, y: 330, r: 46, door: false, label: '📔 PATIENT DIARY', hint: (Meta.data.diary || []).length ? (Meta.data.diary.length + ' entries · it kept writing') : 'it writes itself. about you.', act: () => this.showJournal(() => this.showHub()) },
        { x: 170, y: 218, r: 46, door: false, label: '🎁 GIFT SHOP', hint: 'fund: ' + (Meta.data.fund || 0) + '¢ · gifts deliver at check-in', act: () => this.showGiftShop(() => this.showHub()) },
        { x: 745, y: 552, r: 42, door: false, label: '🕹 BREAKROOM', hint: (Meta.data.arcade && Meta.data.arcade.best ? 'PILL CATCHER · best ' + Meta.data.arcade.best : 'PILL CATCHER · 2¢ a play'), act: () => this.showArcade() },
        { x: 596, y: 208, r: 34, door: false, label: '📻 WWRD', hint: Object.keys(Meta.data.tracksHeard || {}).length + '/9 tracks · ward radio', act: () => this.showRadio(() => this.showHub()) },
        { x: 480, y: 628, r: 40, door: this.exitReady(), label: this.exitReady() ? '🚪 THE FRONT DOOR' : '🔒 FRONT DOOR', hint: this.exitReady() ? 'it\'s open. it\'s actually open.' : 'locked since intake', act: () => this.tryExit() }
      ]
    };
    // THE REUNION: once your file is closed, the people from your journey drop by
    if (Meta.data.exitDone) {
      const vis = [];
      const LINES = {
        gatekeeper: ["The rope's retired. I hold the door now.", "You still don't look sick. You look... through. Good for you."],
        larperking: ["I read a THIRD article. It said to rest.", "The grip I taught you — still got it?"],
        adjuster: ["I adjusted my own claim. Denied myself. It felt fair.", "Your paperwork? Shredded it personally. You're welcome."],
        influencer: ["I post about recovery now. Engagement's down 90%. Worth it.", "No code today. Just... hi."],
        generic: ["They let us sit out here now.", "Tuesday, right? We're all here Tuesdays.", "The chairs are better on this side."]
      };
      Object.keys(Meta.data.sparedBosses || {}).slice(0, 3).forEach((id, i) => {
        vis.push({ kind: 'boss', id, x: 640 + i * 76, y: 448, sayT: 0, lines: LINES[id] || LINES.generic });
      });
      if (Meta.data.internGrad) {
        const wknd = [0, 6].includes(new Date().getDay());
        vis.push({ kind: 'grad', x: 604, y: 128, sayT: 0, lines: wknd ? ["Weekends I run the desk. By CHOICE.", "The doctor sleeps in. I don't tell anyone."] : ["Reception's easy. Nobody bites. Mostly.", "I tell the new ones about you.", "Three floors. I still count them."] });
      }
      if (vis.length) this.hub.visitors = vis;
    }
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

  /* ---------- THE EXIT INTERVIEW (the front door, finally) ---------- */
  exitReady() {
    const m = Meta.data;
    return !!(m.cured && (m.founderKills || 0) > 0 && (m.systemKills || 0) > 0 && (m.boardKills || 0) > 0 && (m.amaDone || 0) > 0);
  },
  tryExit() {
    if (!this.exitReady()) {
      const m = Meta.data;
      const need = [
        !m.cured && 'THE CURE (Ward 25)',
        !(m.founderKills > 0) && 'THE FOUNDER (Ward 50)',
        !(m.systemKills > 0) && 'THE SYSTEM (Ward 100)',
        !(m.boardKills > 0) && 'THE BOARD (the Ascent)',
        !(m.amaDone > 0) && 'leave AMA once'
      ].filter(Boolean);
      this.toast('🔒 Still on file: ' + need.join(' · '), '#e08a8a');
      SFX.play('lock');
      this.showHub();   // rebuild (the go() wrapper stripped 'inrun')
      return;
    }
    this.state = 'exit';
    this.exitT = 0;
    this.hideOverlay();
    SFX.setMusic('cutscene');
    SFX.play('keyturn');
  },
  exitUpdate(dt) {
    this.exitT = (this.exitT || 0) + dt;
    if (this.exitT > 14 || ((Input.take('confirm') || Input.take('pause')) && this.exitT > 3)) {
      if (!Meta.data.exitDone) {
        Meta.data.exitDone = 1;
        Meta.save();
        this.checkUnlocks();
      }
      this.showCredits();
    }
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
    // reunion visitors: walk close and they'll say something they've been saving
    if (H.visitors) for (const v of H.visitors) {
      v.sayT = Math.max(0, (v.sayT || 0) - dt);
      v.cd = Math.max(0, (v.cd || 0) - dt);
      if (v.cd <= 0 && v.sayT <= 0 && U.dist(p.x, p.y, v.x, v.y) < 64) {
        v._li = ((v._li || 0) + 1) % v.lines.length;
        v.say = v.lines[v._li];
        v.sayT = 3.4; v.cd = 5.5;
      }
    }
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
    if (this._alarmPulled) { rows.push(['Fire alarm, non-emergency', 1, 25000]); total += 25000; }
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
    if (this.dailyKind || this.overtime || this.sandbox || this.practice || this.walkin || this.annexFloor || !this.player || this.player.dead) return;
    const p = this.player;
    try {
      const S = {
        v: 1, diag: p.baseDiag === 'undiag' ? 'undiag' : p.diag, variant: p.variant ? 1 : 0, depth: this.depth,
        chronic: this.chronic ? 1 : 0, bossRush: this.bossRush ? 1 : 0, prognosis: this.prognosis || null, protocol: this.protocol || null, protoT: this.protoT, ascent: this.ascent ? 1 : 0, ascentBase: this.ascentBase || 0, apl: this._appealUsed ? 1 : 0, plan: this.plan || 'silver', custom: this.customPlan || null, contracts: (this.contracts || []).map(c => ({ id: c.id, prog: c.prog, done: c.done ? 1 : 0 })),
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
    this._startCustom = S.custom || null;   // a saved Custom Care Plan resumes with its rules intact
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
    if (this.sandbox) return;   // nothing counts on an imaginary shift
    this.bingoEvent(ev, amt);   // the daily card hears everything (it guards itself)
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
        this.bingoEvent('goal');
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
    this.bingoEvent('contract');
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
    // THE LOST & FOUND: one piece of the build slips into the vents (the Janitor will find it)
    if (out === 'dead' && p.items && p.items.length > 1) {
      const losable = p.items.filter(id => DATA.ITEMS[id] && (DATA.ITEMS[id].pools || []).length);   // starters stay lost forever
      if (losable.length) { Meta.data.lostItem = U.choice(losable); }
    }
    // THE INCIDENT SITE: where you fell gets roped off — next run, at that depth, it's still there
    if (out === 'dead' && !this.dailyKind && !this.overtime && !this.practice && !this.sandbox && this.depth >= 2 && !this.ascent) {
      const cause = p._lastSrc;
      const guardId = (cause && DATA.ENEMIES[cause] && cause !== 'auditor' && cause !== 'form' && cause !== 'rival') ? cause : DATA.pickEnemy ? 'orderly' : 'orderly';
      const losable2 = (p.items || []).filter(id => DATA.ITEMS[id] && (DATA.ITEMS[id].pools || []).length && id !== Meta.data.lostItem);
      Meta.data.incident = { depth: this.depth, diag: p.baseDiag === 'undiag' ? 'undiag' : p.diag, cause: guardId, item: losable2.length ? U.choice(losable2) : null };
    }
    const mode = this.overtime ? 'overtime' : this.walkin ? 'walkin' : this.customPlan ? 'custom' : this.protocol ? this.protocol : this.prognosis ? this.prognosis : this.chronic ? 'chronic' : this.bossRush ? 'bossrush' : this.dailyKind === 'daily' ? 'daily' : this.dailyKind === 'quarterly' ? 'quarterly' : this.dailyKind === 'challenge' ? 'challenge' : 'normal';
    if (this.prognosis) { const pb = Meta.data.prognosisBest || (Meta.data.prognosisBest = {}); pb[this.prognosis] = Math.max(pb[this.prognosis] || 0, this.depth); }
    const cured = !!this._runCured || out === 'cured';
    const walrus = (Meta.data.walrusKills || 0) > (this._startWalrusKills || 0);
    const cause = out === 'dead' ? (p._lastSrc || 'unknown') : out;
    // THE RIVAL logs the duel you lost (they will bring it up)
    if (out === 'dead' && cause === 'rival' && Meta.data.rival) { Meta.data.rival.duelL = (Meta.data.rival.duelL || 0) + 1; }
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
    if (out === 'walkin') gained = Math.round(gained * 1.2) + 3;   // express visits pay a punctuality bonus
    if (this.intensity > 0) {
      gained = Math.round(gained * (1 + this.intensity * 0.15));   // heat pays
      if (this.depth >= 5) { const ib = Meta.data.intensityBest || (Meta.data.intensityBest = {}); const k = p.baseDiag === 'undiag' ? 'undiag' : p.diag; ib[k] = Math.max(ib[k] || 0, this.intensity); }
    }
    if (this.volunteer) gained *= 2;   // volunteering pays. in Insight. only in Insight.
    // CUSTOM CARE PLAN: ambition compounds — +8% Insight per stacked rule, and the protocol gets a record
    if (this.customPlan) {
      const nrules = (this.customPlan.rules || []).length;
      if (nrules) gained = Math.round(gained * (1 + 0.08 * nrules));
      const cps = Meta.data.carePlans || (Meta.data.carePlans = {});
      const cp = cps[this.customPlan.name] || (cps[this.customPlan.name] = { best: 0, runs: 0 });
      cp.runs++;
      cp.best = Math.max(cp.best || 0, this.depth);
      if (this.depth >= 5) Meta.data.carePlanDeep = 1;
    }
    Meta.data.insight = (Meta.data.insight || 0) + gained;
    this._insightGained = gained;
    this.composeDiary(out);   // the Patient Diary binds this run into the journal
    Meta.save();
    this.checkUnlocks();
  },

  newFloor() {
    if (this.maybeInterlude()) return;   // story beat first; it re-calls newFloor when done
    const gen = this.genSeed(['floor', this.depth], () => generateFloor(this.depth, this.lastBoss));
    this.grid = gen.grid;
    this.floorRooms = gen.rooms;
    this.bossId = gen.bossId;
    if (this.ascent && this.depth - this.ascentBase >= 5) this.bossId = 'theboard';   // A5: the top of the elevator
    // GOLD plan: one extra pharmacy room per floor, lock already open — executive access
    // house rules: Overstock — an extra unlocked pharmacy on ward 1
    if (this.hasRule('stocked') && this.depth === 1) this.genSeed(['stockedroom'], () => {
      const normals = this.floorRooms.filter(r => r.type === 'normal');
      if (normals.length > 1) { const r = U.choice(normals); r.type = 'item'; r.lockOpen = true; if (r.layout) for (let rr = 2; rr <= 4; rr++) for (let cc = 5; cc <= 7; cc++) r.layout[rr][cc] = 0; }
    });
    if (this.plan === 'gold') this.genSeed(['goldroom', this.depth], () => {
      const normals = this.floorRooms.filter(r => r.type === 'normal');
      if (normals.length > 1) {
        const r = U.choice(normals); r.type = 'item'; r.lockOpen = true;
        if (r.layout) for (let rr = 2; rr <= 4; rr++) for (let cc = 5; cc <= 7; cc++) r.layout[rr][cc] = 0;   // clear floor for the pedestal
      }
    });
    this._janitorFloor = false;   // the Janitor makes one appearance per floor, tops
    this._docFloor = false;       // misfiled documents surface at most once a floor
    this._phoneFloor = false;     // one payphone per floor, and it's sticky
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
    // THE ANNEX: the condemned wing — no services, sheeted rooms, one deep exit where the boss would be
    if (this.annexFloor) {
      for (const r of this.floorRooms) {
        if (['shop', 'dayroom', 'event', 'clinic', 'gym', 'records', 'incident', 'seclusion', 'ect', 'padded', 'observation'].includes(r.type)) r.type = 'normal';
        if (r.type === 'boss') r.type = 'annexhatch';
      }
    }
    // the sprinklers dry off between floors
    if (this._soaked) { this._soaked = false; this.player.luck += 1; this.toast('You dry off. The luck wrings back in.', '#8fb8d8'); }
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
      this.diaryNote('Ward 13 exists. I have been. The candles know my name now.');
      SFX.play('sting');
      SFX.setMusic('ward13');
    } else if (SFX.musicMode === 'ward13' && !this.overtime) SFX.setMusic('run');   // ward 14 lets the building breathe again
    // SHADOW WARD: some floors flip dark — mirrored halls, shadow patients, double loot
    this.shadowWard = (this.depth >= 6 && !this.ascent && !this.bossRush)
      ? this.genSeed(['shadow', this.depth], () => U.chance(0.18))
      : false;
    if (this._forceShadow && !this.ward13) this.shadowWard = true;   // the elevator said so
    if (this.hasRule('shadowAll') && this.depth >= 6 && !this.ward13) this.shadowWard = true;   // house rules: rolling blackouts
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
    // THE NIGHT SHIFT: the building keeps hours (local clock, unseeded runs only)
    const hrN = new Date().getHours();
    const nightNow = (this.seed == null && !this.overtime && !this.bossRush && (hrN >= 21 || hrN < 6));
    if (nightNow && !this.nightShift) {
      this.setBanner('🌙 THE NIGHT SHIFT', 'skeleton crew · extra crowding · differential pay', 2.8);
      SFX.play('sting');
      if (!this._icNight) { this._icNight = true; setTimeout(() => { if (this.state === 'run') this.pa('night'); }, 1800); }
    }
    this.nightShift = nightNow;
    if (this.nightShift) this.floorDark = Math.max(this.floorDark, 0.26);
    // THE INCIDENT SITE: your last death, roped off at this very depth
    if (Meta.data.incident && Meta.data.incident.depth === this.depth && this.seed == null && !this.practice && !this.sandbox && !this.overtime && !this.bossRush && !this.ascent) {
      const normalsI = this.floorRooms.filter(r => r.type === 'normal');
      if (normalsI.length > 2) {
        U.choice(normalsI).type = 'incident';
        setTimeout(() => { if (this.state === 'run') this.toast('🚧 Somewhere on this ward, a room is roped off. It has your outline in it.', '#e0a05a'); }, 1200);
      }
    }
    // THE INSPECTION: once per run, the building performs wellness for a visitor (depth 5+)
    if (!this._inspectionDone && this.depth >= 5 && !this.overtime && !this.bossRush && !this.walkin && !this.practice && this.genSeed(['inspection', this.depth], () => U.chance(0.14))) {
      this._inspectionDone = true;
      this.inspection = { pending: true };
      setTimeout(() => { if (this.state === 'run' && this.inspection && this.inspection.pending) { this.toast('🕴 An INSPECTOR is touring this ward. The building is… rehearsing.', '#a8d0a0'); this.pa('inspection'); } }, 1400);
    }
    // THE MIX-UP: somewhere, two charts swap (depth 3+, core diagnoses only)
    const p0 = this.player;
    if (!this._mixupDone && this.depth >= 3 && !this.overtime && !this.bossRush && !this.walkin && !this.practice && !p0.variant && p0.baseDiag !== 'undiag'
      && ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia'].includes(p0.baseDiag)
      && this.genSeed(['mixup', this.depth], () => U.chance(0.1))) {
      this._mixupDone = true;
      const pool0 = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia'].filter(d => d !== p0.diag);
      const nd = this.genSeed(['mixupto', this.depth], () => U.choice(pool0));
      this._mixup = { orig: p0.baseDiag, depth: this.depth };
      p0.rediagnose(nd);
      this.setBanner('📋 THE MIX-UP', 'your chart got swapped with bay 6. you are now, clinically, someone else.', 3.2);
      this.toast('🦭 “Small clerical thing! For one ward you are ' + DATA.DIAG[nd].name + '. Enjoy? Enjoy.”', '#e0a05a');
      this.diaryNote('A chart mix-up made me ' + DATA.DIAG[nd].name + ' for a whole ward. Honestly? Their symptoms have better ergonomics.');
      SFX.play('stamp');
    } else if (this._mixup && this.depth > this._mixup.depth) {   // the apology
      const orig = this._mixup.orig;
      this._mixup = null;
      p0.rediagnose(orig);
      p0.coupons = (p0.coupons || 0) + 1;
      if (!this.sandbox) { Meta.data.mixups = (Meta.data.mixups || 0) + 1; Meta.save(); this.checkUnlocks(); }
      this.toast('📋 Charts un-swapped. “Our sincerest.” You get a coupon. Bay 6 gets an explanation.', '#8fd08a');
      this.diaryNote('Got my own chart back, plus an apology coupon. Bay 6, if you\'re reading this: your knees are a disaster.');
      SFX.play('bell');
    }
    // THE RECORDS ROOM: they keep the originals down here (depth 4+, don't be seen)
    if (this.depth >= 4 && !this.overtime && !this.bossRush && this.genSeed(['records', this.depth], () => U.chance(0.16))) {
      const normalsR = this.floorRooms.filter(r => r.type === 'normal');
      if (normalsR.length > 3) U.choice(normalsR).type = 'records';
    }
    // THE RIVAL books the gym (depth 3+, likelier if they robbed you at a pedestal)
    this.gymSet = false;
    if (this.seed == null && !this.practice && !this.sandbox && !this.overtime && !this.bossRush && this.depth >= 3 && U.chance(this._raceLostThisRun ? 0.5 : 0.2)) {
      const normalsG = this.floorRooms.filter(r => r.type === 'normal');
      if (normalsG.length > 3) { U.choice(normalsG).type = 'gym'; this.gymSet = true; }
    }
    // bingo depth squares
    if (this.depth === 5) this.bingoEvent('depth5');
    if (this.depth === 8) this.bingoEvent('depth8');
    // THE ACTUARY loses the bet: you outlived the projection
    if (this.actuaryBet && !this.actuaryBet.paid && this.depth > this.actuaryBet.ward) {
      this.actuaryBet.paid = true;
      const p2 = this.player;
      p2.coins += 15;
      Meta.data.insight = (Meta.data.insight || 0) + 3;
      if (!this.sandbox && !this.practice) { Meta.data.actuaryWins = (Meta.data.actuaryWins || 0) + 1; Meta.save(); this.checkUnlocks(); }
      this.setBanner('📉 OUTSIDE THE MODEL', 'the projection said Ward ' + this.actuaryBet.ward + '. the projection can cope.', 3.0);
      this.toast('📉 Wager paid: +15¢, +◆3. Somewhere, a spreadsheet weeps.', '#8fd08a');
      this.diaryNote('Outlived the actuarial projection. The model has filed a complaint about me.');
      SFX.play('fanfare');
      this.actuaryBet = null;
    }
    if (this.shadowWard) {   // the shadow swallows whatever wing this was
      this.wingPal = { floor: '#2e2440', line: '#241c34', wall: '#3c2c52', trim: '#161020' };
      this.floorDark = Math.max(this.floorDark, 0.35);
    }
    if (this.ward13) {   // candlelit rot — ward 13 has its own weather
      this.wingPal = { floor: '#332838', line: '#281f2c', wall: '#452e3e', trim: '#140e16' };
      this.floorDark = Math.max(this.floorDark, 0.4);
    }
    if (this.annexFloor) {   // the condemned wing: dust over everything
      this.wingPal = { floor: '#3e3a34', line: '#322e28', wall: '#524c42', trim: '#1c1914' };
      this.floorDark = Math.max(this.floorDark, 0.3);
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
    // SEASONAL AFFECTIVE: the season turns with every ward (Climate Controlled never turns)
    if (p.diag === 'seasonal' && this.depth > 1 && !p._seasonLock) {
      p.season = (p.season + 1) % 4;
      const SEAS = [['🌱 SPRING', 'things grow back'], ['☀️ SUMMER', 'the tears run hot'], ['🍂 FALL', 'everything you hit is leaving'], ['❄️ WINTER', 'the cold gets into everything']][p.season];
      this.toast(SEAS[0] + ' — ' + SEAS[1], '#7ab86a');
      SFX.play('whoosh');
    }
    p.pillsThisFloor = 0;
    if (p.diag === 'depression' && !p.variant) p.blanket = true;   // High-Functioning has no blanket, only the mask
    if (p.variant && p.diag === 'ptsd') p._scar = 0;               // Weathered: the scars fade between floors
    p._rosaryUsed = false;   // the rosary recovers its one grace each floor
    p._wiseUsed = false;     // Wise Mind resets with the ward
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

  // JOINT COMMISSION helper: whichever partner is still standing (or null)
  _jointSurvivor() {
    if (this.boss2 && !this.boss2.dead) return this.boss2;
    if (this.boss && !this.boss.dead && this.boss._joint) return this.boss;
    return null;
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
    this._roomShieldUsed = false;   // Second Wind resets at every door
    this._roomT0 = this.t;  // room-entry clock (the Intercom bills hourly)
    this._recap = [];       // fresh reel for the incident reconstruction
    this._unionTried = false; this._union = null;   // one organizing drive per room
    if (this.intern) { this.intern.x = U.clamp(this.player.x - 40, RX + 14, RX + RW - 14); this.intern.y = this.player.y; }
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
    this.boss2 = null;   // JOINT COMMISSION partner (deep-ward consolidations only)
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
    if (p.pet2) { p.pet2.x = p.x + 30; p.pet2.y = p.y + 14; p.pet2.segs = []; }   // both animals keep up
    if (this.p2) { this.p2.x = U.clamp(p.x + 38, RX + 16, RX + RW - 16); this.p2.y = p.y; }   // Patient Two files in behind you

    // INCIDENT SITE: the guard doesn't leave the scene (respawns if you step out and back in)
    if (room._incident && !room._resolvedInc && room.spawned && !this.enemies.some(e => e._incGuard)) {
      const inc = Meta.data.incident || {};
      const gid = DATA.ENEMIES[inc.cause] ? inc.cause : 'orderly';
      const guard = new Enemy(gid, CW / 2, RY + RH / 2 - 40, this.depth, false, 2.0, U.choice(DATA.ELITES).id);
      guard._asleep = true; guard._incGuard = true; guard.spawnT = 0;
      this.enemies.push(guard);
      room.cleared = true;
    }
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
      if (this.hasRule('frailBosses')) { this.boss.hp *= 0.85; this.boss.maxhp *= 0.85; }   // house rules: management is unwell
      // SECOND SHIFT: past ward 12, the early three sometimes work a double
      if (this.depth >= 12 && ['gatekeeper', 'larperking', 'adjuster'].includes(this.bossId) && !this.boss.affix) {
        if (this.genSeed(['shift2', this.depth], () => U.chance(0.5))) {
          this.boss._shift2 = true;
          this.boss.hp *= 1.3; this.boss.maxhp *= 1.3;
          this.toast('🌙 SECOND SHIFT. It has been here for sixteen hours. It is not happier.', '#c8a8d8');
          this.diaryNote('The ' + (DATA.BOSSES[this.bossId] || { name: this.bossId }).name + ' was working a double. It showed. It shared.');
        }
      }
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
      // JOINT COMMISSION: past Ward 15, some rooms hold two managers (consolidated care)
      this._wasJoint = false;
      const JOINT_POOL = ['gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'withdrawal', 'burnout', 'peerreview'];
      if (this.depth >= 15 && JOINT_POOL.includes(this.bossId) && !this.practice && !this.overtime && !this.bossRush && this.genSeed(['joint', this.depth], () => U.chance(0.35))) {
        const id2 = this.genSeed(['joint2', this.depth], () => U.choice(JOINT_POOL.filter(id => id !== this.bossId)));
        try {
          this.boss2 = new Boss(id2, this.depth, this);
          this.boss2._joint = true; this.boss._joint = true; this._wasJoint = true;
          this.boss.hp *= 0.82; this.boss.maxhp *= 0.82;
          this.boss2.hp *= 0.82; this.boss2.maxhp *= 0.82;
          this.boss.x = CW / 2 - 120; this.boss2.x = CW / 2 + 120;
          this.boss2.introT = 0;              // one intro card covers the merger
          this.boss2._wakeT = 3.6;            // reviewing its notes while the first one opens
          this.toast('🏥 JOINT COMMISSION — consolidated care: two managers, one room, one paycheck.', '#c8a24a');
          this.diaryNote('Two managers shared one room. They called it efficiency. I called it a Tuesday.');
        } catch (e) { this.boss2 = null; }
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
    if (room.type === 'gym' && !room.greeted) { room.greeted = true; this.toast('🥊 The gym. Someone chalked a name on the board. It\'s yours, misspelled.', '#d08a4a'); }
    // THE INSPECTION begins: the first live room on this ward becomes the tour stop
    if (this.inspection && this.inspection.pending && room.type === 'normal' && !room.cleared && this.enemies.length > 0) {
      this.inspection = { active: true, t: 60, busted: false };
      for (const e of this.enemies) { e._perform = true; e.spawnT = 0; }
      this.inspector = { x: RX + 60, y: RY + 60, t: 0 };
      this.setBanner('🕴 THE INSPECTION', 'hold your fire for 60 seconds. let them perform.', 3.4);
      this.toast('🕴 The Inspector enters. Every patient is suddenly, aggressively, DOING GREAT.', '#a8d0a0');
      SFX.play('bell');
    }
    if (room.type === 'records' && !room.greeted) {
      room.greeted = true;
      this.setBanner('🗄 THE RECORDS ROOM', 'they keep the originals here. don\'t be seen.', 3.0);
      this.toast('🗄 Three patrols. Two stacks. One file with your name on it — the FIRST one.', '#c8b878');
      SFX.play('sting');
    }
    if (room.type === 'incident' && !room.greeted) {
      room.greeted = true;
      const inc = Meta.data.incident || {};
      this.setBanner('🚧 THE INCIDENT SITE', 'this is where it happened. they kept your outline.', 3.0);
      this.toast('🚧 ' + ((DATA.DIAG[inc.diag] || {}).name || 'Someone') + ', ward ' + (inc.depth || '?') + '. The report says “resolved.” The rope says otherwise.', '#e0a05a');
      this.diaryNote('Found the room where I died last time. My outline was still there. It looked comfortable.');
      SFX.play('sting');
    }
    // THE RIVAL heard there's a pedestal in here
    if (room.type === 'item' && !room._raced && this.seed == null && !this.practice && !this.sandbox && !this.overtime && !this.bossRush && this.depth >= 2 && (this._races || 0) < 2 && !this.race) {
      const rped = this.peds.find(pd => pd.kind === 'item' && !pd.taken && !pd.price);
      if (rped && U.chance(0.4)) {
        room._raced = true;
        this._races = (this._races || 0) + 1;
        const R = this.ensureRival();
        const d0 = U.dist(p.x, p.y, rped.x, rped.y);
        const a0 = U.ang(p.x, p.y, rped.x, rped.y);
        const rx = U.clamp(rped.x + Math.cos(a0) * d0, RX + 30, RX + RW - 30);
        const ry = U.clamp(rped.y + Math.sin(a0) * d0, RY + 30, RY + RH - 30);
        this.race = { x: rx, y: ry, ped: rped, done: false, spd: Math.max(172, (p.spd || 200) * 0.96), t: 0 };
        this.setBanner('🏁 ' + R.name + ' WANTS IT', 'beat them to the pedestal', 2.2);
        SFX.play('sting');
      }
    }
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
        const copayMul = (1 + (this.depth - 1) * 0.07) * (this.protocol === 'deductible' ? 2 : 1) * (this.plan === 'bronze' ? 1.5 : this.plan === 'gold' ? 0.6 : 1) * ((this.intensity || 0) >= 2 ? 1.25 : 1) * (this.hasRule('pricier') ? 1.3 : 1);   // copays climb with the ward (it's the healthcare system, baby)
        const disc = (p.flags.discount ? 0.5 : (this.wardPath === 'outpatient' ? 0.75 : 1)) * (p.trinket === 'expiredcoupon' ? 0.7 : 1) * (p.trinket === 'laminatedcard' ? 0.85 : 1) * (p._facShopMul || 1);
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
        // THE COMPOUNDING PHARMACIST: a back room, sometimes, if you look like the type
        if (this.depth >= 4 && U.chance(0.25)) {
          const cpool = U.shuffle([].concat(DATA.POOLS.special, DATA.POOLS.shop)).filter(id => !p.items.includes(id));
          if (cpool.length >= 2) room.peds.push({ x: RX + RW - 90, y: RY + RH - 80, kind: 'compound', a: cpool[0], b: cpool[1], price: px(6), taken: false });
        }
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
        const nDay = this.hasRule('visitorDay') ? 5 : 3;   // house rules: visitor day — the room is crowded
        const npcs = U.shuffle(DATA.DAYROOM.map((_, i) => i)).slice(0, nDay);
        npcs.forEach((ni, k) => room.peds.push({ x: CW / 2 - 90 + (k % 3) * 150, y: RY + RH / 2 + (k > 2 ? 96 : (k % 2 ? 40 : -20)), kind: 'npc', npcId: ni, taken: false }));
        // THE ACTUARY: sometimes among the visitors, with a briefcase and your file
        if (!this._actuaryDone && !this.actuaryBet && this.depth >= 2 && U.chance(0.35)) {
          room.peds.push({ x: CW / 2 - 170, y: RY + RH / 2 + 96, kind: 'actuary', taken: false });
        }
        // OPEN MIC NIGHT: someone's on the step stool (30%, depth 3+)
        if (this.depth >= 3 && U.chance(0.3)) {
          const performer = U.choice(['larper', 'scroller', 'doubt', 'deadline', 'ad', 'gaslighter', 'waitingnum', 'generic']);
          room.peds.push({ x: RX + RW - 90, y: RY + RH - 90, kind: 'openmic', performer, taken: false });
        }
        // and one patient looking for a group to join (The Support Group)
        const allyPool = DATA.ALLIES.filter(a => !a.locked || (a.id === 'intern' && Meta.data.internGrad));
        room.peds.push({ x: RX + RW - 96, y: RY + RH / 2 - 30, kind: 'recruit', allyId: U.choice(allyPool).id, taken: false });
        // the commissary corner: one machine per Day Room
        room.peds.push({ x: RX + 90, y: RY + 96, kind: U.choice(['vending', 'claw', 'horoscope']), taken: false, uses: 3 });
        // one patient has a side job for you (Day Room contract)
        room.peds.push({ x: CW / 2 + 40, y: RY + RH / 2 + 96, kind: 'contract', contractId: U.choice(DATA.CONTRACTS).id, taken: false });
        // Ward 8+: the exit is right there. it says so on the sign.
        if (this.depth >= 8) room.peds.push({ x: RX + RW - 90, y: RY + 96, kind: 'ama', taken: false });
        break;
      }
      case 'gym': {   // THE GYM — your rival booked it. there is a sign-up sheet with one name.
        room.cleared = true;
        if (!room._dueled) { room._dueled = true; room.peds.push({ x: CW / 2, y: RY + RH / 2 - 20, kind: 'rivalduel', taken: false }); }
        room.pickups.push(new Pickup('half', RX + 90, RY + RH - 90));   // the water fountain works, at least
        break;
      }
      case 'records': {   // THE RECORDS ROOM — two long stacks, three patrols, one original file
        room.cleared = true;
        room.theme = 'records';
        // curated layout: two shelf columns, three aisles
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) room.layout[r][c] = 0;
        for (let r = 1; r <= 5; r++) { room.layout[r][4] = 1; room.layout[r][8] = 1; }
        room.paperHp = {};
        // three patrols walking the aisles
        const lanes = [2, 6, 10].map(c => RX + c * TILE + TILE / 2);
        room._heist = {
          guards: lanes.map((lx, i) => ({
            x: lx, y: RY + 90 + i * 140, spd: 62 + i * 6, ang: Math.PI / 2, wi: i % 2, alert: 0, pauseT: 0,
            wps: [{ x: lx, y: RY + 70 }, { x: lx, y: RY + RH - 70 }]
          })),
          alerted: false, alertedFight: false, stolen: false
        };
        // the original file, top-right corner, in the glow of one desk lamp
        room.peds.push({ x: RX + 11 * TILE + TILE / 2, y: RY + 64, kind: 'origfile', taken: false });
        break;
      }
      case 'annexhatch': {   // the deep exit: a service chute past the next ward
        room.cleared = true;
        room.peds.push({ x: CW / 2, y: RY + RH / 2, kind: 'annexhatch', taken: false });
        room.pickups.push(new Pickup('full', CW / 2 - 70, RY + RH / 2 + 60));
        room.pickups.push(new Pickup('nickel', CW / 2 + 70, RY + RH / 2 + 60));
        break;
      }
      case 'incident': {   // THE INCIDENT SITE — roped off, guarded, still yours
        room.cleared = true;   // quiet until the guard notices you
        const inc = Meta.data.incident || {};
        const gid = DATA.ENEMIES[inc.cause] ? inc.cause : 'orderly';
        const guard = new Enemy(gid, CW / 2, RY + RH / 2 - 40, this.depth, false, 2.0, U.choice(DATA.ELITES).id);
        guard._asleep = true; guard._incGuard = true; guard.spawnT = 0;
        this.enemies.push(guard);
        room._incident = true;
        if (inc.item && DATA.ITEMS[inc.item]) {
          room.peds.push({ x: CW / 2, y: RY + RH / 2 + 60, itemId: inc.item, kind: 'item', taken: false, _evidence: true });
        } else {
          for (let i = 0; i < 3; i++) room.pickups.push(new Pickup('coin', CW / 2 + U.rand(-40, 40), RY + RH / 2 + 60));
          room.pickups.push(new Pickup('half', CW / 2, RY + RH / 2 + 90));
        }
        break;
      }
      case 'clinic': {   // The Clinic — a miniboss is holding office hours
        room.cleared = false;
        const mb = new Enemy(this.nightShift ? 'nightnurse' : U.choice(['chargenurse', 'resident', 'orderly']), CW / 2, RY + 120, this.depth, false, 1);
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
    this.enterRoom(target, dir);   // travel direction: moving N puts you at the new room's SOUTH door (was passing .opp — you'd spawn on the far side)
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
    // THE ANNEX pays double too — nobody's swept the valuables in years
    if (this.annexFloor) for (let i = 0; i < 2; i++) this.pickups.push(new Pickup(U.choice(['coin', 'nickel', 'half', 'pill']), CW / 2 + U.rand(-60, 60), RY + RH / 2 + U.rand(-40, 40)));
    // THE FIRE ALARM: a red box on some wall, once a run (5%)
    if (!this._alarmSeen && !this.annexFloor && !this.overtime && (room.type === 'normal' || room.type === 'padded') && U.chance(0.05)) {
      this._alarmSeen = true;
      this.peds.push({ x: RX + RW - 70, y: RY + 80, kind: 'firealarm', taken: false });
      this.toast('🧯 A fire alarm on the wall. The sign says DO NOT PULL. The sign knows you.', '#e08a8a');
    }
    // THE WARD CALENDAR pays its respects
    if (this.hasCal('wednesday') && U.chance(0.2)) this.pickups.push(new Pickup('bomb', CW / 2 + U.rand(-60, 60), RY + RH / 2 + U.rand(-30, 30)));
    if (this.hasCal('thursday') && U.chance(0.35)) this.pickups.push(new Pickup(U.chance(0.2) ? 'nickel' : 'coin', CW / 2 + U.rand(-60, 60), RY + RH / 2 + U.rand(-30, 30)));
    // NIGHT SHIFT: differential pay (the coins apologize for the hour)
    if (this.nightShift && U.chance(0.6)) {
      this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-50, 50), RY + RH / 2 + U.rand(-30, 30)));
      if (U.chance(0.3)) this.texts.push(new FloatText(CW / 2, RY + RH / 2 - 24, 'night differential +1¢', '#8a90c8'));
    }
    // pet XP: 40 rooms together changes an animal
    if (p.pet2) { const xp2 = Meta.data.petXp || (Meta.data.petXp = {}); xp2[p.pet2.type] = (xp2[p.pet2.type] || 0) + 1; }
    if (p.pet) {
      const xp = Meta.data.petXp || (Meta.data.petXp = {});
      xp[p.pet.type] = (xp[p.pet.type] || 0) + 1;
      if (xp[p.pet.type] === 40) {
        p.pet.evo = true;
        const names = { pigeon: 'THE CARRIER PIGEON', cat: 'SENIOR OFFICE CAT', snake: 'THE EXTENDED METAPHOR', goldfish: 'TWO GOLDFISH (they remember each other)', dog: 'THE FULL GOLDEN' };
        this.toast('✨ Your companion evolved: ' + (names[p.pet.type] || p.pet.type) + '!', '#e8c84c');
        this.diaryNote('The ' + p.pet.type + ' evolved. It was already perfect. Now it is MORE.');
        SFX.play('evolve');
        Meta.save();
        this.checkUnlocks();
      }
    }
    // THE INTERN: someone new checks in on ward 2, terrified, looking for anyone who seems to know the way
    if (!this._internOffered && this.depth === 2 && room.type === 'normal' && !this.dailyKind && !this.overtime && U.chance(0.35)) {
      this._internOffered = true;
      this.peds.push({ x: CW / 2 + U.rand(-60, 60), y: RY + RH / 2 + U.rand(-20, 40), kind: 'intern', taken: false });
      this.toast('🪪 Someone small is hiding behind the pedestal. They have a NEW badge.', '#e8c05a');
      SFX.play('voice');
    }
    // THE INCIDENT SITE: cleared — the scene is released
    if (room._incident && !room._resolvedInc) {
      room._resolvedInc = true;
      Meta.data.incident = null;
      Meta.data.incidentsCleared = (Meta.data.incidentsCleared || 0) + 1;
      Meta.data.insight = (Meta.data.insight || 0) + 4;
      Meta.save();
      this.checkUnlocks();
      this.toast('🚧 Scene released. +◆4. The outline stays — it\'s load-bearing now.', '#8fd08a');
      this.diaryNote('Cleared my own incident site. Closure, with a copay.');
      SFX.play('bell');
    }
    // ROOM DESIGNER: the room is clear — leave a door back to the drafting table
    if (this.designTest && !room._dexit) {
      room._dexit = true;
      this.peds.push({ x: CW / 2, y: RY + RH / 2, kind: 'designexit', taken: false });
      this.toast('🏗 Room cleared. Step on the blueprint (or PAUSE) to return to the designer.', '#8fd0e0');
    }
    // MISFILED DOCUMENTS: the building's paperwork surfaces where the mess was
    if (!this.sandbox && !this.practice && !this.overtime && !this.annexFloor && !this._docFloor) {
      const undoc = (DATA.DOCUMENTS || []).filter(d => !(Meta.data.docs || {})[d.id]);
      if (undoc.length) {
        this._docPity = (this._docPity || 0) + 1;
        const guarantee = this.ward13 && !room._docTried;
        room._docTried = true;
        if (guarantee || U.chance(0.045 + this._docPity * 0.012)) {
          this._docFloor = true; this._docPity = 0;
          const dp = new Pickup('coin', CW / 2 + U.rand(-50, 50), RY + RH / 2 + U.rand(-30, 30));
          dp.type = 'document'; dp._docId = U.choice(undoc).id; dp.settle = 0.25;
          this.pickups.push(dp);
          this.toast('🗂 Something slid out from under the baseboard. It has a filing stamp.', '#c8b0e0');
          SFX.play('paper');
        }
      }
    }
    // THE ROOF: a service ladder, down from the ceiling (depth 6+, once per run)
    if (!this._roofDone && this.depth >= 6 && !this.overtime && !this.bossRush && !this.walkin && !this.annexFloor && (room.type === 'normal' || room.type === 'padded') && U.chance(0.1)) {
      this._roofDone = true;
      this.peds.push({ x: CW / 2 + U.rand(-70, 70), y: RY + 90, kind: 'roofladder', taken: false });
      this.toast('🪜 A service ladder unfolds from the ceiling. It goes UP. Nothing here goes up.', '#8fd0e0');
      SFX.play('door');
    }
    // THE PAYPHONE: it takes exact change and one feeling at a time (6%, once a floor)
    if (!this._phoneFloor && !this.annexFloor && (room.type === 'normal' || room.type === 'padded') && U.chance(0.06)) {
      this._phoneFloor = true;
      this.peds.push({ x: RX + 70, y: RY + 80, kind: 'payphone', taken: false });
      SFX.play('tick');
    }
    // THE JANITOR: he appears where the mess was (10%, once a floor — 25% if he's holding YOUR lost item)
    const holdingYours = Meta.data.lostItem && DATA.ITEMS[Meta.data.lostItem] && !p.items.includes(Meta.data.lostItem);
    if (!this._janitorFloor && !this.annexFloor && (room.type === 'normal' || room.type === 'padded') && U.chance(holdingYours ? 0.25 : 0.1)) {
      this._janitorFloor = true;
      const pool = U.shuffle([].concat(DATA.POOLS.special, DATA.POOLS.shop)).filter(id => !p.items.includes(id));
      const stock = holdingYours ? Meta.data.lostItem : (pool[0] || DATA.POOLS.special[0]);
      this.peds.push({ x: CW / 2 + U.rand(-80, 80), y: RY + RH / 2 + U.rand(-30, 30), kind: 'janitor', itemId: stock, price: U.randi(5, 9), taken: false, _greeted: false, _lost: holdingYours });
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
    if (U.chance(((this.intensity || 0) >= 8 ? 0.2 : this.quietFloor ? 0.25 : 0.4) + (p.flags.otRoutine ? 0.12 : 0))) {   // Intensity 8+/quiet: less tipping · Daily Routine: more
      const type = U.choice(['coin', 'coin', 'half', 'pill', 'coin', 'key', 'bomb']);
      this.pickups.push(new Pickup(type, CW / 2 + U.rand(-40, 40), RY + RH / 2 + U.rand(-30, 30)));
    }
    // Group Cohesion (capstone): the group patches you up between fights
    if (p.flags.allyCare && p.allies.length && p.hp < p.maxhp && U.chance(0.35)) {
      p.heal(1);
      this.texts.push(new FloatText(p.x, p.y - 24, '🤝 the group has you +♥', '#8fd08a'));
    }
    // house rules with room-clear clauses
    if (this.hasRule('doublePills')) this.pickups.push(new Pickup('pill', CW / 2 + U.rand(-50, 50), RY + RH / 2 + U.rand(-30, 30)));
    if (this.hasRule('richWards')) for (let i = 0; i < 2; i++) this.pickups.push(new Pickup(U.chance(0.25) ? 'nickel' : 'coin', CW / 2 + U.rand(-70, 70), RY + RH / 2 + U.rand(-40, 40)));
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
    // JOINT COMMISSION: one manager down, the other one saw that
    if (this.boss2 || (this.boss && this.boss.dead && this.boss._joint && this._jointSurvivor())) {
      const survivor = this._jointSurvivor();
      if (survivor) {
        this.boss = survivor;
        this.boss2 = null;
        survivor._wakeT = 0;
        survivor.aggr = (survivor.aggr || 1) * 1.15;
        this.pickups.push(new Pickup('half', CW / 2, RY + RH / 2));
        this.pickups.push(new Pickup('coin', CW / 2 - 22, RY + RH / 2 + 10));
        this.pickups.push(new Pickup('coin', CW / 2 + 22, RY + RH / 2 + 10));
        this.toast('🏥 One signature down. The co-signer is FURIOUS.', '#e0a05a');
        SFX.play('sting');
        SFX.setMusic(['founder', 'thesystem', 'thecure'].includes(this.bossId) ? 'superboss' : 'boss');
        return;   // the room is not done with you
      }
    }
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
    if (!spared) {
      this.stats.bosses++;
      const BN = (DATA.BOSSES[this.bossId] || { name: this.bossId }).name;
      this.diaryNote('Put down ' + BN + (this.boss && this.boss._shift2 ? ' (working a double, no less)' : '') + ' on ward ' + this.depth + '. Management will send a replacement.');
      if (this.bossId === 'walrus') this.bingoEvent('walrus');
      if (this.bossId === 'merger' && !this.sandbox && !this.practice) { Meta.data.mergerKills = (Meta.data.mergerKills || 0) + 1; Meta.save(); this.checkUnlocks(); }
    }
    // JOINT COMMISSION cleared: two signatures, double severance
    if (this._wasJoint) {
      this._wasJoint = false;
      Meta.data.jointsCleared = (Meta.data.jointsCleared || 0) + 1;
      Meta.data.insight = (Meta.data.insight || 0) + 4;
      Meta.save();
      const poolJ = DATA.pickPool('boss', p.items);
      this.peds.push({ x: CW / 2 - 90, y: RY + RH / 2 + 70, itemId: U.choice(poolJ.length ? poolJ : DATA.POOLS.special), kind: 'item', taken: false });
      for (let i = 0; i < 4; i++) this.pickups.push(new Pickup('coin', CW / 2 + U.rand(-60, 60), RY + RH / 2 + U.rand(20, 60)));
      this.toast('🏥 CONSOLIDATED PAYOUT — two managers, two severances, +◆4.', '#8fd08a');
      this.diaryNote('Cleared a Joint Commission room. Two managers, one paycheck — mine, for once.');
      this.checkUnlocks();
    }
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
      if (this.depth >= 3 && !p.flags.untreated && (this.hasRule('repDay') || U.chance(0.35))) {
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
      // THE ANNEX: a boarded door beside the trapdoor — the wing they closed (30%)
      if (!this.annexFloor && !this.walkin && !this.overtime && !this.bossRush && !this.ascent && !this.practice && this.depth >= 2 && this.genSeed(['annex', this.depth], () => U.chance(0.3))) {
        room.peds.push({ x: CW / 2 - 170, y: RY + RH / 2 - 100, kind: 'annexdoor', taken: false });
        this.toast('🚧 A boarded door beside the trapdoor. The boards are… loose. Deliberately loose.', '#b8a890');
      }
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
    if (this.boss2 && !this.boss2.dead && U.dist(x, y, this.boss2.x, this.boss2.y) < rad + this.boss2.r) this.boss2.hurt(dmg, this);
    if (this.inspection && this.inspection.active && this.enemies.some(e => e._perform && !e.dying && U.dist(x, y, e.x, e.y) < rad + e.r)) this.inspectionBust();   // you BOMBED the recital
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
    // PLAYDATE: a full floor with both professionals on shift
    if (this.player && this.player.pet && this.player.pet2 && !this.sandbox && !this.practice && !Meta.data.playdates) {
      Meta.data.playdates = 1; Meta.save(); this.checkUnlocks();
    }
    // A YEAR INDOORS: mark the season this ward was cleared in
    if (this.player && this.player.diag === 'seasonal' && !this.sandbox && !this.practice) {
      const ss = Meta.data.seasonsSeen || (Meta.data.seasonsSeen = {});
      if (!ss[this.player.season]) { ss[this.player.season] = 1; Meta.save(); this.checkUnlocks(); }
    }
    // NIGHT SHIFT: another floor on the clock nobody wants
    if (this.nightShift && !this.sandbox && !this.practice && !this.dailyKind) {
      Meta.data.nightFloors = (Meta.data.nightFloors || 0) + 1;
      Meta.save();
      this.checkUnlocks();
      this.bingoEvent('night');
    }
    if (this.p2 && !Meta.data.everCoop) { Meta.data.everCoop = 1; Meta.save(); this.checkUnlocks(); }   // Group Rate
    if (this.volunteer && !Meta.data.everVolunteer) { Meta.data.everVolunteer = 1; Meta.save(); this.checkUnlocks(); }   // Back On Purpose
    // the intern survives another floor
    if (this.intern) {
      this.intern.floors++;
      if (this.intern.floors >= 3) {
        this.intern = null;
        if (!Meta.data.internGrad) { Meta.data.internGrad = 1; Meta.save(); this.checkUnlocks(); }
        this.diaryNote('The intern graduated. Three floors, alive. They cried. I did not (documented).');
        this.toast('🎓 THE INTERN GRADUATED. They\'re a recruitable ally now — look for The Graduate in Day Rooms.', '#e8c05a');
        SFX.play('fanfare');
        setTimeout(() => { if (this.state === 'run') this.pa('internGrad'); }, 2400);
      } else {
        this.toast('🪪 The intern made it down. Floor ' + this.intern.floors + ' of 3. They\'re… beaming?', '#e8c05a');
      }
    }
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
        // the Ghost of Runs Past: your PB leaves a line to race
        try {
          const trail = {};
          for (const d of Object.keys(this._ghostRec || {})) trail[d] = this._ghostRec[d];
          (Meta.data.ghostPB || (Meta.data.ghostPB = {}))[key] = { total: this.runTime, trail };
        } catch (e) { }
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
        <button class="btn minor" id="bComorbidSkip">🚶 take the stairs — a dodge gauntlet; clean descent pays (no comorbidity, standard floor)</button>
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
    document.getElementById('bComorbidSkip').onclick = () => { SFX.play('ui'); this.wardPath = 'day'; this._routeMod = null; this.hideOverlay(); this.startStairs(); };
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
    // banners + toasts age in every live state (a run banner must not freeze over the hub)
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.state !== 'run') {   // the run branch below does its own toast pass
      for (const t of this.toasts) t.t += dt;
      this.toasts = this.toasts.filter(t => t.t < t.dur);
    }
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
    if (this.state === 'arcade') { this.t += dt; this.arcadeUpdate(dt); return; }
    if (this.state === 'stairs') { this.t += dt; this.stairsUpdate(dt); return; }
    if (this.state === 'handoff') { this.t += dt; this.handoffUpdate(dt); return; }
    if (this.state === 'appeal') { this.t += dt; this.appealUpdate(dt); return; }
    if (this.state === 'credits') { this.t += dt; this.creditsUpdate(dt); return; }
    if (this.state === 'exit') { this.t += dt; this.exitUpdate(dt); return; }
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
    if (this.boss2 && !this.boss2.dead) {   // the partner reviews its notes, then joins
      if (this.boss2._wakeT > 0) {
        this.boss2._wakeT -= dt * smf;
        if (this.boss2._wakeT <= 0) { this.setBanner('📋 ' + ((DATA.BOSSES[this.boss2.id] || {}).name || 'THE PARTNER'), 'has finished reviewing your file', 2.0); SFX.play('boss'); }
      } else this.boss2.update(dt * smf, this);
    }
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
    if (!room.cleared && (room.type === 'normal' || room.type === 'padded' || room.type === 'clinic' || room.type === 'gym' || room.type === 'incident' || room.type === 'records') && room.spawned && !hostiles) this.onRoomCleared();
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
        if (this.hasRule('brokenCoolers')) { if (this.lockCd <= 0) { this.lockCd = 1.4; this.toast('🚱 OUT OF ORDER. (house rules)', '#a89a8a'); SFX.play('denied'); } }
        else if (p.hp < p.maxhp) { p.heal((p.flags.bigCooler ? 3 : 2) + (this.hasCal('tuesday') ? 1 : 0)); ped.taken = true; this.texts.push(new FloatText(ped.x, ped.y - 30, this.hasCal('tuesday') ? '+♥ hydrated (+ pudding)' : '+♥ hydrated', '#8fd0e0')); SFX.play('heal'); }
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
      } else if (ped.price && ped.kind !== 'janitor' && ped.kind !== 'boss' && ped.kind !== 'compound') { // shop item (Brand or Generic), GoodRx coupon halves it
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
          this.toast('🧹 ' + (ped._lost ? '“Found this in the vents after… last time. Looked important. Looked yours.”' : U.choice(Meta.data.handoffDone ? DATA.JANITOR.newguy : (met ? DATA.JANITOR.again : DATA.JANITOR.greet))), ped._lost ? '#e8c84c' : '#b8b0a0');
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
            if (ped._lost) { Meta.data.lostItem = null; }   // reclaimed
            this.diaryNote(ped._lost ? 'Bought back something I lost from the man with the bucket. He knew it was mine. He always knows.' : 'Bought contraband off a mop cart. No receipt. No regrets.');
            this.bingoEvent('janitor');
            Meta.data.janitorBuys = (Meta.data.janitorBuys || 0) + 1; Meta.save();
            this.toast('🧹 ' + (ped._lost ? '“Welcome back to it. No questions. Well — one: how?”' : U.choice(DATA.JANITOR.buy)), '#b8b0a0');
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
      } else if (ped.kind === 'intern') {   // "can I… follow you? you seem like you've done this before."
        ped.taken = true;
        this.intern = { x: ped.x, y: ped.y, hp: 4, iframes: 1.5, floors: 0, panic: 0, t: 0, flash: 0 };
        this.diaryNote('Someone with a brand-new badge asked to follow me. I said the wrong thing: "sure."');
        this.toast('🪪 THE INTERN is shadowing you. Keep them alive for 3 floors. They panic. A lot.', '#e8c05a');
        SFX.play('voice');
      } else if (ped.kind === 'origfile') {   // YOUR original intake file. the first page of all of this.
        ped.taken = true;
        const H = this.room._heist || {};
        H.stolen = true;
        const clean = !H.alerted;
        const firstTime = !Meta.data.fileStolen;
        Meta.data.fileStolen = 1;
        if (clean && !this.sandbox && !this.practice) Meta.data.heistsClean = (Meta.data.heistsClean || 0) + 1;
        Meta.data.insight = (Meta.data.insight || 0) + (clean ? 8 : 5);
        Meta.save();
        this.checkUnlocks();
        p.heal(2); p.coins += 8;
        if (clean) this.setBanner('👻 GHOSTED', 'in and out. the patrols will never know.', 2.6);
        this.toast('📁 THE ORIGINAL FILE — +♥, +8¢, +◆' + (clean ? 8 : 5) + (clean ? ' (unseen bonus)' : ''), '#8fd08a');
        if (firstTime) {
          setTimeout(() => { if (this.state === 'run') { this.toast('📁 Intake, page one. Presenting complaint: “trouble sleeping.”', '#c8b878'); SFX.play('paper'); } }, 1600);
          setTimeout(() => { if (this.state === 'run') { this.toast('📁 That was it. That was the whole complaint.', '#e8c05a'); SFX.play('voice'); } }, 4200);
          this.diaryNote('Stole my original intake file. Page one says I came in for trouble sleeping. Page one is very quiet about the rest.');
        } else {
          this.diaryNote('Lifted another “original” of my file from the records room. They keep printing originals. That word is losing meaning.');
        }
        SFX.play('fanfare');
      } else if (ped.kind === 'actuary') {   // the briefcase. the calculator. your odds.
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showActuary(ped); return; }
      } else if (ped.kind === 'compound') {   // the back room. the mortar. the smell of progress.
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showCompound(ped); return; }
      } else if (ped.kind === 'rivalduel') {   // they've been stretching. audibly.
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showRivalDuel(ped); return; }
      } else if (ped.kind === 'designexit') {   // back to the drawing board (literally)
        ped.taken = true;
        this.showDesigner();
        return;
      } else if (ped.kind === 'annexdoor') {   // through the boards, into the wing they closed
        ped.taken = true;
        this.enterAnnex();
        return;
      } else if (ped.kind === 'annexhatch') {   // the deep exit: two wards down in one drop
        ped.taken = true;
        this.annexFloor = false;
        if (!this.sandbox && !this.practice) { Meta.data.annexClears = (Meta.data.annexClears || 0) + 1; Meta.save(); this.checkUnlocks(); }
        this.toast('🕳 The service chute drops PAST the next ward. The dust thanks you for visiting.', '#b8a890');
        this.diaryNote('Cleared the condemned wing and took the deep chute out. Two wards in one fall. The sheets waved.');
        this.wardPath = 'day'; this._routeMod = null;
        this.doDescend();
        return;
      } else if (ped.kind === 'firealarm') {   // the sign has three words
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showFireAlarm(ped); return; }
      } else if (ped.kind === 'openmic') {   // someone's on the step stool
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showOpenMic(ped); return; }
      } else if (ped.kind === 'secondmop') {   // it's leaning there like it's always been yours
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showHandoffOffer(ped); return; }
      } else if (ped.kind === 'payphone') {   // it takes exact change and one feeling at a time
        if (this.lockCd <= 0) { this.lockCd = 2.0; this.showPayphone(ped); return; }
      } else if (ped.kind === 'roofladder') {   // up, for once
        ped.taken = true;
        this.enterRoof();
        return;
      } else if (ped.kind === 'roofexit') {   // back down into the hum
        ped.taken = true;
        this.exitRoof();
        return;
      } else if (ped.kind === 'roofview') {   // the railing. the skyline. your house, probably.
        ped.taken = true;
        p.heal(99);
        Meta.data.insight = (Meta.data.insight || 0) + 3;
        Meta.save();
        this.toast('🌇 You can see your house from here. It looks fine. It looks FINE. Full heal, +◆3.', '#e8c05a');
        this.diaryNote('Leaned on the roof railing and found my house in the skyline. It survived me leaving. Good to know.');
        SFX.play('fanfare');
      } else if (ped.kind === 'roofnest') {   // the pigeon's nest — so THIS is where it goes
        ped.taken = true;
        if (p.pet && p.pet.type === 'pigeon') {
          const xp = Meta.data.petXp || (Meta.data.petXp = {});
          xp.pigeon = (xp.pigeon || 0) + 10;
          Meta.save();
          this.toast('🕊 The pigeon lands in its OWN nest, looks at you, and leaves it — for now. (+10 pigeon xp)', '#c8c0b8');
          this.diaryNote('Found the pigeon\'s nest on the roof. It chose to come back down with me. I will not be normal about this.');
        } else {
          this.pickups.push(new Pickup('coin', ped.x, ped.y + 30));
          this.pickups.push(new Pickup('coin', ped.x + 16, ped.y + 34));
          this.toast('🕊 A pigeon\'s nest, lined with lost coins and one laminated visitor pass. So that\'s where those go.', '#c8c0b8');
        }
        SFX.play('coin');
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
        this.bingoEvent('sample');
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
      if (this.walkin) { this.showWalkinDone(); return; }   // express discharge: the trapdoor is the exit
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
    // SEND THE ANIMAL (F / pad Y)
    if (Input.take('petcmd') && p.pet) this.petCommand();
    // the intern shadows you; the union bargains
    if (this.intern) this.internUpdate(dt);
    if (this._union) this.unionUpdate(dt);
    // union trigger: a big room, a long fight, an idea spreads
    if (!this._unionTried && this.room && !this.room.cleared && (this.room.type === 'normal' || this.room.type === 'padded') && (this.t - (this._roomT0 || 0)) > 6) {
      this._unionTried = true;
      const live = this.enemies.filter(e => !e.dying && !e.fake && !e.charmed && e.spawnT <= 0 && e.id !== 'auditor').length;
      if (live >= 4 && Math.random() < 0.12) this.unionize();
    }
    // THE INSPECTION: the tour, in progress
    if (this.inspection && this.inspection.active) this.inspectionUpdate(dt);
    // THE RECORDS ROOM: patrol sweeps + vision cones
    if (this.room && this.room.type === 'records') this.heistUpdate(dt);
    // THE RIVAL: pedestal race in progress
    if (this.race) this.raceUpdate(dt);
    // Patient Two (couch co-op)
    if (Input.take('p2join')) { this.p2 ? this.p2Leave() : this.showP2Pick(); if (this.state !== 'run') return; }
    if (this.p2) this.p2Update(dt);
    // OVERTIME waves
    if (this.overtime) this.overtimeUpdate(dt);
    // speedrun clock (the walk-in clinic is always on the clock)
    if (Meta.data.speedrun || this.walkin) this.runTime = (this.runTime || 0) + dt;
    // THE GHOST OF RUNS PAST: record your line (speedrun runs, first 12 wards)
    if (Meta.data.speedrun && !this.dailyKind && !this.overtime && !this.practice && !this.sandbox && !this.walkin && this.depth <= 12 && !p.dead) {
      this._ghostT += dt;
      if (this._ghostT >= 0.35) {
        this._ghostT = 0;
        const arr = this._ghostRec[this.depth] || (this._ghostRec[this.depth] = []);
        if (arr.length < 600) arr.push([Math.round((this.runTime || 0) * 10), Math.round(p.x), Math.round(p.y)]);
      }
      // and the PB ghost runs beside you
      const key = p.baseDiag === 'undiag' ? 'undiag' : p.diag;
      const gpb = (Meta.data.ghostPB || {})[key];
      const trail = gpb && gpb.trail && gpb.trail[this.depth];
      if (trail && trail.length) {
        const tNow = (this.runTime || 0) * 10;
        let gi = this._ghostIdx || 0;
        if (gi >= trail.length || (trail[gi] && trail[gi][0] > tNow + 40)) gi = 0;   // rewind on floor change
        while (gi < trail.length - 1 && trail[gi + 1][0] <= tNow) gi++;
        this._ghostIdx = gi;
        const a = trail[gi], b = trail[Math.min(gi + 1, trail.length - 1)];
        const span = Math.max(1, b[0] - a[0]);
        const f = U.clamp((tNow - a[0]) / span, 0, 1);
        this.ghost = { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, ahead: gi >= trail.length - 1 };
      } else this.ghost = null;
    } else this.ghost = null;
    // death recap ring buffer (the last ~6 seconds, reconstructed at the morgue)
    this._recapT = (this._recapT || 0) + dt;
    if (this._recapT >= 0.1 && p && !p.dead) {
      this._recapT = 0;
      const R = this._recap || (this._recap = []);
      R.push({ x: p.x, y: p.y, hp: p.hp, b: this.eBullets.filter(b => !b.dead && !b.fake).slice(0, 40).map(b => [Math.round(b.x), Math.round(b.y)]), e: this.enemies.filter(e => !e.dying).slice(0, 12).map(e => [Math.round(e.x), Math.round(e.y)]) });
      if (R.length > 60) R.shift();
    }
    // ROOM DESIGNER playtest: death is a note in the margin, not an ending
    if (p.dead && this.designTest) {
      p.dead = false; p.hp = p.maxhp; p.iframes = 2.5; this.deathT = 0;
      const st = (this._design && this._design.start) || { c: 6, r: 5 };
      const sp = tileToPx(st.c, st.r);
      p.x = sp.x; p.y = sp.y;
      this.toast('💀→🏗 Respawned at the start marker. The designer forgives.', '#8fd0e0');
      SFX.play('heal');
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
        ${this.designTest ? '<button class="btn" id="bBackDesign" style="border-color:#8fd0e0">🏗 BACK TO THE DESIGNER</button>' : ''}
        <button class="btn minor" id="bP2Toggle">🎮 ${this.p2 ? 'PATIENT TWO LEAVES' : 'PATIENT TWO JOINS (pad)'}</button>
        ${Meta.data.tester ? '<button class="btn minor" id="bTesterTools">🔧 TESTER TOOLS</button>' : ''}
        <div class="btnrow">
          <button class="btn minor" id="bSettings2">⚙ SETTINGS</button>
          <button class="btn minor" id="bPauseHb">📘 HANDBOOK</button>
        </div>
        <button class="btn minor" id="bQuit">${this.dailyKind ? 'QUIT TO TITLE' : (this.sandbox ? 'CLOCK OUT (sandbox)' : '💾 SAVE & QUIT')}</button>
      </div>`);
    document.getElementById('bResume').onclick = () => { SFX.play('ui'); this.hideOverlay(); this.state = 'run'; };
    document.getElementById('bPauseHb').onclick = () => { SFX.play('paper'); this.showHandbook(() => this.showPause()); };
    const bbd = document.getElementById('bBackDesign');
    if (bbd) bbd.onclick = () => { SFX.play('ui'); this.showDesigner(); };
    const btt = document.getElementById('bTesterTools');
    if (btt) btt.onclick = () => { SFX.play('ui'); this.showTesterTools(); };
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

  /* ---------- THE INTERN (keep them alive three floors and they graduate) ---------- */
  internUpdate(dt) {
    const I = this.intern, p = this.player;
    if (!I) return;
    I.iframes -= dt; I.t = (I.t || 0) + dt;
    // panicky follow: aims for a spot behind you, badly
    const near = this.enemies.some(e => !e.dying && !e.fake && e.spawnT <= 0 && U.dist(I.x, I.y, e.x, e.y) < 150);
    I.panic = U.lerp(I.panic || 0, near ? 1 : 0, dt * 3);
    const tx = p.x - Math.cos(p.aimAng || 0) * 44, ty = p.y - Math.sin(p.aimAng || 0) * 44;
    const d = U.dist(I.x, I.y, tx, ty);
    if (d > 26) {
      const a = U.ang(I.x, I.y, tx, ty) + Math.sin(I.t * (near ? 11 : 3)) * (near ? 0.9 : 0.2);
      const sp = Math.min(230, d * 2.4) * (near ? 1.25 : 1);
      I.x = U.clamp(I.x + Math.cos(a) * sp * dt, RX + 12, RX + RW - 12);
      I.y = U.clamp(I.y + Math.sin(a) * sp * dt, RY + 12, RY + RH - 12);
    }
    if (I.iframes <= 0) {
      for (const b of this.eBullets) {
        if (b.dead || b.fake) continue;
        if (U.dist(I.x, I.y, b.x, b.y) < b.r + 8) { b.dead = true; this.internHurt(); break; }
      }
      if (I.iframes <= 0) for (const e of this.enemies) {
        if (e.dying || e.fake || e.spawnT > 0 || e.charmed || !(e.dmg > 0)) continue;
        if (U.dist(I.x, I.y, e.x, e.y) < e.r + 9) { this.internHurt(); break; }
      }
    }
  },
  internHurt() {
    const I = this.intern; if (!I || I.iframes > 0) return;
    I.hp--; I.iframes = 1.4; I.flash = 0.35;
    SFX.play('hurt');
    if (I.hp <= 0) {
      this.intern = null;
      Meta.data.internLost = (Meta.data.internLost || 0) + 1; Meta.save();
      this.diaryNote('The intern didn\'t make it. The intercom told everyone. Twice.');
      this.toast('🪪 The intern didn\'t make it.', '#e08a8a');
      SFX.play('denied');
      setTimeout(() => { if (this.state === 'run') this.pa('internLost'); }, 2200);
    } else {
      this.texts.push(new FloatText(I.x, I.y - 20, ['“I\'m fine!! ”', '“ow. OW.”', '“is this normal??”'][3 - I.hp] || '“help”', '#e8c05a'));
    }
  },

  /* ---------- THE UNION (the room organizes; you fight it or you settle) ---------- */
  unionize() {
    const live = this.enemies.filter(e => !e.dying && !e.fake && !e.charmed && e.spawnT <= 0 && e.id !== 'auditor' && !e._form);
    if (live.length < 4) return;
    let rep = live[0];
    for (const e of live) if (e.hp > rep.hp) rep = e;
    rep._unionRep = true;
    for (const e of live) e._union = true;
    this._union = { rep, sevT: 0 };
    this.setBanner('✊ THE ROOM HAS UNIONIZED', 'damage routes to the elected rep · or stand with them (5¢ severance)', 3.2);
    this.toast('✊ “FAIR SHIFTS! NO MORE WAVES! BETTER FLUORESCENT LIGHTING!”', '#e0a05a');
    SFX.play('voice');
  },
  unionUpdate(dt) {
    const UN = this._union; if (!UN) return;
    const p = this.player;
    if (!UN.rep || UN.rep.dying) { this._union = null; return; }   // rep down = dissolved (handled in die)
    // chants
    if (Math.random() < dt * 0.5) {
      const m = this.enemies.filter(e => e._union && !e.dying);
      if (m.length) { const e = U.choice(m); this.texts.push(new FloatText(e.x, e.y - e.r - 8, U.choice(['✊', 'FAIR SHIFTS', 'NO WAVES', 'HAZARD PAY']), '#e0a05a')); }
    }
    // severance: stand with the rep, still, holding 5¢
    const mv = Input.getMove();
    const still = Math.abs(mv.x) < 0.05 && Math.abs(mv.y) < 0.05;
    if (still && p.coins >= 5 && U.dist(p.x, p.y, UN.rep.x, UN.rep.y) < 110) {
      UN.sevT += dt;
      if (UN.sevT > 0.4 && Math.random() < dt * 6) this.texts.push(new FloatText(p.x, p.y - 26, 'negotiating… ' + Math.ceil((1.5 - UN.sevT) * 10) / 10 + 's', '#8fd0e0'));
      if (UN.sevT >= 1.5) {
        p.coins -= 5;
        for (const e of this.enemies) if (e._union && !e.dying) { e.dying = true; e.deadDone = true; this.texts.push(new FloatText(e.x, e.y - 10, '✊ clocked out', '#8fd05a')); }
        this._union = null;
        Meta.data.unionsSettled = (Meta.data.unionsSettled || 0) + 1; Meta.save();
        this.checkUnlocks();
        this.diaryNote('A union formed. I paid the severance. Everyone clocked out singing. Worth every cent.');
        this.bingoEvent('union');
        this.toast('🤝 Severance paid. They filed out singing. The room is yours.', '#8fd05a');
        SFX.play('spare');
      }
    } else UN.sevT = 0;
  },

  /* ---------- SEND THE ANIMAL (each companion has one trick, per cooldown) ---------- */
  petCommand() {
    const p = this.player;
    this._petCommandOne(p.pet);
    if (p.pet2) this._petCommandOne(p.pet2);   // playdates: one whistle, two professionals
  },
  _petCommandOne(pet) {
    const p = this.player;
    if (!pet) return;
    if (pet.cmdCd > 0) { if (this.lockCd <= 0) { this.lockCd = 0.8; this.toast('the animal is resting (' + Math.ceil(pet.cmdCd) + 's)', '#b8b0a0'); } return; }
    pet.cmdCd = 8;
    if (pet.type === 'pigeon') {         // FETCH: everything shiny comes home
      this._fetchT = 2.2;
      this.toast('🕊 FETCH. It knows what that means now.', '#c8c0b8');
      SFX.play('coin');
    } else if (pet.type === 'cat') {     // GUARD: three seconds of total air superiority
      pet._guardT = 3;
      this.toast('🐈 GUARD MODE. The table is protected.', '#d08a4a');
      SFX.play('swat');
    } else if (pet.type === 'snake') {   // STRIKE: a lunge along your aim
      const a = p.aimAng || 0;
      pet._lungeA = a; pet._lungeT = 0.45;
      pet.x = p.x; pet.y = p.y;
      this.toast('🐍 It has heard your problems. It is going to them.', '#5a9a5a');
      SFX.play('whoosh');
    } else if (pet.type === 'goldfish') {// FORGET: the whole room loses its train of thought
      let n = 0;
      for (const e of this.enemies) { if (e.fake || e.dying || e.spawnT > 0) continue; if (U.dist(pet.x, pet.y, e.x, e.y) < 220) { e._dazeT = 1.6; n++; } }
      this.toast('🐟 ' + (n ? n + ' patients suddenly can\'t remember why they were upset.' : 'the room was already forgetful.'), '#8fd0e0');
      SFX.play('voice');
    } else if (pet.type === 'dog') {     // SIT. STAY. the room calms down around a professional
      pet.x = p.x + 26; pet.y = p.y + 12;
      pet._calmT = pet.evo ? 4 : 3;
      this.toast('🐕 SIT. STAY. The room takes a breath it didn\'t know it needed.', '#e8c05a');
      SFX.play('heal');
    }
  },

  /* ---------- THE WALK-IN CLINIC (a 5-minute appointment: one floor, one manager, one bill) ---------- */
  showWalkin() {
    this.state = 'walkinpick';
    const wb = Meta.data.walkinBest;
    const fmtT = (s) => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
    const diag = (Meta.data.lastDiag && DATA.DIAG[Meta.data.lastDiag]) ? Meta.data.lastDiag : 'adhd';
    this.overlay(`
      <div class="panel">
        <h1 class="logo" style="font-size:28px">🚑 THE WALK-IN CLINIC</h1>
        <div class="tagline">no appointment. one compact ward, one manager, automatic discharge. in and out.</div>
        <div class="stats-line">${wb ? '⏱ best visit: <b>' + fmtT(wb.secs) + '</b> (' + ((DATA.DIAG[wb.diag] || {}).name || wb.diag) + ')' : 'no visits on file — the bar is unset'}</div>
        <div class="stats-line" style="opacity:.7">under 4:00 earns <i>In And Out</i> · rewards tuned up for the short stay</div>
        <button class="btn" id="bWiGo">▶ CHECK IN — ${(DATA.DIAG[diag] || {}).name}</button>
        <div class="smallprint">the clinic sees whoever you played last — start any regular run to switch patients</div>
        <button class="btn minor" id="bWiBack">BACK</button>
      </div>`);
    document.getElementById('bWiGo').onclick = () => { SFX.init(); SFX.play('stamp'); this.beginWalkin(diag); };
    document.getElementById('bWiBack').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },
  beginWalkin(diagId, variant) {
    this.beginRun(diagId, null, variant);
    this.walkin = true;
    this.clearCheckpoint();
    this.depth = 3;
    this.newFloor();
    this.runTime = 0;
    this.setBanner('🚑 WALK-IN CLINIC', 'one ward. one manager. the door is timed.', 2.8);
    this.toast('🚑 Express appointment: clear to the boss and you\'re discharged automatically.', '#8fd0e0');
  },
  showWalkinDone() {
    const secs = Math.max(1, Math.round(this.runTime || 1));
    const fmtT = (s) => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
    const prev = Meta.data.walkinBest;
    const newBest = !prev || secs < prev.secs;
    if (newBest && !this.sandbox && !this.practice) {
      Meta.data.walkinBest = { secs, diag: this.player.baseDiag === 'undiag' ? 'undiag' : this.player.diag };
    }
    Meta.save();
    this.checkUnlocks();
    this.recordRun('walkin');
    this.walkin = false;
    this.state = 'walkindone';
    SFX.setMusic('menu');
    document.body.classList.remove('inrun');
    this.overlay(`
      <div class="panel">
        <div class="rx" style="border-color:#3a7a8a">
          <div class="stamp" style="color:#3a7a8a;border-color:#3a7a8a">DISCHARGED (EXPRESS)</div>
          <h2 style="color:#8fd0e0">🚑 SEEN & BILLED</h2>
          <div class="sub">visit time: <b style="font-size:20px">${fmtT(secs)}</b>${newBest ? ' ⭐ NEW BEST' : (prev ? ' · best ' + fmtT(prev.secs) : '')}</div>
          <div class="sub">${this.stats.kills} symptoms · ${this.stats.items} scripts · +◆${this._insightGained || 0} Insight</div>
        </div>
        ${this.billHtml()}
        <button class="btn" id="bWiAgain">🔁 ANOTHER APPOINTMENT</button>
        <button class="btn minor" id="bWiDone">BACK TO THE LOBBY</button>
      </div>`);
    document.getElementById('bWiAgain').onclick = () => { SFX.play('stamp'); this.showWalkin(); };
    document.getElementById('bWiDone').onclick = () => { SFX.play('ui'); this.showTitle(); };
  },

  /* ---------- OVERTIME (one room; the ward sends everything; you clock out when you drop) ---------- */
  showOvertime() {
    this.state = 'overtimepick';
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout', 'seasonal'];
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const nineDone = order.slice(0, 9).filter(d => (Meta.data.diagsPlayed || {})[d]).length >= 9;
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const seasonalOpen = Object.keys(Meta.data.calDays || {}).length >= 4;
    const unlocked = order.filter(id => !(id === 'fine' && !fineOpen) && !(id === 'undiag' && !nineDone) && !(id === 'burnout' && !burnoutOpen) && !(id === 'seasonal' && !seasonalOpen));
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
    const order = ['adhd', 'bipolar', 'depression', 'anxiety', 'schizo', 'ocd', 'ptsd', 'insomnia', 'fine', 'undiag', 'burnout', 'seasonal'];
    const fineOpen = Meta.data.fineSeen || Meta.data.walrusKills > 0;
    const nineDone = order.slice(0, 9).filter(d => (Meta.data.diagsPlayed || {})[d]).length >= 9;
    const burnoutOpen = Object.values(Meta.data.diagBest || {}).filter(v => v >= 10).length >= 3;
    const seasonalOpen = Object.keys(Meta.data.calDays || {}).length >= 4;
    const unlocked = order.filter(id => !(id === 'fine' && !fineOpen) && !(id === 'undiag' && !nineDone) && !(id === 'burnout' && !burnoutOpen) && !(id === 'seasonal' && !seasonalOpen));
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
      const dmg = Math.max(1.5, p.dmg * 0.7) * (this.volunteer ? 1.5 : 1);
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
    if (sub) line = line.replace(/\{X\}/g, String(sub).replace(/^the /i, ''));
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
      this.diaryNote('Signed the AMA form. The pen was chained to the clipboard. I understand the chain now.');
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
    (Meta.data.seenStory || (Meta.data.seenStory = {})).amaend = 1;   // the chapter opens in Chart Notes
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
          this.diaryNote('Died, briefly. Appealed it. Won. Death is negotiable with the right paperwork.');
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
    // THE ACTUARY called it (right ward — and sometimes the exact cause)
    const actHit = this.actuaryBet && !this.actuaryBet.paid && this.depth === this.actuaryBet.ward;
    const actExact = actHit && this.player && this.player._lastSrc === this.actuaryBet.cause;
    if (actHit && !this.sandbox && !this.practice) {
      Meta.data.actuaryCorrect = (Meta.data.actuaryCorrect || 0) + 1;
      Meta.save();
      this.checkUnlocks();
    }
    this.overlay(`
      <div class="panel wide">
        <div class="rx" style="border-color:#8a3030">
          <div class="stamp">DISCHARGED</div>
          ${actHit ? `<div class="stamp" style="right:auto;left:14px;color:#3a5a8a;border-color:#3a5a8a;transform:rotate(-7deg)">ACTUARIALLY CORRECT</div>` : ''}
          ${ribbon ? `<div class="sub" style="color:#e0a05a;font-weight:bold">${ribbon}</div>` : ''}
          <h2 style="color:${D.color}">${D.name}</h2>
          <div class="sub">Reached ${DATA.floorName(this.depth)} · Ward ${this.depth} · ${DATA.tierName(this.depth)}${newBest ? ' &nbsp;⭐ NEW BEST' : (prevBest ? ' (best: ward ' + prevBest + ')' : '')}</div>
          ${actHit ? `<div class="sub" style="color:#3a5a8a">📉 exactly as projected — ward ${this.actuaryBet.ward}${actExact ? ', and yes: the ' + this.actuaryBet.causeName : ''}. the printout will be framed.</div>` : ''}
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
    const tabs = [['enemies', '🧟 Patients'], ['bosses', '☠ Bosses'], ['items', '℞ Meds'], ['pills', '💊 Pills'], ['archive', '🗂 Archive']];
    let entries = [];
    if (tab === 'enemies') entries = Object.keys(DATA.ENEMIES).filter(id => id !== 'form').map(id => ({ id, name: DATA.ENEMIES[id].name, text: (DATA.CODEX_CHART.enemies[id] || ''), seen: !!(seen.enemies && seen.enemies[id]) }));
    else if (tab === 'bosses') entries = Object.keys(DATA.BOSSES).map(id => ({ id, name: DATA.BOSSES[id].name, text: (DATA.CODEX_CHART.bosses[id] || ''), seen: !!(seen.bosses && seen.bosses[id]) }));
    else if (tab === 'items') entries = Object.keys(DATA.ITEMS).map(id => ({ id, name: DATA.ITEMS[id].name, text: DATA.ITEMS[id].desc, seen: !!(seen.items && seen.items[id]) }));
    else if (tab === 'archive') entries = (DATA.DOCUMENTS || []).map(d => ({ id: d.id, name: d.title, text: d.sub, icon: d.icon, seen: !!(Meta.data.docs || {})[d.id] }));
    else entries = DATA.PILLS.map((p, idx) => ({ id: idx, name: p.name, text: p.msg, seen: !!(seen.pills && seen.pills[idx]) }));
    const total = entries.length, got = entries.filter(e => e.seen).length;
    const rows = entries.map(e => {
      if (!e.seen) return `<div class="ach locked"><div class="codexicon locked">?</div><div class="achbody"><div class="achname">???</div><div class="achdesc">${tab === 'archive' ? 'still misfiled somewhere in the building' : 'not yet encountered'}</div></div></div>`;
      if (tab === 'archive') return `<div class="ach got" data-doc="${e.id}" style="cursor:pointer"><div class="achicon">${e.icon}</div><div class="achbody"><div class="achname">${e.name}</div><div class="achdesc">${e.text} · tap to re-read</div></div></div>`;
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
    document.querySelectorAll('.ach[data-doc]').forEach(b => b.onclick = () => { SFX.play('paper'); this.showDocument(b.dataset.doc, () => { this.state = 'codex'; this._renderCodex(); }); });
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
    const order = ['gatekeeper', 'larperking', 'adjuster', 'priorauth', 'stigma', 'dsm', 'algorithm', 'influencer', 'peerreview', 'withdrawal', 'burnout', 'merger', 'walrus', 'thecure', 'founder', 'thesystem', 'theboard'];
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
        return `${i ? '<div class="tallink"></div>' : ''}<button class="talnode ${state}${t.tier >= 4 ? ' cap' : ''}" data-t="${t.id}" ${state === 'avail' ? '' : 'disabled'}>
          <div class="talname">${t.tier >= 4 ? '★ ' : ''}${t.name}</div>
          <div class="taldesc">${t.desc}</div>
          <div class="talcost">${owned(t.id) ? '✓ learned' : '◆ ' + t.cost}</div>
        </button>`;
      }).join('');
      return `<div class="talcol"><div class="talhead">${br.icon} ${br.name}</div>${nodes}</div>`;
    }).join('');
    const spent = DATA.TALENTS.filter(t => owned(t.id)).reduce((a, t) => a + t.cost, 0);
    this.overlay(`
      <div class="panel wide treat">
        <h1 class="logo" style="font-size:26px">TREATMENT PLAN</h1>
        <div class="tagline">six modalities, permanent skills · you have <b style="color:#8fd0e0">◆ ${insight} Insight</b>${spent ? ' · ◆ ' + spent + ' invested' : ''}</div>
        <div class="talgrid">${cols}</div>
        ${spent ? '<button class="btn minor" id="bRespec">🔄 RECONSIDER TREATMENT — full refund (second opinions are free here)</button>' : ''}
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
    const brs = document.getElementById('bRespec');
    if (brs) brs.onclick = () => {
      Meta.data.insight = (Meta.data.insight || 0) + spent;
      Meta.data.talents = {};
      Meta.save();
      SFX.play('paper');
      this.toast('🔄 Treatment reconsidered. ◆' + spent + ' refunded in full. The chart holds no grudge.', '#8fd0e0');
      this.showTreatmentPlan(returnTo);
    };
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
        ${Meta.data.rival ? row('🏁 vs ' + Meta.data.rival.name, 'races ' + (Meta.data.rival.raceW || 0) + '–' + (Meta.data.rival.raceL || 0) + ' · gym duels ' + (Meta.data.rival.duelW || 0) + '–' + (Meta.data.rival.duelL || 0)) : ''}
        ${Meta.data.bingoLines ? row('🎱 Bingo lines paid', Meta.data.bingoLines + (Meta.data.bingoBlackouts ? ' · ' + Meta.data.bingoBlackouts + ' BLACKOUT' : '')) : ''}
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
        const tag = (r.out === 'cured' || r.cured) ? '✓ cured' : r.out === 'walkin' ? '🚑 seen & billed' : r.out === 'ama' ? '🚪 left AMA' : r.out === 'handoff' ? '🧹 took the mop' : r.out === 'quit' ? 'left' : '☠ ' + this._causeName(r.cause);
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

  // GAME TESTER: tap-to-inspect — click near any entity to pin a live stat card on it
  canvas.addEventListener('pointerdown', (ev) => {
    if (!G.inspect || !Meta.data.tester || G.state !== 'run') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) * (CW / rect.width);
    const my = (ev.clientY - rect.top) * (CH / rect.height);
    let best = null, bd = 46;
    const consider = (ent, kind, label) => {
      if (!ent) return;
      const d = U.dist(mx, my, ent.x, ent.y);
      if (d < bd) { bd = d; best = { ent, kind, label }; }
    };
    for (const e of (G.enemies || [])) if (!e.dying) consider(e, 'enemy', (DATA.ENEMIES[e.id] || {}).name || e.id);
    if (G.boss && !G.boss.dead) consider(G.boss, 'boss', G.boss.name);
    if (G.boss2 && !G.boss2.dead) consider(G.boss2, 'boss', G.boss2.name);
    for (const pd of (G.peds || [])) if (!pd.taken) consider(pd, 'ped', pd.kind);
    consider(G.player, 'player', 'YOU');
    if (G.player && G.player.pet) consider(G.player.pet, 'pet', G.player.pet.type);
    if (G.player && G.player.pet2) consider(G.player.pet2, 'pet', G.player.pet2.type);
    G._inspected = best;   // null clears the pin
  });

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
    if (dt > 0.0001) G._fps = (G._fps || 60) * 0.92 + (1 / dt) * 0.08;   // smoothed, for the tester overlay
    if (dt > 0.05) dt = 0.05;
    Input.pollGamepad();
    if (G.state === 'cutscene' && typeof Story !== 'undefined' && Story.active) {
      try { Story.update(dt); Story.draw(); } catch (e) { Story.active = false; if (G.showTitle) G.showTitle(); }
    } else {
      if (G.state === 'run' || G.state === 'descend' || G.state === 'hub' || G.state === 'appeal' || G.state === 'credits' || G.state === 'exit' || G.state === 'arcade' || G.state === 'stairs' || G.state === 'handoff') {
        // GAME TESTER time controls: ',' slower · '.' faster · '/' pause + frame-step
        const tester = Meta.data.tester;
        if (tester) {
          if (Input.keys['Comma'] && !G._tkComma) { G.timePaused = false; G.timeScale = [0.25, 0.5, 1, 2, 4][Math.max(0, [0.25, 0.5, 1, 2, 4].indexOf(G.timeScale || 1) - 1)]; G.toast('⏱ ' + G.timeScale + '×', '#8fd0e0'); }
          G._tkComma = !!Input.keys['Comma'];
          if (Input.keys['Period'] && !G._tkPeriod) { G.timePaused = false; G.timeScale = [0.25, 0.5, 1, 2, 4][Math.min(4, [0.25, 0.5, 1, 2, 4].indexOf(G.timeScale || 1) + 1)]; G.toast('⏱ ' + G.timeScale + '×', '#8fd0e0'); }
          G._tkPeriod = !!Input.keys['Period'];
          if (Input.keys['Slash'] && !G._tkSlash) { if (!G.timePaused) { G.timePaused = true; G.toast('⏸ paused — / steps a frame · , . resume', '#8fd0e0'); } else G.stepOnce = true; }
          G._tkSlash = !!Input.keys['Slash'];
        }
        const sc = (tester && G.timeScale) ? G.timeScale : 1;
        if (tester && G.timePaused && G.state === 'run') {
          if (Input.take('pause')) { G.timePaused = false; G.showPause(); }
          else if (G.stepOnce) { G.stepOnce = false; G.update(dt); }
        } else if (sc >= 1) {
          const n = Math.round(sc);
          for (let k = 0; k < n; k++) G.update(dt);
        } else {
          G._tsAcc = (G._tsAcc || 0) + sc;
          if (G._tsAcc >= 1) { G._tsAcc -= 1; G.update(dt); }
        }
      }
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
