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
  "32 16 * * *",
  async () => {
    try {
      console.log("TEST SALES CRON STARTED");

      const result = await sendDailySalesInsight();

      console.log(
        `TEST SALES CRON DONE. Employees checked: ${result.checked}`
      );
    } catch (error) {
      console.error("TEST SALES CRON FAILED:", error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);

  console.log("Sales daily insight cron scheduled");
};

module.exports = startSalesDailyInsightCron;