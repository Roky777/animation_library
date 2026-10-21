/** Pack the approved gait and its new whole-drawing direction/expression variants. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),base=path.join(root,'animation/sparky/improved');
const registry=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));
const timings=[1000/12,1000/6,1000/6,1000/12,1000/12,1000/6,1000/6,1000/12];
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
async function build(number,source){
 const entry=registry.entries.find(e=>Number(e.id.slice(0,2))===number),dir=path.join(base,entry.id),version=number===7&&fs.existsSync(path.join(dir,'approved-v7/sources/right.png'))?'v7':'v6',out=path.join(dir,'approved-'+version);
 if(version==='v7')source=path.join(out,'sources/right.png');
 fs.mkdirSync(out+'/frames',{recursive:true});let frames=[],registration=[];
 if(number===6){
  for(let i=1;i<=8;i++){frames.push(fs.readFileSync(dir+`/researched-v6/keys/K${i}.png`));registration.push({frame:i,wholeFigure:true,approvedOriginal:true});}
 }else{
  const extracted=await require('./extract-sparky-figures.cjs').extractFigures(source,{count:8,columns:4});write(out+'/extraction.json',extracted.audit);
  for(let i=0;i<8;i++){
   const f=extracted.frames[i],p=require('./sparky-parts.cjs').headPart(f.raw,f.w,f.h);let bottom=0;
   for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(f.raw[(y*f.w+x)*4+3]>180)bottom=y;
   const scale=209.15/(p.head.r-p.head.l+1),left=Math.round(256-p.neckX*scale),top=Math.round(592-bottom*scale);
   const input=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(Math.round(f.w*scale),Math.round(f.h*scale)).png().toBuffer();
   frames.push(await sharp({create:{width:512,height:640,channels:4,background:'#00000000'}}).composite([{input,left,top}]).png().toBuffer());
   registration.push({frame:i+1,wholeFigure:true,scale,left,top,headWidth:209.15});
  }
 }
 // Raw copying keeps the approved left drawings byte-for-byte in pixel space.
 const raw=Buffer.alloc(2048*1280*4);
 for(let i=0;i<8;i++){
  fs.writeFileSync(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`,frames[i]);
  const rgba=await sharp(frames[i]).ensureAlpha().raw().toBuffer();
  for(let y=0;y<640;y++)rgba.copy(raw,((Math.floor(i/4)*640+y)*2048+i%4*512)*4,y*512*4,(y+1)*512*4);
 }
 const file=`approved-${version}/spritesheet.png`;await sharp(raw,{raw:{width:2048,height:1280,channels:4}}).png().toFile(path.join(dir,file));
 const smiling=number===12,holds=smiling?[180,80,80,100,140,220,360,600]:timings;
 const data={clip:entry.clip,file,exportPipeline:`walk-drawn-${version}`,frameDir:`approved-${version}/frames`,columns:4,rows:2,frameCount:8,uniqueDrawings:8,cellWidth:512,cellHeight:640,root:[256,592],loop:!smiling,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b,0),fixedHead:false,registration,review:{status:number===6?'user_approved':'new_variant_review',artisticApproval:number===6},description:smiling?'A gentle smile grows into a broad cheerful grin and settles.':`${number===8||number===9?'Cheerful':'Relaxed'} ${number===7||number===9?'right':'left'} walk in place using eight contact, down, passing and up key drawings.`,method:number===6?'User-approved eight researched keys and their original variable timing, promoted without repainting.':'Eight complete built-in imagegen drawings. Whole-figure extraction and uniform per-drawing registration; no cutout rig, body warping, frame blending or optical flow.'};
 write(dir+`/animation-approved-${version}.json`,data);console.log(entry.id);
}
(async()=>{for(const n of [6,7,8,9,12]){if(process.argv[2]&&Number(process.argv[2])!==n)continue;const e=registry.entries.find(e=>Number(e.id.slice(0,2))===n),src=base+'/'+e.id+'/approved-v6/sources/'+(n===7?'right':n===8?'happy-left':n===9?'happy-right':'smiling')+'.png';if(n===6||fs.existsSync(src))await build(n,src);}})().catch(e=>{console.error(e);process.exitCode=1});
