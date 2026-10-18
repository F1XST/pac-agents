(function (g) {
  'use strict';
  const PM = g.PM;

  // Game rules & simulation. No rendering or DOM in here so it can also run headless
  // (the Compare Lab runs hundreds of these quickly).
  class World {
    constructor(o) {
      this.o = o || {};
      this.seed = this.o.seed || Math.floor(Math.random() * 1e9);
      this.rng = PM.makeRng(this.seed);
      this.gameMode = this.o.mode || 'play'; // play | 2p | ai | sim
      this.diff = PM.DIFFS[this.o.difficulty || 'normal'];
      this.coordination = this.o.coordination !== false;
      this.algo = this.o.algo || 'astar';
      this.ghostCount = PM.clamp(this.o.ghostCount || 4, 1, 4);
      this.upg = Object.assign({ life: 0, power: 0, speed: 0, magnet: 0 }, this.o.upgrades || {});
      this.aiPac = this.gameMode === 'ai' || this.gameMode === 'sim';
      this.listeners = [];
      this.level = 1;
      this.score = 0;
      this.time = 0;
      this.t = 0;
      this.runCoins = 0;
      this.lives = this.o.lives || this.diff.lives + (this.gameMode === 'play' || this.gameMode === '2p' ? this.upg.life : 0);
      this.maxLives = this.lives;
      this.shield = !!this.o.shield;
      this.freezeItems = this.o.freezeItems || 0;
      this.stats = { dots: 0, ghosts: 0, deaths: 0, expanded: 0, decisions: 0, coins: 0, fruits: 0, catches: 0 };
      this.mazeId = 0;
      this.finished = false;
      this.hitStop = 0;
      this.loadLevel();
    }

    on(fn) { this.listeners.push(fn); }
    emit(type, data) { for (const f of this.listeners) f(type, data || {}); }

    get earnsCoins() { return this.gameMode === 'play' || this.gameMode === '2p'; }
    get pacSpeed() { return 7.0 * (1 + 0.03 * (this.earnsCoins ? this.upg.speed : 0)); }
    get ghostSpeed() { return this.diff.ghostSpeed + Math.min(1.3, 0.12 * (this.level - 1)); }
    get frightDur() {
      const base = Math.max(2, this.diff.fright - 0.35 * (this.level - 1));
      return base * (1 + 0.12 * (this.earnsCoins ? this.upg.power : 0));
    }
    get magnetRadius() { return [0, 2.2, 3.5, 5][this.earnsCoins ? Math.min(3, this.upg.magnet || 0) : 0]; }

    nearestOpen(x, y) {
      const m = this.maze;
      x = PM.clamp(Math.round(x), 0, m.w - 1); y = PM.clamp(Math.round(y), 0, m.h - 1);
      for (let r = 0; r < 24; r++) {
        for (let dx = -r; dx <= r; dx++) {
          const dy = r - Math.abs(dx);
          for (const sy of dy === 0 ? [0] : [dy, -dy]) {
            const nx = x + dx, ny = y + sy;
            if (nx >= 0 && nx < m.w && ny >= 0 && ny < m.h && m.isOpen(nx, ny)) return { x: nx, y: ny };
          }
        }
      }
      return { x: m.pacStart.x, y: m.pacStart.y };
    }

    loadLevel() {
      const o = this.o;
      let rows;
      if (o.mapMode === 'random') rows = PM.generateMaze(this.seed + this.level * 7919);
      else rows = o.mazeRows || PM.MAZES.classic;
      this.maze = new PM.Maze(rows);
      this.mazeId++;
      this.phaseIdx = 0;
      this.phase = 'scatter';
      this.phaseTimer = this.diff.schedule[0];
      this.frightTimer = 0;
      this.freezeTimer = 0;
      this.invuln = 0;
      this.combo = 0;
      this.fruit = null;
      this.fruitsSpawned = 0;
      this.coinTokens = [];
      this.coinTimer = 8 + this.rng() * 6;
      this.levelDots = 0;
      this.pac = new PM.Pac(this);
      this.pacAI = new PM.PacAI(this);
      this.team = new PM.Team(this);
      this.ghosts = PM.GHOST_DEFS.slice(0, this.ghostCount).map((d, i) => new PM.Ghost(this, d, i));
      if (this.gameMode === '2p') this.ghosts[0].controlled = true;
      this.state = 'ready';
      this.timer = this.gameMode === 'sim' ? 0 : 2.2;
      this.emit('levelstart', { level: this.level });
    }

    nextLevel() {
      this.level++;
      this.score += 0;
      this.loadLevel();
    }

    resetActors() {
      this.pac.reset();
      for (const gh of this.ghosts) gh.reset();
      this.phaseIdx = 0; this.phase = 'scatter'; this.phaseTimer = this.diff.schedule[0];
      this.frightTimer = 0; this.freezeTimer = 0; this.combo = 0;
      for (const gh of this.ghosts) { gh.state = gh.index === 0 ? 'scatter' : gh.state; }
      this.state = 'ready';
      this.timer = this.gameMode === 'sim' ? 0 : 1.8;
      this.invuln = 1.5;
    }

    skipReady() { this.timer = 0; }

    setPlayerDir(n, dir) {
      if (n === 1) this.pac.setWant(dir);
      else if (this.ghosts[0] && this.ghosts[0].controlled) this.ghosts[0].setWant(dir);
    }

    useFreeze() {
      if (this.state !== 'playing' || this.freezeItems <= 0 || this.freezeTimer > 0) return false;
      this.freezeItems--;
      this.freezeTimer = 4;
      this.emit('freeze', { left: this.freezeItems });
      return true;
    }

    awardCoins(base, x, y) {
      if (!this.earnsCoins) return 0;
      const v = Math.max(1, Math.round(base * this.diff.coinMult));
      this.runCoins += v;
      this.stats.coins += v;
      this.emit('coinsEarned', { v, x, y });
      return v;
    }

    update(dt) {
      this.t += dt;
      if (this.hitStop > 0) { this.hitStop -= dt; return; }
      switch (this.state) {
        case 'ready':
          this.timer -= dt;
          for (const gh of this.ghosts) gh.bob += dt;
          if (this.timer <= 0) { this.state = 'playing'; this.emit('go'); }
          break;
        case 'playing': this.tick(dt); break;
        case 'dying':
          this.timer -= dt;
          if (this.timer <= 0) this.afterDeath();
          break;
        case 'levelclear':
          this.timer -= dt;
          if (this.timer <= 0) this.nextLevel();
          break;
        default: break;
      }
    }

    tick(dt) {
      this.time += dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.freezeTimer > 0) { this.freezeTimer -= dt; if (this.freezeTimer <= 0) this.emit('unfreeze'); }
      if (this.frightTimer > 0) {
        this.frightTimer -= dt;
        if (this.frightTimer <= 0) this.endFright();
      } else {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.nextPhase();
      }
      this.pac.update(dt);
      for (const gh of this.ghosts) gh.update(dt);
      this.team.update(dt);
      this.checkCollisions();
      this.updatePickups(dt);
    }

    nextPhase() {
      const sch = this.diff.schedule;
      this.phaseIdx = Math.min(this.phaseIdx + 1, sch.length - 1);
      this.phase = this.phaseIdx % 2 === 0 ? 'scatter' : 'chase';
      this.phaseTimer = sch[this.phaseIdx];
      for (const gh of this.ghosts) {
        if (gh.state === 'scatter' || gh.state === 'chase') { gh.state = this.phase; gh.flipNext = true; }
      }
      this.emit('phase', { phase: this.phase });
    }

    startFright() {
      this.frightTimer = this.frightDur;
      this.combo = 0;
      for (const gh of this.ghosts) {
        if (gh.state === 'scatter' || gh.state === 'chase') { gh.state = 'frightened'; gh.flipNext = true; gh.role = 'FRIGHT'; }
        else if (gh.state === 'frightened') gh.role = 'FRIGHT';
      }
    }

    endFright() {
      this.frightTimer = 0;
      for (const gh of this.ghosts) if (gh.state === 'frightened') { gh.state = this.phase; gh.role = this.phase.toUpperCase(); }
      this.emit('frightEnd');
    }

    onPacTile(x, y) {
      const c = this.maze.eat(x, y);
      if (c === '.') {
        this.score += 10; this.stats.dots++; this.levelDots++;
        this.emit('dot', { x, y });
        if (this.stats.dots % 25 === 0) this.awardCoins(1, x, y);
      } else if (c === 'o') {
        this.score += 50; this.stats.dots++; this.levelDots++;
        this.startFright();
        this.emit('pellet', { x, y });
      }
      if (c) {
        if (this.levelDots === 70 || this.levelDots === 150) this.spawnFruit();
        if (this.maze.dotsLeft <= 0) { this.state = 'levelclear'; this.timer = 2.2; this.emit('levelclear', { level: this.level }); this.onLevelClear(); }
      }
      const f = this.fruit;
      if (f && f.x === x && f.y === y) {
        this.score += f.def.pts; this.stats.fruits++;
        this.awardCoins(4, x, y);
        this.emit('fruit', { x, y, def: f.def });
        this.fruit = null;
      }
    }

    onLevelClear() {
      this.awardCoins(8 + this.level * 2, this.pac.px, this.pac.py);
      this.score += 500 * this.level;
    }

    spawnFruit() {
      const def = PM.FRUITS[Math.min(this.level - 1, PM.FRUITS.length - 1)];
      const s = this.maze.pacStart;
      this.fruit = { x: s.x, y: s.y, def, ttl: 11 };
      this.emit('fruitSpawn', { x: s.x, y: s.y, def });
    }

    spawnCoin() {
      if (!this.earnsCoins) return;
      const open = this.team.open.filter((t) => {
        const d = this.team.pacDist ? this.team.pacDist[t.k] : 10;
        return d >= 6 && !this.coinTokens.some((c) => c.x === t.x && c.y === t.y);
      });
      if (!open.length) return;
      const t = this.rng.pick(open);
      const big = this.rng() < 0.2;
      this.coinTokens.push({ x: t.x, y: t.y, px: t.x, py: t.y, v: big ? 3 : 1, ttl: 11, age: 0 });
      this.emit('coinSpawn', { x: t.x, y: t.y });
    }

    updatePickups(dt) {
      if (this.fruit) { this.fruit.ttl -= dt; if (this.fruit.ttl <= 0) this.fruit = null; }
      this.coinTimer -= dt;
      if (this.coinTimer <= 0 && this.coinTokens.length < 2) { this.spawnCoin(); this.coinTimer = 12 + this.rng() * 8; }
      else if (this.coinTimer <= 0) this.coinTimer = 6;
      const pac = this.pac;
      const rad = this.magnetRadius;
      for (let i = this.coinTokens.length - 1; i >= 0; i--) {
        const c = this.coinTokens[i];
        c.ttl -= dt; c.age += dt;
        const dx = pac.px - c.px, dy = pac.py - c.py;
        const dist = Math.hypot(dx, dy);
        if (rad > 0 && dist < rad && dist > 0.01) {
          const sp = 9 * dt;
          c.px += (dx / dist) * Math.min(sp, dist);
          c.py += (dy / dist) * Math.min(sp, dist);
        }
        if (dist < 0.65) {
          const v = this.awardCoins(c.v, c.px, c.py);
          this.stats.coinsPicked = (this.stats.coinsPicked || 0) + 1;
          this.emit('coinPick', { x: c.px, y: c.py, v });
          this.coinTokens.splice(i, 1);
        } else if (c.ttl <= 0) this.coinTokens.splice(i, 1);
      }
    }

    wrapDist(a, b) {
      let dx = Math.abs(((a.px % this.maze.w) + this.maze.w) % this.maze.w - ((b.px % this.maze.w) + this.maze.w) % this.maze.w);
      dx = Math.min(dx, this.maze.w - dx);
      return Math.hypot(dx, a.py - b.py);
    }

    checkCollisions() {
      const pac = this.pac;
      for (const gh of this.ghosts) {
        if (gh.state === 'house' || gh.state === 'eaten' || gh.state === 'leaving') continue;
        if (this.wrapDist(pac, gh) > 0.62) continue;
        if (gh.state === 'frightened') {
          gh.state = 'eaten'; gh.role = 'RETURN';
          const pts = 200 * Math.pow(2, this.combo);
          this.combo = Math.min(this.combo + 1, 3);
          this.score += pts; this.stats.ghosts++;
          this.awardCoins(2, gh.px, gh.py);
          this.hitStop = 0.18;
          this.emit('ghostEaten', { x: gh.px, y: gh.py, pts, gh });
        } else {
          if (this.invuln > 0) continue;
          if (this.shield) {
            this.shield = false;
            this.invuln = 2.2;
            this.emit('shield', {});
            continue;
          }
          this.stats.catches++;
          this.die(gh);
          return;
        }
      }
    }

    die(by) {
      this.state = 'dying';
      this.timer = this.gameMode === 'sim' ? 0 : 1.7;
      this.stats.deaths++;
      this.lives--;
      this.emit('death', { x: this.pac.px, y: this.pac.py, by });
    }

    afterDeath() {
      if (this.lives <= 0) this.finish();
      else this.resetActors();
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      this.state = 'gameover';
      let bonus = 0;
      if (this.earnsCoins) {
        bonus = Math.floor((this.score / 500) * this.diff.coinMult);
        this.runCoins += bonus;
      }
      this.summary = {
        score: this.score, level: this.level, dots: this.stats.dots, ghosts: this.stats.ghosts,
        coins: this.runCoins, bonus, time: this.time, deaths: this.stats.deaths, fruits: this.stats.fruits,
        catches: this.stats.catches,
      };
      this.emit('gameover', this.summary);
    }
  }

  PM.World = World;

  // Headless trial used by the Compare Lab. Lives = 1; returns when Pac-Man is caught or time runs out.
  PM.runTrial = function (cfg) {
    const mapRows = cfg.mapMode === 'random' ? PM.generateMaze(cfg.seed) : PM.MAZES.classic;
    const w = new World({
      mode: 'sim', difficulty: cfg.difficulty, coordination: cfg.coordination, algo: cfg.algo,
      ghostCount: cfg.ghostCount, mazeRows: mapRows, seed: cfg.seed, lives: 1,
    });
    const dt = 1 / 40;
    const cap = cfg.cap || 90;
    let steps = 0;
    while (w.state !== 'gameover' && w.time < cap && steps < cap * 60) {
      w.update(dt);
      steps++;
    }
    return {
      survived: w.time, caught: w.state === 'gameover' || w.state === 'dying', dots: w.stats.dots,
      expanded: w.stats.expanded, decisions: w.stats.decisions, level: w.level,
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
