// Offline preview only. The mail transport is replaced; this never sends email.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const puppeteer = require('puppeteer');
const options = require('../util/pdfChromiumOptions');
const policy = require('../util/paymentReminderPolicy');
const source = fs.readFileSync(path.join(__dirname, '../services/dispatchReminderMailService.js'), 'utf8');
const context = { module: { exports: {} }, process: { env: {} }, require: name => {
  if (name === '../util/mailTransporter') return { sendMail: () => { throw new Error('Preview cannot send email'); } };
  if (name === '../util/paymentReminderPolicy') return policy;
  throw new Error(name);
} };
vm.runInNewContext(source, context);
const output = path.resolve(__dirname, '../../output/payment-reminders');
const samples = [
  ['upcoming', 'before_due_date', -2], ['due-today', 'due_date', 0],
  ['overdue-day-3', 'overdue', 3], ['overdue-day-6', 'overdue', 6], ['overdue-day-9', 'overdue', 9], ['overdue-day-12', 'overdue', 12], ['mixed-oldest-18-days', 'due_date', 0],
];
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const chrome = process.env.EMAIL_PREVIEW_CHROME;
  if (!chrome) throw new Error('Set EMAIL_PREVIEW_CHROME to an existing Chrome executable');
  const browser = await puppeteer.launch({ ...options(chrome), userDataDir: '/private/tmp/bharat-payment-preview-profile' });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => request.url().endsWith('/logo.png') ? request.respond({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(__dirname, '../../frontend/public/logo.png')) }) : request.url().startsWith('data:') ? request.continue() : request.abort());
    for (const [name, type, days] of samples) {
      const now = new Date('2026-10-23T06:00:00Z');
      const due = new Date(now.getTime() - days * 86400000);
      const invoice = { companyName: 'EXAMPLE ENGINEERING PVT. LTD. (SAMPLE)', contactPersonName: 'Accounts Team', invoiceNumber: 'SAMPLE/26-27/1042', invoiceDate: '2026-09-23', invoiceValue: 485000, pendingAmount: 365000, paymentDueDate: due, paymentTerms: '30 days from invoice date', paymentStatus: 'pending' };
      const other = { ...invoice, invoiceNumber: 'SAMPLE/26-27/1057', invoiceValue: 218500, pendingAmount: 218500, paymentDueDate: new Date('2026-10-30T06:00:00Z') };
      const invoices = name === 'mixed-oldest-18-days' ? [other, invoice,
        { ...invoice, invoiceNumber: 'SAMPLE/26-27/1038', paymentDueDate: new Date(now - 3 * 86400000), pendingAmount: 125000 },
        { ...invoice, invoiceNumber: 'SAMPLE/26-27/1001', paymentDueDate: new Date(now - 18 * 86400000), invoiceValue: 680000, pendingAmount: 560000 },
      ] : [invoice, other];
      const html = context.module.exports.buildReminderTemplate(invoice, type, Math.max(0, days), invoices, now);
      const subject = context.module.exports.buildReminderSubject(invoice, type, Math.max(0, days), invoices, now);
      const subjectHtml = subject.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const preview = html.replace('<body ', '<body ').replace(/(<body[^>]*>)/, `$1<div style="padding:16px;background:#ffffff;border-bottom:1px solid #dbe3ee;font:13px/20px Arial;color:#0f172a;overflow-wrap:anywhere;"><strong>EMAIL SUBJECT</strong><br/>${subjectHtml}</div>`);
      fs.writeFileSync(path.join(output, `${name}.html`), html);
      fs.writeFileSync(path.join(output, `${name}-subject.txt`), subject);
      await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1 });
      await page.setContent(preview, { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: path.join(output, `${name}-desktop.png`), fullPage: true });
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      await page.screenshot({ path: path.join(output, `${name}-mobile.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Mobile overflow: ${name}`);
    }

  } finally { await browser.close(); }
  console.log('Created 14 email preview images and 7 HTML previews in', output);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
