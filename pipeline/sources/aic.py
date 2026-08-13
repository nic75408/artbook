"""Art Institute of Chicago 适配器（免 key，SPE §6.2）。

Search API 的 ES-DSL 查询参数在当前版本不可用（term 解析错误），改用：
关键词轮换搜索 + 客户端过滤 is_public_domain / image_id 非空。
IIIF 直链三档尺寸。
"""
import random

from .. import config
from ..net import http_get_json
from . import Candidate

FIELDS = ("id,title,artist_title,date_display,image_id,medium_display,dimensions,"
          "classification_titles,is_public_domain,is_highlight")

QUERY_TERMS = ["painting", "portrait", "landscape", "still life", "watercolor",
               "drawing", "figure", "seascape", "flowers", "cityscape", "oil on canvas"]

# Elasticsearch 深分页上限 10000（offset），limit=100 时最多翻到第 100 页
MAX_PAGE = 100


def _iiif(image_id, w):
    return f"https://www.artic.edu/iiif/2/{image_id}/full/{w},/0/default.jpg"


def fetch_candidates(n):
    out = []
    by_artist = {}
    tries = 0
    while len(out) < n and tries < 20:
        tries += 1
        q = random.choice(QUERY_TERMS)
        page = random.randint(1, MAX_PAGE)
        data = http_get_json(f"{config.AIC_BASE}/artworks/search",
                             params={"q": q, "limit": "100", "page": str(page),
                                     "fields": FIELDS})
        for a in (data or {}).get("data", []):
            image_id = a.get("image_id")
            if not (image_id and a.get("is_public_domain")):
                continue
            cls = " ".join(a.get("classification_titles") or []).lower()
            if not any(k in cls for k in config.CLASSIFICATION_WHITELIST):
                continue
            artist = (a.get("artist_title") or "Unknown").strip() or "Unknown"
            key = artist.lower()
            if by_artist.get(key, 0) >= config.MAX_PER_ARTIST_POOL:
                continue
            by_artist[key] = by_artist.get(key, 0) + 1
            out.append(Candidate(
                source="aic",
                sourceId=str(a.get("id")),
                title_en=a.get("title") or "",
                artist_en=artist,
                date_display=a.get("date_display") or "",
                medium=a.get("medium_display") or "",
                dimensions=a.get("dimensions") or "",
                classification=" ".join(a.get("classification_titles") or []),
                image_feed=_iiif(image_id, 843),
                image_full=_iiif(image_id, 1686),
                image_thumb=_iiif(image_id, 400),
                source_url=f"https://www.artic.edu/artworks/{a.get('id')}",
                is_highlight=bool(a.get("is_highlight")),
            ))
            if len(out) >= n:
                break
    return out
