// Rebuild reviewed Sparky wondering drawings and their timed PNG atlas.
const fs=require('node:fs');
const {createCanvas,loadImage}=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/03-intro-lucas-room-touch-lu-wondering';
const W=512,H=640,scale=.85;
function canvas(){return createCanvas(W,H)}
async function normalize(file,cols,rows){
 const im=await loadImage(file),out=[];
 for(let i=0;i<cols*rows;i++){
  const x=Math.round(i%cols*im.width/cols),y=Math.round(Math.floor(i/cols)*im.height/rows);
  const width=Math.round((i%cols+1)*im.width/cols)-x,height=Math.round((Math.floor(i/cols)+1)*im.height/rows)-y;
  const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.drawImage(im,x,y,width,height,0,0,width,height);
  const data=ctx.getImageData(0,0,width,height).data;
  let min=width,max=0,bottom=0;
  // Shoe contacts, not the moving head/hand silhouette, set translation.
  for(let py=Math.floor(height*.82);py<height;py++)for(let px=0;px<width;px++){
   if(data[(py*width+px)*4+3]>220){min=Math.min(min,px);max=Math.max(max,px);bottom=Math.max(bottom,py);}
  }
  const s=cols===4?scale:scale*396/(im.width/cols);
  const n=canvas(),nc=n.getContext('2d');
  nc.drawImage(c,256-(min+max)/2*s,592-bottom*s,width*s,height*s);
  out.push(n);
 }
 return out;
}
async function main(){
 const a=await normalize(`${dir}/sources/wondering-8-keys.png`,4,2);
 const b=await normalize(`${dir}/sources/wondering-4-breakdowns.png`,2,2);
 // Use accepted neutral, gaze, and curious facial expressions on a single
 // canonical flame/head outline. This also discards a clipped generated tip.
 const base=a[0],heads=[];
 for(const idx of [0,1,2]){
  const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(base,0,0,W,422,0,0,W,422);
  if(idx){
   ctx.save();ctx.beginPath();ctx.ellipse(256,345,82,43,0,0,Math.PI*2);ctx.clip();
   ctx.drawImage(a[idx],0,0);ctx.restore();
  }
  heads.push(c);
 }
 // Canonical standing artwork is shared. New drawings supply only the active
 // right arm and its adjoining shoulder/chest region.
 const definitions=[
  [a[0],0,0,400,'neutral'],[b[0],1,0,70,'early lift'],[b[1],1,0,60,'mid lift'],
  [a[1],1,0,60,'chest'],[a[2],2,3,60,'approach chin'],[b[2],2,4,60,'near chin'],
  [a[3],2,6,120,'chin contact'],[a[4],2,6,1000,'thinking'],
  [a[5],1,3,70,'release'],[a[6],0,0,70,'lowering'],[b[3],0,0,70,'late lowering'],[a[7],0,0,80,'near neutral'],[a[0],0,0,580,'neutral recovery']
 ];
 fs.mkdirSync(`${dir}/frames`,{recursive:true});
 const sheet=createCanvas(5*W,3*H),sc=sheet.getContext('2d'),holds=[];
 for(let i=0;i<definitions.length;i++){
  const [pose,expression,tilt,ms]=definitions[i],c=canvas(),ctx=c.getContext('2d');
  ctx.drawImage(base,0,400,W,H-400,0,400,W,H-400);
  // The screen-left arm region is replaced, never layered over its neutral arm.
  ctx.clearRect(125,410,155,115);
  ctx.drawImage(pose,125,410,155,115,125,410,155,115);
  // Preserve one continuous head, neck and collar. Rotating a rectangular
  // head crop opened a wedge at the neck; never rotate that crop independently.
  ctx.drawImage(heads[expression],0,0);
  // Preserve hand-in-front-of-chin occlusion from the accepted action drawing.
  if(i>=4&&i<=7){
   const pctx=pose.getContext('2d'),raw=pctx.getImageData(160,370,130,70),mask=new Uint8Array(130*70);
   for(let yy=0;yy<70;yy++)for(let xx=0;xx<130;xx++){
    const at=(yy*130+xx)*4,r=raw.data[at],g=raw.data[at+1],b=raw.data[at+2];
    if(yy>=12&&raw.data[at+3]>100&&Math.min(r,g,b)>150&&Math.max(r,g,b)-Math.min(r,g,b)<55)mask[yy*130+xx]=1;
   }
   const patch=createCanvas(130,70),pc=patch.getContext('2d');
   for(let yy=0;yy<70;yy++)for(let xx=0;xx<130;xx++){
    let inside=false;
    for(let dy=-2;dy<=2&&!inside;dy++)for(let dx=-2;dx<=2;dx++)if(xx+dx>=0&&xx+dx<130&&yy+dy>=0&&yy+dy<70&&mask[(yy+dy)*130+xx+dx])inside=true;
    if(!inside)raw.data[(yy*130+xx)*4+3]=0;
   }
   pc.putImageData(raw,0,0);ctx.drawImage(patch,160,370);
  }
  // Fixed standing legs and shoes. No silhouette-centering or per-pose scaling.
  ctx.clearRect(0,525,W,H-525);ctx.drawImage(base,0,525,W,H-525,0,525,W,H-525);
  fs.writeFileSync(`${dir}/frames/frame-${String(i+1).padStart(3,'0')}.png`,c.toBuffer('image/png'));
  sc.drawImage(c,i%5*W,Math.floor(i/5)*H);holds.push(ms);
 }
 fs.writeFileSync(`${dir}/03_Lu_Wondering_improved_v2.png`,sheet.toBuffer('image/png'));
 const expected=await sharp(`${dir}/frames/frame-001.png`).extract({left:0,top:525,width:W,height:115}).raw().toBuffer();
 for(let i=1;i<=definitions.length;i++){
  const r=await sharp(`${dir}/frames/frame-${String(i).padStart(3,'0')}.png`).extract({left:0,top:525,width:W,height:115}).raw().toBuffer();if(!r.equals(expected))throw Error('Foot drift '+i);
 }
 fs.writeFileSync(`${dir}/animation.json`,JSON.stringify({clip:'Intro/Lucas_Room_Touch/Lu_Wondering',file:'03_Lu_Wondering_improved_v2.png',columns:5,rows:3,frameCount:definitions.length,cellWidth:W,cellHeight:H,root:[256,592],loop:false,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),poses:definitions.map((d,i)=>({frame:i+1,name:d[4],tiltDegrees:0})),method:'Two built-in generated key/breakdown sheets. Common shoe registration and one uniform scale per atlas; canonical flame outline, body and lower legs reused. Active right-arm region and three facial states composited. Head, neck and collar reuse one continuous unrotated drawing to prevent neck separation. Timed drawings; no optical interpolation.'},null,2)+'\n');
 console.log('Packed',definitions.length,'cells. Lower-leg and shoe pixels identical. Duration',holds.reduce((a,b)=>a+b));
}
main().catch(e=>{console.error(e);process.exitCode=1});
