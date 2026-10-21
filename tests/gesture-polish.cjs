/** Pixel regression checks for the stationary gesture repair. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {connected}=require('../tools/extract-sparky-figures.cjs');
const {headPart}=require('../tools/sparky-parts.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(root+'/animation-library/manifest.json'));let checked=0;
 for(const e of manifest.animations.filter(e=>Number(e.id.slice(0,2))>=13&&Number(e.id.slice(0,2))<=20)){
  if(e.id==='18-front-hi'&&fs.existsSync(root+'/animation/sparky/improved/18-front-hi/animation-front-hi-v7.json'))continue; // New arm rig is checked in front-hi-and-dance.cjs.
  const file=path.join(root,'animation-library',e.metadata),d=JSON.parse(fs.readFileSync(file)),work=path.join(root,'animation/sparky/improved',e.id),meta=JSON.parse(fs.readFileSync(work+'/animation-polished-v3.json'));
  if(d.scaleLock)Object.assign(d,JSON.parse(fs.readFileSync(work+'/scale-v6/source-animation.json')));
  const sheet=await sharp(d.scaleLock?work+'/scale-v6/source.png':path.join(path.dirname(file),d.sheet)).ensureAlpha().raw().toBuffer(),stride=d.columns*512,widths=[];
  for(let i=0;i<d.frameCount;i++){
   const raw=Buffer.alloc(512*640*4);for(let y=0;y<640;y++){const from=((Math.floor(i/d.columns)*640+y)*stride+i%d.columns*512)*4;sheet.copy(raw,y*512*4,from,from+512*4);}
   const groups=connected(Uint8Array.from({length:512*640},(_,p)=>raw[p*4+3]>128?1:0),512,640);
   assert.equal(groups.length,1,`${e.id} cell ${i}: disconnected fragments`);
   const opaque=[];for(let p=0;p<512*640;p++)if(raw[p*4+3]>180)opaque.push(p);
   assert.equal(Math.max(...opaque.map(p=>Math.floor(p/512))),592,`${e.id}: sole baseline changed`);
   const h=headPart(raw,512,640);widths.push(h.head.r-h.head.l+1);
   const stage=await sharp(work+`/polished-v3/stages/stage-${String(meta.sourcePoseOrder[i]+1).padStart(2,'0')}.png`).ensureAlpha().raw().toBuffer();
   assert(raw.equals(stage),`${e.id}: packing changed the reviewed drawing`);checked++;
  }
  assert(Math.max(...widths)-Math.min(...widths)<=2,`${e.id}: head scale pumping`);
  if(d.loop)assert.notEqual(meta.sourcePoseOrder[0],meta.sourcePoseOrder.at(-1),'Duplicate loop endpoint');
  else if(![15,16].includes(Number(e.id.slice(0,2))))assert.equal(meta.sourcePoseOrder[0],meta.sourcePoseOrder.at(-1),'Recovery misses starting pose');
 }
 console.log(`PASS: ${checked} gesture cells; whole connected figures, fixed sole baseline, stable head scale, exact packing, loop/recovery endpoints.`);
})().catch(e=>{console.error(e);process.exitCode=1});
