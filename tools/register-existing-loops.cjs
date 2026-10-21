/** Preserve existing loop drawings; correct their shared integer-pixel floor registration. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),base=path.join(ROOT,'animation/sparky/improved');
const index=JSON.parse(fs.readFileSync(ROOT+'/animation-library/manifest.json'));
(async()=>{
 for(const entry of index.animations.filter(e=>[1,2,4,5,23,24].includes(Number(e.id.slice(0,2))))){
  const dir=base+'/'+entry.id,out=dir+'/registration-v3';fs.mkdirSync(out+'/frames',{recursive:true});
  const before=out+'/before-library-animation.json';if(!fs.existsSync(before))fs.copyFileSync(ROOT+'/animation-library/'+entry.metadata,before);
  const d=JSON.parse(fs.readFileSync(before)),src=path.join(ROOT,'animation-library/animations',entry.id,d.sheet),raw=await sharp(src).ensureAlpha().raw().toBuffer();
  const result=Buffer.alloc(raw.length),moves=[];
  for(let i=0;i<d.frameCount;i++){
   const frame=Buffer.alloc(512*640*4),sw=d.columns*512;
   for(let y=0;y<640;y++){const off=((Math.floor(i/d.columns)*640+y)*sw+i%d.columns*512)*4;raw.copy(frame,y*512*4,off,off+512*4);}
   let floor=0;for(let y=0;y<640;y++)for(let x=0;x<512;x++)if(frame[(y*512+x)*4+3]>180)floor=y;
   const dy=592-floor,shifted=Buffer.alloc(frame.length);
   for(let y=0;y<640;y++)if(y+dy>=0&&y+dy<640)frame.copy(shifted,(y+dy)*512*4,y*512*4,(y+1)*512*4);
   const png=await sharp(shifted,{raw:{width:512,height:640,channels:4}}).png().toBuffer();fs.writeFileSync(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`,png);
   for(let y=0;y<640;y++)shifted.copy(result,((Math.floor(i/d.columns)*640+y)*sw+i%d.columns*512)*4,y*512*4,(y+1)*512*4);
   moves.push(dy);
  }
  await sharp(result,{raw:{width:d.sheetWidth,height:d.sheetHeight,channels:4}}).png().toFile(out+'/spritesheet.png');
  const data={clip:d.name,file:'registration-v3/spritesheet.png',exportPipeline:'registration-v3',frameDir:'registration-v3/frames',columns:d.columns,rows:d.rows,frameCount:d.frameCount,cellWidth:512,cellHeight:640,root:[256,592],loop:d.loop,holdsMs:d.frameDurationsMs,durationMs:d.durationMs,description:d.description,review:{status:'registration_review',artisticApproval:false},method:'Existing complete playback cells and their timing are preserved. Integer-pixel vertical translation aligns each opaque sole/floor baseline to y592, without repainting, resizing, body-part separation or changing the breathing/blink/look motion.',registration:moves.map((dy,i)=>({frame:i+1,dx:0,dy,wholeFigure:true}))};
  fs.writeFileSync(dir+'/animation-registration-v3.json',JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(out+'/README.md',`# ${d.name}\n\n${data.method}\n\nRebuild: \`node tools/register-existing-loops.cjs\`. Previous metadata: \`before-library-animation.json\`. Source sheet remains in the portable animation folder. No new image generation was needed.\n`);
  console.log(entry.id,':',new Set(moves),'px');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
