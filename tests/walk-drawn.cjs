const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {connected}=require('../tools/extract-sparky-figures.cjs');
(async()=>{
 const dir=path.resolve(__dirname,'../animation/sparky/improved/06-common-walk-lu-walk-left'),current=JSON.parse(fs.readFileSync(path.join(dir,'animation.json'))),m=current.exportPipeline==='scale-locked-v6'?JSON.parse(fs.readFileSync(path.join(dir,'scale-v6/source-animation.json'))):current;
 assert(['walk-drawn-v4','walk-drawn-v5','walk-drawn-v6'].includes(m.exportPipeline));assert.equal(m.frameCount,m.exportPipeline==='walk-drawn-v6'?8:12);const widths=[];
 for(let i=0;i<m.frameCount;i++){
  const raw=await sharp(path.join(dir,m.frameDir||'frames-drawn-v4',`frame-${String(i+1).padStart(3,'0')}.png`)).ensureAlpha().raw().toBuffer();
  if(m.exportPipeline==='walk-drawn-v5'&&(i<5||i>10))assert.equal(fs.readFileSync(path.join(dir,'frames-drawn-v4',`frame-${String(i+1).padStart(3,'0')}.png`)).equals(fs.readFileSync(path.join(dir,m.frameDir,`frame-${String(i+1).padStart(3,'0')}.png`))),true,'Unaffected frame changed');
  const mask=Uint8Array.from({length:512*640},(_,p)=>raw[p*4+3]>128?1:0),groups=connected(mask,512,640);
  assert((groups[1]?.n||0)<30,`Detached artwork in frame ${i+1}: ${groups[1]?.n}px`);
  const p=require('../tools/sparky-parts.cjs').headPart(raw,512,640);widths.push(p.head.r-p.head.l+1);
  assert(groups[0].l>0&&groups[0].r<511&&groups[0].t>0&&groups[0].b<639,'Clipped character');
  assert(m.registration[i].wholeFigure,'Body was split during packing');
 }
 assert(Math.max(...widths)-Math.min(...widths)<=3,`Head size drift: ${widths}`);
 console.log(`PASS: ${m.frameCount} complete connected drawn figures, no detached artwork or clipped silhouettes; stable head scale.`);
})().catch(e=>{console.error(e);process.exitCode=1});
