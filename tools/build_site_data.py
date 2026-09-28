#!/usr/bin/env python3
"""Convert the curated research data (prepared separately, with provenance notes) into the
small JSON/CSV/PNG files the interactive figures read.

    python3 tools/build_site_data.py [SOURCE_DIR]

SOURCE_DIR defaults to ~/Documents/claude/projects/website-redesign/data. Output goes to
assets/data/. Only datasets marked as published (or explicitly released) are exported; the
unpublished Venezuela/Flores models are skipped on purpose.
"""
import csv
import json
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Documents/claude/projects/website-redesign/data")
OUT = os.path.join(ROOT, "assets", "data")

# Published (Zenodo) datasets plus the submitted Venezuela 2026 study, which is labelled "in review".
# Not exported on purpose: Mendocino (column meaning unconfirmed), Palu (tutorial points), Gorkha (rerun),
# Flores (preliminary), Kamchatka FFI (paper not identified).
BP_EVENTS = ["mandalay_2025", "noto_2024", "maduo_2021", "turkey_m78_2023", "turkey_m75_2023", "venezuela_2026"]
FFI_EVENTS = ["mandalay_2025", "noto_2024", "maduo_2021", "turkey_m78_2023", "venezuela_2026"]
TIME_WINDOW = {"venezuela_2026": [0, 60]}


def status(d):
    return "published" if d.get("published") else "in review (submitted manuscript, not yet peer reviewed)"


def rd(p):
    with open(os.path.join(SRC, p)) as f:
        return json.load(f)


