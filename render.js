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
      this.drawHUD(G);
    } else if (G.state === 'hub') {
      this.drawHub(G);
    } else {
      this.drawMenuAmbient(G);   // atmospheric backdrop behind the menus (esp. the title)
    }
    ctx.restore();
    if (G.banner) this.drawBanner(G);
    if (G.toasts.length) this.drawToasts(G);
    if (G.state === 'descend') this.drawDescend(G);
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
      const bob = Math.sin(G.t * 2.4 + ped.x) * 3;
      // spotlight glow from above
      const gg = ctx.createRadialGradient(ped.x, ped.y - 26, 4, ped.x, ped.y - 26, 46);
      const gc = ped.kind === 'oon' ? '230,80,80' : ped.kind === 'boss' ? '230,200,110' : '250,240,200';
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
      this.drawItemIcon(ped.itemId, ped.x, ped.y - 26 + bob);
      if (ped.price) {
        const coup = (G.player.coupons || 0) > 0 && ped.variant;
        const shown = coup ? Math.max(1, Math.ceil(ped.price * 0.5)) : ped.price;
        ctx.fillStyle = ped.kind === 'oon' ? '#e05a5a' : coup ? '#9db85a' : '#e8c84c';
        ctx.font = this.font(14, true); ctx.textAlign = 'center';
        ctx.fillText(ped.kind === 'oon' ? '♥ container' : (shown + '¢' + (coup ? ' 🎟' : '')), ped.x, ped.y + 30);
        if (ped.variant) { ctx.fillStyle = ped.variant === 'generic' ? '#9db85a' : '#e0c040'; ctx.font = this.font(9, true); ctx.fillText(ped.variant === 'generic' ? 'GENERIC' : 'BRAND®', ped.x, ped.y + 42); }
      }
      const it = DATA.ITEMS[ped.itemId];
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
      if (pk.type === 'coin' || pk.type === 'nickel') this.drawCoin(pk.x, pk.y + bob, pk.type === 'nickel');
      else if (pk.type === 'half') this.drawHeart(pk.x, pk.y + bob, 8, '#e05a5a', true);
      else if (pk.type === 'full') this.drawHeart(pk.x, pk.y + bob, 10, '#e05a5a', false);
      else if (pk.type === 'pill') this.drawPillIcon(pk.x, pk.y + bob, DATA.PILL_COLORS[pk.colorIdx]);
      else if (pk.type === 'key') this.drawKeyIcon(pk.x, pk.y + bob);
      else if (pk.type === 'bomb') this.drawBombIcon(pk.x, pk.y + bob);
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
    if (G.boss) this.drawBoss(G.boss, G);

    // player + familiars + support group
    for (const f of G.player.familiars) this.drawFamiliar(f, G);
    for (const a of G.player.allies) this.drawAlly(a, G);
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
      ctx.font = this.font(14, true);
      ctx.textAlign = 'center';
      ctx.fillText(t.txt, t.x, t.y);
      ctx.globalAlpha = 1;
    }
  },

  /* ============ the player doodle ============ */
  drawPlayer(p, G) {
    const ctx = this.ctx;
    if (p.dead) return;
    this.shadow(p.x, p.y + 15, 15, 6, 0.26);
    const blink = p.iframes > 0 && Math.sin(G.t * 24) > 0.2;
    ctx.save();
    ctx.translate(p.x, p.y);
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

    // little shuffling feet
    const step = p.moving ? Math.sin(G.t * 15) * 3.2 : 0;
    ctx.fillStyle = '#b99a76';
    ctx.beginPath(); ctx.ellipse(-5.5, 17 - Math.max(0, step), 4.2, 3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5.5, 17 + Math.min(0, step), 4.2, 3, 0, 0, TAU); ctx.fill();
    // stubby body
    const bg = ctx.createLinearGradient(0, 3, 0, 17);
    bg.addColorStop(0, '#edd3b3'); bg.addColorStop(1, '#c6a684');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 10, 8.5, 7, 0, 0, TAU); ctx.fill();
    // tiny arms
    ctx.strokeStyle = '#d8bb96'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(-11, 11 + step * 0.3); ctx.moveTo(7, 7); ctx.lineTo(11, 11 - step * 0.3); ctx.stroke();
    ctx.lineCap = 'butt';

    // big round head with cool rim-light so it pops off the dark floor
    const HR = 16;
    const hg = ctx.createRadialGradient(-5, -12, 3, 0, -6, HR + 4);
    hg.addColorStop(0, '#fdf1de'); hg.addColorStop(0.62, '#f2dcc0'); hg.addColorStop(1, '#cdb08b');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, -6, HR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,238,0.45)'; ctx.lineWidth = 2;
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
    }

    // the Undiagnosed (portrait state, before the first floor's opinion lands)
    if (p.diag === 'undiag') {
      ctx.fillStyle = 'rgba(200,200,200,0.9)';
      ctx.font = this.font(15, true); ctx.textAlign = 'center';
      ctx.fillText('?', 0, -22 + Math.sin((G && G.t || 0) * 2.4) * 2);
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

    // boss bar
    if (G.boss && !G.boss.dead) {
      const b = G.boss;
      const w = 380, x = CW / 2 - w / 2, y = CH - 26;
      ctx.fillStyle = 'rgba(20,14,22,0.75)';
      this.rr(ctx, x - 6, y - 8, w + 12, 22, 8); ctx.fill();
      ctx.fillStyle = '#5a2a34';
      this.rr(ctx, x, y - 3, w, 12, 5); ctx.fill();
      ctx.fillStyle = b.vulnerable ? '#d04a5a' : '#7a7a8a';
      const frac = U.clamp(b.hp / b.maxhp, 0, 1);
      if (frac > 0.01) { this.rr(ctx, x, y - 3, w * frac, 12, 5); ctx.fill(); }
      ctx.fillStyle = '#f0e8d8';
      ctx.font = this.font(12, true);
      ctx.textAlign = 'center';
      ctx.fillText(b.name, CW / 2, y - 12);
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
    // Brain Fog side-effect: the minimap is gone
    if (G.sideEffect === 'brainfog') {
      ctx.save(); ctx.font = this.font(11, true); ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(200,190,210,0.45)'; ctx.fillText('🌫 …where were we?', CW - 20, 74);
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
    ctx.fillText(G.ascent ? 'ADMIN A' + (G.depth - G.ascentBase) + ' · EXECUTIVE' : 'WARD ' + G.depth + ' · ' + DATA.tierName(G.depth).toUpperCase(), W / 2, y + 17);

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
