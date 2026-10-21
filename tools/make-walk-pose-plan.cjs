/** Research-informed schematic pose reference; never deforms mascot artwork. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('/Users/rax/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=path.resolve(__dirname,'../animation/sparky/improved/06-common-walk-lu-walk-left/researched-v6');
const times=[0,80,250,400,500,580,750,900],names=['Near contact','Near down','Far passing','Near up / far reach','Far contact','Far down','Near passing','Far up / near reach'];
const feet=[[[228,529,.25],[291,522,-.25]],[[240,532,0],[299,520,-.30]],[[260,532,0],[255,510,0]],[[280,519,-.30],[237,528,.18]]];
const line=(a,b,c,w=11)=>`<path d="M${a} L${b}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const near='#bd3156',far='#11869a',floor=552,poses=[];
function knee(h,a){const dx=a[0]-h[0],dy=a[1]-h[1],D=Math.hypot(dx,dy),L=92;if(D>2*L+.5)throw Error('Guide leg cannot reach');const q=Math.sqrt(Math.max(0,L*L-D*D/4));return [(h[0]+a[0])/2-dy/D*q,(h[1]+a[1])/2+dx/D*q];}
function leg(h,ankle,color){const a=ankle.slice(0,2),k=knee(h,a),angle=ankle[2];return line(h,k,color)+line(k,a,color)+`<path d="M-14,-7 L8,-7 L14,14 L11,20 L-42,20 Q-49,18 -45,10 L-15,2 Z" transform="translate(${a}) rotate(${angle*180/Math.PI})" fill="${color}" stroke="white" stroke-width="2"/>`;}
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1280" viewBox="0 0 2048 1280"><rect width="2048" height="1280" fill="#fafbf9"/>';
for(let i=0;i<8;i++){
 const phase=times[i]/1000,j=i%4,bob=[0,4,-2,-5][j],hipN=[260,350+bob],hipF=[252,350+bob],f=feet[j];const n=i<4?f[0]:f[1],r=i<4?f[1]:f[0];
 const swing=Math.cos(phase*2*Math.PI),shoulderN=[272,240+bob],shoulderF=[240,240+bob],wristN=[270+50*swing,333+bob-8*Math.abs(swing)],wristF=[243-50*swing,333+bob-8*Math.abs(swing)];
 const elbowN=[(shoulderN[0]+wristN[0])/2-4,291+bob],elbowF=[(shoulderF[0]+wristF[0])/2-4,291+bob];
 const nearContact=j!==2||i<4,contact=i<4?['heel+far toe','near sole+far toe','near sole','near forefoot'][j]:['far heel+near toe','far sole+near toe','far sole','far forefoot'][j];
 svg+=`<g transform="translate(${i%4*512},${Math.floor(i/4)*640})"><text x="30" y="32" font-family="sans-serif" font-size="21" fill="#24372f">K${i+1}: ${names[i]}</text><text x="30" y="59" font-family="sans-serif" font-size="16" fill="#456057">${times[i]}ms · ${contact}</text><path d="M80,552 H430" stroke="#9aa79f" stroke-width="2"/>`;
 svg+=line(shoulderF,elbowF,far,9)+line(elbowF,wristF,far,9)+leg(hipF,r,far);
 svg+=`<g transform="translate(0,${bob})"><path d="M240,231 L272,231 L278,339 L252,357 L234,339 Z" fill="#53635a"/><path d="M256,212 V232" stroke="#53635a" stroke-width="12"/><ellipse cx="256" cy="170" rx="36" ry="43" fill="#74867a"/><path d="M230,165 L215,176 L230,182" fill="#74867a"/></g>`;
 svg+=leg(hipN,n,near)+line(shoulderN,elbowN,near,9)+line(elbowN,wristN,near,9)+`<text x="35" y="602" font-family="sans-serif" font-size="16" fill="${near}">RED near limbs</text><text x="260" y="602" font-family="sans-serif" font-size="16" fill="${far}">TEAL far limbs</text></g>`;
 poses.push({id:`K${i+1}`,name:names[i],timeMs:times[i],contact,nearHip:hipN,farHip:hipF,nearAnkle:n,farAnkle:r,nearKnee:knee(hipN,n),farKnee:knee(hipF,r),nearWrist:wristN,farWrist:wristF,bodyOffsetY:bob});
}
svg+='</svg>';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'key-pose-guide.svg'),svg);sharp(Buffer.from(svg)).png().toFile(path.join(dir,'key-pose-guide.png'));
fs.writeFileSync(path.join(dir,'pose-plan.json'),JSON.stringify({type:'Authored schematic adapted from cited gait phases; not measured mocap',cycleMs:1000,keys:poses,inbetweenTimesMs:Array.from({length:25},(_,i)=>i*40).filter(t=>!times.includes(t)),toeOffEventsMs:[120,620],oppositeContactsMs:[0,500],sources:['https://now.aapmr.org/biomechanics-normal-gait/','https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/']},null,2)+'\n');
