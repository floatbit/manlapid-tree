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

// Incremental expansion keeps existing row order and never shifts cards left.
{
  const links = [sibling('a', 'b'), sibling('b', 'c'), spouse('b', 'partner')];
  const before = layout(['a', 'b'], links, 'a');
  context.previousLayout = before;
  context.data.visible = ['a', 'b', 'c', 'partner'];
  context.data.people = context.data.visible.map((id) => ({ id, name: id }));
  const after = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  const existing = ['a', 'b'].sort((a, b) => before.positions.get(a).x - before.positions.get(b).x);
  assert(after.positions.get(existing[0]).x < after.positions.get(existing[1]).x);
  for (const id of existing) assert(after.positions.get(id).x >= before.positions.get(id).x);
  const row = [...after.positions.values()].sort((a, b) => a.x - b.x);
  for (let i = 1; i < row.length; i++) assert(row[i].x - row[i - 1].x >= 210);
  context.previousLayout = after;
  const repeated = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  for (const [id, position] of after.positions)
    assert.deepEqual(
      repeated.positions.get(id),
      position,
      'Repeated rendering must not move cards',
    );
}
console.log(
  'Passed: incremental expansion preserves row order, right-only spacing, and stable rerenders.',
);

// Revealing a spouse in the middle of an existing sibling row opens a slot beside their partner.
{
  const siblings = [
    'amang',
    'dionicio',
    'evelyn',
    'feliciano',
    'amanda',
    'luis',
    'leopoldo',
    'amelia',
    'corazon',
  ];
  const links = siblings.slice(1).map((id) => sibling(siblings[0], id));
  links.push(spouse('luis', 'mercedes'));
  const before = layout(siblings, links, 'amang');
  context.previousLayout = before;
  context.data.visible = [...siblings, 'mercedes'];
  context.data.people = context.data.visible.map((id) => ({ id, name: id }));
  const after = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  pair(after, 'luis', 'mercedes');
  assert.equal(after.positions.get('luis').x, before.positions.get('luis').x);
  const originalOrder = [...siblings].sort(
    (a, b) => before.positions.get(a).x - before.positions.get(b).x,
  );
  const retainedOrder = [...siblings].sort(
    (a, b) => after.positions.get(a).x - after.positions.get(b).x,
  );
  assert.deepEqual(retainedOrder, originalOrder);
  for (const id of siblings) {
    const expectedShift = before.positions.get(id).x > before.positions.get('luis').x ? 210 : 0;
    assert.equal(after.positions.get(id).x, before.positions.get(id).x + expectedShift);
  }
  context.previousLayout = after;
  const again = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  for (const [id, position] of after.positions) assert.deepEqual(again.positions.get(id), position);
}
console.log(
  'Passed: a newly revealed spouse stays adjacent and later siblings shift right together.',
);

// Expanding earlier branches cannot interleave their children with an existing cousin group.
{
  const adults = ['luis', 'evelyn', 'dionicio', 'leonida'];
  const dionChildren = ['noli', 'arthur', 'cristy', 'joselito', 'armada'];
  const links = [
    sibling('luis', 'evelyn'),
    sibling('evelyn', 'dionicio'),
    spouse('dionicio', 'leonida'),
    spouse('evelyn', 'peter'),
    spouse('luis', 'mercedes'),
  ];
  for (const child of dionChildren)
    for (const parent of ['dionicio', 'leonida'])
      links.push({ a: child, b: parent, type: 'parent' });
  for (const parent of ['evelyn', 'peter']) links.push({ a: 'roland', b: parent, type: 'parent' });
  for (const child of ['james', 'chris'])
    for (const parent of ['luis', 'mercedes']) links.push({ a: child, b: parent, type: 'parent' });
  let current = layout([...adults, ...dionChildren], links, 'luis');
  for (const added of [
    ['peter', 'roland'],
    ['mercedes', 'james', 'chris'],
  ]) {
    context.previousLayout = current;
    context.data.visible.push(...added);
    context.data.people = context.data.visible.map((id) => ({ id, name: id }));
    current = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  }
  const x = (id) => current.positions.get(id).x;
  assert.equal(Math.abs(x('james') - x('chris')), 210, 'Luis children must be adjacent');
  assert(
    Math.max(x('james'), x('chris')) < x('roland'),
    'Luis children belong before Evelyn branch',
  );
  assert(
    x('roland') < Math.min(...dionChildren.map(x)),
    'Evelyn child must not split Dionicio children',
  );
  const center = (x('luis') + x('mercedes')) / 2;
  assert.equal(
    (x('james') + x('chris')) / 2,
    center,
    'New children should be centered under their parents',
  );
  const childRow = ['james', 'chris', 'roland', ...dionChildren].sort((a, b) => x(a) - x(b));
  for (let i = 1; i < childRow.length; i++) assert(x(childRow[i]) - x(childRow[i - 1]) >= 210);
}
console.log(
  'Passed: sequential expansion keeps children beneath parents and cousin groups separate.',
);

