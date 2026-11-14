import assert from 'node:assert/strict';
import {photosOfPerson} from '../src/domain/person-photos.js';
const data={people:[{id:'a',photo:'head.jpg',headshotOriginal:'original.jpg'}],photoTags:{'one.jpg':['a'],'head.jpg':['a'],'two.jpg':['a'],'other.jpg':['b'],'original.jpg':['a'],'movie.mp4':['a'],'three.jpg':['a']},photoPins:{a:['three.jpg','two.jpg']}};
assert.deepEqual(photosOfPerson(data,'a'),['three.jpg','two.jpg','one.jpg']);
data.photoPins={};assert.deepEqual(photosOfPerson(data,'a'),['one.jpg','two.jpg','three.jpg']);
assert.deepEqual(photosOfPerson(data,'b'),['other.jpg']);
console.log('Passed: pinned photos first, stable ordering, per-person isolation, headshot/original/video exclusion.');
