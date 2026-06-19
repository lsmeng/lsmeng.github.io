#!/usr/bin/env python3
"""Classify each PDF in meng_publication/ as a shareable author version
(preprint/accepted/manuscript), an open-access publisher version, or a
copyrighted publisher final version. Heuristic, conservative."""
import os, re, subprocess

D = "meng_publication"
SUPP = re.compile(r"supp|supplement|supporting|_sm\b|sm\.pdf|tables_supple", re.I)
AUTHOR_FN = re.compile(r"preprint|accepted|submitted|_subm|subm_| subm|revised|revision|maintext|_acc\b|acc\.pdf|sub_?gji|submitted", re.I)

# first-page text markers
ACCEPTED_TXT = re.compile(
    r"accepted for publication and undergone full peer review|Accepted Article|"
    r"has not been through the copyediting", re.I)
MANUSCRIPT_TXT = re.compile(
    r"confidential manuscript submitted|manuscript submitted to|non-?peer reviewed|"
    r"EarthArXiv|this is a preprint|submitted to .{0,40}(Journal|Letters|Science)", re.I)
OA_TXT = re.compile(
    r"creative commons|open access article|distributed under the terms|CC[- ]BY|"
    r"Seismica|Earth,? Planets and Space|Communications Earth", re.I)

def first_text(path, pages=2):
    try:
        out = subprocess.run(["pdftotext", "-f", "1", "-l", str(pages), path, "-"],
                             capture_output=True, text=True, timeout=30)
        return out.stdout
    except Exception:
        return ""

rows = []
for fn in sorted(os.listdir(D)):
    if not fn.lower().endswith(".pdf"):
        continue
    if SUPP.search(fn):
        rows.append((fn, "SUPPLEMENT", ""))
        continue
    txt = first_text(os.path.join(D, fn))
    markers = []
    if AUTHOR_FN.search(fn): markers.append("fn-author")
    if ACCEPTED_TXT.search(txt): markers.append("accepted-txt")
    if MANUSCRIPT_TXT.search(txt): markers.append("manuscript-txt")
    if OA_TXT.search(txt): markers.append("oa-txt")

    if "accepted-txt" in markers or "manuscript-txt" in markers or "fn-author" in markers:
        cls = "AUTHOR"            # shareable author version
    elif "oa-txt" in markers:
        cls = "OA"               # open-access publisher version
    else:
        cls = "FINAL"            # copyrighted publisher typeset -> do not host
    rows.append((fn, cls, ",".join(markers)))

for fn, cls, m in rows:
    print(f"{cls:11} {fn}   [{m}]")
print("\n=== summary ===")
from collections import Counter
print(Counter(r[1] for r in rows))
