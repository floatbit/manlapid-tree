const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const router = fs.readFileSync(path.join(root, 'router.php'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
const styles = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((match) => match[1]);
assert.equal(new Set(scripts).size, scripts.length, 'Scripts must load only once');
for (const file of [...scripts, ...styles]) {
  assert(fs.existsSync(path.join(root, file)), `Missing public asset: ${file}`);
  assert(router.includes(`'/${file}'`), `Local PHP router must serve ${file}`);
}
for (const file of scripts)
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
new vm.Script(require('./frontend-source.cjs')(), { filename: 'combined-browser-scripts.js' });
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
assert(html.indexOf('src="js/core.js"') < html.indexOf('src="js/tree.js"'));
console.log(
  'Passed: public assets, router allowlist, unique IDs, script syntax and shared-scope declarations.',
);
