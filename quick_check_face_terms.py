import json, re, pathlib, sys

data = json.loads(pathlib.Path('data/evidence/acceptance_evidence_region_scope.json').read_text())
face_terms=[
    r'面容', r'面庞', r'颜值', r'脸庞', r'脸蛋', r'面貌',
    r'眉', r'眼', r'目光', r'眼神', r'瞳', r'鼻', r'唇', r'嘴', r'口',
    r'表情', r'神情', r'皱纹'
]
pattern=re.compile('|'.join(face_terms))
violations=[]
non_face=0
for s in data['samples']:
    if s['region'] in ('face','whole_work'):
        continue
    non_face+=1
    text=s.get('essay_paragraph_2','')
    if pattern.search(text):
        violations.append((s['id'], s['region']))
print('Non-face samples', non_face)
print('Violations', len(violations))
if violations:
    print('List:', violations)
