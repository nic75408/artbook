#!/usr/bin/env python3
"""验证 detailCrop.region 与 essay 内容的匹配性，生成 QA 报告。

验收标准 1: region ↔ scope 一致性验证
验收标准 2: 内容约束验证（非 face region 的前两段不应出现 face 相关词汇）
"""
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
ISSUES_DIR = ROOT / "data" / "issues"

VALID_REGIONS = {"face", "torso_neck", "clothing", "background", "whole_work"}

# face 相关词汇（用于检测内容约束违规）
FACE_TERMS = [
    '面容', '眼神', '眼睛', '面部', '表情', '神态', '视线', '目光',
    '眼眸', '眉', '眼', '睑', '瞳', '睛', '顾盼', '凝眸', '眉梢'
]

# region → 应该关注的描写对象
REGION_SCOPE_MAP = {
    "face": ["面容", "眼神", "表情", "眼部", "眉", "唇", "鼻", "脸颊"],
    "torso_neck": ["颈部", "肩膀", "躯干", "姿态", "手势", "手臂"],
    "clothing": ["衣物", "纹理", "面料", "褶皱", "服饰", "袍", "裙", "袖"],
    "background": ["背景", "环境", "建筑", "风景", "城市", "室内"],
    "whole_work": ["构图", "整体", "全局", "画面"]
}


def check_face_terms_in_paragraph(para_text, region):
    """检查段落中是否包含与 region 不匹配的 face 术语"""
    if region in ("face", "whole_work"):
        return []  # face 或整体评价允许出现 face 术语
    
    violations = []
    for term in FACE_TERMS:
        if term in para_text:
            violations.append(term)
    return violations


def process_issue(filepath):
    """处理单个期文件，返回样本统计和违规记录"""
    data = json.loads(filepath.read_text(encoding="utf-8"))
    samples = []
    violations = []
    
    for work in data.get("works", []):
        crop = work.get("detailCrop", {})
        region = crop.get("region", "unknown")
        essay = work.get("essay", [])
        
        sample = {
            "id": work["id"],
            "title_zh": work.get("title_zh", ""),
            "region": region,
            "essay_length": len(essay),
            "scope_mapping": f"region_{region}" if region != "whole_work" else "whole_work",
            "violations": []
        }
        
        # 检查前两段（索引 0 和 1）
        for i, para in enumerate(essay[:2]):
            face_violations = check_face_terms_in_paragraph(para, region)
            if face_violations:
                violation = {
                    "paragraph_index": i,
                    "type": "face_term_in_non_face_region",
                    "terms_found": face_violations,
                    "preview": para[:100] + "..." if len(para) > 100 else para
                }
                sample["violations"].append(violation)
                violations.append({
                    "work_id": work["id"],
                    "region": region,
                    **violation
                })
        
        samples.append(sample)
    
    return samples, violations


def main():
    print("=" * 60)
    print("作品局部图与正文内容匹配验证报告")
    print(f"生成时间：{datetime.now().isoformat()}")
    print("=" * 60)
    print()
    
    all_samples = []
    all_violations = []
    region_counts = {}
    
    # 处理最近 15 期的数据
    issue_files = sorted(ISSUES_DIR.glob("*.json"))[-15:]
    
    for filepath in issue_files:
        if "region_scope_log" in filepath.name:
            continue
        
        samples, violations = process_issue(filepath)
        all_samples.extend(samples)
        all_violations.extend(violations)
        
        for s in samples:
            region = s["region"]
            region_counts[region] = region_counts.get(region, 0) + 1
    
    # 统计摘要
    total_samples = len(all_samples)
    total_violations = len(all_violations)
    violation_rate = total_violations / total_samples * 100 if total_samples > 0 else 0
    
    print(f"样本总数：{total_samples}")
    print(f"Region 分布：{region_counts}")
    print(f"违规总数：{total_violations}")
    print(f"违规率：{violation_rate:.2f}%")
    print()
    
    # 验收标准 1: region ↔ scope 映射一致性
    print("【验收标准 1】region ↔ scope 映射一致性")
    print("-" * 40)
    valid_mapping_count = sum(1 for s in all_samples if s["region"] in VALID_REGIONS)
    print(f"有效 region 映射：{valid_mapping_count}/{total_samples}")
    print()
    
    # 验收标准 2: 内容约束验证
    print("【验收标准 2】内容约束验证（非 face region 避免 face 术语）")
    print("-" * 40)
    non_face_samples = [s for s in all_samples if s["region"] not in ("face", "whole_work")]
    non_face_violations = [v for v in all_violations if v["region"] not in ("face", "whole_work")]
    
    compliant_count = len(non_face_samples) - len(non_face_violations)
    compliance_rate = compliant_count / len(non_face_samples) * 100 if non_face_samples else 0
    
    print(f"非 face/whole_work 样本数：{len(non_face_samples)}")
    print(f"合规样本数：{compliant_count}")
    print(f"合规率：{compliance_rate:.2f}% (验收要求：≥90%)")
    print()
    
    if non_face_violations:
        print("违规详情:")
        for v in non_face_violations[:10]:  # 只显示前 10 条
            print(f"  - {v['work_id']} (region={v['region']})")
            print(f"    段落[{v['paragraph_index']}] 包含 face 术语：{v['terms_found']}")
            print(f"    预览：{v['preview']}")
        if len(non_face_violations) > 10:
            print(f"  ... 还有 {len(non_face_violations) - 10} 条违规")
    print()
    
    # 生成 JSON 日志
    log_data = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_samples": total_samples,
            "region_distribution": region_counts,
            "total_violations": total_violations,
            "violation_rate": violation_rate,
            "non_face_samples": len(non_face_samples),
            "compliant_count": compliant_count,
            "compliance_rate": compliance_rate
        },
        "acceptance_criteria": {
            "criterion_1_passed": valid_mapping_count == total_samples,
            "criterion_2_passed": compliance_rate >= 90
        },
        "samples": all_samples,
        "violations": all_violations
    }
    
    log_path = ISSUES_DIR / f"region_scope_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    log_path.write_text(json.dumps(log_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"验证日志已保存：{log_path}")
    
    # 返回退出码（用于 CI）
    if compliance_rate < 90:
        print("\n❌ 验收失败：合规率低于 90%")
        return 1
    else:
        print("\n✅ 验收通过：合规率 ≥90%")
        return 0


if __name__ == "__main__":
    exit(main())
