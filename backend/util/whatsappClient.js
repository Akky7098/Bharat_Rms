const {
  Client,
  LocalAuth,
  MessageMedia,
} = require("whatsapp-web.js");

const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

/* =========================================================
   LOCAL PROCESS STATE

   IMPORTANT:
   These variables belong only to THIS Passenger worker.

   Cross-process state is stored in whatsappRuntimePath below.
========================================================= */

let whatsappClient = null;

let isReady = false;
let isInitializing = false;
let isRestarting = false;

let latestQr = null;

let isPdfUsingWhatsappBrowser = false;

let lastRestartAttempt = 0;

let isWhatsappOwner = false;

let ownerHeartbeatTimer = null;
let restartRequestTimer = null;

/* =========================================================
   CONFIG
========================================================= */

const RESTART_COOLDOWN_MS =
  4 * 60 * 1000;

const OWNER_HEARTBEAT_INTERVAL_MS =
  15 * 1000;

const OWNER_STALE_MS =
  60 * 1000;

const RESTART_REQUEST_CHECK_MS =
  10 * 1000;

const whatsappSessionPath =
  process.env.WHATSAPP_SESSION_PATH ||
  path.join(
    process.env.HOME ||
      "/home/u607090171",
    "whatsapp-session"
  );

const authClientId =
  "bharat-rms-company-whatsapp";

/*
 * Shared runtime folder.
 *
 * This is OUTSIDE deployment/version folders,
 * therefore every Passenger worker sees the
 * same lock/status files.
 */

const whatsappRuntimePath =
  process.env.WHATSAPP_RUNTIME_PATH ||
  path.join(
    process.env.HOME ||
      "/home/u607090171",
    "whatsapp-runtime"
  );

const ownerLockPath =
  path.join(
    whatsappRuntimePath,
    "owner.lock"
  );

const heartbeatPath =
  path.join(
    whatsappRuntimePath,
    "heartbeat.json"
  );

const sharedStatusPath =
  path.join(
    whatsappRuntimePath,
    "status.json"
  );

const restartRequestPath =
  path.join(
    whatsappRuntimePath,
    "restart-request.json"
  );

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

/* =========================================================
   FILE HELPERS
========================================================= */

const ensureRuntimeFolder = () => {
  try {
    fs.mkdirSync(
      whatsappRuntimePath,
      {
        recursive: true,
      }
    );
  } catch (error) {
    console.log(
      "WHATSAPP RUNTIME FOLDER ERROR =>",
      error.message
    );
  }
};

const safeReadJson = (
  filePath
) => {
  try {
    if (
      !fs.existsSync(filePath)
    ) {
      return null;
    }

    const raw =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const safeWriteJson = (
  filePath,
  data
) => {
  try {
    ensureRuntimeFolder();

    const temporaryPath =
      `${filePath}.${process.pid}.tmp`;

    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(
        data,
        null,
        2
      ),
      "utf8"
    );

    fs.renameSync(
      temporaryPath,
      filePath
    );

    return true;
  } catch (error) {
    console.log(
      "WHATSAPP SHARED FILE WRITE ERROR =>",
      error.message
    );

    return false;
  }
};

const safeUnlink = (
  filePath
) => {
  try {
    if (
      fs.existsSync(filePath)
    ) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore cleanup race.
  }
};

/* =========================================================
   PID CHECK
========================================================= */

const isPidAlive = (pid) => {
  if (
    !pid ||
    !Number.isInteger(
      Number(pid)
    )
  ) {
    return false;
  }

  try {
    process.kill(
      Number(pid),
      0
    );

    return true;
  } catch (error) {
    return false;
  }
};

/* =========================================================
   OWNER INFORMATION
========================================================= */

const getOwnerLock = () =>
  safeReadJson(
    ownerLockPath
  );

const getOwnerHeartbeat = () =>
  safeReadJson(
    heartbeatPath
  );

const isOwnerHeartbeatFresh =
  () => {
    const lock =
      getOwnerLock();

    const heartbeat =
      getOwnerHeartbeat();

    if (
      !lock ||
      !lock.pid
    ) {
      return false;
    }

    if (
      !isPidAlive(
        lock.pid
      )
    ) {
      return false;
    }

    if (
      !heartbeat ||
      Number(
        heartbeat.pid
      ) !==
        Number(lock.pid)
    ) {
      return false;
    }

    const timestamp =
      new Date(
        heartbeat.heartbeatAt
      ).getTime();

    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      return false;
    }

    return (
      Date.now() -
        timestamp <
      OWNER_STALE_MS
    );
  };

