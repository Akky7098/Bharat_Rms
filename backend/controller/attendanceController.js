const attendanceService = require("../services/attendanceService");

/* =====================================================
   COMMON HELPERS
===================================================== */

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
};

const buildAuditPayload = (req) => {
  return {
    ...req.body,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || "",
  };
};

const sendSuccess = (
  res,
  data,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendPaginatedSuccess = (
  res,
  result,
  message = "Data fetched successfully"
) => {
  return res.status(200).json({
    success: true,
    message,
    data: result?.data || [],
    pagination: result?.pagination || {
      totalRecords: 0,
      currentPage: 1,
      totalPages: 1,
      limit: 20,
    },
  });
};

const handleError = (res, error) => {
  console.error("ATTENDANCE CONTROLLER ERROR =>", error);

  if (error?.name === "ValidationError") {
    const validationMessage = Object.values(error.errors || {})
      .map((item) => item.message)
      .filter(Boolean)
      .join(", ");

    return res.status(400).json({
      success: false,
      message:
        validationMessage ||
        "Attendance validation failed.",
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid record ID.",
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "A request already exists for the selected employee and date.",
    });
  }

  return res
    .status(error?.statusCode || 400)
    .json({
      success: false,
      message:
        error?.message ||
        "Attendance operation failed.",
    });
};

/* =====================================================
   ATTENDANCE
===================================================== */

const checkIn = async (req, res) => {
  try {
    const data = await attendanceService.checkIn(
      buildAuditPayload(req),
      req.user
    );

    return sendSuccess(
      res,
      data,
      "Checked in successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const checkOut = async (req, res) => {
  try {
    const data = await attendanceService.checkOut(
      buildAuditPayload(req),
      req.user
    );

    return sendSuccess(
      res,
      data,
      "Checked out successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const data =
      await attendanceService.getTodayAttendance(
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Today attendance fetched successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const getAttendanceList = async (req, res) => {
  try {
    const result =
      await attendanceService.getAttendanceList(
        req.query,
        req.user
      );

    return sendPaginatedSuccess(
      res,
      result,
      "Attendance records fetched successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/* =====================================================
   REGULARIZATION
===================================================== */

const requestRegularization = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.requestRegularization(
        req.body,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Regularization request submitted successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const approveRegularization = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.approveRegularization(
        req.params.attendanceId,
        req.body,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Regularization approved successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const rejectRegularization = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.rejectRegularization(
        req.params.attendanceId,
        req.body,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Regularization rejected successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/* =====================================================
   WORK MODE
===================================================== */

const updateEmployeeWorkMode = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.updateEmployeeWorkMode(
        {
          employeeId: req.params.employeeId,
          workMode: req.body.workMode,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      data,
      "Employee attendance work mode updated successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/* =====================================================
   LEAVE
===================================================== */

const applyLeave = async (req, res) => {
  try {
    const data =
      await attendanceService.applyLeave(
        req.body,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Leave request submitted successfully.",
      201
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const getMyLeaveSummary = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.getMyLeaveSummary(
        req.query,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Leave balance and requests fetched successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const getLeaveRequests = async (
  req,
  res
) => {
  try {
    const result =
      await attendanceService.getLeaveRequests(
        req.query,
        req.user
      );

    return sendPaginatedSuccess(
      res,
      result,
      "Leave requests fetched successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const approveLeave = async (req, res) => {
  try {
    const data =
      await attendanceService.approveLeave(
        req.params.leaveRequestId,
        req.body,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Leave request approved successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const rejectLeave = async (req, res) => {
  try {
    const data =
      await attendanceService.rejectLeave(
        req.params.leaveRequestId,
        req.body,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Leave request rejected successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelLeave = async (req, res) => {
  try {
    const data =
      await attendanceService.cancelLeave(
        req.params.leaveRequestId,
        req.user
      );

    return sendSuccess(
      res,
      data,
      "Leave request cancelled successfully."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

/* =====================================================
   OPTIONAL CRON CONTROLLERS

   These can be called by secured cron routes if needed.
===================================================== */

const createMissedCheckInNotifications = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.createMissedCheckInNotifications();

    return sendSuccess(
      res,
      data,
      "Missed check-in notification job completed."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const createMissedCheckoutNotifications = async (
  req,
  res
) => {
  try {
    const data =
      await attendanceService.createMissedCheckoutNotifications();

    return sendSuccess(
      res,
      data,
      "Missed checkout notification job completed."
    );
  } catch (error) {
    return handleError(res, error);
  }
};

const createMissedCheckoutRegularizationReminders =
  async (req, res) => {
    try {
      const data =
        await attendanceService.createMissedCheckoutRegularizationReminders();

      return sendSuccess(
        res,
        data,
        "Missed checkout regularization reminder job completed."
      );
    } catch (error) {
      return handleError(res, error);
    }
  };

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceList,

  requestRegularization,
  approveRegularization,
  rejectRegularization,

  updateEmployeeWorkMode,

  applyLeave,
  getMyLeaveSummary,
  getLeaveRequests,
  approveLeave,
  rejectLeave,
  cancelLeave,

  createMissedCheckInNotifications,
  createMissedCheckoutNotifications,
  createMissedCheckoutRegularizationReminders,
};