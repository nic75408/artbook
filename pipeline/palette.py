"""主色提取（SPE §6.3-5）：下载 feed 图（超时 10s）→ 缩至 50px → 两簇主色。

同时返回图片高宽比（供前端占位预排，SPE §5.1 image.ratio）。失败返回 (1.0, None)，不阻塞流程。
"""
from io import BytesIO

import requests
from PIL import Image


def extract_palette(url, timeout=10):
    try:
        r = requests.get(url, timeout=timeout, headers={"User-Agent": "artbook-pipeline/1.0"})
        r.raise_for_status()
        im = Image.open(BytesIO(r.content)).convert("RGB")
        w, h = im.size
        ratio = h / w if w else 1.0
        im.thumbnail((50, 50))
        q = im.quantize(colors=2, method=Image.Quantize.MEDIANCUT).convert("RGB")
        counts = q.getcolors()
        if not counts:
            return ratio, None
        colors = sorted(counts, key=lambda x: -x[0])[:2]
        hexs = ["#%02x%02x%02x" % c for _, c in colors]
        while len(hexs) < 2:
            hexs.append(hexs[0])
        return round(ratio, 3), hexs
    except Exception:
        return 1.0, None
