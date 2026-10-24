const cron = require('node-cron');
const { getBaileysStatus, initBaileysClient } = require('../util/baileysClient');
let started = false;
let running = false;
const checkHealth = async () => {
  if (running) return;
  running = true;
  try {
    const status = getBaileysStatus();
    if (!status.ready && !['CONNECTING', 'QR_REQUIRED', 'PAIRING_REQUIRED', 'LOGGED_OUT'].includes(status.state)) {
      // init acquires ownership atomically and never clears saved credentials.
      await initBaileysClient();
    }
  } catch (error) { console.error('Baileys health check failed:', error.message); }
  finally { running = false; }
};
const startWhatsappHealthCron = () => {
  if (started) return;
  started = true;
  cron.schedule('*/5 * * * *', checkHealth, { timezone: 'Asia/Kolkata' });
};
module.exports = startWhatsappHealthCron;
