/* Export reviewed blink artwork and continuous breathing to a real PNG sequence.
 * Dependencies: npm install --prefix /tmp/sparky-animation-tools @napi-rs/canvas sharp
 * Run from the project root: node tools/build-idle-eb.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const {createCanvas, loadImage} = require(process.env.CANVAS_MODULE || '/tmp/sparky-animation-tools/node_modules/@napi-rs/canvas');
const sharp = require(process.env.SHARP_MODULE || '/tmp/sparky-animation-tools/node_modules/sharp');
const out='animation/sparky/improved/02-idle-eb';
const W=512,H=640,N=85,MS=40,COLS=10,ROWS=9;
async function main(){
 fs.mkdirSync(`${out}/frames`,{recursive:true}); fs.mkdirSync(`${out}/keys`,{recursive:true});
 const base=createCanvas(W,H),bc=base.getContext('2d');
 const original=await loadImage('unpolished anmations/02_Idle_EB.png');
 bc.drawImage(original,0,0,W,H,0,0,W,H);
 const edit=await loadImage(`${out}/blink-key-edit-source.png`);
 // Reviewed eye landmarks in the generated sheet. Only these local eye areas
 // are accepted; all generated body, flame, mouth and costume pixels are discarded.
 const sourceEyes=[[[649,278],[747,278]],[[1105,281],[1204,281]],[[190,800],[290,800]]];
 const targetEyes=[[218,349],[302,349]];
 const keys=[base];
 for(const pair of sourceEyes){
   const c=createCanvas(W,H),ctx=c.getContext('2d');ctx.drawImage(base,0,0);
   for(let j=0;j<2;j++){
     const [sx,sy]=pair[j],[tx,ty]=targetEyes[j];
     const patch=createCanvas(64,64),pc=patch.getContext('2d');
     // 76px source region, uniformly reduced; preserve original eyebrows.
     pc.drawImage(edit,sx-38,sy-38,76,76,0,0,64,64);
     const pixels=pc.getImageData(0,0,64,64);
     for(let y=0;y<64;y++) for(let x=0;x<64;x++){
       const d=Math.hypot((x-31.5)/31,(y-31.5)/29);
       const feather=Math.max(0,Math.min(1,(1-d)/.10));
       const preserveBrow=Math.max(0,Math.min(1,(ty-32+y-321)/3));
       pixels.data[(y*64+x)*4+3]*=feather*preserveBrow;
     }
     pc.putImageData(pixels,0,0);ctx.drawImage(patch,tx-32,ty-32);
   }
   keys.push(c);
 }
 for(let i=0;i<keys.length;i++) fs.writeFileSync(`${out}/keys/key-${i}.png`,keys[i].toBuffer('image/png'));
 const sheet=createCanvas(COLS*W,ROWS*H),sc=sheet.getContext('2d');
 const frames=[];
 for(let i=0;i<N;i++){
   const ms=i*MS;
   // A single 240ms blink, faster closure than reopening. No dissolve/morph.
   let key=0;
   if(ms>=2040&&ms<2080)key=1;
   else if(ms>=2080&&ms<2120)key=2;
   else if(ms>=2120&&ms<2200)key=3;
   else if(ms>=2200&&ms<2240)key=2;
   else if(ms>=2240&&ms<2280)key=1;
   const lift=5*(1-Math.cos(2*Math.PI*i/N))/2;
   const c=createCanvas(W,H),ctx=c.getContext('2d');
   ctx.imageSmoothingEnabled=true;
   // One continuous map: rigid head, extending chest to fixed waist, locked legs.
   ctx.drawImage(keys[key],0,0,W,400,0,-lift,W,400);
   ctx.drawImage(keys[key],0,400,W,120,0,400-lift,W,120+lift);
   ctx.drawImage(keys[key],0,520,W,120,0,520,W,120);
   const filename=`frame-${String(i+1).padStart(3,'0')}.png`;
   fs.writeFileSync(`${out}/frames/${filename}`,c.toBuffer('image/png'));
   sc.drawImage(c,(i%COLS)*W,Math.floor(i/COLS)*H);
   frames.push({file:`frames/${filename}`,durationMs:MS,key,headLiftPx:lift});
 }
 fs.writeFileSync(`${out}/02_Idle_EB_improved.png`,sheet.toBuffer('image/png'));
 // Read exported pixels back: shoe/leg pixels must be identical in every frame.
 const canonical=await sharp(`${out}/frames/frame-001.png`).extract({left:0,top:520,width:W,height:120}).raw().toBuffer();
 for(const f of frames){
   const lower=await sharp(`${out}/${f.file}`).extract({left:0,top:520,width:W,height:120}).raw().toBuffer();
   if(!lower.equals(canonical))throw Error(`Lower-body drift: ${f.file}`);
 }
 const sheetMeta=await sharp(`${out}/02_Idle_EB_improved.png`).metadata();
 if(sheetMeta.width!==COLS*W||sheetMeta.height!==ROWS*H||!sheetMeta.hasAlpha)throw Error('Invalid atlas');
 const json={clip:'Idle_EB',file:'02_Idle_EB_improved.png',columns:COLS,rows:ROWS,frameCount:N,uniqueBlinkDrawings:4,cellWidth:W,cellHeight:H,root:[256,592],loop:true,fps:25,durationMs:N*MS,holdsMs:Array(N).fill(MS),runtimeBreathing:false,method:'Canonical source artwork with three locally composited generated eyelid states. A continuous piecewise chest breathing transform is baked at 25fps; rigid head and fixed lower body. These are sampled motion frames, not 85 independently drawn poses.',frames};
 fs.writeFileSync(`${out}/animation.json`,JSON.stringify(json,null,2)+'\n');
 fs.writeFileSync(`${out}/qa-report.json`,JSON.stringify({frameCount:N,dimensions:[COLS*W,ROWS*H],cell:[W,H],alpha:true,lowerBodyIdenticalAllFrames:true,periodicBreathing:true,duplicateEndpoint:false,unusedCells:5,blinkDurationMs:240,checks:'Exported PNG dimensions, alpha, and lower-body byte equality verified. Visual playback still requires review.'},null,2)+'\n');
 console.log(`Exported ${N} frames, ${N*MS}ms, fixed lower-body pixels verified.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
