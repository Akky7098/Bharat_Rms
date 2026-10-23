import { getHealth, REQUIRED_WORK_MINUTES } from './attendanceHelpers';
const date = '2026-10-23';
const complete = { checkIn: { time: '2026-10-23T04:00:00Z' }, checkOut: { time: '2026-10-23T13:00:00Z' }, totalWorkingMinutes: REQUIRED_WORK_MINUTES };
test('attendance display separates present, absent, checkout and regularization states', () => {
  expect(getHealth(complete, date, date).className).toBe('complete');
  expect(getHealth({ attendanceStatus: 'absent' }, date, date).className).toBe('absent');
  expect(getHealth({ checkIn: complete.checkIn }, date, date).className).toBe('warning');
  expect(getHealth({ regularization: { status: 'pending' } }, date, date).className).toBe('pending');
  expect(getHealth(null, '2026-10-24', date).className).toBe('future');
  expect(getHealth({ attendanceStatus: 'absent' }, '2026-10-25', date).className).toBe('off');
});
test('team calendar considers every saved employee record, not just the first', () => {
  expect(getHealth([complete, complete], date, date).className).toBe('complete');
  expect(getHealth([complete, { checkIn: complete.checkIn }], date, date).className).toBe('warning');
  expect(getHealth([complete, { attendanceStatus: 'absent' }], date, date).className).toBe('absent');
  expect(getHealth([], '2026-10-24', date).className).toBe('future');
});
test('approved regularization uses the approved times for display', () => {
  expect(getHealth({ totalWorkingMinutes: REQUIRED_WORK_MINUTES, regularization: { status: 'approved', requestedCheckIn: complete.checkIn.time, requestedCheckOut: complete.checkOut.time } }, date, date).className).toBe('complete');
});

test('past missing checkout is light red while today stays in progress', () => {
  expect(getHealth({ checkIn: complete.checkIn }, date, '2026-10-24').className).toBe('missed-checkout');
  expect(getHealth({ checkIn: complete.checkIn }, date, date).className).toBe('warning');
});
test('inactive employees cannot turn the team calendar red', () => {
  const inactive = { attendanceStatus: 'absent', employeeId: { status: 'inactive' } };
  expect(getHealth([complete, inactive], date, date).className).toBe('complete');
});
test('nine completed hours are green even when stored working minutes are missing', () => {
  expect(getHealth({ checkIn: complete.checkIn, checkOut: complete.checkOut }, date, date).className).toBe('complete');
});

test('approved short leave is shown distinctly without changing worked hours', () => {
  const record = { ...complete, checkOut: { time: '2026-10-23T12:00:00Z' }, totalWorkingMinutes: 480, shortLeave: { status: 'approved' } };
  expect(getHealth(record, date, date).label).toBe('Short Leave Approved');
  expect(record.totalWorkingMinutes).toBe(480);
});
