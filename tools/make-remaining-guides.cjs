const fs=require('node:fs'),sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='animation/sparky/improved/';
function line(points,color,width=14){return `<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;}
function head(x,y){return `<ellipse cx="${x}" cy="${y}" rx="104" ry="98" fill="#ffe087" stroke="#65412d" stroke-width="5"/>`;}
(async()=>{
 for(const mode of ['run','dance']){
  const count=mode==='run'?8:9,cols=mode==='run'?4:3,dir=base+(mode==='run'?'10-running-animation':'27-intro-dance-lu-dance-hipmove')+'/remaining-v3/sources/';let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*512}" height="${Math.ceil(count/cols)*640}" viewBox="0 0 ${cols*512} ${Math.ceil(count/cols)*640}"><rect width="100%" height="100%" fill="#f6faf7"/>`;
  for(let i=0;i<count;i++){
   svg+=`<g transform="translate(${i%cols*512},${Math.floor(i/cols)*640})"><text x="24" y="32" font-size="22" font-family="sans-serif">${i+1} ${mode==='run'?['near contact','near down','near push','flight / far reach','far contact','far down','far push','flight / near reach'][i]:`hip offset ${(i-4)*8}`}</text><path d="M24 592H488" stroke="#a5b8ab" stroke-width="2"/>`;
   if(mode==='run'){
    const phase=i%4,hip=[236,phase===1?492:phase===3?470:482],shoulder=[251,hip[1]-72],neck=[263,shoulder[1]-20],near=i<4;
    const stance=[[[258,530],[285,592]],[[232,546],[260,592]],[[207,538],[185,592]],[[205,518],[178,530]]][phase];
    const swing=[[[193,505],[176,525]],[[273,503],[229,535]],[[278,505],[300,551]],[[282,515],[318,557]]][phase];
    const legs=near?[stance,swing]:[swing,stance];
    svg+=line([hip,...legs[1]],'#2397a4',22)+line([hip,...legs[0]],'#d14a57',22);
    svg+=line([hip,shoulder,neck],'#3873ba',38)+head(neck[0]+10,neck[1]-99);
    const fore=phase<2?[[283,430],[306,407]]:[[277,419],[310,424]],back=phase<2?[[208,431],[177,445]]:[[211,420],[180,436]];
    const arms=(near===(phase<2))?[back,fore]:[fore,back];svg+=line([shoulder,...arms[1]],'#2397a4',15)+line([shoulder,...arms[0]],'#d14a57',15);
   }else{
    const shift=(i-4)*8,hip=[256+shift,490+Math.abs(shift)*.18],shoulder=[256-shift*.28,420],neck=[256-shift*.18,397];
    svg+=line([hip,[222+shift*.32,548],[213,592]],'#d14a57',24)+line([hip,[289+shift*.32,548],[299,592]],'#2397a4',24);
    svg+=line([hip,shoulder,neck],'#3873ba',46)+head(neck[0],neck[1]-100);
    svg+=line([shoulder,[195-shift*.1,452],[209+shift*.2,480]],'#d14a57',16)+line([shoulder,[316-shift*.1,452],[303+shift*.2,480]],'#2397a4',16);
    svg+=`<ellipse cx="213" cy="588" rx="32" ry="11" fill="#3168b7"/><ellipse cx="299" cy="588" rx="32" ry="11" fill="#3168b7"/>`;
   }
   svg+='</g>';
  }
  svg+='</svg>';fs.writeFileSync(dir+'pose-guide.svg',svg);await sharp(Buffer.from(svg)).png().toFile(dir+'pose-guide.png');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
