(function (g) {
  'use strict';
  const PM = g.PM;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const ROLE_DESC = {
    HUNTER: 'ไล่ตามตรงๆ', INTERCEPTOR: 'ดักข้างหน้า Pac-Man', FLANKER: 'อ้อมไปตัดทางหนี', BLOCKER: 'ยึดพาวเวอร์/ปิดอีกฝั่ง',
    TRACKER: 'ตามจุดที่เห็นล่าสุด', SWEEP: 'กวาดพื้นที่ที่ยังไม่เห็น', SCATTER: 'กลับไปมุมประจำตัว', FRIGHT: 'กลัว — เดินมั่ว',
    RETURN: 'ตาย — กลับบ้าน', CHASER: 'บุคลิก: ไล่ตรง', AMBUSHER: 'บุคลิก: ดักซุ่ม', SHY: 'บุคลิก: ขี้อาย',
    WANDER: 'ไม่เห็น Pac — เดินสุ่ม', 'CHASE-MEM': 'ตามความจำล่าสุด', HOUSE: 'รออยู่ในบ้าน', LEAVING: 'ออกจากบ้าน', CHASE: 'ไล่ล่า',
  };

  const App = {
    world: null, renderer: null, mode: 'play', paused: false, speed: 1, attract: true, banked: true,
    last: 0, insAcc: 0, hudCache: {}, overTimer: null, audioUnlocked: false,

    init() {
      PM.Save.load();
      const st = PM.Save.data.settings;
      PM.Audio.sfxVol = st.sfx; PM.Audio.musVol = st.music;
      this.canvas = $('#game');
      this.renderer = new PM.Renderer(this.canvas);
      PM.UI.init(); PM.Lab.init(); PM.Editor.init();
      this.bindInput();
      this.startAttract();
      PM.UI.refreshMenu();
      requestAnimationFrame((t) => this.frame(t));
    },

    // ------------------------------------------------------------------ world creation
    buildWorld(mode) {
      const S = PM.Save.data, st = S.settings;
      let mapMode = 'fixed', rows = PM.MAZES.classic;
      if (st.map === 'random') mapMode = 'random';
      else if (st.map === 'custom' && S.customMaze) rows = S.customMaze;
      return new PM.World({
        mode, difficulty: st.difficulty, coordination: st.coordination, algo: st.algo, ghostCount: st.ghostCount,
        mapMode, mazeRows: rows, seed: st.map === 'random' ? st.seed : undefined, upgrades: S.upgrades,
        shield: mode !== 'ai' && st.useShield && (S.items.shield || 0) > 0,
        freezeItems: mode === 'ai' ? 0 : (S.items.freeze || 0),
      });
    },

    startAttract() {
      clearTimeout(this.overTimer);
      this.attract = true;
      this.mode = 'ai';
      this.world = new PM.World({ mode: 'ai', difficulty: 'normal', coordination: true, algo: 'astar', ghostCount: 4, mazeRows: PM.MAZES.classic });
      this.world.skipReady();
      this.renderer.clearFx();
      this.renderer.setCosmetics();
      $('#inspector').classList.remove('show');
    },

    start(mode) {
      this.bankRun();
      clearTimeout(this.overTimer);
      this.mode = mode;
      this.attract = false;
      this.paused = false;
      this.banked = false;
      this.speed = 1;
      $('#pauseOv').classList.remove('show');
      this.world = this.buildWorld(mode);
      this.world.on((t, d) => this.onEvent(t, d));
      this.renderer.clearFx();
      this.renderer.setCosmetics();
      this.hudCache = {};
      PM.UI.hideAll();

      const st = PM.Save.data.settings, d = PM.DIFFS[st.difficulty];
      const mapName = { classic: 'คลาสสิก', random: 'สุ่ม #' + st.seed, custom: 'แมพของคุณ' }[st.map];
      $('#modeTag').textContent = d.name + ' · ' + (st.coordination ? 'ประสานงาน' : 'อิสระ') + ' · ' + st.algo.toUpperCase() + ' · ' + st.ghostCount + ' ผี · ' + mapName;
      $('#speedBar').classList.toggle('show', mode === 'ai');
      $$('#speedBar .chip').forEach((c) => c.classList.toggle('on', c.dataset.speed === '1'));
      $('#hint').textContent = {
        play: 'ลูกศร/WASD เดิน · Space แช่แข็งผี · P พักเกม · B ดูสมองผี',
        '2p': 'P1 (WASD) คุม Pac-Man · P2 (ลูกศร) คุมผี Blinky สีแดง',
        ai: 'AI เล่นเอง — กด B เพื่อดูเส้นทางและบทบาทที่ผีวางแผน',
      }[mode];
      this.applyDebug();
      PM.Audio.stopMusic();
      PM.Audio.startMusic('normal');
      PM.Audio.sfx('ready');
      this.banner('LEVEL 1');
    },

    // ------------------------------------------------------------------ run bookkeeping
    bankRun() {
      const w = this.world;
      if (!w || this.attract || this.banked) return;
      this.banked = true;
      if (!w.earnsCoins) return;
      const S = PM.Save;
      if (w.runCoins > 0) S.addCoins(w.runCoins); else S.save();
      const st = S.data.stats;
      st.runs++; st.dots += w.stats.dots; st.ghosts += w.stats.ghosts; st.deaths += w.stats.deaths;
      st.playTime += w.time; st.bestLevel = Math.max(st.bestLevel, w.level);
      S.save();
    },

    showOver() {
      const w = this.world;
      if (!w || this.attract) return;
      const s = w.summary || { score: w.score, level: w.level, dots: w.stats.dots, ghosts: w.stats.ghosts, coins: w.runCoins, bonus: 0, time: w.time, catches: w.stats.catches };
      this.bankRun();
      const diff = PM.DIFFS[PM.Save.data.settings.difficulty];
      let newBest = false;
      if (this.mode === 'play') {
        const best = PM.Save.data.stats.best;
        if (s.score > (best[diff.id] || 0)) { newBest = s.score > 0; best[diff.id] = s.score; PM.Save.save(); }
      }
      const titles = { play: 'GAME OVER', '2p': '👻 ผี P2 ชนะ!', ai: '🤖 AI ถูกจับ' };
      const notes = {
        '2p': 'ผี P2 จับ Pac-Man ได้ ' + s.catches + ' ครั้ง · Pac-Man (P1) ทำคะแนนได้ ' + s.score,
        ai: 'ผีแบบ "' + (w.coordination ? 'ประสานงาน' : 'อิสระ') + '" จับ AI Pac-Man ได้ในวินาทีที่ ' + Math.round(s.time) + ' — ลองไปห้องทดลองเพื่อเปรียบเทียบเป็นสถิติ',
      };
      PM.Audio.stopMusic();
      PM.UI.showOver({ summary: s, title: titles[this.mode], earns: w.earnsCoins, newBest, diffName: diff.name, note: notes[this.mode] });
    },

    // ------------------------------------------------------------------ world events -> audio / fx / ui
    onEvent(t, d) {
      const R = this.renderer, A = PM.Audio, w = this.world;
      switch (t) {
        case 'dot': A.sfx('waka'); R.addBurst(d.x, d.y, '#ffe9b0', 2, 45, 'spark'); break;
        case 'pellet': A.sfx('power'); R.flash = 0.25; R.shake = 5; A.setMusicMode('fright'); R.addBurst(d.x, d.y, '#ffffff', 14, 130, 'spark'); break;
        case 'frightEnd': A.setMusicMode('normal'); break;
        case 'ghostEaten': A.sfx('eatGhost'); R.addBurst(d.x, d.y, '#6a7bff', 18, 160, 'spark'); R.addFloat(d.x, d.y, String(d.pts), '#7fe0ff'); R.shake = 4; break;
        case 'death': A.sfx('death'); A.stopMusic(); R.shake = 10; R.addBurst(d.x, d.y, '#ffe11a', 28, 170, 'spark'); break;
        case 'go': A.startMusic(w.frightTimer > 0 ? 'fright' : 'normal'); break;
        case 'levelstart': if (d.level > 1) { this.banner('LEVEL ' + d.level); A.sfx('ready'); A.startMusic('normal'); } break;
        case 'levelclear': A.sfx('level'); A.stopMusic(); R.addConfetti(80); this.banner('LEVEL CLEAR!'); break;
        case 'fruit': A.sfx('fruit'); R.addFloat(d.x, d.y, '+' + d.def.pts + ' ' + d.def.icon, '#ff9ae8'); R.addBurst(d.x, d.y, '#ff9ae8', 14, 120, 'spark'); break;
        case 'coinPick': A.sfx('coin'); R.addBurst(d.x, d.y, '#ffd23f', 14, 120, 'spark'); R.addFloat(d.x, d.y, '+' + d.v + ' 💰', '#ffd23f'); break;
        case 'coinSpawn': A.sfx('coinSpawn'); break;
        case 'shield': A.sfx('shield'); R.flash = 0.35; PM.Save.useItem('shield'); R.addFloat(w.pac.px, w.pac.py, 'SHIELD!', '#7fe0ff'); break;
        case 'freeze': A.sfx('freeze'); PM.Save.useItem('freeze'); this.banner('FREEZE!'); break;
        case 'gameover':
          A.sfx('over'); A.stopMusic();
          clearTimeout(this.overTimer);
          this.overTimer = setTimeout(() => this.showOver(), 1000);
          break;
        default: break;
      }
    },

    banner(text) {
      const b = $('#banner');
      b.textContent = text;
      b.classList.remove('show');
      void b.offsetWidth;
      b.classList.add('show');
    },

    // ------------------------------------------------------------------ UI helpers
    onScreenChange(id) {
      if (id === 'scrMenu') {
        if (!this.attract) this.startAttract();
        PM.Audio.stopMusic();
        if (PM.Audio.ctx) PM.Audio.startMusic('menu');
      } else if (id === 'scrOver') {
        /* music already stopped */
      }
    },

    setPaused(p) {
      if (this.attract || !this.world || this.world.state === 'gameover' || PM.UI.isOpen()) return;
      this.paused = p;
      $('#pauseOv').classList.toggle('show', p);
      if (p) PM.Audio.stopMusic();
      else if (this.world.state === 'playing') PM.Audio.startMusic(this.world.frightTimer > 0 ? 'fright' : 'normal');
    },

    applyDebug() {
      const on = !!PM.Save.data.settings.debug && !this.attract;
      $('#inspector').classList.toggle('show', on);
      $('#btnDebug').classList.toggle('on', on);
    },

    toggleMute() {
      PM.Audio.setMuted(!PM.Audio.muted);
      $('#btnMute').textContent = PM.Audio.muted ? '🔇' : '🔊';
    },

    sendDir(who, name) {
      if (this.attract || !this.world || this.paused || this.mode === 'ai') return;
      this.world.setPlayerDir(who, PM.DIR[name]);
    },

    bindInput() {
      const KEYS = {
        ArrowUp: ['up', 2], ArrowDown: ['down', 2], ArrowLeft: ['left', 2], ArrowRight: ['right', 2],
        w: ['up', 1], s: ['down', 1], a: ['left', 1], d: ['right', 1],
      };
      const unlock = () => {
        if (this.audioUnlocked) return;
        this.audioUnlocked = true;
        PM.Audio.init();
        PM.Audio.setVolumes(PM.Save.data.settings.sfx, PM.Save.data.settings.music);
        if (PM.UI.current === 'scrMenu') PM.Audio.startMusic('menu');
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', (e) => {
        unlock();
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'Escape') {
          if (PM.UI.isOpen()) { if (PM.UI.current !== 'scrMenu' && PM.UI.current !== 'scrOver') PM.UI.back(); }
          else this.setPaused(!this.paused);
          return;
        }
        if (PM.UI.isOpen()) return;
        if (k === 'p') { this.setPaused(!this.paused); return; }
        if (k === 'b') { PM.Save.data.settings.debug = !PM.Save.data.settings.debug; PM.Save.save(); this.applyDebug(); return; }
        if (k === 'm') { this.toggleMute(); return; }
        if (k === ' ') { e.preventDefault(); if (this.world && !this.paused && !this.attract) this.world.useFreeze(); return; }
        const m = KEYS[k];
        if (m) {
          e.preventDefault();
          let who = m[1];
          if (this.mode !== '2p') who = 1;
          this.sendDir(who, m[0]);
        }
      });

      let sx = 0, sy = 0;
      this.canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
      this.canvas.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        this.sendDir(1, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      }, { passive: true });
      $$('#dpad button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.sendDir(1, b.dataset.dir); }));

      $('#btnPause').onclick = () => this.setPaused(!this.paused);
      $('#btnMute').onclick = () => this.toggleMute();
      $('#btnDebug').onclick = () => { PM.Save.data.settings.debug = !PM.Save.data.settings.debug; PM.Save.save(); this.applyDebug(); };
      $('#btnFreeze').onclick = () => { if (this.world && !this.attract && !this.paused) this.world.useFreeze(); };
      $('#pResume').onclick = () => this.setPaused(false);
      $('#pRestart').onclick = () => { this.paused = false; this.start(this.mode); };
      $('#pMenu').onclick = () => { this.bankRun(); this.paused = false; $('#pauseOv').classList.remove('show'); PM.UI.show('scrMenu'); };
      $$('#speedBar .chip').forEach((c) => (c.onclick = () => {
        this.speed = +c.dataset.speed;
        $$('#speedBar .chip').forEach((x) => x.classList.toggle('on', x === c));
      }));
      $('#oAgain').onclick = () => this.start(this.mode);
      $('#oMenu').onclick = () => PM.UI.show('scrMenu');
      $('#oShop').onclick = () => PM.UI.openShop();
      document.addEventListener('visibilitychange', () => { if (document.hidden && !this.attract && !PM.UI.isOpen()) this.setPaused(true); });
    },

    // ------------------------------------------------------------------ HUD & inspector
    setText(id, v) {
      if (this.hudCache[id] === v) return;
      this.hudCache[id] = v;
      $('#' + id).textContent = v;
    },

    hud() {
      const w = this.world, S = PM.Save, diff = PM.DIFFS[S.data.settings.difficulty];
      this.setText('hScore', w.score);
      this.setText('hHi', Math.max(w.score, S.data.stats.best[diff.id] || 0));
      this.setText('hLevel', w.level);
      this.setText('hLives', w.lives > 0 ? '♥'.repeat(Math.min(w.lives, 9)) : '–');
      this.setText('hCoins', w.earnsCoins ? S.coins + w.runCoins : S.coins);
      this.setText('cShield', S.data.items.shield || 0);
      this.setText('cFreeze', w.freezeItems);
      $('#btnShield').classList.toggle('on', !!w.shield);
      $('#btnFreeze').disabled = w.freezeItems <= 0 || this.mode === 'ai';
    },

    inspector() {
      const w = this.world, R = this.renderer, T = w.team;
      const colors = R.ghostSkin.colors;
      const badge = (txt, cls) => '<span class="badge ' + (cls || '') + '">' + txt + '</span>';
      let h = '<h3>AGENT INSPECTOR</h3><div class="ins-badges">' +
        badge(w.coordination ? '🤝 ประสานงาน' : '👤 อิสระ', w.coordination ? 'on' : 'off') +
        badge('หาทาง: ' + w.algo.toUpperCase()) +
        badge('มองเห็น: ' + (w.diff.vision >= 99 ? 'ทั้งแมพ' : w.diff.vision + ' ช่อง')) +
        badge(w.frightTimer > 0 ? '😱 ผีกลัว ' + w.frightTimer.toFixed(1) + 's' : (w.phase === 'chase' ? '🔥 ไล่ล่า' : '🌿 กระจายตัว') + (isFinite(w.phaseTimer) ? ' ' + Math.max(0, w.phaseTimer).toFixed(0) + 's' : '')) +
        badge(w.coordination ? (T.isKnown() ? '👁 ทีมรู้ตำแหน่ง Pac' : '❓ ทีมไม่เห็น Pac') : '— ไม่มีการสื่อสาร', T.isKnown() && w.coordination ? 'on' : '') +
        '</div>';
      for (const gh of w.ghosts) {
        const col = colors[gh.index % colors.length];
        const role = gh.role || gh.state.toUpperCase();
        const tgt = gh.target ? '(' + gh.target.x + ',' + gh.target.y + ')' : '—';
        h += '<div class="gcard" style="border-left-color:' + col + '"><div class="top"><span style="color:' + col + '">●</span>' + gh.def.name +
          (gh.controlled ? ' <small>(P2)</small>' : '') + '<span class="role">' + role + '</span></div><div class="sub">' +
          (ROLE_DESC[role] || gh.def.label) + '<br>เป้าหมาย ' + tgt + ' · เส้นทาง ' + (gh.path ? Math.max(0, gh.path.length - 1) : 0) +
          ' ช่อง · ขยายโหนด ' + (gh.lastExpanded || 0) + (gh.sees ? ' · 👁 เห็น Pac' : '') + '</div></div>';
      }
      if (w.coordination) {
        h += '<h3 style="margin-top:10px">MESSAGE BOARD</h3><div class="msglog">';
        const log = T.log.slice(-10).reverse();
        if (!log.length) h += '<div class="t">ยังไม่มีข้อความ…</div>';
        for (const m of log) h += '<div class="' + m.type + '"><span class="t">' + PM.fmtTime(m.t) + '</span> <b>' + m.from + '</b>: ' + m.text + '</div>';
        h += '</div>';
      } else {
        h += '<p class="muted">โหมดอิสระ: ผีแต่ละตัวเห็นเฉพาะรอบตัว ไม่แชร์ข้อมูล ใช้บุคลิกของตัวเองเท่านั้น</p>';
      }
      $('#inspector').innerHTML = h;
    },

    // ------------------------------------------------------------------ main loop
    frame(ts) {
      const dt = Math.min(0.05, (ts - this.last) / 1000 || 0.016);
      this.last = ts;
      const w = this.world;
      if (w) {
        if (!this.paused) {
          let rem = dt * (this.mode === 'ai' && !this.attract ? this.speed : 1);
          while (rem > 1e-6) { const s = Math.min(rem, 1 / 60); w.update(s); rem -= s; }
        }
        const debug = !this.attract && !!PM.Save.data.settings.debug;
        this.renderer.render(w, this.paused ? 0 : dt, { debug });
        if (!this.attract) {
          this.hud();
          this.insAcc += dt;
          if (debug && this.insAcc > 0.18) { this.insAcc = 0; this.inspector(); }
        } else if (w.state === 'gameover') this.startAttract();
      }
      PM.UI.anim(ts);
      requestAnimationFrame((t) => this.frame(t));
    },
  };

  PM.App = App;
  App.init();
})(typeof window !== 'undefined' ? window : globalThis);