const hasActiveWhatsappOwner =
  () => {
    return isOwnerHeartbeatFresh();
  };

/* =========================================================
   SHARED STATUS
========================================================= */

const readSharedWhatsappStatus =
  () => {
    const status =
      safeReadJson(
        sharedStatusPath
      );

    if (!status) {
      return {
        ready: false,
        state:
          "NO_CLIENT",
        qr: null,
        error: "",
        ownerPid:
          getOwnerLock()
            ?.pid ||
          null,
        sessionPath:
          whatsappSessionPath,
      };
    }

    return {
      ready:
        Boolean(
          status.ready
        ),

      state:
        status.state ||
        "UNKNOWN",

      qr:
        status.qr ||
        null,

      error:
        status.error ||
        "",

      ownerPid:
        status.ownerPid ||
        null,

      updatedAt:
        status.updatedAt ||
        null,

      sessionPath:
        whatsappSessionPath,
    };
  };

const writeSharedWhatsappStatus =
  (
    state,
    options = {}
  ) => {
    safeWriteJson(
      sharedStatusPath,
      {
        ready:
          Boolean(
            options.ready
          ),

        state,

        qr:
          options.qr ||
          null,

        error:
          options.error ||
          "",

        ownerPid:
          isWhatsappOwner
            ? process.pid
            : getOwnerLock()
                ?.pid ||
              null,

        updatedAt:
          new Date()
            .toISOString(),
      }
    );
  };

/* =========================================================
   OWNERSHIP ACQUISITION
========================================================= */

const tryAcquireWhatsappOwnership =
  () => {
    ensureRuntimeFolder();

    if (
      isWhatsappOwner
    ) {
      return true;
    }

    const attemptAcquire =
      () => {
        let fd = null;

        try {
          fd =
            fs.openSync(
              ownerLockPath,
              "wx"
            );

          const ownerData = {
            pid:
              process.pid,

            startedAt:
              new Date()
                .toISOString(),
          };

          fs.writeFileSync(
            fd,
            JSON.stringify(
              ownerData,
              null,
              2
            ),
            "utf8"
          );

          fs.closeSync(fd);
          fd = null;

          isWhatsappOwner =
            true;

          console.log(
            "WHATSAPP OWNERSHIP ACQUIRED =>",
            {
              pid:
                process.pid,
            }
          );

          startOwnerHeartbeat();

          return true;
        } catch (error) {
          if (fd !== null) {
            try {
              fs.closeSync(fd);
            } catch (
              closeError
            ) {}
          }

          if (
            error.code !==
            "EEXIST"
          ) {
            console.log(
              "WHATSAPP OWNER LOCK ERROR =>",
              error.message
            );

            return false;
          }

          return false;
        }
      };

    if (
      attemptAcquire()
    ) {
      return true;
    }

    if (
      hasActiveWhatsappOwner()
    ) {
      return false;
    }

    console.log(
      "WHATSAPP STALE OWNER LOCK DETECTED"
    );

    safeUnlink(
      ownerLockPath
    );

    safeUnlink(
      heartbeatPath
    );

    return attemptAcquire();
  };

/* =========================================================
   OWNER HEARTBEAT
========================================================= */

function startOwnerHeartbeat() {
  if (
    ownerHeartbeatTimer
  ) {
    return;
  }

  const writeHeartbeat =
    () => {
      if (
        !isWhatsappOwner
      ) {
        return;
      }

      safeWriteJson(
        heartbeatPath,
        {
          pid:
            process.pid,

          heartbeatAt:
            new Date()
              .toISOString(),
        }
      );
    };

  writeHeartbeat();

  ownerHeartbeatTimer =
    setInterval(
      writeHeartbeat,
      OWNER_HEARTBEAT_INTERVAL_MS
    );

  ownerHeartbeatTimer.unref?.();

  startRestartRequestWatcher();
}

/* =========================================================
   RELEASE OWNERSHIP
========================================================= */

