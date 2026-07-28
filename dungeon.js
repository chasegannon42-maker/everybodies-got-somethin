/* =========================================================
   EVERYBODIES GOT SOMETHIN — dungeon.js
   Isaac-style floor generation on an infinite grid of wards.
   ========================================================= */
'use strict';

const DIRS = { N: { dx: 0, dy: -1, opp: 'S' }, S: { dx: 0, dy: 1, opp: 'N' }, E: { dx: 1, dy: 0, opp: 'W' }, W: { dx: -1, dy: 0, opp: 'E' } };

function makeRoom(gx, gy, type) {
  return {
    gx, gy, type,                       // 'start' | 'normal' | 'boss' | 'item' | 'shop' | 'secret' | 'oon'
    doors: { N: false, S: false, E: false, W: false },
    secretDoors: { N: false, S: false, E: false, W: false },
    layout: null,                       // [ROWS][COLS] ints
    paperHp: {},                        // "c,r" -> hp for paperwork tiles
    discovered: false, visited: false,
    cleared: false, spawned: false,
    pickups: [], peds: [],              // persisted contents
    enemiesAlive: 0
  };
}

/* build layout ints from a template, keeping door lanes clear */
function buildLayout(room, depth) {
  const layout = [];
  let tmpl;
  if (room.type === 'normal') { tmpl = U.choice(DATA.TEMPLATES); room.theme = U.choice(DATA.ROOM_THEMES); }
  else tmpl = DATA.TEMPLATES[0];
  for (let r = 0; r < ROWS; r++) {
    layout[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = tmpl[r][c] || '.';
      layout[r][c] = ch === '#' ? 1 : ch === 'P' ? 2 : ch === '^' ? 3 : 0;
    }
  }
  // clear lanes in front of any door (and center) so you can never be walled in
  const midC = Math.floor(COLS / 2), midR = Math.floor(ROWS / 2);
  const clear = (c, r) => { if (c >= 0 && r >= 0 && c < COLS && r < ROWS) layout[r][c] = 0; };
  clear(midC, midR);
  for (const d in DIRS) {
    if (!(room.doors[d] || room.secretDoors[d])) continue;
    if (d === 'N') { clear(midC, 0); clear(midC, 1); clear(midC - 1, 0); clear(midC + 1, 0); }
    if (d === 'S') { clear(midC, ROWS - 1); clear(midC, ROWS - 2); clear(midC - 1, ROWS - 1); clear(midC + 1, ROWS - 1); }
    if (d === 'W') { clear(0, midR); clear(1, midR); clear(0, midR - 1); clear(0, midR + 1); }
    if (d === 'E') { clear(COLS - 1, midR); clear(COLS - 2, midR); clear(COLS - 1, midR - 1); clear(COLS - 1, midR + 1); }
  }
  room.layout = layout;
  room.paperHp = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    if (layout[r][c] === 2) room.paperHp[c + ',' + r] = 10;
}

