const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function archiveUnusedFrames(folder,count){
 for(const name of fs.readdirSync(folder)){
  const match=name.match(/^frame-(\d+)\.png$/);if(!match||Number(match[1])<=count)continue;
  const source=path.join(folder,name),hash=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex').slice(0,10),archive=path.join(path.dirname(folder),'inactive-frames');
  fs.mkdirSync(archive,{recursive:true});fs.renameSync(source,path.join(archive,name.replace('.png',`-${hash}.png`)));
 }
};
