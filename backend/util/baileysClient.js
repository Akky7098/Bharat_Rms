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
   - One connection owner per backend runtime
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
// Fences pending initialization and reconnect callbacks when ownership changes.
let lifecycleGeneration = 0;

/*
 * Prevent multiple logout-reset operations
 * from running at the same time.
 */
let isResettingAuth = false;

/* =========================================================
   CONFIG
========================================================= */

const RECONNECT_DELAY_MS =
  15000;

const OWNER_HEARTBEAT_MS =
  15000;

const OWNER_STALE_MS =
  60000;

const QR_RECONNECT_DELAY_MS =
  2000;

/* =========================================================
   LOGGER
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
      // Some hosting environments may block chmod.
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
          mode:
            0o600,
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
  (
    filePath
  ) => {
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
  (
    filePath
  ) => {
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

const removeDirectory =
  (
    directory
  ) => {
    try {
      if (
        fs.existsSync(
          directory
        )
      ) {
        fs.rmSync(
          directory,
          {
            recursive:
              true,

            force:
              true,
          }
        );
      }
    } catch (
      error
    ) {
      console.log(
        "BAILEYS AUTH DIRECTORY REMOVE ERROR =>",
        error.message
      );

      throw error;
    }
  };

const isPidAlive =
  (
    pid
  ) => {
    if (
      !Number.isInteger(Number(pid)) || Number(pid) <= 0
    ) {
      return false;
    }

    try {
      process.kill(
        Number(
          pid
        ),
        0
      );

      return true;
    } catch (error) {
      return error.code === "EPERM";
    }
  };

const ownership = require("./baileysOwnership")(
  OWNER_LOCK_FILE, process.pid, isPidAlive, readJson
);
const ownsLock = () => ownership.isOwner();
const freshTimestamp = value => {
  const age = Date.now() - new Date(value).getTime();
  return Number.isFinite(age) && age >= 0 && age < OWNER_STALE_MS;
};
const stopActingAsOwner = () => {
  lifecycleGeneration++;
  messageOutbox.stop();
  isOwner = false;
  isConnecting = false;
  connectionState = "DISCONNECTED";
  latestQr = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (ownerHeartbeatTimer) clearInterval(ownerHeartbeatTimer);
  ownerHeartbeatTimer = null;
  const old = sock; sock = null;
  try { old?.ws?.close?.(); }
  catch (error) { console.error("BAILEYS SOCKET CLOSE ERROR =>", error.message); }
};
const ensureCurrentOwnership = () => {
  if (!isOwner) return false;
  if (ownsLock() && hasFreshOwner()) return true;
  stopActingAsOwner();
  return false;
};

const messageOutbox = require("./baileysOutbox")({
  directory: path.join(BAILEYS_RUNTIME_PATH, "message-outbox"),
  getSocket: () => getBaileysSocket(),
  isOwner: ensureCurrentOwnership,
});

/* =========================================================
   BAILEYS IMPORT
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

    if (!ensureCurrentOwnership()) return;
    writeJson(
      STATUS_FILE,
      {
        state,

        ready:
          state ===
          "CONNECTED",

        qr:
          latestQr,

        ownerPid: process.pid,
        ownerToken: ownership.token,

        updatedAt:
          new Date()
            .toISOString(),

        ...extra,
      }
    );
  };

const getSharedStatus =
  () => {
    const status = readJson(STATUS_FILE);
    const owner = readJson(OWNER_LOCK_FILE);
    if (!owner || !isPidAlive(owner.pid) || !freshTimestamp(owner.heartbeatAt) ||
        Number(status?.ownerPid) !== Number(owner.pid) || status?.ownerToken !== owner.token || !owner.token) {
      return { ready: false, state: "NO_OWNER", qr: null, ownerPid: null };
    }
    if (!freshTimestamp(status?.updatedAt)) {
      return { ready: false, state: "STALE_STATUS", qr: null, ownerPid: owner.pid };
    }
    return { ...status, ready: status.state === "CONNECTED" && status.ready === true };

  };

/* =========================================================
   OWNER LOCK
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

    return freshTimestamp(owner.heartbeatAt);

  };

const startOwnerHeartbeat =
  () => {
    if (
      ownerHeartbeatTimer
    ) {
      return;
    }

    const update = () => {
      if (!isOwner) return;
      try {
        ownership.heartbeat();
        if (ensureCurrentOwnership()) {
          writeStatus(connectionState, { user: sock?.user?.id || null });
        }
      } catch (error) {
        console.error("BAILEYS HEARTBEAT ERROR =>", error.message);
        ensureCurrentOwnership();
      }
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

const acquireOwnership = () => {
  ensureDirectory(BAILEYS_RUNTIME_PATH);
  if (isOwner && ensureCurrentOwnership()) return true;
  if (!ownership.acquire()) return false;
  isOwner = true;
  startOwnerHeartbeat();
  return true;
};

const releaseOwnership = () => {
  if (!isOwner) return;
  try { ownership.release(); }
  finally {
    if (ownerHeartbeatTimer) clearInterval(ownerHeartbeatTimer);
    ownerHeartbeatTimer = null;
    isOwner = false;
  }
};

/* =========================================================
   RECONNECT
========================================================= */

