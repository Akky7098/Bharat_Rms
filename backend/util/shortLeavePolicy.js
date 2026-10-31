// Office hours and requested clock times are in Asia/Kolkata.
const minuteOfDay = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
const validateWindow = (fromDate, startTime, endTime, { allowPast = false, now = new Date() } = {}) => {
  const start = minuteOfDay(startTime), end = minuteOfDay(endTime);
  const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
  if (!Number.isFinite(start) || !Number.isFinite(end)) fail('Choose valid short-leave start and end times (HH:mm, IST).');
  if (start < 570 || end > 1110 || end <= start) fail('Short leave must be within 9:30 AM–6:30 PM IST, with end time after start time.');
  if (end - start >= 540) fail('For the whole office day, apply for paid leave or Loss of Pay.');
  if (new Date(fromDate).getUTCDay() === 0) fail('Short leave cannot be requested on Sunday.');
  const dateKey = new Date(fromDate).toISOString().slice(0, 10);
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (!allowPast && dateKey < today) fail('Planned short leave must be for today or a future date. Use recorded attendance for a past date.');
  return { shortLeaveMode: 'planned', startTime, endTime, shortLeaveMinutes: end - start };
};
const attendanceData = request => ({ status: 'approved', requestId: request._id, approvedBy: request.decidedBy, approvedAt: request.decidedAt,
  ...(request.shortLeaveMode ? { mode: request.shortLeaveMode } : {}),
  ...(request.startTime ? { startTime: request.startTime, endTime: request.endTime, minutes: request.shortLeaveMinutes } : {}),
});
module.exports = { validateWindow, attendanceData };
