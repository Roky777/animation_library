/** Check common model size independently of changing whole-pose bounds. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {headPart}=require('../tools/sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
function extent(raw){let l=512,r=-1,t=640,b=-1;for(let j=0;j<512*640;j++)if(raw[j*4+3]>180){const x=j%512,y=Math.floor(j/512);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return{w:r-l+1,h:b-t+1};}
(async()=>{
 let count=0;const medians=[];
 for(const e of JSON.parse(fs.readFileSync(ROOT+'/animation-library/manifest.json')).animations){
  const dir=ROOT+'/animation/sparky/improved/'+e.id,d=JSON.parse(fs.readFileSync(dir+'/animation-scale-v6.json')),old=JSON.parse(fs.readFileSync(dir+'/scale-v6/source-animation.json')),m=d.normalization,areas=[];
  assert.equal(m.perFrameScale,false);assert.equal(d.frameCount,old.frameCount);assert.deepEqual(d.holdsMs,old.holdsMs);assert.equal(d.loop,old.loop);
  const sheet=await sharp(dir+'/'+d.file).ensureAlpha().raw().toBuffer(),source=await sharp(dir+'/scale-v6/source.png').ensureAlpha().raw().toBuffer();
  for(let i=0;i<d.frameCount;i++){
   const raw=Buffer.alloc(512*640*4);for(let y=0;y<640;y++){const p=((Math.floor(i/d.columns)*640+y)*d.columns*512+i%d.columns*512)*4;sheet.copy(raw,y*512*4,p,p+512*4);}
   const loose=await sharp(dir+'/'+d.frameDir+`/frame-${String(i+1).padStart(3,'0')}.png`).ensureAlpha().raw().toBuffer();assert(raw.equals(loose),'Packed normalized cell differs');
   const head=headPart(raw,512,640);let area=0,floor=-1;
   for(let j=0;j<512*640;j++){if(head.part[j*4+3]>180)area++;if(raw[j*4+3]>180)floor=Math.floor(j/512);}
   const a=m.frames[i];areas.push(area);assert.equal(floor,a.targetFloor);if(a.sourceFloor===592)assert.equal(floor,592,'Contact drift');
   const before=Buffer.alloc(512*640*4);for(let y=0;y<640;y++){const p=((Math.floor(i/d.columns)*640+y)*d.columns*512+i%d.columns*512)*4;source.copy(before,y*512*4,p,p+512*4);}
   // Touching hands/forearms can merge with the head landmark after resampling.
   // Whole-figure extents test the physical transform without semantic segmentation.
   const beforeExtent=extent(before),afterExtent=extent(raw);
   assert(Math.abs(afterExtent.w-beforeExtent.w*m.scaleX)<=2,`${e.id}: horizontal scale drift`);
   assert(Math.abs(afterExtent.h-beforeExtent.h*m.scaleY)<=2,`${e.id}: vertical scale drift`);
   count++;
  }
  const mid=median(areas);medians.push(mid);assert(Math.abs(mid/m.targetHeadArea-1)<.006,`${e.id}: wrong reference size`);
 }
 assert(Math.max(...medians)/Math.min(...medians)<1.006,'Cross-sheet size mismatch');
 console.log(`PASS: ${count} frames in${medians.length} clips; common median model size within0.6%, one fixed scale per sheet, original exposures, packed pixels, fixed ground and retained flight.`);
})().catch(e=>{console.error(e);process.exitCode=1});
