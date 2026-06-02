const cron = require("node-cron");

const {
  processDelayedEnquiryNotifications,
} = require("../services/enquiryService");

let started = false;

const startEnquiryDelayNotificationCron = () => {
  if (started) {
    console.log("Enquiry delay notification cron already started");
    return;
  }

  started = true;

  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log(
        "🔥 Enquiry Delay Notification Cron HIT at 10:00 AM IST"
      );

      try {
        console.log(
          "Step 1: calling processDelayedEnquiryNotifications"
        );

        const result =
          await processDelayedEnquiryNotifications();

        console.log(
          `✅ Enquiry delay notification completed. Enquiries checked: ${result.checked}, Users notified: ${result.usersNotified}, Notifications created: ${result.notificationsCreated}`
        );
      } catch (error) {
        console.error(
          "❌ Enquiry delay notification failed:"
        );
        console.error(error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Enquiry delay notification cron scheduled");
};

module.exports = startEnquiryDelayNotificationCron;