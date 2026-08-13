"""The Met 适配器（免 key，SPE §6.2）。

Search API 必须带 q 参数（无 q 返回 502）：按部门 × 关键词轮换取 id 池随机采样 →
对象接口取详情 → 过滤公版+有图+分类白名单。
feed/thumb 用 primaryImageSmall，full 用 primaryImage。
"""
import random

from .. import config
from ..net import http_get_json
from . import Candidate

# 部门 id（以官方 departments 接口为准；取不到该部门自动跳过）：
# 11 European Paintings / 9 Drawings and Prints / 6 Asian Art /
# 21 Islamic Art / 3 Egyptian Art / 17 Greek and Roman Art / 2 American Paintings and Sculpture
DEPARTMENT_IDS = [11, 9, 6, 21, 3, 17, 2]

QUERY_TERMS = ["painting", "portrait", "landscape", "still life", "watercolor",
               "drawing", "figure", "seascape", "flowers", "cityscape"]


def _sample_ids(n):
    ids = []
    for dep in DEPARTMENT_IDS:
        for q in random.sample(QUERY_TERMS, 3):
            data = http_get_json(f"{config.MET_BASE}/search",
                                 params={"q": q, "departmentId": dep, "hasImages": "true"})
            pool = (data or {}).get("objectIDs") or []
            if pool:
                random.shuffle(pool)
                ids.extend(pool[:10])
    random.shuffle(ids)
    return ids[:n]


def fetch_candidates(n):
    out = []
    by_artist = {}
    for oid in _sample_ids(n * 10):
        obj = http_get_json(f"{config.MET_BASE}/objects/{oid}")
        if not obj:
            continue
        if not (obj.get("isPublicDomain") and obj.get("primaryImage")):
            continue
        cls = (obj.get("classification") or "").lower()
        if not any(k in cls for k in config.CLASSIFICATION_WHITELIST):
            continue
        artist = (obj.get("artistDisplayName") or "Unknown").strip() or "Unknown"
        key = artist.lower()
        if by_artist.get(key, 0) >= config.MAX_PER_ARTIST_POOL:
            continue
        by_artist[key] = by_artist.get(key, 0) + 1
        feed = obj.get("primaryImageSmall") or obj["primaryImage"]
        out.append(Candidate(
            source="met",
            sourceId=str(oid),
            title_en=obj.get("title") or "",
            artist_en=artist,
            date_display=obj.get("objectDate") or "",
            medium=obj.get("medium") or "",
            dimensions=obj.get("dimensions") or "",
            classification=obj.get("classification") or "",
            image_feed=feed,
            image_full=obj["primaryImage"],
            image_thumb=feed,
            source_url=obj.get("objectURL") or f"https://www.metmuseum.org/art/collection/search/{oid}",
            is_highlight=bool(obj.get("isHighlight")),
        ))
        if len(out) >= n:
            break
    return out
