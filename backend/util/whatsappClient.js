const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

let whatsappClient = null;
let isReady = false;
let isInitializing = false;
let isRestarting = false;
let latestQr = null;

// PDF pause flag
let isPdfUsingWhatsappBrowser = false;

// Restart protection
let lastRestartAttempt = 0;

// Health cron already runs every 5 minutes.
// Prevent any accidental duplicate restart.
const RESTART_COOLDOWN_MS = 4 * 60 * 1000;

const whatsappSessionPath =
  process.env.WHATSAPP_SESSION_PATH ||
  path.join(
    process.env.HOME || "/home/u607090171",
    "whatsapp-session"
  );

const authClientId = "bharat-rms-company-whatsapp";

const whatsappCachePath = path.join(
  whatsappSessionPath,
  "wwebjs-cache"
);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/* =========================================================
   LIGHTWEIGHT PROCESS DIAGNOSTICS

   Read-only diagnostics.
   Does NOT kill/restart any process.
========================================================= */

const readProcStatusValue = (pid, key) => {
  try {
    const status = fs.readFileSync(
      `/proc/${pid}/status`,
      "utf8"
    );

    const line = status
      .split("\n")
      .find((item) =>
        item.startsWith(`${key}:`)
      );

    return line
      ? line.split(":").slice(1).join(":").trim()
      : null;
  } catch (error) {
    return null;
  }
};

const getWhatsappChromiumProcessStats = () => {
  try {
    const procEntries = fs
      .readdirSync("/proc")
      .filter((name) => /^\d+$/.test(name));

    let chromiumProcesses = 0;
    let chromiumThreads = 0;
    const chromiumPids = [];

    procEntries.forEach((entry) => {
      const pid = Number(entry);

      try {
        const cmdline = fs
          .readFileSync(
            `/proc/${pid}/cmdline`,
            "utf8"
          )
          .replace(/\0/g, " ");

        if (
          !cmdline ||
          !(
            cmdline.includes("chrome") ||
            cmdline.includes("chromium") ||
            cmdline.includes("headless_shell")
          )
        ) {
          return;
        }

        /*
         * Count only Bharat WhatsApp Chromium/profile.
         */
        if (
          !cmdline.includes(
            "session-bharat-rms-company-whatsapp"
          ) &&
          !cmdline.includes(
            whatsappSessionPath
          )
        ) {
          return;
        }

        chromiumProcesses += 1;
        chromiumPids.push(pid);

        const threadsRaw =
          readProcStatusValue(pid, "Threads");

        const threads = Number(
          String(threadsRaw || "0").split(/\s+/)[0]
        );

        if (Number.isFinite(threads)) {
          chromiumThreads += threads;
        }
      } catch (error) {
        // Process may disappear while /proc is being read.
      }
    });

    return {
      chromiumProcesses,
      chromiumThreads,
      chromiumPids,
    };
  } catch (error) {
    return {
      chromiumProcesses: null,
      chromiumThreads: null,
      chromiumPids: [],
    };
  }
};

const logWhatsappDiagnostics = (
  label,
  client = whatsappClient
) => {
  try {
    const browser =
      client?.pupBrowser || null;

    const browserConnected = Boolean(
      browser?.isConnected?.()
    );

    const browserPid =
      browser?.process?.()?.pid || null;

    const nodeThreadsRaw =
      readProcStatusValue(
        process.pid,
        "Threads"
      );

    const nodeThreads = Number(
      String(nodeThreadsRaw || "0").split(/\s+/)[0]
    );

    const chromium =
      getWhatsappChromiumProcessStats();

    console.log(
      `WHATSAPP DIAGNOSTICS [${label}] =>`,
      {
        nodePid: process.pid,
        nodeThreads:
          Number.isFinite(nodeThreads)
            ? nodeThreads
            : null,
        browserConnected,
        browserPid,
        chromiumProcesses:
          chromium.chromiumProcesses,
        chromiumThreads:
          chromium.chromiumThreads,
        chromiumPids:
          chromium.chromiumPids,
        isReady,
        isInitializing,
        isRestarting,
      }
    );
  } catch (error) {
    console.log(
      `WHATSAPP DIAGNOSTICS [${label}] FAILED =>`,
      error.message
    );
  }
};

