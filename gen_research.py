#!/usr/bin/env python3
"""Generate the Research index (research.html) and one stand-alone page per
research topic. Run: python3 gen_research.py"""

NAV = """<nav class="nav">
  <div class="nav-inner">
    <a class="nav-brand" href="index.html">Lingsen Meng</a>
    <div class="nav-links">
      <a href="index.html">Home</a>
      <a href="research.html"{research_active}>Research</a>
      <a href="publications.html">Publications</a>
      <a href="group.html">Group</a>
      <a href="index.html#contact">Contact</a>
    </div>
  </div>
</nav>"""

FOOT = """<footer>
  <div class="wrap">© <span id="yr"></span> Lingsen Meng · Department of Earth, Planetary and Space Sciences, UCLA</div>
</footer>
<script>document.getElementById('yr').textContent = new Date().getFullYear();</script>"""

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Lingsen Meng</title>
<meta name="description" content="{desc}">
<link rel="stylesheet" href="style.css">
</head>
<body>

{nav}

<main class="wrap">
{body}
</main>

{foot}
</body>
</html>
"""

def fig(src, cap, alt=""):
    return f"""    <figure class="fig">
      <img src="assets/figures/{src}" alt="{alt or cap[:60]}">
      <figcaption>{cap}</figcaption>
    </figure>"""

# ---- Topic content (in display order) ----
# Each: slug, nav-title, thumbnail figure for the index card, card blurb, page body
TOPICS = []

TOPICS.append(dict(
    slug="rupture", title="Rupture Dynamics & Supershear Earthquakes",
    thumb="rupture-mandalay.jpg",
    blurb="Imaging how ruptures propagate, branch, and reach supershear speeds — from Sumatra and Palu to Türkiye and Mandalay.",
    body="""    <p class="lead">
      How fast and how far a rupture runs controls the shaking it produces. We image and model
      rupture propagation across complex fault systems, with a focus on <strong>supershear
      earthquakes</strong> — events whose rupture front outruns the shear-wave speed, intensifying
      ground motion. Using array back-projection and waveform modeling we have characterized
      supershear and geometrically complex ruptures in the 2018 Palu, 2023 Kahramanmaraş (Türkiye),
      and 2025 Mandalay earthquakes, and established a global census showing that supershear
      ruptures are more common than previously recognized
      <span class="ref">(Bao et al., Nature Geoscience 2022)</span>. We also study what arrests
      ruptures and what lets them jump between fault segments.
    </p>
""" + fig("rupture-mandalay.jpg",
          'Back-projection of the 2025 Mw&nbsp;7.7 Mandalay earthquake: the rupture ran south along the Sagaing Fault at supershear speed (~5.0&nbsp;km/s) on its southern branch <span class="ref">(Xu, Meng et al., Science 2025)</span>.'),
))

TOPICS.append(dict(
    slug="source-imaging", title="Seismic Array Source Imaging",
    thumb="seismic-array-back-projection-1.jpg",
    blurb="Back-projection and MUSIC high-resolution imaging, with reference-window, slowness calibration and 3-D extensions.",
    body="""    <p class="lead">
      We answer fundamental questions about the physics of earthquake ruptures — initiation,
      complex propagation, and final arrest — through high-resolution, robust observations.
      Numerical models predict rich rupture behavior, but observational constraints have long been
      limited by resolution. Dense seismic arrays let us trace high-frequency radiation by
      back-tracing the seismic waves they record, tracking the strongest zones of rupture radiation
      in space and time.
    </p>
    <p class="lead" style="margin-top:14px;">
      <strong>Case study — 2012 off-Sumatra M8.6.</strong> Back-projection revealed a remarkably
      complex rupture on four orthogonally oriented fault planes. The rupture branched onto faults
      under compressional stress — challenging conventional dynamic-clamping theory — and jumped a
      ~20&nbsp;km offset between parallel segments, far larger than the &le;5&nbsp;km steps typical
      of California faults.
    </p>
