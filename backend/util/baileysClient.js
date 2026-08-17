const fs = require("fs");
const path = require("path");
const pino = require("pino");

/* =========================================================
   BAILEYS WHATSAPP CLIENT

   IMPORTANT
   ---------------------------------------------------------
   - NO Chromium
   - NO Puppeteer
   - NO whatsapp-web.js
   - Uses WhatsApp multi-device WebSocket connection
   - One connection per backend process
   - Auth stored outside deployment folders
========================================================= */

/* =========================================================
   PATHS
========================================================= */

const HOME =
  process.env.HOME ||
  "/home/u607090171";

const BAILEYS_AUTH_PATH =
  process.env.BAILEYS_AUTH_PATH ||
  path.join(
    HOME,
    "baileys-auth-bharat"
  );

const BAILEYS_RUNTIME_PATH =
  process.env.BAILEYS_RUNTIME_PATH ||
  path.join(
    HOME,
    "baileys-runtime-bharat"
  );

const OWNER_LOCK_FILE =
  path.join(
    BAILEYS_RUNTIME_PATH,
    "owner.json"
  );

const STATUS_FILE =
  path.join(
    BAILEYS_RUNTIME_PATH,
    "status.json"
  );

/* =========================================================
   INTERNAL STATE
========================================================= */

let sock = null;

let latestQr = null;

let connectionState =
  "DISCONNECTED";

let isConnecting = false;

let reconnectTimer = null;

let ownerHeartbeatTimer =
  null;

let isOwner = false;

let baileysModule = null;

/* =========================================================
   CONFIG
========================================================= */

const RECONNECT_DELAY_MS =
  15000;

const OWNER_HEARTBEAT_MS =
  15000;

const OWNER_STALE_MS =
  60000;

/* =========================================================
   LOGGER

   Keep Baileys logs silent.
   This prevents JIDs / metadata from filling production logs.
========================================================= */

const logger =
  pino({
    level:
      process.env.BAILEYS_LOG_LEVEL ||
      "silent",
  });

/* =========================================================
   UTIL
========================================================= */

const sleep = (ms) =>
  new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );

const ensureDirectory =
  (directory) => {
    if (
      !fs.existsSync(
        directory
      )
    ) {
      fs.mkdirSync(
        directory,
        {
          recursive: true,
          mode: 0o700,
        }
      );
    }

    try {
      fs.chmodSync(
        directory,
        0o700
      );
    } catch (
      error
    ) {
      // Host may restrict chmod.
    }
  };

const writeJson =
  (
    filePath,
    data
  ) => {
    try {
      ensureDirectory(
        path.dirname(
          filePath
        )
      );

      const tempFile =
        `${filePath}.${process.pid}.tmp`;

      fs.writeFileSync(
        tempFile,
        JSON.stringify(
          data,
          null,
          2
        ),
        {
          mode: 0o600,
        }
      );

      fs.renameSync(
        tempFile,
        filePath
      );

      try {
        fs.chmodSync(
          filePath,
          0o600
        );
      } catch (
        error
      ) {}
    } catch (
      error
    ) {
      console.log(
        "BAILEYS STATUS WRITE ERROR =>",
        error.message
      );
    }
  };

const readJson =
  (filePath) => {
    try {
      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return null;
      }

      return JSON.parse(
        fs.readFileSync(
          filePath,
          "utf8"
        )
      );
    } catch (
      error
    ) {
      return null;
    }
  };

const removeFile =
  (filePath) => {
    try {
      if (
        fs.existsSync(
          filePath
        )
      ) {
        fs.unlinkSync(
          filePath
        );
      }
    } catch (
      error
    ) {}
  };

const isPidAlive =
  (pid) => {
    if (!pid) {
      return false;
    }

    try {
      process.kill(
        Number(pid),
        0
      );

      return true;
    } catch (
      error
    ) {
      return false;
    }
  };

/* =========================================================
   BAILEYS IMPORT

   Baileys 7 is ESM.
   Our backend remains CommonJS.
========================================================= */

const loadBaileys =
  async () => {
    if (
      baileysModule
    ) {
      return baileysModule;
    }

    baileysModule =
      await import(
        "@whiskeysockets/baileys"
      );

    return baileysModule;
  };

/* =========================================================
   STATUS
========================================================= */

const writeStatus =
  (
    state,
    extra = {}
  ) => {
    connectionState =
      state;

    writeJson(
      STATUS_FILE,
      {
        state,

        ready:
          state ===
          "CONNECTED",

        qr:
          latestQr,

        ownerPid:
          isOwner
            ? process.pid
            : null,

        updatedAt:
          new Date()
            .toISOString(),

        ...extra,
      }
    );
  };

