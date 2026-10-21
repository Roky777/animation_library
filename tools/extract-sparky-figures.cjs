/** Extract complete figures from generated sheets using eroded-core ownership.
 * Erosion is used only to find labels, never as the exported alpha mask.
 * Original RGBA is restored by bounded foreground propagation around each core.
 */
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
function connected(mask,W,H){
 const seen=new Uint8Array(W*H),q=new Int32Array(W*H),groups=[];
 for(let seed=0;seed<W*H;seed++){
  if(seen[seed]||!mask[seed])continue;let read=0,end=0,l=W,r=0,t=H,b=0;
  q[end++]=seed;seen[seed]=1;
  while(read<end){const i=q[read++],x=i%W,y=i/W|0;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const j of [x?i-1:-1,x<W-1?i+1:-1,y?i-W:-1,y<H-1?i+W:-1])if(j>=0&&!seen[j]&&mask[j]){seen[j]=1;q[end++]=j;}
  }
  groups.push({pixels:Int32Array.from(q.subarray(0,end)),n:end,l,r,t,b,cx:(l+r)/2,cy:(t+b)/2});
 }
 return groups.sort((a,b)=>b.n-a.n);
}
function erode(alpha,W,H,radius){
 const mask=new Uint8Array(W*H),integral=new Uint32Array((W+1)*(H+1));
 for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=alpha[y*W+x]>=128?1:0;integral[(y+1)*(W+1)+x+1]=integral[y*(W+1)+x+1]+row;}}
 const side=radius*2+1,area=side*side;
 for(let y=radius;y<H-radius;y++)for(let x=radius;x<W-radius;x++){
  const x0=x-radius,y0=y-radius,x1=x+radius+1,y1=y+radius+1;
  const sum=integral[y1*(W+1)+x1]-integral[y0*(W+1)+x1]-integral[y1*(W+1)+x0]+integral[y0*(W+1)+x0];mask[y*W+x]=sum===area?1:0;
 }
 return mask;
}
function orderPrimaries(groups,W,H,count=16,columns=4){
 const candidates=groups.filter(g=>g.n>W*H*.006),primaries=candidates.slice(0,count);
 if(primaries.length!==count)return null;
 // A merged figure is far taller than the other figures. Try a larger core erosion.
 const median=primaries.map(g=>g.b-g.t).sort((a,b)=>a-b)[Math.floor(count/2)];
 if(primaries.some(g=>g.b-g.t>median*1.65))return null;
 const rows=primaries.sort((a,b)=>a.cy-b.cy),ordered=[];
 for(let row=0;row<Math.ceil(count/columns);row++)ordered.push(...rows.slice(row*columns,row*columns+columns).sort((a,b)=>a.cx-b.cx));
 return ordered;
}
async function extractFigures(file,options={}){
 const count=options.count||16,columns=options.columns||4;
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height,alpha=new Uint8Array(W*H);
 for(let i=0;i<alpha.length;i++)alpha[i]=data[i*4+3];
 let primaries,groups,radius;
 for(radius=2;radius<=6;radius++){
  groups=connected(erode(alpha,W,H,radius),W,H);primaries=orderPrimaries(groups,W,H,count,columns);if(primaries)break;
 }
 if(!primaries)throw Error(`Cannot isolate requested figures safely: ${file}`);
 const labels=new Uint8Array(W*H),distance=new Uint8Array(W*H),queue=new Int32Array(W*H);distance.fill(255);
 let read=0,end=0;const primarySet=new Set(primaries);
 const seedGroup=(group,id)=>{for(const i of group.pixels){labels[i]=id+1;distance[i]=0;queue[end++]=i;}};
 primaries.forEach(seedGroup);
 // Preserve isolated props (e.g. the pedestal and glass), but discard tiny specks.
 const props=[];
 for(const group of groups){
  if(primarySet.has(group)||group.n<75)continue;
  let best=0,score=Infinity;
  for(let i=0;i<count;i++){
   const g=primaries[i],dx=Math.max(g.l-group.r,group.l-g.r,0),dy=Math.max(g.t-group.b,group.t-g.b,0);
   const candidate=dx*dx+dy*dy*2+((group.cy-g.cy)/6)**2;
   if(candidate<score){score=candidate;best=i;}
  }
  if(score<(W/4*.65)**2){seedGroup(group,best);props.push({frame:best+1,pixels:group.n,bounds:[group.l,group.t,group.r,group.b]});}
 }
 const limit=radius*3+4;
 while(read<end){
  const i=queue[read++],d=distance[i];if(d>=limit)continue;const x=i%W,y=i/W|0;
  for(const j of [x?i-1:-1,x<W-1?i+1:-1,y?i-W:-1,y<H-1?i+W:-1])if(j>=0&&alpha[j]>1&&!labels[j]){labels[j]=labels[i];distance[j]=d+1;queue[end++]=j;}
 }
 const bounds=Array.from({length:count},()=>({l:W,r:-1,t:H,b:-1,n:0}));
 for(let i=0;i<labels.length;i++)if(labels[i]){const g=bounds[labels[i]-1],x=i%W,y=i/W|0;g.l=Math.min(g.l,x);g.r=Math.max(g.r,x);g.t=Math.min(g.t,y);g.b=Math.max(g.b,y);g.n++;}
 const frames=bounds.map((g,id)=>{
  const pad=3,x0=Math.max(0,g.l-pad),y0=Math.max(0,g.t-pad),x1=Math.min(W,g.r+pad+1),y1=Math.min(H,g.b+pad+1),w=x1-x0,h=y1-y0,raw=Buffer.alloc(w*h*4);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*W+x;if(labels[i]===id+1)data.copy(raw,((y-y0)*w+x-x0)*4,i*4,i*4+4);}
  return {raw,w,h,sourceOrigin:[x0,y0],sourceBounds:g,primaryBounds:primaries[id]};
 });
 return {frames,audit:{source:file,sourceWidth:W,sourceHeight:H,coreRadius:radius,propComponents:props,frameBounds:bounds,figureCount:count,method:'Eroded-core figure labels; bounded alpha propagation restores original RGBA; no rectangular neighboring-pose pixels copied.',unassignedOpaquePixels:alpha.reduce((n,a,i)=>n+(a>180&&!labels[i]?1:0),0)}};
}
module.exports={extractFigures,connected};
