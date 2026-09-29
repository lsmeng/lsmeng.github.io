/* Shared helpers for the interactive figures.

   Data-file convention (all JSON under assets/data/):
     { "meta": { "title", "citation", "doi", "source", "license", "notes",
                 "stub": true|false  // true = placeholder, NOT real data },
       ...module-specific payload... }
   If meta.stub is true the figure shows a visible "placeholder data" flag. */

export const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm';
export const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/controls/OrbitControls.js/+esm';

export async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

export function flagStub(el, meta, text) {
  if (!meta || !meta.stub) return;
  const f = document.createElement('div');
  f.className = 'stub-flag';
  f.textContent = text || 'Placeholder data — not a research result';
  el.appendChild(f);
}

/* HiDPI 2D canvas that tracks its container size. draw(ctx, w, h) is called on resize. */
export function hidpiCanvas(el, draw) {
  const c = document.createElement('canvas');
  el.appendChild(c);
  const g = c.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  function fit(noDraw) {
    const r = el.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(10, Math.round(r.width)); h = Math.max(10, Math.round(r.height));
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (draw && noDraw !== true) draw(g, w, h);
  }
  new ResizeObserver(() => fit()).observe(el);
  fit(true); // size now; the observer's first callback (async) does the first draw
  return { canvas: c, ctx: g, size: () => ({ w, h, dpr }), refit: fit };
}

/* Perceptually uniform sequential map (viridis, 9 control points). t in [0,1]. */
const VIRIDIS = [[68,1,84],[71,44,122],[59,81,139],[44,113,142],[33,144,141],[39,173,129],[92,200,99],[170,220,50],[253,231,37]];
export function viridis(t) {
  t = Math.min(1, Math.max(0, t));
  const x = t * (VIRIDIS.length - 1), i = Math.min(VIRIDIS.length - 2, Math.floor(x)), f = x - i;
  const a = VIRIDIS[i], b = VIRIDIS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
/* Sequential slip map: pale sand -> amber -> red -> dark red-brown. */
const SLIP_L = [[226,216,192],[244,200,128],[232,140,70],[190,72,34],[104,26,18]];
export function slipColor(t) {
  const P = SLIP_L;
  t = Math.min(1, Math.max(0, t));
  const x = t * (P.length - 1), i = Math.min(P.length - 2, Math.floor(x)), f = x - i;
  const a = P[i], b = P[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
/* Diverging blue-white-red for sea-surface height. v in [-1,1]. */
export function diverge(v) {
  v = Math.max(-1, Math.min(1, v));
  const mid = [246, 246, 246];
  const hi = [180, 50, 25];
  const lo = [30, 80, 150];
  const e = v >= 0 ? hi : lo, f = Math.abs(v);
  return [mid[0] + (e[0] - mid[0]) * f, mid[1] + (e[1] - mid[1]) * f, mid[2] + (e[2] - mid[2]) * f];
}
export const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export function cssGradient(fn, n = 9) {
  const s = []; for (let i = 0; i < n; i++) s.push(rgb(fn(i / (n - 1))) + ` ${(100 * i / (n - 1)).toFixed(0)}%`);
  return `linear-gradient(90deg, ${s.join(', ')})`;
}

/* Build the figure footer: data download links + citation. */
export function dataFooter(panel, files, meta) {
  if (!panel) return;
  const foot = panel.querySelector('.viz-foot');
  if (!foot || foot.dataset.filled) return;
  foot.dataset.filled = '1';
  const tag = panel.querySelector('.viz-tag[data-status]');
  if (tag && meta) {
    const st = meta.status || 'published';
    tag.textContent = st === 'published' ? 'Published data' : st.split(/[(;,]/)[0].trim();
  }
  const dl = document.createElement('span'); dl.className = 'dl';
  for (const f of files) {
    const a = document.createElement('a'); a.href = f.href; a.setAttribute('download', '');
    a.innerHTML = '<svg class="ico" aria-hidden="true"><use href="assets/icons.svg#i-download"></use></svg>' + f.label;
    dl.appendChild(a);
  }
  const cite = document.createElement('span');
  if (meta && meta.status && meta.status !== 'published') {
    const b = document.createElement('span'); b.className = 'status-flag'; b.textContent = meta.status;
    cite.appendChild(b);
  }
  if (meta && meta.citation) {
    cite.insertAdjacentHTML('beforeend', 'Data: ' + escapeHTML(meta.citation) + (meta.doi ? ` <a href="https://doi.org/${encodeURI(meta.doi)}" target="_blank" rel="noopener">doi:${escapeHTML(meta.doi)}</a>` : '') + (meta.data_doi ? ` · data <a href="https://doi.org/${encodeURI(meta.data_doi)}" target="_blank" rel="noopener">doi:${escapeHTML(meta.data_doi)}</a>` : ''));
  }
  foot.appendChild(cite); foot.appendChild(dl);
}
export function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* requestAnimationFrame loop that pauses when the figure is off-screen or the tab is hidden. */
export function loop(ctx, step) {
  let on = false, vis = false, raf = 0, last = 0, dead = false;
  function frame(t) {
    if (!on) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    step(dt, t / 1000);
    raf = requestAnimationFrame(frame);
  }
  function update() {
    const want = vis && !document.hidden && !dead;
    if (want && !on) { on = true; last = 0; raf = requestAnimationFrame(frame); }
    else if (!want && on) { on = false; cancelAnimationFrame(raf); }
  }
  ctx.visible(v => { vis = v; update(); });
  document.addEventListener('visibilitychange', update);
  return { poke: update, stop() { dead = true; update(); } };
}

/* Simple equirectangular map projection for a lon/lat box. */
export function mapProj(bbox, w, h, pad = 28) {
  const [lon0, lat0, lon1, lat1] = bbox;
  const k = Math.cos(((lat0 + lat1) / 2) * Math.PI / 180);
  const sx = (w - 2 * pad) / ((lon1 - lon0) * k), sy = (h - 2 * pad) / (lat1 - lat0);
  const s = Math.min(sx, sy);
  const ox = (w - s * (lon1 - lon0) * k) / 2, oy = (h - s * (lat1 - lat0)) / 2;
  return {
    s, k,
    x: lon => ox + (lon - lon0) * k * s,
    y: lat => h - oy - (lat - lat0) * s,
    kmToPx: km => km / 111.19 * s,
  };
}

/* Coastlines from Natural Earth (world-atlas, public domain) via jsDelivr. */
let _land = {};
export async function landRings(res = '50m') {
  if (_land[res]) return _land[res];
  const [topo, tc] = await Promise.all([
    loadJSON(`https://cdn.jsdelivr.net/npm/world-atlas@2/land-${res}.json`),
    import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm'),
  ]);
  const geo = tc.feature(topo, topo.objects.land);
  const rings = [];
  for (const f of geo.features || [geo]) {
    const g = f.geometry || f;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const p of polys) for (const r of p) rings.push(r);
  }
  _land[res] = rings;
  return rings;
}
export function drawLand(g, rings, P, bbox, fill, stroke) {
  const [a, b, c, d] = bbox; const m = 3;
  g.beginPath();
  for (const r of rings) {
    let inside = false;
    for (const [lo, la] of r) { if (lo > a - m && lo < c + m && la > b - m && la < d + m) { inside = true; break; } }
    if (!inside) continue;
    r.forEach(([lo, la], i) => { const x = P.x(lo), y = P.y(la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath();
  }
  g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 0.8; g.stroke(); }
}
