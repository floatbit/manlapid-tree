import assert from 'node:assert/strict';
import {worldEvents,worldEventsByFamilyYear} from '../src/data/world-events.js';
const events=[{id:'before',date:'1968-01-01'},{id:'same',date:'1970-03-01'},{id:'after',date:'1974-04-01'},{id:'distant',date:'1900-01-01'}];
const grouped=worldEventsByFamilyYear([1970,1970,1980,'Date Unknown'],events);
assert.deepEqual(grouped.get(1970).map(e=>[e.id,e.offset]),[['same',0]]);
assert.equal([...grouped.values()].flat().length,1,'Only exact calendar-year matches');
assert.equal(worldEventsByFamilyYear([],events).size,0);
assert.equal(worldEventsByFamilyYear([1970],events).get(1970).length,1);
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
assert(!worldEventsByFamilyYear([1835]).get(1835).some(e=>e.id==='manila-trade-1834'),'1834 context must not appear next to 1835');
assert(worldEventsByFamilyYear([1834]).get(1834).some(e=>e.id==='manila-trade-1834'));
assert(!worldEventsByFamilyYear([2002]).get(2002).some(e=>e.id==='iraq-war-2003'));

const all=worldEventsByFamilyYear(worldEvents.map(e=>Number(e.date.slice(0,4))));
const counts=new Map();for(const [year,notes] of all){const decade=Math.floor(year/10)*10;counts.set(decade,(counts.get(decade)||0)+notes.length);}
assert([...counts.values()].every(count=>count<=2),'No more than two notes per decade');
assert(all.get(1991).some(e=>e.id==='pinatubo-1991'),'Editorial landmarks take priority');
assert(all.get(1965).some(e=>e.id==='us-immigration-act-1965'));
assert.deepEqual([...worldEventsByFamilyYear([2003]).keys()],[2003],'Unselected years never force a note into another year');

// Only sparse decades receive additions; previously full decades keep their landmarks.
const recordedYears=[1835,1836,1866,1887,1897,1900,1909,1925,1929,1931,1932,1934,1935,1936,1938,1939,1940,1942,1943,1944,1946,1947,1948,1954,1956,1959,1962,1963,1964,1965,1966,1967,1968,1969,1970,1971,1972,1973,1974,1975,1978,1980,1982,1983,1987,1988,1989,1990,1991,1993,1994,1997,1998,1999,2000,2001,2002,2004,2005,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];
const selected=worldEventsByFamilyYear(recordedYears);
const decadeIds=decade=>[...selected].filter(([year])=>Math.floor(year/10)*10===decade).flatMap(([,notes])=>notes.map(n=>n.id)).sort();
assert.deepEqual(decadeIds(1960),['moon-1969','us-immigration-act-1965']);
assert.deepEqual(decadeIds(1970),['martial-law-1972','thrilla-manila-1975']);
assert.deepEqual(decadeIds(1990),['mens-world-cup-1998','pinatubo-1991']);
assert.deepEqual(decadeIds(2000),['iphone-2007','september-11-2001']);
for(const decade of [1830,1860,1880,1890,1900,1920,1930,1940,1950,1980,2010,2020])assert(decadeIds(decade).length>=1 && decadeIds(decade).length<=2);
assert.equal(worldEvents.find(e=>e.id==='covid-2020').title,'COVID-19 pandemic');

assert.deepEqual(decadeIds(1950),['barbie-1959','mens-world-cup-1954']);
assert.equal(worldEvents.find(e=>e.id==='mens-world-cup-1954').date,'1954-07-04');
