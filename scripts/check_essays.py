#!/usr/bin/env python3
"""§10 验收辅助：赏析硬约束自动检查。

规则与 pipeline/generate.py 的 essay_violations 一致：
- 段数 2-4；每段 60-150 字；总长 250-450
- 每段破折号（——）≤1
- 禁用句式「不仅…更…」（配对检测，单字不误报）
- 禁用词：叹为观止/无与伦比/淋漓尽致/值得一提的是/见证了/让我们/细细品味
- detailCrop.r ∈ [0.08, 0.3]；tags 2-6 个
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations  # noqa: E402


def check_work(w):
    issues = []
    essay = w.get("essay") or []
    if not (2 <= len(essay) <= 4):
        issues.append(f"段数 {len(essay)} 越界(2-4)")
    issues += essay_violations(essay)   # 含段长/总长/破折号/禁词/禁用句式
    crop = w.get("detailCrop") or {}
    if not (0.08 <= crop.get("r", 0) <= 0.3):
        issues.append(f"detailCrop.r={crop.get('r')} 越界")
    tags = w.get("tags") or []
    if not (2 <= len(tags) <= 6):
        issues.append("tags 数量越界")
    for k in ("id", "title_zh", "artist_zh", "artist_id", "medium_zh", "movement_zh",
              "credit", "sourceUrl"):
        if not w.get(k):
            issues.append(f"缺字段 {k}")
    img = w.get("image") or {}
    for k in ("feed", "full", "thumb"):
        if not img.get(k):
            issues.append(f"缺 image.{k}")
    return issues


def main(path):
    d = json.load(open(path, encoding="utf-8"))
    works = d["works"]
    print(f"期 {d['date']} 共 {len(works)} 幅\n")
    bad = 0
    for w in works:
        iss = check_work(w)
        if iss:
            bad += 1
        print(f"{'OK ' if not iss else 'BAD'} {w['id']:18s} {w['title_zh'][:24]:26s} "
              f"段={len(w['essay'])} 总长={sum(len(p) for p in w['essay'])}")
        for i in iss:
            print(f"      - {i}")
    print(f"\n共 {len(works)} 幅，{bad} 幅有硬约束问题")
    return bad


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1]) > 0 else 0)
