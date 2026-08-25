#!/usr/bin/env python3
"""测试 Met search 各词 + isPublicDomain=true 的池子大小（找有效过滤组合）。"""
import sys
sys.path.insert(0, '.')
from pipeline.net import http_get_json

BASE = "https://collectionapi.metmuseum.org/public/collection/v1/search"
for q in ("Madonna", "Saint", "Portrait", "Landscape", "Venus", "Christ",
          "Still", "Flowers", "River", "Woman", "Mountain", "Interior"):
    with_pd = http_get_json(BASE, params={"q": q, "departmentId": 11, "hasImages": "true", "isPublicDomain": "true"})
    wo_pd = http_get_json(BASE, params={"q": q, "departmentId": 11, "hasImages": "true"})
    n1 = len((with_pd or {}).get("objectIDs") or [])
    n2 = len((wo_pd or {}).get("objectIDs") or [])
    print(f'q={q:10s} | 带公版过滤: {n1:4d} | 不带: {n2:4d}')
