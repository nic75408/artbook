#!/usr/bin/env python3
"""细粒度诊断：_sample_ids 每次 search 的状态码与结果。"""
import random
import sys
sys.path.insert(0, '.')
import requests
from pipeline import config

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
DEPARTMENT_IDS = [11, 11, 2, 2, 9, 6, 21, 3, 17]
QUERY_TERMS = ["The", "Madonna", "Saint", "Portrait", "Landscape", "Venus",
               "Christ", "Still", "Flowers", "River", "Woman", "Man", "Head",
               "Bust", "Holy", "Annunciation", "Virgin", "Mountain", "Interior",
               "Sea", "Market", "Wine", "Garden", "Winter", "Summer", "Bathers"]

ok = 0
fail = 0
total_ids = 0
for dep in DEPARTMENT_IDS:
    for q in random.sample(QUERY_TERMS, 4):
        try:
            r = requests.get(f"{config.MET_BASE}/search",
                             params={"q": q, "departmentId": dep, "hasImages": "true",
                                     "isPublicDomain": "true"},
                             timeout=20, headers={"User-Agent": UA})
            if r.status_code == 200:
                pool = (r.json().get("objectIDs") or [])
                total_ids += len(pool)
                ok += 1
            else:
                fail += 1
                print(f'  dep={dep} q={q}: HTTP {r.status_code} body={r.text[:60]}')
        except Exception as e:
            fail += 1
            print(f'  dep={dep} q={q}: EXC {type(e).__name__} {e}')
print(f'\nsearch 成功 {ok} / 失败 {fail} / 总 id {total_ids}')
