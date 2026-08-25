#!/usr/bin/env python3
"""修复 08-25 期 2 幅赏析违规。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pipeline.generate import essay_violations

path = 'data/issues/2026-08-25.json'
d = json.load(open(path))

FIXES = {
    'cma-151031': [None, None, None, "整幅作品虽为册页小品，却展现了华嵒深厚的笔墨功底和对文人精神的深刻理解。观鱼一事虽小，却暗合道家濠梁之乐的典故，令方寸之间的闲适有了哲思的余味，是清代文人画中耐人寻味的佳作。"],
    'cma-153352': [None, None, None, "作为一幅两百多年前的绢本小品，其保存状态与笔墨的润泽感依然令人印象深刻。在那个时代，绘画既是视觉记录，也是一场与古人对话的智力游戏。"],
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
print('08-25 已写回，全期赏析硬约束全过')
