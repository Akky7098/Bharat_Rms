const cron = require("node-cron");
const {
  createMissedCheckoutRegularizationReminders,
} = require("../services/attendanceService");

let started = false;

const startAttendanceCron = () => {
  if (started) {
    console.log("Attendance regularization cron already started");
    return;
  }

  started = true;

  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        console.log("Attendance regularization cron started at 8:00 AM IST");

        const result = await createMissedCheckoutRegularizationReminders();

        console.log(
          `Attendance regularization cron completed. Checked: ${
            result?.checked || 0
          }, Created: ${result?.created || 0}`
        );
      } catch (error) {
        console.error("Attendance regularization cron failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Attendance regularization cron scheduled for 8:00 AM IST");
};

module.exports = startAttendanceCron;