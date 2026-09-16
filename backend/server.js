require("dotenv").config();

const http = require("http");

const startPaymentReminderCron =
  require("./cron/paymentReminderCron");

const startAttendanceCron =
  require("./cron/attendanceCron");

const startAttendanceSummaryCron =
  require("./cron/attendanceSummaryCron");

const startAttendanceNotificationCron =
  require("./cron/attendanceNotificationCron");

const startEnquiryDelayNotificationCron =
  require("./cron/enquiryDelayNotificationCron");

const startSalesDailyInsightCron =
  require("./cron/salesDailyInsightCron");

/* =========================================================
   BAILEYS WHATSAPP
========================================================= */

const {
  initBaileysClient,
} = require("./util/baileysClient");

/*
 * =========================================================
 * OLD WHATSAPP WEB DISABLED
 *
 * WhatsApp Web requires permanent Chromium/Puppeteer.
 * Keep the code in the project for rollback/reference,
 * but do not initialize it.
 * =========================================================
 */

/*
const startWhatsappHealthCron =
  require("./cron/whatsappHealthCron");

const {
  initWhatsappClient,
} = require("./util/whatsappClient");
*/

const startSalesOrderApprovalReminderCron =
  require("./cron/salesOrderApprovalReminderCron");

const app = require("./app");
const connectDB = require("./db");

const {
  initSocket,
} = require("./socket");

/* =========================================================
   REDIS CACHE
========================================================= */

const {
  connectRedis,
} = require("./services/bharat-ai/cache/redisClient");

const PORT =
  process.env.PORT || 5000;

/* =========================================================
   SERVER STATE
========================================================= */

let booted = false;
let server = null;
let isShuttingDown = false;

/* =========================================================
   GRACEFUL SHUTDOWN

   IMPORTANT:
   This makes Ctrl+C / SIGTERM close the HTTP listener
   cleanly before the Node process exits.

   It does NOT:
   - change Chromium
   - start Chromium
   - change Puppeteer
   - change npm packages
   - change approval/background-job logic
========================================================= */

const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log("");
  console.log(
    `${signal} received. Shutting down backend gracefully...`
  );

  /*
   * If the HTTP server was never created or is not
   * listening, there is nothing to close.
   */
  if (!server || !server.listening) {
    console.log(
      "HTTP server is not listening. Exiting."
    );

    process.exit(0);
    return;
  }

  /*
   * Stop accepting new HTTP connections.
   *
   * Existing requests are allowed to finish before
   * the callback executes.
   */
  server.close((error) => {
    if (error) {
      console.error(
        "Error while closing HTTP server:",
        error
      );

      process.exit(1);
      return;
    }

    console.log(
      `Port ${PORT} released successfully.`
    );

    console.log(
      "Backend shutdown completed."
    );

    process.exit(0);
  });

  /*
   * Node 18.2+ supports closeIdleConnections().
   * This helps close idle keep-alive HTTP connections.
   */
  if (
    typeof server.closeIdleConnections ===
    "function"
  ) {
    server.closeIdleConnections();
  }

  /*
   * Safety fallback.
   *
   * If some connection refuses to close, do not leave
   * the backend hanging forever.
   */
  const forceShutdownTimer =
    setTimeout(() => {
      console.error(
        "Graceful shutdown timed out. Forcing process exit."
      );

      process.exit(1);
    }, 10000);

  forceShutdownTimer.unref();
};

/* =========================================================
   OS SIGNAL HANDLERS
========================================================= */

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

/* =========================================================
   START APPLICATION
========================================================= */

const startApp = async () => {
  if (booted) {
    console.log(
      "App already booted. Skipping duplicate init."
    );

    return;
  }

  booted = true;

  try {
    /* =====================================================
       DATABASE
    ===================================================== */

    await connectDB();

    /* =====================================================
       REDIS CACHE

       IMPORTANT:
       Redis is only a cache layer.

       Do not await Redis here because Redis failure
       must never stop the backend.

       If Redis is unavailable:
       - MongoDB will continue working
       - AI tools will continue working
       - Cache will simply be skipped
    ===================================================== */

    connectRedis()
      .then((redis) => {
        if (redis) {
          console.log(
            "Redis cache initialized successfully."
          );
        } else {
          console.log(
            "Redis not available. Backend will continue without cache."
          );
        }
      })
      .catch((error) => {
        console.log(
          "REDIS STARTUP FAILED =>",
          error.message
        );
      });

    /* =====================================================
       ROOT HEALTH ROUTE
    ===================================================== */

    app.get("/", (req, res) => {
      res.send("Backend is running");
    });

    /* =====================================================
       HTTP + SOCKET SERVER

       IMPORTANT:
       server is module-level so shutdown() can access it.
    ===================================================== */

    server = http.createServer(app);

    initSocket(server);

    /* =====================================================
       SERVER ERROR HANDLER
    ===================================================== */

    server.on("error", (error) => {
      if (
        error &&
        error.code === "EADDRINUSE"
      ) {
        console.error("");
        console.error(
          `Port ${PORT} is already in use.`
        );

        console.error(
          "Another backend process is already running."
        );

        console.error(
          `Check it with: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`
        );

        process.exit(1);
        return;
      }

      console.error(
        "HTTP server error:",
        error
      );

      process.exit(1);
    });

    /* =====================================================
       LISTEN
    ===================================================== */

    server.listen(
      PORT,
      () => {
        console.log(
          `Server running on port ${PORT}`
        );

        console.log("hii");

        /* =================================================
           BACKGROUND JOBS
        ================================================= */

        if (
          process.env
            .ENABLE_BACKGROUND_JOBS ===
          "true"
        ) {
          console.log(
            "Starting background jobs..."
          );

          /* ===============================================
             OLD WHATSAPP WEB

             DISABLED.
             DO NOT START CHROMIUM.
          =============================================== */

          // initWhatsappClient();

          /* ===============================================
             NEW BAILEYS WHATSAPP

             No Chromium.
             No Puppeteer.
             Lightweight WhatsApp WebSocket connection.

             Do not await here because the HTTP server and
             other cron jobs should continue starting even
             if WhatsApp is temporarily unavailable.
          =============================================== */

          initBaileysClient()
            .catch(
              (error) => {
                console.log(
                  "BAILEYS STARTUP FAILED =>",
                  error.message
                );
              }
            );

          /* ===============================================
             PAYMENT REMINDER CRON
          =============================================== */

          startPaymentReminderCron();

          /* ===============================================
             ATTENDANCE CRONS
          =============================================== */

          startAttendanceCron();

          startAttendanceSummaryCron();

          startAttendanceNotificationCron();

          /* ===============================================
             SALES ORDER APPROVAL REMINDER
          =============================================== */

          startSalesOrderApprovalReminderCron();

          /* ===============================================
             ENQUIRY DELAY NOTIFICATIONS
          =============================================== */

          startEnquiryDelayNotificationCron();

          /* ===============================================
             OPTIONAL DAILY SALES INSIGHT
          =============================================== */

          // startSalesDailyInsightCron();

          /* ===============================================
             OLD WHATSAPP WEB HEALTH CRON

             Must remain disabled.
          =============================================== */

          // startWhatsappHealthCron();

          console.log(
            "All enabled background jobs started."
          );
        } else {
          console.log(
            "Background jobs disabled."
          );
        }
      }
    );
  } catch (error) {
    booted = false;

    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
};

/* =========================================================
   BOOT
========================================================= */

startApp();