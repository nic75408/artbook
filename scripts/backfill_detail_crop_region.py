#!/usr/bin/env python3
"""后填充脚本：为已存在的detailCrop数据添加region字段。

分析现有detailCrop的cx/cy/r坐标，基于启发式规则推断region类型：
- face: 圆形局部位于画面上半部且较小（r <= 0.18, cy <= 0.5）
- clothing: 圆形局部位于画面下半部（cy > 0.5）
- background: 圆形局部位于画面边缘或较大区域
- whole_work: 圆形位于中心且较大（接近0.5, 0.4）
- torso_neck: 画面中部偏上

使用方式：
  python scripts/backfill_detail_crop_region.py [--check]
  --check: 只检查，不修改文件
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ISSUES_DIR = ROOT / "data" / "issues"

VALID_REGIONS = {"face", "torso_neck", "clothing", "background", "whole_work"}


def infer_region(crop):
    """基于坐标推断region类型"""
    cx = crop.get("cx", 0.5)
    cy = crop.get("cy", 0.4)
    r = crop.get("r", 0.18)

    # 中心区域且较大 -> 可能是整体构图
    if abs(cx - 0.5) < 0.15 and abs(cy - 0.4) < 0.15 and r >= 0.15:
        return "whole_work"

    # 上半部且较小的局部 -> 可能是面部
    if cy <= 0.4 and r <= 0.18:
        return "face"

    # 中部偏上 -> 躯干/颈部
    if 0.3 <= cy <= 0.55:
        return "torso_neck"

    # 下半部 -> 衣物
    if cy > 0.55:
        return "clothing"

    # 边缘区域 -> 背景
    if cx < 0.2 or cx > 0.8 or cy < 0.2 or cy > 0.8:
        return "background"

    # 默认
    return "whole_work"


def process_issue(filepath, dry_run=True):
    """处理单个期文件"""
    data = json.loads(filepath.read_text(encoding="utf-8"))
    modified = False
    stats = {"total": 0, "added": 0, "existing": 0}

    for work in data.get("works", []):
        stats["total"] += 1
        crop = work.get("detailCrop")
        if not crop:
            continue

        if "region" in crop:
            stats["existing"] += 1
            continue

        region = infer_region(crop)
        crop["region"] = region
        stats["added"] += 1
        modified = True

    if modified and not dry_run:
        filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return stats


def main():
    ap = argparse.ArgumentParser(description="后填充detailCrop.region字段")
    ap.add_argument("--check", action="store_true", help="只检查不修改")
    args = ap.parse_args()

    dry_run = args.check
    mode = "[DRY-RUN]" if dry_run else "[WRITE]"

    total_stats = {"total": 0, "added": 0, "existing": 0}

    for filepath in sorted(ISSUES_DIR.glob("*.json")):
        stats = process_issue(filepath, dry_run=dry_run)
        total_stats["total"] += stats["total"]
        total_stats["added"] += stats["added"]
        total_stats["existing"] += stats["existing"]

        if stats["added"] > 0 or stats["existing"] > 0:
            print(f"{mode} {filepath.name}: "
                  f"total={stats['total']}, added={stats['added']}, existing={stats['existing']}")

    print(f"\n{mode} 汇总: {total_stats}")

    if dry_run:
        print("\n使用 --write 参数执行实际写入（如需修改）")


if __name__ == "__main__":
    main()
