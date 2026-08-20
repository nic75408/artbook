#!/usr/bin/env python3
"""体检 08-18/19/20：来源构成 + 赏析违规。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

for date in ('2026-08-18', '2026-08-19', '2026-08-20'):
    d = json.load(open(f'data/issues/{date}.json'))
    ws = d['works']
    src = {}
    for w in ws:
        src[w['id'].split('-')[0]] = src.get(w['id'].split('-')[0], 0) + 1
    bad = [(w['id'], w.get('title_zh'), essay_violations(w.get('essay') or []))
           for w in ws if essay_violations(w.get('essay') or [])]
    print(f'{date}: {len(ws)}幅 | 来源 {src} | 赏析违规 {len(bad)}')
    for b in bad[:3]:
        print('   ', b)
