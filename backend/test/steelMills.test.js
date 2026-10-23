const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { STEEL_MILLS, normalizeSteelMill } = require('../util/steelMills');

test('every sales order dropdown value is accepted and stored unchanged', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/SalesOrderForm.js'), 'utf8');
  const options = source.match(/const steelMillOptions = \[([\s\S]*?)\n\];/)[1];
  const values = [...options.matchAll(/value: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(values, STEEL_MILLS);
  for (const value of values) assert.equal(normalizeSteelMill(value), value);
});

test('cached form spellings and display names resolve to canonical mills', () => {
  for (const [input, expected] of [
    ['Skyway , Ludhiana', 'Skyway - Ludhiana'],
    ['kuber concast - Mandi Gobindgarh', 'Kuber Concast - Mandi Gobindgarh'],
    ['Pushpanjali strip', 'Pushpanjali Strip'],
    [' AV Alloys ', 'AV Alloys - Mandi Gobindgarh'],
    ['Kesari Alloys', 'Kesari Alloys - Bhiwadi'],
    ['Others', 'Others'],
  ]) assert.equal(normalizeSteelMill(input), expected);
});

test('unknown and empty mill values remain invalid', () => {
  for (const value of ['', null, undefined, 'Unknown Mill', 'AV']) {
    assert.equal(normalizeSteelMill(value), '');
  }
});
