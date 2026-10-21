/** One fixed whole-character scale per clip. Never normalize changing pose bounds. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=ROOT+'/animation/sparky/improved',W=512,H=640;
const json=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
function cell(sheet,i,columns){const raw=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const p=((Math.floor(i/columns)*H+y)*columns*W+i%columns*W)*4;sheet.copy(raw,y*W*4,p,p+W*4);}return raw;}
function area(raw){const p=headPart(raw,W,H);let n=0;for(let i=3;i<p.part.length;i+=4)n+=p.part[i]>180?1:0;return n;}
function floor(raw){for(let y=H-1;y>=0;y--)for(let x=0;x<W;x++)if(raw[(y*W+x)*4+3]>180)return y;throw Error('Empty character');}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
(async()=>{
 const entries=JSON.parse(fs.readFileSync(BASE+'/manifest.json')).entries,items=[],only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
 for(const e of entries){
  const dir=BASE+'/'+e.id,out=dir+'/scale-v6';fs.mkdirSync(out+'/frames',{recursive:true});
  if(process.argv.includes('--refresh-source')&&(!only||e.id===only)&&fs.existsSync(out+'/source-animation.json')){const key=['animation-cute-bounce-v1.json','animation-whistle-v1.json','animation-dance-v9.json','animation-dance-v8.json','animation-front-hi-v7.json','animation-breathing-v5.json','animation-dance-v5.json','animation-sleep-bubble-v4.json','animation-run-v4.json','animation-dance-v4.json','animation-remaining-v3.json','animation-registration-v3.json','animation-polished-v3.json','animation-approved-v7.json','animation-approved-v6.json'].find(k=>fs.existsSync(dir+'/'+k));if(!key)throw Error('No pre-scale source metadata for '+e.id);const next=JSON.parse(fs.readFileSync(dir+'/'+key)),bytes=fs.readFileSync(dir+'/'+next.file),old=fs.readFileSync(out+'/source.png');if(!old.equals(bytes)){const hash=require('node:crypto').createHash('sha256').update(old).digest('hex').slice(0,12),archive=out+'/archived-sources/'+hash;fs.mkdirSync(archive,{recursive:true});fs.copyFileSync(out+'/source.png',archive+'/source.png');fs.copyFileSync(out+'/source-animation.json',archive+'/source-animation.json');fs.writeFileSync(out+'/source.png',bytes);}json(out+'/source-animation.json',next);}
  if(!fs.existsSync(out+'/source-animation.json')){const d=JSON.parse(fs.readFileSync(dir+'/animation.json'));if(d.exportPipeline==='scale-locked-v6')throw Error('Missing original source backup');json(out+'/source-animation.json',d);fs.copyFileSync(dir+'/'+d.file,out+'/source.png');}
  const d=JSON.parse(fs.readFileSync(out+'/source-animation.json')),raw=await sharp(out+'/source.png').ensureAlpha().raw().toBuffer(),frames=Array.from({length:d.frameCount},(_,i)=>cell(raw,i,d.columns)),areas=frames.map(area);
  items.push({e,dir,out,d,frames,areas});
 }
 const targetArea=median(items.find(x=>x.e.id==='01-idle').areas),report=[];
 for(const item of items){
  if(only&&item.e.id!==only)continue;
  const {e,dir,out,d,frames,areas}=item,s=Math.sqrt(targetArea/median(areas)),rw=Math.round(W*s),rh=Math.round(H*s),sx=rw/W,sy=rh/H,left=Math.round(256-256*sx),top=Math.round(592-592*sy),packed=Buffer.alloc(W*d.columns*H*d.rows*4),audit=[];
  for(let i=0;i<frames.length;i++){
   const raw=frames[i],resized=await sharp(raw,{raw:{width:W,height:H,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer(),placed=Buffer.alloc(W*H*4);
   for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const xx=x+left,yy=y+top,p=(y*rw+x)*4;if(xx<0||xx>=W||yy<0||yy>=H){if(resized[p+3]>180)throw Error(e.id+': clipped by normalization');continue;}resized.copy(placed,(yy*W+xx)*4,p,p+4);}
   const sourceFloor=floor(raw),targetFloor=Math.round(592+(sourceFloor-592)*sy),dy=targetFloor-floor(placed),result=Buffer.alloc(placed.length);
   for(let y=0;y<H;y++)if(y+dy>=0&&y+dy<H)placed.copy(result,(y+dy)*W*4,y*W*4,(y+1)*W*4);
   await sharp(result,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
   for(let y=0;y<H;y++)result.copy(packed,((Math.floor(i/d.columns)*H+y)*d.columns*W+i%d.columns*W)*4,y*W*4,(y+1)*W*4);
   audit.push({frame:i+1,sourceArea:areas[i],headArea:area(result),sourceFloor,targetFloor,actualFloor:floor(result),dy});
  }
  require('./archive-unused-frames.cjs')(out+'/frames',frames.length);
  await sharp(packed,{raw:{width:W*d.columns,height:H*d.rows,channels:4}}).png().toFile(out+'/spritesheet.png');
  const normalization={targetHeadArea:targetArea,sourceMedianHeadArea:median(areas),factor:s,scaleX:sx,scaleY:sy,left,top,perFrameScale:false,anchor:[256,592],sourceMetadata:'scale-v6/source-animation.json',sourceSheet:'scale-v6/source.png',frames:audit};
  const data={...d,file:'scale-v6/spritesheet.png',frameDir:'scale-v6/frames',exportPipeline:'scale-locked-v6',normalization,method:d.method+' Scale v6: one fixed whole-character transform per clip, matched to the standing-idle median opaque head silhouette area. It includes eyes/mouth, so blinking does not change the scale estimate. No frame-specific scaling, head/body cuts, or pose-height normalization. Grounded contacts remain y592; flight clearance is transformed about the shared root. Pose projection, breathing and original drawing proportions remain intact.'};
  json(dir+'/animation-scale-v6.json',data);json(out+'/quality.json',normalization);fs.writeFileSync(out+'/README.md','# Locked character scale\n\n'+data.method+'\n\nOriginal complete sheet and metadata: `source.png`, `source-animation.json`. Rebuild: `node tools/normalize-library-scale.cjs`; publish: `node tools/build-sparky-library.cjs`. One resize is applied to each original frame. Earlier artwork remains recoverable. After rebuilding an upstream action, run the normalizer with `--refresh-source` to adopt it; changed previous inputs are archived by content hash.\n');
  report.push({id:e.id,factor:s,sourceMedianArea:median(areas),normalizedMedianArea:median(audit.map(a=>a.headArea)),targetArea,frames:frames.length,perFrameScale:false});console.log(e.id,s.toFixed(4),median(audit.map(a=>a.headArea)));
 }
 fs.mkdirSync(ROOT+'/output/scale-audit',{recursive:true});const reportPath=ROOT+'/output/scale-audit/normalized.json';if(only&&fs.existsSync(reportPath)){const previous=JSON.parse(fs.readFileSync(reportPath));const map=new Map(previous.clips.map(c=>[c.id,c]));report.forEach(c=>map.set(c.id,c));json(reportPath,{targetArea,clips:[...map.values()]});}else json(reportPath,{targetArea,clips:report});
})().catch(e=>{console.error(e);process.exitCode=1});
