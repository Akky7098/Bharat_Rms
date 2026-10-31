const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { entitlement, units, leaveDates } = require('../util/paidLeavePolicy');
const load = (overrides = {}) => {
  const notifications = [], messages = [], created = [], updates = [], attendanceUpdates = [];
  const request = { _id: 'request', employeeId: 'employee', employeeName: 'Example', kind: 'work_from_home', fromDate: new Date('2026-11-02'), toDate: new Date('2026-11-04'), status: 'pending', ...overrides.request };
  const Request = {
    updateOne: async () => {},
    exists: async () => false,
    create: async data => { const doc = { _id: 'request', status: 'pending', ...data }; created.push(doc); return doc; },
    findById: () => ({ select: () => ({ lean: async () => request }) }),
    findOne: async () => request,
    findOneAndUpdate: async (_, update) => { updates.push(update); const doc = { ...request, ...update.$set }; return { ...doc, toObject: () => doc }; },
    ...overrides.Request,
  };
  const deps = {
    '../model/attendanceRequestModel': Request,
    '../util/shortLeavePolicy': require('../util/shortLeavePolicy'),
    '../model/attendanceModel': { findOne: () => ({ lean: async () => overrides.attendance || null }), updateMany: async () => {}, updateOne: async (...args) => { attendanceUpdates.push(args); } },
    '../model/leaveRequestModel': { exists: async () => false },
    '../model/userModel': { exists: async () => true },
    mongoose: { isValidObjectId: () => true },
    '../util/attendanceEmployeeLock': async (_, work) => work(),
    './notificationService': { createNotification: async data => notifications.push(data) },
    './whatsappApprovalService': { sendPlainWhatsappMessage: async (...args) => messages.push(args) },
  };
  const context = { require: name => { if (!(name in deps)) throw new Error(name); return deps[name]; }, module: { exports: {} }, process: { env: { SALES_WHATSAPP_GROUP_ID: 'sales-group' } }, console };
  vm.runInNewContext(fs.readFileSync(require.resolve('../services/attendanceRequestService'), 'utf8'), context);
  return { api: context.module.exports, notifications, messages, created, updates, attendanceUpdates };
};
const employee = { _id: 'employee', role: 'user', name: 'Example' };
test('paid leave starts at one, accrues every twenty full days and caps at twelve', () => {
  for (const [days, expected] of [[0,1],[19,1],[20,2],[39,2],[40,3],[220,12],[500,12]]) assert.equal(entitlement(days), expected);
  assert.equal(units({ fromDate: '2026-11-07', toDate: '2026-11-09', duration: 'full_day' }), 2);
  assert.equal(units({ fromDate: '2026-11-09', toDate: '2026-11-09', duration: 'first_half' }), .5);
  assert.equal(leaveDates('2026-11-08', '2026-11-08').length, 0);
});
test('WFH application notifies only superadmin and preserves normalized attendance dates', async () => {
  const { api, notifications, messages, created } = load();
  await api.apply('work_from_home', { fromDate: '2027-01-05', toDate: '2027-01-06', reason: 'Home appointment' }, employee);
  assert.equal(created[0].fromDate.toISOString(), '2027-01-05T00:00:00.000Z');
  assert.equal(notifications[0].targetRoles.join(','), 'super_admin');
  assert.equal(messages.length, 0);
});
test('superadmins cannot apply and admins cannot approve', async () => {
  const { api } = load();
  await assert.rejects(api.apply('work_from_home', {}, { ...employee, role: 'super_admin' }), { statusCode: 403 });
  await assert.rejects(api.decide('work_from_home', 'request', true, {}, { ...employee, role: 'admin' }), { statusCode: 403 });
});
test('short leave requires checkout and fewer than nine worked hours', async () => {
  const { api } = load();
  await assert.rejects(api.apply('short_leave', { fromDate: '2026-10-23', reason: 'Appointment' }, employee), /Check in and check out/);
  const eligible = load({ attendance: { checkIn: { time: '2026-10-23T04:00:00Z' }, checkOut: { time: '2026-10-23T12:00:00Z' } } });
  const request = await eligible.api.apply('short_leave', { fromDate: '2026-10-23', reason: 'Appointment' }, employee);
  assert.equal(request.kind, 'short_leave');
});
test('approval announces once to the configured sales group and notifies applicant', async () => {
  const { api, messages, notifications } = load();
  const result = await api.decide('work_from_home', 'request', true, {}, { _id: 'md', role: 'super_admin' });
  assert.equal(result.status, 'approved');
  assert.equal(messages[0][0], 'sales-group@g.us');
  assert.match(messages[0][1], /MD Sir approved work from home.*2026-11-02 to 2026-11-04/);
  assert.equal(notifications[0].targetUserIds[0], 'employee');
  const repeated = load({ Request: { findOneAndUpdate: async () => null } });
  await assert.rejects(repeated.api.decide('work_from_home', 'request', true, {}, { _id: 'md', role: 'super_admin' }), { statusCode: 409 });
  assert.equal(repeated.messages.length, 0);
});

