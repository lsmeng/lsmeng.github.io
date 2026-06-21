#!/usr/bin/env python3
"""Second pass for still-uncovered papers: try OpenAlex (any OA pdf) and an
arXiv title search (preprints are freely hostable)."""
import re, json, time, html as H, urllib.request, urllib.parse, difflib

EMAIL = "meng.caltech@gmail.com"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) homepage-pass2"
src = open("publications.html", encoding="utf-8").read()
rows = re.findall(r'<span class="pub-num">(\d+)</span>\s*<div>\s*<div class="pub-title">(.*?)</div>.*?<div class="pub-links">(.*?)</div>', src, re.S)

def clean(s): return H.unescape(re.sub(r'<[^>]+>', '', s)).strip()
def norm(s): return re.sub(r'[^a-z0-9 ]', ' ', s.lower())

HOST_OK = ("arxiv.org", "eartharxiv", "essoar", "ssrn", "hal.science", "escholarship",
           "osf.io", "31223", "authorea", "authors.library.caltech", ".edu/")

def get(url, timeout=45):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout)

placeholders = []
for num, title, links in rows:
    num = int(num)
    if ('pdf/' in links and '.pdf"' in links) or 'Free&nbsp;PDF' in links:
        continue
    m = re.search(r'href="(https?://doi\.org/[^"]+)"', links)
    doi = m.group(1).split("doi.org/")[1] if m else None
    placeholders.append((num, clean(re.sub(r'<span class="badge.*?</span>', '', title)), doi))

print(f"{len(placeholders)} placeholders to chase\n")
hosted, freelinks = [], {}

def try_host_or_link(num, url):
    if any(h in url for h in HOST_OK):
        try:
            raw = get(url).read()
            if raw[:5].startswith(b"%PDF"):
                open(f"pdf/{num}.pdf", "wb").write(raw); hosted.append(num)
                print(f"#{num:>2} HOST ✓ {url[:62]}"); return True
        except Exception:
            pass
    freelinks[num] = url
    print(f"#{num:>2} link   {url[:66]}"); return True

for num, title, doi in placeholders:
    found = False
    # 1) OpenAlex by DOI
    if doi:
        try:
            d = json.load(get(f"https://api.openalex.org/works/doi:{urllib.parse.quote(doi)}?mailto={EMAIL}"))
            for loc in ([d.get("best_oa_location")] + (d.get("locations") or [])):
                if loc and loc.get("pdf_url"):
                    found = try_host_or_link(num, loc["pdf_url"]); break
        except Exception:
            pass
    if found: time.sleep(0.5); continue
    # 2) arXiv title search
    try:
        q = urllib.parse.urlencode({"search_query": f'ti:"{title[:120]}"', "max_results": 3})
        xml = get("http://export.arxiv.org/api/query?" + q).read().decode("utf-8", "replace")
        for m in re.finditer(r'<entry>(.*?)</entry>', xml, re.S):
            e = m.group(1)
            t = re.search(r'<title>(.*?)</title>', e, re.S)
            pid = re.search(r'<id>(http[^<]*abs/[^<]+)</id>', e)
            if t and pid:
                sc = difflib.SequenceMatcher(None, norm(title), norm(clean(t.group(1)))).ratio()
                if sc >= 0.85:
                    pdf = pid.group(1).replace("/abs/", "/pdf/")
                    found = try_host_or_link(num, pdf); break
    except Exception as e:
        pass
    if not found:
        print(f"#{num:>2} still none")
    time.sleep(0.6)

print("\n=== newly hosted:", sorted(hosted), "===")
print("=== FREE_PDF additions ===")
for n in sorted(freelinks):
    print(f'    {n}: "{freelinks[n]}",')
