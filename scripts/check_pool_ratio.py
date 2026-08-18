#!/usr/bin/env python3
"""候选池绘画占比快速验证（不调 LLM，只跑 1/8 拉取候选）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import generate

cands = generate.fetch_candidates()
total = len(cands)
paint = sum(1 for c in cands if generate.is_painting(c.classification))
print(f'候选总数: {total} | 绘画类: {paint} ({paint/max(total,1):.0%})')
src = {}
for c in cands:
    src[c.source] = src.get(c.source, 0) + 1
print('来源分布:', src)
src_paint = {}
for c in cands:
    if generate.is_painting(c.classification):
        src_paint[c.source] = src_paint.get(c.source, 0) + 1
print('各源绘画数:', src_paint)
assert paint / max(total, 1) >= 0.7, '候选池绘画占比仍 < 70%'
print('PASS: 候选池绘画占比达标')
