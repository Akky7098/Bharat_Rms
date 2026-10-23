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

/* =====================================================

   WORKDAY LOCATION TRACKING

===================================================== */

/*
 * Logged-in employee sends genuine GPS checkpoint.
 *
 * Employee ID is NEVER accepted from frontend.
 * Backend uses req.user.
 */
router.post(
  "/location/checkpoint",
  attendanceController.createLocationCheckpoint
);

/*
 * Used by employee PWA to determine whether
 * workday tracking is active.
 */
router.get(
  "/location/status",
  attendanceController.getMyLocationTrackingStatus
);

/*
 * Management history.
 *
 * SUPER ADMIN ONLY.
 *
 * Example:
 *
 * GET
 * /api/attendance/location/history/USER_ID
 * ?date=2026-08-21
 */
router.get(
  "/location/history/:employeeId",
  attendanceController.getEmployeeLocationHistory
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

// Attendance roster is separate from historical salesperson choices.
router.get("/employees", async (req, res) => {
  try {
    if (!["admin", "super_admin"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Management access required." });
    const data = await require("../model/userModel").find({ role: { $in: ["user", "admin"] }, status: { $ne: "inactive" } }).select("_id name email role status attendanceWorkMode").sort({ name: 1 }).lean();
    res.set("Cache-Control", "private, no-store").json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: "Unable to load attendance employees." }); }
});

// Dedicated temporary WFH and short-leave approvals; existing attendance routes stay intact.
const attendanceRequests = require("../services/attendanceRequestService");
for (const [path, kind] of [["work-from-home", "work_from_home"], ["short-leave", "short_leave"]]) {
  const respond = handler => async (req, res) => {
    try { res.set("Cache-Control", "private, no-store"); res.json({ success: true, ...await handler(req) }); }
    catch (error) { res.status(error.statusCode || (error.name === "ValidationError" ? 400 : 500)).json({ success: false, message: error.statusCode || error.name === "ValidationError" ? error.message : "Unable to process attendance request." }); }
  };
  router.post(`/${path}`, respond(async req => ({ data: await attendanceRequests.apply(kind, req.body, req.user) })));
  router.get(`/${path}`, respond(req => attendanceRequests.list(kind, req.query, req.user)));
  for (const action of ["approve", "reject"]) router.patch(`/${path}/:requestId/${action}`, respond(async req => ({ data: await attendanceRequests.decide(kind, req.params.requestId, action === "approve", req.body, req.user) })));
}

module.exports = router;