#!/usr/bin/env python3
"""生成 PWA 图标（SPE §7.7）：画框式构图——米白大底 + 金褐细框 + 白内衬 + 金褐衬线「艺」。

设计语言沿用 app.css 的「画框感」（直角 + 细描边 + 白色内衬，.frame 与 .meta 同源）：
- 米白大底（--bg #F5F1EA）铺满整幅，呼应纸感页面的留白；
- 正中一道金褐直角细框（--gold #8C6D3F），像美术馆里装裱作品的画框；
- 框内是米白衬卡（--bg-card #FDFBF7），与 app 的画作卡同色，形成轻微层次；
- 衬卡正中是金褐衬线「艺」（Songti），按墨心（ink bbox）光学居中。

所有尺寸共用同一套比例（comp/frame/mat/glyph 均为画布或构图的相对值），
maskable 版整体缩小至安全区（中央 80% 圆）内，构图比例不变，仅字形略放大保证可读。
超采样 4x + LANCZOS 下采样，细框与字形边缘平滑。
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]

BG = "#F5F1EA"      # 米白大底（--bg）
CARD = "#FDFBF7"    # 白内衬（--bg-card）
FG = "#8C6D3F"      # 金褐（--gold）：画框 + 字形

SS = 4  # 超采样倍数


def load_font(size):
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    raise RuntimeError("no CJK serif font found")


def _ink_bbox(im, bg_rgb):
    """返回与背景色不同的像素（墨迹）包围盒；无墨迹时抛错。"""
    bg = Image.new("RGB", im.size, bg_rgb)
    diff = ImageChops.difference(im.convert("RGB"), bg).convert("L")
    bbox = diff.getbbox()
    if bbox is None:
        raise RuntimeError("glyph render produced no ink")
    return bbox


def _render_glyph(size):
    """在临时画布上渲染「艺」，返回 (画布, 墨迹包围盒)。"""
    img = Image.new("RGB", (size * 2, size * 2), BG)
    d = ImageDraw.Draw(img)
    font = load_font(size)
    bbox = d.textbbox((0, 0), "艺", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size * 2 - w) / 2 - bbox[0], (size * 2 - h) / 2 - bbox[1]), "艺", font=font, fill=FG)
    return img, _ink_bbox(img, BG)


def make(size, comp_frac, glyph_frac, out):
    """生成单个图标。

    size       输出边长（最终像素）
    comp_frac  画框外缘占画布的比例（maskable 需 ≤0.56 保证落入安全区圆内）
    glyph_frac 字形高度占内衬可绘区（画框内去掉描边与衬卡留白）的比例
    """
    S = size * SS
    img = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(img)

    comp = int(S * comp_frac)             # 画框外缘边长（超采样像素）
    ox = (S - comp) // 2                  # 画框左上角，四周留白对称
    oy = (S - comp) // 2
    fw = max(1, int(comp * 0.010))        # 金褐画框线宽（约画框的 1%）
    mw = max(2, int(comp * 0.024))        # 白内衬宽度（约画框的 2.4%）

    # 金褐直角画框
    d.rectangle([ox, oy, ox + comp - 1, oy + comp - 1], outline=FG, width=fw)

    # 白内衬
    mx0, my0 = ox + fw, oy + fw
    mx1, my1 = ox + comp - fw, oy + comp - fw
    d.rectangle([mx0, my0, mx1, my1], fill=CARD)

    # 「艺」字形，按墨心光学居中于内衬可绘区
    inner = mx1 - mx0 - 2 * mw
    g, ib = _render_glyph(int(inner * glyph_frac))
    icx = (ib[0] + ib[2]) // 2
    icy = (ib[1] + ib[3]) // 2
    cx = (mx0 + mw + mx1 - mw) // 2
    cy = (my0 + mw + my1 - mw) // 2
    gx = cx - icx + ib[0]                 # 墨心 → 内衬中心
    gy = cy - icy + ib[1]
    img.paste(g.crop(ib), (gx, gy))

    img = img.resize((size, size), Image.Resampling.LANCZOS)
    img.save(out, "PNG")
    print("wrote", out)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    make(192, 0.84, 0.72, OUT / "icon-192.png")
    make(512, 0.84, 0.72, OUT / "icon-512.png")
    # maskable 安全区：画框外缘 0.55（角到中心 0.389 < 半径 0.40），字形略大保证可读
    make(512, 0.55, 0.78, OUT / "icon-512-maskable.png")
    make(180, 0.84, 0.72, OUT / "apple-touch-icon.png")
