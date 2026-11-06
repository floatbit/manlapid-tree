const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tree = fs.readFileSync('js/tree.js', 'utf8');
const controls = fs.readFileSync('js/tree-controls.js', 'utf8');
const key = 'kinfolk-tree-zoom-v1';
const saved = new Map([[key, JSON.stringify({ locked: true, scale: 0.825 })]]);
function environment() {
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        style: {},
        value: '',
        textContent: '',
        attrs: {},
        clientWidth: 800,
        clientHeight: 600,
        scrollLeft: 0,
        scrollTop: 0,
        getAnimations: () => [],
        setAttribute(name, value) {
          this.attrs[name] = value;
        },
        scrollTo() {},
      });
    return elements.get(id);
  };
  const ctx = vm.createContext({
    $,
    localStorage: { getItem: (k) => saved.get(k), setItem: (k, v) => saved.set(k, v) },
    getComputedStyle: () => ({ transform: 'none' }),
    animateTree() {},
    DOMMatrixReadOnly: class {
      constructor() {
        this.e = 0;
        this.f = 0;
        this.a = 1;
      }
    },
    treeCenterRequest: 0,
  });
  vm.runInContext(
    tree.slice(tree.indexOf('const TREE_ZOOM_KEY'), tree.indexOf('const reducedMotion')),
    ctx,
  );
  vm.runInContext(
    tree.slice(tree.indexOf('function setGraphScale('), tree.indexOf('function fitGraph(')),
    ctx,
  );
  vm.runInContext('graphLayout = {width:1000, height:600};', ctx);
  return { ctx, $ };
}
let { ctx, $ } = environment();
for (const scale of [0.2, 1, 1.18, 2]) {
  vm.runInContext(`setGraphScale(${scale})`, ctx);
  assert.equal(
    vm.runInContext('graphScale', ctx),
    0.825,
    'Automatic requests must respect the lock',
  );
}
assert.equal($('#lockZoom').attrs['aria-pressed'], 'true');
vm.runInContext(
  controls.slice(
    controls.indexOf("$('#zoomSlider').oninput"),
    controls.indexOf("$('#fitGraph').onclick"),
  ),
  ctx,
);
$('#zoomSlider').oninput({ target: { value: '120' } });
assert.equal(vm.runInContext('graphScale', ctx), 1.2);
assert.equal(vm.runInContext('zoomLocked', ctx), false);
assert.equal(JSON.parse(saved.get(key)).locked, false);
$('#lockZoom').onclick();
assert.deepEqual(JSON.parse(saved.get(key)), { locked: true, scale: 1.2 });
({ ctx } = environment());
assert.equal(vm.runInContext('graphScale', ctx), 1.2, 'Refresh must restore the locked scale');
for (const invalid of ['broken', '{"locked":true,"scale":999}', 'null']) {
  saved.set(key, invalid);
  const next = environment().ctx;
  assert.equal(vm.runInContext('zoomLocked', next), false);
  assert.equal(vm.runInContext('graphScale', next), 1);
}
console.log(
  'Passed: locked automatic zoom, slider unlock, persisted scale/state, and invalid storage recovery.',
);

{
  const fitContext = environment().ctx;
  vm.runInContext(
    'function fitGraph() { setGraphScale(0.4); } setGraphZoomLocked(true);',
    fitContext,
  );
  vm.runInContext(
    controls.slice(
      controls.indexOf("$('#fitGraph').onclick"),
      controls.indexOf("$('#backToStart').onclick"),
    ),
    fitContext,
  );
  fitContext.$('#fitGraph').onclick();
  assert.equal(vm.runInContext('zoomLocked', fitContext), false);
  assert.equal(vm.runInContext('graphScale', fitContext), 0.4);
  assert.equal(JSON.parse(saved.get(key)).locked, false);
}
console.log('Passed: explicit Fit unlocks zoom, fits the tree, and persists the unlocked state.');
