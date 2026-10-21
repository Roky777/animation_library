const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {connected}=require('../tools/extract-sparky-figures.cjs');
const root=path.resolve(__dirname,'..'),dir=root+'/animation/sparky/improved/28-blowing-whistle',W=512,H=640;
(async()=>{
 const source=JSON.parse(fs.readFileSync(dir+'/animation-whistle-v1.json')),final=JSON.parse(fs.readFileSync(root+'/animation-library/animations/28-blowing-whistle/animation.json'));
 assert.equal(final.durationMs,2000);assert.equal(final.loop,true);assert(final.atlasFrameCount<source.frameCount);assert.equal(final.breathEffect.enabled,false);
 const maximumFrame=source.prop.lengths.indexOf(Math.max(...source.prop.lengths));
 const full=await sharp(dir+`/whistle-v1/frames/frame-${String(maximumFrame+1).padStart(3,'0')}.png`).raw().toBuffer();
 const first=await sharp(dir+'/whistle-v1/frames/frame-001.png').raw().toBuffer(),widths=[];
 for(let i=0;i<source.frameCount;i++){
  const a=await sharp(dir+`/whistle-v1/frames/frame-${String(i+1).padStart(3,'0')}.png`).raw().toBuffer();
  for(let y=0;y<H;y++)assert(a.subarray(y*W*4,(y*W+source.prop.cutX)*4).equals(first.subarray(y*W*4,(y*W+source.prop.cutX)*4)),'Character or grip moves');
  for(let y=source.prop.top;y<source.prop.top+source.prop.height;y++){
   const l=(y*W+source.prop.cutX)*4,r=(y*W+source.prop.cutX+Math.max(0,Math.floor(source.prop.lengths[i])-1))*4;
   assert(a.subarray(l,r).equals(full.subarray(l,r)),'Paper stripes stretch instead of unrolling');
  }
  assert(a.subarray(500*W*4).equals(first.subarray(500*W*4)),'Foot contacts move');
  const groups=connected(Uint8Array.from({length:W*H},(_,j)=>a[j*4+3]>128?1:0),W,H);assert(groups[0].r<511,'Clipped whistle');assert((groups[1]?.n||0)<20,'Detached whistle');
  let r=0;for(let y=source.prop.top;y<source.prop.top+source.prop.height;y++)for(let x=source.prop.cutX;x<W;x++)if(a[(y*W+x)*4+3]>180)r=Math.max(r,x);widths.push(r);
 }
 assert(Math.max(...widths)-widths[0]>70,'Tube does not extend');assert(Math.abs(widths.at(-1)-widths[0])<=1,'Loop seam jumps');
 assert(widths.every((w,i)=>!i||Math.abs(w-widths[i-1])<=9),'Paper tip jumps');
 console.log('PASS whistle: fixed character/grip/feet, joined prop, no clipping, extension/retraction and seamless mapped loop.');
})().catch(e=>{console.error(e);process.exitCode=1});
