#!/usr/bin/env python3
"""§10 验收辅助：赏析硬约束自动检查（字数/段数/禁用句式/破折号/字段完整性）。"""
import json
import re
import sys

FORBIDDEN = ["不仅", "更", "见证了", "淋漓尽致", "值得一提的是", "让我们", "细细品味",
             "无与伦比", "叹为观止", "叹为观止的"]

def check_work(w):
    issues = []
    essay = w.get("essay") or []
    if not (2 <= len(essay) <= 4):
        issues.append(f"段数 {len(essay)} 越界(2-4)")
    total = 0
    for i, p in enumerate(essay):
        n = len(p)
        total += n
        if not (60 <= n <= 150):
            issues.append(f"段{i+1} 字数 {n} 越界(60-150)")
        if p.count("——") + p.count("—") > 1:
            issues.append(f"段{i+1} 破折号>1")
        for f in FORBIDDEN:
            if f in p:
                issues.append(f"段{i+1} 含禁用词「{f}」")
    if not (250 <= total <= 450):
        issues.append(f"总长 {total} 越界(250-450)")
    # 排比三连（简单启发：三个及以上同结构短句）
    for i, p in enumerate(essay):
        if len(re.findall(r"[，,]([^，。]{2,12})[，,]\1[，,]\1", p)):
            issues.append(f"段{i+1} 疑似排比三连")
    crop = w.get("detailCrop") or {}
    if not (0.08 <= crop.get("r", 0) <= 0.3):
        issues.append(f"detailCrop.r={crop.get('r')} 越界")
    if not (2 <= len(w.get("tags") or []) <= 6):
        issues.append("tags 数量越界")
    for k in ("id", "title_zh", "artist_zh", "artist_id", "medium_zh", "movement_zh",
              "date_display", "credit", "sourceUrl"):
        if not w.get(k):
            issues.append(f"缺字段 {k}")
    img = w.get("image") or {}
    for k in ("feed", "full", "thumb"):
        if not img.get(k):
            issues.append(f"缺 image.{k}")
    return issues

def main(path):
    raw = open(path, encoding="utf-8").read()
    start = raw.find("{\n  \"v\": 1")
    if start < 0:
        start = raw.find('{"v": 1')
    issue = json.loads(raw[start:])
    works = issue["works"]
    print(f"期 {issue['date']} 共 {len(works)} 幅\n")
    bad = 0
    for w in works:
        iss = check_work(w)
        status = "OK " if not iss else "BAD"
        if iss:
            bad += 1
        print(f"{status} {w['id']:18s} {w['title_zh'][:24]:26s} essay段数={len(w['essay'])} 总长={sum(len(p) for p in w['essay'])}")
        for i in iss:
            print(f"      - {i}")
    print(f"\n共 {len(works)} 幅，{bad} 幅有硬约束问题")
    return bad

if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1]) > 0 else 0)
