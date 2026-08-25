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
# 2026-08-17：绘画部门（11、2）各加权 ×2，提升候选池绘画占比（SPE 要求 ≥70%）
DEPARTMENT_IDS = [11, 11, 2, 2, 9, 6, 21, 3, 17]

# Met search 的 q 是全文搜索（匹配标题/画家名），不是分类过滤！
# 2026-08-17：扩充标题常见词库以扩大采样池（isPublicDomain=true 参数组合
# 会把池子压到极小，已回退）。关键词越多，撞 seen 后的新 id 越多。
QUERY_TERMS = ["The", "Madonna", "Saint", "Portrait", "Landscape", "Venus",
               "Christ", "Still", "Flowers", "River", "Woman", "Man", "Head",
               "Bust", "Holy", "Annunciation", "Virgin", "Mountain", "Interior",
               "Sea", "Market", "Wine", "Garden", "Winter", "Summer", "Bathers"]

# 2026-08-25：artistOrCulture 参数按画家名搜索，池子远大于标题词
# （Rembrandt 63、Monet 100+……），且命中率高（名画家公版油画多）。
ARTIST_TERMS = ["Rembrandt", "Van Gogh", "Monet", "Renoir", "Cezanne", "Degas",
                "Pissarro", "Gauguin", "Manet", "Whistler", "Sargent", "Homer",
                "El Greco", "Velazquez", "Goya", "Titian", "Caravaggio", "Poussin",
                "Watteau", "Fragonard", "Boucher", "David", "Ingres", "Delacroix",
                "Courbet", "Millet", "Corot", "Toulouse-Lautrec", "Seurat", "Cassatt",
                "Church", "Cole", "Bierstadt", "Durand", "Inness", "Hassam"]


def _search(dep, **extra):
    params = {"q": "the", "departmentId": dep, "hasImages": "true",
              "isPublicDomain": "true", **extra}
    data = http_get_json(f"{config.MET_BASE}/search", params=params)
    return (data or {}).get("objectIDs") or []


def _sample_ids(n):
    ids = []
    for dep in DEPARTMENT_IDS:
        # 画家词（池子大、命中率高）
        for a in random.sample(ARTIST_TERMS, 2):
            pool = _search(dep, artistOrCulture=a)
            if pool:
                random.shuffle(pool)
                ids.extend(pool[:30])
        # 标题词（补充冷门作品）
        for q in random.sample(QUERY_TERMS, 2):
            pool = _search(dep, q=q)
            if pool:
                random.shuffle(pool)
                ids.extend(pool[:15])
    random.shuffle(ids)
    return ids[:n]


def fetch_candidates(n, seen=None):
    """拉取 n 个候选；源内部跳过 seen 已见 id（不足则多轮采样，最多 3 轮）。"""
    seen = seen or set()
    out = []
    by_artist = {}
    rounds = 0
    while len(out) < n and rounds < 3:
        rounds += 1
        for oid in _sample_ids(n * 10):
            cid = f"met-{oid}"
            if cid in seen:
                continue
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
                image_full=obj.get("primaryImage") or feed,
                image_thumb=feed,
                source_url=f"https://www.metmuseum.org/art/collection/search/{oid}",
                is_highlight=bool(obj.get("isHighlight")),
            ))
            if len(out) >= n:
                break
    return out
