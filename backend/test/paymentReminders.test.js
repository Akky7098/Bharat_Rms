const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const policy = require('../util/paymentReminderPolicy');
const now = new Date('2026-10-23T06:00:00Z');
const invoice = { companyName: 'Example & Co', contactPersonEmail: 'accounts@example.com', contactPersonName: '<Customer>', invoiceNumber: '<INV-1>', invoiceValue: 1000, pendingAmount: 500, paymentDueDate: '2026-10-17T06:00:00Z', paymentReminder: {} };
function mailService() {
  const sent = [];
  const context = { module: { exports: {} }, Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }, process: { env: {} }, require: name => {
    if (name === '../util/mailTransporter') return { sendMail: async message => { sent.push(message); return { messageId: 'sample' }; } };
    if (name === '../util/paymentReminderPolicy') return policy;
    throw new Error(name);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/dispatchReminderMailService.js'), 'utf8'), context);
  return { ...context.module.exports, sent };
}
test('reminders follow days 3, 6, 9 and every three days using IST calendar dates', () => {
  for (const [days, expected] of [[-2, 'before_due_date'], [0, 'due_date'], [1, null], [2, null], [3, 'overdue'], [4, null], [5, null], [6, 'overdue'], [8, null], [9, 'overdue'], [10, null], [12, 'overdue'], [15, 'overdue']]) {
    assert.equal(policy.reminderType({ ...invoice, paymentDueDate: new Date(now - days * 86400000) }, now), expected);
  }
  assert.equal(policy.dayKey('2026-10-22T20:00:00Z'), '2026-10-23');
  assert.equal(policy.reminderType({ ...invoice, paymentReminder: { lastReminderSentAt: '2026-10-22T20:00:00Z' } }, now), null);
  assert.equal(policy.reminderType({ ...invoice, paymentStatus: 'paid' }, now, true), null);
  assert.equal(policy.reminderType({ ...invoice, revisedPaymentDueDate: '2026-10-25T06:00:00Z' }, now), 'before_due_date');
});
test('stages escalate and statements escape customer input and include all balances', async () => {
  const mail = mailService();
  const second = { ...invoice, invoiceNumber: 'INV-2', pendingAmount: 250, revisedPaymentDueDate: '2026-10-30' };
  const html = mail.buildReminderTemplate(invoice, 'overdue', 6, [invoice, second], now);
  assert.match(html, /Urgent: Payment Overdue/);
  assert.match(html, /#b91c1c/);
  assert.match(html, /&lt;Customer&gt;/);
  assert.match(html, /INV-2/);
  assert.match(html, /750/);
  assert.match(html, /30 Oct 2026/);
  assert.match(html, /may apply/);
  assert.match(mail.getReminderMeta('overdue', 9).title, /Critical/);
  await mail.sendPaymentReminderEmail(invoice, 'overdue', 6, [invoice, second]);
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].inReplyTo, undefined);
  assert.equal(mail.sent[0].references, undefined);
  assert.match(mail.sent[0].subject, /6 days overdue/);
});

