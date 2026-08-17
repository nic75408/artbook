#!/usr/bin/env python3
"""修复 08-15 期 cma-171078 第1段 157→150 字。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

path = 'data/issues/2026-08-15.json'
d = json.load(open(path))
w = next(x for x in d['works'] if x['id'] == 'cma-171078')
w['essay'][0] = ("亨利·博恩是英国皇家艺术学院珐琅画的领军人物，以将提香等大师的巨作微缩于方寸之间而闻名。"
                 "这幅作于 1808 至 1811 年间的《酒神与阿里阿德涅》，是对提香同名杰作的致敬与再创造。"
                 "在摄影术尚未普及的年代，这种高精度微缩复制品是贵族收藏经典图像的重要方式，"
                 "展现当时英国画坛对意大利文艺复兴的狂热崇拜。")
lens = [len(p) for p in w['essay']]
v = essay_violations(w['essay'])
print(f'cma-171078: 段长 {lens} 总长 {sum(lens)} -> {"OK" if not v else v}')
assert not v
bad = [x['id'] for x in d['works'] if essay_violations(x.get('essay') or [])]
assert not bad, f'仍有违规: {bad}'
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
print('08-15 期已写回，全期赏析硬约束全过')
