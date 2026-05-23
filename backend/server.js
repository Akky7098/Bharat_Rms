require("dotenv").config();

const startPaymentReminderCron = require("./cron/paymentReminderCron");
const startAttendanceCron = require("./cron/attendanceCron");
const startAttendanceSummaryCron = require("./cron/attendanceSummaryCron");
const startSalesDailyInsightCron = require("./cron/salesDailyInsightCron");
const { initWhatsappClient } = require("./util/whatsappClient");
const startWhatsappHealthCron = require("./cron/whatsappHealthCron");

const app = require("./app");
const connectDB = require("./db");

const PORT = process.env.PORT || 5000;

connectDB();

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initWhatsappClient();
  startPaymentReminderCron();
  startAttendanceCron();
  startAttendanceSummaryCron();
  startSalesDailyInsightCron();
  startWhatsappHealthCron();
});