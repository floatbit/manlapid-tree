function dateParts(value) {
  if (value && typeof value === 'object') {
    if (!value.year) return dateParts(value.date || value.value || value.text);
    const year=Number(value.year),month=Number(value.month),day=Number(value.day);
    return checked(year,month || null,day || null,!!value.approximate || (!!value.precision && value.precision!=='exact'));
  }
  const match=/^(About )?(\d{4})(?:-(\d{2})-(\d{2}))?$/.exec(value || '');
  return match ? checked(+match[2],match[3]?+match[3]:null,match[4]?+match[4]:null,!!match[1]) : null;
}
function checked(year,month,day,approximate) {
  if (!Number.isInteger(year) || year<1) return null;
  if (month!==null && (month<1 || month>12)) return null;
  if (day!==null) {
    const leap=year%4===0 && (year%100!==0 || year%400===0);
    const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if (!month || day<1 || day>days[month-1]) return null;
  }
  return {year,month,day,approximate};
}
export function ageAtEvent(birth,event) {
  const born=dateParts(birth),when=dateParts(event);
  if (!born || !when || when.year<born.year) return null;
  const complete=!!(born.month && born.day && when.month && when.day);
  if (complete && (when.year===born.year && (when.month<born.month || (when.month===born.month && when.day<born.day)))) return null;
  let years=when.year-born.year;
  if (complete && (when.month<born.month || (when.month===born.month && when.day<born.day))) years--;
  const approximate=!complete || born.approximate || when.approximate;
  return {years,approximate,label:!approximate && years===0?'Under 1 year old':`${approximate?'About ':''}${years} ${years===1?'year':'years'} old`};
}
export function eventAges(event,people) {
  if (!['marriage','birthday_party','sweet_16','graduation','move'].includes(event.type)) return [];
  return [...new Set(event.participants || [])].map(id=>people.find(p=>p.id===id)).filter(Boolean).flatMap(person=>{
    const age=ageAtEvent(person.dateDetails?.birth || person.birthday,event.date);
    if (!age) return [];
    const name=person.nicknames?.find(n=>typeof n==='string' && n.trim()) || person.firstName || person.name;
    const label=['birthday_party','sweet_16'].includes(event.type) && !age.approximate && age.years>0 ? `${name} turned ${age.years}` : `${name} · ${age.label}`;
    return [{id:person.id,label}];
  });
}
