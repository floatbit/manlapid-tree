import assert from 'node:assert/strict';
import { familyInsights, dateParts, agePyramid } from '../src/domain/insights.js';
const people=[{id:'a',name:'A',birthday:'1900-12-25',deceased:true,dateDetails:{death:'1972-01-01'},birthplace:{location:'Manila',placeId:'google-place',lat:14.6,lng:121},location:'New York'},{id:'b',name:'B',dateDetails:{birth:'About 1980'},birthplace:'Manila',location:'New York'},{id:'c',name:'C',birthday:'2000-12-01',location:'Paris'},{id:'d',name:'Unknown'}];
const result=familyInsights(people,[{id:'w',type:'marriage',date:'2010-06-12'}],new Date(2026,0,1));
assert.equal(result.lives.length,3);assert.equal(result.average,36);
assert.deepEqual(result.current[0],['New York',2]);assert.equal(result.flows[0].people.length,2);
assert.equal(result.months[11].birthdays.length,2);assert.equal(result.months[5].weddings.length,1);
assert.equal(dateParts('Date unknown'),null);assert.equal(dateParts('About 1940').approximate,true);
assert.equal(familyInsights([]).average,null);
console.log('Passed: Insights partial dates, living age estimates, birthday months, wedding months and migration grouping.');

const pyramid=agePyramid(people,new Date(2026,0,1));assert.equal(pyramid.rows[3].historical.length,1);assert.equal(pyramid.rows[1].living.length,1);assert.equal(pyramid.unknown,1);