""" + fig("seismic-array-back-projection-1.jpg",
          'Back-projection of the 2012 Mw&nbsp;8.6 off-Sumatra earthquake, imaging rupture across four orthogonal fault branches; colors denote rupture time <span class="ref">(Meng et al., Science 2012)</span>.') + """

    <div class="subsec" id="music">
      <h3>High-resolution MUSIC imaging</h3>
      <p>
        Standard back-projection uses beamforming, which has limited resolution when multiple
        sources radiate simultaneously. We introduced the MUltiple SIgnal Classification (MUSIC)
        algorithm into back-projection <span class="ref">(Schmidt, 1986; Meng et al., GRL 2011)</span>
        and made it practical for non-stationary seismic signals using multitaper cross-spectrum
        estimates <span class="ref">(Thomson, 2000)</span>. MUSIC-enhanced back-projection yields
        sharper images of the rupture process <span class="ref">(Meng et al., JGR 2012)</span> and
        can separate sources with azimuth separation as small as 3&deg;.
      </p>
""" + fig("high-resolution-music-imaging-1.png",
          'Resolving two plane waves A and B: MUSIC (left) separates sources down to ~3&deg; azimuth, far sharper than beamforming (right).') + """
    </div>

    <div class="subsec" id="refwin">
      <h3>Reference-window strategy (the &ldquo;swimming artifact&rdquo;)</h3>
      <p>
        A well-known problem in back-projection is the &ldquo;swimming artifact&rdquo; — systematic
        transients that migrate across the image toward the receiver array, degrading confidence in
        source details. The artifact arises because earthquake waveforms are impulsive and
        non-stationary, whereas conventional back-projection assumes stationary signals. By
        replacing the conventional &ldquo;absolute window&rdquo; with a &ldquo;reference
        window&rdquo; in the sliding-window analysis, we mitigate the swimming artifact
        <span class="ref">(Meng et al., EPS 2013)</span> without sacrificing resolution.
      </p>
""" + fig("reference-window-strategy-2.gif",
          'Animated back-projection of high-frequency radiation; the reference-window strategy suppresses the migrating &ldquo;swimming artifact&rdquo; seen with conventional windowing.') + """
    </div>

    <div class="subsec" id="slowness">
      <h3>Slowness calibration</h3>
      <p>
        Different arrays can image the same earthquake differently, largely because of
        array-specific P-wave travel-time errors from 3-D Earth structure. We proposed slowness
        calibration <span class="ref">(Meng et al., 2016)</span> to reconcile them. Beyond aligning
        the first arrival to the cataloged hypocenter, we add a slowness (ray-parameter) correction
        — the spatial derivative of travel time with source location at each station — calibrated
        using aftershock catalogs. This markedly improves the consistency of back-projection across
        globally distributed arrays.
      </p>
""" + fig("slowness-calibration-1.png",
          '2015 Gorkha earthquake: aftershock and mainshock back-projections from the Australian, North American, and European arrays disagree before calibration (left) and converge after (right).') + """
    </div>

    <div class="subsec" id="bp3d">
      <h3>3-D back-projection for deep earthquakes</h3>
      <p>
        For deep-focus earthquakes, whose fault planes are poorly defined, we developed 3-D
        back-projection (3DBP). Because teleseismic rays are nearly vertical, standard
        back-projection has good horizontal but poor depth resolution. 3DBP combines P and pP
        phases, whose ray paths intersect in space, to recover depth. Applied to the 2013 Okhotsk
        earthquake (Mw&nbsp;8.3) — the largest deep-focus event ever recorded — 3DBP shows a
        predominantly horizontal N&ndash;S rupture whose focal depth increases southward, consistent
        with cascading failure along sub-parallel horizontal planes in an en-echelon pattern.
      </p>
""" + fig("3d-back-projection-1.png",
          '3-D spatio-temporal rupture of the 2013 Okhotsk deep earthquake from P and pP back-projection; depth sections (b, c) reveal southward-deepening, en-echelon rupture.') + """
    </div>

    <div class="subsec" id="insights">
      <h3>Physical insights from recent large earthquakes</h3>
      <p>
        Across many events, source imaging reveals rupture physics. In <strong>Tohoku-Oki</strong>,
        peak low-frequency slip lies up-dip of the hypocenter while high-frequency radiation comes
        from the deeper megathrust, consistent with small brittle asperities embedded in a ductile
        matrix. In <strong>Haiti</strong>, two high-frequency subevents at the ends of the geodetic
        slip mark stopping phases. In <strong>off-Sumatra</strong>, the rupture branched onto
        compressional faults, challenging dynamic-clamping ideas. In <strong>Okhotsk</strong>,
        olivine-to-spinel phase transformation and thermal-runaway shear instability appear to
        control different rupture segments. Additional studies (Iquique, Gorkha, Tajikistan,
        Illapel) show how ruptures interact with geometric barriers, narrow into confined zones,
        and split around asperities.
      </p>
    </div>""",
))

TOPICS.append(dict(
    slug="eew", title="Earthquake Early Warning",
    thumb="earthquake-early-warning-1.png",
    blurb="Small-scale seismic arrays that track rupture growth and directivity in real time for finite-source early warning.",
    body="""    <p class="lead">
      We are developing earthquake early warning (EEW) based on small-scale seismic arrays that
      track rupture growth and the directivity (Doppler) effect in real time, providing
      finite-source estimates that overcome the limitations of conventional point-source EEW
      <span class="ref">(Meng, Allen &amp; Ampuero, BSSA 2014)</span>. Dense array clusters near
      active faults can estimate rupture size, duration, and directivity in real time by
      back-tracing the recorded waveforms — potentially enabling warning for M&gt;7 events. We
      demonstrated the concept with the 2004 M6.0 Parkfield and 2010 M7.2 El Mayor-Cucapah
      earthquakes.
    </p>
