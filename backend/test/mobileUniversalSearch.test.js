const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
test('dispatch universal search intersects explicit company/invoice filters and employee access', async () => {
  const source = fs.readFileSync(require.resolve('../services/dispatchService'), 'utf8');
  const start = source.indexOf('const getAllDispatches =');
  const end = source.indexOf('  const listMatch =', start);
  class ObjectId { constructor(id) { this.id = id; } static isValid() { return true; } }
  const context = { getUserId: user => user.id, canViewAllDispatches: user => user.role === 'super_admin', mongoose: { Types: { ObjectId } }, escapeRegex };
  vm.runInNewContext(source.slice(start, end) + 'return commonMatch; }; this.query = getAllDispatches;', context);
  for (const role of ['user', 'super_admin']) {
    const query = await context.query({ search: 'BSS/10+42', companyName: 'Acme', invoiceNumber: '1042', salesPersonId: 'other' }, { id: 'self', role });
    assert.equal(query.salesPersonId.id, role === 'user' ? 'self' : 'other');
    assert.equal(query.companyName.$regex, 'Acme');
    assert.equal(query.invoiceNumber.$regex, '1042');
    const fields = query.$and[0].$or;
    assert.equal(fields.length, 6);
    assert.equal(fields[1].invoiceNumber.$regex, 'BSS/10\\+42');
    assert.ok(fields.some(item => item.lrNumber));
    assert.ok(fields.some(item => item.poNumber));
  }
});
test('MTC universal search is literal and does not overwrite the existing company filter', () => {
  const source = fs.readFileSync(require.resolve('../services/mtcService'), 'utf8');
  const start = source.indexOf('const buildMtcListQuery =');
  const end = source.indexOf('\n  if (', source.indexOf('    ];', start));
  const context = { cleanText: value => String(value) };
  vm.runInNewContext(source.slice(start, end) + 'return query; }; this.query = buildMtcListQuery;', context);
  const query = context.query({ search: 'TC(42)', companyName: 'Acme' });
  assert.ok(query.$or, 'existing company filter remains');
  assert.equal(query.$and[0].$or[4].tcNo.$regex, 'TC\\(42\\)');
});
