const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const router = fs.readFileSync(path.join(root, 'router.php'), 'utf8');
const scripts = require('../scripts/runtime-order.json');
for (const file of scripts)
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
new vm.Script(require('./frontend-source.cjs')(), { filename: 'combined-runtime.js' });
assert(scripts.indexOf('js/core.js') < scripts.indexOf('js/tree.js'));
assert(html.includes('type="module" src="frontend/app.js"'));
assert(
  fs.existsSync(path.join(root, 'frontend/app.js')),
  'Run npm run build before testing public assets',
);
assert(router.includes('/frontend/'), 'PHP must serve the production build');
const files = fs
  .readdirSync(path.join(root, 'src'), { recursive: true })
  .filter((file) => file.endsWith('.vue'));
const ids = [];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
  const { descriptor, errors } = parse(source, { filename: file });
  assert.equal(errors.length, 0, file);
  let bindingMetadata = {};
  if (descriptor.scriptSetup) bindingMetadata = compileScript(descriptor, { id: file }).bindings;
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: file,
    id: file,
    compilerOptions: { bindingMetadata },
  });
  assert.equal(result.errors.length, 0, `${file}: ${result.errors.join(', ')}`);
  ids.push(...[...descriptor.template.content.matchAll(/(?<!:)\bid="([^"]+)"/g)].map((m) => m[1]));
}
assert.equal(ids.length, new Set(ids).size, 'Static IDs must be unique across Vue components');
console.log(
  'Passed: Vue components compile, runtime scope is valid, IDs are unique, and built assets are served.',
);
