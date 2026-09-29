/* Tsunami sea-surface animation over bathymetry, from precomputed solver output.

   Data schema (assets/data/tsunami/<name>.json):
   {
     "meta":  { "event", "citation", "doi", "notes", "bathymetry_source", "stub" },
     "grid":  { "lon0", "lat0", "dlon", "dlat", "nx", "ny" },   // cell centres (lon0/lat0 = SW cell)
     "depth": [ nx*ny ints ],    // water depth in m (positive = sea), rows ordered north -> south
     "frames": { "png": "path.png", "n", "times_min": [...], "scale_m",
                 "row_order": "north to south" },
        // PNG sprite sheet: n frames of nx × ny stacked vertically, 8-bit grey,
        // eta = (v - 128) / 127 * scale_m, v = 0 marks land
     "coast": [ [[lon, lat], ...], ... ]   // optional coastline polylines
   }
   Between stored frames the field is interpolated linearly in time for smooth playback. */
import { loadJSON, hidpiCanvas, loop, flagStub, dataFooter, diverge, cssGradient } from './common.js';

export default async function tsunami(el, ctx) {
  const panel = el.closest('.viz');
  const data = await loadJSON(el.dataset.src);
  flagStub(el, data.meta);
  dataFooter(panel, [{ href: el.dataset.src, label: 'JSON (bathymetry + metadata)' }, { href: data.frames.png, label: 'PNG frames' }], data.meta);
  const { nx, ny, lon0, lat0, dlon, dlat } = data.grid;
  const F = data.frames, NF = F.n, N = nx * ny;
  const times = F.times_min;

  // decode frames from the PNG sprite sheet
  const im = new Image(); im.src = F.png; await im.decode();
  const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny * NF;
  const cg = cv.getContext('2d', { willReadFrequently: true }); cg.drawImage(im, 0, 0);
  const px = cg.getImageData(0, 0, nx, ny * NF).data;
  const frames = new Float32Array(NF * N), land = new Uint8Array(N);
  for (let i = 0; i < NF * N; i++) { const v = px[i * 4]; frames[i] = v === 0 ? 0 : (v - 128) / 127 * F.scale_m; }
  for (let i = 0; i < N; i++) land[i] = px[i * 4] === 0 ? 1 : 0;
  const H = Float32Array.from(data.depth);
  let hmax = 0; for (let i = 0; i < N; i++) if (!land[i]) hmax = Math.max(hmax, H[i]);
  const scale = +(el.dataset.scale || 1.0); // colour saturates at ±scale m

  const img = document.createElement('canvas'); img.width = nx; img.height = ny;
  const ig = img.getContext('2d'); const id = ig.createImageData(nx, ny);
  let landRGB = [200, 200, 200];
  const parse = s => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = s; const x = c.fillStyle; if (x[0] === '#') return [1, 3, 5].map(k => parseInt(x.slice(k, k + 2), 16)); return x.match(/\d+/g).slice(0, 3).map(Number); };
  function palette() {
    landRGB = parse(ctx.css('--viz-land'));
    const cb = panel.querySelector('.cbar'); if (cb) cb.style.background = cssGradient(x => diverge(2 * x - 1));
    panel.querySelectorAll('[data-amp]').forEach(am => { am.textContent = scale.toFixed(1); });
  }
  let tMin = 0; // current time in minutes
  const tEnd = times[NF - 1];
  function paint() {
    const deep = [196, 206, 213], shallow = [238, 240, 240];
    let k = 0; while (k < NF - 2 && times[k + 1] <= tMin) k++;
    const f = Math.min(1, Math.max(0, (tMin - times[k]) / (times[k + 1] - times[k])));
    const A = k * N, B = (k + 1) * N, d = id.data;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (land[i]) { d[o] = landRGB[0]; d[o + 1] = landRGB[1]; d[o + 2] = landRGB[2]; d[o + 3] = 255; continue; }
      const q = Math.min(1, Math.sqrt(H[i] / hmax));
      const b0 = shallow[0] + (deep[0] - shallow[0]) * q, b1 = shallow[1] + (deep[1] - shallow[1]) * q, b2 = shallow[2] + (deep[2] - shallow[2]) * q;
      const e = (frames[A + i] * (1 - f) + frames[B + i] * f) / scale;
      const a = Math.min(1, Math.abs(e) * 1.4);
      const w = diverge(e);
      d[o] = b0 + (w[0] - b0) * a; d[o + 1] = b1 + (w[1] - b1) * a; d[o + 2] = b2 + (w[2] - b2) * a; d[o + 3] = 255;
    }
    ig.putImageData(id, 0, 0);
  }
  const C = hidpiCanvas(el, () => draw());
  function draw() {
    const g = C.ctx, { w, h } = C.size(), font = ctx.css('--sans');
    g.fillStyle = ctx.css('--viz-bg'); g.fillRect(0, 0, w, h);
    const latc = lat0 + dlat * ny / 2, kc = Math.cos(latc * Math.PI / 180);
    const s = Math.min((w - 20) / (nx * kc), (h - 20) / ny);
    const W = nx * kc * s, Hh = ny * s, ox = (w - W) / 2, oy = (h - Hh) / 2;
    paint();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, ox, oy, W, Hh);
    const lonW = lon0 - dlon / 2, latS = lat0 - dlat / 2;
    const X = lon => ox + (lon - lonW) / (dlon * nx) * W, Y = lat => oy + Hh - (lat - latS) / (dlat * ny) * Hh;
    if (data.coast) {
      g.strokeStyle = ctx.css('--ink-2'); g.lineWidth = 0.8; g.globalAlpha = 0.8;
      for (const line of data.coast) { g.beginPath(); line.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.strokeStyle = ctx.css('--line-2'); g.lineWidth = 1; g.strokeRect(ox + 0.5, oy + 0.5, W - 1, Hh - 1);
    // graticule ticks
    g.fillStyle = ctx.css('--muted'); g.font = '11px ' + font;
    for (let lo = Math.ceil(lonW); lo <= lonW + dlon * nx; lo += 2) g.fillText(`${lo}°E`, X(lo) - 12, oy + Hh - 5);
    for (let la = Math.ceil(latS); la <= latS + dlat * ny; la += 2) g.fillText(`${la}°N`, ox + 4, Y(la) + 4);
    g.fillStyle = ctx.css('--card'); g.globalAlpha = 0.92; g.fillRect(ox + 10, oy + 10, 132, 28); g.globalAlpha = 1;
    g.fillStyle = ctx.css('--ink'); g.font = '600 13.5px ' + font;
    g.fillText(`t = ${tMin.toFixed(0)} min`, ox + 20, oy + 29);
  }
  const slider = panel.querySelector('input[type=range]');
  const out = panel.querySelector('output');
  const playBtn = panel.querySelector('[data-play]');
  if (slider) { slider.min = 0; slider.max = tEnd; slider.step = 1; }
  let playing = !ctx.reducedMotion;
  if (ctx.reducedMotion) tMin = Math.min(tEnd, 24);
  function setT(v) { tMin = v; if (slider) slider.value = v; if (out) out.textContent = v.toFixed(0) + ' min'; draw(); }
  function setBtn() { if (playBtn) playBtn.innerHTML = `<svg class="ico" aria-hidden="true"><use href="assets/icons.svg#${playing ? 'i-pause' : 'i-play'}"></use></svg>${playing ? 'Pause' : 'Play'}`; }
  if (slider) slider.addEventListener('input', () => { playing = false; setBtn(); setT(+slider.value); });
  if (playBtn) playBtn.addEventListener('click', () => { playing = !playing; if (playing && tMin >= tEnd) tMin = 0; setBtn(); });
  setBtn();
  let hold = 0;
  loop(ctx, dt => {
    if (!playing) return;
    if (tMin >= tEnd) { hold += dt; if (hold > 1.5) { hold = 0; setT(0); } return; }
    setT(Math.min(tEnd, tMin + dt * tEnd / 16));
  });
  ctx.onTheme(() => { palette(); draw(); });
  palette(); setT(tMin);
}