const releaseWhatsappOwnership =
  () => {
    if (
      !isWhatsappOwner
    ) {
      return;
    }

    const lock =
      getOwnerLock();

    if (
      Number(
        lock?.pid
      ) ===
      Number(
        process.pid
      )
    ) {
      safeUnlink(
        ownerLockPath
      );

      safeUnlink(
        heartbeatPath
      );
    }

    isWhatsappOwner =
      false;

    if (
      ownerHeartbeatTimer
    ) {
      clearInterval(
        ownerHeartbeatTimer
      );

      ownerHeartbeatTimer =
        null;
    }

    if (
      restartRequestTimer
    ) {
      clearInterval(
        restartRequestTimer
      );

      restartRequestTimer =
        null;
    }

    console.log(
      "WHATSAPP OWNERSHIP RELEASED =>",
      {
        pid:
          process.pid,
      }
    );
  };

/* =========================================================
   RESTART REQUEST
========================================================= */

const queueRestartRequest =
  () => {
    safeWriteJson(
      restartRequestPath,
      {
        requestedByPid:
          process.pid,

        requestedAt:
          new Date()
            .toISOString(),
      }
    );

    console.log(
      "WHATSAPP RESTART REQUEST QUEUED FOR OWNER"
    );

    return true;
  };

function startRestartRequestWatcher() {
  if (
    restartRequestTimer
  ) {
    return;
  }

  restartRequestTimer =
    setInterval(
      async () => {
        if (
          !isWhatsappOwner ||
          isRestarting ||
          isInitializing
        ) {
          return;
        }

        if (
          !fs.existsSync(
            restartRequestPath
          )
        ) {
          return;
        }

        safeUnlink(
          restartRequestPath
        );

        console.log(
          "WHATSAPP OWNER RECEIVED SHARED RESTART REQUEST"
        );

        try {
          await restartWhatsappClient(
            {
              fromOwnerWatcher:
                true,
            }
          );
        } catch (error) {
          console.log(
            "WHATSAPP SHARED RESTART ERROR =>",
            error.message
          );
        }
      },
      RESTART_REQUEST_CHECK_MS
    );

  restartRequestTimer.unref?.();
}

/* =========================================================
   SESSION FOLDER
========================================================= */

const ensureSessionFolder =
  () => {
    try {
      fs.mkdirSync(
        whatsappSessionPath,
        {
          recursive: true,
        }
      );

      const testFile =
        path.join(
          whatsappSessionPath,
          "_session_write_test.txt"
        );

      fs.writeFileSync(
        testFile,
        "ok"
      );

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
        "WHATSAPP SESSION WRITE OK =>",
        fs.existsSync(
          testFile
        )
      );
    } catch (error) {
      console.log(
        "WHATSAPP SESSION FOLDER ERROR =>",
        error.message
      );
    }
  };

/* =========================================================
   PROCESS DIAGNOSTICS
========================================================= */

const readProcStatusValue =
  (pid, key) => {
    try {
      const status =
        fs.readFileSync(
          `/proc/${pid}/status`,
          "utf8"
        );

      const line =
        status
          .split("\n")
          .find(
            (item) =>
              item.startsWith(
                `${key}:`
              )
          );

      return line
        ? line
            .split(":")
            .slice(1)
            .join(":")
            .trim()
        : null;
    } catch (error) {
      return null;
    }
  };

const getWhatsappChromiumProcessStats =
  () => {
    try {
      const procEntries =
        fs
          .readdirSync(
            "/proc"
          )
          .filter(
            (name) =>
              /^\d+$/.test(
                name
              )
          );

      let chromiumProcesses =
        0;

      let chromiumThreads =
        0;

      const chromiumPids =
        [];

      procEntries.forEach(
        (entry) => {
          const pid =
            Number(entry);

          try {
            const cmdline =
              fs
                .readFileSync(
                  `/proc/${pid}/cmdline`,
                  "utf8"
                )
                .replace(
                  /\0/g,
                  " "
                );

            if (
              !cmdline ||
              !(
                cmdline.includes(
                  "chrome"
                ) ||
                cmdline.includes(
                  "chromium"
                ) ||
                cmdline.includes(
                  "headless_shell"
                )
              )
            ) {
              return;
            }

            if (
              !cmdline.includes(
                whatsappSessionPath
              )
            ) {
              return;
            }

            chromiumProcesses +=
              1;

            chromiumPids.push(
              pid
            );

            const threadsRaw =
              readProcStatusValue(
                pid,
                "Threads"
              );

            const threads =
              Number(
                String(
                  threadsRaw ||
                    "0"
                ).split(
                  /\s+/
                )[0]
              );

            if (
              Number.isFinite(
                threads
              )
            ) {
              chromiumThreads +=
                threads;
            }
          } catch (error) {
            // Process disappeared.
          }
        }
      );

      return {
        chromiumProcesses,
        chromiumThreads,
        chromiumPids,
      };
    } catch (error) {
      return {
        chromiumProcesses:
          null,

        chromiumThreads:
          null,

        chromiumPids: [],
      };
    }
  };

