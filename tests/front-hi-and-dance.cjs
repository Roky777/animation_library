const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {connected}=require('../tools/extract-sparky-figures.cjs'),{headPart}=require('../tools/sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),W=512,H=640;
function cells(raw,d){return Array.from({length:d.frameCount},(_,i)=>{const a=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const p=((Math.floor(i/d.columns)*H+y)*d.columns*W+i%d.columns*W)*4;raw.copy(a,y*W*4,p,p+W*4);}return a;});}
function strip(a,y){return a.subarray(y*W*4);}
(async()=>{
 for(const id of (process.argv.slice(2).length?process.argv.slice(2):['18-front-hi','27-intro-dance-lu-dance-hipmove'])){
  const dir=ROOT+'/animation/sparky/improved/'+id,d=JSON.parse(fs.readFileSync(dir+'/animation-scale-v6.json')),source=JSON.parse(fs.readFileSync(dir+'/scale-v6/source-animation.json'));
  const frames=cells(await sharp(dir+'/'+d.file).ensureAlpha().raw().toBuffer(),d),original=cells(await sharp(dir+'/scale-v6/source.png').ensureAlpha().raw().toBuffer(),source);
  assert.equal(d.normalization.perFrameScale,false);assert.deepEqual(d.holdsMs,source.holdsMs);
  const first=frames[0],hp=headPart(first,W,H),core=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const j=y*W+x;if(!hp.mask[j])continue;let solid=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!hp.mask[j+dy*W+dx]||first[(j+dy*W+dx)*4+3]!==255)solid=false;if(solid)core.push(j);}
  
  for(const [i,a] of frames.entries()){
   const g=connected(Uint8Array.from({length:W*H},(_,j)=>a[j*4+3]>128?1:0),W,H);assert((g[1]?.n||0)<30,`${id} ${i}: detached part`);assert(g[0].l>0&&g[0].r<511&&g[0].t>0&&g[0].b<639,'Clipped figure');
   
  }
  if(id==='18-front-hi'){
   assert.equal(frames.length,21);assert.equal(d.loop,false);assert.equal(d.durationMs,2245);assert(first.equals(frames.at(-1)),'Wave recovery changes starting drawing');
   assert.equal(source.wholeFigure,true);assert.equal(source.fixedBody,false);
   for(let i=0;i<original.length;i++){
    const n=source.sourcePoseOrder[i]+1;
    const intact=await sharp(dir+'/front-hi-v7/source-stages/stage-'+String(n).padStart(2,'0')+'.png').ensureAlpha().raw().toBuffer();
    assert(original[i].equals(intact),'Wave frame differs from intact source artwork');
   }
   assert(new Set(original.map(a=>require('node:crypto').createHash('sha256').update(a).digest('hex'))).size===10,'Missing authored motion stages');
   const lift=source.sourcePoseOrder.slice(0,7),recovery=source.sourcePoseOrder.slice(-6);assert.deepEqual(recovery,lift.slice(0,-1).reverse(),'Lowering does not reverse the lift');
  }else{
   assert.equal(frames.length,48);assert.equal(d.loop,true);assert.equal(d.durationMs,1600);
   assert.equal(source.clip,'Cute_Bounce_Dance');assert.equal(source.renderedMotion.type,'cute-bounce');
   const intact=await sharp(dir+'/cute-bounce-v1/canonical.png').raw().toBuffer();assert(original[0].equals(intact),'Neutral pose differs');
   assert(original.every(a=>a.subarray(545*W*4).equals(intact.subarray(545*W*4))),'Bounce slides its shoes');
   const heads=original.map(a=>headPart(a,W,H).head),tops=heads.map(h=>h.t),widths=heads.map(h=>h.r-h.l+1);
   assert(Math.max(...widths)-Math.min(...widths)<=2,'Head scales during bounce');
   assert(Math.max(...tops)-Math.min(...tops)>=4&&Math.max(...tops)-Math.min(...tops)<=6,'Bounce rise missing or excessive');
   assert(Math.abs(tops[0]-tops[24])<=1&&Math.abs(tops[12]-tops[36])<=1,'Two beats do not match');
   assert(!original[12].equals(intact),'Bounce is static');
   const diffs=original.map((a,i)=>{const b=original[(i+1)%original.length];let n=0;for(let j=3;j<a.length;j+=4)n+=Math.abs(a[j]-b[j]);return n/(W*H);});
   assert(diffs.at(-1)<=Math.max(...diffs.slice(0,-1))*1.05,'Loop seam jumps');assert(source.holdsMs.every(ms=>ms===33||ms===34));

  }
  console.log('PASS:',id,'complete anatomy, motion stages, timing and recovery checks.');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