test('WFH work mode is date scoped and default mode is never overwritten', async () => {
  const source = fs.readFileSync(require.resolve('../services/attendanceService'), 'utf8');
  const start = source.indexOf('const getWorkMode =');
  const end = source.indexOf('const getMinutesBetween', start);
  for (const approvedToday of [true, false]) {
    const context = {
      User: { findById: () => ({ select: () => ({ lean: async () => ({ attendanceWorkMode: 'office' }) }) }) },
      getUserId: user => user.id,
      getStartOfDay: () => new Date('2026-10-23'),
      VALID_WORK_MODES: ['office', 'work_from_home'],
      require: () => ({ exists: async filter => { assert.equal(filter.status, 'approved'); assert.equal(filter.kind, 'work_from_home'); return approvedToday; } }),
    };
    vm.runInNewContext(source.slice(start, end) + '\nthis.workMode = getWorkMode;', context);
    assert.equal(await context.workMode({ id: 'employee' }), approvedToday ? 'work_from_home' : 'office');
  }
});
test('WFH and short-leave routes are registered behind existing authentication', () => {
  const auth = () => {};
  const context = { module: { exports: {} }, require: name => {
    if (name === 'express') return require('express');
    if (name === '../util/auth') return auth;
    if (name === '../services/attendanceRequestService') return {};
    return new Proxy({}, { get: () => () => {} });
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/attendanceRoutes'), 'utf8'), context);
  const stack = context.module.exports.stack;
  assert.equal(stack[0].handle, auth);
  for (const path of ['work-from-home', 'short-leave']) {
    for (const method of ['get', 'post']) assert.ok(stack.some(layer => layer.route?.path === `/${path}` && layer.route.methods[method]));
    assert.ok(stack.some(layer => layer.route?.path === `/${path}/:requestId/approve` && layer.route.methods.patch));
  }
});
test('earned balance accumulates across months and reserves pending requests', async () => {
  const records = Array.from({ length: 20 }, (_, index) => ({ attendanceDate: new Date(Date.UTC(2026, 0, index + 1)), checkIn: { time: '2026-01-01T04:00:00Z' }, checkOut: { time: '2026-01-01T13:00:00Z' } }));
  const leaves = [
    { status: 'approved', fromDate: '2026-01-05', toDate: '2026-01-05', duration: 'full_day' },
    { status: 'pending', fromDate: '2026-02-05', toDate: '2026-02-05', duration: 'first_half' },
  ];
  const context = { module: { exports: {} }, require: name => {
    if (name === '../util/paidLeavePolicy') return { ...require('../util/paidLeavePolicy'), accrualStart: year => new Date(`${year}-01-01T00:00:00Z`) };
    return { find: filter => {
      if (name === '../model/leaveRequestModel') assert.equal(filter.fromDate.$gte.toISOString(), '2026-01-01T00:00:00.000Z');
      return { select: () => ({ lean: async () => name === '../model/attendanceModel' ? records : leaves }) };
    } };
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../services/paidLeaveBalanceService'), 'utf8'), context);
  const balance = await context.module.exports({ employeeId: 'employee', monthDate: '2026-10-23' });
  assert.equal(balance.earnedPaidLeave, 2);
  assert.equal(balance.approvedPaidLeave, 1);
  assert.equal(balance.pendingPaidLeave, .5);
  assert.equal(balance.availablePaidLeave, .5);
});

test('application and approval record actor, action and timestamps in the audit trail', async () => {
  const { api, created, updates } = load();
  await api.apply('work_from_home', { fromDate: '2027-01-05', reason: 'Home work' }, employee);
  assert.equal(created[0].history[0].action, 'applied');
  assert.equal(created[0].history[0].performedBy, employee._id);
  await api.decide('work_from_home', 'request', true, {}, { _id: 'md', role: 'super_admin', name: 'MD Sir' });
  assert.equal(updates[0].$set.decidedByName, 'MD Sir');
  assert.equal(updates[0].$push.history.action, 'approved');
  assert.equal(updates[0].$push.history.performedBy, 'md');
  assert.ok(updates[0].$push.history.at);
});

test('planned short leave accepts future late arrival and midday time ranges without attendance', async () => {
  const { api, created, notifications } = load();
  for (const [startTime, endTime, minutes] of [['09:30', '11:30', 120], ['12:00', '15:00', 180], ['16:30', '18:30', 120]]) {
    const result = await api.apply('short_leave', { fromDate: '2027-01-05', shortLeaveMode: 'planned', startTime, endTime, reason: 'Appointment' }, employee);
    assert.equal(result.shortLeaveMinutes, minutes); assert.equal(result.shortLeaveMode, 'planned');
  }
  assert.equal(created.length, 3);
  assert.match(notifications[0].message, /09:30–11:30 IST \(120 minutes\)/);
});
test('planned short leave approval works before attendance exists and includes times in WhatsApp', async () => {
  const app = load({ request: { kind: 'short_leave', shortLeaveMode: 'planned', fromDate: new Date('2027-01-05'), toDate: new Date('2027-01-05'), startTime: '12:00', endTime: '15:00', shortLeaveMinutes: 180 } });
  const result = await app.api.decide('short_leave', 'request', true, {}, { _id: 'md', name: 'MD Sir', role: 'super_admin' });
  assert.equal(result.status, 'approved');
  assert.match(app.messages[0][1], /12:00–15:00 IST, 180 minutes/);
  assert.equal(app.attendanceUpdates[0][1].$set.shortLeave.startTime, '12:00');
  assert.equal(app.attendanceUpdates[0][2], undefined, 'approval must not upsert a future attendance record');
});
test('planned short leave rejects invalid times, full-day windows, past dates and multiple dates', async () => {
  const { api } = load();
  for (const times of [['09:00', '11:30'], ['12:00', '19:00'], ['15:00', '12:00'], ['09:30', '18:30'], ['bad', '12:00']]) {
    await assert.rejects(api.apply('short_leave', { fromDate: '2027-01-05', shortLeaveMode: 'planned', startTime: times[0], endTime: times[1], reason: 'Appointment' }, employee), { statusCode: 400 });
  }
  await assert.rejects(api.apply('short_leave', { fromDate: '2020-01-06', shortLeaveMode: 'planned', startTime: '09:30', endTime: '11:30', reason: 'Appointment' }, employee), /today or a future/);
  await assert.rejects(api.apply('short_leave', { fromDate: '2027-01-05', toDate: '2027-01-06', shortLeaveMode: 'planned', startTime: '09:30', endTime: '11:30', reason: 'Appointment' }, employee), /one date/);
});

// Real attendance may extend into the requested leave window; approval does
// not overwrite actual hours or turn working time into an overlapping leave.
test('planned early departure allows existing check-in and checkout inside the requested window', async () => {
  for (const checkOut of [undefined, { time: '2027-01-05T10:45:00Z' }]) {
    const attendance = { checkIn: { time: '2027-01-05T04:00:00Z' }, checkOut };
    const app = load({ attendance, request: { kind: 'short_leave', shortLeaveMode: 'planned', fromDate: new Date('2027-01-05'), toDate: new Date('2027-01-05'), startTime: '16:00', endTime: '18:30' } });
    const applied = await app.api.apply('short_leave', { fromDate: '2027-01-05', shortLeaveMode: 'planned', startTime: '16:00', endTime: '18:30', reason: 'Urgent appointment' }, employee);
    assert.equal(applied.shortLeaveMinutes, 150);
    const approved = await app.api.decide('short_leave', 'request', true, {}, { _id: 'md', role: 'super_admin' });
    assert.equal(approved.status, 'approved');
    assert.deepEqual(Object.keys(app.attendanceUpdates[0][1].$set), ['shortLeave']);
  }
});
test('explicit recorded-checkout mode ignores stale planned clock fields', async () => {
  const app = load({ attendance: { checkIn: { time: '2026-10-23T04:00:00Z' }, checkOut: { time: '2026-10-23T08:15:00Z' } } });
  const result = await app.api.apply('short_leave', { fromDate: '2026-10-23', shortLeaveMode: 'attendance', startTime: '16:00', endTime: '18:30', reason: 'Urgent work after 4h15m' }, employee);
  assert.equal(result.shortLeaveMode, 'attendance');
});
