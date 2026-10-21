/** Compare every optimized exposure against the original pixel/timing sequence. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),W=512,H=640;
function cell(raw,i,columns){const b=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const p=((Math.floor(i/columns)*H+y)*columns*W+i%columns*W)*4;raw.copy(b,y*W*4,p,p+W*4);}return b;}
(async()=>{
 let before=0,after=0,originalBytes=0,bytes=0;
 for(const e of JSON.parse(fs.readFileSync(ROOT+'/animation-library/manifest.json')).animations){
  const d=JSON.parse(fs.readFileSync(ROOT+'/animation-library/'+e.metadata)),dir=ROOT+'/animation/sparky/improved/'+e.id,s=JSON.parse(fs.readFileSync(dir+'/animation-scale-v6.json'));
  const a=await sharp(dir+'/'+s.file).raw().toBuffer(),b=await sharp(ROOT+'/'+d.source).raw().toBuffer();
  assert.equal(d.optimization.lossless,true);assert.equal(d.durationMs,s.durationMs);assert.equal(d.loop,s.loop);
  assert.equal(d.frameMap.length,d.frameCount);assert(d.atlasFrameCount<=s.frameCount);
  for(let i=0;i<d.frameCount;i++){
   const indices=d.optimization.originalIndices[i];assert.equal(d.frameDurationsMs[i],indices.reduce((n,j)=>n+s.holdsMs[j],0));
   const actual=cell(b,d.frameMap[i],d.columns);
   for(const j of indices)assert(actual.equals(cell(a,j,s.columns)),`${e.id}: changed pixels at ${j}`);
  }
  assert.deepEqual(d.optimization.originalIndices.flat(),Array.from({length:s.frameCount},(_,i)=>i));
  const hashes=new Set();for(let i=0;i<d.atlasFrameCount;i++){const h=require('node:crypto').createHash('sha256').update(cell(b,i,d.columns)).digest('hex');assert(!hashes.has(h),'Duplicate stored cell');hashes.add(h);}
  before+=s.frameCount;after+=d.atlasFrameCount;originalBytes+=d.optimization.originalBytes;bytes+=d.optimization.bytes;
 }
 console.log(`PASS: ${before} original exposures -> ${after} stored poses; every original pixel and millisecond preserved. ${(originalBytes/1048576).toFixed(1)} -> ${(bytes/1048576).toFixed(1)} MiB.`);
})().catch(e=>{console.error(e);process.exitCode=1});