const logWhatsappDiagnostics =
  (
    label,
    client = whatsappClient
  ) => {
    try {
      const browser =
        client?.pupBrowser ||
        null;

      const browserConnected =
        Boolean(
          browser
            ?.isConnected
            ?.()
        );

      const browserPid =
        browser
          ?.process
          ?.()
          ?.pid ||
        null;

      const nodeThreadsRaw =
        readProcStatusValue(
          process.pid,
          "Threads"
        );

      const chromium =
        getWhatsappChromiumProcessStats();

      console.log(
        `WHATSAPP DIAGNOSTICS [${label}] =>`,
        {
          processPid:
            process.pid,

          isOwner:
            isWhatsappOwner,

          ownerPid:
            getOwnerLock()
              ?.pid ||
            null,

          nodeThreads:
            Number(
              String(
                nodeThreadsRaw ||
                  "0"
              ).split(
                /\s+/
              )[0]
            ),

          browserConnected,

          browserPid,

          chromiumProcesses:
            chromium
              .chromiumProcesses,

          chromiumThreads:
            chromium
              .chromiumThreads,

          chromiumPids:
            chromium
              .chromiumPids,

          isReady,

          isInitializing,

          isRestarting,
        }
      );
    } catch (error) {
      console.log(
        `WHATSAPP DIAGNOSTICS [${label}] ERROR =>`,
        error.message
      );
    }
  };

/* =========================================================
   PDF PAUSE
========================================================= */

const pauseWhatsappHealthForPdf =
  () => {
    isPdfUsingWhatsappBrowser =
      true;

    console.log(
      "WhatsApp health paused for PDF generation"
    );
  };

const resumeWhatsappHealthAfterPdf =
  () => {
    isPdfUsingWhatsappBrowser =
      false;

    console.log(
      "WhatsApp health resumed after PDF generation"
    );
  };

const isWhatsappHealthPausedForPdf =
  () => {
    return isPdfUsingWhatsappBrowser;
  };

/* =========================================================
   SAFE DESTROY
========================================================= */

