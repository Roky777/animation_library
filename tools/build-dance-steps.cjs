/** Whole drawn hip-dance poses. No row displacement or cutout body parts. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures,connected}=require('./extract-sparky-figures.cjs');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),id='27-intro-dance-lu-dance-hipmove',dir=ROOT+'/animation/sparky/improved/'+id,out=dir+'/dance-v5',W=512,H=640;
function bounds(raw,w,h){let l=w,r=-1,t=h,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return{l,r,t,b};}
(async()=>{
 const source=out+'/sources/poses.png',ext=await extractFigures(source,{count:8,columns:4}),frames=[],audit=[];
 fs.mkdirSync(out+'/frames',{recursive:true});fs.mkdirSync(out+'/stages',{recursive:true});
 for(let i=0;i<ext.frames.length;i++){
  const f=ext.frames[i],p=headPart(f.raw,f.w,f.h),scale=218/(p.head.r-p.head.l+1),rw=Math.round(f.w*scale),rh=Math.round(f.h*scale);
  const resized=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer(),b=bounds(resized,rw,rh);
  let footL=rw,footR=-1;for(let y=b.b-30;y<=b.b;y++)for(let x=0;x<rw;x++)if(resized[(y*rw+x)*4+3]>180){footL=Math.min(footL,x);footR=Math.max(footR,x);}
  const dx=Math.round(256-(p.head.l+p.head.r)/2*scale),dy=592-b.b,raw=Buffer.alloc(W*H*4);
  if(dx<0||dy<0||dx+rw>W||dy+rh>H)throw Error('Pose does not fit');
  for(let y=0;y<rh;y++)resized.copy(raw,((y+dy)*W+dx)*4,y*rw*4,(y+1)*rw*4);
  const box=bounds(raw,W,H),hp=headPart(raw,W,H),groups=connected(Uint8Array.from({length:W*H},(_,j)=>raw[j*4+3]>128?1:0),W,H);
  if(groups.some((g,j)=>j>0&&g.n>60))throw Error('Disconnected artwork in pose '+(i+1));
  if(box.t<5||box.l<5||box.r>506)throw Error('Clipped pose');
  frames.push(raw);audit.push({frame:i+1,bounds:box,headWidth:hp.head.r-hp.head.l+1,headCenter:(hp.head.l+hp.head.r)/2,scale,dx,dy,components:groups.map(g=>g.n)});
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/stages/stage-${String(i+1).padStart(2,'0')}.png`);
 }
 const sourcePoseOrder=[0,1,2,3,0,5,6,7],ordered=sourcePoseOrder.map(i=>frames[i]);
 const columns=4,rows=2,sheet=Buffer.alloc(W*columns*H*rows*4);
 ordered.forEach((raw,i)=>{for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);});
 for(let i=0;i<ordered.length;i++)await sharp(ordered[i],{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const holdsMs=[100,110,160,110,100,110,160,110],data={clip:'Intro/Dance/Lu_Dance_HipMove',file:'dance-v5/spritesheet.png',exportPipeline:'dance-drawn-v5',frameDir:'dance-v5/frames',columns,rows,frameCount:8,uniqueDrawings:7,sourcePoseOrder,cellWidth:W,cellHeight:H,root:[256,592],loop:true,holdsMs,durationMs:holdsMs.reduce((a,b)=>a+b,0),description:'A clear front-facing dance: step outward, close the feet for a tap, reopen, and repeat toward the opposite side.',method:'Seven selected complete built-in imagegen dance drawings form eight playback cells. Full-character registration uses a shared head-center x256, 218 px head width and y592 ground contact. Side steps and inward toe-taps alternate, with a longer tap exposure. The exact same center drawing is reused for the second half to avoid a center-pose contour jump. No one-image displacement, separated body patches, crossfade or optical-flow synthesis. Visual approval pending.',review:{status:'step_touch_dance_review',artisticApproval:false},registration:sourcePoseOrder.map((j,i)=>({...audit[j],frame:i+1,sourceStage:j+1}))};
 fs.writeFileSync(dir+'/animation-dance-v5.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(out+'/quality.json',JSON.stringify({frames:audit,extraction:ext.audit,artisticApproval:false},null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Drawn step-touch dance v5\n\n'+data.method+'\n\nRebuild: `node tools/build-dance-steps.cjs`; publish: `node tools/build-sparky-library.cjs '+id+'`. Exact built-in imagegen source prompt: `prompt.json`. Source stage 5 is replaced by the exact center stage 1. All eight source stages remain in `stages/`. The rejected texture warp remains in `../remaining-v3/` for recovery.\n');
 console.log(JSON.stringify(data,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
