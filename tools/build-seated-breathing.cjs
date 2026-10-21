/** Continuous full upper-body breathing; seated feet and knees stay planted. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),id='23-toy-garden-lu-seat-idle',dir=ROOT+'/animation/sparky/improved/'+id,out=dir+'/breathing-v5',W=512,H=640,N=70,upperY=462,fixedY=535,amplitude=3.8;
function render(base,phase){
 const lift=amplitude*(1-Math.cos(2*Math.PI*phase))/2,out=Buffer.alloc(base.length);
 const map=y=>{const t=Math.max(0,Math.min(1,(y-upperY)/(fixedY-upperY)));return y-lift*(1-t*t*(3-2*t));};
 for(let y=0;y<H;y++){
  if(y>=fixedY||lift<1e-10){base.copy(out,y*W*4,y*W*4,(y+1)*W*4);continue;}
  let lo=y,hi=y+lift;for(let j=0;j<22;j++){const m=(lo+hi)/2;if(map(m)<y)lo=m;else hi=m;}
  const sy=(lo+hi)/2,y0=Math.floor(sy),f=sy-y0;
  for(let x=0;x<W;x++){
   const p=(y*W+x)*4,p0=(y0*W+x)*4,p1=p0+W*4,a0=base[p0+3]/255,a1=base[p1+3]/255,a=a0*(1-f)+a1*f;
   out[p+3]=Math.round(a*255);if(a)for(let c=0;c<3;c++)out[p+c]=Math.round((base[p0+c]*a0*(1-f)+base[p1+c]*a1*f)/a);
  }
 }
 return out;
}
(async()=>{
 fs.mkdirSync(out+'/frames',{recursive:true});const source=JSON.parse(fs.readFileSync(dir+'/animation-registration-v3.json')),base=await sharp(dir+'/'+source.frameDir+'/frame-001.png').ensureAlpha().raw().toBuffer(),columns=8,rows=9,sheet=Buffer.alloc(W*columns*H*rows*4);
 for(let i=0;i<N;i++){const raw=render(base,i/N);await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);}
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const data={...source,file:'breathing-v5/spritesheet.png',frameDir:'breathing-v5/frames',exportPipeline:'seated-breathing-v5',bakedBreathing:true,description:'Sit cross-legged with visible gentle chest breathing and a small head-and-shoulder rise.',method:'One complete canonical seated drawing sampled through a continuous C1 vertical breathing map. Head and shoulders rise 3.8 px; chest smoothly stretches toward fixed hips. Rows y535 onward are byte-identical, preserving hands, knees, seat and shoes. No separated body layers or neck/waist cuts. 70 frames at 40 ms form a seamless 2800 ms breath. The old weak chest-only breathing is replaced, not layered twice.',breathing:{baked:true,amplitudePx:amplitude,upperY,fixedY,periodMs:2800},review:{status:'seated_breathing_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-breathing-v5.json',JSON.stringify(data,null,2)+'\n');fs.writeFileSync(out+'/README.md','# Seated breathing\n\n'+data.method+'\n\nRebuild: `node tools/build-seated-breathing.cjs`. Source: `../registration-v3/frames/frame-001.png`.\n');console.log('Seated breathing:',N,'frames, 3.8 px rise, fixed rows535+');
})().catch(e=>{console.error(e);process.exitCode=1});
