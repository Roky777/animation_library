/** Gradual arm lift, small wrist sweeps, and exact reverse recovery. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures,connected}=require('./extract-sparky-figures.cjs'),{headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),dir=ROOT+'/animation/sparky/improved/18-front-hi',out=dir+'/front-hi-v8',sourceDir=dir+'/front-hi-v7',W=512,H=640;
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
(async()=>{
 const ext=await extractFigures(sourceDir+'/sources/stages.png',{count:12,columns:4}),extras=await extractFigures(sourceDir+'/sources/lift-inbetweens.png',{count:3,columns:3});ext.frames.push(...extras.frames);const heads=ext.frames.map(f=>headPart(f.raw,f.w,f.h)),scale=218/median(heads.slice(0,12).map(p=>p.head.r-p.head.l+1)),stages=[],audit=[];
 fs.mkdirSync(out+'/source-stages',{recursive:true});fs.mkdirSync(out+'/stages',{recursive:true});fs.mkdirSync(out+'/frames',{recursive:true});
 for(let i=0;i<ext.frames.length;i++){
  const f=ext.frames[i],p=heads[i],scale=i<12?218/median(heads.slice(0,12).map(p=>p.head.r-p.head.l+1)):214/median(heads.slice(12).map(p=>p.head.r-p.head.l+1)),rw=Math.round(f.w*scale),rh=Math.round(f.h*scale),resized=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer();
  let bottom=-1;for(let j=0;j<rw*rh;j++)if(resized[j*4+3]>180)bottom=Math.floor(j/rw);
  const left=Math.round(256-(p.head.l+p.head.r)/2*scale),top=592-bottom,raw=Buffer.alloc(W*H*4);
  if(left<0||top<0||left+rw>W||top+rh>H)throw Error('Uncut stage does not fit: '+(i+1));
  for(let y=0;y<rh;y++)resized.copy(raw,((y+top)*W+left)*4,y*rw*4,(y+1)*rw*4);
  const groups=connected(Uint8Array.from({length:W*H},(_,j)=>raw[j*4+3]>128?1:0),W,H),hp=headPart(raw,W,H);
  if(groups.slice(1).some(g=>g.n>30))throw Error('Disconnected artwork in stage '+(i+1));
  stages.push(raw);audit.push({stage:i+1,wholeFigure:true,scale,left,top,headWidth:hp.head.r-hp.head.l+1,headTop:hp.head.t,headBottom:hp.head.b,headCenter:(hp.head.l+hp.head.r)/2});
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/source-stages/stage-${String(i+1).padStart(2,'0')}.png`);
 }
 const sourceRegistration=audit.slice();
 for(let i=0;i<stages.length;i++)await sharp(stages[i],{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/stages/stage-${String(i+1).padStart(2,'0')}.png`);
 const lift=[0,1,12,13,2,3,4],wave=[5,6,7,4,5,6,7,4],recovery=lift.slice(0,-1).reverse(),order=[...lift,...wave,...recovery];
 const holds=order.map((_,i)=>i===0?180:i===order.length-1?400:i<lift.length||i>=lift.length+wave.length?85:[6].includes(order[i])?110:85),columns=4,rows=Math.ceil(order.length/columns),sheet=Buffer.alloc(W*columns*H*rows*4);
 for(let i=0;i<order.length;i++){
  const raw=stages[order[i]];await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
  for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);
 }
 require('./archive-unused-frames.cjs')(out+'/frames',order.length);
 for(const name of fs.readdirSync(out+'/stages')){const n=Number(name.match(/^stage-(\d+)\.png$/)?.[1]);if(n>stages.length){fs.mkdirSync(out+'/inactive-stages',{recursive:true});const bytes=fs.readFileSync(out+'/stages/'+name),hash=require('node:crypto').createHash('sha256').update(bytes).digest('hex').slice(0,10);fs.renameSync(out+'/stages/'+name,out+'/inactive-stages/'+name.replace('.png','-'+hash+'.png'));}}
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const data={clip:'Front_Hi',file:'front-hi-v8/spritesheet.png',frameDir:'front-hi-v8/frames',exportPipeline:'front-hi-v8',columns,rows,cellWidth:W,cellHeight:H,root:[256,592],frameCount:order.length,sourceFrameCount:15,uniqueDrawings:new Set(order).size,sourcePoseOrder:order,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b,0),loop:false,fixedHead:false,fixedBody:false,wholeFigure:true,sourceRegistration,registration:audit,description:'Gradually raise the screen-left hand, give two small wrist waves, and gently lower it to neutral.',method:'Complete, intact character drawings are used for every frame. No isolated arm masks, cutout joints, shoulder rotation, or body-part compositing. Seven gradual lift poses lead into two wrist sweeps using the coherent early source drawings; recovery uses the exact reversed lift. A single clip scale is applied before publication. Original source artwork is retained in front-hi-v7/sources. Small authored drawing differences remain; this repair removes the damaged arm seams.',review:{status:'front_hi_motion_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-front-hi-v7.json',JSON.stringify(data,null,2)+'\n');fs.writeFileSync(out+'/quality.json',JSON.stringify({registration:audit,sourceRegistration,extraction:ext.audit},null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Front_Hi wave repair\n\n'+data.method+'\n\nSource art and prompts: `../front-hi-v7/sources/` and `../front-hi-v7/prompt.json`. The earlier cutout rig is inactive. Rebuild with `node tools/build-front-hi-v7.cjs`, then `node tools/normalize-library-scale.cjs --refresh-source --only=18-front-hi`, then `node tools/build-sparky-library.cjs 18-front-hi`. Previous source versions remain recoverable.\n');
 console.log('Front_Hi:',order.length,'cells,',data.durationMs,'ms; fixed scale',scale,audit);
})().catch(e=>{console.error(e);process.exitCode=1});
