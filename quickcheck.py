import json, sys, pathlib, re, collections, os, textwrap
p=pathlib.Path('data/evidence/acceptance_evidence_region_scope.json')
if not p.exists():
    print('file not found')
    sys.exit(1)
with p.open() as f:
    data=json.load(f)
req_regions={'face','torso_neck','clothing','background','whole_work'}
regions_present=set()
issues=[]
for s in data['samples']:
    region=s['region']
    scope=s['scope']
    regions_present.add(region)
    expected = 'whole_work' if region=='whole_work' else f'region_{region}'
    if scope!=expected:
        issues.append({'id':s['id'],'region':region,'scope':scope,'expected':expected})
print('Total samples:', len(data['samples']))
print('Regions present:', sorted(regions_present))
print('Missing regions:', req_regions - regions_present)
print('Mapping issues:', len(issues))
if issues:
    for it in issues:
        print(it)
