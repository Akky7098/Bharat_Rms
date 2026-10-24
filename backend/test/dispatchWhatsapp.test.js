const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../util/paymentReminderPolicy');
const now = new Date('2026-10-24T06:00:00Z');
const invoice = { _id: 'dispatch-1', companyName: 'Example Engineering', contactPersonName: 'Accounts Team', contactPersonNumber: '9912345678', invoiceNumber: 'BSS/1042', invoiceDate: '2026-10-01', invoiceValue: 118000, pendingAmount: 118000, paymentDueDate: '2026-10-15', paymentTerms: '30 days from invoice', dispatchDate: '2026-10-01', deliveredAt: '2026-10-03', dispatchQty: 500, materialDescription: 'EN353 steel', poNumber: 'PO-52', lrNumber: 'LR-1042' };
function fixture() {
  const mailModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/dispatchReminderMailService.js'), 'utf8'), { module: mailModule, process: { env: {} }, require: name => name === '../util/paymentReminderPolicy' ? policy : {} });
  const claims = new Map(), sent = [], module = { exports: {} }, env = {};
  let fails = false;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/dispatchWhatsappService.js'), 'utf8'), {
    module, process: { env }, console: { error() {} },
    require: name => {
      if (name === 'crypto') return require('node:crypto');
      if (name === '../util/paymentReminderPolicy') return policy;
      if (name === './dispatchReminderMailService') return mailModule.exports;
      if (name === '../model/dispatchWhatsappDeliveryModel') return {
        create: async row => { if (claims.has(row._id)) throw Object.assign(new Error('duplicate'), { code: 11000 }); claims.set(row._id, { ...row }); },
        updateOne: async (filter, update) => { const row = claims.get(filter._id); if (row && (!filter.status || row.status === filter.status)) Object.assign(row, update.$set); },
      };
      if (name === '../util/baileysClient') return {
        normalizePhoneJid: value => `${value.length === 10 ? '91' : ''}${value}@s.whatsapp.net`,
        sendTextToPhone: async (number, message) => { if (fails) throw new Error('Mock disconnected'); sent.push({ number, message }); return { key: { id: `message-${sent.length}` } }; },
      };
      throw new Error(name);
    },
  });
  return { ...module.exports, claims, sent, env, fail: () => { fails = true; } };
}
test('dispatch and delivery use customer mobile, spaced invoice details and distinct claims', async () => {
  const api = fixture();
  await Promise.all([api.sendDispatchWhatsapp(invoice, 'dispatched'), api.sendDispatchWhatsapp(invoice, 'dispatched')]);
  assert.equal(api.sent.length, 1);
  assert.equal(api.sent[0].number, invoice.contactPersonNumber);
  assert.match(api.sent[0].message, /🚚 \*Material Dispatched\*/);
  assert.ok(api.sent[0].message.includes(`Dear ${invoice.contactPersonName},`));
  assert.match(api.sent[0].message, /\n\n\*Invoice details\*\nInvoice: BSS\/1042/);
  await api.sendDispatchWhatsapp(invoice, 'delivered');
  assert.equal(api.sent.length, 2);
  assert.match(api.sent[1].message, /✅ \*Material Delivered\*/);
  assert.ok(api.sent[1].message.includes(`Dear ${invoice.contactPersonName},`));
});
test('all payment stages match email wording and critical uses red warning emoji', () => {
  const api = fixture();
  for (const [days, type, title] of [[-2, 'before_due_date', 'Payment Due Soon'], [0, 'due_date', 'Payment Due Today'], [3, 'overdue', 'Payment Overdue'], [6, 'overdue', 'Urgent: Payment Overdue'], [9, 'overdue', 'Critical Payment Overdue']]) {
    const row = { ...invoice, paymentDueDate: new Date(now - days * 86400000) };
    const message = api.buildPaymentWhatsappMessages(row, type, days, [row], now).join('\n\n');
    assert.ok(message.includes(title));
    assert.match(message, /\n\n\*Outstanding invoices\*\n\n/);
    assert.match(message, /Outstanding: ₹1,18,000/);
    if (days === 9) { assert.match(message, /^🔴 🚨/); assert.match(message, /credit facility being blocked, subject to review/); }
  }
});
test('payment recipient/day claims prevent duplicates across email groups and exclude paid invoices', async () => {
  const api = fixture();
  const paid = { ...invoice, invoiceNumber: 'PAID', pendingAmount: 0, paymentStatus: 'paid' };
  await api.sendPaymentReminderWhatsapp(invoice, 'overdue', 9, [invoice, paid], now);
  await api.sendPaymentReminderWhatsapp({ ...invoice, contactPersonEmail: 'another@example.com' }, 'overdue', 9, [invoice], now);
  assert.equal(api.sent.length, 1);
  assert.doesNotMatch(api.sent[0].message, /PAID/);
  assert.equal([...api.claims.values()][0].status, 'sent');
});
test('missing phones, disabled channel and connection failures cannot throw into business flow', async () => {
  const api = fixture();
  assert.equal((await api.sendDispatchWhatsapp({ ...invoice, contactPersonNumber: '' }, 'dispatched')).status, 'skipped');
  api.env.DISPATCH_CUSTOMER_WHATSAPP_ENABLED = 'false';
  assert.equal((await api.sendDispatchWhatsapp(invoice, 'dispatched')).status, 'skipped');
  delete api.env.DISPATCH_CUSTOMER_WHATSAPP_ENABLED;
  api.fail();
  assert.equal((await api.sendDispatchWhatsapp(invoice, 'dispatched')).status, 'failed');
  assert.equal([...api.claims.values()][0].error, 'Mock disconnected');
  assert.equal((await api.sendDispatchWhatsapp(invoice, 'dispatched')).reason, 'already_claimed');
});
test('large company statements split without dropping invoice details', () => {
  const api = fixture();
  const rows = Array.from({ length: 40 }, (_, i) => ({ ...invoice, invoiceNumber: `INV-${i}` }));
  const messages = api.buildPaymentWhatsappMessages(invoice, 'overdue', 9, rows, now);
  assert.ok(messages.length > 1);
  assert.ok(messages.every(message => message.length < 5000));
  for (let i = 0; i < 40; i++) assert.ok(messages.some(message => message.includes(` INV-${i}*`)));
});

