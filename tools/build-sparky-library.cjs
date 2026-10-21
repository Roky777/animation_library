/** Isolate original figures, register anatomical landmarks, and pack timed playback cells. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),W=512,H=640,FLOOR=592;
const manifestPath=path.join(ROOT,'animation/sparky/improved/manifest.json');
const jobs=JSON.parse(fs.readFileSync(path.join(__dirname,'remaining-animation-jobs.json')));
const descriptions={1:'A quiet standing breathing loop.',6:'Walk left in place with alternating steps and arm swing.',7:'Walk right in place with alternating steps and arm swing.',8:'A cheerful left-facing walk.',9:'A cheerful right-facing walk.',10:'Run in place with alternating contacts and flight.',11:'Crouch, jump, land and recover.',12:'Widen a friendly smile, then relax.',13:'React with raised hands and a surprised expression.',14:'Laugh while resting a hand on the tummy.',15:'Raise both hands to the hips and settle confidently.',16:'Raise a hand and present a thumbs-up.',17:'Bring the palms together, clap and separate.',18:'Raise a hand, wave hello and lower it.',19:'Nod yes and return to neutral.',20:'Shake the head gently from side to side.',21:'Raise the arm and point to the right.',22:'Open the arms, give an air hug and release.',23:'Sit cross-legged with relaxed breathing.',24:'Sleep on the side with gentle breathing.',25:'Wake from lying down and settle into a seated pose.',26:'Reach for the glass, grip it, lift it and hold it near the chest.',27:'Sway the hips from side to side with soft knee bends.'};
const json=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
function stats(raw,w,h){
 let l=w,r=-1,t=h,b=-1,n=0;const rows=[];
 for(let y=0;y<h;y++){let count=0;for(let x=0;x<w;x++){const p=(y*w+x)*4;if(raw[p+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++;n++;}}rows.push(count);}
 if(n<100)throw Error('Empty or missing pose');
 // Ignore a few scattered edge pixels in silhouette measurements.
 const ys=rows.map((n,y)=>n>6?y:-1).filter(y=>y>=0);t=ys[0];b=ys.at(-1);
 return {l,r,t,b,n,height:b-t+1,width:r-l+1,rows};
}
async function place(raw,sw,sh,scale,left,top){
 const rw=Math.max(1,Math.round(sw*scale)),rh=Math.max(1,Math.round(sh*scale));
 const png=await sharp(raw,{raw:{width:sw,height:sh,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).png().toBuffer();
 const cropX=Math.max(0,-left),cropY=Math.max(0,-top),x=Math.max(0,left),y=Math.max(0,top);
 const width=Math.min(rw-cropX,W-x),height=Math.min(rh-cropY,H-y);
 if(width<=0||height<=0)throw Error('Artwork outside canvas');
 const input=await sharp(png).extract({left:cropX,top:cropY,width,height}).png().toBuffer();
 return sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:x,top:y}]).png().toBuffer();
}
function timing(job){
 const holds=Array(16).fill(job.durationMs/16);
 // Gestures settle into a readable terminal hold; gaits keep a constant cycle.
 if(!job.loop){holds[0]+=180;holds[15]+=500;}
 return holds;
}
async function generated(job){
 const dir=path.join(ROOT,'animation/sparky/improved',job.id);
 if(fs.existsSync(path.join(dir,'animation-polished-v3.json'))){
  const data=JSON.parse(fs.readFileSync(path.join(dir,'animation-polished-v3.json')));json(path.join(dir,'animation.json'),data);return {dir,data,description:data.description,job};
 }
 if(fs.existsSync(path.join(dir,'animation-approved-v7.json'))){
  const data=JSON.parse(fs.readFileSync(path.join(dir,'animation-approved-v7.json')));json(path.join(dir,'animation.json'),data);return {dir,data,description:data.description,job};
 }
 if(fs.existsSync(path.join(dir,'animation-approved-v6.json'))){
  const data=JSON.parse(fs.readFileSync(path.join(dir,'animation-approved-v6.json')));json(path.join(dir,'animation.json'),data);return {dir,data,description:data.description,job};
 }
 if(job.number===6&&fs.existsSync(path.join(dir,'animation-drawn-v4.json'))){
  const data=JSON.parse(fs.readFileSync(path.join(dir,fs.existsSync(path.join(dir,'animation-drawn-v5.json'))?'animation-drawn-v5.json':'animation-drawn-v4.json')));json(path.join(dir,'animation.json'),data);return {dir,data,description:data.description,job};
 }
 const source=path.join(dir,fs.existsSync(path.join(dir,'sources/expanded-sheet-v2.png'))?'sources/expanded-sheet-v2.png':'sources/expanded-sheet-v1.png');
 if(!fs.existsSync(source))return null;
 const extraction=await require('./extract-sparky-figures.cjs').extractFigures(source);
 const frames=extraction.frames,measure=frames.map(f=>stats(f.raw,f.w,f.h));
 const parts=frames.map(f=>require('./sparky-parts.cjs').headPart(f.raw,f.w,f.h));
 const fixedHead=[1,6,7,8,9,10,15,16,17,18,21,22,27].includes(job.number);
 json(path.join(dir,'extraction-audit-v2.json'),extraction.audit);
 const sleeping=[23,24,25].includes(job.number),jump=job.number===11;
 // Set the shared head/reference scale before anatomical body registration.
 let scale;
 if(sleeping){
  // Anatomical head width is roughly 58% of neutral standing height. Use
  // the widest contiguous head-region scanline, excluding the lower body.
  const widths=frames.map(({raw,w,h},i)=>{const s=measure[i];let max=0;for(let y=s.t;y<s.t+s.height*.60;y++){let a=w,b=-1;for(let x=0;x<w;x++){const p=(y*w+x)*4;if(raw[p+3]>180&&raw[p]>170&&raw[p+1]>45&&raw[p+2]<130){a=Math.min(a,x);b=Math.max(b,x);}}max=Math.max(max,b-a+1);}return max;});
  scale=232/(widths.slice().sort((a,b)=>a-b)[8]||widths[0]);
 } else scale=400/measure[0].height;
 const maxWidth=Math.max(...measure.map(s=>s.width)),maxHeight=Math.max(...measure.map(s=>s.height));
 // All poses must fit the shared canvas. The fit bound applies once to the
 // entire sequence, retaining crouch, flight and support changes.
 scale=Math.min(scale,472/maxWidth,536/maxHeight);
 const stationary=!sleeping&&!jump&&![6,7,8,9,10].includes(job.number);
 const walking=[6,7,8,9].includes(job.number);
 const floorReference=Math.max(...measure.map(s=>s.b+frames[measure.indexOf(s)].sourceOrigin[1]-Math.floor(measure.indexOf(s)/4)*extraction.audit.sourceHeight/4));
 const sourceColumnWidth=extraction.audit.sourceWidth/4;
 const outputs=[],registration=[];
 fs.mkdirSync(path.join(dir,'frames'),{recursive:true});
 for(let i=0;i<16;i++){
  const {raw,w,h,sourceOrigin}=frames[i],s=measure[i];
  let anchorX=sourceColumnWidth/2-(sourceOrigin[0]-i%4*sourceColumnWidth),anchorY=floorReference-(sourceOrigin[1]-Math.floor(i/4)*extraction.audit.sourceHeight/4);
  if(stationary){
   // Register the stationary sole pair, not the moving head/arms/prop.
   let l=w,r=-1;for(let y=Math.max(s.t,s.b-Math.round(s.height*.13));y<=s.b;y++)for(let x=0;x<w;x++)if(Math.abs(x-parts[i].neckX)<(parts[i].head.r-parts[i].head.l)*.65&&raw[(y*w+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);}
   anchorX=(l+r)/2;anchorY=s.b;
  } else if(walking) {anchorY=s.b;anchorX=parts[i].neckX;}
  let frameScale=scale;
  // Stationary gestures: normalize the stable neck-to-floor distance. This
  // corrects model-scale drift without measuring the changing hand silhouette.
  if(stationary&&fixedHead&&![1,17,27].includes(job.number)){
   anchorX=parts[i].neckX;
   const reference=measure[0].b-parts[0].jawY,current=s.b-parts[i].jawY;
   frameScale=scale*reference/current;
  }
  if(walking){
   // Remove random model-height drift while retaining two small support bobs.
   // Measure anatomy, never the changing overall arm/head silhouette.
   const reference=measure[0].b-parts[0].jawY,current=s.b-parts[i].jawY;
   const bob=3*(1-Math.cos(4*Math.PI*i/16));
   frameScale=(scale*reference-bob)/current;
  }
  const left=Math.round(W/2-anchorX*frameScale),top=Math.round(FLOOR-anchorY*frameScale);
  let png,headPlacement=null;
  if(fixedHead){
   const body=require('./sparky-parts.cjs').removeHead(raw,parts[i],w,h);
   const bodyPNG=await place(body,w,h,frameScale,left,top);
   const canonical=parts[0],headRaw=canonical.part;
   headPlacement={left:Math.round(left+parts[i].neckX*frameScale-canonical.neckX*scale),top:Math.round(top+parts[i].jawY*frameScale-canonical.jawY*scale),scale};
   const headPNG=await place(headRaw,frames[0].w,frames[0].h,scale,
    Math.round(left+parts[i].neckX*frameScale-canonical.neckX*scale),
    Math.round(top+parts[i].jawY*frameScale-canonical.jawY*scale));
   png=await sharp(headPNG).composite([{input:bodyPNG,left:0,top:0}]).png().toBuffer();
  } else if([12,19,20].includes(job.number)){
   // Expression, nod and shake clips keep one complete torso/neck/body.
   const f=frames[0],p0=parts[0],s0=measure[0];
   const bodyRaw=require('./sparky-parts.cjs').removeHead(f.raw,p0,f.w,f.h);
   const bx=Math.round(256-p0.neckX*scale),by=Math.round(FLOOR-s0.b*scale);
   const bodyPNG=await place(bodyRaw,f.w,f.h,scale,bx,by);
   const headPNG=await place(parts[i].part,w,h,scale,
    Math.round(bx+p0.neckX*scale-parts[i].neckX*scale),Math.round(by+p0.jawY*scale-parts[i].jawY*scale));
   png=await sharp(headPNG).composite([{input:bodyPNG,left:0,top:0}]).png().toBuffer();
  } else png=await place(raw,w,h,frameScale,left,top);
  outputs.push(png);
  fs.writeFileSync(path.join(dir,'frames',`frame-${String(i+1).padStart(3,'0')}.png`),png);
  registration.push({frame:i+1,left,top,scale:frameScale,headPlacement,headLandmark:{neckX:parts[i].neckX,jawY:parts[i].jawY},sourceBounds:{left:s.l,top:s.t,right:s.r,bottom:s.b}});
 }
 let sourcePoseOrder=Array.from({length:16},(_,i)=>i);
 if(job.number===17){
  // Later generated rows unexpectedly crouch. Use the coherent open-to-contact
  // approach and its reversed release, without duplicating loop endpoints.
  sourcePoseOrder=[0,1,2,3,4,3,2,1];
  const selected=sourcePoseOrder.map(i=>outputs[i]);outputs.splice(0,outputs.length,...selected);
  const selectedRegistration=sourcePoseOrder.map(i=>registration[i]);registration.splice(0,registration.length,...selectedRegistration);
  outputs.forEach((png,i)=>fs.writeFileSync(path.join(dir,'frames',`frame-${String(i+1).padStart(3,'0')}.png`),png));
 }
 let bakedBreathing=false;
 if([1,23,24].includes(job.number)){
  const base=await sharp(outputs[0]).ensureAlpha().raw().toBuffer(),N=Math.round(job.durationMs/40);
  const anchor={x:256,y:registration[0].top+parts[0].jawY*registration[0].scale};
  const protectedHead=job.number===1?null:await sharp(await place(parts[0].part,frames[0].w,frames[0].h,scale,registration[0].left,registration[0].top)).ensureAlpha().raw().toBuffer();
  outputs.length=0;
  for(let i=0;i<N;i++){
   const raw=require('./bake-sparky-breathing.cjs').breathe(base,W,H,i/N,job.number===1?'standing':job.number===24?'sleep':'seated',anchor,protectedHead);
   const png=await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toBuffer();outputs.push(png);
   fs.writeFileSync(path.join(dir,'frames',`frame-${String(i+1).padStart(3,'0')}.png`),png);
  }
  bakedBreathing=true;
 }
 const file=`${String(job.number).padStart(2,'0')}_isolated_v2.png`,columns=bakedBreathing?8:4,rows=Math.ceil(outputs.length/columns);
 // Keep the loose-frame folder consistent with the active playback sheet.
 for(const frame of fs.readdirSync(path.join(dir,'frames')))if(/^frame-\d+\.png$/.test(frame)&&Number(frame.match(/\d+/)[0])>outputs.length)fs.unlinkSync(path.join(dir,'frames',frame));
 await sharp({create:{width:W*columns,height:H*rows,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(outputs.map((input,i)=>({input,left:i%columns*W,top:Math.floor(i/columns)*H}))).png().toFile(path.join(dir,file));
 const holds=bakedBreathing?outputs.map(()=>40):job.number===17?[110,65,65,65,100,65,65,65]:timing(job),description=descriptions[job.number];
 const data={clip:job.name,file,columns,rows,frameCount:outputs.length,uniqueDrawings:bakedBreathing?1:new Set(sourcePoseOrder).size,sourcePoseOrder,sourceFrameCount:16,registrationSpace:'source poses',cellWidth:W,cellHeight:H,root:[256,FLOOR],loop:job.loop,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),extraction:extraction.audit.method,fixedHead,bakedBreathing,fixedBody:[12,19,20].includes(job.number),method:'Complete-figure ownership extraction restores original RGBA without rectangular neighboring-pose pixels. Shared canonical heads for invariant-head actions; neck-to-floor model normalization for stationary gestures and ground-registered walks. Expressions/nods/shakes reuse one complete body. Idle, seated and sleeping breathing use one canonical drawing sampled at25FPS with fixed contacts. Remaining dynamic full-body actions retain the source pose drawings; no crossfade or optical flow.',registration,review:{status:'needs_visual_review',artisticApproval:false},description};
 json(path.join(dir,'animation.json'),data);json(path.join(dir,'prompt.json'),{tool:'built-in imagegen',prompt:fs.existsSync(path.join(dir,'prompt-correction.json'))?JSON.parse(fs.readFileSync(path.join(dir,'prompt-correction.json'))).prompt:job.prompt,references:[job.source,'05-room-game-lu-n-look-right/keys-sequence-v6/key-01.png']});
 fs.writeFileSync(path.join(dir,'GENERATION.md'),`# ${job.name}\n\n${data.method}\n\nSource: \`${path.relative(ROOT,source)}\`. Rebuild with \`node tools/build-sparky-library.cjs\`. The exact generation prompt is in prompt.json. Whole connected poses are isolated without repainting. Canonical head/body reuse and any source-pose reordering are recorded in animation.json. Original key sheets remain untouched.\n\nTiming: ${data.durationMs} ms, ${job.loop?'looping':'one-shot with final hold'}.\n\nVisual approval is pending. ${data.frameCount} playback cells do not establish smooth motion, character consistency or correct contacts; inspect at normal and half speed.\n`);
 return {dir,data,description,job};
}
async function legacy(entry){
 const dir=path.join(ROOT,'animation/sparky/improved',entry.id),p=entry.playback,m=await sharp(path.join(ROOT,p.file)).metadata();
 const sw=m.width/p.columns,sh=m.height/p.rows,frames=[],measure=[];
 for(let i=0;i<p.count;i++){const raw=await sharp(path.join(ROOT,p.file)).extract({left:i%p.columns*sw,top:Math.floor(i/p.columns)*sh,width:sw,height:sh}).ensureAlpha().raw().toBuffer();frames.push(raw);measure.push(stats(raw,sw,sh));}
 const factor=400/measure[0].height,anchorX=(measure[0].l+measure[0].r)/2,anchorY=measure[0].b;
 const file='normalized-library-v1.png';
  const outputs=[];for(const raw of frames)outputs.push(await place(raw,sw,sh,factor,Math.round(256-anchorX*factor),Math.round(FLOOR-anchorY*factor)));
  fs.mkdirSync(path.join(dir,'frames-normalized'),{recursive:true});
  outputs.forEach((png,i)=>fs.writeFileSync(path.join(dir,'frames-normalized',`frame-${String(i+1).padStart(3,'0')}.png`),png));
 await sharp({create:{width:W*p.columns,height:H*p.rows,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(outputs.map((input,i)=>({input,left:i%p.columns*W,top:Math.floor(i/p.columns)*H}))).png().toFile(path.join(dir,file));
 const prior=JSON.parse(fs.readFileSync(path.join(dir,'animation.json')));
 const data={...prior,clip:entry.clip,file,columns:p.columns,rows:p.rows,frameCount:p.count,cellWidth:W,cellHeight:H,root:[256,FLOOR],loop:p.loop,holdsMs:p.holds,durationMs:p.holds.reduce((a,b)=>a+b),normalization:{source:p.file,scale:factor,anchor:[anchorX,anchorY],standingHeight:400},review:{status:'needs_visual_review',artisticApproval:false}};
 json(path.join(dir,'animation-normalized.json'),data);
  if(!fs.existsSync(path.join(dir,'animation-before-normalization.json')))json(path.join(dir,'animation-before-normalization.json'),prior);
  json(path.join(dir,'animation.json'),data);
 return {dir,data,description:prior.description||p.note};
}
async function publish(item,entry){
 const {dir,description}=item;const d=await require('./optimize-sprite-atlas.cjs')(dir,item.data);const breathEffect=await require('./breathing-policy.cjs')(entry,dir,d);const lib=path.join(ROOT,'animation-library/animations',entry.id);fs.mkdirSync(lib,{recursive:true});
 const assetRevision=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,d.file))).digest('hex').slice(0,12);
 const name=d.optimization?'spritesheet-optimized-v1.png':d.exportPipeline==='scale-locked-v6'?'spritesheet-scale-v6.png':d.exportPipeline==='seated-breathing-v5'?'spritesheet-breathing-v5.png':d.exportPipeline==='dance-drawn-v5'?'spritesheet-dance-v5.png':d.exportPipeline==='sleep-bubble-v4'?'spritesheet-sleep-bubble-v4.png':d.exportPipeline==='run-registration-v4'?'spritesheet-run-v4.png':d.exportPipeline==='dance-drawn-v4'?'spritesheet-dance-v4.png':d.exportPipeline==='remaining-polished-v3'?'spritesheet-motion-v3.png':d.exportPipeline==='registration-v3'?'spritesheet-registered-v3.png':d.exportPipeline==='gesture-polished-v3'?'spritesheet-gesture-v3.png':d.exportPipeline?.startsWith('walk-drawn-')?`spritesheet-drawn-${d.exportPipeline.split('-').at(-1)}.png`:'spritesheet-isolated-v2.png';fs.copyFileSync(path.join(dir,d.file),path.join(lib,name));fs.copyFileSync(path.join(lib,name),path.join(lib,'spritesheet.png'));
 const meta={schemaVersion:1,assetRevision,breathEffect,...(d.normalization?.perFrameScale===false?{scaleLock:{factor:d.normalization.factor,targetHeadArea:d.normalization.targetHeadArea,perFrameScale:false}}:{}),id:entry.id,name:entry.clip,sheet:name,sheetWidth:d.columns*W,sheetHeight:d.rows*H,cellWidth:W,cellHeight:H,columns:d.columns,rows:d.rows,frameCount:d.frameCount,atlasFrameCount:d.atlasFrameCount,frameMap:d.frameMap,optimization:d.optimization,frameDurationsMs:d.holdsMs,loop:d.loop,durationMs:d.durationMs,root:[256,FLOOR],frameOrder:'frameMap indexes row-major atlas cells',description,review:d.review,...(d.exportPipeline==='walk-rig-v3'?{inPlace:true,suggestedVelocityPixelsPerSecond:[-64/.62,0]}:{}),notes:d.exportPipeline&&d.method?d.method:'Isolated-figure v2 export. Full-figure ownership masks remove neighboring artwork. Stable-head actions reuse canonical head pixels. Ground/root (256,592), 512×640 cells. Source pose spacing still requires motion review.',source:path.relative(ROOT,path.join(dir,d.file))};
 json(path.join(lib,'animation.json'),meta);
 const guide=`# ${entry.clip}\n\n${description}\n\n## Files and paths\n\n- [Sprite sheet](${name})\n- [Playback metadata](animation.json)\n- Portable folder: \`animation-library/animations/${entry.id}/\`\n- Working export: \`${meta.source}\`\n- Original input: \`${entry.input||'New directional artwork generated from character/motion references'}\`\n\n## Layout\n\n| Setting | Value |\n| --- | --- |\n| Sheet | ${meta.sheetWidth} × ${meta.sheetHeight} RGBA PNG |\n| Cell | 512 × 640 px |\n| Grid | ${d.columns} columns × ${d.rows} rows |\n| Frames | ${d.frameCount} |\n| Duration | ${d.durationMs} ms |\n| Loop | ${d.loop} |\n| Ground/root | (256, 592) |\n| Reference scale | ${['walk-drawn-v6','walk-drawn-v7'].includes(d.exportPipeline)?'209.15 px head width':'400 px standing height'} |\n\nThe atlas stores ${d.atlasFrameCount} unique cells. The playback timeline has ${d.frameCount} exposures. For exposure i, use cell = frameMap[i], then crop x=(cell%columns)*cellWidth, y=Math.floor(cell/columns)*cellHeight. Repeated poses reuse the same stored cell. Do not play the physical atlas cells in order. Use the shared root and scale across animations; do not resize each changing pose separately. Seated/lying poses are naturally shorter; jump flight must stay above the floor.\n\n## Timing\n\nUse these durations in milliseconds for cells in playback order:\n\n\`\`\`json\n${JSON.stringify(d.holdsMs)}\n\`\`\`\n\n${d.loop?'Wrap after the final exposure; do not append another duplicated endpoint.':'Play once and hold the final pose. Restart deliberately; do not loop an item pickup or wake-up into its beginning.'}\n\n## Play in a browser\n\nPut this HTML inside \`animation-library/\` and serve it over HTTP:\n\n\`\`\`html\n<canvas id="character" style="height:500px;width:auto"></canvas>\n<script type="module">\n  import { SpriteSheetPlayer } from "./player.js";\n  const player = await SpriteSheetPlayer.load(\n    document.querySelector("#character"),\n    "./animations/${entry.id}/animation.json"\n  );\n  player.play();\n  // player.seekFrame(0); // Pause and inspect a zero-based cell.\n</script>\n\`\`\`\n\nIn another engine, map exposure i to cell=frameMap[i], then crop at \`x=(cell%${d.columns})*512\`, \`y=Math.floor(cell/${d.columns})*640\`, width512, height640; advance by \`frameDurationsMs[i]\`.\n\n## Breathing\n\n${breathEffect.enabled?`The bundled player applies a ${breathEffect.amplitudePx} px breath over ${breathEffect.periodMs} ms and continues it during a final pose hold. Parameters and per-frame anatomical bands are in animation.json. Other engines must implement this transform; it is not baked into this PNG.`:breathEffect.reason}\n\n## Review\n\n${d.review?.artisticApproval?'The user approved this eight-key left-walk sequence.':'New variant: visual review is pending.'} Check identity, neighbor continuity, actual hand/foot contacts, neck/collar joins and the loop seam or final hold at 1× and 0.5×. Metadata checks verify packing and timing; they do not certify motion quality.\n\n[Open in animator](../../demo.html?animation=${entry.id}) · [Back to library](../../README.md)\n`;
 fs.writeFileSync(path.join(lib,'animation.md'),guide+(d.exportPipeline==='walk-rig-v3'?'\n## Walk motion\n\nThis is a continuous single-texture rig sampled at 60 fps, with two alternating steps in a one-second loop. Head, collar, shirt, shorts and logo keep their original drawing. The legs use blended joint transforms and rigid shoe textures; the back leg reuses the same texture at its own hip. The cycle is authored in place. For a moving character, start with horizontal velocity **−103.23 source pixels/second** (multiply by your display scale), matching the stance-foot speed. Leave vertical root movement at zero; the sheet already includes body bounce and swing clearance.\n\nWorking frames: `animation/sparky/improved/06-common-walk-lu-walk-left/frames-walk-rig-v3/`. Rebuild with `node tools/build-walk-left-rig.cjs`, then publish with `node tools/build-sparky-library.cjs 06-common-walk-lu-walk-left`.\n':''));
 entry.status='ready';entry.playback={assetRevision,breathEffect,file:meta.source,columns:d.columns,rows:d.rows,count:d.frameCount,frameMap:d.frameMap,atlasFrameCount:d.atlasFrameCount,holds:d.holdsMs,fps:1000/d.holdsMs.slice().sort((a,b)=>a-b)[Math.floor(d.holdsMs.length/2)],loop:d.loop,breathing:false,offsets:[],note:`${entry.clip} · normalized 512×640 export, ${d.frameCount} frames. Visual review pending.`};entry.review=d.review;
 return {id:entry.id,name:entry.clip,metadata:`animations/${entry.id}/animation.json`,sheet:`animations/${entry.id}/${name}`,guide:`animations/${entry.id}/animation.md`};
}
async function main(){
 const manifest=JSON.parse(fs.readFileSync(manifestPath)),index=JSON.parse(fs.readFileSync(path.join(ROOT,'animation-library/manifest.json'))),map=new Map(index.animations.map(e=>[e.id,e]));
 const only=new Set(process.argv.slice(2));
 for(const entry of manifest.entries){
  if(only.size&&!only.has(entry.id))continue;
  const job=jobs.find(j=>j.id===entry.id);let item;
  const customDir=path.join(ROOT,'animation/sparky/improved',entry.id),custom=['animation-scale-v6.json','animation-cute-bounce-v1.json','animation-whistle-v1.json','animation-dance-v9.json','animation-dance-v8.json','animation-front-hi-v7.json','animation-breathing-v5.json','animation-dance-v5.json','animation-sleep-bubble-v4.json','animation-run-v4.json','animation-dance-v4.json','animation-remaining-v3.json','animation-registration-v3.json','animation-polished-v3.json','animation-approved-v7.json','animation-approved-v6.json'].find(f=>fs.existsSync(path.join(customDir,f)));
  if(custom){const data=JSON.parse(fs.readFileSync(path.join(customDir,custom)));json(path.join(customDir,'animation.json'),data);item={dir:customDir,data,description:data.description,job};}
  else if(job)item=await generated(job);
  else if(entry.playback&&!entry.playback.file.endsWith('normalized-library-v1.png'))item=await legacy(entry);
  if(!item)continue;
  map.set(entry.id,await publish(item,entry));console.log(`Packed ${entry.id}: ${item.data.frameCount} frames`);
 }
 index.animations=manifest.entries.filter(e=>map.has(e.id)).map(e=>map.get(e.id));json(manifestPath,manifest);json(path.join(ROOT,'animation-library/manifest.json'),index);
 console.log(`${index.animations.length}/${manifest.entries.length} library entries`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