const scheduleReconnect =
  (
    delay =
      RECONNECT_DELAY_MS
  ) => {
    if (!ensureCurrentOwnership() || reconnectTimer) return;
    const generation = lifecycleGeneration;
    reconnectTimer =
      setTimeout(
        async () => {
          reconnectTimer = null;
          if (generation !== lifecycleGeneration || !ensureCurrentOwnership()) return;
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
        delay
      );

    reconnectTimer
      .unref?.();
  };

/* =========================================================
   CLEAR INVALID LOGGED-OUT AUTH

   IMPORTANT:
   Only call this when WhatsApp explicitly reports
   DisconnectReason.loggedOut in the current owning socket.
   Shared status and QR-page requests never authorize auth deletion.
========================================================= */

const clearLoggedOutAuth =
  async (reason) => {
    if (!baileysModule?.DisconnectReason || reason !== baileysModule.DisconnectReason.loggedOut || !ensureCurrentOwnership()) return;
    if (
      isResettingAuth
    ) {
      return;
    }

    isResettingAuth =
      true;

    try {
      console.log(
        "BAILEYS CLEARING INVALID LOGGED-OUT AUTH"
      );

      if (
        reconnectTimer
      ) {
        clearTimeout(
          reconnectTimer
        );

        reconnectTimer =
          null;
      }

      const old = sock; sock = null;
      try { old?.ws?.close?.(); } catch (error) {}
      if (!ensureCurrentOwnership()) return;
      isConnecting =
        false;

      latestQr =
        null;

      removeDirectory(
        BAILEYS_AUTH_PATH
      );

      ensureDirectory(
        BAILEYS_AUTH_PATH
      );

      writeStatus(
        "PAIRING_REQUIRED"
      );

      console.log(
        "BAILEYS OLD AUTH REMOVED - FRESH QR REQUIRED"
      );
    } finally {
      isResettingAuth =
        false;
    }
  };

/* =========================================================
   START FRESH QR SESSION

   Used by /qr when current state is LOGGED_OUT.
========================================================= */

// Preserve the compatibility entry point, but never clear auth on an HTTP
// request or on the strength of shared status alone. Only explicit logout does.
const startFreshQrSession = async () => initBaileysClient();

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

    const generation = lifecycleGeneration;
    const stillCurrent = () => generation === lifecycleGeneration && ensureCurrentOwnership();
    isConnecting = true;

    latestQr =
      null;

    writeStatus(
      "CONNECTING"
    );

    try {
      ensureDirectory(
        BAILEYS_AUTH_PATH
      );

      const baileys = await loadBaileys();
      if (!stillCurrent()) return null;

      const {
        default:
          makeWASocket,

        useMultiFileAuthState,

        DisconnectReason,

        fetchLatestWaWebVersion,

        Browsers,
      } =
        baileys;

      const {
        state,
        saveCreds,
      } =
        await useMultiFileAuthState(
          BAILEYS_AUTH_PATH
        );
      if (!stillCurrent()) return null;

      const {
        version,
      } =
        await fetchLatestWaWebVersion();

      if (!stillCurrent()) return null;
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
        async () => {
          if (sock !== newSock || !stillCurrent()) return;
          try { await saveCreds(); }
          catch (error) { console.error("BAILEYS SAVE CREDS ERROR =>", error.message); }
        }
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
          if (sock !== newSock || !stillCurrent()) return;

          /*
           * QR RECEIVED
           */
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

          /*
           * CONNECTING
           */
          if (
            connection ===
            "connecting"
          ) {
            /*
             * Don't overwrite QR_REQUIRED if a QR
             * was already received in the same update.
             */
            if (
              !qr
            ) {
              writeStatus(
                "CONNECTING"
              );
            }
          }

          /*
           * CONNECTED
           */
          if (
            connection ===
            "open"
          ) {
            latestQr = null;
            isConnecting = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = null;
            writeStatus(
              "CONNECTED",
              {
                user:
                  newSock
                    .user?.id ||
                  null,
              }
            );

            messageOutbox.start();
            console.log(
              "BAILEYS WHATSAPP CONNECTED"
            );

            return;
          }

          /*
           * CONNECTION CLOSED
           */
          if (
            connection ===
            "close"
          ) {
            isConnecting = false;
            messageOutbox.stop();

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
             * =================================================
             * LOGGED OUT
             *
             * WhatsApp invalidated this linked-device session.
             * Old auth cannot produce a new QR reliably.
             *
             * Clear ONLY this invalid auth and create a fresh
             * pairing socket.
             * =================================================
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
                "BAILEYS LOGGED OUT - PREPARING FRESH QR"
              );

              try {
                await clearLoggedOutAuth(DisconnectReason.loggedOut);

                scheduleReconnect(
                  QR_RECONNECT_DELAY_MS
                );
              } catch (
                error
              ) {
                console.log(
                  "BAILEYS LOGOUT RESET ERROR =>",
                  error.message
                );

                writeStatus(
                  "ERROR",
                  {
                    error:
                      error.message,
                  }
                );
              }

              return;
            }

            /*
             * RESTART REQUIRED
             */
            if (
              statusCode ===
              DisconnectReason.restartRequired
            ) {
              writeStatus(
                "RESTART_REQUIRED"
              );

              scheduleReconnect(
                2000
              );

              return;
            }

            /*
             * NORMAL TEMPORARY DISCONNECT
             */
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

      /*
       * Important:
       * Socket creation is complete, but connection
       * may still be CONNECTING / QR_REQUIRED.
       */
      return newSock;
    } catch (
      error
    ) {
      if (!stillCurrent()) return null;
      isConnecting = false;

      const failedSock = sock;
      sock = null;
      try { failedSock?.ws?.close?.(); }
      catch (closeError) { console.error("BAILEYS SOCKET CLOSE ERROR =>", closeError.message); }
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
      ensureCurrentOwnership()
    ) {
      return {
        ready:
          connectionState === "CONNECTED" && Boolean(sock),

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
      !ensureCurrentOwnership() || connectionState !== "CONNECTED" || !sock
    ) {
      return null;
    }

    return sock;
  };

