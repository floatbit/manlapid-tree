import assert from 'node:assert/strict';
import {mount} from './mount-component.mjs';
import InsightsPage from '../src/pages/InsightsPage.vue';
import {bindRuntime,ui} from '../src/ui/runtime.js';
const calls=[];
const people=[
 {id:'a',name:'Ada Example',lastName:'Example',birthday:'1930-04-01',birthplace:{location:'Solano, Nueva Vizcaya, Philippines',lat:16.5,lng:121.2},location:'Paris, France',locationLat:48.8,locationLng:2.3},
 {id:'b',name:'Ben Other',lastName:'Other',birthday:'1932-12-01',birthplace:{location:'Solano, Nueva Vizcaya, Philippines',lat:16.5,lng:121.2},location:'Solano, Nueva Vizcaya, Philippines',locationLat:16.5,locationLng:121.2},
 {id:'c',name:'Chris Example',lastName:'Example',birthday:'1970-04-01'},
 {id:'d',name:'Dora Example',lastName:'Example',birthday:'1974-12-01'}
];
bindRuntime({displayName:p=>p.name,initials:p=>p.name[0],familyDateLabel:d=>d,connections:()=>[],personMatchesQuery:()=>true,personStory:()=>'',migrationStopsForPerson:()=>[],notify:message=>{throw Error(message);},
 ...Object.fromEntries(['openInsightTimeline','openInsightMap','openInsightFamily','openInsightDescendants','showSection'].map(key=>[key,(...args)=>calls.push([key,...args])]))});
ui.sync({people,links:[{a:'c',b:'a',type:'parent'},{a:'d',b:'a',type:'parent'},{a:'c',b:'b',type:'parent'},{a:'d',b:'b',type:'parent'}],milestones:[{id:'w',type:'marriage',date:'1950-01-01',title:'Ada & Ben Wedding',participants:['a','b']}],albums:[]});
const page=mount(InsightsPage);
const card=eyebrow=>page.findAll('.insights-stats article').find(el=>el.text().includes(eyebrow));
for(const [eyebrow,method,payload] of [
 ['ACROSS THE MAP','openInsightMap',undefined],
 ['WHERE WE BEGAN','openInsightMap',null],
 ['PEAK BIRTH DECADE','openInsightTimeline',{year:1930}],
 ['GROWING ROOTS','openInsightFamily',undefined],
 ['LASTING LOVE','openInsightTimeline',{kind:'milestone',id:'w'}],
 ['FAMILY HUB','openInsightDescendants','a'],
 ['FARTHEST REACH','openInsightMap',{personId:'a'}],
 ['WHERE WE GATHER','openInsightMap',{kind:'current',personId:'a'}],
 ['DOTS ON THE MAP','openInsightMap',{kind:'directory',title:'Cities & Towns'}]
]){await card(eyebrow).trigger('click');assert.equal(calls.at(-1)[0],method,eyebrow);if(payload!==null)assert.deepEqual(calls.at(-1)[1],payload,eyebrow);}
const callCount=calls.length;
await card('A FAMILY ACROSS TIME').trigger('click');
assert.equal(calls.length,callCount,'Time span opens locally without page navigation');
assert.deepEqual(page.findAll('.insights-sidebar-route h3').map(el=>el.text()),['Oldest','Youngest']);
assert(page.findAll('.insights-sidebar-route')[0].text().includes('Ada Example'));
assert(page.findAll('.insights-sidebar-route')[1].text().includes('Dora Example'));
assert(page.find('.insights-sidebar-route').text().includes('1930-04-01'));
await page.find('.insights-sidebar-people button').trigger('click');
await page.find('.insights-sidebar-heading button').trigger('click');
assert.equal(page.findAll('.insights-sidebar-route').length,2,'X restores oldest and youngest');
await card('FULL HOUSE').trigger('click');
assert.equal(calls.length,callCount,'Full House opens locally without page navigation');
assert.deepEqual(page.findAll('.insights-sidebar-route h3').map(el=>el.text()),['Parents','Children']);
assert.equal(page.findAll('.insights-sidebar-route')[0].findAll('button').length,2);
assert.equal(page.findAll('.insights-sidebar-route')[1].findAll('button').length,2);
await card('GENERATIONS TODAY').trigger('keydown',{key:'Enter'});assert(page.find('.insights-sidebar').text().includes('Living Relatives'));assert.equal(page.findAll('.insights-person-age').length,4);
await card('GROWING BRANCHES').trigger('click');assert.equal(page.findAll('.insights-sidebar-people button').length,3);
await card('LIVING WISDOM').trigger('click');assert(page.find('.insights-person-details').text().includes('Ada Example'));
await card('BIRTHDAY SEASON').trigger('click');assert.deepEqual(page.findAll('.insights-sidebar-route h3').map(el=>el.text()),['April','December']);
await page.find('.insights-sidebar-people button').trigger('click');await page.find('.insights-sidebar-heading button').trigger('click');assert.equal(page.findAll('.insights-sidebar-route').length,2,'X restores the tied month groups');
await card('STAYED CLOSE').trigger('click');assert(page.find('.insights-sidebar-route').text().includes('Ben Other'));
page.unmount();console.log('Passed: all 16 summary cards open targeted pages or contextual sidebars; tied birthdays survive person drilldown.');
