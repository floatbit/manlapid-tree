import {dateParts} from './insights.js';
export function timelineEras(allEvents,visibleEvents) {
 const groups=new Map();
 const decade=event=>{const year=dateParts(event.date)?.year;return Number.isFinite(year)?Math.floor(year/10)*10:null;};
 for(const event of allEvents){const start=decade(event);if(start===null)continue;if(!groups.has(start))groups.set(start,{start,label:start+'s',total:0,births:0,milestones:0,remembrances:0,matches:0});const group=groups.get(start);group.total++;if(event.kind==='birth')group.births++;else if(event.kind==='death')group.remembrances++;else group.milestones++;}
 for(const event of visibleEvents){const group=groups.get(decade(event));if(group)group.matches++;}
 const max=Math.max(1,...[...groups.values()].map(g=>g.total));
 return [...groups.values()].sort((a,b)=>a.start-b.start).map(group=>({...group,density:Math.max(1,Math.ceil(group.total/max*4)),chapter:group.start<1900?'Early Roots':group.start<1950?'Earlier Generations':group.start<1980?'Growing Branches':group.start<2010?'New Generations':'Family Milestones'}));
}
