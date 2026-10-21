/** Authored dance legs beneath one stable upper drawing, with clean glove masks. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures,connected}=require('./extract-sparky-figures.cjs');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),id='27-intro-dance-lu-dance-hipmove',dir=ROOT+'/animation/sparky/improved/'+id,out=dir+'/dance-v8',W=512,H=640;
function bounds(raw,w,h){let l=w,r=-1,t=h,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return{l,r,t,b};}
(async()=>{
 const source=out+'/sources/poses.png',ext=await extractFigures(source,{count:12,columns:4}),frames=[],audit=[],widths=ext.frames.map(f=>{const h=headPart(f.raw,f.w,f.h).head;return h.r-h.l+1;}).sort((a,b)=>a-b),sharedScale=218/widths[Math.floor(widths.length/2)];
 fs.mkdirSync(out+'/frames',{recursive:true});fs.mkdirSync(out+'/stages',{recursive:true});
 for(let i=0;i<ext.frames.length;i++){
  const f=ext.frames[i],p=headPart(f.raw,f.w,f.h),scale=sharedScale,rw=Math.round(f.w*scale),rh=Math.round(f.h*scale);
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
 const stable=await require('./stabilize-dance-upper.cjs').stabilize(frames,sharp),sourcePoseOrder=stable.sourceOrder,ordered=stable.frames;await sharp(stable.upper,{raw:{width:W,height:H,channels:4}}).png().toFile(out+'/fixed-upper.png');
 const columns=4,rows=4,sheet=Buffer.alloc(W*columns*H*rows*4);
 ordered.forEach((raw,i)=>{for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);});
 for(let i=0;i<ordered.length;i++)await sharp(ordered[i],{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const holdsMs=[80,70,100,70,160,70,100,70,80,70,100,70,160,70,100,70],data={clip:'Intro/Dance/Lu_Dance_HipMove',file:'dance-v8/spritesheet.png',exportPipeline:'dance-drawn-v8',frameDir:'dance-v8/frames',columns,rows,frameCount:16,uniqueDrawings:9,fixedHead:true,fixedUpperBody:true,mirroredLegs:stable.mirrored,sourcePoseOrder,cellWidth:W,cellHeight:H,root:[256,592],loop:true,holdsMs,durationMs:holdsMs.reduce((a,b)=>a+b,0),description:'A clear front-facing dance: step outward, close the feet for a tap, reopen, and repeat toward the opposite side.',method:'Five coherent built-in imagegen lower-body drawings form the left step-out, closing tap and reopening path. Their exact reversed return and mirrored lower-body counterparts form sixteen playback cells with nine distinct assembled poses. One complete canonical upper body, flame, face, shirt, arms and gloves is held unchanged. The pants overlap beneath the original shirt hem; no neck or head part is cut. Glove masks preserve the shorts stripes and exclude the old lower outline. Disconnected lower-body specks are discarded before contact registration; only the legs translate to y592, with the waist extended beneath the shirt. The fixed upper drawing uses fully opaque interior pixels so compositing does not leak changing pixels beneath it. Only the lower-body art is mirrored, so the flame and PW logo retain their orientation. Source rows with head/model drift are excluded from active playback. The same center image is reused halfway through. Native source artwork is assembled without frame crossfades or optical-flow synthesis; common scale-v6 normalization and gentle runtime breathing follow.',review:{status:'step_touch_dance_review',artisticApproval:false},sourceRegistration:audit,registration:sourcePoseOrder.map((j,i)=>({...audit[0],frame:i+1,sourceStage:j+1,lowerBodyMirrored:i>8,wholeFigure:false,fixedUpperBody:true}))};
 fs.writeFileSync(dir+'/animation-dance-v8.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(out+'/quality.json',JSON.stringify({frames:audit,extraction:ext.audit,artisticApproval:false},null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Stable sixteen-cell dance v8\n\n'+data.method+'\n\nRebuild: `node tools/build-dance-v8.cjs`; normalize: `node tools/normalize-library-scale.cjs --refresh-source --only='+id+'`; publish: `node tools/build-sparky-library.cjs '+id+'`. Exact built-in imagegen source prompt: `prompt.json`. Only the coherent first five source stages drive the lower body; all twelve generated source stages remain in `stages/`. The rejected texture warp remains in `../remaining-v3/` for recovery.\n');
 console.log(JSON.stringify(data,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
