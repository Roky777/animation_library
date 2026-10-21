/** Assemble a deliberately incomplete research preview; never publish to game registry. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=path.resolve(__dirname,'../animation/sparky/improved/06-common-walk-lu-walk-left/researched-v6');
const json=(name,data)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2)+'\n');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const plan=JSON.parse(fs.readFileSync(dir+'/pose-plan.json')),lock=JSON.parse(fs.readFileSync(dir+'/key-lock.json')),keyTimes=plan.keys.map(k=>k.timeMs),keyPNGs=[];
 for(let i=1;i<=8;i++){const b=fs.readFileSync(dir+`/keys/K${i}.png`);if(sha(b)!==lock.keys[`K${i}`].sha256)throw Error('Locked key changed');keyPNGs.push(b);}
 const midTimes=[1000/24,11000/24,13000/24],files=['01-02-single.png','04-05-single.png','05-06-single.png'],mids=[];fs.mkdirSync(dir+'/inbetweens',{recursive:true});
 for(let i=0;i<3;i++){
  const {data,info}=await sharp(dir+'/draft-inbetweens/'+files[i]).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,r=0,t=info.height,b=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>1){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  l=Math.max(0,l-3);t=Math.max(0,t-3);r=Math.min(info.width-1,r+3);b=Math.min(info.height-1,b+3);
  const {data:raw,info:f}=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).raw().toBuffer({resolveWithObject:true});
  const p=require('./sparky-parts.cjs').headPart(raw,f.width,f.height),scale=209.15/(p.head.r-p.head.l+1);let bottom=0;
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)if(raw[(y*f.width+x)*4+3]>180)bottom=y;
  const left=Math.round(256-p.neckX*scale),top=Math.round(592-bottom*scale),input=await sharp(raw,{raw:{width:f.width,height:f.height,channels:4}}).resize(Math.round(f.width*scale),Math.round(f.height*scale)).png().toBuffer();
  const png=await sharp({create:{width:512,height:640,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left,top}]).png().toBuffer();
  fs.writeFileSync(dir+`/inbetweens/I${i+1}.png`,png);mids.push({time:midTimes[i],png,label:['Near heel roll','Far heel approaching contact','Far heel roll'][i]});
 }
 const frames=[...keyPNGs.map((png,i)=>({time:keyTimes[i],png,label:`K${i+1}`,isKey:true})),...mids].sort((a,b)=>a.time-b.time);
 // Copy decoded RGBA bytes directly: compositing even onto transparency can
 // round antialiased RGB values and silently alter accepted key artwork.
 async function packExact(pngs,rows,file){
  const out=Buffer.alloc(2048*640*rows*4);
  for(let i=0;i<pngs.length;i++){
   const raw=await sharp(pngs[i]).ensureAlpha().raw().toBuffer();
   for(let y=0;y<640;y++)raw.copy(out,((Math.floor(i/4)*640+y)*2048+i%4*512)*4,y*512*4,(y+1)*512*4);
  }
  await sharp(out,{raw:{width:2048,height:640*rows,channels:4}}).png().toFile(dir+'/'+file);
 }
 await packExact(frames.map(f=>f.png),3,'partial-breakdowns.png');
 await packExact(keyPNGs,2,'eight-keys.png');
 const meta=(id,sheet,count,cols,rows,times,description)=>({schemaVersion:1,id,name:id,sheet,assetRevision:sha(fs.readFileSync(dir+'/'+sheet)).slice(0,12),sheetWidth:cols*512,sheetHeight:rows*640,cellWidth:512,cellHeight:640,columns:cols,rows,frameCount:count,frameDurationsMs:times.map((t,i)=>(times[i+1]??1000)-t),durationMs:1000,loop:true,root:[256,592],frameOrder:'row-major',description,review:{status:'blocking_review',artisticApproval:false}});
 json('keys.json',meta('Eight researched key poses','eight-keys.png',8,4,2,keyTimes,'Eight key drawings; blocking review, not production approved.'));
 const guideMeta=meta('Authored human gait schematic','key-pose-guide.png',8,4,2,keyTimes,'Schematic authored from cited gait phases, not motion-capture data.');guideMeta.root=[256,552];json('guide.json',guideMeta);
 const partial=meta('Partial in-between pass','partial-breakdowns.png',frames.length,4,3,frames.map(f=>f.time),'Incomplete pass: three provisional in-betweens; five intervals still need valid drawings.');partial.frames=frames.map(f=>({timeMs:f.time,label:f.label,isKey:!!f.isKey}));json('partial.json',partial);
 json('breakdown-review.json',{complete:false,targetFrames:24,reviewableInbetweens:3,keyFilesUnchanged:true,pendingIntervals:['K2→K3','K3→K4','K6→K7','K7→K8','K8→K1'],rejections:{'02-03-rejected.png':'Middle drawing regresses to a leading-leg contact instead of advancing through swing.','03-04-rejected.png':'Support progression and leg identity do not match the interval.','06-07-rejected.png':'Swapped support/swing identities and merged shoes.','03-04-single-rejected.png':'Retains wrong leading-leg construction.','06-07-single-rejected.png':'Foreground leg becomes planted instead of remaining the swinging limb.'},publication:'Not added to animator registry; current drawn-v5 clip unchanged.'});
 console.log('Built8-key preview and11-cell incomplete pass; all8 locked key files unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
