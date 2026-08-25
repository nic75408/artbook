#!/usr/bin/env python3
"""调试：模拟 met.fetch_candidates 完整流程，打印每步过滤原因。"""
import json
import sys
sys.path.insert(0, '.')
from pipeline import config
from pipeline.net import http_get_json
from pipeline.sources import met

seen = json.load(open('pipeline/seen.json')).get('seen', {})
print('seen 总数:', len(seen))
print('seen 中 met 数:', sum(1 for k in seen if k.startswith('met-')))

ids = met._sample_ids(500)
print('采样 id 池:', len(ids))
met_ids = set(ids)
in_seen = [i for i in ids if f'met-{i}' in seen]
print('其中已见:', len(in_seen), '| 未见:', len(ids) - len(in_seen))

from pipeline.sources.met import MAX_PER_ARTIST_POOL
print('MAX_PER_ARTIST_POOL =', MAX_PER_ARTIST_POOL)

# 只测前 30 个未见 id
new_ids = [i for i in ids if f'met-{i}' not in seen][:30]
print('\n=== 前 30 个未见 id 的对象请求 ===')
ok = 0
by_artist = {}
for oid in new_ids:
    obj = http_get_json(f"{config.MET_BASE}/objects/{oid}")
    if not obj:
        print(f'  {oid}: 对象接口无响应')
        continue
    if not (obj.get("isPublicDomain") and obj.get("primaryImage")):
        print(f'  {oid}: 非公版/无图 [{obj.get("title","")[:25]}] pd={obj.get("isPublicDomain")} img={bool(obj.get("primaryImage"))}')
        continue
    cls = (obj.get("classification") or "").lower()
    if not any(k in cls for k in config.CLASSIFICATION_WHITELIST):
        print(f'  {oid}: 分类不合 [{cls[:35]}]')
        continue
    artist = (obj.get("artistDisplayName") or "Unknown").strip() or "Unknown"
    key = artist.lower()
    if by_artist.get(key, 0) >= config.MAX_PER_ARTIST_POOL:
        print(f'  {oid}: 画家超限 [{artist}]')
        continue
    by_artist[key] = by_artist.get(key, 0) + 1
    ok += 1
    print(f'  {oid}: ✓ {obj.get("title","")[:30]} | {artist[:15]} | {cls[:25]}')
print(f'\n30 个中合格: {ok}')
