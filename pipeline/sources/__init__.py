"""数据源适配器统一接口（SPE §6.2）。"""
from dataclasses import dataclass


@dataclass
class Candidate:
    source: str            # met | aic | cma | rijks
    sourceId: str
    title_en: str
    artist_en: str
    date_display: str
    medium: str
    dimensions: str
    classification: str    # 源站原文
    image_feed: str
    image_full: str
    image_thumb: str
    source_url: str
    is_highlight: bool = False
