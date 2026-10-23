const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const dates = require('../util/revenueDates');

test('IST periods handle midnight, month and leap-year boundaries', () => {
  const periods = dates.getISTRevenuePeriods(new Date('2026-09-30T18:30:00Z'));
  assert.equal(periods.today.$gte.toISOString(), '2026-09-30T18:30:00.000Z');
  assert.equal(periods.month.$lte.toISOString(), '2026-10-31T18:29:59.999Z');
  const leap = dates.getISTRevenuePeriods(new Date('2028-02-15T00:00:00Z'));
  assert.equal(leap.month.$lte.toISOString(), '2028-02-29T18:29:59.999Z');
  assert.deepEqual(Object.keys(dates.getISTDateRange('2026-10-01')), ['$gte']);
});

test('periods do not change with the production server timezone', () => {
  const code = `console.log(JSON.stringify(require(${JSON.stringify(path.resolve(__dirname, '../util/revenueDates'))}).getISTRevenuePeriods(new Date('2026-10-23T00:00:00Z'))))`;
  const results = ['UTC', 'Asia/Kolkata', 'America/New_York'].map(TZ => execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim());
  assert.equal(results[0], results[1]);
  assert.equal(results[0], results[2]);
});

function loadService(filename, SalesOrder) {
  const context = { module: { exports: {} }, console: { log() {} }, require: name => {
    if (name === '../util/revenueDates') return dates;
    if (name === '../model/salesOrderModel') return SalesOrder;
    if (name === 'mongoose') return require('mongoose');
    if (name === 'crypto') return require('node:crypto');
    return {};
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, filename), 'utf8'), context);
  return context.module.exports;
}

const query = { fromDate: '2026-10-01', toDate: '2026-10-31', approvalTab: 'approved' };
const user = { role: 'super_admin' };
const halt = new Error('aggregation captured');
async function captureFilters() {
  let dashboardFilter;
  let salesFilter;
  const dashboard = loadService('../services/dashboardService.js', {
    countDocuments: async () => 0,
    aggregate: async pipeline => { dashboardFilter = pipeline[0].$match; throw halt; },
  });
  const sales = loadService('../services/salesOrderService.js', {
    countDocuments: async () => 0,
    aggregate: async pipeline => {
      // First call is today's summary; second call is the selected period.
      if (!salesFilter) { salesFilter = 'today'; return []; }
      salesFilter = pipeline[0].$match; throw halt;
    },
  });
  await assert.rejects(dashboard.getDashboardSummary(query, user), error => error === halt);
  await assert.rejects(sales.getAllSalesOrders(query, user), error => error === halt);
  return { dashboardFilter, salesFilter };
}

test('dashboard and Sales Orders recognize the same approval-month revenue', async () => {
  const { dashboardFilter, salesFilter } = await captureFilters();
  const field = dates.APPROVED_REVENUE_DATE_FIELD;
  assert.equal(dashboardFilter.orderDate, undefined);
  assert.equal(salesFilter.orderDate, undefined);
  assert.equal(dashboardFilter[field].$gte.getTime(), salesFilter[field].$gte.getTime());
  assert.equal(dashboardFilter[field].$lte.getTime(), salesFilter[field].$lte.getTime());
  const orders = [
    { orderDate: '2026-09-30T11:20:02Z', approvedAt: '2026-10-01T11:16:37Z', value: 20680 },
    { orderDate: '2026-10-01', approvedAt: '2026-09-30T18:30:00Z', value: 100 },
    { approvedAt: '2026-09-30T18:29:59Z', value: 900 },
    { approvedAt: '2026-10-31T18:30:00Z', value: 800 },
    { approvedAt: '2026-10-10', value: 1000, isActive: false },
  ];
  for (const filter of [dashboardFilter, salesFilter]) {
    const range = filter[field];
    const eligible = orders.filter(order => order.isActive !== filter.isActive.$ne && new Date(order.approvedAt) >= range.$gte && new Date(order.approvedAt) <= range.$lte);
    assert.equal(eligible.reduce((sum, order) => sum + order.value, 0), 20780);
  }
});

test('Today list, pagination and count agree while monthly total remains independent', async () => {
  const now = new Date();
  const periods = dates.getISTRevenuePeriods(now);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const orders = Array.from({ length: 4 }, (_, index) => ({
    _id: String(index), approvalStatus: 'approved', isActive: true,
    orderDate: new Date(periods.today.$gte.getTime() - 86400000),
    managerApproval: { approvedAt: new Date(periods.today.$gte.getTime() + 3600000) }, orderValue: 100,
  }));
  orders.push({ ...orders[0], _id: 'earlier-in-month', managerApproval: { approvedAt: periods.month.$gte } });
  const match = filter => orders.filter(order => Object.entries(filter).every(([key, expected]) => {
    const value = key.split('.').reduce((current, field) => current?.[field], order);
    if (key === 'isActive') return value !== expected.$ne;
    if (expected?.$gte || expected?.$lte) return (!expected.$gte || value >= expected.$gte) && (!expected.$lte || value <= expected.$lte);
    return value === expected;
  }));
  const service = loadService('../services/salesOrderService.js', {
    countDocuments: async filter => match(filter).length,
    aggregate: async pipeline => {
      const rows = match(pipeline[0].$match);
      if (pipeline[1]?.$group) return [{ totalApprovedOrders: rows.length, totalApprovedValue: rows.reduce((sum, row) => sum + row.orderValue, 0) }];
      return rows;
    },
  });
  const result = await service.getAllSalesOrders({ approvalTab: 'approved', fromDate: today, toDate: today }, { role: 'super_admin' });
  // The extra sample can fall on today if the test runs on the first of a month.
  assert.equal(result.salesOrders.length, result.summary.todayApproved.totalApprovedOrders);
  assert.equal(result.pagination.totalRecords, result.salesOrders.length);
  assert.equal(result.summary.filteredApproved.totalApprovedOrders, result.salesOrders.length);
  assert.equal(result.summary.monthApproved.totalApprovedOrders, 5);
});

test('salesperson choices include users and only Sonia among administrators', async () => {
  let filter;
  const context = { module: { exports: {} }, require: () => ({ find: async value => { filter = value; return []; } }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/userService.js'), 'utf8'), context);
  await context.module.exports.getSalesPersons();
  assert.equal(filter.$or[0].role, 'user');
  assert.equal(filter.$or[1]._id, '69f32999a3a3532d7a8721e2');
  assert.equal(filter.$or[1].role, 'admin');
  assert.equal(filter.$or.length, 2);
});
