/** Keep one complete head/torso/lower body; attach authored arm drawings beneath its sleeve. */
const {headPart}=require('./sparky-parts.cjs'),{connected}=require('./extract-sparky-figures.cjs');
const W=512,H=640;
const blue=(r,g,b)=>b>r+55&&b>g*1.1;
function arm(raw){
 const hp=headPart(raw,W,H),core=new Uint8Array(W*H),yellow=new Uint8Array(W*H);
 for(let y=310;y<520;y++)for(let x=60;x<230;x++){
  const j=y*W+x,p=j*4,r=raw[p],g=raw[p+1],b=raw[p+2];if(raw[p+3]<180||hp.mask[j])continue;
  const warm=y<505&&r>180&&g>65&&b<135,white=r>170&&g>170&&b>160;
  if(warm)yellow[j]=1;if(warm||white)core[j]=1;
 }
 const groups=connected(core,W,H),mask=new Uint8Array(W*H),dist=new Uint8Array(W*H),queue=[];dist.fill(255);
 for(const g of groups)if(g.n>320)for(const j of g.pixels){mask[j]=1;dist[j]=0;queue.push(j);}
 for(let k=0;k<queue.length;k++){
  const j=queue[k],x=j%W,y=j/W|0;if(dist[j]>=12)continue;
  for(const z of [j-1,j+1,j-W,j+W]){const xx=z%W,yy=z/W|0,p=z*4;if(xx<55||xx>232||yy<305||yy>524||mask[z]||hp.mask[z]||raw[p+3]<2||blue(raw[p],raw[p+1],raw[p+2]))continue;mask[z]=1;dist[z]=dist[j]+1;queue.push(z);}
 }
 let best=Infinity,anchor;
 for(let y=395;y<450;y++)for(let x=130;x<225;x++)if(yellow[y*W+x]&&mask[y*W+x]){
  let near=false;for(let dy=-10;dy<=10&&!near;dy++)for(let dx=-10;dx<=10;dx++){if(dx*dx+dy*dy>100)continue;const p=((y+dy)*W+x+dx)*4;if(raw[p+3]>180&&blue(raw[p],raw[p+1],raw[p+2])){near=true;break;}}
  const score=(x-200)**2+(y-425)**2;if(near&&score<best){best=score;anchor=[x,y];}
 }
 if(!anchor)throw Error('Cannot anchor wave arm beneath sleeve');
 const part=Buffer.alloc(raw.length);for(let j=0;j<W*H;j++)if(mask[j])raw.copy(part,j*4,j*4,j*4+4);
 return{part,mask,anchor};
}
function shift(raw,dx,dy){const out=Buffer.alloc(raw.length);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H)raw.copy(out,(yy*W+xx)*4,(y*W+x)*4,(y*W+x+1)*4);}return out;}
async function stabilize(stages,sharp){
 const parts=stages.map(arm),base=Buffer.from(stages[0]);
 for(let j=0;j<W*H;j++)if(parts[0].mask[j])base.fill(0,j*4,j*4+4);
 // Clear the neutral glove exterior fringe, safely outside the fixed garment silhouette.
 for(let y=438;y<526;y++)for(let x=55;x<203;x++)base.fill(0,(y*W+x)*4,(y*W+x+1)*4);
 // Preserve the fixed sleeve and garment outlines over the moving upper-arm joint.
 for(let y=390;y<520;y++)for(let x=140;x<235;x++){
  const p=(y*W+x)*4;if(!parts[0].mask[y*W+x])continue;let garment=false;
  for(let dy=-2;dy<=2&&!garment;dy++)for(let dx=-2;dx<=2;dx++){const q=((y+dy)*W+x+dx)*4;if(blue(stages[0][q],stages[0][q+1],stages[0][q+2])&&stages[0][q+3]>180){garment=true;break;}}
  if(garment)stages[0].copy(base,p,p,p+4);
 }
 for(let p=3;p<base.length;p+=4)if(base[p]>250)base[p]=255;
 const fixed=await sharp(base,{raw:{width:W,height:H,channels:4}}).png().toBuffer(),outputs=[],alignedParts=[];
 for(let i=0;i<parts.length;i++){
  const dx=parts[0].anchor[0]-parts[i].anchor[0],dy=parts[0].anchor[1]-parts[i].anchor[1],moving=shift(parts[i].part,dx,dy);
  alignedParts.push(moving);const result=await composeArm(moving,fixed,sharp);
  const bits=connected(Uint8Array.from({length:W*H},(_,j)=>result[j*4+3]>128?1:0),W,H);for(const g of bits.slice(1))if(g.n<4)for(const j of g.pixels)result.fill(0,j*4,j*4+4);outputs.push(result);
 }
 return{stages:outputs,base,fixed,alignedParts,anchors:parts.map(p=>p.anchor),targetAnchor:parts[0].anchor};
}
async function composeArm(moving,fixed,sharp){return sharp(moving,{raw:{width:W,height:H,channels:4}}).composite([{input:fixed}]).ensureAlpha().raw().toBuffer();}
function glove(raw){let x=0,y=0,n=0;for(let j=0;j<W*H;j++){const p=j*4;if(raw[p+3]>180&&raw[p]>170&&raw[p+1]>170&&raw[p+2]>160){x+=j%W;y+=Math.floor(j/W);n++;}}if(!n)throw Error('Missing moving glove');return[x/n,y/n];}
function rotateToward(a,b,anchor,t){
 const ga=glove(a),gb=glove(b),aa=Math.atan2(ga[1]-anchor[1],ga[0]-anchor[0]),ab=Math.atan2(gb[1]-anchor[1],gb[0]-anchor[0]);let delta=ab-aa;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;
 const theta=delta*t,c=Math.cos(theta),s=Math.sin(theta),out=Buffer.alloc(a.length);
 for(let y=280;y<535;y++)for(let x=40;x<255;x++){
  const dx=x-anchor[0],dy=y-anchor[1],sx=anchor[0]+c*dx+s*dy,sy=anchor[1]-s*dx+c*dy,x0=Math.floor(sx),y0=Math.floor(sy);if(x0<0||x0>=W-1||y0<0||y0>=H-1)continue;
  const fx=sx-x0,fy=sy-y0,weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy],points=[(y0*W+x0)*4,(y0*W+x0+1)*4,((y0+1)*W+x0)*4,((y0+1)*W+x0+1)*4],p=(y*W+x)*4;let alpha=0,r=0,g=0,blue=0;
  for(let k=0;k<4;k++){const q=points[k],wa=weights[k]*a[q+3]/255;alpha+=wa;r+=a[q]*wa;g+=a[q+1]*wa;blue+=a[q+2]*wa;}out[p+3]=Math.round(alpha*255);if(alpha){out[p]=Math.round(r/alpha);out[p+1]=Math.round(g/alpha);out[p+2]=Math.round(blue/alpha);}
 }
 return out;
}
module.exports={stabilize,composeArm,rotateToward,glove};
