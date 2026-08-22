import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  createAttendanceLocationCheckpoint,
  getAttendanceLocationTrackingStatus,
} from "../../../services/attendanceService";

import {
  getBrowserLocation,
} from "../utils/attendanceHelpers";

/* =========================================================
   CONFIGURATION
========================================================= */

/*
 * Production interval:
 *
 * 30 minutes
 */
const LOCATION_INTERVAL_MS =
  30 * 60 * 1000;

/*
 * LocalStorage key.
 *
 * Used so that:
 *
 * 10:00 checkpoint saved
 * app suspended
 * user returns 10:15
 *
 * -> don't capture again unnecessarily.
 *
 * But:
 *
 * user returns 10:45
 *
 * -> 45 minutes passed
 * -> capture immediately.
 */
const LAST_CAPTURE_STORAGE_KEY =
  "attendanceLocationLastCheckpointAt";

/*
 * Protect against two requests firing at exactly the same time.
 */
const MIN_REQUEST_GAP_MS =
  30 * 1000;

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const getTrackingStatusData = (
  response
) => {
  return (
    response?.data?.data ||
    response?.data ||
    response ||
    {}
  );
};

/* =========================================================
   TRACKING ACTIVE CHECK
========================================================= */

const isTrackingActive = (
  status
) => {
  /*
   * Support multiple backend response formats.
   *
   * Explicit false means stop.
   */

  if (
    status?.active === false
  ) {
    return false;
  }

  if (
    status?.trackingActive ===
    false
  ) {
    return false;
  }

  /*
   * If backend provides attendance state,
   * also support that.
   */

  if (
    status?.checkedOut ===
    true
  ) {
    return false;
  }

  if (
    status?.attendanceStatus ===
    "checked_out"
  ) {
    return false;
  }

  if (
    status?.attendanceStatus ===
    "not_checked_in"
  ) {
    return false;
  }

  return true;
};

/* =========================================================
   LAST CAPTURE HELPERS
========================================================= */

const getStoredLastCaptureAt =
  () => {
    const value =
      Number(
        localStorage.getItem(
          LAST_CAPTURE_STORAGE_KEY
        ) || 0
      );

    return Number.isFinite(
      value
    )
      ? value
      : 0;
  };

const saveLastCaptureAt = (
  timestamp
) => {
  try {
    localStorage.setItem(
      LAST_CAPTURE_STORAGE_KEY,
      String(
        timestamp
      )
    );
  } catch {
    // Storage failure should never break attendance.
  }
};

/* =========================================================
   RAW CHECKPOINT FUNCTION

   This is exported so AttendancePage can use it for:

   check_in
   check_out

   without mounting another timer.
========================================================= */

export const captureAttendanceLocationNow =
  async (
    source = "periodic",
    options = {}
  ) => {
    const {
      force = false,
      verifyStatus = true,
    } = options;

    try {
      /* =====================================================
         VERIFY BACKEND ATTENDANCE STATUS
      ===================================================== */

      if (
        verifyStatus &&
        !force
      ) {
        const statusResponse =
          await getAttendanceLocationTrackingStatus();

        const status =
          getTrackingStatusData(
            statusResponse
          );

        if (
          !isTrackingActive(
            status
          )
        ) {
          return {
            success: false,
            skipped: true,
            reason:
              "tracking_inactive",
          };
        }
      }

      /* =====================================================
         GET REAL DEVICE LOCATION
      ===================================================== */

      const position =
        await getBrowserLocation();

      if (
        !position?.coords
      ) {
        throw new Error(
          "Browser did not return location coordinates."
        );
      }

      const latitude =
        Number(
          position.coords
            .latitude
        );

      const longitude =
        Number(
          position.coords
            .longitude
        );

      const accuracy =
        Number(
          position.coords
            .accuracy
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        throw new Error(
          "Invalid browser location coordinates."
        );
      }

      const capturedAt =
        new Date()
          .toISOString();

      /* =====================================================
         SAVE TO BACKEND
      ===================================================== */

      const response =
        await createAttendanceLocationCheckpoint(
          {
            latitude,
            longitude,

            accuracy:
              Number.isFinite(
                accuracy
              )
                ? accuracy
                : null,

            source,

            capturedAt,
          }
        );

      const savedAt =
        Date.now();

      saveLastCaptureAt(
        savedAt
      );

      console.log(
        "✅ Attendance location checkpoint saved",
        {
          source,
          capturedAt,
          latitude,
          longitude,
          accuracy,
        }
      );

      return {
        success: true,
        response,
        capturedAt,
        timestamp:
          savedAt,
      };
    } catch (error) {
      /*
       * Location tracking must NEVER crash RMS.
       */

      console.warn(
        "Attendance location checkpoint skipped:",
        error?.response?.data
          ?.message ||
        error?.message ||
        error
      );

      return {
        success: false,
        error,
      };
    }
  };

/* =========================================================
   GLOBAL TRACKING HOOK
========================================================= */

