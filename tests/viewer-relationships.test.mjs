import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { viewerRelationshipLabels } from '../src/domain/viewer-relationships.js';
const people = [
  {id:'me'}, {id:'father',gender:'male'}, {id:'mother',gender:'female'},
  {id:'pgm',gender:'female'}, {id:'mgf',gender:'male'},
  {id:'aunt',gender:'female'}, {id:'uncle',gender:'male'},
  {id:'sister',gender:'female'}, {id:'spouse'}, {id:'mil',gender:'female'},
  {id:'cousin'}, {id:'removed'}, {id:'unrecorded'}, {id:'neutral'},
];
const parent = (a,b) => ({a,b,type:'parent'}), sibling = (a,b) => ({a,b,type:'sibling'});
const data = { people, links:[parent('me','father'),parent('me','mother'),parent('father','pgm'),parent('mother','mgf'),sibling('mother','aunt'),sibling('father','uncle'),sibling('me','sister'),{a:'me',b:'spouse',type:'spouse'},parent('spouse','mil'),parent('cousin','aunt'),parent('removed','cousin'),sibling('me','neutral')] };
const context = vm.createContext({data});
const source = fs.readFileSync('js/relationships.js','utf8');
vm.runInContext(source.slice(0,source.indexOf('let relationshipTrace')),context);
const base = vm.runInContext("relationshipLabels('me')",context);
const labels = viewerRelationshipLabels(data,'me',base);
for (const [id,expected] of Object.entries({me:'Me',father:'Father',mother:'Mother',pgm:'Paternal Grandmother',mgf:'Maternal Grandfather',aunt:'Maternal Aunt',uncle:'Paternal Uncle',sister:'Sister',mil:'Mother-in-law',cousin:'1st Cousin',removed:'1st Cousin Once Removed',unrecorded:'No Recorded Connection',neutral:'Sibling'})) assert.equal(labels.get(id),expected,id);
assert.equal(viewerRelationshipLabels(data,'missing',base).size,0);
const neutralData = {...data, people:people.map(({gender,...p})=>p)};
const neutralLabels = viewerRelationshipLabels(neutralData,'me',base);
assert.equal(neutralLabels.get('father'),'Parent','Never infer gender from a name');
assert.equal(neutralLabels.get('pgm'),'Grandparent','Never infer paternal side without recorded gender');
// Cycles and duplicate links terminate safely, even with invalid imported ancestry.
const cyclic = {...data,links:[...data.links,parent('pgm','me'),parent('me','father')]};
assert.equal(viewerRelationshipLabels(cyclic,'me',base).get('me'),'Me');
console.log('Passed: viewer kinship, parental sides, in-laws, cousins, neutral data, disconnected people and cycle safety.');
