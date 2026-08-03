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

const startWhatsappHealthCron =
  require("./cron/whatsappHealthCron");

const {
  initWhatsappClient,
} = require("./util/whatsappClient");

const startSalesOrderApprovalReminderCron =
  require("./cron/salesOrderApprovalReminderCron");

const app = require("./app");
const connectDB = require("./db");

const {
  initSocket,
} = require("./socket");

const PORT =
  process.env.PORT || 5000;

let booted = false;

const startApp = async () => {
  if (booted) {
    console.log(
      "App already booted. Skipping duplicate init."
    );

    return;
  }

  booted = true;

  try {
    await connectDB();

    app.get("/", (req, res) => {
      res.send("Backend is running");
    });

    const server =
      http.createServer(app);

    initSocket(server);

    server.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );

      console.log("hii")

      if (
        process.env
          .ENABLE_BACKGROUND_JOBS ===
        "true"
      ) {
        console.log(
          "Starting background jobs..."
        );

        initWhatsappClient();

        /*
         * Runs every day at 11:00 AM IST.
         *
         * This starts only the normal scheduled job.
         * It does not run forceAllOverdue.
         */
        startPaymentReminderCron();

        startAttendanceCron();

        startSalesOrderApprovalReminderCron();

        startAttendanceSummaryCron();

        startAttendanceNotificationCron();

        startEnquiryDelayNotificationCron();

        // startSalesDailyInsightCron();

        startWhatsappHealthCron();

        console.log(
          "All enabled background jobs started."
        );
      } else {
        console.log(
          "Background jobs disabled."
        );
      }
    });
  } catch (error) {
    booted = false;

    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
};

startApp();