/** Replace only walk cells6–11 with complete corrected drawings. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),dir=path.join(ROOT,'animation/sparky/improved/06-common-walk-lu-walk-left'),W=512,H=640;
(async()=>{
 const base=JSON.parse(fs.readFileSync(path.join(dir,'animation-drawn-v4.json'))),ex=await require('./extract-sparky-figures.cjs').extractFigures(path.join(dir,'sources/six-frames-v5-review.png'),{count:6,columns:3});
 const one=await sharp(path.join(dir,'sources/low-passing-v5.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});ex.frames[4]={raw:one.data,w:one.info.width,h:one.info.height};
 const frameDir=path.join(dir,'frames-drawn-v5');fs.mkdirSync(frameDir,{recursive:true});const outputs=[],registration=base.registration.map(r=>({...r})),headWidth=base.registration[0].headWidth;
 for(let i=0;i<12;i++){
  let png;
  if(i<5||i>10)png=fs.readFileSync(path.join(dir,'frames-drawn-v4',`frame-${String(i+1).padStart(3,'0')}.png`));
  else{
   const f=ex.frames[i-5],p=require('./sparky-parts.cjs').headPart(f.raw,f.w,f.h);let bottom=0;
   for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(f.raw[(y*f.w+x)*4+3]>180)bottom=y;
   const scale=headWidth/(p.head.r-p.head.l+1),left=Math.round(256-p.neckX*scale),top=Math.round(592-bottom*scale);
   const input=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(Math.round(f.w*scale),Math.round(f.h*scale),{kernel:'lanczos3'}).png().toBuffer();
   png=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left,top}]).png().toBuffer();
   registration[i]={frame:i+1,source:i===9?'sources/low-passing-v5.png':'sources/six-frames-v5-review.png',sourceFrame:i-4,scale,left,top,neck:[256,top+p.jawY*scale],headWidth,wholeFigure:true,corrected:true};
  }
  outputs.push(png);fs.writeFileSync(path.join(frameDir,`frame-${String(i+1).padStart(3,'0')}.png`),png);
 }
 const file='06_walk_drawn_v5.png';await sharp({create:{width:W*4,height:H*3,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(outputs.map((input,i)=>({input,left:i%4*W,top:Math.floor(i/4)*H}))).png().toFile(path.join(dir,file));
 await sharp({create:{width:W*3,height:H*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(outputs.slice(5,11).map((input,i)=>({input,left:i%3*W,top:Math.floor(i/3)*H}))).png().toFile(path.join(dir,'06_six_corrected_v5.png'));
 const data={...base,file,exportPipeline:'walk-drawn-v5',frameDir:'frames-drawn-v5',registration,correctedFrames:[6,7,8,9,10,11],method:'Six targeted full-body redraws replace cells6–11, including a separate low-knee passing correction. Remaining cells are byte-identical to drawn v4. Complete artwork receives uniform whole-figure scaling and floor registration only; no separated limbs, rigging, mesh deformation, optical flow or crossfade.',description:'Left-facing drawn walk with corrected middle six poses, consistent model scale and lower passing knee. Twelve drawings, 750 ms per cycle.'};
 fs.writeFileSync(path.join(dir,'animation-drawn-v5.json'),JSON.stringify(data,null,2)+'\n');
 outputs.forEach((p,i)=>fs.writeFileSync(path.join(dir,'frames',`frame-${String(i+1).padStart(3,'0')}.png`),p));
 fs.writeFileSync(path.join(dir,'GENERATION.md'),'# Left walk: six-frame correction v5\n\n'+data.method+'\n\nBuilt-in imagegen prompts: `drawn-v5-prompts.json`. Sources: `sources/six-frames-v5-review.png` and `sources/low-passing-v5.png`. Rebuild with `node tools/fix-walk-left-six.cjs`, then publish with `node tools/build-sparky-library.cjs 06-common-walk-lu-walk-left`. Review strip: `06_six_corrected_v5.png`. No unchanged drawings are regenerated.\n');
 console.log('Corrected cells6–11; retained other6 cells unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
