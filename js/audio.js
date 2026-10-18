(function (g) {
  'use strict';
  const PM = g.PM;

  // Procedural sound: everything is synthesised with Web Audio, no asset files needed.
  const A = {
    ctx: null, master: null, sfxG: null, musG: null,
    sfxVol: 0.7, musVol: 0.35, muted: false,
    musicOn: false, musicMode: 'normal', step: 0, nextT: 0, timer: null, wakaAlt: false,

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.sfxG = this.ctx.createGain(); this.sfxG.connect(this.master);
        this.musG = this.ctx.createGain(); this.musG.connect(this.master);
        this.applyVolumes();
      } catch (e) { this.ctx = null; }
    },
    applyVolumes() {
      if (!this.ctx) return;
      this.master.gain.value = this.muted ? 0 : 1;
      this.sfxG.gain.value = this.sfxVol * 0.5;
      this.musG.gain.value = this.musVol * 0.25;
    },
    setMuted(m) { this.muted = m; this.applyVolumes(); },
    setVolumes(s, m) { this.sfxVol = s; this.musVol = m; this.applyVolumes(); },

    tone(freq, dur, type, vol, slideTo, when, dest) {
      if (!this.ctx) return;
      const t0 = when || this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const gn = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.008);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(gn); gn.connect(dest || this.sfxG);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    noise(dur, vol, hp) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = this.ctx.createBufferSource(); s.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
      const gn = this.ctx.createGain(); gn.gain.value = vol || 0.4;
      s.connect(f); f.connect(gn); gn.connect(this.sfxG);
      s.start(t0);
    },

    sfx(name) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      switch (name) {
        case 'waka':
          this.wakaAlt = !this.wakaAlt;
          this.tone(this.wakaAlt ? 330 : 440, 0.07, 'triangle', 0.35, this.wakaAlt ? 520 : 300);
          break;
        case 'power':
          this.tone(220, 0.35, 'sawtooth', 0.35, 880);
          this.tone(330, 0.35, 'square', 0.15, 1100, t + 0.05);
          break;
        case 'eatGhost':
          this.tone(300, 0.25, 'square', 0.4, 1400);
          this.tone(600, 0.2, 'triangle', 0.3, 1800, t + 0.06);
          break;
        case 'death': {
          for (let i = 0; i < 9; i++) this.tone(900 - i * 85, 0.11, 'sawtooth', 0.32, 700 - i * 75, t + i * 0.11);
          this.noise(0.3, 0.25, 300);
          break;
        }
        case 'coin':
          this.tone(988, 0.08, 'square', 0.3);
          this.tone(1319, 0.2, 'square', 0.3, null, t + 0.07);
          break;
        case 'coinSpawn':
          this.tone(1568, 0.1, 'sine', 0.18);
          break;
        case 'fruit':
          [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.09, 'square', 0.28, null, t + i * 0.06));
          break;
        case 'level':
          [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'square', 0.3, null, t + i * 0.11));
          break;
        case 'ready':
          [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'square', 0.25, null, t + i * 0.1));
          break;
        case 'click': this.tone(660, 0.05, 'square', 0.18); break;
        case 'buy':
          [659, 880, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.35, null, t + i * 0.07));
          break;
        case 'deny': this.tone(180, 0.18, 'sawtooth', 0.3, 110); break;
        case 'shield': this.tone(500, 0.3, 'sine', 0.4, 1500); this.noise(0.15, 0.2, 2000); break;
        case 'freeze': this.tone(1500, 0.5, 'sine', 0.3, 300); this.noise(0.3, 0.15, 4000); break;
        case 'spotted': this.tone(740, 0.07, 'square', 0.12); break;
        case 'over':
          [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.35, null, t + i * 0.2));
          break;
        default: break;
      }
    },

    // ---- background music (tiny step sequencer) ----
    startMusic(mode) {
      if (!this.ctx) return;
      this.musicMode = mode || 'normal';
      if (this.musicOn) return;
      this.musicOn = true;
      this.step = 0;
      this.nextT = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 80);
    },
    stopMusic() {
      this.musicOn = false;
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },
    setMusicMode(m) { this.musicMode = m; },
    schedule() {
      if (!this.ctx || !this.musicOn) return;
      const modes = {
        menu: { bpm: 96, bass: [110, 0, 110, 0, 131, 0, 131, 0, 147, 0, 147, 0, 131, 0, 98, 0], arp: [440, 523, 659, 523, 440, 523, 659, 784, 587, 698, 880, 698, 523, 659, 784, 659] },
        normal: { bpm: 126, bass: [110, 110, 0, 110, 131, 131, 0, 131, 147, 147, 0, 147, 98, 98, 0, 131], arp: [0, 440, 0, 523, 0, 659, 0, 523, 0, 494, 0, 587, 0, 698, 0, 587] },
        fright: { bpm: 168, bass: [196, 0, 233, 0, 196, 0, 233, 0, 175, 0, 208, 0, 175, 0, 208, 0], arp: [784, 0, 932, 0, 784, 0, 932, 0, 698, 0, 831, 0, 698, 0, 831, 0] },
      };
      const m = modes[this.musicMode] || modes.normal;
      const stepDur = 60 / m.bpm / 2;
      while (this.nextT < this.ctx.currentTime + 0.35) {
        const i = this.step % 16;
        if (m.bass[i]) this.tone(m.bass[i], stepDur * 0.9, 'triangle', 0.9, null, this.nextT, this.musG);
        if (m.arp[i]) this.tone(m.arp[i], stepDur * 0.6, 'square', 0.35, null, this.nextT, this.musG);
        this.nextT += stepDur;
        this.step++;
      }
    },
  };
  PM.Audio = A;
})(typeof window !== 'undefined' ? window : globalThis);
