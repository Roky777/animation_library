/** Continuous invertible whole-sprite mapping; premultiplied-alpha sampling. */
const W=512,H=640;
const knots=[[0,0],[380,0],[410,0],[455,8],[480,12],[510,7],[545,0],[640,0]];
function sway(y){for(let i=1;i<knots.length;i++)if(y<=knots[i][0]){const [a,v]=knots[i-1],[b,u]=knots[i],t=(y-a)/(b-a),s=(1-Math.cos(Math.PI*t))/2;return v+(u-v)*s;}return 0;}
function vertical(y){if(y<=400||y>=545)return 0;return Math.sin(Math.PI*(y-400)/145);}
function render(raw,phase){
 const out=Buffer.alloc(raw.length),q=Math.sin(phase),rise=.8*(1-Math.cos(phase*2))/2;
 for(let y=0;y<H;y++){
  let sy=y;for(let k=0;k<4;k++)sy=y-rise*vertical(sy);
  const shift=q*sway(sy),y0=Math.floor(sy),fy=sy-y0;
  for(let x=0;x<W;x++){
   const sx=x-shift,x0=Math.floor(sx),fx=sx-x0,p=(y*W+x)*4;
   let a=0,r=0,g=0,b=0;
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const xx=x0+dx,yy=y0+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;
    const j=(yy*W+xx)*4,w=(dx?fx:1-fx)*(dy?fy:1-fy)*raw[j+3];
    a+=w;r+=w*raw[j];g+=w*raw[j+1];b+=w*raw[j+2];
   }
   if(a>0){out[p]=Math.round(r/a);out[p+1]=Math.round(g/a);out[p+2]=Math.round(b/a);out[p+3]=Math.round(a);}
  }
 }
 return out;
}
module.exports={render,sway,vertical};
