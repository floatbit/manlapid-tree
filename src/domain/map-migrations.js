import {locationLabel,migrationDestinationPlace,migrationDisplayLabel,sameMigrationPlace} from './insights.js';
import {comparePeople} from './people-order.js';
export function migrationMapData(people) {
  const coordinates=place=>{
    const lat=place?.lat,lng=place?.lng;
    if([lat,lng].some(v=>v==null || String(v).trim()==='' || !Number.isFinite(Number(v))))return null;
    return Math.abs(+lat)<=90 && Math.abs(+lng)<=180?{lat:+lat,lng:+lng}:null;
  };
  const known=new Map();
  for(const p of people)for(const place of [p.birthplace,{location:p.location,lat:p.locationLat,lng:p.locationLng},...(p.locationHistory || [])]) {
    const point=coordinates(place),label=locationLabel(place);
    if(label && point)known.set(label,point);
  }
  const routes=new Map();let missing=0;
  for(const person of people) {
    const destination=migrationDestinationPlace(person),from=locationLabel(person.birthplace),to=locationLabel(destination);
    if(sameMigrationPlace(person.birthplace,destination))continue;
    const fromPosition=coordinates(person.birthplace)||known.get(from),toPosition=coordinates(destination)||known.get(to);
    if(!from || !to || !fromPosition || !toPosition){missing++;continue;}
    if(sameMigrationPlace({location:from,...fromPosition},{location:to,...toPosition}))continue;
    const key=JSON.stringify([from,to]);
    if(!routes.has(key))routes.set(key,{id:key,from,to,fromPosition,toPosition,people:[]});
    routes.get(key).people.push(person);
  }
  const result=[...routes.values()].sort((a,b)=>migrationDisplayLabel(a.from).localeCompare(migrationDisplayLabel(b.from)) || migrationDisplayLabel(a.to).localeCompare(migrationDisplayLabel(b.to)));
  for(const route of result)route.people.sort(comparePeople);
  return {routes:result,missing};
}
