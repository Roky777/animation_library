// Continuous motion sampled from a single canonical drawing, with fixed contacts.
function breathe(base,width,height,phase,mode,anchor,protectedHead){
 const out=Buffer.alloc(base.length),lift=(mode==='standing'?2:1.4)*(1-Math.cos(phase*Math.PI*2))/2;
 const cx=mode==='sleep'?300:anchor.x,cy=mode==='sleep'?530:anchor.y+44,rx=mode==='sleep'?75:62,ry=mode==='sleep'?52:46;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4;let sy=y;
  if(protectedHead&&protectedHead[p+3]){base.copy(out,p,p,p+4);continue;}
  if(mode==='standing'){
   const jaw=anchor.y,waist=jaw+100;
   sy=y<jaw-lift?y+lift:y<waist?jaw+(y-(jaw-lift))*(waist-jaw)/(waist-jaw+lift):y;
  }else{
   const d=((x-cx)/rx)**2+((y-cy)/ry)**2;
   if(d<1)sy=y+lift*(1-d)**2;
  }
  if(sy===y){base.copy(out,p,p,p+4);continue;}
  sy=Math.max(0,Math.min(height-1.001,sy));const y0=Math.floor(sy),f=sy-y0,p0=(y0*width+x)*4,p1=p0+width*4,a0=base[p0+3]/255,a1=base[p1+3]/255,alpha=a0*(1-f)+a1*f;
  out[p+3]=Math.round(alpha*255);if(alpha)for(let c=0;c<3;c++)out[p+c]=Math.round((base[p0+c]*a0*(1-f)+base[p1+c]*a1*f)/alpha);
 }
 return out;
}
module.exports={breathe};
