/** Shipping invariants. Artistic review remains a separate, explicit decision. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),index=JSON.parse(fs.readFileSync(ROOT+'/animation-library/manifest.json'));
const active=new Set([6,7,8,9,10,11,14,25]);
for(const e of index.animations){
 const d=JSON.parse(fs.readFileSync(ROOT+'/animation-library/'+e.metadata)),n=Number(e.id.slice(0,2));
 assert.equal(d.scaleLock.perFrameScale,false,`${e.id}: per-frame zoom`);
 assert.deepEqual(d.root,[256,592]);
 if(active.has(n))assert.equal(d.breathEffect.enabled,false,`${e.id}: secondary deformation on active action`);
 if(d.breathEffect.enabled){
  assert.equal(d.breathEffect.stableBands,true,`${e.id}: changing breathing bands`);
  assert.equal(new Set(d.breathEffect.poses.map(p=>JSON.stringify(p))).size,1);
  assert(d.breathEffect.amplitudePx<=1.5,'Excessive secondary motion');
 }
 assert(d.frameDurationsMs.every(t=>t>0&&Number.isFinite(t)));
 assert(Math.abs(d.frameDurationsMs.reduce((a,b)=>a+b,0)-d.durationMs)<.001);
 assert(fs.existsSync(ROOT+'/animation-library/'+e.guide));
}
console.log(`PASS: all${index.animations.length} clips keep fixed display scale/root, deliberate secondary motion, stable breathing bands, valid exposures and integration guides.`);
