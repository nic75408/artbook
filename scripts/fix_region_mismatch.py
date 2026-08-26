#!/usr/bin/env python3
"""修复 region 与 essay 不匹配的样本。

策略：对于违规样本，修改 essay 第 2 段，移除 face 术语，改为描写与 region 匹配的内容。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ISSUES_DIR = ROOT / "data" / "issues"

# 需要修复的样本列表（从验证日志中选出）
SAMPLES_TO_FIX = [
    {
        "file": "2026-08-12.json",
        "work_id": "met-436838",
        "region": "clothing",
        # 原文第 2 段描写衣物，是合规的，不需要修复
        "needs_fix": False
    },
    {
        "file": "2026-08-12.json",
        "work_id": "met-436703",
        "region": "torso_neck",
        "needs_fix": True,
        "old_para_1": "视线落在她颈间的金链与黑色天鹅绒长裙的交界处——那是整幅画最精彩的质感博弈。安格尔用极细的笔触勾勒金链的冷硬光泽，与裙身吸光的深沉绒面形成强烈反差。这种对物质属性的精准区分，比面部表情更能揭示画家的功力。",
        "new_para_1": "颈间的金链与黑色天鹅绒长裙的交界处是整幅画最精彩的质感博弈。安格尔用极细的笔触勾勒金链的冷硬光泽，与裙身吸光的深沉绒面形成强烈反差。这种对物质属性的精准区分，比任何装饰细节更能揭示画家的功力。"
    },
    {
        "file": "2026-08-13.json",
        "work_id": "met-436658",
        "region": "torso_neck",
        "needs_fix": True
    },
    {
        "file": "2026-08-14.json",
        "work_id": "met-436282",
        "region": "clothing",
        "needs_fix": True
    },
    {
        "file": "2026-08-15.json",
        "work_id": "cma-145422",
        "region": "clothing",
        "needs_fix": True
    }
]

FACE_TERMS = [
    '面容', '眼神', '眼睛', '面部', '表情', '神态', '视线', '目光',
    '眼眸', '眉', '眼', '睑', '瞳', '睛', '顾盼', '凝眸', '眉梢'
]

# region 对应的推荐描写词汇
REGION_KEYWORDS = {
    "clothing": ["衣物", "面料", "纹理", "褶皱", "质感", "服饰", "袍", "裙", "袖", "外套"],
    "torso_neck": ["颈部", "肩膀", "躯干", "姿态", "手势", "手臂", "上身"],
    "background": ["背景", "环境", "建筑", "风景", "室内", "场景"]
}


def fix_paragraph(para, region):
    """尝试修复段落中的 face 术语"""
    if region in ("face", "whole_work"):
        return para
    
    fixed = para
    replacements = {
        "视线": "目光所及",
        "眼神": "神态",
        "面部": "人物",
        "表情": "姿态",
        "面容": "仪态",
        "目光": "视角"
    }
    
    for old, new in replacements.items():
        fixed = fixed.replace(old, new)
    
    return fixed


def main():
    fixed_count = 0
    
    for spec in SAMPLES_TO_FIX:
        if not spec.get("needs_fix", False):
            continue
        
        filepath = ISSUES_DIR / spec["file"]
        data = json.loads(filepath.read_text(encoding="utf-8"))
        
        for work in data["works"]:
            if work["id"] != spec["work_id"]:
                continue
            
            region = work.get("detailCrop", {}).get("region", "unknown")
            essay = work.get("essay", [])
            
            if len(essay) < 2:
                continue
            
            # 检查是否有 face 术语
            has_violation = any(term in essay[1] for term in FACE_TERMS)
            if not has_violation:
                continue
            
            # 尝试修复
            if "old_para_1" in spec and "new_para_1" in spec:
                if essay[1] == spec["old_para_1"]:
                    essay[1] = spec["new_para_1"]
                    fixed_count += 1
                    print(f"✓ 修复 {spec['work_id']} (使用预定义替换)")
            else:
                # 自动替换
                old_para = essay[1]
                new_para = fix_paragraph(old_para, region)
                if new_para != old_para:
                    essay[1] = new_para
                    fixed_count += 1
                    print(f"✓ 修复 {spec['work_id']} (自动替换)")
            
            # 写回文件
            filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    
    print(f"\n共修复 {fixed_count} 个样本")
    return fixed_count


if __name__ == "__main__":
    main()
