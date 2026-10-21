// Export accepted connected right-look drawings. No neck slicing or head rotation.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/05-room-game-lu-n-look-right';
const W=768,H=960,root=384,floor=888;
async function split(file,cols,rows,count=cols*rows,constructionScale=1){
 const metadata=await sharp(file).metadata(),results=[];
 const factor=.95*561/(metadata.width/cols)*constructionScale;
 for(let i=0;i<count;i++){
  const left=Math.round(i%cols*metadata.width/cols),top=Math.round(Math.floor(i/cols)*metadata.height/rows);
  const width=Math.round((i%cols+1)*metadata.width/cols)-left,height=Math.round((Math.floor(i/cols)+1)*metadata.height/rows)-top;
  const raw=await sharp(file).extract({left,top,width,height}).ensureAlpha().raw().toBuffer();
  let min=width,max=0,bottom=0;
  for(let y=Math.floor(height*.80);y<height;y++)for(let x=0;x<width;x++)if(raw[(y*width+x)*4+3]>220){min=Math.min(min,x);max=Math.max(max,x);bottom=Math.max(bottom,y);}
  if(min>=max)throw Error(`No shoe registration: ${file} cell${i}`);
  const resized=await sharp(raw,{raw:{width,height,channels:4}}).resize(Math.round(width*factor),Math.round(height*factor),{kernel:'lanczos3'}).png().toBuffer();
  const x=Math.round(root-(min+max)/2*factor),y=Math.round(floor-bottom*factor);
  if(x<0||y<0||x+Math.round(width*factor)>W||y+Math.round(height*factor)>H)throw Error('Pose exceeds common canvas');
  results.push(await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left:x,top:y}]).png().toBuffer());
 }
 return results;
}
async function main(){
 const keys=await split(`${dir}/sources/right-look-four-keys.png`,2,2);
 const breakdowns=await split(`${dir}/sources/right-look-three-breakdowns.png`,2,2,3,.94);
 const unique=[keys[0],keys[1],breakdowns[0],breakdowns[1],keys[2],keys[3]];
 const labels=['neutral','eyes screen-right','early right turn','middle right turn','near-final right turn','final right turn'];
 const lowerY=780,lower=await sharp(unique[0]).extract({left:0,top:lowerY,width:W,height:H-lowerY}).png().toBuffer();
 const corrected=[];
 for(const u of unique){
  const upper=await sharp(u).extract({left:0,top:0,width:W,height:lowerY}).png().toBuffer();
  corrected.push(await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:upper,left:0,top:0},{input:lower,left:0,top:lowerY}]).png().toBuffer());
 }
 const order=[0,1,2,3,4,5,4,3,2,1],holds=[600,100,80,65,80,900,80,65,80,100];
 fs.mkdirSync(`${dir}/frames`,{recursive:true});fs.mkdirSync(`${dir}/keys`,{recursive:true});
 corrected.forEach((p,i)=>fs.writeFileSync(`${dir}/keys/key-${String(i+1).padStart(2,'0')}.png`,p));
 const cells=[];
 for(let i=0;i<order.length;i++){
  const f=corrected[order[i]];fs.writeFileSync(`${dir}/frames/frame-${String(i+1).padStart(3,'0')}.png`,f);
  cells.push({input:f,left:i%5*W,top:Math.floor(i/5)*H});
 }
 const filename='05_Lu_N_Look_Right_improved.png';
 await sharp({create:{width:5*W,height:2*H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toFile(`${dir}/${filename}`);
 const meta={clip:'Room_Game/Lu_N_Look_Right',file:filename,columns:5,rows:2,frameCount:10,uniqueDrawings:6,cellWidth:W,cellHeight:H,root:[root,floor],loop:true,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),order,poses:labels,method:'Complete connected pose drawings from built-in imagegen edits, one uniform scale per input atlas, shoe-contact registration and single Lanczos resize. Entire head/neck/collar/torso kept together. Canonical lower legs/shoes reused below y780. Accepted turn drawings are reversed for return; no independent head rotation, face patches, morph or crossfade.'};
 fs.writeFileSync(`${dir}/animation.json`,JSON.stringify(meta,null,2)+'\n');
 console.log(JSON.stringify(meta));
}
main().catch(e=>{console.error(e);process.exitCode=1});
