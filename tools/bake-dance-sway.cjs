/** Continuous, connected whole-texture hip sway; fixed shoes, no cutout parts. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const W=512,H=640;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function horizontal(y){
 if(y<=400)return -2;
 if(y<425)return -2+(-3+2)*smooth((y-400)/25);
 if(y<485)return -3+23*smooth((y-425)/60);
 if(y<540)return 20-16*smooth((y-485)/55);
 if(y<570)return 4*(1-smooth((y-540)/30));return 0;
}
function vertical(y){if(y<=400)return .8;if(y<485)return .8+1.2*smooth((y-400)/85);if(y<570)return 2*(1-smooth((y-485)/85));return 0;}
function render(base,phase){
 const out=Buffer.alloc(base.length),s=Math.sin(2*Math.PI*phase),bob=(1-Math.cos(4*Math.PI*phase))/2;
 for(let y=0;y<H;y++){
  if(y>=570){base.copy(out,y*W*4,y*W*4,(y+1)*W*4);continue;}
  const dx=horizontal(y)*s,dy=vertical(y)*bob;
  for(let x=0;x<W;x++){
   const sx=x-dx,sy=y-dy,p=(y*W+x)*4,x0=Math.floor(sx),y0=Math.floor(sy);if(x0<0||x0>=W-1||y0<0||y0>=H-1)continue;
   const fx=sx-x0,fy=sy-y0,weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy],points=[(y0*W+x0)*4,(y0*W+x0+1)*4,((y0+1)*W+x0)*4,((y0+1)*W+x0+1)*4];
   let a=0,r=0,g=0,b=0;for(let k=0;k<4;k++){const q=points[k],wa=weights[k]*base[q+3]/255;a+=wa;r+=base[q]*wa;g+=base[q+1]*wa;b+=base[q+2]*wa;}
   out[p+3]=Math.round(a*255);if(a){out[p]=Math.round(r/a);out[p+1]=Math.round(g/a);out[p+2]=Math.round(b/a);}
  }
 }
 return out;
}
async function build(root,entry,base,registration){
 const dir=path.join(root,'animation/sparky/improved',entry.id),out=dir+'/remaining-v3',N=60,columns=8,rows=8,sheet=Buffer.alloc(W*columns*H*rows*4);
 const sourcePath=out+'/dance-canonical.png';await sharp(base,{raw:{width:W,height:H,channels:4}}).png().toFile(sourcePath);
 fs.mkdirSync(out+'/frames',{recursive:true});
 for(let i=0;i<N;i++){
  const raw=render(base,i/N);for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
 }
 require('./archive-unused-frames.cjs')(out+'/frames',N);
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const data={clip:entry.clip,file:'remaining-v3/spritesheet.png',exportPipeline:'remaining-polished-v3',frameDir:'remaining-v3/frames',columns,rows,frameCount:N,uniqueDrawings:1,cellWidth:W,cellHeight:H,root:[256,592],loop:true,holdsMs:Array(N).fill(20),durationMs:1200,bakedMotion:true,sourceStage:4,registration,description:'A continuous side-to-side hip sway with counterbalancing shoulders and planted shoes.',method:'A single complete imagegen drawing is sampled through a continuous smooth displacement field at 50 fps. Hips move ±20 px, shoulders counterbalance, the full head translates rigidly, and rows y570 and below remain byte-identical. One connected texture is used; there are no separate head/torso/limb layers, hard neck/waist cuts, frame crossfades or optical flow. It is a subtle texture-based sway rather than a newly drawn multi-joint dance.',review:{status:'continuous_sway_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-remaining-v3.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(out+'/README.md',`# ${entry.clip}\n\n${data.method}\n\n60 baked frames, one source drawing, 1200 ms loop. Source: \`dance-canonical.png\`. Exact generation prompts remain in \`prompt.json\` and \`correction-prompt.json\`. The abandoned independent pose sequence remains in \`sources/\` for reference. Rebuild through \`node tools/build-remaining-polish.cjs 27\`.\n`);
 fs.writeFileSync(out+'/quality.json',JSON.stringify({mode:'continuous_sway',sourceStage:4,frames:N,durationMs:1200,footRowsLocked:[570,639],amplitudePixels:20,artisticApproval:false},null,2)+'\n');
 console.log(entry.id,N,1200,'continuous sway');
}
module.exports={build,render};
