// const cron = require("node-cron");
// const {
//   sendDailySalesInsight,
// } = require("../services/salesDailyInsightService");

// let started = false;

// const startSalesDailyInsightCron = () => {
//   if (started) {
//     console.log("Sales daily insight cron already started");
//     return;
//   }

//   started = true;

//   console.log("Sales daily insight cron scheduled for 8:00 PM IST");

//   // Small heartbeat to prove cron engine is alive
//   cron.schedule(
//     "*/10 * * * *",
//     () => {
//       console.log(
//         "Sales cron heartbeat:",
//         new Date().toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         })
//       );
//     },
//     {
//       timezone: "Asia/Kolkata",
//     }
//   );

//   cron.schedule(
//     "45 18 * * *",
//     async () => {
//       try {
//         console.log("Sales daily insight cron started at 6:45 PM IST");

//         const result = await sendDailySalesInsight();

//         console.log(
//           `Sales daily insight completed. Employees checked: ${result.checked}, skipped: ${result.skipped || false}`
//         );
//       } catch (error) {
//         console.error("Sales daily insight failed:", error);
//       }
//     },
//     {
//       timezone: "Asia/Kolkata",
//     }
//   );
// };

// module.exports = startSalesDailyInsightCron;