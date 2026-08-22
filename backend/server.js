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

let booted = false;

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
       must never stop the Bharat backend.

       If Redis is unavailable:
       - MongoDB will continue working
       - Bharat AI tools will continue working
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
    ===================================================== */

    const server =
      http.createServer(app);

    initSocket(server);

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

             Runs every day at 11:00 AM IST.
             Existing normal scheduled job only.
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
             Baileys manages its connection/reconnect through
             connection.update inside baileysClient.js.
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