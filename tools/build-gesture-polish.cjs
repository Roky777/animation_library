/** Pack whole, registered gesture drawings. No separated body parts or invented interpolation. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures,connected}=require('./extract-sparky-figures.cjs');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'animation/sparky/improved'),W=512,H=640,FLOOR=592;
const registry=JSON.parse(fs.readFileSync(BASE+'/manifest.json'));
const json=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n');
const configs={
 13:{exposure:45,loop:false,description:'Surprise builds through raised brows, rounded mouth and open hands, then gently recovers.'},
 14:{exposure:45,loop:true,description:'A gentle laugh beat with a hand on the tummy, followed by recovery.'},
 15:{exposure:65,loop:false,description:'Both hands rise onto the hips, then settle into a confident stance.'},
 16:{exposure:65,loop:false,description:'Raise one forearm, extend the thumb, and hold the thumbs-up.'},
 17:{exposure:35,loop:true,description:'Hands approach along matching arcs, touch at the center, and release.'},
 18:{exposure:55,loop:false,description:'Raise one hand, wave at the wrist, and lower the arm.'},
 19:{exposure:40,loop:false,description:'A small downward head nod followed by a return to neutral.'},
 20:{exposure:45,loop:false,description:'Turn the head gently left, then right, and settle facing forward.'}
};
function bounds(raw,w,h){let l=w,r=-1,t=h,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return{l,r,t,b};}
function feet(raw,w,h,box){let l=w,r=-1;for(let y=Math.floor(box.b-(box.b-box.t)*.105);y<=box.b;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);}return{l,r,x:(l+r)/2,y:box.b};}
(async()=>{
 const canonical=await sharp(BASE+'/01-idle/frames/frame-001.png').ensureAlpha().raw().toBuffer(),targetHead=headPart(canonical,W,H),targetWidth=targetHead.head.r-targetHead.head.l+1;
 for(const [numStr,config] of Object.entries(configs)){
  const number=Number(numStr);if(process.argv[2]&&number!==Number(process.argv[2]))continue;
  const entry=registry.entries.find(e=>Number(e.id.slice(0,2))===number),dir=BASE+'/'+entry.id,out=dir+'/polished-v3',source=out+'/sources/stages.png';
  if(!fs.existsSync(source)){console.log('Awaiting artwork:',entry.id);continue;}
  const ext=await extractFigures(source,{count:9,columns:3}),stages=[],registration=[];
  fs.mkdirSync(out+'/stages',{recursive:true});fs.mkdirSync(out+'/frames',{recursive:true});
  for(let i=0;i<9;i++){
   const f=ext.frames[i],head=headPart(f.raw,f.w,f.h),box=bounds(f.raw,f.w,f.h),sole=feet(f.raw,f.w,f.h,box);
   // Whole-figure similarity transform; the neck, shirt, gloves and limbs stay connected.
   const scale=targetWidth/(head.head.r-head.head.l+1),rw=Math.round(f.w*scale),rh=Math.round(f.h*scale);
   const left=Math.round(256-sole.x*scale),top=Math.round(FLOOR-sole.y*scale);
   if(left<0||top<0||left+rw>W||top+rh>H)throw Error(`${entry.id}: stage ${i+1} cannot fit without clipping`);
   const input=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).png().toBuffer();
   let png=await sharp({create:{width:W,height:H,channels:4,background:'#00000000'}}).composite([{input,left,top}]).png().toBuffer();
   // Snap the rendered opaque sole baseline once, avoiding resize-rounding jitter.
   const rendered=await sharp(png).ensureAlpha().raw().toBuffer(),renderBox=bounds(rendered,W,H),renderFeet=feet(rendered,W,H,renderBox);
   const dx=Math.round(256-renderFeet.x),dy=FLOOR-renderBox.b,registered=Buffer.alloc(rendered.length);
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H)rendered.copy(registered,(yy*W+xx)*4,(y*W+x)*4,(y*W+x+1)*4);}
   png=await sharp(registered,{raw:{width:W,height:H,channels:4}}).png().toBuffer();
   stages.push(png);fs.writeFileSync(out+`/stages/stage-${String(i+1).padStart(2,'0')}.png`,png);
   registration.push({stage:i+1,wholeFigure:true,scale,left:left+dx,top:top+dy,footAnchor:[256,FLOOR],sourceFootAnchor:sole,headWidth:targetWidth});
  }
  const forward=[0,1,2,3,4,5,6,7,8];let order;
  if(number===14)order=[0,1,2,3,4,3,2,1];
  else if(number===20)order=[4,3,2,1,0,1,2,3,4,5,6,7,8,7,6,5,4];
  else if([15,16].includes(number))order=forward;
  else if(number===18)order=[0,1,2,3,4,5,6,7,8,7,6,7,8,7,6,5,4,3,2,1,0];
  else order=forward.concat(config.loop?[7,6,5,4,3,2,1]:[7,6,5,4,3,2,1,0]);
  const holds=order.map(()=>config.exposure);
  if(!config.loop){holds[0]+=120;holds[holds.length-1]+=number===15||number===16?600:200;}
  if(number===13)holds[8]+=240;
  if(number===14){holds[0]+=60;holds[4]+=70;}
  if(number===17){holds[0]+=35;holds[8]+=45;}
  if(number===19)holds[8]+=80;
  const columns=4,rows=Math.ceil(order.length/columns),raw=Buffer.alloc(columns*W*rows*H*4),frameAudit=[];
  for(let i=0;i<order.length;i++){
   const png=stages[order[i]],rgba=await sharp(png).ensureAlpha().raw().toBuffer();
   fs.writeFileSync(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`,png);
   for(let y=0;y<H;y++)rgba.copy(raw,((Math.floor(i/columns)*H+y)*columns*W+i%columns*W)*4,y*W*4,(y+1)*W*4);
   const m=Uint8Array.from({length:W*H},(_,p)=>rgba[p*4+3]>128?1:0),groups=connected(m,W,H),b=bounds(rgba,W,H),p=headPart(rgba,W,H);
   if(b.l===0||b.t===0||b.r===W-1||b.b===H-1)throw Error('Clipped export');
   frameAudit.push({frame:i+1,stage:order[i]+1,bounds:b,headWidth:p.head.r-p.head.l+1,detachedPixels:groups.slice(1).reduce((s,g)=>s+g.n,0)});
  }
  require('./archive-unused-frames.cjs')(out+'/frames',order.length);
  await sharp(raw,{raw:{width:columns*W,height:rows*H,channels:4}}).png().toFile(out+'/spritesheet.png');
  const meta={clip:entry.clip,file:'polished-v3/spritesheet.png',exportPipeline:'gesture-polished-v3',frameDir:'polished-v3/frames',columns,rows,frameCount:order.length,uniqueDrawings:new Set(order).size,sourceFrameCount:9,sourcePoseOrder:order,...(number===14?{excludedSourceStages:[5,6,7,8],exclusionReason:'The later four source cells introduce extra compression/recovery beats. The coherent first five stages form one laugh beat.'}:{}),cellWidth:W,cellHeight:H,root:[256,FLOOR],loop:config.loop,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b,0),fixedHead:false,fixedBody:false,registration,review:{status:'redraw_review',artisticApproval:false},description:config.description,method:'Nine built-in imagegen motion stages. Complete-figure alpha extraction; whole-figure scaling stabilizes head size and sole registration fixes the ground anchor. Reusing the same approach drawings in reverse gives an exact recovery path. No separated body parts, mesh deformation, crossfade or optical flow. Readable contact/terminal holds are explicit in timing. New artwork remains subject to visual review.'};
  json(dir+'/animation-polished-v3.json',meta);json(out+'/quality.json',{technicalChecks:'Packing, edge clipping, connected-component counts, head width and source-stage order.',frameAudit,extraction:ext.audit,artisticApproval:false});
  fs.writeFileSync(out+'/README.md',`# ${entry.clip}\n\n${meta.method}\n\nWorking sheet: \`${path.relative(ROOT,out)}/spritesheet.png\`. Loose playback cells: \`frames/\`; nine source stages: \`stages/\`; exact prompt: \`prompt.json\`. Prior versions remain in the parent directory.\n\n${meta.frameCount} playback frames, ${meta.uniqueDrawings} unique drawings, ${meta.durationMs} ms, ${meta.loop?'loop':'one shot'}. Source order is zero-based in the metadata. Rebuild with \`node tools/build-gesture-polish.cjs ${number}\`.\n`);
  console.log(`${entry.id}: ${order.length} cells, ${meta.durationMs} ms`);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
