#!/usr/bin/env python3
"""Paste assets/figures/svg/NAME.svg into every page between <!-- svg:NAME --> and <!-- /svg:NAME -->.

    python3 tools/inline_svg.py
"""
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "assets", "figures", "svg")

for page in glob.glob(os.path.join(ROOT, "*.html")):
    html = open(page, encoding="utf-8").read()
    new = html
    for name in set(re.findall(r"<!-- svg:([\w-]+) -->", html)):
        path = os.path.join(SVG, name + ".svg")
        if not os.path.exists(path):
            print(f"missing {name}.svg for {os.path.basename(page)}")
            continue
        svg = open(path, encoding="utf-8").read().strip()
        new = re.sub(rf"<!-- svg:{name} -->.*?<!-- /svg:{name} -->", lambda m: f"<!-- svg:{name} -->{svg}<!-- /svg:{name} -->", new, flags=re.S)
    if new != html:
        open(page, "w", encoding="utf-8").write(new)
        print("inlined into", os.path.basename(page))
