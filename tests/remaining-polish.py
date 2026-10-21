"""Verify actual exported cells, contact registration, and preserved loop artwork."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
index=json.loads((root/'animation-library/manifest.json').read_text())['animations']
ids={1,2,3,4,5,10,11,21,22,23,24,25,26,27}
frames_by_number={};total=0
for entry in index:
 n=int(entry['id'][:2])
 if n not in ids:continue
 directory=root/'animation/sparky/improved'/entry['id'];mfile='animation-registration-v3.json' if n in {1,2,4,5,23,24} else 'animation-remaining-v3.json'
 if n==27:mfile='animation-cute-bounce-v1.json'
 if n==10:mfile='animation-run-v4.json'
 if n==24:mfile='animation-sleep-bubble-v4.json'
 if n==23:mfile='animation-breathing-v5.json'
 meta=json.loads((directory/mfile).read_text());d=json.loads((root/'animation-library'/entry['metadata']).read_text());raw=np.array(Image.open((root/'animation-library'/entry['metadata']).parent/d['sheet']));frames=[]
 if d.get('scaleLock'):
  d.update(json.loads((directory/'scale-v6/source-animation.json').read_text()));raw=np.array(Image.open(directory/'scale-v6/source.png')) # Validate original action regressions; tests/library-scale.cjs checks the transformed exports.
 assert len(list((directory/meta['frameDir']).glob('frame-*.png')))==d['frameCount'],f'{entry["id"]}: stale loose frames'
 for i in range(d['frameCount']):
  x=i%d['columns']*512;y=i//d['columns']*640;f=raw[y:y+640,x:x+512];frames.append(f)
  loose=np.array(Image.open(directory/meta['frameDir']/f'frame-{i+1:03}.png'));assert np.array_equal(f,loose),'Packed drawing changed'
  ys,xs=np.where(f[:,:,3]>180);floor=int(ys.max());assert xs.min()>0 and xs.max()<511 and ys.min()>0 and floor<639
  if n==10 and i in (3,7):assert floor<=568,'Run flight touches floor'
  elif n==11 and i in (3,4,5):assert floor<592,'Jump airborne pose is grounded'
  else:assert floor==592,f'{entry["id"]} frame{i}: wrong floor {floor}'
 frames_by_number[n]=frames;total+=len(frames)
 if n in {1,2,4,5,24}:
  before=json.loads((directory/'registration-v3/before-library-animation.json').read_text());old=np.array(Image.open(root/'animation-library/animations'/entry['id']/before['sheet']))
  for i,f in enumerate(frames):
   x=i%before['columns']*512;y=i//before['columns']*640;previous=old[y:y+640,x:x+512];expected=np.zeros_like(f);dy=meta['registration'][i]['dy']
   if dy>=0:expected[dy:]=previous[:640-dy]
   else:expected[:640+dy]=previous[-dy:]
   if n==24:
    overlay=np.array(Image.open(directory/'sleep-bubble-v4/bubble-frames'/f'frame-{i+1:03}.png'))
    assert np.array_equal(expected[overlay[:,:,3]==0],f[overlay[:,:,3]==0]),'Sleep character changed outside bubble'
   else:assert np.array_equal(expected,f),'Existing loop pixels changed beyond registration'
  assert len({hashlib.sha256(f[586:600].tobytes()).digest() for f in frames})==1,'Stationary foot strip varies'
# Seated breathing replaces the tiny local chest ripple with an upper-body rise.
seated=frames_by_number[23]
seat_dir=root/'animation/sparky/improved/23-toy-garden-lu-seat-idle'
seat_source=np.array(Image.open(seat_dir/'registration-v3/frames/frame-001.png'))
assert np.array_equal(seated[0],seat_source)
assert all(np.array_equal(f[535:],seat_source[535:]) for f in seated),'Seated contacts move'
assert not np.array_equal(seated[0][:535],seated[35][:535]),'Seated breathing remains static'
seat_top=lambda f:int(np.where(f[:,:,3]>180)[0].min())
assert 3<=seat_top(seated[0])-seat_top(seated[35])<=4,'Seated rise missing'
assert np.array_equal(seated[1],seated[-1]),'Breathing loop is asymmetric'
# Bubble radius eases through one full breathing cycle; the tip and untouched feet stay fixed.
sleep_dir=root/'animation/sparky/improved/24-sequence-4-sleep'
sleep_meta=json.loads((sleep_dir/'animation-sleep-bubble-v4.json').read_text())
radii=sleep_meta['bubble']['radii']
assert len(radii)==80 and min(radii)==8 and max(radii)==22
assert radii[0]<radii[20]<radii[40] and radii[40]>radii[60]>radii[79]
assert abs(radii[0]-radii[-1])<.03,'Bubble pops at loop wrap'
assert sleep_meta['bubble']['anchor']==[213,475] and sleep_meta['durationMs']==3200
small=np.array(Image.open(sleep_dir/'sleep-bubble-v4/bubble-frames/frame-001.png'))[:,:,3]
large=np.array(Image.open(sleep_dir/'sleep-bubble-v4/bubble-frames/frame-041.png'))[:,:,3]
assert (large>10).sum()>(small>10).sum()*4,'Bubble does not visibly inflate'
# Registration fixes the flight-frame lateral lurch without changing any drawing pixels.
run=frames_by_number[10]
run_dir=root/'animation/sparky/improved/10-running-animation'
run_meta=json.loads((run_dir/'animation-run-v4.json').read_text())
assert run_meta['holdsMs'][:4]==run_meta['holdsMs'][4:] and run_meta['durationMs']==640
assert max(r['headCenter'] for r in run_meta['registration'])-min(r['headCenter'] for r in run_meta['registration'])<=1
assert run_meta['registration'][3]['dx']==-52 and run_meta['registration'][7]['dx']==-45
for i,f in enumerate(run):
 previous=np.array(Image.open(run_dir/'remaining-v3/frames'/f'frame-{i+1:03}.png'))
 expected=np.zeros_like(previous);dx=run_meta['registration'][i]['dx']
 if dx>=0:expected[:,dx:]=previous[:,:512-dx]
 else:expected[:,:512+dx]=previous[:,-dx:]
 assert np.array_equal(expected,f),'Run repair changed artwork or vertical placement'
# A drawn dance must contain connected changing whole-character poses, with stable head scale.
dance=frames_by_number[27]
assert len(dance)==48
assert len({hashlib.sha256(f.tobytes()).digest() for f in dance})>=24,'Bounce phases are missing'
directory=root/'animation/sparky/improved/27-intro-dance-lu-dance-hipmove'
working=json.loads((directory/'animation-cute-bounce-v1.json').read_text())
assert working['renderedMotion']['type']=='cute-bounce'
canonical=np.array(Image.open(directory/'cute-bounce-v1/canonical.png'))
assert np.array_equal(dance[0],canonical)
assert all(np.array_equal(f[545:],canonical[545:]) for f in dance),'Bounce slides shoes'
assert not np.array_equal(dance[12],canonical),'Bounce is static'
differences=[np.abs(dance[(i+1)%len(dance)][:,:,3].astype(float)-f[:,:,3]).mean() for i,f in enumerate(dance)]
assert differences[-1]<=max(differences[:-1])*1.05,'Bounce loop seam jumps'
assert working['durationMs']==1600 and set(working['holdsMs'])=={33,34}
# The bottom portion of the pedestal stays byte-identical while the hand/glass move above it.
pickup=frames_by_number[26];assert len({f[500:593,335:452].tobytes() for f in pickup})==1,'Pedestal vibrates'
# The apex is higher than the standing pose, without measuring shoes as a new root.
jump=frames_by_number[11];top=lambda f:int(np.where(f[:,:,3]>180)[0].min())
assert top(jump[4])<top(jump[0])-55,'Jump has no world-space rise'
print(f'PASS: {total} cells across 14 remaining clips; exact packing, preserved loop pixels, contact/flight placement, fixed pedestal, whole drawn dance and loop seam.')
