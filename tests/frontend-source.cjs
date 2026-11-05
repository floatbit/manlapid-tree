const fs = require('node:fs');
const path = require('node:path');

// Follow the production script order so domain tests survive feature-file extraction.
module.exports = function frontendSource() {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)]
    .map((match) => fs.readFileSync(path.join(root, match[1]), 'utf8'))
    .join('\n');
};
