/* Back-projection radiator playback on a map.

   Data schema (assets/data/bp/<event>.json):
   {
     "meta": { "event", "date", "mw", "array", "band_hz", "method", "citation", "doi", "notes", "stub" },
     "hypocenter": { "lat": 22.01, "lon": 95.92, "depth_km": 10 },
     "bbox": [lonMin, latMin, lonMax, latMax],            // optional; otherwise fitted to the data
     "faults": [ [[lon, lat], ...], ... ],                 // optional fault traces
     "radiators": [ { "t": 12.0, "lat": 21.8, "lon": 95.95, "power": 0.83 }, ... ]
        // or  "columns": ["t","lat","lon","power"], "rows": [[...], ...]
   }
   t = seconds after origin time, power = normalised beam power (0–1).
   Colour encodes time (viridis), marker area encodes power. The inset plots distance from the
   epicentre against time, which is how rupture speed is usually read off a BP image. */
import { loadJSON, hidpiCanvas, loop, flagStub, dataFooter, mapProj, landRings, drawLand, viridis, rgb, cssGradient } from './common.js';

export default async function bpmap(el, ctx) {
  const panel = el.closest('.viz');
  const evSel = panel.querySelector('select[data-event]');
  const arSel = panel.querySelector('select[data-array]');
  let rings = [];
  try { rings = await landRings('50m'); } catch (e) { console.warn('coastlines unavailable', e); }
  const hav = (a, b) => { const r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r; const s = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(s)); };
  let data, R, hypo, tMax, pMax, bbox, dMax;
  function useArray(name) {
    let src = data.radiators;
    if (!src && data.arrays) src = data.arrays[name] || Object.values(data.arrays)[0];
    if (!src && data.rows) { const c = data.columns; src = data.rows.map(r => Object.fromEntries(c.map((k, i) => [k, r[i]]))); }
    R = src.filter(r => isFinite(r.t) && isFinite(r.lat) && isFinite(r.lon) && r.t >= 0).sort((a, b) => a.t - b.t);
    const tw = data.time_window;
    if (tw) R = R.filter(r => r.t <= tw[1]);
    hypo = data.hypocenter || { lat: R[0].lat, lon: R[0].lon };
    tMax = Math.max(...R.map(r => r.t));
    pMax = Math.max(...R.map(r => (r.power == null ? 1 : r.power)));
    // bbox from all arrays so switching arrays keeps the frame
    const all = data.arrays ? Object.values(data.arrays).flat() : R;
    bbox = data.bbox;
    if (!bbox) {
      const lons = all.map(r => r.lon).concat(hypo.lon), lats = all.map(r => r.lat).concat(hypo.lat);
      const a = Math.min(...lons), b = Math.min(...lats), c = Math.max(...lons), d = Math.max(...lats);
      const m = Math.max(0.35, 0.2 * Math.max(c - a, d - b));
      bbox = [a - m, b - m, c + m, d + m];
    }
    R.forEach(r => { r.d = hav(hypo, r); });
    dMax = Math.max(...R.map(r => r.d), 1);
    if (slider) { slider.max = Math.ceil(tMax); }
    const tmaxEl = panel.querySelector('[data-tmax]'); if (tmaxEl) tmaxEl.textContent = Math.round(tMax) + ' s';
  }
  let frames = null; // optional beam-power maps: { F, n, t, nx, ny, box, img, ig, id }
  async function loadFrames(f) {
    const im = new Image(); im.src = f.png; await im.decode();
    const cv = document.createElement('canvas'); cv.width = f.nx; cv.height = f.ny * f.n;
    const cg = cv.getContext('2d', { willReadFrequently: true }); cg.drawImage(im, 0, 0);
    const px = cg.getImageData(0, 0, f.nx, f.ny * f.n).data;
    const F = new Uint8Array(f.nx * f.ny * f.n); for (let i = 0; i < F.length; i++) F[i] = px[i * 4];
    const img = document.createElement('canvas'); img.width = f.nx; img.height = f.ny;
    const ig = img.getContext('2d');
    return { ...f, F, img, ig, id: ig.createImageData(f.nx, f.ny) };
  }
  function paintFrame(g, P) {
    if (!frames) return;
    const f = frames; let k = 0;
    while (k < f.n - 1 && f.t[k + 1] <= t) k++;
    if (t < f.t[0]) return;
    const N = f.nx * f.ny, d = f.id.data, off = k * N;
    let fmax = 1; for (let i = 0; i < N; i++) fmax = Math.max(fmax, f.F[off + i]); // normalise each window to its own peak
    const dark = ctx.theme() === 'dark';
    for (let i = 0; i < N; i++) {
      const v = f.F[off + i] / fmax, a = Math.max(0, (v - 0.7) / 0.3);
      const c = viridis(0.25 + 0.75 * v);
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255 * 0.7 * Math.min(1, a * a);
    }
    f.ig.putImageData(f.id, 0, 0);
    const dl = (f.lon1 - f.lon0) / (f.nx - 1) / 2, dt = (f.lat1 - f.lat0) / (f.ny - 1) / 2;
    const x0 = P.x(f.lon0 - dl), x1 = P.x(f.lon1 + dl), y0 = P.y(f.lat1 + dt), y1 = P.y(f.lat0 - dt);
    g.imageSmoothingEnabled = true; g.drawImage(f.img, x0, y0, x1 - x0, y1 - y0);
  }
  async function load(url) {
    data = await loadJSON(url);
    frames = data.frames ? await loadFrames(data.frames) : null;
    el.querySelectorAll('.stub-flag').forEach(n => n.remove());
    flagStub(el, data.meta);
    const foot = panel.querySelector('.viz-foot'); if (foot) { foot.textContent = ''; delete foot.dataset.filled; }
    dataFooter(panel, [{ href: url, label: 'JSON' }].concat(data.frames ? [{ href: data.frames.png, label: 'Beam-power frames (PNG)' }] : []).concat(el.dataset.csv ? [{ href: el.dataset.csv, label: 'CSV (all events)' }] : []), data.meta);
    if (arSel) {
      const names = data.arrays ? Object.keys(data.arrays).filter(a => data.arrays[a].length > 10) : [];
      arSel.innerHTML = names.map(a => `<option value="${a}">${a} array</option>`).join('');
      arSel.parentElement.hidden = names.length < 2;
    }
    useArray(arSel ? arSel.value : null);
  }
  const slider = panel.querySelector('input[type=range]');
  await load(evSel ? evSel.value : el.dataset.src);
  const out = panel.querySelector('output');
  const playBtn = panel.querySelector('[data-play]');
  const cbar = panel.querySelector('.cbar');
  if (cbar) cbar.style.background = cssGradient(viridis);
  slider.step = 0.5;
  let t = ctx.reducedMotion ? tMax : 0, playing = !ctx.reducedMotion;
  slider.value = t;

  const C = hidpiCanvas(el, () => draw());
  function draw() {
    const g = C.ctx, { w, h } = C.size();
    const css = n => ctx.css(n), font = css('--sans');
    g.fillStyle = css('--viz-ocean'); g.fillRect(0, 0, w, h);
    const narrow = w < 560;
    const inset = narrow ? { x: 10, y: h - 118, w: w - 20, h: 108 } : { x: w - 250, y: h - 168, w: 236, h: 154 };
    const mapH = narrow ? h - 128 : h;
    const P = mapProj(bbox, w, mapH, 22);
    drawLand(g, rings, P, bbox, css('--viz-land'), css('--line-2'));
    // graticule labels
    g.strokeStyle = css('--viz-grid'); g.lineWidth = 1; g.font = '11px ' + font; g.fillStyle = css('--muted');
    let stepDeg = niceStep(bbox[2] - bbox[0]);
    while (P.s * P.k * stepDeg < 56 && stepDeg < 20) stepDeg *= 2; // keep labels at least ~56 px apart
    for (let lo = Math.ceil(bbox[0] / stepDeg) * stepDeg; lo <= bbox[2]; lo += stepDeg) { const x = P.x(lo); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, mapH); g.stroke(); g.fillText(fmtDeg(lo, 'E', 'W'), x + 3, mapH - 6); }
    for (let la = Math.ceil(bbox[1] / stepDeg) * stepDeg; la <= bbox[3]; la += stepDeg) { const y = P.y(la); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); g.fillText(fmtDeg(la, 'N', 'S'), 4, y - 3); }
    // faults
    if (data.faults) {
      g.strokeStyle = css('--ink-2'); g.lineWidth = 1.2; g.globalAlpha = 0.7;
      for (const f of data.faults) { g.beginPath(); f.forEach(([lo, la], i) => (i ? g.lineTo(P.x(lo), P.y(la)) : g.moveTo(P.x(lo), P.y(la)))); g.stroke(); }
      g.globalAlpha = 1;
    }
    paintFrame(g, P);
    // radiators up to t
    const rMax = Math.max(3, Math.min(w, h) / 95);
    for (const r of R) {
      if (r.t > t) break;
      const p = (r.power == null ? 1 : r.power) / pMax;
      const rad = 1.5 + rMax * Math.sqrt(p);
      const c = viridis(r.t / tMax);
      const recent = t - r.t < 3;
      g.fillStyle = rgb(c, recent ? 0.95 : 0.72);
      g.beginPath(); g.arc(P.x(r.lon), P.y(r.lat), rad, 0, 7); g.fill();
      if (recent) { g.strokeStyle = css('--ink'); g.lineWidth = 1; g.stroke(); }
    }
    // hypocentre
    star(g, P.x(hypo.lon), P.y(hypo.lat), 9, css('--accent'), css('--paper'));
    // scale bar
    const km = niceKm(dMax);
    const bx = narrow ? w - 14 - P.kmToPx(km) : 16, by = narrow ? 18 : mapH - 26;
    g.strokeStyle = css('--ink'); g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + P.kmToPx(km), by); g.stroke();
    g.fillStyle = css('--ink'); g.font = '11.5px ' + font; g.fillText(km + ' km', bx, by - 5);

    // inset: distance vs time
    g.fillStyle = css('--card'); g.globalAlpha = 0.94; g.fillRect(inset.x, inset.y, inset.w, inset.h); g.globalAlpha = 1;
    g.strokeStyle = css('--line-2'); g.lineWidth = 1; g.strokeRect(inset.x + 0.5, inset.y + 0.5, inset.w - 1, inset.h - 1);
    const ix0 = inset.x + 34, ix1 = inset.x + inset.w - 8, iy0 = inset.y + inset.h - 20, iy1 = inset.y + 16;
    g.fillStyle = css('--muted'); g.font = '10.5px ' + font;
    g.fillText('distance from epicentre (km)', inset.x + 6, inset.y + 11);
    g.fillText('0', ix0 - 10, iy0 + 3); g.fillText(Math.round(dMax), inset.x + 4, iy1 + 4);
    g.fillText('time (s)', (ix0 + ix1) / 2 - 18, iy0 + 14); g.fillText(Math.round(tMax), ix1 - 14, iy0 + 14);
    g.strokeStyle = css('--line-2'); g.beginPath(); g.moveTo(ix0, iy1); g.lineTo(ix0, iy0); g.lineTo(ix1, iy0); g.stroke();
    for (const r of R) {
      if (r.t > t) break;
      const p = (r.power == null ? 1 : r.power) / pMax;
      g.fillStyle = rgb(viridis(r.t / tMax), 0.85);
      g.beginPath(); g.arc(ix0 + (ix1 - ix0) * r.t / tMax, iy0 - (iy0 - iy1) * r.d / dMax, 1 + 2.4 * Math.sqrt(p), 0, 7); g.fill();
    }
    const xt = ix0 + (ix1 - ix0) * t / tMax;
    g.strokeStyle = css('--accent'); g.globalAlpha = 0.6; g.beginPath(); g.moveTo(xt, iy1); g.lineTo(xt, iy0); g.stroke(); g.globalAlpha = 1;
  }
  function star(g, x, y, r, c, edge) {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    g.closePath(); g.fill(); g.strokeStyle = edge; g.lineWidth = 1; g.stroke();
  }
  const niceStep = span => (span > 12 ? 5 : span > 5 ? 2 : span > 2.4 ? 1 : 0.5);
  const niceKm = d => { const c = [10, 20, 25, 50, 100, 200, 250, 500]; return c.find(x => x >= d / 4) || 500; };
  const fmtDeg = (v, p, n) => `${Math.abs(+v.toFixed(1))}°${v >= 0 ? p : n}`;

  function setT(v) { t = v; slider.value = v; out.textContent = v.toFixed(0) + ' s'; draw(); }
  slider.addEventListener('input', () => { playing = false; setBtn(); setT(+slider.value); });
  function setBtn() { if (playBtn) playBtn.innerHTML = `<svg class="ico" aria-hidden="true"><use href="assets/icons.svg#${playing ? 'i-pause' : 'i-play'}"></use></svg>${playing ? 'Pause' : 'Play'}`; }
  if (playBtn) playBtn.addEventListener('click', () => { playing = !playing; if (playing && t >= tMax) t = 0; setBtn(); });
  setBtn();
  let hold = 0;
  loop(ctx, dt => {
    if (!playing) return;
    if (t >= tMax) { hold += dt; if (hold > 2.2) { hold = 0; setT(0); } return; }
    setT(Math.min(tMax, t + dt * Math.max(8, tMax / 9)));
  });
  if (evSel) evSel.addEventListener('change', async () => { await load(evSel.value); setT(ctx.reducedMotion ? tMax : 0); });
  if (arSel) arSel.addEventListener('change', () => { useArray(arSel.value); setT(Math.min(t, tMax)); });
  ctx.onTheme(draw);
  setT(t);
}
