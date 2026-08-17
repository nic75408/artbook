#!/usr/bin/env python3
"""校验重跑后的 08-17 期：赏析硬约束 + 结构完整性。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

d = json.load(open('data/issues/2026-08-17.json'))
ws = d['works']
print(f'08-17: {len(ws)} 幅')
bad = []
for w in ws:
    v = essay_violations(w.get('essay') or [])
    if v:
        bad.append((w['id'], w.get('title_zh'), v))
    for k in ('title_zh', 'artist_zh', 'image', 'essay', 'detailCrop', 'tags'):
        if w.get(k) in (None, '', [], {}):
            bad.append((w['id'], w.get('title_zh'), [f'缺/空 {k}']))
    img = w.get('image') or {}
    for k in ('feed', 'full', 'thumb'):
        if not (img.get(k) or '').strip():
            bad.append((w['id'], w.get('title_zh'), [f'image.{k} 空']))
if bad:
    for b in bad:
        print('  违规:', b)
else:
    print('赏析硬约束 + 结构: 全过')
ids = [w['id'] for w in ws]
print('id 唯一:', len(ids) == len(set(ids)))
src = {}
for w in ws:
    src[w['id'].split('-')[0]] = src.get(w['id'].split('-')[0], 0) + 1
print('来源分布:', src)
