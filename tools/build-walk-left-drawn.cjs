/** Pack whole drawn walk figures. Never split, bend, mirror or morph body parts. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),dir=path.join(ROOT,'animation/sparky/improved/06-common-walk-lu-walk-left'),W=512,H=640;
(async()=>{
 const sets=[];for(const half of ['a','b'])sets.push(await require('./extract-sparky-figures.cjs').extractFigures(path.join(dir,`sources/walk-half-${half}-v4.png`),{count:8}));
 // Exclude the early torso flip in A2, wrong leading limb in A6 and repeated final B contacts.
 const order=[[0,0],[0,2],[0,3],[0,4],[0,6],[0,7],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]];
 const first=sets[0].frames[0],landmark=f=>require('./sparky-parts.cjs').headPart(f.raw,f.w,f.h);
 function bounds(f){let l=f.w,r=-1,t=f.h,b=-1;for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(f.raw[(y*f.w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {l,r,t,b};}
 const p0=landmark(first),s0=bounds(first),headWidth=(p0.head.r-p0.head.l+1)*400/(s0.b-s0.t+1),outputs=[],registration=[];
 const frameDir=path.join(dir,'frames-drawn-v4');fs.mkdirSync(frameDir,{recursive:true});
 for(let i=0;i<order.length;i++){
  const [half,key]=order[i],f=sets[half].frames[key],p=landmark(f),s=bounds(f),scale=headWidth/(p.head.r-p.head.l+1);
  const left=Math.round(256-p.neckX*scale),top=Math.round(592-s.b*scale);
  const input=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(Math.round(f.w*scale),Math.round(f.h*scale),{kernel:'lanczos3'}).png().toBuffer();
  if(left<0||top<0)throw Error('Figure does not fit');
  const png=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left,top}]).png().toBuffer();outputs.push(png);fs.writeFileSync(path.join(frameDir,`frame-${String(i+1).padStart(3,'0')}.png`),png);
  registration.push({frame:i+1,sourceHalf:half===0?'a':'b',sourceFrame:key+1,scale,left,top,neck:[256,top+p.jawY*scale],headWidth,wholeFigure:true});
 }
 const file='06_walk_drawn_v4.png';await sharp({create:{width:W*4,height:H*3,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(outputs.map((input,i)=>({input,left:i%4*W,top:Math.floor(i/4)*H}))).png().toFile(path.join(dir,file));
 const data={clip:'Common/Walk/Lu_Walk_Left',file,exportPipeline:'walk-drawn-v4',columns:4,rows:3,frameCount:12,uniqueDrawings:12,sourceFrameCount:16,cellWidth:W,cellHeight:H,root:[256,592],loop:true,holdsMs:Array(12).fill(1000/16),durationMs:750,fixedHead:false,registration,method:'Twelve selected complete full-body drawings generated with built-in imagegen from original identity and opposite-contact references. Uniform whole-figure scale based on head volume, registered by neck horizontal and ground contact. No cutout rig, separated limbs, mesh deformation, optical flow, crossfade or duplicated in-betweens.',description:'A drawn left-facing walk with alternating contact and passing poses. Twelve unique complete drawings, 750 ms per cycle.',review:{status:'needs_visual_review',artisticApproval:false}};
 fs.writeFileSync(path.join(dir,'animation-drawn-v4.json'),JSON.stringify(data,null,2)+'\n');fs.writeFileSync(path.join(dir,'drawn-v4-extraction-audit.json'),JSON.stringify(sets.map(s=>s.audit),null,2)+'\n');
 // Keep the standard loose-frame path consistent. Preserve previous exports first.
 const loose=path.join(dir,'frames'),archive=path.join(dir,'frames-before-drawn-v4');if(!fs.existsSync(archive))fs.cpSync(loose,archive,{recursive:true});
 for(const name of fs.readdirSync(loose))if(/^frame-\d+\.png$/.test(name))fs.unlinkSync(path.join(loose,name));
 for(let i=0;i<12;i++)fs.copyFileSync(path.join(frameDir,`frame-${String(i+1).padStart(3,'0')}.png`),path.join(loose,`frame-${String(i+1).padStart(3,'0')}.png`));
 fs.writeFileSync(path.join(dir,'GENERATION.md'),'# Drawn left walk v4\n\n'+data.method+'\n\nThe rejected v3 cutout rig is inactive. Prompt set: `drawn-v4-prompts.json`. Source artwork: `sources/walk-half-a-v4.png` and `sources/walk-half-b-v4.png`. Rebuild: `node tools/build-walk-left-drawn.cjs`, then `node tools/build-sparky-library.cjs 06-common-walk-lu-walk-left`. These are actual whole drawings, not 60 rig samples.\n');
 console.log('Packed12 whole drawn walk frames. Head size:',headWidth.toFixed(2),'Neck heights:',registration.map(r=>r.neck[1].toFixed(1)).join(', '));
})().catch(e=>{console.error(e);process.exitCode=1});
