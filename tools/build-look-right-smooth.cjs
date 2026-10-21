// Denser head-turn drawings with canonical stationary body and explicit exposures.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/05-room-game-lu-n-look-right';
const W=768,H=960;
async function normalizeNew(){
 const file=`${dir}/sources/four-targeted-inbetweens-v2.png`,m=await sharp(file).metadata(),poses=[];
 const factor=.95*561/(m.width/2);
 for(let i=0;i<4;i++){
  const left=Math.round(i%2*m.width/2),top=Math.round(Math.floor(i/2)*m.height/2);
  const width=Math.round((i%2+1)*m.width/2)-left,height=Math.round((Math.floor(i/2)+1)*m.height/2)-top;
  const raw=await sharp(file).extract({left,top,width,height}).ensureAlpha().raw().toBuffer();
  let min=width,max=0,bottom=0;
  for(let y=Math.floor(height*.8);y<height;y++)for(let x=0;x<width;x++)if(raw[(y*width+x)*4+3]>220){min=Math.min(min,x);max=Math.max(max,x);bottom=Math.max(bottom,y);}
  const resized=await sharp(raw,{raw:{width,height,channels:4}}).resize(Math.round(width*factor),Math.round(height*factor),{kernel:'lanczos3'}).png().toBuffer();
  const x=Math.round(384-(min+max)/2*factor),y=Math.round(888-bottom*factor);
  if(x<0||y<0||x+Math.round(width*factor)>W||y+Math.round(height*factor)>H)throw Error('Pose exceeds canvas');
  poses.push(await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left:x,top:y}]).png().toBuffer());
 }
 return poses;
}
async function main(){
 const old=Array.from({length:6},(_,i)=>fs.readFileSync(`${dir}/keys/key-${String(i+1).padStart(2,'0')}.png`));
 const n=await normalizeNew();
 const originals=[old[0],old[1],old[2],n[0],n[1],n[2],old[3],n[3],old[4],old[5]];
 const cut=625,body=await sharp(old[0]).extract({left:0,top:cut,width:W,height:H-cut}).png().toBuffer();
 const stable=[];
 fs.mkdirSync(`${dir}/keys-v2`,{recursive:true});fs.mkdirSync(`${dir}/frames-v2`,{recursive:true});
 for(let i=0;i<originals.length;i++){
  const upper=await sharp(originals[i]).extract({left:0,top:0,width:W,height:cut}).png().toBuffer();
  const frame=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:upper,left:0,top:0},{input:body,left:0,top:cut}]).png().toBuffer();
  stable.push(frame);fs.writeFileSync(`${dir}/keys-v2/key-${String(i+1).padStart(2,'0')}.png`,frame);
 }
 const order=[0,1,2,3,4,5,6,7,8,9,8,7,6,5,4,3,2,1];
 const holds=[600,80,50,40,40,40,40,40,50,900,50,40,40,40,40,40,50,80];
 const cells=[];
 order.forEach((key,i)=>{const f=stable[key];fs.writeFileSync(`${dir}/frames-v2/frame-${String(i+1).padStart(3,'0')}.png`,f);cells.push({input:f,left:i%6*W,top:Math.floor(i/6)*H});});
 const file='05_Lu_N_Look_Right_smooth_v2.png';
 await sharp({create:{width:6*W,height:3*H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toFile(`${dir}/${file}`);
 const meta={clip:'Room_Game/Lu_N_Look_Right',file,columns:6,rows:3,frameCount:18,uniqueDrawings:10,cellWidth:W,cellHeight:H,root:[384,888],loop:true,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),order,method:'Four targeted generated drawings added in the largest angular gaps. Stationary torso, arms, hands, legs and feet below y625 reuse canonical pixels. Head/neck/collar kept connected and unrotated. No crossfade or optical morph. Each unique pose remains a drawing; holds specify the actual animation timing.'};
 fs.writeFileSync(`${dir}/animation-v2.json`,JSON.stringify(meta,null,2)+'\n');
 console.log(JSON.stringify(meta));
}
main().catch(e=>{console.error(e);process.exitCode=1});
