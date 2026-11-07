const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/core.js', 'utf8');
let calls = [],
  resolveFetch;
const ctx = vm.createContext({
  URLSearchParams,
  sharedRevision: 4,
  csrfToken: 'test',
  data: { albums: [], recipes: [] },
  ui: { sync() {} },
  notify() {},
  fetch: (url) => {
    calls.push(url);
    return new Promise((resolve) => {
      resolveFetch = (payload) => resolve({ ok: true, json: async () => payload });
    });
  },
});
vm.runInContext(
  source.slice(source.indexOf('const collectionRevisions'), source.indexOf('let personAliases')),
  ctx,
);
(async () => {
  const first = vm.runInContext("ensureCollection('albums')", ctx);
  const second = vm.runInContext("ensureCollection('albums')", ctx);
  assert.equal(calls.length, 1, 'Concurrent consumers share one request');
  assert(calls[0].includes('view=collections&include=albums'));
  resolveFetch({ revision: 4, albums: [{ id: 'album', photos: ['one.jpg'] }] });
  await Promise.all([first, second]);
  await vm.runInContext("ensureCollection('albums')", ctx);
  assert.equal(calls.length, 1, 'Loaded collections are cached');
  vm.runInContext('sharedRevision = 5', ctx);
  const newer = vm.runInContext("ensureCollection('albums')", ctx);
  resolveFetch({ revision: 6, albums: [{ id: 'newer' }] });
  await newer;
  await vm.runInContext("withCollection('albums', () => 'ready')", ctx);
  assert.equal(calls.length, 2, 'A newer server revision cannot trigger a recursive fetch loop');
  const revision = vm.runInContext("requestDatabase(undefined, 'revision', [])", ctx);
  assert.equal(calls.at(-1), 'api.php?view=revision&include=');
  resolveFetch({ revision: 6 });
  await revision;
  const stale = vm.runInContext("ensureCollection('recipes')", ctx);
  vm.runInContext('sharedRevision = 6', ctx);
  resolveFetch({ revision: 5, recipes: [{ id: 'stale' }] });
  await assert.rejects(stale, /changed while loading/);
  assert.equal(vm.runInContext('data.recipes.length', ctx), 0);
  console.log(
    'Passed: on-demand collections, concurrent request reuse, revision caching, lightweight polls, and stale response protection.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
