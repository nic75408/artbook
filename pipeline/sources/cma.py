"""Cleveland Museum of Art 适配器（免 key，SPE §6.2）。

Open Access API：cc0=1&has_image=1，随机 skip 分页采样；
feed/thumb 用 images.web.url，full 优先 images.print.url。
"""
import random

from .. import config
from ..net import http_get_json
from . import Candidate


def _total():
    data = http_get_json(f"{config.CMA_BASE}/artworks/",
                         params={"cc0": "1", "has_image": "1", "limit": "1"})
    return (data or {}).get("info", {}).get("total", 0)


def fetch_candidates(n):
    total = _total()
    if not total:
        return []
    out = []
    by_artist = {}
    tries = 0
    while len(out) < n and tries < 15:
        tries += 1
        skip = random.randint(0, max(0, total - 100))
        data = http_get_json(f"{config.CMA_BASE}/artworks/",
                             params={"cc0": "1", "has_image": "1",
                                     "limit": "100", "skip": str(skip)})
        for a in (data or {}).get("data", []):
            t = (a.get("type") or "").lower()
            if not any(k in t for k in config.CLASSIFICATION_WHITELIST):
                continue
            images = a.get("images") or {}
            feed = (images.get("web") or {}).get("url")
            if not feed:
                continue
            full = (images.get("print") or {}).get("url") or feed
            creators = a.get("creators") or []
            artist = (creators[0].get("description") if creators else "Unknown").strip() or "Unknown"
            key = artist.lower()
            if by_artist.get(key, 0) >= config.MAX_PER_ARTIST_POOL:
                continue
            by_artist[key] = by_artist.get(key, 0) + 1
            out.append(Candidate(
                source="cma",
                sourceId=str(a.get("id")),
                title_en=a.get("title") or "",
                artist_en=artist,
                date_display=a.get("creation_date") or "",
                medium=a.get("technique") or "",
                dimensions=a.get("measurements") or "",
                classification=a.get("type") or "",
                image_feed=feed,
                image_full=full,
                image_thumb=feed,
                source_url=a.get("url") or "",
                is_highlight=False,
            ))
            if len(out) >= n:
                break
    return out
