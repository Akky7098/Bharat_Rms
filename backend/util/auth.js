const jwt = require("jsonwebtoken");
const User = require("../model/userModel");

require("dotenv").config();

/* =========================================================
   BHARAT RMS AUTH

   PRODUCTION-COMPATIBILITY MODE

   Supports:
   1. Current JWT_SECRET from environment
   2. Existing legacy tokens signed with "abc123"

   This prevents currently logged-in production users
   from suddenly losing access after JWT_SECRET changes.

   IMPORTANT:
   Legacy support should be removed later after all users
   naturally receive new tokens.
========================================================= */

const LEGACY_JWT_SECRET =
  "abc123";

/* =========================================================
   GET CURRENT SECRET
========================================================= */

const getCurrentJwtSecret = () => {
  const secret =
    String(
      process.env.JWT_SECRET || ""
    ).trim();

  return secret || null;
};

/* =========================================================
   VERIFY TOKEN WITH CURRENT + LEGACY SECRET
========================================================= */

const verifyBharatToken = (token) => {
  const currentSecret =
    getCurrentJwtSecret();

  let currentError = null;

  /* =======================================================
     TRY CURRENT PRODUCTION SECRET FIRST
  ======================================================= */

  if (currentSecret) {
    try {
      return {
        decoded:
          jwt.verify(
            token,
            currentSecret
          ),

        source:
          "current",
      };
    } catch (error) {
      currentError =
        error;

      /*
       * If token is expired, there is no point trying
       * another secret. Signature is valid but expired.
       */

      if (
        error?.name ===
        "TokenExpiredError"
      ) {
        throw error;
      }
    }
  }

  /* =======================================================
     TRY LEGACY SECRET

     Existing Bharat RMS users may still have tokens
     created using the old hardcoded secret.
  ======================================================= */

  /*
   * Avoid retrying the exact same secret twice.
   */

  if (
    LEGACY_JWT_SECRET &&
    LEGACY_JWT_SECRET !==
      currentSecret
  ) {
    try {
      return {
        decoded:
          jwt.verify(
            token,
            LEGACY_JWT_SECRET
          ),

        source:
          "legacy",
      };
    } catch (legacyError) {
      /*
       * Expired legacy token should correctly force login.
       */

      if (
        legacyError?.name ===
        "TokenExpiredError"
      ) {
        throw legacyError;
      }

      /*
       * Neither secret could verify the JWT.
       */

      throw (
        currentError ||
        legacyError
      );
    }
  }

  if (currentError) {
    throw currentError;
  }

  throw new jwt.JsonWebTokenError(
    "Unable to verify token."
  );
};

/* =========================================================
   PROTECT
========================================================= */

const protect = async (
  req,
  res,
  next
) => {
  try {
    /* =====================================================
       AUTHORIZATION HEADER
    ===================================================== */

    const authHeader =
      String(
        req.headers
          .authorization ||
          ""
      ).trim();

    if (!authHeader) {
      return res
        .status(401)
        .json({
          success: false,

          code:
            "TOKEN_MISSING",

          message:
            "Authentication required. Please login again.",
        });
    }

    /* =====================================================
       EXTRACT BEARER TOKEN
    ===================================================== */

    const token =
      authHeader
        .toLowerCase()
        .startsWith(
          "bearer "
        )
        ? authHeader
            .slice(7)
            .trim()
        : authHeader;

    if (!token) {
      return res
        .status(401)
        .json({
          success: false,

          code:
            "TOKEN_MISSING",

          message:
            "Authentication required. Please login again.",
        });
    }

    /* =====================================================
       VERIFY
    ===================================================== */

    const {
      decoded,
      source,
    } =
      verifyBharatToken(
        token
      );

    if (!decoded?.id) {
      return res
        .status(401)
        .json({
          success: false,

          code:
            "INVALID_SESSION",

          message:
            "Invalid session. Please login again.",
        });
    }

    /* =====================================================
       USER

       Do NOT select password.
    ===================================================== */

    const user =
      await User.findById(
        decoded.id
      )
        .select(
          "_id name email role attendanceMode"
        )
        .lean();

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,

          code:
            "USER_NOT_FOUND",

          message:
            "Your session is no longer valid. Please login again.",
        });
    }

    /* =====================================================
       ATTACH AUTH USER

       Keeps existing req.user structure unchanged.
    ===================================================== */

    req.user = {
      _id:
        user._id,

      id:
        user._id,

      name:
        user.name,

      email:
        user.email,

      role:
        user.role,

      attendanceMode:
        user.attendanceMode,
    };

    /*
     * Internal metadata only.
     * Existing routes do not depend on this.
     */

    req.auth = {
      tokenSource:
        source,
    };

    return next();
  } catch (error) {
    /* =====================================================
       SAFE LOGGING

       Never log token or secret.
    ===================================================== */

    console.error(
      "BHARAT AUTH ERROR =>",
      error?.name,
      error?.message
    );

    /* =====================================================
       EXPIRED TOKEN
    ===================================================== */

    if (
      error?.name ===
      "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({
          success: false,

          code:
            "SESSION_EXPIRED",

          message:
            "Your session has expired. Please login again.",
        });
    }

    /* =====================================================
       INVALID TOKEN / SIGNATURE
    ===================================================== */

    if (
      error?.name ===
      "JsonWebTokenError"
    ) {
      return res
        .status(401)
        .json({
          success: false,

          code:
            "INVALID_SESSION",

          message:
            "Your session is invalid. Please login again.",
        });
    }

    /* =====================================================
       UNEXPECTED AUTH ERROR
    ===================================================== */

    console.error(
      "BHARAT AUTH UNEXPECTED ERROR =>",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        code:
          "AUTH_ERROR",

        message:
          "Authentication error.",
      });
  }
};

/* =========================================================
   EXPORT

   ALL EXISTING ROUTES CONTINUE WORKING

   Existing:
   const auth = require("../util/auth");

   New:
   const { protect } = require("../util/auth");

   Also:
   const { auth } = require("../util/auth");
========================================================= */

module.exports =
  protect;

module.exports.protect =
  protect;

module.exports.auth =
  protect;