import assert from 'node:assert/strict';
import { familyInsights, dateParts, agePyramid, migrationDisplayLabel, compareMigrationBirthplaces } from '../src/domain/insights.js';
const people=[{id:'a',name:'A',birthday:'1900-12-25',deceased:true,dateDetails:{death:'1972-01-01'},birthplace:{location:'Manila',placeId:'google-place',lat:14.6,lng:121},location:'New York'},{id:'b',name:'B',dateDetails:{birth:'About 1980'},birthplace:'Manila',location:'New York'},{id:'c',name:'C',birthday:'2000-12-01',location:'Paris'},{id:'d',name:'Unknown'}];
const result=familyInsights(people,[{id:'w',type:'marriage',date:'2010-06-12'}],new Date(2026,0,1));
assert.equal(result.lives.length,3);assert.equal(result.average,36);
assert.deepEqual(result.current[0],['New York',2]);assert.equal(result.flows[0].people.length,2);
assert.equal(result.months[11].birthdays.length,2);assert.equal(result.months[5].weddings.length,1);
assert.equal(dateParts('Date unknown'),null);assert.equal(dateParts('About 1940').approximate,true);
assert.equal(familyInsights([]).average,null);
console.log('Passed: Insights partial dates, living age estimates, birthday months, wedding months and migration grouping.');

const pyramid=agePyramid(people,new Date(2026,0,1));assert.equal(pyramid.rows[3].historical.length,1);assert.equal(pyramid.rows[1].living.length,1);assert.equal(pyramid.unknown,1);

assert.equal(migrationDisplayLabel('Waimea, HI 96743, USA'),'Waimea, HI, USA');
assert.equal(migrationDisplayLabel('Pahala, HI 96777-1234, USA'),'Pahala, HI, USA');
assert.equal(migrationDisplayLabel('Waikoloa Village, HI, USA'),'Waikoloa Village, HI, USA');
assert.equal(migrationDisplayLabel('Paris 12, France'),'Paris 12, France');

assert.deepEqual(['Waimea, HI 96743, USA','Manila, Philippines','Paris, France','Aritao, Philippines','Austin, TX, USA'].sort(compareMigrationBirthplaces),['Paris, France','Aritao, Philippines','Manila, Philippines','Austin, TX, USA','Waimea, HI 96743, USA']);
console.log('Passed: migration birthplaces sort by country, then address.');

{
 const history=[{location:'Old home',date:'1990'},{location:'Latest home',date:'2020-04-01'},{location:'Earlier home',date:'2000'}];
 const fallback=familyInsights([{id:'p',birthplace:'Birth city',location:'  ',locationHistory:history}]);
 assert.equal(fallback.flows[0].to,'Latest home');
 assert.equal(familyInsights([{id:'p',birthplace:'Birth city',location:'Current home',locationHistory:history}]).flows[0].to,'Current home');
 assert.equal(familyInsights([{id:'p',birthplace:'Birth city',locationHistory:[{location:'First'},{location:'Last'}]}]).flows[0].to,'Last');
 assert.equal(familyInsights([{id:'p',birthplace:'Birth city'}]).flows.length,0);
 console.log('Passed: migration prefers current home, falls back by move date or recorded order, and omits unknown destinations.');
}

{
 const {migrationColumn}=await import('../src/domain/insights.js');
 const column=migrationColumn(['Boston, MA, USA','Paris, France','Albany, NY, US','France']);
 assert.deepEqual(column.groups.map(g=>g.country),['France','United States']);
 assert.deepEqual(column.groups[1].places.map(p=>p.label),['Albany, NY','Boston, MA']);
 assert.equal(column.positions.size,4,'Country-only places retain their path endpoint');
 for(const g of column.groups)for(const p of g.places)assert.equal(column.positions.get(p.value),p.y-4,'Paths align to city rows rather than country headings');
 console.log('Passed: migration groups both columns by country with alphabetical city labels and aligned paths.');
}

{
 const {pyramidAgeDetails,agePyramid}=await import('../src/domain/insights.js');
 const now=new Date(2026,10,18);
 assert.equal(pyramidAgeDetails({birthday:'1980-12-25'},now).label,'45 years old');
 assert.equal(pyramidAgeDetails({birthday:'About 1980'},now).label,'About 46 years old');
 assert.equal(pyramidAgeDetails({birthday:'1940-12-25',deceased:true,dateDetails:{death:'2020-01-01'}},now).label,'79 years old');
 assert.equal(agePyramid([{birthday:'1990-12-25'}],now).rows[1].living.length,1,'Exact age determines bracket before birthday');
}