const getSharedStatus =
  () => {
    const status =
      readJson(
        STATUS_FILE
      );

    if (
      !status
    ) {
      return {
        ready: false,
        state:
          "NOT_STARTED",
        qr: null,
        ownerPid:
          null,
      };
    }

    return status;
  };

/* =========================================================
   OWNER LOCK

   Hostinger Passenger may start multiple Node workers.

   Only ONE worker must own Baileys.
========================================================= */

const hasFreshOwner =
  () => {
    const owner =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      !owner?.pid
    ) {
      return false;
    }

    if (
      !isPidAlive(
        owner.pid
      )
    ) {
      return false;
    }

    const heartbeatTime =
      new Date(
        owner.heartbeatAt ||
        owner.startedAt
      ).getTime();

    if (
      !Number.isFinite(
        heartbeatTime
      )
    ) {
      return false;
    }

    return (
      Date.now() -
        heartbeatTime <
      OWNER_STALE_MS
    );
  };

const startOwnerHeartbeat =
  () => {
    if (
      ownerHeartbeatTimer
    ) {
      return;
    }

    const update =
      () => {
        if (
          !isOwner
        ) {
          return;
        }

        writeJson(
          OWNER_LOCK_FILE,
          {
            pid:
              process.pid,

            startedAt:
              readJson(
                OWNER_LOCK_FILE
              )
                ?.startedAt ||
              new Date()
                .toISOString(),

            heartbeatAt:
              new Date()
                .toISOString(),
          }
        );
      };

    update();

    ownerHeartbeatTimer =
      setInterval(
        update,
        OWNER_HEARTBEAT_MS
      );

    ownerHeartbeatTimer
      .unref?.();
  };

const acquireOwnership =
  () => {
    ensureDirectory(
      BAILEYS_RUNTIME_PATH
    );

    if (
      isOwner
    ) {
      return true;
    }

    const existing =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      existing &&
      hasFreshOwner()
    ) {
      return (
        Number(
          existing.pid
        ) ===
        Number(
          process.pid
        )
      );
    }

    removeFile(
      OWNER_LOCK_FILE
    );

    writeJson(
      OWNER_LOCK_FILE,
      {
        pid:
          process.pid,

        startedAt:
          new Date()
            .toISOString(),

        heartbeatAt:
          new Date()
            .toISOString(),
      }
    );

    const verification =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      Number(
        verification?.pid
      ) !==
      Number(
        process.pid
      )
    ) {
      return false;
    }

    isOwner =
      true;

    console.log(
      "BAILEYS OWNERSHIP ACQUIRED =>",
      process.pid
    );

    startOwnerHeartbeat();

    return true;
  };

const releaseOwnership =
  () => {
    if (
      !isOwner
    ) {
      return;
    }

    const owner =
      readJson(
        OWNER_LOCK_FILE
      );

    if (
      Number(
        owner?.pid
      ) ===
      Number(
        process.pid
      )
    ) {
      removeFile(
        OWNER_LOCK_FILE
      );
    }

    if (
      ownerHeartbeatTimer
    ) {
      clearInterval(
        ownerHeartbeatTimer
      );

      ownerHeartbeatTimer =
        null;
    }

    isOwner =
      false;
  };

/* =========================================================
   RECONNECT
========================================================= */

const scheduleReconnect =
  () => {
    if (
      reconnectTimer
    ) {
      return;
    }

    reconnectTimer =
      setTimeout(
        async () => {
          reconnectTimer =
            null;

          try {
            await initBaileysClient();
          } catch (
            error
          ) {
            console.log(
              "BAILEYS RECONNECT FAILED =>",
              error.message
            );

            scheduleReconnect();
          }
        },
        RECONNECT_DELAY_MS
      );

    reconnectTimer
      .unref?.();
  };

/* =========================================================
   INITIALIZE
========================================================= */

