#!/usr/bin/env python3
"""For publications without a hosted PDF, ask Semantic Scholar for a free
open-access copy. Preprint/repository copies are downloaded & hosted; other
free links are recorded as external 'Free PDF' links."""
import re, json, time, urllib.request, urllib.parse

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) homepage-freepdf"
html = open("publications.html", encoding="utf-8").read()
entries = re.findall(r'<span class="pub-num">(\d+)</span>.*?<div class="pub-links">(.*?)</div>', html, re.S)

# repository/preprint hosts whose PDFs are safe to download & self-host
HOST_OK = ("arxiv.org", "eartharxiv", "essoar", "ssrn.com", "hal.science",
           "hal.archives", "escholarship.org", "biorxiv", "osf.io", ".edu/",
           "researchgate.net", "31223", "authorea")

todo = []
for num, links in entries:
    num = int(num)
    if f'pdf/{num}.pdf' in links:
        continue
    m = re.search(r'href="(https?://doi\.org/[^"]+)"', links)
    if m:
        todo.append((num, m.group(1).split("doi.org/")[1]))

def get(url, timeout=45):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout)

hosted, freelinks = [], {}
for num, doi in todo:
    api = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{urllib.parse.quote(doi)}?fields=isOpenAccess,openAccessPdf,title"
    try:
        d = json.load(get(api))
    except Exception as e:
        print(f"#{num:>2} s2-error ({e})"); time.sleep(1.2); continue
    oa = d.get("openAccessPdf") or {}
    url = oa.get("url")
    if not url:
        print(f"#{num:>2} no free pdf"); time.sleep(1.1); continue
    host = any(h in url for h in HOST_OK)
    saved = False
    if host:
        try:
            raw = get(url).read()
            if raw[:5].startswith(b"%PDF"):
                open(f"pdf/{num}.pdf", "wb").write(raw)
                hosted.append(num); saved = True
                print(f"#{num:>2} HOST ✓ {url[:60]} ({len(raw)//1024} KB)")
        except Exception:
            pass
    if not saved:
        freelinks[num] = url
        print(f"#{num:>2} link   {url[:70]}")
    time.sleep(1.1)

print("\n=== hosted (add to PDF_NUMS):", sorted(hosted), "===")
print("=== FREE_PDF links ===")
for n in sorted(freelinks):
    print(f'    {n}: "{freelinks[n]}",')
