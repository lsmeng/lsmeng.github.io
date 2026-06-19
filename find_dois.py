#!/usr/bin/env python3
"""Look up the official DOI + publication date for each paper via Crossref,
matching strictly by title similarity + year. Prints results for review."""
import re, json, time, html as H, urllib.request, urllib.parse, difflib

EMAIL = "meng.caltech@gmail.com"
UA = "homepage-doi-finder (mailto:%s)" % EMAIL
src = open("publications.html", encoding="utf-8").read()

rows = re.findall(
    r'<span class="pub-num">(\d+)</span>.*?<div class="pub-title">(.*?)</div>\s*'
    r'<div class="pub-authors">(.*?)</div>\s*<div class="pub-venue">(.*?)</div>\s*'
    r'<div class="pub-links">(.*?)</div>', src, re.S)

def clean(s):
    s = re.sub(r'<[^>]+>', '', s)
    return H.unescape(s).strip()

def norm(s):
    return re.sub(r'[^a-z0-9 ]', '', s.lower())

found = {}      # num -> doi  (only for those currently missing)
dates = {}      # num -> "YYYY-MM"
for num, title, authors, venue, links, in [(r[0], r[1], r[2], r[3], r[4]) for r in rows]:
    num = int(num)
    title = clean(re.sub(r'<span class="badge.*?</span>', '', title))
    has_doi = 'doi.org' in links
    yr = re.search(r'\((\d{4})\)', venue)
    yr = yr.group(1) if yr else ""
    q = urllib.parse.urlencode({"query.bibliographic": title, "rows": 5, "mailto": EMAIL})
    try:
        data = json.load(urllib.request.urlopen(
            urllib.request.Request("https://api.crossref.org/works?" + q,
                                   headers={"User-Agent": UA}), timeout=40))
    except Exception as e:
        print(f"#{num:>2} crossref-error ({e})"); continue
    best, bscore = None, 0.0
    for it in data.get("message", {}).get("items", []):
        ct = (it.get("title") or [""])[0]
        sc = difflib.SequenceMatcher(None, norm(title), norm(ct)).ratio()
        if sc > bscore:
            best, bscore = it, sc
    if not best:
        print(f"#{num:>2} no-hit"); continue
    doi = best.get("DOI", "")
    dp = (best.get("issued", {}).get("date-parts") or [[None]])[0]
    y = dp[0] if dp else None
    m = dp[1] if len(dp) > 1 else None
    if m: dates[num] = f"{y}-{m:02d}"
    flag = "MISS" if not has_doi else "ok"
    yrok = "" if (not yr or str(y) == yr) else f" !!year {y}!={yr}"
    print(f"#{num:>2} {flag} score={bscore:.2f} {doi}  [{y}-{m}]{yrok}")
    if not has_doi and bscore >= 0.80:
        found[num] = "https://doi.org/" + doi
    time.sleep(0.25)

print("\n=== DOI_FIX additions (missing, high-confidence) ===")
for n in sorted(found):
    print(f"    {n}: \"{found[n]}\",")
print("\n=== dates (YYYY-MM) for news-relevant ===")
for n in (65, 62, 57, 55):
    print(f"  #{n}: {dates.get(n,'?')}")
