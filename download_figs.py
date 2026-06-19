#!/usr/bin/env python3
"""Download the author's own figures from the old Google Sites research pages.
Run: python3 download_figs.py   (one-off; output goes to assets/figures/)"""
import os, re, urllib.request, shutil

BASE = "https://sites.google.com/site/lingsenmenghome/research/"
SLUGS = [
    "research-summary", "seismic-array-back-projection",
    "high-resolution-music-imaging", "reference-window-strategy",
    "slowness-calibration", "3d-back-projection", "physical-insights",
    "earthquake-early-warning", "tsunami-prediction-and-early-warning",
    "tsunami-time-reversal-imaging", "pre-post-and-independent-slow-slip",
]
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
RX = re.compile(r"https://lh3\.googleusercontent\.com/sitesv/[A-Za-z0-9._=-]+")
SIG = {b"\x89PNG": "png", b"\xff\xd8\xff": "jpg", b"GIF8": "gif", b"RIFF": "webp"}

os.makedirs("assets/figures", exist_ok=True)

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

total = 0
for slug in SLUGS:
    try:
        html = fetch(BASE + slug).decode("utf-8", "replace")
    except Exception as e:
        print(f"! {slug}: page fetch failed ({e})"); continue
    seen, urls = set(), []
    for u in RX.findall(html):
        if "=w16383" in u:   # full-width banner, skip
            continue
        if u not in seen:
            seen.add(u); urls.append(u)
    for i, u in enumerate(urls, 1):
        try:
            data = fetch(u)
        except Exception as e:
            print(f"! {slug}-{i}: download failed ({e})"); continue
        ext = next((v for k, v in SIG.items() if data.startswith(k)), None)
        if not ext:
            print(f"! {slug}-{i}: not an image (skipped)"); continue
        path = f"assets/figures/{slug}-{i}.{ext}"
        with open(path, "wb") as f:
            f.write(data)
        print(f"  {path}  ({len(data)//1024} KB)")
        total += 1

print(f"=== downloaded {total} figures ===")