test('company/contact consolidation and database claims prevent repeat sends', async () => {
  const records = [invoice, { ...invoice, invoiceNumber: 'INV-2' }].map((item, i) => ({ ...item, _id: String(i), paymentDueDate: new Date(Date.now() - 3 * 86400000), paymentReminder: {}, save: async () => {} }));
  const claims = new Map();
  const mails = [];
  const model = {
    create: async data => { if (claims.has(data._id)) throw Object.assign(new Error('duplicate'), { code: 11000 }); claims.set(data._id, data); },
    updateOne: async (filter, update) => { Object.assign(claims.get(filter._id), update.$set); },
  };
  const context = { module: { exports: {} }, console: { log() {}, error() {} }, require: name => {
    if (name === 'crypto') return require('node:crypto');
    if (name === '../model/paymentReminderDeliveryModel') return model;
    if (name === '../util/paymentReminderPolicy') return policy;
    if (name === '../model/dispatchModel') return { updateMany: async () => ({}), find: () => ({ sort: async () => records }) };
    if (name === './dispatchReminderMailService') return { sendPaymentReminderEmail: async (...args) => { mails.push(args); return { messageId: 'test' }; } };
    if (name === './notificationService') return {};
    if (name === './dispatchWhatsappService') return { sendPaymentReminderWhatsapp: async () => ({ status: 'failed' }) };
    throw new Error(name);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/dispatchReminderService.js'), 'utf8'), context);
  const run = () => context.module.exports.processPaymentReminders();
  records[0].paymentDueDate = new Date(Date.now() - 19 * 86400000);
  records[1].paymentDueDate = new Date();
  await run();
  assert.equal(mails.length, 0, 'a new due-today invoice must not reset the oldest debt cadence');
  records[0].paymentDueDate = new Date(Date.now() - 18 * 86400000);
  const results = await Promise.all([run(), run()]);
  assert.equal(results.reduce((sum, result) => sum + result.whatsapp.failed, 0), 1);
  assert.equal(mails.length, 1, 'email is still sent when WhatsApp fails');
  assert.equal(mails[0][1], 'overdue');
  assert.equal(mails[0][2], 18);
  assert.equal(mails[0][3].length, 2);
  assert.equal([...claims.values()][0].status, 'sent');
  await run();
  assert.equal(mails.length, 1);
});

test('critical notices have a distinct red credit-risk panel starting on day 9', () => {
  const mail = mailService();
  const regular = mail.buildReminderTemplate(invoice, 'overdue', 6, [invoice], now);
  const oldInvoice = { ...invoice, paymentDueDate: '2026-10-14T06:00:00Z' };
  const critical = mail.buildReminderTemplate(invoice, 'overdue', 9, [oldInvoice], now);
  assert.doesNotMatch(regular, /CREDIT FACILITY AT RISK/);
  assert.match(critical, /CREDIT FACILITY AT RISK/);
  assert.match(critical, /credit facility being blocked/);
  assert.match(critical, /subject to review/);
  assert.match(critical, /IMMEDIATE SETTLEMENT REQUIRED/);
  assert.equal(mail.getReminderMeta('overdue', 8).critical, false);
  assert.equal(mail.getReminderMeta('overdue', 9).critical, true);
  assert.equal(mail.getReminderMeta('overdue', 12).critical, true);
  assert.match(mail.buildReminderSubject(invoice, 'overdue', 3, [{ ...invoice, paymentDueDate: '2026-10-20T06:00:00Z' }], now), /^ACTION REQUIRED:/);
  assert.match(mail.buildReminderSubject(invoice, 'overdue', 6, [invoice], now), /^URGENT PAYMENT:/);
  assert.match(mail.buildReminderSubject(invoice, 'overdue', 9, [oldInvoice], now), /^CRITICAL PAYMENT OVERDUE:.*further credit at risk/);
});

test('company invoices sort oldest first with balance tie-breaks and unknown dates last', () => {
  const item = (id, age, amount = 100) => ({ ...invoice, invoiceNumber: id, pendingAmount: amount, paymentDueDate: age === null ? null : new Date(now - age * 86400000) });
  const invoices = [item('future-7', -7), item('today', 0), item('late-3', 3), item('late-18-small', 18), item('late-18-large', 18, 500), item('future-2', -2), item('unknown', null), { ...item('paid', 30), paymentStatus: 'paid' }];
  const state = policy.accountPaymentState(invoices, now);
  assert.deepEqual(state.outstanding.map(item => item.invoiceNumber), ['late-18-large', 'late-18-small', 'late-3', 'today', 'future-2', 'future-7', 'unknown']);
  assert.equal(invoices[0].invoiceNumber, 'future-7');
  const mail = mailService();
  const html = mail.buildReminderTemplate(invoices[1], 'due_date', 0, invoices, now);
  assert.match(html, /OLDEST INVOICE: 18 DAYS OVERDUE/);
  assert.match(html, /Critical Payment Overdue/);
  assert.ok(html.indexOf('late-18-large') < html.indexOf('late-3'));
  assert.match(mail.buildReminderSubject(invoices[1], 'due_date', 0, invoices, now), /^CRITICAL PAYMENT OVERDUE:.*18 days overdue/);
  const afterPayment = invoices.filter(item => !item.invoiceNumber.startsWith('late-18'));
  assert.match(mail.buildReminderSubject(invoices[1], 'due_date', 0, afterPayment, now), /^ACTION REQUIRED:.*3 days overdue/);
});
