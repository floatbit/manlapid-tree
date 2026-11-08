const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
let current = new URL('http://family.local/#page=tree');
const visits = [],
  actions = [];
const ctx = vm.createContext({
  URL,
  URLSearchParams,
  location: {
    get href() {
      return current.href;
    },
  },
  history: {
    pushState(a, b, url) {
      visits.push(current.href);
      current = new URL(url);
    },
    replaceState(a, b, url) {
      current = new URL(url);
    },
  },
  sharedReady: true,
  document: { querySelectorAll: () => [] },
  window: { addEventListener() {} },
  showSection: (section) => actions.push(section),
  openSharedLink: () => actions.push('shared'),
});
const code = fs.readFileSync('js/navigation.js', 'utf8');
vm.runInContext(code.slice(code.indexOf('let restoringPageHistory')), ctx);
for (const page of [
  'timeline',
  'families',
  'people',
  'map',
  'albums',
  'recipes',
  'relationships',
  'overview',
]) {
  vm.runInContext(`updatePageUrl('${page}')`, ctx);
  assert.equal(vm.runInContext('sectionFromUrl()', ctx), page);
}
assert.equal(current.hash, '#page=reports');
const count = visits.length;
vm.runInContext("updatePageUrl('overview')", ctx);
assert.equal(visits.length, count);
current = new URL('http://family.local/#editPerson=abc');
vm.runInContext("updatePageUrl('people')", ctx);
assert(current.hash.includes('editPerson=abc'));
vm.runInContext("updatePageUrl('map')", ctx);
assert(!current.hash.includes('editPerson'));
current = new URL('http://family.local/#page=timeline');
vm.runInContext('restorePageFromUrl(); restorePageFromUrl()', ctx);
assert.deepEqual(actions, ['timeline', 'shared']);
current = new URL('http://family.local/#page=people');
vm.runInContext('restorePageFromUrl()', ctx);
assert.equal(actions.at(-2), 'people');
console.log(
  'Passed: page URLs, reports alias, deep links, repeat navigation, and history restoration.',
);
