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

  // Every day at 8:00 AM India time
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        console.log("Attendance regularization cron started");

        const result = await createMissedCheckoutRegularizationReminders();

        console.log(
          `Attendance regularization cron completed. Checked: ${result.checked}, Created: ${result.created}`
        );
      } catch (error) {
        console.error("Attendance regularization cron failed:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Attendance regularization cron scheduled");
};

module.exports = startAttendanceCron;