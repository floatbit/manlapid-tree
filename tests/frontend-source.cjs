const fs = require('node:fs');
const path = require('node:path');
// The Vite adapter preserves runtime order while UI is moved into Vue components.
module.exports = function frontendSource() {
  const root = path.join(__dirname, '..');
  return require('../scripts/runtime-order.json')
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n');
};
