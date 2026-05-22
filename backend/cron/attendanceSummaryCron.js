const cron = require("node-cron");
const {
  sendMorningAttendanceDigest,
  sendEveningAttendanceDigest,
} = require("../services/attendanceSummaryNotificationService");

let started = false;

const startAttendanceSummaryCron = () => {
  if (started) {
    console.log("Attendance summary cron already started");
    return;
  }

  started = true;

  cron.schedule(
    "20 15 * * *",
    async () => {
      try {
        console.log("Morning attendance summary cron started");
        const result = await sendMorningAttendanceDigest();
        console.log(`Morning attendance summary sent. Checked: ${result.checked}`);
      } catch (error) {
        console.error("Morning attendance summary failed:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  cron.schedule(
    "0 19 * * *",
    async () => {
      try {
        console.log("Evening attendance summary cron started");
        const result = await sendEveningAttendanceDigest();
        console.log(`Evening attendance summary sent. Checked: ${result.checked}`);
      } catch (error) {
        console.error("Evening attendance summary failed:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Attendance summary cron scheduled");
};

module.exports = startAttendanceSummaryCron;