#!/usr/bin/env python3
"""体检：各期 AIC 作品分布（Cloudflare 403 影响范围）"""
import json
from pathlib import Path

for p in sorted(Path('data/issues').glob('*.json')):
    d = json.load(open(p))
    ws = d['works']
    aic = [w for w in ws if w['id'].startswith('aic-')]
    line = f"{p.name}: {len(ws)}幅, aic {len(aic)}幅"
    if aic:
        line += " | 首个 aic image: " + aic[0]['image']['feed'][:70]
    print(line)
