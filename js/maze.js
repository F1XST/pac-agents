(function (g) {
  'use strict';
  const PM = g.PM;

  // Legend: # wall, . dot, o power pellet, ' ' empty, - ghost door, G ghost house, P pac start
  PM.MAZES = {
    classic: [
      '#####################',
      '#.........#.........#',
      '#o###.###.#.###.###o#',
      '#...................#',
      '#.###.#.#####.#.###.#',
      '#...................#',
      '#####.#.#####.#.#####',
      '#####.#.......#.#####',
      '#####.#.##-##.#.#####',
      '     .  #GGG#  .     ',
      '#####.#.#####.#.#####',
      '#####.#.......#.#####',
      '#####.#.#####.#.#####',
      '#...................#',
      '#.###.#.#####.#.###.#',
      '#.....#...#...#.....#',
      '#.###.###.#.###.###.#',
      '#o........P........o#',
      '#.###.#.#####.#.###.#',
      '#...................#',
      '#####################',
    ],
  };

  class Maze {
    constructor(rows) {
      this.source = rows.slice();
      this.h = rows.length;
      this.w = rows[0].length;
      this.g = rows.map((r) => r.split(''));
      this.pacStart = { x: 10, y: 17 };
      this.house = { cells: [], door: null, exit: null };
      this.tunnelRows = new Set();
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const c = this.g[y][x];
          if (c === 'P') { this.pacStart = { x, y }; this.g[y][x] = ' '; }
          else if (c === '-') this.house.door = { x, y };
          else if (c === 'G') this.house.cells.push({ x, y });
        }
        if (this.g[y][0] !== '#' && this.g[y][this.w - 1] !== '#') this.tunnelRows.add(y);
      }
      if (this.house.door) this.house.exit = { x: this.house.door.x, y: this.house.door.y - 1 };
      this.home = this.house.cells.length
        ? this.house.cells.find((c) => c.x === this.house.door.x) || this.house.cells[0]
        : { x: 10, y: 9 };
      this.totalDots = 0;
      for (const row of this.g) for (const c of row) if (c === '.' || c === 'o') this.totalDots++;
      this.dotsLeft = this.totalDots;
    }

    wrapX(x) { return x < 0 ? this.w - 1 : x >= this.w ? 0 : x; }

    at(x, y) {
      if (y < 0 || y >= this.h) return '#';
      if (x < 0 || x >= this.w) {
        if (!this.tunnelRows.has(y)) return '#';
        x = this.wrapX(x);
      }
      return this.g[y][x];
    }

    canPac(x, y) { const c = this.at(x, y); return c !== '#' && c !== '-' && c !== 'G'; }

    canGhost(x, y, houseOk) {
      const c = this.at(x, y);
      if (c === '#') return false;
      if (c === '-' || c === 'G') return !!houseOk;
      return true;
    }

    eat(x, y) {
      const c = this.g[y] && this.g[y][x];
      if (c === '.' || c === 'o') { this.g[y][x] = ' '; this.dotsLeft--; return c; }
      return null;
    }

    isOpen(x, y) { const c = this.at(x, y); return c !== '#' && c !== '-' && c !== 'G'; }

    openTiles() {
      const out = [];
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) if (this.isOpen(x, y)) out.push({ x, y, k: y * this.w + x });
      return out;
    }

    // Serialisable rows (with P marker) for saving / cloning.
    toRows() {
      return this.g.map((row, y) => row.map((c, x) => (x === this.pacStart.x && y === this.pacStart.y ? 'P' : c)).join(''));
    }
  }
  PM.Maze = Maze;

  // ---- Procedural symmetric maze -------------------------------------------------------
  PM.generateMaze = function (seed, attempt) {
    attempt = attempt || 0;
    const rng = PM.makeRng((seed >>> 0) + attempt * 7919);
    const W = 21, H = 21;
    const g = Array.from({ length: H }, () => Array(W).fill('#'));
    const visited = new Set();
    const stack = [[1, 1]];
    g[1][1] = ' ';
    visited.add(1 * W + 1);
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [];
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 1 && nx <= 9 && ny >= 1 && ny <= 19 && !visited.has(ny * W + nx)) nb.push([nx, ny]);
      }
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = rng.pick(nb);
      g[(cy + ny) / 2][(cx + nx) / 2] = ' ';
      g[ny][nx] = ' ';
      visited.add(ny * W + nx);
      stack.push([nx, ny]);
    }
    const openN = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => g[y + dy][x + dx] === ' ').length;
    // Braid: remove dead ends so Pac-Man is never cornered in a spur.
    for (let y = 1; y <= 19; y += 2) {
      for (let x = 1; x <= 9; x += 2) {
        if (openN(x, y) <= 1) {
          const cand = [];
          if (x < 9 || true) cand.push([1, 0]);
          if (x > 1) cand.push([-1, 0]);
          if (y < 19) cand.push([0, 1]);
          if (y > 1) cand.push([0, -1]);
          const walls = cand.filter(([dx, dy]) => g[y + dy][x + dx] === '#');
          if (walls.length) { const [dx, dy] = rng.pick(walls); g[y + dy][x + dx] = ' '; }
        }
      }
    }
    // Extra loops.
    for (let y = 1; y <= 19; y += 2) {
      for (let x = 1; x <= 9; x += 2) {
        if (x < 9 && g[y][x + 1] === '#' && rng.chance(0.2)) g[y][x + 1] = ' ';
        if (y < 19 && g[y + 1][x] === '#' && rng.chance(0.2)) g[y + 1][x] = ' ';
      }
    }
    // Make sure both halves are well connected through the centre column.
    const rowsC = [1, 3, 5, 13, 15, 17, 19];
    for (const y of rowsC) if (rng.chance(0.55)) g[y][10] = ' ';
    g[3][10] = ' '; g[13][10] = ' '; g[19][10] = ' ';
    // Ghost house + ring corridor.
    for (let y = 7; y <= 11; y++) for (let x = 7; x <= 13; x++) g[y][x] = (y === 7 || y === 11 || x === 7 || x === 13) ? ' ' : '#';
    for (let x = 8; x <= 12; x++) { g[8][x] = '#'; g[10][x] = '#'; }
    g[8][10] = '-';
    g[9][8] = '#'; g[9][12] = '#';
    g[9][9] = 'G'; g[9][10] = 'G'; g[9][11] = 'G';
    // Tunnel on row 9 (mirrored below).
    for (let x = 0; x <= 7; x++) g[9][x] = ' ';
    // Keep row 8/10 above/below the tunnel closed near the edges so it reads as a tunnel.
    for (let x = 0; x <= 4; x++) { g[8][x] = '#'; g[10][x] = '#'; }
    // Mirror.
    for (let y = 0; y < H; y++) for (let x = 0; x < 10; x++) g[y][20 - x] = g[y][x];
    for (let y = 0; y < H; y++) { g[y][0] = y === 9 ? ' ' : '#'; g[y][20] = y === 9 ? ' ' : '#'; }
    g[0] = g[0].map(() => '#'); g[20] = g[20].map(() => '#');

    // Keep only what Pac-Man can reach.
    const near = (tx, ty) => {
      let best = null, bd = 1e9;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (g[y][x] !== ' ') continue;
        const d = Math.abs(x - tx) + Math.abs(y - ty);
        if (d < bd) { bd = d; best = { x, y }; }
      }
      return best;
    };
    let start = near(10, 17);
    if (!start) return PM.generateMaze(seed, attempt + 1);
    const seen = new Set([start.y * W + start.x]);
    const q = [start];
    while (q.length) {
      const c = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = c.x + dx; const ny = c.y + dy;
        if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0;
        if (ny < 0 || ny >= H) continue;
        if (g[ny][nx] !== ' ' || seen.has(ny * W + nx)) continue;
        seen.add(ny * W + nx);
        q.push({ x: nx, y: ny });
      }
    }
    let dots = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x] === ' ') {
        if (!seen.has(y * W + x)) g[y][x] = '#';
        else if (y === 9 && (x <= 4 || x >= 16)) g[y][x] = ' ';
        else { g[y][x] = '.'; dots++; }
      }
    }
    g[start.y][start.x] = 'P';
    // Power pellets in the four corners.
    const corners = [[1, 1], [19, 1], [1, 19], [19, 19]];
    for (const [cx, cy] of corners) {
      let best = null, bd = 1e9;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (g[y][x] !== '.') continue;
        const d = Math.abs(x - cx) + Math.abs(y - cy);
        if (d < bd) { bd = d; best = { x, y }; }
      }
      if (best) g[best.y][best.x] = 'o';
    }
    if (dots < 110 && attempt < 12) return PM.generateMaze(seed, attempt + 1);
    return g.map((r) => r.join(''));
  };

  // Validate a (custom) maze layout. Returns an error string or null.
  PM.validateMaze = function (rows) {
    if (!rows || rows.length !== PM.H || rows.some((r) => r.length !== PM.W)) return 'ขนาดแมพไม่ถูกต้อง';
    const flat = rows.join('');
    if ((flat.match(/P/g) || []).length !== 1) return 'ต้องมีจุดเริ่ม Pac-Man (P) 1 จุด';
    if ((flat.match(/-/g) || []).length !== 1) return 'ต้องมีประตูบ้านผี 1 จุด';
    if ((flat.match(/G/g) || []).length < 1) return 'ต้องมีบ้านผี';
    const m = new PM.Maze(rows);
    const seen = new Set([m.pacStart.y * m.w + m.pacStart.x]);
    const q = [m.pacStart];
    while (q.length) {
      const c = q.shift();
      for (const d of PM.DIR_LIST) {
        let nx = c.x + d.dx; const ny = c.y + d.dy;
        if (!m.canPac(nx, ny)) continue;
        nx = m.wrapX(nx);
        const k = ny * m.w + nx;
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    let dots = 0, unreachable = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const c = m.g[y][x];
      if (c === '.' || c === 'o') { dots++; if (!seen.has(y * m.w + x)) unreachable++; }
    }
    if (dots < 20) return 'ต้องมีเม็ดอย่างน้อย 20 เม็ด';
    if (unreachable) return 'มีเม็ด ' + unreachable + ' เม็ดที่ Pac-Man เข้าไม่ถึง';
    const ex = m.house.exit;
    if (!m.isOpen(ex.x, ex.y) || !seen.has(ex.y * m.w + ex.x)) return 'ทางออกหน้าประตูบ้านผีต้องเชื่อมกับเขาวงกต';
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
