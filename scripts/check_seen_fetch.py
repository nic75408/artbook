#!/usr/bin/env python3
"""验证 seen 传入后的候选拉取：各源配额是否拉满、来源均衡。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline import generate, config

seen = json.load(open('pipeline/seen.json')).get('seen', {})
print(f'seen 记录数: {len(seen)}')
cands = generate.fetch_candidates(seen)
total = len(cands)
paint = sum(1 for c in cands if generate.is_painting(c.classification))
print(f'候选总数: {total} | 绘画类: {paint} ({paint/max(total,1):.0%})')
src = {}
for c in cands:
    src[c.source] = src.get(c.source, 0) + 1
print('来源分布:', src)
# 均衡断言：Met 应该拉满配额 50（seen 内部跳过 + 多轮采样）
assert src.get('met', 0) >= 40, f'Met 候选不足: {src.get("met", 0)}'
print('PASS: Met 有效候选恢复')
