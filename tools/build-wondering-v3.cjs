// Whole-pose export: never split the face, head, neck, collar or torso.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/03-intro-lucas-room-touch-lu-wondering';
const W=768,H=960,ground=888,root=384;
async function split(file,constructionScale=1){
 const image=sharp(file),m=await image.metadata(),out=[];
 const factor=.95*561/(m.width/2)*constructionScale; // One scale for the entire source atlas.
 for(let i=0;i<4;i++){
  const left=Math.round(i%2*m.width/2),top=Math.round(Math.floor(i/2)*m.height/2);
  const width=Math.round((i%2+1)*m.width/2)-left,height=Math.round((Math.floor(i/2)+1)*m.height/2)-top;
  const crop=await sharp(file).extract({left,top,width,height}).ensureAlpha().raw().toBuffer();
  let min=width,max=0,bottom=0;
  for(let y=Math.floor(height*.82);y<height;y++)for(let x=0;x<width;x++)if(crop[(y*width+x)*4+3]>220){min=Math.min(min,x);max=Math.max(max,x);bottom=Math.max(bottom,y);}
  const resized=await sharp(crop,{raw:{width,height,channels:4}}).resize(Math.round(width*factor),Math.round(height*factor),{kernel:'lanczos3'}).png().toBuffer();
  const destX=Math.round(root-(min+max)/2*factor),destY=Math.round(ground-bottom*factor);
  if(destX<0||destY<0||destX+Math.round(width*factor)>W||destY+Math.round(height*factor)>H)throw Error('Source does not fit common cell');
  out.push(await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left:destX,top:destY}]).png().toBuffer());
 }
 return out;
}
async function main(){
 const a=await split(`${dir}/sources/whole-poses-lift-v3.png`),b=await split(`${dir}/sources/whole-poses-recovery-v3.png`,633/647);
 const poses=[a[0],a[1],a[2],a[3],b[0],a[3],a[2],a[1],a[0]], holds=[400,80,70,90,1000,90,70,80,620];
 const fixedY=780;
 const lower=await sharp(a[0]).extract({left:0,top:fixedY,width:W,height:H-fixedY}).png().toBuffer();
 fs.mkdirSync(`${dir}/frames-v3`,{recursive:true});const cells=[];
 for(let i=0;i<poses.length;i++){
  // Only already-stationary legs and shoes are reused. The ENTIRE upper figure
  // comes from its connected drawing, with no head rotation or face patch.
  const upper=await sharp(poses[i]).extract({left:0,top:0,width:W,height:fixedY}).png().toBuffer();
  const frame=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:upper,left:0,top:0},{input:lower,left:0,top:fixedY}]).png().toBuffer();
  fs.writeFileSync(`${dir}/frames-v3/frame-${String(i+1).padStart(3,'0')}.png`,frame);
  cells.push({input:frame,left:i%3*W,top:Math.floor(i/3)*H});
 }
 const filename='03_Lu_Wondering_whole_poses_v3.png';
 await sharp({create:{width:W*3,height:H*3,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toFile(`${dir}/${filename}`);
 const meta={clip:'Intro/Lucas_Room_Touch/Lu_Wondering',file:filename,columns:3,rows:3,frameCount:9,uniqueDrawings:5,cellWidth:W,cellHeight:H,root:[root,ground],loop:false,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),method:'Whole connected pose drawings from two built-in imagegen edits. Single sequence-wide proportional scale per input atlas (recovery atlas construction corrected by 633/647 against the neutral height); accepted lift drawings reused for return, shoe-contact registration and one Lanczos resize. No facial patches or detached head rotations. Stationary lower legs/shoes reused below y780.',framesFolder:'frames-v3'};
 fs.writeFileSync(`${dir}/animation-v3.json`,JSON.stringify(meta,null,2)+'\n');
 console.log(JSON.stringify(meta));
}
main().catch(e=>{console.error(e);process.exitCode=1});
