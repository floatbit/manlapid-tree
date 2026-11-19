import {dateParts,locationLabel,migrationDisplayLabel,migrationDestinationPlace,sameMigrationPlace} from './insights.js';

const compare=(a,b)=>a.localeCompare(b,'en',{sensitivity:'base'});
const parts=value=>migrationDisplayLabel(locationLabel(value)).split(',').map(s=>s.trim()).filter(Boolean);
const country=value=>{const p=parts(value);return p.length>1?({US:'USA','United States':'USA','United States of America':'USA',UK:'United Kingdom'}[p.at(-1)] || p.at(-1)):'';};
const ranked=values=>{const counts=new Map();for(const value of values.filter(Boolean))counts.set(value,(counts.get(value)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1]||compare(a[0],b[0]));};
const birth=p=>dateParts(p.dateDetails?.birth || p.birthday);
function elapsed(date,now){return now.getFullYear()-date.year-(date.month&&(now.getMonth()+1<date.month||(now.getMonth()+1===date.month&&now.getDate()<date.day))?1:0);}
function coordinates(place){
 const values=[place?.lat,place?.lng];
 if(!values.every(v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v))))return null;
 const [lat,lng]=values.map(Number);
 return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
}
function distance(from,to){const a=coordinates(from),b=coordinates(to);if(!a||!b)return null;const rad=n=>n*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);return 3958.7613*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2)));}
function journeyDestination(person){
 const current={location:person.location,lat:person.locationLat,lng:person.locationLng};
 if(locationLabel(current)&&coordinates(current))return {...current,kind:'current home'};
 const homes=(person.locationHistory || []).map((home,index)=>({home,index,date:dateParts(home.date)})).filter(({home})=>locationLabel(home)&&coordinates(home));
 // Known move dates establish chronology; preserve recorded order for undated homes.
 homes.sort((a,b)=>(a.date?.year ?? -Infinity)-(b.date?.year ?? -Infinity)||(a.date?.month || 0)-(b.date?.month || 0)||(a.date?.day || 0)-(b.date?.day || 0)||a.index-b.index);
 return homes.length?{...homes.at(-1).home,kind:'last recorded home'}:null;
}

