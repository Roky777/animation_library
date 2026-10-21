/** Simple two-beat bounce from one intact character. No hip sway or body-part cuts. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),dir=ROOT+'/animation/sparky/improved/27-intro-dance-lu-dance-hipmove',out=dir+'/cute-bounce-v1',W=512,H=640;
const smooth=t=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,t))))/2;
function render(raw,phase){
 const result=Buffer.alloc(raw.length),rise=5*(1-Math.cos(phase*2))/2;
 // A rigid head/upper pose rises as a unit. Knees absorb the motion; shoes stay fixed.
 const lift=y=>y<=480?rise:y>=545?0:rise*(1-smooth((y-480)/65));
 for(let y=0;y<H;y++){
  let sy=y;for(let k=0;k<5;k++)sy=y+lift(sy);
  for(let x=0;x<W;x++){
   const armBand=smooth((sy-390)/15)*(1-smooth((sy-465)/15));
   const leftWeight=1-smooth((x-212)/22),rightWeight=smooth((x-278)/22);
   const side=Math.sin(phase),dx=2*side*armBand*(leftWeight+rightWeight);
   const sx=x-dx,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0,p=(y*W+x)*4;
   let a=0,r=0,g=0,b=0;
   for(let dy=0;dy<2;dy++)for(let xx=0;xx<2;xx++){
    const px=x0+xx,py=y0+dy;if(px<0||px>=W||py<0||py>=H)continue;
    const q=(py*W+px)*4,weight=(xx?fx:1-fx)*(dy?fy:1-fy)*raw[q+3];
    a+=weight;r+=weight*raw[q];g+=weight*raw[q+1];b+=weight*raw[q+2];
   }
   if(a>0){result[p]=Math.round(r/a);result[p+1]=Math.round(g/a);result[p+2]=Math.round(b/a);result[p+3]=Math.round(a);}
  }
 }
 return result;
}
(async()=>{
 const {data,info}=await sharp(out+'/sources/character.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),hp=headPart(data,info.width,info.height).head,scale=218/(hp.r-hp.l+1),rw=Math.round(info.width*scale),rh=Math.round(info.height*scale);
 const resized=await sharp(data,{raw:info}).resize(rw,rh,{kernel:'lanczos3'}).raw().toBuffer();let floor=-1;
 for(let j=0;j<rw*rh;j++)if(resized[j*4+3]>180)floor=Math.floor(j/rw);
 const left=Math.round(256-(hp.l+hp.r)/2*scale),top=592-floor,canonical=Buffer.alloc(W*H*4);
 for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const xx=left+x,yy=top+y,p=(y*rw+x)*4;if(xx<0||xx>=W||yy<0||yy>=H){if(resized[p+3]>180)throw Error('Clipped source');continue;}resized.copy(canonical,(yy*W+xx)*4,p,p+4);}
 fs.mkdirSync(out+'/frames',{recursive:true});await sharp(canonical,{raw:{width:W,height:H,channels:4}}).png().toFile(out+'/canonical.png');
 const count=48,columns=8,rows=6,sheet=Buffer.alloc(W*columns*H*rows*4),holdsMs=[];
 for(let i=0;i<count;i++){
  const frame=render(canonical,2*Math.PI*i/count);holdsMs.push(Math.round((i+1)*1000/30)-Math.round(i*1000/30));
  await sharp(frame,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
  for(let y=0;y<H;y++)frame.copy(sheet,((Math.floor(i/columns)*H+y)*columns*W+i%columns*W)*4,y*W*4,(y+1)*W*4);
 }
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const d={clip:'Cute_Bounce_Dance',file:'cute-bounce-v1/spritesheet.png',frameDir:'cute-bounce-v1/frames',exportPipeline:'cute-bounce-v1',columns,rows,cellWidth:W,cellHeight:H,root:[256,592],frameCount:count,sourceFrameCount:1,holdsMs,durationMs:1600,loop:true,wholeFigure:true,fixedHead:false,fixedUpperBody:false,renderedMotion:{fps:30,type:'cute-bounce',risePx:5,handBopPx:2,fixedShoeRows:[545,639],canonical:'cute-bounce-v1/canonical.png'},description:'A cute little two-beat bounce: happy smile, raised fists, soft knees and tiny hand bops.',method:'Replaces the rejected hands-on-hips dance. One intact character drawing provides a rigid head and complete clothing/limb joins. A smooth five-pixel upper-body rise eases into unchanged shoe contacts; tiny two-pixel hand bops use a continuous spatial mapping, without cutout joints, crossfades or model-size changes. The full head translates without stretching. Forty-eight rendered frames at30fps form two gentle beats over1600ms; duplicate poses share atlas cells. Older hip-sway source folders are archived/inactive. This is a simple planted bounce, not a stepping or hip-sway routine.',review:{status:'cute_bounce_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-cute-bounce-v1.json',JSON.stringify(d,null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Cute_Bounce_Dance\n\n'+d.method+'\n\nSource: `sources/character.png`; exact request: `prompt.json`. Rebuild: `node tools/build-cute-bounce.cjs`, normalize: `node tools/normalize-library-scale.cjs --refresh-source --only=27-intro-dance-lu-dance-hipmove`, publish: `node tools/build-sparky-library.cjs 27-intro-dance-lu-dance-hipmove`. Stable ID is retained for existing game links; visible action name is Cute_Bounce_Dance.\n');
 console.log('Cute_Bounce_Dance: 48 frames, 1600ms, two planted bounce beats.');
})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={render};
