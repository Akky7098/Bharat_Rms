const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

let whatsappClient = null;
let isReady = false;
let isInitializing = false;
let latestQr = null;

// PDF pause flag
let isPdfUsingWhatsappBrowser = false;

// ======================================================
// SELF RECOVERY CONTROL
// ======================================================

let restartPromise = null;
let lastRestartAttempt = 0;

const RESTART_COOLDOWN_MS = 15000;
const READY_WAIT_TIMEOUT_MS = 60000;

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

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// ======================================================
// SESSION FOLDER
// ======================================================

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

// ======================================================
// PDF HEALTH PAUSE
// ======================================================

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

// ======================================================
// BROWSER ALIVE CHECK
// ======================================================

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

// ======================================================
// WAIT UNTIL REAL WHATSAPP READY EVENT + CONNECTED
// ======================================================

const waitForWhatsappReady = async (
  expectedClient,
  timeoutMs = READY_WAIT_TIMEOUT_MS
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    /*
     * Client was replaced/destroyed while waiting.
     */
    if (
      !expectedClient ||
      whatsappClient !== expectedClient
    ) {
      return false;
    }

    try {
      const browser = expectedClient.pupBrowser;

      if (
        browser &&
        browser.isConnected() &&
        isReady
      ) {
        const state = await expectedClient
          .getState()
          .catch(() => null);

        if (state === "CONNECTED") {
          return true;
        }
      }
    } catch (error) {
      // Still initializing.
    }

    await sleep(1000);
  }

  return false;
};

// ======================================================
// INITIALIZE WHATSAPP
// ======================================================

