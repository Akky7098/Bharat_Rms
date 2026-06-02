require("dotenv").config();

const http = require("http");

const startPaymentReminderCron = require("./cron/paymentReminderCron");
const startAttendanceCron = require("./cron/attendanceCron");
const startAttendanceSummaryCron = require("./cron/attendanceSummaryCron");
const startAttendanceNotificationCron = require("./cron/attendanceNotificationCron");
const startEnquiryDelayNotificationCron = require("./cron/enquiryDelayNotificationCron");
const startSalesDailyInsightCron = require("./cron/salesDailyInsightCron");
const startWhatsappHealthCron = require("./cron/whatsappHealthCron");
const { initWhatsappClient } = require("./util/whatsappClient");

const app = require("./app");
const connectDB = require("./db");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

let booted = false;

const startApp = async () => {
  if (booted) {
    console.log("App already booted. Skipping duplicate init.");
    return;
  }

  booted = true;

  await connectDB();

  app.get("/", (req, res) => {
    res.send("Backend is running");
  });

  const server = http.createServer(app);

  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
      console.log("Starting background jobs...");

      initWhatsappClient();

      // startPaymentReminderCron();

      startAttendanceCron();
      startAttendanceSummaryCron();
      startAttendanceNotificationCron();
      startEnquiryDelayNotificationCron();

      // startSalesDailyInsightCron();

      startWhatsappHealthCron();
    } else {
      console.log("Background jobs disabled.");
    }
  });
};

startApp();