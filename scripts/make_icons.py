#!/usr/bin/env python3
"""生成 PWA 图标（SPE §7.7）：米白底、金褐衬线「艺」单字。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]

BG = "#F5F1EA"
FG = "#8C6D3F"


def load_font(size):
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    raise RuntimeError("no CJK serif font found")


def make(size, glyph_frac, out):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    font = load_font(int(size * glyph_frac))
    bbox = d.textbbox((0, 0), "艺", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]), "艺", font=font, fill=FG)
    img.save(out, "PNG")
    print("wrote", out)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    make(192, 0.72, OUT / "icon-192.png")
    make(512, 0.72, OUT / "icon-512.png")
    make(512, 0.48, OUT / "icon-512-maskable.png")  # maskable 安全区：字形更小居中
    make(180, 0.72, OUT / "apple-touch-icon.png")
