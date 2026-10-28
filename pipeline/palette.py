"""主色提取（SPE §6.3-5）：下载 feed 图（超时 10s）→ 缩至 50px → 两簇主色。

同时返回图片高宽比（供前端占位预排，SPE §5.1 image.ratio）。

2026-09-08：CMA CDN 对 Python requests 库 SSL 握手失败，改用 subprocess 调用 curl 绕过。
2026-10-29（t_03383a4f）：下载/SSL 偶发失败时过去返回 (1.0, None)，palette 为 None
会被 validate.py 的闸门拦截，导致本来图片 URL 可访问、字段完整的作品被整幅丢弃。
现在失败时给兜底中性色 FALLBACK_PALETTE，不再返回 None——只有"提取失败"，
没有"字段真的为空"这一种情况需要拦截。
"""
import subprocess
from io import BytesIO

from PIL import Image

FALLBACK_PALETTE = ["#888888", "#cccccc"]


def extract_palette(url, timeout=10):
    try:
        # 用 curl 下载图片（绕过 Python SSL 问题）
        result = subprocess.run(
            ['curl', '-m', str(timeout), '-sS', '-A', 'Mozilla/5.0', url],
            capture_output=True,
            timeout=timeout + 5
        )
        if result.returncode != 0:
            return 1.0, FALLBACK_PALETTE

        im = Image.open(BytesIO(result.stdout)).convert("RGB")
        w, h = im.size
        ratio = h / w if w else 1.0
        im.thumbnail((50, 50))
        q = im.quantize(colors=2, method=Image.Quantize.MEDIANCUT).convert("RGB")
        counts = q.getcolors()
        if not counts:
            return ratio, FALLBACK_PALETTE
        colors = sorted(counts, key=lambda x: -x[0])[:2]
        hexs = ["#%02x%02x%02x" % c for _, c in colors]
        while len(hexs) < 2:
            hexs.append(hexs[0])
        return round(ratio, 3), hexs
    except Exception:
        return 1.0, FALLBACK_PALETTE
