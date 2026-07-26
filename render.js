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
      if (G.shake > 0.3) ctx.translate(U.rand(-G.shake, G.shake) * 0.5, U.rand(-G.shake, G.shake) * 0.5);
      this.drawRoom(G);
      this.drawEntities(G);
      if (G.dark > 0.02) this.drawDarkness(G);
      this.drawHUD(G);
    }
    ctx.restore();
    if (G.banner) this.drawBanner(G);
    if (G.toasts.length) this.drawToasts(G);
    if (G.state === 'descend') this.drawDescend(G);
  },

  /* ============ seeded rng for stable textures ============ */
  srand(seed) {
    let s = (seed * 2654435761) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  },

  /* ============ baked room background (floor + walls + grime + vignette) ============ */
  getBG(room, depth) {
    if (room._bg) return room._bg;
    const pal = DATA.FLOOR_PALETTES[(depth - 1) % 5];
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
    const pal = DATA.FLOOR_PALETTES[(G.depth - 1) % 5];
    const room = G.room;

    // baked background (floor, walls, grime, vignette)
    ctx.drawImage(this.getBG(room, G.depth), 0, 0);

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
    ctx.restore();

    // zones under everything
    for (const z of G.zones) {
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
        ctx.fillStyle = ped.kind === 'oon' ? '#e05a5a' : '#e8c84c';
        ctx.font = this.font(14, true); ctx.textAlign = 'center';
        ctx.fillText(ped.kind === 'oon' ? '♥ container' : ped.price + '¢', ped.x, ped.y + 30);
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
      const icons = { half: () => this.drawHeart(s.x, s.y - 8, 9, '#e05a5a', true), pill: () => this.drawPillIcon(s.x, s.y - 8, DATA.PILL_COLORS[s.colorIdx || 0]), key: () => this.drawKeyIcon(s.x, s.y - 8), bomb: () => this.drawBombIcon(s.x, s.y - 8) };
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

    // player + familiars
    for (const f of G.player.familiars) this.drawFamiliar(f, G);
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
      }
      this.shadow(b.x, b.y + b.r * 0.7, b.r * 0.8, b.r * 0.3, 0.14);
      const bgd = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.2, b.x, b.y, b.r);
      bgd.addColorStop(0, this.shade(b.clr, 0.4)); bgd.addColorStop(1, this.shade(b.clr, -0.15));
      ctx.fillStyle = bgd;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(30,20,30,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
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

    // hyperfocus ring
    if (p.focused) {
      ctx.strokeStyle = 'rgba(247,179,43,0.7)';
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

    // body
    const bg = ctx.createLinearGradient(0, 1, 0, 17);
    bg.addColorStop(0, '#eed4b4'); bg.addColorStop(1, '#cdae8c');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 9, 10, 8, 0, 0, TAU); ctx.fill();
    // head with soft top-light
    const hg = ctx.createRadialGradient(-4, -10, 3, 0, -4, 17);
    hg.addColorStop(0, '#fbecd6'); hg.addColorStop(0.7, '#f2dcc0'); hg.addColorStop(1, '#dcc09e');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, -4, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,50,0.28)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -4, 14, 0, TAU); ctx.stroke();

    // face — eyes look toward aim
    const ex = Math.cos(p.aimAng) * 2.5, ey = Math.sin(p.aimAng) * 2 - 5;
    const sad = p.diag === 'depression';
    ctx.fillStyle = '#2c2333';
    ctx.beginPath(); ctx.ellipse(-5 + ex, ey, 2.6, sad ? 2 : 3.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 + ex, ey, 2.6, sad ? 2 : 3.2, 0, 0, TAU); ctx.fill();
    // eye gloss
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-5.8 + ex, ey - 1, 1, 0, TAU); ctx.arc(4.2 + ex, ey - 1, 1, 0, TAU); ctx.fill();
    // tear streaks
    ctx.strokeStyle = 'rgba(122,184,232,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5 + ex, ey + 3); ctx.lineTo(-5 + ex, ey + 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5 + ex, ey + 3); ctx.lineTo(5 + ex, ey + 7); ctx.stroke();
    // mouth
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (p.diag === 'fine') { ctx.moveTo(-4, 3); ctx.lineTo(4, 3); }
    else if (p.mania && p.diag === 'bipolar' && !p.flags.stable) { ctx.arc(0, 2, 4, 0.15, Math.PI - 0.15); }
    else { ctx.arc(0, 6, 4, Math.PI + 0.3, TAU - 0.3); }
    ctx.stroke();

    // diagnosis accessory
    if (p.diag === 'adhd') {
      ctx.fillStyle = '#f7b32b';
      ctx.fillRect(-14, -14, 28, 5);
      if (p.moving) {
        ctx.strokeStyle = 'rgba(247,179,43,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-20, 2); ctx.lineTo(-26, 2); ctx.moveTo(-19, -6); ctx.lineTo(-25, -8); ctx.stroke();
      }
    } else if (p.diag === 'schizo') {
      ctx.fillStyle = '#c8c8d2';
      ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(0, -26); ctx.lineTo(11, -12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#9a9aa8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(-2, -20); ctx.moveTo(2, -21); ctx.lineTo(6, -15); ctx.stroke();
    } else if (p.diag === 'depression') {
      ctx.fillStyle = '#5d8aa8';
      ctx.beginPath(); ctx.arc(0, -6, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(15, -2); ctx.lineTo(-15, -2); ctx.closePath(); ctx.fill();
    } else if (p.diag === 'anxiety') {
      ctx.fillStyle = 'rgba(122,184,232,0.9)';
      const sw = Math.sin(G.t * 3) * 2;
      ctx.beginPath(); ctx.arc(12, -14 + sw, 2.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(15, -9 + sw * 0.6, 1.8, 0, TAU); ctx.fill();
    } else if (p.diag === 'bipolar') {
      ctx.fillStyle = p.mania || p.flags.stable ? '#e8c84c' : '#7a88b8';
      ctx.beginPath(); ctx.arc(11, -13, 4, 0, TAU); ctx.fill();
    } else if (p.diag === 'fine') {
      ctx.fillStyle = '#8a4a4a';
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(3, 8); ctx.lineTo(0, 15); ctx.lineTo(-3, 8); ctx.closePath(); ctx.fill();
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

  /* ============ enemies ============ */
  drawEnemy(e, G) {
    const ctx = this.ctx;
    if (e.dying) return;
    if (e.spawnT <= 0) this.shadow(e.x, e.y + e.r * 0.72, e.r * 0.95, e.r * 0.42, 0.24);
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.spawnT > 0) {
      ctx.globalAlpha = 1 - e.spawnT / 0.55;
      ctx.scale(ctx.globalAlpha, ctx.globalAlpha);
      // spawn telegraph ring
      ctx.strokeStyle = 'rgba(200,60,60,' + (0.5 * (1 - ctx.globalAlpha)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 6 + e.spawnT * 20, 0, TAU); ctx.stroke();
    }
    // fakes shimmer if you can see them
    if (e.fake && (G.player.flags.seeFakes)) {
      ctx.globalAlpha *= 0.55 + Math.sin(G.t * 6) * 0.25;
    }
    const flash = e.hitFlash > 0;
    const body = flash ? '#ffffff' : e.clr;

    switch (e.id) {
      case 'scroller': {
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 2, e.r, e.r * 0.85, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a3148';
        this.rr(ctx, -7, -12, 14, 20, 4); ctx.fill();
        ctx.fillStyle = '#8fb8e8';
        this.rr(ctx, -5, -10, 10, 12, 2); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-9, -4, 2, 0, TAU); ctx.arc(9, -4, 2, 0, TAU); ctx.fill();
        break;
      }
      case 'notif': {
        ctx.fillStyle = flash ? '#fff' : '#e05a5a';
        ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = this.font(13, true); ctx.textAlign = 'center';
        ctx.fillText('!', 0, 5);
        break;
      }
      case 'larper': {
        // knockoff player
        ctx.fillStyle = flash ? '#fff' : '#cabfb2';
        ctx.beginPath(); ctx.ellipse(0, 8, 8, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#d8cec2';
        ctx.beginPath(); ctx.arc(0, -3, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-4, -4, 2, 0, TAU); ctx.arc(4, -4, 2, 0, TAU); ctx.fill();
        // drawn-on tears (marker)
        ctx.strokeStyle = '#4a6ae0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(-4, 4); ctx.moveTo(4, -1); ctx.lineTo(4, 4); ctx.stroke();
        ctx.font = this.font(8); ctx.fillStyle = '#8a8078'; ctx.textAlign = 'center';
        ctx.fillText('me too', 0, 20);
        break;
      }
      case 'ad': {
        ctx.fillStyle = flash ? '#fff' : '#f0e8d0';
        this.rr(ctx, -15, -13, 30, 26, 4); ctx.fill();
        ctx.strokeStyle = '#c8a03a'; ctx.lineWidth = 2.5;
        this.rr(ctx, -15, -13, 30, 26, 4); ctx.stroke();
        ctx.fillStyle = '#c8503a';
        ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText('ASK', 0, -2);
        ctx.fillText('YOUR DR', 0, 8);
        break;
      }
      case 'doubt': {
        ctx.globalAlpha *= 0.85;
        ctx.fillStyle = flash ? '#fff' : body;
        ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f0f0f8';
        ctx.font = this.font(16, true); ctx.textAlign = 'center';
        ctx.fillText('?', 0, 6);
        break;
      }
      case 'deadline': {
        const shakeA = e.state === 1 ? U.rand(-2, 2) : 0;
        ctx.translate(shakeA, shakeA);
        ctx.fillStyle = flash ? '#fff' : body;
        this.rr(ctx, -e.r, -e.r, e.r * 2, e.r * 2, 5); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU);
        ctx.moveTo(0, 0); ctx.lineTo(0, -7);
        ctx.moveTo(0, 0); ctx.lineTo(5 * Math.cos(e.t * 6), 5 * Math.sin(e.t * 6));
        ctx.stroke();
        break;
      }
      case 'intrusive': {
        ctx.globalAlpha *= (e.state === 0 ? 0.5 : 0.95);
        ctx.fillStyle = flash ? '#fff' : body;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#17323a';
        ctx.beginPath(); ctx.ellipse(-4, -2, 2, 4, -0.4, 0, TAU); ctx.ellipse(4, -2, 2, 4, 0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(90,208,184,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-e.r, 4); ctx.quadraticCurveTo(0, 10 + Math.sin(e.t * 8) * 3, e.r, 4); ctx.stroke();
        break;
      }
      case 'redflag': {
        const fl = e.fuse >= 0 && Math.sin(G.t * 25) > 0;
        ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(-2, -16); ctx.stroke();
        ctx.fillStyle = fl ? '#fff' : (flash ? '#fff' : '#d04040');
        ctx.beginPath();
        ctx.moveTo(-2, -16);
        ctx.lineTo(16, -10 + Math.sin(e.t * 7) * 2);
        ctx.lineTo(-2, -4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-6, 6, 1.8, 0, TAU); ctx.arc(2, 6, 1.8, 0, TAU); ctx.fill();
        break;
      }
      case 'fog': {
        ctx.globalAlpha *= 0.85;
        ctx.fillStyle = flash ? '#fff' : body;
        ctx.beginPath();
        ctx.arc(-12, 2, 14, 0, TAU); ctx.arc(0, -8, 17, 0, TAU); ctx.arc(13, 3, 14, 0, TAU); ctx.arc(0, 6, 15, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#5a6862';
        ctx.beginPath(); ctx.arc(-7, -3, 2.5, 0, TAU); ctx.arc(7, -3, 2.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5a6862'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 6, 5, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
        break;
      }
      case 'enabler': {
        ctx.fillStyle = flash ? '#fff' : body;
        ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-5, -3, 2.2, 0, TAU); ctx.arc(5, -3, 2.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 3, 6, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = this.font(9, true); ctx.textAlign = 'center';
        ctx.fillText("you're", 0, -20);
        ctx.fillText('valid!!', 0, -11);
        break;
      }
    }
    ctx.restore();

    // hp bar (webmd item)
    if (G.player.flags.hpBars && !e.fake && !e.dying && e.hp < e.maxhp) {
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
    const flash = b.hitFlash > 0;

    switch (b.id) {
      case 'gatekeeper': {
        ctx.fillStyle = flash ? '#fff' : '#7a7090';
        this.rr(ctx, -42, -50, 84, 100, 14); ctx.fill();
        ctx.fillStyle = flash ? '#eee' : '#5c5474';
        this.rr(ctx, -34, -42, 68, 84, 10); ctx.fill();
        // door face
        const open = b.vulnerable;
        ctx.fillStyle = open ? '#f0e8d8' : '#3a3450';
        ctx.beginPath(); ctx.ellipse(-14, -12, 8, open ? 10 : 2, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(14, -12, 8, open ? 10 : 2, 0, 0, TAU); ctx.fill();
        if (open) {
          ctx.fillStyle = '#2c2333';
          ctx.beginPath(); ctx.arc(-14, -12, 4, 0, TAU); ctx.arc(14, -12, 4, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 22, 12, Math.PI + 0.4, TAU - 0.4); ctx.stroke();
        // crossed arms when denying
        if (!open) {
          ctx.strokeStyle = '#8a8098'; ctx.lineWidth = 10; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(30, 4); ctx.moveTo(30, 30); ctx.lineTo(-30, 4); ctx.stroke();
          ctx.lineCap = 'butt';
        }
        // clipboard
        ctx.fillStyle = '#e8dcc0';
        ctx.save(); ctx.rotate(0.15);
        ctx.fillRect(28, -20, 22, 30);
        ctx.restore();
        break;
      }
      case 'adjuster': {
        ctx.fillStyle = flash ? '#fff' : '#5a6a8a';
        this.rr(ctx, -34, -40, 68, 74, 10); ctx.fill();
        ctx.fillStyle = '#f0ead8';
        this.rr(ctx, -24, -30, 48, 30, 4); ctx.fill();
        ctx.fillStyle = '#c84040';
        ctx.font = this.font(12, true); ctx.textAlign = 'center';
        ctx.save(); ctx.rotate(-0.08);
        ctx.fillText('CLAIM', 0, -16);
        ctx.fillText('DENIED', 0, -4);
        ctx.restore();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-12, 16, 3, 0, TAU); ctx.arc(12, 16, 3, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, 26); ctx.lineTo(8, 26); ctx.stroke();
        // tie
        ctx.fillStyle = '#8a2a2a';
        ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(4, 32); ctx.lineTo(0, 40); ctx.lineTo(-4, 32); ctx.closePath(); ctx.fill();
        break;
      }
      case 'larperking': {
        // giant knockoff of YOU
        ctx.fillStyle = flash ? '#fff' : '#cabfb2';
        ctx.beginPath(); ctx.ellipse(0, 24, 26, 20, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#d8cec2';
        ctx.beginPath(); ctx.arc(0, -8, 34, 0, TAU); ctx.fill();
        // party-store crown
        ctx.fillStyle = '#e8c84c';
        ctx.beginPath();
        ctx.moveTo(-24, -34); ctx.lineTo(-24, -52); ctx.lineTo(-12, -40) ; ctx.lineTo(0, -54); ctx.lineTo(12, -40); ctx.lineTo(24, -52); ctx.lineTo(24, -34);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-12, -10, 5, 0, TAU); ctx.arc(12, -10, 5, 0, TAU); ctx.fill();
        // sharpie tears
        ctx.strokeStyle = '#4a6ae0'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-12, 8); ctx.moveTo(12, -3); ctx.lineTo(12, 8); ctx.stroke();
        // mask label
        ctx.fillStyle = '#f0ead8';
        this.rr(ctx, -30, 40, 60, 16, 4); ctx.fill();
        ctx.fillStyle = '#8a6a4a';
        ctx.font = this.font(10, true); ctx.textAlign = 'center';
        ctx.fillText('HELLO I HAVE: ' + (b.mask === 'mania' ? 'MANIA' : b.mask.toUpperCase()), 0, 52);
        break;
      }
      case 'withdrawal': {
        ctx.fillStyle = flash ? '#fff' : '#e8e0d8';
        this.rr(ctx, -30, -44, 60, 88, 20); ctx.fill();
        ctx.fillStyle = flash ? '#eee' : '#d05a8a';
        this.rr(ctx, -30, -44, 60, 34, 20); ctx.fill();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.ellipse(-12, 4, 4, 6 + Math.sin(b.t * 9) * 2, 0, 0, TAU); ctx.ellipse(12, 4, 4, 6 + Math.sin(b.t * 9 + 1) * 2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 26, 9, Math.PI + 0.3, TAU - 0.3); ctx.stroke();
        // sweat
        ctx.fillStyle = 'rgba(122,184,232,0.8)';
        ctx.beginPath(); ctx.arc(20, -8 + Math.sin(b.t * 4) * 4, 3, 0, TAU); ctx.fill();
        ctx.font = this.font(9, true); ctx.fillStyle = '#8a5a6a'; ctx.textAlign = 'center';
        ctx.fillText('RX EMPTY', 0, -22);
        break;
      }
      case 'stigma': {
        const near = U.dist(b.x, b.y, G.player.x, G.player.y) < 150;
        const vis = flash || near ? 0.85 : 0.12;
        ctx.globalAlpha *= vis;
        ctx.fillStyle = '#241c30';
        ctx.beginPath();
        ctx.arc(0, -6, 34, Math.PI, TAU);
        ctx.quadraticCurveTo(34, 30, 24, 26);
        ctx.quadraticCurveTo(18, 38, 8, 30);
        ctx.quadraticCurveTo(0, 42, -8, 30);
        ctx.quadraticCurveTo(-18, 38, -24, 26);
        ctx.quadraticCurveTo(-34, 30, -34, -6);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = Math.min(1, vis + 0.5);
        ctx.fillStyle = '#e8e0f0';
        ctx.beginPath(); ctx.ellipse(-11, -10, 5, 7, 0, 0, TAU); ctx.ellipse(11, -10, 5, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#241c30';
        ctx.beginPath(); ctx.arc(-11, -9, 2.5, 0, TAU); ctx.arc(11, -9, 2.5, 0, TAU); ctx.fill();
        break;
      }
      case 'burnout': {
        // candle person burning at both ends
        ctx.fillStyle = flash ? '#fff' : '#f0e0c0';
        this.rr(ctx, -22, -38, 44, 80, 12); ctx.fill();
        // drips
        ctx.fillStyle = '#e0d0a8';
        ctx.beginPath(); ctx.ellipse(-18, -30 + Math.sin(b.t) * 2, 5, 10, 0.3, 0, TAU); ctx.ellipse(19, -18, 4, 9, -0.2, 0, TAU); ctx.fill();
        // flame
        const ff = 1 + Math.sin(b.t * 11) * 0.15;
        ctx.fillStyle = b.enrage > 0 ? '#e05a3a' : '#f0a03a';
        ctx.beginPath(); ctx.ellipse(0, -50, 10 * ff, 16 * ff, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f8d05a';
        ctx.beginPath(); ctx.ellipse(0, -48, 5 * ff, 9 * ff, 0, 0, TAU); ctx.fill();
        // exhausted face
        ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-6, -5); ctx.moveTo(14, -8); ctx.lineTo(6, -5); ctx.stroke();
        ctx.fillStyle = '#2c2333';
        ctx.beginPath(); ctx.arc(-9, -2, 2.5, 0, TAU); ctx.arc(9, -2, 2.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 12, 5, 7, 0, 0, TAU); ctx.fill(); // yawn
        break;
      }
      case 'walrus': {
        this.drawWalrusFace(ctx, 0, 0, 0.62, b.t);
        // white coat collar
        ctx.fillStyle = '#f0f0f4';
        ctx.beginPath(); ctx.moveTo(-34, 30); ctx.lineTo(-14, 44); ctx.lineTo(-24, 52); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(34, 30); ctx.lineTo(14, 44); ctx.lineTo(24, 52); ctx.closePath(); ctx.fill();
        if (b.state === 3) { // say ahh
          ctx.fillStyle = '#2c2333';
          ctx.beginPath(); ctx.ellipse(0, 30, 10, 13, 0, 0, TAU); ctx.fill();
        }
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
  drawCharPortrait(ctx, diagId) {
    ctx.clearRect(0, 0, 84, 84);
    ctx.save();
    ctx.translate(42, 46);
    ctx.scale(2.1, 2.1);
    // body + head
    ctx.fillStyle = '#e8ceae';
    ctx.beginPath(); ctx.ellipse(0, 9, 10, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2dcc0';
    ctx.beginPath(); ctx.arc(0, -4, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,50,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -4, 14, 0, TAU); ctx.stroke();
    // eyes + tear streaks
    const sad = diagId === 'depression';
    ctx.fillStyle = '#2c2333';
    ctx.beginPath(); ctx.ellipse(-5, -5, 2.6, sad ? 2 : 3.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -5, 2.6, sad ? 2 : 3.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(122,184,232,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-5, 2); ctx.moveTo(5, -2); ctx.lineTo(5, 2); ctx.stroke();
    // mouth
    ctx.strokeStyle = '#2c2333'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (diagId === 'fine') { ctx.moveTo(-4, 3); ctx.lineTo(4, 3); }
    else { ctx.arc(0, 6, 4, Math.PI + 0.3, TAU - 0.3); }
    ctx.stroke();
    // accessory
    if (diagId === 'adhd') {
      ctx.fillStyle = '#f7b32b'; ctx.fillRect(-14, -14, 28, 5);
    } else if (diagId === 'schizo') {
      ctx.fillStyle = '#c8c8d2';
      ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(0, -26); ctx.lineTo(11, -12); ctx.closePath(); ctx.fill();
    } else if (diagId === 'depression') {
      ctx.fillStyle = '#5d8aa8';
      ctx.beginPath(); ctx.arc(0, -6, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(15, -2); ctx.lineTo(-15, -2); ctx.closePath(); ctx.fill();
    } else if (diagId === 'anxiety') {
      ctx.fillStyle = 'rgba(122,184,232,0.9)';
      ctx.beginPath(); ctx.arc(12, -14, 2.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(15, -9, 1.8, 0, TAU); ctx.fill();
    } else if (diagId === 'bipolar') {
      ctx.fillStyle = '#e8c84c'; ctx.beginPath(); ctx.arc(11, -13, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a88b8'; ctx.beginPath(); ctx.arc(-11, -13, 4, 0, TAU); ctx.fill();
    } else if (diagId === 'fine') {
      ctx.fillStyle = '#8a4a4a';
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(3, 8); ctx.lineTo(0, 15); ctx.lineTo(-3, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
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

    // pill slot
    ctx.strokeStyle = 'rgba(240,232,216,0.5)'; ctx.lineWidth = 2;
    this.rr(ctx, 350, 8, 66, 34, 8); ctx.stroke();
    if (p.pill != null) {
      this.drawPillIcon(371, 25, DATA.PILL_COLORS[p.pill]);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(240,232,216,0.75)';
      ctx.font = this.font(11, true);
      ctx.fillText(Input.usingTouch ? 'PILL' : 'Q', 390, 30);
      if (p.flags.pillsKnown || G.pillKnown.has(G.pillAssign[p.pill])) {
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
    if (p.focused) status = '◎ hyperfocus';
    if (p.adren) status = '⚡ adrenaline';
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
    ctx.fillText(DATA.floorName(G.depth), CW - 180, 22);
    ctx.font = this.font(11);
    ctx.fillStyle = 'rgba(240,232,216,0.5)';
    ctx.fillText('ward ' + G.depth, CW - 180, 38);

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
      else if (room.type === 'oon') ctx.fillText('♥', cx2, cy2);
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
    ctx.fillText(DATA.floorName(G.depth), CW / 2, CH / 2 - 8);
    ctx.font = this.font(15);
    ctx.fillStyle = 'rgba(240,232,216,0.6)';
    ctx.fillText('ward ' + G.depth + ' — descending', CW / 2, CH / 2 + 24);
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
