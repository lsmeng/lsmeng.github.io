/* Finite-fault slip model in 3-D with a synchronised moment-rate function.

   Data schema (assets/data/ffi/<event>.json):
   {
     "meta": { "event", "date", "mw", "citation", "doi", "notes", "stub" },
     "hypocenter": { "lat", "lon", "depth_km" },
     "subfaults": [
        { "lat", "lon", "depth_km",        // subfault centre (or "e","n","z" in km from the epicentre)
          "strike", "dip",                 // degrees
          "len_km", "wid_km",              // along strike / down dip size
          "slip": 3.2,                     // metres
          "rake": 175,                     // optional
          "t0": 12.5 }                     // optional rupture onset time, s
     ],
     "mrf": { "t": [s...], "rate": [N·m/s ...] }   // optional moment-rate function
   }
   Drag to rotate (one finger horizontally on touch screens). Press play to sweep time:
   subfaults light up at their onset time while the cursor moves along the moment-rate curve. */
import { THREE_URL, ORBIT_URL, loadJSON, flagStub, dataFooter, hidpiCanvas, loop, slipColor, rgb, cssGradient, escapeHTML } from './common.js';

export default async function ffi(el, ctx) {
  const panel = el.closest('.viz');
  const sel = panel.querySelector('select[data-event]');
  let current = null;
  async function show(url) {
    if (current) current.dispose();
    el.textContent = '';
    const mrfBox = panel.querySelector('.ffi-mrf'); if (mrfBox) mrfBox.textContent = '';
    const foot = panel.querySelector('.viz-foot'); if (foot) { foot.textContent = ''; delete foot.dataset.filled; }
    current = await build(el, ctx, url);
  }
  if (sel) sel.addEventListener('change', () => show(sel.value));
  await show(sel ? sel.value : el.dataset.src);
}

