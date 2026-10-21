// Real pose drawings; no procedural head projection or per-pixel warping.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/05-room-game-lu-n-look-right',W=768,H=960;
async function single(file){
 const m=await sharp(file).metadata(),raw=await sharp(file).ensureAlpha().raw().toBuffer();
 let min=m.width,max=0,bottom=0;
 for(let y=Math.floor(m.height*.8);y<m.height;y++)for(let x=0;x<m.width;x++)if(raw[(y*m.width+x)*4+3]>220){min=Math.min(min,x);max=Math.max(max,x);bottom=Math.max(bottom,y);}
 const factor=250/(max-min);
 const resized=await sharp(raw,{raw:{width:m.width,height:m.height,channels:4}}).resize(Math.round(m.width*factor),Math.round(m.height*factor),{kernel:'lanczos3'}).png().toBuffer();
 const x=Math.round(384-(min+max)/2*factor),y=Math.round(888-bottom*factor);
 const cx=Math.max(0,-x),cy=Math.max(0,-y),cw=Math.min(Math.round(m.width*factor)-cx,W-Math.max(0,x)),ch=Math.min(Math.round(m.height*factor)-cy,H-Math.max(0,y));
 const clipped=await sharp(resized).extract({left:cx,top:cy,width:cw,height:ch}).png().toBuffer();
 return sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:clipped,left:Math.max(0,x),top:Math.max(0,y)}]).png().toBuffer();
}
async function correctConstruction(pose,scale,neckY){
 const resized=await sharp(pose).resize(Math.round(W*scale),Math.round(H*scale),{kernel:'lanczos3'}).png().toBuffer();
 const x=Math.round(384-384*scale),y=Math.round(615-neckY*scale),cx=Math.max(0,-x),cy=Math.max(0,-y);
 const width=Math.min(Math.round(W*scale)-cx,W-Math.max(0,x)),height=Math.min(Math.round(H*scale)-cy,H-Math.max(0,y));
 const input=await sharp(resized).extract({left:cx,top:cy,width,height}).png().toBuffer();
 return sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:Math.max(0,x),top:Math.max(0,y)}]).png().toBuffer();
}
async function main(){
 const old=Array.from({length:6},(_,i)=>fs.readFileSync(`${dir}/keys/key-${String(i+1).padStart(2,'0')}.png`));
 const early=await correctConstruction(await single(`${dir}/sources/single-turn-early-v4.png`),1.08,632);
 const a=await correctConstruction(await single(`${dir}/sources/single-turn-a-v4.png`),1.065,630);
 const b=await correctConstruction(await single(`${dir}/sources/single-turn-b-v4.png`),.995,613);
 const poses=[old[0],old[1],old[2],early,a,old[3],old[4],old[5]];
 const cut=625,body=await sharp(old[0]).extract({left:0,top:cut,width:W,height:H-cut}).png().toBuffer();
 fs.mkdirSync(`${dir}/keys-drawn-v4`,{recursive:true});fs.mkdirSync(`${dir}/frames-drawn-v4`,{recursive:true});
 const keys=[];
 for(let i=0;i<poses.length;i++){
  const upper=await sharp(poses[i]).extract({left:0,top:0,width:W,height:cut}).png().toBuffer();
  const frame=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:upper,left:0,top:0},{input:body,left:0,top:cut}]).png().toBuffer();
  keys.push(frame);fs.writeFileSync(`${dir}/keys-drawn-v4/key-${String(i+1).padStart(2,'0')}.png`,frame);
 }
 const order=[0,1,2,3,4,5,6,7,6,5,4,3,2,1];
 const holds=[600,60,55,60,60,60,60,900,60,60,60,60,55,60];
 const cells=[];order.forEach((key,i)=>{const frame=keys[key];fs.writeFileSync(`${dir}/frames-drawn-v4/frame-${String(i+1).padStart(3,'0')}.png`,frame);cells.push({input:frame,left:i%7*W,top:Math.floor(i/7)*H});});
 const file='05_Lu_N_Look_Right_drawn_v4.png';
 await sharp({create:{width:W*7,height:H*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toFile(`${dir}/${file}`);
 const data={clip:'Room_Game/Lu_N_Look_Right',file,columns:7,rows:2,frameCount:14,uniqueDrawings:8,cellWidth:W,cellHeight:H,root:[384,888],loop:true,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),order,method:'Complete unwarped head/neck/collar drawings with two accepted individually generated in-between poses. Source figures uniformly scaled once against stationary shoe width and translated to common floor/root. New head/neck construction uniformly scaled without changing aspect ratio and registered at the collar; canonical body below y625 reused. No procedural head projection, liquify, horizontal squeeze, optical flow or crossfade.'};
 fs.writeFileSync(`${dir}/animation-drawn-v4.json`,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));
}
main().catch(e=>{console.error(e);process.exitCode=1});
