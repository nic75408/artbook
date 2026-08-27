import json, re, pathlib, sys
face_terms=["面", "脸", "目", "眼", "眉", "嘴", "唇", "鼻", "脸部", "面部", "表情", "神情", "眼神"]
pat=re.compile('|'.join(face_terms))
with open('data/evidence/acceptance_evidence_region_scope.json') as f:
    data=json.load(f)
violations=[]
for s in data['samples']:
    region=s['region']
    if region in ('face','whole_work'):
        continue
    p2=s.get('essay_paragraph_2','')
    if pat.search(p2):
        violations.append((s['id'], region, p2[:80]))
print('Non-face/whole_work sample count', sum(1 for s in data['samples'] if s['region'] not in ('face','whole_work')))
print('Violations found', len(violations))
for v in violations[:10]:
    print(v)
