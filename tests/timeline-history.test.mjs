import assert from 'node:assert/strict';
import {worldEvents,worldEventsByFamilyYear} from '../src/data/world-events.js';
const events=[{id:'before',date:'1968-01-01'},{id:'same',date:'1970-03-01'},{id:'after',date:'1974-04-01'},{id:'distant',date:'1900-01-01'}];
const grouped=worldEventsByFamilyYear([1970,1970,1980,'Date Unknown'],events);
assert.deepEqual(grouped.get(1970).map(e=>[e.id,e.offset]),[['before',-2],['same',0],['after',4]]);
assert.equal([...grouped.values()].flat().length,3,'No duplicates or distant history');
assert.equal(worldEventsByFamilyYear([],events).size,0);
assert.equal(worldEventsByFamilyYear([1970],events,0).get(1970).length,1);
assert.equal(new Set(worldEvents.map(e=>e.id)).size,worldEvents.length);
for(const event of worldEvents){assert.match(event.date,/^\d{4}(-\d{2}(-\d{2})?)?$/);assert.match(event.url,/^https:\/\//);assert(event.source && event.description && event.title);}
console.log('Passed: curated events have sources; history groups once, respects date proximity and handles empty/unknown years.');

assert(worldEvents.filter(e=>e.category==='War').length>=10,'Major conflicts include starts, surrender and armistice milestones');
assert.deepEqual(worldEvents.filter(e=>e.category==='Notable birth').map(e=>e.id).sort(),['bonifacio-born-1863','rizal-born-1861'],'Only historical Philippine figures remain in notable births');
const expanded=worldEventsByFamilyYear([1861,1863,1867,1879,1899,1914,1918,1929,1930,1934,1939,1941,1945,1950,1953,1975,1978,1990,2003]);
assert(expanded.get(1914).some(e=>e.id==='ww1-1914' && e.offset===0));
assert(expanded.get(1861).some(e=>e.id==='rizal-born-1861'));
assert(expanded.get(1953).some(e=>e.id==='korean-armistice-1953'));

assert(worldEvents.some(e=>e.id==='pinatubo-1991' && e.date==='1991-06-15'));
const early=worldEventsByFamilyYear([1835]).get(1835);
assert(early.some(e=>e.id==='manila-trade-1834' && e.offset===-1));
assert(!early.some(e=>e.id==='beagle-1831'));
assert(!early.some(e=>e.id==='belgium-1830'));
