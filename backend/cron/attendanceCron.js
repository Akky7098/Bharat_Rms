const cron = require("node-cron");
const {
  createMissedCheckoutRegularizationReminders,
} = require("../services/attendanceService");

let started = false;

const runAttendanceRegularizationCron = async () => {
  try {
    console.log("Attendance regularization cron started...");

    const result = await createMissedCheckoutRegularizationReminders();

    console.log(
      `Attendance regularization cron completed. Checked: ${
        result?.checked || 0
      }, Created: ${result?.created || 0}, Mail Sent: ${
        result?.mailSent || 0
      }, Mail Failed: ${result?.mailFailed || 0}`
    );
  } catch (error) {
    console.error(
      "Attendance regularization cron failed:",
      error?.message || error
    );
  }
};

const startAttendanceCron = () => {
  if (started) {
    console.log("Attendance regularization cron already started");
    return;
  }

  started = true;

  // Run once after server starts
  setTimeout(() => {
    runAttendanceRegularizationCron();
  }, 5000);

  // Run daily at 8:00 AM IST
  cron.schedule(
    "0 8 * * *",
    async () => {
      await runAttendanceRegularizationCron();
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Attendance regularization cron scheduled for 8:00 AM IST");
};

module.exports = startAttendanceCron;