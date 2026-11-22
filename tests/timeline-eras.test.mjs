import assert from 'node:assert/strict';
import {timelineEras} from '../src/domain/timeline-eras.js';
const events=[{date:'About 1835',kind:'birth'},{date:'1971-01-01',kind:'birth'},{date:'1975',kind:'milestone'},{date:'1978',kind:'death'},{date:'2002-10-18',kind:'birth'},{date:'Date unknown',kind:'milestone'}];
const eras=timelineEras(events,[events[1]]);
assert.deepEqual(eras.map(e=>e.start),[1830,1970,2000]);
assert.equal(eras[1].density,4);assert.equal(eras[0].density,2);
assert.deepEqual([eras[1].births,eras[1].milestones,eras[1].remembrances,eras[1].matches],[1,1,1,1]);
assert.equal(eras[2].matches,0);assert.equal(timelineEras([],[]).length,0);
console.log('Passed: decade grouping, relative density, distinct event counts, unknown dates and search match counts.');
