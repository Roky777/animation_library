/** Whole-character hip sway. No body-part assembly or mirrored character art. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures,connected}=require('./extract-sparky-figures.cjs');
const {headPart}=require('./sparky-parts.cjs');
const dir=path.resolve(__dirname,'../animation/sparky/improved/27-intro-dance-lu-dance-hipmove'),out=dir+'/dance-v9',W=512,H=640;
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
(async()=>{
 const ext=await extractFigures(out+'/sources/poses.png',{count:12,columns:4});
 const widths=ext.frames.slice(0,6).map(f=>{const h=headPart(f.raw,f.w,f.h).head;return h.r-h.l+1;});
 const scale=218/median(widths),stages=[],registration=[];
 fs.mkdirSync(out+'/stages',{recursive:true});fs.mkdirSync(out+'/frames',{recursive:true});
 for(let i=0;i<6;i++){
  const f=ext.frames[i],rw=Math.round(f.w*scale),rh=Math.round(f.h*scale);
  const resized=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).raw().toBuffer();
  let bottom=-1;for(let y=0;y<rh;y++)for(let x=0;x<rw;x++)if(resized[(y*rw+x)*4+3]>180)bottom=y;
  let l=rw,r=-1;for(let y=bottom-24;y<=bottom;y++)for(let x=0;x<rw;x++)if(resized[(y*rw+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);}
  const dx=Math.round(256-(l+r)/2),dy=592-bottom,raw=Buffer.alloc(W*H*4);
  if(dx<0||dy<0||dx+rw>W||dy+rh>H)throw Error('Complete figure does not fit');
  for(let y=0;y<rh;y++)resized.copy(raw,((y+dy)*W+dx)*4,y*rw*4,(y+1)*rw*4);
  const groups=connected(Uint8Array.from({length:W*H},(_,j)=>raw[j*4+3]>128?1:0),W,H);
  if(groups.slice(1).some(g=>g.n>20))throw Error('Detached figure part');
  const h=headPart(raw,W,H).head;registration.push({stage:i+1,scale,dx,dy,headWidth:h.r-h.l+1,headTop:h.t,headCenter:(h.l+h.r)/2,wholeFigure:true});
  stages.push(raw);await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/stages/stage-${String(i+1).padStart(2,'0')}.png`);
 }
 // Render a continuous sway from one intact drawing. Generated keys remain for review.
 const count=48,holdsMs=Array.from({length:count},(_,i)=>Math.round((i+1)*1000/30)-Math.round(i*1000/30)),columns=8,rows=6;
 const sheet=Buffer.alloc(W*columns*H*rows*4),renderer=require('./render-hip-sway.cjs');
 for(let i=0;i<count;i++){
  const raw=renderer.render(stages[0],2*Math.PI*i/count);
  for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
 }
 require('./archive-unused-frames.cjs')(out+'/frames',count);
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const data={clip:'Intro/Dance/Lu_Dance_HipMove',file:'dance-v9/spritesheet.png',frameDir:'dance-v9/frames',exportPipeline:'continuous-hip-sway-v9',columns,rows,cellWidth:W,cellHeight:H,root:[256,592],frameCount:count,sourceFrameCount:1,wholeFigure:true,fixedHead:true,fixedUpperBody:false,loop:true,holdsMs,durationMs:1600,renderedMotion:{fps:30,canonical:'dance-v9/stages/stage-01.png',hipAmplitudePx:12,headAmplitudePx:0,fixedShoeRows:[545,639],periodic:true},registration,description:'A continuous hands-on-hips sway with a gentle torso sway and planted shoes.',method:'One intact whole-character drawing is rendered through a continuous smooth hip-sway mapping at 30 fps over 1600 ms. The pelvis moves twelve source pixels each way; the full head and collar band remain fixed. Motion tapers smoothly to zero above the shoes. The vertical map is continuous, with a subpixel settling motion. All pixels sample the original artwork once with premultiplied-alpha bilinear filtering. There are no separated arms, torso, shorts or leg layers, no crossfaded poses and no independently scaled frames. Forty-eight rendered frames are not forty-eight independently drawn poses. The generated pose sheet and rejected pose-switch sequence remain recoverable; stage 1 supplies the intact canonical art. Common scale normalization follows.',review:{status:'continuous_hip_sway_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-dance-v9.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(out+'/quality.json',JSON.stringify({registration,rejectedSourceStages:[2,7,8,9,10,11,12],reason:'Stage 2 interrupts head trajectory; stages 7–12 reverse the flame silhouette',extraction:ext.audit},null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Whole-character hip dance\n\n'+data.method+'\n\nCanonical: `stages/stage-01.png`. Source: `sources/poses.png`; exact request: `prompt.json`. Active frames: `../scale-v6/frames/`. Rebuild with `node tools/build-dance-v9.cjs`, then `node tools/normalize-library-scale.cjs --refresh-source --only=27-intro-dance-lu-dance-hipmove`, then `node tools/build-sparky-library.cjs 27-intro-dance-lu-dance-hipmove`.\n');
 console.log(JSON.stringify(data,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
