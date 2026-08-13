"""Rijksmuseum 适配器（可选 key，SPE §6.2）。

仅当 RIJKS_API_KEY 存在时启用；缺 key 打日志跳过，不报错。
"""
import random

from .. import config
from ..net import http_get_json
from . import Candidate

OBJECT_TYPES = {"schilderij": "painting", "tekening": "drawing",
                "aquarel": "watercolor", "prent": "print", "pastel": "pastel"}


def _sized(url, s):
    """Rijks webImage url 形如 https://lh3.googleusercontent.com/...=s0，替换尺寸参数。"""
    import re
    return re.sub(r"=s\d+", f"=s{s}", url)


def fetch_candidates(n):
    if not config.RIJKS_API_KEY:
        print("[source] rijks: 无 RIJKS_API_KEY，跳过")
        return []
    out = []
    by_artist = {}
    tries = 0
    while len(out) < n and tries < 10:
        tries += 1
        data = http_get_json(f"{config.RIJKS_BASE}/collection", params={
            "key": config.RIJKS_API_KEY, "imgonly": "true",
            "ps": "100", "p": str(random.randint(1, 50)),
            "format": "json",
        })
        for a in (data or {}).get("artObjects", []):
            ot = a.get("objectType") or ""
            if ot not in OBJECT_TYPES:
                continue
            web = a.get("webImage")
            if not web or not web.get("url"):
                continue
            artist = a.get("principalOrFirstMaker") or "Unknown"
            key = artist.lower()
            if by_artist.get(key, 0) >= config.MAX_PER_ARTIST_POOL:
                continue
            by_artist[key] = by_artist.get(key, 0) + 1
            feed = _sized(web["url"], 1200)
            out.append(Candidate(
                source="rijks",
                sourceId=str(a.get("objectNumber")),
                title_en=a.get("title") or "",
                artist_en=artist,
                date_display=a.get("dating", {}).get("presentingDate") or "",
                medium=a.get("materials") or "",
                dimensions="",
                classification=OBJECT_TYPES.get(ot, ot),
                image_feed=feed,
                image_full=_sized(web["url"], 0),
                image_thumb=_sized(web["url"], 400),
                source_url=a.get("links", {}).get("web") or "",
                is_highlight=False,
            ))
            if len(out) >= n:
                break
    return out
