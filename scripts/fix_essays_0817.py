#!/usr/bin/env python3
"""修复 08-17 期 2 幅赏析违规（重跑 v2 数据）。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

path = 'data/issues/2026-08-17.json'
d = json.load(open(path))

FIXES = {
    'cma-141549': [
        "作为西班牙黄金时代的巅峰，委拉斯开兹在宫廷肖像领域确立了难以逾越的标杆。这幅作于 1630 年代初的《弄臣卡拉巴萨斯肖像》，是画家从塞维利亚时期向成熟宫廷风格过渡的关键节点。不同于早期对底层人物的粗粝描绘，此时的委拉斯开兹尝试用更宏大的尺幅与庄重的构图来表现宫廷边缘人，赋予他们一种近乎贵族的尊严。",
        "画面最耐看的是人物神态与肢体语言的微妙反差。卡拉巴萨斯身着全黑宫廷装束，手持权杖，姿态挺拔，仿佛正在巡视的官员。然而那张略显浮肿、带着憨笑的脸庞与手中把玩的纸牌，瞬间打破这种庄重感。画家对黑色衣料的处理极具层次，深沉的底色中通过笔触厚薄变化，暗示出织物质感与光影的流动——委拉斯开兹标志性的视觉魔术。",
        "必须指出，这种庄重构图在某种程度上是视觉欺骗。画家将一位生理或智力有缺陷的弄臣强行置入严肃的全身像框架，形式与内容的错位，既是画家对模特的悲悯，也是宫廷审美对“怪诞”的消费。卡拉巴萨斯手中的纸牌暗示其娱乐功能，而那张过于光洁、缺乏岁月痕迹的脸，让人怀疑画家是否为了画面和谐而美化了模特的真实病态。",
    ],
    'cma-125942': None,  # 只改第 3 段
}

w = next(x for x in d['works'] if x['id'] == 'cma-141549')
w['essay'] = FIXES['cma-141549']

w2 = next(x for x in d['works'] if x['id'] == 'cma-125942')
w2['essay'][2] = ("但这幅画终究是给贵族看的田园牧歌。画中园丁衣着整洁，红背心鲜艳如新，完全不像在泥地里打滚的劳动者。"
                  "这种将底层职业美化、戏剧化的处理，是洛可可艺术的通病，也是其魅力所在：它不追求真实，只负责编织一个关于悠闲与精致的梦。"
                  "对现代观众而言，这种刻意的矫饰或许显得不够真诚，但作为室内装饰，它确实完美完成任务。")

for w_ in (w, w2):
    lens = [len(p) for p in w_['essay']]
    v = essay_violations(w_['essay'])
    print(f'{w_["id"]}: 段长 {lens} 总长 {sum(lens)} -> {"OK" if not v else v}')
    assert not v, f'{w_["id"]} 修复失败: {v}'

bad = [x['id'] for x in d['works'] if essay_violations(x.get('essay') or [])]
assert not bad, f'仍有违规: {bad}'
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
print('08-17 已写回，全期赏析硬约束全过')
