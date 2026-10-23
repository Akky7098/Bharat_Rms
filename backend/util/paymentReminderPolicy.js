const dayKey = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
const dayNumber = date => Date.parse(`${dayKey(date)}T00:00:00Z`) / 86400000;
const daysLate = (invoice, now = new Date()) => {
  const due = invoice.revisedPaymentDueDate || invoice.paymentDueDate;
  return due && Number.isFinite(new Date(due).getTime()) ? dayNumber(now) - dayNumber(due) : null;
};
const reminderType = (invoice, now = new Date(), force = false) => {
  if (Number(invoice.pendingAmount) <= 0 || invoice.paymentStatus === 'paid') return null;
  const last = invoice.paymentReminder?.lastReminderSentAt;
  if (last && dayKey(last) === dayKey(now)) return null;
  const days = daysLate(invoice, now);
  if (days === null) return null;
  if (days === -2 && !invoice.paymentReminder?.beforeDueDateSent) return 'before_due_date';
  if (days === 0 && !invoice.paymentReminder?.dueDateSent) return 'due_date';
  if (days > 0 && (force || days % 3 === 0)) return 'overdue';
  return null;
};
const accountPaymentState = (invoices, now = new Date()) => {
  const outstanding = invoices.filter(invoice => Number(invoice.pendingAmount) > 0 && invoice.paymentStatus !== 'paid')
    .slice().sort((a, b) => {
      const ageA = daysLate(a, now) ?? -Infinity;
      const ageB = daysLate(b, now) ?? -Infinity;
      if (ageA !== ageB) return ageA > ageB ? -1 : 1;
      return Number(b.pendingAmount) - Number(a.pendingAmount) || String(a.invoiceNumber || '').localeCompare(String(b.invoiceNumber || ''));
    });
  const oldestDays = outstanding.length ? daysLate(outstanding[0], now) : null;
  return { outstanding, oldestDays, overdueDays: Math.max(0, oldestDays || 0) };
};
module.exports = { dayKey, daysLate, reminderType, accountPaymentState };
