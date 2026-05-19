const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const attendanceController = require("../controller/attendanceController");

router.post("/check-in", authMiddleware, attendanceController.checkIn);

router.post("/check-out", authMiddleware, attendanceController.checkOut);

router.get("/today", authMiddleware, attendanceController.getTodayAttendance);

router.get("/", authMiddleware, attendanceController.getAttendanceList);

router.post(
  "/regularize",
  authMiddleware,
  attendanceController.requestRegularization
);

router.patch(
  "/:attendanceId/regularize/approve",
  authMiddleware,
  attendanceController.approveRegularization
);

router.patch(
  "/:attendanceId/regularize/reject",
  authMiddleware,
  attendanceController.rejectRegularization
);

module.exports = router;