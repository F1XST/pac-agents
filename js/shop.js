(function (g) {
  'use strict';
  const PM = g.PM;

  // ---------------- Cosmetic & upgrade catalogue ----------------
  PM.PAC_SKINS = {
    classic: { name: 'Classic', price: 0, color: '#ffe11a', desc: 'สีเหลืองสุดคลาสสิก' },
    strawberry: { name: 'Strawberry', price: 120, color: '#ff4d6d', desc: 'หวานแต่ไม่ยอมแพ้' },
    ocean: { name: 'Ocean', price: 120, color: '#3ad7ff', desc: 'เย็นสบายสีฟ้า' },
    lime: { name: 'Lime', price: 150, color: '#a6ff3a', desc: 'สดชื่นสะท้านใจ' },
    shades: { name: 'Cool Shades', price: 220, color: '#ffe11a', acc: 'glasses', desc: 'แว่นดำสุดเท่' },
    sakura: { name: 'Sakura', price: 260, color: '#ffb3d9', acc: 'bow', desc: 'โบว์น่ารักสีชมพู' },
    kitty: { name: 'Kitty', price: 320, color: '#ffa24a', acc: 'ears', desc: 'หูแมวสุดคิวท์' },
    gentleman: { name: 'Gentleman', price: 450, color: '#f4f4f4', acc: 'hat', desc: 'สุภาพบุรุษหมวกทรงสูง' },
    royal: { name: 'Royal Gold', price: 650, color: '#ffd23f', acc: 'crown', desc: 'ราชามงกุฎทอง' },
    galaxy: { name: 'Rainbow Galaxy', price: 900, rainbow: true, acc: 'crown', desc: 'สีรุ้งเปลี่ยนตลอดเวลา' },
  };

  PM.GHOST_SKINS = {
    classic: { name: 'Classic', price: 0, colors: ['#ff3b3b', '#ff8fd8', '#37e6ff', '#ffb347'], desc: 'สีดั้งเดิม' },
    pastel: { name: 'Pastel', price: 200, colors: ['#ff9aa2', '#ffb7ff', '#9ad8ff', '#ffe0a0'], desc: 'ผีสีพาสเทลหวานๆ' },
    shadow: { name: 'Shadow', price: 260, colors: ['#8b8fa8', '#6c7090', '#a0a4bf', '#585c78'], desc: 'ผีเงามืดสีเทาเข้ม' },
    candy: { name: 'Candy', price: 320, colors: ['#ff5fa2', '#c06bff', '#5fd8ff', '#ffd95f'], ears: true, desc: 'ผีลูกอมมีหูแมว' },
    robot: { name: 'Robo', price: 520, colors: ['#e5484d', '#f0a020', '#35c46a', '#4a8fff'], shape: 'square', desc: 'ผีหุ่นยนต์ตัวเหลี่ยม' },
    inferno: { name: 'Inferno', price: 760, colors: ['#ff2d1a', '#ff6a00', '#ffb300', '#ffe14d'], flame: true, desc: 'ผีเปลวไฟ' },
  };

  PM.THEMES = {
    neon: { name: 'Neon Blue', price: 0, wall: '#2f7bff', fill: '#08144a', bg1: '#0b1240', bg2: '#03040f', dot: '#ffe9b0', pellet: '#ffffff', glow: '#2f7bff', desc: 'นีออนฟ้าคลาสสิก' },
    sunset: { name: 'Sunset', price: 200, wall: '#ff4fa3', fill: '#2c0a3a', bg1: '#35104a', bg2: '#0b0212', dot: '#ffd1a0', pellet: '#fff0c0', glow: '#ff4fa3', desc: 'พระอาทิตย์ตกสีชมพู' },
    matrix: { name: 'Matrix', price: 300, wall: '#18ff6d', fill: '#02260f', bg1: '#032611', bg2: '#010a04', dot: '#b8ffcf', pellet: '#eafff1', glow: '#18ff6d', desc: 'เขียวมาทริกซ์' },
    ice: { name: 'Ice Cave', price: 300, wall: '#8fe9ff', fill: '#0c2d44', bg1: '#0f3552', bg2: '#030c14', dot: '#ffffff', pellet: '#e0f8ff', glow: '#8fe9ff', desc: 'ถ้ำน้ำแข็ง' },
    candy: { name: 'Candy Land', price: 420, wall: '#ff9ae8', fill: '#3b1456', bg1: '#4a1a66', bg2: '#10041a', dot: '#fff3b0', pellet: '#ffffff', glow: '#ff9ae8', desc: 'ดินแดนลูกกวาด' },
    gold: { name: 'Gold Vault', price: 800, wall: '#ffcf3f', fill: '#2b1d03', bg1: '#33250a', bg2: '#0a0600', dot: '#fff2c2', pellet: '#ffffff', glow: '#ffcf3f', desc: 'ห้องนิรภัยสีทอง' },
  };

  PM.FX = {
    none: { name: 'ไม่มี', price: 0, desc: 'เรียบๆ' },
    sparkle: { name: 'Sparkle', price: 150, desc: 'ประกายระยิบระยับ' },
    bubbles: { name: 'Bubbles', price: 300, desc: 'ฟองสบู่ลอย' },
    hearts: { name: 'Hearts', price: 350, desc: 'หัวใจลอยตามหลัง' },
    rainbow: { name: 'Rainbow', price: 450, desc: 'ทางสีรุ้ง' },
    flame: { name: 'Flame', price: 550, desc: 'เปลวไฟร้อนแรง' },
  };

  PM.UPGRADES = {
    life: { name: 'ชีวิตเริ่มต้น +1', icon: '❤️', max: 3, costs: [200, 400, 700], desc: 'เริ่มเกมด้วยชีวิตมากขึ้น (โหมดเล่นปกติ)' },
    power: { name: 'พลังพลังงานนาน', icon: '⚡', max: 5, costs: [100, 170, 260, 380, 520], desc: 'ผีกลัวนานขึ้น +12% ต่อเลเวล' },
    speed: { name: 'รองเท้าไว', icon: '👟', max: 5, costs: [120, 200, 300, 430, 600], desc: 'Pac-Man เร็วขึ้น +3% ต่อเลเวล' },
    magnet: { name: 'แม่เหล็กเหรียญ', icon: '🧲', max: 3, costs: [150, 280, 450], desc: 'ดูดเหรียญในรัศมีที่กว้างขึ้น' },
  };

  PM.ITEMS = {
    shield: { name: 'โล่กันผี', icon: '🛡️', price: 70, max: 9, desc: 'กันการชนผีได้ 1 ครั้งต่อเกม (ใช้อัตโนมัติ)' },
    freeze: { name: 'แช่แข็งผี', icon: '❄️', price: 50, max: 9, desc: 'กด Space เพื่อหยุดผีทุกตัว 4 วินาที' },
  };

  PM.SHOP_TABS = [
    { id: 'pac', label: 'สกิน Pac-Man', icon: '🟡', data: () => PM.PAC_SKINS },
    { id: 'ghost', label: 'สกินผี', icon: '👻', data: () => PM.GHOST_SKINS },
    { id: 'theme', label: 'ธีมแมพ', icon: '🎨', data: () => PM.THEMES },
    { id: 'fx', label: 'เอฟเฟกต์', icon: '✨', data: () => PM.FX },
    { id: 'upgrade', label: 'อัปเกรด', icon: '⬆️', data: () => PM.UPGRADES },
    { id: 'item', label: 'ไอเทม', icon: '🎒', data: () => PM.ITEMS },
  ];

  // ---------------- Persistent save ----------------
  const KEY = 'pac-agents-save-v1';
  const defaults = () => ({
    coins: 0,
    owned: { 'pac:classic': 1, 'ghost:classic': 1, 'theme:neon': 1, 'fx:none': 1 },
    equipped: { pac: 'classic', ghost: 'classic', theme: 'neon', fx: 'none' },
    upgrades: { life: 0, power: 0, speed: 0, magnet: 0 },
    items: { shield: 0, freeze: 0 },
    stats: { runs: 0, dots: 0, ghosts: 0, deaths: 0, coinsEarned: 0, playTime: 0, best: { easy: 0, normal: 0, hard: 0, insane: 0 }, bestLevel: 1 },
    settings: {
      difficulty: 'normal', map: 'classic', seed: 12345, coordination: true, algo: 'astar', ghostCount: 4,
      debug: false, sfx: 0.7, music: 0.35, useShield: true, aiSpeed: 1,
    },
    customMaze: null,
  });

  const Save = {
    data: defaults(),
    load() {
      try {
        const raw = g.localStorage && g.localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          const base = defaults();
          this.data = Object.assign(base, d);
          for (const k of ['equipped', 'upgrades', 'items', 'settings', 'stats']) this.data[k] = Object.assign(base[k], d[k] || {});
          this.data.stats.best = Object.assign(base.stats.best, (d.stats && d.stats.best) || {});
          this.data.owned = Object.assign(base.owned, d.owned || {});
        }
      } catch (e) { this.data = defaults(); }
    },
    save() { try { g.localStorage && g.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
    reset() { this.data = defaults(); this.save(); },
    get coins() { return this.data.coins; },
    addCoins(n) { this.data.coins += n; this.data.stats.coinsEarned += Math.max(0, n); this.save(); },
    owns(type, id) { return !!this.data.owned[type + ':' + id]; },
    equipped(type) { return this.data.equipped[type]; },
    equip(type, id) { if (this.owns(type, id)) { this.data.equipped[type] = id; this.save(); return true; } return false; },
    buy(type, id) {
      const list = PM.SHOP_TABS.find((t) => t.id === type).data();
      const it = list[id];
      if (!it || this.owns(type, id)) return { ok: false, reason: 'owned' };
      if (this.data.coins < it.price) return { ok: false, reason: 'coins' };
      this.data.coins -= it.price;
      this.data.owned[type + ':' + id] = 1;
      this.data.equipped[type] = id;
      this.save();
      return { ok: true };
    },
    upgradeLevel(id) { return this.data.upgrades[id] || 0; },
    upgradeCost(id) {
      const u = PM.UPGRADES[id], lv = this.upgradeLevel(id);
      return lv >= u.max ? null : u.costs[lv];
    },
    buyUpgrade(id) {
      const cost = this.upgradeCost(id);
      if (cost == null) return { ok: false, reason: 'max' };
      if (this.data.coins < cost) return { ok: false, reason: 'coins' };
      this.data.coins -= cost;
      this.data.upgrades[id]++;
      this.save();
      return { ok: true };
    },
    buyItem(id) {
      const it = PM.ITEMS[id];
      if ((this.data.items[id] || 0) >= it.max) return { ok: false, reason: 'max' };
      if (this.data.coins < it.price) return { ok: false, reason: 'coins' };
      this.data.coins -= it.price;
      this.data.items[id] = (this.data.items[id] || 0) + 1;
      this.save();
      return { ok: true };
    },
    useItem(id) { if ((this.data.items[id] || 0) > 0) { this.data.items[id]--; this.save(); return true; } return false; },
  };
  PM.Save = Save;
})(typeof window !== 'undefined' ? window : globalThis);
