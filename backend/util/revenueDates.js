// Approved revenue is recognized on manager approval, consistently across pages.
const APPROVED_REVENUE_DATE_FIELD = 'managerApproval.approvedAt';
const getISTDateRange = (fromDate, toDate) => {
  const range = {};
  if (fromDate) range.$gte = new Date(`${fromDate}T00:00:00.000+05:30`);
  if (toDate) range.$lte = new Date(`${toDate}T23:59:59.999+05:30`);
  return range;
};
const getISTRevenuePeriods = (now = new Date()) => {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [year, month] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = day.slice(0, 7);
  return { today: getISTDateRange(day, day), month: getISTDateRange(`${prefix}-01`, `${prefix}-${lastDay}`) };
};
module.exports = { APPROVED_REVENUE_DATE_FIELD, getISTDateRange, getISTRevenuePeriods };
