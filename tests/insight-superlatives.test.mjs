import assert from 'node:assert/strict';
import {insightSuperlatives} from '../src/domain/insight-superlatives.js';
const people=[{id:'p',name:'Parent Example',lastName:'Example',birthday:'1930-11-20',location:'Manila, Metro Manila, Philippines',birthplace:{location:'Manila, Metro Manila, Philippines',placeId:'m',lat:14.6,lng:121},locationPlaceId:'m',locationLat:14.6,locationLng:121},{id:'a',name:'Child Example',lastName:'Example',birthday:'1971-05-12',birthplace:{location:'Solano, Nueva Vizcaya, Philippines',lat:16.5,lng:121.2},location:'New York, NY, USA',locationLat:40.7,locationLng:-74},{id:'b',name:'Other Tan',lastName:'Tan',dateDetails:{birth:'About 1974'},birthplace:{location:'Aritao, Nueva Vizcaya, Philippines'}}];
const cards=insightSuperlatives(people,[{a:'p',b:'a',type:'child'},{a:'b',b:'p',type:'parent'}],[{type:'marriage',title:'Family Wedding',date:'1950-12-25'}],new Date(2026,10,14));
const get=key=>cards.find(c=>c.eyebrow===key);
assert.equal(cards.length,12);assert.equal(get('ACROSS THE MAP').headline,'2 countries');assert.equal(get('GROWING BRANCHES').headline,'Example');assert.equal(get('FULL HOUSE').headline,'2 siblings');assert.equal(get('LASTING LOVE').headline,'75 years');assert.equal(get('LIVING WISDOM').headline,'95 years');assert.equal(get('PEAK BIRTH DECADE').headline,'1970s');assert.equal(get('STAYED CLOSE').headline,'1 relative');assert.equal(get('WHERE WE BEGAN').headline,'Nueva Vizcaya');assert.match(get('FARTHEST REACH').headline,/miles$/);assert.ok(Number(get('FARTHEST REACH').headline.replace(/[^0-9]/g,''))>8000);
assert.equal(insightSuperlatives().length,12);assert.ok(insightSuperlatives().every(c=>!c.headline.includes('NaN')));
const about=insightSuperlatives([{id:'x',name:'X',dateDetails:{birth:'About 1932'}}],[],[],new Date(2026,10,14));assert.equal(about.find(c=>c.eyebrow==='LIVING WISDOM').headline,'About 94 years');
console.log('Passed: Insights summaries, mixed relationship directions, countries, distance, precise age, approximate dates, and empty states.');

const unparented=Array.from({length:10},(_,i)=>({id:'s'+i,name:'Sibling '+i}));
const onlySiblings=unparented.slice(1).map(p=>({a:'s0',b:p.id,type:'sibling'}));
assert.equal(insightSuperlatives(unparented,onlySiblings).find(c=>c.eyebrow==='FULL HOUSE').headline,'Still to Discover');
assert.equal(insightSuperlatives([...people,...unparented],[{a:'a',b:'p',type:'parent'},{a:'b',b:'p',type:'parent'},...onlySiblings]).find(c=>c.eyebrow==='FULL HOUSE').headline,'2 siblings');
const far=person=>insightSuperlatives([person]).find(c=>c.eyebrow==='FARTHEST REACH');
const mapped={id:'m',name:'Mapped',birthplace:{location:'Solano, Philippines',lat:'16.5',lng:'121.2'},location:'New York, NY, USA',locationLat:'40.7',locationLng:'-74'};
assert.match(far(mapped).headline,/miles$/,'MySQL decimal strings accepted');
assert.match(far(mapped).footnote,/current home/);
const moved={...mapped,location:'',locationLat:null,locationLng:null,locationHistory:[{location:'Paris, France',lat:'48.85',lng:'2.35',date:'2015'},{location:'Manila, Philippines',lat:14.6,lng:121,date:'1980'}]};
assert.match(far(moved).subtext,/Paris/,'Latest dated place selected, regardless of array order');
assert.match(far(moved).footnote,/last recorded home/);
assert.equal(far({...mapped,locationLat:'',locationLng:''}).headline,'Still to Discover','Blank coordinates are not treated as zero');
assert.equal(far({...mapped,birthplace:{...mapped.birthplace,lat:null}}).headline,'Still to Discover','Null coordinates rejected');
assert.match(far({...moved,location:'New York, NY, USA',locationLat:'40.7',locationLng:'-74'}).subtext,/New York/,'Current home takes precedence over past homes');

const branchPeople=['a','b','c','d','e','f'].map(id=>({id,name:id.toUpperCase()}));
const branchLinks=[{a:'c',b:'a',type:'parent'},{a:'c',b:'b',type:'parent'},{a:'d',b:'a',type:'parent'},{a:'d',b:'b',type:'parent'},{a:'c',b:'e',type:'child'},{a:'d',b:'e',type:'child'},{a:'e',b:'f',type:'child'}];
const branchCards=insightSuperlatives(branchPeople,branchLinks);
assert.equal(branchCards.find(c=>c.eyebrow==='GROWING ROOTS').headline,'1.5 children');
assert.equal(branchCards.find(c=>c.eyebrow==='FAMILY HUB').subtext,'4 descendants in the tree','Shared descendants counted once');
assert.doesNotThrow(()=>insightSuperlatives(branchPeople,[...branchLinks,{a:'a',b:'e',type:'parent'}]),'Malformed ancestral cycles terminate');
assert.equal(insightSuperlatives(branchPeople,[{a:'c',b:'a',type:'parent'}]).find(c=>c.eyebrow==='GROWING ROOTS').headline,'Still to Discover','One-parent records excluded from couple average');

const dots=insightSuperlatives([{id:'one',birthplace:{location:'Pahala, HI 96777, USA'},location:'Pahala, HI, USA',locationHistory:[{location:'Paris, France'}]},{id:'two',location:'Manila, Philippines'}]).find(c=>c.eyebrow==='DOTS ON THE MAP');
assert.equal(dots.headline,'2 cities & towns');assert.equal(dots.footnote,'Spanning 2 countries worldwide');