const safeDestroyClient =
  async (
    client,
    timeoutMs = 5000
  ) => {
    if (!client) {
      return;
    }

    try {
      await Promise.race([
        client
          .destroy()
          .catch(
            () => {}
          ),

        new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              timeoutMs
            )
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

const isWhatsappBrowserAlive =
  () => {
    try {
      if (
        !isWhatsappOwner ||
        !whatsappClient
      ) {
        return false;
      }

      const browser =
        whatsappClient
          .pupBrowser;

      return Boolean(
        browser &&
          browser.isConnected()
      );
    } catch (error) {
      return false;
    }
  };

/* =========================================================
   INITIALIZE
========================================================= */

const initWhatsappClient =
  () => {
    if (
      !isWhatsappOwner
    ) {
      const acquired =
        tryAcquireWhatsappOwnership();

      if (!acquired) {
        const owner =
          getOwnerLock();

        console.log(
          "WHATSAPP INIT SKIPPED - ANOTHER WORKER OWNS WHATSAPP =>",
          {
            thisPid:
              process.pid,

            ownerPid:
              owner?.pid ||
              null,
          }
        );

        return null;
      }
    }

    if (
      whatsappClient
    ) {
      return whatsappClient;
    }

    if (
      isInitializing
    ) {
      console.log(
        "WhatsApp client already initializing..."
      );

      return whatsappClient;
    }

    if (
      isRestarting
    ) {
      console.log(
        "WhatsApp initialization skipped: restart running"
      );

      return whatsappClient;
    }

    ensureSessionFolder();

    isInitializing =
      true;

    isReady =
      false;

    latestQr =
      null;

    writeSharedWhatsappStatus(
      "INITIALIZING",
      {
        ready: false,
      }
    );

    const currentClient =
      new Client({
        authStrategy:
          new LocalAuth({
            clientId:
              authClientId,

            dataPath:
              whatsappSessionPath,
          }),

        /*
         * Only the owner Passenger worker reaches here.
         * If WhatsApp detects another web session,
         * allow this controlled client to take over.
         */
        takeoverOnConflict:
          true,

        takeoverTimeoutMs:
          10000,

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

    /*
     * Shared-hosting resource control.
     *
     * Do not force all Chromium work into one process.
     * Limit renderer/raster work instead.
     */
    "--renderer-process-limit=1",
    "--num-raster-threads=1",

    "--no-first-run",
  ],
},
      });

    /*
     * Keep this bypass because the production
     * logs previously failed in the optional
     * whatsapp-web.js response-cache path.
     */
    if (
      typeof currentClient
        .initWebVersionCache ===
      "function"
    ) {
      currentClient
        .initWebVersionCache =
        async () => {
          console.log(
            "WHATSAPP WEB VERSION CACHE BYPASSED"
          );
        };
    }

    whatsappClient =
      currentClient;

    console.log(
      "WHATSAPP CLIENT CREATED =>",
      {
        nodePid:
          process.pid,

        ownerPid:
          getOwnerLock()
            ?.pid,

        timestamp:
          new Date()
            .toISOString(),
      }
    );

    /* =====================================================
       QR
    ===================================================== */

    currentClient.on(
      "qr",
      (qr) => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        isReady =
          false;

        /*
         * Browser initialized far enough to
         * produce QR; it is no longer simply
         * "initializing".
         */
        isInitializing =
          false;

        latestQr =
          qr;

        writeSharedWhatsappStatus(
          "QR_REQUIRED",
          {
            ready:
              false,

            qr,
          }
        );

        console.log(
          "Scan WhatsApp QR:"
        );

        logWhatsappDiagnostics(
          "QR_RECEIVED",
          currentClient
        );

        qrcode.generate(
          qr,
          {
            small:
              true,
          }
        );
      }
    );

    /* =====================================================
       AUTHENTICATED
    ===================================================== */

    currentClient.on(
      "authenticated",
      () => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        isReady =
          false;

        console.log(
          "WhatsApp authenticated"
        );

        /*
         * Authentication is not READY yet.
         * Keep QR shared until READY finishes.
         */
        writeSharedWhatsappStatus(
          "AUTHENTICATED",
          {
            ready:
              false,

            qr:
              latestQr,
          }
        );

        logWhatsappDiagnostics(
          "AUTHENTICATED",
          currentClient
        );
      }
    );

    /* =====================================================
       READY
    ===================================================== */

    currentClient.on(
      "ready",
      () => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        isReady =
          true;

        isInitializing =
          false;

        /*
         * Only READY clears QR.
         */
        latestQr =
          null;

        writeSharedWhatsappStatus(
          "CONNECTED",
          {
            ready:
              true,

            qr:
              null,
          }
        );

        console.log(
          "WhatsApp client is ready"
        );

        logWhatsappDiagnostics(
          "READY",
          currentClient
        );

        try {
          const browser =
            currentClient
              .pupBrowser;

          if (
            browser &&
            !browser
              .__bharatDisconnectDiagnosticAttached
          ) {
            browser
              .__bharatDisconnectDiagnosticAttached =
              true;

            browser.once(
              "disconnected",
              () => {
                console.log(
                  "WHATSAPP PUPPETEER BROWSER DISCONNECTED EVENT"
                );

                isReady =
                  false;

                writeSharedWhatsappStatus(
                  "BROWSER_DISCONNECTED",
                  {
                    ready:
                      false,
                  }
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
      }
    );

    /* =====================================================
       STATE CHANGE
    ===================================================== */

    currentClient.on(
      "change_state",
      (state) => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        console.log(
          "WhatsApp state changed =>",
          state
        );
      }
    );

    /* =====================================================
       AUTH FAILURE
    ===================================================== */

    currentClient.on(
      "auth_failure",
      (msg) => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        isReady =
          false;

        isInitializing =
          false;

        latestQr =
          null;

        writeSharedWhatsappStatus(
          "AUTH_FAILURE",
          {
            ready:
              false,

            qr:
              null,

            error:
              String(
                msg ||
                  ""
              ),
          }
        );

        console.log(
          "WhatsApp auth failed:",
          msg
        );

        logWhatsappDiagnostics(
          "AUTH_FAILURE",
          currentClient
        );
      }
    );

    /* =====================================================
       DISCONNECTED
    ===================================================== */

    currentClient.on(
      "disconnected",
      async (
        reason
      ) => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        console.log(
          "WhatsApp disconnected:",
          reason
        );

        isReady =
          false;

        isInitializing =
          false;

        latestQr =
          null;

        writeSharedWhatsappStatus(
          "DISCONNECTED",
          {
            ready:
              false,

            qr:
              null,

            error:
              String(
                reason ||
                  ""
              ),
          }
        );

        logWhatsappDiagnostics(
          `DISCONNECTED:${reason}`,
          currentClient
        );

        whatsappClient =
          null;

        await safeDestroyClient(
          currentClient
        );

        console.log(
          "WhatsApp disconnected client cleaned. Owner remains active for health recovery."
        );
      }
    );

    /* =====================================================
       INITIALIZE
    ===================================================== */

    console.log(
      "WHATSAPP INITIALIZE START =>",
      {
        nodePid:
          process.pid,

        timestamp:
          new Date()
            .toISOString(),
      }
    );

    currentClient
      .initialize()
      .then(() => {
        console.log(
          "WHATSAPP INITIALIZE PROMISE RESOLVED"
        );
      })
      .catch(
        async (
          error
        ) => {
          /*
           * Ignore errors belonging to an
           * obsolete client object.
           */
          if (
            whatsappClient &&
            whatsappClient !==
              currentClient
          ) {
            return;
          }

          const errorMessage =
            String(
              error?.message ||
                ""
            );

          console.log(
            "WhatsApp initialize error:",
            errorMessage
          );

          console.log(
            "WHATSAPP INITIALIZE ERROR STACK =>",
            error.stack ||
              "NO_STACK"
          );

          isReady =
            false;

          isInitializing =
            false;

          logWhatsappDiagnostics(
            `INITIALIZE_ERROR:${errorMessage}`,
            currentClient
          );

          /* =================================================
             CHECK IF BROWSER IS ACTUALLY STILL ALIVE
          ================================================= */

          const browserStillAlive =
            (() => {
              try {
                return Boolean(
                  currentClient
                    ?.pupBrowser
                    ?.isConnected
                    ?.()
                );
              } catch (
                browserCheckError
              ) {
                return false;
              }
            })();

          /*
           * WhatsApp Web may navigate/reload while
           * whatsapp-web.js is injecting JavaScript.
           *
           * These errors can therefore occur even
           * though the actual Chromium browser is alive.
           */
          const isRecoverableNavigationError =
            errorMessage.includes(
              "Execution context was destroyed"
            ) ||
            errorMessage.includes(
              "Navigating frame was detached"
            ) ||
            errorMessage.includes(
              "Cannot find context with specified id"
            );

          if (
            browserStillAlive &&
            isRecoverableNavigationError
          ) {
            console.log(
              "WHATSAPP INITIALIZE NAVIGATION ERROR RECOVERABLE - BROWSER KEPT ALIVE"
            );

            writeSharedWhatsappStatus(
              latestQr
                ? "QR_REQUIRED"
                : "WAITING_FOR_WHATSAPP",
              {
                ready:
                  false,

                qr:
                  latestQr,

                error:
                  errorMessage,
              }
            );

            /*
             * DO NOT:
             *
             * destroy Chromium
             * clear LocalAuth
             * clear owner lock
             * start another browser
             *
             * Health cron will wait instead.
             */
            return;
          }

          /* =================================================
             ACTUAL FATAL INITIALIZE ERROR
          ================================================= */

          latestQr =
            null;

          writeSharedWhatsappStatus(
            "INITIALIZE_ERROR",
            {
              ready:
                false,

              qr:
                null,

              error:
                errorMessage,
            }
          );

          if (
            whatsappClient ===
            currentClient
          ) {
            whatsappClient =
              null;
          }

          await safeDestroyClient(
            currentClient
          );

          /*
           * IMPORTANT:
           *
           * Ownership intentionally remains.
           *
           * Another Passenger worker therefore cannot
           * immediately create another Chromium process.
           */
        }
      );

    return currentClient;
  };

