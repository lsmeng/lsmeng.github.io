/* Relocated earthquake catalogue as a 3-D point cloud.

   Data schema (assets/data/catalog/<name>.json):
   {
     "meta": { "title", "region", "method", "n_events", "citation", "doi", "notes", "stub" },
     "bbox": [lonMin, latMin, lonMax, latMax],        // optional
     "columns": ["lon", "lat", "depth_km", "mag"],     // "t" (decimal year or days) optional
     "rows": [[-155.28, 19.41, 2.1, 1.3], ...]
   }
   Colour = depth (viridis), point size = magnitude. Coastline from Natural Earth 50m at sea level.
   Drag to rotate (horizontal drag on touch screens). */
import { THREE_URL, ORBIT_URL, loadJSON, flagStub, dataFooter, loop, landRings, viridis, cssGradient } from './common.js';

export default async function catalog(el, ctx) {
  const panel = el.closest('.viz');
  const [THREE, { OrbitControls }, data] = await Promise.all([import(THREE_URL), import(ORBIT_URL), loadJSON(el.dataset.src)]);
  flagStub(el, data.meta);
  dataFooter(panel, [{ href: el.dataset.src, label: 'JSON' }].concat(el.dataset.csv ? [{ href: el.dataset.csv, label: 'CSV' }] : []), data.meta);
  const cols = data.columns || ['lon', 'lat', 'depth_km', 'mag'];
  const ci = n => cols.indexOf(n);
  const iLon = ci('lon'), iLat = ci('lat'), iZ = ci('depth_km') >= 0 ? ci('depth_km') : ci('depth'), iM = ci('mag');
  const rows = (data.rows || (data.points || []).map(p => cols.map(c => p[c])));
  let bbox = data.bbox;
  if (!bbox) {
    let a = 999, b = 999, c = -999, d = -999;
    for (const r of rows) { a = Math.min(a, r[iLon]); c = Math.max(c, r[iLon]); b = Math.min(b, r[iLat]); d = Math.max(d, r[iLat]); }
    bbox = [a, b, c, d];
  }
  const lonc = (bbox[0] + bbox[2]) / 2, latc = (bbox[1] + bbox[3]) / 2;
  const kx = 111.19 * Math.cos(latc * Math.PI / 180), ky = 111.19;
  const vex = +(el.dataset.vex || 1);
  let zMax = 0; for (const r of rows) zMax = Math.max(zMax, r[iZ]);
  const zCap = +(el.dataset.zmax || zMax);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.7;
  renderer.domElement.style.touchAction = 'pan-y';
  controls.autoRotate = !ctx.reducedMotion; controls.autoRotateSpeed = 0.5;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const n = rows.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
  rows.forEach((r, i) => {
    pos[3 * i] = (r[iLon] - lonc) * kx; pos[3 * i + 1] = -Math.min(r[iZ], zCap) * vex; pos[3 * i + 2] = -(r[iLat] - latc) * ky;
    const c = new THREE.Color().setRGB(...viridis(1 - Math.min(1, r[iZ] / zCap)).map(x => x / 255), THREE.SRGBColorSpace);
    col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
    const m = iM >= 0 && isFinite(r[iM]) ? r[iM] : 1;
    size[i] = Math.max(1.4, 1.2 + 0.9 * m);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDpr: { value: dpr }, uAlpha: { value: 0.8 } },
    vertexShader: `attribute float size; varying vec3 vC; uniform float uDpr;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uDpr; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; uniform float uAlpha;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d); if (r > 0.25) discard; gl_FragColor = vec4(vC, uAlpha * smoothstep(0.25, 0.12, r));
        #include <colorspace_fragment>
      }`,
    vertexColors: true, transparent: true, depthWrite: false,
  });
  scene.add(new THREE.Points(geo, mat));

  // coastline at sea level + box frame
  const X = lon => (lon - lonc) * kx, Z = lat => -(lat - latc) * ky;
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8 });
  const frameMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.25 });
  try {
    const rings = await landRings('50m');
    const [a, b, c, d] = bbox;
    for (const r of rings) {
      let seg = [];
      const flush = () => { if (seg.length > 1) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seg), lineMat)); seg = []; };
      for (const [lo, la] of r) {
        if (lo >= a && lo <= c && la >= b && la <= d) seg.push(new THREE.Vector3(X(lo), 0, Z(la))); else flush();
      }
      flush();
    }
  } catch (e) { console.warn('coastlines unavailable', e); }
  const x0 = X(bbox[0]), x1 = X(bbox[2]), z0 = Z(bbox[1]), z1 = Z(bbox[3]), yb = -zCap * vex;
  const fp = [];
  const box = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]];
  for (let i = 0; i < 4; i++) { const p = box[i], q = box[(i + 1) % 4]; fp.push(...p, ...q, p[0], yb, p[2], q[0], yb, q[2], p[0], 0, p[2], p[0], yb, p[2]); }
  for (let zz = 10; zz < zCap; zz += 10) { fp.push(x0, -zz * vex, z0, x1, -zz * vex, z0); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  scene.add(new THREE.LineSegments(fg, frameMat));
  const labels = [];
  const lab = (t, x, y, z) => {
    const c = document.createElement('canvas'), g = c.getContext('2d'); const fs = 40;
    g.font = `500 ${fs}px sans-serif`; c.width = Math.ceil(g.measureText(t).width) + 10; c.height = fs + 12;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    const hgt = (x1 - x0) * 0.035; sp.scale.set(hgt * c.width / c.height, hgt, 1); sp.position.set(x, y, z);
    sp.userData = { c, g, t, fs, tex }; labels.push(sp); scene.add(sp);
  };
  for (let zz = 0; zz <= zCap; zz += 10) lab(`${zz} km`, x0 - (x1 - x0) * 0.06, -zz * vex, z0);
  lab('N', x0, 0, z1 - (z0 - z1) * 0.06);
  function paint() {
    lineMat.color = new THREE.Color(ctx.css('--ink-2')); frameMat.color = new THREE.Color(ctx.css('--muted'));
    for (const sp of labels) { const { c, g, t, fs, tex } = sp.userData; g.clearRect(0, 0, c.width, c.height); g.font = `500 ${fs}px sans-serif`; g.fillStyle = ctx.css('--muted'); g.textBaseline = 'middle'; g.fillText(t, 5, c.height / 2); tex.needsUpdate = true; }
    const cb = panel.querySelector('.cbar'); if (cb) cb.style.background = cssGradient(v => viridis(1 - v));
    const zm = panel.querySelector('[data-zmax]'); if (zm) zm.textContent = Math.round(zCap) + ' km';
    const nn = panel.querySelector('[data-n]'); if (nn) nn.textContent = n.toLocaleString('en-US');
  }
  const span = Math.max(x1 - x0, z0 - z1);
  controls.target.set(0, yb / 2, 0);
  camera.position.set(span * 0.55, span * 0.6, span * 1.25);
  controls.update();
  function resize() { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(el); resize();
  loop(ctx, () => { controls.update(); renderer.render(scene, camera); });
  ctx.onTheme(paint); paint();
}
