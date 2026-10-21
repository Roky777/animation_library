// Continuous 2.5D yaw rig using canonical artwork as a texture.
// This is a geometric render, not generated in-between artwork or optical flow.
const fs=require('node:fs');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir='animation/sparky/improved/05-room-game-lu-n-look-right';
const W=768,H=960,N=80,MS=40,COLS=10,ROWS=8;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function angleAt(ms){
 if(ms<480)return 0;
 if(ms<960)return smooth((ms-480)/480)*22*Math.PI/180;
 if(ms<1840)return 22*Math.PI/180;
 if(ms<2400)return (1-smooth((ms-1840)/560))*22*Math.PI/180;
 return 0;
}
function weight(y){
 if(y<285||y>=600)return 0;
 if(y<400)return .38+.62*smooth((y-285)/115);
 if(y<550)return 1;
 return 1-smooth((y-550)/50);
}
async function main(){
 const source=await sharp(`${dir}/keys/key-01.png`).ensureAlpha().raw().toBuffer();
 fs.mkdirSync(`${dir}/frames-rig-v3`,{recursive:true});const cells=[];const frames=[];
 // Each row is a monotonic curved-surface projection about a vertical yaw axis.
 // Its displacement blends continuously to ZERO through the neck attachment.
 // Inverse maps are solved per output pixel; colors sample premultiplied alpha.
 for(let i=0;i<N;i++){
  const ms=i*MS,angle=angleAt(ms),co=Math.cos(angle),si=Math.sin(angle);
  const out=Buffer.from(source);
  if(angle>0){
   for(let y=280;y<600;y++){
    const w=weight(y);if(!w)continue;
    for(let x=170;x<600;x++){
     const dest=x-384;
     // Solve a monotonic quadratic projection using Newton iteration.
     let sx=dest;
     for(let k=0;k<5;k++){
      const u=sx/180,curvature=Math.max(0,1-u*u);
      const f=sx*(1-(1-co)*w)+90*si*w*curvature-dest;
      const derivative=1-(1-co)*w+(Math.abs(u)<1?-180*si*w*sx/(180*180):0);
      sx-=f/Math.max(.07,derivative);
     }
     sx+=384;
     const at=(y*W+x)*4;
     if(sx<0||sx>=W-1){out.fill(0,at,at+4);continue;}
     const left=Math.floor(sx),fraction=sx-left,one=(y*W+left)*4,two=one+4;
     const alpha=source[one+3]*(1-fraction)+source[two+3]*fraction;
     out[at+3]=Math.round(alpha);
     for(let c=0;c<3;c++)out[at+c]=alpha?Math.round((source[one+c]*source[one+3]*(1-fraction)+source[two+c]*source[two+3]*fraction)/alpha):0;
    }
   }
  }
  const file=`frame-${String(i+1).padStart(3,'0')}.png`;
  const png=await sharp(out,{raw:{width:W,height:H,channels:4}}).png().toBuffer();fs.writeFileSync(`${dir}/frames-rig-v3/${file}`,png);
  cells.push({input:png,left:i%COLS*W,top:Math.floor(i/COLS)*H});frames.push({file:`frames-rig-v3/${file}`,durationMs:MS,yawDegrees:angle*180/Math.PI});
 }
 const file='05_Lu_N_Look_Right_rig_v3.png';
 await sharp({create:{width:W*COLS,height:H*ROWS,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png().toFile(`${dir}/${file}`);
 const meta={clip:'Room_Game/Lu_N_Look_Right',file,columns:COLS,rows:ROWS,frameCount:N,cellWidth:W,cellHeight:H,root:[384,888],loop:true,fps:25,holdsMs:Array(N).fill(MS),durationMs:N*MS,frames,method:'Authored continuous 2.5D curved-texture head-yaw rig using one canonical pose. Quintic ease-in/out, per-row projection and exact stationary body below y600. No independent pose switching, crossfade, optical flow or generated intermediate artwork. This approximates a modest right look; it is not a fully modeled 3D head or the source final silhouette.'};
 fs.writeFileSync(`${dir}/animation-rig-v3.json`,JSON.stringify(meta,null,2)+'\n');console.log('Rendered',N,'frames at25FPS; head and neck deformation returns to identity at y600.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
