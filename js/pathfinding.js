(function (g) {
  'use strict';
  const PM = g.PM;

  class Heap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(p, v) {
      const a = this.a;
      a.push([p, v]);
      let i = a.length - 1;
      while (i > 0) {
        const j = (i - 1) >> 1;
        if (a[j][0] <= a[i][0]) break;
        const t = a[i]; a[i] = a[j]; a[j] = t;
        i = j;
      }
    }
    pop() {
      const a = this.a;
      const top = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let s = i;
          if (l < a.length && a[l][0] < a[s][0]) s = l;
          if (r < a.length && a[r][0] < a[s][0]) s = r;
          if (s === i) break;
          const t = a[i]; a[i] = a[s]; a[s] = t;
          i = s;
        }
      }
      return top;
    }
  }

  function nbrs(m, k, can, out) {
    out.length = 0;
    const W = m.w;
    const x = k % W, y = (k / W) | 0;
    const dirs = PM.DIR_LIST;
    for (let i = 0; i < 4; i++) {
      const d = dirs[i];
      let nx = x + d.dx;
      const ny = y + d.dy;
      if (ny < 0 || ny >= m.h) continue;
      if (nx < 0 || nx >= W) {
        if (!m.tunnelRows.has(y)) continue;
        nx = m.wrapX(nx);
      }
      if (!can(nx, ny)) continue;
      out.push(ny * W + nx);
    }
    return out;
  }

  const Path = {
    // Wrap-aware Manhattan distance.
    heur(m, ax, ay, bx, by) {
      let dx = Math.abs(ax - bx);
      if (m.tunnelRows.size) dx = Math.min(dx, m.w - dx);
      return dx + Math.abs(ay - by);
    },

    // algo: 'bfs' | 'astar' | 'greedy'. Returns { path:[{x,y}], expanded, found }.
    find(m, algo, sx, sy, tx, ty, can, blocked) {
      const W = m.w, N = W * m.h;
      const start = sy * W + sx, goal = ty * W + tx;
      if (start === goal) return { path: [{ x: sx, y: sy }], expanded: 0, found: true };
      const prev = new Int32Array(N).fill(-1);
      const seen = new Uint8Array(N);
      const buf = [];
      let expanded = 0, found = false;
      const hf = (k) => Path.heur(m, k % W, (k / W) | 0, tx, ty);

      if (algo === 'bfs') {
        const queue = [start];
        seen[start] = 1;
        for (let head = 0; head < queue.length; head++) {
          const cur = queue[head];
          expanded++;
          if (cur === goal) { found = true; break; }
          const ns = nbrs(m, cur, can, buf);
          for (let i = 0; i < ns.length; i++) {
            const nk = ns[i];
            if (seen[nk]) continue;
            if (blocked && blocked.has(nk) && nk !== goal) continue;
            seen[nk] = 1; prev[nk] = cur; queue.push(nk);
          }
        }
      } else if (algo === 'greedy') {
        const heap = new Heap();
        heap.push(hf(start), start);
        seen[start] = 1;
        while (heap.size) {
          const cur = heap.pop()[1];
          expanded++;
          if (cur === goal) { found = true; break; }
          const ns = nbrs(m, cur, can, buf);
          for (let i = 0; i < ns.length; i++) {
            const nk = ns[i];
            if (seen[nk]) continue;
            if (blocked && blocked.has(nk) && nk !== goal) continue;
            seen[nk] = 1; prev[nk] = cur; heap.push(hf(nk), nk);
          }
        }
      } else {
        const gs = new Float32Array(N).fill(1e9);
        const heap = new Heap();
        gs[start] = 0;
        heap.push(hf(start), start);
        while (heap.size) {
          const cur = heap.pop()[1];
          if (seen[cur] === 2) continue;
          seen[cur] = 2;
          expanded++;
          if (cur === goal) { found = true; break; }
          const ns = nbrs(m, cur, can, buf);
          for (let i = 0; i < ns.length; i++) {
            const nk = ns[i];
            if (seen[nk] === 2) continue;
            if (blocked && blocked.has(nk) && nk !== goal) continue;
            const ng = gs[cur] + 1;
            if (ng < gs[nk]) { gs[nk] = ng; prev[nk] = cur; heap.push(ng + hf(nk), nk); }
          }
        }
      }
      const path = [];
      if (found) {
        for (let c = goal; c !== -1; c = prev[c]) path.push({ x: c % W, y: (c / W) | 0 });
        path.reverse();
      }
      return { path, expanded, found };
    },

    // Multi-source BFS distance map (Int16Array, -1 = unreachable).
    distMap(m, sources, can, maxD) {
      const W = m.w, N = W * m.h;
      const dist = new Int16Array(N).fill(-1);
      const queue = [];
      for (const s of sources) {
        const k = s.y * W + s.x;
        if (k >= 0 && k < N && dist[k] < 0) { dist[k] = 0; queue.push(k); }
      }
      const buf = [];
      const lim = maxD == null ? 999 : maxD;
      for (let head = 0; head < queue.length; head++) {
        const cur = queue[head];
        if (dist[cur] >= lim) continue;
        const ns = nbrs(m, cur, can, buf);
        for (let i = 0; i < ns.length; i++) {
          const nk = ns[i];
          if (dist[nk] >= 0) continue;
          dist[nk] = dist[cur] + 1;
          queue.push(nk);
        }
      }
      return dist;
    },

    neighbors(m, x, y, can) {
      const out = [];
      for (const d of PM.DIR_LIST) {
        let nx = x + d.dx;
        const ny = y + d.dy;
        if (ny < 0 || ny >= m.h) continue;
        if (nx < 0 || nx >= m.w) {
          if (!m.tunnelRows.has(y)) continue;
          nx = m.wrapX(nx);
        }
        if (can(nx, ny)) out.push({ x: nx, y: ny, dir: d });
      }
      return out;
    },

    // Direction (object) to step from tile a to adjacent tile b, honouring tunnel wrap.
    dirTo(m, a, b) {
      let dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx > 1) dx = -1; else if (dx < -1) dx = 1;
      for (const d of PM.DIR_LIST) if (d.dx === dx && d.dy === dy) return d;
      return null;
    },
  };

  PM.Path = Path;
})(typeof window !== 'undefined' ? window : globalThis);
