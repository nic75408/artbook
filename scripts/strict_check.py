#!/usr/bin/env python3
"""严格体检：复用发布闸门 validate_work（pipeline/validate.py），
找出会渲染成'空'或违反硬约束的数据（t_866be207 与闸门同一套规则）。

运行：repo 根目录下 `.venv/bin/python scripts/strict_check.py`
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline.validate import validate_work  # noqa: E402

for p in sorted(Path('data/issues').glob('*.json')):
    d = json.load(open(p))
    issues = []
    for w in d['works']:
        wid = w.get('id', '?')
        for e in validate_work(w):
            issues.append(f'{wid}: {e}')
    print(f'{p.name}: {"无问题" if not issues else str(len(issues)) + " 处"}')
    for i in issues[:10]:
        print('   ', i)
