import json, sys, collections, re, pathlib
path = pathlib.Path('data/evidence/acceptance_evidence_region_scope.json')
if not path.exists():
    print('evidence file missing')
    sys.exit(1)
with path.open() as f:
    data = json.load(f)
errs=[]
for s in data['samples']:
    r=s['region']
    expected='whole_work' if r=='whole_work' else f'region_{r}'
    if s['scope']!=expected:
        errs.append((s['id'], r, s['scope']))
print('Total samples', len(data['samples']))
print('Mapping errors', len(errs))
if errs:
    for e in errs:
        print(e)
    sys.exit(1)
print('Mapping validation passed')
