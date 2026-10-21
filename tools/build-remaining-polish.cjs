/** Whole-character motion packing, explicit airborne registration and a rigid pickup pedestal. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures,connected}=require('./extract-sparky-figures.cjs'),{headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=ROOT+'/animation/sparky/improved',W=512,H=640;
const registry=JSON.parse(fs.readFileSync(BASE+'/manifest.json'));
const plans=JSON.parse(fs.readFileSync(ROOT+'/tools/remaining-polish-jobs.json'));
const json=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n');
function bounds(raw,w,h){let l=w,r=-1,t=h,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return{l,r,t,b};}
function soles(raw,w,h,box,blueOnly=false){let l=w,r=-1,b=-1;for(let y=Math.max(0,box.b-Math.round((box.b-box.t)*.18));y<=box.b;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;if(raw[p+3]>180&&(!blueOnly||(raw[p+2]>raw[p]+25&&raw[p+2]>raw[p+1]*1.05))){l=Math.min(l,x);r=Math.max(r,x);b=Math.max(b,y);}}return{x:(l+r)/2,y:blueOnly?b:box.b};}
function translate(raw,dx,dy){const out=Buffer.alloc(raw.length);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H)raw.copy(out,(yy*W+xx)*4,(y*W+x)*4,(y*W+x+1)*4);}return out;}
function tableBounds(raw){const p=headPart(raw,W,H),mask=new Uint8Array(W*H);for(let y=Math.round(p.jawY+30);y<H;y++)for(let x=Math.round(p.neckX+(p.head.r-p.head.l)*.32);x<W;x++){const off=(y*W+x)*4,r=raw[off],g=raw[off+1],b=raw[off+2];if(raw[off+3]>128&&r>110&&g>65&&r>g*1.05&&g>b*1.15&&b<215)mask[y*W+x]=1;}
 const groups=connected(mask,W,H),group=groups[0];if(!group||group.n<500)throw Error('Missing pedestal');const parts=groups.filter(g=>g.n>50&&Math.abs(g.cx-group.cx)<55&&g.b>=group.t-65&&g.t<=group.b+10);return{l:Math.max(0,Math.min(...parts.map(g=>g.l))-5),r:Math.min(W-1,Math.max(...parts.map(g=>g.r))+5),t:Math.max(0,Math.min(...parts.map(g=>g.t))-5),b:Math.min(H-1,Math.max(...parts.map(g=>g.b))+5)};}
function copyRect(raw,b){const out=Buffer.alloc(raw.length);for(let y=b.t;y<=b.b;y++)raw.copy(out,(y*W+b.l)*4,(y*W+b.l)*4,(y*W+b.r+1)*4);return out;}
function rigidPedestal(stages){
 const boxes=stages.map(tableBounds),reference=boxes[8],initial=boxes[0],target=boxes[4],cx=Math.round((target.l+target.r)/2);
 const empty=copyRect(stages[8],reference),eb=bounds(empty,W,H),shiftX=cx-Math.round((eb.l+eb.r)/2),shiftY=592-eb.b;
 const pedestal=translate(empty,shiftX,shiftY),targetBox=bounds(pedestal,W,H);
 const cupMask=new Uint8Array(W*H),initialCenter=(initial.l+initial.r)/2;
 for(let y=Math.max(0,initial.t-100);y<initial.t+15;y++)for(let x=Math.max(0,Math.floor(initialCenter-35));x<=Math.min(W-1,Math.ceil(initialCenter+35));x++){const p=(y*W+x)*4,r=stages[0][p],g=stages[0][p+1],b=stages[0][p+2];if(stages[0][p+3]>80&&b>r*1.05&&g>=r*.95&&b>g*1.02)cupMask[y*W+x]=1;}
 const cup=connected(cupMask,W,H)[0];if(!cup)throw Error('Missing initial glass');
 const cupBox={l:cup.l-2,r:cup.r+2,t:cup.t-2,b:cup.b+2},glass=translate(copyRect(stages[0],cupBox),Math.round(cx-(cup.l+cup.r)/2),targetBox.t+9-cup.b),completeProp=Buffer.from(pedestal);
 for(let p=0;p<W*H;p++)if(glass[p*4+3])glass.copy(completeProp,p*4,p*4,p*4+4);
 const propBox={...initial,t:Math.max(0,initial.t-100)};
 for(let i=0;i<stages.length;i++){
  const original=stages[i],b=boxes[i],actor=Buffer.from(original),protect=new Uint8Array(W*H);
  for(let y=Math.max(0,b.t-8);y<=Math.min(b.b,b.t+18);y++)for(let x=b.l;x<=b.r;x++){const off=(y*W+x)*4;if(original[off+3]>80&&original[off]>205&&original[off+1]>205&&original[off+2]>205)for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H)protect[yy*W+xx]=1;}}
  const clear={...(i===0?propBox:b),b:H-1};
  for(let y=clear.t;y<=clear.b;y++)for(let x=clear.l;x<=clear.r;x++)if(i===0||!protect[y*W+x])actor.fill(0,(y*W+x)*4,(y*W+x+1)*4);
  const result=Buffer.from(i===0?completeProp:pedestal);
  for(let p=0;p<W*H;p++){const a=actor[p*4+3]/255;if(!a)continue;const old=result[p*4+3]/255,alpha=a+old*(1-a);for(let c=0;c<3;c++)result[p*4+c]=Math.round((actor[p*4+c]*a+result[p*4+c]*old*(1-a))/alpha);result[p*4+3]=Math.round(alpha*255);}
  stages[i]=result;
 }
 return{box:targetBox,method:'One rigid pedestal raster is reused beneath the actor/cup drawing in every stage. Foreground glove edges are protected when removing the source pedestal. The first prop (including the resting glass) is aligned to the contact-stage position.'};
}
(async()=>{
 const canonical=await sharp(BASE+'/01-idle/frames/frame-001.png').ensureAlpha().raw().toBuffer(),ref=headPart(canonical,W,H),headWidth=ref.head.r-ref.head.l+1;
 for(const plan of plans){
  const n=plan.number;if(process.argv[2]&&Number(process.argv[2])!==n)continue;
  if(n===27){console.log('Hip dance now uses tools/build-dance-drawn.cjs; rejected texture sway is inactive.');continue;}
  const e=registry.entries.find(e=>Number(e.id.slice(0,2))===n),dir=BASE+'/'+e.id,out=dir+'/remaining-v3';
  let source=out+'/sources/stages.png';if([10,27].includes(n)){source=out+'/sources/stages-corrected.png';if(!fs.existsSync(source)){console.log('Awaiting corrected guide artwork:',e.id);continue;}}
  const ext=await extractFigures(source,{count:plan.count,columns:plan.columns}),stages=[],registration=[];
  if(n===10){for(const j of [2,3,4,5]){const corrected=out+`/sources/arm-fixed-${j+1}.png`;if(fs.existsSync(corrected)){const {data,info}=await sharp(corrected).ensureAlpha().raw().toBuffer({resolveWithObject:true});ext.frames[j]={raw:data,w:info.width,h:info.height};}}}
  fs.mkdirSync(out+'/frames',{recursive:true});fs.mkdirSync(out+'/stages',{recursive:true});
  for(let i=0;i<plan.count;i++){
   const f=ext.frames[i],p=headPart(f.raw,f.w,f.h),b=bounds(f.raw,f.w,f.h),sole=soles(f.raw,f.w,f.h,b,n===26);
   let scale=n===25?Math.sqrt(ref.head.n/p.head.n):headWidth/(p.head.r-p.head.l+1),anchorX=n===10?p.neckX:n===25?(b.l+b.r)/2:sole.x,anchorY=sole.y,targetX=n===26?210:256,targetY=592;
   if(n===11&&[3,4,5].includes(i)){anchorX=p.neckX;anchorY=p.jawY;targetY=400-[0,0,0,35,110,65,0,0][i];}
   if(n===10&&[3,7].includes(i)){anchorY=p.jawY;targetY=380;}
   let left=Math.round(targetX-anchorX*scale),top=Math.round(targetY-anchorY*scale),rw=Math.round(f.w*scale),rh=Math.round(f.h*scale);
   if(left<0||top<0||left+rw>W||top+rh>H)throw Error(`${e.id} stage ${i+1}: does not fit ${left},${top},${rw},${rh}`);
   const input=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).png().toBuffer();
   let raw=await sharp({create:{width:W,height:H,channels:4,background:'#00000000'}}).composite([{input,left,top}]).ensureAlpha().raw().toBuffer(),rb=bounds(raw,W,H),rs=soles(raw,W,H,rb,n===26),dx=0,dy=0;
   if(n===10&&[3,7].includes(i))dy=Math.min(0,568-rb.b);
   else if(!(n===11&&[3,4,5].includes(i))){dy=592-(n===26?rs.y:rb.b);if(![10,25].includes(n))dx=Math.round(targetX-rs.x);}
   raw=translate(raw,dx,dy);stages.push(raw);registration.push({stage:i+1,scale,left:left+dx,top:top+dy,wholeFigure:true,airborne:n===11?[3,4,5].includes(i):n===10?[3,7].includes(i):false});
  }
  let prop=null;if(n===26)prop=rigidPedestal(stages);
  for(let i=0;i<stages.length;i++)await sharp(stages[i],{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/stages/stage-${String(i+1).padStart(2,'0')}.png`);
  if(n===27){await require('./bake-dance-sway.cjs').build(ROOT,e,stages[4],registration);continue;}
  let order=Array.from({length:plan.count},(_,i)=>i),loop=[10,27].includes(n),holds;
  if(n===3)order=order.concat([7,6,5,4,3,2,1,0]);
  if(n===21)order=[0,1,3,4,5,6,7,8];
  if(n===22)order=[0,1,2,3,4,5,6,7,6,5,4,3,2,1,0];
  if(n===27)order=[4,3,2,1,0,1,2,3,4,5,6,7,8,7,6,5];
  holds=order.map(()=>n===10?65:n===27?55:n===25?85:n===26?75:55);
  if(!loop){holds[0]+=130;holds[holds.length-1]+=[21,25,26].includes(n)?600:220;}
  if(n===3)holds[8]+=250;if(n===11)holds=[180,80,100,70,110,80,100,500];if(n===22)holds[7]+=200;
  const columns=4,rows=Math.ceil(order.length/columns),sheet=Buffer.alloc(columns*W*rows*H*4),audit=[];
  for(let i=0;i<order.length;i++){
   const raw=stages[order[i]],b=bounds(raw,W,H),p=headPart(raw,W,H),components=connected(Uint8Array.from({length:W*H},(_,p)=>raw[p*4+3]>128?1:0),W,H);
   if(b.l===0||b.r===W-1||b.t===0||b.b===H-1)throw Error(`${e.id}: clipped export`);
   for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*columns*W+i%columns*W)*4,y*W*4,(y+1)*W*4);
   await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
   audit.push({frame:i+1,stage:order[i]+1,bounds:b,headWidth:p.head.r-p.head.l+1,headArea:p.head.n,airborne:registration[order[i]].airborne,components:components.map(g=>g.n)});
  }
  require('./archive-unused-frames.cjs')(out+'/frames',order.length);
  await sharp(sheet,{raw:{width:columns*W,height:rows*H,channels:4}}).png().toFile(out+'/spritesheet.png');
  for(const src of ['animation.json'])if(fs.existsSync(dir+'/'+src)&&!fs.existsSync(out+'/before-working-animation.json'))fs.copyFileSync(dir+'/'+src,out+'/before-working-animation.json');
  const data={clip:e.clip,file:'remaining-v3/spritesheet.png',exportPipeline:'remaining-polished-v3',frameDir:'remaining-v3/frames',columns,rows,cellWidth:W,cellHeight:H,root:[256,592],frameCount:order.length,uniqueDrawings:new Set(order).size,sourcePoseOrder:order,loop,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b,0),registration,prop,review:{status:'redraw_review',artisticApproval:false},description:({3:'Raise a hand to the chin, wonder, then return to neutral.',10:'Right-facing run with alternating supports and two flight phases.',11:'Anticipate, jump into the air, descend, land and recover.',21:'Raise and extend one arm to point right, then hold.',22:'Open the arms, give a gentle hug and release.',25:'Wake from lying to a supported cross-legged seated pose.',26:'Reach, grip and lift the glass from its fixed pedestal.',27:'Shift hips side to side with planted feet and counterbalancing shoulders.'})[n],method:'Built-in imagegen whole-character motion stages. Whole-figure scale registration stabilizes character volume. Ground contacts are fixed; genuine airborne run/jump stages retain explicit vertical clearance. Recovery and loop ordering use reviewed source stages. No separated head/body, frame crossfade or optical flow. New drawings require visual review.'};
  json(dir+'/animation-remaining-v3.json',data);json(out+'/quality.json',{frameAudit:audit,extraction:ext.audit,prop,artisticApproval:false});
  fs.writeFileSync(out+'/README.md',`# ${e.clip}\n\n${data.method}\n\n${order.length} frames; ${data.durationMs} ms; ${loop?'loop':'one shot'}. Source order and registration are in \`../animation-remaining-v3.json\`. Loose stages and playback cells are in \`stages/\` and \`frames/\`. Exact built-in generation prompts are in \`prompt.json\` and any \`correction-prompt.json\`. Rebuild with \`node tools/build-remaining-polish.cjs ${n}\`.\n`);
  console.log(e.id,order.length,data.durationMs);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
