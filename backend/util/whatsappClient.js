// Compatibility facade only. Baileys is the sole WhatsApp connection owner.
// Importing this module never starts a connection or loads whatsapp-web.js.
const baileys = require('./baileysClient');
module.exports = {
  initWhatsappClient: baileys.initBaileysClient,
  restartWhatsappClient: baileys.initBaileysClient,
  getWhatsappClient: baileys.getBaileysSocket,
  isWhatsappReady: async () => Boolean(baileys.getBaileysSocket()),
  forceCheckWhatsappStatus: async () => baileys.getBaileysStatus(),
  getLatestQr: () => baileys.getBaileysStatus().qr || null,
  destroyWhatsappClient: baileys.disconnectBaileys,
  ensureWhatsappConnected: async () => {
    const socket = baileys.getBaileysSocket();
    if (!socket) throw new Error('Baileys WhatsApp is not connected.');
    return socket;
  },
  // PDF rendering uses its own temporary Chromium; no WhatsApp browser exists.
  getWhatsappBrowser: () => null,
  isWhatsappBrowserAlive: () => false,
  pauseWhatsappHealthForPdf: () => {},
  resumeWhatsappHealthAfterPdf: () => {},
  isWhatsappHealthPausedForPdf: () => false,
  isWhatsappProcessOwner: baileys.isBaileysOwner,
  hasActiveWhatsappOwner: baileys.hasActiveBaileysOwner,
};
