#!/usr/bin/env python3
"""Static figures redrawn with matplotlib from data (no AI imagery).

    python3 tools/make_figures.py

Writes theme-aware SVG snippets to assets/figures/svg/*.svg. Colours are drawn with a few
sentinel hex values that are then replaced by CSS variables, so the SVGs follow the site's
light/dark theme when inlined into a page (tools/inline_svg.py pastes them between
<!-- svg:NAME --> markers).
"""
import json
import os
import re

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "figures", "svg")
os.makedirs(OUT, exist_ok=True)

# sentinel colours -> CSS variables
INK, MUTED, LINE, ACCENT, LINK, SOFT = "#010101", "#020202", "#030303", "#040404", "#050505", "#060606"
VARS = {INK: "var(--ink)", MUTED: "var(--muted)", LINE: "var(--line-2)", ACCENT: "var(--accent)", LINK: "var(--link)", SOFT: "var(--viz-muted)"}

plt.rcParams.update({
    "font.family": "sans-serif", "font.sans-serif": ["Inter", "Helvetica Neue", "Arial", "DejaVu Sans"],
    "font.size": 10, "axes.edgecolor": LINE, "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED,
    "text.color": INK, "axes.linewidth": 0.8, "xtick.major.width": 0.8, "ytick.major.width": 0.8,
    "svg.fonttype": "none", "axes.spines.top": False, "axes.spines.right": False,
})


def save(fig, name, title):
    path = os.path.join(OUT, name + ".svg")
    fig.savefig(path, format="svg", transparent=True, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)
    s = open(path).read()
    s = re.sub(r"<\?xml.*?\?>\s*", "", s)
    s = re.sub(r"<!DOCTYPE.*?>\s*", "", s, flags=re.S)
    s = re.sub(r"<metadata>.*?</metadata>\s*", "", s, flags=re.S)
    for k, v in VARS.items():
        s = s.replace(k, v).replace(k.upper(), v)
    s = re.sub(r'font-family="[^"]*"', "", s)
    s = re.sub(r"font-family:[^;\"]*;?", "", s)
    s = s.replace("<svg ", f'<svg role="img" aria-label="{title}" class="mpl" ', 1)
    s = re.sub(r'\s(width|height)="[\d.]+pt"', "", s, count=2)
    open(path, "w").write(s)
    print("wrote", os.path.relpath(path, ROOT), f"{len(s)/1024:.1f} kB")


# ------------------------------------------------------------------ 1. supershear rupture speeds
def rupture_speeds():
    d = json.load(open(os.path.join(ROOT, "assets", "data", "supershear_globe.json")))
    rows = []
    for e in d["events"]:
        v = e.get("vr_km_s")
        if not v:
            continue
        lo, hi = (float(x) for x in (v.split("–") if "–" in str(v) else (v, v)))
        rows.append((e["date"][:4], e["name"] if not e.get("name_derived") else e["region"], lo, hi, e["class"], e["in_survey"]))
    rows.sort(key=lambda r: (r[4] != "supershear", -((r[2] + r[3]) / 2)))
    fig, ax = plt.subplots(figsize=(6.6, 0.32 * len(rows) + 0.9))
    for i, (yr, name, lo, hi, cls, surv) in enumerate(rows):
        y = len(rows) - 1 - i
        col = ACCENT if cls == "supershear" else SOFT
        if hi - lo < 0.05:
            ax.plot([lo], [y], "o", color=col, ms=5.5, zorder=3)
        else:
            ax.plot([lo, hi], [y, y], "-", color=col, lw=5, solid_capstyle="round", zorder=3)
        label = re.sub(r"^\d{4}\s+M[w ]*\s*[\d.]+\s*", "", name)
        label = re.sub(r"^Mw?\s*[\d.]+\s*", "", label)
        ax.text(1.72, y, f"{label} ({yr})", va="center", ha="left", fontsize=9, color=INK)
        tag = {"supershear": "", "possible": "possible", "subshear": "subshear", "debated": "disputed"}[cls]
        if tag:
            ax.text(hi + 0.08, y, tag, va="center", fontsize=8, color=MUTED)
    ax.set_xlim(1.7, 7.0)
    ax.set_ylim(-0.7, len(rows) - 0.3)
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    ax.set_xlabel("Rupture speed (km/s)")
    ax.set_xticks([2, 3, 4, 5, 6, 7])
    ax.grid(axis="x", color=LINE, lw=0.6, alpha=0.6)
    ax.set_axisbelow(True)
    # names sit in the left margin: move the axis so labels do not overlap bars
    ax.set_xlim(-2.4, 7.0)
    ax.set_xticks([2, 3, 4, 5, 6, 7])
    ax.spines["bottom"].set_bounds(1.9, 7.0)
    for t in ax.texts:
        if t.get_position()[0] == 1.72:
            t.set_x(-2.35)
    save(fig, "rupture-speeds", "Rupture speed ranges of supershear and comparison events")


