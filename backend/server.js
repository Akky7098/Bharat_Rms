require("dotenv").config();

const startPaymentReminderCron = require("./cron/paymentReminderCron");
const startAttendanceCron = require("./cron/attendanceCron");
const startAttendanceSummaryCron = require("./cron/attendanceSummaryCron");
const startSalesDailyInsightCron = require("./cron/salesDailyInsightCron");
const startWhatsappHealthCron = require("./cron/whatsappHealthCron");
const { initWhatsappClient } = require("./util/whatsappClient");

const app = require("./app");
const connectDB = require("./db");

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

  app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
    console.log("Starting background jobs...");

    startPaymentReminderCron();
    startAttendanceCron();
    startAttendanceSummaryCron();
    startSalesDailyInsightCron();
    startWhatsappHealthCron();

    setTimeout(() => {
      initWhatsappClient();
    }, 10000);
  }
});
};

startApp();