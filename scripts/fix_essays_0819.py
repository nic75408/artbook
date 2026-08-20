#!/usr/bin/env python3
"""修复 08-19 期 3 幅赏析违规。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

path = 'data/issues/2026-08-19.json'
d = json.load(open(path))

FIXES = {
    'cma-132015': (2, "作为一幅叙事画，它在氛围营造上略显「太干净」。林逋以「梅妻鹤子」著称，生平崇尚清苦孤高，但画中人物衣着整洁光鲜，神态从容优雅，更像是一位养尊处优的贵族在自家园林散步，而非真正在荒野月下独行的隐士。这种将苦行僧式的隐逸生活美化雅化的处理，是明代文人画常见的套路，虽悦目，却少了几分林逋原本的孤绝寒意。"),
    'cma-139815': (0, "托马斯·多尔蒂是美国哈德逊河派的先驱，也是首位以风景画为职业的美国画家。这幅《湖景》创作于 1830 年代，正值该画派确立美国风景画审美价值的初期。多尔蒂在此作中未追求后来同代人那种戏剧性的光影冲突，而是选择了一种更为内省、平和的视角，确立了早期美国风景画中“如画”（Picturesque）的基调。"),
    'cma-123024': (2, "尽管画家极力渲染基督肉体的痛苦，受难场景依然显得过于洁净与秩序井然。基督身上的伤口被描绘得克制而装饰化，缺乏后来文艺复兴绘画中那种血肉模糊的视觉冲击；四周圣徒的表情也保持着一种程式化的哀伤，而非撕心裂肺的绝望。这种“美化的受难”是当时锡耶纳画派的典型特征——他们更愿意呈现神性的完美，而非人性的残酷。"),
}

for wid, (idx, text) in FIXES.items():
    w = next(x for x in d['works'] if x['id'] == wid)
    w['essay'][idx] = text
    lens = [len(p) for p in w['essay']]
    v = essay_violations(w['essay'])
    print(f'{wid}: 段长 {lens} 总长 {sum(lens)} -> {"OK" if not v else v}')
    assert not v, f'{wid} 修复失败'

bad = [x['id'] for x in d['works'] if essay_violations(x.get('essay') or [])]
assert not bad, f'仍有违规: {bad}'
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
print('08-19 已写回，全期赏析硬约束全过')
