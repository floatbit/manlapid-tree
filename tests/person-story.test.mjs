import assert from 'node:assert/strict';
import {personStory} from '../src/domain/person-story.js';
assert.equal(personStory({name:'Alex',bio:'  A story\nwith paragraphs.  '}),'A story\nwith paragraphs.');
const p={name:'Alex',birthday:'About 1940',birthplace:{location:'Manila'},location:'New York'};
const summary=personStory(p);
assert(summary.includes('born in about 1940 in Manila'));
assert(summary.includes('lives in New York'));
assert.equal(p.bio,undefined,'Generated text is not persisted on the person');
assert(!personStory({...p,deceased:true,dateDetails:{death:'2020'}}).includes('lives in'));
assert.equal(personStory({name:'Alex'}),'Help tell Alex’s story by adding a few memories.');
console.log('Passed: written stories, factual summaries, approximate dates and no persisted changes.');

const alex={id:'a',name:'Alex Smith',firstName:'Alexander',nicknames:['Lex'],location:'Boston, MA, USA'};
const sam={id:'s',name:'Samantha Jones',firstName:'Samantha',nicknames:['Sam'],location:'Boston, MA, USA'};
const story=personStory(alex,{people:[alex,sam],relatives:[{id:'s',type:'spouse'}],milestones:[{type:'marriage',date:'2012-06-15',participants:['a','s']}]});
assert.equal(story,'Lex married Sam in 2012, and they currently live in Boston.');
assert(!personStory(alex,{people:[alex,{...sam,location:'Chicago'}],relatives:[{id:'s',type:'spouse'}]}).includes('they currently live'),'Shared residence requires matching recorded homes');
assert(personStory({...alex,nicknames:[]}).includes('Alexander'),'First name is used without a nickname');
