// const cron = require("node-cron");
// const {
//   processPaymentReminders,
// } = require("../services/dispatchReminderService");

// const startPaymentReminderCron = () => {
//   // Runs every day at 10:00 AM India time
//   cron.schedule(
//     "* * * * *",
//     async () => {
//       try {
//         console.log("Payment reminder cron started");

//         const result = await processPaymentReminders();

//         console.log(
//           `Payment reminder cron completed. Checked: ${result.checked}, Sent: ${result.sent}`
//         );
//       } catch (error) {
//         console.error("Payment reminder cron failed:", error.message);
//       }
//     },
//     {
//       timezone: "Asia/Kolkata",
//     }
//   );
// };

// module.exports = startPaymentReminderCron;