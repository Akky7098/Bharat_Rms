const jwt = require("jsonwebtoken");
const User = require("../model/userModel");

require("dotenv").config();

/* =========================================================
   BHARAT RMS AUTH MIDDLEWARE

   IMPORTANT:
   Uses the SAME authentication as the existing RMS.
========================================================= */

const protect = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized: Token missing.",
      });
    }

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized: Token missing.",
      });
    }

    /* =====================================================
       SAME SECRET CURRENT RMS USES
    ===================================================== */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "abc123"
    );

    if (!decoded?.id) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Invalid token.",
      });
    }

    const user =
      await User.findById(decoded.id)
        .select(
          "_id name email role attendanceMode"
        )
        .lean();

    if (!user) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: Invalid or expired session.",
      });
    }

    req.user = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      attendanceMode:
        user.attendanceMode,
    };

    next();
  } catch (error) {
    console.error(
      "BHARAT AUTH ERROR =>",
      error.message
    );

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Session expired. Please login again.",
      });
    }

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Invalid token.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Authentication error.",
    });
  }
};

/*
 * Existing code:
 * const auth = require("../util/auth");
 *
 * New AI code:
 * const { protect } = require("../util/auth");
 *
 * BOTH WORK.
 */

module.exports = protect;
module.exports.protect = protect;
module.exports.auth = protect;