const crypto = require('crypto');
const Delivery = require('../model/dispatchWhatsappDeliveryModel');
const { normalizePhoneJid, sendTextToPhone } = require('../util/baileysClient');
const { accountPaymentState, daysLate, dayKey } = require('../util/paymentReminderPolicy');
const { getReminderMeta } = require('./dispatchReminderMailService');
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const text = value => String(value || '-').replace(/[\r\n]+/g, ' ').trim();
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const signature = '*Bharat Special Steels Pvt. Ltd.*';
const contact = dispatch => dispatch.salesPersonName ? `For assistance: ${text(dispatch.salesPersonName)}${dispatch.salesPersonMobile ? ` · ${text(dispatch.salesPersonMobile)}` : ''}` : 'For assistance, please contact your sales representative.';
const invoiceDetails = dispatch => `*Invoice details*\nInvoice: ${text(dispatch.invoiceNumber)}\nInvoice date: ${date(dispatch.invoiceDate)}\nPO: ${text(dispatch.poNumber)}\nInvoice value: ${money(dispatch.invoiceValue)}`;
const buildDispatchWhatsappMessage = (dispatch, event) => [
  event === 'delivered' ? '✅ *Material Delivered*' : '🚚 *Material Dispatched*',
  `Dear ${text(dispatch.contactPersonName || 'Customer')},\n${text(dispatch.companyName)}`,
  event === 'delivered' ? `Your material has been marked as delivered on ${date(dispatch.deliveredAt)}.` : `Your material has been dispatched on ${date(dispatch.dispatchDate)}.`,
  invoiceDetails(dispatch),
  `*Material details*\n${text(dispatch.materialDescription)}\nQuantity: ${Number(dispatch.dispatchQty || 0).toLocaleString('en-IN')} KG${dispatch.lrNumber ? `\nLR number: ${text(dispatch.lrNumber)}` : ''}${dispatch.shippingAddress ? `\nDelivery address: ${text(dispatch.shippingAddress)}` : ''}`,
  `*Payment details*\nDue date: ${date(dispatch.revisedPaymentDueDate || dispatch.paymentDueDate)}\nOutstanding: ${money(dispatch.pendingAmount)}\nTerms: ${text(dispatch.paymentTerms || `${dispatch.paymentDueDays || 0} days`)}`,
  contact(dispatch), signature,
].join('\n\n');
const buildPaymentReceivedWhatsappMessage = (dispatch, payment) => [
  Number(dispatch.pendingAmount || 0) <= 0 ? '✅ *Payment Completed*' : '💰 *Payment Received*',
  `Dear ${text(dispatch.contactPersonName || 'Customer')},\n${text(dispatch.companyName)}`,
  `Thank you. We have recorded your payment against invoice ${text(dispatch.invoiceNumber)}.\nPlease find the updated payment summary below.`,
  `*Payment summary*\nPayment received now: ${money(payment.amount)}\nTotal paid amount: ${money(dispatch.paidAmount)}\nPending amount: ${money(dispatch.pendingAmount)}\nStatus: ${Number(dispatch.pendingAmount || 0) <= 0 ? 'Paid' : 'Partial Payment'}`,
  invoiceDetails(dispatch),
  `Payment received on: ${date(payment.receivedAt)}\nPayment due date: ${date(dispatch.revisedPaymentDueDate || dispatch.paymentDueDate)}`,
  contact(dispatch), signature,
].join('\n\n');
const buildPaymentWhatsappMessages = (dispatch, type, overdueDays, invoices = [dispatch], now = new Date()) => {
  const { outstanding, oldestDays } = accountPaymentState(invoices, now);
  if (!outstanding.length) return [];
  if (oldestDays > 0) { type = 'overdue'; overdueDays = oldestDays; }
  else if (oldestDays === 0) type = 'due_date';
  const meta = getReminderMeta(type, overdueDays);
  const emoji = meta.critical ? '🔴 🚨' : type === 'overdue' ? '🔴' : type === 'due_date' ? '📅' : '⏳';
  const total = outstanding.reduce((sum, row) => sum + Number(row.pendingAmount), 0);
  const overdue = outstanding.filter(row => daysLate(row, now) > 0).reduce((sum, row) => sum + Number(row.pendingAmount), 0);
  const introduction = [
    `${emoji} *${meta.title}*`,
    `Dear ${text(dispatch.contactPersonName || 'Customer')},\n${text(dispatch.companyName)}`,
    meta.message,
    `*Account payment overview*\nOverdue balance: ${money(overdue)}\nTotal outstanding: ${money(total)}${oldestDays > 0 ? `\nOldest invoice: ${oldestDays} days overdue` : ''}`,
    '*Outstanding invoices*',
  ].join('\n\n');
  const cards = outstanding.map((row, index) => {
    const late = daysLate(row, now);
    const status = late === null ? 'Due date unavailable' : late > 0 ? `${late} days overdue` : late === 0 ? 'Due today' : `Due in ${-late} days`;
    return `*${index + 1}. ${text(row.invoiceNumber)}* — ${status}\nInvoice date: ${date(row.invoiceDate)}\nDue date: ${date(row.revisedPaymentDueDate || row.paymentDueDate)}\nInvoice value: ${money(row.invoiceValue)}\nOutstanding: ${money(row.pendingAmount)}${row.revisedPaymentDueDate ? `\nOriginal due date: ${date(row.paymentDueDate)}` : ''}\nPayment terms: ${text(row.paymentTerms || `${row.paymentDueDays || 0} days`)}`;
  });
  const footer = `*Payment terms & order continuity*\n${meta.note}\n\nAlready paid? Please share the UTR / bank reference, payment date and invoice allocation with your sales contact.\n\nStatement as of ${date(now)}.\n${contact(dispatch)}\n\n${signature}`;
  // Keep each invoice together, with bounded messages for large statements.
  const messages = []; let current = introduction;
  for (const card of cards) {
    if ((current + card).length > 3000) { messages.push(current); current = `📄 *Outstanding invoices — continued*\n${text(dispatch.companyName)}`; }
    current += `\n\n${card}`;
  }
  if ((current + footer).length > 3800) { messages.push(current); current = `*${text(dispatch.companyName)} — payment follow-up*`; }
  messages.push(`${current}\n\n${footer}`);
  return messages;
};
const sendClaimed = async (dispatch, event, key, messages) => {
  if (process.env.DISPATCH_CUSTOMER_WHATSAPP_ENABLED === 'false') return { status: 'skipped', reason: 'disabled' };
  const number = String(dispatch.contactPersonNumber || '').replace(/\D/g, '');
  if (number.length < 10 || number.length > 15) return { status: 'skipped', reason: 'invalid_customer_mobile' };
  if (!messages.length) return { status: 'skipped', reason: 'no_outstanding_balance' };
  const recipient = normalizePhoneJid(number);
  const id = crypto.createHash('sha256').update(`${event}|${key}|${recipient}`).digest('hex');
  try {
    try { await Delivery.create({ _id: id, dispatchId: dispatch._id, event, recipient, status: 'sending' }); }
    catch (error) { if (error.code === 11000) return { status: 'skipped', reason: 'already_claimed' }; throw error; }
    const messageIds = [];
    for (const message of messages) {
      const result = await sendTextToPhone(number, message);
      if (result?.key?.id) messageIds.push(result.key.id);
      await Delivery.updateOne({ _id: id }, { $set: { messageIds } });
    }
    await Delivery.updateOne({ _id: id }, { $set: { status: 'sent', sentAt: new Date(), messageIds } });
    return { status: 'sent' };
  } catch (error) {
    await Delivery.updateOne({ _id: id, status: 'sending' }, { $set: { status: 'failed', error: error.message } }).catch(() => {});
    console.error('Dispatch customer WhatsApp failed:', event, String(dispatch._id), error.message);
    return { status: 'failed', reason: error.message };
  }
};
const sendDispatchWhatsapp = (dispatch, event) => {
  if (!['dispatched', 'delivered'].includes(event)) return Promise.resolve({ status: 'skipped' });
  return sendClaimed(dispatch, event, String(dispatch._id), [buildDispatchWhatsappMessage(dispatch, event)]);
};
const sendPaymentReminderWhatsapp = (dispatch, type, overdueDays, invoices, now = new Date()) => {
  const company = String(dispatch.companyName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return sendClaimed(dispatch, 'payment_reminder', `${dayKey(now)}|${company}`, buildPaymentWhatsappMessages(dispatch, type, overdueDays, invoices, now));
};
const sendPaymentReceivedWhatsapp = (dispatch, payment) => {
  if (!payment?._id || !Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) {
    return Promise.resolve({ status: 'skipped', reason: 'invalid_payment' });
  }
  // Each saved payment has its own ID: two equal instalments remain distinct.
  return sendClaimed(dispatch, 'payment_received', `${dispatch._id}|${payment._id}`, [buildPaymentReceivedWhatsappMessage(dispatch, payment)]);
};
module.exports = { sendDispatchWhatsapp, sendPaymentReminderWhatsapp, sendPaymentReceivedWhatsapp, buildDispatchWhatsappMessage, buildPaymentWhatsappMessages, buildPaymentReceivedWhatsappMessage };
