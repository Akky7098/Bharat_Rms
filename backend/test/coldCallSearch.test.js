const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('activity text search is literal, server scoped, and shared by count and pagination', async () => {
  for (const role of ['user', 'super_admin']) {
    const filters = [];
    const chain = { populate: () => chain, sort: () => chain, skip: () => chain, limit: async () => [] };
    const model = { countDocuments: async filter => { filters.push(filter); return 0; }, find: filter => { filters.push(filter); return chain; } };
    const context = { module: { exports: {} }, require: () => model };
    vm.runInNewContext(fs.readFileSync(require.resolve('../services/coldCallService'), 'utf8'), context);
    await context.module.exports.getAllColdCalls({ search: 'A+B (India)', salesPersonId: 'other' }, { id: 'self', role });
    assert.equal(filters[0], filters[1]);
    assert.equal(filters[0].salesPersonId, role === 'user' ? 'self' : 'other');
    assert.equal(filters[0].$or.length, 3);
    assert.equal(filters[0].$or[0].companyName.$regex, 'A\\+B \\(India\\)');
  }
});
