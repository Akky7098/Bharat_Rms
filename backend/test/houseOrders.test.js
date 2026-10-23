const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const orders = [
  { _id: 'order-1', trackingOrderType: 'H.O.', companyName: 'Example Works', poNumber: 'PO-123', createdAt: new Date('2026-10-10'), sizeGradeQuantityRate: 'MS 100 KG', totalQuantityKG: 100 },
  { _id: 'order-2', trackingOrderType: 'H.O.', companyName: 'Other Company', poNumber: 'PO-456', createdAt: new Date('2026-10-12'), sizeGradeQuantityRate: 'MS 200 KG', totalQuantityKG: 200 },
];
const snapshots = orders.map(order => ({ ...order, companyAddress: 'Example address', orderValue: 12000, salesPersonId: { name: 'Sonia', email: 'sales@example.com' }, pdf: { fileUrl: '/uploads/example.pdf' } }));
function service() {
  const context = { module: { exports: {} }, require: () => ({ find: query => {
    const chain = { select: () => chain, sort: () => chain, populate: () => chain, lean: async () => query._id ? snapshots : orders };
    return chain;
  } }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/managementOrderAnalyticsService.js'), 'utf8'), context);
  return context.module.exports;
}
test('H.O. API returns every selected-period card with detail and PDF fields', async () => {
  const data = await service().getHouseOrderDetails({ month: '2026-10', includeOrderDetails: true });
  assert.equal(data.orders.length, 2);
  assert.equal(data.filteredOrderCount, 2);
  assert.equal(data.orders[0].poNumber, 'PO-123');
  assert.equal(data.orders[0].companyAddress, 'Example address');
  assert.equal(data.orders[0].salesPersonName, 'Sonia');
  assert.equal(data.orders[0].pdf.fileUrl, '/uploads/example.pdf');
});
test('H.O. API searches company and PO without changing period totals', async () => {
  const api = service();
  const all = await api.getHouseOrderDetails({ month: '2026-10', includeOrderDetails: true });
  for (const search of ['example works', 'po-123']) {
    const filtered = await api.getHouseOrderDetails({ month: '2026-10', search });
    assert.equal(filtered.orders.length, 1);
    assert.equal(filtered.orders[0]._id, 'order-1');
    assert.equal(filtered.summary.orderCount, all.summary.orderCount);
  }
});
test('overview remains lightweight and does not include full order register', async () => {
  const overview = await service().getManagementOrderAnalytics({ month: '2026-10', trackingOrderType: 'H.O.' });
  assert.equal(overview.orders, undefined);
});

test('existing H.O. PDF callers retain the lightweight order payload', async () => {
  const data = await service().getHouseOrderDetails({ month: '2026-10' });
  assert.equal(data.orders.length, 2);
  assert.equal(data.orders[0].pdf, undefined);
});

test('full H.O. register requires the same super-admin access as the management UI', () => {
  const auth = (req, res, next) => next();
  const names = ['getManagementOrderAnalysis', 'getHouseOrderAnalysis', 'getSteelMillAnalysis', 'getGradeAnalysis', 'downloadHouseOrderAnalysisPdf', 'downloadSteelMillOrderAnalysisPdf'];
  const controllers = Object.fromEntries(names.map(name => [name, () => {}]));
  const context = { module: { exports: {} }, require: name => {
    if (name === 'express') return require('express');
    if (name === '../util/auth') return auth;
    if (name === '../util/role') return require('../util/role');
    return controllers;
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/managementOrderAnalyticsRoutes.js'), 'utf8'), context);
  const routes = context.module.exports.stack;
  const house = routes.find(layer => layer.route?.path === '/house').route;
  assert.equal(house.stack[0].handle, auth);
  const roleCheck = house.stack[1].handle;
  for (const role of ['user', 'admin', 'super_admin']) {
    let allowed = false;
    const res = { status(code) { this.code = code; return this; }, json() {} };
    roleCheck({ user: { role } }, res, () => { allowed = true; });
    assert.equal(allowed, role === 'super_admin');
  }
  assert.equal(routes.find(layer => layer.route?.path === '/').route.stack.length, 1);
});
