#!/usr/bin/env python3
"""验证新采样池：池子大小 + 未见比例。"""
import json
import sys
sys.path.insert(0, '.')
from pipeline.sources import met

seen = json.load(open('pipeline/seen.json')).get('seen', {})
ids = met._sample_ids(2000)
print(f'采样 id 池: {len(ids)} | 去重: {len(set(ids))}')
new_ids = [i for i in set(ids) if f'met-{i}' not in seen]
print(f'未见: {len(new_ids)} (占比 {len(new_ids)/max(len(set(ids)),1):.0%})')
print('样例未见 id:', new_ids[:10])
