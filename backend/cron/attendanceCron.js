const cron = require("node-cron");
const {
  createMissedCheckoutRegularizationReminders,
} = require("../services/attendanceService");

const startAttendanceCron = () => {
  // Every day at 4:00 AM
  cron.schedule("* * * * *", async () => {
    try {
      console.log("Attendance regularization cron started");

      const result = await createMissedCheckoutRegularizationReminders();

      console.log(
        `Attendance regularization cron completed. Checked: ${result.checked}, Created: ${result.created}`
      );
    } catch (error) {
      console.error("Attendance regularization cron failed:", error.message);
    }
  });
};

module.exports = startAttendanceCron;