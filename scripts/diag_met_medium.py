#!/usr/bin/env python3
"""测试 Met search 的 medium 参数能否扩大采样池（不依赖标题词）。"""
import sys
sys.path.insert(0, '.')
from pipeline.net import http_get_json

BASE = "https://collectionapi.metmuseum.org/public/collection/v1/search"
tests = [
    ("medium=Oil on canvas&dep11", {"q": "the", "departmentId": 11, "hasImages": "true", "isPublicDomain": "true", "medium": "Oil on canvas"}),
    ("medium=Oil on canvas&noDep", {"q": "the", "hasImages": "true", "isPublicDomain": "true", "medium": "Oil on canvas"}),
    ("medium=Oil&dep11", {"q": "the", "departmentId": 11, "hasImages": "true", "isPublicDomain": "true", "medium": "Oil"}),
    ("medium=Oil&noDep", {"q": "the", "hasImages": "true", "isPublicDomain": "true", "medium": "Oil"}),
    ("q=Woman&medium=Oil&dep11", {"q": "Woman", "departmentId": 11, "hasImages": "true", "isPublicDomain": "true", "medium": "Oil"}),
    ("artistOrCulture=Rembrandt", {"q": "the", "hasImages": "true", "isPublicDomain": "true", "artistOrCulture": "Rembrandt"}),
]
for name, params in tests:
    r = http_get_json(BASE, params=params)
    ids = (r or {}).get("objectIDs") or []
    print(f'{name}: {len(ids)} ids')
