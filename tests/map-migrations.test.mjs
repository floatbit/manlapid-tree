import assert from 'node:assert/strict';
import {migrationMapData} from '../src/domain/map-migrations.js';
import {familyInsights} from '../src/domain/insights.js';
const birthplace={location:'Manila, Philippines',lat:'14.6',lng:'121'};
const people=[
 {id:'z',name:'Zoe Smith',birthplace,location:'New York, USA',locationLat:40.7,locationLng:-74},
 {id:'a',name:'Amy Adams',deceased:true,birthplace,locationHistory:[{location:'Paris, France',lat:48.8,lng:2.3,date:'1980'},{location:'New York, USA',lat:40.7,lng:-74,date:'2000'}]},
 {id:'b',name:'Ben Smith',birthplace:'Manila, Philippines',location:'New York, USA'},
 {id:'missing',name:'Unknown',birthplace},
 {id:'blank',name:'Empty coordinates',birthplace:{location:'Somewhere',lat:'',lng:null},location:'New York, USA'}
];
const result=migrationMapData(people);
assert.equal(result.routes.length,1,'Shared origin and destination produce one route');
assert.deepEqual(result.routes[0].people.map(p=>p.id),['a','b','z'],'Historical people and known-coordinate fallback are included and surname-sorted');
assert.deepEqual(result.routes[0].fromPosition,{lat:14.6,lng:121});
assert.equal(result.routes[0].to,'New York, USA','Last home is chosen by date');
assert.equal(result.missing,2);
assert.deepEqual(result.routes.map(r=>[r.from,r.to]),familyInsights(people.slice(0,3)).flows.map(r=>[r.from,r.to]),'Map and Insights use the same routes');
assert.equal(migrationMapData([]).routes.length,0);
assert.equal(migrationMapData([{birthplace:{location:'A',lat:99,lng:0},location:'B',locationLat:0,locationLng:0}]).routes.length,0,'Invalid coordinates do not create markers');
console.log('Passed: migration routes match Insights, use last homes, share known coordinates, include historical relatives and omit unmappable records.');
