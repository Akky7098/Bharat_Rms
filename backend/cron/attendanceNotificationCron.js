const cron = require("node-cron");

const {
  createMissedCheckInNotifications,
  createMissedCheckoutNotifications,
} = require("../services/attendanceService");

let started = false;

const startAttendanceNotificationCron = () => {
  if (started) {
    console.log("Attendance notification cron already started");
    return;
  }

  started = true;

  cron.schedule(
    "15 10 * * *",
    async () => {
      console.log("🔥 Missed Check-In notification cron HIT at 10:15 AM IST");

      try {
        console.log("Step 1: calling createMissedCheckInNotifications");

        const result =
          await createMissedCheckInNotifications();

        console.log(
          `✅ Missed check-in notification completed. Employees checked: ${result.checked}, Notifications: ${result.notificationsCreated}`
        );
      } catch (error) {
        console.error("❌ Missed check-in notification failed:");
        console.error(error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  cron.schedule(
    "0 19 * * *",
    async () => {
      console.log("🔥 Missed Checkout notification cron HIT at 7:00 PM IST");

      try {
        console.log("Step 1: calling createMissedCheckoutNotifications");

        const result =
          await createMissedCheckoutNotifications();

        console.log(
          `✅ Missed checkout notification completed. Employees checked: ${result.checked}, Notifications: ${result.notificationsCreated}`
        );
      } catch (error) {
        console.error("❌ Missed checkout notification failed:");
        console.error(error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Attendance notification cron scheduled");
};

module.exports = startAttendanceNotificationCron;