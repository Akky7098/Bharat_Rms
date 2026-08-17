const cron =
  require("node-cron");

const {
  forceCheckWhatsappStatus,
  restartWhatsappClient,
  isWhatsappHealthPausedForPdf,
  isWhatsappProcessOwner,
  hasActiveWhatsappOwner,
} =
  require("../util/whatsappClient");

let started = false;

let healthCheckRunning =
  false;

const startWhatsappHealthCron =
  () => {
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
         * Prevent overlap inside THIS Node worker.
         */
        if (
          healthCheckRunning
        ) {
          console.log(
            "WhatsApp health check skipped: previous check still running"
          );

          return;
        }

        healthCheckRunning =
          true;

        try {
          /*
           * ------------------------------------------------------
           * CROSS-PROCESS PROTECTION
           *
           * If this Passenger worker is not WhatsApp owner and
           * another healthy owner exists, this worker must NEVER
           * restart Chromium.
           * ------------------------------------------------------
           */

          if (
            !isWhatsappProcessOwner() &&
            hasActiveWhatsappOwner()
          ) {
            const status =
              await forceCheckWhatsappStatus();

            console.log(
              `WhatsApp health check handled by owner process: ready=${status.ready}, state=${status.state}, ownerPid=${status.ownerPid || "-"}`
            );

            return;
          }

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
            `WhatsApp health check: ready=${status.ready}, state=${status.state}, ownerPid=${status.ownerPid || "-"}`
          );

          /*
           * Healthy.
           */
          if (
            status.ready
          ) {
            return;
          }

          /*
           * Do nothing during controlled startup.
           */
          if (
            status.state ===
              "INITIALIZING" ||
            status.state ===
              "RESTARTING" ||
            status.state ===
              "PDF_GENERATION_RUNNING"
          ) {
            return;
          }

          /*
           * QR/user authentication needed.
           *
           * Never keep restarting Chromium.
           */
          if (
            status.state ===
              "QR_REQUIRED" ||
            status.state ===
              "UNPAIRED"
          ) {
            console.log(
              "WhatsApp QR/auth action required. Restart skipped."
            );

            return;
          }

          const restartStates =
            [
              "NO_OWNER",
              "NO_CLIENT",
              "BROWSER_DISCONNECTED",
              "DISCONNECTED",
              "NOT_CONNECTED",
              "TIMEOUT",
              "INITIALIZE_ERROR",
              "RESTART_ERROR",
              "DESTROYED",
            ];

          if (
            restartStates.includes(
              status.state
            )
          ) {
            console.log(
              `WhatsApp unhealthy (${status.state}). Controlled restart requested.`
            );

            restartWhatsappClient()
              .catch(
                (
                  error
                ) => {
                  console.log(
                    "WhatsApp background restart failed:",
                    error.message
                  );
                }
              );
          }
        } catch (error) {
          console.error(
            "WhatsApp health cron failed:",
            error.message
          );
        } finally {
          healthCheckRunning =
            false;
        }
      },
      {
        timezone:
          "Asia/Kolkata",
      }
    );

    console.log(
      "WhatsApp health cron scheduled"
    );
  };

module.exports =
  startWhatsappHealthCron;

  console.log("push check")