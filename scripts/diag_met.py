#!/usr/bin/env python3
"""Met 隔离测试：不过 seen 拉 50，统计各过滤环节的损耗。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import config
from pipeline.sources import met

print('MAX_PER_ARTIST_POOL =', config.MAX_PER_ARTIST_POOL)
print('REQUEST_INTERVAL =', config.REQUEST_INTERVAL, '| HTTP_TIMEOUT =', config.HTTP_TIMEOUT)

# 第一步：采样 id 池
ids = met._sample_ids(500)
print(f'\n采样 id 池: {len(ids)} 个')
print('id 范围:', min(ids), '-', max(ids))

# 第二步：对前 60 个 id 走对象接口，统计过滤损耗
from ..net import http_get_json  # noqa
import time
ok = 0
seen = {}
for oid in ids[:60]:
    obj = http_get_json(f"{config.MET_BASE}/objects/{oid}")
    if not obj:
        print(f'  {oid}: 对象接口无响应')
        continue
    if not (obj.get("isPublicDomain") and obj.get("primaryImage")):
        print(f'  {oid}: 非公版/无图 ({obj.get("title", "")[:30]})')
        continue
    cls = (obj.get("classification") or "").lower()
    if not any(k in cls for k in config.CLASSIFICATION_WHITELIST):
        print(f'  {oid}: 分类不合 ({cls[:30]})')
        continue
    ok += 1
print(f'\n前 60 个 id 合格候选: {ok}/60')
