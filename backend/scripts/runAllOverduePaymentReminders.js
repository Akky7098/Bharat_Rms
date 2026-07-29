require("dotenv").config();

const connectDB =
  require("../db");

const {
  runPaymentReminderJob,
} = require("../cron/paymentReminderCron");

const run = async () => {
  try {
    console.log(
      "Connecting to database..."
    );

    await connectDB();

    console.log(
      "Running one-time overdue payment reminder job..."
    );

    const result =
      await runPaymentReminderJob({
        forceAllOverdue: true,
        source:
          "manual-local-overdue-run",
      });

    console.log(
      "One-time overdue reminder run completed:",
      result
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "One-time overdue reminder run failed:",
      error
    );

    process.exit(1);
  }
};

run();