""" + fig("earthquake-early-warning-1.png",
          'A small-scale array near the fault back-traces high-frequency waves from the rupture front, estimating rupture length, duration, and directivity in real time.'),
))

TOPICS.append(dict(
    slug="tsunami", title="Tsunami Prediction & Early Warning",
    thumb="tsunami-prediction-and-early-warning-1.png",
    blurb="Real-time back-projection and time-reversal imaging to forecast tsunami arrival time and coastal run-up.",
    body="""    <p class="lead">
      A natural extension of array-based EEW is to apply similar processing at larger spatial scale
      and longer time span for tsunami warning: use real-time back-projection to build a simple
      source model that feeds a tsunami simulation predicting arrival time and coastal run-up
      height. We demonstrated this for megathrust events including the 2011 Tohoku-Oki, 2014
      Iquique, and 2015 Illapel earthquakes <span class="ref">(An &amp; Meng, GRL 2016)</span>,
      supporting warnings in regions exposed to near-field tsunami hazard.
    </p>
""" + fig("tsunami-prediction-and-early-warning-1.png",
          'Fast seismic waves reach onshore arrays well before the slow tsunami wave; real-time back-projection of the rupture feeds a tsunami forecast.') + """

    <div class="subsec" id="tri">
      <h3>Time-reversal imaging of tsunami sources</h3>
      <p>
        Traditional tsunami source inversion uses finite-fault slip modeling, which is sensitive to
        assumed fault parameters and crustal rigidity and is computationally heavy. Time-reversal
        imaging instead reconstructs the initial sea-surface elevation by back-propagating and
        constructively interfering the recorded tsunami waveforms
        <span class="ref">(An &amp; Meng, 2017)</span>. It needs no pre-defined fault parameters,
        suits events with unknown fault geometry, handles dense meshes efficiently, and can resolve
        small secondary sources such as submarine landslides or splay-fault ruptures. We validated
        it on synthetic sources and applied it to the 2014 Iquique and 2015 Illapel events.
      </p>
""" + fig("tsunami-time-reversal-imaging-1.png",
          'Initial water elevation recovered by time-reversal imaging (bottom rows) compared with finite-fault predictions (top), for tsunami events including 2014 Iquique.') + """
    </div>""",
))

TOPICS.append(dict(
    slug="swarms", title="Earthquake Swarms & Fluid-Driven Seismicity",
    thumb="swarms-tengchong.jpg",
    blurb="How migrating fluids and multiscale fault complexity drive swarms — Noto Peninsula and the Tengchong Volcanic Field.",
    body="""    <p class="lead">
      Not all seismicity is driven by tectonic loading alone. We study earthquake swarms and
      fluid-pressure-driven sequences, where migrating fluids and multiscale fault complexity
      modulate where and when earthquakes occur. Recent work examines the multi-year Noto Peninsula
      sequence in Japan — including what finally ended the swarm and drove its aftershocks
      <span class="ref">(Mohanna et al., EPSL 2026)</span> — and the hydrothermally driven swarms of
      the Tengchong Volcanic Field on the SE Tibetan Plateau
      <span class="ref">(Ma et al., Tectonophysics 2026)</span>. Machine-learning detection (e.g.,
      the EdgePhase multi-station phase picker) lets us build the dense catalogs these studies
      require.
    </p>
