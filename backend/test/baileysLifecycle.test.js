const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ownership = require('../util/baileysOwnership');
const read = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
function fixture(t, fail = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baileys-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const options = typeof fail === 'object' ? fail : { fail };
  const sockets = [], timers = [], intervals = [], hooks = {};
  let savedCreds = 0;
  const module = { exports: {} };
  const mock = {
    default: () => { const socket = { ev: new EventEmitter(), ws: { close() { socket.closed = true; } }, sendMessage: async () => ({ key: 'mock-only' }) }; sockets.push(socket); return socket; },
    useMultiFileAuthState: async () => ({ state: {}, saveCreds() { savedCreds++; } }),
    fetchLatestWaWebVersion: async () => { if (options.fail) throw new Error('Mock startup failure'); if (options.versionPromise) await options.versionPromise; return { version: [1, 2, 3] }; },
    Browsers: { macOS: () => ['test'] }, DisconnectReason: { loggedOut: 401, restartRequired: 515 },
  };
  let source = fs.readFileSync(path.join(__dirname, '../util/baileysClient.js'), 'utf8');
  source = source.replace(/await import\(\s*"@whiskeysockets\/baileys"\s*\)/, 'await Promise.resolve(mockBaileys)');
  vm.runInNewContext(source, {
    module, exports: module.exports, mockBaileys: mock,
    require: name => name === 'pino' ? () => ({}) : name === './baileysOwnership' ? ownership : name === './baileysOutbox' ? () => ({ start() {}, stop() {}, enqueue: async () => ({ key: { id: 'forwarded' } }) }) : require(name),
    process: { pid: process.pid, env: { BAILEYS_RUNTIME_PATH: dir, BAILEYS_AUTH_PATH: path.join(dir, 'auth') }, kill: (...args) => process.kill(...args), once: (event, callback) => { hooks[event] = callback; } },
    console: { log() {}, error() {} },
    setInterval: callback => { const timer = { callback, unref() {} }; intervals.push(timer); return timer; }, clearInterval: timer => { timer.cancelled = true; },
    setTimeout: (callback, delay) => { const timer = { callback, delay, unref() {} }; timers.push(timer); return timer; }, clearTimeout: timer => { timer.cancelled = true; },
  });
  return { api: module.exports, dir, sockets, timers, intervals, hooks, savedCreds: () => savedCreds };
}
test('missing, dead or stale owner never reports shared CONNECTED as ready', t => {
  const { api, dir } = fixture(t);
  const status = { state: 'CONNECTED', ready: true, ownerPid: process.pid };
  fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify(status));
  assert.equal(api.getBaileysStatus().ready, false);
  fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, heartbeatAt: '2020-01-01' }));
  assert.equal(api.getBaileysStatus().ready, false);
  assert.equal(api.getBaileysSocket(), null);
});
test('startup owns the lock, parallel calls create one socket, disconnect schedules recovery', async t => {
  const { api, dir, sockets, timers } = fixture(t);
  await Promise.all([api.initBaileysClient(), api.initBaileysClient()]);
  assert.equal(sockets.length, 1);
  assert.equal(read(path.join(dir, 'owner.json')).pid, process.pid);
  assert.equal(api.getBaileysStatus().state, 'CONNECTING');
  await sockets[0].ev.listeners('connection.update')[0]({ connection: 'open' });
  assert.equal(api.getBaileysStatus().ready, true);
  await sockets[0].ev.listeners('connection.update')[0]({ connection: 'close', lastDisconnect: { error: { statusCode: 408 } } });
  assert.equal(api.getBaileysStatus().ready, false);
  assert.equal(read(path.join(dir, 'status.json')).state, 'DISCONNECTED');
  await timers.find(timer => timer.delay === 15000).callback();
  assert.equal(sockets.length, 2);
  // Delayed events from the replaced socket cannot overwrite the new state.
  await sockets[0].ev.listeners('connection.update')[0]({ connection: 'open' });
  assert.equal(api.getBaileysStatus().state, 'CONNECTING');
});
test('startup failure persists ERROR and schedules recovery without deleting auth', async t => {
  const { api, dir, timers } = fixture(t, true);
  fs.mkdirSync(path.join(dir, 'auth'));
  fs.writeFileSync(path.join(dir, 'auth', 'preserve.txt'), 'saved credentials');
  await assert.rejects(api.initBaileysClient(), /Mock startup failure/);
  assert.equal(read(path.join(dir, 'status.json')).state, 'ERROR');
  assert.equal(api.getBaileysStatus().ready, false);
  assert.ok(timers.some(timer => timer.delay === 15000));
  assert.equal(fs.readFileSync(path.join(dir, 'auth', 'preserve.txt'), 'utf8'), 'saved credentials');
});
test('ownership excludes concurrent claims, preserves live owners and refreshes heartbeat', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baileys-lock-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'owner.json');
  const first = ownership(file, 100, pid => pid === 100, read);
  const second = ownership(file, 200, pid => pid === 100, read);
  assert.equal(first.acquire(), true);
  assert.equal(second.acquire(), false);
  assert.equal(second.release(), false);
  assert.equal(first.heartbeat(), true);
  fs.mkdirSync(`${file}.claim`);
  assert.equal(second.acquire(), false);
  fs.rmdirSync(`${file}.claim`);
  assert.equal(first.release(), true);
  assert.equal(second.acquire(), true);
});
test('legacy compatibility facade imports no browser library and never initializes on import', () => {
  const calls = [];
  const fake = new Proxy({}, { get: (_, name) => () => calls.push(name) });
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../util/whatsappClient.js'), 'utf8'), {
    module, require: name => { assert.equal(name, './baileysClient'); return fake; },
  });
  assert.deepEqual(calls, []);
  module.exports.getWhatsappClient();
  assert.deepEqual(calls, ['getBaileysSocket']);
});

