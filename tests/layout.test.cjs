const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = require('./frontend-source.cjs')();
const context = vm.createContext({});
vm.runInContext(
  `var data;const person=id=>data.people.find(p=>p.id===id);const inverse={parent:'child',child:'parent',sibling:'sibling',spouse:'spouse'};`,
  context,
);
vm.runInContext(
  source.slice(source.indexOf('function connections('), source.indexOf('function expand(')),
  context,
);
vm.runInContext(
  source.slice(source.indexOf('function layoutFamily('), source.indexOf('function setGraphScale(')),
  context,
);
function layout(ids, links, root = ids[0]) {
  context.data = { people: ids.map((id) => ({ id, name: id })), links, visible: ids, root };
  return vm.runInContext('layoutFamily(data.visible)', context);
}
function pair(layout, a, b) {
  assert.equal(
    layout.positions.get(a).y,
    layout.positions.get(b).y,
    `${a} and ${b} should share a generation`,
  );
  assert.equal(
    Math.abs(layout.positions.get(a).x - layout.positions.get(b).x),
    210,
    `${a} and ${b} must be adjacent`,
  );
}
const spouse = (a, b) => ({ a, b, type: 'spouse' }),
  sibling = (a, b) => ({ a, b, type: 'sibling' }),
  parent = (a, b) => ({ a, b, type: 'parent' });
function permutations(items) {
  return items.length
    ? items.flatMap((id, i) =>
        permutations(items.filter((_, j) => j !== i)).map((rest) => [id, ...rest]),
      )
    : [[]];
}
// Regression: two siblings pulled Luis away from Mercedes in the weighted layout.
const family = [spouse('luis', 'mercedes'), sibling('luis', 'evelyn'), sibling('luis', 'amelia')];
for (const ids of permutations(['mercedes', 'evelyn', 'luis', 'amelia']))
  for (const root of ids) {
    const tree = layout(ids, family, root);
    pair(tree, 'luis', 'mercedes');
    const xs = [...tree.positions.values()].map((p) => p.x);
    assert.equal(new Set(xs).size, 4);
  }
// New couples added on either side of a sibling group must also stay intact.
const ids = [
  'mercedes',
  'evelyn',
  'luis',
  'amelia',
  'evelyn-spouse',
  'amelia-spouse',
  'chris',
  'christy',
  'james',
  'kaylin',
  'kyle',
];
const links = [
  ...family,
  spouse('evelyn', 'evelyn-spouse'),
  spouse('amelia', 'amelia-spouse'),
  spouse('chris', 'christy'),
  parent('chris', 'luis'),
  parent('chris', 'mercedes'),
  parent('james', 'luis'),
  parent('james', 'mercedes'),
  parent('kaylin', 'chris'),
  parent('kaylin', 'christy'),
  parent('kyle', 'chris'),
  parent('kyle', 'christy'),
];
for (const root of ids) {
  const tree = layout(ids, links, root);
  for (const [a, b] of [
    ['luis', 'mercedes'],
    ['evelyn', 'evelyn-spouse'],
    ['amelia', 'amelia-spouse'],
    ['chris', 'christy'],
  ])
    pair(tree, a, b);
  assert(tree.positions.get('luis').y < tree.positions.get('chris').y);
  assert(tree.positions.get('chris').y < tree.positions.get('kaylin').y);
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = tree.positions.get(ids[i]),
        b = tree.positions.get(ids[j]);
      if (a.y === b.y) assert(Math.abs(a.x - b.x) >= 210, 'Cards cannot overlap');
    }
}
// Co-parents stay paired even before a spouse connection has been entered.
pair(
  layout(
    ['mom', 'aunt', 'dad', 'child'],
    [parent('child', 'mom'), parent('child', 'dad'), sibling('dad', 'aunt')],
    'child',
  ),
  'mom',
  'dad',
);
console.log(
  'Passed: spouse adjacency across 96 row/root permutations; new couples and sibling groups; generation order; no card overlap; co-parent fallback.',
);
// Unrelated families must not share a horizontal connector at the same height.
const branchTree = layout(
  ['logan', 'julien', 'jaden', 'roland', 'dennis', 'jong'],
  [
    sibling('roland', 'dennis'),
    spouse('dennis', 'jong'),
    parent('logan', 'roland'),
    parent('julien', 'dennis'),
    parent('julien', 'jong'),
    parent('jaden', 'dennis'),
    parent('jaden', 'jong'),
  ],
  'logan',
);
assert.equal(
  branchTree.positions.get('logan').x,
  branchTree.positions.get('roland').x,
  'Single child aligns under their own parent',
);
assert.equal(
  (branchTree.positions.get('julien').x + branchTree.positions.get('jaden').x) / 2,
  (branchTree.positions.get('dennis').x + branchTree.positions.get('jong').x) / 2,
  'Children center below their own couple',
);
const buses = vm.runInContext(
  'familyRoutes(layoutFamily(data.visible)).filter(route=>route.key.endsWith("-bus"))',
  context,
);
assert.equal(buses.length, 2);
assert.notEqual(
  buses[0].points[0][1],
  buses[1].points[0][1],
  'Separate families use separate connector levels',
);
console.log(
  'Passed: separate family connector lanes and children aligned with the correct parent group.',
);

