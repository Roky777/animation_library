const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {extractFigures}=require('../tools/extract-sparky-figures.cjs');
(async()=>{
 const W=320,H=400,data=Buffer.alloc(W*H*4),colors=[];
 const rect=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*W+xx)*4;data[p]=c[0];data[p+1]=c[1];data[p+2]=c[2];data[p+3]=255;}};
 // Nonuniform rows deliberately cross nominal 100px grid boundaries.
 const tops=[8,111,207,307],heights=[101,94,98,87];
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const id=row*4+col,c=[30+id*12,200-id*7,70+id*9];colors.push(c);
  rect(col*80+18,tops[row],44,heights[row],c);
  // Narrow touching bridges must not turn adjacent figures into one crop.
  if(row<3)rect(col*80+39,tops[row]+heights[row],2,tops[row+1]-tops[row]-heights[row]+1,[240,240,240]);
 }
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sparky-extraction-')),file=path.join(dir,'fixture.png');
 await sharp(data,{raw:{width:W,height:H,channels:4}}).png().toFile(file);
 const result=await extractFigures(file);assert.equal(result.frames.length,16);
 for(let id=0;id<16;id++){
  const frame=result.frames[id];let own=0,foreign=0;
  for(let i=0;i<frame.raw.length;i+=4)if(frame.raw[i+3]>180){
   const c=[frame.raw[i],frame.raw[i+1],frame.raw[i+2]];
   const match=colors.findIndex(color=>color.every((n,k)=>n===c[k]));
   if(match===id)own++;else if(match>=0)foreign++;
  }
  assert.ok(own>3000,`Frame ${id}: lost body pixels`);
  assert.ok(foreign<10,`Frame ${id}: ${foreign} pixels from a neighboring figure`);
 }
 fs.rmSync(dir,{recursive:true});console.log('PASS: 16 complete figures recovered across nonuniform/touching rows without neighboring figure contamination.');
})().catch(e=>{console.error(e);process.exitCode=1;});
