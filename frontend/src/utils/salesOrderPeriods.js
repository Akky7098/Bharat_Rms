export const getSalesOrderPeriods = (now = new Date()) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [year, month] = today.split('-').map(Number);
  const prefix = today.slice(0, 7);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { today: { fromDate: today, toDate: today }, month: { fromDate: `${prefix}-01`, toDate: `${prefix}-${lastDay}` } };
};