/* =========================================================
   SESSION FOLDER
========================================================= */

const ensureSessionFolder = () => {
  try {
    fs.mkdirSync(whatsappSessionPath, {
      recursive: true,
    });

    fs.mkdirSync(whatsappCachePath, {
      recursive: true,
    });

    const testFile = path.join(
      whatsappSessionPath,
      "_session_write_test.txt"
    );

    fs.writeFileSync(testFile, "ok");

    console.log(
      "WHATSAPP SESSION PATH =>",
      whatsappSessionPath
    );

    console.log(
      "WHATSAPP LOCAL AUTH PATH =>",
      path.join(
        whatsappSessionPath,
        `session-${authClientId}`
      )
    );

    console.log(
      "WHATSAPP CACHE PATH =>",
      whatsappCachePath
    );

    console.log(
      "WHATSAPP SESSION WRITE OK =>",
      fs.existsSync(testFile)
    );
  } catch (error) {
    console.log(
      "WHATSAPP SESSION FOLDER ERROR =>",
      error.message
    );
  }
};

/* =========================================================
   PDF PAUSE
========================================================= */

const pauseWhatsappHealthForPdf = () => {
  isPdfUsingWhatsappBrowser = true;

  console.log(
    "WhatsApp health paused for PDF generation"
  );
};

const resumeWhatsappHealthAfterPdf = () => {
  isPdfUsingWhatsappBrowser = false;

  console.log(
    "WhatsApp health resumed after PDF generation"
  );
};

const isWhatsappHealthPausedForPdf = () => {
  return isPdfUsingWhatsappBrowser;
};

/* =========================================================
   SAFE DESTROY

   Important for production:
   Never allow destroy() to wait forever.
========================================================= */

const safeDestroyClient = async (
  client,
  timeoutMs = 5000
) => {
  if (!client) return;

  try {
    await Promise.race([
      client.destroy().catch(() => {}),
      new Promise((resolve) =>
        setTimeout(resolve, timeoutMs)
      ),
    ]);
  } catch (error) {
    console.log(
      "WhatsApp safe destroy warning =>",
      error.message
    );
  }
};

/* =========================================================
   BROWSER STATUS
========================================================= */

const isWhatsappBrowserAlive = () => {
  try {
    if (!whatsappClient) {
      return false;
    }

    const browser = whatsappClient.pupBrowser;

    if (!browser) {
      return false;
    }

    return browser.isConnected();
  } catch (error) {
    return false;
  }
};

/* =========================================================
   INITIALIZE CLIENT

   IMPORTANT:
   This is the ONLY normal place which creates Client.
========================================================= */

