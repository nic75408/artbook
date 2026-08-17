"""Art Institute of Chicago 适配器（免 key，SPE §6.2）。

Search API 的 ES-DSL 查询参数在当前版本不可用（term 解析错误），改用：
关键词轮换搜索 + 客户端过滤 is_public_domain / image_id 非空。
IIIF 直链三档尺寸。

2026-08-15 起 AIC 给 IIIF 服务（www.artic.edu/iiif）加了 Cloudflare 挑战，
无 JS 客户端（pipeline 拉图 / LLM 网关拉图）全部 403。fetch_candidates
先探测可达性，被拦则本期跳过 AIC 源，由 Met/CMA 承担（SPE §11 韧性降级）。
"""
import random

from .. import config
from ..net import http_get_json, http_head_ok
from . import Candidate

FIELDS = ("id,title,artist_title,date_display,image_id,medium_display,dimensions,"
          "classification_titles,is_public_domain,is_highlight")

QUERY_TERMS = ["painting", "portrait", "landscape", "still life", "watercolor",
               "drawing", "figure", "seascape", "flowers", "cityscape", "oil on canvas"]

# Elasticsearch 深分页上限 10000（offset），limit=100 时最多翻到第 100 页
MAX_PAGE = 100

# 探测用：一件已知公版作品的 image_id（Self-Portrait, id=11），16px 小图
_PROBE_URL = "https://www.artic.edu/iiif/2/7b7a6f39-1cd8-ea2f-9811-18b0e23edac0/full/16,/0/default.jpg"
_probe_result = None


def _iiif_ok():
    """IIIF 服务可达性探测（模块级缓存，每期只探一次）。"""
    global _probe_result
    if _probe_result is None:
        _probe_result = http_head_ok(_PROBE_URL, retries=1)
    return _probe_result


def _iiif(image_id, w):
    return f"https://www.artic.edu/iiif/2/{image_id}/full/{w},/0/default.jpg"


def fetch_candidates(n):
    if not _iiif_ok():
        print("[source] aic: IIIF 被 Cloudflare 挑战拦截（403），本期跳过 AIC 源，由 Met/CMA 承担")
        return []
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