export default function useAttendanceLocationTracking({
  enabled,
}) {
  /*
   * Prevent duplicate simultaneous captures.
   */
  const busyRef =
    useRef(false);

  /*
   * Keep latest successful capture in memory also.
   */
  const lastCaptureAtRef =
    useRef(
      getStoredLastCaptureAt()
    );

  /* =======================================================
     UPDATE LAST CAPTURE
  ======================================================= */

  const rememberCapture = (
    timestamp
  ) => {
    const value =
      Number(
        timestamp ||
        Date.now()
      );

    lastCaptureAtRef.current =
      value;

    saveLastCaptureAt(
      value
    );
  };

  /* =======================================================
     IS CHECKPOINT DUE?
  ======================================================= */

  const isCheckpointDue =
    useCallback(
      () => {
        const stored =
          getStoredLastCaptureAt();

        const last =
          Math.max(
            Number(
              lastCaptureAtRef
                .current ||
              0
            ),
            Number(
              stored ||
              0
            )
          );

        /*
         * No previous checkpoint known.
         * Capture immediately.
         */
        if (!last) {
          return true;
        }

        return (
          Date.now() -
            last >=
          LOCATION_INTERVAL_MS
        );
      },
      []
    );

  /* =======================================================
     CAPTURE FUNCTION
  ======================================================= */

  const captureCheckpoint =
    useCallback(
      async (
        source = "periodic",
        options = {}
      ) => {
        if (!enabled) {
          return false;
        }

        if (
          busyRef.current
        ) {
          return false;
        }

        const force =
          Boolean(
            options?.force
          );

        /*
         * For normal global tracking:
         * only capture when 30 minutes are due.
         *
         * Check-in / checkout can use force:true.
         */
        if (
          !force &&
          !isCheckpointDue()
        ) {
          return false;
        }

        /*
         * Avoid extremely fast duplicate requests.
         */
        if (
          !force &&
          lastCaptureAtRef.current &&
          Date.now() -
            lastCaptureAtRef.current <
            MIN_REQUEST_GAP_MS
        ) {
          return false;
        }

        try {
          busyRef.current =
            true;

          const result =
            await captureAttendanceLocationNow(
              source,
              {
                force:
                  Boolean(
                    options
                      ?.force
                  ),

                /*
                 * Global captures always verify backend
                 * attendance status unless explicitly forced.
                 */
                verifyStatus:
                  options
                    ?.verifyStatus !==
                  false,
              }
            );

          if (
            result?.success
          ) {
            rememberCapture(
              result.timestamp ||
              Date.now()
            );

            return true;
          }

          return false;
        } finally {
          busyRef.current =
            false;
        }
      },
      [
        enabled,
        isCheckpointDue,
      ]
    );

  /* =======================================================
     GLOBAL TRACKING EFFECT

     This runs as long as Dashboard is mounted.
  ======================================================= */

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    /* =====================================================
       APP START / DASHBOARD LOAD

       Example:

       Last checkpoint = 10:00
       user comes back = 10:45

       isCheckpointDue() = true
       -> capture immediately.
    ===================================================== */

    captureCheckpoint(
      "app_active"
    );

    /* =====================================================
       PERIODIC CHECK

       Important:

       We check more frequently than 30 minutes,
       but actual GPS is only captured when 30 minutes
       have elapsed.

       Why?

       Browser timers can drift.

       Checking every 1 minute means:

       checkpoint at 10:00
       expected 10:30
       timer actually fires 10:31

       -> still captures promptly.
    ===================================================== */

    const dueCheckIntervalMs =
      60 * 1000;

    const intervalId =
      window.setInterval(
        () => {
          if (
            document
              .visibilityState ===
            "visible"
          ) {
            captureCheckpoint(
              "periodic"
            );
          }
        },
        dueCheckIntervalMs
      );

    /* =====================================================
       FOREGROUND RECOVERY

       Example:

       10:00 checkpoint
       app suspended
       missed 10:30
       employee returns 10:46

       visibilitychange -> visible
       ↓
       due check
       ↓
       46 minutes since last capture
       ↓
       capture immediately at 10:46
    ===================================================== */

    const handleVisibilityChange =
      () => {
        if (
          document
            .visibilityState !==
          "visible"
        ) {
          return;
        }

        captureCheckpoint(
          "foreground"
        );
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    /* =====================================================
       WINDOW FOCUS RECOVERY

       Some browsers are more reliable with focus event.
    ===================================================== */

    const handleWindowFocus =
      () => {
        captureCheckpoint(
          "foreground"
        );
      };

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    /* =====================================================
       ONLINE RECOVERY

       If employee had no network:
       when connection returns,
       try immediately if overdue.
    ===================================================== */

    const handleOnline =
      () => {
        captureCheckpoint(
          "network_restored"
        );
      };

    window.addEventListener(
      "online",
      handleOnline
    );

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {
      window.clearInterval(
        intervalId
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );

      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [
    enabled,
    captureCheckpoint,
  ]);

  /* =======================================================
     PUBLIC API
  ======================================================= */

  return {
    captureCheckpoint,
    isCheckpointDue,
  };
}