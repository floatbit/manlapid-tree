export function locationLabel(value) { return (typeof value === 'string' ? value : value?.location || '').trim(); }
// Read-only summaries. Partial dates remain partial; unknown lifespans are omitted.
export function dateParts(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    if (value.year) return {year:+value.year, month:+value.month || null, day:+value.day || null, approximate:value.approximate || value.precision !== 'exact'};
    return dateParts(value.date || value.value || value.text);
  }
  const match=String(value).match(/\b(\d{4})(?:-(\d{2})-(\d{2}))?\b/);
  return match ? {year:+match[1],month:+match[2] || null,day:+match[3] || null,approximate:!match[2] || /about|circa/i.test(value)} : null;
}
export function familyInsights(people, milestones=[], now=new Date()) {
  const year=now.getFullYear();
  const lives=people.map(person=>({person,birth:dateParts(person.dateDetails?.birth || person.birthday),death:dateParts(person.dateDetails?.death || person.deathDate)})).filter(p=>p.birth && p.birth.year<=year).sort((a,b)=>a.birth.year-b.birth.year);
  const months=Array.from({length:12},(_,i)=>({month:i,birthdays:[],weddings:[]}));
  for(const p of lives) if(p.birth.month) months[p.birth.month-1]?.birthdays.push(p.person);
  for(const m of milestones) {const date=dateParts(m.date);if(m.type==='marriage' && date?.month)months[date.month-1]?.weddings.push(m);}
  const counts=key=>{const map=new Map();for(const p of people){const name=locationLabel(p[key]);if(name)map.set(name,(map.get(name)||0)+1);}return [...map].sort((a,b)=>b[1]-a[1]);};
  const flows=new Map();for(const p of people){const from=locationLabel(p.birthplace),to=locationLabel(p.location);if(from && to){const key=JSON.stringify([from,to]);if(!flows.has(key))flows.set(key,{from,to,people:[]});flows.get(key).people.push(p);}}
  const living=lives.filter(p=>!p.person.deceased);
  return {lives,months,current:counts('location'),birthplaces:counts('birthplace'),flows:[...flows.values()].sort((a,b)=>b.people.length-a.people.length),average:living.length ? Math.round(living.reduce((sum,p)=>sum+year-p.birth.year,0)/living.length):null};
}

export function agePyramid(people, now=new Date()) {
  const rows=['Under 18','18–35','36–60','61+'].map(label=>({label,living:[],historical:[]}));
  let unknown=0;
  for(const p of people){
    const birth=dateParts(p.dateDetails?.birth || p.birthday);
    const death=dateParts(p.dateDetails?.death || p.deathDate);
    if(!birth || (p.deceased && !death)){unknown++;continue;}
    const age=(p.deceased?death.year:now.getFullYear())-birth.year;
    if(age<0){unknown++;continue;}
    rows[age<18?0:age<=35?1:age<=60?2:3][p.deceased?'historical':'living'].push(p);
  }
  return {rows,unknown};
}

// Presentation only: retain original Google place labels and identifiers in storage.
export function migrationDisplayLabel(value) {
  return String(value || '').replace(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/g,'$1').replace(/\s+,/g,',');
}

/** Google formatted addresses end with their country; sort within country by display address. */
export function compareMigrationBirthplaces(a,b) {
  const country=value=>{
    const last=migrationDisplayLabel(value).split(',').at(-1).trim();
    return ({USA:'United States',US:'United States',UK:'United Kingdom'})[last] || last;
  };
  const compare=(a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true});
  return compare(country(a),country(b)) || compare(migrationDisplayLabel(a),migrationDisplayLabel(b));
}