test('health cron recovers through Baileys only and leaves QR/connected sessions alone', async () => {
  let callback, starts = 0, state = { ready: false, state: 'NO_OWNER' };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../cron/whatsappHealthCron.js'), 'utf8'), {
    module, console,
    require: name => {
      if (name === 'node-cron') return { schedule: (_, cb) => { callback = cb; } };
      assert.equal(name, '../util/baileysClient');
      return { getBaileysStatus: () => state, initBaileysClient: async () => { starts++; } };
    },
  });
  module.exports();
  await callback(); assert.equal(starts, 1);
  for (const value of ['QR_REQUIRED', 'CONNECTING', 'PAIRING_REQUIRED', 'LOGGED_OUT']) {
    state = { ready: false, state: value }; await callback();
  }
  state = { ready: true, state: 'CONNECTED' }; await callback();
  assert.equal(starts, 1);
});

test('legacy status route reads Baileys without starting a connection', async () => {
  let starts = 0;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/whatsappStatusController.js'), 'utf8'), {
    module,
    require: name => {
      if (name === 'qrcode') return {};
      assert.equal(name, '../util/baileysClient');
      return { getBaileysStatus: () => ({ ready: false, state: 'NO_OWNER' }), initBaileysClient: async () => { starts++; } };
    },
  });
  let body;
  await module.exports.getWhatsappStatus({}, { json: value => { body = value; } });
  assert.equal(body.ready, false); assert.equal(body.state, 'NO_OWNER'); assert.equal(starts, 0);
});