// Screenshot regression: Gloria's trunk and James's child drop share a column.
context.testLayout = {
  positions: new Map([
    ['luis', { x: 100, y: 110 }],
    ['mercedes', { x: 310, y: 110 }],
    ['gloria', { x: 520, y: 110 }],
    ['chris', { x: 310, y: 397 }],
    ['james', { x: 520, y: 397 }],
    ['marianne', { x: 940, y: 397 }],
    ['bernadette', { x: 1150, y: 397 }],
  ]),
  families: [
    { parents: ['luis', 'mercedes'], children: ['chris', 'james'] },
    { parents: ['gloria'], children: ['marianne', 'bernadette'] },
  ],
};
context.data = {
  people: [...context.testLayout.positions.keys()].map((id) => ({ id, name: id })),
  visible: [...context.testLayout.positions.keys()],
  links: [],
};
const routed = vm.runInContext('familyRoutes(testLayout)', context);
const gloria = routed.find((r) => r.key === 'family-gloria-stem');
assert.notEqual(gloria.points.at(-1)[0], 520, 'Gloria trunk must route away from James child drop');
// Crossing lines have a visible gap; real junctions inside one family stay joined.
context.vertical = {
  key: 'v',
  group: 'first-family',
  points: [
    [100, 0],
    [100, 100],
  ],
};
context.horizontal = {
  key: 'h',
  group: 'second-family',
  points: [
    [0, 50],
    [200, 50],
  ],
};
assert.equal(
  vm.runInContext('connectorPath(vertical,[vertical,horizontal])', context),
  'M 100 0 V 43 M 100 57 V 100',
);
context.horizontal.group = 'first-family';
assert.equal(
  vm.runInContext('connectorPath(vertical,[vertical,horizontal])', context),
  'M 100 0 V 100',
);
console.log(
  'Passed: coincident trunk routing, visible gaps at unrelated crossings, and continuous real family junctions.',
);
// Overlapping sibling paths must not overpaint each other's dash gaps.
const siblingsTree = layout(
  ['amelia', 'evelyn', 'corazon', 'luis'],
  [
    sibling('amelia', 'evelyn'),
    sibling('amelia', 'corazon'),
    sibling('amelia', 'luis'),
    sibling('evelyn', 'luis'),
    sibling('evelyn', 'corazon'),
  ],
  'amelia',
);
const siblingRoutes = vm.runInContext(
  'familyRoutes(layoutFamily(data.visible)).filter(r=>r.dashed)',
  context,
);
assert.equal(
  siblingRoutes.filter((r) => r.points[0][1] === r.points[1][1]).length,
  1,
  'A shared sibling rail is drawn once',
);
assert.equal(
  siblingRoutes.filter((r) => r.points[0][0] === r.points[1][0]).length,
  4,
  'Each sibling drop is drawn once',
);
for (let i = 0; i < siblingRoutes.length; i++)
  for (let j = i + 1; j < siblingRoutes.length; j++) {
    const a = siblingRoutes[i].points,
      b = siblingRoutes[j].points;
    if (a[0][1] === a[1][1] && b[0][1] === b[1][1] && a[0][1] === b[0][1])
      assert(
        Math.min(a[1][0], b[1][0]) <= Math.max(a[0][0], b[0][0]),
        'Dashed horizontal stretches cannot overlap',
      );
  }
console.log(
  'Passed: sibling rails and drops render once, preserving dashed lines across overlapping connections.',
);
