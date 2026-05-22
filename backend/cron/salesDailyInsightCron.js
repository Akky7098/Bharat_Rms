const cron = require("node-cron");
const {
  sendDailySalesInsight,
} = require("../services/salesDailyInsightService");

let started = false;

const startSalesDailyInsightCron = () => {
  if (started) {
    console.log("Sales daily insight cron already started");
    return;
  }

  started = true;

  cron.schedule(
  "18 16 * * *",
    async () => {
      try {
        console.log("Sales daily insight cron started");
        const result = await sendDailySalesInsight();
        console.log(`Sales daily insight sent. Employees checked: ${result.checked}`);
      } catch (error) {
        console.error("Sales daily insight failed:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Sales daily insight cron scheduled");
};

module.exports = startSalesDailyInsightCron;