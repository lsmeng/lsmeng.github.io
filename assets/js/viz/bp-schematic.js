/* Back-projection schematic: delay-and-stack beamforming.
   1. A source radiates; the wavefront reaches the stations of an array at different times.
   2. Each station records the same wavelet, shifted by its travel time.
   3. For a trial source location, traces are shifted by the predicted travel times.
      At the true location they line up and the stack (beam) is large; at a wrong
      location they do not, and the stack is small.
   Back-projection repeats this for every grid point and every time window; the brightest
   points trace the rupture. Purely illustrative (homogeneous medium, synthetic wavelet). */
import { hidpiCanvas, loop } from './common.js';

export default async function bpSchematic(el, ctx) {
  const panel = el.closest('.viz');
  const replay = panel && panel.querySelector('[data-replay]');
  const NST = 7;
  let T = ctx.reducedMotion ? 1 : 0;
  const DUR = 9; // s for full cycle
  const C = hidpiCanvas(el, () => draw());

  // deterministic noise
  const noise = Array.from({ length: NST }, (_, i) => Array.from({ length: 200 }, (_, j) => Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1));
  const ricker = (x, f = 1) => { const a = Math.PI * f * x; return (1 - 2 * a * a) * Math.exp(-a * a); };

  function draw() {
    const g = C.ctx, { w, h } = C.size();
    const css = n => ctx.css(n);
    const ink = css('--ink'), muted = css('--viz-muted'), acc = css('--accent'), bg = css('--viz-bg'), txt = css('--muted');
    const font = css('--sans');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const vertical = w < 560;
    // regions
    const mapR = vertical ? { x: 12, y: 10, w: w - 24, h: h * 0.44 } : { x: 14, y: 14, w: w * 0.42, h: h - 28 };
    const trR = vertical ? { x: 12, y: h * 0.47, w: w - 24, h: h * 0.53 - 10 } : { x: w * 0.47, y: 14, w: w * 0.53 - 16, h: h - 28 };

    // --- map: source, wrong trial point, array ---
    const src = { x: mapR.x + mapR.w * 0.18, y: mapR.y + mapR.h * 0.5 };
    const wrong = { x: mapR.x + mapR.w * 0.28, y: mapR.y + mapR.h * 0.2 };
    const st = [];
    for (let i = 0; i < NST; i++) {
      const u = i / (NST - 1);
      st.push({ x: mapR.x + mapR.w * (0.82 + 0.06 * Math.sin(u * 5.1)), y: mapR.y + mapR.h * (0.14 + 0.72 * u) });
    }
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const tt = st.map(s => dist(src, s));
    const ttw = st.map(s => dist(wrong, s));
    const tmin = Math.min(...tt), tmax = Math.max(...tt);
    const v = (mapR.w * 0.75) / 1; // px per unit time, wave crosses in ~1 unit

    // phase timing
    const p1 = Math.min(1, T / 0.36);                 // propagation
    const p2 = Math.max(0, Math.min(1, (T - 0.42) / 0.22)); // alignment
    const p3 = Math.max(0, Math.min(1, (T - 0.68) / 0.2));  // stacking
    const tNow = p1 * (tmax / v + 0.25);

    // grid of trial points
    g.fillStyle = muted; g.globalAlpha = 0.45;
    for (let gx = 0; gx < 5; gx++) for (let gy = 0; gy < 6; gy++) {
      const x = mapR.x + mapR.w * (0.06 + gx * 0.085), y = mapR.y + mapR.h * (0.12 + gy * 0.155);
      g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    // wavefront
    if (p1 > 0 && p1 < 1) {
      const r = tNow * v;
      for (const [dr, a] of [[0, 0.8], [-9, 0.35], [-18, 0.15]]) {
        if (r + dr <= 0) continue;
        g.strokeStyle = ink; g.globalAlpha = a; g.lineWidth = 1.3;
        g.beginPath(); g.arc(src.x, src.y, r + dr, -1.2, 1.2); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // rays (after arrival) for the true source
    g.strokeStyle = acc; g.globalAlpha = 0.35; g.setLineDash([3, 4]); g.lineWidth = 1;
    st.forEach((s, i) => { if (tNow * v >= tt[i] || p2 > 0) { g.beginPath(); g.moveTo(src.x, src.y); g.lineTo(s.x, s.y); g.stroke(); } });
    g.setLineDash([]); g.globalAlpha = 1;
    // source star
    star(g, src.x, src.y, 8, acc);
    g.strokeStyle = muted; g.lineWidth = 1.3; g.beginPath(); g.arc(wrong.x, wrong.y, 5, 0, 7); g.stroke();
    // stations
    st.forEach((s, i) => {
      const hit = tNow * v >= tt[i];
      g.fillStyle = hit ? ink : muted;
      g.beginPath(); g.moveTo(s.x, s.y - 7); g.lineTo(s.x + 6, s.y + 4); g.lineTo(s.x - 6, s.y + 4); g.closePath(); g.fill();
    });
    g.font = '12px ' + font; g.fillStyle = txt;
    g.fillText('source', src.x - 18, src.y + 22);
    g.fillText('wrong trial point', Math.max(mapR.x, wrong.x - 40), wrong.y - 10);
    g.fillText('array', st[0].x - 14, Math.max(12, st[0].y - 12));

    // --- traces ---
    const lab = 84;
    const x0 = trR.x + lab, x1 = trR.x + trR.w - 4;
    const rows = NST + 2.6;
    const dy = trR.h / rows;
    const tWin = [tmin / v - 0.25, tmax / v + 0.45];
    const X = t => x0 + (x1 - x0) * (t - tWin[0]) / (tWin[1] - tWin[0]);
    const amp = dy * 0.42;
    const ref = tt[0] / v; // align to first station's predicted time
    g.font = '11.5px ' + font;
    g.fillStyle = txt;
    g.fillText(p2 > 0 ? 'shifted by predicted travel time' : 'recorded traces', x0, trR.y + 10);
    for (let i = 0; i < NST; i++) {
      const yc = trR.y + dy * (i + 1.1);
      const arr = tt[i] / v;
      const shift = p2 * (arr - ref);
      g.fillStyle = txt; g.fillText('st ' + (i + 1), trR.x + 4, yc + 4);
      g.strokeStyle = i === 0 ? ink : ink; g.lineWidth = 1.1; g.globalAlpha = 0.9;
      g.beginPath();
      const tEnd = p2 > 0 ? tWin[1] + 1 : tNow;
      let first = true;
      for (let k = 0; k <= 180; k++) {
        const tt_ = tWin[0] + (tWin[1] - tWin[0]) * k / 180;
        const tr = tt_ + shift; // time in the original trace
        if (tr > tEnd) break;
        const y = yc - amp * (ricker((tr - arr) * 5.5) + 0.08 * (noise[i][k] - 0.5));
        const x = X(tt_);
        first ? g.moveTo(x, y) : g.lineTo(x, y); first = false;
      }
      g.stroke(); g.globalAlpha = 1;
    }
    if (p2 > 0.99) { g.strokeStyle = acc; g.globalAlpha = 0.5; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(ref), trR.y + dy * 0.5); g.lineTo(X(ref), trR.y + dy * (NST + 0.6)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }

    // stacks
    if (p3 > 0) {
      const yT = trR.y + dy * (NST + 1.25), yW = trR.y + dy * (NST + 2.15);
      g.fillStyle = acc; g.fillText('stack, true', trR.x + 2, yT + 4);
      g.fillStyle = txt; g.fillText('stack, wrong', trR.x + 2, yW + 4);
      const kmax = Math.floor(180 * p3);
      for (const [yy, useWrong, col, lw] of [[yT, false, acc, 2], [yW, true, muted, 1.4]]) {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        for (let k = 0; k <= kmax; k++) {
          const tt_ = tWin[0] + (tWin[1] - tWin[0]) * k / 180;
          let s = 0;
          for (let i = 0; i < NST; i++) {
            const arr = tt[i] / v;
            const pred = (useWrong ? ttw[i] : tt[i]) / v, pred0 = (useWrong ? ttw[0] : tt[0]) / v;
            const tr = tt_ + (pred - pred0);
            s += ricker((tr - arr) * 5.5);
          }
          s /= NST;
          const y = yy - amp * 1.6 * s * 0.62;
          const x = X(tt_);
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    }
  }
  function star(g, x, y, r, c) {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    g.closePath(); g.fill();
  }
  if (replay) replay.addEventListener('click', () => { T = 0; });
  loop(ctx, dt => { if (!ctx.reducedMotion && T < 1.12) { T += dt / DUR; draw(); } else if (T >= 1.12 && !ctx.reducedMotion) { T = 0; } });
  ctx.onTheme(draw);
  draw();
}
