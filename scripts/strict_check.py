#!/usr/bin/env python3
"""严格体检：找出前端可能渲染成'空'的数据问题"""
import json
from pathlib import Path

for p in sorted(Path('data/issues').glob('*.json')):
    d = json.load(open(p))
    issues = []
    for w in d['works']:
        wid = w.get('id', '?')
        title = w.get('title_zh') or ''
        if not title.strip():
            issues.append(f'{wid}: title_zh 空白')
        if not (w.get('artist_zh') or '').strip():
            issues.append(f'{wid}: artist_zh 空白')
        # essay 段落级检查
        essay = w.get('essay')
        if not isinstance(essay, list):
            issues.append(f'{wid}: essay 非列表({type(essay).__name__})')
        else:
            empty_idx = [i for i, x in enumerate(essay) if not (x or '').strip()]
            if empty_idx:
                issues.append(f'{wid}: essay 有空段 {empty_idx}')
        # image 子字段
        img = w.get('image') or {}
        for k in ('feed', 'full', 'thumb'):
            if not (img.get(k) or '').strip():
                issues.append(f'{wid}: image.{k} 空')
        # 前端依赖的展示字段
        if not w.get('palette'):
            issues.append(f'{wid}: palette 缺失')
        if not w.get('image', {}).get('ratio'):
            issues.append(f'{wid}: ratio 缺失')
        # title_en（feed 显示）
        if not (w.get('title_en') or '').strip():
            issues.append(f'{wid}: title_en 空白')
    print(f'{p.name}: {"无问题" if not issues else str(len(issues)) + " 处"}')
    for i in issues[:10]:
        print('   ', i)
