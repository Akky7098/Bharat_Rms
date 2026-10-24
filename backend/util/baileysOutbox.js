const fs = require('fs');
const path = require('path');
const v8 = require('v8');
const { randomUUID } = require('crypto');

// Shared by Passenger workers on the same host/runtime directory. Only the
// connection owner drains requests. A claimed/uncertain send is never replayed.
module.exports = function createOutbox({ directory, getSocket, isOwner, pollMs = 250, queueTtlMs = 60000, waitMs = 90000 }) {
  let timer = null, draining = false;
  const ensure = () => fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = (id, suffix) => path.join(directory, `${id}.${suffix}`);
  const write = (target, value) => {
    const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, v8.serialize(value), { mode: 0o600 });
      fs.renameSync(temp, target);
    } finally { try { fs.unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  };
  const remove = target => { try { fs.unlinkSync(target); } catch (error) { if (error.code !== 'ENOENT') throw error; } };
  const read = target => v8.deserialize(fs.readFileSync(target));
  const drain = async () => {
    if (draining || !isOwner() || !getSocket()) return;
    draining = true;
    try {
      ensure();
      const names = fs.readdirSync(directory).filter(name => /^[a-f0-9-]+\.pending$/.test(name));
      for (const name of names) {
        const socket = getSocket();
        if (!isOwner() || !socket) break;
        const id = name.slice(0, -8), pending = file(id, 'pending'), sending = file(id, 'sending');
        try { fs.renameSync(pending, sending); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        let attempted = false;
        try {
          const job = read(sending);
          if (!Number.isFinite(job.expiresAt) || job.expiresAt < Date.now()) throw new Error('WhatsApp request expired before sending.');
          if (!isOwner() || getSocket() !== socket) {
            fs.renameSync(sending, pending);
            break;
          }
          attempted = true;
          const result = await socket.sendMessage(job.jid, job.content);
          write(file(id, 'result'), { ok: true, result: { key: result?.key } });
          remove(sending);
        } catch (error) {
          // No retries after a send attempt: WhatsApp may already have accepted it.
          try {
            write(file(id, 'result'), { ok: false, error: error.message, uncertain: attempted });
            remove(sending);
          } catch (receiptError) {
            console.error('BAILEYS OUTBOX RECEIPT ERROR =>', id, receiptError.message);
          }
        }
      }
      // Bounded retention for abandoned receipts/claimed jobs; never replay them.
      for (const name of fs.readdirSync(directory)) {
        if (!/^[a-f0-9-]+\.(result|sending)$|^[a-f0-9-]+\.(pending|result)\.\d+\.[a-f0-9-]+\.tmp$/.test(name)) continue;
        const target = path.join(directory, name);
        try { if (Date.now() - fs.statSync(target).mtimeMs > 86400000) remove(target); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    } catch (error) { console.error('BAILEYS OUTBOX ERROR =>', error.message); }
    finally { draining = false; }
  };
  const enqueue = async (jid, content) => {
    ensure();
    const id = randomUUID(), pending = file(id, 'pending'), resultFile = file(id, 'result');
    write(pending, { jid, content, expiresAt: Date.now() + queueTtlMs });
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      let receipt;
      try { receipt = read(resultFile); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (receipt) {
        remove(resultFile);
        if (!receipt.ok) throw new Error(`${receipt.error}${receipt.uncertain ? ' Delivery may be uncertain; do not automatically retry.' : ''}`);
        return receipt.result;
      }
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    try { fs.unlinkSync(pending); throw new Error('WhatsApp owner did not process the request before timeout; it was not sent.'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      throw new Error('WhatsApp owner response timed out. Delivery is uncertain; do not automatically retry.');
    }
  };
  return {
    enqueue, drain,
    start: () => {
      if (timer) return;
      timer = setInterval(drain, pollMs);
      timer.unref?.();
      void drain();
    },
    stop: () => { if (timer) clearInterval(timer); timer = null; },
  };
};