const initBaileysClient =
  async () => {
    if (
      !acquireOwnership()
    ) {
      console.log(
        "BAILEYS INIT SKIPPED - ANOTHER WORKER OWNS CONNECTION"
      );

      return null;
    }

    if (
      isConnecting
    ) {
      return sock;
    }

    if (
      sock &&
      connectionState ===
        "CONNECTED"
    ) {
      return sock;
    }

    isConnecting =
      true;

    latestQr =
      null;

    writeStatus(
      "CONNECTING"
    );

    try {
      ensureDirectory(
        BAILEYS_AUTH_PATH
      );

      const baileys =
        await loadBaileys();

      const {
        default:
          makeWASocket,

        useMultiFileAuthState,

        DisconnectReason,

        fetchLatestWaWebVersion,

        Browsers,
      } =
        baileys;

      /*
       * For initial production testing we're using
       * Baileys' multi-file auth helper.
       *
       * At your scale:
       * one number + 12-15 messages/day,
       * this is acceptable for testing.
       *
       * Later we can move auth state to MongoDB.
       */
      const {
        state,
        saveCreds,
      } =
        await useMultiFileAuthState(
          BAILEYS_AUTH_PATH
        );

      /*
       * Current Baileys RC has had reports where the
       * bundled WA version became stale.
       *
       * Use the latest WA Web version.
       */
      const {
        version,
      } =
        await fetchLatestWaWebVersion();

      console.log(
        "BAILEYS WA VERSION =>",
        version.join(".")
      );

      const newSock =
        makeWASocket({
          version,

          auth:
            state,

          logger,

          printQRInTerminal:
            false,

          markOnlineOnConnect:
            false,

          syncFullHistory:
            false,

          generateHighQualityLinkPreview:
            false,

          browser:
            Browsers.macOS(
              "Desktop"
            ),

          connectTimeoutMs:
            60000,

          defaultQueryTimeoutMs:
            60000,

          keepAliveIntervalMs:
            25000,

          retryRequestDelayMs:
            250,
        });

      sock =
        newSock;

      /* =====================================================
         SAVE AUTH
      ===================================================== */

      newSock.ev.on(
        "creds.update",
        saveCreds
      );

      /* =====================================================
         CONNECTION UPDATE
      ===================================================== */

      newSock.ev.on(
        "connection.update",
        async (
          update
        ) => {
          const {
            connection,
            lastDisconnect,
            qr,
          } =
            update;

          if (
            qr
          ) {
            latestQr =
              qr;

            writeStatus(
              "QR_REQUIRED"
            );

            console.log(
              "BAILEYS QR READY"
            );
          }

          if (
            connection ===
            "connecting"
          ) {
            writeStatus(
              "CONNECTING"
            );
          }

          if (
            connection ===
            "open"
          ) {
            latestQr =
              null;

            isConnecting =
              false;

            writeStatus(
              "CONNECTED",
              {
                user:
                  newSock
                    .user?.id ||
                  null,
              }
            );

            console.log(
              "BAILEYS WHATSAPP CONNECTED"
            );

            return;
          }

          if (
            connection ===
            "close"
          ) {
            isConnecting =
              false;

            if (
              sock ===
              newSock
            ) {
              sock =
                null;
            }

            let statusCode =
              null;

            try {
              statusCode =
                lastDisconnect
                  ?.error
                  ?.output
                  ?.statusCode ||
                lastDisconnect
                  ?.error
                  ?.statusCode ||
                null;
            } catch (
              error
            ) {}

            console.log(
              "BAILEYS CONNECTION CLOSED =>",
              statusCode
            );

            /*
             * LOGGED OUT
             *
             * Do not reconnect endlessly.
             * A fresh QR is required.
             */
            if (
              statusCode ===
              DisconnectReason.loggedOut
            ) {
              latestQr =
                null;

              writeStatus(
                "LOGGED_OUT"
              );

              console.log(
                "BAILEYS LOGGED OUT - QR REQUIRED"
              );

              return;
            }

            /*
             * WhatsApp often intentionally closes the
             * first socket after pairing.
             *
             * restartRequired means credentials are valid;
             * simply reconnect.
             */
            if (
              statusCode ===
              DisconnectReason.restartRequired
            ) {
              writeStatus(
                "RESTART_REQUIRED"
              );

              scheduleReconnect();

              return;
            }

            writeStatus(
              "DISCONNECTED",
              {
                disconnectCode:
                  statusCode,
              }
            );

            scheduleReconnect();
          }
        }
      );

      isConnecting =
        false;

      return newSock;
    } catch (
      error
    ) {
      isConnecting =
        false;

      sock =
        null;

      writeStatus(
        "ERROR",
        {
          error:
            error.message,
        }
      );

      console.log(
        "BAILEYS INIT ERROR =>",
        error.message
      );

      scheduleReconnect();

      throw error;
    }
  };

/* =========================================================
   STATUS
========================================================= */

