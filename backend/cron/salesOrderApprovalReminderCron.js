const cron = require("node-cron");

const {
  sendPendingApprovalReminders,
} = require("../services/salesOrderApprovalReminderService");

let started = false;

const startSalesOrderApprovalReminderCron = () => {
  if (started) {
    console.log("Sales order approval reminder cron already started");
    return;
  }

  started = true;

  cron.schedule(
    "*/30 * * * *",
    async () => {
      console.log("🔥 Sales Order Approval Reminder cron HIT every 30 min IST");

      try {
        console.log("Step 1: calling sendPendingApprovalReminders");

        const result = await sendPendingApprovalReminders();

        console.log(
          `✅ Sales order approval reminder completed. Admin pending: ${result?.adminPending || 0}, MD pending: ${result?.mdPending || 0}`
        );
      } catch (error) {
        console.error("❌ Sales order approval reminder failed:");
        console.error(error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Sales order approval reminder cron scheduled");
};

module.exports = startSalesOrderApprovalReminderCron;