(function (g) {
  'use strict';
  const PM = g.PM;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const TAU = Math.PI * 2;

  const UI = {
    current: 'scrMenu',
    mode: 'play',
    shopTab: 'pac',
    previews: [],
    toastTimer: null,

    isOpen() { return !!$('.screen.show'); },

    show(id) {
      $$('.screen').forEach((s) => s.classList.toggle('show', s.id === id));
      this.current = id;
      if (id === 'scrMenu') this.refreshMenu();
      if (PM.App) PM.App.onScreenChange(id);
    },
    hideAll() {
      $$('.screen').forEach((s) => s.classList.remove('show'));
      this.current = null;
      if (PM.App) PM.App.onScreenChange(null);
    },
    back() { this.show('scrMenu'); },

    toast(msg) {
      const t = $('#toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    },

    refreshMenu() {
      const S = PM.Save.data;
      $('#mCoins').textContent = PM.Save.coins;
      const best = Math.max.apply(null, PM.DIFF_ORDER.map((d) => S.stats.best[d] || 0));
      $('#mBest').textContent = best;
    },

    // ------------------------------------------------------------------ setup
    seg(el, value, onChange) {
      $$('button', el).forEach((b) => {
        b.classList.toggle('on', String(b.dataset.v) === String(value));
        b.onclick = () => { if (b.disabled) return; PM.Audio.sfx('click'); $$('button', el).forEach((x) => x.classList.toggle('on', x === b)); onChange(b.dataset.v); };
      });
    },

    openSetup(mode) {
      this.mode = mode;
      const S = PM.Save.data, st = S.settings;
      const titles = { play: '▶ เล่นเลย', '2p': '👥 2 ผู้เล่น', ai: '🤖 ดู AI เล่นเอง' };
      $('#setupTitle').textContent = titles[mode] || 'ตั้งค่าเกม';

      const cards = $('#diffCards');
      cards.innerHTML = '';
      PM.DIFF_ORDER.forEach((id) => {
        const d = PM.DIFFS[id];
        const b = document.createElement('button');
        b.className = 'diff' + (st.difficulty === id ? ' on' : '');
        b.innerHTML = '<div class="ic">' + d.icon + '</div><div class="nm">' + d.name + '</div><div class="ds">' + d.desc +
          '</div><div class="mt">❤ ' + d.lives + ' · <i class="cn"></i> ×' + d.coinMult + '</div>';
        b.onclick = () => { PM.Audio.sfx('click'); st.difficulty = id; PM.Save.save(); $$('.diff', cards).forEach((x) => x.classList.toggle('on', x === b)); this.updateCoinHint(); };
        cards.appendChild(b);
      });

      this.seg($('#segMap'), st.map, (v) => { st.map = v; PM.Save.save(); $('#seedRow').style.display = v === 'random' ? 'flex' : 'none'; });
      $$('#segMap button').forEach((b) => { if (b.dataset.v === 'custom') b.disabled = !S.customMaze; });
      if (st.map === 'custom' && !S.customMaze) { st.map = 'classic'; this.seg($('#segMap'), 'classic', (v) => { st.map = v; PM.Save.save(); $('#seedRow').style.display = v === 'random' ? 'flex' : 'none'; }); }
      $('#seedRow').style.display = st.map === 'random' ? 'flex' : 'none';
      $('#seedInput').value = st.seed;
      $('#seedInput').onchange = (e) => { st.seed = Math.max(1, Math.floor(+e.target.value) || 1); PM.Save.save(); };
      $('#btnDice').onclick = () => { st.seed = 1 + Math.floor(Math.random() * 999999); $('#seedInput').value = st.seed; PM.Save.save(); PM.Audio.sfx('click'); };

      this.seg($('#segGhosts'), st.ghostCount, (v) => { st.ghostCount = +v; PM.Save.save(); });
      this.seg($('#segAlgo'), st.algo, (v) => { st.algo = v; PM.Save.save(); });
      const sw = $('#swCoord'); sw.checked = !!st.coordination; sw.onchange = () => { st.coordination = sw.checked; PM.Save.save(); };
      const dbg = $('#swDebug'); dbg.checked = !!st.debug; dbg.onchange = () => { st.debug = dbg.checked; PM.Save.save(); };
      const sh = $('#swShield'); sh.checked = !!st.useShield; sh.onchange = () => { st.useShield = sh.checked; PM.Save.save(); };
      $('#ldShield').textContent = S.items.shield || 0;
      $('#ldFreeze').textContent = S.items.freeze || 0;
      $('#fldLoadout').style.display = mode === 'ai' ? 'none' : '';
      this.updateCoinHint();
      this.show('scrSetup');
    },

    updateCoinHint() {
      const d = PM.DIFFS[PM.Save.data.settings.difficulty];
      $('#coinHint').innerHTML = this.mode === 'ai'
        ? '🤖 โหมดดู AI เล่นไม่ได้รับเหรียญ — ใช้ศึกษาพฤติกรรมของ agent'
        : '<i class="cn"></i> ความยาก "' + d.name + '" ได้เหรียญคูณ ×' + d.coinMult + ' · ชีวิตเริ่มต้น ' + (d.lives + (PM.Save.data.upgrades.life || 0));
    },

    // ------------------------------------------------------------------ shop
    openShop() {
      this.renderShop();
      this.show('scrShop');
    },
    renderShop() {
      $('#shopCoins').textContent = PM.Save.coins;
      const tabs = $('#shopTabs');
      tabs.innerHTML = '';
      PM.SHOP_TABS.forEach((t) => {
        const b = document.createElement('button');
        b.className = 'tab' + (t.id === this.shopTab ? ' on' : '');
        b.textContent = t.icon + ' ' + t.label;
        b.onclick = () => { PM.Audio.sfx('click'); this.shopTab = t.id; this.renderShop(); };
        tabs.appendChild(b);
      });
      const grid = $('#shopGrid');
      grid.innerHTML = '';
      this.previews = [];
      const tab = PM.SHOP_TABS.find((t) => t.id === this.shopTab);
      const list = tab.data();
      const S = PM.Save;
      Object.keys(list).forEach((id) => {
        const it = list[id];
        const card = document.createElement('div');
        card.className = 'item';
        let preview;
        if (tab.id === 'upgrade' || tab.id === 'item') {
          preview = document.createElement('div'); preview.className = 'big-ic'; preview.textContent = it.icon;
        } else {
          preview = document.createElement('canvas'); preview.width = 184; preview.height = 184;
          this.previews.push({ canvas: preview, type: tab.id, id, item: it });
        }
        card.appendChild(preview);
        const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = it.name; card.appendChild(nm);
        const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = it.desc; card.appendChild(ds);
        const btn = document.createElement('button'); btn.className = 'btn';

        if (tab.id === 'upgrade') {
          const lv = S.upgradeLevel(id), cost = S.upgradeCost(id);
          const pips = document.createElement('div'); pips.className = 'lvl';
          for (let i = 0; i < it.max; i++) { const p = document.createElement('i'); if (i < lv) p.className = 'f'; pips.appendChild(p); }
          card.insertBefore(pips, btn);
          if (cost == null) { btn.textContent = 'MAX'; btn.disabled = true; }
          else { btn.innerHTML = 'อัปเกรด <i class="cn"></i> <b>' + cost + '</b>'; btn.classList.add('primary'); btn.onclick = () => this.buyResult(S.buyUpgrade(id), 'อัปเกรด ' + it.name + ' แล้ว!'); }
        } else if (tab.id === 'item') {
          const have = S.data.items[id] || 0;
          nm.textContent = it.name + ' ×' + have;
          btn.innerHTML = 'ซื้อ <i class="cn"></i> <b>' + it.price + '</b>'; btn.classList.add('primary');
          btn.onclick = () => this.buyResult(S.buyItem(id), 'ซื้อ ' + it.name + ' แล้ว!');
          if (have >= it.max) { btn.disabled = true; btn.textContent = 'เต็มแล้ว'; }
        } else {
          const owned = S.owns(tab.id, id), eq = S.equipped(tab.id) === id;
          if (eq) { card.classList.add('eq'); const tg = document.createElement('span'); tg.className = 'tagc'; tg.textContent = 'ใช้อยู่'; card.appendChild(tg); btn.textContent = '✓ กำลังใช้'; btn.disabled = true; }
          else if (owned) { btn.textContent = 'ใช้งาน'; btn.onclick = () => { S.equip(tab.id, id); PM.Audio.sfx('click'); PM.App.renderer.setCosmetics(); this.renderShop(); }; }
          else { btn.innerHTML = 'ซื้อ <i class="cn"></i> <b>' + it.price + '</b>'; btn.classList.add('primary'); btn.onclick = () => this.buyResult(S.buy(tab.id, id), 'ซื้อ ' + it.name + ' แล้ว!', true); }
        }
        card.appendChild(btn);
        grid.appendChild(card);
      });
    },
    buyResult(r, okMsg, cosmetic) {
      if (r.ok) {
        PM.Audio.sfx('buy'); this.toast('✅ ' + okMsg);
        if (cosmetic) PM.App.renderer.setCosmetics();
        this.renderShop();
      } else {
        PM.Audio.sfx('deny');
        this.toast(r.reason === 'coins' ? '💰 เหรียญไม่พอ ไปเก็บเพิ่มก่อนนะ' : r.reason === 'max' ? 'เต็มแล้ว' : 'ซื้อไม่ได้');
      }
    },

    drawPreview(p, t) {
      const c = p.canvas, x = c.getContext('2d'), W = c.width, H = c.height;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, W, H);
      const Sp = PM.Sprites;
      if (p.type === 'pac') {
        Sp.pac(x, W / 2, H / 2 + (p.item.acc ? 10 : 0), 46, { skin: p.item, ang: 0, mouth: 0.08 + Math.abs(Math.sin(t * 6)) * 0.6, t, glow: 14 });
      } else if (p.type === 'ghost') {
        const sk = p.item;
        for (let i = 0; i < 4; i++) {
          const cx = W * (0.3 + (i % 2) * 0.4), cy = H * (0.32 + Math.floor(i / 2) * 0.4 + (sk.ears ? 0.04 : 0));
          Sp.ghost(x, cx, cy + Math.sin(t * 4 + i) * 2, 25, { skin: sk, index: i, dx: Math.cos(t), dy: 0, t, glow: 8 });
        }
      } else if (p.type === 'theme') {
        const th = p.item;
        const bg = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.8);
        bg.addColorStop(0, th.bg1); bg.addColorStop(1, th.bg2);
        x.fillStyle = bg; x.fillRect(0, 0, W, H);
        x.lineWidth = 7; x.strokeStyle = th.wall; x.shadowColor = th.glow; x.shadowBlur = 10; x.lineJoin = 'round';
        const rects = [[22, 22, 56, 30], [106, 22, 56, 30], [22, 132, 56, 30], [106, 132, 56, 30], [64, 76, 56, 34]];
        for (const r of rects) { x.fillStyle = th.fill; x.beginPath(); x.rect(r[0], r[1], r[2], r[3]); x.fill(); x.stroke(); }
        x.shadowBlur = 0; x.fillStyle = th.dot;
        for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(24 + i * 28, 92 + (i % 2) * 0, 3.2, 0, TAU); x.fill(); }
        x.shadowColor = th.pellet; x.shadowBlur = 12; x.fillStyle = th.pellet; x.beginPath(); x.arc(160, 64, 7 + Math.sin(t * 7), 0, TAU); x.fill();
        x.shadowBlur = 0;
        Sp.pac(x, 40 + ((t * 40) % 110), 148 - 0, 14, { skin: PM.PAC_SKINS[PM.Save.equipped('pac')] || PM.PAC_SKINS.classic, ang: 0, mouth: 0.1 + Math.abs(Math.sin(t * 8)) * 0.5, t, glow: 6 });
      } else if (p.type === 'fx') {
        x.fillStyle = '#0a0f33'; x.fillRect(0, 0, W, H);
        const px = 40 + ((t * 55) % 110), py = H / 2;
        for (let i = 1; i < 14 && p.id !== 'none'; i++) {
          const bx = px - i * 9, a = 1 - i / 14;
          x.globalAlpha = a;
          const wob = Math.sin(t * 8 + i) * 4;
          x.fillStyle = x.strokeStyle = '#fff';
          switch (p.id) {
            case 'sparkle': x.fillStyle = i % 2 ? '#fff6a8' : '#fff'; Sp.star(x, bx, py + wob, 5 * a + 1.5); break;
            case 'bubbles': x.strokeStyle = '#9be7ff'; x.lineWidth = 1.5; x.beginPath(); x.arc(bx, py - i * 1.8 + wob, 3 + (i % 3) * 1.4, 0, TAU); x.stroke(); break;
            case 'hearts': x.fillStyle = '#ff5d8f'; Sp.heart(x, bx, py - i * 1.2 + wob, 6); break;
            case 'rainbow': x.fillStyle = 'hsl(' + ((t * 300 - i * 25) % 360) + ',100%,60%)'; x.beginPath(); x.arc(bx, py, 6, 0, TAU); x.fill(); break;
            case 'flame': x.fillStyle = i % 2 ? '#ff7a1a' : '#ffd23f'; x.beginPath(); x.arc(bx, py - i * 1.2 + wob, 4 + a * 3, 0, TAU); x.fill(); break;
            default: break;
          }
        }
        x.globalAlpha = 1;
        Sp.pac(x, px, py, 15, { skin: PM.PAC_SKINS[PM.Save.equipped('pac')] || PM.PAC_SKINS.classic, ang: 0, mouth: 0.1 + Math.abs(Math.sin(t * 8)) * 0.5, t, glow: 6 });
      }
    },

    // ------------------------------------------------------------------ settings / how / over
    openSettings() {
      const st = PM.Save.data.settings, S = PM.Save.data.stats;
      const sfx = $('#rngSfx'), mus = $('#rngMus');
      sfx.value = st.sfx; mus.value = st.music;
      const upd = () => { $('#vSfx').textContent = Math.round(sfx.value * 100) + '%'; $('#vMus').textContent = Math.round(mus.value * 100) + '%'; };
      upd();
      sfx.oninput = () => { st.sfx = +sfx.value; upd(); PM.Audio.setVolumes(st.sfx, st.music); PM.Save.save(); };
      sfx.onchange = () => PM.Audio.sfx('coin');
      mus.oninput = () => { st.music = +mus.value; upd(); PM.Audio.setVolumes(st.sfx, st.music); PM.Save.save(); };
      $('#statsBox').innerHTML = [
        ['รอบที่เล่น', S.runs], ['เม็ดที่กิน', S.dots], ['ผีที่กิน', S.ghosts], ['ครั้งที่ถูกจับ', S.deaths],
        ['เหรียญที่หาได้ทั้งหมด', S.coinsEarned], ['เวลาเล่นรวม', PM.fmtTime(S.playTime)], ['เลเวลสูงสุด', S.bestLevel],
        ['คะแนนสูงสุด (โหด)', S.best.insane],
      ].map((r) => '<div>' + r[0] + '</div><div><b>' + r[1] + '</b></div>').join('');
      $('#btnReset').onclick = () => {
        if (g.confirm('ล้างข้อมูลทั้งหมด (เหรียญ สกิน สถิติ แมพที่สร้าง)?')) { PM.Save.reset(); PM.App.renderer.setCosmetics(); this.toast('ล้างข้อมูลแล้ว'); this.show('scrMenu'); }
      };
      this.show('scrSettings');
    },

    showOver(info) {
      const s = info.summary;
      $('#overTitle').textContent = info.title;
      const stat = (k, v, cls) => '<div class="stat ' + (cls || '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
      let html = '<div class="over-grid">' +
        stat('คะแนน', s.score) + stat('เลเวล', s.level) + stat('เม็ดที่กิน', s.dots) + stat('ผีที่กิน', s.ghosts) +
        stat('เวลา', PM.fmtTime(s.time)) + stat(info.earns ? 'เหรียญที่ได้' : 'ถูกจับ', info.earns ? '<i class="cn"></i> +' + s.coins : s.catches + ' ครั้ง', info.earns ? 'gold' : '') + '</div>';
      if (info.newBest) html = '<div class="newbest">🏆 สถิติใหม่ของระดับ "' + info.diffName + '"!</div>' + html;
      if (info.earns) html += '<p class="muted">โบนัสจากคะแนน +' + s.bonus + ' เหรียญ · ยอดเหรียญตอนนี้ <b>' + PM.Save.coins + '</b></p>';
      if (info.note) html += '<p class="muted">' + info.note + '</p>';
      $('#overBody').innerHTML = html;
      this.show('scrOver');
    },

    // ------------------------------------------------------------------ animation of menu / shop previews
    anim(ts) {
      const t = ts / 1000;
      if (this.current === 'scrMenu') {
        const c = $('#logoPac');
        if (c) {
          const x = c.getContext('2d');
          x.clearRect(0, 0, c.width, c.height);
          const skin = PM.PAC_SKINS[PM.Save.equipped('pac')] || PM.PAC_SKINS.classic;
          PM.Sprites.pac(x, 60, 66, 40, { skin, ang: 0, mouth: 0.08 + Math.abs(Math.sin(t * 5)) * 0.65, t, glow: 16 });
        }
      } else if (this.current === 'scrShop') {
        for (const p of this.previews) this.drawPreview(p, t);
      }
    },

    init() {
      $$('[data-mode]').forEach((b) => (b.onclick = () => { PM.Audio.init(); PM.Audio.sfx('click'); this.openSetup(b.dataset.mode); }));
      $$('[data-go]').forEach((b) => (b.onclick = () => {
        PM.Audio.init(); PM.Audio.sfx('click');
        const go = b.dataset.go;
        if (go === 'shop') this.openShop();
        else if (go === 'settings') this.openSettings();
        else if (go === 'lab') { PM.Lab.open(); this.show('scrLab'); }
        else if (go === 'editor') { PM.Editor.open(); this.show('scrEditor'); }
        else if (go === 'how') this.show('scrHow');
      }));
      $$('[data-back]').forEach((b) => (b.onclick = () => { PM.Audio.sfx('click'); if (PM.Lab) PM.Lab.stop(); this.back(); }));
      $('#btnStart').onclick = () => { PM.Audio.init(); PM.Audio.sfx('click'); PM.App.start(this.mode); };
    },
  };

  PM.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
