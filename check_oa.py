#!/usr/bin/env python3
"""For publications with no hosted PDF, use Unpaywall to find OA copies and
download a real PDF (trying every OA location, publisher + repositories)."""
import re, json, os, time, urllib.request, urllib.parse

EMAIL = "meng.caltech@gmail.com"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
html = open("publications.html", encoding="utf-8").read()
entries = re.findall(r'<span class="pub-num">(\d+)</span>.*?<div class="pub-links">(.*?)</div>', html, re.S)
todo = []
for num, links in entries:
    num = int(num)
    if f'pdf/{num}.pdf' in links:
        continue
    m = re.search(r'href="(https?://doi\.org/[^"]+)"', links)
    if m:
        todo.append((num, m.group(1).split("doi.org/")[1]))

def fetch(url, timeout=45, referer=None):
    h = {"User-Agent": UA, "Accept": "application/pdf,*/*"}
    if referer: h["Referer"] = referer
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout).read()

def candidates(loc):
    """yield possible direct-PDF urls for an OA location"""
    for key in ("url_for_pdf", "url"):
        u = loc.get(key)
        if not u: continue
        yield u
        if "hal.science" in u or "hal.archives" in u:
            yield u.rstrip("/") + "/document"
        if "escholarship.org/uc/item/" in u:
            qt = u.rstrip("/").split("/")[-1]
            yield f"https://escholarship.org/content/qt{qt}/qt{qt}.pdf"

new_pdfs = []
for num, doi in todo:
    try:
        data = json.load(urllib.request.urlopen(
            urllib.request.Request(
                f"https://api.unpaywall.org/v2/{urllib.parse.quote(doi)}?email={EMAIL}",
                headers={"User-Agent": UA}), timeout=40))
    except Exception as e:
        print(f"#{num:>2} api-error {doi} ({e})"); continue
    if not data.get("is_oa"):
        print(f"#{num:>2} closed  {doi}"); continue
    locs = data.get("oa_locations") or []
    best = data.get("best_oa_location") or {}
    info = f'host={best.get("host_type","?")} lic={best.get("license","?")} ver={best.get("version","?")}'
    saved = False
    for loc in ([best] + locs):
        for url in candidates(loc):
            try:
                raw = fetch(url, referer="https://doi.org/" + doi)
            except Exception:
                continue
            if raw[:5].startswith(b"%PDF"):
                with open(f"pdf/{num}.pdf", "wb") as f: f.write(raw)
                new_pdfs.append(num); saved = True
                print(f"#{num:>2} OA ✓ {doi}  {info}  ({len(raw)//1024} KB)  <- {url[:55]}")
                break
        if saved: break
    if not saved:
        print(f"#{num:>2} OA-but-no-dl {doi}  {info}")
    time.sleep(0.3)

print("\n=== newly hosted OA PDFs:", sorted(set(new_pdfs)), "===")
