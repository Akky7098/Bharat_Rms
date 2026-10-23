const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const accountStatus = require('../util/userAccountStatus');
const error = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });
function load(file, mocks, env = {}) {
  const context = { module: { exports: {} }, process: { env }, console: { log() {}, error() {} }, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
  return context.module.exports;
}
function service({ status, identity = { subject: 'google-123', email: 'person@gmail.com', authoritativeEmail: true }, registered = true, linked = false } = {}) {
  let updates = 0;
  const user = { _id: 'user-1', name: 'Person', email: 'person@gmail.com', password: 'existing-password', role: 'admin', ...(status ? { status } : {}), ...(linked ? { googleId: 'google-123' } : {}) };
  const User = {
    findOne: async query => query.googleId ? (linked ? user : null) : (registered ? user : null),
    findById: async () => registered ? user : null,
    findOneAndUpdate: async (filter, update) => { updates++; Object.assign(user, update.$set); return user; },
  };
  const auth = load('../services/authService.js', {
    '../model/userModel': User,
    jsonwebtoken: jwt,
    './googleIdentityService': { verifyGoogleCredential: async () => identity, authError: error },
    '../util/userAccountStatus': accountStatus,
  }, { JWT_SECRET: 'current-test-secret' });
  return { auth, user, updates: () => updates };
}

test('existing password logins keep working, roles and response shape are preserved', async () => {
  const { auth } = service();
  const result = await auth.loginUser(' PERSON@gmail.com ', 'existing-password');
  assert.equal(result.user.role, 'admin');
  assert.equal(result.user.status, 'active');
  assert.equal(result.user.password, undefined);
  assert.equal(jwt.verify(result.token, 'current-test-secret').id, 'user-1');
  await assert.rejects(auth.loginUser('person@gmail.com', 'wrong'), /Invalid email or password/);
  await assert.rejects(auth.loginUser({ $ne: null }, 'existing-password'), /Invalid email or password/);
});

test('Google links existing authoritative emails and preserves RMS roles', async () => {
  const { auth, updates, user } = service();
  const result = await auth.loginWithGoogle('id-token');
  assert.equal(updates(), 1);
  assert.equal(user.googleId, 'google-123');
  assert.equal(result.user.role, 'admin');
  assert.equal(jwt.verify(result.token, 'current-test-secret').id, 'user-1');
});

test('inactive accounts cannot use either login or link Google', async () => {
  const { auth, updates } = service({ status: 'inactive' });
  for (const action of [() => auth.loginUser('person@gmail.com', 'existing-password'), () => auth.loginWithGoogle('token'), () => auth.linkGoogleAccount('user-1', 'token')]) {
    await assert.rejects(action(), err => err.code === 'ACCOUNT_INACTIVE' && err.statusCode === 403);
  }
  assert.equal(updates(), 0);
});

test('Google does not register unknown users or silently link third-party email addresses', async () => {
  await assert.rejects(service({ registered: false }).auth.loginWithGoogle('token'), err => err.code === 'GOOGLE_USER_NOT_REGISTERED');
  const identity = { subject: 'google-123', email: 'person@gmail.com', authoritativeEmail: false };
  const { auth } = service({ identity });
  await assert.rejects(auth.loginWithGoogle('token'), err => err.code === 'GOOGLE_LINK_REQUIRED');
  assert.equal((await auth.linkGoogleAccount('user-1', 'token')).googleLinked, true);
  const mismatch = service({ identity: { ...identity, email: 'other@gmail.com' } });
  await assert.rejects(mismatch.auth.linkGoogleAccount('user-1', 'token'), err => err.code === 'GOOGLE_EMAIL_MISMATCH');
});

test('linked Google accounts must still match the registered RMS email', async () => {
  const { auth } = service({ linked: true, identity: { subject: 'google-123', email: 'new@gmail.com', authoritativeEmail: true } });
  await assert.rejects(auth.loginWithGoogle('token'), err => err.code === 'GOOGLE_EMAIL_MISMATCH');
});

test('Google verifier is opt-in, checks audience through SDK, and rejects invalid/unverified tokens', async () => {
  let calls = 0;
  let payload = { sub: 'google-123', email: 'Person@gmail.com', email_verified: true };
  let rejectToken = false;
  const mocks = { 'google-auth-library': { OAuth2Client: class { async verifyIdToken(config) {
    calls++;
    assert.equal(config.audience, 'test.apps.googleusercontent.com');
    assert.equal(config.idToken, 'token');
    if (rejectToken) throw new Error('expired or forged token');
    return { getPayload: () => payload };
  } } } };
  const disabled = load('../services/googleIdentityService.js', mocks);
  await assert.rejects(disabled.verifyGoogleCredential('token'), err => err.code === 'GOOGLE_LOGIN_DISABLED');
  assert.equal(calls, 0);
  const enabled = load('../services/googleIdentityService.js', mocks, { GOOGLE_LOGIN_ENABLED: 'true', GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com' });
  await assert.rejects(enabled.verifyGoogleCredential({ email: 'person@gmail.com' }), err => err.code === 'GOOGLE_CREDENTIAL_REQUIRED');
  assert.equal((await enabled.verifyGoogleCredential('token')).email, 'person@gmail.com');
  payload.email_verified = false;
  await assert.rejects(enabled.verifyGoogleCredential('token'), err => err.code === 'GOOGLE_EMAIL_UNVERIFIED');
  rejectToken = true;
  await assert.rejects(enabled.verifyGoogleCredential('token'), err => err.code === 'INVALID_GOOGLE_TOKEN');
});

test('protected APIs accept current and legacy sessions and block inactive accounts', async () => {
  let status;
  const auth = load('../util/auth.js', {
    jsonwebtoken: jwt,
    '../model/userModel': { findById: () => ({ select: () => ({ lean: async () => ({ _id: 'user-1', role: 'admin', status }) }) }) },
    './userAccountStatus': accountStatus,
    dotenv: { config() {} },
  }, { JWT_SECRET: 'current-test-secret' });
  for (const secret of ['abc123', 'current-test-secret']) {
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 'user-1' }, secret)}` } };
    const res = { status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
    await auth(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    status = 'inactive';
    nextCalled = false;
    await auth(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.code, 403);
    assert.equal(res.body.code, 'ACCOUNT_INACTIVE');
    status = undefined;
  }
});

test('status administration rejects invalid values and self-deactivation, and disconnects inactive accounts', async () => {
  let writes = 0;
  let disconnected;
  const users = load('../services/userService.js', {
    '../model/userModel': { findByIdAndUpdate: (id, update) => { writes++; return { select: async () => ({ _id: id, status: update.$set.status }) }; } },
    '../socket': { getIO: () => ({ in: room => ({ disconnectSockets: force => { disconnected = { room, force }; } }) }) },
  });
  await assert.rejects(users.setUserStatus('user-1', 'inactive', 'user-1'), /own account/);
  await assert.rejects(users.setUserStatus('user-1', 'invalid', 'admin'), /active or inactive/);
  assert.equal(writes, 0);
  assert.equal((await users.setUserStatus('user-1', 'inactive', 'admin')).status, 'inactive');
  assert.equal(disconnected.room, 'user:user-1');
  assert.equal(disconnected.force, true);
  assert.equal((await users.setUserStatus('user-1', 'active', 'admin')).status, 'active');
});

test('socket handshakes reject inactive users and recheck existing connections', async () => {
  let status;
  let middleware;
  let connection;
  let recheck;
  let cleared = false;
  // Timers are injected separately so tests do not keep a live server/timer.
  const source = fs.readFileSync(path.join(__dirname, '../socket.js'), 'utf8');
  const context = { module: { exports: {} }, console: { log() {} },
    setInterval: callback => { recheck = callback; return { unref() {} }; }, clearInterval: () => { cleared = true; },
    require: name => ({
      'socket.io': { Server: class { use(callback) { middleware = callback; } on(event, callback) { connection = callback; } } },
      './util/auth': { verifyBharatToken: () => ({ decoded: { id: 'user-1' } }) },
      './util/userAccountStatus': accountStatus,
      './model/userModel': { findById: () => ({ select: async () => ({ _id: 'user-1', name: 'Person', role: 'user', status }) }) },
    }[name]),
  };
  vm.runInNewContext(source, context);
  context.module.exports.initSocket({});
  let disconnected = false;
  let onDisconnect;
  const socket = { handshake: { auth: { token: 'existing-token' } }, join() {}, on: (event, callback) => { onDisconnect = callback; }, disconnect: () => { disconnected = true; onDisconnect(); } };
  let rejected;
  await middleware(socket, err => { rejected = err; });
  assert.equal(rejected, undefined);
  connection(socket);
  status = 'inactive';
  await recheck();
  assert.equal(disconnected, true);
  assert.equal(cleared, true);
  await middleware(socket, err => { rejected = err; });
  assert.match(rejected.message, /inactive/);
});

test('user model defaults legacy accounts to active without requiring Google fields', () => {
  const User = require('../model/userModel');
  const user = new User({ name: 'Existing Person', email: 'person@example.com', password: 'existing-password' });
  assert.equal(user.status, 'active');
  assert.equal(user.googleId, undefined);
  assert.equal(user.validateSync(), undefined);
  user.status = 'disabled';
  assert.ok(user.validateSync().errors.status);
  const index = User.schema.indexes().find(([fields]) => fields.googleId === 1);
  assert.equal(index[1].unique, true);
  assert.equal(index[1].sparse, true);
});

test('account administration routes require super_admin role', () => {
  const controller = { getSalesPersons() {}, getUserAccounts() {}, setUserStatus() {} };
  const router = load('../routes/userRoutes.js', {
    express: require('express'),
    '../controller/userController': controller,
    '../util/auth': (req, res, next) => next(),
    '../util/role': require('../util/role'),
  });
  for (const routePath of ['/', '/:id/status']) {
    const route = router.stack.find(layer => layer.route?.path === routePath).route;
    const roleCheck = route.stack[1].handle;
    for (const role of ['user', 'admin', 'super_admin']) {
      let nextCalled = false;
      const res = { status(code) { this.code = code; return this; }, json() {} };
      roleCheck({ user: { role } }, res, () => { nextCalled = true; });
      assert.equal(nextCalled, role === 'super_admin');
      if (role !== 'super_admin') assert.equal(res.code, 403);
    }
  }
});