/* =========================================================
   SEND TEXT
========================================================= */

const sendBaileysMessage = async (jid, content) => {
  const socket = getBaileysSocket();
  if (socket) return socket.sendMessage(jid, content);
  const status = getSharedStatus();
  if (!status.ready) throw new Error(`Baileys WhatsApp is not connected (${status.state}).`);
  return messageOutbox.enqueue(jid, content);
};

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

    return sendBaileysMessage(jid, { text });

  };

/* =========================================================
   PHONE JID
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
      cleaned.length ===
        10
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
   GROUP JID
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
      (
        group
      ) => ({
        id:
          group.id,

        subject:
          group.subject,

        size:
          group.size ||
          group
            .participants
            ?.length ||
          0,
      })
    );
  };

/* =========================================================
   DISCONNECT WITHOUT LOGOUT
========================================================= */

const disconnectBaileys = async () => {
  if (!ensureCurrentOwnership()) return;
  lifecycleGeneration++;
  messageOutbox.stop();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const old = sock; sock = null;
  isConnecting = false;
  latestQr = null;
  writeStatus("DISCONNECTED");
  try { old?.ws?.close?.(); }
  catch (error) { console.error("BAILEYS SOCKET CLOSE ERROR =>", error.message); }
};

/* =========================================================
   LOGOUT

   This explicitly unlinks the WhatsApp linked device.
========================================================= */

const logoutBaileys =
  async () => {
    const currentSock =
      getBaileysSocket();

    if (
      !currentSock
    ) {
      throw new Error(
        "Baileys socket not connected."
      );
    }

    /*
     * Calling logout() causes WhatsApp to invalidate
     * the linked-device credentials.
     *
     * The connection.update loggedOut handler above
     * will then clear the invalid auth and prepare QR.
     */
    await currentSock.logout();
  };

/* =========================================================
   PROCESS CLEANUP
========================================================= */

const cleanup = () => {
  lifecycleGeneration++;
  messageOutbox.stop();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const old = sock; sock = null;
  isConnecting = false;
  if (isOwner && ownsLock()) writeStatus("DISCONNECTED");
  try { old?.ws?.close?.(); }
  catch (error) { console.error("BAILEYS SOCKET CLOSE ERROR =>", error.message); }
  finally { releaseOwnership(); }
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

  startFreshQrSession,

  getBaileysStatus,

  getBaileysSocket,

  sendTextMessage,
  sendBaileysMessage,

  sendTextToPhone,

  sendTextToGroup,

  getParticipatingGroups,

  disconnectBaileys,

  logoutBaileys,

  normalizePhoneJid,

  normalizeGroupJid,
  isBaileysOwner: ensureCurrentOwnership,
  hasActiveBaileysOwner: hasFreshOwner,
};