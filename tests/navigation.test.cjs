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
  'stories',
  'insights',
  'relationships',
  'overview',
]) {
  vm.runInContext(`updatePageUrl('${page}')`, ctx);
  assert.equal(vm.runInContext('sectionFromUrl()', ctx), page);
}
assert.equal(current.hash, '#page=contribute');
assert.equal(vm.runInContext("sectionFromUrl(new URL('http://family.local/#page=reports'))", ctx), 'overview');
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

// Opening a person uses start(), which must also hide newer content pages.
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,open:false,value:'',classList:{add(){},remove(){}},close(){}});return elements.get(id);};
const startContext=vm.createContext({$:element,ui:{setSection(){}},location:{hash:''},URLSearchParams,rememberSection(){},restoringPageHistory:false,updatePageUrl(){},data:{},closeSearch(){},displayName:p=>p.name,person:id=>({id,name:'Person'}),expand(){},window:{matchMedia:()=>({matches:false})}});
const tree=fs.readFileSync('js/tree.js','utf8');
vm.runInContext(tree.slice(tree.indexOf('function start('),tree.indexOf('function start(')+tree.slice(tree.indexOf('function start(')).indexOf('\n}',0)+2),startContext);
vm.runInContext("start('person')",startContext);
assert.equal(element('#insightsPage').hidden,true);assert.equal(element('#storiesPage').hidden,true);assert.equal(element('#explore').hidden,false);
console.log('Passed: opening a person switches from Insights or Stories to the Tree canvas.');