const initWhatsappClient = () => {
  if (whatsappClient) {
    return whatsappClient;
  }

  if (isInitializing) {
    console.log(
      "WhatsApp client already initializing..."
    );

    return whatsappClient;
  }

  if (isRestarting) {
    console.log(
      "WhatsApp initialization skipped: restart running"
    );

    return whatsappClient;
  }

  ensureSessionFolder();

  isInitializing = true;
  isReady = false;

  const currentClient = new Client({
    authStrategy: new LocalAuth({
      clientId: authClientId,
      dataPath: whatsappSessionPath,
    }),

    /*
     * IMPORTANT:
     *
     * Do NOT configure webVersionCache here.
     *
     * Production logs showed whatsapp-web.js failing while
     * reading the WhatsApp Web response body:
     *
     * ProtocolError:
     * Could not load response body for this request.
     *
     * LocalAuth remains unchanged.
     */

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
        "--no-first-run",
      ],
    },
  });

  /*
   * =========================================================
   * PRODUCTION FIX
   *
   * whatsapp-web.js may install an internal response listener
   * through initWebVersionCache().
   *
   * The production stack trace showed that response path
   * throwing "Could not load response body".
   *
   * Bypass ONLY optional web-version caching.
   *
   * WhatsApp Web still loads normally.
   * LocalAuth/session remains unchanged.
   * =========================================================
   */

  if (
    typeof currentClient.initWebVersionCache ===
    "function"
  ) {
    currentClient.initWebVersionCache =
      async () => {
        console.log(
          "WHATSAPP WEB VERSION CACHE BYPASSED"
        );
      };
  }

  whatsappClient = currentClient;

  console.log(
    "WHATSAPP CLIENT CREATED =>",
    {
      nodePid: process.pid,
      timestamp: new Date().toISOString(),
    }
  );

  /* ---------------------------------------------------------
     QR
  --------------------------------------------------------- */

  currentClient.on("qr", (qr) => {
    if (whatsappClient !== currentClient) {
      return;
    }

    isReady = false;
    isInitializing = false;
    latestQr = qr;

    console.log("Scan WhatsApp QR:");

    logWhatsappDiagnostics(
      "QR_RECEIVED",
      currentClient
    );

    qrcode.generate(qr, {
      small: true,
    });
  });

  /* ---------------------------------------------------------
     AUTHENTICATED
  --------------------------------------------------------- */

  currentClient.on(
    "authenticated",
    () => {
      if (whatsappClient !== currentClient) {
        return;
      }

      console.log(
        "WhatsApp authenticated"
      );

      console.log(
        "WhatsApp session saved at:",
        whatsappSessionPath
      );

      logWhatsappDiagnostics(
        "AUTHENTICATED",
        currentClient
      );
    }
  );

  /* ---------------------------------------------------------
     READY
  --------------------------------------------------------- */

  currentClient.on("ready", () => {
    if (whatsappClient !== currentClient) {
      return;
    }

    isReady = true;
    isInitializing = false;
    latestQr = null;

    console.log(
      "WhatsApp client is ready"
    );

    logWhatsappDiagnostics(
      "READY",
      currentClient
    );

    /*
     * Attach direct Puppeteer browser disconnect diagnostic.
     */
    try {
      const browser =
        currentClient.pupBrowser;

      if (
        browser &&
        !browser.__bharatDisconnectDiagnosticAttached
      ) {
        browser.__bharatDisconnectDiagnosticAttached =
          true;

        browser.once(
          "disconnected",
          () => {
            console.log(
              "WHATSAPP PUPPETEER BROWSER DISCONNECTED EVENT"
            );

            logWhatsappDiagnostics(
              "BROWSER_DISCONNECTED_EVENT",
              currentClient
            );
          }
        );
      }
    } catch (error) {
      console.log(
        "WhatsApp browser diagnostic hook warning =>",
        error.message
      );
    }
  });

  /* ---------------------------------------------------------
     STATE CHANGE DIAGNOSTIC
  --------------------------------------------------------- */

  currentClient.on(
    "change_state",
    (state) => {
      if (
        whatsappClient !== currentClient
      ) {
        return;
      }

      console.log(
        "WhatsApp state changed =>",
        state
      );
    }
  );

  /* ---------------------------------------------------------
     AUTH FAILURE
  --------------------------------------------------------- */

  currentClient.on(
    "auth_failure",
    (msg) => {
      if (whatsappClient !== currentClient) {
        return;
      }

      isReady = false;
      isInitializing = false;
      latestQr = null;

      console.log(
        "WhatsApp auth failed:",
        msg
      );

      logWhatsappDiagnostics(
        "AUTH_FAILURE",
        currentClient
      );

      /*
       * IMPORTANT:
       * NO automatic Chromium restart here.
       */
    }
  );

  /* ---------------------------------------------------------
     DISCONNECTED
  --------------------------------------------------------- */

  currentClient.on(
    "disconnected",
    async (reason) => {
      if (whatsappClient !== currentClient) {
        return;
      }

      console.log(
        "WhatsApp disconnected:",
        reason
      );

      isReady = false;
      isInitializing = false;
      latestQr = null;

      logWhatsappDiagnostics(
        `DISCONNECTED:${reason}`,
        currentClient
      );

      /*
       * Remove stale global reference.
       */
      whatsappClient = null;

      /*
       * Clean old browser, but never auto-launch another.
       *
       * Health cron will decide about restart later.
       */
      await safeDestroyClient(currentClient);

      console.log(
        "WhatsApp disconnected client cleaned. Waiting for health cron."
      );
    }
  );

  /* ---------------------------------------------------------
     INITIALIZE
  --------------------------------------------------------- */

  console.log(
    "WHATSAPP INITIALIZE START =>",
    {
      nodePid: process.pid,
      timestamp: new Date().toISOString(),
    }
  );

  currentClient
    .initialize()
    .then(() => {
      console.log(
        "WHATSAPP INITIALIZE PROMISE RESOLVED"
      );
    })
    .catch(async (error) => {
      /*
       * Ignore errors belonging to an old client.
       */
      if (
        whatsappClient &&
        whatsappClient !== currentClient
      ) {
        return;
      }

      console.log(
        "WhatsApp initialize error:",
        error.message
      );

      console.log(
        "WHATSAPP INITIALIZE ERROR STACK =>",
        error.stack || "NO_STACK"
      );

      isReady = false;
      isInitializing = false;
      latestQr = null;

      logWhatsappDiagnostics(
        `INITIALIZE_ERROR:${error.message}`,
        currentClient
      );

      if (whatsappClient === currentClient) {
        whatsappClient = null;
      }

      await safeDestroyClient(currentClient);

      /*
       * VERY IMPORTANT:
       *
       * NO auto restart here.
       *
       * This prevents Hostinger Chromium launch loops.
       */
    });

  return currentClient;
};

