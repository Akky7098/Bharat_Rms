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
    "15 10 * * *",
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
  "30 19 * * *",
  async () => {
    console.log("🔥 Evening attendance cron HIT at 7:20 PM IST");

    try {
      console.log("Step 1: calling sendEveningAttendanceDigest");

      const result = await sendEveningAttendanceDigest();

      console.log(
        `✅ Evening attendance summary completed. Employees checked: ${result.checked}`
      );
    } catch (error) {
      console.error("❌ Evening attendance summary failed:");
      console.error(error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);

  console.log("Attendance summary cron scheduled");
};

module.exports = startAttendanceSummaryCron;