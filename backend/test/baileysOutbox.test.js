const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const v8 = require('node:v8');
const { randomUUID } = require('node:crypto');
const createOutbox = require('../util/baileysOutbox');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'baileys-outbox-'));
  let owns = true;
  const sends = [];
  const socket = { sendMessage: async (jid, content) => { sends.push({ jid, content }); return { key: { id: `mock-${sends.length}` } }; } };
  const options = { directory, pollMs: 5, queueTtlMs: 500, waitMs: 1000 };
  const owner = createOutbox({ ...options, isOwner: () => owns, getSocket: () => owns ? socket : null });
  const worker = createOutbox({ ...options, isOwner: () => false, getSocket: () => null });
  t.after(() => { owner.stop(); worker.stop(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { directory, owner, worker, sends, socket, lose: () => { owns = false; } };
}
test('non-owner text and PDF requests are sent by the owner with unchanged JID/content', async t => {
  const { owner, worker, sends } = fixture(t);
  owner.start();
  const text = { text: '🔴 *Reminder*\n\nInvoice: INV-1' };
  const receipt = await worker.enqueue('12345@g.us', text);
  assert.equal(receipt.key.id, 'mock-1');
  assert.deepEqual(sends[0], { jid: '12345@g.us', content: text });
  const pdf = { document: Buffer.from('%PDF-mock'), mimetype: 'application/pdf', fileName: 'Invoice.pdf', caption: 'Original caption' };
  await worker.enqueue('919912345678@s.whatsapp.net', pdf);
  assert.deepEqual(sends[1].content, pdf);
  await owner.drain(); assert.equal(sends.length, 2);
});
test('loss of ownership prevents queued sends and expired jobs are not replayed', async t => {
  const { owner, worker, lose, sends, directory } = fixture(t);
  const result = worker.enqueue('test@g.us', { text: 'mock' });
  lose(); await owner.drain();
  assert.equal(sends.length, 0);
  const pending = fs.readdirSync(directory).find(name => name.endsWith('.pending'));
  const job = v8.deserialize(fs.readFileSync(path.join(directory, pending)));
  fs.writeFileSync(path.join(directory, pending), v8.serialize({ ...job, expiresAt: 0 }));
  const recovered = createOutbox({ directory, pollMs: 5, isOwner: () => true, getSocket: () => ({ sendMessage: async () => { throw new Error('must not send'); } }) });
  const rejected = assert.rejects(result, /expired before sending/);
  await recovered.drain(); await rejected;
  assert.equal(sends.length, 0);
});
test('uncertain claimed sends are never retried by a replacement owner', async t => {
  const { owner, worker, sends, socket, directory } = fixture(t);
  socket.sendMessage = async () => { throw new Error('Mock socket failed'); };
  const result = worker.enqueue('test@g.us', { text: 'mock' });
  const rejected = assert.rejects(result, /Delivery may be uncertain/);
  await owner.drain(); await rejected;
  await owner.drain(); assert.equal(sends.length, 0);
  fs.writeFileSync(path.join(directory, `${randomUUID()}.sending`), v8.serialize({ jid: 'test@g.us', content: { text: 'previous uncertain send' } }));
  await owner.drain(); assert.equal(sends.length, 0);
});
test('two drainers cannot claim the same pending request twice', async t => {
  const { owner, worker, sends, socket, directory } = fixture(t);
  const second = createOutbox({ directory, getSocket: () => socket, isOwner: () => true });
  const result = worker.enqueue('test@g.us', { text: 'only once' });
  await Promise.all([owner.drain(), second.drain()]);
  await result; assert.equal(sends.length, 1);
});
test('an unavailable owner times out and removes an unsent pending job', async t => {
  const { directory } = fixture(t);
  const worker = createOutbox({ directory, getSocket: () => null, isOwner: () => false, pollMs: 5, waitMs: 20 });
  await assert.rejects(worker.enqueue('test@g.us', { text: 'mock' }), /not sent/);
  assert.equal(fs.readdirSync(directory).filter(name => name.endsWith('.pending')).length, 0);
});

test('a separate Node owner process receives a PDF request from another worker', { timeout: 10000 }, async () => {
  const { spawn } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'baileys-relay-worker-'));
  const script = `const create=require(process.argv[1]);const outbox=create({directory:process.argv[2],pollMs:5,isOwner:()=>true,getSocket:()=>socket});const socket={sendMessage:async(jid,content)=>{if(jid!=='test@g.us'||!Buffer.isBuffer(content.document)||content.document.toString()!=='%PDF-mock')throw Error('Payload changed');return{key:{id:'child-owner-ack'}};}};outbox.start();process.on('message',()=>{outbox.stop();process.exit(0);});process.send('ready');`;
  const child = spawn(process.execPath, ['-e', script, path.join(__dirname, '../util/baileysOutbox'), directory], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
  try {
    await new Promise((resolve, reject) => { child.once('message', resolve); child.once('error', reject); });
    const worker = createOutbox({ directory, pollMs: 5, waitMs: 1000, isOwner: () => false, getSocket: () => null });
    const result = await worker.enqueue('test@g.us', { document: Buffer.from('%PDF-mock'), mimetype: 'application/pdf', caption: 'test only' });
    assert.equal(result.key.id, 'child-owner-ack');
  } finally {
    if (child.exitCode === null && !child.signalCode) await new Promise(done => { child.once('exit', done); child.kill(); });
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