def wr(p, obj):
    path = os.path.join(OUT, p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print(f"wrote {p} ({os.path.getsize(path)/1024:.1f} kB)")


def wcsv(p, header, rows):
    path = os.path.join(OUT, p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"wrote {p} ({os.path.getsize(path)/1024:.1f} kB)")


def cite(c):
    if isinstance(c, dict):
        return c.get("text"), c.get("doi")
    if isinstance(c, list) and c:
        return c[0].get("text"), c[0].get("doi")
    return c, None


def short_paper(text):
    # "Xu, L., Meng, L., ... (2025). Title. Journal ..." -> "Xu et al. (2025)"
    if not text:
        return ""
    first = text.split(",")[0]
    yr = text.split("(")[1].split(")")[0] if "(" in text else ""
    return f"{first} et al. ({yr})"


# ------------------------------------------------------------------ globe
def globe():
    d = rd("supershear_globe.json")
    cls = {"yes": "supershear", "debated": "debated", "uncertain": "possible", "no": "subshear"}
    ev = []
    survey = d["events"]
    for e in survey + [x for x in d["other_group_events"] if not x.get("in_bao2022")]:
        vr = e.get("vr_kms")
        if isinstance(vr, list):
            vr = f"{vr[0]}–{vr[1]}" if len(vr) == 2 else str(vr[0])
        t, doi = cite(e.get("citations"))
        ev.append({
            "name": e["name"], "date": e["date"], "lat": e["lat"], "lon": e["lon"], "mw": e["mag"],
            "class": cls.get(e["supershear"], "unresolved"), "in_survey": bool(e.get("in_bao2022")),
            "setting": e.get("setting"), "vr_km_s": vr, "vr_note": e.get("vr_note"),
            "name_derived": e.get("name_source") != "paper", "region": e.get("region_fe"),
            "paper": "Bao et al. (2022), Nat. Geosci." if e.get("in_bao2022") else short_paper(t), "doi": doi,
        })
    meta = {
        "title": "Large shallow strike-slip earthquakes and their rupture-speed class",
        "citation": "Bao, H., Xu, L., Meng, L., Ampuero, J.-P., Gao, L. & Zhang, H. (2022). Global frequency of oceanic and continental supershear earthquakes. Nature Geoscience, 15, 942-949 (Table S2-S5), plus events from later group papers.",
        "doi": "10.1038/s41561-022-01055-5",
        "notes": d["description"] + " Classes: supershear = supershear in the survey tables or the cited paper; debated = supershear reported but disputed; possible = supershear possible but not resolved (2004 Queen Charlotte; Maduo 2021 and Elbistan 2023 from later papers); subshear = no supershear found. Event names marked as Flinn-Engdahl regions are derived, not from the paper.",
        "statistics": d.get("statistics_bao2022"),
        "stub": False,
    }
    wr("supershear_globe.json", {"meta": meta, "events": ev})
    wcsv("supershear_globe.csv", ["name", "date", "lat", "lon", "mw", "class", "in_bao2022_survey", "setting", "vr_km_s", "paper", "doi"],
         [[e["name"], e["date"], e["lat"], e["lon"], e["mw"], e["class"], e["in_survey"], e["setting"], e["vr_km_s"], e["paper"], e["doi"]] for e in ev])


# ------------------------------------------------------------------ BP
def bp():
    index = []
    rows = []
    for k in BP_EVENTS:
        d = rd(f"bp/{k}.json")
        t, doi = cite(d.get("citation"))
        if not d.get("published"):
            t, doi = "Meng group (2026), submitted manuscript; not yet peer reviewed.", None
        arrays = {}
        for a, v in d["arrays"].items():
            arrays[a] = [{"t": v["t"][i], "lat": v["lat"][i], "lon": v["lon"][i], "power": v["power"][i]} for i in range(v["n"])]
            rows += [[k, a, v["t"][i], v["lat"][i], v["lon"][i], v["power"][i]] for i in range(v["n"])]
        tw = d.get("figure_time_window") or TIME_WINDOW.get(k)
        out = {
            "meta": {"event": d["name"], "date": d["date"], "mw": d["mw"], "method": d.get("method"),
                     "citation": t, "doi": doi, "data_doi": d.get("data_doi"),
                     "notes": " ".join(x for x in [d.get("t_definition"), d.get("power_definition"), d.get("caveat")] if x),
                     "status": status(d), "stub": False},
            "hypocenter": {"lat": d["epicenter"]["lat"], "lon": d["epicenter"]["lon"]},
            "time_window": tw,
            "arrays": arrays,
        }
        wr(f"bp/{k}.json", out)
        index.append({"key": k, "name": d["name"], "file": f"assets/data/bp/{k}.json", "status": status(d)})
    wcsv("bp/bp_radiators.csv", ["event", "array", "t_s", "lat", "lon", "power"], rows)
    wr("bp/index.json", {"events": index})


def palu_demo():
    """Single-array MUSIC BP of Palu 2018 from the public MUSICBP demo data (with pseudo-spectrum frames)."""
    from PIL import Image
    d = rd("bp/palu_2018_musicdemo.json")
    keep = [i for i, p in enumerate(d["peak_power"]) if p >= 0.34]  # low-power windows (e.g. 27-30 s) jump north: noise
    rad = [{"t": d["t"][i], "lat": d["peak_lat"][i], "lon": d["peak_lon"][i], "power": d["peak_power"][i]} for i in keep]
    fr = np.array(d["frames_uint8"], dtype=np.uint8).reshape(len(d["t"]), len(d["grid_lat"]), len(d["grid_lon"]))
    nt, ny, nx = fr.shape
    sheet = fr[:, ::-1, :].reshape(nt * ny, nx) if d["grid_lat"][0] < d["grid_lat"][-1] else fr.reshape(nt * ny, nx)
    Image.fromarray(sheet, mode="L").save(os.path.join(OUT, "bp", "palu_2018_frames.png"), optimize=True)
    glat, glon = d["grid_lat"], d["grid_lon"]
    out = {"meta": {"event": d["event"], "date": "2018-09-28", "mw": 7.5, "method": d["method"],
                    "citation": "Single-array MUSIC back-projection (Australian array, public MUSICBP demo data), consistent with Bao et al. (2019), Nature Geoscience 12, 200-205, whose figure uses multi-array SEBP.",
                    "doi": "10.1038/s41561-018-0297-z", "status": "demo reprocessing of public tutorial data (not the paper figure data)",
                    "notes": f"1 s window step, {d['window_s']} s windows, {d['band_hz'][0]}-{d['band_hz'][1]} Hz. Windows with normalised peak power < 0.34 are hidden.", "stub": False},
           "hypocenter": {"lat": d["epicenter"]["lat"], "lon": d["epicenter"]["lon"]},
           "arrays": {"AU": rad},
           "frames": {"png": "assets/data/bp/palu_2018_frames.png", "n": nt, "t": d["t"], "nx": nx, "ny": ny,
                      "lon0": min(glon), "lon1": max(glon), "lat0": min(glat), "lat1": max(glat),
                      "row_order": "north to south", "decode": "normalised MUSIC pseudo-spectrum = v/255"}}
    wr("bp/palu_2018.json", out)


# ------------------------------------------------------------------ FFI
def ffi():
    index = []
    for k in FFI_EVENTS:
        d = rd(f"ffi/{k}.json")
        t, doi = cite(d.get("citation"))
        if not d.get("published"):
            t, doi = "Meng group (2026), submitted manuscript; not yet peer reviewed.", None
        sub = []
        csvrows = []
        for s in d["segments"]:
            for i in range(len(s["lat"])):
                sub.append({"lat": s["lat"][i], "lon": s["lon"][i], "depth_km": s["depth_km"][i],
                            "strike": s["strike"], "dip": s["dip"], "len_km": s["dx_km"], "wid_km": s["dy_km"],
                            "slip": round(s["slip_m"][i], 3), "rake": s["rake"][i], "t0": s["t_rup_s"][i]})
                csvrows.append([s["segment"], s["lat"][i], s["lon"][i], s["depth_km"][i], s["strike"], s["dip"], s["dx_km"], s["dy_km"], s["slip_m"][i], s["rake"][i], s["t_rup_s"][i]])
        stf = d["stf"]
        tt = np.array(stf["t_s"]); rr = np.array(stf["moment_rate_nm_s"])
        step = max(1, len(tt) // 240)
        out = {
            "meta": {"event": d["name"], "date": d["date"], "mw": d["mw"], "m0_nm": d["m0_nm"], "max_slip_m": d["max_slip_m"],
                     "citation": t, "doi": doi, "data_doi": d.get("data_doi"), "notes": d.get("model_notes"), "status": status(d), "stub": False},
            "hypocenter": d["hypocenter_subfault"],
            "subfaults": sub,
            "mrf": {"t": [round(x, 2) for x in tt[::step].tolist()], "rate": [float(f"{x:.4g}") for x in rr[::step].tolist()]},
        }
        wr(f"ffi/{k}.json", out)
        wcsv(f"ffi/{k}.csv", ["segment", "lat", "lon", "depth_km", "strike", "dip", "len_km", "wid_km", "slip_m", "rake", "t_rup_s"], csvrows)
        index.append({"key": k, "name": d["name"], "file": f"assets/data/ffi/{k}.json", "status": status(d)})
    wr("ffi/index.json", {"events": index})


# ------------------------------------------------------------------ catalogue
def catalog():
    d = rd("catalog/hawaii_points.json")
    n = d["n"]
    from datetime import datetime
    ts = [datetime.fromisoformat(x) for x in d["time_utc"]]
    t0 = min(ts)
    rows = [[round(d["lon"][i], 4), round(d["lat"][i], 4), round(d["depth_km"][i], 2), d["mag"][i], round((ts[i] - t0).total_seconds() / 86400, 3)] for i in range(n)]
    out = {"meta": {"title": "Relocated catalogue, 2026 South Kona (Hawaii) sequence and Pahala swarm",
                    "method": d["description"], "citation": "Meng group, preliminary relocations; manuscript in preparation (2026), not peer reviewed.", "status": "preliminary",
                    "doi": None, "status": d.get("status"), "mainshock": d.get("mainshock"), "stub": False,
                    "notes": "Magnitude is the network ML used as a proxy. " + d["fields"]},
           "columns": ["lon", "lat", "depth_km", "mag", "t_days"], "rows": rows}
    out["meta"]["t0_utc"] = t0.isoformat() + "Z"
    out["meta"]["zmax"] = 50
    wr("catalog/hawaii_points.json", out)
    wcsv("catalog/hawaii_points.csv", ["lon", "lat", "depth_km", "mag", "time_utc"],
         [r[:4] + [d["time_utc"][i]] for i, r in enumerate(rows)])


# Point-cloud catalogues. Not exported on purpose (column meaning awaiting confirmation):
# mendocino_ma2026, mendocino_mohanna_growclust, ferndale_mohanna_growclust.
SEISFORGE = [("ridgecrest", "2019 Ridgecrest, California"), ("japan_forearc", "NE Japan forearc, 2016–2017"),
             ("iquique", "2014 Iquique, northern Chile"), ("amatrice", "2016 Amatrice–Norcia, central Italy"),
             ("hawaii_kilauea", "2018 Kīlauea, Hawaiʻi"), ("toc2me", "ToC2ME induced seismicity, Alberta")]


def cat_rows(d, extra=()):
    n = d["n"]
    rows = []
    for i in range(n):
        m = d["mag"][i]
        r = [round(d["lon"][i], 3), round(d["lat"][i], 3), round(d["depth_km"][i], 1), None if m is None else round(m, 1),
             round(d["t_s"][i] / 86400.0, 3)]
        for k in extra:
            v = d[k][i]
            r.append(round(v, 2) if isinstance(v, float) else v)
        rows.append(r)
    z = np.array([r[2] for r in rows])
    return rows, float(np.ceil(np.percentile(z, 99.5) / 5) * 5)


def catalogs():
    index = []
    for key, label in SEISFORGE:
        d = rd(f"catalog/seisforge_{key}.json")
        rows, zmax = cat_rows(d, ("score", "tier"))
        sc = np.array([r[5] for r in rows], dtype=float)
        out = {"meta": {"title": label + " — machine-learning catalogue with confirmability score",
                        "citation": "Meng, L., Huang, H., Ma, J.-Z. & Ma, Y. (2026), data and code for the preprint \"Can human seismologists verify machine-learning detected earthquakes?\" (under review).",
                        "doi": None, "data_doi": "10.5281/zenodo.22288706", "status": "data released; paper under review",
                        "t0_utc": d["t0_utc"], "n_source": d["n_source"], "zmax": zmax,
                        "notes": "Score = released confirmability score, a ranking, not a calibrated probability. Tiers T/M/B = thirds by score within this catalogue, not matched in magnitude or depth. " + (d.get("downsampling") or ""),
                        "stub": False},
               "columns": ["lon", "lat", "depth_km", "mag", "t_days", "score", "tier"], "rows": rows,
               "score": {"label": "confirmability score", "min": float(np.percentile(sc, 2)), "max": float(np.percentile(sc, 98))}}
        wr(f"catalog/seisforge_{key}.json", out)
        index.append((f"assets/data/catalog/seisforge_{key}.json", label, d["n"], d["n_source"]))
    for key, label, cite_status in [("noto_swarm_mohanna2026", "Noto Peninsula swarm and 2024 aftershocks", "published"),
                                    ("turkey2023_mohanna_tm", "2023 Türkiye–Syria sequence (template matching)", "data on Zenodo, paper in preparation")]:
        d = rd(f"catalog/{key}.json")
        rows, zmax = cat_rows(d)
        t, doi = cite(d.get("citation"))
        data_doi = None if cite_status == "published" else doi
        out = {"meta": {"title": label, "citation": t, "doi": doi if cite_status == "published" else None, "data_doi": data_doi,
                        "status": cite_status, "t0_utc": d["t0_utc"], "n_source": d["n_source"], "zmax": zmax,
                        "notes": (d.get("format") or "") + ". " + (d.get("downsampling") or ""), "stub": False},
               "columns": ["lon", "lat", "depth_km", "mag", "t_days"], "rows": rows}
        wr(f"catalog/{key}.json", out)
    wr("catalog/index.json", {"seisforge": [{"file": f, "name": l, "n": n, "n_source": ns} for f, l, n, ns in index]})


# ------------------------------------------------------------------ tsunami
def tsunami():
    from PIL import Image
    m = rd("tsunami/tohoku_ssh_meta.json")
    raw = np.fromfile(os.path.join(SRC, "tsunami", m["file"]), dtype=np.uint8).reshape(m["shape"])
    nf, ny, nx = raw.shape
    # frames stacked vertically, north up (row 0 of the image = northernmost row)
    sheet = raw[:, ::-1, :].reshape(nf * ny, nx)
    os.makedirs(os.path.join(OUT, "tsunami"), exist_ok=True)
    Image.fromarray(sheet, mode="L").save(os.path.join(OUT, "tsunami", "tohoku_frames.png"), optimize=True)
    print("wrote tsunami/tohoku_frames.png", os.path.getsize(os.path.join(OUT, "tsunami", "tohoku_frames.png")) // 1024, "kB")
    b = rd("tsunami/tohoku_bathy.json")
    z = np.array(b["z_m"], dtype=float).reshape(b["shape"])
    blat, blon = np.array(b["lat"]), np.array(b["lon"])
    lat, lon = np.array(m["lat"]), np.array(m["lon"])
    # bilinear resample of bathymetry onto the frame grid
    zi = np.empty((ny, nx))
    for j in range(ny):
        row = np.array([np.interp(lat[j], blat, z[:, c]) for c in range(z.shape[1])])
        zi[j] = np.interp(lon, blon, row)
    coast = rd("tsunami/tohoku_coast.json")["lines_lon_lat"]
    out = {"meta": {"event": "2011 Tohoku-like scenario (two-patch thrust source, Mw 8.96)",
                    "citation": "Meng group linear shallow-water solver on GEBCO 2026 30\" bathymetry; scenario used as training/test truth for the tsunami FNO surrogate (work in progress).",
                    "doi": None, "notes": m["description"] + " Caveats: " + " ".join(m["caveats"]), "status": "scenario, unpublished (work in progress)", "stub": False,
                    "bathymetry_source": b["source"]},
           "grid": {"lon0": float(lon[0]), "lat0": float(lat[0]), "dlon": float(lon[1] - lon[0]), "dlat": float(lat[1] - lat[0]), "nx": nx, "ny": ny},
           "depth": [int(round(-v)) for v in zi[::-1].ravel()],  # positive = water depth, row 0 = north
           "frames": {"png": "assets/data/tsunami/tohoku_frames.png", "n": nf, "times_min": m["frame_times_min"], "scale_m": m["scale_m"],
                      "decode": "eta = (v-128)/127*scale_m for v in 1..255; v = 0 land", "row_order": "north to south"},
           "coast": [[[round(p[0], 3), round(p[1], 3)] for p in line] for line in coast],
           "source": m.get("source_params")}
    wr("tsunami/tohoku_scenario.json", out)


if __name__ == "__main__":
    globe(); bp(); palu_demo(); ffi(); catalog(); catalogs(); tsunami()
