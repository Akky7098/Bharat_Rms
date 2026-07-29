const cron = require("node-cron");

const {
  processPaymentReminders,
} = require("../services/dispatchReminderService");

let started = false;
let running = false;

/**
 * Manual runner.
 * Used by:
 * scripts/runAllOverduePaymentReminders.js
 */
const runPaymentReminderJob = async ({
  forceAllOverdue = false,
  source = "scheduled",
} = {}) => {
  if (running) {
    console.log(
      `Payment reminder already running. Skipping (${source})`
    );

    return null;
  }

  running = true;

  console.log(
    `PAYMENT REMINDER STARTED | Source=${source} | Force=${forceAllOverdue}`
  );

  try {
    const result =
      await processPaymentReminders({
        forceAllOverdue,
      });

    console.log(
      [
        "PAYMENT REMINDER COMPLETED",
        `Source=${source}`,
        `Checked=${result.checked}`,
        `Sent=${result.sent}`,
        `Failed=${result.failed}`,
        `Skipped=${result.skipped}`,
        `StatusMatched=${result.statusMatched}`,
        `StatusUpdated=${result.statusUpdated}`,
      ].join(" | ")
    );

    return result;
  } catch (error) {
    console.error(
      "PAYMENT REMINDER FAILED:",
      error
    );

    throw error;
  } finally {
    running = false;
  }
};

/**
 * Runs every day at exactly 11:00 AM IST.
 */
const startPaymentReminderCron = () => {
  if (started) {
    console.log(
      "Payment reminder cron already started"
    );

    return;
  }

  started = true;

  cron.schedule(
    "0 11 * * *",
    async () => {
      try {
        await runPaymentReminderJob({
          forceAllOverdue: false,
          source: "daily-11am-ist",
        });
      } catch (error) {
        console.error(
          "Scheduled payment reminder failed:",
          error.message
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "Payment reminder cron scheduled for every day at 11:00 AM IST"
  );
};

/*
 * Keeps server.js usage unchanged:
 *
 * const startPaymentReminderCron =
 *   require("./cron/paymentReminderCron");
 *
 * startPaymentReminderCron();
 */
module.exports =
  startPaymentReminderCron;

/*
 * Used by the one-time manual script.
 */
module.exports.runPaymentReminderJob =
  runPaymentReminderJob;