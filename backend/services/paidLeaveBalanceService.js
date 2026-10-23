const Attendance = require('../model/attendanceModel');
const Leave = require('../model/leaveRequestModel');
const { dateKey, units, entitlement, accrualStart } = require('../util/paidLeavePolicy');
module.exports = async ({ employeeId, monthDate = new Date(), excludeLeaveId }) => {
  const year = Number(dateKey(monthDate).slice(0, 4));
  const start = new Date(`${year}-01-01T00:00:00Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00Z`);
  const earnedFrom = accrualStart(year);
  const records = await Attendance.find({ employeeId, attendanceDate: { $gte: earnedFrom, $lt: end, $lte: new Date() }, 'checkIn.time': { $exists: true }, 'checkOut.time': { $exists: true }, attendanceSource: { $ne: 'leave' } }).select('attendanceDate checkIn checkOut').lean();
  const fullDays = new Set(records.filter(record => (new Date(record.checkOut.time) - new Date(record.checkIn.time)) / 60000 >= 540).map(record => dateKey(record.attendanceDate))).size;
  const filter = { employeeId, leaveType: 'paid_leave', status: { $in: ['pending', 'approved'] }, isActive: true, fromDate: { $gte: start, $lt: end } };
  if (excludeLeaveId) filter._id = { $ne: excludeLeaveId };
  const leaves = await Leave.find(filter).select('status fromDate toDate duration').lean();
  const approvedPaidLeave = leaves.filter(item => item.status === 'approved').reduce((sum, item) => sum + units(item), 0);
  const pendingPaidLeave = leaves.filter(item => item.status === 'pending').reduce((sum, item) => sum + units(item), 0);
  const earnedPaidLeave = entitlement(fullDays);
  return { year, accrualStartDate: dateKey(earnedFrom), annualPaidLeaveEntitlement: 12, monthlyPaidLeaveEntitlement: 1, completedAttendanceDays: fullDays, earnedPaidLeave, approvedPaidLeave, pendingPaidLeave, availablePaidLeave: Math.max(0, earnedPaidLeave - approvedPaidLeave - pendingPaidLeave), daysUntilNextPaidLeave: earnedPaidLeave === 12 ? 0 : 20 - fullDays % 20, lossOfPayAvailable: true };
};