const getBaileysStatus =
  () => {
    if (
      isOwner
    ) {
      return {
        ready:
          connectionState ===
          "CONNECTED",

        state:
          connectionState,

        qr:
          latestQr,

        ownerPid:
          process.pid,
      };
    }

    return getSharedStatus();
  };

/* =========================================================
   GET SOCKET
========================================================= */

const getBaileysSocket =
  () => {
    if (
      connectionState !==
        "CONNECTED" ||
      !sock
    ) {
      return null;
    }

    return sock;
  };

/* =========================================================
   SEND TEXT
========================================================= */

const sendTextMessage =
  async (
    jid,
    text
  ) => {
    if (
      !jid
    ) {
      throw new Error(
        "WhatsApp JID is required."
      );
    }

    if (
      !text
    ) {
      throw new Error(
        "WhatsApp message is required."
      );
    }

    const currentSock =
      getBaileysSocket();

    if (
      !currentSock
    ) {
      throw new Error(
        "Baileys WhatsApp is not connected."
      );
    }

    return currentSock.sendMessage(
      jid,
      {
        text,
      }
    );
  };

/* =========================================================
   SEND TO PHONE
========================================================= */

const normalizePhoneJid =
  (
    number
  ) => {
    const cleaned =
      String(
        number ||
          ""
      ).replace(
        /\D/g,
        ""
      );

    if (
      !cleaned
    ) {
      throw new Error(
        "WhatsApp phone number is required."
      );
    }

    const normalized =
      cleaned.length === 10
        ? `91${cleaned}`
        : cleaned;

    return `${normalized}@s.whatsapp.net`;
  };

const sendTextToPhone =
  async (
    number,
    text
  ) => {
    const jid =
      normalizePhoneJid(
        number
      );

    return sendTextMessage(
      jid,
      text
    );
  };

/* =========================================================
   SEND TO GROUP
========================================================= */

const normalizeGroupJid =
  (
    groupId
  ) => {
    const value =
      String(
        groupId ||
          ""
      ).trim();

    if (
      !value
    ) {
      throw new Error(
        "WhatsApp group ID is required."
      );
    }

    if (
      value.endsWith(
        "@g.us"
      )
    ) {
      return value;
    }

    return `${value}@g.us`;
  };

const sendTextToGroup =
  async (
    groupId,
    text
  ) => {
    const jid =
      normalizeGroupJid(
        groupId
      );

    return sendTextMessage(
      jid,
      text
    );
  };

/* =========================================================
   GET GROUPS

   Useful once after login so we can obtain the
   exact group ID for your Sales Order group.
========================================================= */

const getParticipatingGroups =
  async () => {
    const currentSock =
      getBaileysSocket();

    if (
      !currentSock
    ) {
      throw new Error(
        "Baileys WhatsApp is not connected."
      );
    }

    const groups =
      await currentSock
        .groupFetchAllParticipating();

    return Object.values(
      groups
    ).map(
      (group) => ({
        id:
          group.id,

        subject:
          group.subject,

        size:
          group.size ||
          group.participants
            ?.length ||
          0,
      })
    );
  };

/* =========================================================
   DISCONNECT WITHOUT LOGOUT
========================================================= */

const disconnectBaileys =
  async () => {
    if (
      reconnectTimer
    ) {
      clearTimeout(
        reconnectTimer
      );

      reconnectTimer =
        null;
    }

    if (
      sock
    ) {
      try {
        sock.ws?.close?.();
      } catch (
        error
      ) {}
    }

    sock =
      null;

    connectionState =
      "DISCONNECTED";

    writeStatus(
      "DISCONNECTED"
    );
  };

/* =========================================================
   LOGOUT

   IMPORTANT:
   This unlinks the WhatsApp device and requires QR again.
========================================================= */

const logoutBaileys =
  async () => {
    if (
      !sock
    ) {
      throw new Error(
        "Baileys socket not connected."
      );
    }

    await sock.logout();

    sock =
      null;

    latestQr =
      null;

    writeStatus(
      "LOGGED_OUT"
    );
  };

/* =========================================================
   PROCESS CLEANUP
========================================================= */

const cleanup =
  () => {
    releaseOwnership();
  };

process.once(
  "SIGTERM",
  cleanup
);

process.once(
  "SIGINT",
  cleanup
);

process.once(
  "exit",
  cleanup
);

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  initBaileysClient,

  getBaileysStatus,

  getBaileysSocket,

  sendTextMessage,

  sendTextToPhone,

  sendTextToGroup,

  getParticipatingGroups,

  disconnectBaileys,

  logoutBaileys,

  normalizePhoneJid,

  normalizeGroupJid,
};