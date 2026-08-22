import useAttendanceLocationTracking from "../hooks/useAttendanceLocationTracking";

/* =========================================================
   GLOBAL ATTENDANCE LOCATION TRACKER

   This component renders nothing.

   It stays mounted inside Dashboard and automatically:

   1. Checks whether logged-in employee attendance is active.
   2. Captures location when due.
   3. Captures every 30 minutes.
   4. Captures when app/browser returns to foreground.
   5. Does NOT track Super Admin.

   IMPORTANT:
   Browser/PWA background suspension can still pause JS.
   When app returns, foreground recovery immediately checks
   whether a checkpoint is overdue.
========================================================= */

const GlobalAttendanceLocationTracker = () => {
  let user = {};

  try {
    user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    user = {};
  }

  const role = String(
    user?.role || ""
  ).toLowerCase();

  const enabled =
    role === "user" ||
    role === "admin";

  useAttendanceLocationTracking({
    enabled,
  });

  return null;
};

export default GlobalAttendanceLocationTracker;