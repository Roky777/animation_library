// Separate existing head artwork from the neck/shirt by connectivity, then reuse
// one complete canonical body. No redraws, head projection or rectangular shirt splice.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/05-room-game-lu-n-look-right',W=768,H=960;
function isolateHead(raw){
 let jaw=590;
 for(let y=570;y<615;y++){
  const p=(y*W+390)*4;
  if(raw[p+3]>200&&raw[p]<220&&raw[p+1]<90&&raw[p+2]<70){jaw=y;break;}
 }
 const allowed=new Uint8Array(W*H),seen=new Uint8Array(W*H);
 for(let y=0;y<625;y++)for(let x=0;x<W;x++){
  const i=y*W+x,p=i*4,r=raw[p],g=raw[p+1],b=raw[p+2];
  const blue=b>r+20&&b>g*1.1;
  allowed[i]=raw[p+3]>8&&!blue&&!(y>jaw+4&&x>=340&&x<=430)?1:0;
 }
 const queue=new Int32Array(W*H);let start=450*W+384,read=0,end=0;
 if(!allowed[start])throw Error('Head seed outside artwork');
 queue[end++]=start;seen[start]=1;
 while(read<end){
  const i=queue[read++],x=i%W;
  for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,i>=W?i-W:-1,i<W*(H-1)?i+W:-1])if(j>=0&&allowed[j]&&!seen[j]){seen[j]=1;queue[end++]=j;}
 }
 const head=Buffer.alloc(raw.length);
 // Recover interior eye highlights and the original antialiased contour.
 for(let y=0;y<=jaw+4;y++){
  let left=W,right=-1;
  for(let x=0;x<W;x++)if(seen[y*W+x]){left=Math.min(left,x);right=x;}
  if(right<0)continue;
  for(let x=Math.max(0,left-2);x<=Math.min(W-1,right+2);x++){
   const p=(y*W+x)*4;
   raw.copy(head,p,p,p+4);
  }
 }
 return {head,mask:seen,jaw};
}
async function main(){
 const data=[];for(let i=1;i<=8;i++)data.push(await sharp(`${dir}/keys-drawn-v4/key-${String(i).padStart(2,'0')}.png`).ensureAlpha().raw().toBuffer());
 const canonical=isolateHead(data[0]),body=Buffer.from(data[0]);
 // The neutral artwork has its last head row at 591. At row 592 the
 // canonical shoulders and neck begin. Clear the entire head region so no
 // disconnected contour or highlight can remain as a ghost on the body.
 body.fill(0,0,592*W*4);
 for(let y=592;y<600;y++){
  let left=W,right=-1;
  for(let x=0;x<W;x++){
   const p=(y*W+x)*4;
   if(body[p+3]>8&&body[p+2]>body[p]+20&&body[p+2]>body[p+1]*1.1){left=Math.min(left,x);right=x;}
  }
  for(let x=0;x<W;x++)if(x<left-1||x>right+1)body.fill(0,(y*W+x)*4,(y*W+x+1)*4);
 }
 fs.mkdirSync(`${dir}/keys-body-v5`,{recursive:true});fs.mkdirSync(`${dir}/frames-body-v5`,{recursive:true});
 const keys=[];
 for(let k=0;k<data.length;k++){
  const {head,jaw}=isolateHead(data[k]);
  // The stationary body is the foreground layer. Copy its RGBA pixels exactly,
  // including collar, shoulder outlines and antialiased shirt edges.
  for(let i=0;i<W*H;i++)if(body[i*4+3])body.copy(head,i*4,i*4,i*4+4);
  const png=await sharp(head,{raw:{width:W,height:H,channels:4}}).png().toBuffer();keys.push(png);
  fs.writeFileSync(`${dir}/keys-body-v5/key-${String(k+1).padStart(2,'0')}.png`,png);
  console.log('key',k+1,'head/neck boundary',jaw);
 }
 fs.writeFileSync(`${dir}/body-layer-v5.png`,await sharp(body,{raw:{width:W,height:H,channels:4}}).png().toBuffer());
 const old=JSON.parse(fs.readFileSync(`${dir}/animation-drawn-v4.json`)),cells=[];
 old.order.forEach((key,i)=>{fs.writeFileSync(`${dir}/frames-body-v5/frame-${String(i+1).padStart(3,'0')}.png`,keys[key]);cells.push({input:keys[key],left:i%7*W,top:Math.floor(i/7)*H});});
 const file='05_Lu_N_Look_Right_fixed_body_v5.png';
 await sharp({create:{width:W*7,height:H*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toFile(`${dir}/${file}`);
 const meta={...old,file,method:'Existing unwarped head drawings isolated by color/connectivity above the jaw. One complete canonical neck, collar, shirt, shoulder, arm, glove, shorts and leg layer reused pixel-for-pixel in every cell. The fixed body is foreground; no horizontal splice crosses the shirt.'};
 fs.writeFileSync(`${dir}/animation-body-v5.json`,JSON.stringify(meta,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});
