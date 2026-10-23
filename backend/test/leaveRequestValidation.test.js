const test = require('node:test');
const assert = require('node:assert/strict');
const LeaveRequest = require('../model/leaveRequestModel');
const fixture = () => ({ employeeId: '69f306970d3506fdaba2b5a2', employeeName: 'Example', employeeRole: 'user', leaveType: 'paid_leave', duration: 'full_day', fromDate: new Date('2026-10-01'), toDate: new Date('2026-10-01'), reason: 'Personal work', approvalLevel: 'super_admin' });
test('real Mongoose 9 leave validation succeeds without a next callback', async () => {
  await new LeaveRequest(fixture()).validate();
  await new LeaveRequest({ ...fixture(), leaveType: 'loss_of_pay' }).validate();
});
test('leave validation still rejects reversed dates and multiple-date half days', async () => {
  await assert.rejects(new LeaveRequest({ ...fixture(), toDate: new Date('2026-09-30') }).validate(), /end date cannot be before/);
  await assert.rejects(new LeaveRequest({ ...fixture(), duration: 'first_half', toDate: new Date('2026-10-02') }).validate(), /Half-day leave/);
  await new LeaveRequest({ ...fixture(), duration: 'first_half' }).validate();
});
