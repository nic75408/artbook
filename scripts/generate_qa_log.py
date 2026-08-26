#!/usr/bin/env python3
"""生成 region↔scope 验证日志，用于验收标准 1 和 2 的证据。

输出：
- data/issues/region_scope_qa_log.json: 包含至少 10 个样本的详细 QA 记录
- 打印验收结果摘要
"""
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
ISSUES_DIR = ROOT / "data" / "issues"

FACE_TERMS = ['面容', '眼神', '眼睛', '面部', '表情', '神态', '视线', '目光', '眼眸', '眉', '眼', '睑', '瞳', '睛', '顾盼', '凝眸', '眉梢']

VALID_REGIONS = {"face", "torso_neck", "clothing", "background", "whole_work"}


def check_compliance(work):
    """检查单个作品是否合规"""
    region = work.get("detailCrop", {}).get("region", "unknown")
    essay = work.get("essay", [])
    
    # 检查 region 有效性
    region_valid = region in VALID_REGIONS
    
    # 检查 face 术语违规（仅针对非 face/whole_work）
    face_violations = []
    if region not in ("face", "whole_work"):
        for i, para in enumerate(essay[:2]):
            for term in FACE_TERMS:
                if term in para:
                    face_violations.append({
                        "paragraph_index": i,
                        "term": term
                    })
    
    is_compliant = region_valid and len(face_violations) == 0
    
    return {
        "id": work["id"],
        "title_zh": work.get("title_zh", ""),
        "region": region,
        "scope": f"region_{region}" if region != "whole_work" else "whole_work",
        "region_valid": region_valid,
        "face_violations": face_violations,
        "is_compliant": is_compliant,
        "essay_preview": essay[1][:100] if len(essay) > 1 else ""
    }


def main():
    print("=" * 70)
    print("作品局部图与正文内容匹配 QA 验证日志")
    print(f"生成时间：{datetime.now().isoformat()}")
    print("=" * 70)
    print()
    
    all_samples = []
    compliant_samples = []
    region_counts = {}
    
    # 遍历所有期文件
    issue_files = sorted(ISSUES_DIR.glob("*.json"))
    for filepath in issue_files:
        if "region_scope" in filepath.name or "validation" in filepath.name:
            continue
        
        data = json.loads(filepath.read_text(encoding="utf-8"))
        for work in data.get("works", []):
            result = check_compliance(work)
            result["date"] = filepath.stem
            all_samples.append(result)
            
            region = result["region"]
            region_counts[region] = region_counts.get(region, 0) + 1
            
            if result["is_compliant"]:
                compliant_samples.append(result)
    
    # 统计
    total = len(all_samples)
    compliant_count = len(compliant_samples)
    compliance_rate = compliant_count / total * 100 if total > 0 else 0
    
    # 按 region 分组统计合规率
    region_stats = {}
    for region in VALID_REGIONS:
        region_samples = [s for s in all_samples if s["region"] == region]
        region_compliant = [s for s in region_samples if s["is_compliant"]]
        region_stats[region] = {
            "total": len(region_samples),
            "compliant": len(region_compliant),
            "rate": len(region_compliant) / len(region_samples) * 100 if region_samples else 0
        }
    
    # 验收标准 1: region ↔ scope 映射一致性
    print("【验收标准 1】region ↔ scope 映射一致性")
    print("-" * 50)
    valid_region_count = sum(1 for s in all_samples if s["region_valid"])
    print(f"有效 region 样本：{valid_region_count}/{total}")
    print(f"Region 分布：{region_counts}")
    print()
    
    # 验收标准 2: 内容约束验证
    print("【验收标准 2】内容约束验证（非 face region 避免 face 术语）")
    print("-" * 50)
    non_face_samples = [s for s in all_samples if s["region"] not in ("face", "whole_work")]
    non_face_compliant = [s for s in non_face_samples if s["is_compliant"]]
    non_face_rate = len(non_face_compliant) / len(non_face_samples) * 100 if non_face_samples else 0
    
    print(f"非 face/whole_work 样本数：{len(non_face_samples)}")
    print(f"合规样本数：{len(non_face_compliant)}")
    print(f"合规率：{non_face_rate:.2f}% (验收要求：≥90%)")
    print()
    
    # 生成 QA 日志（至少 10 个合规样本）
    qa_log = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_samples": total,
            "compliant_count": compliant_count,
            "compliance_rate": compliance_rate,
            "region_distribution": region_counts,
            "region_stats": region_stats
        },
        "acceptance_criteria": {
            "criterion_1": {
                "description": "region ↔ scope 映射一致性",
                "passed": valid_region_count == total,
                "evidence": f"{valid_region_count}/{total} 样本具有有效 region"
            },
            "criterion_2": {
                "description": "内容约束验证（非 face region 合规率≥90%）",
                "passed": non_face_rate >= 90,
                "evidence": f"{len(non_face_compliant)}/{len(non_face_samples)} = {non_face_rate:.2f}%"
            }
        },
        "qa_samples": compliant_samples[:15]  # 取前 15 个合规样本作为证据
    }
    
    # 保存日志
    log_path = ISSUES_DIR / "region_scope_qa_log.json"
    log_path.write_text(json.dumps(qa_log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"QA 日志已保存：{log_path}")
    print()
    
    # 打印合规样本清单
    print("【合规样本清单】（用于验收证据）")
    print("-" * 50)
    for i, s in enumerate(compliant_samples[:15], 1):
        print(f"{i}. {s['id']} | region={s['region']} | {s['title_zh']}")
        print(f"   期数：{s['date']} | 第 2 段：{s['essay_preview']}...")
    print()
    
    # 最终判定
    print("=" * 70)
    if valid_region_count == total and non_face_rate >= 90:
        print("✅ 验收通过：所有验收标准均满足")
        return 0
    else:
        print("❌ 验收失败：")
        if valid_region_count != total:
            print(f"   - 验收标准 1 失败：{total - valid_region_count} 个样本 region 无效")
        if non_face_rate < 90:
            print(f"   - 验收标准 2 失败：合规率 {non_face_rate:.2f}% < 90%")
        return 1


if __name__ == "__main__":
    exit(main())
