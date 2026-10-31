// Composable, read-only ledger reports. All Mongo fields/operators come from this registry.
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const definitions = Object.freeze({
  invoices: { date: 'invoiceDate', amount: 'invoiceValue', balance: 'pendingAmount', title: 'Dispatch invoice payments' },
  receipts: { array: 'paymentHistory', date: 'receivedAt', amount: 'amount', title: 'Payments received — Dispatch history' },
});
function planLedgerReport(parsed) {
  if (parsed.intent !== 'receivables') return null;
  const text = parsed.text;

  const numericFilters = [];
  const numericPattern = /\b(?:(outstanding amount|outstanding|pending amount|invoice value|invoice amount|received amount|amount)\s+)?(above|over|more than|greater than|below|under|less than|at least|at most)\s*(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)\s*(lakh|lac|crore|cr|k|thousand)?\b/g;
  for (const m of text.matchAll(numericPattern)) numericFilters.push({ field: m[1] || 'amount', op: ['above', 'over', 'more than', 'greater than'].includes(m[2]) ? '$gt' : ['below', 'under', 'less than'].includes(m[2]) ? '$lt' : m[2] === 'at least' ? '$gte' : '$lte', value: Number(m[3].replaceAll(',', '')) * ({ lakh: 100000, lac: 100000, crore: 10000000, cr: 10000000, k: 1000, thousand: 1000 }[m[4]] || 1) });
  const numericOnly = parsed.validationError?.startsWith('That numeric filter') && numericFilters.length > 0;
  if ((parsed.validationError && !numericOnly) || parsed.location || parsed.entities.mill || parsed.entities.allMills || parsed.entities.grade) return null;
  if (/compare|why|profit|margin|gst|tax|sort|breakdown|between\s+\d+\s+(?:lakh|crore)/.test(text)) return null;
  if (/group by/.test(text) && !parsed.groupBy) return { error: 'Group payments by salesperson or customer. Other grouping fields are not supported.' };
  const kind = /received|collection|receipts?|payment history|payment updates/.test(text) ? 'receipts' : 'invoices';
  if (/written[_ ]off|disputed|\bupi\b|\bcash\b|\bcheque\b/.test(text)) return { error: 'Dispatch does not store disputed/written-off status or payment mode. Ask for received, paid, partial, outstanding or overdue payments.' };
  if (kind === 'receipts' && numericFilters.some(f => /invoice|pending|outstanding/.test(f.field))) return { error: 'For receipt reports, filter the received amount. Invoice value and outstanding belong to invoice reports.' };
  if (kind === 'receipts' && /overdue|pending|outstanding/.test(text)) return { error: 'Do you want current outstanding invoices or payment receipts? Please ask for one of these reports.' };
  const invoiceNumber = text.match(/\binvoice\s+(?:number\s+|no\.?\s*)?["“]?([a-z]+[a-z0-9]*[/-][a-z0-9/-]+)/i)?.[1];
  const dateField = kind === 'invoices' && /due date|fell due|due during|due between/.test(text) ? 'dueDate' : definitions[kind].date;
  return {
    groupBy: parsed.groupBy, kind, dateField, invoiceNumber, company: parsed.entities.company, period: parsed.period,
    status: kind === 'invoices' ? /written off/.test(text) ? 'written_off' : /disputed/.test(text) ? 'disputed' : /overdue/.test(text) ? 'overdue' : /partial/.test(text) ? 'partial' : /\bpaid\b/.test(text) ? 'paid' : /pending|outstanding/.test(text) ? 'outstanding' : null : null,
    numericFilters, numericOnly,
    paymentMode: /\bupi\b/.test(text) ? 'upi' : /\bcash\b/.test(text) ? 'cash' : /\bcheque\b/.test(text) ? 'cheque' : null,
    mode: /\bcount\b|how many/.test(text) ? 'count' : /\b(total|sum)\b/.test(text) && !/detail|list/.test(text) ? 'total' : 'details',
    customerDetails: /customer|contact/.test(text), limit: 50
  };
}
function compileLedgerReport(plan, { user, employeeId, now = new Date() }) {
  const def = definitions[plan.kind]; if (!def) throw new Error('Unknown Dispatch payment report.');
  const owner = { isActive: true, dispatchStatus: { $ne: 'cancelled' } };
  if (user.role !== 'super_admin' || employeeId) owner.salesPersonId = employeeId || user._id;
  if (plan.company) owner.companyName = { $regex: escape(plan.company), $options: 'i' };
  if (plan.invoiceNumber) owner.invoiceNumber = { $regex: `^${escape(plan.invoiceNumber)}$`, $options: 'i' };
  const path = field => plan.kind === 'receipts' ? `paymentHistory.${field}` : field;
  const child = {}, numericClauses = [];
  const dateField = plan.dateField === 'dueDate' ? 'effectiveDueDate' : path(plan.dateField);
  if (!plan.period.defaulted && !plan.period.allTime) child[dateField] = { $gte: new Date(`${plan.period.dateFrom}T00:00:00+05:30`), $lte: new Date(`${plan.period.dateTo}T23:59:59.999+05:30`) };
  for (const filter of plan.numericFilters || []) {
    const field = plan.kind === 'receipts' ? path('amount') : filter.field.startsWith('outstanding') || filter.field === 'pending amount' ? 'pendingAmount' : filter.field === 'received amount' ? 'paidAmount' : 'invoiceValue';
    numericClauses.push({ [field]: { [filter.op]: filter.value } });
  }
  if (plan.status === 'overdue') {
    const today = new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
    child.pendingAmount = { $gt: 0 }; child.effectiveDueDate = { ...(child.effectiveDueDate || {}), $ne: null, $lt: new Date(`${today}T00:00:00+05:30`) };
  } else if (plan.status === 'outstanding') child.pendingAmount = { $gt: 0 };
  else if (plan.status === 'partial') { child.pendingAmount = { $gt: 0 }; child.paidAmount = { $gt: 0 }; }
  else if (plan.status === 'paid') { child.pendingAmount = { $lte: 0 }; child.paymentStatus = 'paid'; }
  const project = {
    _id: 0, salesPersonId: 1, salesPersonName: 1, companyName: 1, contactPersonName: 1, contactPersonEmail: 1, contactPersonNumber: 1,
    invoiceNumber: 1, invoiceDate: 1, dueDate: '$effectiveDueDate', invoiceAmount: '$invoiceValue', pendingAmount: 1, paidAmount: 1, status: '$paymentStatus',
    receiptDate: '$paymentHistory.receivedAt', amount: '$paymentHistory.amount'
  };
  const pipeline = [{ $match: owner }, { $addFields: { effectiveDueDate: { $ifNull: ['$revisedPaymentDueDate', '$paymentDueDate'] } } }];
  if (def.array) pipeline.push({ $unwind: `$${def.array}` });
  pipeline.push({ $match: numericClauses.length ? { $and: [child, ...numericClauses] } : child }, {
    $facet: {
      summary: [{ $group: { _id: null, count: { $sum: 1 }, customerIds: { $addToSet: '$companyName' }, amount: { $sum: `$${path(def.amount)}` }, outstanding: { $sum: def.balance ? `$${def.balance}` : 0 }, paid: { $sum: plan.kind === 'invoices' ? '$paidAmount' : 0 } } }, { $project: { _id: 0, count: 1, customers: { $size: '$customerIds' }, amount: 1, outstanding: 1, paid: 1 } }],
      records: plan.mode === 'details' ? [{ $sort: { [dateField]: -1, invoiceNumber: 1 } }, { $limit: plan.limit }, { $project: project }] : [{ $match: { $expr: false } }]
    }
  });
  if (plan.groupBy) {
    const field = plan.groupBy === 'salesperson' ? 'salesPersonId' : 'companyName';
    pipeline[pipeline.length - 1].$facet.groups = [{ $group: { _id: `$${field}`, name: { $first: plan.groupBy === 'salesperson' ? '$salesPersonName' : '$companyName' }, count: { $sum: 1 }, amount: { $sum: `$${path(def.amount)}` }, outstanding: { $sum: def.balance ? `$${def.balance}` : 0 } } }, { $sort: { outstanding: -1, amount: -1, _id: 1 } }, { $limit: 51 }];
  }
  return pipeline;
}

const money = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const date = d => d ? new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not recorded';
async function executeLedgerReport(plan, { user, employeeId, model, now }) {
  if (plan.error) return { answer: plan.error };
  const [result] = await model.aggregate(compileLedgerReport(plan, { user, employeeId, now })).option({ maxTimeMS: 15000 });
  const s = result?.summary?.[0] || { count: 0, customers: 0, amount: 0, outstanding: 0 };
  const period = plan.period.defaulted || plan.period.allTime ? 'all recorded dates' : `${plan.period.dateFrom} to ${plan.period.dateTo}`;
  let answer = `### ${definitions[plan.kind].title}${plan.status ? ' — ' + plan.status : ''}\nSource: Dispatch module\nDate filter: ${plan.kind === 'receipts' ? 'paymentHistory.receivedAt' : plan.dateField === 'dueDate' ? 'revisedPaymentDueDate or paymentDueDate' : plan.dateField} (${period})\n${plan.kind === 'invoices' ? 'Balances and overdue status are current, not a historical balance snapshot.' : 'Amounts are dated Dispatch payment-history entries; older paidAmount totals without history cannot be assigned to a receipt period.'}\n\nMatching ${plan.kind}: ${s.count}\nCustomers: ${s.customers}\n${plan.kind === 'invoices' ? 'Invoice value' : 'Received amount'}: ${money(s.amount)}`;
  if (plan.kind === 'invoices') answer += `\nTotal paid (current): ${money(s.paid)}\nCurrent outstanding: ${money(s.outstanding)}`;
  if (plan.company) answer += `\nCompany filter: ${plan.company}`;
  for (const f of plan.numericFilters || []) answer += `\nAmount filter: ${f.field} ${f.op.slice(1)} ${money(f.value)}`;
  if (plan.paymentMode) answer += `\nPayment mode filter: ${plan.paymentMode}`;
  if (plan.invoiceNumber) answer += `\nInvoice filter: ${plan.invoiceNumber}`;
  const renderRecord = r => {
    let detail = '';
    detail += `\n\n### ${r.companyName} — ${plan.kind === 'invoices' ? r.invoiceNumber : `Payment on ${r.invoiceNumber || 'invoice'}`}\n`;
    detail += plan.kind === 'invoices' ? `Invoice date: ${date(r.invoiceDate)}\nDue date: ${date(r.dueDate)}\nInvoice value: ${money(r.invoiceAmount)}\nOutstanding: ${money(r.pendingAmount)}` : `Received date: ${date(r.receiptDate)}\nReceived: ${money(r.amount)}`;
    if (plan.customerDetails) detail += `\nContact: ${r.contactPersonName || 'Not recorded'}\nPhone: ${r.contactPersonNumber || 'Not recorded'}\nEmail: ${r.contactPersonEmail || 'Not recorded'}`;
    return detail;
  };
  if (plan.groupBy) {
    answer += `\n\nGrouped by ${plan.groupBy}.`;
    for (const g of (result?.groups || []).slice(0, 50)) {
      answer += `\n\n### ${g.name || (g._id || (plan.groupBy === 'salesperson' ? 'Unassigned salesperson' : 'Unnamed customer'))}\nMatching ${plan.kind}: ${g.count}\n${plan.kind === 'invoices' ? 'Invoice value' : 'Received amount'}: ${money(g.amount)}`;
      if (plan.kind === 'invoices') answer += `\nOutstanding: ${money(g.outstanding)}`;
      if (plan.mode === 'details') for (const r of result?.records || []) if (String(plan.groupBy === 'salesperson' ? r.salesPersonId : r.companyName) === String(g._id)) answer += renderRecord(r);
    }
    if (result?.groups?.length > 50) answer += '\n\nShowing first 50 groups; narrow the filters for more.';
  } else if (plan.mode === 'details') for (const r of result?.records || []) answer += renderRecord(r);
  if (plan.mode === 'details' && s.count > plan.limit) answer += `\n\nShowing ${plan.limit} of ${s.count} matching records. Totals include every matching record; narrow the period or company to view the rest.`;
  if (!s.count) answer += plan.kind === 'receipts' ? '\n\nNo dated Dispatch payment-history entries match. Older paidAmount totals without payment history cannot be assigned to a receipt period.' : '\n\nNo matching Dispatch records.';
  return { answer, toolsUsed: [{ name: `ledger_${plan.kind}` }], model: 'database-only', provider: 'local' };
}
module.exports = { definitions, planLedgerReport, compileLedgerReport, executeLedgerReport };