// Each spouse's newly revealed siblings stay on their own side of the couple.
{
  const links = [
    spouse('luis', 'mercedes'),
    sibling('mercedes', 'sally'),
    sibling('mercedes', 'gloria'),
    sibling('luis', 'evelyn'),
    sibling('luis', 'feliciano'),
  ];
  const before = layout(['luis', 'mercedes', 'sally', 'gloria'], links, 'mercedes');
  // This fixture deliberately starts with Luis on the left, as in the reported tree.
  for (const [i, id] of ['luis', 'mercedes', 'sally', 'gloria'].entries())
    before.positions.get(id).x = 110 + i * 210;
  context.previousLayout = before;
  context.data.visible.push('evelyn', 'feliciano');
  context.data.people = context.data.visible.map((id) => ({ id, name: id }));
  const after = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  const x = (id) => after.positions.get(id).x;
  assert(x('evelyn') < x('luis') && x('feliciano') < x('luis'));
  pair(after, 'luis', 'mercedes');
  assert(x('sally') > x('mercedes') && x('gloria') > x('mercedes'));
  context.previousLayout = after;
  const again = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  for (const [id, position] of after.positions) assert.deepEqual(again.positions.get(id), position);
}
console.log('Passed: newly revealed siblings expand away from the existing spouse.');

// A spouse's sibling without visible parents stays with that family across unrelated expansion.
{
  const links = [
    spouse('luis', 'mercedes'),
    spouse('chris', 'christy'),
    sibling('christy', 'kin'),
    sibling('luis', 'evelyn'),
    spouse('evelyn', 'peter'),
  ];
  for (const child of ['chris', 'james'])
    for (const p of ['luis', 'mercedes']) links.push({ a: child, b: p, type: 'parent' });
  for (const p of ['evelyn', 'peter']) links.push({ a: 'roland', b: p, type: 'parent' });
  const ids = ['luis', 'mercedes', 'evelyn', 'chris', 'christy', 'kin', 'james'];
  const before = layout(ids, links, 'luis');
  // Match the existing visual order reported by the user.
  for (const [index, id] of ['kin', 'christy', 'chris', 'james'].entries())
    before.positions.get(id).x = 110 + index * 210;
  context.previousLayout = before;
  context.data.visible.push('peter', 'roland');
  context.data.people = context.data.visible.map((id) => ({ id, name: id }));
  const after = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  const x = (id) => after.positions.get(id).x;
  assert.equal(x('christy') - x('kin'), 210, 'Kin must remain beside Christy');
  assert.equal(x('chris') - x('christy'), 210, 'The couple must stay together');
  assert(x('kin') < x('james') && x('kin') < x('roland'), 'Kin cannot jump past other families');
  context.previousLayout = after;
  const again = vm.runInContext('layoutFamily(data.visible, previousLayout)', context);
  for (const [id, position] of after.positions) assert.deepEqual(again.positions.get(id), position);
}
console.log('Passed: a spouse sibling stays with the family during unrelated expansion.');
// Two spouses connect to the shared person, never to each other.
{
  const links = [spouse('rosenda','zacarias'),spouse('rosenda','roberto'),parent('rosenda','ruby'),parent('zacarias','ruby')];
  const tree = layout(['rosenda','zacarias','roberto','ruby'],links,'rosenda');
  pair(tree,'rosenda','zacarias');
  pair(tree,'rosenda','roberto');
  const center=tree.positions.get('rosenda').x;
  assert((tree.positions.get('zacarias').x-center)*(tree.positions.get('roberto').x-center)<0);
  context.data.people.find(p=>p.id==='rosenda').currentSpouseId='zacarias';
  const incremental=vm.runInContext('layoutFamily(data.visible)',context);
  context.heartLayout=incremental;
  const hearts=vm.runInContext('spouseHearts(heartLayout)',context);
  assert.equal((hearts.match(/class="spouse-heart"/g)||[]).length,1,'Only the current spouse gets a heart');
}
console.log('Passed: shared spouse centered between two partners and heart shown only for current spouse.');
