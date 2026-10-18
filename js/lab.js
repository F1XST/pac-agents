(function (g) {
  'use strict';
  const PM = g.PM;
  const $ = (s) => document.querySelector(s);

  const EXPERIMENTS = {
    coord: {
      title: 'ประสานงาน vs ไม่ประสานงาน',
      variants: (c) => [
        { label: '🤝 ประสานงานเป็นทีม', o: { coordination: true } },
        { label: '👤 ต่างคนต่างคิด', o: { coordination: false } },
      ],
    },
    algo: {
      title: 'อัลกอริทึมหาเส้นทาง',
      variants: () => [
        { label: 'BFS', o: { algo: 'bfs' } },
        { label: 'A*', o: { algo: 'astar' } },
        { label: 'Greedy', o: { algo: 'greedy' } },
      ],
    },
    count: {
      title: 'จำนวนผี',
      variants: () => [1, 2, 3, 4].map((n) => ({ label: '👻 ' + n + ' ตัว', o: { ghostCount: n } })),
    },
    diff: {
      title: 'ระดับความยาก',
      variants: () => PM.DIFF_ORDER.map((d) => ({ label: PM.DIFFS[d].icon + ' ' + PM.DIFFS[d].name, o: { difficulty: d } })),
    },
  };

  const stats = (arr) => {
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, n - 1));
    const sorted = arr.slice().sort((a, b) => a - b);
    const med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    return { mean, sd, ci: 1.96 * sd / Math.sqrt(n), med };
  };

  const Lab = {
    running: false,
    open() { /* nothing to prepare */ },
    stop() { this.running = false; },

    async run() {
      if (this.running) return;
      this.running = true;
      $('#labRun').disabled = true; $('#labStop').disabled = false;
      const key = $('#labExp').value;
      const exp = EXPERIMENTS[key];
      const base = {
        difficulty: $('#labDiff').value, coordination: true, algo: 'astar', ghostCount: 4,
        cap: +$('#labCap').value, mapMode: $('#labMap').value,
      };
      const trials = +$('#labTrials').value;
      const variants = exp.variants(base);
      const total = variants.length * trials;
      let done = 0;
      const results = variants.map((v) => ({ v, rows: [] }));
      for (let i = 0; i < trials && this.running; i++) {
        for (const r of results) {
          if (!this.running) break;
          const cfg = Object.assign({}, base, r.v.o, { seed: 7000 + i * 31 });
          r.rows.push(PM.runTrial(cfg));
          done++;
        }
        $('#labBar').style.width = (done / total * 100).toFixed(0) + '%';
        $('#labPct').textContent = Math.round(done / total * 100) + '%';
        this.render(exp, results, base, i + 1);
        await new Promise((res) => setTimeout(res, 0));
      }
      this.running = false;
      $('#labRun').disabled = false; $('#labStop').disabled = true;
    },

    render(exp, results, base, n) {
      const rows = results.map((r) => {
        const sv = stats(r.rows.map((x) => x.survived));
        const caught = r.rows.filter((x) => x.caught).length;
        const dots = stats(r.rows.map((x) => x.dots)).mean;
        const dec = r.rows.reduce((a, x) => a + x.decisions, 0);
        const exp2 = r.rows.reduce((a, x) => a + x.expanded, 0);
        return { label: r.v.label, sv, caught, n: r.rows.length, dots, nodes: dec ? exp2 / dec : 0 };
      });
      const max = Math.max.apply(null, rows.map((r) => r.sv.mean)) || 1;
      let html = '<table class="lab-table"><thead><tr><th>กลุ่ม</th><th>เวลาที่ Pac-Man รอด (เฉลี่ย)</th><th>มัธยฐาน</th><th>ถูกจับ</th><th>เม็ดที่กิน</th><th>โหนดที่ขยาย/การตัดสินใจ</th></tr></thead><tbody>';
      for (const r of rows) {
        html += '<tr><td><b>' + r.label + '</b></td><td><div class="bar"><i style="width:' + (r.sv.mean / max * 100).toFixed(0) + '%"></i><span>' +
          r.sv.mean.toFixed(1) + ' ± ' + r.sv.ci.toFixed(1) + ' วิ</span></div></td><td>' + r.sv.med.toFixed(1) + ' วิ</td><td>' +
          Math.round(r.caught / r.n * 100) + '%</td><td>' + r.dots.toFixed(0) + '</td><td>' + r.nodes.toFixed(1) + '</td></tr>';
      }
      html += '</tbody></table>';
      const best = rows.slice().sort((a, b) => a.sv.mean - b.sv.mean)[0];
      const worst = rows.slice().sort((a, b) => b.sv.mean - a.sv.mean)[0];
      html += '<div class="lab-note">📊 <b>สรุป (' + n + ' รอบต่อกลุ่ม · ' + exp.title + ')</b><br>' +
        (rows.length > 1 && best !== worst
          ? 'กลุ่มที่จับ Pac-Man ได้เร็วที่สุดคือ <b>' + best.label + '</b> (รอดเฉลี่ย ' + best.sv.mean.toFixed(1) + ' วิ) เทียบกับ <b>' + worst.label + '</b> (' + worst.sv.mean.toFixed(1) + ' วิ)'
          : '') +
        '<br>ค่า ± คือช่วงความเชื่อมั่น 95% ถ้าช่วงของสองกลุ่มซ้อนทับกันมาก แปลว่าความต่างอาจเกิดจากความบังเอิญ — เพิ่มจำนวนรอบเพื่อให้ผลนิ่งขึ้น' +
        (base.difficulty === 'hard' || base.difficulty === 'insane' ? '<br>หมายเหตุ: ระดับยาก/โหดผีมองเห็นไกลหรือรู้ตำแหน่งตลอด ข้อได้เปรียบของการแชร์ข้อมูลจึงลดลง' : '') +
        '</div>';
      $('#labOut').innerHTML = html;
    },

    init() {
      $('#labRun').onclick = () => this.run();
      $('#labStop').onclick = () => this.stop();
    },
  };
  PM.Lab = Lab;
})(typeof window !== 'undefined' ? window : globalThis);
