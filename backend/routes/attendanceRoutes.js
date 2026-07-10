const express = require("express");

const router = express.Router();

const authMiddleware = require("../util/auth");
const attendanceController = require("../controller/attendanceController");

/* =====================================================
   EVERY ATTENDANCE ROUTE REQUIRES LOGIN
===================================================== */

router.use(authMiddleware);

/* =====================================================
   ATTENDANCE
===================================================== */

router.post(
  "/check-in",
  attendanceController.checkIn
);

router.post(
  "/check-out",
  attendanceController.checkOut
);

router.get(
  "/today",
  attendanceController.getTodayAttendance
);

router.get(
  "/",
  attendanceController.getAttendanceList
);

/* =====================================================
   REGULARIZATION
===================================================== */

router.post(
  "/regularize",
  attendanceController.requestRegularization
);

router.patch(
  "/:attendanceId/regularize/approve",
  attendanceController.approveRegularization
);

router.patch(
  "/:attendanceId/regularize/reject",
  attendanceController.rejectRegularization
);

/* =====================================================
   WORK MODE

   Admin/super-admin permission is validated in service.
===================================================== */

router.patch(
  "/employees/:employeeId/work-mode",
  attendanceController.updateEmployeeWorkMode
);

/* =====================================================
   LEAVE

   POST /leave
   Employee/admin submits leave.

   GET /leave/summary
   Logged-in user's monthly balance and history.
   Admin/super-admin may pass employeeId.

   GET /leave/requests
   User sees own requests.
   Admin sees user requests.
   Super-admin sees all requests.

   PATCH approval routes enforce hierarchy in service.
===================================================== */

router.post(
  "/leave",
  attendanceController.applyLeave
);

router.get(
  "/leave/summary",
  attendanceController.getMyLeaveSummary
);

router.get(
  "/leave/requests",
  attendanceController.getLeaveRequests
);

router.patch(
  "/leave/:leaveRequestId/approve",
  attendanceController.approveLeave
);

router.patch(
  "/leave/:leaveRequestId/reject",
  attendanceController.rejectLeave
);

router.patch(
  "/leave/:leaveRequestId/cancel",
  attendanceController.cancelLeave
);

module.exports = router;