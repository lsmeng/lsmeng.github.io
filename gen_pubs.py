#!/usr/bin/env python3
"""Generate publications.html from a structured list. Run: python3 gen_pubs.py"""
import html

# (num, title, authors, venue, year, doi_url_or_None, badge)  badge in {None,'science','nature'}
PUBS = [
(65,"Swarm cessation and aftershock drivers following the pressure release of a four-year-long seismic sequence at the Noto Peninsula","Mohanna, S., Meng, L., Vuan, A. & Yu, H.","Earth and Planetary Science Letters, 690, 120113","2026","https://doi.org/10.1016/j.epsl.2026.120113",None),
(64,"Dual-fault rupture and thermo-mechanical setting of the 2025 Dingri earthquake (southern Tibet)","Zhang, Y., Guo, R., Tang, X., He, H., Meng, L., Li, L., Xu, J. & Sun, H.","Seismological Research Letters","2026","https://doi.org/10.1785/0220250141",None),
(63,"Multiscale fault complexity and hydrothermal processes drive earthquake swarms in the Tengchong Volcanic Field, Southeastern Tibetan Plateau","Ma, J.-Z., Meng, L., Yin, H., Bai, Y., Li, Z. & Ai, Y.","Tectonophysics, 231080","2026","https://doi.org/10.1016/j.tecto.2026.231080",None),
(62,"Bimaterial effect and favorable energy ratio enabled supershear rupture in the 2025 Mandalay earthquake","Xu, L., Meng, L., Yunjun, Z., Yang, Y., Wang, Y., Hu, C., Weng, H., Xu, W., Su, E. & Ji, C.","Science, 390(6772), 476-481","2025","https://doi.org/10.1126/science.ady6100","science"),
(61,"PKIKP phase back-projection and its application on Southern Hemisphere earthquake imaging","Xu, L., Meng, L. & Chu, R.","Journal of Geophysical Research: Solid Earth, 130(10), e2025JB031667","2025","https://doi.org/10.1029/2025JB031667",None),
(60,"The 28 January 2020, Mw 7.7, Cayman Trough / Oriente Fault, supershear earthquake rupture","Calais, E., Delouis, B., Ampuero, J.-P., Bao, H., Courboulex, F., Deschamps, A., de Lépinay, B., Monfret, T., Meng, L., Xu, L., et al.","Seismica","2025",None,None),
(59,"The 2024 Noto earthquake and tsunami: insights from the static and adjoint state inversion methods","Mohanna, S., Meng, L., Ho, T.C., An, C. & Xu, L.","Earth, Planets and Space, 77, 130","2025","https://doi.org/10.1186/s40623-025-02197-7",None),
(58,"Unzipping of the conjugate fault system during the 2024 Mw 7.4 Hualien earthquake","Xu, L., Meng, L., Xu, W., Lin, Y.-Y., Geng, J., Mohanna, S. & Kawamoto, G.","Geophysical Research Letters, 52(13), e2025GL115218","2025",None,None),
(57,"Dual-initiation ruptures in the 2024 Noto earthquake encircling a fault asperity at a swarm edge","Xu, L., Ji, C., Meng, L., Ampuero, J.P., Yunjun, Z., Mohanna, S. & Aoki, Y.","Science, 385(6711), 871-876","2024",None,"science"),
(56,"Adjoint inversion of near-field pressure gauge recordings for rapid and accurate tsunami source characterization","Xie, Y., Mohanna, S., Meng, L., Zhou, T. & Ho, T.C.","Earth and Space Science, 10(12), e2023EA003086","2023",None,None),
(55,"The overall-subshear and multi-segment rupture of the 2023 Mw 7.8 Kahramanmaraş, Turkey earthquake in millennia supercycle","Xu, L., Mohanna, S., Meng, L., Ji, C., Ampuero, J.P., Yunjun, Z., Hasnain, M., Chu, R. & Liang, C.","Communications Earth & Environment, 4(1), 379","2023",None,None),
(54,"Understanding and mitigating the spatial bias of earthquake source imaging with regional slowness enhanced back-projection","Zhang, Y., Bao, H., Meng, L. & Aoki, Y.","Journal of Geophysical Research: Solid Earth, 128(5), e2022JB025525","2023",None,None),
(53,"Understanding the rupture kinematics and slip model of the 2021 Mw 7.4 Maduo earthquake: a bilateral event on bifurcating faults","Xu, L., Yunjun, Z., Ji, C., Meng, L., Fielding, E.J., Zinke, R. & Bao, H.","Journal of Geophysical Research: Solid Earth, e2022JB025936","2023",None,None),
(52,"Self-reactivated rupture during the 2019 Mw=8 northern Peru intraslab earthquake","Vallée, M., Xie, Y., Grandin, R., Villegas-Lanza, J.C., Nocquet, J.-M., Vaca, S., Meng, L., Ampuero, J.-P., et al.","Earth and Planetary Science Letters, 601, 117886","2022","https://doi.org/10.1016/j.epsl.2022.117886",None),
(51,"The 2021 Mw 7.3 East Cape earthquake: triggered rupture in complex faulting revealed by multi-array back-projections","Xie, Y., Meng, L., Zhou, T., Xu, L., Bao, H. & Chu, R.","Geophysical Research Letters, e2022GL099643","2022",None,None),
(50,"EdgePhase: a deep learning model for multi-station seismic phase picking","Feng, T., Mohanna, S. & Meng, L.","Geochemistry, Geophysics, Geosystems, e2022GC010453","2022",None,None),
(49,"Global frequency of oceanic and continental supershear earthquakes","Bao, H., Xu, L., Meng, L., Ampuero, J.-P., Gao, L. & Zhang, H.","Nature Geoscience, 15, 942-949","2022","https://doi.org/10.1038/s41561-022-01055-5","nature"),
(48,"Seismic waveform-coherence controlled by earthquake source dimensions","Zhou, T., Meng, L., Zhang, A. & Ampuero, J.-P.","Journal of Geophysical Research: Solid Earth, 127, e2021JB023458","2022","https://doi.org/10.1029/2021JB023458",None),
(47,"Citizen seismology helps decipher the 2021 Haiti earthquake","Calais, E., Symithe, S., Monfret, T., Delouis, B., Lomax, A., Courboulex, F., ... Xu, L. & Meng, L.","Science, eabn1045","2022","https://doi.org/10.1126/science.abn1045","science"),
(46,"Rupture heterogeneity and directivity effects in back-projection analysis","Li, B., Wu, B., Bao, H., Oglesby, D.D., Ghosh, A., Gabriel, A.A., Meng, L. & Chu, R.","Journal of Geophysical Research: Solid Earth, e2021JB022663","2022",None,None),
(45,"Source imaging with a multi-array local back-projection and its application to the 2019 Mw 6.4 and Mw 7.1 Ridgecrest earthquakes","Xie, Y., Bao, H. & Meng, L.","Journal of Geophysical Research: Solid Earth, 126, e2020JB021396","2021","https://doi.org/10.1029/2020JB021396",None),
(44,"Spatio-temporal foreshock evolution of the 2019 M 6.4 and M 7.1 Ridgecrest, California earthquakes","Huang, H., Meng, L., Bürgmann, R., Wang, W. & Wang, K.","Earth and Planetary Science Letters, 551, 116582","2020","https://doi.org/10.1016/j.epsl.2020.116582",None),
(43,"Stress field variation during the 2019 Ridgecrest earthquake sequence","Sheng, S. & Meng, L.","Geophysical Research Letters, e2020GL087722","2020",None,None),
(42,"Detecting offshore seismicity: combining backprojection imaging and matched-filter detection","Feng, T., Meng, L. & Huang, H.","Journal of Geophysical Research: Solid Earth, e2020JB019599","2020",None,None),
(41,"A multi-array back-projection approach for tsunami warning","Xie, Y. & Meng, L.","Geophysical Research Letters, 47(14), e2019GL085763","2020",None,None),
(40,"Length-scale-dependent relationships between VS30 and topographic slopes in Southern California","Lin, J., Moon, S., Yong, A., Meng, L. & Davis, P.M.","Bulletin of the Seismological Society of America","2019","https://doi.org/10.1785/0120190076",None),
(39,"An adjoint-state full waveform tsunami source inversion method and its application to the 2014 Chile-Iquique tsunami event","Zhou, T., Meng, L., Xie, Y. & Jia, H.","Journal of Geophysical Research","2019","https://doi.org/10.1029/2018JB016678",None),
(38,"Nucleation and kinematic rupture of the 2017 Mw 8.2 Tehuantepec earthquake","Meng, L., Huang, H., Xie, Y., Bao, H. & Dominguez, L.A.","Geophysical Research Letters","2019",None,None),
(37,"Comparison of site dominant frequency from earthquake and microseismic data in California","Hassani, B., Yong, A., Atkinson, G.M., Feng, T. & Meng, L.","Bulletin of the Seismological Society of America","2019","https://doi.org/10.1785/0120180267",None),
(36,"Early and persistent supershear rupture of the 2018 magnitude 7.5 Palu earthquake","Bao, H., Ampuero, J-P., Meng, L., Fielding, E., Liang, C., Milliner, C., Feng, T. & Huang, H.","Nature Geoscience","2019","https://doi.org/10.1038/s41561-018-0297-z","nature"),
(35,"A high-frequency distance metric in ground motion prediction equations based on seismic array back-projections","Feng, T. & Meng, L.","Geophysical Research Letters","2018","https://doi.org/10.1029/2018GL078930",None),
(34,"Rupture behavior and interaction of the 2018 Hualien earthquake sequence and its tectonic implication","Jian, P., Hung, S.-H. & Meng, L.","Seismological Research Letters","2018","https://doi.org/10.1785/0220180241",None),
(33,"Complex faulting and triggered rupture during the 2018 Mw 7.9 offshore Kodiak, Alaska earthquake","Ruppert, N.A., Rollins, C., Zhang, A., Meng, L., Holtkamp, S.G., West, M.E. & Freymueller, J.T.","Geophysical Research Letters","2018","https://doi.org/10.1029/2018GL078931",None),
(32,"A sensitivity analysis of tsunami inversions on the number of stations","An, C., Liu, P.L. & Meng, L.","Geophysical Journal International, 214(2), 1313-1323","2018",None,None),
(31,"Source complexity of the 2015 Mw 7.9 Bonin earthquake","Chen, Y., Meng, L., Zhang, A. & Wen, L.","Geochemistry, Geophysics, Geosystems, 19","2018","https://doi.org/10.1029/2018GC007489",None),
(30,"Double pincer movement: encircling rupture splitting during the 2015 Mw 8.3 Illapel earthquake","Meng, L., Bao, H., Huang, H., Zhang, A., Bloore, A. & Liu, Z.","Earth and Planetary Science Letters, 495, 164-173","2018",None,None),
(29,"Slow unlocking processes preceding the 2015 Mw 8.4 Illapel, Chile, earthquake","Huang, H. & Meng, L.","Geophysical Research Letters, 45","2018","https://doi.org/10.1029/2018GL077060",None),
(28,"A viscoplastic shear-zone model for deep (15-50 km) slow-slip events at plate convergent margins","Yin, A., Xie, Z. & Meng, L.","Earth and Planetary Science Letters, 491, 81-94","2018",None,None),
(27,"Transpressional rupture cascade of the 2016 Mw 7.8 Kaikoura earthquake, New Zealand","Xu, W., Feng, G., Meng, L., Zhang, A., Ampuero, J.P., Bürgmann, R. & Fang, L.","Journal of Geophysical Research: Solid Earth, 123, 2396-2409","2018","https://doi.org/10.1002/2017JB015168",None),
(26,"Theoretical solution and applications of ocean bottom pressure induced by seismic seafloor motion","An, C., Cai, C., Zheng, Y., Meng, L. & Liu, P.","Geophysical Research Letters, 44(20)","2017",None,None),
(25,"Utilizing a 3D global P-wave tomography model to improve backprojection imaging: a case study of the 2015 Nepal earthquake","Liu, Z., Song, C., Meng, L., Ge, Z., Huang, Q. & Wu, Q.","Bulletin of the Seismological Society of America, 107(5), 2459-2466","2017","https://doi.org/10.1785/0120170091",None),
(24,"The 2015 Mw 8.3 Illapel, Chile, earthquake: direction-reversed along-dip rupture with localized water reverberation","An, C., Yue, H., Sun, J., Meng, L. & Báez, J.C.","Bulletin of the Seismological Society of America, 107(5), 2416-2426","2017",None,None),
(23,"Localized water reverberation phases and its impact on back-projection images","Yue, H., Castellanos, J.C., Yu, C., Meng, L. & Zhan, Z.","Geophysical Research Letters, 44","2017","https://doi.org/10.1002/2017GL073254",None),
(22,"Rupture characteristics of the 2016 Meinong earthquake revealed by the back projection and directivity analysis of teleseismic broadband waveforms","Jian, P.-R., Hung, S.-H., Meng, L. & Sun, D.","Geophysical Research Letters, 44, 3545-3553","2017","https://doi.org/10.1002/2017GL072552",None),
(21,"Time reversal imaging of the 2015 Illapel tsunami source","An, C. & Meng, L.","Geophysical Research Letters, 44(4), 1732-1739","2017",None,None),
(20,"Fault geometry of 2015, Mw 7.2 Murghab, Tajikistan earthquake controls rupture propagation: insights from InSAR and seismological data","Sangha, S., Peltzer, G., Zhang, A., Meng, L., Liang, C., Lundgren, P. & Fielding, E.","Earth and Planetary Science Letters, 462, 132-141","2017",None,None),
(19,"Early aftershocks and afterslip surrounding the 2015 Mw 8.4 Illapel rupture","Huang, H., Xu, W., Meng, L., Bürgmann, R. & Baez, J.C.","Earth and Planetary Science Letters, 457, 282-291","2017",None,None),
(18,"Matched-filter detection of the missing pre-mainshock events and aftershocks in the 2015 Gorkha, Nepal earthquake sequence","Huang, H., Meng, L., Plasencia, M., Wang, Y., Wang, L. & Xu, M.","Tectonophysics","2016","https://doi.org/10.1016/j.tecto.2016.08.018",None),
(17,"Application of array back-projection to tsunami prediction and early warning","An, C. & Meng, L.","Geophysical Research Letters, 43(8), 3677-3685","2016",None,None),
(16,"Improving back projection imaging with a novel physics-based aftershock calibration approach: a case study of the 2015 Gorkha earthquake","Meng, L., Zhang, A. & Yagi, Y.","Geophysical Research Letters, 43(2), 628-636","2016",None,None),
(15,"Lower edge of locked Main Himalayan Thrust unzipped by the 2015 Gorkha earthquake","Avouac, J.P., Meng, L., Wei, S., Wang, T. & Ampuero, J.-P.","Nature Geoscience","2015","https://doi.org/10.1038/ngeo2518","nature"),
(14,"Dual megathrust slip behaviors of the 2014 Iquique earthquake sequence","Meng, L., Huang, H., Bürgmann, R., Ampuero, J.P. & Strader, A.","Earth and Planetary Science Letters, 411, 177-187","2015",None,None),
(13,"Application of seismic array processing to earthquake early warning","Meng, L., Allen, R. & Ampuero, J.-P.","Bulletin of the Seismological Society of America, 104(5), 2553-2561","2014","https://doi.org/10.1785/0120130277",None),
(12,"The 2013 Okhotsk deep-focus earthquake: rupture beyond the metastable olivine wedge and thermally controlled rise time near the edge of a slab","Meng, L., Ampuero, J.-P. & Bürgmann, R.","Geophysical Research Letters, 41","2014","https://doi.org/10.1002/2014GL059968",None),
(11,"The 2013, Mw 7.7 Balochistan earthquake, energetic strike-slip reactivation of a thrust fault","Avouac, J-P., Ayoub, F., Wei, S., Ampuero, J-P., Meng, L., Leprince, S., Jolivet, R., Duputel, Z. & Helmberger, D.","Earth and Planetary Science Letters, 391, 128-134","2014",None,None),
(10,"A dynamic model of the frequency-dependent rupture process of the 2011 Tohoku-Oki earthquake","Huang, Y., Meng, L. & Ampuero, J.-P.","Earth, Planets and Space, 64(12), 1061-1066","2013",None,None),
(9,"Mitigating artifacts in back-projection source imaging with implications on frequency dependent properties of the Tohoku-Oki earthquake","Meng, L., Ampuero, J.-P., Luo, Y., Wu, W. & Ni, S.","Earth, Planets and Space, 64(12), 1101-1109","2013",None,None),
(8,"The 2012 Sumatra great earthquake sequence","Duputel, Z., Kanamori, H., Tsai, V.C., Rivera, L., Meng, L. & Ampuero, J.-P.","Earth and Planetary Science Letters, 351-352, 247-257","2012","https://doi.org/10.1016/j.epsl.2012.07.017",None),
(7,"Earthquake in a maze: compressional rupture branching during the 2012 Mw 8.6 Sumatra earthquake","Meng, L., Ampuero, J.-P., Stock, J., Duputel, Z., Luo, Y. & Tsai, V.C.","Science, 337(6095), 724-726","2012","https://doi.org/10.1126/science.1224030","science"),
(6,"High-resolution back-projection at regional distance: application to the Haiti M7.0 earthquake and comparisons with finite source studies","Meng, L., Ampuero, J.-P., Sladen, A. & Rendon, H.","Journal of Geophysical Research, 117, B04313","2012","https://doi.org/10.1029/2011JB008702",None),
(5,"A window into the complexity of the dynamic rupture of the 2011 Mw 9 Tohoku-Oki earthquake","Meng, L., Inbal, A. & Ampuero, J.-P.","Geophysical Research Letters, 38, L00G07","2011","https://doi.org/10.1029/2011GL048118",None),
(4,"The 2011 magnitude 9.0 Tohoku-Oki earthquake: mosaicking the megathrust from seconds to centuries","Simons, M., Minson, S.E., Sladen, A., Ortega, F., Jiang, J., Owen, S.E., Meng, L., Ampuero, J.-P., Wei, S., Chu, R., Helmberger, D.V., Kanamori, H., Hetland, E., Moore, A.W. & Webb, F.H.","Science, 332","2011","https://doi.org/10.1126/science.1206731","science"),
(3,"Discrete element modeling of the faulting in the sedimentary cover above an active salt diaper","Yin, H., Zhang, J., Meng, L., Liu, Y. & Xu, S.","Journal of Structural Geology, 31(9), 989-995","2009","https://doi.org/10.1016/j.jsg.2008.10.007",None),
(2,"Simulation of active salt domes using 2D discrete element method (in Chinese)","Zhang, J., Yin, H., Meng, L. & Xu, S.","Chinese Journal of Geophysics, 23(6), 1924-1930","2008",None,None),
(1,"Influence of rock strength and strain rate on horizontally compressive deformation: insights from discrete element modeling (in Chinese)","Meng, L., Yin, H., Zhang, J. & Xu, S.","Acta Petrologica Sinica, 23(11), 2918-2926","2007",None,None),
]

