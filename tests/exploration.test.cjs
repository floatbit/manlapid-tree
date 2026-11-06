const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const source = require('./frontend-source.cjs')();
const parent = (a, b) => ({ a, b, type: 'parent' }),
  spouse = (a, b) => ({ a, b, type: 'spouse' });
const ctx = vm.createContext({ save() {}, render() {}, notify() {} });
vm.runInContext(
  `var data;const person=id=>data.people.find(p=>p.id===id);const inverse={parent:'child',child:'parent',sibling:'sibling',spouse:'spouse'};`,
  ctx,
);
vm.runInContext(
  source.slice(source.indexOf('function connections('), source.indexOf('function expand(')),
  ctx,
);
const ids = [
  'me',
  'mom',
  'grandparent',
  'brother',
  'aunt',
  'cousin',
  'niece',
  'kid',
  'grandkid',
  'partner',
  'parent-in-law',
  'uncle-by-marriage',
  'unconnected',
];
ctx.data = {
  people: ids.map((id) => ({ id, name: id })),
  links: [
    parent('me', 'mom'),
    parent('brother', 'mom'),
    parent('mom', 'grandparent'),
    parent('aunt', 'grandparent'),
    parent('cousin', 'aunt'),
    parent('niece', 'brother'),
    parent('kid', 'me'),
    parent('kid', 'partner'),
    parent('grandkid', 'kid'),
    spouse('me', 'partner'),
    parent('partner', 'parent-in-law'),
    spouse('aunt', 'uncle-by-marriage'),
  ],
  visible: [],
  expanded: [],
  root: 'me',
  selected: 'me',
};
const labels = vm.runInContext("relationshipLabels('me')", ctx);
for (const [id, label] of Object.entries({
  me: 'Selected person',
  mom: 'Parent',
  grandparent: 'Grandparent',
  brother: 'Sibling',
  aunt: 'Aunt / uncle',
  cousin: 'Cousin',
  niece: 'Niece / nephew',
  kid: 'Child',
  grandkid: 'Grandchild',
  partner: 'Spouse',
  'parent-in-law': 'Parent-in-law',
  'uncle-by-marriage': 'Aunt / uncle by marriage',
  unconnected: 'Extended family',
}))
  assert.equal(labels.get(id), label, id);
assert(
  !vm.runInContext("connections('me').some(c=>c.id==='cousin'||c.id==='aunt')", ctx),
  'Descriptive labels cannot change immediate-family expansion',
);
ctx.data.expanded = ['me', 'brother', 'partner'];
ctx.data.visible = vm.runInContext("visibleFromExpanded('me',data.expanded)", ctx);
assert(ctx.data.visible.includes('niece'));
vm.runInContext("collapseBranch('brother')", ctx);
assert(!ctx.data.visible.includes('niece'), 'Exclusive descendants disappear');
assert(
  ctx.data.visible.includes('mom') && ctx.data.visible.includes('brother'),
  'Shared immediate family remains',
);
vm.runInContext("collapseBranch('partner')", ctx);
assert(
  ctx.data.visible.includes('kid'),
  'A child revealed through the starting person remains visible',
);
vm.runInContext("collapseBranch('me')", ctx);
assert.deepEqual(Array.from(ctx.data.visible), ['me']);
assert.equal(ctx.data.root, 'me', 'Collapsing does not change the starting person');
// A directly recorded sibling link is sufficient for cousin labels without grandparents.
ctx.data = {
  people: ['me', 'parent', 'aunt', 'cousin'].map((id) => ({ id, name: id })),
  links: [
    parent('me', 'parent'),
    { a: 'parent', b: 'aunt', type: 'sibling' },
    parent('cousin', 'aunt'),
  ],
};
assert.equal(vm.runInContext("relationshipLabels('me').get('cousin')", ctx), 'Cousin');
console.log(
  'Passed: extended and in-law labels; immediate-only expansion; exclusive branch removal; shared relatives retained; starting person preserved; explicit sibling ancestry.',
);
// Relationship finder returns a real, directional chain and handles edge cases.
ctx.data = {
  people: ['logan', 'roland', 'evelyn', 'amelia', 'dennis', 'jong', 'julien', 'isolated'].map(
    (id) => ({ id, name: id }),
  ),
  links: [
    parent('logan', 'roland'),
    parent('roland', 'evelyn'),
    { a: 'evelyn', b: 'amelia', type: 'sibling' },
    parent('dennis', 'amelia'),
    spouse('dennis', 'jong'),
    parent('julien', 'dennis'),
    parent('julien', 'jong'),
  ],
  visible: [],
  expanded: [],
};
const cousinPath = vm.runInContext("findRelationship('logan','julien')", ctx);
assert.equal(cousinPath.label, '2nd Cousin');
assert.equal(
  vm.runInContext("findRelationship('logan','dennis').label", ctx),
  'Cousin once removed',
);
assert.deepEqual(Array.from(cousinPath.ids), [
  'logan',
  'roland',
  'evelyn',
  'amelia',
  'dennis',
  'julien',
]);
assert.equal(cousinPath.edges.length, cousinPath.ids.length - 1);
assert(
  !cousinPath.edges.some((edge) => edge.type === 'spouse'),
  'Blood kinship should follow a blood path',
);
assert.equal(vm.runInContext("findRelationship('dennis','jong').label", ctx), 'Spouse');
assert.equal(vm.runInContext("findRelationship('julien','logan').label", ctx), '2nd Cousin');
assert.equal(vm.runInContext("findRelationship('logan','isolated')", ctx), null);
assert.equal(vm.runInContext("findRelationship('missing','julien')", ctx), null);
assert.equal(vm.runInContext("findRelationship('logan','logan').edges.length", ctx), 0);
console.log(
  'Passed: relationship finder cousin chain, spouse and reverse lookup, disconnected records, invalid IDs, and same-person selection.',
);

