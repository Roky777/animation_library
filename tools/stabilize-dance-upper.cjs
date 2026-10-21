const {connected}=require('./extract-sparky-figures.cjs');
const W=512,H=640;
function gloves(raw,radius=11){
 const core=new Uint8Array(W*H),mask=new Uint8Array(W*H),dist=new Uint8Array(W*H),q=[];dist.fill(255);
 for(let y=420;y<480;y++)for(let x=150;x<355;x++){if(x>225&&x<285)continue;const j=y*W+x,p=j*4;if(raw[p+3]>180&&raw[p]>170&&raw[p+1]>170&&raw[p+2]>160)core[j]=1;}
 for(const g of connected(core,W,H))if(g.n>250)for(const j of g.pixels){mask[j]=1;dist[j]=0;q.push(j);}
 for(let k=0;k<q.length;k++){const j=q[k];if(dist[j]>=radius)continue;for(const z of [j-1,j+1,j-W,j+W]){const x=z%W,y=z/W|0,p=z*4;if(x<140||x>365||y<415||y>482||mask[z]||raw[p+3]<2||(raw[p+2]>raw[p]+55&&raw[p+2]>raw[p+1]*1.1))continue;mask[z]=1;dist[z]=dist[j]+1;q.push(z);}}
 return mask;
}
async function stabilize(stages,sharp){
 const base=Buffer.from(stages[0]),gm=gloves(stages[0],4);
 for(let y=458;y<H;y++)for(let x=0;x<W;x++)if(!gm[y*W+x])base.fill(0,(y*W+x)*4,(y*W+x+1)*4);
 for(let p=3;p<base.length;p+=4)if(base[p]>250)base[p]=255;
 const upper=await sharp(base,{raw:{width:W,height:H,channels:4}}).png().toBuffer(),lowerParts=[],outputs=[];
 for(let i=0;i<5;i++){
  const lower=Buffer.from(stages[i]),m=gloves(stages[i]);lower.fill(0,0,454*W*4);for(let j=454*W;j<W*H;j++)if(m[j]){
   // White shorts stripes beside a glove belong to the garment, not the hand.
   let garment=false;
   if(j/W>=458)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const p=(j+dy*W+dx)*4;if(stages[i][p+3]>180&&stages[i][p+2]>stages[i][p]+55&&stages[i][p+2]>stages[i][p+1]*1.1)garment=true;
   }
   if(!garment)lower.fill(0,j*4,j*4+4);
  }
  // Keep the connected pants/legs only: removed glove ink and scan specks
  // must not survive as floating fragments or influence ground registration.
  const groups=connected(Uint8Array.from({length:W*H},(_,j)=>lower[j*4+3]>8?1:0),W,H);
  const keep=new Uint8Array(W*H);
  for(const j of groups[0].pixels)keep[j]=1;
  for(let j=0;j<W*H;j++)if(!keep[j])lower.fill(0,j*4,j*4+4);
  let floor=-1;for(let y=H-1;y>=454;y--){let n=0;for(let x=0;x<W;x++)if(lower[(y*W+x)*4+3]>180)n++;if(n>=6){floor=y;break;}}
  // Translate just the legs to their contact line; extend beneath the shirt.
  const shift=592-floor,grounded=Buffer.alloc(lower.length);
  for(let y=454;y<=floor;y++)lower.copy(grounded,(y+shift)*W*4,y*W*4,(y+1)*W*4);
  for(let y=454;y<454+shift;y++)lower.copy(grounded,y*W*4,454*W*4,455*W*4);
  lowerParts.push(grounded);
 }
 const order=[0,1,2,3,4,3,2,1];
 for(const mirror of [false,true])for(const k of order){
  if(mirror&&k===0){outputs.push(Buffer.from(outputs[0]));continue;}let lower=lowerParts[k];if(mirror){const flipped=Buffer.alloc(lower.length);for(let y=454;y<H;y++)for(let x=1;x<W;x++)lower.copy(flipped,(y*W+512-x)*4,(y*W+x)*4,(y*W+x+1)*4);lower=flipped;}
  outputs.push(await sharp(lower,{raw:{width:W,height:H,channels:4}}).composite([{input:upper}]).ensureAlpha().raw().toBuffer());
 }
 return{frames:outputs,upper:base,sourceOrder:[...order,...order],mirrored:Array(9).fill(false).concat(Array(7).fill(true))};
}
module.exports={stabilize};