/* =========================================================
   GET CLIENT
========================================================= */

const getWhatsappClient =
  () => {
    if (
      isWhatsappOwner
    ) {
      if (
        whatsappClient
      ) {
        return whatsappClient;
      }

      if (
        isInitializing ||
        isRestarting
      ) {
        return null;
      }

      return initWhatsappClient();
    }

    if (
      !hasActiveWhatsappOwner()
    ) {
      return initWhatsappClient();
    }

    return null;
  };

/* =========================================================
   STATUS
========================================================= */

const forceCheckWhatsappStatus =
  async () => {
    try {
      /*
       * Non-owner Passenger worker reads
       * shared status only.
       */
      if (
        !isWhatsappOwner
      ) {
        const shared =
          readSharedWhatsappStatus();

        if (
          !hasActiveWhatsappOwner()
        ) {
          return {
            ...shared,

            ready:
              false,

            state:
              "NO_OWNER",
          };
        }

        return shared;
      }

      if (
        isPdfUsingWhatsappBrowser
      ) {
        return {
          ready:
            isReady,

          state:
            "PDF_GENERATION_RUNNING",

          qr:
            latestQr,

          ownerPid:
            process.pid,

          sessionPath:
            whatsappSessionPath,
        };
      }

      if (
        isRestarting
      ) {
        return {
          ready:
            false,

          state:
            "RESTARTING",

          qr:
            latestQr,

          ownerPid:
            process.pid,

          sessionPath:
            whatsappSessionPath,
        };
      }

      if (
        isInitializing
      ) {
        return {
          ready:
            false,

          state:
            "INITIALIZING",

          qr:
            latestQr,

          ownerPid:
            process.pid,

          sessionPath:
            whatsappSessionPath,
        };
      }

      if (
        !whatsappClient
      ) {
        return (
          readSharedWhatsappStatus()
        );
      }

      if (
        !isWhatsappBrowserAlive()
      ) {
        isReady =
          false;

        writeSharedWhatsappStatus(
          "BROWSER_DISCONNECTED",
          {
            ready:
              false,
          }
        );

        return (
          readSharedWhatsappStatus()
        );
      }

      const state =
        await whatsappClient
          .getState()
          .catch(
            (
              error
            ) => {
              console.log(
                "WhatsApp getState warning =>",
                error.message
              );

              return null;
            }
          );

      /*
       * These are pairing states,
       * not browser failure states.
       */
      if (
        state ===
          "UNPAIRED" ||
        state ===
          "UNPAIRED_IDLE"
      ) {
        isReady =
          false;

        writeSharedWhatsappStatus(
          "QR_REQUIRED",
          {
            ready:
              false,

            qr:
              latestQr,
          }
        );

        return (
          readSharedWhatsappStatus()
        );
      }

      if (
        state ===
        "CONNECTED"
      ) {
        isReady =
          true;

        latestQr =
          null;

        writeSharedWhatsappStatus(
          "CONNECTED",
          {
            ready:
              true,

            qr:
              null,
          }
        );

        return (
          readSharedWhatsappStatus()
        );
      }

      /*
       * If getState itself failed while browser still
       * exists, do not immediately call it dead.
       */
      if (
        state === null &&
        isWhatsappBrowserAlive()
      ) {
        isReady =
          false;

        writeSharedWhatsappStatus(
          latestQr
            ? "QR_REQUIRED"
            : "WAITING_FOR_WHATSAPP",
          {
            ready:
              false,

            qr:
              latestQr,
          }
        );

        return (
          readSharedWhatsappStatus()
        );
      }

      isReady =
        false;

      writeSharedWhatsappStatus(
        state ||
          "NOT_CONNECTED",
        {
          ready:
            false,

          qr:
            latestQr,
        }
      );

      return (
        readSharedWhatsappStatus()
      );
    } catch (error) {
      isReady =
        false;

      return {
        ready:
          false,

        state:
          "DISCONNECTED",

        error:
          error.message,

        qr:
          latestQr,

        ownerPid:
          getOwnerLock()
            ?.pid ||
          null,

        sessionPath:
          whatsappSessionPath,
      };
    }
  };

