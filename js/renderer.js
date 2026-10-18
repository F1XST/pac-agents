(function (g) {
  'use strict';
  const PM = g.PM;
  const TAU = Math.PI * 2;
  const FONT = '"Prompt","Segoe UI",Tahoma,sans-serif';

  // =========================================================================================
  // Sprites (shared by the game canvas and the shop previews)
  // =========================================================================================
  const Sprites = {
    pacColors(skin, t) {
      if (skin.rainbow) {
        const h = (t * 140) % 360;
        return { base: 'hsl(' + h + ',95%,58%)', light: 'hsl(' + h + ',100%,80%)', dark: 'hsl(' + ((h + 40) % 360) + ',90%,40%)' };
      }
      return { base: skin.color, light: PM.shade(skin.color, 0.6), dark: PM.shade(skin.color, -0.25) };
    },

    pac(ctx, cx, cy, r, o) {
      const skin = o.skin || PM.PAC_SKINS.classic;
      const c = Sprites.pacColors(skin, o.t || 0);
      const ang = o.ang || 0;
      const mouth = o.mouth == null ? 0.5 : o.mouth;
      ctx.save();
      ctx.shadowColor = c.base;
      ctx.shadowBlur = o.glow == null ? 12 : o.glow;
      if (skin.acc === 'ears') {
        ctx.fillStyle = c.dark;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * r * 0.25, cy - r * 0.85);
          ctx.lineTo(cx + s * r * 0.95, cy - r * 1.35);
          ctx.lineTo(cx + s * r * 0.98, cy - r * 0.35);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#ff9db5';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * r * 0.45, cy - r * 0.85);
          ctx.lineTo(cx + s * r * 0.85, cy - r * 1.15);
          ctx.lineTo(cx + s * r * 0.88, cy - r * 0.55);
          ctx.closePath(); ctx.fill();
        }
      }
      if (mouth < Math.PI - 0.02) {
        const grd = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
        grd.addColorStop(0, c.light); grd.addColorStop(0.55, c.base); grd.addColorStop(1, c.dark);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, ang + mouth, ang + TAU - mouth);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // eye
        const ea = ang + (Math.cos(ang) < -0.1 ? 0.95 : -0.95);
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(cx + Math.cos(ea) * r * 0.5, cy + Math.sin(ea) * r * 0.5, r * 0.12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx + Math.cos(ea) * r * 0.5 - r * 0.04, cy + Math.sin(ea) * r * 0.5 - r * 0.04, r * 0.04, 0, TAU); ctx.fill();
        // accessories
        Sprites.accessory(ctx, cx, cy, r, skin.acc, c, o.t || 0);
      }
      ctx.restore();
    },

    accessory(ctx, cx, cy, r, acc, c, t) {
      if (!acc) return;
      ctx.save();
      ctx.shadowBlur = 0;
      if (acc === 'crown') {
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1;
        ctx.beginPath();
        const y0 = cy - r * 0.92, w = r * 0.8;
        ctx.moveTo(cx - w, y0); ctx.lineTo(cx - w, y0 - r * 0.55); ctx.lineTo(cx - w * 0.5, y0 - r * 0.25);
        ctx.lineTo(cx, y0 - r * 0.7); ctx.lineTo(cx + w * 0.5, y0 - r * 0.25); ctx.lineTo(cx + w, y0 - r * 0.55);
        ctx.lineTo(cx + w, y0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(cx, y0 - r * 0.2, r * 0.1, 0, TAU); ctx.fill();
      } else if (acc === 'hat') {
        ctx.fillStyle = '#16161f';
        ctx.fillRect(cx - r * 0.95, cy - r * 1.02, r * 1.9, r * 0.2);
        ctx.fillRect(cx - r * 0.55, cy - r * 1.75, r * 1.1, r * 0.78);
        ctx.fillStyle = '#d6293e'; ctx.fillRect(cx - r * 0.55, cy - r * 1.18, r * 1.1, r * 0.16);
      } else if (acc === 'bow') {
        ctx.fillStyle = '#ff4d8d';
        const bx = cx + r * 0.45, by = cy - r * 0.85;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - r * 0.5, by - r * 0.35); ctx.lineTo(bx - r * 0.5, by + r * 0.3); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + r * 0.5, by - r * 0.35); ctx.lineTo(bx + r * 0.5, by + r * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff2370'; ctx.beginPath(); ctx.arc(bx, by, r * 0.14, 0, TAU); ctx.fill();
      } else if (acc === 'glasses') {
        ctx.fillStyle = '#0c0c14';
        const gy = cy - r * 0.32;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - r * 0.82, gy - r * 0.2, r * 0.74, r * 0.4, r * 0.12) : ctx.rect(cx - r * 0.82, gy - r * 0.2, r * 0.74, r * 0.4); ctx.fill();
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx + r * 0.08, gy - r * 0.2, r * 0.74, r * 0.4, r * 0.12) : ctx.rect(cx + r * 0.08, gy - r * 0.2, r * 0.74, r * 0.4); ctx.fill();
        ctx.fillRect(cx - r * 0.1, gy - r * 0.05, r * 0.2, r * 0.09);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(cx - r * 0.7, gy - r * 0.14, r * 0.24, r * 0.07);
        ctx.fillRect(cx + r * 0.2, gy - r * 0.14, r * 0.24, r * 0.07);
      }
      ctx.restore();
    },

    ghost(ctx, cx, cy, r, o) {
      const skin = o.skin || PM.GHOST_SKINS.classic;
      const st = o.state || 'normal';
      const t = o.t || 0;
      let col = skin.colors[(o.index || 0) % skin.colors.length];
      if (st === 'fright') col = o.flash ? '#f4f4ff' : '#2438ff';
      ctx.save();
      if (st !== 'eaten') {
        ctx.shadowColor = st === 'fright' ? '#6a7bff' : col;
        ctx.shadowBlur = o.glow == null ? 12 : o.glow;
        if (st !== 'fright' && skin.ears) {
          ctx.fillStyle = col;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * r * 0.3, cy - r * 0.95);
            ctx.lineTo(cx + s * r * 0.85, cy - r * 1.4);
            ctx.lineTo(cx + s * r * 0.98, cy - r * 0.5);
            ctx.closePath(); ctx.fill();
          }
        }
        const grd = ctx.createLinearGradient(0, cy - r, 0, cy + r);
        grd.addColorStop(0, st === 'fright' ? (o.flash ? '#ffffff' : '#4a5cff') : PM.shade(col, 0.35));
        grd.addColorStop(1, col);
        ctx.fillStyle = grd;
        ctx.beginPath();
        if (skin.shape === 'square' && st !== 'fright') {
          const x0 = cx - r, x1 = cx + r, y0 = cy - r, y1 = cy + r * 0.92, rr = r * 0.45;
          ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + rr); ctx.quadraticCurveTo(x0, y0, x0 + rr, y0);
          ctx.lineTo(x1 - rr, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + rr); ctx.lineTo(x1, y1);
          const n = 4, w = (x1 - x0) / n;
          for (let i = 0; i < n; i++) {
            const xs = x1 - i * w;
            ctx.lineTo(xs - w / 2, y1 - r * 0.28);
            ctx.lineTo(xs - w, y1);
          }
          ctx.closePath();
          ctx.fill();
          // antenna
          ctx.shadowBlur = 0;
          ctx.strokeStyle = PM.shade(col, 0.4); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y0 - r * 0.35); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y0 - r * 0.4, r * 0.1, 0, TAU); ctx.fill();
        } else {
          ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
          const y0 = cy + r * 0.92;
          ctx.lineTo(cx + r, y0);
          const n = 4, w = (2 * r) / n;
          for (let i = 0; i < n; i++) {
            const xs = cx + r - i * w;
            const amp = r * 0.3 * (0.6 + 0.4 * Math.sin(t * 11 + i * 1.7));
            ctx.quadraticCurveTo(xs - w / 2, y0 + (i % 2 ? -amp : amp), xs - w, y0);
          }
          ctx.lineTo(cx - r, cy - r * 0.1);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        if (skin.flame && st !== 'fright') {
          ctx.fillStyle = 'rgba(255,230,120,0.85)';
          for (let i = 0; i < 3; i++) {
            const fx = cx + (i - 1) * r * 0.55;
            const fh = r * (0.45 + 0.25 * Math.sin(t * 14 + i * 2));
            ctx.beginPath(); ctx.moveTo(fx - r * 0.18, cy - r * 0.85); ctx.quadraticCurveTo(fx, cy - r * 0.85 - fh * 1.4, fx + r * 0.18, cy - r * 0.85); ctx.fill();
          }
        }
      }
      // face
      const dx = o.dx || 0, dy = o.dy || 0;
      if (st === 'fright') {
        ctx.fillStyle = o.flash ? '#e0303c' : '#ffe9a8';
        ctx.beginPath(); ctx.arc(cx - r * 0.33, cy - r * 0.2, r * 0.12, 0, TAU); ctx.arc(cx + r * 0.33, cy - r * 0.2, r * 0.12, 0, TAU); ctx.fill();
        ctx.strokeStyle = o.flash ? '#e0303c' : '#ffe9a8'; ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const x = cx - r * 0.6 + i * (r * 1.2 / 6);
          const y = cy + r * 0.34 + (i % 2 ? -1 : 1) * r * 0.1;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        for (const s of [-1, 1]) {
          const ex = cx + s * r * 0.38, ey = cy - r * 0.2;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.3, r * 0.37, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = st === 'eaten' ? '#7aa7ff' : '#1d2a7a';
          ctx.beginPath(); ctx.arc(ex + dx * r * 0.13, ey + dy * r * 0.15, r * 0.17, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    },

    coin(ctx, cx, cy, r, t) {
      const sx = Math.max(0.12, Math.abs(Math.cos(t * 4)));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 12;
      const grd = ctx.createLinearGradient(-r, -r, r, r);
      grd.addColorStop(0, '#fff3a0'); grd.addColorStop(0.5, '#ffc928'); grd.addColorStop(1, '#c98a00');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(0, 0, r * sx, r, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#a56d00'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, r * sx * 0.7, r * 0.7, 0, 0, TAU); ctx.stroke();
      if (sx > 0.5) {
        ctx.fillStyle = '#a56d00'; ctx.font = 'bold ' + Math.round(r * 1.1) + 'px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      }
      ctx.restore();
    },

    heart(ctx, x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.3);
      ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.3, y - s, x, y - s * 0.35);
      ctx.bezierCurveTo(x + s * 0.3, y - s, x + s, y - s * 0.4, x, y + s * 0.3);
      ctx.fill();
    },

    star(ctx, x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.28, y - s * 0.28); ctx.lineTo(x + s, y);
      ctx.lineTo(x + s * 0.28, y + s * 0.28); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.28, y + s * 0.28);
      ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.28, y - s * 0.28); ctx.closePath(); ctx.fill();
    },
  };
  PM.Sprites = Sprites;

  // =========================================================================================
  // Renderer
  // =========================================================================================
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.T = 28;
      this.size = PM.W * this.T;
      this.dpr = Math.min(2, g.devicePixelRatio || 1);
      canvas.width = canvas.height = Math.round(this.size * this.dpr);
      this.t = 0;
      this.particles = [];
      this.floats = [];
      this.shake = 0;
      this.flash = 0;
      this.layers = {};
      this.layerKey = '';
      this.trailAcc = 0;
      this.setCosmetics();
    }

    setCosmetics() {
      const S = PM.Save;
      this.theme = PM.THEMES[S.equipped('theme')] || PM.THEMES.neon;
      this.themeId = S.equipped('theme');
      this.pacSkin = PM.PAC_SKINS[S.equipped('pac')] || PM.PAC_SKINS.classic;
      this.ghostSkin = PM.GHOST_SKINS[S.equipped('ghost')] || PM.GHOST_SKINS.classic;
      this.fx = S.equipped('fx');
      this.layerKey = '';
    }

    makeLayer(maze, wallColor, fillColor, glow) {
      const T = this.T, dpr = this.dpr;
      const c = document.createElement('canvas');
      c.width = c.height = Math.round(this.size * dpr);
      const x = c.getContext('2d');
      x.scale(dpr, dpr);
      x.lineCap = 'round'; x.lineJoin = 'round';
      const wall = (px, py) => maze.at(px, py) === '#';
      const strokeAll = (width, color, blur) => {
        x.lineWidth = width; x.strokeStyle = color;
        x.shadowColor = glow; x.shadowBlur = blur;
        x.beginPath();
        for (let y = 0; y < maze.h; y++) for (let px = 0; px < maze.w; px++) {
          if (maze.g[y][px] !== '#') continue;
          const cx = px * T + T / 2, cy = y * T + T / 2;
          x.moveTo(cx, cy); x.lineTo(cx, cy + 0.01);
          if (px + 1 < maze.w && maze.g[y][px + 1] === '#') { x.moveTo(cx, cy); x.lineTo(cx + T, cy); }
          if (y + 1 < maze.h && maze.g[y + 1][px] === '#') { x.moveTo(cx, cy); x.lineTo(cx, cy + T); }
        }
        x.stroke();
      };
      strokeAll(13, wallColor, 14);
      strokeAll(13, wallColor, 0);
      strokeAll(8.5, fillColor, 0);
      // Fill the hollow centres of thick wall masses so only their outer edge is outlined.
      x.shadowBlur = 0; x.fillStyle = fillColor;
      for (let y = 0; y < maze.h - 1; y++) for (let px = 0; px < maze.w - 1; px++) {
        if (maze.g[y][px] === '#' && maze.g[y][px + 1] === '#' && maze.g[y + 1][px] === '#' && maze.g[y + 1][px + 1] === '#') {
          x.fillRect(px * T + T / 2 - 0.5, y * T + T / 2 - 0.5, T + 1, T + 1);
        }
      }
      // ghost door
      if (maze.house.door) {
        const d = maze.house.door;
        x.shadowBlur = 8; x.shadowColor = '#ff9ae8';
        x.strokeStyle = '#ff9ae8'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(d.x * T + 3, d.y * T + T / 2); x.lineTo(d.x * T + T - 3, d.y * T + T / 2); x.stroke();
      }
      return c;
    }

    layerFor(world, flashing) {
      const key = world.mazeId + '|' + this.themeId + '|' + (flashing ? 1 : 0);
      if (!this.layers[key]) {
        if (Object.keys(this.layers).length > 6) this.layers = {};
        const th = this.theme;
        this.layers[key] = flashing
          ? this.makeLayer(world.maze, '#ffffff', '#c7d6ff', '#ffffff')
          : this.makeLayer(world.maze, th.wall, th.fill, th.glow);
      }
      return this.layers[key];
    }

    addBurst(x, y, color, n, speed, kind) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = (0.4 + Math.random()) * speed;
        this.particles.push({
          x: (x + 0.5) * this.T, y: (y + 0.5) * this.T, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0, max: 0.4 + Math.random() * 0.5, size: 1.5 + Math.random() * 2.5, color, kind: kind || 'spark', g: 0,
        });
      }
    }
    addFloat(x, y, text, color) {
      this.floats.push({ x: (x + 0.5) * this.T, y: (y + 0.5) * this.T, text, color: color || '#fff', life: 0, max: 1.1 });
    }
    addConfetti(n) {
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: Math.random() * this.size, y: -10, vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 120,
          life: 0, max: 2 + Math.random(), size: 3 + Math.random() * 4, color: 'hsl(' + Math.floor(Math.random() * 360) + ',95%,60%)',
          kind: 'confetti', g: 60, rot: Math.random() * 6,
        });
      }
    }
    clearFx() { this.particles = []; this.floats = []; this.shake = 0; this.flash = 0; }

    spawnTrail(world, dt) {
      if (this.fx === 'none' || world.state !== 'playing' || !world.pac.moving) return;
      this.trailAcc += dt;
      if (this.trailAcc < 0.035) return;
      this.trailAcc = 0;
      const p = world.pac, T = this.T;
      const x = (p.px + 0.5) * T, y = (p.py + 0.5) * T;
      const base = { x, y, life: 0, g: 0 };
      const R = Math.random;
      switch (this.fx) {
        case 'sparkle':
          this.particles.push(Object.assign(base, { vx: (R() - 0.5) * 40, vy: (R() - 0.5) * 40, max: 0.6, size: 2 + R() * 3, color: R() < 0.5 ? '#fff6a8' : '#ffffff', kind: 'star' }));
          break;
        case 'bubbles':
          this.particles.push(Object.assign(base, { vx: (R() - 0.5) * 20, vy: -20 - R() * 30, max: 0.9, size: 2 + R() * 4, color: '#9be7ff', kind: 'bubble' }));
          break;
        case 'hearts':
          this.particles.push(Object.assign(base, { vx: (R() - 0.5) * 25, vy: -25 - R() * 25, max: 0.9, size: 4 + R() * 3, color: '#ff5d8f', kind: 'heart' }));
          break;
        case 'rainbow':
          this.particles.push(Object.assign(base, { vx: 0, vy: 0, max: 0.55, size: 6, color: 'hsl(' + ((this.t * 300) % 360) + ',100%,60%)', kind: 'dot' }));
          break;
        case 'flame':
          this.particles.push(Object.assign(base, { vx: (R() - 0.5) * 30, vy: -10 - R() * 30, max: 0.5, size: 3 + R() * 4, color: R() < 0.5 ? '#ff7a1a' : '#ffd23f', kind: 'dot' }));
          break;
        default: break;
      }
    }

    // ------------------------------------------------------------------ main frame
    render(world, dt, opts) {
      opts = opts || {};
      this.t += dt;
      const ctx = this.ctx, T = this.T, S = this.size;
      const th = this.theme;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // background
      const bg = ctx.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.78);
      bg.addColorStop(0, th.bg1); bg.addColorStop(1, th.bg2);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, S, S);

      ctx.save();
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 30);
        ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      }

      // walls (flash on level clear)
      const flashing = world.state === 'levelclear' && Math.floor(this.t * 6) % 2 === 0;
      ctx.drawImage(this.layerFor(world, flashing), 0, 0, S, S);

      this.drawDots(world);
      this.drawPickups(world);
      this.spawnTrail(world, dt);
      this.updateParticles(dt);
      this.drawParticles(false);

      if (opts.debug) this.drawDebug(world, true);
      this.drawEntities(world);
      this.drawParticles(true);
      if (opts.debug) this.drawDebug(world, false);
      this.drawFloats(dt);

      ctx.restore();

      if (world.state === 'ready') this.banner(world.gameMode === 'ai' ? 'AI READY' : 'READY!', '#ffe11a');
      if (world.state === 'gameover') this.banner('GAME OVER', '#ff4d6d');
      if (world.freezeTimer > 0) {
        ctx.fillStyle = 'rgba(120,200,255,0.10)'; ctx.fillRect(0, 0, S, S);
      }
      if (this.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, this.flash) + ')'; ctx.fillRect(0, 0, S, S);
        this.flash = Math.max(0, this.flash - dt * 2.4);
      }
      // vignette
      const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.45, S / 2, S / 2, S * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
    }

    banner(text, color) {
      const ctx = this.ctx, S = this.size;
      ctx.save();
      ctx.font = '900 30px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
      const y = this.T * 12.4 + Math.sin(this.t * 4) * 2;
      ctx.strokeText(text, S / 2, y);
      ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.fillStyle = color; ctx.fillText(text, S / 2, y);
      ctx.restore();
    }

    drawDots(world) {
      const ctx = this.ctx, T = this.T, m = world.maze, th = this.theme;
      ctx.fillStyle = th.dot;
      ctx.beginPath();
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (m.g[y][x] === '.') { const cx = x * T + T / 2, cy = y * T + T / 2; ctx.moveTo(cx + 2.4, cy); ctx.arc(cx, cy, 2.4, 0, TAU); }
      }
      ctx.fill();
      const pul = 0.75 + 0.25 * Math.sin(this.t * 7);
      ctx.save();
      ctx.shadowColor = th.pellet; ctx.shadowBlur = 16;
      ctx.fillStyle = th.pellet;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (m.g[y][x] === 'o') { ctx.beginPath(); ctx.arc(x * T + T / 2, y * T + T / 2, 7 * pul, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }

    drawPickups(world) {
      const ctx = this.ctx, T = this.T;
      if (world.fruit) {
        const f = world.fruit;
        const blink = f.ttl < 3 && Math.floor(this.t * 8) % 2 === 0;
        if (!blink) {
          ctx.save();
          ctx.font = '22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
          ctx.fillText(f.def.icon, f.x * T + T / 2, f.y * T + T / 2 + Math.sin(this.t * 5) * 2);
          ctx.restore();
        }
      }
      for (const c of world.coinTokens) {
        const blink = c.ttl < 3 && Math.floor(this.t * 8) % 2 === 0;
        if (blink) continue;
        Sprites.coin(ctx, (c.px + 0.5) * T, (c.py + 0.5) * T + Math.sin(this.t * 4 + c.age) * 1.5, c.v > 1 ? 11 : 8.5, this.t + c.age);
      }
    }

    drawEntities(world) {
      const ctx = this.ctx, T = this.T;
      const pac = world.pac;
      const wrapDraw = (px, fn) => {
        fn(px);
        if (px < 0.8) fn(px + world.maze.w);
        else if (px > world.maze.w - 1.8) fn(px - world.maze.w);
      };
      // ghosts (hidden while Pac-Man dies, like the arcade)
      if (world.state !== 'dying' || world.timer > 1.2) {
        const flash = world.frightTimer > 0 && world.frightTimer < 2 && Math.floor(this.t * 6) % 2 === 0;
        const order = world.ghosts.slice().sort((a, b) => (a.state === 'eaten') - (b.state === 'eaten'));
        for (const gh of order) {
          const bob = gh.state === 'house' ? Math.sin(gh.bob * 6) * 2 : 0;
          const st = gh.state === 'frightened' ? 'fright' : gh.state === 'eaten' ? 'eaten' : 'normal';
          const d = gh.dir || { dx: 0, dy: 0 };
          const frozen = world.freezeTimer > 0 && gh.state !== 'eaten';
          wrapDraw(gh.px, (px) => {
            const cx = (px + 0.5) * T, cy = (gh.py + 0.5) * T + bob;
            if (gh.controlled) {
              ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
              ctx.beginPath(); ctx.arc(cx, cy, T * 0.58, this.t * 2, this.t * 2 + TAU * 0.9); ctx.stroke(); ctx.restore();
            }
            Sprites.ghost(ctx, cx, cy, T * 0.42, { skin: this.ghostSkin, index: gh.index, state: st, flash, dx: d.dx, dy: d.dy, t: frozen ? 0 : this.t });
            if (frozen) { ctx.save(); ctx.fillStyle = 'rgba(170,230,255,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, T * 0.45, 0, TAU); ctx.fill(); ctx.restore(); }
            if (gh.controlled) {
              ctx.save(); ctx.font = '800 10px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
              ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText('P2', cx, cy - T * 0.62); ctx.fillText('P2', cx, cy - T * 0.62); ctx.restore();
            }
          });
        }
      }
      // Pac-Man
      let mouth, show = true;
      if (world.state === 'dying') {
        const q = 1 - world.timer / 1.7;
        mouth = Math.min(Math.PI, 0.3 + Math.max(0, q - 0.1) * 3.6);
      } else if (world.state === 'playing' && pac.moving) mouth = 0.08 + Math.abs(Math.sin(pac.anim * 16)) * 0.62;
      else mouth = 0.28;
      if (world.invuln > 0 && world.state === 'playing' && Math.floor(this.t * 14) % 2 === 0) show = false;
      if (show) {
        wrapDraw(pac.px, (px) => {
          const cx = (px + 0.5) * T, cy = (pac.py + 0.5) * T;
          const powered = world.frightTimer > 0;
          if (world.state === 'dying') {
            Sprites.pac(ctx, cx, cy, T * 0.42, { skin: this.pacSkin, ang: -Math.PI / 2, mouth, t: this.t, glow: 6 });
          } else {
            Sprites.pac(ctx, cx, cy, T * 0.42 * (powered ? 1.08 : 1), { skin: this.pacSkin, ang: pac.face.a, mouth, t: this.t, glow: powered ? 22 : 12 });
          }
          if (world.shield && world.state !== 'dying') {
            ctx.save();
            ctx.strokeStyle = 'rgba(120,220,255,0.9)'; ctx.lineWidth = 2.2; ctx.shadowColor = '#7fe0ff'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(cx, cy, T * 0.62 + Math.sin(this.t * 6) * 1.2, 0, TAU); ctx.stroke();
            ctx.restore();
          }
        });
      }
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        if (p.life >= p.max) { this.particles.splice(i, 1); continue; }
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    }

    drawParticles(front) {
      const ctx = this.ctx;
      for (const p of this.particles) {
        const isFront = p.kind === 'confetti' || p.kind === 'spark';
        if (isFront !== front) continue;
        const a = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
        switch (p.kind) {
          case 'star': Sprites.star(ctx, p.x, p.y, p.size * (0.5 + a * 0.6)); break;
          case 'heart': Sprites.heart(ctx, p.x, p.y, p.size); break;
          case 'bubble': ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.2 - a * 0.4), 0, TAU); ctx.stroke(); break;
          case 'confetti': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot || 0) + p.life * 6); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); break;
          default: ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    drawFloats(dt) {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = '800 14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life += dt;
        if (f.life >= f.max) { this.floats.splice(i, 1); continue; }
        const a = 1 - f.life / f.max;
        ctx.globalAlpha = Math.min(1, a * 2);
        const y = f.y - f.life * 34;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(f.text, f.x, y);
        ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
      }
      ctx.restore();
    }

    // Agent debug overlay: planned path, target, role & vision memory.
    drawDebug(world, under) {
      const ctx = this.ctx, T = this.T;
      ctx.save();
      const skin = this.ghostSkin;
      if (under) {
        for (const gh of world.ghosts) {
          if (!gh.path || gh.path.length < 2 || gh.state === 'house') continue;
          const col = skin.colors[gh.index % skin.colors.length];
          ctx.strokeStyle = col; ctx.globalAlpha = 0.75; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.lineCap = 'round';
          ctx.beginPath();
          gh.path.forEach((p, i) => { const x = (p.x + 0.5) * T, y = (p.y + 0.5) * T; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
          ctx.stroke();
          ctx.setLineDash([]);
          if (gh.target) {
            const x = (gh.target.x + 0.5) * T, y = (gh.target.y + 0.5) * T;
            ctx.globalAlpha = 0.95; ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke();
          }
        }
        if (world.aiPac && world.pacAI.target) {
          const x = (world.pacAI.target.x + 0.5) * T, y = (world.pacAI.target.y + 0.5) * T;
          ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffe11a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke();
        }
        const lk = world.team.lastKnown;
        if (world.coordination && lk && world.team.isKnown()) {
          ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc((lk.x + 0.5) * T, (lk.y + 0.5) * T, 14 + Math.sin(this.t * 5) * 2, 0, TAU); ctx.stroke();
        }
      } else {
        ctx.font = '800 9px ' + FONT; ctx.textAlign = 'center';
        for (const gh of world.ghosts) {
          if (gh.state === 'house') continue;
          const x = (gh.px + 0.5) * T, y = (gh.py + 0.5) * T - T * 0.72;
          const label = gh.role || gh.state;
          const col = skin.colors[gh.index % skin.colors.length];
          const w = ctx.measureText(label).width + 8;
          ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(5,6,20,0.85)';
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 7, w, 13, 5) : ctx.rect(x - w / 2, y - 7, w, 13); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, y);
        }
      }
      ctx.restore();
    }
  }
  PM.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
