// Pack a coherent head-only drawing sequence around one fixed neck attachment.
// Only a uniform resize and translation are used; no head morph or crossfade.
const fs = require('node:fs');
const sharp = require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = 'animation/sparky/improved/05-room-game-lu-n-look-right';
const W=768,H=960,C=362;
async function main(){
  const source=await sharp(`${dir}/sources/head-turn-sequence-v6.png`).ensureAlpha().raw().toBuffer();
  const body=await sharp(`${dir}/body-layer-v5.png`).ensureAlpha().raw().toBuffer();
  const keys=[],registration=[];
  fs.mkdirSync(`${dir}/keys-sequence-v6`,{recursive:true});
  fs.mkdirSync(`${dir}/frames-sequence-v6`,{recursive:true});
  for(let k=0;k<12;k++){
    const raw=Buffer.alloc(C*C*4);
    for(let y=0;y<C;y++)source.copy(raw,y*C*4,(((k/4|0)*C+y)*1448+k%4*C)*4,(((k/4|0)*C+y)*1448+k%4*C+C)*4);
    // Keep the main connected drawing, discarding generated isolated specks.
    const seen=new Uint8Array(C*C),q=new Int32Array(C*C);let largest=[];
    for(let seed=0;seed<C*C;seed++)if(!seen[seed]&&raw[seed*4+3]>20){
      let read=0,end=0;q[end++]=seed;seen[seed]=1;
      while(read<end){const i=q[read++],x=i%C;for(const j of [x?i-1:-1,x<C-1?i+1:-1,i>=C?i-C:-1,i<C*(C-1)?i+C:-1])if(j>=0&&!seen[j]&&raw[j*4+3]>20){seen[j]=1;q[end++]=j;}}
      if(end>largest.length)largest=Array.from(q.subarray(0,end));
    }
    const keep=new Uint8Array(C*C);
    for(const i of largest){const x=i%C,y=i/C|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<C&&y+dy>=0&&y+dy<C)keep[(y+dy)*C+x+dx]=1;}
    for(let i=0;i<C*C;i++)if(!keep[i])raw.fill(0,i*4,i*4+4);
    const widths=[];let top=C,bottom=0;
    for(let y=0;y<C;y++){let n=0;for(let x=0;x<C;x++)if(raw[(y*C+x)*4+3]>180)n++;widths[y]=n;if(n>8)top=Math.min(top,y);if(n>15)bottom=y;}
    let lastWide=0;for(let y=0;y<C;y++)if(widths[y]>100)lastWide=y;
    let join=lastWide+1;while(join<C&&widths[join]>65)join++;
    const xs=[];for(let y=bottom-10;y<bottom-4;y++)for(let x=0;x<C;x++)if(raw[(y*C+x)*4+3]>180)xs.push(x);
    const neckX=xs.reduce((a,b)=>a+b,0)/xs.length;
    // Same flame-tip height and chin/neck anchor in every drawing.
    const scale=300/(join-top),rw=Math.round(C*scale),rh=Math.round(C*scale);
    raw.fill(0,(join+2)*C*4);
    const resized=await sharp(raw,{raw:{width:C,height:C,channels:4}}).resize(rw,rh,{kernel:'lanczos3'}).png().toBuffer();
    const left=Math.round(384-neckX*rw/C),oy=Math.round(592-join*rh/C);
    const head=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left,top:oy}]).raw().toBuffer();
    for(let i=0;i<W*H;i++)if(body[i*4+3])body.copy(head,i*4,i*4,i*4+4);
    const png=await sharp(head,{raw:{width:W,height:H,channels:4}}).png().toBuffer();
    keys.push(png);fs.writeFileSync(`${dir}/keys-sequence-v6/key-${String(k+1).padStart(2,'0')}.png`,png);
    registration.push({key:k+1,sourceTop:top,sourceJoin:join,sourceNeckX:neckX,scale,left,top:oy,chinAnchor:[384,592]});
  }
  const order=[...Array(12).keys(),...Array.from({length:10},(_,i)=>10-i)];
  const timing=JSON.parse(fs.readFileSync(`${dir}/timing-sequence-v7.json`));
  const holds=[timing.neutralRestMs+timing.outwardTransitionMs[0],
    ...timing.outwardTransitionMs.slice(1),
    timing.turnedRestMs+timing.returnTransitionMs[0],
    ...timing.returnTransitionMs.slice(1)];
  const composites=order.map((k,i)=>{fs.writeFileSync(`${dir}/frames-sequence-v6/frame-${String(i+1).padStart(3,'0')}.png`,keys[k]);return {input:keys[k],left:i%6*W,top:(i/6|0)*H};});
  const file='05_Lu_N_Look_Right_sequence_v6.png';
  await sharp({create:{width:W*6,height:H*4,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toFile(`${dir}/${file}`);
  const meta={clip:'Room_Game/Lu_N_Look_Right',file,columns:6,rows:4,frameCount:22,uniqueDrawings:12,cellWidth:W,cellHeight:H,root:[384,888],loop:true,holdsMs:holds,durationMs:holds.reduce((a,b)=>a+b),timingRevision:timing.revision,timingNotes:timing.notes,order,method:'One coherent twelve-pose head-only source. Each head uniformly registered by its neck stem and chin baseline, with common head height. Complete canonical neck, shirt and body. No per-pixel warp or crossfade.',registration};
  fs.writeFileSync(`${dir}/animation-sequence-v6.json`,JSON.stringify(meta,null,2)+'\n');
  const contact=await Promise.all(keys.map(async(p,i)=>({input:await sharp(p).extract({left:190,top:275,width:400,height:400}).resize(320,320).png().toBuffer(),left:i%4*320,top:(i/4|0)*320})));
  await sharp({create:{width:1280,height:960,channels:4,background:'#e5eee8'}}).composite(contact).png().toFile('output/head-turn-sequence-v6-review.png');
  console.log(JSON.stringify({frameCount:22,durationMs:meta.durationMs,registration}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