# Group members (PI + students/postdocs/visitors) — bold these in author lists.
# Taken from the names the original site emphasized; each token maps uniquely to a
# group member (other initials, e.g. Xu, W. / Huang, Y. / Zhang, Y., are NOT group).
GROUP_TOKENS = [
    "Meng, L.", "Mohanna, S.", "Kawamoto, G.", "Ma, J.-Z.",
    "Xu, L.", "Huang, H.", "Bao, H.", "Feng, T.", "Zhang, A.",
    "Xie, Y.", "Zhou, T.", "An, C.", "Sheng, S.", "Lin, J.",
    "Jia, H.", "Liu, Z.", "Su, E.",
]

def authors_html(a):
    a = html.escape(a)
    # placeholder pass first so an inserted span is never re-matched
    for i, tok in enumerate(GROUP_TOKENS):
        a = a.replace(tok, f"\x00{i}\x00")
    for i, tok in enumerate(GROUP_TOKENS):
        a = a.replace(f"\x00{i}\x00", f'<span class="me">{tok}</span>')
    return a

BADGES = {
    "science": '<span class="badge badge-science">Science</span>',
    "nature": '<span class="badge badge-nature">Nature Geosci.</span>',
}

# publication numbers that have a hosted, shareable PDF:
#   author preprint/accepted versions + open-access (CC-BY / free-to-read) articles
PDF_NUMS = {4, 5, 6, 7, 9, 10, 11, 12, 13, 16, 17, 20, 21, 27, 29, 31, 33, 35, 38, 39,
            41, 48, 49, 51, 52, 59, 60, 61}
