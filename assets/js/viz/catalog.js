/* Relocated earthquake catalogues as 3-D point clouds.

   Data schema (assets/data/catalog/<name>.json):
   {
     "meta": { "title", "citation", "doi", "data_doi", "status", "t0_utc", "n_source", "zmax", "notes", "stub" },
     "bbox": [lonMin, latMin, lonMax, latMax],        // optional
     "columns": ["lon", "lat", "depth_km", "mag", "t_days", "score", "tier"],   // t_days, score, tier optional
     "rows": [[-117.6, 35.7, 6.1, 1.2, 3.25, 5.0, "T"], ...],
     "score": { "label": "confirmability score", "min", "max" }   // optional, colour range for score
   }
   Panel controls (all optional):
     <select data-catalog>  option values = JSON URLs (option data-csv = CSV URL, data-color = default colouring)
     <select data-color>    depth | score | time
     <input type=checkbox data-tier="T|M|B">  show/hide score tiers
     <button data-play> + <input type=range data-time>   reveal events in time order
   Colour: depth or time = viridis; score = vermilion (low) -> grey -> blue (high).
   Point size ∝ magnitude. Coastline from Natural Earth 50m at sea level. Drag to rotate. */
import { THREE_URL, ORBIT_URL, loadJSON, flagStub, dataFooter, loop, landRings, viridis, cssGradient, escapeHTML } from './common.js';

export default async function catalog(el, ctx) {
  const panel = el.closest('.viz');
  const sel = panel.querySelector('select[data-catalog]');
  const colSel = panel.querySelector('select[data-color]');
  let cur = null;
  async function show() {
    if (cur) cur.dispose();
    el.textContent = '';
    const foot = panel.querySelector('.viz-foot'); if (foot) { foot.textContent = ''; delete foot.dataset.filled; }
    const opt = sel ? sel.selectedOptions[0] : null;
    const url = opt ? opt.value : el.dataset.src;
    const csv = opt ? opt.dataset.csv : el.dataset.csv;
    const want = (opt && opt.dataset.color) || (colSel ? colSel.value : 'depth');
    cur = await build(el, ctx, url, csv, want);
  }
  if (sel) sel.addEventListener('change', show);
  if (colSel) colSel.addEventListener('change', () => cur && cur.recolor(colSel.value));
  panel.querySelectorAll('input[data-tier]').forEach(cb => cb.addEventListener('change', () => cur && cur.refilter()));
  await show();
}