test('shared readiness requires matching PID/token and fresh owner AND status timestamps', t => {
  const { api, dir } = fixture(t);
  const owner = { pid: process.pid, token: 'other-instance', heartbeatAt: new Date().toISOString() };
  const status = { ownerPid: process.pid, ownerToken: owner.token, ready: true, state: 'CONNECTED', updatedAt: new Date().toISOString() };
  const set = (o, s) => {
    fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify(o));
    fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify(s));
  };
  set(owner, status); assert.equal(api.getBaileysStatus().ready, true);
  for (const invalid of [{ ...status, updatedAt: undefined }, { ...status, updatedAt: '2020-01-01' }, { ...status, updatedAt: '2099-01-01' }, { ...status, ownerPid: -1 }, { ...status, ownerToken: 'wrong' }]) {
    set(owner, invalid); assert.equal(api.getBaileysStatus().ready, false);
  }
  set({ ...owner, pid: -1 }, { ...status, ownerPid: -1 }); assert.equal(api.getBaileysStatus().ready, false);
});
test('heartbeat refreshes both records and rejects a changed ownership token', async t => {
  const { api, dir, sockets, intervals } = fixture(t);
  await api.initBaileysClient();
  await sockets[0].ev.listeners('connection.update')[0]({ connection: 'open' });
  const ownerFile = path.join(dir, 'owner.json'), statusFile = path.join(dir, 'status.json');
  fs.writeFileSync(ownerFile, JSON.stringify({ ...read(ownerFile), heartbeatAt: '2020-01-01' }));
  fs.writeFileSync(statusFile, JSON.stringify({ ...read(statusFile), updatedAt: '2020-01-01' }));
  intervals[0].callback();
  assert.ok(Date.now() - new Date(read(ownerFile).heartbeatAt) < 1000);
  assert.ok(Date.now() - new Date(read(statusFile).updatedAt) < 1000);
  fs.writeFileSync(ownerFile, JSON.stringify({ ...read(ownerFile), token: 'replacement' }));
  intervals[0].callback();
  assert.equal(api.isBaileysOwner(), false); assert.equal(sockets[0].closed, true);
  assert.equal(intervals[0].cancelled, true);
});
test('ownership loss cancels reconnects, fences old events/credentials and blocks sends', async t => {
  const state = fixture(t);
  const { api, dir, sockets, timers, intervals } = state;
  await api.initBaileysClient();
  const old = sockets[0];
  const authFile = path.join(dir, 'auth', 'preserve.txt'); fs.writeFileSync(authFile, 'saved credentials');
  await old.ev.listeners('connection.update')[0]({ connection: 'close', lastDisconnect: { error: { statusCode: 408 } } });
  const pending = timers.find(timer => timer.delay === 15000);
  fs.unlinkSync(path.join(dir, 'owner.json'));
  assert.equal(api.getBaileysSocket(), null);
  assert.equal(pending.cancelled, true); assert.equal(intervals[0].cancelled, true);
  await pending.callback();
  await old.ev.listeners('connection.update')[0]({ connection: 'open' });
  await old.ev.listeners('connection.update')[0]({ connection: 'close', lastDisconnect: { error: { statusCode: 401 } } });
  await old.ev.listeners('creds.update')[0]();
  await assert.rejects(api.sendTextMessage('test@g.us', 'mock'), /not connected/);
  assert.equal(sockets.length, 1); assert.equal(state.savedCreds(), 0);
  assert.equal(fs.readFileSync(authFile, 'utf8'), 'saved credentials');
});
test('ownership loss during pending initialization prevents socket creation', async t => {
  let resolve;
  const versionPromise = new Promise(done => { resolve = done; });
  const { api, dir, sockets } = fixture(t, { versionPromise });
  const initializing = api.initBaileysClient();
  await new Promise(done => setImmediate(done));
  fs.unlinkSync(path.join(dir, 'owner.json'));
  resolve(); await initializing;
  assert.equal(sockets.length, 0); assert.equal(api.isBaileysOwner(), false);
});
test('QR recovery and temporary disconnect preserve auth; only explicit owner logout clears it', async t => {
  const { api, dir, sockets } = fixture(t);
  const auth = path.join(dir, 'auth'); fs.mkdirSync(auth);
  const file = path.join(auth, 'preserve.txt'); fs.writeFileSync(file, 'test credentials');
  await api.startFreshQrSession(); assert.equal(fs.existsSync(file), true);
  await sockets[0].ev.listeners('connection.update')[0]({ connection: 'close', lastDisconnect: { error: { statusCode: 408 } } });
  assert.equal(fs.existsSync(file), true);
  await api.initBaileysClient();
  await sockets[1].ev.listeners('connection.update')[0]({ connection: 'close', lastDisconnect: { error: { statusCode: 401 } } });
  assert.equal(fs.existsSync(file), false); // temporary fixture only
  assert.equal(api.getBaileysStatus().state, 'PAIRING_REQUIRED');
});
test('heartbeat and release cannot modify a replacement lock with the same PID', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baileys-token-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'owner.json');
  const lock = ownership(file, 100, () => true, read);
  assert.equal(lock.acquire(), true);
  const replacement = { ...read(file), token: 'new-token', heartbeatAt: '2020-01-01' };
  fs.writeFileSync(file, JSON.stringify(replacement));
  assert.equal(lock.heartbeat(), false); assert.equal(lock.release(), false); assert.equal(lock.acquire(), false);
  assert.deepEqual(read(file), replacement);
});
test('two real Node workers cannot concurrently acquire the connection lock', { timeout: 10000 }, async t => {
  const { spawn } = require('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baileys-workers-'));
  const file = path.join(dir, 'owner.json');
  const script = `const fs=require('fs'); const lock=require(process.argv[1])(process.argv[2],process.pid,pid=>{try{process.kill(Number(pid),0);return true;}catch(e){return e.code==='EPERM';}},file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}); process.on('message',()=>process.send({acquired:lock.acquire()})); process.send({ready:true});`;
  const workers = [0, 1].map(() => spawn(process.execPath, ['-e', script, path.join(__dirname, '../util/baileysOwnership'), file], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] }));
  t.after(async () => {
    await Promise.all(workers.map(worker => new Promise(done => { if (worker.exitCode !== null || worker.signalCode) return done(); worker.once('exit', done); worker.kill(); })));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  await Promise.all(workers.map(worker => new Promise((resolve, reject) => { worker.once('error', reject); worker.once('message', resolve); })));
  const results = workers.map(worker => new Promise(resolve => worker.once('message', resolve)));
  workers.forEach(worker => worker.send('acquire'));
  assert.equal((await Promise.all(results)).filter(result => result.acquired).length, 1);
});

test('text send forwards to a connected owner when this worker has no socket', async t => {
  const { api, dir } = fixture(t);
  const owner = { pid: process.pid, token: 'remote-owner', heartbeatAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify(owner));
  fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({ state: 'CONNECTED', ready: true, ownerPid: owner.pid, ownerToken: owner.token, updatedAt: new Date().toISOString() }));
  assert.equal(api.getBaileysSocket(), null);
  assert.equal((await api.sendTextMessage('test@g.us', 'mock-only')).key.id, 'forwarded');
});
