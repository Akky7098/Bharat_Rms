const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");

let whatsappClient = null;
let isReady = false;
let latestQr = null;
  const whatsappSessionPath =
  process.env.WHATSAPP_SESSION_PATH ||
  path.join(__dirname, "../.wwebjs_auth");
const initWhatsappClient = () => {
  if (whatsappClient) return whatsappClient;

  whatsappClient = new Client({
   authStrategy: new LocalAuth({
  clientId: "bharat-rms-company-whatsapp",
  dataPath: whatsappSessionPath,
}),
    puppeteer: {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    "--single-process",
    "--no-zygote",
  ],
},
  });

  whatsappClient.on("qr", (qr) => {
    isReady = false;
    latestQr = qr;

    console.log("Scan WhatsApp QR:");
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on("ready", async () => {
    isReady = true;
    latestQr = null;

    console.log("WhatsApp client is ready");

    try {
      const chats = await whatsappClient.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      console.log("Available WhatsApp Groups:");
      groups.forEach((group) => {
        console.log(`${group.name} => ${group.id._serialized}`);
      });
    } catch (error) {
      console.log("Unable to list WhatsApp groups:", error.message);
    }
  });

  whatsappClient.on("authenticated", () => {
    console.log("WhatsApp authenticated");
  });

  whatsappClient.on("auth_failure", (msg) => {
    isReady = false;
    console.log("WhatsApp auth failed:", msg);
  });

  whatsappClient.on("disconnected", (reason) => {
    isReady = false;
    console.log("WhatsApp disconnected:", reason);
  });

  whatsappClient.initialize();

  return whatsappClient;
};

const getWhatsappClient = () => {
  if (!whatsappClient) return initWhatsappClient();
  return whatsappClient;
};

const isWhatsappReady = async () => {
  const status = await forceCheckWhatsappStatus();
  return status.ready;
};
const getLatestQr = () => latestQr;

const restartWhatsappClient = async () => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
    }
  } catch (error) {
    console.log("WhatsApp destroy error:", error.message);
  }

  whatsappClient = null;
  isReady = false;
  latestQr = null;

  return initWhatsappClient();
};
const destroyWhatsappClient = async () => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
      whatsappClient = null;
      isReady = false;
      latestQr = null;

      console.log("WhatsApp client destroyed");
    }
  } catch (error) {
    console.log("WhatsApp destroy error:", error.message);
  }
};
const getWhatsappBrowser = () => {
  if (!whatsappClient) return null;

  return whatsappClient.pupBrowser || null;
};

const forceCheckWhatsappStatus = async () => {
  try {
    if (!whatsappClient) {
      return {
        ready: false,
        state: "NO_CLIENT",
      };
    }

    const state = await whatsappClient.getState();

    if (state !== "CONNECTED") {
      isReady = false;
      return {
        ready: false,
        state,
      };
    }

    // real test, because sometimes getState stays stale
    await whatsappClient.getChats();

    isReady = true;

    return {
      ready: true,
      state,
    };
  } catch (error) {
    isReady = false;

    return {
      ready: false,
      state: "DISCONNECTED",
      error: error.message,
    };
  }
};
module.exports = {
  initWhatsappClient,
  getWhatsappClient,
  isWhatsappReady,
  getLatestQr,
  restartWhatsappClient,
  destroyWhatsappClient,
  getWhatsappBrowser,
  forceCheckWhatsappStatus,
  MessageMedia,
};