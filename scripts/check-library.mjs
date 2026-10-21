import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),lib=path.join(root,'animation-library');
function resource(name){
 const target=path.resolve(lib,name);assert(target.startsWith(lib+path.sep),'Path escapes the library');assert(fs.statSync(target).isFile(),`Missing file: ${name}`);return target;
}
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('./animation-library/index.html'),'Missing root app entry');
assert(fs.existsSync(path.join(root,'.nojekyll')),'Missing static hosting marker');
for(const name of ['index.html','demo.html','library.css','animator.css','library.js','zip.js','player.js','manifest.json'])resource(name);
for(const name of ['index.html','demo.html']){
 const text=fs.readFileSync(resource(name),'utf8');
 for(const match of text.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const target=match[1];if(/^(?:https?:|data:)/.test(target))continue;
  resource(target.split(/[?#]/)[0]);
 }
}
const index=JSON.parse(fs.readFileSync(resource('manifest.json'))),ids=new Set();let poses=0,exposures=0;
for(const entry of index.animations){
 assert(!ids.has(entry.id),'Duplicate animation ID');ids.add(entry.id);
 const metaFile=resource(entry.metadata),meta=JSON.parse(fs.readFileSync(metaFile)),sheet=path.join(path.dirname(metaFile),meta.sheet);
 assert.equal(meta.id,entry.id);assert.equal(meta.name,entry.name);
 assert.equal(resource(entry.sheet),sheet);resource(entry.guide);
 const png=fs.readFileSync(sheet);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),meta.sheetWidth);assert.equal(png.readUInt32BE(20),meta.sheetHeight);
 assert.equal(meta.sheetWidth,meta.cellWidth*meta.columns);assert.equal(meta.sheetHeight,meta.cellHeight*meta.rows);
 assert.equal(meta.frameDurationsMs.length,meta.frameCount);assert(meta.frameDurationsMs.every(n=>Number.isFinite(n)&&n>0));
 assert(Math.abs(meta.frameDurationsMs.reduce((a,b)=>a+b,0)-meta.durationMs)<.001);
 const stored=meta.atlasFrameCount??meta.frameCount;assert(stored<=meta.columns*meta.rows);
 if(meta.frameMap){assert.equal(meta.frameMap.length,meta.frameCount);assert(meta.frameMap.every(n=>Number.isInteger(n)&&n>=0&&n<stored));}
 assert.deepEqual(meta.root,[256,592]);poses+=stored;exposures+=meta.frameCount;
}
assert(index.animations.length>0);console.log(`PASS: root entry, app resources and ${ids.size} complete animation packs (${poses} stored poses, ${exposures} timed exposures).`);