async function build(el, ctx, url) {
  const panel = el.closest('.viz');
  const [THREE, { OrbitControls }, data] = await Promise.all([import(THREE_URL), import(ORBIT_URL), loadJSON(url)]);
  flagStub(el, data.meta);
  dataFooter(panel, [{ href: url, label: 'JSON' }, { href: url.replace(/\.json$/, '.csv'), label: 'CSV' }], data.meta);
  const info = panel.querySelector('[data-info]');
  if (info) { const m0 = +data.meta.m0_nm, ex = Math.floor(Math.log10(m0)); info.innerHTML = `${escapeHTML(data.meta.event)} · model M<sub>0</sub> ${(m0 / 10 ** ex).toFixed(1)}×10<sup>${ex}</sup> N·m · peak slip ${(+data.meta.max_slip_m).toFixed(1)} m`; }

  const hypo = data.hypocenter;
  const kx = 111.19 * Math.cos(hypo.lat * Math.PI / 180), ky = 111.19;
  const S = data.subfaults.map(s => {
    const e = s.e != null ? s.e : (s.lon - hypo.lon) * kx;
    const n = s.n != null ? s.n : (s.lat - hypo.lat) * ky;
    const z = s.z != null ? s.z : s.depth_km;
    return { ...s, e, n, z };
  });
  const slipMax = Math.max(...S.map(s => s.slip));
  const hasT = S.every(s => isFinite(s.t0));
  const mrf = data.mrf && data.mrf.t && data.mrf.t.length ? data.mrf : null;
  const tEnd = mrf ? mrf.t[mrf.t.length - 1] : hasT ? Math.max(...S.map(s => s.t0)) + 5 : 0;

  // ---------- 3-D view ----------
  const stage = document.createElement('div'); stage.className = 'ffi-3d'; stage.style.cssText = 'position:relative;width:100%;height:100%';
  el.appendChild(stage);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  renderer.domElement.style.touchAction = 'pan-y';

  // three coords: x = east, y = up (-depth), z = -north
  // long, narrow faults: exaggerate depth so the slip pattern stays readable (stated in the legend)
  const eS = S.map(s => s.e), nS = S.map(s => s.n), zS = S.map(s => s.z);
  const Lh = Math.max(Math.max(...eS) - Math.min(...eS), Math.max(...nS) - Math.min(...nS));
  const Dz = Math.max(...zS) + 2;
  const vex = Math.max(1, Math.min(4, Math.round(Lh / (6 * Dz))));
  const vexEl = panel.querySelector('[data-vex]'); if (vexEl) vexEl.textContent = vex > 1 ? `depth exaggerated ×${vex}` : 'no vertical exaggeration';
  const P = (e, n, z) => new THREE.Vector3(e, -z * vex, -n);
  const pos = [], col = [], edge = [];
  const faces = [];
  for (const s of S) {
    const phi = s.strike * Math.PI / 180, del = s.dip * Math.PI / 180;
    const se = [Math.sin(phi), Math.cos(phi), 0];
    const de = [Math.cos(phi) * Math.cos(del), -Math.sin(phi) * Math.cos(del), Math.sin(del)];
    const hl = s.len_km / 2, hw = s.wid_km / 2;
    const corner = (a, b) => P(s.e + se[0] * a + de[0] * b, s.n + se[1] * a + de[1] * b, s.z + se[2] * a + de[2] * b);
    const c = [corner(-hl, -hw), corner(hl, -hw), corner(hl, hw), corner(-hl, hw)];
    faces.push({ s, idx: pos.length / 3 });
    for (const v of [c[0], c[1], c[2], c[0], c[2], c[3]]) { pos.push(v.x, v.y, v.z); col.push(1, 1, 1); }
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0]]) edge.push(c[a].x, c[a].y, c[a].z, c[b].x, c[b].y, c[b].z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const colAttr = new THREE.Float32BufferAttribute(col, 3); geo.setAttribute('color', colAttr);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  scene.add(mesh);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.18 });
  scene.add(new THREE.LineSegments(eg, edgeMat));

  // bounds, surface frame, hypocentre
  geo.computeBoundingBox();
  const bb = geo.boundingBox, ctr = new THREE.Vector3(); bb.getCenter(ctr);
  const size = new THREE.Vector3(); bb.getSize(size);
  const span = Math.max(size.x, size.z, size.y * 1.5);
  const pad = span * 0.12;
  const surf = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bb.min.x - pad, 0, bb.min.z - pad), new THREE.Vector3(bb.max.x + pad, 0, bb.min.z - pad),
    new THREE.Vector3(bb.max.x + pad, 0, bb.max.z + pad), new THREE.Vector3(bb.min.x - pad, 0, bb.max.z + pad), new THREE.Vector3(bb.min.x - pad, 0, bb.min.z - pad)]);
  const surfMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 });
  scene.add(new THREE.Line(surf, surfMat));
  const gridStep = niceStep(span / 5);
  const gpts = [];
  for (let x = Math.ceil((bb.min.x - pad) / gridStep) * gridStep; x <= bb.max.x + pad; x += gridStep) gpts.push(x, 0, bb.min.z - pad, x, 0, bb.max.z + pad);
  for (let z = Math.ceil((bb.min.z - pad) / gridStep) * gridStep; z <= bb.max.z + pad; z += gridStep) gpts.push(bb.min.x - pad, 0, z, bb.max.x + pad, 0, z);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gpts, 3));
  const gridMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.12 });
  scene.add(new THREE.LineSegments(gg, gridMat));
  const hyp = new THREE.Mesh(new THREE.SphereGeometry(span * 0.012, 16, 12), new THREE.MeshBasicMaterial());
  hyp.position.copy(P(0, 0, hypo.depth_km)); scene.add(hyp);
  const epi = new THREE.Mesh(new THREE.RingGeometry(span * 0.008, span * 0.016, 24), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  epi.rotation.x = -Math.PI / 2; epi.position.copy(P(0, 0, 0)); scene.add(epi);
  const drop = new THREE.BufferGeometry().setFromPoints([P(0, 0, 0), P(0, 0, hypo.depth_km)]);
  const dropMat = new THREE.LineDashedMaterial({ dashSize: span * 0.01, gapSize: span * 0.01, transparent: true, opacity: 0.6 });
  const dropLine = new THREE.Line(drop, dropMat); dropLine.computeLineDistances(); scene.add(dropLine);
  // labels
  const labels = [];
  const north = label('N', span * 0.05); north.position.set(bb.min.x - pad, 0, bb.min.z - pad - span * 0.05); scene.add(north);
  const nArrow = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(bb.min.x - pad, 0, bb.min.z - pad + span * 0.06), new THREE.Vector3(bb.min.x - pad, 0, bb.min.z - pad - span * 0.02)]);
  const nLine = new THREE.Line(nArrow, surfMat); scene.add(nLine);
  const sclab = label(`grid ${gridStep} km`, span * 0.035); sclab.position.set(bb.max.x + pad, span * 0.03, bb.min.z - pad); scene.add(sclab);
  function label(text, h) {
    const c = document.createElement('canvas'); const g = c.getContext('2d');
    const fs = 44; g.font = `500 ${fs}px sans-serif`; const w = Math.ceil(g.measureText(text).width) + 12;
    c.width = w; c.height = fs + 14;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false }));
    const hs = 0.026; sp.scale.set(hs * w / c.height, hs, 1); void h;
    sp.userData = { c, g, text, fs, tex };
    labels.push(sp);
    return sp;
  }
  function paintLabels() {
    for (const sp of labels) {
      const { c, g, text, fs, tex } = sp.userData;
      g.clearRect(0, 0, c.width, c.height); g.font = `500 ${fs}px sans-serif`; g.fillStyle = ctx.css('--muted'); g.textBaseline = 'middle';
      g.fillText(text, 6, c.height / 2); tex.needsUpdate = true;
    }
  }

  // camera: look at the fault broadside, from the footwall side and ~28° above the horizon,
  // far enough that the whole along-strike length fits the view
  let cs = 0, cc = 0, dipSum = 0, wsum = 0;
  for (const s of S) { const w = s.len_km * s.wid_km; cs += Math.sin(s.strike * Math.PI / 180) * w; cc += Math.cos(s.strike * Math.PI / 180) * w; dipSum += s.dip * w; wsum += w; }
  const phi = Math.atan2(cs, cc), meanDip = dipSum / wsum;
  const hE = Math.cos(phi), hN = -Math.sin(phi);          // horizontal dip direction (east, north)
  const view = new THREE.Vector3(hE, 0, -hN);              // three: x = east, z = -north; hanging-wall side, facing the plane
  const sE = Math.sin(phi), sN = Math.cos(phi);
  const along = new THREE.Vector3(sE, 0, -sN);
  let Lmax = 0; for (const s of S) { const p = P(s.e, s.n, s.z).sub(ctr); Lmax = Math.max(Lmax, Math.abs(p.dot(along)) + s.len_km / 2); }
  function placeCamera() {
    const aspect = Math.max(0.5, camera.aspect || 1.6);
    const fovH = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * aspect);
    const D = Math.max(Lmax / Math.tan(fovH / 2) * 1.12, size.y * 3);
    const el = Math.max(24, Math.min(50, 90 - meanDip)) * Math.PI / 180; // close to the plane normal
    camera.position.copy(ctr).addScaledVector(view, D * Math.cos(el)).add(new THREE.Vector3(0, D * Math.sin(el), 0));
    camera.near = D / 50; camera.far = D * 10; camera.updateProjectionMatrix();
    controls.target.copy(ctr); controls.update();
  }
  controls.target.copy(ctr);

  // ---------- moment-rate panel ----------
  let t = hasT ? (ctx.reducedMotion ? tEnd : 0) : tEnd;
  let playing = hasT && !ctx.reducedMotion;
  const mrfBox = panel.querySelector('.ffi-mrf');
  let M = null;
  if (mrfBox && mrf) M = hidpiCanvas(mrfBox, () => drawMRF());
  const rMax = mrf ? Math.max(...mrf.rate) : 1;
  function drawMRF() {
    if (!M) return;
    const g = M.ctx, { w, h } = M.size(), font = ctx.css('--sans');
    g.clearRect(0, 0, w, h);
    const x0 = 46, x1 = w - 12, y0 = h - 22, y1 = 12;
    const X = v => x0 + (x1 - x0) * v / tEnd, Y = v => y0 - (y0 - y1) * v / rMax;
    g.strokeStyle = ctx.css('--line-2'); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
    g.fillStyle = ctx.css('--muted'); g.font = '11px ' + font;
    const ex = Math.floor(Math.log10(rMax));
    g.fillText(`×10${sup(ex)} N·m/s`, 4, y1 + 2);
    g.fillText((rMax / 10 ** ex).toFixed(1), 18, y1 + 16);
    for (let s = 0; s <= tEnd; s += niceStep(tEnd / 5)) { g.fillText(s, X(s) - 6, y0 + 15); }
    if (w > 520) g.fillText('time (s)', x1 - 44, y0 - 6);
    // filled area up to t
    g.beginPath(); g.moveTo(X(0), y0);
    mrf.t.forEach((tt, i) => { if (tt <= t) g.lineTo(X(tt), Y(mrf.rate[i])); });
    g.lineTo(X(Math.min(t, tEnd)), y0); g.closePath();
    g.fillStyle = ctx.css('--accent-soft'); g.fill();
    g.beginPath(); mrf.t.forEach((tt, i) => (i ? g.lineTo(X(tt), Y(mrf.rate[i])) : g.moveTo(X(tt), Y(mrf.rate[i]))));
    g.strokeStyle = ctx.css('--ink'); g.lineWidth = 1.6; g.stroke();
    if (hasT) { g.strokeStyle = ctx.css('--accent'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); }
    g.fillStyle = ctx.css('--ink-2'); g.fillText('Moment-rate function', x0 + 8, y1 + 4);
  }
  const sup = n => String(n).split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] || ch).join('');

  function recolor() {
    const idle = new THREE.Color(ctx.css('--paper-3'));
    for (const f of faces) {
      const on = !hasT || f.s.t0 <= t;
      let c;
      if (on) { const k = slipColor(f.s.slip / slipMax); c = new THREE.Color(k[0] / 255, k[1] / 255, k[2] / 255); c.convertSRGBToLinear(); }
      else c = idle;
      for (let i = 0; i < 6; i++) colAttr.setXYZ(f.idx + i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
  }
  function paintTheme() {
    const ink = new THREE.Color(ctx.css('--ink'));
    edgeMat.color = ink; surfMat.color = new THREE.Color(ctx.css('--muted')); gridMat.color = ink;
    hyp.material.color = new THREE.Color(ctx.css('--accent')); epi.material.color = new THREE.Color(ctx.css('--accent')); dropMat.color = new THREE.Color(ctx.css('--accent'));
    paintLabels(); recolor(); drawMRF();
    const cb = panel.querySelector('.cbar'); if (cb) cb.style.background = cssGradient(v => slipColor(v));
    const mx = panel.querySelector('[data-slipmax]'); if (mx) mx.textContent = slipMax.toFixed(1) + ' m';
  }

  // controls
  const slider = panel.querySelector('input[type=range]');
  const out = panel.querySelector('output');
  const playBtn = panel.querySelector('[data-play]');
  if (slider) { slider.max = tEnd; slider.step = 0.5; slider.value = t; slider.disabled = !hasT; }
  function setT(v) { t = v; if (slider) slider.value = v; if (out) out.textContent = v.toFixed(0) + ' s'; recolor(); drawMRF(); }
  const onSlide = () => { playing = false; setBtn(); setT(+slider.value); };
  if (slider) slider.addEventListener('input', onSlide);
  function setBtn() { if (playBtn) { playBtn.disabled = !hasT; playBtn.innerHTML = `<svg class="ico" aria-hidden="true"><use href="assets/icons.svg#${playing ? 'i-pause' : 'i-play'}"></use></svg>${playing ? 'Pause' : 'Play'}`; } }
  const onPlay = () => { playing = !playing; if (playing && t >= tEnd) t = 0; setBtn(); };
  if (playBtn) playBtn.addEventListener('click', onPlay);
  setBtn();

  let placed = false;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!placed && w > 0) { placeCamera(); placed = true; }
  }
  const ro = new ResizeObserver(resize); ro.observe(stage);
  resize();
  let hold = 0, alive = true;
  const L = loop(ctx, dt => {
    if (!alive) return;
    if (playing) {
      if (t >= tEnd) { hold += dt; if (hold > 2) { hold = 0; setT(0); } }
      else setT(Math.min(tEnd, t + dt * Math.max(6, tEnd / 10)));
    }
    controls.update();
    renderer.render(scene, camera);
  });
  ctx.onTheme(() => { if (alive) paintTheme(); });
  paintTheme();
  setT(t);
  return {
    dispose() {
      alive = false; L.stop(); ro.disconnect();
      if (slider) slider.removeEventListener('input', onSlide);
      if (playBtn) playBtn.removeEventListener('click', onPlay);
      renderer.dispose(); geo.dispose();
    },
  };
  function niceStep(x) { const p = 10 ** Math.floor(Math.log10(x)); const m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
}
