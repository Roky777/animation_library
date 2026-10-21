// Feature-registered mesh in-betweens, baked into a portable sprite sheet.
// This is interpolation of existing drawings, not newly hand-drawn poses.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/05-room-game-lu-n-look-right';
const W=768,H=960,HEAD=592,CW=448,CH=640,CX=160,CY=270;
function components(raw,test,box){
 const [x0,y0,x1,y1]=box,seen=new Uint8Array(W*HEAD),groups=[];
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const seed=y*W+x;if(seen[seed]||!test(raw,seed*4))continue;
  const q=[seed];seen[seed]=1;let l=x,r=x,t=y,b=y,sx=0,sy=0;
  for(let k=0;k<q.length;k++){const i=q[k],px=i%W,py=i/W|0;l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,py);b=Math.max(b,py);sx+=px;sy+=py;
   for(const j of [i-1,i+1,i-W,i+W]){const nx=j%W,ny=j/W|0;if(nx>=x0&&nx<x1&&ny>=y0&&ny<y1&&!seen[j]&&test(raw,j*4)){seen[j]=1;q.push(j);}}
  }
  if(q.length>8){const g={l,r,t,b,x:sx/q.length,y:sy/q.length,n:q.length};Object.defineProperty(g,'pixels',{value:q});groups.push(g);}
 }
 return groups.sort((a,b)=>b.n-a.n);
}
function ellipse(p,cx,cy,rx,ry,n=8){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;p.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}}
function landmarks(raw){
 const irises=[];const p=[[0,0],[767,0],[767,591],[0,591],[384,591],[355,591],[415,591]];
 // Same angular samples of the complete silhouette, including flame notches.
 for(let k=0;k<64;k++){const a=k/64*Math.PI*2;let hit=[384,480];for(let r=0;r<450;r+=.5){const x=Math.round(384+Math.cos(a)*r),y=Math.round(480+Math.sin(a)*r);if(x<0||x>=W||y<0||y>=HEAD)continue;if(raw[(y*W+x)*4+3]>180)hit=[x,y];}p.push(hit);}
 const yellow=components(raw,(v,i)=>v[i+3]>180&&v[i]>235&&v[i+1]>185&&v[i+2]<125,[210,295,570,591])[0];
 const yellowMask=new Uint8Array(W*HEAD);for(const i of yellow.pixels)yellowMask[i]=1;
 for(let k=0;k<32;k++){const a=k/32*Math.PI*2;let hit=[384,540];for(let r=0;r<300;r+=.5){const x=Math.round(384+Math.cos(a)*r),y=Math.round(540+Math.sin(a)*r);if(x>=0&&x<W&&y>=0&&y<HEAD&&yellowMask[y*W+x])hit=[x,y];}p.push(hit);}
 const whites=components(raw,(v,i)=>v[i+3]>180&&v[i]>190&&v[i+1]>180&&v[i+2]>155,[280,470,550,555]);
 const white=whites.filter(g=>g.n>300).slice(0,2).sort((a,b)=>a.x-b.x);
 if(white.length!==2)throw Error('Could not locate both eyes');
 for(const whiteEye of white){
  const rings=components(raw,(v,i)=>v[i+3]>180&&v[i]<115&&v[i+1]<90&&v[i+2]<80,[whiteEye.l-10,478,Math.min(555,whiteEye.r+20),555]).filter(g=>g.b-g.t>40&&g.r-g.l>15).sort((a,b)=>(b.r-b.l)*(b.b-b.t)-(a.r-a.l)*(a.b-a.t));
  const e=rings[0]||whiteEye,x=(e.l+e.r)/2,y=(e.t+e.b)/2,rx=(e.r-e.l)/2,ry=(e.b-e.t)/2;ellipse(p,x,y,rx,ry,12);p.push([x,y]);
  const glint=whites.filter(g=>g.n>15&&g.n<400&&g.x>e.l&&g.x<e.r&&g.y<525).sort((a,b)=>b.n-a.n)[0];
  if(!glint)throw Error('Eye highlight missing');
  const ic=[glint.x-6,glint.y+12],sclera=new Uint8Array(W*HEAD);for(const i of whiteEye.pixels)sclera[i]=1;
  for(let j=0;j<12;j++){
   const a=j/12*Math.PI*2;let hit=ic;
   for(let r=0;r<70;r+=.5){const xx=ic[0]+Math.cos(a)*r,yy=ic[1]+Math.sin(a)*r,px=Math.round(xx),py=Math.round(yy);if(sclera[py*W+px]||((xx-x)/(rx-2))**2+((yy-y)/(ry-2))**2>1)break;hit=[xx,yy];}
   p.push(hit);
  }
  p.push(ic,[glint.x,glint.y]);ellipse(p,glint.x,glint.y,(glint.r-glint.l)/2,(glint.b-glint.t)/2,8);
  irises.push({center:ic,glint});
 }
 const nose=components(raw,(v,i)=>v[i+3]>200&&v[i]>230&&v[i+1]>95&&v[i+1]<190&&v[i+2]<65,[365,520,510,550]).find(g=>g.r-g.l<32&&g.b-g.t<20&&g.n>100);
 if(!nose)throw Error('Nose missing');ellipse(p,nose.x,nose.y,(nose.r-nose.l)/2,(nose.b-nose.t)/2);p.push([nose.x,nose.y]);
 const mouth=components(raw,(v,i)=>v[i+3]>180&&v[i]<140&&v[i+1]<110&&v[i+2]<85,[Math.round(nose.x-65),547,Math.round(Math.min(530,nose.x+40)),577])[0];
 if(!mouth)throw Error('Mouth missing');
 for(let j=0;j<=8;j++){
  const x=mouth.l+(mouth.r-mouth.l)*j/8,near=mouth.pixels.filter(i=>Math.abs(i%W-x)<1.6),ys=near.map(i=>i/W|0);
  const center=ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:mouth.y;
  for(const dy of [-2,0,2])p.push([x,center+dy]);
 }
 // Brows are separate contours; hold their shape while moving with the eyes.
 for(const e of white){const brow=components(raw,(v,i)=>v[i+3]>180&&v[i]>140&&v[i]<240&&v[i+1]<100&&v[i+2]<65,[Math.max(290,e.l-12),430,Math.min(525,e.r+12),478])[0];if(!brow)throw Error('Brow missing');p.push([brow.l,brow.b],[brow.x,brow.t],[brow.r,brow.b]);}
 return {points:p,nose:[nose.x,nose.y],eyes:white,irises,mouth};
}
function circum(a,b,c){const d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(Math.abs(d)<1e-6)return null;const aa=a[0]**2+a[1]**2,bb=b[0]**2+b[1]**2,cc=c[0]**2+c[1]**2;const x=(aa*(b[1]-c[1])+bb*(c[1]-a[1])+cc*(a[1]-b[1]))/d,y=(aa*(c[0]-b[0])+bb*(a[0]-c[0])+cc*(b[0]-a[0]))/d;return {x,y,r:(x-a[0])**2+(y-a[1])**2};}
function triangulate(points){
 const n=points.length,p=[...points,[-5000,-5000],[5000,-5000],[0,5000]];let ts=[[n,n+1,n+2]];
 for(let i=0;i<n;i++){const edges=new Map(),keep=[];for(const t of ts){const c=circum(...t.map(j=>p[j]));if(c&&(p[i][0]-c.x)**2+(p[i][1]-c.y)**2<c.r+1e-5){for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}else keep.push(t);}ts=keep.concat([...edges.values()].map(([a,b])=>[a,b,i]));}
 return ts.filter(t=>t.every(i=>i<n)&&circum(...t.map(i=>points[i])));
}
function sample(raw,x,y,out){
 x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(HEAD-1.001,y));const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy;out.fill(0);
 for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=((iy+dy)*W+ix+dx)*4,w=(dx?fx:1-fx)*(dy?fy:1-fy),a=raw[i+3]/255;out[3]+=w*a;for(let c=0;c<3;c++)out[c]+=w*a*raw[i+c];}
}
function render(A,B,pa,pb,pm,u,body){
 const result=Buffer.alloc(CW*CH*4),sa=[0,0,0,0],sb=[0,0,0,0],triangles=triangulate(pm);
 for(const t of triangles){const [a,b,c]=t.map(i=>pm[i]),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.001)continue;
  const x0=Math.max(CX,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(CX+CW-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(CY,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(591,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const q=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,r=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,s=1-q-r;if(q<-.00001||r<-.00001||s<-.00001)continue;
   sample(A,q*pa[t[0]][0]+r*pa[t[1]][0]+s*pa[t[2]][0],q*pa[t[0]][1]+r*pa[t[1]][1]+s*pa[t[2]][1],sa);
   sample(B,q*pb[t[0]][0]+r*pb[t[1]][0]+s*pb[t[2]][0],q*pb[t[0]][1]+r*pb[t[1]][1]+s*pb[t[2]][1],sb);
   const at=sa[3]*(1-u)+sb[3]*u,i=((y-CY)*CW+x-CX)*4;result[i+3]=Math.round(at*255);if(at>0)for(let k=0;k<3;k++)result[i+k]=Math.round((sa[k]*(1-u)+sb[k]*u)/at);
  }
 }
 for(let y=CY;y<CY+CH;y++)for(let x=CX;x<CX+CW;x++){const i=(y*W+x)*4;if(body[i+3])body.copy(result,((y-CY)*CW+x-CX)*4,i,i+4);}
 return result;
}
async function main(){
 const indices=[1,2,3,4,6,7,8,10,11,12],raw=[],features=[];
 const body=await sharp(`${dir}/body-layer-v5.png`).ensureAlpha().raw().toBuffer();
 for(const i of indices){const a=await sharp(`${dir}/keys-sequence-v6/key-${String(i).padStart(2,'0')}.png`).ensureAlpha().raw().toBuffer();const f=landmarks(a);raw.push(a);features.push(f);}
 fs.mkdirSync(`${dir}/frames-continuous-v8`,{recursive:true});
 const progress=features.map(f=>(f.nose[0]-features[0].nose[0])/(features.at(-1).nose[0]-features[0].nose[0]));
 const keys=[],metrics=[];
 for(let frame=0;frame<=45;frame++){
  const t=frame/45,v=t*t*t*(10+t*(-15+6*t));let k=0;while(k<progress.length-2&&v>progress[k+1])k++;
  const u=(v-progress[k])/(progress[k+1]-progress[k]),pa=features[k].points,pb=features[k+1].points;
  const pm=pa.map((p,i)=>p.map((c,d)=>{
   const before=features[Math.max(0,k-1)].points[i][d],after=features[Math.min(features.length-1,k+2)].points[i][d];
   const span=progress[k+1]-progress[k],m0=k===0?pb[i][d]-c:(pb[i][d]-before)/(progress[k+1]-progress[k-1])*span,m1=k===progress.length-2?pb[i][d]-c:(after-c)/(progress[k+2]-progress[k])*span;
   return (2*u**3-3*u*u+1)*c+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*pb[i][d]+(u**3-u*u)*m1;
  }));
  const data=render(raw[k],raw[k+1],pa,pb,pm,u,body),png=await sharp(data,{raw:{width:CW,height:CH,channels:4}}).png().toBuffer();keys.push(png);metrics.push({frame,t,sourceKeys:[indices[k],indices[k+1]],fraction:u,noseX:features[0].nose[0]+v*(features.at(-1).nose[0]-features[0].nose[0])});
 }
 const order=[...Array(46).keys(),...Array.from({length:44},(_,i)=>44-i)],holds=order.map((_,i)=>1000/60+(i===0?450:i===45?650:0));
 const composites=order.map((k,i)=>{fs.writeFileSync(`${dir}/frames-continuous-v8/frame-${String(i+1).padStart(3,'0')}.png`,keys[k]);return {input:keys[k],left:i%9*CW,top:(i/9|0)*CH};});
 const file='05_Lu_N_Look_Right_continuous_v8.png';await sharp({create:{width:CW*9,height:CH*10,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toFile(`${dir}/${file}`);
 const meta={clip:'Room_Game/Lu_N_Look_Right',file,columns:9,rows:10,frameCount:90,uniqueDrawings:10,renderedPoses:46,cellWidth:CW,cellHeight:CH,root:[384-CX,888-CY],loop:true,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),order,method:'Feature-registered mesh interpolation of ten selected source drawings. Matched eye, iris, brow, nose, mouth and silhouette landmarks; continuous cubic landmark paths with quintic ease in/out. Premultiplied aligned source textures interpolated inside triangles. Complete original body copied unchanged. Baked 60 fps in-betweens, not ninety hand-drawn poses.',sourceKeys:indices,metrics};
 fs.writeFileSync(`${dir}/animation-continuous-v8.json`,JSON.stringify(meta,null,2)+'\n');
 for(const i of [0,8,16,22,30,38,45])fs.writeFileSync(`output/continuous-v8-frame-${i}.png`,keys[i]);
 console.log(JSON.stringify({frames:90,durationMs:meta.durationMs,sourceFeatures:features.map((f,i)=>({key:indices[i],nose:f.nose,eyes:f.eyes,mouth:f.mouth})),maxNoseStep:Math.max(...metrics.slice(1).map((m,i)=>m.noseX-metrics[i].noseX))}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
