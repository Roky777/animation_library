import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../animation-library/player.js',import.meta.url),'utf8');
const {SpriteSheetPlayer,drawBreathingFrame}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const root=new URL('../animation-library/',import.meta.url),index=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
let count=0;
for(const entry of index.animations){
 const data=JSON.parse(fs.readFileSync(new URL(entry.metadata,root))),draws=[];
 const canvas={getContext:()=>({clearRect(){},drawImage(...a){draws.push(a);}})};
 const player=new SpriteSheetPlayer(canvas,{},data);player.play();player.tick(0);
 let time=0;
 for(let frame=0;frame<data.frameCount;frame++){
  player.tick(time+.001);assert.equal(player.currentFrame,frame,entry.id);
  time+=data.frameDurationsMs[frame];player.tick(time-.001);assert.equal(player.currentFrame,frame);
 }
 player.tick(data.durationMs+.01);
 assert.equal(player.currentFrame,data.loop?0:data.frameCount-1);
 assert.equal(player.playing,data.loop);
 player.seekFrame(Math.floor(data.frameCount/2));assert.equal(player.playing,false);
 const t=player.elapsedMs;player.play();player.tick(100000);assert.equal(player.elapsedMs,t,'Paused wall time must be excluded');
 player.setSpeed(.5);player.tick(100020);assert.ok(Math.abs(player.elapsedMs-t-10)<.001);
 player.destroy();assert.throws(()=>player.play());count++;
}
console.log(`PASS: ${count} clips: every exposure, loop/one-shot endings, seek/pause/resume, speed and destroy.`);

// Breathing must redraw within a held cell, preserve shared band edges and continue after a one-shot.
const effect={enabled:true,amplitudePx:3,periodMs:3200,poses:[{upperY:410,fixedY:510}]};
const bands=[];drawBreathingFrame({drawImage(...a){bands.push(a);}}, {},0,0,512,640,effect,1600);
assert.equal(bands[0][6],-3);
for(let i=0;i<bands.length-1;i++)assert.ok(Math.abs(bands[i][6]+bands[i][8]-bands[i+1][6])<1e-9,'Breathing bands separate');
assert.equal(bands.at(-1)[6],510);assert.equal(bands.at(-1)[8],130,'Feet region must retain its height');
const live={schemaVersion:1,sheet:'test.png',columns:1,rows:1,cellWidth:512,cellHeight:640,sheetWidth:512,sheetHeight:640,frameCount:1,frameDurationsMs:[100],durationMs:100,loop:false,breathEffect:effect};
let liveDraws=0;const breathPlayer=new SpriteSheetPlayer({getContext:()=>({clearRect(){},drawImage(){liveDraws++;}})}, {},live);
breathPlayer.play();breathPlayer.tick(0);const firstCount=liveDraws;breathPlayer.tick(40);assert.ok(liveDraws>firstCount,'Held frame has no breathing');
breathPlayer.tick(110);assert.equal(breathPlayer.playing,false);assert.equal(breathPlayer.resting,true);const finishCount=liveDraws;breathPlayer.tick(200);assert.ok(liveDraws>finishCount,'Final hold stopped breathing');
breathPlayer.pause();const stoppedCount=liveDraws;breathPlayer.tick(300);assert.equal(liveDraws,stoppedCount,'Explicit pause failed');
assert.throws(()=>new SpriteSheetPlayer({getContext:()=>({})},{},{...live,breathEffect:{...effect,periodMs:0}}));
breathPlayer.destroy();console.log('PASS: live breathing on held/final frames, continuous band joins, fixed feet, explicit pause and parameter validation.');

// Repeated exposures share physical cells, including timelines longer than atlas capacity.
const mapped={...live,breathEffect:{enabled:false},columns:2,rows:1,sheetWidth:1024,sheetHeight:640,frameCount:3,atlasFrameCount:2,frameMap:[0,1,0],frameDurationsMs:[100,120,180],durationMs:400};
const crops=[];const mappedPlayer=new SpriteSheetPlayer({getContext:()=>({clearRect(){},drawImage(...a){crops.push(a);}})},{},mapped);
mappedPlayer.seekFrame(1);assert.equal(crops.at(-1)[1],512);
mappedPlayer.seekFrame(2);assert.equal(crops.at(-1)[1],0);assert.equal(mappedPlayer.elapsedMs,220);
assert.throws(()=>new SpriteSheetPlayer({getContext:()=>({})},{},{...mapped,frameMap:[0,1,2]}));mappedPlayer.destroy();
console.log('PASS: deduplicated atlas frame mapping, repeated exposures, seek timing and invalid atlas rejection.');
