#!/usr/bin/env python3
"""Render the email address as a transparent PNG (anti-scraping). Run: python3 gen_email.py"""
from PIL import Image, ImageDraw, ImageFont

TEXT = "lsmeng@g.ucla.edu"
COLOR = (21, 78, 120, 255)   # --accent-dark
SCALE = 3                     # render at 3x for crisp retina display
FONT_PX = 20 * SCALE
PAD = 4 * SCALE

font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", FONT_PX)

# measure
tmp = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
d = ImageDraw.Draw(tmp)
bbox = d.textbbox((0, 0), TEXT, font=font)
w = bbox[2] - bbox[0] + 2 * PAD
h = bbox[3] - bbox[1] + 2 * PAD

img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.text((PAD - bbox[0], PAD - bbox[1]), TEXT, font=font, fill=COLOR)

img.save("assets/email.png")
print(f"Wrote assets/email.png ({w}x{h}px, display ~{w//SCALE}x{h//SCALE})")