export function insightSuperlatives(people=[],links=[],milestones=[],now=new Date()) {
 const cards=[];
 const card=(eyebrow,headline,subtext,footnote)=>cards.push({eyebrow,headline,subtext,footnote});
 const locations=people.flatMap(p=>[p.birthplace,p.location,...(p.locationHistory || [])]).filter(p=>locationLabel(p));
 const uniqueLocations=new Set(locations.map(p=>migrationDisplayLabel(locationLabel(p)).toLowerCase()));
 const countries=[...new Set(locations.map(country).filter(Boolean))].sort(compare);
 card('ACROSS THE MAP',countries.length?`${countries.length} ${countries.length===1?'country':'countries'}`:'Still to Discover',countries.join(', ') || 'Add family locations to reveal our reach',`Across ${uniqueLocations.size} recorded family locations`);
 const birthAndHome=people.flatMap(p=>[p.birthplace,p.location]).filter(p=>locationLabel(p));
 // Compare the city/town plus its region and country, rather than counting postal-code variants.
 const citiesAndTowns=new Set(birthAndHome.map(p=>migrationDisplayLabel(locationLabel(p)).toLocaleLowerCase().replace(/\s+/g,' ').trim()));
 const cityCountries=new Set(birthAndHome.map(country).filter(Boolean));
 card('DOTS ON THE MAP',`${citiesAndTowns.size} ${citiesAndTowns.size===1?'city / town':'cities & towns'}`,'Unique birthplaces & current homes',`Spanning ${cityCountries.size} ${cityCountries.size===1?'country':'countries'} worldwide`);
 const surnames=ranked(people.map(p=>p.lastName?.trim() || p.name?.trim().split(/\s+/).at(-1)));
 card('GROWING BRANCHES',surnames[0]?.[0] || 'Still to Discover','Largest surname in the tree',surnames.length>1?'Followed by '+surnames.slice(1,3).map(s=>s[0]).join(' & '):'Across recorded surnames');
 const known=new Map(people.map(p=>[p.id,p])),parents=new Map();
 for(const l of links){if(!known.has(l.a)||!known.has(l.b))continue;if(l.type==='parent'||l.type==='child'){const child=l.type==='parent'?l.a:l.b,parent=l.type==='parent'?l.b:l.a;if(!parents.has(child))parents.set(child,new Set());parents.get(child).add(parent);}}

 const groups=new Map();for(const [child,ids] of parents){const key=[...ids].sort().join('|');if(!groups.has(key))groups.set(key,{parents:[...ids],children:[]});groups.get(key).children.push(child);}
 let largest=[...groups.values()].sort((a,b)=>b.children.length-a.children.length)[0];
 card('FULL HOUSE',largest?.children.length>1?`${largest.children.length} siblings`:'Still to Discover',largest?.children.length>1?(largest.parents.length?'Children of '+largest.parents.map(id=>known.get(id).name).join(' & '):'Largest recorded sibling group'):'Add recorded parents to identify sibling groups','Based on recorded parent–child connections');
 const coupleSizes=[...groups.values()].filter(g=>g.parents.length===2).map(g=>g.children.length);
 const average=coupleSizes.length?coupleSizes.reduce((sum,n)=>sum+n,0)/coupleSizes.length:null;
 card('GROWING ROOTS',average===null?'Still to Discover':`${average.toFixed(1)} children`,'Average across recorded couples',coupleSizes.length?`From ${Math.min(...coupleSizes)} to ${Math.max(...coupleSizes)} children per family`:'Add children with both parents recorded');
 const children=new Map(people.map(p=>[p.id,new Set()]));
 for(const [child,ids] of parents)for(const parent of ids)if(child!==parent)children.get(parent).add(child);
 const descendantCount=id=>{const visited=new Set([id]),queue=[...(children.get(id)||[])];while(queue.length){const next=queue.pop();if(visited.has(next))continue;visited.add(next);for(const child of children.get(next)||[])if(!visited.has(child))queue.push(child);}return visited.size-1;};
 const hubs=people.map(person=>({person,count:descendantCount(person.id)})).filter(p=>p.count>0).sort((a,b)=>b.count-a.count||compare(a.person.name||'',b.person.name||''));
 const hub=hubs[0];
 card('FAMILY HUB',hub?.person.name || 'Still to Discover',hub?`${hub.count} ${hub.count===1?'descendant':'descendants'} in the tree`:'Add parent–child connections','Children, grandchildren & later generations');
 const weddings=milestones.filter(m=>m.type==='marriage').map(m=>({event:m,date:dateParts(m.date)})).filter(m=>m.date&&m.date.year<=now.getFullYear()&&elapsed(m.date,now)>=0).sort((a,b)=>elapsed(b.date,now)-elapsed(a.date,now));
 const wedding=weddings[0],years=wedding?elapsed(wedding.date,now):null;
 card('LASTING LOVE',wedding?`${wedding.date.approximate?'About ':''}${years} years`:'Still to Discover',wedding?.event.title || 'Add a recorded wedding date','Time since the oldest recorded wedding');
 const elders=people.filter(p=>!p.deceased&&birth(p)).map(p=>({person:p,date:birth(p),age:elapsed(birth(p),now)})).filter(p=>p.age>=0).sort((a,b)=>b.age-a.age);
 const elder=elders[0];
 card('LIVING WISDOM',elder?`${elder.date.approximate?'About ':''}${elder.age} years`:'Still to Discover',elder?`${elder.person.name} (b. ${elder.date.approximate?'c. ':''}${elder.date.year})`:'Add birth dates to discover our elders','Oldest living family member with a recorded birth');
 const decades=ranked(people.map(birth).filter(d=>d&&d.year<=now.getFullYear()).map(d=>String(Math.floor(d.year/10)*10)));
 card('PEAK BIRTH DECADE',decades.length?`${decades[0][0]}s`:'Still to Discover',decades.length?`${decades[0][1]} family births recorded`:'Add birth years to reveal a generation surge','Most births in a calendar decade');
 const journeys=people.map(p=>{const destination=journeyDestination(p);return {person:p,destination,miles:distance(p.birthplace,destination)};}).filter(p=>p.miles!==null).sort((a,b)=>b.miles-a.miles),journey=journeys[0];
 card('FARTHEST REACH',journey?`${Math.round(journey.miles).toLocaleString('en-US')} miles`:'Still to Discover',journey?`${migrationDisplayLabel(locationLabel(journey.person.birthplace))} → ${migrationDisplayLabel(journey.destination.location)}`:'Add mapped birthplaces and current or past homes',journey?`Birthplace to ${journey.destination.kind} · Straight-line distance`:'Greatest straight-line distance from birthplace');
 const local=people.filter(p=>{if(sameMigrationPlace(p.birthplace,migrationDestinationPlace(p)))return true;if(!locationLabel(p.birthplace)||!p.location)return false;if(p.birthplace?.placeId&&p.locationPlaceId===p.birthplace.placeId)return true;const a=parts(p.birthplace),b=parts(p.location);return a.length>1&&b.length>1&&a[0].toLowerCase()===b[0].toLowerCase()&&country(p.birthplace)===country(p.location);});
 card('STAYED CLOSE',`${local.length} ${local.length===1?'relative':'relatives'}`,'Birthplace matches current or last home','Based on recorded locations');
 const regions=ranked(people.map(p=>{const a=parts(p.birthplace);return a.length>=3?a.at(-2):'';})),region=regions[0]?.[0];
 const cities=[...new Set(people.filter(p=>parts(p.birthplace).at(-2)===region).map(p=>parts(p.birthplace)[0]))].sort(compare);
 card('WHERE WE BEGAN',region || 'Still to Discover','Most common recorded birth state / province',region?'Across '+cities.join(', '):'Add birthplaces with a state or province');
 const targets={
  'GROWING BRANCHES':{people:people.filter(p=>(p.lastName?.trim() || p.name?.trim().split(/\s+/).at(-1))===surnames[0]?.[0])},
  'FULL HOUSE':{group:largest}, 'FAMILY HUB':{person:hub?.person},
  'LASTING LOVE':{event:wedding?.event}, 'LIVING WISDOM':{person:elder?.person},
  'PEAK BIRTH DECADE':{year:decades.length?Number(decades[0][0]):null},
  'FARTHEST REACH':{person:journey?.person,destination:journey?.destination},
  'STAYED CLOSE':{people:local},
  'WHERE WE BEGAN':{region,people:people.filter(p=>region && parts(p.birthplace).at(-2)===region)}
 };
 return cards.map(card=>({...card,target:targets[card.eyebrow] || {}}));
}