test('payment received confirms the latest instalment and remaining balance to the customer', async () => {
  const api = fixture();
  const row = { ...invoice, paidAmount: 50000, pendingAmount: 68000 };
  const payment = { _id: 'payment-1', amount: 50000, receivedAt: now };
  await api.sendPaymentReceivedWhatsapp(row, payment);
  assert.equal(api.sent[0].number, invoice.contactPersonNumber);
  assert.match(api.sent[0].message, /💰 \*Payment Received\*/);
  assert.match(api.sent[0].message, /Payment received now: ₹50,000/);
  assert.match(api.sent[0].message, /Total paid amount: ₹50,000/);
  assert.match(api.sent[0].message, /Pending amount: ₹68,000/);
  assert.match(api.sent[0].message, /Status: Partial Payment/);
  await api.sendPaymentReceivedWhatsapp(row, payment);
  assert.equal(api.sent.length, 1);
  await api.sendPaymentReceivedWhatsapp({ ...row, paidAmount: 100000, pendingAmount: 18000 }, { ...payment, _id: 'payment-2' });
  assert.equal(api.sent.length, 2, 'equal amounts under different saved payments must both notify');
});
test('full payment confirms completed status and failures remain isolated', async () => {
  const api = fixture();
  const row = { ...invoice, paidAmount: 118000, pendingAmount: 0 };
  const payment = { _id: 'final-payment', amount: 68000, receivedAt: now };
  const message = api.buildPaymentReceivedWhatsappMessage(row, payment);
  assert.match(message, /✅ \*Payment Completed\*/);
  assert.match(message, /Pending amount: ₹0\nStatus: Paid/);
  assert.equal((await api.sendPaymentReceivedWhatsapp(row, { ...payment, amount: 0 })).status, 'skipped');
  assert.equal((await api.sendPaymentReceivedWhatsapp(row, { amount: 100 })).status, 'skipped');
  api.fail();
  assert.equal((await api.sendPaymentReceivedWhatsapp(row, payment)).status, 'failed');
});
