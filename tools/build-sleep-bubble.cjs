/** Bake a native vector sleep bubble into the existing breathing cells. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),id='24-sequence-4-sleep',dir=ROOT+'/animation/sparky/improved/'+id,out=dir+'/sleep-bubble-v4',W=512,H=640;
function bubbleSvg(radius){
 const r=radius;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 512 640"><g transform="translate(213 475) rotate(32)">
 <path d="M0 0 C-2 -4 ${-r} ${-.45*r} ${-r} ${-1.25*r} C${-r} ${-2.65*r} ${r} ${-2.65*r} ${r} ${-1.25*r} C${r} ${-.45*r} 2 -4 0 0Z" fill="#c9efff" fill-opacity=".46" stroke="#588ca5" stroke-width="1.35" stroke-linejoin="round"/>
 <path d="M${-.58*r} ${-1.34*r} Q${-.66*r} ${-1.91*r} ${-.23*r} ${-2.02*r}" fill="none" stroke="white" stroke-opacity=".95" stroke-width="2.1" stroke-linecap="round"/>
 <ellipse cx="${.42*r}" cy="${-.83*r}" rx="${.13*r}" ry="${.18*r}" fill="white" fill-opacity=".5"/>
 </g></svg>`;
}
(async()=>{
 fs.mkdirSync(out+'/frames',{recursive:true});fs.mkdirSync(out+'/bubble-frames',{recursive:true});
 const source=JSON.parse(fs.readFileSync(dir+'/animation-registration-v3.json')),columns=source.columns,rows=source.rows,N=source.frameCount,sheet=Buffer.alloc(W*columns*H*rows*4),radii=[];
 // The nose region is identical across the source cycle; the bubble tip stays attached.
 let noseReference;
 for(let i=0;i<N;i++){
  const name=`frame-${String(i+1).padStart(3,'0')}.png`,file=dir+'/'+source.frameDir+'/'+name;
  const nose=await sharp(file).extract({left:195,top:455,width:35,height:35}).raw().toBuffer();
  if(noseReference&&!nose.equals(noseReference))throw Error('Nose moved: update bubble anchoring');noseReference=nose;
  const radius=8+14*(1-Math.cos(2*Math.PI*i/N))/2;radii.push(radius);
  const svg=Buffer.from(bubbleSvg(radius));
  if(i===N/2)fs.writeFileSync(out+'/bubble.svg',svg);
  const overlay=await sharp(svg).ensureAlpha().raw().toBuffer();
  await sharp(overlay,{raw:{width:W,height:H,channels:4}}).png().toFile(out+'/bubble-frames/'+name);
  const original=await sharp(file).ensureAlpha().raw().toBuffer(),raw=await sharp(file).composite([{input:svg}]).ensureAlpha().raw().toBuffer();
  // A compositor can normalize RGB beneath zero alpha; preserve untouched source bytes too.
  for(let p=0;p<W*H;p++)if(!overlay[p*4+3])original.copy(raw,p*4,p*4,p*4+4);
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+'/frames/'+name);
  for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);
 }
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const data={...source,file:'sleep-bubble-v4/spritesheet.png',frameDir:'sleep-bubble-v4/frames',exportPipeline:'sleep-bubble-v4',description:'Sleep on the side while a translucent nose bubble gently inflates and deflates with each breath.',method:'Existing 80 breathing drawings and 40 ms exposures are preserved. A native SVG teardrop bubble is attached at nose (213,475), with a cosine-eased radius of 8–22 px over the same seamless 3200 ms cycle. It is baked into the RGBA cells, so any sprite player can use it without extra runtime effects. Character pixels outside the bubble remain unchanged. Source and vector artwork are preserved.',bubble:{anchor:[213,475],minRadius:8,maxRadius:22,periodMs:source.durationMs,radii,vector:'sleep-bubble-v4/bubble.svg',overlayFrames:'sleep-bubble-v4/bubble-frames'},review:{status:'sleep_bubble_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-sleep-bubble-v4.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Breathing nose bubble\n\n'+data.method+'\n\nRebuild: `node tools/build-sleep-bubble.cjs`. Publish: `node tools/build-sparky-library.cjs '+id+'`. `bubble.svg` is the editable maximum-size vector; `bubble-frames/` contains transparent overlays; `frames/` and `spritesheet.png` contain the finished animation.\n');
 console.log('Sleep bubble:',N,'frames,',source.durationMs,'ms, radius 8–22px');
})().catch(e=>{console.error(e);process.exitCode=1});