/* =========================================================
   READY CHECK
========================================================= */

const isWhatsappReady =
  async () => {
    const status =
      await forceCheckWhatsappStatus();

    return status.ready;
  };

/* =========================================================
   QR
========================================================= */

const getLatestQr =
  () => {
    if (
      isWhatsappOwner
    ) {
      return latestQr;
    }

    return (
      readSharedWhatsappStatus()
        .qr ||
      null
    );
  };

/* =========================================================
   GET BROWSER
========================================================= */

const getWhatsappBrowser =
  () => {
    if (
      !isWhatsappOwner ||
      !whatsappClient
    ) {
      return null;
    }

    try {
      return (
        whatsappClient
          .pupBrowser ||
        null
      );
    } catch (error) {
      return null;
    }
  };

/* =========================================================
   CONTROLLED RESTART
========================================================= */

const restartWhatsappClient =
  async (
    options = {}
  ) => {
    /*
     * Non-owner worker cannot restart Chromium.
     *
     * Queue restart for owner.
     */
    if (
      !isWhatsappOwner
    ) {
      if (
        !hasActiveWhatsappOwner()
      ) {
        const acquired =
          tryAcquireWhatsappOwnership();

        if (
          !acquired
        ) {
          return queueRestartRequest();
        }
      } else {
        return queueRestartRequest();
      }
    }

    if (
      isPdfUsingWhatsappBrowser
    ) {
      console.log(
        "WhatsApp restart skipped: PDF generation running"
      );

      return false;
    }

    if (
      isRestarting
    ) {
      console.log(
        "WhatsApp restart already running"
      );

      return false;
    }

    if (
      isInitializing
    ) {
      console.log(
        "WhatsApp restart skipped: client still initializing"
      );

      return false;
    }

    const now =
      Date.now();

    if (
      now -
        lastRestartAttempt <
        RESTART_COOLDOWN_MS
    ) {
      console.log(
        "WhatsApp restart skipped: cooldown active"
      );

      return false;
    }

    lastRestartAttempt =
      now;

    isRestarting =
      true;

    writeSharedWhatsappStatus(
      "RESTARTING",
      {
        ready:
          false,
      }
    );

    console.log(
      "WhatsApp controlled restart started"
    );

    logWhatsappDiagnostics(
      "BEFORE_CONTROLLED_RESTART",
      whatsappClient
    );

    const oldClient =
      whatsappClient;

    whatsappClient =
      null;

    isReady =
      false;

    isInitializing =
      false;

    latestQr =
      null;

    try {
      if (
        oldClient
      ) {
        await safeDestroyClient(
          oldClient
        );
      }

      /*
       * Give Chromium/profile lock a moment
       * to disappear before creating the next browser.
       */
      await sleep(
        3000
      );

      isRestarting =
        false;

      initWhatsappClient();

      console.log(
        "WhatsApp controlled restart requested"
      );

      return true;
    } catch (error) {
      console.log(
        "WhatsApp controlled restart error:",
        error.message
      );

      writeSharedWhatsappStatus(
        "RESTART_ERROR",
        {
          ready:
            false,

          error:
            error.message,
        }
      );

      return false;
    } finally {
      isRestarting =
        false;
    }
  };

