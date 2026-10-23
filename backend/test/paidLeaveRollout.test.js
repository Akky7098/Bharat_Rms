const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const policy = require('../util/paidLeavePolicy');
test('rollout excludes older attendance and next year accrual starts at January 1', () => {
  assert.equal(policy.accrualStart(2026, '2026-10-23').toISOString(), '2026-10-23T00:00:00.000Z');
  assert.equal(policy.accrualStart(2027, '2026-10-23').toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(policy.entitlement(0), 1);
  assert.equal(policy.entitlement(19), 1);
  assert.equal(policy.entitlement(20), 2);
  assert.throws(() => policy.accrualStart(2026, '2026-02-30'), /valid YYYY-MM-DD/);
});
test('sixty older full attendance days cannot inflate the initial paid balance to four', async () => {
  const history = Array.from({ length: 60 }, (_, index) => ({ attendanceDate: new Date(Date.UTC(2026, 6, index + 1)), checkIn: { time: '2026-07-01T04:00:00Z' }, checkOut: { time: '2026-07-01T13:00:00Z' } }));
  const context = { module: { exports: {} }, require: name => {
    if (name === '../util/paidLeavePolicy') return { ...policy, accrualStart: year => policy.accrualStart(year, '2026-10-23') };
    return { find: query => ({ select: () => ({ lean: async () => {
      if (name === '../model/leaveRequestModel') return [];
      assert.equal(query.attendanceDate.$gte.toISOString(), '2026-10-23T00:00:00.000Z');
      return history.filter(record => record.attendanceDate >= query.attendanceDate.$gte);
    } }) }) };
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../services/paidLeaveBalanceService'), 'utf8'), context);
  const balance = await context.module.exports({ employeeId: 'employee', monthDate: '2026-10-23' });
  assert.equal(balance.completedAttendanceDays, 0);
  assert.equal(balance.earnedPaidLeave, 1);
  assert.equal(balance.availablePaidLeave, 1);
  assert.equal(balance.daysUntilNextPaidLeave, 20);
});
