const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {headPart}=require('./sparky-parts.cjs');
module.exports=async function breathPolicy(entry,dir,data){
 const n=Number(entry.id.slice(0,2));
 if([1,2,23,24].includes(n))return {enabled:false,baked:true,reason:'Breathing already exists in these playback cells.'};
 // Keep the rigid glass pedestal intact; this interaction already has active reach/lift motion.
 if(n===26)return {enabled:false,baked:false,reason:'Pickup keeps its prop rigid; no whole-sheet breathing transform.'};
 if(n===27&&data.renderedMotion)return {enabled:false,baked:true,reason:'Dance motion is baked into these cells; no extra runtime transform.'};
 if([6,7,8,9,10,11,14,25].includes(n))return {enabled:false,baked:false,reason:'The action supplies its own body motion; no extra breathing deformation during locomotion, laughter, flight or waking.'};
 if(n===28)return {enabled:false,baked:false,reason:'Whistle prop motion is baked; the grip and mouthpiece remain fixed. No audio is bundled.'};
 const poses=[];
 const raw=await sharp(dir+'/'+data.file).ensureAlpha().raw().toBuffer();
 for(let i=0;i<data.frameCount;i++){
  const cell=Buffer.alloc(512*640*4);
  const cellIndex=data.frameMap?.[i]??i;
  for(let y=0;y<640;y++){const off=((Math.floor(cellIndex/data.columns)*640+y)*512*data.columns+cellIndex%data.columns*512)*4;raw.copy(cell,y*512*4,off,off+512*4);}
  const p=headPart(cell,512,640),upperY=Math.min(515,p.head.b+12),fixedY=Math.min(565,upperY+85);
  poses.push({upperY,fixedY});
 }
 // A single mapping per stationary clip prevents boundary changes at pose switches.
 const upperY=Math.max(...poses.map(p=>p.upperY)),fixedY=Math.min(565,upperY+85);
 const stablePoses=poses.map(()=>({upperY,fixedY}));
 return {enabled:true,baked:false,amplitudePx:1.5,periodMs:3600,poses:stablePoses,stableBands:true,method:'One fixed anatomical mapping per stationary clip; subtle rigid upper pose lift, C1 chest extension and unchanged lower contacts. Independent continuous clock across loops and terminal holds. No per-frame band changes.'};
};