/* =========================================================
   GET CLIENT

   Does not repeatedly launch Chromium.
========================================================= */

const getWhatsappClient = () => {
  if (whatsappClient) {
    return whatsappClient;
  }

  /*
   * During restart/init do nothing.
   */
  if (isInitializing || isRestarting) {
    return null;
  }

  /*
   * Normal initial startup is allowed.
   */
  return initWhatsappClient();
};

/* =========================================================
   STATUS CHECK

   CRITICAL:
   THIS FUNCTION NEVER RESTARTS CHROMIUM.
   THIS FUNCTION NEVER DESTROYS CHROMIUM.
   THIS FUNCTION IS SAFE TO CALL FROM API ROUTES.
========================================================= */

const forceCheckWhatsappStatus = async () => {
  try {
    if (isPdfUsingWhatsappBrowser) {
      return {
        ready: isReady,
        state: "PDF_GENERATION_RUNNING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    if (isRestarting) {
      return {
        ready: false,
        state: "RESTARTING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    if (isInitializing) {
      return {
        ready: false,
        state: "INITIALIZING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    if (!whatsappClient) {
      return {
        ready: false,
        state: latestQr
          ? "QR_REQUIRED"
          : "NO_CLIENT",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    if (!isWhatsappBrowserAlive()) {
      isReady = false;

      return {
        ready: false,
        state: "BROWSER_DISCONNECTED",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    const state = await whatsappClient
      .getState()
      .catch((error) => {
        console.log(
          "WhatsApp getState warning =>",
          error.message
        );

        return null;
      });

    if (state === "CONNECTED") {
      isReady = true;

      return {
        ready: true,
        state: "CONNECTED",
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

/* =========================================================
   READY CHECK
========================================================= */

const isWhatsappReady = async () => {
  const status =
    await forceCheckWhatsappStatus();

  return status.ready;
};

/* =========================================================
   QR
========================================================= */

const getLatestQr = () => {
  return latestQr;
};

/* =========================================================
   GET PUPPETEER BROWSER

   IMPORTANT:
   NEVER starts Chromium.
========================================================= */

const getWhatsappBrowser = () => {
  if (!whatsappClient) {
    return null;
  }

  try {
    return (
      whatsappClient.pupBrowser ||
      null
    );
  } catch (error) {
    return null;
  }
};

/* =========================================================
   CONTROLLED RESTART

   ONLY HEALTH CRON SHOULD NORMALLY CALL THIS.

   Does NOT wait for WhatsApp "ready".
   Therefore it cannot hold backend/API for 45-60 seconds.
========================================================= */

const restartWhatsappClient = async () => {
  if (isPdfUsingWhatsappBrowser) {
    console.log(
      "WhatsApp restart skipped: PDF generation running"
    );

    return false;
  }

  if (isRestarting) {
    console.log(
      "WhatsApp restart already running"
    );

    return false;
  }

  if (isInitializing) {
    console.log(
      "WhatsApp restart skipped: client still initializing"
    );

    return false;
  }

  const now = Date.now();

  if (
    now - lastRestartAttempt <
    RESTART_COOLDOWN_MS
  ) {
    console.log(
      "WhatsApp restart skipped: cooldown active"
    );

    return false;
  }

  lastRestartAttempt = now;
  isRestarting = true;

  console.log(
    "WhatsApp controlled restart started"
  );

  logWhatsappDiagnostics(
    "BEFORE_CONTROLLED_RESTART",
    whatsappClient
  );

  const oldClient = whatsappClient;

  whatsappClient = null;
  isReady = false;
  isInitializing = false;
  latestQr = null;

  try {
    if (oldClient) {
      await safeDestroyClient(oldClient);
    }

    /*
     * Give Chromium/profile lock time to disappear.
     */
    await sleep(3000);

    /*
     * IMPORTANT:
     * Release restart flag before init because
     * initWhatsappClient blocks while isRestarting=true.
     */
    isRestarting = false;

    initWhatsappClient();

    console.log(
      "WhatsApp controlled restart requested"
    );

    /*
     * We DO NOT wait for authenticated/ready here.
     *
     * Events will update state asynchronously.
     */
    return true;
  } catch (error) {
    console.log(
      "WhatsApp controlled restart error:",
      error.message
    );

    console.log(
      "WHATSAPP CONTROLLED RESTART STACK =>",
      error.stack || "NO_STACK"
    );

    return false;
  } finally {
    isRestarting = false;
  }
};

/* =========================================================
   PDF SAFETY CHECK

   IMPORTANT:
   PDF is NOT allowed to restart Chromium.

   If Chromium isn't available, PDF should fail cleanly.
   Health cron will recover WhatsApp separately.
========================================================= */

const ensureWhatsappConnected = async () => {
  const status =
    await forceCheckWhatsappStatus();

  if (!status.ready) {
    throw new Error(
      `WhatsApp Chromium unavailable (${status.state})`
    );
  }

  return whatsappClient;
};

/* =========================================================
   DESTROY
========================================================= */

const destroyWhatsappClient = async () => {
  const clientToDestroy =
    whatsappClient;

  whatsappClient = null;
  isReady = false;
  isInitializing = false;
  latestQr = null;

  try {
    if (clientToDestroy) {
      logWhatsappDiagnostics(
        "BEFORE_DESTROY",
        clientToDestroy
      );

      await safeDestroyClient(
        clientToDestroy
      );

      console.log(
        "WhatsApp client destroyed"
      );
    }
  } catch (error) {
    console.log(
      "WhatsApp destroy error:",
      error.message
    );
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  initWhatsappClient,
  getWhatsappClient,
  isWhatsappReady,
  getLatestQr,
  restartWhatsappClient,
  destroyWhatsappClient,
  getWhatsappBrowser,
  forceCheckWhatsappStatus,

  pauseWhatsappHealthForPdf,
  resumeWhatsappHealthAfterPdf,
  isWhatsappHealthPausedForPdf,

  ensureWhatsappConnected,
  isWhatsappBrowserAlive,

  MessageMedia,
};