ctx.data = {
  people: ['courtney', 'roland', 'logan', 'percy', 'bella', 'father'].map((id) => ({
    id,
    name: id,
  })),
  links: [
    parent('percy', 'courtney'),
    parent('bella', 'courtney'),
    parent('logan', 'courtney'),
    parent('logan', 'roland'),
    spouse('courtney', 'roland'),
  ],
};
assert.equal(vm.runInContext("relationshipLabels('percy').get('logan')", ctx), 'Half-Sibling');
assert.equal(vm.runInContext("relationshipLabels('logan').get('percy')", ctx), 'Half-Sibling');
assert.equal(vm.runInContext("relationshipLabels('percy').get('bella')", ctx), 'Sibling');
assert.equal(vm.runInContext("relationshipLabels('percy').get('roland')", ctx), 'Stepparent');
assert.equal(vm.runInContext("relationshipLabels('roland').get('percy')", ctx), 'Stepchild');
assert(vm.runInContext("findRelationship('percy','roland')", ctx));
ctx.data.links.push(parent('percy', 'roland'));
assert.equal(vm.runInContext("relationshipLabels('percy').get('logan')", ctx), 'Sibling');
console.log(
  'Passed: inferred half-siblings, incomplete sibling parents, stepparents, stepchildren, and step-relationship paths.',
);

// Bulk children adds only missing parent links and rejects conflicts and ancestry cycles.
{
  vm.runInContext(source.slice(source.indexOf('function ancestryCyclePerson('), source.indexOf('async function saveShared(')), ctx);
  const bulk = fs.readFileSync(
    require('node:path').join(__dirname, '../js/children-groups.js'),
    'utf8',
  );
  vm.runInContext(
    bulk.slice(
      bulk.indexOf('function childrenGroupChanges('),
      bulk.indexOf('function refreshChildrenGroupTags('),
    ),
    ctx,
  );
  vm.runInContext('function displayName(p) { return p.name; }', ctx);
  ctx.data = {
    people: ['parent', 'child1', 'child2', 'ancestor', 'spouse'].map((id) => ({ id, name: id })),
    links: [parent('child1', 'parent'), parent('parent', 'ancestor'), spouse('parent', 'spouse')],
  };
  const changes = vm.runInContext(
    "childrenGroupChanges('parent', ['child1', 'child2', 'child2'])",
    ctx,
  );
  assert.equal(changes.links.length, 1);
  assert.equal(changes.links[0].a, 'child2');
  assert.equal(changes.links[0].b, 'parent');
  assert.equal(changes.conflicts.length, 0);
  for (const child of ['parent', 'ancestor', 'spouse'])
    assert(
      vm.runInContext(`childrenGroupChanges('parent', ['${child}']).conflicts.length`, ctx) > 0,
    );
}
console.log(
  'Passed: bulk children skips existing links and duplicates, and rejects self, cycle, and relationship conflicts.',
);

{
  const core = fs.readFileSync(require('node:path').join(__dirname, '../js/core.js'), 'utf8');
  vm.runInContext(core.slice(core.indexOf('function personMatchesQuery(')), ctx);
  vm.runInContext('function firstLastName(p) { return p.name; }', ctx);
  ctx.nicknamePerson = { name: 'Christopher Manlapid', nicknames: ['Chris', 'Boy'] };
  assert(vm.runInContext("personMatchesQuery(nicknamePerson, ' boy ')", ctx));
  assert(vm.runInContext("personMatchesQuery(nicknamePerson, 'CHRIS')", ctx));
  assert(vm.runInContext("personMatchesQuery(nicknamePerson, 'manlapid')", ctx));
  assert(!vm.runInContext("personMatchesQuery(nicknamePerson, 'unknown')", ctx));
}
console.log('Passed: person searches match nicknames and recorded names without case sensitivity.');

{
  const navigation = fs.readFileSync(require('node:path').join(__dirname, '../js/navigation.js'), 'utf8');
  vm.runInContext(navigation.slice(navigation.indexOf('function similarity('), navigation.indexOf('let activeSearchIndex')), ctx);
  ctx.melissa = { name: 'Melissa Manlapig', nicknames: ['Mimi'] };
  assert.equal(vm.runInContext("personSearchScore(melissa, 'mimi')", ctx), 0);
  assert.equal(vm.runInContext("personSearchScore(melissa, 'MIMI')", ctx), 0);
  assert(vm.runInContext("personSearchScore(melissa, 'mim')", ctx) < 0.65);
}
console.log('Passed: main tree fuzzy search finds Melissa by her nickname Mimi.');
