export type BlastPoint = {id:number|string;x:number;y:number};
export type Rock = BlastPoint & {hp:number};
/** Pure geometry: each item scores once and each rock takes one hit per blast. */
export function triggerRadiusBlast<T extends BlastPoint>(elements:T[],rocks:Rock[],x:number,y:number,radius:number){
 const safeRadius=Number.isFinite(radius)?Math.max(0,radius):0;
 const removed=elements.filter(e=>Math.hypot(e.x-x,e.y-y)<=safeRadius);
 const hitRocks=rocks.map(r=>({...r,hp:r.hp-(Math.hypot(r.x-x,r.y-y)<=safeRadius+30?1:0)}));
 const destroyed=hitRocks.filter(r=>r.hp<=0);
 return {elements:elements.filter(e=>!removed.includes(e)),rocks:hitRocks.filter(r=>r.hp>0),removed,destroyed,bonus:removed.length*25+destroyed.length*200};
}
export function levelRocks(level:number):Rock[]{return level===2?[{id:'rock-a',x:110,y:120,hp:2},{id:'rock-b',x:290,y:285,hp:2}]:[];}
