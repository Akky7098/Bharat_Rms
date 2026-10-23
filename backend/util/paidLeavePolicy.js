const dateKey = date => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const leaveDates = (from, to) => {
  const dates = [];
  const start = dateKey(from), end = dateKey(to);
  for (let date = new Date(`${start}T00:00:00Z`); dateKey(date) <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    if (date.getUTCDay() !== 0) dates.push(new Date(date));
    if (dates.length > 366) throw new Error('Leave range is too long.');
  }
  return dates;
};
const units = leave => leaveDates(leave.fromDate, leave.toDate).length * (leave.duration === 'full_day' ? 1 : 0.5);
const entitlement = days => Math.min(12, 1 + Math.floor(days / 20));
// Fixed rollout date: historical attendance must not retroactively earn new-policy leave.
const DEFAULT_POLICY_START_DATE = '2026-10-23';
const accrualStart = (year, configuredDate = process.env.PAID_LEAVE_POLICY_START_DATE || DEFAULT_POLICY_START_DATE) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(configuredDate) ||
      !Number.isFinite(new Date(`${configuredDate}T00:00:00Z`).getTime()) ||
      new Date(`${configuredDate}T00:00:00Z`).toISOString().slice(0, 10) !== configuredDate) {
    throw new Error('PAID_LEAVE_POLICY_START_DATE must be a valid YYYY-MM-DD date.');
  }
  return new Date(`${configuredDate > `${year}-01-01` ? configuredDate : `${year}-01-01`}T00:00:00Z`);
};
module.exports = { dateKey, leaveDates, units, entitlement, accrualStart, DEFAULT_POLICY_START_DATE };
