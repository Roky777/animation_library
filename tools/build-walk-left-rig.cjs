// Rejected experiment. Retained only for diagnosis; never publish this cutout rig.
if(!process.argv.includes('--allow-rejected-experiment'))throw Error('This rig was rejected for distorted limb artwork. Use tools/build-walk-left-drawn.cjs.');
/** Authored, continuous walk rig. Uses one canonical drawing, never crossfades poses. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {createCanvas,loadImage}=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const ROOT=path.resolve(__dirname,'..'),id='06-common-walk-lu-walk-left',dir=path.join(ROOT,'animation/sparky/improved',id),W=512,H=640,N=60,MS=1000/60;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],mul=(a,t)=>[a[0]*t,a[1]*t],len=a=>Math.hypot(...a),lerp=(a,b,t)=>add(mul(a,1-t),mul(b,t)),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function transform(p,a,b,c,d){let u=sub(b,a),v=sub(d,c),z=sub(p,a),den=u[0]*u[0]+u[1]*u[1],co=(u[0]*v[0]+u[1]*v[1])/den,si=(u[0]*v[1]-u[1]*v[0])/den;return [c[0]+z[0]*co-z[1]*si,c[1]+z[0]*si+z[1]*co]}
function rotate(p,pivot,angle){const c=Math.cos(angle),s=Math.sin(angle),v=sub(p,pivot);return add(pivot,[v[0]*c-v[1]*s,v[0]*s+v[1]*c])}
async function main(){
 const before=path.join(dir,'animation-before-walk-rig-v3.json');if(!fs.existsSync(before))fs.copyFileSync(path.join(dir,'animation.json'),before);
 const source=path.join(dir,'walk-rig-canonical-v3.png');
 if(!fs.existsSync(source)){
  const f=(await require('./extract-sparky-figures.cjs').extractFigures(path.join(dir,'sources/expanded-sheet-v1.png'))).frames[0];
  const r=JSON.parse(fs.readFileSync(before)).registration[0];
  const input=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).resize(Math.round(f.w*r.scale),Math.round(f.h*r.scale)).png().toBuffer();
  await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:r.left,top:r.top}]).png().toFile(source);
 }
 const original=await loadImage(source);
 function part(name,polygon){const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(original,0,0);fs.writeFileSync(path.join(dir,`rig-${name}.png`),canvas.toBuffer('image/png'));return canvas;}
 const body=part('body',[[100,150],[400,150],[400,399],[284,399],[291,406],[297,424],[292,440],[297,469],[307,497],[280,515],[264,510],[224,496],[218,470],[221,443],[211,437],[204,422],[231,401],[100,399]]);
 const nearArm=part('near-arm',[[279,400],[309,405],[324,420],[350,447],[381,463],[387,498],[368,515],[343,510],[325,493],[321,461],[308,450],[291,438],[280,418]]);
 const farArm=part('far-arm',[[211,416],[225,435],[205,452],[192,474],[177,488],[155,488],[141,473],[142,443],[161,427],[183,424],[199,427]]);
 const nearLeg=part('near-leg',[[231,488],[263,499],[259,521],[248,543],[248,574],[241,598],[218,593],[156,560],[151,538],[169,520],[198,522],[216,519]]);
 const farLeg=part('far-leg',[[277,495],[302,497],[323,517],[343,533],[358,548],[350,570],[326,586],[291,591],[276,585],[274,565],[289,545],[299,531],[279,522],[267,509]]);
 const near={H:[253,489],K:[244,514],A:[233,539],sole:53,art:nearLeg,box:[146,483,265,604],side:-1};
 const far={H:near.H,K:near.K,A:near.A,hip:[267,492],sole:53,art:nearLeg,box:near.box,side:1};
 // Texture transforms blend only around joints. Head, collar and clothing stay rigid.
 function ik(h,a,L1,L2){let delta=sub(a,h),D=len(delta);if(D>L1+L2-.01)a=add(h,mul(delta,(L1+L2-.01)/D));delta=sub(a,h);D=len(delta);const along=(L1*L1-L2*L2+D*D)/(2*D),height=Math.sqrt(Math.max(0,L1*L1-along*along)),u=mul(delta,1/D);return {A:a,K:add(add(h,mul(u,along)),[-u[1]*height,u[0]*height])};}
 for(const leg of [near,far]){
  const raw=leg.art.getContext('2d').getImageData(0,0,W,H).data,u=mul(sub(leg.A,leg.K),1/len(sub(leg.A,leg.K)));leg.solePoints=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(raw[(y*W+x)*4+3]>180&&(x-leg.A[0])*u[0]+(y-leg.A[1])*u[1]>3)leg.solePoints.push(sub([x,y],leg.A));
 }
 function gait(phase,leg,bob){
  const stance=phase<.62,t=stance?phase/.62:(phase-.62)/.38;
  const x=stance?224+64*t:288-64*smooth(t)+(64/.62*.38)*(2*t*t*t-3*t*t+t),raise=stance?0:16*Math.sin(Math.PI*t)**2;
  const angle=-.50+(stance?.18-.33*smooth(t):-.15+.33*smooth(t));
  const soleY=Math.max(...leg.solePoints.map(p=>rotate(p,[0,0],angle)[1]));
  const h=add(leg.hip||leg.H,[0,bob]),a=[x,592-soleY-raise];
  const solved=ik(h,a,len(sub(leg.K,leg.H))*1.30,len(sub(leg.A,leg.K))*1.30);
  // Heel-to-toe rocker, returning continuously across the wrap.
  
  return {H:h,...solved,angle,phase,stance,contactError:len(sub(solved.A,a))};
 }
 function warpPoint(p,leg,pose){
  const upper=transform(p,leg.H,leg.K,pose.H,pose.K),lower=transform(p,leg.K,leg.A,pose.K,pose.A);
  const ku=mul(sub(leg.K,leg.H),1/len(sub(leg.K,leg.H))),au=mul(sub(leg.A,leg.K),1/len(sub(leg.A,leg.K))),kp=sub(p,leg.K),ap=sub(p,leg.A);
  const along=(kp[0]*ku[0]+kp[1]*ku[1]+5)/10;let q=lerp(upper,lower,smooth(along));
  const foot=add(pose.A,sub(rotate(p,leg.A,pose.angle),leg.A));
  q=lerp(q,foot,smooth((ap[0]*au[0]+ap[1]*au[1]+9)/12));return q;
 }
 function triangle(ctx,img,s,d){
  const [p0,p1,p2]=s,[q0,q1,q2]=d,ux=p1[0]-p0[0],uy=p1[1]-p0[1],vx=p2[0]-p0[0],vy=p2[1]-p0[1],det=ux*vy-uy*vx;
  const a=((q1[0]-q0[0])*vy-(q2[0]-q0[0])*uy)/det,c=((q2[0]-q0[0])*ux-(q1[0]-q0[0])*vx)/det,b=((q1[1]-q0[1])*vy-(q2[1]-q0[1])*uy)/det,e=((q2[1]-q0[1])*ux-(q1[1]-q0[1])*vx)/det;
  ctx.save();ctx.beginPath();const mid=mul(add(add(q0,q1),q2),1/3);d.forEach((q,i)=>{const v=sub(q,mid),z=len(v),r=add(q,mul(v,.22/(z||1)));i?ctx.lineTo(...r):ctx.moveTo(...r)});ctx.closePath();ctx.clip();ctx.transform(a,b,c,e,q0[0]-a*p0[0]-c*p0[1],q0[1]-b*p0[0]-e*p0[1]);ctx.drawImage(img,0,0);ctx.restore();
 }
 function legDraw(ctx,leg,pose){const [l,t,r,b]=leg.box,step=8;for(let y=t;y<b;y+=step)for(let x=l;x<r;x+=step){const a=[x,y],c=[Math.min(x+step,r),Math.min(y+step,b)],b0=[c[0],y],d=[x,c[1]];for(const tri of [[a,b0,c],[a,c,d]])triangle(ctx,leg.art,tri,tri.map(p=>warpPoint(p,leg,pose)));}}
 function armDraw(ctx,art,pivot,angle,bob){ctx.save();ctx.translate(pivot[0],pivot[1]+bob);ctx.rotate(angle);ctx.translate(-pivot[0],-pivot[1]);ctx.drawImage(art,0,0);ctx.restore();}
 const output=[],audit=[];fs.mkdirSync(path.join(dir,'frames-walk-rig-v3'),{recursive:true});
 for(let i=0;i<N;i++){
  const phase=i/N,bob=7.4+1.4*Math.cos(4*Math.PI*phase);
  const nearPose=gait(phase,near,bob),farPose=gait((phase+.5)%1,far,bob);
  const canvas=createCanvas(W*2,H*2),ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  armDraw(ctx,farArm,[218,426],.18*Math.cos(phase*2*Math.PI),bob);
  legDraw(ctx,far,farPose);legDraw(ctx,near,nearPose);
  // Covered hip connectors live below the shorts, never across the shirt/neck.
  ctx.drawImage(body,0,bob);
  armDraw(ctx,nearArm,[291,416],-.18*Math.cos(phase*2*Math.PI),bob);
  const png=await sharp(canvas.toBuffer('image/png')).resize(W,H).png().toBuffer();output.push(png);fs.writeFileSync(path.join(dir,'frames-walk-rig-v3',`frame-${String(i+1).padStart(3,'0')}.png`),png);
  audit.push({frame:i,phase,bob,near:nearPose,far:farPose});
 }
 const file='06_walk_rig_v3.png';await sharp({create:{width:W*10,height:H*6,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(output.map((input,i)=>({input,left:i%10*W,top:Math.floor(i/10)*H}))).png().toFile(path.join(dir,file));
 fs.writeFileSync(path.join(dir,'walk-rig-v3.json'),JSON.stringify({file,frameCount:N,columns:10,rows:6,holdsMs:Array(N).fill(MS),audit,method:'Single-source articulated textured walk, continuous two-leg IK and opposite arm swing; 60 fps; no independent redraws or crossfades.'},null,2)+'\n');const method='Single-source articulated textured walk. One connected head/shirt/shorts drawing; smoothly blended leg joints, alternating support and swing, rigid shoe textures, opposite arm swing and 2.8px body bounce. 60 distinct render samples per second. No pose crossfades, optical flow or independently redrawn body frames.';
 const data={clip:'Common/Walk/Lu_Walk_Left',file,exportPipeline:'walk-rig-v3',columns:10,rows:6,frameCount:N,cellWidth:W,cellHeight:H,root:[256,592],loop:true,holdsMs:Array(N).fill(MS),durationMs:1000,uniqueDrawings:1,sourceFrameCount:1,fixedHead:true,method,description:'A continuous left-facing in-place walk with alternating foot contacts, knee lift, arm swing and gentle body bounce.',registration:audit.map(f=>({frame:f.frame+1,scale:1,left:0,top:f.bob,headPlacement:{left:0,top:f.bob,scale:1}})),review:{status:'needs_visual_review',artisticApproval:false}};
 fs.writeFileSync(path.join(dir,'animation-walk-rig-v3.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'GENERATION.md'),'# Continuous left walk v3\n\n'+method+'\n\nCanonical texture: `walk-rig-canonical-v3.png`. Render: `node tools/build-walk-left-rig.cjs`. Publish: `node tools/build-sparky-library.cjs 06-common-walk-lu-walk-left`. The original sixteen-pose source and the previous registration JSON remain preserved. The far leg reuses the same shoe/leg texture at its own hip attachment; logos and face are never mirrored. Full motion parameters are recorded in `walk-rig-v3.json`.\n');
 const loose=path.join(dir,'frames');if(!fs.existsSync(path.join(dir,'frames-isolated-v2')))fs.cpSync(loose,path.join(dir,'frames-isolated-v2'),{recursive:true});
 for(let i=0;i<N;i++)fs.copyFileSync(path.join(dir,'frames-walk-rig-v3',`frame-${String(i+1).padStart(3,'0')}.png`),path.join(loose,`frame-${String(i+1).padStart(3,'0')}.png`));
 console.log('Rendered continuous walk',N,'frames; maximum IK contact correction:',Math.max(...audit.flatMap(a=>[a.near.contactError,a.far.contactError])));
}
main().catch(e=>{console.error(e);process.exitCode=1});