/* =========================================================
   PDF SAFETY CHECK
========================================================= */

const ensureWhatsappConnected =
  async () => {
    const status =
      await forceCheckWhatsappStatus();

    if (
      !status.ready
    ) {
      throw new Error(
        `WhatsApp Chromium unavailable (${status.state})`
      );
    }

    /*
     * A non-owner Passenger worker cannot access
     * another worker's Puppeteer object.
     */
    if (
      !isWhatsappOwner ||
      !whatsappClient
    ) {
      throw new Error(
        "WhatsApp is connected in another Passenger worker"
      );
    }

    return whatsappClient;
  };

/* =========================================================
   DESTROY
========================================================= */

const destroyWhatsappClient =
  async () => {
    if (
      !isWhatsappOwner
    ) {
      return;
    }

    const clientToDestroy =
      whatsappClient;

    whatsappClient =
      null;

    isReady =
      false;

    isInitializing =
      false;

    latestQr =
      null;

    try {
      if (
        clientToDestroy
      ) {
        await safeDestroyClient(
          clientToDestroy
        );
      }

      writeSharedWhatsappStatus(
        "DESTROYED",
        {
          ready:
            false,

          qr:
            null,
        }
      );

      console.log(
        "WhatsApp client destroyed"
      );
    } catch (error) {
      console.log(
        "WhatsApp destroy error:",
        error.message
      );
    }
  };

/* =========================================================
   PROCESS EXIT
========================================================= */

const gracefulOwnershipCleanup =
  () => {
    releaseWhatsappOwnership();
  };

process.once(
  "SIGTERM",
  gracefulOwnershipCleanup
);

process.once(
  "SIGINT",
  gracefulOwnershipCleanup
);

process.once(
  "exit",
  gracefulOwnershipCleanup
);

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

  hasActiveWhatsappOwner,

  isWhatsappProcessOwner:
    () =>
      isWhatsappOwner,

  MessageMedia,
};