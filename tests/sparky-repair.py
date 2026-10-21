"""Pixel regressions for the reported floating-shoe and registration failures."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
index=json.loads((root/'animation-library/manifest.json').read_text())
checked=0
for entry in index['animations']:
    folder=root/'animation-library'/Path(entry['metadata']).parent
    meta=json.loads((folder/'animation.json').read_text())
    sheet=np.array(Image.open(folder/meta['sheet']))
    frames=[sheet[i//meta['columns']*640:(i//meta['columns']+1)*640,i%meta['columns']*512:(i%meta['columns']+1)*512] for i in range(meta['frameCount'])]
    for i,f in enumerate(frames):
        opaque=f[:,:,3]>180
        warm=opaque&(f[:,:,0]>170)&(f[:,:,1]>35)&(f[:,:,2]<130)
        head_top=np.where(warm)[0].min()
        blue=opaque&(f[:,:,2]>f[:,:,0]*1.2)&(f[:,:,2]>100)
        assert blue[:max(0,head_top-3)].sum()<10,(entry['id'],i,'blue fragment above flame')
        checked+=1
    working=root/'animation/sparky/improved'/entry['id']/'animation.json'
    data=json.loads(working.read_text())
    number=int(entry['id'][:2])
    if number in [12,19,20]:
        for f in frames[1:]:
            assert np.array_equal(f[480:],frames[0][480:]),(entry['id'],'fixed lower body changed')
    if number==1:
        for f in frames[1:]:
            assert np.array_equal(f[520:],frames[0][520:]),'Idle soles/lower body moved'
        def premul(f):return f[:,:,:3].astype(float)*f[:,:,3:4]/255
        assert np.abs(premul(frames[1])-premul(frames[0])).max()<25,'Idle initial step jerks'
        assert np.abs(premul(frames[-1])-premul(frames[0])).max()<25,'Idle loop seam jerks'
    if number in [23,24]:
        # Contacts outside the localized breathing region must remain identical.
        for f in frames[1:]:
            assert np.array_equal(f[590:],frames[0][590:]),(entry['id'],'floor contact moved')
            assert np.array_equal(f[:440],frames[0][:440]),(entry['id'],'head flickered')
    if number in [6,7,8,9,15,16,18,21,22] and data.get("fixedHead"):
        places=[r['headPlacement'] for r in data['registration']]
        limit=7 if number in [6,7,8,9] else 1
        for axis in ['left','top']:
            assert max(p[axis] for p in places)-min(p[axis] for p in places)<=limit,(entry['id'],'head drift',axis)
    if number==17:
        assert data['sourcePoseOrder']==[0,1,2,3,4,3,2,1]
        assert len(frames)==8 and meta['durationMs']==600
        for a,b in [(1,7),(2,6),(3,5)]:assert np.array_equal(frames[a],frames[b]),'Clap release differs from approach'
print(f'PASS: {checked} cells: no blue fragments above head; fixed regions, walking/gesture head registration, breathing seams and clap source order.')
