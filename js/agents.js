(function (g) {
  'use strict';
  const PM = g.PM;
  const P = PM.Path;
  const DIR = PM.DIR;

  // ---------------------------------------------------------------------------------------
  // Mover: tile based movement with smooth interpolation between tile centres.
  // ---------------------------------------------------------------------------------------
  class Mover {
    constructor(maze) {
      this.maze = maze;
      this.fx = 0; this.fy = 0; this.tx = 0; this.ty = 0;
      this.p = 1;
      this.dir = null;
      this.moving = false;
    }
    place(x, y) {
      this.fx = this.tx = x; this.fy = this.ty = y;
      this.p = 1; this.dir = null; this.moving = false;
    }
    get px() { return this.fx + (this.tx - this.fx) * this.p; }
    get py() { return this.fy + (this.ty - this.fy) * this.p; }
    get tileX() { return this.maze.wrapX(Math.round(this.px)); }
    get tileY() { return Math.round(this.py); }

    reverse() {
      const ax = this.fx, ay = this.fy;
      this.fx = this.tx; this.fy = this.ty;
      this.tx = ax; this.ty = ay;
      this.p = 1 - this.p;
      this.dir = PM.opposite(this.dir);
    }

    advance(dt, speed) {
      let move = speed * dt;
      let guard = 0;
      while (move > 1e-9 && guard++ < 12) {
        if (this.p >= 1) {
          const d = this.decide();
          if (!d) { this.moving = false; return; }
          this.dir = d;
          this.moving = true;
          this.tx = this.fx + d.dx;
          this.ty = this.fy + d.dy;
          this.p = 0;
        }
        const step = Math.min(move, 1 - this.p);
        this.p += step;
        move -= step;
        if (this.p >= 1 - 1e-9) {
          this.p = 1;
          this.fx = this.maze.wrapX(this.tx);
          this.fy = this.ty;
          this.tx = this.fx; this.ty = this.fy;
          this.onArrive();
        }
      }
    }
    decide() { return null; }
    onArrive() {}
  }

  // ---------------------------------------------------------------------------------------
  // Pac-Man
  // ---------------------------------------------------------------------------------------
  class Pac extends Mover {
    constructor(world) {
      super(world.maze);
      this.world = world;
      this.anim = 0;
      this.reset();
    }
    reset() {
      const s = this.maze.pacStart;
      this.place(s.x, s.y);
      this.want = null;
      this.face = DIR.left;
    }
    setWant(d) {
      this.want = d;
      if (d && this.dir && this.p < 1 && d === PM.opposite(this.dir)) this.reverse();
    }
    decide() {
      const m = this.maze;
      if (this.world.aiPac) this.want = this.world.pacAI.choose(this);
      const ok = (d) => m.canPac(this.fx + d.dx, this.fy + d.dy);
      if (this.want && ok(this.want)) { this.face = this.want; return this.want; }
      if (this.dir && ok(this.dir)) return this.dir;
      return null;
    }
    update(dt) {
      this.advance(dt, this.world.pacSpeed);
      if (this.moving) this.anim += dt;
    }
    onArrive() { this.world.onPacTile(this.fx, this.fy); }
  }

  // ---------------------------------------------------------------------------------------
  // Ghost agent
  // ---------------------------------------------------------------------------------------
  class Ghost extends Mover {
    constructor(world, def, index) {
      super(world.maze);
      this.world = world;
      this.def = def;
      this.index = index;
      this.controlled = false;
      this.expandedTotal = 0;
      this.decisions = 0;
      this.bob = Math.random() * 6;
      this.reset();
    }
    reset() {
      const w = this.world, m = this.maze, h = m.house;
      this.dir = null; this.want = null; this.flipNext = false;
      this.role = ''; this.teamTarget = null; this.path = []; this.target = null;
      this.lastSeen = null; this.wp = null; this.sees = false; this.pacD = -1;
      this.roleMsgAt = -99;
      if (this.index === 0 || !h.cells.length) {
        this.place(h.exit.x, h.exit.y);
        this.state = w.phase;
        this.dir = DIR.left;
        this.role = this.state.toUpperCase();
      } else {
        const order = [m.home].concat(h.cells.filter((c) => c !== m.home));
        const c = order[(this.index - 1) % order.length];
        this.place(c.x, c.y);
        this.state = 'house';
        this.releaseIn = w.diff.release[this.index] || 0;
        this.role = 'HOUSE';
      }
    }
    setRole(role) {
      if (this.role === role) return;
      this.role = role;
      const t = this.world.team;
      if (t && this.world.coordination && this.world.time - this.roleMsgAt > 1.8 && /^(HUNTER|INTERCEPTOR|FLANKER|BLOCKER|TRACKER|SWEEP)$/.test(role)) {
        this.roleMsgAt = this.world.time;
        t.msg(this.def.name, 'ROLE', 'รับบทบาท ' + role);
      }
    }
    setWant(d) {
      this.want = d;
      if (d && this.dir && this.p < 1 && d === PM.opposite(this.dir) && (this.state === 'chase' || this.state === 'scatter')) this.reverse();
    }
    get speed() {
      const w = this.world;
      const base = w.ghostSpeed;
      switch (this.state) {
        case 'house': return 0;
        case 'leaving': return 4;
        case 'frightened': return base * 0.55;
        case 'eaten': return Math.min(13, base * 2.2);
        default: {
          let s = base;
          if (this.controlled) s *= 0.95;
          const m = this.maze;
          if (m.tunnelRows.has(this.fy) && (this.fx <= 4 || this.fx >= m.w - 5)) s *= 0.6;
          return s;
        }
      }
    }
    update(dt) {
      this.bob += dt;
      if (this.state === 'house') {
        this.releaseIn -= dt;
        if (this.releaseIn <= 0) this.state = 'leaving';
        return;
      }
      if (this.world.freezeTimer > 0 && this.state !== 'eaten') return;
      this.advance(dt, this.speed);
    }

    stepTo(target, can) {
      const m = this.maze;
      const r = P.find(m, 'bfs', this.fx, this.fy, target.x, target.y, can, null);
      this.path = r.path;
      this.target = target;
      if (r.found && r.path.length > 1) return P.dirTo(m, r.path[0], r.path[1]);
      return null;
    }

    decide() {
      const w = this.world, m = this.maze;
      const hx = this.fx, hy = this.fy;
      if (this.state === 'house') return null;

      if (this.state === 'leaving') {
        const ex = m.house.exit;
        if (hx === ex.x && hy === ex.y) {
          this.state = w.frightTimer > 0 ? 'frightened' : w.phase;
          this.role = this.state === 'frightened' ? 'FRIGHT' : this.state.toUpperCase();
        } else {
          return this.stepTo(ex, (x, y) => m.canGhost(x, y, true));
        }
      }
      if (this.state === 'eaten') {
        const home = m.home;
        const can = (x, y) => m.canGhost(x, y, true);
        if (hx === home.x && hy === home.y) {
          this.state = 'leaving';
          this.role = 'LEAVING';
          return this.stepTo(m.house.exit, can);
        }
        return this.stepTo(home, can);
      }

      const can = (x, y) => m.canGhost(x, y, false);
      const opts = PM.DIR_LIST.filter((d) => can(hx + d.dx, hy + d.dy));
      const prev = this.dir ? PM.opposite(this.dir) : null;

      // Human controlled ghost (2-player mode).
      if (this.controlled && (this.state === 'chase' || this.state === 'scatter')) {
        this.target = null; this.path = [];
        if (this.want && opts.includes(this.want)) return this.want;
        if (this.dir && opts.includes(this.dir)) return this.dir;
        return null;
      }

      const nonRev = opts.filter((d) => d !== prev);
      if (this.flipNext) {
        this.flipNext = false;
        if (prev && opts.includes(prev)) return prev;
      }
      if (!nonRev.length) return prev && opts.includes(prev) ? prev : (opts[0] || null);
      if (nonRev.length === 1) { this.target = null; this.path = []; return nonRev[0]; }
      if (this.state === 'frightened') { this.target = null; this.path = []; return w.rng.pick(nonRev); }
      if (w.diff.errRate > 0 && w.rng() < w.diff.errRate) { this.path = []; return w.rng.pick(nonRev); }

      const target = w.team.targetFor(this);
      this.target = target;
      const blocked = new Set();
      if (prev) blocked.add(((hy + prev.dy) * m.w) + m.wrapX(hx + prev.dx));
      let r = P.find(m, w.algo, hx, hy, target.x, target.y, can, blocked);
      this.lastExpanded = r.expanded;
      this.expandedTotal += r.expanded;
      this.decisions++;
      w.stats.expanded += r.expanded;
      w.stats.decisions++;
      this.path = r.path;
      if (r.found && r.path.length > 1) {
        const d = P.dirTo(m, r.path[0], r.path[1]);
        if (d && nonRev.includes(d)) return d;
      }
      // Fallback: greedy step toward the target.
      let best = nonRev[0], bd = 1e9;
      for (const d of nonRev) {
        const dd = P.heur(m, m.wrapX(hx + d.dx), hy + d.dy, target.x, target.y);
        if (dd < bd) { bd = dd; best = d; }
      }
      return best;
    }
  }

  // ---------------------------------------------------------------------------------------
  // Team: blackboard shared by the ghost agents. In "independent" mode ghosts only use
  // their own perception & personality; in "coordinated" mode they share what they see,
  // are assigned roles dynamically and sweep unseen areas together.
  // ---------------------------------------------------------------------------------------
  class Team {
    constructor(world) {
      this.w = world;
      this.log = [];
      this.acc = 0;
      this.memory = 3.5;
      this.lastKnown = null;
      this.known = false;
      this.pacDist = null;
      this.pacTile = { x: world.maze.pacStart.x, y: world.maze.pacStart.y };
      this.open = world.maze.openTiles();
      this.corner = {};
      for (const d of PM.GHOST_DEFS) this.corner[d.id] = world.nearestOpen(d.corner.x, d.corner.y);
      this.zoneCount = [0, 0, 0, 0];
      this.targets = {};
    }
    msg(from, type, text) {
      if (!this.w.coordination) return;
      this.log.push({ t: this.w.time, from, type, text });
      if (this.log.length > 40) this.log.shift();
      this.w.emit('msg', { from, type, text });
    }
    isKnown() { return !!this.lastKnown && this.w.time - this.lastKnown.t < this.memory; }

    update(dt) {
      this.acc -= dt;
      if (this.acc > 0) return;
      this.acc = 0.15;
      this.refresh();
    }

    zoneOf(x, y) { return (x < 10 ? 0 : 1) + (y < 10 ? 0 : 2); }

    refresh() {
      const w = this.w, m = w.maze, pac = w.pac, W = m.w;
      const pt = { x: pac.tileX, y: pac.tileY };
      this.pacTile = pt;
      const canG = (x, y) => m.canGhost(x, y, false);
      this.pacDist = P.distMap(m, [pt], canG, 80);
      const vis = w.diff.vision;
      let seer = null;
      for (const g of w.ghosts) {
        g.sees = false; g.pacD = -1;
        if (g.state === 'house' || g.state === 'leaving' || g.state === 'eaten') continue;
        const d = this.pacDist[g.tileY * W + g.tileX];
        g.pacD = d;
        if (d >= 0 && d <= vis) {
          g.sees = true;
          g.lastSeen = { x: pt.x, y: pt.y, dir: pac.face, t: w.time };
          if (!seer) seer = g;
        }
      }
      if (!w.coordination) return;
      const was = this.isKnown();
      if (seer) {
        this.lastKnown = { x: pt.x, y: pt.y, dir: pac.face, t: w.time };
        if (!was) this.msg(seer.def.name, 'SPOTTED', 'พบ Pac-Man ที่ (' + pt.x + ',' + pt.y + ') แจ้งทุกตัว');
      }
      const now = this.isKnown();
      if (was && !now) this.msg('TEAM', 'LOST', 'เสียตำแหน่ง Pac-Man เริ่มกวาดพื้นที่');
      this.known = now;
      this.assignRoles(!!seer);
    }

    ahead(from, dir, n) {
      const m = this.w.maze;
      let x = from.x, y = from.y;
      if (!dir) return { x, y };
      for (let i = 0; i < n; i++) {
        const nx = m.wrapX(x + dir.dx), ny = y + dir.dy;
        if (!m.canPac(x + dir.dx, ny)) break;
        x = nx; y = ny;
      }
      return { x, y };
    }

    pickTile(filter, score) {
      let best = null, bs = -1e9;
      for (const t of this.open) {
        if (!filter(t)) continue;
        const s = score(t) + this.w.rng() * 0.5;
        if (s > bs) { bs = s; best = t; }
      }
      return best;
    }

    assignRoles(seenNow) {
      const w = this.w, m = w.maze, W = m.w;
      const canG = (x, y) => m.canGhost(x, y, false);
      const hunters = w.ghosts.filter((g) => g.state === 'chase' && !g.controlled);
      for (const g of w.ghosts) {
        if (g.state === 'scatter') g.setRole('SCATTER');
        else if (g.state === 'frightened') g.setRole('FRIGHT');
        else if (g.state === 'eaten') g.setRole('RETURN');
      }
      if (!hunters.length) return;

      if (this.isKnown()) {
        const est = seenNow ? this.pacTile : { x: this.lastKnown.x, y: this.lastKnown.y };
        const estDir = this.lastKnown.dir;
        const dist = seenNow ? this.pacDist : P.distMap(m, [est], canG, 80);
        const dOf = (g) => { const d = dist[g.tileY * W + g.tileX]; return d < 0 ? 999 : d; };
        // Re-rank roles at most once a second so agents don't flip-flop between jobs.
        const prev = this.order;
        const sameSet = prev && prev.length === hunters.length && hunters.every((g) => prev.includes(g));
        if (sameSet && w.time - this.orderAt < PM.RANK_HOLD) {
          hunters.sort((a, b) => prev.indexOf(a) - prev.indexOf(b));
        } else {
          hunters.sort((a, b) => dOf(a) - dOf(b));
          this.order = hunters.slice();
          this.orderAt = w.time;
        }
        const T = {};
        T.HUNTER = est;
        T.INTERCEPTOR = this.ahead(est, estDir, 6);
        if (hunters.length >= 3) {
          const h = hunters[0];
          const hd = P.distMap(m, [{ x: h.tileX, y: h.tileY }], canG, 70);
          const flank = this.pickTile(
            (t) => dist[t.k] >= 4 && dist[t.k] <= 10 && hd[t.k] >= 0,
            (t) => hd[t.k] - Math.abs(dist[t.k] - 6) * 0.5
          );
          T.FLANKER = flank || est;
          // Blocker camps on the power pellet closest to Pac-Man (deny the escape) or the far side.
          let pellet = null, pd = 1e9;
          for (const t of this.open) {
            if (m.g[t.y][t.x] === 'o' && dist[t.k] >= 0 && dist[t.k] < pd) { pd = dist[t.k]; pellet = t; }
          }
          if (pellet && pd <= 16) T.BLOCKER = pellet;
          else {
            const blk = this.pickTile(
              (t) => dist[t.k] >= 5 && dist[t.k] <= 12 && hd[t.k] >= 0 && (!flank || t.k !== flank.k),
              (t) => Math.min(hd[t.k], 20)
            );
            T.BLOCKER = blk || est;
          }
        }
        const ROLES = ['HUNTER', 'INTERCEPTOR', 'FLANKER', 'BLOCKER'];
        hunters.forEach((g, i) => {
          const role = ROLES[Math.min(i, 3)];
          g.setRole(role);
          g.teamTarget = T[role] || est;
        });
        this.targets = T;
      } else {
        // Pac-Man's location unknown: one tracker goes to the last sighting, the rest sweep zones.
        const zc = [0, 0, 0, 0];
        for (const t of this.open) { const c = m.g[t.y][t.x]; if (c === '.' || c === 'o') zc[this.zoneOf(t.x, t.y)]++; }
        const zoneOrder = [0, 1, 2, 3].sort((a, b) => zc[b] - zc[a]);
        let rest = hunters.slice();
        if (this.lastKnown) {
          let tr = null, td = 1e9;
          for (const g of rest) {
            const d = P.heur(m, g.tileX, g.tileY, this.lastKnown.x, this.lastKnown.y);
            if (d < td) { td = d; tr = g; }
          }
          if (tr) {
            tr.setRole('TRACKER');
            tr.teamTarget = { x: this.lastKnown.x, y: this.lastKnown.y };
            rest = rest.filter((g) => g !== tr);
          }
        }
        rest.forEach((g, i) => {
          g.setRole('SWEEP');
          const reached = g.teamTarget && g.tileX === g.teamTarget.x && g.tileY === g.teamTarget.y;
          if (!g.teamTarget || reached || w.time > (g.wpUntil || 0) || g.zoneIdx !== i) {
            const zone = zoneOrder[i % 4];
            g.zoneIdx = i;
            const t = this.pickTile(
              (t2) => this.zoneOf(t2.x, t2.y) === zone && (m.g[t2.y][t2.x] === '.' || m.g[t2.y][t2.x] === 'o'),
              () => w.rng()
            ) || this.pickTile((t2) => this.zoneOf(t2.x, t2.y) === zone, () => w.rng());
            g.teamTarget = t ? { x: t.x, y: t.y } : this.pacTile;
            g.wpUntil = w.time + 7;
          }
        });
      }
    }

    persona(g) {
      const w = this.w, pac = w.pac, m = w.maze;
      const pt = this.pacTile;
      switch (g.def.persona) {
        case 'ambusher': return this.ahead(pt, pac.face, 4);
        case 'flanker': {
          const b = w.ghosts[0];
          const a2 = this.ahead(pt, pac.face, 2);
          const tx = PM.clamp(a2.x * 2 - b.tileX, 1, m.w - 2);
          const ty = PM.clamp(a2.y * 2 - b.tileY, 1, m.h - 2);
          return w.nearestOpen(tx, ty);
        }
        case 'shy': return g.pacD >= 0 && g.pacD <= 8 ? this.corner[g.def.id] : pt;
        default: return pt;
      }
    }

    wander(g) {
      const w = this.w;
      const reached = g.wp && g.tileX === g.wp.x && g.tileY === g.wp.y;
      if (!g.wp || reached || w.time > (g.wpUntil || 0)) {
        const t = w.rng.pick(this.open);
        g.wp = { x: t.x, y: t.y };
        g.wpUntil = w.time + 8;
      }
      return g.wp;
    }

    targetFor(g) {
      const w = this.w;
      if (g.state === 'scatter') return this.corner[g.def.id];
      if (w.coordination) return g.teamTarget || this.pacTile;
      // Independent agent.
      if (g.sees || w.diff.vision >= 99) { g.setRole(g.def.persona.toUpperCase()); return this.persona(g); }
      if (g.lastSeen && w.time - g.lastSeen.t < 2.5) { g.setRole('CHASE-MEM'); return g.lastSeen; }
      g.setRole('WANDER');
      return this.wander(g);
    }
  }

  // ---------------------------------------------------------------------------------------
  // Pac-Man autopilot (used in AI / spectator mode and in the comparison lab).
  // ---------------------------------------------------------------------------------------
  class PacAI {
    constructor(world) { this.w = world; this.target = null; this.path = []; }
    choose(pac) {
      const w = this.w, m = w.maze;
      const W = m.w, N = W * m.h;
      const here = { x: pac.fx, y: pac.fy };
      const dangers = w.ghosts.filter((gh) => gh.state === 'chase' || gh.state === 'scatter' || gh.state === 'leaving');
      const gd = dangers.length
        ? P.distMap(m, dangers.map((gh) => ({ x: gh.tileX, y: gh.tileY })), (x, y) => m.canGhost(x, y, false), 24)
        : null;
      const hereKey = here.y * W + here.x;
      const nearDanger = gd && gd[hereKey] >= 0 && gd[hereKey] < 12;

      const prevDir = pac.dir ? PM.opposite(pac.dir) : null;
      const opts = P.neighbors(m, here.x, here.y, (x, y) => m.canPac(x, y));

      const frightened = new Map();
      for (const gh of w.ghosts) if (gh.state === 'frightened') frightened.set(gh.tileY * W + gh.tileX, gh);
      const fruitKey = w.fruit ? w.fruit.y * W + w.fruit.x : -1;
      const coinKeys = new Map();
      for (const c of w.coinTokens) coinKeys.set(c.y * W + c.x, c);

      // Breadth-first search over tiles Pac-Man can reach before any ghost does.
      const search = (allowRev) => {
        const dist = new Int16Array(N).fill(-1);
        const first = new Array(N);
        const queue = [hereKey];
        dist[hereKey] = 0;
        let best = -1, bestScore = -1e9;
        for (let head = 0; head < queue.length; head++) {
          const k = queue[head];
          const d = dist[k];
          if (k !== hereKey) {
            const x = k % W, y = (k / W) | 0;
            const c = m.g[y][x];
            let v = 0;
            if (c === '.') v = 10;
            else if (c === 'o') v = nearDanger && w.frightTimer <= 0 ? 80 : 6;
            if (k === fruitKey) v = Math.max(v, 45);
            if (coinKeys.has(k)) v = Math.max(v, 38);
            if (frightened.size && frightened.has(k) && w.frightTimer > d / 6.5 + 0.4) v = Math.max(v, 90);
            if (v > 0) {
              const s = v - d * 3.4;
              if (s > bestScore) { bestScore = s; best = k; }
            }
          }
          if (d >= 45) continue;
          const ns = P.neighbors(m, k % W, (k / W) | 0, (x, y) => m.canPac(x, y));
          for (const n of ns) {
            const nk = n.y * W + n.x;
            if (dist[nk] >= 0) continue;
            if (k === hereKey && !allowRev && n.dir === prevDir) continue;
            if (gd && gd[nk] >= 0 && gd[nk] <= d + 2) continue; // a ghost would get there first
            dist[nk] = d + 1;
            first[nk] = k === hereKey ? n.dir : first[k];
            queue.push(nk);
          }
        }
        return best >= 0 ? { best, dir: first[best] } : null;
      };

      let r = search(false) || search(true);
      if (r) { this.target = { x: r.best % W, y: (r.best / W) | 0 }; return r.dir; }

      // Nowhere safe to go: run toward the neighbour farthest from the ghosts.
      this.target = null;
      let pick = null, ps = -1e9;
      for (const o of opts) {
        const k = o.y * W + o.x;
        const exits = P.neighbors(m, o.x, o.y, (x, y) => m.canPac(x, y)).length;
        const s = (gd && gd[k] >= 0 ? gd[k] : 30) * 2 + exits + (o.dir === prevDir ? -0.5 : 0) + w.rng() * 0.3;
        if (s > ps) { ps = s; pick = o.dir; }
      }
      return pick || pac.dir;
    }
  }

  PM.RANK_HOLD = 0.6; // seconds a role ranking is kept before ghosts may swap jobs
  PM.Mover = Mover;
  PM.Pac = Pac;
  PM.Ghost = Ghost;
  PM.Team = Team;
  PM.PacAI = PacAI;
})(typeof window !== 'undefined' ? window : globalThis);
