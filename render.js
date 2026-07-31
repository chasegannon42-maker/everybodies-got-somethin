/* =========================================================
   EVERYBODIES GOT SOMETHIN — render.js
   All drawing: rooms, doodle-style entities, HUD, minimap.
   ========================================================= */
'use strict';

const Render = {
  ctx: null,
  font(size, bold) { return (bold ? 'bold ' : '') + size + 'px "Comic Sans MS","Chalkboard SE","Segoe Print",cursive,sans-serif'; },

  /* ============ master draw ============ */
  draw(G) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#17131a';
    ctx.fillRect(0, 0, CW, CH);

    if (G.state === 'run' || G.state === 'pause' || G.state === 'dead' || G.state === 'descend') {
      // screen shake
      if (G.shake > 0.3 && !(Meta.data.a11y && Meta.data.a11y.reduceMotion)) ctx.translate(U.rand(-G.shake, G.shake) * 0.5, U.rand(-G.shake, G.shake) * 0.5);
      this.drawRoom(G);
      this.drawEntities(G);
      if (G.dark > 0.02) this.drawDarkness(G);
      // hurt flash: a red breath at the edges of the screen
      if (G.player && G.player.hurtFlash > 0) {
        const a = U.clamp(G.player.hurtFlash / 0.35, 0, 1) * 0.34;
        const hv = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.38, CW / 2, CH / 2, CH * 0.75);
        hv.addColorStop(0, 'rgba(200,40,40,0)'); hv.addColorStop(1, 'rgba(200,40,40,' + a + ')');
        ctx.fillStyle = hv; ctx.fillRect(0, 0, CW, CH);
      }
      // room-enter fade: a soft blink as you cross the threshold
      if (G.roomFade > 0) {
        ctx.fillStyle = 'rgba(10,7,13,' + U.clamp(G.roomFade / 0.22, 0, 1) * 0.55 + ')';
        ctx.fillRect(0, 0, CW, CH);
      }
      // boss intro: the VS card — bands slam in, names square up
      if (G.boss && !G.boss.dead && G.boss.introT > 0) {
        const k = U.clamp(G.boss.introT / 1.6, 0, 1);        // 1 → 0 as the intro plays out
        const inK = U.clamp((1.6 - G.boss.introT) / 0.25, 0, 1);   // slam-in
        const h = k * 64;
        ctx.fillStyle = 'rgba(8,6,11,0.88)';
        ctx.fillRect(0, 0, CW, h); ctx.fillRect(0, CH - h, CW, h);
        if (k > 0.25) {
          const a = Math.min(1, inK * 1.4) * U.clamp((k - 0.25) / 0.2, 0, 1);
          ctx.save();
          ctx.globalAlpha = a * 0.82;
          // diagonal band
          ctx.fillStyle = '#17121e';
          ctx.beginPath();
          ctx.moveTo(0, CH * 0.34); ctx.lineTo(CW, CH * 0.42); ctx.lineTo(CW, CH * 0.62); ctx.lineTo(0, CH * 0.54); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = a;
          const slide = (1 - inK) * 90;
          // YOU (left)
          const D = DATA.DIAG[G.player.diag] || DATA.DIAG.adhd;
          ctx.textAlign = 'left';
          ctx.font = 'bold 26px Impact,"Arial Black",sans-serif';
          ctx.fillStyle = D.color;
          ctx.fillText(D.name.toUpperCase(), 60 - slide, CH * 0.46);
          ctx.font = 'bold 11px "Trebuchet MS","Segoe UI",sans-serif';
          ctx.fillStyle = '#b8aec4';
          ctx.fillText('the patient', 62 - slide, CH * 0.46 + 18);
          // VS
          ctx.textAlign = 'center';
          ctx.font = 'bold 40px Impact,"Arial Black",sans-serif';
          ctx.fillStyle = '#e8c84c';
          ctx.save(); ctx.translate(CW / 2, CH * 0.49); ctx.rotate(-0.06); ctx.scale(1 + (1 - inK) * 1.6, 1 + (1 - inK) * 1.6);
          ctx.fillText('VS', 0, 14); ctx.restore();
          // THE MANAGEMENT (right)
          const B = DATA.BOSSES[G.boss.id] || { name: G.boss.id, sub: '' };
          ctx.textAlign = 'right';
          ctx.font = 'bold 26px Impact,"Arial Black",sans-serif';
          ctx.fillStyle = G.boss.affix ? (G.boss.affixTint || '#e05a5a') : '#e05a5a';
          ctx.fillText(((G.boss._shift2 ? 'SECOND SHIFT ' : '') + (G.boss.affix ? G.boss.affix.toUpperCase() + ' ' : '') + B.name + (G.boss2 ? ' + 1' : '')).slice(0, 34), CW - 60 + slide, CH * 0.53);
          ctx.font = 'italic bold 11px "Trebuchet MS","Segoe UI",sans-serif';
          ctx.fillStyle = '#c4b4ae';
          ctx.fillText(String(G.boss2 ? '🏥 JOINT COMMISSION — consolidated care, two managers' : (B.sub || '')).slice(0, 52), CW - 62 + slide, CH * 0.53 + 18);
          ctx.restore();
        }
      }
      this.drawHUD(G);
    } else if (G.state === 'hub') {
      this.drawHub(G);
    } else if (G.state === 'arcade') {
      this.drawArcade(G);
    } else if (G.state === 'appeal') {
      this.drawAppeal(G);
    } else if (G.state === 'credits') {
      this.drawCredits(G);
    } else if (G.state === 'exit') {
      this.drawExit(G);
    } else {
      this.drawMenuAmbient(G);   // atmospheric backdrop behind the menus (esp. the title)
    }
    ctx.restore();
    if (G.banner) this.drawBanner(G);
    if (G.toasts.length) this.drawToasts(G);
    if (G.state === 'descend') this.drawDescend(G);
    // GAME TESTER: the fps + entity readout (Meta.data.fpsHud)
    if (typeof Meta !== 'undefined' && Meta.data.fpsHud) {
      const fps = Math.round(G._fps || 0);
      const line = fps + ' fps · e' + ((G.enemies && G.enemies.length) || 0) + ' b' + ((G.eBullets && G.eBullets.length) || 0) + ' t' + ((G.tears && G.tears.length) || 0) + ' p' + ((G.parts && G.parts.length) || 0) + (G.sandbox ? ' · SANDBOX' : '') + (G.god ? ' · GOD' : '');
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      const w = ctx.measureText(line).width + 12;
      ctx.fillStyle = 'rgba(10,8,14,0.72)'; ctx.fillRect(4, CH - 22, w, 18);
      ctx.fillStyle = fps >= 55 ? '#8fd05a' : fps >= 30 ? '#e8c84c' : '#e05a5a';
      ctx.fillText(line, 10, CH - 9);
    }
  },

  /* ============ THE EXIT INTERVIEW (the walk out. the actual outside.) ============ */
  drawExit(G) {
    const ctx = this.ctx, T = G.exitT || 0;
    // sky: warm morning, the kind the ward never had
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#8fc4e8'); sky.addColorStop(0.55, '#e8d8b0'); sky.addColorStop(1, '#d8b890');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    // the sun, unbilled
    ctx.fillStyle = 'rgba(255,244,200,0.9)'; ctx.beginPath(); ctx.arc(CW * 0.78, 110, 46, 0, TAU); ctx.fill();
    const sg = ctx.createRadialGradient(CW * 0.78, 110, 40, CW * 0.78, 110, 200);
    sg.addColorStop(0, 'rgba(255,244,200,0.5)'); sg.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(CW * 0.78, 110, 200, 0, TAU); ctx.fill();
    // birds, doing fine without a diagnosis
    ctx.strokeStyle = 'rgba(60,50,60,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      const bx = ((T * 26 + b * 180) % (CW + 100)) - 50, by = 90 + b * 34 + Math.sin(T * 2 + b) * 6;
      ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.quadraticCurveTo(bx - 2, by - 5, bx, by); ctx.quadraticCurveTo(bx + 2, by - 5, bx + 7, by); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // the building, behind you now
    ctx.fillStyle = '#b8aa98'; ctx.fillRect(0, 120, 190, CH - 260);
    ctx.fillStyle = '#8a7c68';
    for (let w = 0; w < 4; w++) for (let h = 0; h < 5; h++) ctx.fillRect(18 + w * 42, 140 + h * 62, 26, 34);
    ctx.fillStyle = '#5a4a38'; ctx.fillRect(150, CH - 220, 40, 80);   // the door you came out of
    ctx.fillStyle = 'rgba(255,250,220,0.8)'; ctx.fillRect(166, CH - 216, 8, 72);
    // sidewalk + street
    ctx.fillStyle = '#c8bca8'; ctx.fillRect(0, CH - 150, CW, 70);
    ctx.strokeStyle = 'rgba(120,110,95,0.4)'; ctx.lineWidth = 2;
    for (let sx = 0; sx < CW; sx += 90) { ctx.beginPath(); ctx.moveTo(sx, CH - 150); ctx.lineTo(sx - 14, CH - 80); ctx.stroke(); }
    ctx.fillStyle = '#7a7268'; ctx.fillRect(0, CH - 80, CW, 80);
    ctx.setLineDash([26, 22]); ctx.strokeStyle = 'rgba(232,216,160,0.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, CH - 40); ctx.lineTo(CW, CH - 40); ctx.stroke(); ctx.setLineDash([]);
    // the send-off crowd at the door: the janitor, the walrus, whoever you spared
    const crowd = [['#5a6a72', '🧹'], ['#8a7460', '🦭']].concat(Object.keys(Meta.data.sparedBosses || {}).slice(0, 3).map(() => ['#9a8ab0', '']));
    crowd.forEach((c, i) => {
      const cx = 60 + i * 42, cy = CH - 170;
      this.shadow(cx, cy + 16, 12, 4, 0.2);
      ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 10, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(cx, cy - 12, 7, 0, TAU); ctx.fill();
      const wv = Math.sin(T * 5 + i) * 0.5;   // waving
      ctx.strokeStyle = c[0]; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + 8, cy - 2); ctx.lineTo(cx + 14, cy - 14 + wv * 6); ctx.stroke(); ctx.lineCap = 'butt';
      if (c[1]) { ctx.font = this.font(10); ctx.textAlign = 'center'; ctx.fillText(c[1], cx, cy - 24); }
    });
    // you, walking out — actually walking, actually out
    const px = Math.min(CW - 80, 210 + T * 52);
    if (G.hub && G.hub.p) {
      const pl = G.hub.p;
      pl.x = px; pl.y = CH - 168; pl.moving = true; pl.aimAng = 0;
      this.shadow(px, CH - 152, 14, 5, 0.25);
      try { this.drawPlayer(pl, G); } catch (e) { }
    }
    // the doors of light behind you at the start
    if (T < 2) { ctx.fillStyle = 'rgba(255,250,230,' + (1 - T / 2) * 0.85 + ')'; ctx.fillRect(0, 0, CW, CH); }
    // FILE CLOSED
    if (T > 4.5) {
      const k = U.clamp((T - 4.5) / 0.35, 0, 1);
      ctx.save(); ctx.translate(CW / 2, 150); ctx.rotate(-0.12); ctx.scale(2.4 - k * 1.4, 2.4 - k * 1.4); ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.strokeStyle = '#a03030'; ctx.lineWidth = 5; this.rr(ctx, -140, -34, 280, 68, 8); ctx.stroke();
      ctx.fillStyle = '#a03030'; ctx.font = 'bold 44px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('FILE CLOSED', 0, 16);
      ctx.restore();
    }
    if (T > 6.5) {
      ctx.fillStyle = 'rgba(60,50,60,0.85)'; ctx.font = 'bold 15px "Trebuchet MS","Segoe UI",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Everybody\'s got somethin.', CW / 2, CH - 200);
      if (T > 8) ctx.fillText('You had several. You walked out anyway.', CW / 2, CH - 178);
    }
    ctx.fillStyle = 'rgba(60,50,60,0.45)'; ctx.font = 'bold 10px "Trebuchet MS",sans-serif'; ctx.textAlign = 'right';
    if (T > 3) ctx.fillText('SPACE to continue', CW - 16, CH - 12);
  },

  /* ============ THE CREDITS (rolling, like the eyes of the billing department) ============ */
  drawCredits(G) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0e0a12'; ctx.fillRect(0, 0, CW, CH);
    // a faint lamp glow, one last time
    const g = ctx.createRadialGradient(CW / 2, CH * 0.35, 40, CW / 2, CH * 0.35, 480);
    g.addColorStop(0, 'rgba(70,58,88,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    const scroll = (G.creditsT || 0) * 34;
    ctx.textAlign = 'center';
    let y = CH + 40 - scroll;
    for (const line of DATA.CREDITS) {
      const kind = line[0], txt = line[1] || '';
      if (kind === 'gap') { y += 34; continue; }
      if (y > -40 && y < CH + 40) {
        if (kind === 'title') { ctx.font = 'bold 30px Impact,"Arial Black",sans-serif'; ctx.fillStyle = '#e8c84c'; }
        else if (kind === 'role') { ctx.font = 'bold 13px Impact,"Arial Black",sans-serif'; ctx.fillStyle = '#8a7c98'; }
        else if (kind === 'sub') { ctx.font = 'italic bold 13px "Trebuchet MS","Segoe UI",sans-serif'; ctx.fillStyle = '#b8aec4'; }
        else { ctx.font = 'bold 15px "Trebuchet MS","Segoe UI",sans-serif'; ctx.fillStyle = '#f0e8d8'; }
        ctx.fillText(txt, CW / 2, y);
      }
      y += kind === 'title' ? 44 : 26;
    }
    ctx.font = 'bold 10px "Trebuchet MS",sans-serif'; ctx.fillStyle = 'rgba(240,232,216,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('tap / SPACE to skip', CW - 16, CH - 12);
  },

  /* ============ THE APPEALS PROCESS (stamp-timing minigame) ============ */
  drawAppeal(G) {
    const ctx = this.ctx, A = G.appeal;
    if (!A) return;
    // the reviewer's desk, after hours
    const bg = ctx.createRadialGradient(CW / 2, CH * 0.4, 60, CW / 2, CH * 0.4, 620);
    bg.addColorStop(0, '#2e2638'); bg.addColorStop(1, '#141018');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);
    if (A.flash > 0) { ctx.fillStyle = 'rgba(200,50,50,' + (A.flash / 0.35) * 0.25 + ')'; ctx.fillRect(0, 0, CW, CH); }
    // the form
    ctx.save();
    ctx.translate(CW / 2, CH / 2 - 10);
    ctx.rotate(-0.008);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.rr(ctx, -252, -186, 512, 380, 4); ctx.fill();
    ctx.fillStyle = '#f0ead8'; this.rr(ctx, -258, -192, 512, 380, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(140,60,60,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-224, -192); ctx.lineTo(-224, 188); ctx.stroke();   // red margin
    ctx.fillStyle = '#3a3342'; ctx.font = 'bold 26px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('APPEAL FORM 27-B', -2, -152);
    ctx.font = 'bold 12px "Trebuchet MS","Segoe UI",sans-serif'; ctx.fillStyle = '#6a6272';
    ctx.fillText('RE: the recent unpleasantness · ward ' + G.depth, -2, -130);
    ctx.fillText('attempts remaining: ' + A.tries, -2, -112);
    // ruled lines
    ctx.strokeStyle = 'rgba(90,80,100,0.22)'; ctx.lineWidth = 1;
    for (let y = -92; y < -30; y += 16) { ctx.beginPath(); ctx.moveTo(-206, y); ctx.lineTo(230, y); ctx.stroke(); }
    ctx.font = 'italic 11px "Trebuchet MS",sans-serif'; ctx.fillStyle = '#8a8292'; ctx.textAlign = 'left';
    ctx.fillText('"I was getting better, actually. The symptoms were circumstantial.', -206, -80);
    ctx.fillText('  I have witnesses (they are also symptoms)."', -206, -64);
    ctx.textAlign = 'center';
    // ---- the meter ----
    const MW = 380, MY = 20;
    ctx.fillStyle = '#d8d0c0'; this.rr(ctx, -MW / 2 - 6, MY - 20, MW + 12, 40, 8); ctx.fill();
    ctx.strokeStyle = '#8a8272'; ctx.lineWidth = 2; this.rr(ctx, -MW / 2 - 6, MY - 20, MW + 12, 40, 8); ctx.stroke();
    // green zone
    const zx = -MW / 2 + A.zoneC * MW, zw = A.zoneW * MW;
    ctx.fillStyle = 'rgba(120,190,90,0.85)'; this.rr(ctx, zx - zw / 2, MY - 16, zw, 32, 5); ctx.fill();
    ctx.fillStyle = '#2c5a33'; ctx.font = 'bold 11px Impact,"Arial Black",sans-serif';
    ctx.fillText('APPROVED', zx, MY + 4);
    // missed stamps
    for (const s of A.stamps) {
      const sx2 = -MW / 2 + s * MW;
      ctx.save(); ctx.translate(sx2, MY); ctx.rotate(-0.3);
      ctx.strokeStyle = 'rgba(170,50,50,0.8)'; ctx.lineWidth = 2;
      this.rr(ctx, -28, -11, 56, 22, 3); ctx.stroke();
      ctx.fillStyle = 'rgba(170,50,50,0.8)'; ctx.font = 'bold 12px Impact,"Arial Black",sans-serif';
      ctx.fillText('DENIED', 0, 4);
      ctx.restore();
    }
    // the needle
    const nx = -MW / 2 + A.needle * MW;
    ctx.fillStyle = '#3a3342';
    ctx.beginPath(); ctx.moveTo(nx, MY - 26); ctx.lineTo(nx - 7, MY - 38); ctx.lineTo(nx + 7, MY - 38); ctx.closePath(); ctx.fill();
    ctx.fillRect(nx - 1.5, MY - 26, 3, 52);
    // resolution stamp
    if (A.result) {
      const k = U.clamp(1 - A.doneT / (A.result === 'won' ? 1.4 : 1.6), 0, 1);
      const sc = 2.2 - k * 1.2;
      ctx.save(); ctx.translate(0, 110); ctx.rotate(-0.18); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, k * 2.5);
      const col = A.result === 'won' ? '#2c7a3a' : '#a02c2c';
      ctx.strokeStyle = col; ctx.lineWidth = 4; this.rr(ctx, -105, -26, 210, 52, 6); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 38px Impact,"Arial Black",sans-serif';
      ctx.fillText(A.result === 'won' ? 'OVERTURNED' : 'UPHELD', 0, 13);
      ctx.restore();
    } else {
      ctx.fillStyle = '#6a6272'; ctx.font = 'bold 13px "Trebuchet MS","Segoe UI",sans-serif';
      ctx.fillText('stamp it in the green — SPACE / ⚡ / tap', 0, 92);
      ctx.font = 'italic 10px "Trebuchet MS",sans-serif'; ctx.fillStyle = '#9a8a92';
      ctx.fillText('(the fee was ' + (G._appealFee || 0) + '¢. the fee is non-refundable. the fee was everything.)', 0, 112);
    }
    ctx.restore();
    // coffee ring, for authenticity
    ctx.strokeStyle = 'rgba(140,100,60,0.18)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(CW / 2 + 200, CH / 2 + 130, 26, 0, TAU); ctx.stroke();
  },

  /* ============ The Waiting Room (walkable hub) ============ */
  drawHub(G) {
    const ctx = this.ctx, H = G.hub;
    if (!H) return;
    const WALL = 268;
    // ---- walls: two-tone with a wainscot rail ----
    const wg = ctx.createLinearGradient(0, 0, 0, 210);
    wg.addColorStop(0, '#dcebe7'); wg.addColorStop(1, '#bcd6d0');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, CW, 210);
    const wg2 = ctx.createLinearGradient(0, 210, 0, WALL);
    wg2.addColorStop(0, '#a3bdb6'); wg2.addColorStop(1, '#93aca6');
    ctx.fillStyle = wg2; ctx.fillRect(0, 210, CW, WALL - 210);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 208, CW, 3);   // chair rail
    ctx.strokeStyle = 'rgba(120,145,138,0.35)'; ctx.lineWidth = 1.5;        // wainscot panels
    for (let x = 40; x < CW; x += 80) { ctx.beginPath(); ctx.moveTo(x, 216); ctx.lineTo(x, WALL - 8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, WALL - 6, CW, 6);   // baseboard
    ctx.fillStyle = 'rgba(40,30,45,0.18)'; ctx.fillRect(0, WALL, CW, 4);
    // ---- floor: warm tile + soft checker ----
    const fg = ctx.createLinearGradient(0, WALL, 0, CH);
    fg.addColorStop(0, '#cec2a6'); fg.addColorStop(1, '#a99b7e');
    ctx.fillStyle = fg; ctx.fillRect(0, WALL, CW, CH - WALL);
    for (let ty = 0; ty < 9; ty++) for (let tx = 0; tx < 12; tx++) {
      if ((tx + ty) % 2) continue;
      ctx.fillStyle = 'rgba(255,250,235,0.06)';
      ctx.fillRect(tx * 80, WALL + ty * 48, 80, 48);
    }
    ctx.strokeStyle = 'rgba(120,105,80,0.13)'; ctx.lineWidth = 1;
    for (let x = 0; x <= CW; x += 80) { ctx.beginPath(); ctx.moveTo(x, WALL); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = WALL; y < CH; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
    // rug under the seating area
    ctx.fillStyle = 'rgba(94,140,132,0.5)'; this.rr(ctx, 130, 276, 460, 180, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(60,100,92,0.55)'; ctx.lineWidth = 3; this.rr(ctx, 130, 276, 460, 180, 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,240,235,0.3)'; ctx.lineWidth = 1.5; this.rr(ctx, 142, 288, 436, 156, 14); ctx.stroke();
    // ---- ceiling light pools ----
    for (let i = 0; i < 3; i++) {
      const lx = CW * (0.22 + i * 0.28);
      const lg = ctx.createRadialGradient(lx, 30, 8, lx, 30, 200);
      lg.addColorStop(0, 'rgba(255,250,225,0.4)'); lg.addColorStop(1, 'rgba(255,250,225,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, 30, 200, 0, TAU); ctx.fill();
    }
    // wall clock (left) + PLEASE WAIT sign (right)
    ctx.fillStyle = '#f4f6f2'; ctx.beginPath(); ctx.arc(64, 74, 22, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a6a70'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(64, 74, 22, 0, TAU); ctx.stroke();
    const mins = (G.t || 0) * 0.05;
    ctx.strokeStyle = '#3a4a50'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(64, 74); ctx.lineTo(64 + Math.cos(mins) * 13, 74 + Math.sin(mins) * 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(64, 74); ctx.lineTo(64, 62); ctx.stroke();
    ctx.fillStyle = '#efe6cc'; this.rr(ctx, CW - 148, 56, 120, 34, 6); ctx.fill();
    ctx.strokeStyle = '#a8926a'; ctx.lineWidth = 2; this.rr(ctx, CW - 148, 56, 120, 34, 6); ctx.stroke();
    ctx.fillStyle = '#7a6a4a'; ctx.font = 'bold 14px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PLEASE WAIT', CW - 88, 78);
    // potted plants flanking reception
    for (const px of [352, 608]) {
      ctx.fillStyle = '#a06a48'; ctx.beginPath(); ctx.moveTo(px - 13, WALL - 2); ctx.lineTo(px + 13, WALL - 2); ctx.lineTo(px + 9, WALL - 26); ctx.lineTo(px - 9, WALL - 26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a7a52'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      for (let l = 0; l < 5; l++) {
        const a = -Math.PI / 2 + (l - 2) * 0.42 + Math.sin((G.t || 0) * 1.2 + l) * 0.04;
        ctx.beginPath(); ctx.moveTo(px, WALL - 24);
        ctx.quadraticCurveTo(px + Math.cos(a) * 14, WALL - 42, px + Math.cos(a) * 24, WALL - 30 - Math.abs(Math.sin(a)) * 26);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    // ---- stations ----
    for (const s of G.hub.stations) {
      const near = H.prompt === s;
      if (near) {   // soft gold welcome mat under whatever you're near
        const gg = ctx.createRadialGradient(s.x, Math.max(s.y, WALL + 16), 6, s.x, Math.max(s.y, WALL + 16), 56);
        gg.addColorStop(0, 'rgba(232,200,76,0.30)'); gg.addColorStop(1, 'rgba(232,200,76,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(s.x, Math.max(s.y, WALL + 16), 56, 20, 0, 0, TAU); ctx.fill();
      }
      if (s.label.includes('DAILY') || s.label.includes('PROTOCOLS')) {   // framed wall doors
        ctx.fillStyle = '#5f7280'; this.rr(ctx, s.x - 50, 26, 100, 160, 6); ctx.fill();   // frame
        ctx.fillStyle = near ? '#87a5b5' : '#71828f';
        this.rr(ctx, s.x - 43, 32, 86, 150, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
        this.rr(ctx, s.x - 33, 44, 66, 56, 4); ctx.stroke();   // upper panel
        this.rr(ctx, s.x - 33, 112, 66, 56, 4); ctx.stroke();  // lower panel
        ctx.fillStyle = 'rgba(230,240,250,0.92)'; this.rr(ctx, s.x - 24, 50, 48, 44, 4); ctx.fill();   // window
        ctx.strokeStyle = 'rgba(120,140,155,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s.x, 50); ctx.lineTo(s.x, 94); ctx.stroke();
        ctx.fillStyle = '#c8c8d0'; this.rr(ctx, s.x - 42, 172, 84, 8, 2); ctx.fill();   // kick plate
        ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(s.x + 30, 128, 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#efe6cc'; this.rr(ctx, s.x - 44, 2, 88, 20, 5); ctx.fill();   // sign plate
        ctx.strokeStyle = '#a8926a'; ctx.lineWidth = 1.5; this.rr(ctx, s.x - 44, 2, 88, 20, 5); ctx.stroke();
        ctx.fillStyle = '#7a6a4a'; ctx.font = 'bold 12px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(s.label.replace(/^\S+ /, ''), s.x, 17);
      } else if (s.label.includes('CHECKUP')) {   // reception: counter, bell, monitor, the doctor
        const gl = ctx.createRadialGradient(s.x, s.y - 50, 12, s.x, s.y - 50, 120);
        gl.addColorStop(0, 'rgba(255,244,214,0.35)'); gl.addColorStop(1, 'rgba(255,244,214,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(s.x, s.y - 50, 120, 0, TAU); ctx.fill();
        this.drawWalrusFace(ctx, s.x, s.y - 56, 0.62, G.t);
        ctx.fillStyle = '#7d5a38'; this.rr(ctx, s.x - 118, s.y - 8, 236, 62, 10); ctx.fill();   // desk body
        ctx.strokeStyle = 'rgba(60,40,20,0.4)'; ctx.lineWidth = 2;
        this.rr(ctx, s.x - 104, s.y + 4, 66, 40, 5); ctx.stroke();   // front panels
        this.rr(ctx, s.x - 32, s.y + 4, 66, 40, 5); ctx.stroke();
        this.rr(ctx, s.x + 40, s.y + 4, 64, 40, 5); ctx.stroke();
        const dg = ctx.createLinearGradient(0, s.y - 22, 0, s.y - 4);
        dg.addColorStop(0, '#a8875c'); dg.addColorStop(1, '#8a6a44');
        ctx.fillStyle = dg; this.rr(ctx, s.x - 126, s.y - 22, 252, 20, 8); ctx.fill();   // counter top
        ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(s.x - 86, s.y - 26, 6, Math.PI, TAU); ctx.fill();   // the bell
        ctx.fillStyle = '#c8a24a'; this.rr(ctx, s.x - 92, s.y - 26, 12, 3, 1.5); ctx.fill();
        ctx.fillStyle = '#3a4453'; this.rr(ctx, s.x + 62, s.y - 44, 34, 24, 3); ctx.fill();   // monitor
        ctx.fillStyle = '#8fc0d8'; this.rr(ctx, s.x + 65, s.y - 41, 28, 18, 2); ctx.fill();
        ctx.fillStyle = '#f4eee0';   // loose papers
        ctx.save(); ctx.translate(s.x - 40, s.y - 24); ctx.rotate(-0.08); this.rr(ctx, -12, -8, 24, 16, 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#efe6cc'; this.rr(ctx, s.x - 64, s.y - 112, 128, 24, 5); ctx.fill();
        ctx.strokeStyle = '#a8926a'; ctx.lineWidth = 1.5; this.rr(ctx, s.x - 64, s.y - 112, 128, 24, 5); ctx.stroke();
        ctx.fillStyle = '#7a6a4a'; ctx.font = 'bold 13px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('RECEPTION', s.x, s.y - 95);
      } else if (s.label.includes('HISTORY')) {   // stats poster with tiny bars
        ctx.save(); ctx.translate(s.x, s.y - 40); ctx.rotate(-0.02);
        ctx.fillStyle = 'rgba(40,30,45,0.18)'; this.rr(ctx, -36, -26, 76, 62, 3); ctx.fill();
        ctx.fillStyle = near ? '#f8f2e0' : '#f1e9d2'; this.rr(ctx, -40, -30, 76, 62, 3); ctx.fill();
        ctx.strokeStyle = '#a8926a'; ctx.lineWidth = 2.5; this.rr(ctx, -40, -30, 76, 62, 3); ctx.stroke();
        ctx.fillStyle = '#8a7a58'; ctx.font = 'bold 9px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('YOUR NUMBERS', -2, -18);
        const bars = [14, 26, 9, 32, 20];
        bars.forEach((b, i) => { ctx.fillStyle = ['#5a9de0', '#8fd05a', '#e8c84c', '#e05a6a', '#b86bff'][i]; ctx.fillRect(-30 + i * 13, 24 - b, 9, b); });
        ctx.restore();
      } else if (s.label.includes('UNLOCKS')) {   // corkboard with pinned notes
        ctx.save(); ctx.translate(s.x, s.y - 40); ctx.rotate(0.02);
        ctx.fillStyle = '#b08a5c'; this.rr(ctx, -42, -32, 84, 66, 4); ctx.fill();
        ctx.fillStyle = '#c9a271'; this.rr(ctx, -37, -27, 74, 56, 3); ctx.fill();
        [[-20, -10, -0.1, '#f4eee0'], [8, -6, 0.12, '#e8f0d8'], [-6, 12, -0.06, '#f0e0e8']].forEach(n => {
          ctx.save(); ctx.translate(n[0], n[1]); ctx.rotate(n[2]);
          ctx.fillStyle = n[3]; this.rr(ctx, -11, -9, 22, 18, 1.5); ctx.fill();
          ctx.fillStyle = '#d04040'; ctx.beginPath(); ctx.arc(0, -7, 2.2, 0, TAU); ctx.fill();
          ctx.restore();
        });
        ctx.fillStyle = '#f4eee0'; ctx.font = this.font(13, true); ctx.textAlign = 'center'; ctx.fillText('🏆', 24, 20);
        ctx.restore();
      } else if (s.label.includes('PROGNOSIS')) {   // a card table with dice
        this.shadow(s.x, s.y + 36, 34, 9, 0.2);
        ctx.fillStyle = '#7d5a38'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, 36, 15, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8fa87a'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 33, 13, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5a4428'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(s.x - 18, s.y + 14); ctx.lineTo(s.x - 22, s.y + 38); ctx.moveTo(s.x + 18, s.y + 14); ctx.lineTo(s.x + 22, s.y + 38); ctx.stroke();
        [[-8, -4, -0.2], [7, 0, 0.25]].forEach(d => {
          ctx.save(); ctx.translate(s.x + d[0], s.y + d[1]); ctx.rotate(d[2]);
          ctx.fillStyle = '#f6f2e8'; this.rr(ctx, -6, -6, 12, 12, 3); ctx.fill();
          ctx.strokeStyle = '#b8b0a0'; ctx.lineWidth = 1; this.rr(ctx, -6, -6, 12, 12, 3); ctx.stroke();
          ctx.fillStyle = '#3a3040'; ctx.beginPath(); ctx.arc(-2, -2, 1.3, 0, TAU); ctx.arc(2.5, 2.5, 1.3, 0, TAU); ctx.fill();
          ctx.restore();
        });
      } else if (s.label.includes('TREATMENT')) {   // an easel with the brain chart
        ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x - 20, s.y + 42); ctx.lineTo(s.x, s.y - 34); ctx.lineTo(s.x + 20, s.y + 42); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x - 11, s.y + 14); ctx.lineTo(s.x + 11, s.y + 14); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = near ? '#f8f2e0' : '#f1e9d2'; this.rr(ctx, s.x - 26, s.y - 30, 52, 44, 3); ctx.fill();
        ctx.strokeStyle = '#a8926a'; ctx.lineWidth = 2; this.rr(ctx, s.x - 26, s.y - 30, 52, 44, 3); ctx.stroke();
        ctx.fillStyle = '#e8a0b8'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 10, 14, 11, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c07898'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s.x, s.y - 20); ctx.lineTo(s.x, s.y); ctx.moveTo(s.x - 9, s.y - 14); ctx.quadraticCurveTo(s.x, s.y - 8, s.x + 9, s.y - 14); ctx.stroke();
      } else if (s.label.includes('CHART NOTES')) {   // bookshelf
        ctx.fillStyle = '#6a4e30'; this.rr(ctx, s.x - 34, s.y - 46, 68, 92, 6); ctx.fill();
        ctx.fillStyle = '#584024'; this.rr(ctx, s.x - 28, s.y - 40, 56, 36, 3); ctx.fill();
        this.rr(ctx, s.x - 28, s.y + 2, 56, 36, 3); ctx.fill();
        const spines = ['#a05a5a', '#5a7aa0', '#7aa05a', '#c8a24a', '#8a6aa0', '#5aa08a'];
        for (let sh = 0; sh < 2; sh++) for (let b = 0; b < 6; b++) {
          ctx.fillStyle = spines[(sh * 2 + b) % spines.length];
          const bh = 26 + ((b * 7 + sh * 3) % 8);
          ctx.fillRect(s.x - 25 + b * 9, s.y - 6 + sh * 42 - bh, 7, bh);
        }
      } else if (s.label.includes('BESTIARY')) {   // a grim framed portrait
        ctx.fillStyle = '#2c2430'; this.rr(ctx, s.x - 30, s.y - 44, 60, 78, 4); ctx.fill();
        ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 4; this.rr(ctx, s.x - 30, s.y - 44, 60, 78, 4); ctx.stroke();
        const gl2 = ctx.createRadialGradient(s.x, s.y - 8, 4, s.x, s.y - 8, 34);
        gl2.addColorStop(0, 'rgba(200,176,224,0.3)'); gl2.addColorStop(1, 'rgba(200,176,224,0)');
        ctx.fillStyle = gl2; ctx.fillRect(s.x - 26, s.y - 40, 52, 70);
        ctx.fillStyle = '#e8e0d0'; ctx.font = this.font(24, true); ctx.textAlign = 'center';
        ctx.fillText('☠', s.x, s.y + 2);
        ctx.fillStyle = '#c8a24a'; this.rr(ctx, s.x - 18, s.y + 24, 36, 8, 2); ctx.fill();
      } else if (s.label.includes('SETTINGS')) {   // the janitor's closet
        ctx.fillStyle = '#8a8a92'; this.rr(ctx, s.x - 26, s.y - 46, 52, 92, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(60,60,70,0.5)'; ctx.lineWidth = 2; this.rr(ctx, s.x - 26, s.y - 46, 52, 92, 5); ctx.stroke();
        ctx.fillStyle = '#5a5a64'; this.rr(ctx, s.x - 18, s.y - 38, 36, 30, 3); ctx.fill();   // vent
        ctx.strokeStyle = '#8a8a92'; ctx.lineWidth = 2;
        for (let v = 0; v < 4; v++) { ctx.beginPath(); ctx.moveTo(s.x - 14, s.y - 32 + v * 6); ctx.lineTo(s.x + 14, s.y - 32 + v * 6); ctx.stroke(); }
        ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(s.x + 16, s.y + 8, 3.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 3;   // the mop
        ctx.beginPath(); ctx.moveTo(s.x - 38, s.y + 44); ctx.lineTo(s.x - 30, s.y - 30); ctx.stroke();
        ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let m = 0; m < 5; m++) { ctx.beginPath(); ctx.moveTo(s.x - 38, s.y + 42); ctx.lineTo(s.x - 44 + m * 3, s.y + 54); ctx.stroke(); }
        ctx.lineCap = 'butt';
        ctx.fillStyle = '#f4eee0'; ctx.font = this.font(13); ctx.textAlign = 'center'; ctx.fillText('⚙', s.x, s.y + 34);
      } else if (s.label.includes('FRONT DOOR')) {   // the way out. it was always right there.
        const ready = !s.label.includes('🔒');
        ctx.save(); ctx.translate(s.x, Math.min(s.y, CH - 26));
        if (ready) {   // light leaks around the frame
          const gg2 = ctx.createRadialGradient(0, 0, 8, 0, 0, 90);
          gg2.addColorStop(0, 'rgba(255,244,190,0.5)'); gg2.addColorStop(1, 'rgba(255,244,190,0)');
          ctx.fillStyle = gg2; ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#5a4a38'; this.rr(ctx, -46, -22, 92, 44, 5); ctx.fill();   // threshold
        ctx.fillStyle = ready ? '#e8ddc0' : '#4e4238';
        this.rr(ctx, -40, -18, 38, 36, 3); ctx.fill(); this.rr(ctx, 2, -18, 38, 36, 3); ctx.fill();   // double doors (top-down mat)
        ctx.strokeStyle = 'rgba(40,32,24,0.6)'; ctx.lineWidth = 2;
        this.rr(ctx, -40, -18, 38, 36, 3); ctx.stroke(); this.rr(ctx, 2, -18, 38, 36, 3); ctx.stroke();
        if (!ready) {   // chained
          ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(34, 10); ctx.stroke();
          ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = '#3a3020'; ctx.fillRect(-1.5, -1, 3, 4);
        } else {
          ctx.fillStyle = 'rgba(255,250,220,' + (0.5 + Math.sin(G.t * 3) * 0.25) + ')';
          ctx.fillRect(-2, -18, 4, 36);   // the light between the doors
        }
        ctx.restore();
        ctx.fillStyle = ready ? '#e8c84c' : '#8a8078'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText(ready ? 'EXIT' : 'STAFF WILL NOT OPEN THIS', s.x, Math.min(s.y, CH - 26) - 28);
      } else if (s.label.includes('WELLNESS')) {   // the donation jar. it's always been here. donate.
        this.shadow(s.x, s.y + 30, 22, 7, 0.2);
        ctx.fillStyle = '#8a6a48'; this.rr(ctx, s.x - 20, s.y + 8, 40, 22, 4); ctx.fill();   // little stand
        ctx.fillStyle = '#6a5038'; this.rr(ctx, s.x - 20, s.y + 8, 40, 6, 3); ctx.fill();
        ctx.fillStyle = 'rgba(190,220,230,0.5)'; this.rr(ctx, s.x - 14, s.y - 28, 28, 38, 6); ctx.fill();   // the jar
        ctx.strokeStyle = 'rgba(120,150,160,0.8)'; ctx.lineWidth = 2; this.rr(ctx, s.x - 14, s.y - 28, 28, 38, 6); ctx.stroke();
        ctx.fillStyle = '#c8b090'; this.rr(ctx, s.x - 16, s.y - 34, 32, 7, 3); ctx.fill();   // lid with slot
        ctx.fillStyle = '#3a3028'; ctx.fillRect(s.x - 7, s.y - 32, 14, 2.5);
        const lvl = Math.min(1, (Meta.data.fund || 0) / 300);   // it fills as the fund grows
        if (lvl > 0.02) {
          ctx.fillStyle = 'rgba(232,200,76,0.85)';
          const hh = 30 * lvl;
          this.rr(ctx, s.x - 12, s.y + 8 - hh, 24, hh, 3); ctx.fill();
          ctx.fillStyle = 'rgba(200,160,50,0.9)';
          for (let c2 = 0; c2 < Math.min(5, 1 + lvl * 5); c2++) { ctx.beginPath(); ctx.ellipse(s.x - 8 + c2 * 4.5, s.y + 5 - hh + (c2 % 2) * 2.4, 3.4, 1.5, 0.2, 0, TAU); ctx.fill(); }
        }
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, s.x - 15, s.y - 14, 30, 11, 2); ctx.fill();   // taped label
        ctx.fillStyle = '#7a5a3a'; ctx.font = this.font(7, true); ctx.textAlign = 'center'; ctx.fillText('WELLNESS', s.x, s.y - 6);
        ctx.fillStyle = '#f4eee0'; ctx.font = this.font(12); ctx.fillText('🫙', s.x, s.y + 46);
      } else if (s.label.includes('BREAKROOM')) {   // the cabinet: PILL CATCHER, 2¢, no refunds
        this.shadow(s.x, s.y + 40, 26, 8, 0.22);
        ctx.fillStyle = '#7a3a8a'; this.rr(ctx, s.x - 24, s.y - 46, 48, 86, 6); ctx.fill();   // cabinet body
        ctx.strokeStyle = '#4a2456'; ctx.lineWidth = 2.5; this.rr(ctx, s.x - 24, s.y - 46, 48, 86, 6); ctx.stroke();
        ctx.fillStyle = '#e8c84c'; this.rr(ctx, s.x - 20, s.y - 42, 40, 10, 3); ctx.fill();   // marquee
        ctx.fillStyle = '#7a3a2a'; ctx.font = 'bold 6px "Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('PILL CATCHER', s.x, s.y - 34.5);
        ctx.fillStyle = '#0a1408'; this.rr(ctx, s.x - 17, s.y - 28, 34, 30, 3); ctx.fill();   // screen
        const fall = (G.t * 26) % 26;   // attract mode: a pill falls forever
        ctx.fillStyle = '#e05a6a'; ctx.beginPath(); ctx.arc(s.x - 4 + Math.sin(G.t) * 6, s.y - 26 + fall, 2.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8fd05a'; ctx.fillRect(s.x - 8 + Math.sin(G.t * 1.3) * 7, s.y - 2, 10, 2.5);   // the little dish
        ctx.fillStyle = 'rgba(120,255,120,0.09)';
        for (let ly = s.y - 28; ly < s.y + 2; ly += 3) ctx.fillRect(s.x - 17, ly, 34, 1.4);
        ctx.fillStyle = '#5a2a66'; this.rr(ctx, s.x - 17, s.y + 6, 34, 12, 3); ctx.fill();    // control deck
        ctx.fillStyle = '#e05a5a'; ctx.beginPath(); ctx.arc(s.x + 8, s.y + 12, 3.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2c2333'; this.rr(ctx, s.x - 12, s.y + 10, 8, 4, 2); ctx.fill();     // stick base
        ctx.strokeStyle = '#c8c8d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - 8, s.y + 11); ctx.lineTo(s.x - 6, s.y + 4); ctx.stroke();
        ctx.fillStyle = '#f4eee0'; this.rr(ctx, s.x - 10, s.y + 24, 20, 8, 2); ctx.fill();    // the rival's taped score
        ctx.fillStyle = '#a03030'; ctx.font = 'bold 5px "Arial Black",sans-serif';
        ctx.fillText((typeof Meta !== 'undefined' && Meta.data.rival ? Meta.data.rival.name.slice(0, 6) : 'RIVAL') + ': ' + (G.arcadeRivalScore ? G.arcadeRivalScore() : '???'), s.x, s.y + 29.5);
        ctx.fillStyle = '#f4eee0'; ctx.font = this.font(11); ctx.fillText('🕹', s.x, s.y + 52);
      } else if (s.label.includes('GIFT')) {   // the gift shop cart — the markup funds the aquarium
        this.shadow(s.x, s.y + 34, 34, 9, 0.2);
        ctx.fillStyle = '#a05a6a'; this.rr(ctx, s.x - 30, s.y - 6, 60, 34, 6); ctx.fill();   // cart body
        ctx.strokeStyle = '#7a3a4a'; ctx.lineWidth = 2; this.rr(ctx, s.x - 30, s.y - 6, 60, 34, 6); ctx.stroke();
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, s.x - 26, s.y - 2, 52, 12, 3); ctx.fill();   // shelf of cards
        for (let c2 = 0; c2 < 4; c2++) { ctx.fillStyle = ['#e8a0c8', '#8fd0e0', '#e8c84c', '#b8e0a0'][c2]; this.rr(ctx, s.x - 23 + c2 * 13, s.y - 1, 10, 10, 1.5); ctx.fill(); }
        ctx.fillStyle = '#4a3038'; ctx.beginPath(); ctx.arc(s.x - 18, s.y + 32, 5, 0, TAU); ctx.arc(s.x + 18, s.y + 32, 5, 0, TAU); ctx.fill();   // wheels
        for (let b2 = 0; b2 < 3; b2++) {   // the balloon bundle
          const ba = -0.5 + b2 * 0.5, bl = 34 + (b2 % 2) * 7;
          const bx2 = s.x + 20 + Math.sin(ba) * 14 + Math.sin(G.t * 1.4 + b2) * 2;
          const by2 = s.y - 6 - bl + Math.sin(G.t * 1.8 + b2 * 2) * 2;
          ctx.strokeStyle = 'rgba(120,100,120,0.6)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(s.x + 22, s.y - 4); ctx.quadraticCurveTo(bx2, by2 + 20, bx2, by2 + 9); ctx.stroke();
          ctx.fillStyle = ['#e05a6a', '#e8c84c', '#8fd0e0'][b2];
          ctx.beginPath(); ctx.ellipse(bx2, by2, 7, 8.5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(bx2 - 2, by2 - 2.5, 2, 2.8, -0.4, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#b8a0a8';   // a small plush walrus on duty
        ctx.beginPath(); ctx.ellipse(s.x - 16, s.y - 11, 8, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f0ead8'; ctx.fillRect(s.x - 19, s.y - 9, 1.6, 4); ctx.fillRect(s.x - 16, s.y - 9, 1.6, 4);
        ctx.fillStyle = '#efe6cc'; this.rr(ctx, s.x - 32, s.y - 30, 64, 14, 4); ctx.fill();   // sign
        ctx.strokeStyle = '#a8926a'; ctx.lineWidth = 1.5; this.rr(ctx, s.x - 32, s.y - 30, 64, 14, 4); ctx.stroke();
        ctx.fillStyle = '#7a6a4a'; ctx.font = 'bold 9px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('GIFT SHOPPE', s.x, s.y - 20);
      } else if (s.label.includes('DIARY')) {   // the coffee table, and the journal that lives there
        this.shadow(s.x, s.y + 26, 40, 10, 0.2);
        ctx.fillStyle = '#7d5a38'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 46, 19, 0, 0, TAU); ctx.fill();   // table top
        ctx.fillStyle = '#93683f'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, 43, 17, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5a4428'; ctx.lineWidth = 3;   // legs
        ctx.beginPath(); ctx.moveTo(s.x - 26, s.y + 18); ctx.lineTo(s.x - 30, s.y + 40); ctx.moveTo(s.x + 26, s.y + 18); ctx.lineTo(s.x + 30, s.y + 40); ctx.stroke();
        ctx.save(); ctx.translate(s.x - 2, s.y - 2); ctx.rotate(-0.09);   // the journal
        ctx.fillStyle = '#6a4a7a'; this.rr(ctx, -17, -12, 34, 24, 3); ctx.fill();
        ctx.fillStyle = '#8a6a9a'; this.rr(ctx, -17, -12, 8, 24, 3); ctx.fill();   // spine
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, -6, -8, 19, 16, 1.5); ctx.fill();  // pages peeking
        ctx.strokeStyle = 'rgba(90,70,100,0.5)'; ctx.lineWidth = 1;
        for (let l = -4; l <= 4; l += 4) { ctx.beginPath(); ctx.moveTo(-3, l); ctx.lineTo(10, l); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = '#3a3040'; ctx.lineWidth = 2; ctx.lineCap = 'round';   // a pen, mid-thought
        ctx.beginPath(); ctx.moveTo(s.x + 18, s.y - 8); ctx.lineTo(s.x + 28, s.y - 14); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = '#f4eee0'; ctx.font = this.font(11); ctx.textAlign = 'center'; ctx.fillText('📔', s.x, s.y + 38);
      } else {   // PATIENT CHART: filing cabinet
        ctx.fillStyle = '#9aa0aa'; this.rr(ctx, s.x - 26, s.y - 46, 52, 92, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(60,64,74,0.5)'; ctx.lineWidth = 2; this.rr(ctx, s.x - 26, s.y - 46, 52, 92, 5); ctx.stroke();
        for (let d = 0; d < 3; d++) {
          ctx.strokeStyle = 'rgba(60,64,74,0.55)'; ctx.lineWidth = 1.5;
          this.rr(ctx, s.x - 20, s.y - 40 + d * 29, 40, 24, 3); ctx.stroke();
          ctx.fillStyle = '#5a606a'; this.rr(ctx, s.x - 8, s.y - 31 + d * 29, 16, 4, 2); ctx.fill();
        }
        ctx.fillStyle = '#f4eee0'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('📋', s.x, s.y + 40);
      }
    }
    // ---- the chairs + seated patients ----
    const seatClrs = ['#7a8a99', '#8a7a99'];
    G.hub.seats.forEach((seat, i) => {
      this.shadow(seat.x, seat.y + 24, 20, 6, 0.18);
      const c = seatClrs[i % 2];
      ctx.fillStyle = this.shade(c, -0.15);
      this.rr(ctx, seat.x - 19, seat.y - 26, 38, 26, 7); ctx.fill();          // back rest
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      this.rr(ctx, seat.x - 15, seat.y - 23, 30, 7, 4); ctx.fill();
      ctx.fillStyle = c; this.rr(ctx, seat.x - 20, seat.y + 8, 40, 11, 5); ctx.fill();   // seat
      ctx.strokeStyle = '#4a4038'; ctx.lineWidth = 3;                          // legs
      ctx.beginPath(); ctx.moveTo(seat.x - 15, seat.y + 19); ctx.lineTo(seat.x - 17, seat.y + 30); ctx.moveTo(seat.x + 15, seat.y + 19); ctx.lineTo(seat.x + 17, seat.y + 30); ctx.stroke();
      ctx.save(); ctx.translate(seat.x, seat.y - 3); ctx.scale(1.02, 1.02);
      seat.pl.x = 0; seat.pl.y = 0;
      try { this.drawPlayer(seat.pl, { t: G.t }); } catch (e) { }
      ctx.restore();
    });
    // ---- commissary corner ----
    ctx.save(); ctx.translate(CW - 118, CH - 96);
    this.shadow(0, 40, 30, 8, 0.22);
    ctx.fillStyle = '#b04848'; this.rr(ctx, -24, -38, 48, 74, 5); ctx.fill();
    ctx.strokeStyle = '#7a2e2e'; ctx.lineWidth = 2; this.rr(ctx, -24, -38, 48, 74, 5); ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,240,0.85)'; this.rr(ctx, -18, -32, 26, 42, 3); ctx.fill();
    for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 3; c2++) {
      ctx.fillStyle = ['#e8c84c', '#8fd05a', '#b86bff', '#e0a05a', '#5a9de0', '#e05a6a'][(r2 * 3 + c2) % 6];
      this.rr(ctx, -15 + c2 * 8, -29 + r2 * 13, 6, 9, 1.5); ctx.fill();
    }
    ctx.fillStyle = '#2c2333'; this.rr(ctx, 12, -28, 8, 24, 2); ctx.fill();
    ctx.restore();
    // ---- Facility Improvements: what the Wellness Fund actually bought ----
    const fac = (typeof Meta !== 'undefined' && Meta.data.facility) || {};
    if (fac.aquarium) {   // wall tank, left of the DAILY door
      ctx.save(); ctx.translate(105, 148);
      ctx.fillStyle = '#3a5a6a'; this.rr(ctx, -44, -26, 88, 52, 6); ctx.fill();
      ctx.fillStyle = '#5a98b8'; this.rr(ctx, -39, -21, 78, 42, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; this.rr(ctx, -39, -21, 78, 12, 4); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const fx2 = ((G.t * (14 + i * 6) + i * 90) % 116) - 58, fy2 = -8 + i * 12 + Math.sin(G.t * 2 + i) * 3;
        const dir = Math.floor((G.t * (14 + i * 6) + i * 90) / 116) % 2 ? -1 : 1;
        ctx.save(); ctx.translate(U.clamp(fx2 * dir, -34, 34), fy2); ctx.scale(dir, 1);
        ctx.fillStyle = ['#e8a05a', '#e8d05a', '#e05a8a'][i];
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-8, -3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = '#2a4048'; ctx.lineWidth = 3; this.rr(ctx, -44, -26, 88, 52, 6); ctx.stroke();
      ctx.restore();
    }
    if (fac.tv) {   // wall television. it's the weather. it's always the weather.
      ctx.save(); ctx.translate(868, 150);
      ctx.fillStyle = '#1c1822'; this.rr(ctx, -40, -24, 80, 48, 4); ctx.fill();
      const tvg = ctx.createLinearGradient(0, -20, 0, 20);
      tvg.addColorStop(0, '#6a90b0'); tvg.addColorStop(1, '#3a5a78');
      ctx.fillStyle = tvg; this.rr(ctx, -36, -20, 72, 40, 3); ctx.fill();
      ctx.fillStyle = '#e8d05a'; ctx.beginPath(); ctx.arc(-20, -8, 6, 0, TAU); ctx.fill();   // sun
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(8, -4 + Math.sin(G.t) * 1.5, 12, 5, 0, 0, TAU); ctx.ellipse(20, -2, 9, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,16,26,0.55)'; this.rr(ctx, -36, 8, 72, 12, 2); ctx.fill();
      ctx.fillStyle = '#f0e8d8'; ctx.font = this.font(7, true); ctx.textAlign = 'center'; ctx.fillText('72° OUT THERE', 0, 17);
      ctx.strokeStyle = '#0d0a12'; ctx.lineWidth = 3; this.rr(ctx, -40, -24, 80, 48, 4); ctx.stroke();
      ctx.restore();
    }
    if (fac.coffee) {   // the decaf machine, floor right of the rug
      ctx.save(); ctx.translate(700, 563);
      this.shadow(0, 34, 22, 7, 0.2);
      ctx.fillStyle = '#4a4454'; this.rr(ctx, -18, -34, 36, 64, 5); ctx.fill();
      ctx.fillStyle = '#2c2836'; this.rr(ctx, -13, -28, 26, 20, 3); ctx.fill();
      ctx.fillStyle = '#e8c84c'; ctx.font = this.font(9, true); ctx.textAlign = 'center'; ctx.fillText('☕', 0, -14);
      ctx.fillStyle = '#6a6474'; this.rr(ctx, -10, -2, 20, 12, 2); ctx.fill();
      ctx.fillStyle = '#f0ead8'; this.rr(ctx, -4, 2, 8, 8, 1); ctx.fill();   // cup
      const stm = Math.sin(G.t * 3) * 2;
      ctx.strokeStyle = 'rgba(240,234,216,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(stm, -6, 0, -10); ctx.stroke();
      ctx.restore();
    }
    if (fac.plants) {   // more plants. the room is very open now.
      for (const px2 of [250, 700]) {
        ctx.save(); ctx.translate(px2, 258);
        ctx.fillStyle = '#a06a4a'; this.rr(ctx, -10, 0, 20, 14, 3); ctx.fill();
        ctx.strokeStyle = '#4a7a4a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const la of [-0.5, -0.1, 0.35]) { ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(la * 22, -14, la * 34, -26 + Math.abs(la) * 8); ctx.stroke(); }
        ctx.lineCap = 'butt';
        ctx.restore();
      }
    }
    if (fac.cooler) {   // the NEW cooler. it does not gurgle.
      ctx.save(); ctx.translate(388, 196);
      ctx.fillStyle = '#d8dde0'; this.rr(ctx, -9, -8, 18, 30, 3); ctx.fill();
      ctx.fillStyle = '#7ec8e8'; this.rr(ctx, -7, -22, 14, 16, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; this.rr(ctx, -5, -20, 4, 10, 2); ctx.fill();
      ctx.fillStyle = '#8fd0e0'; ctx.font = this.font(7, true); ctx.textAlign = 'center'; ctx.fillText('✨', 0, -26);
      ctx.restore();
    }
    if (fac.toybox) {   // the toy corner. for "the children."
      ctx.save(); ctx.translate(62, 606);
      this.shadow(0, 16, 20, 6, 0.18);
      ctx.fillStyle = '#b08a4a'; this.rr(ctx, -20, -6, 40, 20, 4); ctx.fill();
      ctx.fillStyle = '#8a6a3a'; this.rr(ctx, -20, -6, 40, 6, 3); ctx.fill();
      ctx.fillStyle = '#b8a0a8';   // the plush walrus, waiting
      ctx.beginPath(); ctx.ellipse(2, -12, 11, 8, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-8, -14, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f0ead8'; ctx.fillRect(-10, -11, 2, 5); ctx.fillRect(-7, -11, 2, 5);
      ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-10, -16, 1.2, 0, TAU); ctx.arc(-6, -16, 1.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e05a6a'; ctx.beginPath(); ctx.arc(12, -4, 4, 0, TAU); ctx.fill();   // a ball
      ctx.restore();
    }
    // ---- THE REUNION: after the file closes, the people from your journey drop by ----
    if (H.visitors) {
      for (const v of H.visitors) {
        if (v.kind === 'boss') {
          // their own chair, on the visitor side of the room
          this.shadow(v.x, v.y + 24, 20, 6, 0.18);
          ctx.fillStyle = this.shade('#8a9a7a', -0.15); this.rr(ctx, v.x - 19, v.y - 26, 38, 26, 7); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.18)'; this.rr(ctx, v.x - 15, v.y - 23, 30, 7, 4); ctx.fill();
          ctx.fillStyle = '#8a9a7a'; this.rr(ctx, v.x - 20, v.y + 8, 40, 11, 5); ctx.fill();
          ctx.strokeStyle = '#4a4038'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(v.x - 15, v.y + 19); ctx.lineTo(v.x - 17, v.y + 30); ctx.moveTo(v.x + 15, v.y + 19); ctx.lineTo(v.x + 17, v.y + 30); ctx.stroke();
          if (!v._cv) {   // cached mini-portrait from the codex art
            v._cv = document.createElement('canvas'); v._cv.width = 48; v._cv.height = 48;
            try { this.drawCodexIcon(v._cv.getContext('2d'), 'bosses', v.id, 48); } catch (e) { }
          }
          const bob = Math.sin(G.t * 1.6 + v.x) * 1.5;
          ctx.drawImage(v._cv, v.x - 24, v.y - 36 + bob);
          ctx.fillStyle = '#8fd0e0'; ctx.font = this.font(8, true); ctx.textAlign = 'center';
          ctx.fillText('✌ ' + ((DATA.BOSSES[v.id] || { name: v.id }).name || '').replace(/^THE /, '').slice(0, 14), v.x, v.y + 40);
        } else if (v.kind === 'grad') {   // The Graduate, working the desk they once hid behind
          const bob = Math.sin(G.t * 2 + 1) * 1.2;
          this.shadow(v.x, v.y + 14, 11, 4, 0.2);
          ctx.save(); ctx.translate(v.x, v.y + bob);
          ctx.fillStyle = '#5a9a8a'; this.rr(ctx, -8, -6, 16, 20, 5); ctx.fill();   // scrubs, earned
          ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -13, 7, 0, TAU); ctx.fill();
          ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.arc(0, -16.5, 7, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-2.4, -13, 1.1, 0, TAU); ctx.arc(2.4, -13, 1.1, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -10.5, 2.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();   // an actual smile
          ctx.fillStyle = '#f0ead8'; this.rr(ctx, 3, -4, 7, 9, 1.5); ctx.fill();   // the badge — laminated now
          ctx.fillStyle = '#e8c84c'; ctx.fillRect(4, -3, 5, 2);
          ctx.restore();
          ctx.fillStyle = '#8fd08a'; ctx.font = this.font(8, true); ctx.textAlign = 'center';
          ctx.fillText('🎓 THE GRADUATE', v.x, v.y - 28);
        }
        if (v.sayT > 0 && v.say) {   // a saved-up line, offered when you come close
          ctx.font = this.font(11, true); ctx.textAlign = 'center';
          const tw = Math.min(300, ctx.measureText(v.say).width + 22);
          const by = v.y - (v.kind === 'grad' ? 48 : 56);
          const bx = U.clamp(v.x, tw / 2 + 8, CW - tw / 2 - 8);
          ctx.globalAlpha = Math.min(1, v.sayT / 0.4);
          ctx.fillStyle = 'rgba(250,247,240,0.96)'; this.rr(ctx, bx - tw / 2, by - 15, tw, 24, 8); ctx.fill();
          ctx.strokeStyle = 'rgba(90,80,100,0.55)'; ctx.lineWidth = 1.5; this.rr(ctx, bx - tw / 2, by - 15, tw, 24, 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx - 5, by + 9); ctx.lineTo(bx + 5, by + 9); ctx.lineTo(bx, by + 16); ctx.closePath();
          ctx.fillStyle = 'rgba(250,247,240,0.96)'; ctx.fill();
          ctx.fillStyle = '#3a3040'; ctx.fillText(v.say, bx, by + 2);
          ctx.globalAlpha = 1;
        }
      }
    }
    // ---- NIGHT SHIFT: after 9pm local, the ward runs on lamplight and one tired man ----
    const hr = new Date().getHours();
    if (hr >= 21 || hr < 6) {
      ctx.fillStyle = 'rgba(14,12,30,0.42)'; ctx.fillRect(0, 0, CW, CH);
      // lamp pools over the reception and the rug
      for (const [lx, ly, lr] of [[CW / 2, 150, 200], [CW / 2, 400, 260]]) {
        const lg = ctx.createRadialGradient(lx, ly, 20, lx, ly, lr);
        lg.addColorStop(0, 'rgba(232,200,120,0.14)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill();
      }
      // the walrus is asleep at the desk
      ctx.fillStyle = 'rgba(232,220,200,0.8)'; ctx.font = this.font(13, true); ctx.textAlign = 'center';
      ctx.fillText('z', CW / 2 + 44, 96 + Math.sin(G.t * 1.4) * 2);
      ctx.font = this.font(9, true); ctx.fillText('z', CW / 2 + 54, 86 + Math.sin(G.t * 1.4 + 1) * 2);
      if (Meta.data.exitDone) {
        // THE REUNION, night edition: forty years in, he finally sits down
        const jx = 176, jy = 486;
        this.shadow(jx, jy + 20, 16, 5, 0.3);
        ctx.fillStyle = this.shade('#7a8a99', -0.15); this.rr(ctx, jx - 19, jy - 24, 38, 24, 7); ctx.fill();   // his chair
        ctx.fillStyle = '#7a8a99'; this.rr(ctx, jx - 20, jy + 6, 40, 11, 5); ctx.fill();
        ctx.save(); ctx.translate(jx, jy - 4);
        ctx.fillStyle = '#4a5560'; this.rr(ctx, -9, -6, 18, 18, 5); ctx.fill();   // seated, actually seated
        ctx.fillStyle = '#d8c2a2'; ctx.beginPath(); ctx.arc(0, -13, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8a929c'; ctx.beginPath(); ctx.arc(0, -16.5, 7, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -10.5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, 6, -4, 7, 8, 2); ctx.fill();   // a cup of the good decaf
        const stm2 = Math.sin(G.t * 2.6) * 2;
        ctx.strokeStyle = 'rgba(240,234,216,0.5)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(9, -6); ctx.quadraticCurveTo(9 + stm2, -12, 9, -16); ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#6a5232'; ctx.lineWidth = 2.2;   // the mop, leaning on the wall, off duty
        ctx.beginPath(); ctx.moveTo(jx - 34, jy + 14); ctx.lineTo(jx - 28, jy - 34); ctx.stroke();
        ctx.fillStyle = 'rgba(200,190,220,0.55)'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('🌙 off the clock. finally. the floor can wait.', CW / 2, 286);
      } else {
        // the janitor, mopping by lamplight
        const jx = CW / 2 - 130 + Math.sin(G.t * 0.4) * 60, jy = 240;
        this.shadow(jx, jy + 16, 13, 5, 0.3);
        ctx.save(); ctx.translate(jx, jy);
        ctx.fillStyle = '#4a5560'; this.rr(ctx, -8, -6, 16, 20, 5); ctx.fill();
        ctx.fillStyle = '#d8c2a2'; ctx.beginPath(); ctx.arc(0, -13, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8a929c'; ctx.beginPath(); ctx.arc(0, -16.5, 7, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#6a5232'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(14, -18); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(200,190,220,0.55)'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('🌙 night shift — mind the wet floor', CW / 2, 246 + 40);
      }
    }
    // ---- you ----
    this.shadow(H.p.x, H.p.y + 14, 13, 5, 0.24);
    try { this.drawPlayer(H.p, G); } catch (e) { }
    // ---- prompt / hints ----
    const touch = typeof Input !== 'undefined' && Input.usingTouch;
    if (H.prompt) {
      const label = H.prompt.label + (H.prompt.hint ? ' — ' + H.prompt.hint : '');
      ctx.font = this.font(14, true); ctx.textAlign = 'center';
      const tw = ctx.measureText(label).width + 34;
      ctx.fillStyle = 'rgba(24,19,28,0.88)'; this.rr(ctx, CW / 2 - tw / 2, CH - 60, tw, 32, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(232,200,76,0.7)'; ctx.lineWidth = 2; this.rr(ctx, CW / 2 - tw / 2, CH - 60, tw, 32, 9); ctx.stroke();
      ctx.fillStyle = '#f0e8d8'; ctx.fillText(label, CW / 2, CH - 38);
      if (!H.prompt.door) {
        if (touch) {   // dwell progress ring
          const frac = U.clamp((H.dwell || 0) / 0.55, 0, 1);
          ctx.strokeStyle = 'rgba(232,200,76,0.9)'; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(CW / 2 + tw / 2 + 18, CH - 44, 10, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(232,200,76,0.9)'; ctx.font = this.font(11, true);
          ctx.fillText('SPACE / ENTER', CW / 2, CH - 12);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(58,48,56,0.6)'; ctx.font = this.font(12, true); ctx.textAlign = 'center';
      ctx.fillText(touch ? 'THE WAITING ROOM · walk into a door · stand still at anything else to open it' : 'THE WAITING ROOM · walk into a door, or walk up + SPACE · ESC for the menu', CW / 2, CH - 14);
    }
  },

  /* ============ THE BREAKROOM CABINET — PILL CATCHER ============ */
  drawArcade(G) {
    const ctx = this.ctx, A = G.arcade;
    if (!A) return;
    const shx = A.shake > 0 ? U.rand(-A.shake, A.shake) * 0.5 : 0;
    // the room behind the machine, dimmed
    ctx.fillStyle = '#12101a'; ctx.fillRect(0, 0, CW, CH);
    ctx.save();
    ctx.translate(shx, 0);
    // cabinet frame
    ctx.fillStyle = '#7a3a8a'; this.rr(ctx, RX - 44, 40, RW + 88, CH - 80, 18); ctx.fill();
    ctx.strokeStyle = '#4a2456'; ctx.lineWidth = 5; this.rr(ctx, RX - 44, 40, RW + 88, CH - 80, 18); ctx.stroke();
    // marquee
    ctx.fillStyle = '#e8c84c'; this.rr(ctx, RX - 20, 52, RW + 40, 40, 8); ctx.fill();
    ctx.fillStyle = '#7a3a2a'; ctx.font = 'bold 24px Impact,"Arial Black",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('💊 PILL CATCHER 💊', CW / 2, 80);
    // screen
    const sy = 104, sh = CH - 200;
    ctx.fillStyle = '#0a1408'; this.rr(ctx, RX - 8, sy, RW + 16, sh, 8); ctx.fill();
    ctx.save();
    ctx.beginPath(); this.rr(ctx, RX - 8, sy, RW + 16, sh, 8); ctx.clip();
    // falling items
    for (const it of A.items) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      if (it.kind === 'pill') this.drawPillIcon(0, 0, DATA.PILL_COLORS[it.colorIdx]);
      else if (it.kind === 'nickel') { ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#a8842a'; ctx.font = this.font(9, true); ctx.textAlign = 'center'; ctx.fillText('5', 0, 3); }
      else if (it.kind === 'script') { ctx.fillStyle = '#f4eee0'; this.rr(ctx, -8, -10, 16, 20, 2); ctx.fill(); ctx.strokeStyle = '#8a7a68'; ctx.lineWidth = 1; for (let l = -5; l <= 5; l += 4) { ctx.beginPath(); ctx.moveTo(-5, l); ctx.lineTo(5, l); ctx.stroke(); } ctx.fillStyle = '#3a6aa0'; ctx.font = this.font(8, true); ctx.textAlign = 'center'; ctx.fillText('℞', 0, -3); }
      else if (it.kind === 'walrus') { this.drawWalrusFace(ctx, 0, 0, 0.22, G.t); }
      else if (it.kind === 'recall') {
        ctx.fillStyle = '#c04040'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#7a1a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = this.font(10, true); ctx.textAlign = 'center'; ctx.fillText('☠', 0, 3.5);
      }
      ctx.restore();
    }
    // the paddle: a patient with a kidney dish
    const py = CH - 120;
    this.shadow(A.px, py + 22, 18, 6, 0.3);
    ctx.fillStyle = '#8fb0d8'; ctx.beginPath(); ctx.ellipse(A.px, py + 8, 12, 14, 0, 0, TAU); ctx.fill();   // scrubs body
    ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(A.px, py - 8, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(A.px - 3, py - 9, 1.3, 0, TAU); ctx.arc(A.px + 3, py - 9, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d8dde0'; ctx.beginPath(); ctx.ellipse(A.px, py - 20, 34, 7, 0, 0, TAU); ctx.fill();   // the dish
    ctx.strokeStyle = '#8a929c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(A.px, py - 20, 34, 7, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(120,130,140,0.5)'; ctx.beginPath(); ctx.ellipse(A.px, py - 19, 26, 4, 0, 0, TAU); ctx.fill();
    // catch effects
    for (const fx of A.catchFx) {
      ctx.globalAlpha = Math.min(1, fx.t * 2);
      ctx.fillStyle = fx.clr; ctx.font = this.font(13, true); ctx.textAlign = 'center';
      ctx.fillText(fx.txt, fx.x, fx.y - 34 - (0.8 - fx.t) * 30);
      ctx.globalAlpha = 1;
    }
    // scanlines
    ctx.fillStyle = 'rgba(120,255,120,0.03)';
    for (let ly = sy; ly < sy + sh; ly += 4) ctx.fillRect(RX - 8, ly, RW + 16, 2);
    ctx.restore();
    // HUD row on the cabinet
    ctx.fillStyle = '#0d0a12'; this.rr(ctx, RX - 8, CH - 88, RW + 16, 40, 8); ctx.fill();
    ctx.font = 'bold 18px "Courier New",monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#8fd05a'; ctx.fillText('SCORE ' + A.score, RX + 10, CH - 62);
    ctx.textAlign = 'center';
    ctx.fillStyle = A.t < 10 ? '#e05a5a' : '#e8c84c'; ctx.fillText('⏱ ' + Math.ceil(A.t), CW / 2, CH - 62);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e05a5a'; ctx.fillText('♥'.repeat(Math.max(0, A.lives)), RX + RW - 10, CH - 62);
    ctx.fillStyle = 'rgba(230,222,210,0.45)'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
    ctx.fillText('ESC / ❚❚ to walk away — the machine keeps the 2¢', CW / 2, CH - 22);
    ctx.restore();
  },

  /* atmospheric menu backdrop: warm lamp glow, drifting dust, vignette (shows through the title's lighter scrim) */
  drawMenuAmbient(G) {
    const ctx = this.ctx;
    this._mt = (this._mt || 0) + 0.016;
    const t = this._mt;
    const glow = ctx.createRadialGradient(CW / 2, CH * 0.36, 40, CW / 2, CH * 0.42, CW * 0.72);
    glow.addColorStop(0, 'rgba(78,64,52,0.55)'); glow.addColorStop(0.6, 'rgba(42,34,46,0.22)'); glow.addColorStop(1, 'rgba(23,19,26,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, CW, CH);
    const rm = Meta.data.a11y && Meta.data.a11y.reduceMotion;
    ctx.fillStyle = 'rgba(212,200,222,0.14)';
    for (let i = 0; i < 44; i++) {
      const bx = (i * 97) % CW, by = (i * 57) % CH;
      const x = (bx + (rm ? 0 : t * (6 + (i % 5)))) % CW;
      const y = (by + (rm ? 0 : Math.sin(t * 0.4 + i) * 14) + CH) % CH;
      const r = 0.7 + (i % 4) * 0.6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    const v = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.28, CW / 2, CH / 2, CH * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, CW, CH);
  },

  /* ============ seeded rng for stable textures ============ */
  srand(seed) {
    let s = (seed * 2654435761) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  },

  /* ============ baked room background (floor + walls + grime + vignette) ============ */
  getBG(room, depth, wingPal) {
    if (room._bg) return room._bg;
    const pal = wingPal || DATA.FLOOR_PALETTES[(depth - 1) % 5];
    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const x = cv.getContext('2d');
    const rnd = this.srand((room.gx * 73856093) ^ (room.gy * 19349663) ^ (depth * 83492791));

    // dark backdrop
    x.fillStyle = '#0b0910'; x.fillRect(0, 0, CW, CH);

    // outer wall slab with bevel
    const wl = RX - 46, wt = RY - 46, ww = RW + 92, wh = RH + 92;
    x.fillStyle = this.shade(pal.wall, -0.32);
    this.rr(x, wl, wt, ww, wh, 30); x.fill();
    x.fillStyle = pal.wall;
    this.rr(x, wl + 5, wt + 5, ww - 10, wh - 14, 26); x.fill();
    // top wall highlight
    x.fillStyle = this.shade(pal.wall, 0.16);
    this.rr(x, wl + 5, wt + 5, ww - 10, 16, 20); x.fill();
    // wall grime streaks
    for (let i = 0; i < 26; i++) {
      const gx = wl + 12 + rnd() * (ww - 24);
      const gy = wt + 8 + rnd() * 30;
      const h = 14 + rnd() * 46;
      const g = x.createLinearGradient(0, gy, 0, gy + h);
      g.addColorStop(0, 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(gx, gy, 2 + rnd() * 5, h);
    }
    // inner trim frame
    x.fillStyle = this.shade(pal.trim, -0.1);
    this.rr(x, RX - 30, RY - 30, RW + 60, RH + 60, 18); x.fill();
    x.fillStyle = this.shade(pal.trim, 0.08);
    this.rr(x, RX - 26, RY - 26, RW + 52, RH + 52, 15); x.fill();

    // floor base
    x.fillStyle = pal.floor;
    this.rr(x, RX - 6, RY - 6, RW + 12, RH + 12, 8); x.fill();

    // clip to floor for texture
    x.save();
    this.rr(x, RX - 6, RY - 6, RW + 12, RH + 12, 8); x.clip();

    // per-tile subtle shade variation (linoleum tiles)
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = (rnd() - 0.5) * 0.09;
      x.fillStyle = this.shade(pal.floor, v);
      x.fillRect(RX + c * TILE, RY + r * TILE, TILE, TILE);
    }
    // grout seams
    x.strokeStyle = this.shade(pal.line, -0.12);
    x.lineWidth = 2;
    x.beginPath();
    for (let c = 1; c < COLS; c++) { x.moveTo(RX + c * TILE, RY); x.lineTo(RX + c * TILE, RY + RH); }
    for (let r = 1; r < ROWS; r++) { x.moveTo(RX, RY + r * TILE); x.lineTo(RX + RW, RY + r * TILE); }
    x.stroke();
    // grout highlight (bottom of each seam) for depth
    x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 1;
    x.beginPath();
    for (let r = 1; r < ROWS; r++) { x.moveTo(RX, RY + r * TILE + 1.5); x.lineTo(RX + RW, RY + r * TILE + 1.5); }
    x.stroke();

    // grime blotches / water stains / scuffs
    for (let i = 0; i < 42; i++) {
      const bx = RX + rnd() * RW, by = RY + rnd() * RH;
      const br = 10 + rnd() * 52;
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      const roll = rnd();
      if (roll < 0.55) { g.addColorStop(0, 'rgba(14,10,8,0.30)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }      // dark pooling
      else if (roll < 0.82) { g.addColorStop(0, 'rgba(90,74,44,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); } // rust/water
      else { g.addColorStop(0, 'rgba(200,192,168,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }               // worn scuff
      x.fillStyle = g;
      x.beginPath(); x.ellipse(bx, by, br, br * (0.55 + rnd() * 0.55), rnd() * 3, 0, TAU); x.fill();
    }
    // hairline cracks
    x.strokeStyle = 'rgba(8,5,4,0.4)'; x.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      let cx = RX + rnd() * RW, cy = RY + rnd() * RH;
      x.beginPath(); x.moveTo(cx, cy);
      const seg = 3 + Math.floor(rnd() * 4);
      for (let s = 0; s < seg; s++) { cx += (rnd() - 0.5) * 60; cy += (rnd() - 0.5) * 60; x.lineTo(cx, cy); }
      x.stroke();
    }
    x.restore();

    // floor drop-shadow from walls (inner)
    const vg = x.createLinearGradient(0, RY - 6, 0, RY + 26);
    vg.addColorStop(0, 'rgba(0,0,0,0.28)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = vg; x.fillRect(RX - 6, RY - 6, RW + 12, 32);

    // thematic dressing — make the room read as a real place in the ward
    if (room.theme) { try { this.drawRoomDecor(x, room.theme, rnd); } catch (e) { } }

    // vignette over the whole play area (Isaac moodiness)
    const vig = x.createRadialGradient(CW / 2, RY + RH / 2, RH * 0.42, CW / 2, RY + RH / 2, RH * 1.18);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.75, 'rgba(6,4,10,0.28)');
    vig.addColorStop(1, 'rgba(4,3,8,0.72)');
    x.fillStyle = vig;
    this.rr(x, RX - 6, RY - 6, RW + 12, RH + 12, 8); x.fill();

    room._bg = cv;
    return cv;
  },

  /* thematic room dressing baked into the floor: silhouetted props near the walls
     so each generated room reads as records office / pharmacy / therapy / etc. */
  drawRoomDecor(x, theme, rnd) {
    const dark = 'rgba(16,11,16,0.30)', mid = 'rgba(16,11,16,0.20)', ink = 'rgba(255,250,240,0.06)';
    const flip = rnd() < 0.5 ? 1 : -1;
    const midX = CW / 2, topY = RY + 30, botY = RY + RH - 26;
    // faint stencil text on the floor (a stamp / sign)
    const stencil = (txt, px, py, rot, col) => { x.save(); x.translate(px, py); x.rotate(rot); x.fillStyle = col || 'rgba(150,110,60,0.10)'; x.font = 'bold 20px ui-monospace, monospace'; x.textAlign = 'center'; x.fillText(txt, 0, 0); x.restore(); };
    const box = (px, py, w, h) => { x.fillStyle = dark; this.rr(x, px, py, w, h, 3); x.fill(); x.fillStyle = ink; this.rr(x, px + 2, py + 2, w - 4, 4, 2); x.fill(); };
    if (theme === 'records') {
      for (let i = 0; i < 3; i++) box(RX + 22 + i * 30, topY, 26, 58);   // filing cabinets
      x.fillStyle = mid; for (let i = 0; i < 3; i++) for (let r = 0; r < 3; r++) x.fillRect(RX + 26 + i * 30, topY + 8 + r * 17, 18, 2);
      x.fillStyle = mid; this.rr(x, RX + RW - 70, botY - 14, 44, 16, 2); x.fill();   // paperwork pile
      stencil('CONFIDENTIAL', midX + flip * 120, RY + RH * 0.62, -0.25, 'rgba(178,54,54,0.09)');
    } else if (theme === 'pharmacy') {
      for (let s = 0; s < 2; s++) { const sy = topY + s * 34; x.fillStyle = dark; x.fillRect(RX + 26, sy, 150, 6); for (let b = 0; b < 8; b++) { x.fillStyle = mid; this.rr(x, RX + 30 + b * 18, sy - 12, 10, 13, 2); x.fill(); } }
      stencil('℞', RX + RW - 70, RY + RH * 0.4, 0, 'rgba(120,150,120,0.12)');
    } else if (theme === 'therapy') {
      x.fillStyle = dark; this.rr(x, midX - 80 * flip - 44, botY - 26, 88, 30, 8); x.fill();   // couch
      x.fillStyle = mid; this.rr(x, midX - 80 * flip - 44, botY - 40, 88, 16, 8); x.fill();
      x.fillStyle = dark; x.beginPath(); x.arc(RX + RW - 40, topY + 26, 9, 0, TAU); x.fill();   // plant pot
      x.strokeStyle = mid; x.lineWidth = 3; x.beginPath(); x.moveTo(RX + RW - 40, topY + 20); x.lineTo(RX + RW - 46, topY + 4); x.moveTo(RX + RW - 40, topY + 20); x.lineTo(RX + RW - 33, topY + 6); x.stroke();
      stencil('HOW DOES THAT', midX, topY + 6, 0, 'rgba(150,110,60,0.09)');
    } else if (theme === 'breakroom') {
      box(RX + 26, topY, 34, 62); x.fillStyle = 'rgba(60,90,110,0.14)'; x.fillRect(RX + 30, topY + 8, 26, 26);   // vending machine
      x.fillStyle = dark; this.rr(x, RX + RW - 90, botY - 20, 60, 22, 4); x.fill();   // table
      x.strokeStyle = 'rgba(150,110,60,0.14)'; x.lineWidth = 2; for (let i = 0; i < 2; i++) { x.beginPath(); x.arc(RX + RW - 74 + i * 30, botY - 26, 6, 0, Math.PI * 1.6); x.stroke(); }   // coffee rings
    } else if (theme === 'group') {
      const cx = midX, cy = RY + RH / 2, R = 88;   // a circle of folding chairs
      x.strokeStyle = mid; x.lineWidth = 2;
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R * 0.7; x.beginPath(); x.moveTo(px - 6, py + 6); x.lineTo(px - 6, py - 4); x.lineTo(px + 6, py - 4); x.lineTo(px + 6, py + 6); x.stroke(); }
    } else if (theme === 'exam') {
      x.fillStyle = dark; this.rr(x, RX + 30, RY + RH / 2 - 12, 70, 24, 5); x.fill();   // exam table
      x.fillStyle = mid; x.fillRect(RX + 30, RY + RH / 2 - 12, 70, 5);
      x.strokeStyle = mid; x.lineWidth = 2.5; x.beginPath(); x.moveTo(RX + RW - 44, botY); x.lineTo(RX + RW - 44, topY + 10); x.stroke(); x.fillStyle = 'rgba(120,150,120,0.16)'; this.rr(x, RX + RW - 50, topY + 8, 14, 18, 3); x.fill();   // IV stand
      stencil('E F P', RX + RW - 90, RY + RH * 0.34, 0, 'rgba(40,30,40,0.12)');   // eye chart
    } else if (theme === 'waiting') {
      x.strokeStyle = mid; x.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) { const px = RX + 40 + i * 44; x.beginPath(); x.moveTo(px - 16, botY); x.lineTo(px - 16, botY - 14); x.lineTo(px + 16, botY - 14); x.lineTo(px + 16, botY); x.stroke(); }   // row of chairs
      x.strokeStyle = mid; x.lineWidth = 2; x.beginPath(); x.arc(RX + RW - 46, topY + 20, 14, 0, TAU); x.stroke();   // wall clock
      x.beginPath(); x.moveTo(RX + RW - 46, topY + 20); x.lineTo(RX + RW - 46, topY + 10); x.moveTo(RX + RW - 46, topY + 20); x.lineTo(RX + RW - 39, topY + 22); x.stroke();
      stencil('PLEASE WAIT', midX + flip * 90, RY + RH * 0.6, -0.1, 'rgba(150,110,60,0.10)');
    }
  },

  /* hazard-room set dressing + live threats (padded pads, ECT fixture, surveillance sweep) */
  drawHazardRoom(G, room) {
    const ctx = this.ctx;
    if (room.type === 'padded') {
      ctx.save();
      ctx.strokeStyle = 'rgba(230,224,205,0.12)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(235,228,210,0.05)';
      const pad = 24, step = 46;
      for (let x = RX + 6; x < RX + RW - 30; x += step) { this.rr(ctx, x, RY + 6, step - 8, pad, 6); ctx.fill(); ctx.stroke(); this.rr(ctx, x, RY + RH - pad - 6, step - 8, pad, 6); ctx.fill(); ctx.stroke(); }
      for (let y = RY + 6; y < RY + RH - 30; y += step) { this.rr(ctx, RX + 6, y, pad, step - 8, 6); ctx.fill(); ctx.stroke(); this.rr(ctx, RX + RW - pad - 6, y, pad, step - 8, 6); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    } else if (room.type === 'ect') {
      const cx = CW / 2, cy = RY + 40;
      const charging = room._ectActive && (room._shockT || 0) < 0.6;
      ctx.save();
      ctx.strokeStyle = 'rgba(150,200,240,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 26, RY + 2); ctx.lineTo(cx + 26, RY + 2); ctx.moveTo(cx, RY + 2); ctx.lineTo(cx, cy); ctx.stroke();
      const glow = charging ? (0.5 + Math.sin(G.t * 30) * 0.5) : 0.3;
      ctx.fillStyle = 'rgba(190,225,255,' + (0.3 + glow * 0.6) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, 12 + glow * 6, 0, TAU); ctx.fill();
      if (charging) {
        ctx.strokeStyle = 'rgba(190,225,255,' + glow + ')'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + G.t; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); ctx.stroke(); }
      }
      ctx.restore();
    } else if (room.type === 'observation' && !room._watchDone) {
      const camX = CW / 2, camY = RY + 26;
      const beamA = Math.sin(room._watchAng || 0) * 1.15 + Math.PI / 2;
      const len = RH + 30;
      ctx.save();
      const g = ctx.createLinearGradient(camX, camY, camX + Math.cos(beamA) * len, camY + Math.sin(beamA) * len);
      g.addColorStop(0, 'rgba(230,215,90,0.30)'); g.addColorStop(1, 'rgba(230,215,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(camX, camY);
      ctx.lineTo(camX + Math.cos(beamA - 0.13) * len, camY + Math.sin(beamA - 0.13) * len);
      ctx.lineTo(camX + Math.cos(beamA + 0.13) * len, camY + Math.sin(beamA + 0.13) * len);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2620'; this.rr(ctx, camX - 12, RY + 6, 24, 16, 4); ctx.fill();
      ctx.fillStyle = Math.floor((room._watchT || 0) * 2) % 2 ? '#e04040' : '#601818';
      ctx.beginPath(); ctx.arc(camX, camY, 4, 0, TAU); ctx.fill();
      const frac = U.clamp((room._watchT || 0) / 9, 0, 1);
      ctx.strokeStyle = 'rgba(143,208,90,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(camX, RY + 46, 15, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
      ctx.restore();
    }
  },

  getDecals(room) {
    if (!room._decals) {
      const cv = document.createElement('canvas');
      cv.width = RW; cv.height = RH;
      room._decals = cv;
    }
    return room._decals;
  },
  /* stamp a blood/ink splat onto a room's persistent decal layer */
  splat(room, wx, wy, clr) {
    if (!room) return;
    const cv = this.getDecals(room);
    const x = cv.getContext('2d');
    const lx = wx - RX, ly = wy - RY;
    if (lx < -20 || ly < -20 || lx > RW + 20 || ly > RH + 20) return;
    const base = this.shade(clr, -0.35);
    x.globalAlpha = 0.5;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * TAU, d = Math.random() * 18;
      const bx = lx + Math.cos(a) * d, by = ly + Math.sin(a) * d;
      const r = 4 + Math.random() * 11;
      x.fillStyle = base;
      x.beginPath(); x.ellipse(bx, by, r, r * (0.7 + Math.random() * 0.5), Math.random() * 3, 0, TAU); x.fill();
    }
    // a few speckle droplets
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, d = 10 + Math.random() * 26;
      x.beginPath(); x.arc(lx + Math.cos(a) * d, ly + Math.sin(a) * d, 1 + Math.random() * 2.4, 0, TAU); x.fill();
    }
    x.globalAlpha = 1;
  },

  /* soft drop shadow ellipse on the floor */
  shadow(x, y, rx, ry, a) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,' + (a || 0.22) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  },

  /* shade a hex color toward white (t>0) or black (t<0) */
  shade(hex, t) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    if (t >= 0) { r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
    else { r *= (1 + t); g *= (1 + t); b *= (1 + t); }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  },

  /* ============ room ============ */
  drawRoom(G) {
    const ctx = this.ctx;
    const pal = G.wingPal || DATA.FLOOR_PALETTES[(G.depth - 1) % 5];
    const room = G.room;

    // baked background (floor, walls, grime, vignette)
    ctx.drawImage(this.getBG(room, G.depth, G.wingPal), 0, 0);

    // persistent decals (blood/stains) clipped to floor
    ctx.save();
    this.rr(ctx, RX, RY, RW, RH, 6); ctx.clip();
    if (room._decals) ctx.drawImage(room._decals, RX, RY);

    // special room tint
    if (room.type === 'item') { ctx.fillStyle = 'rgba(230,205,110,0.10)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'shop') { ctx.fillStyle = 'rgba(120,170,220,0.10)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'secret') { ctx.fillStyle = 'rgba(160,120,220,0.11)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'oon') { ctx.fillStyle = 'rgba(220,80,80,0.13)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'boss') { ctx.fillStyle = 'rgba(150,40,40,0.09)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'seclusion') { ctx.fillStyle = 'rgba(150,40,50,0.12)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'ect') { ctx.fillStyle = 'rgba(120,180,230,0.10)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'padded') { ctx.fillStyle = 'rgba(210,200,180,0.09)'; ctx.fillRect(RX, RY, RW, RH); }
    if (room.type === 'observation') { ctx.fillStyle = 'rgba(220,205,90,0.08)'; ctx.fillRect(RX, RY, RW, RH); }
    ctx.restore();
    this.drawHazardRoom(G, room);

    // zones under everything
    for (const z of G.zones) {
      if (z.kind === 'trigger') {   // PTSD flashback trigger — a pulsing danger marker, not a solid patch
        const pulse = 0.42 + Math.sin(z.t * 6) * 0.28;
        ctx.fillStyle = 'rgba(194,90,82,' + (pulse * 0.35) + ')';
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.82 + Math.sin(z.t * 6) * 0.1), 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(194,90,82,' + pulse + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.92, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(222,120,110,' + pulse + ')'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(z.x - 6, z.y - 5); ctx.lineTo(z.x + 2, z.y + 1); ctx.lineTo(z.x - 3, z.y + 6); ctx.stroke();
        continue;
      }
      ctx.globalAlpha = U.clamp(z.life, 0, 1) * 0.9;
      ctx.fillStyle = z.clr;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.9 + Math.sin(z.t * 3) * 0.06), 0, TAU); ctx.fill();
      if (z.kind === 'ember') {
        ctx.fillStyle = 'rgba(240,160,60,0.5)';
        for (let i = 0; i < 3; i++) {
          const a = z.t * 2 + i * 2.1;
          ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * z.r * 0.5, z.y + Math.sin(a * 1.3) * z.r * 0.5, 5, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // tiles (with drop shadows + dimensional shading)
    const pwall = pal.wall;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = room.layout[r][c];
      if (t === 0) continue;
      const x = RX + c * TILE, y = RY + r * TILE, cx = x + TILE / 2, cy = y + TILE / 2;
      if (t === 1) { // rock — rounded stone with shadow, top-light, crack
        this.shadow(cx + 3, y + TILE - 10, 24, 9, 0.28);
        const rg = ctx.createRadialGradient(cx - 6, cy - 8, 4, cx, cy, 30);
        rg.addColorStop(0, this.shade(pwall, 0.34));
        rg.addColorStop(0.6, this.shade(pwall, 0.12));
        rg.addColorStop(1, this.shade(pwall, -0.22));
        ctx.fillStyle = rg;
        this.rr(ctx, x + 6, y + 6, TILE - 12, TILE - 14, 15); ctx.fill();
        ctx.strokeStyle = this.shade(pwall, -0.38); ctx.lineWidth = 2;
        this.rr(ctx, x + 6, y + 6, TILE - 12, TILE - 14, 15); ctx.stroke();
        // crack
        ctx.strokeStyle = this.shade(pwall, -0.3); ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 8, y + 14); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - 9, cy + 8); ctx.lineTo(cx - 3, y + TILE - 12);
        ctx.stroke();
        // top specular
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(cx - 7, y + 16, 9, 4, -0.3, 0, TAU); ctx.fill();
      } else if (t === 2) { // paperwork stack — messy shaded files
        this.shadow(cx + 3, y + TILE - 10, 24, 8, 0.26);
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 4; i >= 0; i--) {
          ctx.save();
          ctx.rotate((i - 2) * 0.1 + Math.sin(i * 2.3) * 0.03);
          const g = ctx.createLinearGradient(0, -16, 0, 16);
          g.addColorStop(0, i % 2 ? '#f6efdc' : '#ece3cd');
          g.addColorStop(1, i % 2 ? '#d8cdb0' : '#cabf9f');
          ctx.fillStyle = g;
          this.rr(ctx, -20, -15 + i * -4, 40, 30, 2); ctx.fill();
          ctx.strokeStyle = '#9c8f70'; ctx.lineWidth = 1;
          this.rr(ctx, -20, -15 + i * -4, 40, 30, 2); ctx.stroke();
          ctx.restore();
        }
        // text ruling + red stamp on top sheet
        ctx.strokeStyle = '#b0a488'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-13, -10); ctx.lineTo(11, -10);
        ctx.moveTo(-13, -4); ctx.lineTo(14, -4);
        ctx.moveTo(-13, 2); ctx.lineTo(7, 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(180,50,50,0.7)'; ctx.lineWidth = 2;
        this.rr(ctx, 2, -14, 16, 9, 2); ctx.stroke();
        ctx.restore();
      } else if (t === 3) { // spikes — metallic bio-hazard needles
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const sx = x + 12 + i * 20, sy = y + 15 + j * 17;
          this.shadow(sx + 2, sy + 7, 6, 2.5, 0.22);
          const g = ctx.createLinearGradient(sx - 6, 0, sx + 6, 0);
          g.addColorStop(0, '#6a6a74'); g.addColorStop(0.5, '#c8c8d2'); g.addColorStop(1, '#5a5a64');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(sx - 6, sy + 6); ctx.lineTo(sx, sy - 9); ctx.lineTo(sx + 6, sy + 6);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.moveTo(sx - 1, sy + 4); ctx.lineTo(sx, sy - 7); ctx.lineTo(sx + 1, sy + 4); ctx.closePath(); ctx.fill();
        }
      }
    }

    // doors
    const midX = RX + RW / 2, midY = RY + RH / 2;
    const doorInfo = [
      { d: 'N', x: midX, y: RY - 22, rot: 0 },
      { d: 'S', x: midX, y: RY + RH + 22, rot: Math.PI },
      { d: 'W', x: RX - 22, y: midY, rot: -Math.PI / 2 },
      { d: 'E', x: RX + RW + 22, y: midY, rot: Math.PI / 2 }
    ];
    for (const di of doorInfo) {
      const hasDoor = room.doors[di.d];
      const hasSecret = room.secretDoors[di.d] && (G.secretFound || room.type === 'secret');
      if (!hasDoor && !hasSecret) continue;
      const n = G.roomAt(room.gx + DIRS[di.d].dx, room.gy + DIRS[di.d].dy);
      const locked = n && n.type === 'item' && !n.lockOpen;
      const open = G.doorsOpen && !locked && (!n || n.type !== 'secret' || G.secretFound);
      this.drawDoor(di.x, di.y, di.rot, n ? n.type : 'normal', open && (hasDoor || hasSecret), G, di.d);
    }
  },

  drawDoor(x, y, rot, ntype, open, G, d) {
    const ctx = this.ctx;
    const pal = DATA.FLOOR_PALETTES[(G.depth - 1) % 5];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // arch
    ctx.fillStyle = ntype === 'boss' ? '#6a3a3a' : ntype === 'item' ? '#8a7a3a' : ntype === 'shop' ? '#3a5a7a' : ntype === 'oon' ? '#7a2a2a' : pal.trim;
    this.rr(ctx, -42, -20, 84, 42, 12); ctx.fill();
    if (open) {
      ctx.fillStyle = '#221a26';
      this.rr(ctx, -30, -14, 60, 34, 8); ctx.fill();
      // warm light spilling out of the open doorway
      const pulse = 0.55 + Math.sin((G.t || 0) * 2.2) * 0.15;
      const lg = ctx.createLinearGradient(0, 8, 0, 64);
      lg.addColorStop(0, 'rgba(255,224,150,' + (0.22 * pulse) + ')');
      lg.addColorStop(1, 'rgba(255,224,150,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(-26, 12); ctx.lineTo(26, 12); ctx.lineTo(40, 64); ctx.lineTo(-40, 64); ctx.closePath(); ctx.fill();
      // little glyph over special doors
      ctx.fillStyle = '#e8dfc8';
      ctx.font = this.font(17, true);
      ctx.textAlign = 'center';
      if (ntype === 'boss') ctx.fillText('💀', 0, -24);
      if (ntype === 'item') ctx.fillText('✚', 0, -24);
      if (ntype === 'shop') ctx.fillText('$', 0, -24);
      if (ntype === 'oon') ctx.fillText('❥', 0, -24);
    } else {
      ctx.fillStyle = '#4a3f4e';
      this.rr(ctx, -30, -14, 60, 34, 8); ctx.fill();
      ctx.strokeStyle = '#2c242e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 18); ctx.stroke();
      if (ntype === 'item' && G.doorsOpen) { // locked specialist door
        ctx.fillStyle = '#e8c84c';
        ctx.font = this.font(16, true); ctx.textAlign = 'center';
        ctx.fillText('🔑', 0, 8);
      }
    }
    ctx.restore();
  },

  /* ============ entities ============ */
  drawEntities(G) {
    const ctx = this.ctx;

    // THE INCIDENT SITE: chalk, tape, evidence tents, a light that won't settle
    if (G.room && G.room.type === 'incident') {
      const cx = CW / 2, cy = RY + RH / 2;
      // chalk outline where you ended up (arms akimbo — you fought)
      ctx.save();
      ctx.translate(cx - 60, cy + 26); ctx.rotate(0.3);
      ctx.strokeStyle = 'rgba(240,238,230,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.arc(0, -18, 9, 0, TAU); ctx.stroke();                     // head
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 15, 0, 0, TAU); ctx.stroke();           // body
      ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(-24, -14); ctx.moveTo(11, -4); ctx.lineTo(26, 2); ctx.stroke();   // arms
      ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-14, 34); ctx.moveTo(6, 18); ctx.lineTo(10, 36); ctx.stroke();     // legs
      ctx.setLineDash([]);
      ctx.restore();
      // caution tape across two corners
      for (const [x1, y1, x2, y2] of [[RX + 6, RY + 84, RX + 190, RY + 6], [RX + RW - 190, RY + RH - 6, RX + RW - 6, RY + RH - 90]]) {
        const ang = Math.atan2(y2 - y1, x2 - x1), len = U.dist(x1, y1, x2, y2);
        ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang);
        ctx.fillStyle = '#e8c84c'; ctx.fillRect(0, -7, len, 14);
        ctx.fillStyle = '#2c2333';
        for (let sx = 4; sx < len - 10; sx += 26) { ctx.save(); ctx.translate(sx, 0); ctx.rotate(0); ctx.fillRect(0, -7, 12, 14); ctx.restore(); }
        ctx.fillStyle = '#e8c84c'; ctx.font = 'bold 8px "Arial Black",sans-serif'; ctx.textAlign = 'left';
        ctx.restore();
      }
      // numbered evidence tents
      [[cx + 40, cy - 10, '1'], [cx - 30, cy + 70, '2'], [cx + 90, cy + 44, '3']].forEach(([ex, ey, n]) => {
        ctx.fillStyle = '#e8d84c';
        ctx.beginPath(); ctx.moveTo(ex - 8, ey + 8); ctx.lineTo(ex, ey - 8); ctx.lineTo(ex + 8, ey + 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a4a1a'; ctx.font = 'bold 9px "Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(n, ex, ey + 5);
      });
      // the light that won't settle
      const flick = 0.1 + (Math.sin(G.t * 17) > 0.86 ? 0.14 : 0) + Math.sin(G.t * 3) * 0.03;
      const lg = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy - 40, 260);
      lg.addColorStop(0, 'rgba(232,220,190,' + flick + ')'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy - 40, 260, 0, TAU); ctx.fill();
    }

    // trapdoor
    if (G.trapdoor) {
      const td = G.trapdoor;
      ctx.fillStyle = '#141018';
      ctx.beginPath(); ctx.ellipse(td.x, td.y, 30, 22, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a3242'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(td.x, td.y, 30, 22, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#5a4e66';
      ctx.font = this.font(11); ctx.textAlign = 'center';
      ctx.fillText('deeper', td.x, td.y - 32);
    }

    // pedestals
    for (const ped of G.peds) {
      if (ped.taken) continue;
      if (ped.kind === 'event') {   // a mysterious clipboard shrine
        const eb = Math.sin(G.t * 2 + ped.x) * 3;
        const eg = ctx.createRadialGradient(ped.x, ped.y - 10, 4, ped.x, ped.y - 10, 50);
        eg.addColorStop(0, 'rgba(200,170,240,0.28)'); eg.addColorStop(1, 'rgba(200,170,240,0)');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ped.x, ped.y - 10, 50, 0, TAU); ctx.fill();
        this.shadow(ped.x, ped.y + 14, 18, 6, 0.26);
        ctx.save(); ctx.translate(ped.x, ped.y - 6 + eb);
        ctx.fillStyle = '#8a6a3a'; this.rr(ctx, -16, -20, 32, 40, 4); ctx.fill();
        ctx.fillStyle = '#f4ecd8'; this.rr(ctx, -13, -16, 26, 34, 2); ctx.fill();
        ctx.fillStyle = '#b06be0'; this.rr(ctx, -7, -22, 14, 6, 2); ctx.fill();
        ctx.fillStyle = '#7a3a8a'; ctx.font = this.font(22, true); ctx.textAlign = 'center'; ctx.fillText('?', 0, 6);
        ctx.restore();
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#e0c8f0'; ctx.font = this.font(12, true); ctx.textAlign = 'center'; ctx.fillText('walk up to examine', ped.x, ped.y - 40); }
        continue;
      }
      if (ped.kind === 'cooler') {   // Day Room water cooler
        this.shadow(ped.x, ped.y + 16, 16, 6, 0.26);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#c8ccd2'; this.rr(ctx, -12, 0, 24, 22, 3); ctx.fill();
        ctx.strokeStyle = '#8a9098'; ctx.lineWidth = 2; this.rr(ctx, -12, 0, 24, 22, 3); ctx.stroke();
        const wb = Math.sin(G.t * 2) * 1.5;
        ctx.fillStyle = 'rgba(120,190,220,0.85)'; this.rr(ctx, -13, -22, 26, 24, 6); ctx.fill();
        ctx.strokeStyle = '#6aa0c0'; ctx.lineWidth = 2; this.rr(ctx, -13, -22, 26, 24, 6); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-4, -14 + wb, 4, 6, -0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e05a5a'; ctx.fillRect(-2, 6, 4, 4);
        ctx.restore();
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 74) { ctx.fillStyle = '#a0d0e0'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('💧 water cooler', ped.x, ped.y - 34); }
        continue;
      }
      if (ped.kind === 'npc') {   // Day Room patient in a folding chair
        this.shadow(ped.x, ped.y + 16, 14, 5, 0.22);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.strokeStyle = '#7a6a58'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, 18); ctx.lineTo(-9, 2); ctx.lineTo(9, 2); ctx.lineTo(9, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-9, -12); ctx.stroke(); ctx.lineCap = 'butt';
        const bob = Math.sin(G.t * 2 + ped.x) * 1.2;
        ctx.fillStyle = ['#8a7ab0', '#a06a6a', '#6a9a7a', '#b0925a', '#7a8ab0'][ped.npcId % 5];
        ctx.beginPath(); ctx.ellipse(0, 2 + bob, 9, 10, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -12 + bob, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,40,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -12 + bob, 8, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-3, -13 + bob, 1.5, 0, TAU); ctx.arc(3, -13 + bob, 1.5, 0, TAU); ctx.fill();
        ctx.restore();
        const npc = DATA.DAYROOM[ped.npcId];
        if (npc && U.dist(G.player.x, G.player.y, ped.x, ped.y) < 74) { ctx.fillStyle = '#c8b0e0'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText(npc.name + ' · ' + npc.note, ped.x, ped.y - 30); }
        continue;
      }
      if (ped.kind === 'restock') {   // Pharmacy: reroll the shelf
        const rb = Math.sin(G.t * 2.4 + ped.x) * 3;
        this.shadow(ped.x, ped.y + 12, 20, 6, 0.28);
        const pg2 = ctx.createLinearGradient(ped.x, ped.y - 12, ped.x, ped.y + 14);
        pg2.addColorStop(0, '#c4bccc'); pg2.addColorStop(1, '#8a8296'); ctx.fillStyle = pg2;
        this.rr(ctx, ped.x - 16, ped.y - 4, 32, 18, 5); ctx.fill();
        ctx.fillStyle = '#9db85a'; ctx.font = this.font(20, true); ctx.textAlign = 'center'; ctx.fillText('🔄', ped.x, ped.y - 18 + rb);
        ctx.fillStyle = '#e8c84c'; ctx.font = this.font(13, true); ctx.fillText(ped.price + '¢', ped.x, ped.y + 30);
        ctx.fillStyle = '#9db85a'; ctx.font = this.font(9, true); ctx.fillText('RESTOCK', ped.x, ped.y + 42);
        continue;
      }
      if (ped.kind === 'sacrifice') {   // Seclusion Room — a grim stone altar
        const gl = 0.18 + Math.sin(G.t * 2) * 0.1;
        const rg = ctx.createRadialGradient(ped.x, ped.y - 6, 4, ped.x, ped.y - 6, 60);
        rg.addColorStop(0, 'rgba(200,60,70,' + (0.2 + gl) + ')'); rg.addColorStop(1, 'rgba(200,60,70,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ped.x, ped.y - 6, 60, 0, TAU); ctx.fill();
        this.shadow(ped.x, ped.y + 18, 26, 8, 0.3);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#5a5258'; this.rr(ctx, -26, -6, 52, 24, 4); ctx.fill();
        ctx.fillStyle = '#403a40'; this.rr(ctx, -26, 8, 52, 10, 4); ctx.fill();
        ctx.fillStyle = '#6a626a'; this.rr(ctx, -22, -10, 44, 7, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(150,30,40,0.75)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(0, 5); ctx.lineTo(14, -2); ctx.stroke();
        ctx.fillStyle = 'rgba(150,30,40,0.6)'; ctx.beginPath(); ctx.arc(0, 7, 3, 0, TAU); ctx.fill();
        ctx.restore();
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 90) { ctx.fillStyle = '#e0a0a0'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('🩸 offer a heart', ped.x, ped.y - 34); }
        continue;
      }
      if (ped.kind === 'recruit') {   // Support Group — a patient hoping to join
        const A = DATA.ALLIES.find(x => x.id === ped.allyId) || DATA.ALLIES[0];
        const rb = Math.sin(G.t * 2.6 + ped.x) * 2.2;
        const eg = ctx.createRadialGradient(ped.x, ped.y - 6, 4, ped.x, ped.y - 6, 48);
        eg.addColorStop(0, 'rgba(143,208,90,0.22)'); eg.addColorStop(1, 'rgba(143,208,90,0)');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ped.x, ped.y - 6, 48, 0, TAU); ctx.fill();
        this.shadow(ped.x, ped.y + 15, 12, 5, 0.24);
        ctx.save(); ctx.translate(ped.x, ped.y + rb);
        this.orb(ctx, 0, 3, 11, A.tint, false);
        ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -10, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,40,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -10, 8, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-3, -11, 1.5, 0, TAU); ctx.arc(3, -11, 1.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = A.tint; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const wv = Math.sin(G.t * 6) * 0.5;
        ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(15, -9 + wv * 8); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.restore();
        ctx.fillStyle = '#8fd05a'; ctx.font = this.font(11, true); ctx.textAlign = 'center';
        ctx.fillText(A.name + ' · ' + A.diag, ped.x, ped.y - 32);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 84) { ctx.fillStyle = '#c8e0a0'; ctx.font = this.font(11, true); ctx.fillText('🤝 walk up to recruit', ped.x, ped.y + 34); }
        continue;
      }
      if (ped.kind === 'elevator') {   // the service elevator — it only goes up
        this.shadow(ped.x, ped.y + 34, 26, 8, 0.3);
        ctx.save(); ctx.translate(ped.x, ped.y);
        const openA = 4 + Math.sin(G.t * 1.4) * 3;   // doors breathe open
        ctx.fillStyle = '#8a7448'; this.rr(ctx, -30, -44, 60, 80, 6); ctx.fill();
        ctx.strokeStyle = '#5a4a28'; ctx.lineWidth = 3; this.rr(ctx, -30, -44, 60, 80, 6); ctx.stroke();
        ctx.fillStyle = '#241c14'; this.rr(ctx, -22, -36, 44, 66, 3); ctx.fill();   // dark shaft
        const gg2 = ctx.createLinearGradient(0, -36, 0, 30);
        gg2.addColorStop(0, 'rgba(232,200,120,0.35)'); gg2.addColorStop(1, 'rgba(232,200,120,0.05)');
        ctx.fillStyle = gg2; this.rr(ctx, -22, -36, 44, 66, 3); ctx.fill();   // warm light inside
        ctx.fillStyle = '#c8ae6e'; this.rr(ctx, -22 - openA + 12, -36, 12, 66, 2); ctx.fill();   // left door
        this.rr(ctx, 22 + openA - 24, -36, 12, 66, 2); ctx.fill();                                // right door
        ctx.fillStyle = Math.floor(G.t * 1.5) % 2 ? '#e8c84c' : '#8a7448';   // UP arrow
        ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(6, -46); ctx.lineTo(-6, -46); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 90) { ctx.fillStyle = '#e8c84c'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('🛗 ride UP — the Ascent', ped.x, ped.y - 60); }
        continue;
      }
      if (ped.kind === 'vending') {   // Commissary vending machine
        this.shadow(ped.x, ped.y + 30, 22, 7, 0.28);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#b04848'; this.rr(ctx, -22, -34, 44, 64, 5); ctx.fill();
        ctx.strokeStyle = '#7a2e2e'; ctx.lineWidth = 2.5; this.rr(ctx, -22, -34, 44, 64, 5); ctx.stroke();
        ctx.fillStyle = 'rgba(200,230,240,0.85)'; this.rr(ctx, -16, -28, 24, 38, 3); ctx.fill();
        for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 3; c2++) {
          ctx.fillStyle = ['#e8c84c', '#8fd05a', '#b86bff', '#e0a05a', '#5a9de0', '#e05a6a'][(r2 * 3 + c2) % 6];
          this.rr(ctx, -13 + c2 * 7.5, -25 + r2 * 12, 5.5, 8, 1.5); ctx.fill();
        }
        ctx.fillStyle = '#2c2333'; this.rr(ctx, 11, -24, 8, 22, 2); ctx.fill();   // coin panel
        ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(15, -18, 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3a2a2a'; this.rr(ctx, -14, 16, 22, 9, 2); ctx.fill();   // flap
        ctx.restore();
        ctx.fillStyle = '#e0a89a'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('SNACKS', ped.x, ped.y - 40);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#e8c84c'; ctx.font = this.font(11, true); ctx.fillText('3¢ · take your chances', ped.x, ped.y + 46); }
        continue;
      }
      if (ped.kind === 'claw') {   // Commissary claw machine
        this.shadow(ped.x, ped.y + 30, 22, 7, 0.28);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#4a6a9a'; this.rr(ctx, -24, -36, 48, 66, 5); ctx.fill();
        ctx.strokeStyle = '#2e4668'; ctx.lineWidth = 2.5; this.rr(ctx, -24, -36, 48, 66, 5); ctx.stroke();
        ctx.fillStyle = 'rgba(210,235,245,0.75)'; this.rr(ctx, -19, -30, 38, 40, 3); ctx.fill();
        // plushes inside
        ctx.fillStyle = '#c8a078'; ctx.beginPath(); ctx.arc(-8, 2, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#9a6f52'; ctx.beginPath(); ctx.arc(6, 4, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f0e8d0'; this.rr(ctx, 3, 6, 3, 6, 1.5); ctx.fill(); this.rr(ctx, 8, 6, 3, 6, 1.5); ctx.fill();   // little tusks
        // the claw, swaying
        const cx3 = Math.sin(G.t * 1.6 + ped.x) * 10;
        ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx3, -30); ctx.lineTo(cx3, -14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx3, -14); ctx.lineTo(cx3 - 5, -7); ctx.moveTo(cx3, -14); ctx.lineTo(cx3 + 5, -7); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#9ab8e0'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('CLAW', ped.x, ped.y - 42);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#e8c84c'; ctx.font = this.font(11, true); ctx.fillText('5¢ · win a friend (' + ped.uses + ' tries)', ped.x, ped.y + 46); }
        continue;
      }
      if (ped.kind === 'horoscope') {   // Commissary horoscope dispenser
        this.shadow(ped.x, ped.y + 30, 20, 7, 0.28);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#5a3a7a'; this.rr(ctx, -20, -34, 40, 62, 6); ctx.fill();
        ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 2.5; this.rr(ctx, -20, -34, 40, 62, 6); ctx.stroke();
        const tw2 = 0.5 + Math.sin(G.t * 2.6) * 0.4;
        ctx.fillStyle = 'rgba(232,200,76,' + (0.5 + tw2 * 0.5) + ')';
        ctx.font = this.font(16, true); ctx.textAlign = 'center'; ctx.fillText('★', 0, -14);
        ctx.fillStyle = 'rgba(200,176,224,0.9)'; ctx.font = this.font(8, true);
        ctx.fillText('YOUR', 0, 0); ctx.fillText('FORTUNE', 0, 9);
        ctx.fillStyle = '#2c2333'; this.rr(ctx, -10, 16, 20, 6, 2); ctx.fill();   // slip slot
        ctx.restore();
        ctx.fillStyle = '#c8b0e0'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('HOROSCOPE', ped.x, ped.y - 40);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#e8c84c'; ctx.font = this.font(11, true); ctx.fillText('2¢ · it\'s binding', ped.x, ped.y + 46); }
        continue;
      }
      if (ped.kind === 'basementdoor') {   // a floor hatch that was always there
        this.shadow(ped.x, ped.y + 8, 24, 8, 0.25);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#6a5238'; this.rr(ctx, -26, -16, 52, 32, 4); ctx.fill();
        ctx.strokeStyle = '#4a3824'; ctx.lineWidth = 2.5; this.rr(ctx, -26, -16, 52, 32, 4); ctx.stroke();
        for (let l = -18; l <= 18; l += 9) { ctx.beginPath(); ctx.moveTo(l, -14); ctx.lineTo(l, 14); ctx.stroke(); }
        ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.arc(16, 0, 3.5, 0, TAU); ctx.fill();   // ring pull
        ctx.restore();
        ctx.fillStyle = '#e8c84c'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('STAFF ONLY', ped.x, ped.y - 24);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#c8e0a0'; ctx.font = this.font(10, true); ctx.fillText('🕯 down to the basement', ped.x, ped.y + 30); }
        continue;
      }
      if (ped.kind === 'basementexit') {   // stairs, going up into the fluorescent hum
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#241c14'; this.rr(ctx, -26, -34, 52, 58, 4); ctx.fill();
        for (let s2 = 0; s2 < 4; s2++) { ctx.fillStyle = 'rgba(232,200,120,' + (0.15 + s2 * 0.12) + ')'; ctx.fillRect(-20 + s2 * 3, 14 - s2 * 12, 40 - s2 * 6, 8); }
        ctx.restore();
        ctx.fillStyle = '#e8c84c'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('⬆ BACK UP', ped.x, ped.y - 44);
        continue;
      }
      if (ped.kind === 'diploma') {   // the framed truth, slightly crooked
        ctx.save(); ctx.translate(ped.x, ped.y); ctx.rotate(-0.04);
        ctx.fillStyle = '#8a6a3a'; this.rr(ctx, -30, -22, 60, 44, 3); ctx.fill();
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, -25, -17, 50, 34, 2); ctx.fill();
        ctx.fillStyle = '#6a6272'; ctx.font = this.font(6, true); ctx.textAlign = 'center';
        ctx.fillText('CRUISE SHIP', 0, -8);
        ctx.fillText('MEDICAL ACADEMY', 0, -1);
        ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.arc(14, 9, 5, 0, TAU); ctx.fill();   // gold seal
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18, 10); ctx.lineTo(4, 10); ctx.stroke();
        ctx.restore();
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#c8b0e0'; ctx.font = this.font(10, true); ctx.textAlign = 'center'; ctx.fillText('🎓 squint at it', ped.x, ped.y + 34); }
        continue;
      }
      if (ped.kind === 'rivalduel') {   // they've been here a while. warming up. loudly.
        const RN = (typeof Meta !== 'undefined' && Meta.data.rival) ? Meta.data.rival.name : 'THE RIVAL';
        const hop = Math.abs(Math.sin(G.t * 5)) * 3;   // bouncing on their toes
        this.shadow(ped.x, ped.y + 16, 13, 5, 0.22);
        ctx.save(); ctx.translate(ped.x, ped.y - hop);
        ctx.fillStyle = '#d08a4a'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 14, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e05a5a'; this.rr(ctx, -11, -10, 22, 4.5, 2); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.ellipse(-4.5, -3, 2.2, 1.5, -0.2, 0, TAU); ctx.ellipse(4.5, -3, 2.2, 1.5, 0.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-3.5, 5); ctx.quadraticCurveTo(0, 3.4, 3.5, 5.4); ctx.stroke();
        ctx.fillStyle = '#c05050';   // little boxing gloves
        ctx.beginPath(); ctx.arc(-13, 2 - hop * 0.4, 4.5, 0, TAU); ctx.arc(13, 2 + hop * 0.4, 4.5, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#d08a4a'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('🥊 ' + RN, ped.x, ped.y - 32);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 90) {
          ctx.fillStyle = '#e8c84c'; ctx.font = this.font(10, true);
          ctx.fillText('“one round. c\'mon.”', ped.x, ped.y + 34);
        }
        continue;
      }
      if (ped.kind === 'designexit') {   // the blueprint back to the drafting table
        const bob2 = Math.sin(G.t * 2.2) * 2;
        this.shadow(ped.x, ped.y + 14, 22, 7, 0.22);
        ctx.save(); ctx.translate(ped.x, ped.y + bob2); ctx.rotate(-0.03);
        ctx.fillStyle = '#3a5a8a'; this.rr(ctx, -28, -20, 56, 40, 3); ctx.fill();   // blueprint sheet
        ctx.strokeStyle = 'rgba(220,235,255,0.7)'; ctx.lineWidth = 1.2;
        for (let gx = -20; gx <= 20; gx += 10) { ctx.beginPath(); ctx.moveTo(gx, -16); ctx.lineTo(gx, 16); ctx.stroke(); }
        for (let gy = -12; gy <= 12; gy += 8) { ctx.beginPath(); ctx.moveTo(-24, gy); ctx.lineTo(24, gy); ctx.stroke(); }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; this.rr(ctx, -14, -9, 28, 18, 2); ctx.stroke();   // the room, drafted
        ctx.restore();
        ctx.fillStyle = '#8fd0e0'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('🏗 BACK TO THE DESIGNER', ped.x, ped.y - 30);
        continue;
      }
      if (ped.kind === 'janitor') {   // forty years. one bucket.
        const rb = Math.sin(G.t * 1.8 + ped.x) * 1.2;
        this.shadow(ped.x, ped.y + 16, 14, 5, 0.22);
        ctx.save(); ctx.translate(ped.x, ped.y + rb);
        ctx.fillStyle = '#5a6a72'; this.rr(ctx, -9, -6, 18, 22, 5); ctx.fill();   // gray coveralls
        ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -14, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,40,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -14, 8, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#9aa2aa'; ctx.beginPath(); ctx.arc(0, -18, 8, Math.PI, 0); ctx.fill();   // gray hair
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-3, -14, 1.2, 0, TAU); ctx.arc(3, -14, 1.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,60,0.5)'; ctx.lineWidth = 1.2;   // the eye bags of four decades
        ctx.beginPath(); ctx.arc(-3, -12, 2, 0.2, Math.PI - 0.6); ctx.arc(3, -12, 2, 0.2, Math.PI - 0.6); ctx.stroke();
        ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 2.5;   // the mop, at rest
        ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(17, -22); ctx.stroke();
        ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        for (let m = 0; m < 4; m++) { ctx.beginPath(); ctx.moveTo(12, 13); ctx.lineTo(9 + m * 2.4, 20); ctx.stroke(); } ctx.lineCap = 'butt';
        ctx.fillStyle = '#8a8e96'; this.rr(ctx, -22, 6, 16, 12, 3); ctx.fill();   // the bucket
        ctx.fillStyle = 'rgba(140,180,200,0.6)'; this.rr(ctx, -20, 8, 12, 3, 2); ctx.fill();
        ctx.restore();
        this.drawItemIcon(ped.itemId, ped.x - 14, ped.y - 34 + Math.sin(G.t * 2.4) * 2);   // today's find
        ctx.fillStyle = '#e8c84c'; ctx.font = this.font(12, true); ctx.textAlign = 'center';
        ctx.fillText(ped.price + '¢', ped.x, ped.y + 34);
        ctx.fillStyle = '#b8b0a0'; ctx.font = this.font(9, true);
        ctx.fillText('THE JANITOR', ped.x, ped.y - 46);
        const it2 = DATA.ITEMS[ped.itemId];
        if (it2 && U.dist(G.player.x, G.player.y, ped.x, ped.y) < 80) { ctx.fillStyle = '#f0e8d8'; ctx.font = this.font(11, true); ctx.fillText(it2.name + ' · cash only', ped.x, ped.y + 46); }
        continue;
      }
      if (ped.kind === 'contract') {   // a patient with a plan and a pencil
        const def = DATA.CONTRACTS.find(c => c.id === ped.contractId);
        const rb = Math.sin(G.t * 2.4 + ped.x) * 1.8;
        this.shadow(ped.x, ped.y + 15, 12, 5, 0.22);
        ctx.save(); ctx.translate(ped.x, ped.y + rb);
        ctx.fillStyle = '#6a8ab0'; ctx.beginPath(); ctx.ellipse(0, 3, 10, 11, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -11, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,40,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -11, 8, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-3, -12, 1.4, 0, TAU); ctx.arc(3, -12, 1.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, 8, -6, 11, 14, 2); ctx.fill();   // the notepad
        ctx.strokeStyle = 'rgba(60,50,70,0.6)'; ctx.lineWidth = 1;
        for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(10, -3 + l * 4); ctx.lineTo(17, -3 + l * 4); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = '#8fd08a'; ctx.font = this.font(11, true); ctx.textAlign = 'center';
        ctx.fillText('📝 ' + (def ? def.name : 'side job'), ped.x, ped.y - 30);
        if (def && U.dist(G.player.x, G.player.y, ped.x, ped.y) < 84) { ctx.fillStyle = '#c8e0a0'; ctx.font = this.font(10, true); ctx.fillText(def.desc + ' → ' + def.rtext, ped.x, ped.y + 34); }
        continue;
      }
      if (ped.kind === 'ama' || ped.kind === 'amaexit') {   // the exit. it was always right there.
        const open = ped.kind === 'amaexit';
        this.shadow(ped.x, ped.y + 34, 26, 8, 0.3);
        ctx.save(); ctx.translate(ped.x, ped.y);
        ctx.fillStyle = '#5a7a5a'; this.rr(ctx, -30, -44, 60, 80, 6); ctx.fill();
        ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = 3; this.rr(ctx, -30, -44, 60, 80, 6); ctx.stroke();
        if (open) {   // daylight pours in
          const gg2 = ctx.createLinearGradient(0, -36, 0, 30);
          gg2.addColorStop(0, 'rgba(255,244,180,0.95)'); gg2.addColorStop(1, 'rgba(255,238,150,0.55)');
          ctx.fillStyle = gg2; this.rr(ctx, -22, -36, 44, 66, 3); ctx.fill();
          ctx.fillStyle = 'rgba(120,190,230,0.8)'; ctx.fillRect(-22, -36, 44, 16);   // a strip of actual sky
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-4, -30, 8, 3, 0, 0, TAU); ctx.ellipse(9, -27, 6, 2.5, 0, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = '#4a6a4a'; this.rr(ctx, -22, -36, 44, 66, 3); ctx.fill();
          ctx.fillStyle = '#c8d8c8'; ctx.beginPath(); ctx.arc(14, -2, 3.5, 0, TAU); ctx.fill();   // handle
          ctx.fillStyle = 'rgba(232,200,76,0.9)'; this.rr(ctx, -18, -30, 36, 14, 2); ctx.fill();   // the sign
          ctx.fillStyle = '#3a3020'; ctx.font = this.font(7, true); ctx.textAlign = 'center'; ctx.fillText('EXIT', 0, -20);
        }
        ctx.restore();
        ctx.fillStyle = open ? '#e8c84c' : '#a0c8a0'; ctx.font = this.font(11, true); ctx.textAlign = 'center';
        ctx.fillText(open ? '🌤 LEAVE (for real)' : '🚪 SELF-DISCHARGE (AMA)', ped.x, ped.y - 58);
        continue;
      }
      if (ped.kind === 'drugrep') {   // THE DRUG REP — teeth first, briefcase second
        const rb = Math.sin(G.t * 2.2 + ped.x) * 1.6;
        this.shadow(ped.x, ped.y + 16, 14, 5, 0.24);
        ctx.save(); ctx.translate(ped.x, ped.y + rb);
        ctx.fillStyle = '#3a4a6a'; this.rr(ctx, -10, -8, 20, 24, 6); ctx.fill();   // sharp suit
        ctx.fillStyle = '#f0ead8'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-4, 4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();   // shirt
        ctx.strokeStyle = '#c04050'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 6); ctx.stroke();   // power tie
        ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -16, 8, 0, TAU); ctx.fill();   // head
        ctx.strokeStyle = 'rgba(40,30,40,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -16, 8, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#4a3a28'; ctx.beginPath(); ctx.arc(0, -20, 8, Math.PI, 0); ctx.fill();   // slick hair
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-3, -16, 1.4, 0, TAU); ctx.arc(3, -16, 1.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -13, 4, 0.15, Math.PI - 0.15); ctx.stroke();   // the SMILE
        ctx.fillStyle = '#6a4a2a'; this.rr(ctx, 8, 2, 14, 11, 2); ctx.fill();   // briefcase
        ctx.fillStyle = '#c8a24a'; ctx.fillRect(13, 6, 4, 3);
        ctx.restore();
        ctx.fillStyle = '#8fd08a'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('FREE SAMPLES', ped.x, ped.y - 34);
        continue;
      }
      if (ped.kind === 'compound') {   // the back-room pharmacist: mortar, pestle, plausible deniability
        const cb = Math.sin(G.t * 1.6 + 2) * 1.5;
        this.shadow(ped.x, ped.y + 16, 15, 5, 0.24);
        ctx.save(); ctx.translate(ped.x, ped.y + cb);
        ctx.fillStyle = '#5a4a6a'; this.rr(ctx, -10, -8, 20, 24, 6); ctx.fill();       // hunched robe-coat
        ctx.fillStyle = '#d8c2a2'; ctx.beginPath(); ctx.arc(0, -15, 7.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3a3040'; ctx.beginPath(); ctx.arc(0, -19, 7.5, Math.PI, 0); ctx.fill();   // hood-ish hair
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-2.6, -15, 1.2, 0, TAU); ctx.arc(2.6, -15, 1.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8a8296'; ctx.beginPath(); ctx.ellipse(14, 8, 8, 5, 0, 0, TAU); ctx.fill();   // the mortar
        ctx.fillStyle = '#6a6276'; ctx.beginPath(); ctx.ellipse(14, 6, 6.5, 3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c8b8a0'; ctx.lineWidth = 3; ctx.lineCap = 'round';   // pestle, mid-grind
        const grind = Math.sin(G.t * 6) * 3;
        ctx.beginPath(); ctx.moveTo(14 + grind, 6); ctx.lineTo(18 + grind, -6); ctx.stroke(); ctx.lineCap = 'butt';
        const sm = (G.t * 20) % 22;   // normal smoke. the smoke is normal.
        ctx.fillStyle = 'rgba(184,107,255,' + (0.4 - sm * 0.016) + ')';
        ctx.beginPath(); ctx.arc(14 + Math.sin(G.t * 2) * 2, -2 - sm, 2.5 + sm * 0.12, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#b86bff'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('⚗ COMPOUNDING', ped.x, ped.y - 34);
        if (U.dist(G.player.x, G.player.y, ped.x, ped.y) < 90) {
          ctx.fillStyle = '#e8c84c'; ctx.font = this.font(10, true);
          ctx.fillText('two meds enter. one leaves. ' + ped.price + '¢', ped.x, ped.y + 34);
        }
        continue;
      }
      const bob = Math.sin(G.t * 2.4 + ped.x) * 3;
      // spotlight glow from above
      const gg = ctx.createRadialGradient(ped.x, ped.y - 26, 4, ped.x, ped.y - 26, 46);
      const gc = ped.kind === 'oon' ? '230,80,80' : ped.kind === 'sample' ? '140,230,140' : ped.kind === 'boss' ? '230,200,110' : '250,240,200';
      gg.addColorStop(0, 'rgba(' + gc + ',0.28)'); gg.addColorStop(1, 'rgba(' + gc + ',0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(ped.x, ped.y - 26, 46, 0, TAU); ctx.fill();
      this.shadow(ped.x, ped.y + 12, 20, 6, 0.28);
      // stone pedestal with shading
      const pg = ctx.createLinearGradient(ped.x, ped.y - 12, ped.x, ped.y + 14);
      pg.addColorStop(0, '#c4bccc'); pg.addColorStop(1, '#8a8296');
      ctx.fillStyle = pg;
      this.rr(ctx, ped.x - 16, ped.y - 4, 32, 18, 5); ctx.fill();
      ctx.fillStyle = '#a49cae';
      this.rr(ctx, ped.x - 11, ped.y - 12, 22, 10, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,50,0.3)'; ctx.lineWidth = 1.5;
      this.rr(ctx, ped.x - 16, ped.y - 4, 32, 18, 5); ctx.stroke();
      if (ped._mystery) {   // compounded: contents unknown, swirling, probably fine
        ctx.save(); ctx.translate(ped.x, ped.y - 26 + bob);
        ctx.fillStyle = 'rgba(184,107,255,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8e0f0'; this.rr(ctx, -7, -12, 14, 22, 5); ctx.fill();   // the vial
        ctx.strokeStyle = '#8a7aa0'; ctx.lineWidth = 1.6; this.rr(ctx, -7, -12, 14, 22, 5); ctx.stroke();
        const swirl = Math.sin(G.t * 3) * 2;
        ctx.fillStyle = '#b86bff'; this.rr(ctx, -5, -2 + swirl * 0.4, 10, 10 - swirl * 0.4, 3); ctx.fill();
        ctx.fillStyle = '#c8a24a'; this.rr(ctx, -4, -16, 8, 5, 2); ctx.fill();     // cork
        ctx.fillStyle = '#4a3a5a'; ctx.font = this.font(12, true); ctx.textAlign = 'center'; ctx.fillText('?', 0, 2);
        ctx.restore();
      } else this.drawItemIcon(ped.itemId, ped.x, ped.y - 26 + bob);
      if (ped._evidence) {   // bagged and tagged — it's yours, technically
        ctx.save(); ctx.translate(ped.x + 20, ped.y - 40); ctx.rotate(0.18);
        ctx.fillStyle = '#e8d84c'; this.rr(ctx, -12, -7, 24, 14, 2); ctx.fill();
        ctx.fillStyle = '#5a4a1a'; ctx.font = 'bold 7px "Arial Black",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('EVIDENCE', 0, 3);
        ctx.restore();
      }
      if (ped.price) {
        const coup = (G.player.coupons || 0) > 0 && ped.variant;
        const shown = coup ? Math.max(1, Math.ceil(ped.price * 0.5)) : ped.price;
        ctx.fillStyle = ped.kind === 'oon' ? '#e05a5a' : coup ? '#9db85a' : '#e8c84c';
        ctx.font = this.font(14, true); ctx.textAlign = 'center';
        ctx.fillText(ped.kind === 'oon' ? '♥ container' : (shown + '¢' + (coup ? ' 🎟' : '')), ped.x, ped.y + 30);
        if (ped.variant) { ctx.fillStyle = ped.variant === 'generic' ? '#9db85a' : '#e0c040'; ctx.font = this.font(9, true); ctx.fillText(ped.variant === 'generic' ? 'GENERIC' : 'BRAND®', ped.x, ped.y + 42); }
      }
      if (ped.kind === 'sample') {   // no charge. no charge at all.
        ctx.fillStyle = '#8fd08a'; ctx.font = this.font(13, true); ctx.textAlign = 'center';
        ctx.fillText('FREE*', ped.x, ped.y + 30);
        const sfx = DATA.SAMPLE_FX.find(f => f.id === ped.fx);
        if (sfx) { ctx.fillStyle = '#e0a05a'; ctx.font = this.font(9, true); ctx.fillText('*' + sfx.name, ped.x, ped.y + 42); }
      }
      const it = ped._mystery ? { name: '??? (compounded)' } : DATA.ITEMS[ped.itemId];
      if (it && U.dist(G.player.x, G.player.y, ped.x, ped.y) < 70) {
        ctx.fillStyle = 'rgba(20,14,24,0.75)';
        ctx.font = this.font(13, true);
        const w = ctx.measureText(it.name).width + 14;
        this.rr(ctx, ped.x - w / 2, ped.y - 62, w, 20, 6); ctx.fill();
        ctx.fillStyle = '#f0e8d8'; ctx.textAlign = 'center';
        ctx.fillText(it.name, ped.x, ped.y - 47);
      }
    }

    // shop stock
    for (const s of G.shopStock) {
      if (s.taken) continue;
      const icons = { half: () => this.drawHeart(s.x, s.y - 8, 9, '#e05a5a', true), pill: () => this.drawPillIcon(s.x, s.y - 8, DATA.PILL_COLORS[s.colorIdx || 0]), key: () => this.drawKeyIcon(s.x, s.y - 8), bomb: () => this.drawBombIcon(s.x, s.y - 8), coupon: () => { ctx.save(); ctx.fillStyle = '#c8e0a0'; this.rr(ctx, s.x - 12, s.y - 16, 24, 15, 3); ctx.fill(); ctx.strokeStyle = '#4a8a3a'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1; this.rr(ctx, s.x - 12, s.y - 16, 24, 15, 3); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#356a2a'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('%', s.x, s.y - 4); ctx.restore(); } };
      if (icons[s.type]) icons[s.type]();
      ctx.fillStyle = '#e8c84c';
      ctx.font = this.font(13, true); ctx.textAlign = 'center';
      ctx.fillText(s.price + '¢', s.x, s.y + 16);
    }

    // pickups
    for (const pk of G.pickups) {
      const bob = Math.sin(pk.t * 3) * 2.5;
      this.shadow(pk.x, pk.y + 10, 9, 3.5, 0.22);
      // an occasional twinkle so drops catch the eye
      const tw = (pk.t * 1.3) % 3;
      if (tw < 0.35) {
        const s = Math.sin(tw / 0.35 * Math.PI) * 5;
        ctx.strokeStyle = 'rgba(255,250,220,0.85)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pk.x - s, pk.y - 12 + bob); ctx.lineTo(pk.x + s, pk.y - 12 + bob);
        ctx.moveTo(pk.x, pk.y - 12 - s + bob); ctx.lineTo(pk.x, pk.y - 12 + s + bob);
        ctx.stroke();
      }
      if (pk.type === 'coin' || pk.type === 'nickel') this.drawCoin(pk.x, pk.y + bob, pk.type === 'nickel');
      else if (pk.type === 'half') this.drawHeart(pk.x, pk.y + bob, 8, '#e05a5a', true);
      else if (pk.type === 'full') this.drawHeart(pk.x, pk.y + bob, 10, '#e05a5a', false);
      else if (pk.type === 'pill') this.drawPillIcon(pk.x, pk.y + bob, DATA.PILL_COLORS[pk.colorIdx]);
      else if (pk.type === 'key') this.drawKeyIcon(pk.x, pk.y + bob);
      else if (pk.type === 'bomb') this.drawBombIcon(pk.x, pk.y + bob);
      else if (pk.type === 'document') {   // MISFILED: a manila folder that shouldn't be here
        const gl = ctx.createRadialGradient(pk.x, pk.y + bob, 3, pk.x, pk.y + bob, 24);
        gl.addColorStop(0, 'rgba(200,176,224,0.45)'); gl.addColorStop(1, 'rgba(200,176,224,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 24, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(pk.x, pk.y + bob); ctx.rotate(-0.06);
        ctx.fillStyle = '#d8b878'; this.rr(ctx, -13, -9, 26, 18, 2); ctx.fill();            // folder
        ctx.fillStyle = '#c8a860'; this.rr(ctx, -13, -12, 12, 5, 2); ctx.fill();            // tab
        ctx.fillStyle = '#f4eee0'; this.rr(ctx, -10, -6, 20, 12, 1); ctx.fill();            // the page inside
        ctx.strokeStyle = 'rgba(90,70,50,0.5)'; ctx.lineWidth = 1;
        for (let l2 = -3; l2 <= 3; l2 += 3) { ctx.beginPath(); ctx.moveTo(-7, l2); ctx.lineTo(7, l2); ctx.stroke(); }
        ctx.save(); ctx.rotate(-0.25); ctx.strokeStyle = 'rgba(176,48,48,0.85)'; ctx.lineWidth = 1.4;
        ctx.strokeRect(-9, -4, 18, 8);
        ctx.fillStyle = 'rgba(176,48,48,0.85)'; ctx.font = 'bold 5px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('MISFILED', 0, 2);
        ctx.restore();
        ctx.restore();
        if (U.dist(G.player.x, G.player.y, pk.x, pk.y) < 80) {
          ctx.fillStyle = '#c8b0e0'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
          ctx.fillText('🗂 a misfiled document', pk.x, pk.y - 18);
        }
      }
      else if (pk.type === 'trinket') {   // a personal effect, glinting
        const T2 = DATA.TRINKETS.find(t2 => t2.id === pk.trinketId);
        const gl = ctx.createRadialGradient(pk.x, pk.y + bob, 2, pk.x, pk.y + bob, 18);
        gl.addColorStop(0, 'rgba(200,176,224,0.4)'); gl.addColorStop(1, 'rgba(200,176,224,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 18, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f4eee0'; this.rr(ctx, pk.x - 9, pk.y + bob - 9, 18, 18, 4); ctx.fill();
        ctx.strokeStyle = '#8a7aa0'; ctx.lineWidth = 1.6; this.rr(ctx, pk.x - 9, pk.y + bob - 9, 18, 18, 4); ctx.stroke();
        ctx.font = this.font(11); ctx.textAlign = 'center'; ctx.fillStyle = '#4a4058';
        ctx.fillText(T2 ? T2.icon : '❔', pk.x, pk.y + bob + 4);
        if (T2 && U.dist(G.player.x, G.player.y, pk.x, pk.y) < 70) {
          ctx.fillStyle = '#c8b0e0'; ctx.font = this.font(10, true);
          ctx.fillText(T2.name, pk.x, pk.y - 18);
        }
      }
    }

    // bombs placed
    for (const b of G.bombs) {
      const flash = b.fuse < 0.5 && Math.sin(G.t * 30) > 0;
      ctx.fillStyle = flash ? '#e05a5a' : '#f2ead6';
      ctx.beginPath(); ctx.arc(b.x, b.y, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, 13, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#2c2333';
      ctx.font = this.font(9, true); ctx.textAlign = 'center';
      ctx.fillText('CLAIM', b.x, b.y + 3);
    }

    // stamps (adjuster AoE telegraphs)
    for (const s of G.stamps) {
      ctx.strokeStyle = 'rgba(200,60,60,' + (0.4 + 0.5 * (1 - s.t)) + ')';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      if (s.t < 0.18) {
        ctx.fillStyle = 'rgba(200,60,60,0.5)';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = this.font(15, true); ctx.textAlign = 'center';
        ctx.fillText('DENIED', s.x, s.y + 5);
      }
    }

    // enemies
    for (const e of G.enemies) this.drawEnemy(e, G);

    // heal beam (enabler)
    if (G.healBeam && G.healBeam.t > 0) {
      ctx.strokeStyle = 'rgba(230,220,120,' + G.healBeam.t * 2 + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(G.healBeam.x1, G.healBeam.y1); ctx.lineTo(G.healBeam.x2, G.healBeam.y2); ctx.stroke();
    }

    // boss
    if (G.boss2 && !G.boss2.dead) {   // JOINT COMMISSION partner (dozy until its wake timer runs out)
      if (G.boss2._wakeT > 0) {
        const ctx2 = this.ctx;
        ctx2.save(); ctx2.globalAlpha = 0.75;
        this.drawBoss(G.boss2, G);
        ctx2.restore();
        ctx2.fillStyle = '#c8b8d8'; ctx2.font = this.font(11, true); ctx2.textAlign = 'center';
        ctx2.fillText('📋 reviewing your file… ' + Math.ceil(G.boss2._wakeT) + 's', G.boss2.x, G.boss2.y - (G.boss2.r || 30) - 18);
      } else this.drawBoss(G.boss2, G);
    }
    if (G.boss) this.drawBoss(G.boss, G);

    // player + familiars + support group
    for (const f of G.player.familiars) this.drawFamiliar(f, G);
    for (const a of G.player.allies) this.drawAlly(a, G);
    if (G.player.pet) this.drawPet(G.player.pet, G);
    if (G.p2) this.drawP2(G.p2, G);
    if (G.intern) this.drawIntern(G.intern, G);
    if (G.race) this.drawRaceRival(G.race, G);
    this.drawPlayer(G.player, G);

    // tears — glossy droplets with shadow
    for (const t of G.tears) {
      this.shadow(t.x, t.y + t.r * 0.7, t.r * 0.8, t.r * 0.32, 0.16);
      const tg = ctx.createRadialGradient(t.x - t.r * 0.35, t.y - t.r * 0.4, t.r * 0.2, t.x, t.y, t.r);
      tg.addColorStop(0, t.big ? '#a9d0f4' : '#bfe2fb');
      tg.addColorStop(0.6, t.big ? '#5a88c8' : '#6fb0e6');
      tg.addColorStop(1, t.big ? '#3f6aa8' : '#4f8fc8');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(t.x - t.r * 0.32, t.y - t.r * 0.38, t.r * 0.32, 0, TAU); ctx.fill();
    }

    // enemy bullets — glossy menacing orbs
    for (const b of G.eBullets) {
      if (G.player.diag === 'anxiety') { // hypervigilance glint
        ctx.strokeStyle = 'rgba(255,255,160,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3 + Math.sin(G.t * 10) * 1.5, 0, TAU); ctx.stroke();
      } else if (G.player.diag === 'ptsd') { // hypervigilant: every threat is outlined in alarm-red
        ctx.strokeStyle = 'rgba(224,108,98,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); ctx.stroke();
      }
      this.shadow(b.x, b.y + b.r * 0.7, b.r * 0.8, b.r * 0.3, 0.14);
      const bgd = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.2, b.x, b.y, b.r);
      bgd.addColorStop(0, this.shade(b.clr, 0.4)); bgd.addColorStop(1, this.shade(b.clr, -0.15));
      ctx.fillStyle = bgd;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,30,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      if (Meta.data.a11y && Meta.data.a11y.bulletContrast) { // high-contrast outline for readability
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, TAU); ctx.stroke();
      }
    }

    // particles + gibs
    for (const p of G.parts) {
      ctx.globalAlpha = U.clamp(p.life / (p.settled ? 0.9 : p.max), 0, 1);
      if (p.gib) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // chunk with darker outline + highlight
        ctx.fillStyle = this.shade(p.clr, -0.15);
        this.rr(ctx, -p.r, -p.r * 0.8, p.r * 2, p.r * 1.6, p.r * 0.5); ctx.fill();
        ctx.fillStyle = this.shade(p.clr, 0.28);
        ctx.beginPath(); ctx.ellipse(-p.r * 0.3, -p.r * 0.3, p.r * 0.4, p.r * 0.3, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.clr;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // float texts
    for (const t of G.texts) {
      ctx.globalAlpha = U.clamp(t.life, 0, 1);
      ctx.fillStyle = t.clr;
      ctx.font = this.font(t.small ? 10 : 14, true);
      ctx.textAlign = 'center';
      ctx.fillText(t.txt, t.x, t.y);
      ctx.globalAlpha = 1;
    }
  },

  /* ============ the player doodle ============ */
  /* ============ death recap (the incident, reconstructed) ============ */
  drawRecap(cv, G) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const R = G._recap || [];
    ctx.fillStyle = '#141018'; ctx.fillRect(0, 0, W, H);
    // map room coords → canvas
    const mx = (x) => (x - RX) / RW * (W - 20) + 10;
    const my = (y) => (y - RY) / RH * (H - 20) + 10;
    // room sketch
    ctx.strokeStyle = 'rgba(180,170,200,0.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    if (G.room && G.room.layout) {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const t = G.room.layout[r][c];
        if (t === 1 || t === 2) { ctx.fillStyle = t === 1 ? 'rgba(120,110,130,0.35)' : 'rgba(180,160,120,0.3)'; ctx.fillRect(mx(RX + c * TILE) + 1, my(RY + r * TILE) + 1, (W - 20) / COLS - 2, (H - 20) / ROWS - 2); }
        else if (t === 3) { ctx.fillStyle = 'rgba(200,90,90,0.3)'; ctx.fillRect(mx(RX + c * TILE) + 3, my(RY + r * TILE) + 3, (W - 20) / COLS - 6, (H - 20) / ROWS - 6); }
      }
    }
    // your last walk: a ghost trail brightening toward the end
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 1; i < R.length; i++) {
      const a = i / R.length;
      ctx.strokeStyle = 'rgba(240,232,216,' + (0.08 + a * 0.55) + ')';
      ctx.beginPath(); ctx.moveTo(mx(R[i - 1].x), my(R[i - 1].y)); ctx.lineTo(mx(R[i].x), my(R[i].y)); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    const last = R[R.length - 1];
    if (last) {
      // the field at the end: enemies as dots, bullets as sparks
      for (const e of (last.e || [])) { ctx.fillStyle = 'rgba(200,120,140,0.85)'; ctx.beginPath(); ctx.arc(mx(e[0]), my(e[1]), 3.4, 0, TAU); ctx.fill(); }
      for (const b of (last.b || [])) { ctx.fillStyle = 'rgba(224,110,110,0.9)'; ctx.beginPath(); ctx.arc(mx(b[0]), my(b[1]), 2, 0, TAU); ctx.fill(); }
      // the spot where it happened
      const dx = mx(last.x), dy = my(last.y);
      ctx.strokeStyle = '#f0e8d8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx - 5, dy - 5); ctx.lineTo(dx + 5, dy + 5); ctx.moveTo(dx + 5, dy - 5); ctx.lineTo(dx - 5, dy + 5); ctx.stroke();
      // circle the nearest hazard — the presumed instrument of discharge
      let kill = null, kd = 1e9;
      for (const b of (last.b || [])) { const d = Math.hypot(b[0] - last.x, b[1] - last.y); if (d < kd) { kd = d; kill = b; } }
      if (!kill || kd > 90) for (const e of (last.e || [])) { const d = Math.hypot(e[0] - last.x, e[1] - last.y); if (d < kd) { kd = d; kill = e; } }
      if (kill) {
        ctx.strokeStyle = '#e05a5a'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(mx(kill[0]), my(kill[1]), 9, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // hp ticker along the bottom
    ctx.fillStyle = 'rgba(240,232,216,0.5)'; ctx.font = 'bold 8px "Trebuchet MS",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('−6s', 12, H - 3);
    ctx.textAlign = 'right'; ctx.fillText('☠', W - 12, H - 3);
  },

  /* ============ THE INTERN (smaller, newer, terrified) ============ */
  drawIntern(I, G) {
    const ctx = this.ctx;
    const blink = I.iframes > 0 && Math.sin(G.t * 24) > 0.2;
    this.shadow(I.x, I.y + 11, 10, 4, 0.22);
    ctx.save();
    ctx.translate(I.x, I.y);
    if (blink) ctx.globalAlpha = 0.45;
    ctx.scale(0.78, 0.78);   // smaller. newer.
    ctx.fillStyle = '#c9b696'; ctx.beginPath(); ctx.ellipse(-4, 13, 3.4, 2.4, 0, 0, TAU); ctx.ellipse(4, 13, 3.4, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e2d0b0'; ctx.beginPath(); ctx.ellipse(0, 7, 7.5, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4e6cc'; ctx.beginPath(); ctx.arc(0, -6, 13, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(58,40,50,0.3)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -6, 13, 0, TAU); ctx.stroke();
    // wide worried eyes, tracking the nearest bad thing
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-4.5, -7, 3.4, 4, 0, 0, TAU); ctx.ellipse(4.5, -7, 3.4, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-4.5, -6.5, 1.8, 0, TAU); ctx.arc(4.5, -6.5, 1.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a6a50'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';   // worried brows
    ctx.beginPath(); ctx.moveTo(-8, -13); ctx.lineTo(-2, -11.5); ctx.moveTo(8, -13); ctx.lineTo(2, -11.5); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = '#7a5a48'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -1, 2.6, Math.PI + 0.4, TAU - 0.4); ctx.stroke();   // tiny worried o-mouth
    if (I.panic > 0.4) {   // sweat
      ctx.fillStyle = 'rgba(140,200,240,0.8)';
      ctx.beginPath(); ctx.ellipse(10, -12 + (G.t * 30 % 8), 1.6, 2.4, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // the badge
    ctx.fillStyle = '#e8c05a'; ctx.font = this.font(8, true); ctx.textAlign = 'center';
    ctx.fillText('🪪 INTERN · ' + '♥'.repeat(Math.max(0, I.hp)), I.x, I.y - 24);
  },

  /* ============ Patient Two (couch co-op) ============ */
  drawP2(q, G) {
    const ctx = this.ctx;
    const down = q._downT > 0;
    ctx.save();
    if (down) ctx.globalAlpha = 0.55;
    try { this.drawPlayer(q, G); } catch (e) { }
    ctx.restore();
    // the Ⅱ chip so the couch knows who's who
    ctx.fillStyle = down ? '#8a7c88' : (DATA.DIAG[q.diag] || DATA.DIAG.adhd).color;
    ctx.font = this.font(11, true); ctx.textAlign = 'center';
    ctx.fillText(down ? 'Ⅱ ✚' : 'Ⅱ', q.x, q.y - 34);
    if (down) { ctx.fillStyle = '#c8b8c0'; ctx.font = this.font(9, true); ctx.fillText('clear the room', q.x, q.y - 24); }
  },

  /* ============ emotional support animals ============ */
  /* THE RIVAL, mid-race: elbows out, ethics optional */
  drawRaceRival(RC, G) {
    const ctx = this.ctx;
    const bob = Math.abs(Math.sin(RC.t * 11)) * 3.5;   // a committed sprint
    const lean = RC.done ? 0 : 0.14;
    this.shadow(RC.x, RC.y + 15, 12, 4.5, 0.24);
    ctx.save();
    ctx.translate(RC.x, RC.y - bob);
    ctx.rotate((RC.exitVx < 0 ? -1 : 1) * lean);
    ctx.fillStyle = '#d08a4a';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e05a5a'; this.rr(ctx, -10, -9, 20, 4, 2); ctx.fill();   // the sweatband
    ctx.fillStyle = '#2c2333';
    ctx.beginPath(); ctx.ellipse(-4, -2, 2, 1.4, -0.2, 0, TAU); ctx.ellipse(4, -2, 2, 1.4, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-3, 4.5); ctx.quadraticCurveTo(0, 3.2, 3, 4.8); ctx.stroke();
    ctx.strokeStyle = '#b06a34'; ctx.lineWidth = 3; ctx.lineCap = 'round';   // pumping arms
    const sw = Math.sin(RC.t * 11) * 7;
    ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(-13, 3 + sw); ctx.moveTo(9, 3); ctx.lineTo(13, 3 - sw); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
    const RN = (typeof Meta !== 'undefined' && Meta.data.rival) ? Meta.data.rival.name : 'RIVAL';
    ctx.fillStyle = '#d08a4a'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
    ctx.fillText(RC.done ? RN : '🏁 ' + RN, RC.x, RC.y - 24);
    if (!RC.done) {   // dust of pure competition
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = 'rgba(160,140,110,' + (0.25 - i * 0.1) + ')';
        ctx.beginPath(); ctx.arc(RC.x - Math.cos(U.ang(RC.x, RC.y, RC.ped.x, RC.ped.y)) * (14 + i * 8), RC.y + 12, 3 - i, 0, TAU); ctx.fill();
      }
    }
  },

  drawPet(pet, G) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pet.x, pet.y);
    const bob = Math.sin(pet.t * 4) * 1.5;
    if (pet.type === 'pigeon') {
      this.shadow(0, 8, 8, 3, 0.2);
      ctx.translate(0, bob - Math.abs(Math.sin(pet.t * 8)) * 3);   // flappy hop
      ctx.fillStyle = '#9aa0ac'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5.5, 0, 0, TAU); ctx.fill();   // body
      ctx.fillStyle = '#7a8290'; ctx.beginPath(); ctx.ellipse(-2, -1, 4.5, 3, -0.4 + Math.sin(pet.t * 10) * 0.25, 0, TAU); ctx.fill();   // wing
      ctx.fillStyle = '#8a92a2'; ctx.beginPath(); ctx.arc(5, -4, 3.4, 0, TAU); ctx.fill();   // head
      ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(6, -4.5, 0.9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e0a05a'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(11, -3.2); ctx.lineTo(8, -2.4); ctx.closePath(); ctx.fill();   // beak
      ctx.fillStyle = '#5a8a5a'; ctx.beginPath(); ctx.ellipse(1.5, -2.5, 2.4, 1.6, 0, 0, TAU) ; ctx.fill();   // iridescent neck
      if (pet.evo) {   // the carrier satchel
        ctx.fillStyle = '#8a6a3a'; this.rr(ctx, -3, 1, 7, 5, 1.5); ctx.fill();
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2, 1); ctx.lineTo(2, -4); ctx.stroke();
        ctx.fillStyle = '#e8c84c'; ctx.fillRect(-1, 3, 2.5, 1.5);
      }
    } else if (pet.type === 'cat') {
      this.shadow(0, 10, 9, 3.5, 0.2);
      ctx.translate(0, bob * 0.4);
      ctx.fillStyle = '#d08a4a'; ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, 0, 0, TAU); ctx.fill();   // body
      ctx.strokeStyle = '#d08a4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';   // tail
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.quadraticCurveTo(-13, -2 + Math.sin(pet.t * 3) * 3, -11, -8); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#d89a5e'; ctx.beginPath(); ctx.arc(5, -5, 4.5, 0, TAU); ctx.fill();   // head
      ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(3, -12); ctx.lineTo(5, -8.5); ctx.closePath();   // ears
      ctx.moveTo(8, -8); ctx.lineTo(9, -12); ctx.lineTo(6.5, -8.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(4, -5.5, 0.8, 0, TAU); ctx.arc(7, -5.5, 0.8, 0, TAU); ctx.fill();
      if (pet.evo) {   // seniority: gray muzzle + reading glasses
        ctx.fillStyle = 'rgba(220,220,225,0.75)'; ctx.beginPath(); ctx.ellipse(6.5, -3.5, 2.6, 1.8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(200,180,120,0.9)'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(4, -5.5, 1.8, 0, TAU); ctx.arc(7, -5.5, 1.8, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5.8, -5.5); ctx.lineTo(5.2, -5.5); ctx.stroke();
      }
      if (pet._swipeT > 0 && pet._swipeAt) {   // the swat
        ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.lineWidth = 2;
        const sa = U.ang(pet.x, pet.y, pet._swipeAt.x, pet._swipeAt.y);
        for (const off of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.arc(0, -2, 14, sa + off - 0.3, sa + off + 0.3); ctx.stroke(); }
      }
    } else if (pet.type === 'snake') {
      for (let i = pet.segs.length - 1; i >= 0; i--) {
        const s = pet.segs[i], f = 1 - i / Math.max(1, pet.segs.length);
        ctx.fillStyle = i % 2 ? '#5a9a5a' : '#4a8a4a';
        ctx.beginPath(); ctx.arc(s.x - pet.x, s.y - pet.y, 2.2 + f * 2.6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#6aaa5a'; ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 4.2, 0, 0, TAU); ctx.fill();   // head
      ctx.fillStyle = '#e8d05a'; ctx.beginPath(); ctx.arc(-1.6, -1.4, 1, 0, TAU); ctx.arc(1.6, -1.4, 1, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c05050'; ctx.lineWidth = 1.2;   // the tongue, tasting your issues
      if (Math.sin(pet.t * 6) > 0.6) { ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, 7); ctx.moveTo(0, 7); ctx.lineTo(-1.5, 9); ctx.moveTo(0, 7); ctx.lineTo(1.5, 9); ctx.stroke(); }
    } else if (pet.type === 'goldfish') {
      this.shadow(0, 12, 8, 3, 0.18);
      ctx.fillStyle = 'rgba(180,215,230,0.55)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();   // the bowl
      ctx.strokeStyle = 'rgba(140,180,200,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(120,170,210,0.5)'; ctx.beginPath(); ctx.arc(0, 2.5, 6.5, 0, Math.PI); ctx.fill();   // water
      const fx = Math.sin(pet.t * 2.2) * 3, dir = Math.cos(pet.t * 2.2) >= 0 ? 1 : -1;
      ctx.save(); ctx.translate(fx, 1.5); ctx.scale(dir, 1);
      ctx.fillStyle = '#e8944a'; ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.lineTo(-5, -1.8); ctx.lineTo(-5, 1.8); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (pet.evo) {   // the second goldfish. they remember each other.
        const fx2 = Math.sin(pet.t * 2.2 + Math.PI) * 3, dir2 = Math.cos(pet.t * 2.2 + Math.PI) >= 0 ? 1 : -1;
        ctx.save(); ctx.translate(fx2, 4); ctx.scale(dir2, 1);
        ctx.fillStyle = '#e8b44a'; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 1.6, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.lineTo(-4.2, -1.4); ctx.lineTo(-4.2, 1.4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  },

  drawPlayer(p, G) {
    const ctx = this.ctx;
    if (p.dead) return;
    this.shadow(p.x, p.y + 15, 15, 6, 0.26);
    const blink = p.iframes > 0 && Math.sin(G.t * 24) > 0.2;
    ctx.save();
    ctx.translate(p.x, p.y);
    // walk bob: a little life in the step
    if (p.moving && (G.t != null)) {
      const bob = Math.sin(G.t * 12) * 1.7;
      ctx.translate(0, bob * 0.6);
      ctx.scale(1 + bob * 0.006, 1 - bob * 0.006);
    }
    if (blink) ctx.globalAlpha = 0.45;

    // depression cocoon (Under The Covers) — a protective bubble
    if (p.cocoonT > 0) {
      ctx.fillStyle = 'rgba(93,138,168,0.22)';
      ctx.beginPath(); ctx.arc(0, 0, 30 + Math.sin(G.t * 6) * 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(140,180,210,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 30 + Math.sin(G.t * 6) * 2, 0, TAU); ctx.stroke();
    }
    // transformation aura
    if (p.transformTint) {
      ctx.strokeStyle = p.transformTint; ctx.globalAlpha *= 0.5;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a = G.t * 2 + i * TAU / 3; ctx.beginPath(); ctx.arc(Math.cos(a) * 22, Math.sin(a) * 22 - 4, 2.5, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = blink ? 0.45 : 1;
    }
    // hyperfocus / OCD "just right" ring (tinted per diagnosis)
    if (p.focused) {
      ctx.strokeStyle = p.diag === 'ocd' ? 'rgba(106,127,240,0.75)' : 'rgba(247,179,43,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(0, 0, 26 + Math.sin(G.t * 4) * 2, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // mania sparkle / dip cloud
    if (p.diag === 'bipolar' && !p.flags.stable) {
      if (p.mania) {
        ctx.fillStyle = 'rgba(255,220,80,0.9)';
        for (let i = 0; i < 3; i++) {
          const a = G.t * 5 + i * 2.1;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 24, Math.sin(a) * 24 - 6, 2.5, 0, TAU); ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(120,130,160,0.65)';
        ctx.beginPath();
        ctx.arc(-7, -30, 6, 0, TAU); ctx.arc(0, -33, 8, 0, TAU); ctx.arc(8, -30, 6, 0, TAU);
        ctx.fill();
      }
    }
    // adrenaline sparks
    if (p.adren) {
      ctx.strokeStyle = 'rgba(90,220,200,0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = G.t * 9 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
        ctx.stroke();
      }
    }

    // MIDNIGHT WARD mastery skin: the gown takes your diagnosis color, the skin goes moonlit
    const skinOn = typeof Meta !== 'undefined' && Meta.data.skinOn && Meta.data.skinOn[p.diag] && !p.noSkin;
    const dgc = skinOn ? ((DATA.DIAG[p.diag] || DATA.DIAG.adhd).color) : null;
    const PAL = skinOn
      ? { feet: this.shade(dgc, -0.5), body0: this.shade(dgc, -0.05), body1: this.shade(dgc, -0.4), arms: this.shade(dgc, -0.25), head0: '#efe8f8', head1: '#d4c8e6', head2: '#9c8eb8', rim: 'rgba(220,205,255,0.5)' }
      : { feet: '#b99a76', body0: '#edd3b3', body1: '#c6a684', arms: '#d8bb96', head0: '#fdf1de', head1: '#f2dcc0', head2: '#cdb08b', rim: 'rgba(255,250,238,0.45)' };
    // little shuffling feet
    const step = p.moving ? Math.sin(G.t * 15) * 3.2 : 0;
    ctx.fillStyle = PAL.feet;
    ctx.beginPath(); ctx.ellipse(-5.5, 17 - Math.max(0, step), 4.2, 3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5.5, 17 + Math.min(0, step), 4.2, 3, 0, 0, TAU); ctx.fill();
    // stubby body
    const bg = ctx.createLinearGradient(0, 3, 0, 17);
    bg.addColorStop(0, PAL.body0); bg.addColorStop(1, PAL.body1);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 10, 8.5, 7, 0, 0, TAU); ctx.fill();
    // tiny arms
    ctx.strokeStyle = PAL.arms; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(-11, 11 + step * 0.3); ctx.moveTo(7, 7); ctx.lineTo(11, 11 - step * 0.3); ctx.stroke();
    ctx.lineCap = 'butt';

    // big round head with cool rim-light so it pops off the dark floor
    const HR = 16;
    const hg = ctx.createRadialGradient(-5, -12, 3, 0, -6, HR + 4);
    hg.addColorStop(0, PAL.head0); hg.addColorStop(0.62, PAL.head1); hg.addColorStop(1, PAL.head2);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, -6, HR, 0, TAU); ctx.fill();
    ctx.strokeStyle = PAL.rim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -6, HR - 1, 0.35, 1.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(58,40,50,0.32)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -6, HR, 0, TAU); ctx.stroke();
    // rosy cheeks
    ctx.fillStyle = 'rgba(224,132,120,0.32)';
    ctx.beginPath(); ctx.ellipse(-9.5, -1, 3.6, 2.6, 0, 0, TAU); ctx.ellipse(9.5, -1, 3.6, 2.6, 0, 0, TAU); ctx.fill();

    // face — big eyes look toward aim
    const ex = Math.cos(p.aimAng) * 2.8, ey = Math.sin(p.aimAng) * 2.2 - 6;
    const sad = p.diag === 'depression';
    ctx.fillStyle = '#2c2333';
    ctx.beginPath(); ctx.ellipse(-6 + ex, ey, 3, sad ? 2.3 : 3.9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 + ex, ey, 3, sad ? 2.3 : 3.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(-7 + ex, ey - 1.4, 1.3, 0, TAU); ctx.arc(5 + ex, ey - 1.4, 1.3, 0, TAU); ctx.fill();
    // tear streaks
    ctx.strokeStyle = 'rgba(122,184,232,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6 + ex, ey + 3.5); ctx.lineTo(-6 + ex, ey + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6 + ex, ey + 3.5); ctx.lineTo(6 + ex, ey + 8); ctx.stroke();
    // mouth
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (p.diag === 'fine') { ctx.moveTo(-4, 3); ctx.lineTo(4, 3); }
    else if (p.mania && p.diag === 'bipolar' && !p.flags.stable) { ctx.arc(0, 1, 4.5, 0.12, Math.PI - 0.12); }
    else { ctx.arc(0, 7, 4.5, Math.PI + 0.28, TAU - 0.28); }
    ctx.stroke();

    // diagnosis accessory (sized to the bigger head)
    if (p.diag === 'adhd') {
      ctx.fillStyle = '#f7b32b';
      this.rr(ctx, -16, -15, 32, 5.5, 2); ctx.fill();
      ctx.fillStyle = '#d89818'; ctx.fillRect(-3, -15, 6, 5.5);
      if (p.moving) {
        ctx.strokeStyle = 'rgba(247,179,43,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-22, 3); ctx.lineTo(-28, 3); ctx.moveTo(-21, -6); ctx.lineTo(-27, -8); ctx.stroke();
      }
    } else if (p.diag === 'schizo') {
      ctx.fillStyle = '#c8c8d2';
      ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(0, -30); ctx.lineTo(13, -13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#9a9aa8'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-7, -17); ctx.lineTo(-2, -23); ctx.moveTo(2, -24); ctx.lineTo(7, -17); ctx.stroke();
    } else if (p.diag === 'depression') {
      const cg = ctx.createLinearGradient(0, -22, 0, -3);
      cg.addColorStop(0, '#6d9ab8'); cg.addColorStop(1, '#4a748e');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, -6, 17, Math.PI * 1.03, Math.PI * 1.97); ctx.lineTo(16, -2); ctx.lineTo(-16, -2); ctx.closePath(); ctx.fill();
    } else if (p.diag === 'anxiety') {
      ctx.fillStyle = 'rgba(122,184,232,0.9)';
      const sw = Math.sin(G.t * 3) * 2;
      ctx.beginPath(); ctx.arc(13, -15 + sw, 2.8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -10 + sw * 0.6, 2, 0, TAU); ctx.fill();
    } else if (p.diag === 'bipolar') {
      ctx.fillStyle = p.mania || p.flags.stable ? '#e8c84c' : '#7a88b8';
      ctx.beginPath(); ctx.arc(12, -14, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(10.5, -15.5, 1.5, 0, TAU); ctx.fill();
    } else if (p.diag === 'fine') {
      ctx.fillStyle = '#8a4a4a';
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(3.5, 8); ctx.lineTo(0, 16); ctx.lineTo(-3.5, 8); ctx.closePath(); ctx.fill();
    } else if (p.diag === 'ocd') {
      // three perfectly aligned tiles across the brow — symmetry, in its right place
      ctx.fillStyle = '#6c7ff0';
      this.rr(ctx, -13, -16, 5, 5, 1.2); ctx.fill();
      this.rr(ctx, -2.5, -16, 5, 5, 1.2); ctx.fill();
      this.rr(ctx, 8, -16, 5, 5, 1.2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(-13, -16, 5, 5); ctx.strokeRect(-2.5, -16, 5, 5); ctx.strokeRect(8, -16, 5, 5);
    } else if (p.diag === 'ptsd') {
      // concerned, alert brows (inner-up) + a hypervigilant scan when On Edge
      ctx.strokeStyle = '#8a4a44'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-11, -13); ctx.lineTo(-3, -16.5); ctx.moveTo(11, -13); ctx.lineTo(3, -16.5); ctx.stroke(); ctx.lineCap = 'butt';
      if (p.lastHitT > 4) {
        ctx.strokeStyle = 'rgba(194,90,82,' + (0.35 + Math.sin(G.t * 4) * 0.2) + ')'; ctx.lineWidth = 1.6;
        const sa = G.t * 3; ctx.beginPath(); ctx.arc(0, -6, 21, sa, sa + 1.1); ctx.stroke();
      }
    } else if (p.diag === 'insomnia') {
      // heavy dark eye-bags; WIRED snaps the eyes wide and bloodshot, calm droops the lids
      ctx.strokeStyle = 'rgba(70,104,110,0.8)'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-11, -8, 5, 0.2, 1.05); ctx.stroke();
      ctx.beginPath(); ctx.arc(11, -8, 5, Math.PI - 1.05, Math.PI - 0.2); ctx.stroke(); ctx.lineCap = 'butt';
      if (p.wired) {
        const jit = Math.sin(G.t * 42) * 0.7;   // caffeine tremor
        ctx.fillStyle = 'rgba(240,110,110,0.95)';
        ctx.beginPath(); ctx.arc(-11 + jit, -14, 1.5, 0, TAU); ctx.arc(11 + jit, -14, 1.5, 0, TAU); ctx.fill();   // bloodshot pinpoints
        ctx.strokeStyle = '#3c6a66'; ctx.lineWidth = 2; ctx.lineCap = 'round';   // brows shot up
        ctx.beginPath(); ctx.moveTo(-15, -18); ctx.lineTo(-6, -19.5); ctx.moveTo(15, -18); ctx.lineTo(6, -19.5); ctx.stroke(); ctx.lineCap = 'butt';
      } else {
        ctx.strokeStyle = 'rgba(70,104,110,0.9)'; ctx.lineWidth = 2.1; ctx.lineCap = 'round';   // droopy half-lids
        ctx.beginPath(); ctx.moveTo(-15, -14); ctx.lineTo(-6, -12.5); ctx.moveTo(15, -14); ctx.lineTo(6, -12.5); ctx.stroke(); ctx.lineCap = 'butt';
        if (p.napActive > 0) { ctx.fillStyle = 'rgba(127,212,200,0.9)'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('z', 15, -20); }
      }
    } else if (p.diag === 'burnout') {
      // the amber sweatband of someone who "is fine" + a tiny travel mug welded to one hand
      ctx.fillStyle = '#d09a3a';
      this.rr(ctx, -14, -18, 28, 5, 2.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; this.rr(ctx, -14, -18, 28, 2, 2); ctx.fill();
      ctx.fillStyle = '#8a6a3a'; this.rr(ctx, 10, 6, 7, 9, 2); ctx.fill();   // the mug
      ctx.fillStyle = '#3a2c1e'; this.rr(ctx, 11, 7, 5, 2.5, 1); ctx.fill();
      if (p.battery > 75) {   // OVERDRIVE hum
        ctx.strokeStyle = 'rgba(232,192,90,' + (0.4 + Math.sin((G.t || 0) * 8) * 0.2) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -2, 24, 0, TAU); ctx.stroke();
      } else if (p.battery < 25) {   // running on fumes: little grey wisps
        for (let w = 0; w < 2; w++) {
          const wt = ((G.t || 0) * 0.7 + w * 0.5) % 1;
          ctx.strokeStyle = 'rgba(150,140,130,' + (0.5 - wt * 0.45) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-6 + w * 12, -22 - wt * 10); ctx.quadraticCurveTo(-2 + w * 12 + Math.sin(wt * 9) * 3, -27 - wt * 10, -4 + w * 12, -32 - wt * 12); ctx.stroke();
          ctx.lineCap = 'butt';
        }
      }
    }

    // the Undiagnosed (portrait state, before the first floor's opinion lands)
    if (p.diag === 'undiag') {
      ctx.fillStyle = 'rgba(200,200,200,0.9)';
      ctx.font = this.font(15, true); ctx.textAlign = 'center';
      ctx.fillText('?', 0, -22 + Math.sin((G && G.t || 0) * 2.4) * 2);
    }

    // the Volunteer Badge: a gold ribbon, pinned where the intake bracelet used to go
    if (G && G.volunteer && p === G.player) {
      ctx.fillStyle = '#e8c05a';
      ctx.beginPath(); ctx.arc(-7, 4, 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e8c05a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8.5, 6); ctx.lineTo(-10, 11); ctx.moveTo(-5.5, 6); ctx.lineTo(-4, 11); ctx.stroke(); ctx.lineCap = 'butt';
    }
    // achievement hat (cosmetic, worn everywhere — but only by YOU, not every extra on screen)
    const hat = Meta.data.hat;
    if (hat && !p.noHat && (Meta.data.unlocks || {})[(DATA.HATS.find(h => h.id === hat) || {}).ach]) {
      ctx.save(); ctx.translate(0, -19);
      if (hat === 'crown') {
        ctx.fillStyle = '#e8c84c';
        ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-10, -6); ctx.lineTo(-5, -1); ctx.lineTo(0, -8); ctx.lineTo(5, -1); ctx.lineTo(10, -6); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#a8862a'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#e05a6a'; ctx.beginPath(); ctx.arc(0, -1, 1.6, 0, TAU); ctx.fill();
      } else if (hat === 'gradcap') {
        ctx.fillStyle = '#2c2a36'; ctx.beginPath(); ctx.moveTo(-13, -2); ctx.lineTo(0, -8); ctx.lineTo(13, -2); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3c3a48'; this.rr(ctx, -6, 0, 12, 4, 1.5); ctx.fill();
        ctx.strokeStyle = '#e8c84c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(9, -6); ctx.lineTo(9, 1); ctx.stroke();
        ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(9, 2.5, 1.8, 0, TAU); ctx.fill();
      } else if (hat === 'hardhat') {
        ctx.fillStyle = '#e8b93e'; ctx.beginPath(); ctx.arc(0, 1, 10, Math.PI, TAU); ctx.fill();
        this.rr(ctx, -12, 0, 24, 3.5, 2); ctx.fill();
        ctx.fillStyle = '#f4d878'; this.rr(ctx, -2.5, -9, 5, 6, 2); ctx.fill();
      } else if (hat === 'plushhat') {
        this.drawWalrusFace(ctx, 0, -2, 0.11, G ? G.t : 0);
      } else if (hat === 'halo') {
        ctx.strokeStyle = 'rgba(232,200,76,0.9)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, -7, 11, 3.5, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,180,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, -7, 11, 3.5, 0, 0, TAU); ctx.stroke();
      } else if (hat === 'visor') {
        ctx.fillStyle = 'rgba(60,138,90,0.85)';
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(0, -7, 11, 0); ctx.lineTo(9, 3); ctx.quadraticCurveTo(0, -3, -9, 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2c5a3a'; ctx.lineWidth = 1; ctx.stroke();
      } else if (hat === 'ticket') {
        ctx.save(); ctx.rotate(-0.12);
        ctx.fillStyle = '#f2ead2'; this.rr(ctx, -8, -6, 16, 10, 2); ctx.fill();
        ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 1; this.rr(ctx, -8, -6, 16, 10, 2); ctx.stroke();
        ctx.fillStyle = '#8a7248'; ctx.font = this.font(6, true); ctx.textAlign = 'center'; ctx.fillText('#1', 0, 1);
        ctx.restore();
      } else if (hat === 'partyhat') {
        ctx.fillStyle = '#b86bff';
        ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(0, -12); ctx.lineTo(7, 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(0, -12, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(4, -5); ctx.stroke();
      }
      ctx.restore();
    }

    // Second Opinion badge — a small gold Ⅱ pinned to the chart
    if (p.variant) {
      const D = DATA.DIAG[p.diag];
      ctx.fillStyle = D ? D.color : '#e8c84c';
      this.rr(ctx, 9, -24, 12, 11, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(30,22,36,0.6)'; ctx.lineWidth = 1.2;
      this.rr(ctx, 9, -24, 12, 11, 3); ctx.stroke();
      ctx.fillStyle = '#241c28'; ctx.font = this.font(8, true); ctx.textAlign = 'center';
      ctx.fillText('Ⅱ', 15, -15.5);
    }

    // GET WELL balloon (gift shop) — it follows. it believes.
    if (p._balloon) {
      const t = (G && G.t) || 0;
      const bx = 15 + Math.sin(t * 1.6) * 3, by = -38 + Math.sin(t * 2.1) * 2.5;
      ctx.strokeStyle = 'rgba(120,100,120,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(6, -8); ctx.quadraticCurveTo(bx - 4, by + 18, bx, by + 10); ctx.stroke();
      ctx.fillStyle = (p._balloonHits || 0) >= 2 ? '#c86a78' : '#e05a6a';
      ctx.beginPath(); ctx.ellipse(bx, by, 8, 9.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(bx - 2.5, by - 3, 2.5, 3.2, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 4.5px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('GET', bx, by - 1); ctx.fillText('WELL', bx, by + 4);
      ctx.fillStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(bx - 2, by + 9); ctx.lineTo(bx + 2, by + 9); ctx.lineTo(bx, by + 12); ctx.closePath();
      ctx.fillStyle = '#c04a58'; ctx.fill();
    }

    // item held overhead
    if (p.itemHold > 0.6) {
      ctx.fillStyle = '#f2dcc0';
      ctx.fillRect(-16, -22, 5, 12); ctx.fillRect(11, -22, 5, 12);
      this.drawItemIcon(p.items[p.items.length - 1], 0, -34);
    }
    ctx.restore();

    // blanket shield indicator
    if (p.diag === 'depression' && p.blanket) {
      ctx.strokeStyle = 'rgba(93,138,168,0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, TAU); ctx.stroke();
    }
  },

  drawFamiliar(f, G) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.type === 'spinner') {
      ctx.rotate(f.ang * 3);
      ctx.fillStyle = '#5a9de0';
      for (let i = 0; i < 3; i++) {
        ctx.rotate(TAU / 3);
        ctx.beginPath(); ctx.arc(0, -10, 7, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#e8e8f0';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    } else if (f.type === 'dog') {
      ctx.fillStyle = '#c89a5e';
      ctx.beginPath(); ctx.ellipse(0, 2, 10, 8, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -5, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a6a3e';
      ctx.beginPath(); ctx.ellipse(3, -10, 3, 5, -0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11, -10, 3, 5, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2c2333';
      ctx.beginPath(); ctx.arc(9, -6, 1.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -3, 2, 0, TAU); ctx.fill();
    } else if (f.type === 'plush') {
      this.drawWalrusFace(ctx, 0, 0, 0.22, G.t);
    }
    ctx.restore();
  },

  /* Support Group ally — a small tinted patient that trails and fires */
  drawAlly(a, G) {
    const ctx = this.ctx;
    const downed = a.downT > 0;
    this.shadow(a.x, a.y + 13, 11, 4, downed ? 0.12 : 0.22);
    ctx.save(); ctx.translate(a.x, a.y);
    if (downed) { ctx.rotate(1.2); ctx.globalAlpha = 0.5; }
    this.orb(ctx, 0, 3, 10, a.tint, a.hitFlash > 0);
    ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(0, -9, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,40,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -9, 7, 0, TAU); ctx.stroke();
    if (downed) {
      ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(-1, -8); ctx.moveTo(-1, -11); ctx.lineTo(-4, -8); ctx.moveTo(2, -11); ctx.lineTo(5, -8); ctx.moveTo(5, -11); ctx.lineTo(2, -8); ctx.stroke();
    } else {
      ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-2.5, -10, 1.4, 0, TAU); ctx.arc(2.5, -10, 1.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (!downed) {
      ctx.fillStyle = a.tint;
      for (let i = 0; i < a.maxhp; i++) { ctx.globalAlpha = i < a.hp ? 1 : 0.22; ctx.fillRect(a.x - 8 + i * 6, a.y - 22, 4, 3); }
      ctx.globalAlpha = 1;
    }
  },

  /* shaded sphere body (fleshy Isaac look) */
  orb(ctx, cx, cy, r, clr, flash) {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.42, r * 0.12, cx, cy, r);
    g.addColorStop(0, flash ? '#ffffff' : this.shade(clr, 0.44));
    g.addColorStop(0.68, flash ? '#f0f0f0' : clr);
    g.addColorStop(1, flash ? '#d6d6d6' : this.shade(clr, -0.3));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = flash ? '#cfcfcf' : this.shade(clr, -0.44); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  },

  /* ============ enemies ============ */
  drawEnemy(e, G) {
    const ctx = this.ctx;
    if (e.dying) return;
    // Unmedicated schizophrenia (TUNNEL): patients at a distance can't be seen — only their shots
    let tunnelA = 1;
    if (G.player && G.player.variant && G.player.diag === 'schizo') {
      const d = U.dist(G.player.x, G.player.y, e.x, e.y);
      if (d > 265) return;
      if (d > 185) tunnelA = 1 - (d - 185) / 80;
    }
    if (e.spawnT <= 0) this.shadow(e.x, e.y + e.r * 0.72, e.r * 0.95, e.r * 0.42, 0.24 * tunnelA);
    ctx.save();
    ctx.translate(e.x, e.y);
    if (tunnelA < 1) ctx.globalAlpha *= Math.max(0.05, tunnelA);
    if (e._shadow) ctx.globalAlpha *= 0.85;   // shadow patient: the dark crush happens post-draw (ctx.filter here cost 36% of the frame)
    if (e.charmed) {   // recruited ally: a green halo + a little heart
      const pl = 0.5 + Math.sin(G.t * 5) * 0.22;
      ctx.strokeStyle = 'rgba(143,208,90,' + pl + ')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 5, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#8fd05a'; const hy = -e.r - 11, hs = 4;
      ctx.beginPath(); ctx.moveTo(0, hy + hs * 0.9);
      ctx.bezierCurveTo(-hs * 1.2, hy - hs * 0.2, -hs * 0.5, hy - hs, 0, hy - hs * 0.35);
      ctx.bezierCurveTo(hs * 0.5, hy - hs, hs * 1.2, hy - hs * 0.2, 0, hy + hs * 0.9);
      ctx.closePath(); ctx.fill();
    }
    if (e.spawnT > 0) {
      ctx.globalAlpha = 1 - e.spawnT / 0.55;
      ctx.scale(ctx.globalAlpha, ctx.globalAlpha);
      // spawn telegraph ring
      ctx.strokeStyle = 'rgba(200,60,60,' + (0.5 * (1 - ctx.globalAlpha)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 6 + e.spawnT * 20, 0, TAU); ctx.stroke();
    }
    // fakes shimmer if you can see them
    if (e.fake && (G.player.flags.seeFakes || G.player.trinket === 'earplugs')) {
      ctx.globalAlpha *= 0.55 + Math.sin(G.t * 6) * 0.25;
    }
    const flash = e.hitFlash > 0;
    const body = flash ? '#ffffff' : e.clr;

    // elite / champion glow
    if (e.eliteTint && e.spawnT <= 0) {
      ctx.save();
      ctx.strokeStyle = e.eliteTint; ctx.lineWidth = 2.5;
      ctx.shadowColor = e.eliteTint; ctx.shadowBlur = 11;
      const rr = e.r + 5 + Math.sin(G.t * 5) * 1.5;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    switch (e.id) {
      case 'scroller': { // phone-zombie hunched over a glowing screen
        this.orb(ctx, 0, 3, e.r, e.clr, flash);
        // glow from phone
        const gl = ctx.createRadialGradient(0, -3, 1, 0, -3, 16);
        gl.addColorStop(0, 'rgba(150,200,255,0.5)'); gl.addColorStop(1, 'rgba(150,200,255,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -3, 16, 0, TAU); ctx.fill();
        // dead-tired eyes with bags
        ctx.fillStyle = '#20263a';
        ctx.beginPath(); ctx.ellipse(-6, -3, 2.3, 3, 0, 0, TAU); ctx.ellipse(6, -3, 2.3, 3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(20,20,40,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-6, -1, 3, 0.2, Math.PI - 0.2); ctx.arc(6, -1, 3, 0.2, Math.PI - 0.2); ctx.stroke();
        // slack mouth
        ctx.fillStyle = '#20263a'; ctx.beginPath(); ctx.ellipse(0, 5, 2, 2.5, 0, 0, TAU); ctx.fill();
        // the phone
        ctx.fillStyle = '#15181f'; this.rr(ctx, -7, 10, 14, 9, 2); ctx.fill();
        ctx.fillStyle = '#9ecbe8'; this.rr(ctx, -5.5, 11.5, 11, 6, 1); ctx.fill();
        break;
      }
      case 'rival': { // THE RIVAL: your silhouette, someone else's smugness
        this.orb(ctx, 0, 0, e.r, body, flash);
        ctx.fillStyle = '#e05a5a'; this.rr(ctx, -e.r + 1, -e.r * 0.62, (e.r - 1) * 2, 4.5, 2); ctx.fill();   // sweatband
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.r - 4, -e.r * 0.62 + 2, 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2c2333';   // narrowed, keeping score
        ctx.beginPath(); ctx.ellipse(-5, -2, 2.6, 1.7, -0.2, 0, TAU); ctx.ellipse(5, -2, 2.6, 1.7, 0.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-4, 6); ctx.quadraticCurveTo(0, 4.2, 4, 6.4); ctx.stroke();   // the smirk
        ctx.strokeStyle = 'rgba(44,35,51,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';   // gym towel
        ctx.beginPath(); ctx.moveTo(-e.r + 3, 4); ctx.quadraticCurveTo(-e.r - 5, 9, -e.r + 1, e.r + 2); ctx.stroke(); ctx.lineCap = 'butt';
        const RN = (typeof Meta !== 'undefined' && Meta.data.rival) ? Meta.data.rival.name : 'RIVAL';
        ctx.fillStyle = '#d08a4a'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('🥊 ' + RN, 0, -e.r - 10);
        break;
      }
      case 'nightnurse': { // THE NIGHT NURSE: glides. the lantern is for you, not her.
        const gl2 = ctx.createRadialGradient(0, 0, 4, 0, 0, e.r + 26);
        gl2.addColorStop(0, 'rgba(200,205,255,0.22)'); gl2.addColorStop(1, 'rgba(200,205,255,0)');
        ctx.fillStyle = gl2; ctx.beginPath(); ctx.arc(0, 0, e.r + 26, 0, TAU); ctx.fill();
        this.orb(ctx, 0, 0, e.r, body, flash);
        ctx.fillStyle = '#f0f2f8';   // the cap
        ctx.beginPath(); ctx.moveTo(-e.r * 0.7, -e.r * 0.55); ctx.lineTo(e.r * 0.7, -e.r * 0.55); ctx.lineTo(e.r * 0.44, -e.r - 5); ctx.lineTo(-e.r * 0.44, -e.r - 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8a90c8'; ctx.font = this.font(8, true); ctx.textAlign = 'center';
        ctx.fillText('🌙', 0, -e.r + 1);
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.6;   // half-lidded calm
        ctx.beginPath(); ctx.moveTo(-8, -1); ctx.quadraticCurveTo(-5, 1.6, -2, -1); ctx.moveTo(2, -1); ctx.quadraticCurveTo(5, 1.6, 8, -1); ctx.stroke();
        ctx.strokeStyle = 'rgba(44,35,51,0.6)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-3, 6.5); ctx.lineTo(3, 6.5); ctx.stroke();   // a professionally neutral mouth
        break;
      }
      case 'notif': { // glossy red alert badge, buzzing
        const buzz = Math.sin(G.t * 40) * 0.8;
        ctx.translate(buzz, 0);
        // vibration lines
        ctx.strokeStyle = 'rgba(224,90,90,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, e.r + 4, -0.6, 0.6); ctx.arc(0, 0, e.r + 4, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
        this.orb(ctx, 0, 0, e.r, '#e05a5a', flash);
        ctx.fillStyle = '#fff';
        ctx.font = this.font(14, true); ctx.textAlign = 'center';
        ctx.fillText('!', 0, 5);
        break;
      }
      case 'larper': { // knockoff of YOU with sharpie tears
        const eg = ctx.createLinearGradient(0, 4, 0, 12);
        eg.addColorStop(0, flash ? '#fff' : '#c8bdb0'); eg.addColorStop(1, flash ? '#eee' : '#a89e90');
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.ellipse(0, 9, 7.5, 6, 0, 0, TAU); ctx.fill();
        this.orb(ctx, 0, -3, 11, flash ? '#f4f4f4' : '#d8cec2', flash);
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-4, -4, 2, 0, TAU); ctx.arc(4, -4, 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#4a6ae0'; ctx.lineWidth = 2; // marker tears
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(-4, 5); ctx.moveTo(4, -1); ctx.lineTo(4, 5); ctx.stroke();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 1, 3, 0.2, Math.PI - 0.2); ctx.stroke(); // forced frown
        ctx.font = this.font(8); ctx.fillStyle = '#9a8f80'; ctx.textAlign = 'center';
        ctx.fillText('me too', 0, 21);
        break;
      }
      case 'ad': { // garish pop-up window with a pill mascot
        ctx.fillStyle = flash ? '#fff' : '#f4eeda';
        this.rr(ctx, -16, -15, 32, 30, 3); ctx.fill();
        ctx.fillStyle = '#3a6ad0'; this.rr(ctx, -16, -15, 32, 7, 3); ctx.fill(); // title bar
        ctx.fillStyle = '#e05a5a'; ctx.beginPath(); ctx.arc(11, -11.5, 2.2, 0, TAU); ctx.fill(); // close btn
        ctx.fillStyle = '#fff'; ctx.font = this.font(7, true); ctx.textAlign = 'center'; ctx.fillText('x', 11, -9.3);
        // pill mascot
        ctx.save(); ctx.translate(0, -1); ctx.rotate(-0.5);
        ctx.fillStyle = '#e05a5a'; this.rr(ctx, -8, -4, 8, 8, 4); ctx.fill();
        ctx.fillStyle = '#f0f0e8'; this.rr(ctx, 0, -4, 8, 8, 4); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#c8503a'; ctx.font = this.font(7, true);
        ctx.fillText('ASK YOUR', 0, 9); ctx.fillText('DOCTOR!', 0, 15);
        ctx.strokeStyle = '#c8a03a'; ctx.lineWidth = 2; this.rr(ctx, -16, -15, 32, 30, 3); ctx.stroke();
        break;
      }
      case 'doubt': { // wavering translucent wisp
        ctx.globalAlpha *= 0.78;
        const wob = Math.sin(e.t * 4) * 1.5;
        const g = ctx.createRadialGradient(0, -2, 2, 0, 0, e.r);
        g.addColorStop(0, flash ? '#fff' : this.shade(e.clr, 0.4)); g.addColorStop(1, this.shade(e.clr, -0.2));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -2, e.r, Math.PI, 0);
        ctx.quadraticCurveTo(e.r, e.r, e.r * 0.5, e.r * 0.7 + wob);
        ctx.quadraticCurveTo(0, e.r + wob, -e.r * 0.5, e.r * 0.7 - wob);
        ctx.quadraticCurveTo(-e.r, e.r, -e.r, -2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(240,240,248,0.9)';
        ctx.font = this.font(16, true); ctx.textAlign = 'center';
        ctx.fillText('?', 0, 4);
        break;
      }
      case 'deadline': { // angry alarm clock with legs
        const shk = e.state === 1 ? U.rand(-2.5, 2.5) : 0;
        ctx.translate(shk, shk);
        // bells
        ctx.fillStyle = flash ? '#fff' : this.shade(e.clr, 0.1);
        ctx.beginPath(); ctx.arc(-11, -13, 5, 0, TAU); ctx.arc(11, -13, 5, 0, TAU); ctx.fill();
        // legs
        ctx.strokeStyle = this.shade(e.clr, -0.3); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 15); ctx.lineTo(-11, 21); ctx.moveTo(8, 15); ctx.lineTo(11, 21); ctx.stroke(); ctx.lineCap = 'butt';
        this.orb(ctx, 0, 0, e.r, e.clr, flash);
        ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
        // angry brows + hands
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-2, -2); ctx.moveTo(7, -4); ctx.lineTo(2, -2); ctx.stroke();
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-4, 1, 1.6, 0, TAU); ctx.arc(4, 1, 1.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#b03030'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -7); ctx.moveTo(0, 0); ctx.lineTo(5 * Math.cos(e.t * 6), 5 * Math.sin(e.t * 6)); ctx.stroke();
        break;
      }
      case 'intrusive': { // jagged shadow-thought with glowing eyes
        ctx.globalAlpha *= (e.state === 0 ? 0.55 : 0.95);
        ctx.fillStyle = flash ? '#fff' : this.shade(e.clr, -0.1);
        ctx.beginPath();
        const spikes = 9;
        for (let i = 0; i <= spikes; i++) {
          const a = (i / spikes) * TAU;
          const rr = e.r * (i % 2 ? 0.72 : 1) + Math.sin(e.t * 6 + i) * 1.5;
          const fn = i === 0 ? 'moveTo' : 'lineTo';
          ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
        // glowing eyes
        ctx.fillStyle = '#d6fff4';
        ctx.beginPath(); ctx.ellipse(-4, -2, 1.8, 3, -0.3, 0, TAU); ctx.ellipse(4, -2, 1.8, 3, 0.3, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#0e2b26'; ctx.lineWidth = 1.5; // jagged grin
        ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-2, 3); ctx.lineTo(1, 6); ctx.lineTo(4, 3); ctx.lineTo(6, 5); ctx.stroke();
        break;
      }
      case 'redflag': { // warning flag with a nervous face
        const fl = e.fuse >= 0 && Math.sin(G.t * 25) > 0;
        ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-3, 15); ctx.lineTo(-3, -17); ctx.stroke();
        ctx.fillStyle = '#c8b090'; ctx.beginPath(); ctx.arc(-3, -17, 2.5, 0, TAU); ctx.fill();
        const fg = ctx.createLinearGradient(-3, 0, 16, 0);
        fg.addColorStop(0, fl ? '#fff' : '#e04a4a'); fg.addColorStop(1, fl ? '#fff' : '#a82828');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(-3, -17);
        ctx.quadraticCurveTo(9, -15 + Math.sin(e.t * 7) * 3, 17, -12 + Math.sin(e.t * 7) * 2);
        ctx.quadraticCurveTo(9, -8, 17, -4 + Math.sin(e.t * 7) * 2);
        ctx.quadraticCurveTo(9, -3, -3, -3);
        ctx.closePath(); ctx.fill();
        // nervous face on the pole base
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-8, 6, 1.8, 0, TAU); ctx.arc(1, 6, 1.8, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(122,184,232,0.8)'; ctx.beginPath(); ctx.arc(4, 8 + Math.sin(e.t * 4) * 2, 1.6, 0, TAU); ctx.fill();
        break;
      }
      case 'fog': { // puffy brain-fog cloud, spiral-eyed and dazed
        ctx.globalAlpha *= 0.9;
        const pf = Math.sin(e.t * 1.5) * 1.5;
        for (const o of [[-13, 3, 14], [0, -9, 18], [14, 4, 14], [0, 7, 16], [-8, -4, 12], [9, -5, 12]]) {
          const g = ctx.createRadialGradient(o[0] - 3, o[1] - 3, 2, o[0], o[1], o[2] + pf);
          g.addColorStop(0, flash ? '#fff' : this.shade(e.clr, 0.2)); g.addColorStop(1, this.shade(e.clr, -0.12));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o[0], o[1], o[2] + pf, 0, TAU); ctx.fill();
        }
        // spiral eyes
        ctx.strokeStyle = '#4a5852'; ctx.lineWidth = 1.5;
        for (const sx of [-7, 7]) {
          ctx.beginPath();
          for (let a = 0; a < 8; a += 0.4) ctx.lineTo(sx + Math.cos(a + e.t) * a * 0.35, -2 + Math.sin(a + e.t) * a * 0.35);
          ctx.stroke();
        }
        ctx.strokeStyle = '#4a5852'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 7, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        break;
      }
      case 'enabler': { // too-supportive yellow blob
        this.orb(ctx, 0, 0, e.r, e.clr, flash);
        // sparkles
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 3; i++) { const a = e.t * 2 + i * 2.1; const px = Math.cos(a) * (e.r + 4), py = Math.sin(a) * (e.r + 4); ctx.beginPath(); ctx.arc(px, py, 1.5, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-5, -3, 2.2, 0, TAU); ctx.arc(5, -3, 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(-5.6, -3.6, 0.8, 0, TAU); ctx.arc(4.4, -3.6, 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2; // huge grin
        ctx.beginPath(); ctx.arc(0, 2, 7, 0.15, Math.PI - 0.15); ctx.stroke();
        ctx.fillStyle = 'rgba(20,14,20,0.75)';
        this.rr(ctx, -22, -30, 44, 15, 4); ctx.fill();
        ctx.fillStyle = '#f4e88a'; ctx.font = this.font(8, true); ctx.textAlign = 'center';
        ctx.fillText("you're SO valid!!", 0, -20);
        break;
      }
      case 'sideeffect': { // queasy pill-blob that multiplies
        const s = e.r / 18; // scale by tier size
        this.orb(ctx, 0, 0, e.r, e.clr, flash);
        // capsule seam (two-tone pill)
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath(); ctx.arc(0, 0, e.r - 2, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = this.shade(e.clr, -0.3); ctx.lineWidth = 1.5 * s;
        ctx.beginPath(); ctx.moveTo(-e.r + 3, 0); ctx.lineTo(e.r - 3, 0); ctx.stroke();
        // woozy spiral eyes
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.4 * s;
        for (const ex of [-6 * s, 6 * s]) {
          ctx.beginPath();
          for (let a = 0; a < 6; a += 0.5) ctx.lineTo(ex + Math.cos(a + e.t * 3) * a * 0.5 * s, -3 * s + Math.sin(a + e.t * 3) * a * 0.5 * s);
          ctx.stroke();
        }
        // green nauseous wavy mouth
        ctx.strokeStyle = '#6ab04a'; ctx.lineWidth = 2 * s;
        ctx.beginPath();
        const my = 6 * s;
        ctx.moveTo(-6 * s, my);
        ctx.quadraticCurveTo(-3 * s, my + 3 * s, 0, my);
        ctx.quadraticCurveTo(3 * s, my - 3 * s, 6 * s, my);
        ctx.stroke();
        // "+" multiply hint when large
        if (e.tier >= 2) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
          ctx.fillText('×', e.r - 3, -e.r + 4);
        }
        break;
      }
      case 'form': { // Prior Auth form — a sheet of checkboxes to complete
        const done = e.maxhp > 0 ? U.clamp(1 - e.hp / e.maxhp, 0, 1) : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; this.rr(ctx, -13, -15, 26, 34, 3); ctx.fill();
        ctx.fillStyle = flash ? '#ffffff' : '#f6f0e2'; this.rr(ctx, -14, -16, 26, 34, 3); ctx.fill();
        ctx.strokeStyle = '#b03030'; ctx.lineWidth = 1.5; this.rr(ctx, -14, -16, 26, 34, 3); ctx.stroke();
        ctx.fillStyle = '#b03030'; ctx.font = this.font(6, true); ctx.textAlign = 'center'; ctx.fillText('℞ FORM', -1, -10);
        // 4 checkbox rows; fill in as it takes damage
        const boxes = 4, filled = Math.round(done * boxes);
        for (let i = 0; i < boxes; i++) {
          const by = -4 + i * 7;
          ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 1; ctx.strokeRect(-10, by, 5, 5);
          if (i < filled) { ctx.strokeStyle = '#2c8a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-9.5, by + 2.5); ctx.lineTo(-8, by + 4.5); ctx.lineTo(-5.5, by + 0.5); ctx.stroke(); }
          ctx.strokeStyle = '#9c9080'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, by + 2.5); ctx.lineTo(9, by + 2.5); ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'gaslighter': { // fades from the record; you're imagining it
        ctx.globalAlpha *= Math.max(0.15, e._ghost != null ? e._ghost : 1);
        this.orb(ctx, 0, 0, e.r, e.clr, flash);
        // sweet, unbothered face
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-5, -3, 2, 0, TAU); ctx.arc(5, -3, 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 3, 5, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.lineCap = 'butt';
        // little "?" wisps trailing off
        ctx.fillStyle = 'rgba(184,168,216,0.8)'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('?', -e.r - 5, -6 + Math.sin(G.t * 3) * 3);
        break;
      }
      case 'projection': { // a watery copy of YOU
        ctx.globalAlpha *= 0.85;
        const pg = ctx.createLinearGradient(0, -14, 0, 14);
        pg.addColorStop(0, flash ? '#fff' : '#a8dcec'); pg.addColorStop(1, flash ? '#eee' : '#6aacc4');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.ellipse(0, 4, e.r * 0.72, e.r * 0.62, 0, 0, TAU); ctx.fill();   // body
        ctx.beginPath(); ctx.arc(0, -7, e.r * 0.62, 0, TAU); ctx.fill();                     // head
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, -7, e.r * 0.62, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#1c4a5c';   // your face, wrong
        ctx.beginPath(); ctx.arc(-4, -8, 1.8, 0, TAU); ctx.arc(4, -8, 1.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#1c4a5c'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, -3, 3.5, Math.PI + 0.4, TAU - 0.4); ctx.stroke();        // upside-down frown
        // ripple
        ctx.strokeStyle = 'rgba(122,192,216,' + (0.4 + Math.sin(G.t * 4) * 0.2) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, e.r + 3 + Math.sin(G.t * 4) * 2, 0, TAU); ctx.stroke();
        break;
      }
      case 'copaycollector': { // a scurrying collections agent with a coin sack
        ctx.rotate(Math.sin(G.t * 10) * 0.08);   // busy little legs energy
        this.orb(ctx, 0, 2, e.r, e.clr, flash);
        // visor
        ctx.fillStyle = '#3a5a3a'; this.rr(ctx, -9, -9, 18, 6, 3); ctx.fill();
        // grabby smile
        ctx.strokeStyle = '#5a4a20'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 3, 4.5, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.lineCap = 'butt';
        // the sack (bulges with your copays)
        const bulge = 1 + Math.min(0.5, (e.stolen || 0) * 0.12);
        ctx.save(); ctx.translate(e.r * 0.85, -e.r * 0.5); ctx.rotate(0.3);
        ctx.fillStyle = flash ? '#fff' : '#c8a24a';
        ctx.beginPath(); ctx.ellipse(0, 4, 7 * bulge, 8.5 * bulge, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 4, 7 * bulge, 8.5 * bulge, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#8a6a2a'; ctx.font = this.font(9, true); ctx.textAlign = 'center'; ctx.fillText('¢', 0, 7);
        ctx.restore();
        break;
      }
      case 'wellnessbot': { // a serene little service robot
        this.orb(ctx, 0, 3, e.r, e.clr, flash);
        // glass dome
        ctx.fillStyle = 'rgba(220,245,240,0.55)';
        ctx.beginPath(); ctx.arc(0, -e.r * 0.55, e.r * 0.62, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(120,170,160,0.8)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.55, e.r * 0.62, Math.PI, TAU); ctx.stroke();
        // leaf antenna
        ctx.strokeStyle = '#4a8a6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -e.r - 2); ctx.lineTo(0, -e.r - 9); ctx.stroke();
        ctx.fillStyle = '#6ab87a';
        ctx.beginPath(); ctx.ellipse(4, -e.r - 11, 5, 3, -0.5, 0, TAU); ctx.fill();
        // screen face: calm closed eyes
        ctx.strokeStyle = '#2c4a44'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-5, -2, 3, 0.2, Math.PI - 0.2); ctx.arc(5, -2, 3, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 4, 4, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.lineCap = 'butt';
        // projecting rings while the aura's on
        ctx.strokeStyle = 'rgba(143,208,200,' + (0.35 + Math.sin(G.t * 3) * 0.2) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, e.r + 7 + Math.sin(G.t * 3) * 3, 0, TAU); ctx.stroke();
        break;
      }
      case 'spiral': { // a rotating pink swirl, tightening
        ctx.rotate(G.t * 3);
        this.orb(ctx, 0, 0, e.r, e.clr, flash);
        ctx.strokeStyle = flash ? '#fff' : '#f0d0e0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let a = 0; a < 4.2; a += 0.18) { const rr2 = 2 + a * 2.6; ctx.lineTo(Math.cos(a * 1.8) * rr2, Math.sin(a * 1.8) * rr2); }
        ctx.stroke(); ctx.lineCap = 'butt';
        break;
      }
      case 'comparison': { // smug and thriving (the healthier you are, the bigger it flexes)
        const frac = G.player.maxhp > 0 ? G.player.hp / G.player.maxhp : 1;
        ctx.scale(0.9 + frac * 0.25, 0.9 + frac * 0.25);
        this.orb(ctx, 0, 2, e.r, e.clr, flash);
        // sunglasses of superiority
        ctx.fillStyle = '#2c3a24'; this.rr(ctx, -10, -7, 8, 5, 2); ctx.fill(); this.rr(ctx, 2, -7, 8, 5, 2); ctx.fill();
        ctx.fillRect(-2, -6, 4, 2);
        // smug grin
        ctx.strokeStyle = '#2c3a24'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-1, 3, 5, 0.1, Math.PI * 0.55); ctx.stroke(); ctx.lineCap = 'butt';
        // ⬆ doing-better-than-you badge
        ctx.fillStyle = '#6ab84a'; ctx.beginPath();
        ctx.moveTo(e.r * 0.8, -e.r * 0.75); ctx.lineTo(e.r * 0.8 + 5, -e.r * 0.75 + 8); ctx.lineTo(e.r * 0.8 - 5, -e.r * 0.75 + 8); ctx.closePath(); ctx.fill();
        break;
      }
      case 'auditor': { // an adding machine that learned to walk
        // heavy grey chassis
        const ag = ctx.createLinearGradient(0, -e.r, 0, e.r);
        ag.addColorStop(0, flash ? '#fff' : '#b8b2a8'); ag.addColorStop(1, flash ? '#eee' : '#8a847a');
        ctx.fillStyle = ag;
        this.rr(ctx, -e.r * 0.85, -e.r * 0.9, e.r * 1.7, e.r * 1.8, 6); ctx.fill();
        ctx.strokeStyle = '#5a544a'; ctx.lineWidth = 2.5;
        this.rr(ctx, -e.r * 0.85, -e.r * 0.9, e.r * 1.7, e.r * 1.8, 6); ctx.stroke();
        // the tape, scrolling your file out the top
        ctx.save(); ctx.translate(0, -e.r * 0.9);
        ctx.fillStyle = '#f4eee0';
        const th = 16 + Math.sin(G.t * 2) * 3;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, -th); ctx.quadraticCurveTo(-6, -th - 6, 2, -th - 4); ctx.lineTo(8, -th + 2); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(90,70,50,0.5)'; ctx.lineWidth = 1;
        const scroll = (G.t * 10) % 5;
        for (let i = 0; i < 3; i++) { const ly = -3 - i * 5 - scroll; if (ly > -th + 2) { ctx.beginPath(); ctx.moveTo(-5, ly); ctx.lineTo(5, ly); ctx.stroke(); } }
        ctx.restore();
        // one red scanning eye
        ctx.fillStyle = '#2c2028'; this.rr(ctx, -e.r * 0.6, -e.r * 0.5, e.r * 1.2, e.r * 0.5, 4); ctx.fill();
        const ex = Math.sin(G.t * 2.6) * e.r * 0.4;
        ctx.fillStyle = '#e04040'; ctx.beginPath(); ctx.arc(ex, -e.r * 0.25, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(224,64,64,0.35)'; ctx.beginPath(); ctx.arc(ex, -e.r * 0.25, 8, 0, TAU); ctx.fill();
        // number keys
        ctx.fillStyle = '#6a645a';
        for (let r2 = 0; r2 < 2; r2++) for (let c2 = 0; c2 < 3; c2++) this.rr(ctx, -e.r * 0.5 + c2 * e.r * 0.38, e.r * 0.05 + r2 * e.r * 0.34, e.r * 0.28, e.r * 0.24, 2), ctx.fill();
        // name label
        ctx.fillStyle = 'rgba(224,90,90,0.9)'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('THE AUDITOR', 0, e.r + 14);
        break;
      }
      case 'chargenurse': { // starched authority with a clipboard
        this.orb(ctx, 0, 4, e.r, e.clr, flash);
        // stern face
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-6, -2, 2.2, 0, TAU); ctx.arc(6, -2, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(5, 7); ctx.stroke();   // flat unimpressed mouth
        ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-3, -6.5); ctx.moveTo(9, -8); ctx.lineTo(3, -6.5); ctx.stroke();   // brows
        // nurse cap with red cross
        ctx.fillStyle = '#fff'; this.rr(ctx, -12, -e.r - 8, 24, 11, 3); ctx.fill();
        ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = 1.5; this.rr(ctx, -12, -e.r - 8, 24, 11, 3); ctx.stroke();
        ctx.fillStyle = '#d04040'; ctx.fillRect(-1.5, -e.r - 6.5, 3, 8); ctx.fillRect(-4, -e.r - 4, 8, 3);
        // clipboard
        ctx.save(); ctx.translate(e.r * 0.9, 2); ctx.rotate(0.2);
        ctx.fillStyle = '#8a6a3a'; this.rr(ctx, -7, -10, 14, 20, 2); ctx.fill();
        ctx.fillStyle = '#f4ecd8'; this.rr(ctx, -5.5, -8, 11, 16, 1.5); ctx.fill();
        ctx.restore();
        break;
      }
      case 'resident': { // scrubs, coffee, thirty hours deep
        this.orb(ctx, 0, 4, e.r, e.clr, flash);
        // heavy eye bags
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-6, -3, 2.2, 0, TAU); ctx.arc(6, -3, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(40,48,56,0.55)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(-6, 0, 3.4, 0.2, Math.PI - 0.2); ctx.arc(6, 0, 3.4, 0.2, Math.PI - 0.2); ctx.stroke();
        // crooked open mouth (mid-yawn)
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.ellipse(1, 7, 2.6, 3.4, 0.2, 0, TAU); ctx.fill();
        // surgical cap
        ctx.fillStyle = '#5a9a82'; ctx.beginPath(); ctx.arc(0, -e.r * 0.55, e.r * 0.68, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = '#3e7862'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -e.r * 0.55, e.r * 0.68, Math.PI, TAU); ctx.stroke();
        // coffee cup (a lifeline)
        ctx.save(); ctx.translate(e.r * 0.85, 4); ctx.rotate(Math.sin(G.t * 6) * 0.12);
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, -4, -7, 9, 12, 2); ctx.fill();
        ctx.strokeStyle = '#b8a888'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(6, -1, 3.5, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,190,170,0.7)'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(2, -13, 0, -16); ctx.stroke();   // steam
        ctx.restore();
        break;
      }
      case 'orderly': { // broad, patient, inevitable
        ctx.scale(1.08, 1);
        this.orb(ctx, 0, 3, e.r, e.clr, flash);
        // small calm eyes set wide
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-8, -3, 1.9, 0, TAU); ctx.arc(8, -3, 1.9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.stroke();
        // scrub v-neck
        ctx.strokeStyle = '#6a7488'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-7, e.r * 0.45); ctx.lineTo(0, e.r * 0.75); ctx.lineTo(7, e.r * 0.45); ctx.stroke();
        // momentum lines when he's built up steam
        if (e._calm > 3) {
          ctx.strokeStyle = 'rgba(154,164,184,0.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-e.r - 9, -6); ctx.lineTo(-e.r - 2, -6); ctx.moveTo(-e.r - 12, 2); ctx.lineTo(-e.r - 4, 2); ctx.stroke();
        }
        break;
      }
      case 'waitingnum': { // the deli-counter ticket of doom
        const urgent = e.count <= 3;
        ctx.rotate(Math.sin(G.t * (urgent ? 14 : 2)) * (urgent ? 0.06 : 0.02));
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; this.rr(ctx, -15, -17, 30, 36, 4); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#f2ead2'; this.rr(ctx, -16, -18, 30, 36, 4); ctx.fill();
        ctx.strokeStyle = urgent ? '#c04040' : '#a08a5a'; ctx.lineWidth = 2; this.rr(ctx, -16, -18, 30, 36, 4); ctx.stroke();
        // perforation
        ctx.strokeStyle = 'rgba(160,138,90,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([2.5, 2.5]);
        ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(14, -10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#8a7248'; ctx.font = this.font(6.5, true); ctx.textAlign = 'center';
        ctx.fillText('NOW SERVING', -1, -13);
        ctx.fillStyle = urgent ? '#c04040' : '#3a3040'; ctx.font = this.font(17, true);
        ctx.fillText(String(Math.max(0, e.count)), -1, 8);
        break;
      }
    }
    ctx.restore();
    // status effects: the compress, the report, the thought, the grudge
    if (!e.dying && e.spawnT <= 0) {
      if (e._chill > 0) {
        ctx.fillStyle = 'rgba(140,200,240,' + (0.14 + e._chill * 0.07) + ')';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(200,235,255,0.9)'; ctx.font = this.font(9 + e._chill, true); ctx.textAlign = 'center';
        ctx.fillText('❄', e.x + e.r * 0.7, e.y - e.r * 0.7);
      }
      if (e._burn > 0) {
        const fl = Math.sin(G.t * 14 + e.x) * 2;
        ctx.fillStyle = 'rgba(232,148,74,0.85)';
        ctx.beginPath(); ctx.moveTo(e.x - 4, e.y - e.r - 2); ctx.quadraticCurveTo(e.x, e.y - e.r - 12 - fl, e.x + 4, e.y - e.r - 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(224,192,80,0.9)';
        ctx.beginPath(); ctx.moveTo(e.x - 2, e.y - e.r - 2); ctx.quadraticCurveTo(e.x, e.y - e.r - 7 - fl, e.x + 2, e.y - e.r - 2); ctx.closePath(); ctx.fill();
      }
      if (e._plague) {
        ctx.fillStyle = 'rgba(143,208,138,' + (0.4 + Math.sin(G.t * 6) * 0.2) + ')';
        ctx.beginPath(); ctx.arc(e.x - e.r * 0.7, e.y - e.r * 0.7, 3, 0, TAU); ctx.fill();
      }
      if (e._nemesis) {
        ctx.save();
        ctx.strokeStyle = 'rgba(224,90,90,0.85)'; ctx.lineWidth = 2.5;
        ctx.shadowColor = '#e05a5a'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8 + Math.sin(G.t * 5) * 2, 0, TAU); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#e05a5a'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('REMEMBERS YOU', e.x, e.y - e.r - 16);
      }
      if (e._complaint) {   // your grievance, embodied
        ctx.save();
        ctx.strokeStyle = 'rgba(224,160,90,0.85)'; ctx.lineWidth = 2.5;
        ctx.shadowColor = '#e0a05a'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8 + Math.sin(G.t * 5) * 2, 0, TAU); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#e0a05a'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('“' + e._complaint.slice(0, 26) + (e._complaint.length > 26 ? '…' : '') + '”', e.x, e.y - e.r - 16);
      }
    }
    // INCIDENT SITE guard: dozing at the scene (until you get greedy)
    if (e._asleep && !e.dying) {
      const zb = Math.sin(G.t * 1.6) * 2;
      ctx.fillStyle = 'rgba(200,190,220,0.85)'; ctx.font = this.font(13, true); ctx.textAlign = 'center';
      ctx.fillText('z', e.x + e.r + 6, e.y - e.r - 4 + zb);
      ctx.font = this.font(9, true);
      ctx.fillText('z', e.x + e.r + 14, e.y - e.r - 12 + zb);
      ctx.fillStyle = 'rgba(224,160,90,0.75)'; ctx.font = this.font(8, true);
      ctx.fillText('SCENE SECURITY', e.x, e.y + e.r + 14);
    }
    // THE UNION: picket signs up
    if (e._union && !e.dying && e.spawnT <= 0) {
      const bb = Math.sin(G.t * 3 + e.x) * 2;
      ctx.save(); ctx.translate(e.x + e.r * 0.7, e.y - e.r - 6 + bb); ctx.rotate(0.12);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -4); ctx.stroke();
      ctx.fillStyle = '#f0ead8'; this.rr(ctx, -11, -14, 22, 11, 2); ctx.fill();
      ctx.fillStyle = '#a03030'; ctx.font = this.font(7, true); ctx.textAlign = 'center'; ctx.fillText(e._unionRep ? 'REP' : '✊', 0, -6);
      ctx.restore();
      if (e._unionRep) {
        ctx.strokeStyle = 'rgba(224,160,90,0.8)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7 + Math.sin(G.t * 4) * 2, 0, TAU); ctx.stroke();
      }
    }
    // the deep roster wears its gimmicks openly
    if (!e.dying && e.spawnT <= 0) {
      if (e.id === 'placebo') {   // a champion's aura it absolutely has not earned
        ctx.save();
        ctx.strokeStyle = 'rgba(232,200,76,0.8)'; ctx.lineWidth = 3;
        ctx.shadowColor = '#e8c84c'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8 + Math.sin(G.t * 4) * 2, 0, TAU); ctx.stroke();
        ctx.restore();
      } else if (e.id === 'secondop') {
        ctx.fillStyle = '#b06be0'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText(e._split ? 'Ⅱb' : 'Ⅱ', e.x, e.y - e.r - 6);
      } else if (e.id === 'premium' && !e._premOpen) {
        ctx.fillStyle = '#e0b83a'; ctx.font = this.font(11, true); ctx.textAlign = 'center';
        ctx.fillText('🔒$', e.x, e.y - e.r - 6);
      } else if (e.id === 'waitlist') {
        ctx.strokeStyle = 'rgba(60,50,40,0.7)'; ctx.lineWidth = 1.4;
        for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(e.x - 6, e.y - 4 + l * 5); ctx.lineTo(e.x + 6, e.y - 4 + l * 5); ctx.stroke(); }
      }
    }
    // shadow patients: crush the body to silhouette (cheap paint, not ctx.filter), leave the eyes burning
    if (e._shadow && !e.dying && e.spawnT <= 0) {
      ctx.fillStyle = 'rgba(20,13,29,0.66)';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2.5, 0, TAU); ctx.fill();
      const gl = 0.65 + Math.sin(G.t * 4 + e.x) * 0.2;
      ctx.fillStyle = 'rgba(200,160,255,' + gl + ')';
      ctx.beginPath(); ctx.arc(e.x - 4, e.y - e.r * 0.3, 2, 0, TAU); ctx.arc(e.x + 4, e.y - e.r * 0.3, 2, 0, TAU); ctx.fill();
    }
    // Wellness Bot's blessing: a soft bubble around shielded patients
    if (e._shieldT > 0 && !e.dying && e.spawnT <= 0) {
      ctx.strokeStyle = 'rgba(143,208,200,' + (0.35 + Math.sin(G.t * 5) * 0.15) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, TAU); ctx.stroke();
    }

    // hp bar (webmd item)
    if ((G.player.flags.hpBars || G.player.trinket === 'thermometer') && !e.fake && !e.dying && e.hp < e.maxhp) {
      ctx.fillStyle = 'rgba(20,14,20,0.6)';
      ctx.fillRect(e.x - 14, e.y - e.r - 12, 28, 4);
      ctx.fillStyle = '#7ad05a';
      ctx.fillRect(e.x - 14, e.y - e.r - 12, 28 * U.clamp(e.hp / e.maxhp, 0, 1), 4);
    }
  },

  /* ============ bosses ============ */
  drawBoss(b, G) {
    const ctx = this.ctx;
    if (b.dead && b.deathT > 1) return;
    if (!b.dead && b.introT <= 0) this.shadow(b.x, b.y + b.r * 0.9, b.r * 1.05, b.r * 0.4, 0.3);
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.dead) { ctx.globalAlpha = 1 - b.deathT; ctx.rotate(b.deathT * 2); }
    if (b.introT > 0) { const s = U.clamp(1 - b.introT / 1.6, 0.1, 1); ctx.scale(s, s); ctx.globalAlpha = s; }
    // champion aura
    if (b.affix && !b.dead) {
      ctx.save();
      ctx.strokeStyle = b.affixTint || '#e8c84c'; ctx.lineWidth = 3;
      ctx.shadowColor = b.affixTint || '#e8c84c'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, b.r + 9 + Math.sin((G.t || 0) * 4) * 2, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    const flash = b.hitFlash > 0;

    switch (b.id) {
      case 'gatekeeper': { // hospital-door bouncer with a velvet rope
        const open = b.vulnerable;
        // velvet stanchion in front
        ctx.strokeStyle = '#7a2030'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-46, 46); ctx.quadraticCurveTo(0, 58, 46, 46); ctx.stroke();
        ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.arc(-46, 44, 4, 0, TAU); ctx.arc(46, 44, 4, 0, TAU); ctx.fill();
        // steel door body
        const dg = ctx.createLinearGradient(-42, 0, 42, 0);
        dg.addColorStop(0, flash ? '#fff' : '#5a5470'); dg.addColorStop(0.5, flash ? '#fff' : '#7c7290'); dg.addColorStop(1, flash ? '#eee' : '#4c465e');
        ctx.fillStyle = dg;
        this.rr(ctx, -42, -50, 84, 100, 14); ctx.fill();
        ctx.fillStyle = 'rgba(20,16,30,0.4)'; this.rr(ctx, -34, -42, 68, 84, 10); ctx.fill();
        // wired-glass window
        ctx.strokeStyle = 'rgba(180,190,210,0.25)'; ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -40); ctx.lineTo(i * 9, -8); ctx.moveTo(-30, -34 + (i + 3) * 4.5); ctx.lineTo(30, -34 + (i + 3) * 4.5); ctx.stroke(); }
        // sunglasses (bouncer) or open eyes
        if (open) {
          ctx.fillStyle = '#f0e8d8';
          ctx.beginPath(); ctx.ellipse(-14, -12, 8, 10, 0, 0, TAU); ctx.ellipse(14, -12, 8, 10, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#2c2333';
          ctx.beginPath(); ctx.arc(-14, -10, 4, 0, TAU); ctx.arc(14, -10, 4, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = '#141018';
          this.rr(ctx, -24, -18, 20, 12, 3); ctx.fill(); this.rr(ctx, 4, -18, 20, 12, 3); ctx.fill();
          ctx.fillRect(-5, -14, 10, 2);
        }
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 22, 12, Math.PI + 0.4, TAU - 0.4); ctx.stroke();
        if (!open) { // crossed arms
          ctx.strokeStyle = '#8a8098'; ctx.lineWidth = 11; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(30, 6); ctx.moveTo(30, 30); ctx.lineTo(-30, 6); ctx.stroke(); ctx.lineCap = 'butt';
        }
        // clipboard
        ctx.save(); ctx.rotate(0.15);
        ctx.fillStyle = '#8a6a3a'; this.rr(ctx, 27, -22, 24, 32, 3); ctx.fill();
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, 29, -19, 20, 26, 2); ctx.fill();
        ctx.strokeStyle = '#c05050'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(32, -13); ctx.lineTo(46, -13); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'adjuster': { // monitor-headed claims denier
        // suited torso
        const sg = ctx.createLinearGradient(0, -6, 0, 40);
        sg.addColorStop(0, flash ? '#fff' : '#3f4a63'); sg.addColorStop(1, flash ? '#eee' : '#2b3346');
        ctx.fillStyle = sg;
        this.rr(ctx, -30, 4, 60, 44, 8); ctx.fill();
        // shirt + tie
        ctx.fillStyle = '#e8e6de'; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8a2a2a'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(5, 16); ctx.lineTo(0, 40); ctx.lineTo(-5, 16); ctx.closePath(); ctx.fill();
        // monitor head
        ctx.fillStyle = flash ? '#fff' : '#4a5266';
        this.rr(ctx, -34, -40, 68, 44, 6); ctx.fill();
        const scr = ctx.createLinearGradient(0, -36, 0, -4);
        scr.addColorStop(0, '#1a2230'); scr.addColorStop(1, '#243044');
        ctx.fillStyle = scr; this.rr(ctx, -28, -34, 56, 32, 3); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#e05a5a';
        ctx.font = this.font(12, true); ctx.textAlign = 'center';
        ctx.save(); ctx.rotate(-0.06);
        ctx.fillText('CLAIM', 0, -22); ctx.fillText('DENIED', 0, -9);
        ctx.restore();
        // DENIED stamp for a hand
        ctx.save(); ctx.translate(38, 20); ctx.rotate(Math.sin(b.t * 3) * 0.3 - 0.2);
        ctx.fillStyle = '#7a2020'; this.rr(ctx, -8, -6, 16, 16, 2); ctx.fill();
        ctx.fillStyle = '#c05050'; ctx.fillRect(-3, -14, 6, 8);
        ctx.restore();
        break;
      }
      case 'larperking': { // giant garish knockoff of YOU
        const bg = ctx.createLinearGradient(0, 4, 0, 44);
        bg.addColorStop(0, flash ? '#fff' : '#cbc0b3'); bg.addColorStop(1, flash ? '#eee' : '#a89d90');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.ellipse(0, 26, 27, 21, 0, 0, TAU); ctx.fill();
        const hg = ctx.createRadialGradient(-10, -20, 6, 0, -8, 40);
        hg.addColorStop(0, flash ? '#fff' : '#e6ddd0'); hg.addColorStop(1, flash ? '#eee' : '#c2b7a8');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(0, -8, 34, 0, TAU); ctx.fill();
        // jeweled party crown
        ctx.fillStyle = '#e8c84c';
        ctx.beginPath();
        ctx.moveTo(-24, -34); ctx.lineTo(-24, -52); ctx.lineTo(-12, -40); ctx.lineTo(0, -54); ctx.lineTo(12, -40); ctx.lineTo(24, -52); ctx.lineTo(24, -34);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e05a7a'; ctx.beginPath(); ctx.arc(0, -44, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5ab0e0'; ctx.beginPath(); ctx.arc(-16, -42, 2.5, 0, TAU); ctx.arc(16, -42, 2.5, 0, TAU); ctx.fill();
        // rosy cheeks + shifty eyes
        ctx.fillStyle = 'rgba(224,132,120,0.3)'; ctx.beginPath(); ctx.ellipse(-20, 2, 6, 4, 0, 0, TAU); ctx.ellipse(20, 2, 6, 4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-12, -10, 5, 0, TAU); ctx.arc(12, -10, 5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#4a6ae0'; ctx.lineWidth = 4; // sharpie tears
        ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-12, 9); ctx.moveTo(12, -3); ctx.lineTo(12, 9); ctx.stroke();
        // "HELLO I HAVE" name sticker
        ctx.fillStyle = '#f4f0e6'; this.rr(ctx, -32, 40, 64, 18, 3); ctx.fill();
        ctx.fillStyle = '#c04040'; this.rr(ctx, -32, 40, 64, 5, 3); ctx.fill();
        ctx.fillStyle = '#3a5ac8'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('HELLO I HAVE: ' + (b.mask === 'mania' ? 'MANIA' : b.mask.toUpperCase()), 0, 53);
        break;
      }
      case 'withdrawal': { // shaking empty pill bottle
        const jit = 1.5;
        ctx.translate(Math.sin(b.t * 30) * jit, 0);
        // child-proof cap
        ctx.fillStyle = flash ? '#fff' : '#b84a78';
        this.rr(ctx, -30, -52, 60, 16, 4); ctx.fill();
        ctx.strokeStyle = '#8a3a5a'; ctx.lineWidth = 1;
        for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -52); ctx.lineTo(i * 5, -36); ctx.stroke(); }
        // amber bottle
        const bg2 = ctx.createLinearGradient(-30, 0, 30, 0);
        bg2.addColorStop(0, flash ? '#fff' : '#c98a4a'); bg2.addColorStop(0.5, flash ? '#fff' : '#e8c07a'); bg2.addColorStop(1, flash ? '#eee' : '#b0743a');
        ctx.fillStyle = bg2;
        this.rr(ctx, -30, -38, 60, 84, 10); ctx.fill();
        // Rx label
        ctx.fillStyle = '#f4efe2'; this.rr(ctx, -26, -20, 52, 40, 3); ctx.fill();
        ctx.fillStyle = '#a83a5a'; ctx.font = this.font(11, true); ctx.textAlign = 'center';
        ctx.fillText('℞ EMPTY', 0, -6);
        // sunken panicked eyes + sweat
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.ellipse(-11, 8, 4, 6 + Math.sin(b.t * 9) * 2, 0, 0, TAU); ctx.ellipse(11, 8, 4, 6 + Math.sin(b.t * 9 + 1) * 2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(-3, 27); ctx.lineTo(3, 30); ctx.lineTo(8, 27); ctx.stroke();
        ctx.fillStyle = 'rgba(122,184,232,0.85)';
        ctx.beginPath(); ctx.arc(24, -14 + Math.sin(b.t * 4) * 5, 3, 0, TAU); ctx.arc(-24, -6 + Math.cos(b.t * 3) * 5, 2.5, 0, TAU); ctx.fill();
        break;
      }
      case 'stigma': { // whispering shadow of judgment
        const near = U.dist(b.x, b.y, G.player.x, G.player.y) < 150;
        const vis = flash || near ? 0.9 : 0.12;
        ctx.globalAlpha *= vis;
        // pointing fingers reaching from the dark
        ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.5 + Math.sin(b.t + i) * 0.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20 + 20); ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40 + 24); ctx.stroke(); }
        ctx.lineCap = 'butt';
        // cloaked body
        const cg = ctx.createRadialGradient(0, -8, 6, 0, 0, 40);
        cg.addColorStop(0, '#332a40'); cg.addColorStop(1, '#160f20');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, -6, 34, Math.PI, TAU);
        ctx.quadraticCurveTo(34, 30, 24, 26); ctx.quadraticCurveTo(18, 38, 8, 30);
        ctx.quadraticCurveTo(0, 42, -8, 30); ctx.quadraticCurveTo(-18, 38, -24, 26);
        ctx.quadraticCurveTo(-34, 30, -34, -6); ctx.closePath(); ctx.fill();
        // hollow glowing judging eyes
        ctx.globalAlpha = Math.min(1, vis + 0.55);
        ctx.fillStyle = '#e8e0f0';
        ctx.beginPath(); ctx.ellipse(-11, -10, 5, 8, 0, 0, TAU); ctx.ellipse(11, -10, 5, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#241c30';
        ctx.beginPath(); ctx.ellipse(-11, -8, 2.4, 4, 0, 0, TAU); ctx.ellipse(11, -8, 2.4, 4, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e8e0f0'; ctx.lineWidth = 1.5; // furrowed brows
        ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(-6, -14); ctx.moveTo(16, -18); ctx.lineTo(6, -14); ctx.stroke();
        // whisper marks
        ctx.fillStyle = 'rgba(200,190,220,' + (0.3 + Math.sin(b.t * 3) * 0.2) + ')';
        ctx.font = this.font(11, true); ctx.textAlign = 'center';
        ctx.fillText('?', -40, -20 + Math.sin(b.t * 2) * 3); ctx.fillText('...', 42, -14 + Math.cos(b.t * 2) * 3);
        break;
      }
      case 'burnout': { // candle burning at BOTH ends
        const ff = 1 + Math.sin(b.t * 11) * 0.15, ff2 = 1 + Math.cos(b.t * 13) * 0.15;
        // bottom flame
        ctx.fillStyle = b.enrage > 0 ? '#e05a3a' : '#e8863a';
        ctx.beginPath(); ctx.ellipse(0, 48, 9 * ff2, 14 * ff2, 0, 0, TAU); ctx.fill();
        // wax body
        const wg = ctx.createLinearGradient(-22, 0, 22, 0);
        wg.addColorStop(0, flash ? '#fff' : '#d8c49c'); wg.addColorStop(0.5, flash ? '#fff' : '#f2e4c4'); wg.addColorStop(1, flash ? '#eee' : '#c8b088');
        ctx.fillStyle = wg;
        this.rr(ctx, -22, -36, 44, 78, 10); ctx.fill();
        // melting drips
        ctx.fillStyle = '#e8d8b0';
        ctx.beginPath(); ctx.ellipse(-19, -22 + Math.sin(b.t) * 3, 5, 11, 0.3, 0, TAU); ctx.ellipse(20, -8 + Math.cos(b.t) * 3, 4, 10, -0.2, 0, TAU); ctx.ellipse(-15, 20, 4, 8, 0.2, 0, TAU); ctx.fill();
        // top flame
        ctx.fillStyle = b.enrage > 0 ? '#e05a3a' : '#f0a03a';
        ctx.beginPath(); ctx.ellipse(0, -50, 10 * ff, 17 * ff, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f8d05a';
        ctx.beginPath(); ctx.ellipse(0, -48, 5 * ff, 9 * ff, 0, 0, TAU); ctx.fill();
        // burnt-out exhausted face
        ctx.strokeStyle = '#6a5540'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(-6, -4); ctx.moveTo(15, -8); ctx.lineTo(6, -4); ctx.stroke();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-9, 0, 2.5, 0, TAU); ctx.arc(9, 0, 2.5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(90,110,150,0.5)'; // eyebags
        ctx.beginPath(); ctx.ellipse(-9, 5, 4, 2, 0, 0, TAU); ctx.ellipse(9, 5, 4, 2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.ellipse(0, 16, 5, 8, 0, 0, TAU); ctx.fill(); // big yawn
        break;
      }
      case 'walrus': { // Dr. Walrus in a lab coat
        // coat body
        const cg = ctx.createLinearGradient(0, 20, 0, 60);
        cg.addColorStop(0, flash ? '#fff' : '#f2f2f6'); cg.addColorStop(1, flash ? '#eee' : '#d6d6e0');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.moveTo(-40, 60); ctx.quadraticCurveTo(-42, 24, -22, 22); ctx.lineTo(22, 22); ctx.quadraticCurveTo(42, 24, 40, 60); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#c0c0cc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, 60); ctx.stroke();
        ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.arc(-8, 40, 1.6, 0, TAU); ctx.arc(8, 48, 1.6, 0, TAU); ctx.fill(); // buttons
        // stethoscope
        ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-10, 24); ctx.quadraticCurveTo(-16, 44, 6, 48); ctx.stroke();
        ctx.fillStyle = '#8a8a94'; ctx.beginPath(); ctx.arc(6, 49, 4, 0, TAU); ctx.fill();
        this.drawWalrusFace(ctx, 0, -6, 0.62, b.t);
        if (b.state === 3) { ctx.fillStyle = '#2c2333'; ctx.beginPath(); ctx.ellipse(0, 24, 10, 13, 0, 0, TAU); ctx.fill(); }
        break;
      }
      case 'dsm': { // THE MANUAL — a giant living diagnostic book
        const flip = b.state === 1;                    // mid page-flip
        const page = (DSM_PAGES && DSM_PAGES[b.page]) || { label: '', clr: '#c0b8a0' };
        // hard cover behind
        ctx.fillStyle = flash ? '#fff' : '#5a2030';
        this.rr(ctx, -54, -46, 108, 92, 6); ctx.fill();
        ctx.strokeStyle = '#e8c84c'; ctx.lineWidth = 2;
        this.rr(ctx, -50, -42, 100, 84, 4); ctx.stroke();
        // open pages (two leaves meeting at the spine)
        const lean = flip ? Math.sin(b.stateT * 8) * 10 : 0;
        for (const sgn of [-1, 1]) {
          ctx.save();
          const pg = ctx.createLinearGradient(0, -40, 0, 40);
          pg.addColorStop(0, '#fbf4e2'); pg.addColorStop(1, '#e6dcc4');
          ctx.fillStyle = flash ? '#fff' : pg;
          ctx.beginPath();
          ctx.moveTo(0, -40); ctx.lineTo(sgn * (46 + (sgn > 0 ? lean : 0)), -34);
          ctx.lineTo(sgn * (46 + (sgn > 0 ? lean : 0)), 34); ctx.lineTo(0, 40);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#b8ac90'; ctx.lineWidth = 1;
          for (let i = 0; i < 6; i++) { const ly = -26 + i * 10; ctx.beginPath(); ctx.moveTo(sgn * 8, ly); ctx.lineTo(sgn * 40, ly + sgn * 2); ctx.stroke(); }
          ctx.restore();
        }
        // spine + peering eyes over the top
        ctx.strokeStyle = '#7a3040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 40); ctx.stroke();
        ctx.fillStyle = '#f0e8d8'; ctx.beginPath(); ctx.ellipse(-16, -30, 8, 9, 0, 0, TAU); ctx.ellipse(16, -30, 8, 9, 0, 0, TAU); ctx.fill();
        const ea = U.ang(b.x - 16, b.y - 30, G.player.x, G.player.y);
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-16 + Math.cos(ea) * 3, -30 + Math.sin(ea) * 3, 3.5, 0, TAU); ctx.arc(16 + Math.cos(ea) * 3, -30 + Math.sin(ea) * 3, 3.5, 0, TAU); ctx.fill();
        // chapter tab (current page colour) + title
        ctx.fillStyle = page.clr;
        this.rr(ctx, -34, 40, 68, 16, 3); ctx.fill();
        ctx.fillStyle = '#2c2333'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText(page.label, 0, 52);
        // gold "DSM" on the cover top edge
        ctx.fillStyle = '#e8c84c'; ctx.font = this.font(11, true);
        ctx.fillText('THE MANUAL', 0, -48);
        break;
      }
      case 'priorauth': { // a rubber-stamp bureaucrat guarding your treatment
        const approved = b.vulnerable;
        // manila folder torso
        const fg = ctx.createLinearGradient(0, 6, 0, 56);
        fg.addColorStop(0, flash ? '#fff' : '#d8b46a'); fg.addColorStop(1, flash ? '#eee' : '#b8923f');
        ctx.fillStyle = flash ? '#fff' : '#e6c886'; this.rr(ctx, -46, 0, 52, 12, 5); ctx.fill(); // folder tab
        ctx.fillStyle = fg; this.rr(ctx, -48, 8, 96, 50, 8); ctx.fill();
        ctx.strokeStyle = '#7a5f28'; ctx.lineWidth = 2; this.rr(ctx, -48, 8, 96, 50, 8); ctx.stroke();
        // papers poking out
        ctx.fillStyle = '#f4efe0'; this.rr(ctx, -32, 4, 64, 10, 2); ctx.fill();
        ctx.strokeStyle = '#c8bfa4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-26, 9); ctx.lineTo(26, 9); ctx.stroke();
        // rubber-stamp head: wooden handle + plate
        const bob = Math.sin(b.t * 3) * 3;
        ctx.fillStyle = '#7a4a2a'; this.rr(ctx, -9, -54 + bob, 18, 16, 5); ctx.fill(); // handle knob
        ctx.fillStyle = '#5a3720'; ctx.fillRect(-4, -40 + bob, 8, 12); // stem
        ctx.fillStyle = flash ? '#fff' : (approved ? '#2c8a3a' : '#b03030');
        this.rr(ctx, -42, -32 + bob, 84, 32, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; this.rr(ctx, -42, -32 + bob, 84, 32, 6); ctx.stroke();
        // stamped verdict
        ctx.save(); ctx.translate(0, -16 + bob); ctx.rotate(-0.05);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; this.rr(ctx, -36, -10, 72, 20, 3); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = this.font(14, true); ctx.textAlign = 'center';
        ctx.fillText(approved ? 'APPROVED' : 'DENIED', 0, 5);
        ctx.restore();
        // peering eyes + mouth on the folder
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-13, 28, 2.6, 0, TAU); ctx.arc(13, 28, 2.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2; ctx.beginPath();
        if (approved) ctx.arc(0, 42, 6, Math.PI + 0.3, TAU - 0.3); else { ctx.moveTo(-7, 42); ctx.lineTo(7, 42); }
        ctx.stroke();
        break;
      }
      case 'algorithm': { // a glowing phone/feed that watches how you move
        // phone body
        ctx.fillStyle = flash ? '#fff' : '#1b1f2a';
        this.rr(ctx, -34, -46, 68, 96, 12); ctx.fill();
        ctx.strokeStyle = '#3a4152'; ctx.lineWidth = 3; this.rr(ctx, -34, -46, 68, 96, 12); ctx.stroke();
        // glowing screen — a scrolling "feed"
        const sg = ctx.createLinearGradient(0, -40, 0, 44);
        sg.addColorStop(0, '#2a4a7a'); sg.addColorStop(1, '#12233f');
        ctx.fillStyle = flash ? '#dfe' : sg; this.rr(ctx, -28, -40, 56, 84, 6); ctx.fill();
        ctx.save(); this.rr(ctx, -28, -40, 56, 84, 6); ctx.clip();
        const scroll = (b.t * 40) % 26;
        for (let i = -1; i < 5; i++) {
          const cy = -38 + i * 26 + scroll;
          ctx.fillStyle = 'rgba(120,170,240,0.5)'; this.rr(ctx, -24, cy, 48, 10, 3); ctx.fill();
          ctx.fillStyle = 'rgba(160,140,230,0.5)'; ctx.beginPath(); ctx.arc(-18, cy + 15, 4, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(120,170,240,0.35)'; this.rr(ctx, -10, cy + 11, 32, 7, 2); ctx.fill();
        }
        ctx.restore();
        // watching eyes tracking the player
        const ea = U.ang(b.x, b.y, G.player.x, G.player.y);
        ctx.fillStyle = '#dfeeff';
        ctx.beginPath(); ctx.ellipse(-11, -6, 7, 9, 0, 0, TAU); ctx.ellipse(11, -6, 7, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1b2a3f';
        ctx.beginPath(); ctx.arc(-11 + Math.cos(ea) * 3, -6 + Math.sin(ea) * 3, 3.6, 0, TAU); ctx.arc(11 + Math.cos(ea) * 3, -6 + Math.sin(ea) * 3, 3.6, 0, TAU); ctx.fill();
        // a little "notification" badge
        ctx.fillStyle = '#e05a5a'; ctx.beginPath(); ctx.arc(30, -44, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('∞', 30, -40);
        break;
      }
      case 'theboard': { // three suits, one table, a gavel
        // the boardroom table
        ctx.fillStyle = flash ? '#fff' : '#6a4a2e';
        this.rr(ctx, -66, 14, 132, 26, 8); ctx.fill();
        ctx.fillStyle = flash ? '#eee' : '#7d5a38';
        this.rr(ctx, -66, 8, 132, 12, 6); ctx.fill();
        // three chairmen, heads bobbing out of sync
        for (let i = -1; i <= 1; i++) {
          const bx = i * 40, bob = Math.sin(b.t * 1.6 + i * 2.1) * 2;
          ctx.fillStyle = flash ? '#fff' : '#2c2a36';   // suit
          this.rr(ctx, bx - 15, -18 + bob, 30, 30, 8); ctx.fill();
          ctx.fillStyle = '#e8e2d4'; ctx.beginPath();   // collar
          ctx.moveTo(bx - 5, -16 + bob); ctx.lineTo(bx + 5, -16 + bob); ctx.lineTo(bx, -8 + bob); ctx.closePath(); ctx.fill();
          ctx.fillStyle = ['#8a2a2a', '#c8a24a', '#2a4a8a'][i + 1];   // power tie
          ctx.beginPath(); ctx.moveTo(bx, -8 + bob); ctx.lineTo(bx + 3, 0 + bob); ctx.lineTo(bx, 10 + bob); ctx.lineTo(bx - 3, 0 + bob); ctx.closePath(); ctx.fill();
          ctx.fillStyle = flash ? '#fff' : '#e8c9a6';   // head
          ctx.beginPath(); ctx.arc(bx, -30 + bob, 12, 0, TAU); ctx.fill();
          // identical unreadable faces
          ctx.fillStyle = '#2c2333';
          this.rr(ctx, bx - 8, -34 + bob, 6, 4, 1.5); ctx.fill(); this.rr(ctx, bx + 2, -34 + bob, 6, 4, 1.5); ctx.fill();
          ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(bx - 4, -23 + bob); ctx.lineTo(bx + 4, -23 + bob); ctx.stroke();
          // a raised hand when voting (phase 3)
          if (b._ph === 3 && Math.sin(b.t * 2 + i) > 0.2) {
            ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(bx + 18, -34 + bob, 5, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#2c2a36'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(bx + 13, -18 + bob); ctx.lineTo(bx + 18, -30 + bob); ctx.stroke();
          }
        }
        // the gavel, mid-swing
        ctx.save(); ctx.translate(58, -6); ctx.rotate(Math.sin(b.t * 3) * 0.6 - 0.4);
        ctx.fillStyle = '#5a3a22'; this.rr(ctx, -3, -2, 6, 26, 2); ctx.fill();
        ctx.fillStyle = '#6a4a2e'; this.rr(ctx, -12, -12, 24, 12, 4); ctx.fill();
        ctx.restore();
        // nameplate
        ctx.fillStyle = '#c8a24a'; this.rr(ctx, -34, 44, 68, 14, 3); ctx.fill();
        ctx.fillStyle = '#241c28'; ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('THE BOARD', 0, 54);
        break;
      }
      case 'thesystem': { // the whole machine: a monolithic hospital tower, departments lit by phase
        const page = b.page || 0;
        // looming shadow-glow
        const mg = ctx.createRadialGradient(0, 0, 20, 0, 0, 95);
        mg.addColorStop(0, 'rgba(120,110,140,0.35)'); mg.addColorStop(1, 'rgba(120,110,140,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, 95, 0, TAU); ctx.fill();
        // tower body
        const tg = ctx.createLinearGradient(-38, 0, 38, 0);
        tg.addColorStop(0, flash ? '#fff' : '#4a4658'); tg.addColorStop(0.5, flash ? '#fff' : '#6a6478'); tg.addColorStop(1, flash ? '#eee' : '#3c3848');
        ctx.fillStyle = tg; this.rr(ctx, -38, -58, 76, 118, 8); ctx.fill();
        ctx.strokeStyle = '#2a2634'; ctx.lineWidth = 3; this.rr(ctx, -38, -58, 76, 118, 8); ctx.stroke();
        // three department floors — the active one glows
        const floors = [
          { y: -46, clr: '#e08a8a', label: 'DENIED' },
          { y: -6, clr: '#8fd05a', label: '℞' },
          { y: 34, clr: '#5a9de0', label: '▶' }
        ];
        floors.forEach((f, i) => {
          const on = i === page;
          ctx.fillStyle = on ? f.clr : 'rgba(200,195,210,0.16)';
          if (on) { ctx.save(); ctx.shadowColor = f.clr; ctx.shadowBlur = 14; }
          this.rr(ctx, -30, f.y, 60, 26, 4); ctx.fill();
          if (on) ctx.restore();
          ctx.fillStyle = on ? '#241c28' : 'rgba(230,225,240,0.4)';
          ctx.font = this.font(on ? 11 : 10, true); ctx.textAlign = 'center';
          ctx.fillText(f.label, 0, f.y + 18);
          // little windows beside the label
          ctx.fillStyle = on ? 'rgba(30,24,36,0.45)' : 'rgba(230,225,240,0.25)';
          ctx.fillRect(-26, f.y + 6, 6, 8); ctx.fillRect(20, f.y + 6, 6, 8);
        });
        // caduceus sign + antenna up top
        ctx.strokeStyle = '#8a8498'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(0, -78); ctx.stroke();
        ctx.fillStyle = Math.floor(b.t * 2) % 2 ? '#e05a5a' : '#7a2a2a';
        ctx.beginPath(); ctx.arc(0, -82, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8e2f0'; this.rr(ctx, -20, -76, 40, 16, 4); ctx.fill();
        ctx.strokeStyle = '#4a4458'; ctx.lineWidth = 1.5; this.rr(ctx, -20, -76, 40, 16, 4); ctx.stroke();
        ctx.fillStyle = '#4a4458'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('☤', 0, -63.5);
        break;
      }
      case 'peerreview': { // your own chart looking back at you — a photocopied twin in review-purple
        const T = b._tw;
        const dg = T ? T.diag : (G.player ? G.player.diag : 'adhd');
        if (!b._twinP || b._twinDg !== dg) {
          try { b._twinP = new Player(dg); b._twinP.noHat = true; b._twinDg = dg; } catch (e) { b._twinP = null; }
        }
        // reviewer's aura
        ctx.save();
        ctx.strokeStyle = 'rgba(160,140,220,0.5)'; ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 6]); ctx.lineDashOffset = -(G.t || 0) * 24;
        ctx.beginPath(); ctx.arc(0, 0, b.r + 14, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        if (b.state === 8) {   // "under review": buried in paperwork, untouchable
          ctx.save(); ctx.globalAlpha = 0.9;
          for (let i = 0; i < 5; i++) {
            const pa = (G.t || 0) * 1.6 + i * TAU / 5;
            ctx.save(); ctx.translate(Math.cos(pa) * 30, Math.sin(pa) * 22); ctx.rotate(Math.sin(pa) * 0.4);
            ctx.fillStyle = '#f0ead8'; ctx.fillRect(-9, -12, 18, 24);
            ctx.strokeStyle = 'rgba(60,50,70,0.5)'; ctx.lineWidth = 1;
            for (let l = -7; l <= 7; l += 4) { ctx.beginPath(); ctx.moveTo(-6, l); ctx.lineTo(6, l); ctx.stroke(); }
            ctx.restore();
          }
          ctx.restore();
        }
        if (b._twinP) {   // the twin: your model, photocopied badly (mirrored, drained, marked up)
          const tw = b._twinP;
          tw.x = 0; tw.y = 0; tw.moving = b.state === 9; tw.aimAng = b.aimP ? b.aimP(G) : 0;
          ctx.save();
          ctx.scale(-1.15, 1.15);   // a reflection, slightly wrong
          ctx.filter = 'brightness(0.68) saturate(0.5)';
          try { this.drawPlayer(tw, G); } catch (e) { }
          ctx.filter = 'none';
          ctx.restore();
          // red pen: the reviewer's notes, all over you
          ctx.strokeStyle = 'rgba(200,60,60,0.85)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-16, -6); ctx.quadraticCurveTo(-2, -14, 14, -4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-4, 14); ctx.moveTo(-4, 8); ctx.lineTo(-12, 14); ctx.stroke();   // an ✗
          ctx.lineCap = 'butt';
        } else {   // fallback: a clipboard ghost
          ctx.fillStyle = flash ? '#fff' : '#8a7fd0';
          ctx.beginPath(); ctx.ellipse(0, 0, b.r * 0.9, b.r, 0, 0, TAU); ctx.fill();
        }
        // the clipboard familiar, hovering with your file
        const cb = Math.sin((G.t || 0) * 2.3) * 3;
        ctx.save(); ctx.translate(b.r + 16, -b.r * 0.5 + cb); ctx.rotate(0.12);
        ctx.fillStyle = '#8a6a3a'; this.rr(ctx, -10, -13, 20, 26, 3); ctx.fill();
        ctx.fillStyle = '#f0ead8'; this.rr(ctx, -8, -10, 16, 21, 2); ctx.fill();
        ctx.fillStyle = '#6a625a'; this.rr(ctx, -4, -15, 8, 5, 2); ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,70,0.55)'; ctx.lineWidth = 1;
        for (let l = -6; l <= 6; l += 4) { ctx.beginPath(); ctx.moveTo(-5, l); ctx.lineTo(5, l); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(200,60,60,0.9)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(5, 7); ctx.moveTo(5, 4); ctx.lineTo(2, 7); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'influencer': { // wellness guru mid-photoshoot: ring light, shades, phone, crystals
        const live = !b.dead && b.hp < b.maxhp * 0.3;
        // the ring light — a glowing halo behind everything
        const rlGlow = 0.55 + Math.sin(b.t * 4) * 0.15;
        const rg2 = ctx.createRadialGradient(0, -8, 30, 0, -8, 62);
        rg2.addColorStop(0, 'rgba(255,240,200,0)'); rg2.addColorStop(0.75, 'rgba(255,236,180,' + rlGlow * 0.5 + ')'); rg2.addColorStop(1, 'rgba(255,236,180,0)');
        ctx.fillStyle = rg2; ctx.beginPath(); ctx.arc(0, -8, 62, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,236,190,' + rlGlow + ')'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, -8, 46, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -8, 46, 0, TAU); ctx.stroke();
        // tripod legs
        ctx.strokeStyle = '#4a4048'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(-16, 52); ctx.moveTo(0, 38); ctx.lineTo(16, 52); ctx.moveTo(0, 30); ctx.lineTo(0, 44); ctx.stroke();
        // athleisure body
        const bg2 = ctx.createLinearGradient(0, -8, 0, 40);
        bg2.addColorStop(0, flash ? '#fff' : '#e8a0b8'); bg2.addColorStop(1, flash ? '#eee' : '#c07898');
        ctx.fillStyle = bg2;
        this.rr(ctx, -24, -4, 48, 42, 14); ctx.fill();
        // swooshy hair
        ctx.fillStyle = flash ? '#fff' : '#8a5a3a';
        ctx.beginPath(); ctx.moveTo(-20, -30); ctx.quadraticCurveTo(-34, -10, -26, 12); ctx.quadraticCurveTo(-18, -6, -16, -22); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(20, -30); ctx.quadraticCurveTo(34, -10, 26, 12); ctx.quadraticCurveTo(18, -6, 16, -22); ctx.closePath(); ctx.fill();
        // face
        ctx.fillStyle = flash ? '#fff' : '#f0d0b8';
        ctx.beginPath(); ctx.arc(0, -18, 18, 0, TAU); ctx.fill();
        // enormous white sunglasses
        ctx.fillStyle = '#fdfdf8';
        this.rr(ctx, -16, -24, 14, 11, 4); ctx.fill(); this.rr(ctx, 2, -24, 14, 11, 4); ctx.fill();
        ctx.fillRect(-3, -21, 6, 3);
        ctx.fillStyle = '#c8b8d8'; this.rr(ctx, -14, -22, 10, 7, 3); ctx.fill(); this.rr(ctx, 4, -22, 10, 7, 3); ctx.fill();
        // serene influencer smile
        ctx.strokeStyle = '#a06a5a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -8, 6, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.lineCap = 'butt';
        // phone in hand (always filming)
        ctx.save(); ctx.translate(26, 8); ctx.rotate(Math.sin(b.t * 2.2) * 0.08 - 0.15);
        ctx.fillStyle = '#1b1f2a'; this.rr(ctx, -6, -12, 12, 24, 3); ctx.fill();
        ctx.fillStyle = '#3a4a6a'; this.rr(ctx, -4, -10, 8, 18, 2); ctx.fill();
        ctx.restore();
        // orbiting crystals while the shield is up
        if (b.shieldHp > 0) {
          for (let i = 0; i < b.shieldHp; i++) {
            const ca = b.t * 1.6 + i * TAU / 3;
            const cx2 = Math.cos(ca) * 52, cy2 = -8 + Math.sin(ca) * 40;
            ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(ca);
            ctx.fillStyle = 'rgba(200,176,224,0.9)';
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 0); ctx.lineTo(0, 10); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
          }
        }
        // 🔴 LIVE badge when enraged
        if (live) {
          ctx.fillStyle = Math.floor(b.t * 3) % 2 ? '#e04040' : '#a02020';
          this.rr(ctx, -22, -52, 44, 15, 4); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = this.font(10, true); ctx.textAlign = 'center';
          ctx.fillText('● LIVE', 0, -41);
        }
        break;
      }
      case 'thecure': { // a radiant panacea capsule — hope, weaponized
        const glow = 1 + Math.sin(b.t * 3) * 0.12;
        const gg = ctx.createRadialGradient(0, 0, 6, 0, 0, 70 * glow);
        gg.addColorStop(0, 'rgba(255,240,190,0.5)'); gg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 70 * glow, 0, TAU); ctx.fill();
        // radiant rays
        ctx.strokeStyle = 'rgba(255,220,120,0.4)'; ctx.lineWidth = 3;
        for (let i = 0; i < 12; i++) { const a = b.t * 0.6 + i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); ctx.lineTo(Math.cos(a) * (54 + Math.sin(b.t * 4 + i) * 4), Math.sin(a) * (54 + Math.sin(b.t * 4 + i) * 4)); ctx.stroke(); }
        // capsule
        ctx.save(); ctx.rotate(-0.5);
        const cg = ctx.createLinearGradient(-34, 0, 34, 0);
        cg.addColorStop(0, flash ? '#fff' : '#ffd86a'); cg.addColorStop(0.5, '#fff3cf'); cg.addColorStop(1, flash ? '#fff' : '#f0a840');
        ctx.fillStyle = '#f4efe0'; this.rr(ctx, -34, -18, 34, 36, 18); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#ffcf5a'; this.rr(ctx, 0, -18, 34, 36, 18); ctx.fill();
        ctx.strokeStyle = '#c89020'; ctx.lineWidth = 2.5; this.rr(ctx, -34, -18, 68, 36, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
        ctx.restore();
        // serene little face
        ctx.fillStyle = '#8a6a2a';
        ctx.beginPath(); ctx.arc(-8, 2, 2.4, 0, TAU); ctx.arc(8, 2, 2.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 6, 6, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.fillStyle = '#e8c84c'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('THE CURE', 0, -40);
        break;
      }
      case 'founder': { // a pharma tycoon in a power suit, fists full of money
        const P3 = b.hp < b.maxhp * 0.34;
        // money-green aura
        const gg = ctx.createRadialGradient(0, 0, 8, 0, 0, 66);
        gg.addColorStop(0, `rgba(140,208,120,${P3 ? 0.34 : 0.22})`); gg.addColorStop(1, 'rgba(140,208,120,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 66, 0, TAU); ctx.fill();
        // power-suit torso
        const sg = ctx.createLinearGradient(0, -10, 0, 46);
        sg.addColorStop(0, flash ? '#fff' : '#2b2f3a'); sg.addColorStop(1, flash ? '#eee' : '#171a22');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.moveTo(-46, 46); ctx.lineTo(-30, 2); ctx.lineTo(30, 2); ctx.lineTo(46, 46); ctx.closePath(); ctx.fill();
        // white shirt V + golden tie
        ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(12, 4); ctx.lineTo(0, 34); ctx.closePath(); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#e0c040'; ctx.beginPath(); ctx.moveTo(-5, 6); ctx.lineTo(5, 6); ctx.lineTo(3, 30); ctx.lineTo(0, 38); ctx.lineTo(-3, 30); ctx.closePath(); ctx.fill();
        // lapels
        ctx.strokeStyle = '#0e1016'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(-24, 30); ctx.moveTo(12, 4); ctx.lineTo(24, 30); ctx.stroke();
        // head
        const hg = ctx.createRadialGradient(-5, -30, 4, 0, -24, 30);
        hg.addColorStop(0, flash ? '#fff' : '#e8c9a6'); hg.addColorStop(1, flash ? '#eee' : '#b58e68');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -24, 22, 0, TAU); ctx.fill();
        // slicked-back hair
        ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(0, -30, 22, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(16, -34); ctx.lineTo(-16, -34); ctx.closePath(); ctx.fill();
        // money-green sunglasses
        ctx.fillStyle = flash ? '#fff' : '#123018';
        this.rr(ctx, -18, -30, 15, 9, 2); ctx.fill(); this.rr(ctx, 3, -30, 15, 9, 2); ctx.fill();
        ctx.fillStyle = 'rgba(140,208,120,0.7)'; this.rr(ctx, -16, -29, 6, 3, 1); ctx.fill(); this.rr(ctx, 5, -29, 6, 3, 1); ctx.fill();
        ctx.fillStyle = '#123018'; ctx.fillRect(-3, -27, 6, 2);
        // smug grin
        ctx.strokeStyle = '#6a4a38'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -16, 7, 0.15, Math.PI - 0.15); ctx.stroke();
        // fistful(s) of cash
        const cash = (x) => { ctx.fillStyle = '#8fd05a'; this.rr(ctx, x, -6, 16, 11, 2); ctx.fill(); ctx.strokeStyle = '#4a8a3a'; ctx.lineWidth = 1; this.rr(ctx, x, -6, 16, 11, 2); ctx.stroke(); ctx.fillStyle = '#356a2a'; ctx.font = this.font(8, true); ctx.textAlign = 'center'; ctx.fillText('$', x + 8, 2); };
        cash(30); if (P3) cash(-46);
        // name
        ctx.fillStyle = '#8fd05a'; ctx.font = this.font(11, true); ctx.textAlign = 'center'; ctx.fillText('THE FOUNDER', 0, -52);
        break;
      }
    }
    ctx.restore();
  },

  /* Dr. Walrus's face — used by boss, plush, and (via game.js) the quiz portrait */
  drawWalrusFace(ctx, cx, cy, s, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    const bob = Math.sin((t || 0) * 2) * 3;
    ctx.translate(0, bob);
    // head
    ctx.fillStyle = '#9a6f52';
    ctx.beginPath(); ctx.ellipse(0, 0, 62, 56, 0, 0, TAU); ctx.fill();
    // muzzle
    ctx.fillStyle = '#b5876a';
    ctx.beginPath(); ctx.ellipse(0, 22, 44, 32, 0, 0, TAU); ctx.fill();
    // whisker pads
    ctx.fillStyle = '#c99b7d';
    ctx.beginPath(); ctx.ellipse(-20, 22, 20, 18, 0, 0, TAU); ctx.ellipse(20, 22, 20, 18, 0, 0, TAU); ctx.fill();
    // whisker dots
    ctx.fillStyle = '#7a5540';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      ctx.beginPath(); ctx.arc(-28 + i * 9, 16 + j * 9, 1.8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(10 + i * 9, 16 + j * 9, 1.8, 0, TAU); ctx.fill();
    }
    // tusks
    ctx.fillStyle = '#f0e8d0';
    this.rr(ctx, -24, 34, 11, 34, 5); ctx.fill();
    this.rr(ctx, 13, 34, 11, 34, 5); ctx.fill();
    ctx.strokeStyle = '#d0c4a0'; ctx.lineWidth = 2;
    this.rr(ctx, -24, 34, 11, 34, 5); ctx.stroke();
    this.rr(ctx, 13, 34, 11, 34, 5); ctx.stroke();
    // nose
    ctx.fillStyle = '#4a3328';
    ctx.beginPath(); ctx.ellipse(0, 8, 12, 8, 0, 0, TAU); ctx.fill();
    // eyes (tired, knowing)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-22, -16, 11, 12, 0, 0, TAU); ctx.ellipse(22, -16, 11, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c2333';
    ctx.beginPath(); ctx.arc(-20, -14, 5, 0, TAU); ctx.arc(24, -14, 5, 0, TAU); ctx.fill();
    // heavy lids
    ctx.fillStyle = '#9a6f52';
    ctx.beginPath(); ctx.ellipse(-22, -24, 12, 7, 0.1, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, -24, 12, 7, -0.1, 0, Math.PI); ctx.fill();
    // glasses
    ctx.strokeStyle = '#3a3040'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-22, -16, 14, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(22, -16, 14, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(8, -16); ctx.stroke();
    // head mirror
    ctx.strokeStyle = '#c8c8d0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, -40, 34, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = '#d8d8e0';
    ctx.beginPath(); ctx.arc(0, -62, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f0f0f8';
    ctx.beginPath(); ctx.arc(-4, -66, 5, 0, TAU); ctx.fill();
    ctx.restore();
  },

  /* character-select portrait (Patient Files) */
  drawCharPortrait(ctx, diagId, variant) {
    ctx.clearRect(0, 0, 84, 84);
    // reuse the exact in-game sprite for consistency
    const prev = this.ctx;
    this.ctx = ctx;
    ctx.save();
    ctx.translate(42, 40);
    ctx.scale(1.65, 1.65);
    const pl = new Player(diagId, variant);
    pl.x = 0; pl.y = 0; pl.aimAng = -Math.PI / 2; pl.iframes = 0; pl.moving = false;
    if (diagId === 'bipolar') pl.mania = true;
    try { this.drawPlayer(pl, { t: 0.6 }); } catch (e) { }
    ctx.restore();
    this.ctx = prev;
  },

  /* ---------- shareable Diagnosis Card ----------
     Renders a polished portrait card to an offscreen canvas, then shares it
     (mobile Web Share w/ image) or downloads a PNG (desktop). */
  shareCard(opts) {
    const W = 900, H = 1180;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const prev = this.ctx; this.ctx = x;
    try { this._paintShareCard(x, W, H, opts); } catch (e) { }
    this.ctx = prev;
    const D = DATA.DIAG[opts.diag] || { name: 'Something' };
    const url = 'https://chasegannon42-maker.github.io/everybodies-got-somethin/';
    const codeTag = opts.code ? ` (code ${opts.code})` : '';
    const text = opts.daily
      ? `🗓️ ${opts.label === 'CHALLENGE' ? 'Challenge' : 'Daily Ward'} — I'm ${D.name} and reached Ward ${opts.depth} in Everybodies Got Somethin. Beat me${codeTag}: ${url}`
      : `Diagnosed with ${D.name} — reached Ward ${opts.depth} in Everybodies Got Somethin. ${url}`;
    const fname = `egs-${opts.diag}-ward${opts.depth}.png`;
    const finish = (blob) => {
      if (!blob) return;
      const file = new File([blob], fname, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Everybodies Got Somethin', text }).catch(() => { });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
    };
    if (cv.toBlob) cv.toBlob(finish, 'image/png');
    else { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = fname; a.click(); }
    return cv;
  },
  _paintShareCard(x, W, H, opts) {
    const D = DATA.DIAG[opts.diag] || DATA.DIAG.adhd;
    // backdrop + vignette
    x.fillStyle = '#17131a'; x.fillRect(0, 0, W, H);
    const vg = x.createRadialGradient(W / 2, H * 0.42, H * 0.18, W / 2, H * 0.5, H * 0.78);
    vg.addColorStop(0, 'rgba(70,48,82,0.30)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    // parchment panel
    const m = 34;
    x.fillStyle = 'rgba(0,0,0,0.45)'; this.rr(x, m + 6, m + 12, W - 2 * m, H - 2 * m, 26); x.fill();
    x.fillStyle = '#f6eedd'; this.rr(x, m, m, W - 2 * m, H - 2 * m, 26); x.fill();
    x.strokeStyle = '#2c2333'; x.lineWidth = 8; this.rr(x, m, m, W - 2 * m, H - 2 * m, 26); x.stroke();
    x.textAlign = 'center';
    // title (gold drop-shadow, purple face)
    x.font = this.font(50, true);
    x.fillStyle = '#e8b64c'; x.fillText('EVERYBODIES', W / 2 + 4, 136); x.fillText('GOT SOMETHIN', W / 2 + 4, 192);
    x.fillStyle = '#3a2a4a'; x.fillText('EVERYBODIES', W / 2, 132); x.fillText('GOT SOMETHIN', W / 2, 188);
    x.fillStyle = '#6b5a4a'; x.font = this.font(20); x.fillText('a checkup nobody asked for', W / 2, 224);
    // daily ribbon
    let topY = 244;
    if (opts.daily) {
      x.fillStyle = '#e8b64c'; this.rr(x, W / 2 - 200, topY, 400, 44, 22); x.fill();
      x.strokeStyle = '#2c2333'; x.lineWidth = 4; this.rr(x, W / 2 - 200, topY, 400, 44, 22); x.stroke();
      x.fillStyle = '#2c2333'; x.font = this.font(23, true);
      x.fillText((opts.label === 'CHALLENGE' ? '🔗 ' : '🗓️ ') + (opts.label || 'DAILY WARD') + ' · ' + opts.key, W / 2, topY + 30);
      topY += 70;
    } else topY += 6;
    // walrus portrait
    this.drawWalrusFace(x, W / 2, topY + 96, 1.35, 0.5);
    let y = topY + 210;
    // diagnosis prescription block
    const bx = m + 40, bw = W - 2 * (m + 40);
    x.fillStyle = '#fff8f0'; this.rr(x, bx, y, bw, 150, 16); x.fill();
    x.strokeStyle = '#b03030'; x.lineWidth = 5; x.setLineDash([12, 8]); this.rr(x, bx, y, bw, 150, 16); x.stroke(); x.setLineDash([]);
    x.save(); x.translate(bx + bw - 66, y + 4); x.rotate(0.14);
    x.strokeStyle = '#b03030'; x.lineWidth = 4; this.rr(x, -66, -20, 132, 38, 8); x.stroke();
    x.fillStyle = '#b03030'; x.font = this.font(19, true); x.fillText('DIAGNOSIS', 0, 6); x.restore();
    x.fillStyle = D.color; x.font = this.font(46, true); x.fillText(D.name, W / 2, y + 62);
    x.fillStyle = '#8a5a4a'; x.font = this.font(21); x.fillText(D.short, W / 2, y + 98);
    x.fillStyle = '#2c5a33'; x.font = this.font(20); x.fillText('“' + D.tag + '”', W / 2, y + 130);
    y += 150 + 58;
    // result headline
    x.fillStyle = '#2c2333'; x.font = this.font(56, true);
    x.fillText('REACHED WARD ' + opts.depth, W / 2, y);
    x.fillStyle = '#6b5a4a'; x.font = this.font(23); x.fillText(DATA.floorName(opts.depth) + ' · ' + DATA.tierName(opts.depth), W / 2, y + 36);
    y += 74;
    if (opts.win) { x.fillStyle = '#c07818'; x.font = this.font(24, true); x.fillText('🦭 DEFEATED DR. WALRUS', W / 2, y); y += 40; }
    if (opts.stats) {
      const s = opts.stats;
      x.fillStyle = '#55445e'; x.font = this.font(21);
      x.fillText((s.kills || 0) + ' symptoms managed  ·  ' + (s.bosses || 0) + ' bosses  ·  ' + (s.pills || 0) + ' pills', W / 2, y);
    }
    // footer / link
    x.fillStyle = '#8a7a68'; x.font = this.font(21, true); x.fillText('🦭  play free at', W / 2, H - m - 56);
    x.fillStyle = '#3a2a4a'; x.font = this.font(20, true); x.fillText('chasegannon42-maker.github.io/everybodies-got-somethin', W / 2, H - m - 28);
  },

  /* Patient Chart icon: render an enemy/boss/item/pill sprite into a small square.
     ONLY call for already-seen entries — constructing an Enemy/Boss marks it seen. */
  drawCodexIcon(ctx, kind, id, size) {
    const prev = this.ctx; this.ctx = ctx;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    const stubG = { t: 0.6, player: { x: 0, y: -140, flags: {}, diag: 'adhd' }, enemies: [], boss: null };
    try {
      if (kind === 'enemies') {
        const e = new Enemy(id, 0, 0, 1, false, 1); e.spawnT = 0; e.hitFlash = 0; e.fuse = -1;
        const s = Math.min(1, (size * 0.4) / (e.r + 8)); ctx.scale(s, s);
        this.drawEnemy(e, stubG);
      } else if (kind === 'bosses') {
        const b = new Boss(id, 1, stubG); b.x = 0; b.y = 0; b.introT = 0; b.hitFlash = 0; b.t = 0.6; b.page = 0; b.dead = false;
        ctx.scale(size / 150, size / 150);
        this.drawBoss(b, stubG);
      } else if (kind === 'items') {
        this.drawItemIcon(id, 0, 2);
      } else if (kind === 'pills') {
        this.drawPillIcon(0, 0, DATA.PILL_COLORS[id % DATA.PILL_COLORS.length]);
      }
    } catch (e) { }
    ctx.restore();
    this.ctx = prev;
  },

  /* live-animated boss portrait for the Bestiary. The boss is constructed once
     (by the caller) and re-drawn each frame with an advancing clock. */
  drawBossCard(ctx, boss, w, h, t) {
    const prev = this.ctx; this.ctx = ctx;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2 + 10);
    const s = Math.min(w, h) / 150;
    ctx.scale(s, s);
    boss.t = t; boss.hitFlash = 0; boss.introT = 0; boss.dead = false; boss.deathT = 0;
    boss.spiralA = t * 2.2;
    const stubG = { t: t, player: { x: 0, y: -140, flags: {}, diag: 'adhd' }, enemies: [], boss: null };
    try { this.drawBoss(boss, stubG); } catch (e) { }
    ctx.restore();
    this.ctx = prev;
  },

  drawItemIcon(id, x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    const it = DATA.ITEMS[id];
    // generic: pill bottle with per-item hue
    let hue = 0;
    if (id) for (let i = 0; i < id.length; i++) hue = (hue * 31 + id.charCodeAt(i)) % 360;
    ctx.fillStyle = 'hsl(' + hue + ',45%,60%)';
    this.rr(ctx, -11, -12, 22, 26, 5); ctx.fill();
    ctx.fillStyle = 'hsl(' + hue + ',30%,35%)';
    this.rr(ctx, -8, -18, 16, 8, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.rr(ctx, -8, -6, 16, 12, 2); ctx.fill();
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.5;
    this.rr(ctx, -11, -12, 22, 26, 5); ctx.stroke();
    ctx.restore();
  },
  drawCoin(x, y, nickel) {
    const ctx = this.ctx;
    ctx.fillStyle = nickel ? '#e8e0c8' : '#e8c84c';
    ctx.beginPath(); ctx.arc(x, y, nickel ? 11 : 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a8842a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, nickel ? 11 : 8, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#a8842a';
    ctx.font = this.font(nickel ? 12 : 10, true); ctx.textAlign = 'center';
    ctx.fillText('¢', x, y + (nickel ? 4 : 3.5));
  },
  drawHeart(x, y, s, clr, half) {
    const ctx = this.ctx;
    ctx.fillStyle = clr;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.7, y - s, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
    ctx.fill();
    if (half) {
      ctx.fillStyle = 'rgba(30,20,30,0.45)';
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.9);
      ctx.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,20,30,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.7, y - s, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
    ctx.stroke();
  },
  drawPillIcon(x, y, clr) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#f0f0e8';
    this.rr(ctx, -12, -6, 12, 12, 6); ctx.fill();
    ctx.fillStyle = clr;
    this.rr(ctx, 0, -6, 12, 12, 6); ctx.fill();
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.5;
    this.rr(ctx, -12, -6, 24, 12, 6); ctx.stroke();
    ctx.restore();
  },
  drawKeyIcon(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#e8c84c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -5, 5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 11); ctx.moveTo(0, 7); ctx.lineTo(5, 7); ctx.moveTo(0, 11); ctx.lineTo(4, 11); ctx.stroke();
    ctx.fillStyle = '#8a6a2a';
    ctx.font = this.font(7, true); ctx.textAlign = 'center';
    ctx.fillText('REF', 0, -3.5);
    ctx.restore();
  },
  drawBombIcon(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#f2ead6';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#2c2333';
    ctx.font = this.font(7, true); ctx.textAlign = 'center';
    ctx.fillText('CLAIM', x, y + 2.5);
    ctx.strokeStyle = '#8a6a2a';
    ctx.beginPath(); ctx.moveTo(x + 6, y - 8); ctx.quadraticCurveTo(x + 12, y - 14, x + 9, y - 16); ctx.stroke();
  },

  /* ============ darkness (stigma / mood) ============ */
  drawDarkness(G) {
    const ctx = this.ctx;
    const p = G.player;
    const grd = ctx.createRadialGradient(p.x, p.y, 90, p.x, p.y, 380);
    grd.addColorStop(0, 'rgba(10,6,14,0)');
    grd.addColorStop(1, 'rgba(10,6,14,' + G.dark + ')');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CW, CH);
  },

  /* ============ HUD ============ */
  drawHUD(G) {
    const ctx = this.ctx;
    const p = G.player;

    // hearts
    const hearts = Math.ceil(p.maxhp / 2);
    for (let i = 0; i < hearts; i++) {
      const hx = 30 + (i % 6) * 26, hy = 26 + Math.floor(i / 6) * 24;
      const hpHere = p.hp - i * 2;
      if (hpHere >= 2) this.drawHeart(hx, hy, 10, '#e05a5a', false);
      else if (hpHere === 1) this.drawHeart(hx, hy, 10, '#e05a5a', true);
      else this.drawHeart(hx, hy, 10, '#4a3a44', false);
    }
    // Treatment Intensity badge
    if (G.intensity > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e08a5a'; ctx.font = this.font(11, true);
      ctx.fillText('🔥 ' + G.intensity, CW - 18, Meta.data.speedrun ? 92 : 64);
    }
    // speedrun clock (top-right, under the ward name)
    if (Meta.data.speedrun && G.runTime != null && !G.overtime) {
      const t = G.runTime, fmt = Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2) + '.' + Math.floor((t % 1) * 10);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f0e8d8'; ctx.font = this.font(13, true);
      ctx.fillText('⏱ ' + fmt, CW - 18, 64);
      if (G._lastSplitDelta != null) {
        ctx.fillStyle = G._lastSplitDelta <= 0 ? '#8fd05a' : '#e0a05a'; ctx.font = this.font(10, true);
        ctx.fillText((G._lastSplitDelta <= 0 ? '−' : '+') + Math.abs(G._lastSplitDelta).toFixed(1) + 's', CW - 18, 78);
      }
    }
    // OVERTIME: the wave and the running tab, front and center
    if (G.overtime) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8c84c'; ctx.font = this.font(16, true);
      ctx.fillText('⏰ WAVE ' + G.overtime.wave, CW / 2, 62);
      ctx.fillStyle = 'rgba(224,160,90,0.8)'; ctx.font = this.font(10, true);
      ctx.fillText('running total: $' + G.runBill().total.toLocaleString('en-US'), CW / 2, 78);
    }
    // Patient Two's little row
    if (G.p2) {
      const q = G.p2, rows = Math.ceil(hearts / 6);
      const qy = 26 + rows * 24 + 4;
      ctx.fillStyle = (DATA.DIAG[q.diag] || DATA.DIAG.adhd).color;
      ctx.font = this.font(10, true); ctx.textAlign = 'left';
      ctx.fillText('Ⅱ', 20, qy + 4);
      for (let i = 0; i < Math.ceil(q.maxhp / 2); i++) {
        const hpHere = q.hp - i * 2;
        const col = q._downT > 0 ? '#4a3a44' : '#e08a8a';
        if (hpHere >= 2) this.drawHeart(38 + i * 18, qy, 7, col, false);
        else if (hpHere === 1) this.drawHeart(38 + i * 18, qy, 7, col, true);
        else this.drawHeart(38 + i * 18, qy, 7, '#4a3a44', false);
      }
      if (q._downT > 0) { ctx.fillStyle = '#c8b8c0'; ctx.font = this.font(9, true); ctx.fillText('DOWN', 38 + Math.ceil(q.maxhp / 2) * 18 + 6, qy + 3); }
    }
    // blanket shield
    if (p.diag === 'depression' && p.blanket) {
      ctx.fillStyle = '#5d8aa8';
      ctx.font = this.font(11, true);
      ctx.textAlign = 'left';
      ctx.fillText('🛏 blanket ready', 26, 66);
    }

    // consumables row (icon helpers set textAlign=center; reset before each count)
    ctx.font = this.font(15, true);
    this.drawCoin(196, 24, false);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0e8d8'; ctx.fillText(String(p.coins), 210, 29);
    this.drawKeyIcon(250, 24);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0e8d8'; ctx.fillText(String(p.keys), 262, 29);
    this.drawBombIcon(302, 24);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0e8d8'; ctx.fillText(String(p.bombs), 316, 29);
    if (p.coupons > 0) { ctx.textAlign = 'left'; ctx.fillStyle = '#9db85a'; ctx.font = this.font(12, true); ctx.fillText('🎟' + p.coupons, 300, 48); }
    // Support Group roster (top-left, under the hearts)
    if (p.allies && p.allies.length) {
      ctx.textAlign = 'left'; ctx.font = this.font(11, true); ctx.fillStyle = 'rgba(240,232,216,0.65)'; ctx.fillText('🤝', 20, 66);
      for (let i = 0; i < p.allies.length; i++) {
        const a = p.allies[i], gx = 42 + i * 26, gy = 62;
        ctx.fillStyle = a.downT > 0 ? 'rgba(120,110,120,0.5)' : a.tint;
        ctx.beginPath(); ctx.arc(gx, gy, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8c9a6'; ctx.beginPath(); ctx.arc(gx, gy - 1, 4, 0, TAU); ctx.fill();
        if (a.downT > 0) { ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx - 2, gy - 3); ctx.lineTo(gx + 2, gy + 1); ctx.moveTo(gx + 2, gy - 3); ctx.lineTo(gx - 2, gy + 1); ctx.stroke(); }
        else { for (let h = 0; h < a.maxhp; h++) { ctx.fillStyle = h < a.hp ? '#e05a6a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(gx - 6 + h * 5, gy + 8, 3, 2.5); } }
      }
    }

    // signature ability pip (bottom-left)
    if (p.abil) {
      const ax = 42, ay = CH - 44, ar = 22, ready = p.abilCd <= 0;
      ctx.fillStyle = 'rgba(20,14,22,0.7)'; ctx.beginPath(); ctx.arc(ax, ay, ar, 0, TAU); ctx.fill();
      if (!ready && p.abilMax > 0) {
        ctx.fillStyle = 'rgba(232,200,76,0.18)';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.arc(ax, ay, ar, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.abilCd / p.abilMax)); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = ready ? '#e8c84c' : 'rgba(240,232,216,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ax, ay, ar, 0, TAU); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = ready ? '#e8c84c' : 'rgba(240,232,216,0.5)'; ctx.font = this.font(17, true); ctx.fillText('⚡', ax, ay + 6);
      ctx.fillStyle = ready ? 'rgba(240,232,216,0.85)' : 'rgba(240,232,216,0.5)'; ctx.font = this.font(10, true);
      ctx.fillText(p.abil.name, ax, ay + ar + 12);
      if (!Input.usingTouch) { ctx.fillStyle = 'rgba(240,232,216,0.45)'; ctx.font = this.font(9); ctx.fillText('SPACE', ax, ay - ar - 6); }
    }

    // OCD compulsion gauge (bottom-left, beside the ability pip)
    if (p.diag === 'ocd') {
      const gx = 74, gy = CH - 52, gw = 96, gh = 12;
      const frac = Math.max(0, Math.min(1, p.compulsion / 100));
      ctx.fillStyle = 'rgba(20,14,22,0.7)'; this.rr(ctx, gx, gy, gw, gh, 4); ctx.fill();
      const r = Math.round(90 + frac * 150), g = Math.round(185 - frac * 130), b = Math.round(170 - frac * 100);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.rr(ctx, gx + 1.5, gy + 1.5, Math.max(0, (gw - 3) * frac), gh - 3, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(240,232,216,0.35)'; ctx.lineWidth = 1.5; this.rr(ctx, gx, gy, gw, gh, 4); ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = this.font(9, true);
      ctx.fillStyle = p.focused ? '#8fd05a' : 'rgba(240,232,216,0.7)';
      ctx.fillText(p.focused ? '◎ JUST RIGHT' : 'COMPULSION', gx, gy - 4);
    }

    // The 20-Minute Slot: appointment countdown (top-center, under the pill slot)
    if (G.protocol === 'timeslot' && G.protoT != null) {
      const mm = Math.max(0, Math.floor(G.protoT / 60)), ss = Math.max(0, Math.floor(G.protoT % 60));
      ctx.textAlign = 'center'; ctx.font = this.font(15, true);
      ctx.fillStyle = G.protoT < 60 ? (Math.floor(G.protoT * 2) % 2 ? '#f05a5a' : '#a03030') : 'rgba(240,232,216,0.85)';
      ctx.fillText('⏰ ' + mm + ':' + String(ss).padStart(2, '0'), CW / 2, 72);
    }

    // Treatment Goals (bottom-right, quiet checklist)
    if (G.goals && G.goals.length) {
      ctx.textAlign = 'right'; ctx.font = this.font(10.5, true);
      for (let i = 0; i < G.goals.length; i++) {
        const g = G.goals[i], y = CH - 16 - (G.goals.length - 1 - i) * 15;
        ctx.fillStyle = g.done ? 'rgba(143,208,90,0.85)' : 'rgba(240,232,216,0.5)';
        const prog = g.n > 1 && !g.done ? ' ' + Math.min(g.prog, g.n) + '/' + g.n : '';
        ctx.fillText((g.done ? '✓ ' : '🎯 ') + g.name + prog, CW - 16, y);
      }
    }
    // Day Room contracts sit above the goals
    if (G.contracts && G.contracts.length) {
      ctx.textAlign = 'right'; ctx.font = this.font(10.5, true);
      const base = CH - 16 - (G.goals ? G.goals.length : 0) * 15 - 4;
      const act = G.contracts.filter(c => !c.done);
      for (let i = 0; i < act.length; i++) {
        const c = act[i], y = base - (act.length - 1 - i) * 15;
        ctx.fillStyle = 'rgba(143,208,138,0.8)';
        const prog = c.def.n > 1 ? ' ' + Math.min(c.prog, c.def.n) + '/' + c.def.n : '';
        ctx.fillText('📝 ' + c.def.name + prog, CW - 16, y);
      }
    }

    // Burnout battery (bottom-left, beside the ability pip)
    if (p.diag === 'burnout') {
      const gx = 74, gy = CH - 52, gw = 96, gh = 12;
      const frac = U.clamp(p.battery / 100, 0, 1);
      ctx.fillStyle = 'rgba(20,14,22,0.7)'; this.rr(ctx, gx, gy, gw, gh, 4); ctx.fill();
      ctx.fillStyle = p.battery > 75 ? '#e8c05a' : p.battery < 25 ? '#c05840' : '#d09a3a';
      this.rr(ctx, gx + 1.5, gy + 1.5, Math.max(0, (gw - 3) * frac), gh - 3, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(232,192,90,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gx + gw * 0.75, gy); ctx.lineTo(gx + gw * 0.75, gy + gh); ctx.stroke();   // overdrive line
      ctx.fillStyle = 'rgba(240,232,216,0.8)'; ctx.fillRect(gx + gw, gy + 3, 3, gh - 6);   // the battery nub
      ctx.fillStyle = '#d09a3a'; ctx.font = this.font(9, true); ctx.textAlign = 'left';
      ctx.fillText('BATTERY' + (p.battery > 75 ? ' · ⚡ OVERDRIVE' : p.battery < 25 ? ' · fumes' : ''), gx, gy - 4);
    }
    // Insomnia sleep meter (bottom-left, beside the ability pip)
    if (p.diag === 'insomnia') {
      const gx = 74, gy = CH - 52, gw = 96, gh = 12;
      const frac = Math.max(0, Math.min(1, p.sleep / 100));
      ctx.fillStyle = 'rgba(20,14,22,0.7)'; this.rr(ctx, gx, gy, gw, gh, 4); ctx.fill();
      ctx.fillStyle = p.wired ? '#f07070' : '#7fd4c8';
      this.rr(ctx, gx + 1.5, gy + 1.5, Math.max(0, (gw - 3) * frac), gh - 3, 3); ctx.fill();
      // tick at the WIRED threshold (35%)
      ctx.strokeStyle = 'rgba(255,120,120,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gx + gw * 0.35, gy); ctx.lineTo(gx + gw * 0.35, gy + gh); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,232,216,0.35)'; ctx.lineWidth = 1.5; this.rr(ctx, gx, gy, gw, gh, 4); ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = this.font(9, true);
      ctx.fillStyle = p.wired ? '#f07070' : 'rgba(240,232,216,0.7)';
      ctx.fillText(p.napActive > 0 ? '😴 ASLEEP' : p.wired ? '▲ WIRED' : '☾ SLEEP', gx, gy - 4);
    }

    // pill slot
    ctx.strokeStyle = 'rgba(240,232,216,0.5)'; ctx.lineWidth = 2;
    this.rr(ctx, 350, 8, 66, 34, 8); ctx.stroke();
    if (p.pill != null) {
      this.drawPillIcon(371, 25, DATA.PILL_COLORS[p.pill]);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(240,232,216,0.75)';
      ctx.font = this.font(11, true);
      ctx.fillText(Input.usingTouch ? 'PILL' : 'Q', 390, 30);
      if (p.flags.pillsKnown || p.trinket === 'stickynote' || G.pillKnown.has(G.pillAssign[p.pill])) {
        ctx.font = this.font(9);
        ctx.fillStyle = 'rgba(240,232,216,0.6)';
        const nm = DATA.PILLS[G.pillAssign[p.pill]].name;
        ctx.fillText(nm.length > 22 ? nm.slice(0, 21) + '…' : nm, 352, 54);
      }
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(240,232,216,0.25)';
      ctx.font = this.font(11);
      ctx.fillText('no pill', 362, 30);
    }

    // trinket slot (tucked between the pill slot and the diagnosis chip)
    if (p.trinket) {
      const T2 = DATA.TRINKETS.find(t2 => t2.id === p.trinket);
      ctx.strokeStyle = 'rgba(200,176,224,0.6)'; ctx.lineWidth = 1.6;
      this.rr(ctx, 419, 12, 21, 21, 6); ctx.stroke();
      ctx.font = this.font(11); ctx.textAlign = 'center';
      ctx.fillStyle = '#e8e0f0'; ctx.fillText(T2 ? T2.icon : '❔', 429.5, 27);
    }

    // diagnosis chip
    const D = DATA.DIAG[p.diag];
    ctx.fillStyle = D.color;
    this.rr(ctx, 444, 10, 14, 14, 4); ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(240,232,216,0.9)';
    ctx.font = this.font(13, true);
    ctx.fillText(D.name, 464, 22);
    // status line under chip
    ctx.textAlign = 'left';
    ctx.font = this.font(11);
    ctx.fillStyle = 'rgba(240,232,216,0.6)';
    let status = '';
    if (p.diag === 'bipolar' && !p.flags.stable) status = p.mania ? '▲ MANIA' : '▼ the dip';
    if (p.diag === 'bipolar' && p.flags.stable) status = '― stable';
    if (p.focused) status = p.diag === 'ocd' ? '◎ just right' : '◎ hyperfocus';
    if (p.diag === 'ptsd') status = p.lastHitT > 4 ? '◈ on edge' : '· rattled';
    if (p.diag === 'insomnia') status = p.napActive > 0 ? '😴 asleep' : p.wired ? '▲ wired' : '· drowsy';
    if (p.adren) status = '⚡ adrenaline';
    if (G.slowmo > 0) status = '⏱ vigilant';
    if (status) ctx.fillText(status, 464, 38);
    // mood cycle arc
    if (p.diag === 'bipolar' && !p.flags.stable) {
      ctx.strokeStyle = p.mania ? '#e8c84c' : '#7a88b8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(575, 24, 10, -Math.PI / 2, -Math.PI / 2 + TAU * (p.moodT / 10)); ctx.stroke();
    }

    // floor name
    ctx.textAlign = 'right';
    ctx.font = this.font(14, true);
    ctx.fillStyle = 'rgba(240,232,216,0.85)';
    ctx.fillText(G.ascent ? 'Administration' : DATA.floorName(G.depth), CW - 180, 22);
    ctx.font = this.font(11);
    ctx.fillStyle = 'rgba(240,232,216,0.5)';
    ctx.fillText(G.ascent ? 'level A' + (G.depth - G.ascentBase) + ' · executive' : 'ward ' + G.depth + ' · ' + DATA.tierName(G.depth), CW - 180, 38);
    if (G.complications && G.complications.length) {
      ctx.fillStyle = 'rgba(224,149,90,0.85)';
      ctx.fillText('⚠ ' + G.complications.map(c => c.name.replace(' Ward', '')).join(', '), CW - 180, 52);
    }
    if (G.prognosis) {
      const pr = DATA.PROGNOSES.find(x => x.id === G.prognosis);
      if (pr) { ctx.fillStyle = 'rgba(200,120,220,0.9)'; ctx.font = this.font(11, true); ctx.fillText(pr.icon + ' ' + pr.name.toUpperCase(), CW - 180, G.complications && G.complications.length ? 66 : 52); }
    }

    // minimap
    this.drawMinimap(G);

    // boss bar (JOINT COMMISSION rooms split it into two half-width bars)
    if (G.boss && !G.boss.dead) {
      const b = G.boss;
      const joint = G.boss2 && !G.boss2.dead;
      const w = joint ? 184 : 380, x = joint ? CW / 2 - 192 : CW / 2 - w / 2, y = CH - 26;
      ctx.fillStyle = 'rgba(20,14,22,0.75)';
      this.rr(ctx, x - 6, y - 8, w + 12, 22, 8); ctx.fill();
      ctx.fillStyle = '#5a2a34';
      this.rr(ctx, x, y - 3, w, 12, 5); ctx.fill();
      ctx.fillStyle = b.vulnerable ? '#d04a5a' : '#7a7a8a';
      const frac = U.clamp(b.hp / b.maxhp, 0, 1);
      if (frac > 0.01) { this.rr(ctx, x, y - 3, w * frac, 12, 5); ctx.fill(); }
      ctx.fillStyle = '#f0e8d8';
      ctx.font = this.font(joint ? 10 : 12, true);
      ctx.textAlign = 'center';
      ctx.fillText(joint ? String(b.name).slice(0, 24) : b.name, x + w / 2, y - 12);
      if (joint) {
        const b2 = G.boss2;
        const x2 = CW / 2 + 8;
        ctx.fillStyle = 'rgba(20,14,22,0.75)';
        this.rr(ctx, x2 - 6, y - 8, w + 12, 22, 8); ctx.fill();
        ctx.fillStyle = '#5a2a34';
        this.rr(ctx, x2, y - 3, w, 12, 5); ctx.fill();
        ctx.fillStyle = b2._wakeT > 0 ? '#7a7a8a' : (b2.vulnerable ? '#d04a5a' : '#7a7a8a');
        const frac2 = U.clamp(b2.hp / b2.maxhp, 0, 1);
        if (frac2 > 0.01) { this.rr(ctx, x2, y - 3, w * frac2, 12, 5); ctx.fill(); }
        ctx.fillStyle = '#f0e8d8';
        ctx.font = this.font(10, true);
        ctx.fillText((b2._wakeT > 0 ? '📋 ' : '') + String(b2.name).slice(0, 24), x2 + w / 2, y - 12);
      }
    }

    // item pickup announcement
    if (p.itemHold > 0) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = U.clamp(p.itemHold, 0, 1);
      ctx.font = this.font(21, true);
      ctx.fillStyle = '#f0e8d8';
      ctx.fillText(p.itemHoldName, CW / 2, 96);
      ctx.font = this.font(13);
      ctx.fillStyle = 'rgba(240,232,216,0.75)';
      ctx.fillText(p.itemHoldQuote, CW / 2, 118);
      ctx.globalAlpha = 1;
    }

    // touch hint
    if (Input.usingTouch && G.depth === 1 && G.room.type === 'start' && G.t < 12) {
      ctx.textAlign = 'center';
      ctx.font = this.font(13);
      ctx.fillStyle = 'rgba(240,232,216,0.55)';
      ctx.fillText('left thumb: move · right thumb: shoot', CW / 2, CH - 12);
    }
  },

  drawMinimap(G) {
    const ctx = this.ctx;
    // active ward side-effect badge (persistent reminder)
    if (G.sideEffect) {
      const se = DATA.SIDE_EFFECTS.find(s => s.id === G.sideEffect);
      if (se) { ctx.save(); ctx.font = this.font(10, true); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(181,138,208,0.9)'; ctx.fillText(se.icon + ' ' + se.name, CW - 20, 52); ctx.restore(); }
    }
    // CODE GRAY crisis badge (+ lockdown countdown)
    if (G.crisis && !G.crisisFail && !(G.crisis === 'lockdown' && G.crisisDone)) {
      const cr = DATA.CRISES.find(c => c.id === G.crisis);
      if (cr) {
        ctx.save(); ctx.font = this.font(10, true); ctx.textAlign = 'right';
        const flashy = G.crisis === 'lockdown' && G.crisisT < 15 && Math.floor(G.crisisT * 2) % 2 === 0;
        ctx.fillStyle = flashy ? 'rgba(240,90,90,1)' : 'rgba(224,120,96,0.9)';
        let txt = cr.icon + ' ' + cr.name;
        if (G.crisis === 'lockdown') txt += ' ' + Math.max(0, Math.ceil(G.crisisT)) + 's';
        ctx.fillText(txt, CW - 20, G.sideEffect ? 40 : 52);
        ctx.restore();
      }
    }
    // Brain Fog side-effect / Maps Recalled house rule: the minimap is gone
    if (G.sideEffect === 'brainfog' || (G.hasRule && G.hasRule('fogOfWar'))) {
      ctx.save(); ctx.font = this.font(11, true); ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(200,190,210,0.45)'; ctx.fillText(G.sideEffect === 'brainfog' ? '🌫 …where were we?' : '🗺 recalled for maintenance', CW - 20, 74);
      ctx.restore(); return;
    }
    const cell = 17, gap = 2;
    const ax = CW - 105, ay = 64; // anchor for room (0,0)
    ctx.save();
    for (const room of G.floorRooms) {
      if (!room.discovered && !G.player.flags.mapReveal) continue;
      if (room.type === 'secret' && !G.secretFound) continue;
      const x = ax + room.gx * (cell + gap);
      const y = ay + room.gy * (cell + gap);
      const cur = room === G.room;
      ctx.fillStyle = cur ? 'rgba(240,232,216,0.95)' : room.visited ? 'rgba(240,232,216,0.45)' : 'rgba(240,232,216,0.18)';
      this.rr(ctx, x, y, cell, cell, 3); ctx.fill();
      ctx.font = this.font(10, true);
      ctx.textAlign = 'center';
      ctx.fillStyle = cur ? '#2c2333' : '#f0e8d8';
      const cx2 = x + cell / 2, cy2 = y + cell / 2 + 3.5;
      if (room.type === 'boss') ctx.fillText('☠', cx2, cy2);
      else if (room.type === 'item') ctx.fillText('✚', cx2, cy2);
      else if (room.type === 'shop') ctx.fillText('$', cx2, cy2);
      else if (room.type === 'secret') ctx.fillText('?', cx2, cy2);
      else if (room.type === 'event') ctx.fillText('‽', cx2, cy2);
      else if (room.type === 'dayroom') ctx.fillText('☕', cx2, cy2);
      else if (room.type === 'oon') ctx.fillText('♥', cx2, cy2);
      else if (room.type === 'clinic') ctx.fillText('⚕', cx2, cy2);
      else if (room.type === 'seclusion') ctx.fillText('🩸', cx2, cy2);
      else if (room.type === 'ect') ctx.fillText('⚡', cx2, cy2);
      else if (room.type === 'padded') ctx.fillText('▨', cx2, cy2);
      else if (room.type === 'observation') ctx.fillText('👁', cx2, cy2);
    }
    ctx.restore();
  },

  /* ============ banners / toasts / transitions ============ */
  drawBanner(G) {
    const ctx = this.ctx;
    const b = G.banner;
    const a = U.clamp(Math.min(b.t * 2, (b.dur - b.t) * 1.4), 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(12,8,16,0.82)';
    ctx.fillRect(0, CH / 2 - 64, CW, 128);
    ctx.strokeStyle = 'rgba(240,232,216,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CH / 2 - 64); ctx.lineTo(CW, CH / 2 - 64);
    ctx.moveTo(0, CH / 2 + 64); ctx.lineTo(CW, CH / 2 + 64);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = this.font(34, true);
    ctx.fillStyle = '#f0e8d8';
    ctx.fillText(b.text, CW / 2, CH / 2 - 4);
    if (b.sub) {
      ctx.font = this.font(16);
      ctx.fillStyle = 'rgba(240,232,216,0.75)';
      ctx.fillText(b.sub, CW / 2, CH / 2 + 30);
    }
    ctx.restore();
  },
  drawToasts(G) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    let y = 96;
    for (const t of G.toasts) {
      const a = U.clamp(Math.min(t.t * 3, (t.dur - t.t) * 2), 0, 1);
      ctx.globalAlpha = a;
      ctx.font = this.font(15, true);
      const w = ctx.measureText(t.txt).width + 26;
      ctx.fillStyle = 'rgba(16,10,20,0.8)';
      this.rr(ctx, CW / 2 - w / 2, y - 17, w, 26, 9); ctx.fill();
      ctx.fillStyle = t.clr || '#f0e8d8';
      ctx.fillText(t.txt, CW / 2, y + 1);
      y += 32;
    }
    ctx.restore();
  },
  /* big status readout for the portrait Game Boy deck (its own canvas) */
  drawDeckStatus(ctx, W, H, G) {
    const p = G.player; if (!p) return;
    ctx.clearRect(0, 0, W, H);
    const prev = this.ctx; this.ctx = ctx; // so drawHeart/drawCoin/etc. target the deck canvas
    try { this._deckStatusBody(ctx, W, H, G, p); } finally { this.ctx = prev; }
  },
  drawDeckHub(ctx, W, H, G) {   // portrait deck readout while wandering the Waiting Room
    ctx.clearRect(0, 0, W, H);
    const Hb = G.hub;
    ctx.textAlign = 'center';
    let y = Math.max(20, Math.min(28, H * 0.2));
    ctx.font = this.font(Math.min(17, W * 0.05), true);
    ctx.fillStyle = '#e8ddc8';
    ctx.fillText('🚪 THE WAITING ROOM', W / 2, y);
    const pr = Hb && Hb.prompt;
    if (pr) {
      y += Math.min(30, H * 0.22);
      ctx.font = this.font(Math.min(16, W * 0.047), true);
      ctx.fillStyle = '#e8c84c';
      ctx.fillText(pr.label, W / 2, y);
      if (pr.hint) {
        y += Math.min(20, H * 0.15);
        ctx.font = this.font(Math.min(12, W * 0.036));
        ctx.fillStyle = '#b3a7b8';
        ctx.fillText(pr.hint, W / 2, y);
      }
      // dwell progress: hold still and it fills
      if (Input.usingTouch && !pr.door) {
        const frac = U.clamp((Hb.dwell || 0) / 0.55, 0, 1);
        const bw = Math.min(W * 0.5, 220);
        y += Math.min(18, H * 0.12);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(W / 2 - bw / 2, y, bw, 7);
        ctx.fillStyle = '#e8c84c';
        ctx.fillRect(W / 2 - bw / 2, y, bw * frac, 7);
      }
    } else {
      y += Math.min(26, H * 0.2);
      ctx.font = this.font(Math.min(12, W * 0.036));
      ctx.fillStyle = '#b3a7b8';
      ctx.fillText('walk with the pad', W / 2, y);
      y += Math.min(18, H * 0.13);
      ctx.fillText('doors open as you walk in — hold still at anything else', W / 2, y);
    }
  },
  _deckStatusBody(ctx, W, H, G, p) {
    const D = DATA.DIAG[p.diag];
    ctx.textAlign = 'center';

    // diagnosis + ward/tier
    let y = Math.max(18, Math.min(24, H * 0.13));
    ctx.font = this.font(Math.min(18, W * 0.05), true);
    ctx.fillStyle = D.color;
    ctx.fillText(D.name, W / 2, y);
    ctx.font = this.font(11.5);
    ctx.fillStyle = 'rgba(230,222,210,0.55)';
    ctx.fillText((G.nightShift ? '🌙 ' : '') + (G.ascent ? 'ADMIN A' + (G.depth - G.ascentBase) + ' · EXECUTIVE' : 'WARD ' + G.depth + ' · ' + DATA.tierName(G.depth).toUpperCase()), W / 2, y + 17);

    // status mood line (mania/dip/hyperfocus/adrenaline) when relevant
    let statusTxt = '';
    if (p.diag === 'bipolar' && !p.flags.stable) statusTxt = p.mania ? '▲ MANIA' : '▼ THE DIP';
    if (p.focused) statusTxt = p.diag === 'ocd' ? '◎ JUST RIGHT' : '◎ HYPERFOCUS';
    if (p.diag === 'ptsd' && p.lastHitT > 4) statusTxt = '◈ ON EDGE';
    if (p.diag === 'ocd' && !p.focused && p.compulsion >= 70) statusTxt = '△ COMPULSION';
    if (p.diag === 'insomnia' && p.wired) statusTxt = p.napActive > 0 ? '😴 ASLEEP' : '▲ WIRED';
    if (p.adren) statusTxt = '⚡ ADRENALINE';
    if (statusTxt) { ctx.font = this.font(11, true); ctx.fillStyle = D.color; ctx.fillText(statusTxt, W / 2, y + 33); }

    // hearts (wrap to rows of up to 8)
    const hearts = Math.ceil(p.maxhp / 2);
    const perRow = Math.min(8, hearts);
    const hs = Math.min(13, (W * 0.86) / perRow / 2.4);
    const gap = hs * 2.5;
    const rows = Math.ceil(hearts / perRow);
    let hy = y + (statusTxt ? 54 : 42) + hs;
    for (let r = 0; r < rows; r++) {
      const inRow = Math.min(perRow, hearts - r * perRow);
      let hx = W / 2 - (inRow * gap) / 2 + gap / 2;
      for (let c = 0; c < inRow; c++) {
        const i = r * perRow + c, hpHere = p.hp - i * 2;
        if (hpHere >= 2) this.drawHeart(hx, hy, hs, '#e05a5a', false);
        else if (hpHere === 1) this.drawHeart(hx, hy, hs, '#e05a5a', true);
        else this.drawHeart(hx, hy, hs, '#4a3a44', false);
        hx += gap;
      }
      hy += gap;
    }

    // resource row: copays / referrals / claims / pill
    const ry = Math.min(H - 16, hy + 6);
    const slots = [
      { icon: (x) => this.drawCoin(x, ry, false), val: String(p.coins) },
      { icon: (x) => this.drawKeyIcon(x, ry), val: String(p.keys) },
      { icon: (x) => this.drawBombIcon(x, ry), val: String(p.bombs) },
      {
        icon: (x) => {
          if (p.pill != null) this.drawPillIcon(x, ry, DATA.PILL_COLORS[p.pill]);
          else { ctx.fillStyle = 'rgba(210,200,210,0.35)'; ctx.font = this.font(16, true); ctx.textAlign = 'center'; ctx.fillText('—', x, ry + 5); }
        }, val: ''
      }
    ];
    for (let i = 0; i < slots.length; i++) {
      const cx = W * (i + 0.5) / slots.length;
      slots[i].icon(cx - (slots[i].val ? 9 : 0));
      if (slots[i].val) {
        ctx.textAlign = 'left'; ctx.font = this.font(16, true); ctx.fillStyle = '#f0e8d8';
        ctx.fillText(slots[i].val, cx + 4, ry + 5);
        ctx.textAlign = 'center';
      }
    }
  },

  drawDescend(G) {
    const ctx = this.ctx;
    const t = G.descendT;
    const a = t < 0.4 ? t / 0.4 : t > 0.8 ? U.clamp((1.2 - t) / 0.4, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = U.clamp(a, 0, 1);
    ctx.fillStyle = '#0e0a12';
    ctx.fillRect(0, 0, CW, CH);
    ctx.globalAlpha = U.clamp(a, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = this.font(30, true);
    ctx.fillStyle = '#f0e8d8';
    ctx.fillText(G.ascent ? 'Administration' : DATA.floorName(G.depth), CW / 2, CH / 2 - 20);
    ctx.font = this.font(15);
    ctx.fillStyle = 'rgba(240,232,216,0.6)';
    ctx.fillText(G.ascent ? 'level A' + (G.depth - G.ascentBase) + ' · going up' : 'ward ' + G.depth + ' · ' + DATA.tierName(G.depth), CW / 2, CH / 2 + 8);
    // ward complications
    if (G.complications && G.complications.length) {
      ctx.font = this.font(14, true);
      ctx.fillStyle = '#e0955a';
      let y = CH / 2 + 40;
      for (const c of G.complications) { ctx.fillText('⚠ ' + c.name, CW / 2, y); y += 22; }
    }
    ctx.restore();
  },

  rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
};
