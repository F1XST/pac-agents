(function (g) {
  'use strict';
  const PM = (g.PM = g.PM || {});

  PM.W = 21;
  PM.H = 21;

  const D = {
    up: { dx: 0, dy: -1, name: 'up', a: -Math.PI / 2 },
    left: { dx: -1, dy: 0, name: 'left', a: Math.PI },
    down: { dx: 0, dy: 1, name: 'down', a: Math.PI / 2 },
    right: { dx: 1, dy: 0, name: 'right', a: 0 },
  };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  PM.DIR = D;
  PM.DIR_LIST = [D.up, D.left, D.down, D.right];
  PM.opposite = (d) => (d ? D[OPP[d.name]] : null);

  PM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PM.lerp = (a, b, t) => a + (b - a) * t;

  // Small seeded RNG (mulberry32) so random mazes can be shared by seed.
  PM.makeRng = function (seed) {
    let s = (seed >>> 0) || 1;
    const r = function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    return r;
  };

  PM.fmtTime = function (s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };

  // Hex colour helpers used by the renderer and the shop previews.
  PM.shade = function (hex, amt) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) {
      r += (255 - r) * amt; gg += (255 - gg) * amt; b += (255 - b) * amt;
    } else {
      r *= 1 + amt; gg *= 1 + amt; b *= 1 + amt;
    }
    return 'rgb(' + Math.round(r) + ',' + Math.round(gg) + ',' + Math.round(b) + ')';
  };

  PM.DIFFS = {
    easy: {
      id: 'easy', name: 'ง่าย', icon: '🌱', desc: 'ผีช้า มองเห็นไม่ไกล พลาดบ่อย ชีวิตเยอะ',
      lives: 5, ghostSpeed: 4.9, fright: 9, vision: 6, errRate: 0.35, coinMult: 0.6,
      schedule: [9, 10, 9, 10, 9, 10, 9, Infinity], release: [0, 4, 9, 14],
    },
    normal: {
      id: 'normal', name: 'ปกติ', icon: '⚡', desc: 'สมดุล เหมาะกับการเล่นทั่วไป',
      lives: 3, ghostSpeed: 5.9, fright: 7, vision: 9, errRate: 0.1, coinMult: 1,
      schedule: [7, 20, 7, 20, 5, 20, 5, Infinity], release: [0, 2.5, 6, 10],
    },
    hard: {
      id: 'hard', name: 'ยาก', icon: '🔥', desc: 'ผีเร็ว มองเห็นไกล ประสานงานแม่นขึ้น',
      lives: 3, ghostSpeed: 6.5, fright: 5, vision: 13, errRate: 0.02, coinMult: 1.6,
      schedule: [5, 25, 5, 25, 4, 30, 4, Infinity], release: [0, 1.5, 4, 7],
    },
    insane: {
      id: 'insane', name: 'โหด', icon: '💀', desc: 'ผีรู้ตำแหน่งตลอด ความเร็วเท่า Pac-Man เหรียญคูณสูงสุด',
      lives: 2, ghostSpeed: 6.8, fright: 3.5, vision: 99, errRate: 0, coinMult: 2.5,
      schedule: [3, 30, 3, 40, 2, 60, 2, Infinity], release: [0, 1, 2.5, 4],
    },
  };
  PM.DIFF_ORDER = ['easy', 'normal', 'hard', 'insane'];

  PM.GHOST_DEFS = [
    { id: 'blinky', name: 'Blinky', persona: 'chaser', label: 'นักไล่ล่า', corner: { x: 19, y: 1 } },
    { id: 'pinky', name: 'Pinky', persona: 'ambusher', label: 'นักดักซุ่ม', corner: { x: 1, y: 1 } },
    { id: 'inky', name: 'Inky', persona: 'flanker', label: 'นักโอบล้อม', corner: { x: 19, y: 19 } },
    { id: 'clyde', name: 'Clyde', persona: 'shy', label: 'ขี้อาย', corner: { x: 1, y: 19 } },
  ];

  PM.FRUITS = [
    { name: 'เชอร์รี่', pts: 100, icon: '🍒' },
    { name: 'สตรอว์เบอร์รี่', pts: 300, icon: '🍓' },
    { name: 'ส้ม', pts: 500, icon: '🍊' },
    { name: 'แอปเปิล', pts: 700, icon: '🍎' },
    { name: 'แตงโม', pts: 1000, icon: '🍉' },
    { name: 'ดาว', pts: 2000, icon: '⭐' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
