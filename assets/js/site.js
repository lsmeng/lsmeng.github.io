/* Site-wide behaviour: compact mobile menu, footer year,
   e-mail assembly, and lazy initialisation of interactive figures.

   Interactive figures are declared in HTML as
     <div class="viz-stage" data-viz="globe" data-src="assets/data/..."></div>
   and the module assets/js/viz/<name>.js is imported only when the element
   scrolls near the viewport. Each module exports `default async function
   (el, ctx)`, where ctx = { reducedMotion, theme(), onTheme(cb), visible(cb) }. */
(function () {
  'use strict';
  var root = document.documentElement;
  var BASE = (document.currentScript && document.currentScript.src) || location.href;

  /* ---- theme: the site is light only; modules may still register onTheme callbacks (never fired) ---- */
  var themeListeners = [];
  function theme() { return 'light'; }
  try { localStorage.removeItem('theme'); localStorage.removeItem('variant'); } catch (e) {}

  /* ---- mobile menu ---- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', function () {
      var open = !header.classList.contains('open');
      header.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('open')) { header.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (header.classList.contains('open') && !header.contains(e.target)) { header.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---- footer year, e-mail (never written in plain text in the HTML) ---- */
  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
  var mail = 'mailto:' + 'lsmeng' + '@' + 'g.ucla.edu';
  document.querySelectorAll('[data-mail]').forEach(function (a) { a.href = mail; });

  /* ---- click-to-enlarge for original figures ---- */
  var lb = null;
  function openLightbox(img) {
    if (!lb) {
      lb = document.createElement('dialog'); lb.className = 'lightbox';
      lb.innerHTML = '<button class="lb-close" type="button" aria-label="Close">\u00d7</button><img alt=""><p></p>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function () { lb.close(); });
    }
    var big = lb.querySelector('img'); big.src = img.currentSrc || img.src; big.alt = img.alt;
    var cap = img.closest('figure') && img.closest('figure').querySelector('figcaption');
    lb.querySelector('p').textContent = cap ? cap.textContent : '';
    if (lb.showModal) lb.showModal(); else window.open(big.src, '_blank');
  }
  document.querySelectorAll('img[data-zoom]').forEach(function (img) {
    img.setAttribute('tabindex', '0'); img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt || 'Figure') + ' (click to enlarge)');
    img.addEventListener('click', function () { openLightbox(img); });
    img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(img); } });
  });

  /* ---- lazy interactive figures ---- */
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function makeCtx(el) {
    var visCbs = [], lastVis = null;
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { lastVis = en.isIntersecting; visCbs.forEach(function (cb) { cb(lastVis); }); });
    }) : null;
    if (io) io.observe(el);
    return {
      reducedMotion: reduced,
      theme: theme,
      onTheme: function (cb) { themeListeners.push(cb); },
      visible: function (cb) { visCbs.push(cb); if (!io) cb(true); else if (lastVis !== null) cb(lastVis); },
      css: function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
    };
  }
  function boot(el) {
    if (el.__booted) return; el.__booted = true;
    var name = el.getAttribute('data-viz');
    var url = new URL('viz/' + name + '.js', BASE).href;
    import(url).then(function (mod) { return mod.default(el, makeCtx(el)); }).catch(function (err) {
      console.error('viz ' + name + ' failed', err);
      var p = document.createElement('p'); p.className = 'viz-fallback';
      p.textContent = 'This interactive figure could not be loaded (' + (err && err.message ? err.message : err) + ').';
      el.appendChild(p);
    });
  }
  var vizEls = document.querySelectorAll('[data-viz]');
  if ('IntersectionObserver' in window) {
    var lazy = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { lazy.unobserve(en.target); boot(en.target); } });
    }, { rootMargin: '300px 0px' });
    vizEls.forEach(function (el) { lazy.observe(el); });
  } else { vizEls.forEach(boot); }
})();
