/* Home-page globe: earthquakes from the global supershear survey (Bao et al., 2022, Nature Geoscience)
   plus supershear events documented in separate group papers.

   Data schema (assets/data/supershear_globe.json):
   {
     "meta": { "title", "citation", "doi", "source", "notes", "stub": bool },
     "events": [
       { "name": "Palu, Indonesia", "date": "2018-09-28", "lat": -0.18, "lon": 119.84,
         "mw": 7.5,
         "class": "supershear" | "debated" | "possible" | "subshear",
         "name_derived": true,                 // name is a derived region name, not from a paper
         "in_survey": true,                    // part of the Bao et al. (2022) survey set
         "setting": "continental" | "oceanic",  // optional
         "vr_km_s": 4.1,                        // optional, number or string
         "paper": "Bao et al., 2019, Nat. Geosci.", "doi": "10.1038/s41561-018-0297-z" }
     ]
   }
   Rendering: Three.js sphere with an equirectangular land texture drawn from Natural Earth
   coastlines (world-atlas 110m). Drag horizontally to rotate; tap or hover a marker for details. */
import { THREE_URL, loadJSON, flagStub, loop, dataFooter, landRings, escapeHTML } from './common.js';

export default async function globe(el, ctx) {
  const [THREE, data, rings] = await Promise.all([import(THREE_URL), loadJSON(el.dataset.src), landRings('110m')]);
  flagStub(el, data.meta);
  dataFooter(el.closest('.viz, .globe-wrap'), [{ href: el.dataset.src, label: 'JSON' }].concat(el.dataset.csv ? [{ href: el.dataset.csv, label: 'CSV' }] : []), data.meta);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Rotatable globe of large strike-slip earthquakes; supershear events highlighted');
  renderer.domElement.setAttribute('role', 'img');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 4.45);
  const world = new THREE.Group();
  scene.add(world);

  /* ---- land texture ---- */
  const tex = document.createElement('canvas'); tex.width = 2048; tex.height = 1024;
  const tg = tex.getContext('2d');
  const texture = new THREE.CanvasTexture(tex);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  function paintTexture() {
    const W = tex.width, H = tex.height;
    const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
    tg.fillStyle = ctx.css('--viz-ocean'); tg.fillRect(0, 0, W, H);
    tg.strokeStyle = ctx.css('--viz-grid'); tg.lineWidth = 1.2;
    for (let lo = -180; lo <= 180; lo += 30) { tg.beginPath(); tg.moveTo(X(lo), 0); tg.lineTo(X(lo), H); tg.stroke(); }
    for (let la = -60; la <= 60; la += 30) { tg.beginPath(); tg.moveTo(0, Y(la)); tg.lineTo(W, Y(la)); tg.stroke(); }
    tg.fillStyle = ctx.css('--viz-land');
    tg.beginPath();
    for (const r of rings) {
      let span = 0, mn = 999, mx = -999;
      for (const p of r) { mn = Math.min(mn, p[0]); mx = Math.max(mx, p[0]); }
      span = mx - mn;
      r.forEach(([lo, la], i) => (i ? tg.lineTo(X(lo), Y(la)) : tg.moveTo(X(lo), Y(la))));
      if (span > 350) { tg.lineTo(X(r[r.length - 1][0]), H); tg.lineTo(X(r[0][0]), H); } // Antarctica: close via the pole
      tg.closePath();
    }
    tg.fill('evenodd');
    texture.needsUpdate = true;
  }
  paintTexture();

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshBasicMaterial({ map: texture }));
  world.add(sphere);
  const rimMat = new THREE.MeshBasicMaterial({ color: ctx.css('--line-2'), side: THREE.BackSide });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 48), rimMat);
  scene.add(rim);

  /* ---- markers ---- */
  const toXYZ = (lat, lon, r = 1) => {
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return new THREE.Vector3(r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b));
  };
  const events = (data.events || []).filter(e => isFinite(e.lat) && isFinite(e.lon));
  const hitTargets = [sphere];
  const markers = [];
  const disc = new THREE.CircleGeometry(1, 32);
  const ring = new THREE.RingGeometry(0.62, 1, 32);
  const matSS = new THREE.MeshBasicMaterial({ color: ctx.css('--accent'), side: THREE.DoubleSide });
  const matHalo = new THREE.MeshBasicMaterial({ color: ctx.css('--accent'), transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const matOther = new THREE.MeshBasicMaterial({ color: ctx.css('--viz-muted'), side: THREE.DoubleSide });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitGeo = new THREE.SphereGeometry(1, 8, 6);
  for (const e of events) {
    const ss = e.class === 'supershear';
    const mw = +e.mw || 7;
    const size = ss ? 0.016 + 0.006 * (mw - 6.7) : 0.010 + 0.003 * (mw - 6.7);
    const p = toXYZ(e.lat, e.lon, 1.002);
    const g = new THREE.Group();
    g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2));
    const maybe = e.class === 'debated' || e.class === 'possible';
    if (maybe) {
      const m = new THREE.Mesh(ring, matSS); m.scale.setScalar(0.017 + 0.004 * (mw - 6.7)); g.add(m);
    } else {
      const m = new THREE.Mesh(disc, ss ? matSS : matOther); m.scale.setScalar(size); g.add(m);
    }
    if (ss) { const h = new THREE.Mesh(disc, matHalo); h.scale.setScalar(size * 2.1); h.position.z = -0.0005; g.add(h); }
    world.add(g);
    const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.copy(p); hit.scale.setScalar(Math.max(0.035, size * 1.8)); hit.userData.e = e;
    world.add(hit); hitTargets.push(hit); markers.push(g);
  }

  /* ---- orientation & interaction ---- */
  const startLon = +(el.dataset.lon || 110), startLat = +(el.dataset.lat || 12);
  let rotY = -Math.PI / 2 - startLon * Math.PI / 180, rotX = startLat * Math.PI / 180;
  let velY = 0, dragging = false, px = 0, py = 0, lastMove = 0, userTouched = false;
  const auto = !ctx.reducedMotion;
  const cvs = renderer.domElement;
  cvs.style.touchAction = 'pan-y';
  cvs.addEventListener('pointerdown', ev => {
    dragging = true; px = ev.clientX; py = ev.clientY; velY = 0; userTouched = true; lastMove = performance.now();
    if (ev.pointerType === 'mouse') cvs.setPointerCapture(ev.pointerId);
  });
  cvs.addEventListener('pointermove', ev => {
    if (dragging) {
      const dx = ev.clientX - px, dy = ev.clientY - py; px = ev.clientX; py = ev.clientY;
      const k = 3.2 / Math.max(200, el.clientWidth);
      rotY += dx * k; velY = dx * k * 60;
      if (ev.pointerType === 'mouse') rotX = Math.max(-1.1, Math.min(1.1, rotX + dy * k));
      if (Math.abs(dx) > 2) hideTip();
      lastMove = performance.now(); kick();
    } else if (ev.pointerType === 'mouse') pick(ev, false);
  });
  const end = ev => { if (!dragging) return; dragging = false; if (performance.now() - lastMove > 80) velY = 0; };
  cvs.addEventListener('pointerup', ev => { const moved = Math.abs(velY) > 0.05; end(ev); if (!moved) pick(ev, true); });
  cvs.addEventListener('pointercancel', end);
  cvs.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) hideTip(); });

  /* ---- tooltip ---- */
  const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'status');
  el.appendChild(tip);
  let pinned = null, hovered = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev, isTap) {
    const r = cvs.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitTargets, false)[0];
    const e = hit && hit.object.userData.e;
    if (e) { showTip(e, ev.clientX - r.left, ev.clientY - r.top); if (isTap) pinned = e; cvs.style.cursor = 'pointer'; }
    else { cvs.style.cursor = ''; if (isTap || !pinned) { pinned = null; hideTip(); } }
  }
  function showTip(e, x, y) {
    if (hovered === e && tip.classList.contains('on')) { place(x, y); return; }
    hovered = e;
    const cls = { supershear: '<span class="t-ss">Supershear</span>', debated: '<span class="t-ss">Supershear reported, disputed</span>', possible: '<span class="t-ss">Possibly supershear (not resolved)</span>', subshear: 'No supershear found' }[e.class] || '';
    const vr = e.vr_km_s ? ` · V<sub>r</sub> ≈ ${escapeHTML(e.vr_km_s)} km/s` : '';
    const link = e.doi ? `<a href="https://doi.org/${encodeURI(e.doi)}" target="_blank" rel="noopener">${escapeHTML(e.paper || 'Paper')}</a>` : escapeHTML(e.paper || '');
    const title = e.name_derived ? `M ${escapeHTML(e.mw)} · ${escapeHTML(e.region || '')}` : escapeHTML(e.name);
    const loc = `${Math.abs(e.lat).toFixed(2)}°${e.lat >= 0 ? 'N' : 'S'}, ${Math.abs(e.lon).toFixed(2)}°${e.lon >= 0 ? 'E' : 'W'}`;
    tip.innerHTML = `<b>${title}</b><span class="t-meta">${escapeHTML(e.date || '')} · M ${escapeHTML(e.mw)} · ${loc}${e.setting ? ' · ' + escapeHTML(e.setting) : ''}</span><br>${cls}${vr}<br>${link}`;
    tip.classList.add('on'); place(x, y);
  }
  function place(x, y) {
    const w = el.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let L = x + 14, T = y + 14;
    if (L + tw > w) L = Math.max(0, x - tw - 14);
    if (T + th > el.clientHeight) T = Math.max(0, y - th - 14);
    tip.style.left = L + 'px'; tip.style.top = T + 'px';
  }
  function hideTip() { tip.classList.remove('on'); hovered = null; }

  /* ---- render loop ---- */
  function resize() {
    const w = el.clientWidth, h = el.clientHeight || w;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(el);
  function render() {
    world.rotation.set(rotX, rotY, 0, 'XYZ');
    renderer.render(scene, camera);
  }
  const L = loop(ctx, dt => {
    if (!dragging) {
      if (Math.abs(velY) > 0.001) { rotY += velY * dt; velY *= Math.pow(0.04, dt); }
      else if (auto && !pinned && !hovered) rotY += dt * (userTouched ? 0.03 : 0.07);
    }
    render();
  });
  function kick() { if (ctx.reducedMotion) render(); }
  ctx.onTheme(() => {
    paintTexture();
    rimMat.color.set(ctx.css('--line-2')); matSS.color.set(ctx.css('--accent')); matHalo.color.set(ctx.css('--accent')); matOther.color.set(ctx.css('--viz-muted'));
    render();
  });
  resize();
  L.poke();

  /* counts for the legend, if present */
  const box = el.closest('.globe-wrap') || el.parentElement;
  const cnt = box && box.querySelector('[data-count]');
  if (cnt) {
    const nS = events.filter(e => e.class === 'supershear').length;
    cnt.textContent = `${events.length} events shown, ${nS} supershear`;
  }
}
