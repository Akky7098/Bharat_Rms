const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../services/attendanceService'), 'utf8');
const part = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
function harness(approved, day = '2026-10-23', checkout = false) {
  let officeChecks = 0, saved;
  const existing = checkout ? { _id: 'attendance', workMode: 'office', checkIn: { time: new Date('2026-10-23T04:00:00Z') }, save: async function () { saved = this; } } : null;
  const context = {
    User: { findById: () => ({ select: () => ({ lean: async () => ({ attendanceWorkMode: 'office' }) }) }) },
    Attendance: { findOne: async () => existing, findOneAndUpdate: async (_, update) => { saved = update.$set; return saved; } },
    LeaveRequest: { findOne: () => ({ lean: async () => null }) },
    require: () => ({ exists: async filter => approved && filter.fromDate.$lte >= new Date('2026-10-23') && filter.toDate.$gte <= new Date('2026-10-27') }),
    getUserId: user => user.id,
    getStartOfDay: () => new Date(day),
    isSuperAdmin: () => false, isTimesheetFilledForToday: async () => true,
    VALID_WORK_MODES: ['office', 'work_from_home'],
    reverseGeocode: async () => 'Home', getDeviceType: () => 'mobile',
    verifyOfficeLocation: () => { officeChecks++; return { isWithinOffice: false, distance: 9000 }; },
    createServiceError: (message, statusCode) => Object.assign(new Error(message), { statusCode }),
    console: { log: () => {} },
  };
  vm.runInNewContext(part('const getWorkMode =', 'const getMinutesBetween =') + part('const buildLocationObject =', 'const checkIn =') + part('const checkIn =', 'const getTodayAttendance =') + '\nthis.checkIn = checkIn; this.checkOut = checkOut;', context);
  return { context, saved: () => saved, officeChecks: () => officeChecks };
}
const body = { latitude: 28.5, longitude: 77.2, accuracy: 10 }, user = { id: 'employee', name: 'Example', email: 'employee@example.test' };
test('office-default employee with approved WFH checks in from home and saves WFH mode', async () => {
  const app = harness(true);
  await app.context.checkIn(body, user);
  assert.equal(app.officeChecks(), 0);
  assert.equal(app.saved().workMode, 'work_from_home');
  assert.equal(app.saved().attendanceSource, 'work_from_home');
});
test('WFH checkout uses approved mode even when check-in was stored as office', async () => {
  const app = harness(true, '2026-10-23', true);
  await app.context.checkOut(body, user);
  assert.equal(app.officeChecks(), 0);
  assert.equal(app.saved().workMode, 'work_from_home');
  assert.equal(app.saved().attendanceStatus, 'checked_out');
});
test('unapproved and expired WFH retain the office geofence', async () => {
  for (const app of [harness(false), harness(true, '2026-10-28')]) {
    await assert.rejects(app.context.checkIn({ ...body, workMode: 'work_from_home' }, user), /outside office location/);
    assert.equal(app.officeChecks(), 1);
    assert.equal(app.saved(), undefined);
  }
});
