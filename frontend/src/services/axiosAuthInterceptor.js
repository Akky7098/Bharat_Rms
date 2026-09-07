import axios from "axios";

/* =========================================================
   BHARAT RMS
   GLOBAL EXPIRED / INVALID SESSION HANDLER

   Backend auth.js returns:

   401 + SESSION_EXPIRED
   401 + INVALID_SESSION
   401 + TOKEN_MISSING
   401 + USER_NOT_FOUND

   Result:
   stale frontend session is cleared and user is returned
   to the login screen.
========================================================= */

let logoutInProgress = false;

/* =========================================================
   AUTH FAILURE CODES
========================================================= */

const AUTH_FAILURE_CODES =
  new Set([
    "SESSION_EXPIRED",
    "INVALID_SESSION",
    "TOKEN_MISSING",
    "USER_NOT_FOUND",

    /*
     * Compatibility with any older/newer API responses.
     */
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
  ]);

/* =========================================================
   CLEAR STORED AUTH

   IMPORTANT:
   We remove known authentication keys only.

   We DO NOT call localStorage.clear(), because Bharat RMS
   may store other PWA/application preferences there.
========================================================= */

const clearAuthStorage = () => {
  const authKeys = [
    "token",
    "user",
    "role",
    "userId",
    "userName",
    "email",
  ];

  authKeys.forEach((key) => {
    localStorage.removeItem(key);
  });

  /*
   * Clear session-scoped authentication data if any
   * module has stored it there.
   */
  authKeys.forEach((key) => {
    sessionStorage.removeItem(key);
  });
};

/* =========================================================
   FORCE LOGIN
========================================================= */

const forceLogout = () => {
  if (logoutInProgress) {
    return;
  }

  logoutInProgress = true;

  clearAuthStorage();

  /*
   * Full page navigation is intentional.

   * It destroys stale React state instead of simply
   * changing a component/route inside the existing app.
   *
   * If "/" is your Bharat RMS login route, keep this.
   */
  window.location.replace("/");
};

/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

axios.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error?.response?.status;

    const code =
      String(
        error?.response?.data
          ?.code || ""
      )
        .trim()
        .toUpperCase();

    const message =
      String(
        error?.response?.data
          ?.message || ""
      )
        .trim()
        .toLowerCase();

    /* =====================================================
       NORMAL AUTHENTICATION FAILURE
    ===================================================== */

    const isAuthFailure =
      status === 401 &&
      (
        AUTH_FAILURE_CODES.has(
          code
        ) ||

        /*
         * Compatibility fallback for older APIs that may
         * return 401 without a code.
         */
        message.includes(
          "session has expired"
        ) ||
        message.includes(
          "session is invalid"
        ) ||
        message.includes(
          "authentication required"
        ) ||
        message.includes(
          "login again"
        ) ||
        message.includes(
          "jwt expired"
        ) ||
        message.includes(
          "token expired"
        )
      );

    /* =====================================================
       TEMPORARY LEGACY 403 COMPATIBILITY

       Do NOT logout on every 403.

       A normal 403 means:
       authenticated user does not have permission.

       This block only handles an old backend endpoint if
       it still sends 403 specifically for expired JWTs.
    ===================================================== */

    const isLegacyExpired403 =
      status === 403 &&
      (
        code ===
          "SESSION_EXPIRED" ||
        code ===
          "INVALID_SESSION" ||
        message.includes(
          "jwt expired"
        ) ||
        message.includes(
          "token expired"
        ) ||
        message.includes(
          "session has expired"
        )
      );

    if (
      isAuthFailure ||
      isLegacyExpired403
    ) {
      forceLogout();
    }

    /*
     * Keep rejecting so existing service/component error
     * handling continues behaving normally.
     */
    return Promise.reject(
      error
    );
  }
);