# Official journal DOIs filled in where the list lacked one (via Crossref, title+year matched).
DOI_FIX = {
    9:  "https://doi.org/10.5047/eps.2012.05.010",
    10: "https://doi.org/10.5047/eps.2012.05.011",
    11: "https://doi.org/10.1016/j.epsl.2014.01.036",
    14: "https://doi.org/10.1016/j.epsl.2014.11.041",
    16: "https://doi.org/10.1002/2015GL067034",
    17: "https://doi.org/10.1002/2016GL068786",
    19: "https://doi.org/10.1016/j.epsl.2016.09.055",
    20: "https://doi.org/10.1016/j.epsl.2017.01.018",
    21: "https://doi.org/10.1002/2016GL071304",
    24: "https://doi.org/10.1785/0120160393",
    26: "https://doi.org/10.1002/2017GL075137",
    28: "https://doi.org/10.1016/j.epsl.2018.02.042",
    30: "https://doi.org/10.1016/j.epsl.2018.04.057",
    32: "https://doi.org/10.1093/gji/ggy212",
    38: "https://doi.org/10.1029/2018GL081074",
    41: "https://doi.org/10.1029/2019GL085763",
    42: "https://doi.org/10.1029/2020JB019599",
    43: "https://doi.org/10.1029/2020GL087722",
    46: "https://doi.org/10.1029/2021JB022663",
    50: "https://doi.org/10.1029/2022GC010453",
    51: "https://doi.org/10.1029/2022GL099643",
    53: "https://doi.org/10.1029/2022JB025936",
    54: "https://doi.org/10.1029/2022JB025525",
    55: "https://doi.org/10.1038/s43247-023-01030-x",
    56: "https://doi.org/10.1029/2023EA003086",
    57: "https://doi.org/10.1126/science.adp0493",
    58: "https://doi.org/10.1029/2025GL115218",
    60: "https://doi.org/10.26443/seismica.v4i2.1629",
}

