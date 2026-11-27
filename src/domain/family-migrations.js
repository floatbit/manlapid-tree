import {dateParts, locationLabel, sameMigrationPlace, migrationDisplayLabel} from './insights.js';

// Recorded stops only: dates describe the place record, not an inferred move date.
export function familyMigrationStops(person) {
  const stops=[];
  const add=(place,date,kind)=>{
    if(!locationLabel(place)) return;
    const previous=stops.at(-1);
    if(previous && sameMigrationPlace(previous.place,place)) {
      if(kind==='Current home') previous.current=true;
      return;
    }
    const parts=dateParts(date);
    stops.push({place,label:migrationDisplayLabel(locationLabel(place)),year:parts?.year || null,approximate:typeof date === 'object' ? !!date?.approximate : /about|circa/i.test(date || ''),kind,current:kind==='Current home'});
  };
  add(person.birthplace,person.dateDetails?.birth || person.birthday,'Birthplace');
  const homes=(person.locationHistory || []).map((home,index)=>({home,index,date:dateParts(home.date)}));
  homes.sort((a,b)=>(a.date?.year ?? Infinity)-(b.date?.year ?? Infinity)||(a.date?.month || 0)-(b.date?.month || 0)||(a.date?.day || 0)-(b.date?.day || 0)||a.index-b.index);
  for(const {home} of homes) add(home,home.date,'Recorded home');
  if(person.location) add({location:person.location,placeId:person.locationPlaceId,lat:person.locationLat,lng:person.locationLng},null,person.deceased?'Last recorded location':'Current home');
  return stops.length>1 ? stops : [];
}

export function familyMigrationLayout(people, now=new Date().getFullYear()) {
  const hubs=[];
  const routes=people.map(person=>({person,stops:familyMigrationStops(person)})).filter(route=>route.stops.length);
  for(const route of routes) for(const stop of route.stops) {
    let hub=hubs.find(h=>sameMigrationPlace(h.place,stop.place));
    if(!hub) {hub={id:'place-'+hubs.length,place:stop.place,label:stop.label,visits:[]};hubs.push(hub);}
    stop.hub=hub.id;
    hub.visits.push({person:route.person,stop});
  }
  for(const hub of hubs) {
    hub.people=[...new Map(hub.visits.map(v=>[v.person.id,v.person])).values()];
    hub.visits.sort((a,b)=>(a.stop.year ?? Infinity)-(b.stop.year ?? Infinity));
  }
  const years=routes.flatMap(r=>r.stops.map(s=>s.year).filter(y=>y!==null));
  const first=years.length ? Math.floor(Math.min(...years)/10)*10 : now-10;
  const last=Math.max(now,...years), span=Math.max(1,last-first);
  const step=span>100?20:10;
  const ticks=[];
  for(let year=first;year<=last;year+=step) if(last-year>span*.04) ticks.push(year);
  ticks.push(last);
  const x=year=>24+(year-first)/span*752;
  for(const route of routes) {
    const lanes=[];
    route.points=route.stops.filter(s=>s.year!==null).map(stop=>{
      const position=x(stop.year);
      let lane=lanes.findIndex(previous=>position-previous>24);
      if(lane<0) lane=lanes.length;
      lanes[lane]=position;
      return {...stop,x:position,y:30+lane*28};
    });
    route.unknown=route.stops.filter(s=>s.year===null);
    route.height=Math.max(68,lanes.length*28+32);
  }
  return {routes,hubs,ticks:ticks.map(year=>({year,x:x(year)})),first,last};
}
