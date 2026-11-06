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
        this.d = 1;
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

{
  const wheel = environment();
  wheel.$('#graph').getBoundingClientRect = () => ({ left: 0, top: 0 });
  vm.runInContext(
    controls.slice(
      controls.indexOf('function handleTreeWheel('),
      controls.indexOf("$('#graph').addEventListener('wheel'"),
    ),
    wheel.ctx,
  );
  vm.runInContext('setGraphZoomLocked(true);', wheel.ctx);
  wheel.ctx.event = {
    metaKey: true,
    shiftKey: false,
    deltaY: 100,
    deltaX: 0,
    deltaMode: 0,
    clientX: 200,
    clientY: 200,
    preventDefault() {},
  };
  const previousScale = vm.runInContext('graphScale', wheel.ctx);
  vm.runInContext('handleTreeWheel(event)', wheel.ctx);
  const scale = vm.runInContext('graphScale', wheel.ctx);
  assert.notEqual(scale, previousScale, 'Wheel gesture must change the locked zoom');
  assert.equal(vm.runInContext('zoomLocked', wheel.ctx), true);
  assert.deepEqual(JSON.parse(saved.get(key)), { locked: true, scale });
  vm.runInContext('setGraphScale(2)', wheel.ctx);
  assert.equal(
    vm.runInContext('graphScale', wheel.ctx),
    scale,
    'Automatic zoom remains locked after wheel zoom',
  );
  vm.runInContext('setGraphZoomLocked(false);handleTreeWheel(event);', wheel.ctx);
  assert.equal(
    vm.runInContext('zoomLocked', wheel.ctx),
    false,
    'An unlocked wheel gesture must stay unlocked',
  );
}
console.log(
  'Passed: manual wheel zoom adjusts and persists locked zoom without enabling automatic zoom.',
);

{
  const centerContext = vm.createContext({
    zoomLocked: true,
    treeCenterRequest: 1,
    treeAnimations: new Set(),
    reducedMotion: { matches: true },
    data: { selected: 'person' },
    graphLayout: { positions: new Map([['person', {}]]) },
    graphScale: 0.8,
    setTimeout: (resolve) => {
      resolve();
    },
    getComputedStyle: () => ({ transform: 'none' }),
    $: () => ({}),
    centered: [],
    centerGraphOnPerson(id) {
      this.centered.push(id);
    },
  });
  // Use a context-local function so calls can be observed without a real canvas.
  vm.runInContext('function centerGraphOnPerson(id) { centered.push(id); }', centerContext);
  vm.runInContext(
    tree.slice(
      tree.indexOf('async function centerAfterTreeSettles('),
      tree.indexOf('function animateTree('),
    ),
    centerContext,
  );
  Promise.resolve(vm.runInContext("centerAfterTreeSettles('person',1)", centerContext))
    .then(async () => {
      assert.equal(centerContext.centered.length, 0, 'Locked node clicks must not center');
      centerContext.zoomLocked = false;
      await vm.runInContext("centerAfterTreeSettles('person',1)", centerContext);
      assert.equal(centerContext.centered.length, 1, 'Unlocked node clicks still center');
      console.log('Passed: zoom lock blocks delayed click centering.');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  const camera =
    tree.slice(
      tree.indexOf('  if (fit) {', tree.indexOf('function render(')),
      tree.indexOf('  } else if (expanding && sameTree)', tree.indexOf('function render(')),
    ) + '\n}';
  vm.runInContext(
    "var fit=true, root='root',oldTransform='none'; function fitGraph() {centered.push('fit');}",
    centerContext,
  );
  centerContext.zoomLocked = true;
  vm.runInContext(camera, centerContext);
  assert.equal(
    centerContext.centered.at(-1),
    'person',
    'Fresh searches center at the locked scale',
  );
  centerContext.centered.length = 0;
}
