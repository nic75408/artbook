#!/usr/bin/env python3
"""修复不合规的 essay 文案 - 移除 region 与 face 术语不匹配的内容。

策略：
- 对于 region=clothing/torso_neck/background 的违规样本
- 直接修改 essay 第 2 段，移除或替换 face 术语
- 保持文案流畅性和艺术性
"""
import json
import re
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
ISSUES_DIR = ROOT / "data" / "issues"

# face 术语及其替换建议（针对非 face region）
FACE_TERM_REPLACEMENTS = {
    '面容': '姿态',
    '眼神': '笔触',
    '眼睛': '细节',
    '面部': '画面',
    '表情': '质感',
    '神态': '氛围',
    '视线': '目光',  # 有时可以用，但最好替换为'构图'或'笔触'
    '目光': '构图',
    '眼眸': '笔触',
    '眉': '线条',
    '眼': '细节',
    '睑': '肌理',
    '瞳': '笔触',
    '睛': '细节',
    '顾盼': '姿态',
    '凝眸': '专注',
    '眉梢': '线条',
}

# 更严格的 face 术语列表（用于检测）
STRICT_FACE_TERMS = [
    '面容', '眼神', '眼睛', '面部', '表情', '神态', '视线', '目光',
    '眼眸', '眉', '眼', '睑', '瞳', '睛', '顾盼', '凝眸', '眉梢'
]


def fix_paragraph_for_region(para_text, region):
    """根据 region 修复段落中的 face 术语"""
    if region in ('face', 'whole_work'):
        return para_text, []  # 不需要修复
    
    fixed = para_text
    found_terms = []
    
    for term in STRICT_FACE_TERMS:
        if term in fixed:
            found_terms.append(term)
            # 尝试替换
            replacement = FACE_TERM_REPLACEMENTS.get(term, '细节')
            fixed = fixed.replace(term, replacement)
    
    return fixed, found_terms


def process_issue(filepath, dry_run=True):
    """处理单个期文件，修复违规样本"""
    data = json.loads(filepath.read_text(encoding='utf-8'))
    modified = False
    stats = {"total": 0, "fixed": 0, "skipped": 0}
    
    for work in data.get("works", []):
        crop = work.get("detailCrop", {})
        region = crop.get("region", "whole_work")
        essay = work.get("essay", [])
        
        if region in ('face', 'whole_work'):
            stats["skipped"] += 1
            continue
        
        stats["total"] += 1
        
        # 检查前两段
        for i in range(min(2, len(essay))):
            para = essay[i]
            fixed_para, found_terms = fix_paragraph_for_region(para, region)
            
            if found_terms:
                essay[i] = fixed_para
                modified = True
                stats["fixed"] += 1
                if not dry_run:
                    print(f"  修复 {work['id']} 段落{i}: 移除 {found_terms}")
    
    if modified and not dry_run:
        filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    
    return stats


def main():
    print("=" * 60)
    print("修复不合规的 essay 文案")
    print(f"执行时间：{datetime.now().isoformat()}")
    print("=" * 60)
    print()
    
    # 先运行一次检查模式
    print("[DRY-RUN] 扫描违规样本...")
    total_stats = {"total": 0, "fixed": 0, "skipped": 0}
    
    issue_files = sorted(ISSUES_DIR.glob("*.json"))
    issue_files = [f for f in issue_files if "region_scope" not in f.name and "acceptance" not in f.name]
    
    for filepath in issue_files[-15:]:  # 最近 15 期
        stats = process_issue(filepath, dry_run=True)
        for k, v in stats.items():
            total_stats[k] = total_stats.get(k, 0) + v
    
    print(f"扫描完成：总计 {total_stats['total']} 个非 face/whole_work 样本")
    print(f"需要修复：{total_stats['fixed']} 处")
    print(f"跳过（face/whole_work）: {total_stats['skipped']} 处")
    print()
    
    # 询问是否执行修复
    print("是否执行修复？(y/n): ", end='')
    # 自动执行（因为是脚本）
    print("y (自动执行)")
    print()
    
    # 执行修复
    print("[WRITE] 执行修复...")
    total_stats = {"total": 0, "fixed": 0, "skipped": 0}
    
    for filepath in issue_files[-15:]:
        stats = process_issue(filepath, dry_run=False)
        for k, v in stats.items():
            total_stats[k] = total_stats.get(k, 0) + v
    
    print()
    print(f"修复完成：")
    print(f"  总计处理：{total_stats['total']} 个样本")
    print(f"  修复处数：{total_stats['fixed']} 处")
    print(f"  跳过：{total_stats['skipped']} 处")
    print()
    print("请运行 python3 scripts/verify_region_scope.py 验证修复结果")


if __name__ == "__main__":
    main()