""" + fig("swarms-tengchong.jpg",
          'Seismicity of the Tengchong Volcanic Field (SE Tibetan Plateau): swarms cluster near hot springs and volcanoes along the Sagaing/NCB system, driven by hydrothermal fluids and multiscale fault complexity <span class="ref">(Ma et al., Tectonophysics 2026)</span>.'),
))

TOPICS.append(dict(
    slug="slow-slip", title="Pre-, Post-, and Independent Slow Slip",
    thumb="slowslip-illapel.jpg",
    blurb="Foreshocks, afterslip and slow-slip transients that precede and follow great earthquakes.",
    body="""    <p class="lead">
      Many large earthquakes are preceded by foreshock sequences that are key to short-term
      forecasting. Using matched-filter detection and repeating-earthquake analysis, we study
      pre-seismic, post-seismic, and independent slow slip. Before the 2015 Gorkha earthquake we
      found a significant increase in seismicity rate a few days before the mainshock; before the
      2015 Illapel earthquake, seismicity and aseismic slip progressively accelerated around the
      epicenter. After Illapel, we identified distinct early-aftershock expansion and afterslip
      consistent across methods. We also model episodic slow-slip events at the brittle&ndash;ductile
      transition as occurring within a viscoplastic shear zone, reproducing the observed
      linear-then-exponential slip evolution.
    </p>
""" + fig("slowslip-illapel.jpg",
          'Slow unlocking before the 2015 Mw&nbsp;8.4 Illapel earthquake: repeating earthquakes (green) and accelerating aseismic slip near the future epicenter in the ~months before the mainshock <span class="ref">(Huang &amp; Meng, GRL 2018)</span>.'),
))

# ---- write topic pages ----
n = len(TOPICS)
for i, t in enumerate(TOPICS):
    prev_t = TOPICS[i-1] if i > 0 else None
    next_t = TOPICS[i+1] if i < n-1 else None
    pn = '    <div class="prevnext">\n'
    if prev_t:
        pn += f'      <a class="pv" href="{prev_t["slug"]}.html">&larr; {prev_t["title"]}</a>\n'
    if next_t:
        pn += f'      <a class="nx" href="{next_t["slug"]}.html">{next_t["title"]} &rarr;</a>\n'
    pn += '    </div>'

    body = f"""  <section style="border-top:none;">
    <p class="breadcrumb"><a href="research.html">Research</a> &nbsp;/&nbsp; {t['title']}</p>
    <h2 style="font-size:30px;">{t['title']}</h2>
{t['body']}
  </section>

  <section>
{pn}
    <p style="margin-top:16px;"><a class="btn" href="research.html">&larr; All research topics</a> &nbsp; <a class="btn btn-primary" href="publications.html">Publications &rarr;</a></p>
  </section>"""

    html = PAGE.format(
        title=t['title'].replace("&", "&amp;"),
        desc=f"{t['title']} — research in the Meng seismology group at UCLA.".replace('"', ''),
        nav=NAV.format(research_active=' class="active"'),
        body=body, foot=FOOT,
    )
    with open(f"{t['slug']}.html", "w") as f:
        f.write(html)
    print(f"wrote {t['slug']}.html")

# ---- write research.html index ----
cards = []
for t in TOPICS:
    cards.append(f"""      <a class="card" href="{t['slug']}.html">
        <img class="card-thumb" src="assets/figures/{t['thumb']}" alt="{t['title']}">
        <h3>{t['title']}</h3>
        <p>{t['blurb']}</p>
      </a>""")
cards_html = "\n".join(cards)

index_body = f"""  <section style="border-top:none;">
    <h2 style="font-size:30px;">Research</h2>
    <p class="lead">
      We study earthquake physics, seismic hazards, and tsunami processes by combining seismic
      observations, source imaging, numerical modeling, and data-driven approaches — investigating
      how ruptures nucleate, propagate, and interact with complex fault systems, and turning that
      understanding into better hazard assessment, monitoring, and early warning. A central thread
      of our methodological work is seismic array processing — <em>back-projection</em> — for
      earthquake source imaging. Explore the topics below.
    </p>
  </section>

  <section>
    <div class="cards">
{cards_html}
    </div>
  </section>"""

index_html = PAGE.format(
    title="Research",
    desc="Research topics of the Meng seismology group at UCLA: rupture dynamics, seismic array source imaging, earthquake & tsunami early warning, swarms, and slow slip.",
    nav=NAV.format(research_active=' class="active"'),
    body=index_body, foot=FOOT,
)
with open("research.html", "w") as f:
    f.write(index_html)
print("wrote research.html (index)")
