/* Supershear explainer: a rupture front moving along a straight fault in a 2-D homogeneous,
   isotropic elastic medium (Poisson solid, Vp = sqrt(3) Vs, Rayleigh speed cR = 0.9194 Vs).
   Each point the front passes radiates S (solid) and P (dashed) wavefronts. When Vr > Vs the
   S wavefronts pile up into a Mach front with half-angle asin(Vs/Vr).

   The speed scale shows the regimes of 2-D in-plane (mode II) steady rupture theory:
     0 – cR           sub-Rayleigh
     cR – Vs          excluded for steady mode II rupture (energy release would be negative)
     Vs – sqrt(2) Vs  supershear, but unstable in 2-D theory (below the Eshelby speed)
     sqrt(2) Vs – Vp  stable supershear (Burridge 1973; Andrews 1976)
   Geometry is self-similar, so the picture is rescaled so the front always crosses the frame
   in the same time. No data file: this is a kinematic illustration, not a simulation. */
import { hidpiCanvas, loop } from './common.js';

const CR = 0.9194, ESH = Math.SQRT2, VP = Math.sqrt(3);

export default async function supershear(el, ctx) {
  const panel = el.closest('.viz');
  const slider = panel.querySelector('input[type=range]');
  const out = panel.querySelector('output');
  const zoneEl = panel.querySelector('[data-zone]');
  const playBtn = panel.querySelector('[data-play]');
  let vr = +slider.value, t = ctx.reducedMotion ? 0.72 : 0, playing = !ctx.reducedMotion;
  const DUR = 5.5; // seconds for the front to cross the frame

  const C = hidpiCanvas(el, () => draw());
  function zone(v) {
    if (v < CR) return ['Sub-Rayleigh', 'Most ruptures propagate in this range.'];
    if (v < 1) return ['Between c<sub>R</sub> and V<sub>s</sub>', 'Excluded for steady in-plane rupture in 2-D theory.'];
    if (v < ESH) return ['Supershear, below the Eshelby speed', '2-D theory predicts this range to be unstable; Palu 2018 (≈4.1 km/s) sustained a speed in it.'];
    if (v <= VP + 1e-6) return ['Stable supershear', 'Between √2·V<sub>s</sub> and V<sub>p</sub> in 2-D mode II theory.'];
    return ['', ''];
  }
  function label() {
    out.textContent = vr.toFixed(2) + ' Vs';
    const z = zone(vr);
    const km = (vr * 3.5).toFixed(1);
    zoneEl.innerHTML = `<b>${z[0]}</b> · ${z[1]} <span class="muted">(${km} km/s if V<sub>s</sub> = 3.5 km/s${vr > 1 ? `; Mach half-angle ${(Math.asin(1 / vr) * 180 / Math.PI).toFixed(0)}°` : ''})</span>`;
  }

  function draw() {
    const g = C.ctx, { w, h } = C.size();
    const ink = ctx.css('--ink'), muted = ctx.css('--viz-muted'), acc = ctx.css('--accent'), grid = ctx.css('--viz-grid'), bg = ctx.css('--viz-bg');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const barH = 46;
    const H = h - barH;
    const y0 = H * 0.55;
    const x0 = w * 0.1, x1 = w * 0.9;
    const L = x1 - x0;
    const xf = x0 + L * Math.min(1, t);          // current front position (px)
    const k = 1 / vr;                             // S radius per px of front travel

    // medium grid
    g.strokeStyle = grid; g.lineWidth = 1;
    const step = Math.max(24, Math.round(w / 28));
    g.beginPath();
    for (let x = (x0 % step); x < w; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = y0 % step; y < H; y += step) { g.moveTo(0, y); g.lineTo(w, y); }
    g.stroke();

    // fault trace
    g.strokeStyle = muted; g.lineWidth = 1.2; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0); g.stroke(); g.setLineDash([]);

    g.save(); g.beginPath(); g.rect(0, 0, w, H); g.clip();
    // wavefronts emitted from points already ruptured
    const n = 34;
    for (let i = 0; i <= n; i++) {
      const xe = x0 + L * i / n;
      if (xe > xf) break;
      const d = xf - xe;
      const rs = d * k, rp = rs * VP;
      const age = d / L;
      const a = Math.max(0.07, 0.5 - age * 0.45);
      g.globalAlpha = a * 0.55; g.strokeStyle = muted; g.setLineDash([3, 4]); g.lineWidth = 1;
      g.beginPath(); g.arc(xe, y0, rp, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.globalAlpha = a; g.strokeStyle = ink; g.lineWidth = 1.1;
      g.beginPath(); g.arc(xe, y0, rs, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;

    // Mach front (S) when supershear: lines tangent to all S circles through the front
    if (vr > 1 && xf > x0) {
      const th = Math.asin(1 / vr);
      const len = (xf - x0);
      const bx = Math.cos(th) * len, by = Math.sin(th) * len;
      // tangent points of the envelope: from front tip back at angle th to the fault
      g.strokeStyle = acc; g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(xf, y0); g.lineTo(xf - bx * Math.cos(th), y0 - bx * Math.sin(th));
      g.moveTo(xf, y0); g.lineTo(xf - bx * Math.cos(th), y0 + bx * Math.sin(th));
      g.stroke();
      g.fillStyle = acc; g.font = '600 13px ' + ctx.css('--sans');
      const lx = xf - bx * Math.cos(th) * 0.55, ly = y0 - bx * Math.sin(th) * 0.55;
      g.fillText('S-wave Mach front', Math.max(8, lx - 60), Math.max(16, ly - 10));
      void by;
    }
    g.restore();

    // ruptured segment and front
    g.strokeStyle = acc; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(xf, y0); g.stroke();
    g.fillStyle = acc; g.beginPath(); g.arc(xf, y0, 5.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = ink; g.beginPath(); g.moveTo(x0, y0 - 7); g.lineTo(x0 + 6, y0); g.lineTo(x0, y0 + 7); g.lineTo(x0 - 6, y0); g.closePath(); g.fill();
    g.font = '12.5px ' + ctx.css('--sans'); g.fillStyle = ctx.css('--muted');
    g.fillText('hypocentre', x0 - 26, y0 + 24);
    g.fillText('rupture front', Math.min(w - 90, xf - 30), y0 + 24);
    // legend
    g.fillStyle = bg; g.globalAlpha = 0.85; g.fillRect(6, 6, 200, 20); g.globalAlpha = 1;
    g.fillStyle = ctx.css('--muted');
    g.fillText('— S wavefronts   - - P wavefronts', 12, 20);

    // speed scale
    const sy = H + 14, sx0 = 16, sx1 = w - 16, vmax = VP;
    const X = v => sx0 + (sx1 - sx0) * v / vmax;
    const zones = [[0, CR, 'sub-Rayleigh', 0.16], [CR, 1, '', 0.04], [1, ESH, 'unstable (2-D)', 0.3], [ESH, VP, 'stable supershear', 0.5]];
    for (const [a, b, name, alpha] of zones) {
      g.fillStyle = a >= 1 ? acc : muted; g.globalAlpha = alpha;
      g.fillRect(X(a), sy, X(b) - X(a) - 1, 8);
      g.globalAlpha = 1;
      if (name && X(b) - X(a) > 70) { g.fillStyle = ctx.css('--muted'); g.font = '11.5px ' + ctx.css('--sans'); g.fillText(name, X(a) + 4, sy + 24); }
    }
    g.fillStyle = ctx.css('--ink-2'); g.font = '11px ' + ctx.css('--sans');
    for (const [v, s] of [[CR, 'cR'], [1, 'Vs'], [ESH, '√2Vs'], [VP, 'Vp']]) {
      g.fillRect(X(v) - 0.5, sy - 4, 1, 16);
      const tw = g.measureText(s).width;
      g.fillText(s, Math.min(sx1 - tw, X(v) - tw / 2), sy - 6);
    }
    g.fillStyle = acc; g.beginPath(); g.moveTo(X(vr), sy + 9); g.lineTo(X(vr) - 5, sy + 17); g.lineTo(X(vr) + 5, sy + 17); g.closePath(); g.fill();
  }

  slider.addEventListener('input', () => { vr = +slider.value; label(); if (!playing) draw(); });
  if (playBtn) {
    const setBtn = () => { playBtn.innerHTML = `<svg class="ico" aria-hidden="true"><use href="assets/icons.svg#${playing ? 'i-pause' : 'i-play'}"></use></svg>${playing ? 'Pause' : 'Play'}`; };
    setBtn();
    playBtn.addEventListener('click', () => { playing = !playing; setBtn(); });
  }
  loop(ctx, dt => {
    if (playing) { t += dt / DUR; if (t > 1.25) t = 0; draw(); }
  });
  ctx.onTheme(draw);
  label(); draw();
}
