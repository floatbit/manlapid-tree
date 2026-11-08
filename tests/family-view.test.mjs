import assert from 'node:assert/strict';
import { familyGenerationBands } from '../src/domain/family-view.js';
const people = ['great', 'grand', 'p', 'partner', 'c', 'sibling', 'gc', 'ggc'].map((id) => ({
  id,
  name: id,
}));
const links = [
  { a: 'p', b: 'grand', type: 'parent' },
  { a: 'great', b: 'grand', type: 'child' },
  { a: 'grand', b: 'partner', type: 'child' },
  { a: 'c', b: 'p', type: 'parent' },
  { a: 'c', b: 'gc', type: 'child' },
  { a: 'ggc', b: 'gc', type: 'parent' },
  { a: 'c', b: 'sibling', type: 'sibling' },
];
const group = { parents: ['p', 'partner'], children: ['c'] };
const bands = (view) =>
  familyGenerationBands(group, people, links, view).map((b) => ({
    level: b.level,
    ids: [...b.ids].sort(),
  }));
assert.deepEqual(bands(), [
  { level: 0, ids: ['p', 'partner'] },
  { level: 1, ids: ['c'] },
]);
assert.deepEqual(bands({ above: 'parents', below: 'grandchildren' }), [
  { level: -1, ids: ['grand'] },
  { level: 0, ids: ['p', 'partner'] },
  { level: 1, ids: ['c'] },
  { level: 2, ids: ['gc'] },
]);
const all = bands({ above: 'all', below: 'all' });
assert.equal(all[0].level, -2);
assert.equal(all.at(-1).level, 3);
assert.equal(
  all.flatMap((b) => b.ids).filter((id) => id === 'grand').length,
  1,
  'Shared ancestors appear once',
);
assert(!all.flatMap((b) => b.ids).includes('sibling'), 'Siblings do not become descendants');
assert.deepEqual(
  bands({ below: 'children', expandedChildren: ['c'] }),
  [
    { level: 0, ids: ['p', 'partner'] },
    { level: 1, ids: ['c'] },
  ],
  'Children setting overrides persisted expansions',
);
const cyclic = familyGenerationBands(
  group,
  people,
  [...links, { a: 'great', b: 'p', type: 'parent' }],
  { above: 'all', below: 'all' },
);
const ids = cyclic.flatMap((b) => b.ids);
assert.equal(ids.length, new Set(ids).size, 'Cycles terminate and never repeat people');
console.log(
  'Passed: default two generations, grandparents/grandchildren, all generations, per-child expansion, shared ancestors, mixed edge directions and cycle protection.',
);

assert.deepEqual(
  bands({ below: 'none' }),
  bands(),
  'Retired None preference falls back to Children',
);
