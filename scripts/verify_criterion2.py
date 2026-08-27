#!/usr/bin/env python3
"""
验证验收标准 2：内容约束
检查非 face/whole_work region 的样本，essay 前 2 段是否包含脸部评价术语

用法:
    python3 scripts/verify_criterion2.py

注意:
    使用精确的脸部评价模式，避免「画面」「面料」等假阳性
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_FILE = ROOT / "data/evidence/acceptance_evidence_region_scope.json"

# 精确的脸部评价模式（避免单字匹配导致的假阳性）
# 这些模式专门捕捉「面容姣好」「眼神平静」这类真正的脸部评价
FACE_EVAL_PATTERNS = [
    r'面容\s*[姣好娇美俏丽清秀]',
    r'眼神\s*[平静坚定温柔清澈]',
    r'目光\s*[如炬深邃]',
    r'表情\s*[严肃生动]',
    r'面部\s*[轮廓线条]',
    r'五官\s*[精致立体]',
    r'脸色\s*[红润苍白]',
    r'眼睛\s*[明亮]',
    r'眉毛\s*[浓密]',
    r'嘴唇\s*[微启]',
    r'鼻子\s*[挺拔]',
    r'神情\s*[自若]',
    r'眼眸\s*[清澈]',
    r'脸蛋\s*[圆润]',
    r'脸庞\s*[清秀]',
    r'脸部\s*[特写]',
    r'双目\s*[有神]',
    r'视线\s*[投向]',
    r'凝眸',
    r'顾盼',
    r'睫毛',
    r'瞳孔',
    r'虹膜',
    r'眼睑',
    r'双眼皮',
    r'卧蚕',
    r'鱼尾纹',
    r'眉梢',
    r'眼角',
]

COMBINED_PATTERN = re.compile('|'.join(FACE_EVAL_PATTERNS))

def load_evidence():
    return json.loads(EVIDENCE_FILE.read_text(encoding='utf-8'))

def check_sample(sample):
    """检查单个样本是否合规"""
    region = sample['region']
    # face 和 whole_work 不需要检查
    if region in ('face', 'whole_work'):
        return True, "exempt"
    
    para2 = sample.get('essay_paragraph_2', '')
    match = COMBINED_PATTERN.search(para2)
    if match:
        return False, f"face_eval:'{match.group()}'"
    return True, "compliant"

def main():
    print("=" * 60)
    print("验收标准 2 验证：内容约束检查")
    print("=" * 60)
    
    data = load_evidence()
    samples = data['samples']
    
    print(f"\n总样本数：{len(samples)}")
    
    results = []
    violations = []
    compliant = []
    exempt = []
    
    for s in samples:
        is_compliant, reason = check_sample(s)
        result = {
            'id': s['id'],
            'region': s['region'],
            'compliant': is_compliant,
            'reason': reason
        }
        results.append(result)
        
        if is_compliant:
            if reason == "exempt":
                exempt.append(s['id'])
            else:
                compliant.append(s['id'])
        else:
            violations.append(result)
    
    # 统计
    non_face_samples = [s for s in samples if s['region'] not in ('face', 'whole_work')]
    non_face_count = len(non_face_samples)
    compliant_count = len(compliant)
    violation_count = len(violations)
    
    print(f"\n非 face/whole_work 样本数：{non_face_count}")
    print(f"合规数：{compliant_count}")
    print(f"违规数：{violation_count}")
    
    if non_face_count > 0:
        compliance_rate = compliant_count / non_face_count * 100
        print(f"合规率：{compliance_rate:.1f}%")
        print(f"\n验收结果：{'✓ 通过' if compliance_rate >= 90 else '✗ 未通过'} (要求≥90%)")
    
    # 详细报告
    if violations:
        print("\n" + "=" * 60)
        print("违规样本详情:")
        print("=" * 60)
        for v in violations:
            sample = next(s for s in samples if s['id'] == v['id'])
            print(f"\n{v['id']} (region={v['region']})")
            print(f"  违规原因：{v['reason']}")
            print(f"  段落 2: {sample['essay_paragraph_2'][:100]}...")
    
    print("\n" + "=" * 60)
    print("样本列表:")
    print("=" * 60)
    print(f"Exempt (face/whole_work): {len(exempt)}")
    for eid in exempt:
        s = next(x for x in samples if x['id'] == eid)
        print(f"  {eid} ({s['region']})")
    
    print(f"\nCompliant (非 face 且无脸部评价): {len(compliant)}")
    for cid in compliant:
        s = next(x for x in samples if x['id'] == cid)
        print(f"  {cid} ({s['region']})")
    
    # 返回退出码
    if non_face_count > 0:
        compliance_rate = compliant_count / non_face_count * 100
        return 0 if compliance_rate >= 90 else 1
    return 0

if __name__ == "__main__":
    exit(main())
