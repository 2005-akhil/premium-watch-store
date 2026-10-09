// ========================================================
// TITAN WATCH CATALOG - REFERENCE ADAPTER
// References the single existing watch database in js/products.js.
// No duplicated data, no second database.
// ========================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let catalog = [];
const sourcePath = path.join(__dirname, '..', 'js', 'products.js');

if (fs.existsSync(sourcePath)) {
  const code = fs.readFileSync(sourcePath, 'utf-8');
  const sandbox = {};
  vm.runInNewContext(code + '; _exported = PRODUCTS;', sandbox);
  catalog = sandbox._exported || [];
}

module.exports = catalog;
