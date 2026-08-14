#!/usr/bin/env python3
"""修复 5 幅赏析硬约束违规（08-13 ×2、08-14 ×3），修复后全量校验。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

FIXES = {
    'data/issues/2026-08-13.json': {
        'met-435809': [(2, "勃鲁盖尔虽被誉为“农民画家”，其笔下的田园牧歌并非完全的现实主义。画中农民衣着朴素、动作粗犷，但场景被笼罩在金黄色和谐光晕中，苦难被审美化了。远处风景如地图般展开，理想化的透视与近处真实的汗水并存。这恰恰是勃鲁盖尔的高明之处：他既未美化劳动的艰辛，也未陷入对贫穷的廉价同情，而是呈现出庄严的生存秩序。")],
        'met-437925': [(0, "华托是洛可可风格的先驱，以描绘贵族游乐的“雅宴画”闻名。这幅作于他生命最后阶段的作品，将视线从田园牧歌转向了舞台后台。它既是戏剧场景的记录，也被视为画家对自己艺术生涯的某种隐喻——人生如戏，演员在幕间休息时的状态往往比表演本身更耐人寻味。")],
    },
    'data/issues/2026-08-14.json': {
        'cma-101027': [(3, "总体而言，这件藏书票是工艺美术运动美学的浓缩样本：严谨的对称、流畅的线条与字纹的巧妙结合，让一枚小小的纸片承载了那个时代对书籍之美的郑重态度，也解释了藏书票艺术为何能在收藏界长盛不衰。")],
        'cma-101074': [(0, "这件 1902 年的藏书票出自一位未留名的艺术家之手，属于新艺术运动时期的典型设计。作为书籍所有权的标记，它既是实用物件，也是当时装饰艺术风潮的缩影。在狭长的竖构图中，艺术家试图将自然意象与文字排版融合，展现了那个时代对线条美学的极致追求。")],
        'cma-104009': [
            (0, "作为现代主义绘画的先驱，马奈在 1862 年创作这幅版画时，正热衷于捕捉巴黎舞台上异域风情的瞬间。画中人罗拉·德·瓦伦西亚是当时著名的西班牙舞者，马奈曾为她绘制多幅肖像。这幅作品既是对其舞台形象的记录，也是马奈探索黑白灰阶与线条表现力的重要实验，预示了他后来在油画中对平面感的追求。"),
            (2, "尽管马奈试图捕捉舞者的神韵，但这幅肖像仍带有某种冷峻的疏离感。波德莱尔题写的诗句称赞她拥有“玫瑰与黑”的迷人魅力，但画中罗拉神情淡漠，甚至略显疲惫，毫无取悦观众的媚态。这种去理想化的诚实，正是马奈区别于同时代浪漫主义画家的关键——他画的不是幻想中的吉普赛女郎，而是一个具体的、有血有肉的职业演员。"),
        ],
    },
}

total_bad = 0
for path, fm in FIXES.items():
    d = json.load(open(path))
    for wid, edits in fm.items():
        w = next(x for x in d['works'] if x['id'] == wid)
        for idx, text in edits:
            w['essay'][idx] = text
        lens = [len(p) for p in w['essay']]
        v = essay_violations(w['essay'])
        if v:
            total_bad += 1
        print(f'{path} {wid}: 段长 {lens} 总长 {sum(lens)} -> {"仍违规: " + str(v) if v else "OK"}')
    bad = [x['id'] for x in d['works'] if essay_violations(x.get('essay') or [])]
    if bad:
        total_bad += len(bad)
        print(f'  !! {path} 其余违规: {bad}')
    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
    print(f'{path} 已写回')

assert total_bad == 0, f'{total_bad} 处仍违规'
print('全部修复完成：两期 60 幅赏析硬约束全过')
