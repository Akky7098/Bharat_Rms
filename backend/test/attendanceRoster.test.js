const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('attendance roster includes active user and admin roles and is management-only', async () => {
  let query;
  const records = [{ _id: 'user', name: 'User', role: 'user' }, { _id: 'admin', name: 'Admin', role: 'admin' }];
  const context = { module: { exports: {} }, require: name => {
    if (name === 'express') return require('express');
    if (name === '../util/auth') return () => {};
    if (name === '../model/userModel') return { find: filter => { query = filter; return { select: () => ({ sort: () => ({ lean: async () => records }) }) }; } };
    return new Proxy({}, { get: () => () => {} });
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/attendanceRoutes'), 'utf8'), context);
  const handler = context.module.exports.stack.find(layer => layer.route?.path === '/employees' && layer.route.methods.get).route.stack[0].handle;
  for (const role of ['admin', 'super_admin', 'user']) {
    let status = 200, body;
    const res = { status: code => { status = code; return res; }, set: () => res, json: value => { body = value; return res; } };
    await handler({ user: { role } }, res);
    assert.equal(status, role === 'user' ? 403 : 200);
    if (role !== 'user') {
      assert.equal(query.role.$in.join(','), 'user,admin');
      assert.equal(query.status.$ne, 'inactive');
      assert.equal(body.data.length, 2);
    }
  }
});
