#!/usr/bin/env python3
"""测试扩大 Met 采样池的参数组合。"""
import sys
sys.path.insert(0, '.')
from pipeline.net import http_get_json

BASE = "https://collectionapi.metmuseum.org/public/collection/v1/search"
tests = [
    ("q=the&dateRange", {"q": "the", "departmentId": 11, "hasImages": "true", "isPublicDomain": "true", "dateBegin": "1400", "dateEnd": "1900"}),
    ("q=the&noDate", {"q": "the", "departmentId": 11, "hasImages": "true", "isPublicDomain": "true"}),
    ("q=Madonna&dateRange", {"q": "Madonna", "departmentId": 11, "hasImages": "true", "isPublicDomain": "true", "dateBegin": "1400", "dateEnd": "1900"}),
    ("q=Portrait&noDep&dateRange", {"q": "Portrait", "hasImages": "true", "isPublicDomain": "true", "dateBegin": "1400", "dateEnd": "1900"}),
    ("q=Woman&noDep&dateRange", {"q": "Woman", "hasImages": "true", "isPublicDomain": "true", "dateBegin": "1400", "dateEnd": "1900"}),
    ("q=Saint&noDep&dateRange", {"q": "Saint", "hasImages": "true", "isPublicDomain": "true", "dateBegin": "1400", "dateEnd": "1900"}),
]
for name, params in tests:
    r = http_get_json(BASE, params=params)
    ids = (r or {}).get("objectIDs") or []
    print(f'{name}: {len(ids)} ids')