const initWhatsappClient = () => {
  /*
   * Existing client already exists.
   */
  if (whatsappClient) {
    return whatsappClient;
  }

  /*
   * Never create another Chromium while one is
   * currently being initialized.
   */
  if (isInitializing) {
    console.log(
      "WhatsApp client already initializing..."
    );

    return whatsappClient;
  }

  /*
   * IMPORTANT:
   *
   * If central recovery is currently running,
   * no outside caller is allowed to launch another
   * Chromium.
   */
  if (restartPromise) {
    console.log(
      "WhatsApp initialization blocked: recovery already running"
    );

    return whatsappClient;
  }

  ensureSessionFolder();

  isInitializing = true;
  isReady = false;

  const newClient = new Client({
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

  whatsappClient = newClient;

  // ====================================================
  // QR
  // ====================================================

  newClient.on("qr", (qr) => {
    /*
     * Ignore delayed event from an old/stale client.
     */
    if (whatsappClient !== newClient) {
      return;
    }

    isReady = false;
    isInitializing = false;
    latestQr = qr;

    console.log("Scan WhatsApp QR:");

    qrcode.generate(qr, {
      small: true,
    });
  });

  // ====================================================
  // AUTHENTICATED
  // ====================================================

  newClient.on("authenticated", () => {
    if (whatsappClient !== newClient) {
      return;
    }

    console.log("WhatsApp authenticated");

    console.log(
      "WhatsApp session saved at:",
      whatsappSessionPath
    );
  });

  // ====================================================
  // READY
  // ====================================================

  newClient.on("ready", () => {
    if (whatsappClient !== newClient) {
      return;
    }

    isReady = true;
    isInitializing = false;
    latestQr = null;

    console.log(
      "WhatsApp client is ready"
    );
  });

  // ====================================================
  // AUTH FAILURE
  // ====================================================

  newClient.on("auth_failure", (msg) => {
    if (whatsappClient !== newClient) {
      return;
    }

    isReady = false;
    isInitializing = false;
    latestQr = null;

    console.log(
      "WhatsApp auth failed:",
      msg
    );
  });

  // ====================================================
  // DISCONNECTED
  // ====================================================

  newClient.on(
    "disconnected",
    async (reason) => {
      /*
       * Ignore disconnected event from an old client.
       */
      if (whatsappClient !== newClient) {
        return;
      }

      isReady = false;
      isInitializing = false;
      latestQr = null;

      console.log(
        "WhatsApp disconnected:",
        reason
      );

      whatsappClient = null;

      try {
        await newClient
          .destroy()
          .catch(() => {});
      } catch (error) {
        console.log(
          "WhatsApp destroy after disconnect error:",
          error.message
        );
      }

      /*
       * Don't restart while PDF is actively using
       * Chromium.
       */
      if (isPdfUsingWhatsappBrowser) {
        console.log(
          "WhatsApp recovery postponed: PDF generation running"
        );

        return;
      }

      /*
       * If recovery is already active then it will
       * handle the situation.
       */
      if (restartPromise) {
        console.log(
          "WhatsApp disconnected during active recovery"
        );

        return;
      }

      recoverWhatsappClient({
        reason: `DISCONNECTED_${reason}`,
      }).catch((error) => {
        console.log(
          "WhatsApp disconnect recovery failed:",
          error.message
        );
      });
    }
  );

  // ====================================================
  // INITIALIZE
  // ====================================================

  newClient
    .initialize()
    .catch(async (error) => {
      /*
       * Ignore failure belonging to stale client.
       */
      if (
        whatsappClient &&
        whatsappClient !== newClient
      ) {
        return;
      }

      isReady = false;
      isInitializing = false;
      latestQr = null;

      console.log(
        "WhatsApp initialize error:",
        error.message
      );

      if (whatsappClient === newClient) {
        whatsappClient = null;
      }

      try {
        await newClient
          .destroy()
          .catch(() => {});
      } catch (destroyError) {
        console.log(
          "WhatsApp failed init cleanup error:",
          destroyError.message
        );
      }

      /*
       * DO NOT automatically call initWhatsappClient()
       * here.
       *
       * Recovery/health manager controls retries.
       */
    });

  return newClient;
};

// ======================================================
// CENTRAL RECOVERY
// ======================================================

const recoverWhatsappClient = async ({
  force = false,
  reason = "UNKNOWN",
} = {}) => {
  /*
   * Absolutely only ONE recovery at a time.
   */
  if (restartPromise) {
    console.log(
      "WHATSAPP RECOVERY ALREADY RUNNING =>",
      reason
    );

    return restartPromise;
  }

  /*
   * Don't interfere with a legitimate startup.
   */
  if (isInitializing && whatsappClient) {
    console.log(
      "WHATSAPP RECOVERY SKIPPED => CLIENT INITIALIZING"
    );

    return whatsappClient;
  }

  /*
   * During normal health monitoring we don't restart
   * browser while PDF is active.
   *
   * force=true is used by PDF itself when it discovers
   * the existing Chromium is already dead.
   */
  if (
    isPdfUsingWhatsappBrowser &&
    !force
  ) {
    console.log(
      "WHATSAPP RECOVERY SKIPPED => PDF GENERATION RUNNING"
    );

    return whatsappClient;
  }

  const now = Date.now();

  if (
    !force &&
    now - lastRestartAttempt <
      RESTART_COOLDOWN_MS
  ) {
    console.log(
      "WHATSAPP RECOVERY COOLDOWN ACTIVE =>",
      reason
    );

    return whatsappClient;
  }

  lastRestartAttempt = now;

  /*
   * Create the promise first.
   */
  const recoveryTask = (async () => {
    console.log(
      "========================================"
    );

    console.log(
      "WHATSAPP SELF RECOVERY START =>",
      reason
    );

    console.log(
      "========================================"
    );

    const oldClient = whatsappClient;

    /*
     * Clear global state before destroy.
     *
     * Other callers are blocked by restartPromise.
     */
    whatsappClient = null;
    isReady = false;
    isInitializing = false;
    latestQr = null;

    if (oldClient) {
      try {
        console.log(
          "Destroying stale WhatsApp Chromium..."
        );

        await oldClient
          .destroy()
          .catch((error) => {
            console.log(
              "STALE CLIENT DESTROY WARNING =>",
              error.message
            );
          });
      } catch (error) {
        console.log(
          "STALE CLIENT CLEANUP ERROR =>",
          error.message
        );
      }
    }

    /*
     * Allow Hostinger/Linux to release the old
     * Chromium process and profile lock.
     */
    await sleep(3000);

    console.log(
      "Starting fresh WhatsApp Chromium..."
    );

    /*
     * We are intentionally inside recovery,
     * therefore create client directly here
     * without allowing outside callers to race us.
     */

    ensureSessionFolder();

    isInitializing = true;
    isReady = false;

    const recoveredClient = new Client({
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

    whatsappClient = recoveredClient;

    // ================================================
    // RECOVERED CLIENT EVENTS
    // ================================================

    recoveredClient.on("qr", (qr) => {
      if (
        whatsappClient !== recoveredClient
      ) {
        return;
      }

      isReady = false;
      isInitializing = false;
      latestQr = qr;

      console.log("Scan WhatsApp QR:");

      qrcode.generate(qr, {
        small: true,
      });
    });

    recoveredClient.on(
      "authenticated",
      () => {
        if (
          whatsappClient !== recoveredClient
        ) {
          return;
        }

        console.log(
          "WhatsApp authenticated"
        );

        console.log(
          "WhatsApp session saved at:",
          whatsappSessionPath
        );
      }
    );

    recoveredClient.on("ready", () => {
      if (
        whatsappClient !== recoveredClient
      ) {
        return;
      }

      isReady = true;
      isInitializing = false;
      latestQr = null;

      console.log(
        "WhatsApp client is ready"
      );
    });

    recoveredClient.on(
      "auth_failure",
      (msg) => {
        if (
          whatsappClient !== recoveredClient
        ) {
          return;
        }

        isReady = false;
        isInitializing = false;
        latestQr = null;

        console.log(
          "WhatsApp auth failed:",
          msg
        );
      }
    );

    recoveredClient.on(
      "disconnected",
      async (disconnectReason) => {
        if (
          whatsappClient !== recoveredClient
        ) {
          return;
        }

        isReady = false;
        isInitializing = false;
        latestQr = null;

        console.log(
          "WhatsApp disconnected:",
          disconnectReason
        );

        whatsappClient = null;

        try {
          await recoveredClient
            .destroy()
            .catch(() => {});
        } catch (error) {
          console.log(
            "WhatsApp recovered client destroy error:",
            error.message
          );
        }
      }
    );

    /*
     * Start recovered Chromium.
     */
    try {
      await recoveredClient.initialize();
    } catch (error) {
      isReady = false;
      isInitializing = false;

      if (
        whatsappClient === recoveredClient
      ) {
        whatsappClient = null;
      }

      try {
        await recoveredClient
          .destroy()
          .catch(() => {});
      } catch (destroyError) {
        console.log(
          "Recovery initialize cleanup error =>",
          destroyError.message
        );
      }

      throw error;
    }

    /*
     * IMPORTANT:
     *
     * initialize() finishing does NOT necessarily mean
     * whatsapp-web.js "ready" event has completed.
     *
     * Wait for the REAL ready event and CONNECTED state.
     */
    const connected =
      await waitForWhatsappReady(
        recoveredClient
      );

    if (!connected) {
      console.log(
        "WHATSAPP RECOVERY DID NOT REACH READY/CONNECTED STATE"
      );

      if (
        whatsappClient === recoveredClient
      ) {
        whatsappClient = null;
      }

      isReady = false;
      isInitializing = false;

      try {
        await recoveredClient
          .destroy()
          .catch(() => {});
      } catch (error) {
        console.log(
          "FAILED RECOVERY CLIENT CLEANUP ERROR =>",
          error.message
        );
      }

      throw new Error(
        "WhatsApp Chromium restart timed out"
      );
    }

    console.log(
      "========================================"
    );

    console.log(
      "WHATSAPP SELF RECOVERY SUCCESS"
    );

    console.log(
      "========================================"
    );

    return recoveredClient;
  })();

  restartPromise = recoveryTask;

  try {
    return await recoveryTask;
  } catch (error) {
    console.log(
      "WHATSAPP SELF RECOVERY FAILED =>",
      error.message
    );

    throw error;
  } finally {
    /*
     * Only clear if this exact recovery is still
     * the active one.
     */
    if (
      restartPromise === recoveryTask
    ) {
      restartPromise = null;
    }
  }
};

// ======================================================
// ENSURE CONNECTED
// ======================================================

const ensureWhatsappConnected = async ({
  forceRecovery = false,
} = {}) => {
  /*
   * If recovery is already running, WAIT FOR IT.
   */
  if (restartPromise) {
    console.log(
      "WhatsApp recovery already active. Waiting..."
    );

    return restartPromise;
  }

  /*
   * Don't destroy a normally initializing startup.
   */
  if (
    isInitializing &&
    whatsappClient
  ) {
    console.log(
      "WhatsApp is currently initializing..."
    );

    const clientBeingInitialized =
      whatsappClient;

    const connected =
      await waitForWhatsappReady(
        clientBeingInitialized
      );

    if (connected) {
      return clientBeingInitialized;
    }

    /*
     * Only recover after real initialization timeout.
     */
  }

  try {
    if (
      whatsappClient &&
      isWhatsappBrowserAlive()
    ) {
      const state = await whatsappClient
        .getState()
        .catch(() => null);

      if (
        state === "CONNECTED" &&
        isReady
      ) {
        return whatsappClient;
      }
    }

    console.log(
      "WhatsApp/Chromium unhealthy. Starting recovery..."
    );

    return await recoverWhatsappClient({
      force: forceRecovery,
      reason: "ENSURE_CONNECTED",
    });
  } catch (error) {
    console.log(
      "ensureWhatsappConnected error =>",
      error.message
    );

    throw error;
  }
};

// ======================================================
// GET CLIENT
// ======================================================

const getWhatsappClient = () => {
  /*
   * Existing client.
   */
  if (whatsappClient) {
    return whatsappClient;
  }

  /*
   * NEVER launch another Chromium during recovery.
   */
  if (restartPromise) {
    console.log(
      "getWhatsappClient: recovery running"
    );

    return null;
  }

  /*
   * NEVER launch another Chromium while initializing.
   */
  if (isInitializing) {
    console.log(
      "getWhatsappClient: initialization running"
    );

    return whatsappClient;
  }

  return initWhatsappClient();
};

// ======================================================
// HEALTH CHECK
// ======================================================

const forceCheckWhatsappStatus = async () => {
  try {
    /*
     * PDF currently owns Chromium work.
     */
    if (isPdfUsingWhatsappBrowser) {
      return {
        ready: isReady,
        state: "PDF_GENERATION_RUNNING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    /*
     * CENTRAL RECOVERY IS ACTIVE.
     *
     * Never perform another browser test or restart.
     */
    if (restartPromise) {
      return {
        ready: false,
        state: "RECOVERING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    /*
     * CRITICAL FIX:
     *
     * During normal WhatsApp startup pupBrowser may
     * temporarily not exist yet.
     *
     * That is INITIALIZING, NOT DEAD CHROMIUM.
     */
    if (isInitializing) {
      return {
        ready: false,
        state: "INITIALIZING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    /*
     * No client exists.
     */
    if (!whatsappClient) {
      recoverWhatsappClient({
        reason: "HEALTH_CHECK_NO_CLIENT",
      }).catch((error) => {
        console.log(
          "Health recovery failed =>",
          error.message
        );
      });

      return {
        ready: false,
        state: "RECOVERING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    /*
     * Client exists and initialization is complete.
     *
     * NOW it is safe to determine whether Chromium
     * has actually died.
     */
    if (!isWhatsappBrowserAlive()) {
      isReady = false;

      console.log(
        "WhatsApp health detected dead Chromium"
      );

      recoverWhatsappClient({
        reason:
          "HEALTH_CHECK_BROWSER_DEAD",
      }).catch((error) => {
        console.log(
          "Dead browser recovery failed =>",
          error.message
        );
      });

      return {
        ready: false,
        state: "RECOVERING",
        qr: latestQr,
        sessionPath: whatsappSessionPath,
      };
    }

    /*
     * Browser is alive.
     */
    const state = await whatsappClient
      .getState()
      .catch(() => null);

    if (
      state === "CONNECTED" &&
      isReady
    ) {
      return {
        ready: true,
        state: "CONNECTED",
        qr: null,
        sessionPath: whatsappSessionPath,
      };
    }

    /*
     * Browser is alive but WhatsApp isn't ready.
     */
    isReady = false;

    recoverWhatsappClient({
      reason: `HEALTH_CHECK_STATE_${
        state || "NULL"
      }`,
    }).catch((error) => {
      console.log(
        "WhatsApp state recovery failed =>",
        error.message
      );
    });

    return {
      ready: false,
      state: "RECOVERING",
      qr: latestQr,
      sessionPath: whatsappSessionPath,
    };
  } catch (error) {
    isReady = false;

    console.log(
      "WhatsApp health check error =>",
      error.message
    );

    return {
      ready: false,
      state: restartPromise
        ? "RECOVERING"
        : "DISCONNECTED",
      error: error.message,
      qr: latestQr,
      sessionPath: whatsappSessionPath,
    };
  }
};

// ======================================================
// READY CHECK
// ======================================================

const isWhatsappReady = async () => {
  const status =
    await forceCheckWhatsappStatus();

  return status.ready;
};

// ======================================================
// QR
// ======================================================

const getLatestQr = () => {
  /*
   * Never launch Chromium while recovery/init
   * already owns startup.
   */
  if (
    !whatsappClient &&
    !isInitializing &&
    !restartPromise &&
    !isPdfUsingWhatsappBrowser
  ) {
    initWhatsappClient();
  }

  return latestQr;
};

// ======================================================
// GET ACTIVE PUPPETEER BROWSER
// ======================================================

const getWhatsappBrowser = () => {
  /*
   * IMPORTANT:
   *
   * This function only RETURNS a browser.
   * It never starts Chromium.
   */
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

// ======================================================
// MANUAL RESTART
// ======================================================

const restartWhatsappClient = async () => {
  if (isPdfUsingWhatsappBrowser) {
    console.log(
      "WhatsApp restart skipped: PDF generation running"
    );

    return whatsappClient;
  }

  if (restartPromise) {
    return restartPromise;
  }

  return recoverWhatsappClient({
    force: true,
    reason: "MANUAL_RESTART",
  });
};

// ======================================================
// DESTROY
// ======================================================

const destroyWhatsappClient = async () => {
  const clientToDestroy =
    whatsappClient;

  whatsappClient = null;
  isReady = false;
  isInitializing = false;
  latestQr = null;

  try {
    if (clientToDestroy) {
      await clientToDestroy
        .destroy()
        .catch(() => {});

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

// ======================================================
// EXPORTS
// ======================================================

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
  recoverWhatsappClient,
  isWhatsappBrowserAlive,

  MessageMedia,
};