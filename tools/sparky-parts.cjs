const {connected}=require('./extract-sparky-figures.cjs');
function headPart(raw,w,h){
 const warm=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++){const p=i*4;warm[i]=raw[p+3]>100&&raw[p]>145&&raw[p+1]>25&&raw[p+2]<145?1:0;}
 const group=connected(warm,w,h)[0];if(!group||group.n<1000)throw Error('Missing flame-head landmark');
 const rows=new Map();for(const i of group.pixels){const y=i/w|0,x=i%w,r=rows.get(y)||[w,-1];r[0]=Math.min(r[0],x);r[1]=Math.max(r[1],x);rows.set(y,r);}
 // Locate the yellow neck separately from the face color component.
 let nx=0,n=0;const middle=(group.l+group.r)/2;
 for(let y=group.b+4;y<Math.min(h,group.b+22);y++)for(let x=Math.max(0,Math.round(middle-w*.16));x<Math.min(w,middle+w*.16);x++){
  const p=(y*w+x)*4;if(raw[p+3]>180&&raw[p]>220&&raw[p+1]>130&&raw[p+2]<100){nx+=x;n++;}
 }
 const neckX=n?nx/n:middle,jawY=group.b+3,allowed=new Uint8Array(w*h);
 for(let y=0;y<Math.min(h,group.b+10);y++)for(let x=0;x<w;x++){
  const p=(y*w+x)*4,blue=raw[p+2]>raw[p]+20&&raw[p+2]>raw[p+1]*1.05;
  allowed[y*w+x]=raw[p+3]>8&&!blue&&!(y>jawY&&Math.abs(x-neckX)<25)?1:0;
 }
 const groups=connected(allowed,w,h),head=groups.find(g=>g.pixels.includes(group.pixels[Math.floor(group.pixels.length/2)]));
 if(!head)throw Error('Cannot trace complete head outline');
 const mask=new Uint8Array(w*h),part=Buffer.alloc(raw.length);
 for(const i of head.pixels)mask[i]=1;
 // Recover only the immediate original antialias fringe, not a rectangle.
 const fringe=new Uint8Array(mask);
 for(const i of head.pixels){const x=i%w,y=i/w|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h||yy>jawY+2)continue;
  const j=yy*w+xx,p=j*4;if(raw[p+3]&&raw[p+3]<128)fringe[j]=1;
 }}
 for(let i=0;i<w*h;i++)if(fringe[i]){mask[i]=1;raw.copy(part,i*4,i*4,i*4+4);}
 // Hands can overlap the chin during thumbs-up/waves. They belong to the
 // foreground body layer; retain their complete glove and outline.
 const whites=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++){const p=i*4;whites[i]=raw[p+3]>80&&raw[p]>165&&raw[p+1]>165&&raw[p+2]>155?1:0;}
 const whiteGroups=connected(whites,w,h),headWidth=group.r-group.l,headHeight=group.b-group.t;
 for(const g of whiteGroups)if(g.n>group.n*.025&&(g.cy>group.b-headHeight*.20||g.cx<group.l+headWidth*.15||g.cx>group.r-headWidth*.15)){
  for(const i of g.pixels){const x=i%w,y=i/w|0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
   const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const j=yy*w+xx;mask[j]=0;part.fill(0,j*4,j*4+4);
  }}
 }
 return {mask,part,head:group,neckX,jawY};
}
function removeHead(raw,part,w,h){
 const result=Buffer.from(raw);for(let i=0;i<part.mask.length;i++)if(part.mask[i])result.fill(0,i*4,i*4+4);
 // Trace only the opaque body core, then restore its original edge pixels.
 // Disconnected low-alpha head fringe must not remain behind a reused head.
 const core=new Uint8Array(w*h);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  let solid=true;for(let dy=-2;dy<=2&&solid;dy++)for(let dx=-2;dx<=2;dx++)if(result[((y+dy)*w+x+dx)*4+3]<128){solid=false;break;}
  if(solid)core[y*w+x]=1;
 }
 const groups=connected(core,w,h),label=new Uint8Array(w*h),distance=new Uint8Array(w*h),queue=new Int32Array(w*h);distance.fill(255);let read=0,end=0;
 // Retain substantial disconnected limb pieces as well as the torso, but
 // exclude hairline remnants. Touching hands can remain separate components.
 for(const g of groups)if(g.n>60)for(const i of g.pixels){label[i]=1;distance[i]=0;queue[end++]=i;}
 while(read<end){const i=queue[read++],x=i%w,y=i/w|0;if(distance[i]>=8)continue;
  for(const j of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!label[j]&&result[j*4+3]>1){label[j]=1;distance[j]=distance[i]+1;queue[end++]=j;}
 }
 for(let i=0;i<label.length;i++)if(!label[i])result.fill(0,i*4,i*4+4);
 return result;
}
module.exports={headPart,removeHead};
