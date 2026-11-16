import assert from 'node:assert/strict';
import {sortPeople} from '../src/domain/people-order.js';
const people=[{name:'Zoe Smith',lastName:'Smith',firstName:'Zoe'},{name:'Amy Jones'},{name:'Ben Smith'},{name:'Ann Smith'},{name:'Zoë de la Cruz',lastName:'de la Cruz',firstName:'Zoë'}];
assert.deepEqual(sortPeople(people).map(p=>p.name),['Zoë de la Cruz','Amy Jones','Ann Smith','Ben Smith','Zoe Smith']);
assert.equal(people[0].name,'Zoe Smith','Sorting must not mutate the source data');
console.log('Passed: surname-first ordering, first-name ties, full-name fallback and compound surnames.');
