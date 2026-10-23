const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../services/attendanceService'), 'utf8');
test('attendance count and page exclude inactive users even with an explicit employee filter', async () => {
  for (const employeeId of [undefined, 'inactive', 'active']) {
    const filters = [];
    const chain = { populate: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => [] };
    const context = {
      User: { find: query => { assert.equal(query.status, 'inactive'); return { select: () => ({ lean: async () => [{ _id: 'inactive' }] }) }; } },
      Attendance: { countDocuments: async f => { filters.push(f); return 0; }, find: f => { filters.push(f); return chain; } },
      mongoose: { Types: { ObjectId: Object.assign(function(id) { return { id }; }, { isValid: () => true }) } },
      isAdmin: () => true, isSuperAdmin: () => true,
    };
    const start = source.indexOf('const getAttendanceList =');
    const end = source.indexOf('/* =====================================================', start);
    vm.runInNewContext(source.slice(start, end) + '\nthis.list = getAttendanceList;', context);
    await context.list({ employeeId }, {});
    assert.equal(filters[0], filters[1]);
    assert.equal(filters[0].employeeId.$nin[0], 'inactive');
    if (employeeId) assert.equal(filters[0].employeeId.$eq.id, employeeId);
  }
});