# ------------------------------------------------------------------ 2. beamforming vs MUSIC (synthetic test)
def music_vs_beam():
    """Two coherent-in-frequency but independent plane waves recorded by a 2-D array; compare the
    conventional (Bartlett) beam and the MUSIC pseudo-spectrum as a function of back-azimuth.
    Synthetic test of the principle, in the spirit of Meng et al. (2011, GRL)."""
    rng = np.random.default_rng(3)
    nst = 25
    ap = 140.0  # km aperture
    xy = rng.uniform(-ap / 2, ap / 2, size=(nst, 2))
    f = 1.0            # Hz
    s = 0.08           # s/km horizontal slowness (teleseismic P)
    baz_src = np.deg2rad([40.0, 43.0])
    nsnap = 60
    X = np.zeros((nst, nsnap), complex)
    for b in baz_src:
        k = 2 * np.pi * f * s * np.array([np.sin(b), np.cos(b)])
        a = np.exp(-1j * xy @ k)
        X += np.outer(a, rng.normal(size=nsnap) + 1j * rng.normal(size=nsnap))
    X += 0.3 * (rng.normal(size=X.shape) + 1j * rng.normal(size=X.shape))
    R = X @ X.conj().T / nsnap
    w, V = np.linalg.eigh(R)
    En = V[:, :-2]  # noise subspace (two sources)
    th = np.deg2rad(np.linspace(20, 64, 881))
    beam, music = [], []
    for b in th:
        k = 2 * np.pi * f * s * np.array([np.sin(b), np.cos(b)])
        a = np.exp(-1j * xy @ k) / np.sqrt(nst)
        beam.append(np.real(a.conj() @ R @ a))
        music.append(1 / np.real(a.conj() @ En @ En.conj().T @ a))
    beam = np.array(beam) / max(beam)
    music = np.array(music) / max(music)
    fig, ax = plt.subplots(figsize=(6.4, 2.5))
    deg = np.rad2deg(th)
    ax.plot(deg, 10 * np.log10(beam), color=SOFT, lw=1.6, label="Beamforming")
    ax.plot(deg, 10 * np.log10(music), color=ACCENT, lw=1.8, label="MUSIC")
    for b in np.rad2deg(baz_src):
        ax.axvline(b, color=INK, lw=0.8, ls=(0, (2, 2)))
    ax.set_ylim(-25, 1.5)
    ax.set_xlim(26, 58)
    ax.set_xlabel("Back-azimuth (°)")
    ax.set_ylabel("Normalised power (dB)")
    ax.legend(frameon=False, loc="lower left", fontsize=9)
    ax.text(41.5, 2.2, "true sources, 3° apart", ha="center", fontsize=8.5, color=MUTED)
    save(fig, "music-vs-beam", "Synthetic test: MUSIC resolves two sources 3 degrees apart that beamforming merges")


if __name__ == "__main__":
    rupture_speeds()
    music_vs_beam()
