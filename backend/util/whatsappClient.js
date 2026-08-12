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

// Self-recovery control
let restartPromise = null;
let lastRestartAttempt = 0;

const RESTART_COOLDOWN_MS = 15000;
const READY_WAIT_TIMEOUT_MS = 45000;

const whatsappSessionPath =
  process.env.WHATSAPP_SESSION_PATH ||
  path.join(process.env.HOME || "/home/u607090171", "whatsapp-session");

const authClientId = "bharat-rms-company-whatsapp";
const whatsappCachePath = path.join(whatsappSessionPath, "wwebjs-cache");

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const ensureSessionFolder = () => {
  try {
    fs.mkdirSync(whatsappSessionPath, { recursive: true });
    fs.mkdirSync(whatsappCachePath, { recursive: true });

    const testFile = path.join(
      whatsappSessionPath,
      "_session_write_test.txt"
    );

    fs.writeFileSync(testFile, "ok");

    console.log("WHATSAPP SESSION PATH =>", whatsappSessionPath);

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
   CHECK WHETHER WHATSAPP CHROMIUM IS REALLY ALIVE
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
   WAIT UNTIL WHATSAPP REACHES CONNECTED STATE
========================================================= */

const waitForWhatsappReady = async (
  timeoutMs = READY_WAIT_TIMEOUT_MS
) => {
  const startedAt = Date.now();

  while (
    Date.now() - startedAt < timeoutMs
  ) {
    try {
      if (
        whatsappClient &&
        whatsappClient.pupBrowser &&
        whatsappClient.pupBrowser.isConnected()
      ) {
        const state = await whatsappClient
          .getState()
          .catch(() => null);

        if (state === "CONNECTED") {
          isReady = true;
          isInitializing = false;
          latestQr = null;

          return true;
        }
      }
    } catch (error) {
      // Browser may still be initializing.
    }

    await sleep(1000);
  }

  return false;
};

/* =========================================================
   INITIALIZE WHATSAPP CLIENT
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

  const currentClient = whatsappClient;

  currentClient.on("qr", (qr) => {
    // Ignore stale client events
    if (whatsappClient !== currentClient) {
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
    }
  );

  currentClient.on("ready", async () => {
    if (whatsappClient !== currentClient) {
      return;
    }

    isReady = true;
    isInitializing = false;
    latestQr = null;

    console.log(
      "WhatsApp client is ready"
    );
  });

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
    }
  );

  currentClient.on(
    "disconnected",
    async (reason) => {
      // Ignore event emitted by an already replaced client
      if (whatsappClient !== currentClient) {
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
        await currentClient
          .destroy()
          .catch(() => {});
      } catch (error) {
        console.log(
          "WhatsApp destroy after disconnect error:",
          error.message
        );
      }

      if (isPdfUsingWhatsappBrowser) {
        console.log(
          "WhatsApp recovery postponed: PDF generation running"
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

  currentClient
    .initialize()
    .catch(async (error) => {
      // Ignore failure from an old client that
      // has already been replaced.
      if (
        whatsappClient !== currentClient &&
        whatsappClient !== null
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

      if (whatsappClient === currentClient) {
        whatsappClient = null;
      }

      try {
        await currentClient
          .destroy()
          .catch(() => {});
      } catch (destroyError) {
        console.log(
          "WhatsApp failed init cleanup error:",
          destroyError.message
        );
      }

      /*
       * IMPORTANT:
       *
       * Do NOT immediately call initWhatsappClient()
       * from here.
       *
       * Health check / recovery manager will perform
       * the next controlled restart.
       *
       * This prevents repeated Chromium launch loops.
       */
    });

  return currentClient;
};

/* =========================================================
   CENTRAL WHATSAPP SELF-RECOVERY
========================================================= */

