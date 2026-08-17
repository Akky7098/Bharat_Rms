const cron = require("node-cron");

const {
  forceCheckWhatsappStatus,
  restartWhatsappClient,
  isWhatsappHealthPausedForPdf,
  isWhatsappProcessOwner,
  hasActiveWhatsappOwner,
} = require("../util/whatsappClient");

let started = false;
let healthCheckRunning = false;

/*
 * ---------------------------------------------------------
 * IMPORTANT
 *
 * Health cron runs in every Passenger worker.
 *
 * ONLY the WhatsApp owner worker is ever allowed
 * to restart Chromium.
 *
 * Non-owner workers may read shared status,
 * but must never launch/restart Chromium.
 * ---------------------------------------------------------
 */

const NON_RESTART_STATES = [
  "INITIALIZING",
  "RESTARTING",
  "PDF_GENERATION_RUNNING",

  /*
   * Authentication / QR states are NOT failures.
   */
  "QR_REQUIRED",
  "UNPAIRED",
  "UNPAIRED_IDLE",
  "AUTHENTICATED",

  /*
   * Browser may still be alive while WhatsApp Web
   * is navigating/reloading.
   */
  "WAITING_FOR_WHATSAPP",
];

const RESTART_STATES = [
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
       * Prevent overlapping execution inside this
       * individual Passenger worker.
       */
      if (healthCheckRunning) {
        console.log(
          "WhatsApp health check skipped: previous check still running"
        );

        return;
      }

      healthCheckRunning = true;

      try {
        /* =====================================================
           PDF PROTECTION
        ===================================================== */

        if (isWhatsappHealthPausedForPdf()) {
          console.log(
            "WhatsApp health check skipped: PDF generation running"
          );

          return;
        }

        /* =====================================================
           NON-OWNER WORKER

           Another Passenger worker owns Chromium.

           This worker MUST NOT restart Chromium.
        ===================================================== */

        if (
          !isWhatsappProcessOwner() &&
          hasActiveWhatsappOwner()
        ) {
          const status =
            await forceCheckWhatsappStatus();

          console.log(
            `WhatsApp health check non-owner: ready=${status.ready}, state=${status.state}, ownerPid=${status.ownerPid || "-"}`
          );

          return;
        }

        /* =====================================================
           GET CURRENT STATUS
        ===================================================== */

        const status =
          await forceCheckWhatsappStatus();

        console.log(
          `WhatsApp health check: ready=${status.ready}, state=${status.state}, ownerPid=${status.ownerPid || "-"}`
        );

        /* =====================================================
           HEALTHY
        ===================================================== */

        if (status.ready) {
          return;
        }

        /* =====================================================
           IMPORTANT:
           DO NOT RESTART THESE STATES
        ===================================================== */

        if (
          NON_RESTART_STATES.includes(
            status.state
          )
        ) {
          if (
            status.state === "QR_REQUIRED" ||
            status.state === "UNPAIRED" ||
            status.state === "UNPAIRED_IDLE"
          ) {
            console.log(
              `WhatsApp waiting for pairing (${status.state}). Chromium restart skipped.`
            );
          } else {
            console.log(
              `WhatsApp state ${status.state}. Waiting without restart.`
            );
          }

          return;
        }

        /* =====================================================
           RESTART ONLY REAL FAILURE STATES
        ===================================================== */

        if (
          RESTART_STATES.includes(
            status.state
          )
        ) {
          /*
           * Final cross-process safety.
           *
           * If this worker is not owner but another owner
           * appeared between checks, never restart.
           */
          if (
            !isWhatsappProcessOwner() &&
            hasActiveWhatsappOwner()
          ) {
            console.log(
              "WhatsApp restart skipped: another owner is active"
            );

            return;
          }

          console.log(
            `WhatsApp unhealthy (${status.state}). Controlled restart requested.`
          );

          /*
           * Do not await WhatsApp READY.
           *
           * restartWhatsappClient() only performs bounded
           * cleanup and starts one asynchronous initialization.
           */
          restartWhatsappClient()
            .catch((error) => {
              console.log(
                "WhatsApp background restart failed:",
                error.message
              );
            });

          return;
        }

        /* =====================================================
           UNKNOWN STATE

           Never restart unknown state automatically.
           Safer on production than creating Chromium loops.
        ===================================================== */

        console.log(
          `WhatsApp health state '${status.state}' is not classified. Restart skipped for safety.`
        );
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