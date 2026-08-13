#!/usr/bin/env python3
"""§10 验收：任一数据源整体不可用时，其余源补足到 CANDIDATE_TARGET。"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline import config  # noqa: E402
from pipeline import generate  # noqa: E402
from pipeline.sources import met  # noqa: E402

# 模拟 Met 整体不可用（抛异常）
met.fetch_candidates = lambda n: (_ for _ in ()).throw(RuntimeError("met down"))

total = len(generate.fetch_candidates())
ok = total >= config.CANDIDATE_TARGET
print(f"[met 不可用] 其余源补足候选总数 {total} -> {'OK' if ok else 'FAIL'}")
sys.exit(0 if ok else 1)
