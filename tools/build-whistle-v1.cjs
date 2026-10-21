/** Animate only the party blower; retain one intact character at a fixed scale. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {headPart}=require('./sparky-parts.cjs');
const ROOT=path.resolve(__dirname,'..'),dir=ROOT+'/animation/sparky/improved/28-blowing-whistle',out=dir+'/whistle-v1',W=512,H=640;
(async()=>{
 const {data,info}=await sharp(out+'/sources/character.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),head=headPart(data,info.width,info.height).head,scale=218/(head.r-head.l+1),rw=Math.round(info.width*scale),rh=Math.round(info.height*scale);
 const resized=await sharp(data,{raw:info}).resize(rw,rh,{kernel:'lanczos3'}).raw().toBuffer();
 let floor=-1;for(let j=0;j<rw*rh;j++)if(resized[j*4+3]>180)floor=Math.floor(j/rw);
 const left=Math.round(256-(head.l+head.r)/2*scale),top=592-floor,canonical=Buffer.alloc(W*H*4);
 for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const xx=x+left,yy=y+top,p=(y*rw+x)*4;if(xx<0||xx>=W||yy<0||yy>=H){if(resized[p+3]>180)throw Error('Source figure clips cell');continue;}resized.copy(canonical,(yy*W+xx)*4,p,p+4);}
 const cut=Math.round(left+750*scale),tipStart=Math.round(left+1010*scale);
 let l=W,r=-1,t=H,b=-1;for(let y=0;y<H;y++)for(let x=cut;x<W;x++)if(canonical[(y*W+x)*4+3]>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(t<top+head.b*scale-80)throw Error('Prop separation includes character artwork');
 const base=Buffer.from(canonical);for(let y=0;y<H;y++)base.fill(0,(y*W+cut)*4,(y*W+W)*4);
 const bodyWidth=tipStart-cut,tipWidth=r-tipStart+1,height=b-t+1;
 const sourcePNG=await sharp(canonical,{raw:{width:W,height:H,channels:4}}).png().toBuffer();
 const tube=await sharp(sourcePNG).extract({left:cut,top:t,width:bodyWidth,height}).png().toBuffer(),tip=await sharp(sourcePNG).extract({left:tipStart,top:t,width:tipWidth,height}).png().toBuffer();
 const columns=8,rows=6,count=48,sheet=Buffer.alloc(W*columns*H*rows*4),lengths=[],holdsMs=[];
 fs.mkdirSync(out+'/frames',{recursive:true});
 await sharp(base,{raw:{width:W,height:H,channels:4}}).png().toFile(out+'/character-fixed.png');
 for(let i=0;i<count;i++){
  const phase=(1-Math.cos(2*Math.PI*i/count))/2,length=Math.round(5+(bodyWidth-5)*phase);lengths.push(length);holdsMs.push(Math.round((i+1)*1000/30)-Math.round(i*1000/30));
  const strip=await sharp(tube).resize(length,height,{kernel:'lanczos3'}).png().toBuffer();
  const raw=await sharp(base,{raw:{width:W,height:H,channels:4}}).composite([{input:strip,left:cut,top:t},{input:tip,left:cut+length,top:t}]).raw().toBuffer();
  // Restore exact original character pixels; resampling affects the prop only.
  for(let y=0;y<H;y++)base.copy(raw,y*W*4,y*W*4,(y*W+cut)*4);
  await sharp(raw,{raw:{width:W,height:H,channels:4}}).png().toFile(out+`/frames/frame-${String(i+1).padStart(3,'0')}.png`);
  for(let y=0;y<H;y++)raw.copy(sheet,((Math.floor(i/columns)*H+y)*columns*W+i%columns*W)*4,y*W*4,(y+1)*W*4);
 }
 await sharp(sheet,{raw:{width:W*columns,height:H*rows,channels:4}}).png().toFile(out+'/spritesheet.png');
 const d={clip:'Blowing_Whistle',file:'whistle-v1/spritesheet.png',frameDir:'whistle-v1/frames',exportPipeline:'whistle-v1',columns,rows,cellWidth:W,cellHeight:H,root:[256,592],frameCount:count,holdsMs,durationMs:1600,loop:true,fixedHead:true,fixedBody:true,description:'Sparky blows a rainbow party whistle: the paper tube extends, holds its curled tip, and retracts in a repeating cycle.',prop:{type:'party-blower',cutX:cut,top:t,height,tipWidth,lengths,sourceScale:scale},method:'One intact generated Sparky blowing pose. Character, mouthpiece, grip, clothes and feet are byte-identical throughout. Only the paper tube beyond the glove changes length; its curled tip retains its original size. A cosine extension/retraction cycle is rendered at 30 fps, then exact duplicate cells are deduplicated for export. No audio is bundled. The character model is scaled once and normalized to the library reference before publishing.',review:{status:'new_party_whistle_review',artisticApproval:false}};
 fs.writeFileSync(dir+'/animation-whistle-v1.json',JSON.stringify(d,null,2)+'\n');
 if(!fs.existsSync(dir+'/animation-scale-v6.json'))fs.writeFileSync(dir+'/animation.json',JSON.stringify(d,null,2)+'\n');
 fs.writeFileSync(out+'/README.md','# Blowing_Whistle\n\n'+d.method+'\n\nOriginal: `sources/character.png`. Exact request: `prompt.json`. Rebuild: `node tools/build-whistle-v1.cjs`, normalize: `node tools/normalize-library-scale.cjs --refresh-source --only=28-blowing-whistle`, publish: `node tools/build-sparky-library.cjs 28-blowing-whistle`.\n');
 console.log({cut,tipStart,bodyWidth,tipWidth,top,left,scale});
})().catch(e=>{console.error(e);process.exitCode=1});
