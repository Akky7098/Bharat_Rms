const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

let whatsappClient = null;
let isReady = false;
let isInitializing = false;
let latestQr = null;

const whatsappSessionPath =
  process.env.WHATSAPP_SESSION_PATH ||
  path.join(process.env.HOME || "/home/u607090171", "whatsapp-session");

const ensureSessionFolder = () => {
  try {
    if (!fs.existsSync(whatsappSessionPath)) {
      fs.mkdirSync(whatsappSessionPath, { recursive: true });
    }

    const testFile = path.join(whatsappSessionPath, "_session_write_test.txt");
    fs.writeFileSync(testFile, "ok");

    console.log("WHATSAPP SESSION PATH =>", whatsappSessionPath);
    console.log("WHATSAPP SESSION EXISTS =>", fs.existsSync(whatsappSessionPath));
    console.log("WHATSAPP SESSION WRITE OK =>", fs.existsSync(testFile));
  } catch (error) {
    console.log("WHATSAPP SESSION FOLDER ERROR =>", error.message);
  }
};
const initWhatsappClient = () => {
  if (whatsappClient) return whatsappClient;

  if (isInitializing) {
    console.log("WhatsApp client already initializing...");
    return whatsappClient;
  }

  ensureSessionFolder();

  isInitializing = true;

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
    isInitializing = false;
    latestQr = qr;

    console.log("Scan WhatsApp QR:");
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on("authenticated", () => {
    console.log("WhatsApp authenticated");
    console.log("WhatsApp session should be saved at:", whatsappSessionPath);
  });

  whatsappClient.on("ready", async () => {
    isReady = true;
    isInitializing = false;
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

  whatsappClient.on("auth_failure", (msg) => {
    isReady = false;
    isInitializing = false;
    latestQr = null;

    console.log("WhatsApp auth failed:", msg);
  });

  whatsappClient.on("disconnected", async (reason) => {
    isReady = false;
    isInitializing = false;
    latestQr = null;

    console.log("WhatsApp disconnected:", reason);

    try {
      if (whatsappClient) {
        await whatsappClient.destroy().catch(() => {});
      }
    } catch (error) {
      console.log("WhatsApp destroy after disconnect error:", error.message);
    }

    whatsappClient = null;
  });

  whatsappClient.initialize().catch((error) => {
    isReady = false;
    isInitializing = false;
    latestQr = null;
    whatsappClient = null;

    console.log("WhatsApp initialize error:", error.message);
  });

  return whatsappClient;
};

const getWhatsappClient = () => {
  if (!whatsappClient) {
    return initWhatsappClient();
  }

  return whatsappClient;
};

const forceCheckWhatsappStatus = async () => {
  try {
    if (!whatsappClient) {
      return {
        ready: false,
        state: "NO_CLIENT",
        sessionPath: whatsappSessionPath,
      };
    }

    const state = await whatsappClient.getState();

    if (state !== "CONNECTED") {
      isReady = false;

      return {
        ready: false,
        state: state || "NOT_CONNECTED",
        sessionPath: whatsappSessionPath,
      };
    }

    await whatsappClient.getChats();

    isReady = true;

    return {
      ready: true,
      state,
      sessionPath: whatsappSessionPath,
    };
  } catch (error) {
    isReady = false;

    return {
      ready: false,
      state: "DISCONNECTED",
      error: error.message,
      sessionPath: whatsappSessionPath,
    };
  }
};

const isWhatsappReady = async () => {
  const status = await forceCheckWhatsappStatus();
  return status.ready;
};

const getLatestQr = () => latestQr;

const getWhatsappBrowser = () => {
  if (!whatsappClient) return null;
  return whatsappClient.pupBrowser || null;
};

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
  isInitializing = false;
  latestQr = null;

  return initWhatsappClient();
};

const destroyWhatsappClient = async () => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();

      console.log("WhatsApp client destroyed");
    }
  } catch (error) {
    console.log("WhatsApp destroy error:", error.message);
  }

  whatsappClient = null;
  isReady = false;
  isInitializing = false;
  latestQr = null;
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