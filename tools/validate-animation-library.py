"""Validate packaged assets without claiming that pixel checks prove artistic quality."""
from pathlib import Path
import argparse, hashlib, json
from PIL import Image
import numpy as np
parser=argparse.ArgumentParser();parser.add_argument('--allow-partial',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1];library=root/'animation-library'
index=json.loads((library/'manifest.json').read_text());registry=json.loads((root/'animation/sparky/improved/manifest.json').read_text())
entries={e['id']:e for e in registry['entries']};assert len(entries)>0
assert len({e['id'] for e in index['animations']})==len(index['animations'])
if not args.allow_partial:assert len(index['animations'])==len(entries)
report=[]
for entry in index['animations']:
 folder=(library/entry['metadata']).parent;data=json.loads((library/entry['metadata']).read_text());sheet=folder/data['sheet'];assert sheet==library/entry['sheet']
 assert data['id']==entry['id'];assert data['name']==entries[entry['id']]['clip']
 assert (library/entry['guide']).is_file();assert data['cellWidth']==512 and data['cellHeight']==640
 assert data['root']==[256,592];assert len(data['frameDurationsMs'])==data['frameCount'];assert min(data['frameDurationsMs'])>0
 assert abs(sum(data['frameDurationsMs'])-data['durationMs'])<.001
 im=Image.open(sheet);assert im.mode=='RGBA';assert im.size==(data['columns']*512,data['rows']*640)
 assert hashlib.sha256(sheet.read_bytes()).digest()==hashlib.sha256((root/data['source']).read_bytes()).digest()
 play=entries[entry['id']]['playback'];assert play['file']==data['source'];assert play['holds']==data['frameDurationsMs'];assert play['count']==data['frameCount'];assert play['loop']==data['loop']
 raw=np.array(im);hashes=[];bounds=[];clipped=[]
 for i in range(data['frameCount']):
  cell=data.get('frameMap',list(range(data['frameCount'])))[i]
  frame=raw[(cell//data['columns'])*640:(cell//data['columns']+1)*640,(cell%data['columns'])*512:(cell%data['columns']+1)*512]
  alpha=frame[:,:,3];m=alpha>180;assert m.sum()>100,f'{entry["id"]}: empty frame {i}'
  ys,xs=np.where(m);bounds.append([int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]);hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
  if np.any(m[0]) or np.any(m[-1]) or np.any(m[:,0]) or np.any(m[:,-1]):clipped.append(i+1)
  assert np.any(alpha==0),f'{entry["id"]}: no transparency in frame {i}'
 for i in range(data.get('atlasFrameCount',data['frameCount']),data['columns']*data['rows']):
  cell=raw[(i//data['columns'])*640:(i//data['columns']+1)*640,(i%data['columns'])*512:(i%data['columns']+1)*512]
  assert not np.any(cell[:,:,3]),f'{entry["id"]}: trailing cell {i} occupied'
 assert not clipped,(entry['id'],clipped)
 report.append({'id':entry['id'],'frames':data['frameCount'],'distinctCellHashes':len(set(hashes)),'durationMs':data['durationMs'],'technicalChecks':'passed','bounds':bounds,'artisticApproval':False})
result={'count':len(report),'expected':len(entries),'checks':'File paths, source/copy hashes, RGBA alpha, cell size, root, grid capacity, nonempty playable cells, empty trailing cells, edge clipping, duration totals and registry parity. These checks do not certify smooth motion or correct anatomy.','animations':report}
(library/'validation-report.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'PASS: {len(report)}/{len(entries)} packaged animations; common cells/root, paths, transparency, dimensions, frame coverage, timing and registry parity.')