items = []
for num, title, authors, venue, year, doi, badge in PUBS:
    b = BADGES.get(badge, "")
    doi = doi or DOI_FIX.get(num)
    parts = []
    if doi:
        parts.append(f'<a href="{doi}" target="_blank" rel="noopener">DOI&nbsp;↗</a>')
    if num in PDF_NUMS:
        parts.append(f'<a href="pdf/{num}.pdf" target="_blank" rel="noopener">PDF&nbsp;↓</a>')
    else:
        parts.append('<span class="pdf-na" title="Author preprint not available — see the DOI link for the published version">PDF&nbsp;—</span>')
    link = '<div class="pub-links">' + ' &nbsp;·&nbsp; '.join(parts) + '</div>'
    items.append(f'''      <li class="pub">
        <span class="pub-num">{num}</span>
        <div>
          <div class="pub-title">{html.escape(title)}{(' ' + b) if b else ''}</div>
          <div class="pub-authors">{authors_html(authors)}</div>
          <div class="pub-venue">{html.escape(venue)} <span class="year">({year})</span></div>
          {link}
        </div>
      </li>''')

body = "\n".join(items)

HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Publications — Lingsen Meng</title>
<meta name="description" content="Complete list of publications by Lingsen Meng, UCLA seismology.">
<link rel="stylesheet" href="style.css">
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <a class="nav-brand" href="index.html">Lingsen Meng</a>
    <div class="nav-links">
      <a href="index.html">Home</a>
      <a href="research.html">Research</a>
      <a href="publications.html" class="active">Publications</a>
      <a href="group.html">Group</a>
      <a href="resource.html">Resource</a>
      <a href="index.html#contact">Contact</a>
    </div>
  </div>
</nav>

<main class="wrap">
  <section style="border-top:none;">
    <h2 style="font-size:30px;">Publications</h2>
    <p class="pub-controls">
      {len(PUBS)} peer-reviewed publications · 4,700+ citations · h-index 31 (Google Scholar). Names of group members in <span class="me">bold</span>. See also the
      <a href="https://scholar.google.com/citations?user=a25Ac-oAAAAJ" target="_blank" rel="noopener">Google Scholar profile</a>.
      <br><strong>DOI&nbsp;↗</strong> links to the published article; <strong>PDF&nbsp;↓</strong> is a free author preprint/accepted manuscript. <span class="pdf-na">PDF&nbsp;—</span> means no shareable preprint is posted — use the DOI (open-access articles are free there).
    </p>
    <ul class="pub-list">
{body}
    </ul>
  </section>
</main>

<footer>
  <div class="wrap">© <span id="yr"></span> Lingsen Meng · Department of Earth, Planetary and Space Sciences, UCLA</div>
</footer>
<script>document.getElementById('yr').textContent = new Date().getFullYear();</script>
</body>
</html>
'''

with open("publications.html", "w") as f:
    f.write(HTML)
print(f"Wrote publications.html with {len(PUBS)} entries")
