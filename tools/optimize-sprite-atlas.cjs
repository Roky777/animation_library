/** Lossless atlas deduplication. Keep every distinct pose and its exact duration. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
module.exports=async function optimize(dir,d){
 const W=d.cellWidth,H=d.cellHeight,bytes=await sharp(path.join(dir,d.file)).ensureAlpha().raw().toBuffer(),unique=[],hashes=new Map(),map=[],holds=[],originalIndices=[];
 for(let i=0;i<d.frameCount;i++){
  const cell=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const p=((Math.floor(i/d.columns)*H+y)*d.columns*W+i%d.columns*W)*4;bytes.copy(cell,y*W*4,p,p+W*4);}
  const hash=crypto.createHash('sha256').update(cell).digest('hex');let n=hashes.get(hash);
  if(n===undefined){n=unique.length;hashes.set(hash,n);unique.push(cell);}
  if(map.length&&map.at(-1)===n){holds[holds.length-1]+=d.holdsMs[i];originalIndices.at(-1).push(i);}
  else{map.push(n);holds.push(d.holdsMs[i]);originalIndices.push([i]);}
 }
 // Choose a balanced grid, with no more than seven empty cells.
 const columns=Math.min(8,Math.ceil(Math.sqrt(unique.length*H/W))),rows=Math.ceil(unique.length/columns),packed=Buffer.alloc(W*columns*H*rows*4);
 for(let i=0;i<unique.length;i++)for(let y=0;y<H;y++)unique[i].copy(packed,((Math.floor(i/columns)*H+y)*W*columns+i%columns*W)*4,y*W*4,(y+1)*W*4);
 const out=path.join(dir,'optimized-v1');fs.mkdirSync(out,{recursive:true});
 await sharp(packed,{raw:{width:W*columns,height:H*rows,channels:4}}).png({compressionLevel:9,adaptiveFiltering:true}).toFile(out+'/spritesheet.png');
 const optimization={lossless:true,originalFrames:d.frameCount,playbackFrames:map.length,storedFrames:unique.length,originalGridCells:d.columns*d.rows,gridCells:columns*rows,originalBytes:fs.statSync(path.join(dir,d.file)).size,bytes:fs.statSync(out+'/spritesheet.png').size,originalFile:d.file,originalIndices};
 fs.writeFileSync(out+'/report.json',JSON.stringify(optimization,null,2)+'\n');
 return {...d,file:'optimized-v1/spritesheet.png',columns,rows,frameCount:map.length,holdsMs:holds,frameMap:map,atlasFrameCount:unique.length,optimization};
};
