require("dotenv").config();

const startPaymentReminderCron = require("./cron/paymentReminderCron");
const startAttendanceCron = require("./cron/attendanceCron");
const startAttendanceSummaryCron = require("./cron/attendanceSummaryCron");
const startSalesDailyInsightCron = require("./cron/salesDailyInsightCron");

const { sendDailySalesInsight } = require("./services/salesDailyInsightService");

const app = require("./app");
const connectDB = require("./db");

const PORT = process.env.PORT || 5000;

connectDB();

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  startPaymentReminderCron();
  startAttendanceCron();
  startAttendanceSummaryCron();
  startSalesDailyInsightCron();

  // TEMP TEST ONLY: sends sales daily insight 30 seconds after server starts.
  // Remove this block after testing is successful.
  setTimeout(async () => {
    try {
      console.log("MANUAL SALES TEST STARTED");

      const result = await sendDailySalesInsight();

      console.log("MANUAL SALES TEST DONE", result);
    } catch (error) {
      console.error("MANUAL SALES TEST FAILED:", error);
    }
  }, 30000);
});