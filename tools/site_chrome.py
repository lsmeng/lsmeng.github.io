#!/usr/bin/env python3
"""Shared page chrome (head includes, navigation, footer) for every HTML page.

The site is hand-written HTML with no build step. To keep the navigation
identical on all pages, the nav/footer live here and are stamped into each
page between marker comments:

    python3 tools/site_chrome.py          # rewrite chrome in all *.html pages

gen_pubs.py imports NAV/HEAD/FOOT from this file, so publications.html gets the
same chrome when it is regenerated. Edit the menu only here.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (key, href, label)
MENU = [
    ("home", "index.html", "Home"),
    ("research", "research.html", "Research"),
    ("publications", "publications.html", "Publications"),
    ("ai-for-math", "ai-for-math.html", "AI for Math"),
    ("blog", "blog.html", "Blog"),
    ("group", "group.html", "Group"),
    ("resource", "resource.html", "Resources"),
    ("contact", "index.html#contact", "Contact"),
]

RESEARCH_PAGES = {
    "research.html", "rupture.html", "back-projection.html", "finite-fault.html",
    "tsunami.html", "swarms.html", "ai-geoscience.html", "data.html",
}

# Theme is resolved before first paint to avoid a flash of the wrong theme.
# Light theme only (white background); fonts: Instrument Sans + Inter (Fontsource via jsDelivr).
HEAD = """<!-- site:head -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/instrument-sans@5/index.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5/index.css">
<link rel="stylesheet" href="style.css">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta name="color-scheme" content="light">
<!-- /site:head -->"""


def icon(name, cls="ico"):
    return f'<svg class="{cls}" aria-hidden="true"><use href="assets/icons.svg#{name}"></use></svg>'


def nav(active):
    links = []
    for key, href, label in MENU:
        cur = ' aria-current="page"' if key == active else ""
        links.append(f'      <a href="{href}"{cur}>{label}</a>')
    links = "\n".join(links)
    return f"""<!-- site:nav -->
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="nav-inner">
    <a class="brand" href="index.html">{icon("i-mark", "brand-mark")}<span>Lingsen Meng</span></a>
    <nav class="nav-links" id="site-nav" aria-label="Main">
{links}
    </nav>
    <div class="nav-tools">
      <button class="icon-btn nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">{icon("i-menu", "ico ico-menu")}{icon("i-close", "ico ico-close")}</button>
    </div>
  </div>
</header>
<!-- /site:nav -->"""


FOOT = """<!-- site:foot -->
<footer class="site-footer">
  <div class="wrap foot-grid">
    <div>
      <p class="foot-name">Lingsen Meng</p>
      <p>Department of Earth, Planetary and Space Sciences<br>University of California, Los Angeles</p>
    </div>
    <div class="foot-links">
      <a href="research.html">Research</a>
      <a href="publications.html">Publications</a>
      <a href="data.html">Data &amp; figures</a>
      <a href="https://scholar.google.com/citations?user=a25Ac-oAAAAJ" target="_blank" rel="noopener">Google Scholar</a>
      <a href="https://github.com/lsmeng" target="_blank" rel="noopener">GitHub</a>
    </div>
    <p class="foot-copy">&copy; <span id="yr">2026</span> Lingsen Meng</p>
  </div>
</footer>
<script src="assets/js/site.js" defer></script>
<!-- /site:foot -->"""


def active_key(fname):
    if fname in RESEARCH_PAGES:
        return "research"
    if fname.startswith("blog"):
        return "blog"
    for key, href, _ in MENU:
        if href == fname:
            return key
    return None


def replace_block(html, tag, new, legacy_pattern):
    pat = re.compile(rf"<!-- site:{tag} -->.*?<!-- /site:{tag} -->", re.S)
    if pat.search(html):
        return pat.sub(lambda m: new, html, count=1)
    m = re.search(legacy_pattern, html, re.S)
    if not m:
        raise ValueError(f"no {tag} block found")
    return html[: m.start()] + new + html[m.end():]


def apply(path):
    fname = os.path.basename(path)
    html = open(path, encoding="utf-8").read()
    if 'http-equiv="refresh"' in html:  # redirect stubs are left alone
        return False
    old = html
    html = replace_block(html, "head", HEAD, r'<link rel="stylesheet" href="style.css">')
    html = replace_block(html, "nav", nav(active_key(fname)), r'<nav class="nav">.*?</nav>')
    html = replace_block(
        html, "foot", FOOT,
        r"<footer>.*?</footer>\s*<script>document\.getElementById\('yr'\)\.textContent = new Date\(\)\.getFullYear\(\);</script>",
    )
    # legacy page-title markup -> semantic page head
    html = html.replace('<main class="wrap">', '<main class="wrap" id="main">')
    html = html.replace('<section style="border-top:none;">', '<section class="page-head">')
    html = re.sub(r'<h2 style="font-size:30px;">(.*?)</h2>', r'<h1 class="page-title">\1</h1>', html, count=1, flags=re.S)
    html = re.sub(r'<h2 style="font-size:30px;">(.*?)</h2>', r'<h2 class="section-title">\1</h2>', html, flags=re.S)
    if html != old:
        open(path, "w", encoding="utf-8").write(html)
        return True
    return False


if __name__ == "__main__":
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, "*.html")))
    for f in files:
        try:
            changed = apply(f)
            print(("updated  " if changed else "same     ") + os.path.basename(f))
        except ValueError as e:
            print(f"SKIPPED  {os.path.basename(f)}: {e}")
