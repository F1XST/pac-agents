(function (g) {
  'use strict';
  const PM = g.PM;
  const $ = (s) => document.querySelector(s);
  const CELL = 24;

  const Editor = {
    grid: null,
    tool: '#',
    painting: false,

    locked(x, y) { return (x >= 8 && x <= 12 && y >= 8 && y <= 10) || y === 0 || y === PM.H - 1; },

    load(rows) { this.grid = rows.map((r) => r.split('')); this.draw(); },
    rows() { return this.grid.map((r) => r.join('')); },

    open() {
      const saved = PM.Save.data.customMaze;
      this.load(saved || PM.MAZES.classic);
      this.msg('คลิก/ลากเพื่อวาด บ้านผีตรงกลางแก้ไขไม่ได้ เปิดช่องขอบซ้าย-ขวาของแถวเดียวกันเพื่อทำอุโมงค์วาร์ป', false);
    },

    msg(t, bad) {
      const el = $('#edMsg');
      el.textContent = t;
      el.style.color = bad === true ? '#ff9aa6' : bad === false ? '' : '#7ef0a8';
    },

    cellAt(e) {
      const c = $('#edCanvas'), r = c.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / r.width * PM.W);
      const y = Math.floor((e.clientY - r.top) / r.height * PM.H);
      return x >= 0 && y >= 0 && x < PM.W && y < PM.H ? { x, y } : null;
    },

    paint(x, y) {
      if (this.locked(x, y)) return;
      const t = this.tool, G = this.grid;
      if (G[y][x] === 'P' && t !== 'P') return;
      if (t === 'P') {
        for (const row of G) for (let i = 0; i < row.length; i++) if (row[i] === 'P') row[i] = ' ';
        G[y][x] = 'P';
      } else {
        G[y][x] = t;
        if ($('#edMirror').checked) {
          const mx = PM.W - 1 - x;
          if (!this.locked(mx, y) && G[y][mx] !== 'P') G[y][mx] = t;
        }
      }
      this.draw();
    },

    draw() {
      const c = $('#edCanvas');
      if (!c || !this.grid) return;
      const x = c.getContext('2d');
      x.fillStyle = '#04061c'; x.fillRect(0, 0, c.width, c.height);
      for (let y = 0; y < PM.H; y++) for (let i = 0; i < PM.W; i++) {
        const ch = this.grid[y][i], px = i * CELL, py = y * CELL;
        x.strokeStyle = 'rgba(120,150,255,0.08)'; x.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        switch (ch) {
          case '#':
            x.fillStyle = '#0d1f78'; x.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
            x.strokeStyle = '#2f7bff'; x.lineWidth = 2; x.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6); x.lineWidth = 1;
            break;
          case '.': x.fillStyle = '#ffe9b0'; x.beginPath(); x.arc(px + CELL / 2, py + CELL / 2, 2.4, 0, 6.3); x.fill(); break;
          case 'o': x.fillStyle = '#fff'; x.beginPath(); x.arc(px + CELL / 2, py + CELL / 2, 6.5, 0, 6.3); x.fill(); break;
          case 'P': x.fillStyle = '#ffe11a'; x.beginPath(); x.arc(px + CELL / 2, py + CELL / 2, 9, 0.5, 5.8); x.lineTo(px + CELL / 2, py + CELL / 2); x.fill(); break;
          case 'G': x.fillStyle = 'rgba(255,143,216,0.28)'; x.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); break;
          case '-': x.strokeStyle = '#ff9ae8'; x.lineWidth = 3; x.beginPath(); x.moveTo(px + 2, py + CELL / 2); x.lineTo(px + CELL - 2, py + CELL / 2); x.stroke(); x.lineWidth = 1; break;
          default: break;
        }
        if (this.locked(i, y) && ch !== '#') { x.fillStyle = 'rgba(255,255,255,0.04)'; x.fillRect(px, py, CELL, CELL); }
      }
      x.strokeStyle = 'rgba(255,143,216,0.6)'; x.setLineDash([5, 4]);
      x.strokeRect(8 * CELL + 1, 8 * CELL + 1, 5 * CELL - 2, 3 * CELL - 2); x.setLineDash([]);
    },

    check() {
      const err = PM.validateMaze(this.rows());
      if (err) { this.msg('❌ ' + err, true); return false; }
      const m = new PM.Maze(this.rows());
      this.msg('✅ แมพใช้ได้ — เม็ดทั้งหมด ' + m.totalDots + ' เม็ด', null);
      return true;
    },

    init() {
      const c = $('#edCanvas');
      c.addEventListener('pointerdown', (e) => {
        this.painting = true; c.setPointerCapture(e.pointerId);
        const p = this.cellAt(e); if (p) this.paint(p.x, p.y);
      });
      c.addEventListener('pointermove', (e) => { if (!this.painting) return; const p = this.cellAt(e); if (p) this.paint(p.x, p.y); });
      const stop = () => { this.painting = false; };
      c.addEventListener('pointerup', stop); c.addEventListener('pointercancel', stop);
      document.querySelectorAll('#edTools button').forEach((b) => {
        b.onclick = () => {
          this.tool = b.dataset.v;
          document.querySelectorAll('#edTools button').forEach((x) => x.classList.toggle('on', x === b));
        };
      });
      $('#edClassic').onclick = () => { this.load(PM.MAZES.classic); this.msg('โหลดแมพคลาสสิกแล้ว', null); };
      $('#edRandom').onclick = () => { this.load(PM.generateMaze(1 + Math.floor(Math.random() * 99999))); this.msg('สุ่มแมพใหม่แล้ว — แก้ไขต่อได้เลย', null); };
      $('#edFill').onclick = () => {
        for (let y = 1; y < PM.H - 1; y++) for (let x = 1; x < PM.W - 1; x++) {
          if (this.grid[y][x] === ' ' && !this.locked(x, y) && !(y === 9 && (x <= 4 || x >= 16))) this.grid[y][x] = '.';
        }
        this.draw(); this.msg('เติมเม็ดในทางว่างแล้ว', null);
      };
      $('#edCheck').onclick = () => this.check();
      $('#edSave').onclick = () => {
        if (!this.check()) return;
        PM.Save.data.customMaze = this.rows(); PM.Save.save();
        PM.UI.toast('💾 บันทึกแมพแล้ว');
      };
      $('#edPlay').onclick = () => {
        if (!this.check()) return;
        PM.Save.data.customMaze = this.rows();
        PM.Save.data.settings.map = 'custom';
        PM.Save.save();
        PM.UI.openSetup('play');
      };
    },
  };
  PM.Editor = Editor;
})(typeof window !== 'undefined' ? window : globalThis);
