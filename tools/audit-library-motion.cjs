/** Measurements flag review targets; they do not certify artistic quality. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {connected}=require('./extract-sparky-figures.cjs'),{headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),W=512,H=640;
(async()=>{
 const index=JSON.parse(fs.readFileSync(ROOT+'/animation-library/manifest.json')),clips=[],panels=[];
 for(const e of index.animations){
  const dir=ROOT+'/animation-library/',d=JSON.parse(fs.readFileSync(dir+e.metadata)),raw=await sharp(path.join(dir,path.dirname(e.metadata),d.sheet)).raw().toBuffer(),frames=[],samples=[];
  for(let i=0;i<d.frameCount;i++){
   const cell=d.frameMap?.[i]??i;
   const a=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const p=((Math.floor(cell/d.columns)*H+y)*W*d.columns+cell%d.columns*W)*4;raw.copy(a,y*W*4,p,p+W*4);}
   const groups=connected(Uint8Array.from({length:W*H},(_,j)=>a[j*4+3]>128?1:0),W,H),head=headPart(a,W,H).head;
   frames.push(a);samples.push({frame:i+1,bounds:[groups[0].l,groups[0].t,groups[0].r,groups[0].b],head:[head.l,head.t,head.r,head.b],components:groups.map(g=>g.n),floor:groups.reduce((v,g)=>g.n>30?Math.max(v,g.b):v,0)});
  }
  const steps=[];for(let i=0;i<frames.length-(d.loop?0:1);i++){
   const a=frames[i],b=frames[(i+1)%frames.length];let alpha=0;for(let p=3;p<a.length;p+=4)alpha+=Math.abs(a[p]-b[p]);
   steps.push(alpha/(W*H));
  }
  const widths=samples.map(s=>s.head[2]-s.head[0]+1),n=Number(e.id.slice(0,2)),warnings=[];
  if(Math.max(...widths)/Math.min(...widths)>1.06&&![4,5,6,7,8,9,10,11,25,26].includes(n))warnings.push('Head contour width changes over 6%; inspect drawing consistency.');
  if(samples.some(s=>s.bounds[0]<=1||s.bounds[1]<=1||s.bounds[2]>=510||s.bounds[3]>=638))warnings.push('Artwork approaches a cell edge.');
  if(d.loop&&steps.at(-1)>Math.max(...steps.slice(0,-1))*1.1)warnings.push('Loop boundary changes more than interior transitions.');
  const moving=d.frameDurationsMs.filter((v,i)=>steps[Math.min(i,steps.length-1)]>.2),median=moving.slice().sort((a,b)=>a-b)[Math.floor(moving.length/2)];
  clips.push({id:e.id,name:e.name,frameCount:d.frameCount,durationMs:d.durationMs,loop:d.loop,medianMovingExposureMs:median||0,headWidthRange:[Math.min(...widths),Math.max(...widths)],maximumContourChange:Math.max(...steps),seamContourChange:d.loop?steps.at(-1):null,warnings,frames:samples});
  const chosen=[0,Math.floor(frames.length/4),Math.floor(frames.length/2),Math.floor(frames.length*3/4)];
  const thumbs=await Promise.all(chosen.map(a=>sharp(frames[a],{raw:{width:W,height:H,channels:4}}).resize(160,200).png().toBuffer()));
  const label=Buffer.from(`<svg width="640" height="32"><text x="8" y="23" font-family="sans-serif" font-size="17" fill="#20352f">${e.id}</text></svg>`);
  panels.push(await sharp({create:{width:640,height:232,channels:4,background:'#e5eee8'}}).composite([{input:label,left:0,top:0},...thumbs.map((input,i)=>({input,left:i*160,top:32}))]).png().toBuffer());
 }
 const out=ROOT+'/output/library-motion-review';fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/audit.json',JSON.stringify({note:'Measurements support visual review; no premium-quality certification is implied.',clips},null,2)+'\n');
 for(let batch=0;batch<Math.ceil(panels.length/9);batch++)await sharp({create:{width:1920,height:696,channels:4,background:'#f5f7f4'}}).composite(panels.slice(batch*9,batch*9+9).map((input,i)=>({input,left:i%3*640,top:Math.floor(i/3)*232}))).png().toFile(out+`/clips-${batch+1}.png`);
 console.log(JSON.stringify(clips.map(({frames,...c})=>c),null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