async function build(el, ctx, url, csvUrl, colorBy) {
  const panel = el.closest('.viz');
  const colSel = panel.querySelector('select[data-color]');
  const tierBoxes = [...panel.querySelectorAll('input[data-tier]')];
  const playBtn = panel.querySelector('[data-play]');
  const tSlider = panel.querySelector('input[data-time]');
  const tOut = panel.querySelector('output[data-time]');
  const [THREE, { OrbitControls }, data] = await Promise.all([import(THREE_URL), import(ORBIT_URL), loadJSON(url)]);
  flagStub(el, data.meta);
  dataFooter(panel, [{ href: url, label: 'JSON' }].concat(csvUrl ? [{ href: csvUrl, label: 'CSV' }] : []), data.meta);

  const cols = data.columns || ['lon', 'lat', 'depth_km', 'mag'];
  const ci = n => cols.indexOf(n);
  const iLon = ci('lon'), iLat = ci('lat'), iZ = ci('depth_km') >= 0 ? ci('depth_km') : ci('depth'), iM = ci('mag');
  const iS = ci('score'), iTier = ci('tier'), iT = ci('t_days');
  const rows = data.rows;
  const n = rows.length;
  let bbox = data.bbox;
  if (!bbox) {
    // robust extent: 0.5–99.5 percentiles so a few outliers do not shrink the cloud
    const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
    const lo = rows.map(r => r[iLon]), la = rows.map(r => r[iLat]);
    const a = q(lo, 0.01), c = q(lo, 0.99), b = q(la, 0.01), d = q(la, 0.99);
    const m = 0.04 * Math.max(c - a, d - b);
    bbox = [a - m, b - m, c + m, d + m];
  }
  const lonc = (bbox[0] + bbox[2]) / 2, latc = (bbox[1] + bbox[3]) / 2;
  const kx = 111.19 * Math.cos(latc * Math.PI / 180), ky = 111.19;
  let zMax = 0; for (const r of rows) zMax = Math.max(zMax, r[iZ]);
  const zCap = +((data.meta && data.meta.zmax) || el.dataset.zmax || zMax);
  const hasScore = iS >= 0 || iTier >= 0, hasTime = iT >= 0;
  let tMin = Infinity, tMaxD = -Infinity;
  if (hasTime) for (const r of rows) { tMin = Math.min(tMin, r[iT]); tMaxD = Math.max(tMaxD, r[iT]); }
  let sMin = Infinity, sMax = -Infinity;
  if (iS >= 0) for (const r of rows) { if (isFinite(r[iS])) { sMin = Math.min(sMin, r[iS]); sMax = Math.max(sMax, r[iS]); } }
  if (data.score) { if (isFinite(data.score.min)) sMin = data.score.min; if (isFinite(data.score.max)) sMax = data.score.max; }

  // enable only the controls this catalogue supports
  if (colSel) {
    for (const o of colSel.options) o.disabled = (o.value === 'score' && !hasScore) || (o.value === 'time' && !hasTime);
    const ok = v => { const o = colSel.querySelector(`option[value="${v}"]`); return o && !o.disabled; };
    colorBy = ok(colorBy) ? colorBy : 'depth';
    colSel.value = colorBy;
  }
  const tierWrap = panel.querySelector('[data-tiers]'); if (tierWrap) tierWrap.hidden = iTier < 0;
  const timeWrap = panel.querySelector('[data-timewrap]'); if (timeWrap) timeWrap.hidden = !hasTime;

  const LOWC = [200, 86, 38], MIDC = [168, 174, 180], HIC = [24, 104, 146];
  const ramp = v => {
    v = Math.max(0, Math.min(1, v));
    const a = v < 0.5 ? LOWC : MIDC, b = v < 0.5 ? MIDC : HIC, f = v < 0.5 ? v * 2 : (v - 0.5) * 2;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  const scoreOf = r => (iS >= 0 ? (r[iS] - sMin) / (sMax - sMin || 1) : r[iTier] === 'T' ? 1 : r[iTier] === 'B' ? 0 : 0.5);

  // ---------- scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.7;
  renderer.domElement.style.touchAction = 'pan-y';
  controls.autoRotate = !ctx.reducedMotion; controls.autoRotateSpeed = 0.45;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), base = new Float32Array(n);
  const span0 = Math.max((bbox[2] - bbox[0]) * kx, (bbox[3] - bbox[1]) * ky);
  const psize = n > 15000 ? 0.8 : 1; // dense catalogues: smaller points
  rows.forEach((r, i) => {
    pos[3 * i] = (r[iLon] - lonc) * kx; pos[3 * i + 1] = -Math.min(r[iZ], zCap); pos[3 * i + 2] = -(r[iLat] - latc) * ky;
    const m = iM >= 0 && r[iM] != null && isFinite(r[iM]) ? r[iM] : 1;
    base[i] = psize * Math.max(1.3, 1.1 + 0.85 * m);
  });
  void span0;
  function fillColors() {
    rows.forEach((r, i) => {
      const k = colorBy === 'score' && hasScore ? ramp(scoreOf(r))
        : colorBy === 'time' && hasTime ? viridis((r[iT] - tMin) / (tMaxD - tMin || 1))
        : viridis(1 - Math.min(1, r[iZ] / zCap));
      const c = new THREE.Color().setRGB(k[0] / 255, k[1] / 255, k[2] / 255, THREE.SRGBColorSpace);
      col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
    });
  }
  let tCur = hasTime ? tMaxD : 0;
  function fillSizes() {
    const on = {}; tierBoxes.forEach(b => { on[b.dataset.tier] = b.checked; });
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      let vis = true;
      if (iTier >= 0 && tierBoxes.length && on[r[iTier]] === false) vis = false;
      if (hasTime && r[iT] > tCur) vis = false;
      if (r[iLon] < bbox[0] || r[iLon] > bbox[2] || r[iLat] < bbox[1] || r[iLat] > bbox[3] || r[iZ] > zCap) vis = false;
      size[i] = vis ? base[i] : 0;
    }
  }
  fillColors(); fillSizes();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const colAttr = new THREE.BufferAttribute(col, 3), sizeAttr = new THREE.BufferAttribute(size, 1);
  geo.setAttribute('color', colAttr); geo.setAttribute('size', sizeAttr);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDpr: { value: dpr }, uAlpha: { value: n > 15000 ? 0.62 : 0.8 } },
    vertexShader: `attribute float size; varying vec3 vC; uniform float uDpr;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uDpr; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; uniform float uAlpha;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d); if (r > 0.25) discard; gl_FragColor = vec4(vC, uAlpha * smoothstep(0.25, 0.12, r));
        #include <colorspace_fragment>
      }`,
    vertexColors: true, transparent: true, depthWrite: false,
  });
  scene.add(new THREE.Points(geo, mat));

  // coastline at sea level + frame
  const X = lon => (lon - lonc) * kx, Z = lat => -(lat - latc) * ky;
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
  const frameMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.25 });
  try {
    const rings = await landRings('50m');
    const [a, b, c, d] = bbox;
    for (const r of rings) {
      let seg = [];
      const flush = () => { if (seg.length > 1) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seg), lineMat)); seg = []; };
      for (const [lo, la] of r) { if (lo >= a && lo <= c && la >= b && la <= d) seg.push(new THREE.Vector3(X(lo), 0, Z(la))); else flush(); }
      flush();
    }
  } catch (e) { console.warn('coastlines unavailable', e); }
  const x0 = X(bbox[0]), x1 = X(bbox[2]), z0 = Z(bbox[1]), z1 = Z(bbox[3]), yb = -zCap;
  const fp = [];
  const box = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]];
  for (let i = 0; i < 4; i++) { const p = box[i], q = box[(i + 1) % 4]; fp.push(...p, ...q, p[0], yb, p[2], q[0], yb, q[2], p[0], 0, p[2], p[0], yb, p[2]); }
  const nLab = Math.max(2, Math.min(5, Math.round(10 * zCap / Math.max(x1 - x0, z0 - z1))));
  const zStep = [5, 10, 20, 25, 50, 100].find(v => zCap / v <= nLab) || 100;
  for (let zz = zStep; zz < zCap; zz += zStep) fp.push(x0, -zz, z0, x1, -zz, z0);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  scene.add(new THREE.LineSegments(fg, frameMat));
  const labels = [];
  const span = Math.max(x1 - x0, z0 - z1);
  const lab = (t, x, y, z) => {
    const c = document.createElement('canvas'), g = c.getContext('2d'); const fs = 40;
    g.font = `500 ${fs}px sans-serif`; c.width = Math.ceil(g.measureText(t).width) + 10; c.height = fs + 12;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false }));
    const hgt = 0.024; sp.scale.set(hgt * c.width / c.height, hgt, 1); sp.position.set(x, y, z);
    sp.userData = { c, g, t, fs, tex }; labels.push(sp); scene.add(sp);
  };
  for (let zz = 0; zz <= zCap; zz += zStep) lab(`${zz} km`, x0 - span * 0.035, -zz, z0);
  lab('N', x0, 0, z1 - span * 0.06);

  function legend() {
    const lg = panel.querySelector('[data-legend]');
    if (!lg) return;
    const nsrc = data.meta && data.meta.n_source && data.meta.n_source > n ? ` (random subset of ${data.meta.n_source.toLocaleString('en-US')})` : '';
    let key;
    if (colorBy === 'score' && hasScore) key = `${escapeHTML((data.score && data.score.label) || 'score')}: low <span class="cbar" style="background:${cssGradient(ramp)}"></span> high`;
    else if (colorBy === 'time' && hasTime) key = `time: day ${tMin.toFixed(0)} <span class="cbar" style="background:${cssGradient(viridis)}"></span> day ${tMaxD.toFixed(0)}${data.meta && data.meta.t0_utc ? ' after ' + escapeHTML(data.meta.t0_utc.slice(0, 10)) : ''}`;
    else key = `depth 0 <span class="cbar" style="background:${cssGradient(v => viridis(1 - v))}"></span> ${Math.round(zCap)} km`;
    lg.innerHTML = `${n.toLocaleString('en-US')} events${nsrc} · ${key} · point size ∝ magnitude · no vertical exaggeration`;
  }
  function paint() {
    lineMat.color = new THREE.Color(ctx.css('--ink-2')); frameMat.color = new THREE.Color(ctx.css('--muted'));
    for (const sp of labels) { const { c, g, t, fs, tex } = sp.userData; g.clearRect(0, 0, c.width, c.height); g.font = `500 ${fs}px sans-serif`; g.fillStyle = ctx.css('--muted'); g.textBaseline = 'middle'; g.fillText(t, 5, c.height / 2); tex.needsUpdate = true; }
    legend();
  }
  controls.target.set(0, yb / 2, 0);
  camera.position.set(span * 0.42, span * 0.72, span * 1.22);
  camera.near = span / 100; camera.far = span * 20; camera.updateProjectionMatrix();
  controls.update();
  function resize() { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  // ---------- time playback ----------
  let playing = false;
  const setBtn = () => { if (playBtn) playBtn.innerHTML = `<svg class="ico" aria-hidden="true"><use href="assets/icons.svg#${playing ? 'i-pause' : 'i-play'}"></use></svg>${playing ? 'Pause' : 'Play in time'}`; };
  function setT(v) {
    tCur = v; fillSizes(); sizeAttr.needsUpdate = true;
    if (tSlider) tSlider.value = String(v);
    if (tOut) tOut.textContent = hasTime ? `day ${v.toFixed(1)}` : '';
  }
  const onPlay = () => { playing = !playing; if (playing && tCur >= tMaxD) setT(tMin); setBtn(); };
  const onSlide = () => { playing = false; setBtn(); setT(+tSlider.value); };
  if (playBtn) playBtn.addEventListener('click', onPlay);
  if (tSlider && hasTime) { tSlider.min = tMin; tSlider.max = tMaxD; tSlider.step = (tMaxD - tMin) / 400; tSlider.addEventListener('input', onSlide); }
  setBtn(); setT(tCur);

  let alive = true, hold = 0;
  const L = loop(ctx, dt => {
    if (!alive) return;
    if (playing && hasTime) {
      if (tCur >= tMaxD) { hold += dt; if (hold > 1.5) { hold = 0; playing = false; setBtn(); } }
      else setT(Math.min(tMaxD, tCur + dt * (tMaxD - tMin) / 14));
    }
    controls.update(); renderer.render(scene, camera);
  });
  ctx.onTheme(() => { if (alive) paint(); }); paint();
  return {
    recolor(mode) { colorBy = mode; fillColors(); colAttr.needsUpdate = true; legend(); },
    refilter() { fillSizes(); sizeAttr.needsUpdate = true; },
    dispose() {
      alive = false; L.stop(); ro.disconnect(); controls.dispose(); renderer.dispose(); geo.dispose();
      if (playBtn) playBtn.removeEventListener('click', onPlay);
      if (tSlider) tSlider.removeEventListener('input', onSlide);
    },
  };
}
