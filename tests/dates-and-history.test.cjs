const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = require('./frontend-source.cjs')();
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, name);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}
const ctx = vm.createContext({ console, Date, data: { people: [] }, displayName: (p) => p.name });
for (const name of [
  'familyDateYear',
  'validFamilyDate',
  'upcomingAnniversaries',
  'peopleAtMapYear',
]) {
  const code = extract(name);
  vm.runInContext(code, ctx);
}
assert(ctx.validFamilyDate('1940'));
assert(ctx.validFamilyDate('About 1940'));
assert(ctx.validFamilyDate('Date unknown'));
assert(!ctx.validFamilyDate('1940-02-30'));
assert.equal(ctx.familyDateYear('About 1940'), 1940);
assert.equal(ctx.familyDateYear('Date unknown'), null);
const people = [
  { id: 'a', name: 'A', birthday: '1980-12-25' },
  { id: 'b', name: 'B', dateDetails: { birth: 'About 1940' } },
  { id: 'c', name: 'C', deceased: true, dateDetails: { death: '2020-11-20' } },
];
let upcoming = ctx.upcomingAnniversaries(
  people,
  [{ id: 'w', type: 'marriage', date: '2000-01-01', title: 'Wedding' }],
  new Date(2026, 10, 5),
);
assert.equal(upcoming.length, 3);
assert.equal(upcoming[0].kind, 'Remembrance');
assert.equal(upcoming[2].years, 27);
assert.equal(
  ctx
    .upcomingAnniversaries([{ name: 'Leap', birthday: '2000-02-29' }], [], new Date(2027, 1, 1))[0]
    .next.getDate(),
  28,
);
ctx.data.people = [
  {
    id: 'p',
    name: 'P',
    birthday: '1980-01-01',
    birthplace: { location: 'Manila', lat: 14, lng: 120 },
    location: 'New York',
    locationLat: 40,
    locationLng: -74,
    dateDetails: { currentSince: '2010' },
    locationHistory: [
      { date: 'About 1995', location: 'London', lat: 51, lng: 0 },
      { date: 'Date unknown', location: 'Unknown', lat: 0, lng: 0 },
    ],
  },
];
assert.equal(ctx.peopleAtMapYear(1970).length, 0);
assert.equal(ctx.peopleAtMapYear(1985)[0].location, 'Manila');
assert.equal(ctx.peopleAtMapYear(2000)[0].location, 'London');
assert.equal(ctx.peopleAtMapYear(2020)[0].location, 'New York');
ctx.data.people[0].dateDetails.currentSince = '';
assert.equal(ctx.peopleAtMapYear(2020, 2026)[0].location, 'London');
assert.equal(ctx.peopleAtMapYear(2026, 2026)[0].location, 'New York');
ctx.data.people[0].dateDetails.currentSince = 'Date unknown';
assert.equal(ctx.peopleAtMapYear(2026, 2026)[0].location, 'New York');
assert.equal(ctx.peopleAtMapYear(2025, 2026)[0].location, 'London');
ctx.data.people[0].locationLat = null;
assert.equal(ctx.peopleAtMapYear(2026, 2026)[0].location, 'London');
ctx.data.people[0].locationLat = 40;
ctx.data.people[0].deceased = true;
ctx.data.people[0].dateDetails.death = '2020';
assert.equal(ctx.peopleAtMapYear(2026, 2026).length, 0);
console.log(
  'Passed: approximate dates, anniversary rollover/leap days, and historical map locations without undated guesses.',
);
