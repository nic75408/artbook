#!/usr/bin/env python3
"""修复 08-20 重跑版 3 幅赏析违规。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

path = 'data/issues/2026-08-20.json'
d = json.load(open(path))

FIXES = {
    'met-436706': [  # 总长 471 → 449
        "安格尔是新古典主义的集大成者，以线条的纯净与构图的严谨著称。这幅 1823 年的肖像画于他重返巴黎初期，彼时他正试图在浪漫主义浪潮中坚守古典阵地。画中人物勒布朗是知名律师，安格尔用近乎冷峻的理性，将这位资产阶级精英定格在画布上。",
        "画面最精彩处在对质感的区分处理。请看右侧桌案上的织物——安格尔用细碎的笔触描绘出繁复的东方花纹，色彩浓郁且带有厚度；相比之下，勒布朗的面部却平滑如瓷，几乎看不见笔触。这种「面部抛光、衣饰写意」的反差，是安格尔肖像画的典型特征，旨在突出人物的精神性而非肉体。",
        "但这幅画并非完美无缺。勒布朗的姿态略显僵硬，搭在扶手上的左手，手指关节的处理有些含糊，缺乏解剖学上的精准力度——这对以素描功底自负的安格尔是个小瑕疵。人物面部那种过度理想化的平滑，虽然符合古典审美，却削弱了律师应有的犀利与沧桑感，显得有些「面具化」。",
        "尽管如此，安格尔对黑色外套的处理依然老辣。他没有把黑色画死，而是通过微妙的冷暖变化表现出天鹅绒的厚重与光泽。这种在极简色调中寻求丰富层次的能力，正是大师与画匠的分野。",
    ],
    'met-436301': [None, "画面最精彩处在于那根横亘的巨木——它既是圣经隐喻的视觉化，也是构图的骨架。费蒂用粗犷的笔触刻画木纹的粗糙质感，与右侧人物光滑的丝绸衣袖形成强烈对比。左侧老者手指的动作精准有力，指向性明确，引导观者视线在两人之间流转。"],
    'cma-132838': ["萧云从是明末清初新安画派的代表人物，其画风对后世影响深远。此作绘于 1668 年，正值画家晚年，笔墨已臻化境。作为《四季山水图册》中的一开，它既是季节的描绘，也是遗民画家在朝代更迭后，寄情山水、寻求内心安宁的写照。", None, None],
}

for wid, edits in FIXES.items():
    w = next(x for x in d['works'] if x['id'] == wid)
    for idx, text in enumerate(edits):
        if text is not None:
            w['essay'][idx] = text
    lens = [len(p) for p in w['essay']]
    v = essay_violations(w['essay'])
    print(f'{wid}: 段长 {lens} 总长 {sum(lens)} -> {"OK" if not v else v}')
    assert not v, f'{wid} 修复失败'

bad = [x['id'] for x in d['works'] if essay_violations(x.get('essay') or [])]
assert not bad, f'仍有违规: {bad}'
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
print('08-20 已写回，全期赏析硬约束全过')
