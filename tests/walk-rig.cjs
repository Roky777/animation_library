const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {connected}=require('../tools/extract-sparky-figures.cjs');
(async()=>{
 const dir=path.resolve(__dirname,'../animation/sparky/improved/06-common-walk-lu-walk-left'),m=JSON.parse(fs.readFileSync(path.join(dir,'animation.json'))),a=JSON.parse(fs.readFileSync(path.join(dir,'walk-rig-v3.json'))).audit;
 if(m.exportPipeline!=='walk-rig-v3'){console.log('SKIP: rejected walk rig is inactive.');return;}
 assert.equal(m.frameCount,60);assert.equal(m.durationMs,1000);const hashes=new Set();let maxDetached=0;
 for(let i=0;i<60;i++){
  const raw=await sharp(path.join(dir,'frames-walk-rig-v3',`frame-${String(i+1).padStart(3,'0')}.png`)).ensureAlpha().raw().toBuffer();
  hashes.add(require('node:crypto').createHash('sha256').update(raw).digest('hex'));
  const mask=Uint8Array.from({length:512*640},(_,p)=>raw[p*4+3]>128?1:0),groups=connected(mask,512,640);
  maxDetached=Math.max(maxDetached,groups[1]?.n||0);
  assert((groups[1]?.n||0)<30,`Detached artwork in frame ${i+1}: ${groups[1]?.n} pixels`);
  assert(a[i].near.stance||a[i].far.stance,'Both feet airborne during walk');
  assert(a[i].near.contactError<.001&&a[i].far.contactError<.001,'IK solver moved a contact target');
 }
 assert.equal(hashes.size,60,'Repeated drawings replace continuous motion');
 console.log(`PASS: 60 distinct walk cells, connected character silhouettes, no unsupported frame or IK clamping; largest detached speck ${maxDetached}px.`);
})().catch(e=>{console.error(e);process.exitCode=1});
