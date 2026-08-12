const cron = require("node-cron");

const {
  forceCheckWhatsappStatus,
  restartWhatsappClient,
  isWhatsappHealthPausedForPdf,
} = require("../util/whatsappClient");

let started = false;
let healthCheckRunning = false;

const startWhatsappHealthCron = () => {
  if (started) {
    console.log(
      "WhatsApp health cron already started"
    );

    return;
  }

  started = true;

  cron.schedule(
    "*/5 * * * *",
    async () => {
      /*
       * Prevent overlapping cron executions.
       */
      if (healthCheckRunning) {
        console.log(
          "WhatsApp health check skipped: previous check still running"
        );

        return;
      }

      healthCheckRunning = true;

      try {
        if (
          isWhatsappHealthPausedForPdf()
        ) {
          console.log(
            "WhatsApp health check skipped: PDF generation running"
          );

          return;
        }

        const status =
          await forceCheckWhatsappStatus();

        console.log(
          `WhatsApp health check: ready=${status.ready}, state=${status.state}`
        );

        /*
         * Healthy.
         */
        if (status.ready) {
          return;
        }

        /*
         * NEVER interfere while normal startup
         * is still running.
         */
        if (
          status.state === "INITIALIZING" ||
          status.state === "RESTARTING" ||
          status.state === "PDF_GENERATION_RUNNING"
        ) {
          return;
        }

        /*
         * QR means session/user action is required.
         * Restarting Chromium repeatedly won't help.
         */
        if (
          status.state === "QR_REQUIRED" ||
          status.state === "UNPAIRED"
        ) {
          console.log(
            "WhatsApp QR/auth action required. Restart skipped."
          );

          return;
        }

        /*
         * These states indicate Chromium/client
         * genuinely needs a controlled restart.
         */
        const restartStates = [
          "NO_CLIENT",
          "BROWSER_DISCONNECTED",
          "DISCONNECTED",
          "NOT_CONNECTED",
          "TIMEOUT",
        ];

        if (
          restartStates.includes(
            status.state
          )
        ) {
          console.log(
            `WhatsApp unhealthy (${status.state}). Controlled restart requested.`
          );

          /*
           * IMPORTANT:
           *
           * Do not await WhatsApp becoming ready.
           *
           * restartWhatsappClient() only does bounded
           * cleanup + one new initialization.
           */
          restartWhatsappClient()
            .catch((error) => {
              console.log(
                "WhatsApp background restart failed:",
                error.message
              );
            });
        }
      } catch (error) {
        console.error(
          "WhatsApp health cron failed:",
          error.message
        );
      } finally {
        healthCheckRunning = false;
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "WhatsApp health cron scheduled"
  );
};

module.exports =
  startWhatsappHealthCron;