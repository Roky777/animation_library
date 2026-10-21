/** Key-only packing. All support and anatomy are in the drawings, never a mesh. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'animation/sparky/improved/06-common-walk-lu-walk-left/researched-v6');
(async()=>{
 const ext=require('./extract-sparky-figures.cjs'),draft=await ext.extractFigures(dir+'/keys-draft-1.png',{count:8,columns:4}),down=await ext.extractFigures(dir+'/down-pair.png',{count:2,columns:2}),pass=await ext.extractFigures(dir+'/passing-pair.png',{count:2,columns:2});
 const read=async file=>{const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {raw:data,w:info.width,h:info.height}};
 let sources=[draft.frames[0],down.frames[0],pass.frames[0],await read(dir+'/up-4.png'),draft.frames[4],down.frames[1],pass.frames[1],await read(dir+'/up-8.png')],frames=[],audit=[];
 if(fs.existsSync(dir+'/keys-matched.png'))sources=(await ext.extractFigures(dir+'/keys-matched.png',{count:8,columns:4})).frames;
 fs.mkdirSync(dir+'/keys',{recursive:true});fs.mkdirSync(dir+'/original-keys',{recursive:true});
 for(let i=0;i<8;i++){
  const f=sources[i],p=require('./sparky-parts.cjs').headPart(f.raw,f.w,f.h),scale=209.15/(p.head.r-p.head.l+1);let bottom=0;
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(f.raw[(y*f.w+x)*4+3]>180)bottom=y;
  const left=Math.round(256-p.neckX*scale),top=Math.round(592-bottom*scale);
  const original=await sharp(f.raw,{raw:{width:f.w,height:f.h,channels:4}}).png().toBuffer();fs.writeFileSync(dir+`/original-keys/K${i+1}.png`,original);
  const input=await sharp(original).resize(Math.round(f.w*scale),Math.round(f.h*scale)).png().toBuffer();
  const png=await sharp({create:{width:512,height:640,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left,top}]).png().toBuffer();frames.push(png);fs.writeFileSync(dir+`/keys/K${i+1}.png`,png);
  audit.push({key:`K${i+1}`,scale,left,top,neckY:top+p.jawY*scale});
 }
 await sharp({create:{width:2048,height:1280,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:i%4*512,top:Math.floor(i/4)*640}))).png().toFile(dir+'/eight-keys.png');
 fs.writeFileSync(dir+'/key-registration.json',JSON.stringify(audit,null,2)+'\n');console.log(audit.map(a=>a.key+': '+a.neckY.toFixed(1)).join(', '));
})().catch(e=>{console.error(e);process.exitCode=1});
