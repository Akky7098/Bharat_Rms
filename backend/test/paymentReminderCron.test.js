const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
test('email and WhatsApp share one daily 11 PM IST payment reminder job', async () => {
  const module = { exports: {} }, schedules = [], logs = [];
  let calls = 0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../cron/paymentReminderCron.js'), 'utf8'), {
    module, console: { log: value => logs.push(value), error() {} },
    require: name => {
      if (name === 'node-cron') return { schedule: (expression, callback, options) => schedules.push({ expression, callback, options }) };
      assert.equal(name, '../services/dispatchReminderService');
      return { processPaymentReminders: async () => { calls++; return { checked: 1, sent: 1, failed: 0, skipped: 0, whatsapp: { sent: 1, failed: 0, skipped: 0 } }; } };
    },
  });
  module.exports(); module.exports();
  assert.equal(schedules.length, 1);
  assert.equal(schedules[0].expression, '0 23 * * *');
  assert.equal(schedules[0].options.timezone, 'Asia/Kolkata');
  await schedules[0].callback();
  assert.equal(calls, 1);
  assert.ok(logs.some(log => log.includes('WhatsAppSent=1')));
});
