#!/usr/bin/env python3
"""Prepare research figures extracted from the author's own papers."""
from PIL import Image
import os

os.makedirs("assets/figures", exist_ok=True)

def downscale(src, dst, max_w):
    im = Image.open(src).convert("RGB")
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im.save(dst, quality=90)
    print(f"{dst}: {im.width}x{im.height}")

def crop_frac(src, dst, l, t, r, b, max_w=None):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    im = im.crop((int(W*l), int(H*t), int(W*r), int(H*b)))
    if max_w and im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    im.save(dst, quality=90)
    print(f"{dst}: {im.width}x{im.height}")

# 1) Mandalay supershear back-projection (clean embedded figure) -> rupture dynamics
downscale("/tmp/cand_mandalay-000.png", "assets/figures/rupture-mandalay.jpg", 1300)

# 2) Tengchong volcanic-field swarm location map (clean embedded figure) -> swarms
downscale("/tmp/teng_map-000.png", "assets/figures/swarms-tengchong.jpg", 760)

# 3) Illapel slow-unlocking Figure 3 (crop the figure off the top of page 18) -> slow slip
crop_frac("/tmp/ill18-18.png", "assets/figures/slowslip-illapel.jpg", 0.085, 0.035, 0.94, 0.405, 1100)
