const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const options = require('../util/pdfChromiumOptions');
const lock = require('../util/chromiumLock');

function loadService(failPdf = false) {
  const launches = [];
  const customerFlags = [];
  let closed = 0;
  let active = 0;
  const page = {
    setViewport: async () => {}, setContent: async () => {},
    emulateMediaType: async () => {}, evaluate: async () => {},
    pdf: async () => {
      if (failPdf) throw new Error('PDF failed');
      return Buffer.from('%PDF-test');
    },
  };
  const mocks = {
    puppeteer: { launch: async config => {
      assert.equal(active, 0, 'only one PDF browser may run');
      active++;
      launches.push(config);
      return { newPage: async () => page, close: async () => { active--; closed++; } };
    } },
    '../util/ensureChromium': async () => '/persistent/chrome',
    '../util/pdfChromiumOptions': options,
    '../util/chromiumLock': lock,
    './managementOrderAnalyticsService': { getSteelMillOrderDetails: async () => ({ orders: [], summary: {} }) },
    '../templates/managementOrderAnalyticsPdfTemplate': () => '<html></html>',
    '../templates/steelMillOrderAnalysisPdfTemplate': { buildSteelMillOrderAnalysisPdfHtml: data => {
      customerFlags.push(data.includeCustomerName);
      return '<html></html>';
    } },
  };
  const context = { require: name => {
    assert.ok(name in mocks, name);
    return mocks[name];
  }, module: { exports: {} }, console: { log() {}, error() {} }, Buffer };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/managementOrderAnalyticsPdfService.js'), 'utf8'), context);
  return { service: context.module.exports, launches, customerFlags, closed: () => closed };
}

test('both customer variants use pipe transport, one queued browser, and close it', async () => {
  const instance = loadService();
  const results = await Promise.all([true, false].map(includeCustomerName =>
    instance.service.generateSteelMillOrderAnalysisPdf({ steelMill: 'Pushpanjali Strip', includeCustomerName })
  ));
  assert.deepEqual(instance.customerFlags, [true, false]);
  assert.equal(instance.closed(), 2);
  for (const config of instance.launches) {
    assert.equal(config.executablePath, '/persistent/chrome');
    assert.equal(config.pipe, true);
    assert.ok(config.args.includes('--single-process'));
    assert.ok(config.args.includes('--no-zygote'));
  }
  for (const result of results) assert.ok(result.buffer.length);
});

test('PDF failure closes Chromium and releases the shared queue', async () => {
  const instance = loadService(true);
  await assert.rejects(instance.service.generateSteelMillOrderAnalysisPdf({ steelMill: 'Pushpanjali Strip' }), /PDF failed/);
  assert.equal(instance.closed(), 1);
  const next = loadService();
  await next.service.generateSteelMillOrderAnalysisPdf({ steelMill: 'Pushpanjali Strip' });
  assert.equal(next.closed(), 1);
});