const recoverWhatsappClient = async ({
  force = false,
  reason = "UNKNOWN",
} = {}) => {
  /*
   * Only one restart/recovery can run at a time.
   */
  if (restartPromise) {
    console.log(
      "WHATSAPP RECOVERY ALREADY RUNNING =>",
      reason
    );

    return restartPromise;
  }

  if (isPdfUsingWhatsappBrowser && !force) {
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

  restartPromise = (async () => {
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
     * Clear references first so no request
     * can continue using stale Chromium.
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
     * Allow Linux / Hostinger to release
     * Chromium process/thread resources.
     */
    await sleep(2000);

    console.log(
      "Starting fresh WhatsApp Chromium..."
    );

    const newClient =
      initWhatsappClient();

    if (!newClient) {
      throw new Error(
        "Unable to initialize WhatsApp client"
      );
    }

    const connected =
      await waitForWhatsappReady();

    if (!connected) {
      console.log(
        "WHATSAPP RECOVERY DID NOT REACH CONNECTED STATE"
      );

      /*
       * Do not immediately launch Chromium again.
       * Health check will retry after cooldown.
       */
      if (
        whatsappClient === newClient
      ) {
        whatsappClient = null;
      }

      isReady = false;
      isInitializing = false;

      try {
        await newClient
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

    return whatsappClient;
  })()
    .catch((error) => {
      console.log(
        "WHATSAPP SELF RECOVERY FAILED =>",
        error.message
      );

      throw error;
    })
    .finally(() => {
      restartPromise = null;
    });

  return restartPromise;
};

/* =========================================================
   ENSURE WORKING WHATSAPP / CHROMIUM
========================================================= */

const ensureWhatsappConnected = async ({
  forceRecovery = false,
} = {}) => {
  try {
    /*
     * First verify Chromium itself.
     */
    if (
      whatsappClient &&
      isWhatsappBrowserAlive()
    ) {
      const state = await whatsappClient
        .getState()
        .catch(() => null);

      if (state === "CONNECTED") {
        isReady = true;

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

/* =========================================================
   GET CLIENT
========================================================= */

const getWhatsappClient = () => {
  if (!whatsappClient) {
    return initWhatsappClient();
  }

  return whatsappClient;
};

/* =========================================================
   HEALTH CHECK
========================================================= */

const forceCheckWhatsappStatus =
  async () => {
    try {
      if (isPdfUsingWhatsappBrowser) {
        return {
          ready: isReady,
          state:
            "PDF_GENERATION_RUNNING",
          qr: latestQr,
          sessionPath:
            whatsappSessionPath,
        };
      }

      /*
       * No client exists
       */
      if (!whatsappClient) {
        if (
          !isInitializing &&
          !restartPromise
        ) {
          recoverWhatsappClient({
            reason:
              "HEALTH_CHECK_NO_CLIENT",
          }).catch((error) => {
            console.log(
              "Health recovery failed =>",
              error.message
            );
          });
        }

        return {
          ready: false,
          state: restartPromise
            ? "RECOVERING"
            : "INITIALIZING",
          qr: latestQr,
          sessionPath:
            whatsappSessionPath,
        };
      }

      /*
       * Client exists but Chromium died.
       */
      if (!isWhatsappBrowserAlive()) {
        isReady = false;

        console.log(
          "WhatsApp health detected dead Chromium"
        );

        if (!restartPromise) {
          recoverWhatsappClient({
            reason:
              "HEALTH_CHECK_BROWSER_DEAD",
          }).catch((error) => {
            console.log(
              "Dead browser recovery failed =>",
              error.message
            );
          });
        }

        return {
          ready: false,
          state: "RECOVERING",
          qr: latestQr,
          sessionPath:
            whatsappSessionPath,
        };
      }

      /*
       * Chromium is alive.
       * Now check WhatsApp state.
       */
      const state =
        await whatsappClient
          .getState()
          .catch(() => null);

      if (state === "CONNECTED") {
        isReady = true;

        return {
          ready: true,
          state,
          qr: null,
          sessionPath:
            whatsappSessionPath,
        };
      }

      isReady = false;

      /*
       * Chromium is alive but WhatsApp isn't
       * connected anymore.
       *
       * Use the centralized recovery system.
       */
      if (
        !isInitializing &&
        !restartPromise
      ) {
        recoverWhatsappClient({
          reason:
            `HEALTH_CHECK_STATE_${
              state || "NULL"
            }`,
        }).catch((error) => {
          console.log(
            "WhatsApp state recovery failed =>",
            error.message
          );
        });
      }

      return {
        ready: false,
        state: restartPromise
          ? "RECOVERING"
          : state ||
            "NOT_CONNECTED",
        qr: latestQr,
        sessionPath:
          whatsappSessionPath,
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
        sessionPath:
          whatsappSessionPath,
      };
    }
  };

/* =========================================================
   READY STATUS
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

/* =========================================================
   GET ACTIVE PUPPETEER BROWSER
========================================================= */

const getWhatsappBrowser = () => {
  if (!whatsappClient) {
    /*
     * Do NOT launch a new Chromium just because
     * somebody requested the browser reference.
     *
     * Recovery / PDF code will explicitly handle
     * initialization if required.
     */
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
   MANUAL / CONTROLLED RESTART
========================================================= */

const restartWhatsappClient = async () => {
  if (isPdfUsingWhatsappBrowser) {
    console.log(
      "WhatsApp restart skipped: PDF generation running"
    );

    return whatsappClient;
  }

  return recoverWhatsappClient({
    force: true,
    reason: "MANUAL_RESTART",
  });
};

/* =========================================================
   DESTROY CLIENT
========================================================= */

const destroyWhatsappClient = async () => {
  const clientToDestroy =
    whatsappClient;

  /*
   * Clear reference immediately.
   */
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
  recoverWhatsappClient,
  isWhatsappBrowserAlive,

  MessageMedia,
};