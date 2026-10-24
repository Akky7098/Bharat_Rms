const fs = require('fs');
const { randomUUID } = require('crypto');
// Synchronous, short critical section. A competing worker never removes a lock
// held by a live PID, even if that worker's heartbeat has temporarily stalled.
module.exports = function ownership(file, pid, alive, read) {
  const claim = `${file}.claim`;
  const token = randomUUID();
  const matches = owner => Number(owner?.pid) === pid && owner?.token === token;
  const transact = operation => {
    try { fs.mkdirSync(claim, { mode: 0o700 }); }
    catch (error) { if (error.code === 'EEXIST') return false; throw error; }
    try { return operation(); }
    finally { fs.rmdirSync(claim); }
  };
  const write = data => {
    const temporary = `${file}.${pid}.${token}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally {
      try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  };
  return {
    token,
    isOwner: () => matches(read(file)),
    acquire: () => transact(() => {
      const owner = read(file);
      // A partially written/unreadable existing lock is not safe to steal.
      if (fs.existsSync(file) && (!Number.isInteger(Number(owner?.pid)) || Number(owner.pid) <= 0)) return false;
      if (owner?.pid && alive(owner.pid) && !matches(owner)) return false;
      write({ pid, token, startedAt: matches(owner) ? owner.startedAt : new Date().toISOString(), heartbeatAt: new Date().toISOString() });
      return true;
    }),
    heartbeat: () => transact(() => {
      const owner = read(file);
      if (!matches(owner)) return false;
      write({ ...owner, heartbeatAt: new Date().toISOString() });
      return true;
    }),
    release: () => transact(() => {
      if (!matches(read(file))) return false;
      fs.unlinkSync(file);
      return true;
    }),
  };
};