function generateFloor(depth, lastBoss) {
  const target = Math.min(6 + Math.floor(depth * 1.5) + U.randi(0, 2), 15);
  const grid = new Map();
  const put = (room) => grid.set(U.key(room.gx, room.gy), room);
  const at = (x, y) => grid.get(U.key(x, y));

  const start = makeRoom(0, 0, 'start');
  put(start);

  let guard = 0;
  while (grid.size < target && guard++ < 600) {
    const rooms = [...grid.values()].filter(r => r.type !== 'secret');
    const base = U.choice(rooms);
    const d = U.choice(Object.keys(DIRS));
    const nx = base.gx + DIRS[d].dx, ny = base.gy + DIRS[d].dy;
    if (at(nx, ny)) continue;
    // isaac rule: new cell may touch only 1 existing room (keeps branchy corridors)
    let touching = 0;
    for (const dd in DIRS) if (at(nx + DIRS[dd].dx, ny + DIRS[dd].dy)) touching++;
    if (touching > 1) continue;
    if (Math.abs(nx) > 4 || Math.abs(ny) > 4) continue;
    put(makeRoom(nx, ny, 'normal'));
  }

  // connect doors between adjacent placed rooms
  for (const room of grid.values()) {
    for (const d in DIRS) {
      const n = at(room.gx + DIRS[d].dx, room.gy + DIRS[d].dy);
      if (n) room.doors[d] = true;
    }
  }

  // BFS distance from start
  const dist = new Map([[U.key(0, 0), 0]]);
  const q = [start];
  while (q.length) {
    const r = q.shift(), d0 = dist.get(U.key(r.gx, r.gy));
    for (const d in DIRS) {
      if (!r.doors[d]) continue;
      const n = at(r.gx + DIRS[d].dx, r.gy + DIRS[d].dy);
      const k = U.key(n.gx, n.gy);
      if (!dist.has(k)) { dist.set(k, d0 + 1); q.push(n); }
    }
  }

  // dead ends sorted far -> near
  const deadEnds = [...grid.values()]
    .filter(r => r.type === 'normal' && Object.values(r.doors).filter(Boolean).length === 1)
    .sort((a, b) => dist.get(U.key(b.gx, b.gy)) - dist.get(U.key(a.gx, a.gy)));

  // guarantee at least 3 dead ends by growing new stubs off far rooms
  let grow = 0;
  while (deadEnds.length < 3 && grow++ < 40) {
    const rooms = [...grid.values()].sort((a, b) => (dist.get(U.key(b.gx, b.gy)) || 0) - (dist.get(U.key(a.gx, a.gy)) || 0));
    let made = false;
    for (const base of rooms) {
      for (const d of U.shuffle(Object.keys(DIRS))) {
        const nx = base.gx + DIRS[d].dx, ny = base.gy + DIRS[d].dy;
        if (at(nx, ny) || Math.abs(nx) > 5 || Math.abs(ny) > 5) continue;
        let touching = 0;
        for (const dd in DIRS) if (at(nx + DIRS[dd].dx, ny + DIRS[dd].dy)) touching++;
        if (touching > 1) continue;
        const nr = makeRoom(nx, ny, 'normal');
        put(nr);
        nr.doors[DIRS[d].opp] = true;
        base.doors[d] = true;
        dist.set(U.key(nx, ny), (dist.get(U.key(base.gx, base.gy)) || 0) + 1);
        deadEnds.push(nr);
        made = true;
        break;
      }
      if (made) break;
    }
    if (!made) break;
    deadEnds.sort((a, b) => dist.get(U.key(b.gx, b.gy)) - dist.get(U.key(a.gx, a.gy)));
  }

  const bossRoom = deadEnds[0];
  if (bossRoom) bossRoom.type = 'boss';
  const itemRoom = deadEnds[1];
  if (itemRoom) itemRoom.type = 'item';
  const shopRoom = deadEnds[2];
  if (shopRoom) shopRoom.type = 'shop';

  // secret room: empty cell adjacent to the most non-special rooms
  let best = null, bestN = 0;
  for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) {
    if (at(x, y)) continue;
    let n = 0;
    for (const d in DIRS) {
      const r = at(x + DIRS[d].dx, y + DIRS[d].dy);
      if (r && r.type !== 'boss' && r.type !== 'secret') n++;
    }
    if (n > bestN || (n === bestN && n > 0 && U.chance(0.3))) { bestN = n; best = { x, y }; }
  }
  if (best && bestN >= 2) {
    const sec = makeRoom(best.x, best.y, 'secret');
    put(sec);
    for (const d in DIRS) {
      const n = at(best.x + DIRS[d].dx, best.y + DIRS[d].dy);
      if (n && n.type !== 'boss') {
        sec.secretDoors[d] = true;
        n.secretDoors[DIRS[d].opp] = true;
      }
    }
  }

  // mini-event room: convert a spare normal room into a non-combat choice room
  if (depth >= 2) {
    const normals = [...grid.values()].filter(r => r.type === 'normal');
    if (normals.length > 3 && U.chance(0.7)) U.choice(normals).type = 'event';
  }
  // The Day Room: a sanctuary among the wards
  if (depth >= 3) {
    const normals = [...grid.values()].filter(r => r.type === 'normal');
    if (normals.length > 3 && U.chance(0.55)) U.choice(normals).type = 'dayroom';
  }

  // build layouts
  for (const room of grid.values()) buildLayout(room, depth);

  const bossId = DATA.bossFor(depth, lastBoss);
  return { grid, start, bossId, rooms: [...grid.values()] };
}
