/** Stabilize complete run drawings with a reliable flame-head registration landmark. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),id='10-running-animation',dir=ROOT+'/animation/sparky/improved/'+id,out=dir+'/registered-run-v4',W=512,H=640;
(async()=>{
 fs.mkdirSync(out+'/frames',{recursive:true});
 const source=JSON.parse(fs.readFileSync(dir+'/animation-remaining-v3.json')),frames=[],registration=[];
 for(let i=0;i<source.frameCount;i++){
  const name=`frame-${String(i+1).padStart(3,'0')}.png`,original=await sharp(dir+'/'+source.frameDir+'/'+name).ensureAlpha().raw().toBuffer(),before=headPart(original,W,H),center=(before.head.l+before.head.r)/2,dx=Math.round(256-center),raw=Buffer.alloc(original.length);
  // Integer whole-image translations preserve every source color and contour.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const xx=x+dx;if(xx<0||xx>=W){if(original[(y*W+x)*4+3])throw Error('Translation clips source artwork');continue;}
   original.copy(raw,(y*W+xx)*4,(y*W+x)*4,(y*W+x+1)*4);
  }
  const after=headPart(raw,W,H);frames.push(raw);registration.push({frame:i+1,dx,dy:0,sourceHeadCenter:center,headCenter:(after.head.l+after.head.r)/2,headWidth:after.head.r-after.head.l+1,wholeFigure:true,airborne:[3,7].includes(i)});
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+'/frames/'+name);
 }
 const sheet=Buffer.alloc(W*4*H*2*4);frames.forEach((raw,i)=>{for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/4)*H+y)*W*4+i%4*W)*4,y*W*4,(y+1)*W*4);});
 await sharp(sheet,{raw:{width:W*4,height:H*2,channels:4}}).png().toFile(out+'/spritesheet.png');
 const holdsMs=[80,65,65,110,80,65,65,110],data={...source,file:'registered-run-v4/spritesheet.png',frameDir:'registered-run-v4/frames',exportPipeline:'run-registration-v4',holdsMs,durationMs:holdsMs.reduce((a,b)=>a+b,0),registration,description:'Right-facing run with a stable horizontal head anchor, alternating supports and two flight phases.',method:'Original eight complete drawings translated by integer pixels using the midpoint of the warm flame-head bounds. The old neck detector selected arm pixels in flight, producing 46–52 px horizontal jumps. Vertical placement, original RGBA, connected anatomy, scale and airborne clearance are preserved. Both four-pose steps use matching contact/compression/passing/flight exposures of 80/65/65/110 ms (640 ms loop). No body slicing, repainting, morphing or added breathing transform. This registration repair does not redraw residual pose-to-pose anatomy changes.',review:{status:'run_registration_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-run-v4.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Run registration repair v4\n\n'+data.method+'\n\nRebuild: `node tools/register-run-v4.cjs`. Publish: `node tools/build-sparky-library.cjs '+id+'`. Source drawings and their imagegen prompts remain in `../remaining-v3/`.\n');
 fs.writeFileSync(out+'/quality.json',JSON.stringify({registration,source:source.file,sourcePreserved:true},null,2)+'\n');
 console.log('Registered run:',registration.map(r=>r.dx),'px;',data.durationMs,'ms');
})().catch(e=>{console.error(e);process.exitCode=1});
