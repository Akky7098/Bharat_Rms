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

   signal 0 does not kill process.
   It only checks whether the PID exists.
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

    /*
     * If PID no longer exists,
     * the owner is definitely dead.
     */
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

   "wx" means create exclusively.
   If another worker already owns the file,
   this call fails with EEXIST.
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

    /*
     * First attempt.
     */
    if (
      attemptAcquire()
    ) {
      return true;
    }

    /*
     * Existing owner is healthy.
     */
    if (
      hasActiveWhatsappOwner()
    ) {
      return false;
    }

    /*
     * Existing lock is stale.
     *
     * Delete stale ownership metadata,
     * then compete again atomically.
     */
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

   Allows /restart-page to work even when HTTP
   request lands on a NON-OWNER Passenger worker.
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

            /*
             * Only Chromium using
             * Bharat WhatsApp session.
             */
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

   ONLY ONE PASSENGER PROCESS MAY ENTER HERE
   AS THE WHATSAPP OWNER.
========================================================= */

const initWhatsappClient =
  () => {
    /*
     * Acquire cross-process ownership first.
     */
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
         * Keep web version cache disabled because
         * production previously showed response-body
         * ProtocolError in that optional cache path.
         */

        puppeteer: {
          headless: true,

          /*
           * IMPORTANT:
           * --single-process and --no-zygote remain removed.
           */

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
     * Bypass whatsapp-web.js optional response cache.
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

    /* ---------------------------------------------------------
       QR
    --------------------------------------------------------- */

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
            small: true,
          }
        );
      }
    );

    /* ---------------------------------------------------------
       AUTHENTICATED
    --------------------------------------------------------- */

    currentClient.on(
      "authenticated",
      () => {
        if (
          whatsappClient !==
          currentClient
        ) {
          return;
        }

        console.log(
          "WhatsApp authenticated"
        );

        writeSharedWhatsappStatus(
          "AUTHENTICATED",
          {
            ready:
              false,
          }
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

        latestQr =
          null;

        writeSharedWhatsappStatus(
          "CONNECTED",
          {
            ready:
              true,
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

    /* ---------------------------------------------------------
       STATE
    --------------------------------------------------------- */

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

    /* ---------------------------------------------------------
       AUTH FAILURE
    --------------------------------------------------------- */

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

    /* ---------------------------------------------------------
       DISCONNECTED
    --------------------------------------------------------- */

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

    /* ---------------------------------------------------------
       INITIALIZE
    --------------------------------------------------------- */

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
          if (
            whatsappClient &&
            whatsappClient !==
              currentClient
          ) {
            return;
          }

          console.log(
            "WhatsApp initialize error:",
            error.message
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

          latestQr =
            null;

          writeSharedWhatsappStatus(
            "INITIALIZE_ERROR",
            {
              ready:
                false,

              error:
                error.message,
            }
          );

          logWhatsappDiagnostics(
            `INITIALIZE_ERROR:${error.message}`,
            currentClient
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
           * ownership is NOT released.
           *
           * This prevents another Passenger worker
           * from immediately launching another Chromium.
           *
           * Owner health cron will retry later.
           */
        }
      );

    return currentClient;
  };

/* =========================================================
   GET CLIENT

   Non-owner worker NEVER starts another Chromium.
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

    /*
     * Attempt ownership only if there is no healthy owner.
     */
    if (
      !hasActiveWhatsappOwner()
    ) {
      return initWhatsappClient();
    }

    return null;
  };

/* =========================================================
   STATUS

   Owner reads live state.
   Other Passenger workers read shared status.json.
========================================================= */

const forceCheckWhatsappStatus =
  async () => {
    try {
      /*
       * Non-owner worker:
       * never touch Chromium.
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

      if (
        state ===
        "CONNECTED"
      ) {
        isReady =
          true;

        writeSharedWhatsappStatus(
          "CONNECTED",
          {
            ready:
              true,
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
          null,

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

   Works from any Passenger worker.
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

   Only owner process has browser object.
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
     * Request landed on non-owner worker.
     *
     * Queue it for owner.
     */
    if (
      !isWhatsappOwner
    ) {
      /*
       * No living owner:
       * this worker may take ownership.
       */
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

        /*
         * We are now the owner.
         */
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
     * Important:
     * a non-owner worker cannot access owner's
     * Puppeteer Client object.
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
    /*
     * Only owner can destroy Chromium.
     */
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

   Graceful cleanup only.
   SIGKILL cannot run JS cleanup, therefore stale heartbeat
   detection handles hard termination.
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