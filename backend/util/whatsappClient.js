const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");

let whatsappClient = null;
let isReady = false;
let latestQr = null;

const initWhatsappClient = () => {
  if (whatsappClient) return whatsappClient;

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: "bharat-rms-company-whatsapp",
      dataPath: path.join(__dirname, "../.wwebjs_auth"),
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
  try {
    if (!whatsappClient) return false;

    const state = await whatsappClient.getState();

    console.log("WHATSAPP CURRENT STATE =>", state);

    return state === "CONNECTED";
  } catch (error) {
    console.log("WHATSAPP STATE ERROR =>", error.message);
    return false;
  }
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

module.exports = {
  initWhatsappClient,
  getWhatsappClient,
  isWhatsappReady,
  getLatestQr,
  restartWhatsappClient,
  MessageMedia,
};