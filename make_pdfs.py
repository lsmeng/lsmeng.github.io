#!/usr/bin/env python3
"""Copy ONLY the shareable author/preprint/OA PDFs into pdf/<num>.pdf.
Publisher final (copyrighted) versions are deliberately excluded."""
import os, shutil

SRC = "meng_publication"
DST = "pdf"
os.makedirs(DST, exist_ok=True)

# publication number -> shareable source filename (author version, preprint, or OA)
MAP = {
    6:  "Menetal12_acc.pdf",                                              # Haiti BP (accepted)
    7:  "MengSumatraRevisedText.pdf",                                     # Sumatra maze (author revised text)
    9:  "meng_eps_2012_artifact.pdf",                                     # EPS (open access)
    10: "Huang_eps_2012_artifact.pdf",                                    # EPS (open access)
    11: "Avoetal13 BalochistanEQ-MainText.pdf",                          # Balochistan (author main text)
    12: "MenAmpBur 2014 subm.pdf",                                        # Okhotsk (submitted)
    13: "MenAllAmp13_subm_BSSA.pdf",                                      # Array EEW (submitted)
    16: "MengZhangYagi_Nepal_Calibration_GRL2016.pdf",                   # Gorkha calibration (accepted)
    17: "An_Meng-Tsunami_2016-Geophysical_Research_Letters.pdf",         # Tsunami prediction (accepted)
    20: "revision_murghab2015.pdf",                                       # Murghab (revision)
    21: "An_et_al-2017-Geophysical_Research_Letters.pdf",                # Time-reversal Illapel (accepted)
    27: "Xu_et_al-2018-Journal_of_Geophysical_Research%3A_Solid_Earth.pdf", # Kaikoura (accepted)
    29: "Huang_et_al-2018-Geophysical_Research_Letters.pdf",             # Illapel slow unlock (accepted)
    31: "Chen_etalGcued_2018preprint.pdf",                               # Bonin G-cubed (preprint)
    33: "Ruppert_etal_GRL_preprint2018.pdf",                             # Kodiak (preprint)
    35: "Feng_et_al_GMPE_BP_2018_preprint.pdf",                          # GMPE BP (preprint)
    38: "Meng_et_al-2019-Geophysical_Research_Letters.pdf",              # Tehuantepec (accepted)
    39: "Zhou_et_al-2019-Journal_of_Geophysical_Research_preprint.pdf",  # Adjoint tsunami (preprint)
    41: "Xie_Meng_submitted2019.pdf",                                     # Tsunami warning (submitted)
    49: "BaoXuMenNatGeo2022PreprintMain.pdf",                            # Global supershear (preprint)
    51: "XieMenZho_GRL_2022_New_zealand_preprint.pdf",                  # East Cape NZ (preprint)
    52: "Vallee_2022_EPSL_Peru2019_preprint_main.pdf",                  # Peru (preprint)
    60: "Calais_etal2025Seismica.pdf",                                   # Cayman (Seismica, open access)
}

ok = []
for num, fn in sorted(MAP.items()):
    src = os.path.join(SRC, fn)
    if not os.path.exists(src):
        print(f"!! missing: {fn}"); continue
    dst = os.path.join(DST, f"{num}.pdf")
    shutil.copyfile(src, dst)
    ok.append(num)
    print(f"  pdf/{num}.pdf  <-  {fn}  ({os.path.getsize(dst)//1024} KB)")

print(f"\n=== copied {len(ok)} PDFs: {ok} ===")
