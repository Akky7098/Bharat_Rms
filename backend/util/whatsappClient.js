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

const authClientId = "bharat-rms-company-whatsapp";

const whatsappCachePath = path.join(whatsappSessionPath, "wwebjs-cache");
const chromiumUserDataPath = path.join(whatsappSessionPath, "chromium-profile");

const ensureSessionFolder = () => {
  try {
    fs.mkdirSync(whatsappSessionPath, { recursive: true });
    fs.mkdirSync(whatsappCachePath, { recursive: true });
    fs.mkdirSync(chromiumUserDataPath, { recursive: true });

    const testFile = path.join(whatsappSessionPath, "_session_write_test.txt");
    fs.writeFileSync(testFile, "ok");

    console.log("WHATSAPP SESSION PATH =>", whatsappSessionPath);
    console.log(
      "WHATSAPP LOCAL AUTH PATH =>",
      path.join(whatsappSessionPath, `session-${authClientId}`)
    );
    console.log("WHATSAPP CACHE PATH =>", whatsappCachePath);
    console.log("WHATSAPP CHROMIUM PROFILE PATH =>", chromiumUserDataPath);
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
      clientId: authClientId,
      dataPath: whatsappSessionPath,
    }),

    webVersionCache: {
      type: "local",
      path: whatsappCachePath,
    },

    puppeteer: {
      headless: true,
      userDataDir: chromiumUserDataPath,
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
        "--no-first-run",
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
    console.log("WhatsApp session saved at:", whatsappSessionPath);
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

    // Keep system self-healing, but do not delete session.
    setTimeout(() => {
      try {
        initWhatsappClient();
      } catch (error) {
        console.log("WhatsApp auto re-init failed:", error.message);
      }
    }, 5000);
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
      initWhatsappClient();

      return {
        ready: false,
        state: "INITIALIZING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    const state = await whatsappClient.getState().catch(() => null);

    if (state === "CONNECTED") {
      isReady = true;

      return {
        ready: true,
        state,
        qr: null,
        sessionPath: whatsappSessionPath,
      };
    }

    isReady = false;

    return {
      ready: false,
      state: state || "NOT_CONNECTED",
      qr: latestQr,
      sessionPath: whatsappSessionPath,
    };
  } catch (error) {
    isReady = false;

    return {
      ready: false,
      state: "DISCONNECTED",
      error: error.message,
      qr: latestQr,
      sessionPath: whatsappSessionPath,
    };
  }
};

const isWhatsappReady = async () => {
  const status = await forceCheckWhatsappStatus();
  return status.ready;
};

const getLatestQr = () => {
  if (!whatsappClient && !isInitializing) {
    initWhatsappClient();
  }

  return latestQr;
};

const getWhatsappBrowser = () => {
  if (!whatsappClient) {
    initWhatsappClient();
    return null;
  }

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