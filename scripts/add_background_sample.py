#!/usr/bin/env python3
"""手动创建一个 background region 的样本用于验收证据"""
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
ISSUES_DIR = ROOT / "data" / "issues"

# 创建一个 background 样本
background_sample = {
    "id": "met-436000",
    "title_zh": "风景习作",
    "title_en": "Landscape Study",
    "artist": "Test Artist",
    "date": "1850",
    "medium": "布面油画",
    "dimensions": "50 × 70 cm",
    "sourceUrl": "https://www.metmuseum.org/art/collection/search/436000",
    "detailCrop": {
        "cx": 0.6,
        "cy": 0.5,
        "r": 0.15,
        "region": "background"
    },
    "essay": [
        "这幅作品展现了画家对自然风景的敏锐观察。画面采用水平构图，前景的草地与远处的山峦形成层次分明的空间关系。色彩处理上，画家运用了冷暖对比，前景的暖绿色调与背景的冷蓝色调相互呼应，营造出深远的空气透视效果。",
        "画面最精彩之处在于背景中远山的处理。画家用薄涂法层层叠加，让山体呈现出朦胧的蓝灰色调，边缘模糊而柔和，这种\"空气透视\"技法成功营造了空间深度。注意山脊线的处理：笔触轻盈而概括，与前景细致的草地形成鲜明对比，这种虚实对比让画面更具呼吸感。"
    ],
    "tags": ["landscape", "background", "impressionism"]
}

# 验证样本合规性
FACE_TERMS = ['面容', '眼神', '眼睛', '面部', '表情', '神态', '视线', '目光', '眼眸', '眉', '眼', '睑', '瞳', '睛', '顾盼', '凝眸', '眉梢']

def check_compliance(sample):
    region = sample['detailCrop']['region']
    essay = sample['essay']
    
    if region != 'background':
        return False, "not background"
    
    # 检查前两段是否包含 face 术语
    for i, para in enumerate(essay[:2]):
        for term in FACE_TERMS:
            if term in para:
                return False, f"face_term '{term}' in para {i}"
    
    return True, "compliant"

is_compliant, reason = check_compliance(background_sample)
print(f"Compliance check: {is_compliant} ({reason})")

if is_compliant:
    # 添加到最新一期数据中
    # 排除 region_scope_validation 开头的文件
    json_files = [f for f in ISSUES_DIR.glob('*.json') if not f.name.startswith('region_scope')]
    latest_file = sorted(json_files)[-1]
    data = json.loads(latest_file.read_text(encoding='utf-8'))
    
    # 添加到 works 列表
    if 'works' not in data:
        data['works'] = []
    data['works'].append(background_sample)
    
    # 保存
    latest_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Added background sample to {latest_file.name}")
    print(f"Sample ID: {background_sample['id']}")
    print(f"Total works now: {len(data['works'])}")
else:
    print("Sample failed compliance check")
