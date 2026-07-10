const mongoose = require("mongoose");

const Attendance = require("../model/attendanceModel");
const User = require("../model/userModel");
const LeaveRequest = require("../model/leaveRequestModel");

const reverseGeocode = require("../util/reverseGeocode");
const { verifyOfficeLocation } = require("../util/locationUtil");

const {
  sendMissedCheckoutMailToUser,
  sendRegularizationRequestMailToAdmin,
  sendRegularizationDecisionMailToUser,

  sendLeaveRequestMailToApprovers,
  sendLeaveSubmissionMailToUser,
  sendLeaveDecisionMailToUser,

  sendWorkFromHomeDecisionMailToUser,
} = require("./attendanceMailService");

let notificationService = null;
let Notification = null;
let Timesheet = null;

try {
  notificationService = require("./notificationService");
  Notification = require("../model/notificationModel");
} catch (error) {
  console.log(
    "Notification service/model not loaded =>",
    error.message
  );
}

try {
  Timesheet = require("../model/timesheetModel");
} catch (error) {
  console.log(
    "Timesheet model not loaded =>",
    error.message
  );
}

/* =====================================================
   CONSTANTS
===================================================== */

const IST_TIME_ZONE = "Asia/Kolkata";

const PAID_LEAVE_PER_MONTH = 1;

const VALID_WORK_MODES = [
  "office",
  "work_from_home",
];

const VALID_LEAVE_TYPES = [
  "paid_leave",
  "loss_of_pay",
];

const VALID_LEAVE_DURATIONS = [
  "full_day",
  "first_half",
  "second_half",
];

const VALID_LEAVE_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

/* =====================================================
   SAFE NOTIFICATION / EMAIL
===================================================== */

const safeCreateNotification = async (payload) => {
  try {
    if (!notificationService?.createNotification) {
      return null;
    }

    return await notificationService.createNotification(
      payload
    );
  } catch (error) {
    console.log(
      "ATTENDANCE NOTIFICATION ERROR =>",
      error.message
    );

    return null;
  }
};

const safeSendAttendanceMail = (
  mailPromise,
  jobName = "ATTENDANCE MAIL"
) => {
  Promise.resolve(mailPromise).catch((error) => {
    console.log(
      `${jobName} ERROR =>`,
      error?.message || error
    );
  });
};

const notifyAttendance = async ({
  event,
  title,
  message,
  priority = "medium",
  targetUserIds = [],
  targetRoles = [],
  createdBy = null,
  referenceId = null,
  referenceModel = "Attendance",
  meta = {},
}) => {
  return safeCreateNotification({
    module: "attendance",
    event,
    title,
    message,
    priority,

    targetUserIds: targetUserIds.filter(Boolean),

    targetRoles: [
      ...new Set(
        targetRoles.filter(Boolean)
      ),
    ],

    createdBy,
    referenceId,
    referenceModel,

    actionUrl: "/dashboard#attendance",

    meta,
  });
};

/* =====================================================
   COMMON HELPERS
===================================================== */

const createServiceError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getUserId = (user) =>
  user?._id || user?.id;

const normalizeRole = (role = "") =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const isAdmin = (user) =>
  normalizeRole(user?.role) === "admin";

const isSuperAdmin = (user) =>
  normalizeRole(user?.role) ===
  "super_admin";

const isAdminOrSuperAdmin = (user) =>
  isAdmin(user) || isSuperAdmin(user);

const cleanText = (value = "") =>
  String(value || "").trim();

/* =====================================================
   IST DATE HELPERS
===================================================== */

const getISTDateKey = (
  date = new Date()
) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createServiceError(
      "Invalid date.",
      400
    );
  }

  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: IST_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(parsedDate);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
};

const parseDateKeyToDate = (dateKey) => {
  const safeDateKey = String(dateKey || "")
    .trim()
    .slice(0, 10);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      safeDateKey
    )
  ) {
    throw createServiceError(
      "Invalid date value.",
      400
    );
  }

  const [year, month, day] =
    safeDateKey.split("-").map(Number);

  const result = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    )
  );

  if (Number.isNaN(result.getTime())) {
    throw createServiceError(
      "Invalid date value.",
      400
    );
  }

  return result;
};

const getStartOfDay = (
  date = new Date()
) => {
  return parseDateKeyToDate(
    getISTDateKey(date)
  );
};

const getEndOfDay = (
  date = new Date()
) => {
  const result = getStartOfDay(date);

  result.setUTCHours(
    23,
    59,
    59,
    999
  );

  return result;
};

const getAttendanceDateFromBody = (
  date
) => {
  if (!date) {
    return parseDateKeyToDate(
      getISTDateKey()
    );
  }

  if (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      date.trim()
    )
  ) {
    return parseDateKeyToDate(
      date.trim()
    );
  }

  const parsedDate = new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw createServiceError(
      "Invalid attendance date.",
      400
    );
  }

  return parseDateKeyToDate(
    getISTDateKey(parsedDate)
  );
};

const isSundayByDateKey = (
  dateKey
) => {
  const [year, month, day] =
    String(dateKey)
      .slice(0, 10)
      .split("-")
      .map(Number);

  return (
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    ).getUTCDay() === 0
  );
};

/* =====================================================
   EXACT FRONTEND TIME → IST DATE

   Frontend should send:
   requestedCheckIn: "09:24"
   requestedCheckOut: "18:30"
===================================================== */

const normalizeFrontendTime = (
  value
) => {
  if (!value) return "";

  const raw = String(value).trim();

  const directTimeMatch = raw.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (directTimeMatch) {
    const hours = Number(
      directTimeMatch[1]
    );

    const minutes = Number(
      directTimeMatch[2]
    );

    const seconds = Number(
      directTimeMatch[3] || 0
    );

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      throw createServiceError(
        "Invalid requested time.",
        400
      );
    }

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  /*
   * Supports datetime-local or ISO strings by taking the
   * exact clock portion sent by the frontend.
   */
  const dateTimeMatch = raw.match(
    /T(\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (dateTimeMatch) {
    return `${dateTimeMatch[1]}:${
      dateTimeMatch[2]
    }:${dateTimeMatch[3] || "00"}`;
  }

  throw createServiceError(
    "Invalid requested time format. Use HH:mm.",
    400
  );
};

const buildISTDateTime = (
  attendanceDate,
  frontendTime
) => {
  if (!frontendTime) {
    return undefined;
  }

  const dateKey =
    getISTDateKey(attendanceDate);

  const clockTime =
    normalizeFrontendTime(frontendTime);

  /*
   * MongoDB stores Date values internally as UTC.
   * This represents the exact Indian time entered.
   */
  const result = new Date(
    `${dateKey}T${clockTime}+05:30`
  );

  if (
    Number.isNaN(
      result.getTime()
    )
  ) {
    throw createServiceError(
      "Invalid requested attendance time.",
      400
    );
  }

  return result;
};

const formatISTDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString(
    "en-IN",
    {
      timeZone: IST_TIME_ZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
};

const buildISTClockDate = (
  dateKey,
  time
) => {
  return new Date(
    `${dateKey}T${time}+05:30`
  );
};

/* =====================================================
   GENERAL ATTENDANCE HELPERS
===================================================== */

const getDeviceType = (
  userAgent = ""
) => {
  const normalizedUserAgent =
    String(userAgent).toLowerCase();

  if (
    /ipad|tablet/.test(
      normalizedUserAgent
    )
  ) {
    return "tablet";
  }

  if (
    /mobile|android|iphone|ipod/.test(
      normalizedUserAgent
    )
  ) {
    return "mobile";
  }

  if (normalizedUserAgent) {
    return "desktop";
  }

  return "unknown";
};

const getWorkMode = async (user) => {
  const fullUser = await User.findById(
    getUserId(user)
  )
    .select(
      "attendanceMode attendanceWorkMode"
    )
    .lean();

  const workMode =
    fullUser?.attendanceWorkMode ||
    fullUser?.attendanceMode ||
    "office";

  return VALID_WORK_MODES.includes(
    workMode
  )
    ? workMode
    : "office";
};

const getMinutesBetween = (
  checkIn,
  checkOut
) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  return Math.max(
    Math.round(
      (
        new Date(checkOut).getTime() -
        new Date(checkIn).getTime()
      ) /
        60000
    ),
    0
  );
};

const isAttendanceComplete = (
  attendance
) => {
  if (
    !attendance?.checkIn?.time ||
    !attendance?.checkOut?.time
  ) {
    return false;
  }

  const minutes =
    Number(
      attendance.totalWorkingMinutes ||
        0
    ) ||
    getMinutesBetween(
      attendance.checkIn.time,
      attendance.checkOut.time
    );

  return minutes >= 9 * 60;
};

const isTimesheetFilledForToday =
  async (
    userId,
    attendanceDate
  ) => {
    if (!Timesheet) {
      throw createServiceError(
        "Timesheet module is not configured. Checkout is not allowed.",
        500
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      throw createServiceError(
        "Invalid user id.",
        400
      );
    }

    const safeUserId =
      new mongoose.Types.ObjectId(
        String(userId)
      );

    const start = getStartOfDay(
      attendanceDate
    );

    const end = getEndOfDay(
      attendanceDate
    );

    const timesheet =
      await Timesheet.findOne({
        employeeId: safeUserId,

        reportDate: {
          $gte: start,
          $lte: end,
        },

        status: "submitted",

        workSummary: {
          $exists: true,
          $ne: "",
        },
      }).lean();

    return Boolean(timesheet);
  };

/* =====================================================
   UNIQUE DAILY NOTIFICATION
===================================================== */

const createDailyUniqueAttendanceNotification =
  async ({
    attendance,
    userId,
    event,
    title,
    message,
    priority = "high",
    meta = {},
  }) => {
    try {
      if (!Notification) return;

      const todayStart =
        getStartOfDay();

      const todayEnd =
        getEndOfDay();

      const alreadyExists =
        await Notification.exists({
          module: "attendance",
          event,

          referenceId:
            attendance?._id || null,

          targetUserIds: userId,

          createdAt: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        });

      if (alreadyExists) return;

      await safeCreateNotification({
        module: "attendance",
        event,
        title,
        message,
        priority,

        targetUserIds: [userId],
        targetRoles: [],

        createdBy: null,

        referenceId:
          attendance?._id || null,

        referenceModel:
          "Attendance",

        actionUrl:
          "/dashboard#attendance",

        meta,
      });
    } catch (error) {
      console.log(
        "ATTENDANCE DAILY UNIQUE NOTIFICATION ERROR =>",
        error.message
      );
    }
  };

/* =====================================================
   LOCATION
===================================================== */

const buildLocationObject = async (
  body,
  workMode
) => {
  const latitude = Number(
    body.latitude
  );

  const longitude = Number(
    body.longitude
  );

  const accuracy = Number(
    body.accuracy || 0
  );

  const ipAddress =
    body.ipAddress || "";

  const userAgent =
    body.userAgent || "";

  const deviceType =
    body.deviceType ||
    getDeviceType(userAgent);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw createServiceError(
      "Location permission is required to mark attendance.",
      400
    );
  }

  if (
    latitude === 0 &&
    longitude === 0
  ) {
    throw createServiceError(
      "Valid location is required to mark attendance.",
      400
    );
  }

  if (
    workMode ===
    "work_from_home"
  ) {
    const locationAddress =
      await reverseGeocode(
        latitude,
        longitude
      );

    return {
      latitude,
      longitude,
      accuracy,

      distanceFromOfficeMeters:
        null,

      isWithinOffice: false,

      ipAddress,
      userAgent,
      deviceType,

      locationAddress,

      googleMapLink:
        `https://www.google.com/maps?q=${latitude},${longitude}`,

      remark:
        body.remark || "",
    };
  }

  const result =
    verifyOfficeLocation({
      latitude,
      longitude,
    });

  return {
    latitude,
    longitude,
    accuracy,

    distanceFromOfficeMeters:
      result.distance,

    isWithinOffice:
      result.isWithinOffice,

    ipAddress,
    userAgent,
    deviceType,

    locationAddress: "",

    googleMapLink:
      `https://www.google.com/maps?q=${latitude},${longitude}`,

    remark:
      body.remark || "",
  };
};

/* =====================================================
   CHECK IN

   Existing production flow retained.
   Added only approved full-day leave protection.
===================================================== */

const checkIn = async (
  body,
  user
) => {
  if (isSuperAdmin(user)) {
    throw new Error(
      "Super admin can only track attendance."
    );
  }

  const workMode =
    await getWorkMode(user);

  const today =
    getStartOfDay();

  const approvedFullDayLeave =
    await LeaveRequest.findOne({
      employeeId:
        getUserId(user),

      status: "approved",

      duration: "full_day",

      fromDate: {
        $lte: today,
      },

      toDate: {
        $gte: today,
      },

      isActive: true,
    }).lean();

  if (approvedFullDayLeave) {
    throw new Error(
      "You have approved full-day leave for today."
    );
  }

  const existing =
    await Attendance.findOne({
      employeeId:
        getUserId(user),

      attendanceDate: today,
    });

  if (
    existing?.checkIn?.time
  ) {
    throw new Error(
      "You have already checked in today."
    );
  }

  const checkInData =
    await buildLocationObject(
      body,
      workMode
    );

  if (
    workMode === "office" &&
    !checkInData.isWithinOffice
  ) {
    throw new Error(
      `You are outside office location. Distance: ${checkInData.distanceFromOfficeMeters} meters.`
    );
  }

  const attendance =
    await Attendance.findOneAndUpdate(
      {
        employeeId:
          getUserId(user),

        attendanceDate: today,
      },
      {
        $set: {
          employeeId:
            getUserId(user),

          employeeName:
            user.name,

          employeeEmail:
            user.email,

          attendanceDate:
            today,

          workMode,

          attendanceSource:
            workMode ===
            "work_from_home"
              ? "work_from_home"
              : "office_location",

          attendanceStatus:
            "checked_in",

          checkIn: {
            time: new Date(),
            ...checkInData,
          },
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

  return attendance;
};

/* =====================================================
   CHECK OUT

   Existing production flow retained.
===================================================== */

const checkOut = async (
  body,
  user
) => {
  if (isSuperAdmin(user)) {
    throw new Error(
      "Super admin can only track attendance."
    );
  }

  const today =
    getStartOfDay();

  const userId =
    getUserId(user);

  const workMode =
    await getWorkMode(user);

  const attendance =
    await Attendance.findOne({
      employeeId: userId,
      attendanceDate: today,
    });

  if (
    !attendance ||
    !attendance.checkIn?.time
  ) {
    throw new Error(
      "Please check in first."
    );
  }

  if (
    attendance.checkOut?.time
  ) {
    throw new Error(
      "You have already checked out today."
    );
  }

  const hasTimesheet =
    await isTimesheetFilledForToday(
      userId,
      today
    );

  if (!hasTimesheet) {
    throw new Error(
      "Please fill today's timesheet before checkout."
    );
  }

  const checkOutData =
    await buildLocationObject(
      body,
      workMode
    );

  if (
    workMode === "office" &&
    !checkOutData.isWithinOffice
  ) {
    throw new Error(
      `You are outside office location. Distance: ${checkOutData.distanceFromOfficeMeters} meters.`
    );
  }

  const checkOutTime =
    new Date();

  const totalWorkingMinutes =
    Math.max(
      Math.round(
        (
          checkOutTime.getTime() -
          new Date(
            attendance.checkIn.time
          ).getTime()
        ) /
          60000
      ),
      0
    );

  attendance.checkOut = {
    time: checkOutTime,
    ...checkOutData,
  };

  attendance.totalWorkingMinutes =
    totalWorkingMinutes;

  attendance.attendanceStatus =
    "checked_out";

  await attendance.save();

  return attendance;
};

/* =====================================================
   TODAY ATTENDANCE
===================================================== */

const getTodayAttendance = async (
  user
) => {
  const today =
    getStartOfDay();

  return Attendance.findOne({
    employeeId:
      getUserId(user),

    attendanceDate:
      today,
  }).lean();
};

/* =====================================================
   ATTENDANCE LIST
===================================================== */

const getAttendanceList = async (
  query,
  user
) => {
  const {
    page = 1,
    limit = 20,
    employeeId,
    fromDate,
    toDate,
    attendanceStatus,
    workMode,
  } = query;

  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 20,
      1
    ),
    100
  );

  const filter = {};

  if (
    !isAdmin(user) &&
    !isSuperAdmin(user)
  ) {
    filter.employeeId =
      new mongoose.Types.ObjectId(
        String(
          getUserId(user)
        )
      );
  } else if (employeeId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        employeeId
      )
    ) {
      throw createServiceError(
        "Invalid employee ID.",
        400
      );
    }

    filter.employeeId =
      new mongoose.Types.ObjectId(
        employeeId
      );
  }

  if (attendanceStatus) {
    filter.attendanceStatus =
      attendanceStatus;
  }

  if (workMode) {
    filter.workMode = workMode;
  }

  if (fromDate || toDate) {
    filter.attendanceDate = {};

    if (fromDate) {
      filter.attendanceDate.$gte =
        getStartOfDay(fromDate);
    }

    if (toDate) {
      filter.attendanceDate.$lte =
        getEndOfDay(toDate);
    }
  }

  const [
    totalRecords,
    data,
  ] = await Promise.all([
    Attendance.countDocuments(
      filter
    ),

    Attendance.find(filter)
      .populate(
        "employeeId",
        "name email role"
      )
      .sort({
        attendanceDate: -1,
        createdAt: -1,
      })
      .skip(
        (safePage - 1) *
          safeLimit
      )
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    data,

    pagination: {
      totalRecords,

      currentPage:
        safePage,

      totalPages:
        Math.max(
          Math.ceil(
            totalRecords /
              safeLimit
          ),
          1
        ),

      limit:
        safeLimit,
    },
  };
};

/* =====================================================
   REGULARIZATION REQUEST

   Existing email flow retained.
   Only requested times are converted to exact IST.
===================================================== */

const requestRegularization = async (
  body,
  user
) => {
  if (isSuperAdmin(user)) {
    throw new Error(
      "Super admin cannot request regularization."
    );
  }

  if (
    !body.reason ||
    !String(
      body.reason
    ).trim()
  ) {
    throw new Error(
      "Regularization reason is required."
    );
  }

  const attendanceDate =
    getAttendanceDateFromBody(
      body.attendanceDate ||
        new Date()
    );

  const attendanceDateKey =
    getISTDateKey(
      attendanceDate
    );

  const today =
    getStartOfDay();

  const startAllowedDate =
    getStartOfDay();

  startAllowedDate.setUTCDate(
    startAllowedDate.getUTCDate() -
      9
  );

  if (
    attendanceDate > today
  ) {
    throw new Error(
      "Future date regularization is not allowed."
    );
  }

  if (
    attendanceDate <
    startAllowedDate
  ) {
    throw new Error(
      "Regularization is allowed only for the last 10 days."
    );
  }

  if (
    isSundayByDateKey(
      attendanceDateKey
    )
  ) {
    throw new Error(
      "Sunday regularization is not allowed."
    );
  }

  const approvedLeave =
    await LeaveRequest.findOne({
      employeeId:
        getUserId(user),

      status:
        "approved",

      duration:
        "full_day",

      fromDate: {
        $lte: attendanceDate,
      },

      toDate: {
        $gte: attendanceDate,
      },

      isActive:
        true,
    }).lean();

  if (approvedLeave) {
    throw new Error(
      "Regularization cannot be requested for an approved leave date."
    );
  }

  const workMode =
    await getWorkMode(user);

  const regularizationType =
    body.type || "other";

  const allowedTypes = [
    "missed_check_in",
    "missed_check_out",
    "wrong_time",
    "other",
  ];

  if (
    !allowedTypes.includes(
      regularizationType
    )
  ) {
    throw new Error(
      "Invalid regularization type."
    );
  }

  const existingAttendance =
    await Attendance.findOne({
      employeeId:
        getUserId(user),

      attendanceDate,
    });

  if (
    existingAttendance
      ?.regularization
      ?.status === "pending"
  ) {
    throw new Error(
      "Regularization request is already pending for this date."
    );
  }

  if (
    isAttendanceComplete(
      existingAttendance
    )
  ) {
    throw new Error(
      "Attendance is already complete for 9 hours. Regularization is not allowed."
    );
  }

  const hasCheckIn =
    Boolean(
      existingAttendance
        ?.checkIn?.time
    );

  const hasCheckOut =
    Boolean(
      existingAttendance
        ?.checkOut?.time
    );

  const requestedCheckIn =
    body.requestedCheckIn
      ? buildISTDateTime(
          attendanceDate,
          body.requestedCheckIn
        )
      : undefined;

  const requestedCheckOut =
    body.requestedCheckOut
      ? buildISTDateTime(
          attendanceDate,
          body.requestedCheckOut
        )
      : undefined;

  if (
    !hasCheckIn &&
    !hasCheckOut
  ) {
    if (
      !requestedCheckIn ||
      !requestedCheckOut
    ) {
      throw new Error(
        "Requested check-in and check-out time are required for missing full-day attendance."
      );
    }
  }

  if (
    !hasCheckIn &&
    hasCheckOut &&
    !requestedCheckIn
  ) {
    throw new Error(
      "Requested check-in time is required."
    );
  }

  if (
    hasCheckIn &&
    !hasCheckOut &&
    !requestedCheckOut
  ) {
    throw new Error(
      "Requested check-out time is required."
    );
  }

  if (
    regularizationType ===
    "missed_check_in"
  ) {
    if (hasCheckIn) {
      throw new Error(
        "Check-in already exists. Missed check-in regularization is not allowed."
      );
    }

    if (!requestedCheckIn) {
      throw new Error(
        "Requested check-in time is required."
      );
    }
  }

  if (
    regularizationType ===
    "missed_check_out"
  ) {
    if (hasCheckOut) {
      throw new Error(
        "Check-out already exists. Missed check-out regularization is not allowed."
      );
    }

    if (!requestedCheckOut) {
      throw new Error(
        "Requested check-out time is required."
      );
    }
  }

  if (
    regularizationType ===
    "wrong_time"
  ) {
    if (
      !requestedCheckIn ||
      !requestedCheckOut
    ) {
      throw new Error(
        "Requested check-in and check-out time are required."
      );
    }
  }

  const finalCheckIn =
    existingAttendance
      ?.checkIn?.time ||
    requestedCheckIn;

  const finalCheckOut =
    existingAttendance
      ?.checkOut?.time ||
    requestedCheckOut;

  if (
    finalCheckIn &&
    finalCheckOut &&
    finalCheckOut <= finalCheckIn
  ) {
    throw new Error(
      "Requested check-out time must be after check-in time."
    );
  }

  const attendance =
    await Attendance.findOneAndUpdate(
      {
        employeeId:
          getUserId(user),

        attendanceDate,
      },
      {
        $setOnInsert: {
          employeeId:
            getUserId(user),

          employeeName:
            user.name,

          employeeEmail:
            user.email,

          attendanceDate,
          workMode,
        },

        $set: {
          attendanceStatus:
            "regularization_pending",

          attendanceSource:
            "regularization",

          regularization: {
            requested: true,

            requestedAt:
              new Date(),

            type:
              regularizationType,

            reason:
              String(
                body.reason
              ).trim(),

            requestedCheckIn,

            requestedCheckOut,

            status:
              "pending",

            adminNotified:
              false,

            adminNotifiedAt:
              undefined,
          },
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

  await safeCreateNotification({
    module:
      "attendance",

    event:
      "regularization_requested",

    title:
      "Regularization Request",

    message:
      `${user.name} submitted attendance regularization request`,

    priority:
      "high",

    targetUserIds:
      [],

    targetRoles: [
      isAdmin(user)
        ? "super_admin"
        : "admin",
    ],

    createdBy:
      getUserId(user),

    referenceId:
      attendance._id,

    referenceModel:
      "Attendance",

    actionUrl:
      "/dashboard#attendance",

    meta: {
      employeeName:
        user.name,

      employeeEmail:
        user.email,

      attendanceDate,

      regularizationType,

      reason:
        String(
          body.reason
        ).trim(),

      requestedCheckIn:
        formatISTDateTime(
          requestedCheckIn
        ),

      requestedCheckOut:
        formatISTDateTime(
          requestedCheckOut
        ),
    },
  });

  /*
   * Existing regularization email flow unchanged:
   * normal users send approval email to admin.
   */
  if (!isAdmin(user)) {
    try {
      await sendRegularizationRequestMailToAdmin(
        attendance
      );

      attendance.regularization.adminNotified =
        true;

      attendance.regularization.adminNotifiedAt =
        new Date();

      await attendance.save();
    } catch (mailError) {
      console.error(
        "Regularization admin mail failed:",
        mailError.message
      );
    }
  }

  return attendance;
};

/* =====================================================
   REGULARIZATION HIERARCHY
===================================================== */

const validateRegularizationApprovalHierarchy =
  async (
    attendance,
    approver
  ) => {
    const employee =
      await User.findById(
        attendance.employeeId
      )
        .select(
          "role name email"
        )
        .lean();

    if (!employee) {
      throw new Error(
        "Employee not found."
      );
    }

    if (
      employee.role === "admin"
    ) {
      if (
        !isSuperAdmin(
          approver
        )
      ) {
        throw new Error(
          "Only super admin can approve admin regularization."
        );
      }

      return employee;
    }

    if (
      employee.role === "user"
    ) {
      if (
        !isAdmin(approver) &&
        !isSuperAdmin(
          approver
        )
      ) {
        throw new Error(
          "Only admin can approve user regularization."
        );
      }

      return employee;
    }

    throw new Error(
      "This regularization cannot be approved."
    );
  };

/* =====================================================
   APPROVE REGULARIZATION

   Existing email flow unchanged.
===================================================== */

const approveRegularization =
  async (
    attendanceId,
    body,
    user
  ) => {
    if (
      !isAdmin(user) &&
      !isSuperAdmin(user)
    ) {
      throw new Error(
        "Only admin or super admin can approve regularization."
      );
    }

    const attendance =
      await Attendance.findById(
        attendanceId
      );

    if (!attendance) {
      throw new Error(
        "Attendance not found."
      );
    }

    await validateRegularizationApprovalHierarchy(
      attendance,
      user
    );

    if (
      !attendance.regularization ||
      attendance.regularization
        .status !== "pending"
    ) {
      throw new Error(
        "No pending regularization found."
      );
    }

    if (!attendance.checkIn) {
      attendance.checkIn = {};
    }

    if (!attendance.checkOut) {
      attendance.checkOut = {};
    }

    if (
      attendance.regularization
        .requestedCheckIn
    ) {
      attendance.checkIn.time =
        attendance.regularization
          .requestedCheckIn;
    }

    if (
      attendance.regularization
        .requestedCheckOut
    ) {
      attendance.checkOut.time =
        attendance.regularization
          .requestedCheckOut;
    }

    if (
      attendance.checkIn?.time &&
      attendance.checkOut?.time
    ) {
      if (
        attendance.checkOut.time <=
        attendance.checkIn.time
      ) {
        throw new Error(
          "Approved check-out cannot be before check-in."
        );
      }

      attendance.totalWorkingMinutes =
        getMinutesBetween(
          attendance.checkIn.time,
          attendance.checkOut.time
        );
    }

    attendance.attendanceStatus =
      "regularized";

    attendance.regularization.status =
      "approved";

    attendance.regularization.approvedBy =
      {
        userId:
          getUserId(user),

        name:
          user.name,

        email:
          user.email,
      };

    attendance.regularization.approvedAt =
      new Date();

    await attendance.save();

    await safeCreateNotification({
      module:
        "attendance",

      event:
        "regularization_approved",

      title:
        "Regularization Approved",

      message:
        `Your attendance regularization was approved by ${user.name}`,

      priority:
        "normal",

      targetUserIds: [
        attendance.employeeId,
      ],

      targetRoles: [],

      createdBy:
        getUserId(user),

      referenceId:
        attendance._id,

      referenceModel:
        "Attendance",

      actionUrl:
        "/dashboard#attendance",

      meta: {
        employeeName:
          attendance.employeeName,

        attendanceDate:
          attendance.attendanceDate,

        approvedBy:
          user.name,
      },
    });

    sendRegularizationDecisionMailToUser(
      attendance,
      "approved"
    ).catch(console.error);

    return attendance;
  };

/* =====================================================
   REJECT REGULARIZATION

   Existing email flow unchanged.
===================================================== */

const rejectRegularization =
  async (
    attendanceId,
    body,
    user
  ) => {
    if (
      !isAdmin(user) &&
      !isSuperAdmin(user)
    ) {
      throw new Error(
        "Only admin or super admin can reject regularization."
      );
    }

    const attendance =
      await Attendance.findById(
        attendanceId
      );

    if (!attendance) {
      throw new Error(
        "Attendance not found."
      );
    }

    await validateRegularizationApprovalHierarchy(
      attendance,
      user
    );

    if (
      !attendance.regularization ||
      attendance.regularization
        .status !== "pending"
    ) {
      throw new Error(
        "No pending regularization found."
      );
    }

    attendance.regularization.status =
      "rejected";

    attendance.regularization.rejectionReason =
      body.rejectionReason || "";

    if (
      attendance.checkOut?.time
    ) {
      attendance.attendanceStatus =
        "checked_out";
    } else if (
      attendance.checkIn?.time
    ) {
      attendance.attendanceStatus =
        "checked_in";
    } else {
      attendance.attendanceStatus =
        "absent";
    }

    await attendance.save();

    await safeCreateNotification({
      module:
        "attendance",

      event:
        "regularization_rejected",

      title:
        "Regularization Rejected",

      message:
        `Your attendance regularization was rejected by ${user.name}`,

      priority:
        "high",

      targetUserIds: [
        attendance.employeeId,
      ],

      targetRoles: [],

      createdBy:
        getUserId(user),

      referenceId:
        attendance._id,

      referenceModel:
        "Attendance",

      actionUrl:
        "/dashboard#attendance",

      meta: {
        employeeName:
          attendance.employeeName,

        attendanceDate:
          attendance.attendanceDate,

        rejectedBy:
          user.name,

        rejectionReason:
          body.rejectionReason || "",
      },
    });

    sendRegularizationDecisionMailToUser(
      attendance,
      "rejected"
    ).catch(console.error);

    return attendance;
  };

/* =====================================================
   WORK MODE UPDATE

   Current production architecture is direct management
   enable/disable, not employee WFH request approval.
===================================================== */

const updateEmployeeWorkMode =
  async ({
    employeeId,
    workMode,
    user,
  }) => {
    if (
      !isAdminOrSuperAdmin(user)
    ) {
      throw createServiceError(
        "Only admin or super admin can change attendance work mode.",
        403
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        employeeId
      )
    ) {
      throw createServiceError(
        "Invalid employee ID.",
        400
      );
    }

    if (
      !VALID_WORK_MODES.includes(
        workMode
      )
    ) {
      throw createServiceError(
        "Invalid work mode.",
        400
      );
    }

    const employee =
      await User.findById(
        employeeId
      );

    if (!employee) {
      throw createServiceError(
        "Employee not found.",
        404
      );
    }

    const oldWorkMode =
      employee.attendanceMode ||
      employee.attendanceWorkMode ||
      "office";

    employee.attendanceMode =
      workMode;

    if (
      employee.schema.path(
        "attendanceWorkMode"
      )
    ) {
      employee.attendanceWorkMode =
        workMode;
    }

    await employee.save();

    await notifyAttendance({
      event:
        "work_mode_updated",

      title:
        workMode ===
        "work_from_home"
          ? "Work From Home Enabled"
          : "Office Attendance Enabled",

      message:
        `Your attendance work mode was changed to ${
          workMode ===
          "work_from_home"
            ? "Work From Home"
            : "Office"
        } by ${user.name}.`,

      priority:
        "high",

      targetUserIds: [
        employee._id,
      ],

      targetRoles: [
        "super_admin",
      ],

      createdBy:
        getUserId(user),

      referenceId:
        employee._id,

      referenceModel:
        "User",

      meta: {
        employeeName:
          employee.name,

        employeeEmail:
          employee.email,

        employeeRole:
          employee.role,

        oldWorkMode,

        workMode,

        updatedBy:
          user.name,
      },
    });

    if (
      workMode ===
      "work_from_home"
    ) {
      const now =
        new Date();

      const workFromHomeMailData = {
        employeeId:
          employee._id,

        employeeName:
          employee.name,

        employeeEmail:
          employee.email,

        employeeRole:
          employee.role,

        fromDate:
          now,

        toDate:
          now,

        reason:
          cleanText(
            user?.workModeReason
          ) ||
          "Work From Home attendance mode enabled by management.",

        status:
          "approved",

        approvedByName:
          user.name,

        approvedAt:
          now,
      };

      safeSendAttendanceMail(
        sendWorkFromHomeDecisionMailToUser(
          workFromHomeMailData,
          "approved",
          {
            decidedByName:
              user.name,

            decidedByEmail:
              user.email,
          }
        ),
        "WORK FROM HOME APPROVAL MAIL"
      );
    }

    return {
      employeeId:
        employee._id,

      employeeName:
        employee.name,

      employeeEmail:
        employee.email,

      employeeRole:
        employee.role,

      oldWorkMode,

      workMode,

      updatedBy:
        user.name,
    };
  };

/* =====================================================
   LEAVE HELPERS
===================================================== */

const getMonthRange = (
  date = new Date()
) => {
  const dateKey =
    getISTDateKey(date);

  const [year, month] =
    dateKey
      .split("-")
      .map(Number);

  return {
    monthStart:
      new Date(
        Date.UTC(
          year,
          month - 1,
          1
        )
      ),

    monthEnd:
      new Date(
        Date.UTC(
          year,
          month,
          0,
          23,
          59,
          59,
          999
        )
      ),

    year,
    month,
  };
};

const getLeaveUnits = (
  duration
) => {
  return duration ===
    "full_day"
    ? 1
    : 0.5;
};

const formatLeaveType = (
  leaveType
) => {
  return leaveType ===
    "paid_leave"
    ? "Paid Leave"
    : "Loss of Pay";
};

const getApprovedPaidLeaveUsage =
  async ({
    employeeId,
    monthDate,
  }) => {
    const {
      monthStart,
      monthEnd,
    } = getMonthRange(
      monthDate
    );

    const approvedLeaves =
      await LeaveRequest.find({
        employeeId,

        leaveType:
          "paid_leave",

        status:
          "approved",

        fromDate: {
          $gte:
            monthStart,

          $lte:
            monthEnd,
        },

        isActive:
          true,
      })
        .select(
          "duration"
        )
        .lean();

    return approvedLeaves.reduce(
      (total, leave) =>
        total +
        getLeaveUnits(
          leave.duration
        ),
      0
    );
  };

const getPendingPaidLeaveUsage =
  async ({
    employeeId,
    monthDate,
    excludeLeaveId,
  }) => {
    const {
      monthStart,
      monthEnd,
    } = getMonthRange(
      monthDate
    );

    const filter = {
      employeeId,

      leaveType:
        "paid_leave",

      status:
        "pending",

      fromDate: {
        $gte:
          monthStart,

        $lte:
          monthEnd,
      },

      isActive:
        true,
    };

    if (excludeLeaveId) {
      filter._id = {
        $ne:
          excludeLeaveId,
      };
    }

    const pendingLeaves =
      await LeaveRequest.find(
        filter
      )
        .select(
          "duration"
        )
        .lean();

    return pendingLeaves.reduce(
      (total, leave) =>
        total +
        getLeaveUnits(
          leave.duration
        ),
      0
    );
  };

const getLeaveBalance = async ({
  employeeId,
  monthDate = new Date(),
}) => {
  const approvedPaid =
    await getApprovedPaidLeaveUsage({
      employeeId,
      monthDate,
    });

  const pendingPaid =
    await getPendingPaidLeaveUsage({
      employeeId,
      monthDate,
    });

  return {
    monthlyPaidLeaveEntitlement:
      PAID_LEAVE_PER_MONTH,

    approvedPaidLeave:
      approvedPaid,

    pendingPaidLeave:
      pendingPaid,

    availablePaidLeave:
      Math.max(
        PAID_LEAVE_PER_MONTH -
          approvedPaid -
          pendingPaid,
        0
      ),

    lossOfPayAvailable:
      true,
  };
};

const validateLeaveApprovalHierarchy =
  async (
    leaveRequest,
    approver
  ) => {
    const employeeRole =
      normalizeRole(
        leaveRequest.employeeRole
      );

    if (
      employeeRole === "admin"
    ) {
      if (
        !isSuperAdmin(
          approver
        )
      ) {
        throw createServiceError(
          "Only super admin can approve or reject an admin leave request.",
          403
        );
      }

      return;
    }

    if (
      employeeRole === "user"
    ) {
      if (
        !isAdminOrSuperAdmin(
          approver
        )
      ) {
        throw createServiceError(
          "Only admin or super admin can approve this leave request.",
          403
        );
      }

      return;
    }

    throw createServiceError(
      "This leave request cannot be processed.",
      403
    );
  };

/* =====================================================
   APPLY LEAVE
===================================================== */

const applyLeave = async (
  body,
  user
) => {
  if (isSuperAdmin(user)) {
    throw createServiceError(
      "Super admin does not require leave approval through this hierarchy.",
      400
    );
  }

  const leaveType =
    cleanText(
      body.leaveType
    ).toLowerCase();

  const duration =
    cleanText(
      body.duration ||
        "full_day"
    ).toLowerCase();

  const reason =
    cleanText(
      body.reason
    );

  if (
    !VALID_LEAVE_TYPES.includes(
      leaveType
    )
  ) {
    throw createServiceError(
      "Invalid leave type.",
      400
    );
  }

  if (
    !VALID_LEAVE_DURATIONS.includes(
      duration
    )
  ) {
    throw createServiceError(
      "Invalid leave duration.",
      400
    );
  }

  if (!reason) {
    throw createServiceError(
      "Leave reason is required.",
      400
    );
  }

  if (!body.fromDate) {
    throw createServiceError(
      "Leave start date is required.",
      400
    );
  }

  const fromDate =
    getAttendanceDateFromBody(
      body.fromDate
    );

  const toDate =
    getAttendanceDateFromBody(
      body.toDate ||
        body.fromDate
    );

  if (
    toDate < fromDate
  ) {
    throw createServiceError(
      "Leave end date cannot be before start date.",
      400
    );
  }

  if (
    duration !== "full_day" &&
    getISTDateKey(fromDate) !==
      getISTDateKey(toDate)
  ) {
    throw createServiceError(
      "Half-day leave can be applied only for one date.",
      400
    );
  }

  const employeeId =
    getUserId(user);

  const overlappingLeave =
    await LeaveRequest.findOne({
      employeeId,

      status: {
        $in: [
          "pending",
          "approved",
        ],
      },

      isActive:
        true,

      fromDate: {
        $lte:
          toDate,
      },

      toDate: {
        $gte:
          fromDate,
      },
    }).lean();

  if (overlappingLeave) {
    throw createServiceError(
      "A pending or approved leave request already exists for the selected date.",
      409
    );
  }

  if (
    leaveType ===
    "paid_leave"
  ) {
    if (
      getISTDateKey(
        fromDate
      ) !==
      getISTDateKey(
        toDate
      )
    ) {
      throw createServiceError(
        "Only one paid leave per month is available. Select one date or apply Loss of Pay.",
        400
      );
    }

    const balance =
      await getLeaveBalance({
        employeeId,
        monthDate:
          fromDate,
      });

    const requestedUnits =
      getLeaveUnits(
        duration
      );

    if (
      balance.availablePaidLeave <
      requestedUnits
    ) {
      throw createServiceError(
        "No paid leave is available for this month. Please apply Loss of Pay.",
        400
      );
    }
  }

  const leaveRequest =
    await LeaveRequest.create({
      employeeId,

      employeeName:
        user.name,

      employeeEmail:
        user.email,

      employeeRole:
        normalizeRole(
          user.role
        ),

      leaveType,
      duration,
      fromDate,
      toDate,
      reason,

      status:
        "pending",

      isActive:
        true,

      appliedAt:
        new Date(),

      approvalLevel:
        isAdmin(user)
          ? "super_admin"
          : "admin_or_super_admin",

      createdBy:
        employeeId,

      createdByName:
        user.name,

      updatedBy:
        employeeId,

      updatedByName:
        user.name,

      history: [
        {
          action:
            "applied",

          message:
            `${user.name} applied for ${formatLeaveType(
              leaveType
            )}`,

          performedBy:
            employeeId,

          performedByName:
            user.name,

          createdAt:
            new Date(),
        },
      ],
    });

  const targetRoles =
    isAdmin(user)
      ? ["super_admin"]
      : [
          "admin",
          "super_admin",
        ];

  await notifyAttendance({
    event:
      "leave_requested",

    title:
      "New Leave Request",

    message:
      `${user.name} applied for ${formatLeaveType(
        leaveType
      )} from ${getISTDateKey(
        fromDate
      )} to ${getISTDateKey(
        toDate
      )}.`,

    priority:
      "high",

    targetRoles,

    createdBy:
      employeeId,

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      employeeName:
        user.name,

      employeeEmail:
        user.email,

      employeeRole:
        normalizeRole(
          user.role
        ),

      leaveType,
      duration,
      fromDate,
      toDate,
      reason,

      approvalLevel:
        leaveRequest
          .approvalLevel,
    },
  });

  await notifyAttendance({
    event:
      "leave_submitted",

    title:
      "Leave Request Submitted",

    message:
      `Your ${formatLeaveType(
        leaveType
      )} request was submitted successfully.`,

    priority:
      "medium",

    targetUserIds: [
      employeeId,
    ],

    createdBy:
      employeeId,

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      leaveType,
      duration,
      fromDate,
      toDate,

      status:
        leaveRequest.status,
    },
  });

  safeSendAttendanceMail(
    sendLeaveSubmissionMailToUser(
      leaveRequest
    ),
    "LEAVE SUBMISSION MAIL"
  );

  safeSendAttendanceMail(
    sendLeaveRequestMailToApprovers(
      leaveRequest
    ),
    "LEAVE APPROVER MAIL"
  );

  return leaveRequest;
};

/* =====================================================
   MY LEAVE SUMMARY
===================================================== */

const getMyLeaveSummary = async (
  query,
  user
) => {
  let employeeId =
    getUserId(user);

  if (
    isAdminOrSuperAdmin(
      user
    ) &&
    query.employeeId
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(
        query.employeeId
      )
    ) {
      throw createServiceError(
        "Invalid employee ID.",
        400
      );
    }

    employeeId =
      query.employeeId;
  }

  const monthDate =
    query.month ||
    new Date();

  const balance =
    await getLeaveBalance({
      employeeId,
      monthDate,
    });

  const {
    monthStart,
    monthEnd,
  } = getMonthRange(
    monthDate
  );

  const requests =
    await LeaveRequest.find({
      employeeId,

      fromDate: {
        $gte:
          monthStart,

        $lte:
          monthEnd,
      },

      isActive:
        true,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

  const approvedLossOfPay =
    requests
      .filter(
        (item) =>
          item.leaveType ===
            "loss_of_pay" &&
          item.status ===
            "approved"
      )
      .reduce(
        (total, item) =>
          total +
          getLeaveUnits(
            item.duration
          ),
        0
      );

  return {
    balance: {
      ...balance,

      approvedLossOfPay,
    },

    requests,
  };
};

/* =====================================================
   LEAVE REQUEST LIST
===================================================== */

const getLeaveRequests = async (
  query,
  user
) => {
  const {
    status,
    leaveType,
    employeeId,
    fromDate,
    toDate,
    page = 1,
    limit = 20,
  } = query;

  const filter = {
    isActive: true,
  };

  if (
    !isAdminOrSuperAdmin(
      user
    )
  ) {
    filter.employeeId =
      getUserId(user);
  } else if (employeeId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        employeeId
      )
    ) {
      throw createServiceError(
        "Invalid employee ID.",
        400
      );
    }

    filter.employeeId =
      employeeId;
  }

  /*
   * Admin sees only normal-user requests.
   * Super admin sees user and admin requests.
   */
  if (isAdmin(user)) {
    filter.employeeRole =
      "user";
  }

  if (status) {
    if (
      !VALID_LEAVE_STATUSES.includes(
        status
      )
    ) {
      throw createServiceError(
        "Invalid leave status.",
        400
      );
    }

    filter.status = status;
  }

  if (leaveType) {
    if (
      !VALID_LEAVE_TYPES.includes(
        leaveType
      )
    ) {
      throw createServiceError(
        "Invalid leave type.",
        400
      );
    }

    filter.leaveType =
      leaveType;
  }

  if (
    fromDate ||
    toDate
  ) {
    filter.fromDate = {};

    if (fromDate) {
      filter.fromDate.$gte =
        getStartOfDay(
          fromDate
        );
    }

    if (toDate) {
      filter.fromDate.$lte =
        getEndOfDay(
          toDate
        );
    }
  }

  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 20,
      1
    ),
    100
  );

  const [
    requests,
    totalRecords,
  ] = await Promise.all([
    LeaveRequest.find(filter)
      .populate(
        "employeeId",
        "name email role"
      )
      .sort({
        status: 1,
        createdAt: -1,
      })
      .skip(
        (safePage - 1) *
          safeLimit
      )
      .limit(safeLimit)
      .lean(),

    LeaveRequest.countDocuments(
      filter
    ),
  ]);

  return {
    data:
      requests,

    pagination: {
      totalRecords,

      currentPage:
        safePage,

      totalPages:
        Math.max(
          Math.ceil(
            totalRecords /
              safeLimit
          ),
          1
        ),

      limit:
        safeLimit,
    },
  };
};

/* =====================================================
   APPROVE LEAVE
===================================================== */

const approveLeave = async (
  leaveRequestId,
  body,
  user
) => {
  if (
    !isAdminOrSuperAdmin(
      user
    )
  ) {
    throw createServiceError(
      "Only admin or super admin can approve leave.",
      403
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      leaveRequestId
    )
  ) {
    throw createServiceError(
      "Invalid leave request ID.",
      400
    );
  }

  const leaveRequest =
    await LeaveRequest.findOne({
      _id:
        leaveRequestId,

      isActive:
        true,
    });

  if (!leaveRequest) {
    throw createServiceError(
      "Leave request not found.",
      404
    );
  }

  if (
    leaveRequest.status !==
    "pending"
  ) {
    throw createServiceError(
      "Only pending leave requests can be approved.",
      400
    );
  }

  await validateLeaveApprovalHierarchy(
    leaveRequest,
    user
  );

  if (
    leaveRequest.leaveType ===
    "paid_leave"
  ) {
    const approvedUsage =
      await getApprovedPaidLeaveUsage({
        employeeId:
          leaveRequest.employeeId,

        monthDate:
          leaveRequest.fromDate,
      });

    const requestedUnits =
      getLeaveUnits(
        leaveRequest.duration
      );

    if (
      approvedUsage +
        requestedUnits >
      PAID_LEAVE_PER_MONTH
    ) {
      throw createServiceError(
        "The employee's monthly paid leave balance is exhausted. Reject this request or ask the employee to apply Loss of Pay.",
        400
      );
    }
  }

  const leaveAttendanceDates =
    [];

  let currentDate =
    new Date(
      leaveRequest.fromDate
    );

  while (
    currentDate <=
    leaveRequest.toDate
  ) {
    const dateKey =
      getISTDateKey(
        currentDate
      );

    if (
      !isSundayByDateKey(
        dateKey
      )
    ) {
      leaveAttendanceDates.push({
        dateKey,

        attendanceDate:
          parseDateKeyToDate(
            dateKey
          ),
      });
    }

    currentDate.setUTCDate(
      currentDate.getUTCDate() +
        1
    );
  }

  /*
   * Validate all conflicts before changing leave status.
   */
  for (
    const item of
    leaveAttendanceDates
  ) {
    const existingAttendance =
      await Attendance.findOne({
        employeeId:
          leaveRequest.employeeId,

        attendanceDate:
          item.attendanceDate,
      }).lean();

    if (
      existingAttendance
        ?.checkIn?.time ||
      existingAttendance
        ?.checkOut?.time
    ) {
      throw createServiceError(
        `Attendance already exists for ${item.dateKey}. Leave cannot be approved for this date.`,
        409
      );
    }

    if (
      existingAttendance
        ?.leaveRequestId &&
      String(
        existingAttendance
          .leaveRequestId
      ) !==
        String(
          leaveRequest._id
        )
    ) {
      throw createServiceError(
        `Another leave attendance record already exists for ${item.dateKey}.`,
        409
      );
    }
  }

  leaveRequest.status =
    "approved";

  leaveRequest.approvedBy =
    getUserId(user);

  leaveRequest.approvedByName =
    user.name;

  leaveRequest.approvedAt =
    new Date();

  leaveRequest.updatedBy =
    getUserId(user);

  leaveRequest.updatedByName =
    user.name;

  leaveRequest.history.push({
    action:
      "approved",

    message:
      `Leave approved by ${user.name}`,

    performedBy:
      getUserId(user),

    performedByName:
      user.name,

    createdAt:
      new Date(),
  });

  await leaveRequest.save();

  for (
    const item of
    leaveAttendanceDates
  ) {
    await Attendance.findOneAndUpdate(
      {
        employeeId:
          leaveRequest.employeeId,

        attendanceDate:
          item.attendanceDate,
      },
      {
        $set: {
          employeeId:
            leaveRequest.employeeId,

          employeeName:
            leaveRequest.employeeName,

          employeeEmail:
            leaveRequest.employeeEmail,

          attendanceDate:
            item.attendanceDate,

          workMode:
            "office",

          attendanceStatus:
            leaveRequest.leaveType ===
            "paid_leave"
              ? "on_leave"
              : "loss_of_pay",

          attendanceSource:
            "leave",

          leaveRequestId:
            leaveRequest._id,

          leaveType:
            leaveRequest.leaveType,

          leaveDuration:
            leaveRequest.duration,

          totalWorkingMinutes:
            0,
        },
      },
      {
        upsert:
          true,

        new:
          true,

        setDefaultsOnInsert:
          true,
      }
    );
  }

  await notifyAttendance({
    event:
      "leave_approved",

    title:
      "Leave Approved",

    message:
      `Your ${formatLeaveType(
        leaveRequest.leaveType
      )} request was approved by ${user.name}.`,

    priority:
      "high",

    targetUserIds: [
      leaveRequest.employeeId,
    ],

    createdBy:
      getUserId(user),

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      employeeName:
        leaveRequest.employeeName,

      employeeRole:
        leaveRequest.employeeRole,

      leaveType:
        leaveRequest.leaveType,

      duration:
        leaveRequest.duration,

      fromDate:
        leaveRequest.fromDate,

      toDate:
        leaveRequest.toDate,

      approvedBy:
        user.name,

      approvedAt:
        leaveRequest.approvedAt,
    },
  });

  await notifyAttendance({
    event:
      "leave_decision_recorded",

    title:
      "Leave Approval Recorded",

    message:
      `${user.name} approved ${leaveRequest.employeeName}'s leave request.`,

    priority:
      "medium",

    targetRoles: [
      "super_admin",
    ],

    createdBy:
      getUserId(user),

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      employeeName:
        leaveRequest.employeeName,

      employeeRole:
        leaveRequest.employeeRole,

      leaveType:
        leaveRequest.leaveType,

      approvedBy:
        user.name,

      approvedAt:
        leaveRequest.approvedAt,
    },
  });

  safeSendAttendanceMail(
    sendLeaveDecisionMailToUser(
      leaveRequest,
      "approved",
      {
        decidedByName:
          user.name,

        decidedByEmail:
          user.email,
      }
    ),
    "LEAVE APPROVAL MAIL"
  );

  return leaveRequest;
};

/* =====================================================
   REJECT LEAVE
===================================================== */

const rejectLeave = async (
  leaveRequestId,
  body,
  user
) => {
  if (
    !isAdminOrSuperAdmin(
      user
    )
  ) {
    throw createServiceError(
      "Only admin or super admin can reject leave.",
      403
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      leaveRequestId
    )
  ) {
    throw createServiceError(
      "Invalid leave request ID.",
      400
    );
  }

  const rejectionReason =
    cleanText(
      body?.rejectionReason ||
        body?.reason
    );

  if (!rejectionReason) {
    throw createServiceError(
      "Rejection reason is required.",
      400
    );
  }

  const leaveRequest =
    await LeaveRequest.findOne({
      _id:
        leaveRequestId,

      isActive:
        true,
    });

  if (!leaveRequest) {
    throw createServiceError(
      "Leave request not found.",
      404
    );
  }

  if (
    leaveRequest.status !==
    "pending"
  ) {
    throw createServiceError(
      "Only pending leave requests can be rejected.",
      400
    );
  }

  await validateLeaveApprovalHierarchy(
    leaveRequest,
    user
  );

  leaveRequest.status =
    "rejected";

  leaveRequest.rejectedBy =
    getUserId(user);

  leaveRequest.rejectedByName =
    user.name;

  leaveRequest.rejectedAt =
    new Date();

  leaveRequest.rejectionReason =
    rejectionReason;

  leaveRequest.updatedBy =
    getUserId(user);

  leaveRequest.updatedByName =
    user.name;

  leaveRequest.history.push({
    action:
      "rejected",

    message:
      `Leave rejected by ${user.name}: ${rejectionReason}`,

    performedBy:
      getUserId(user),

    performedByName:
      user.name,

    createdAt:
      new Date(),
  });

  await leaveRequest.save();

  await notifyAttendance({
    event:
      "leave_rejected",

    title:
      "Leave Request Rejected",

    message:
      `Your leave request was rejected by ${user.name}. Reason: ${rejectionReason}`,

    priority:
      "high",

    targetUserIds: [
      leaveRequest.employeeId,
    ],

    createdBy:
      getUserId(user),

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      employeeName:
        leaveRequest.employeeName,

      employeeRole:
        leaveRequest.employeeRole,

      leaveType:
        leaveRequest.leaveType,

      duration:
        leaveRequest.duration,

      fromDate:
        leaveRequest.fromDate,

      toDate:
        leaveRequest.toDate,

      rejectedBy:
        user.name,

      rejectedAt:
        leaveRequest.rejectedAt,

      rejectionReason,
    },
  });

  await notifyAttendance({
    event:
      "leave_decision_recorded",

    title:
      "Leave Rejection Recorded",

    message:
      `${user.name} rejected ${leaveRequest.employeeName}'s leave request.`,

    priority:
      "medium",

    targetRoles: [
      "super_admin",
    ],

    createdBy:
      getUserId(user),

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      employeeName:
        leaveRequest.employeeName,

      employeeRole:
        leaveRequest.employeeRole,

      leaveType:
        leaveRequest.leaveType,

      rejectedBy:
        user.name,

      rejectionReason,
    },
  });

  safeSendAttendanceMail(
    sendLeaveDecisionMailToUser(
      leaveRequest,
      "rejected",
      {
        decidedByName:
          user.name,

        decidedByEmail:
          user.email,
      }
    ),
    "LEAVE REJECTION MAIL"
  );

  return leaveRequest;
};

/* =====================================================
   CANCEL LEAVE
===================================================== */

const cancelLeave = async (
  leaveRequestId,
  user
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      leaveRequestId
    )
  ) {
    throw createServiceError(
      "Invalid leave request ID.",
      400
    );
  }

  const leaveRequest =
    await LeaveRequest.findOne({
      _id:
        leaveRequestId,

      employeeId:
        getUserId(user),

      isActive:
        true,
    });

  if (!leaveRequest) {
    throw createServiceError(
      "Leave request not found.",
      404
    );
  }

  if (
    leaveRequest.status !==
    "pending"
  ) {
    throw createServiceError(
      "Only a pending leave request can be cancelled.",
      400
    );
  }

  leaveRequest.status =
    "cancelled";

  leaveRequest.cancelledAt =
    new Date();

  leaveRequest.updatedBy =
    getUserId(user);

  leaveRequest.updatedByName =
    user.name;

  leaveRequest.history.push({
    action:
      "cancelled",

    message:
      `Leave cancelled by ${user.name}`,

    performedBy:
      getUserId(user),

    performedByName:
      user.name,

    createdAt:
      new Date(),
  });

  await leaveRequest.save();

  await notifyAttendance({
    event:
      "leave_cancelled",

    title:
      "Leave Request Cancelled",

    message:
      `${user.name} cancelled a pending leave request.`,

    priority:
      "medium",

    targetRoles:
      isAdmin(user)
        ? ["super_admin"]
        : [
            "admin",
            "super_admin",
          ],

    createdBy:
      getUserId(user),

    referenceId:
      leaveRequest._id,

    referenceModel:
      "LeaveRequest",

    meta: {
      employeeName:
        leaveRequest.employeeName,

      employeeRole:
        leaveRequest.employeeRole,

      leaveType:
        leaveRequest.leaveType,

      duration:
        leaveRequest.duration,

      fromDate:
        leaveRequest.fromDate,

      toDate:
        leaveRequest.toDate,

      cancelledAt:
        leaveRequest.cancelledAt,
    },
  });

  return leaveRequest;
};

/* =====================================================
   MISSED CHECK-IN NOTIFICATIONS
===================================================== */

const createMissedCheckInNotifications =
  async () => {
    const today =
      getStartOfDay();

    const dateKey =
      getISTDateKey();

    const now =
      new Date();

    /*
     * Exact 10:15 AM IST.
     */
    const checkInDeadline =
      buildISTClockDate(
        dateKey,
        "10:15:00"
      );

    if (
      now <
      checkInDeadline
    ) {
      return {
        checked:
          0,

        notificationsCreated:
          0,

        message:
          "Missed check-in notification runs only after 10:15 AM IST.",
      };
    }

    const users =
      await User.find({
        role: {
          $in: [
            "admin",
            "user",
          ],
        },
      })
        .select(
          "_id name email role attendanceMode attendanceWorkMode"
        )
        .lean();

    let notificationsCreated =
      0;

    for (
      const employee of users
    ) {
      const attendance =
        await Attendance.findOne({
          employeeId:
            employee._id,

          attendanceDate:
            today,
        });

      if (
        attendance?.checkIn?.time
      ) {
        continue;
      }

      const employeeWorkMode =
        employee.attendanceWorkMode ||
        employee.attendanceMode ||
        "office";

      const finalAttendance =
        attendance ||
        (await Attendance.create({
          employeeId:
            employee._id,

          employeeName:
            employee.name,

          employeeEmail:
            employee.email,

          attendanceDate:
            today,

          workMode:
            employeeWorkMode,

          attendanceStatus:
            "absent",

          /*
           * Uses an existing model enum value.
           */
          attendanceSource:
            employeeWorkMode ===
            "work_from_home"
              ? "work_from_home"
              : "office_location",
        }));

      await createDailyUniqueAttendanceNotification(
        {
          attendance:
            finalAttendance,

          userId:
            employee._id,

          event:
            "missed_check_in",

          title:
            "Check-in Missing",

          message:
            "You have not checked in after 10:15 AM. Please check in or apply regularization.",

          priority:
            "high",

          meta: {
            employeeName:
              employee.name,

            employeeEmail:
              employee.email,

            attendanceDate:
              today,
          },
        }
      );

      notificationsCreated +=
        1;
    }

    return {
      checked:
        users.length,

      notificationsCreated,
    };
  };

/* =====================================================
   MISSED CHECKOUT NOTIFICATIONS
===================================================== */

const createMissedCheckoutNotifications =
  async () => {
    const today =
      getStartOfDay();

    const dateKey =
      getISTDateKey();

    const now =
      new Date();

    /*
     * Exact 7:00 PM IST.
     */
    const checkoutReminderTime =
      buildISTClockDate(
        dateKey,
        "19:00:00"
      );

    if (
      now <
      checkoutReminderTime
    ) {
      return {
        checked:
          0,

        notificationsCreated:
          0,

        message:
          "Missed checkout notification runs only after 7:00 PM IST.",
      };
    }

    const attendances =
      await Attendance.find({
        attendanceDate:
          today,

        "checkIn.time": {
          $exists:
            true,
        },

        "checkOut.time": {
          $exists:
            false,
        },

        "regularization.status": {
          $ne:
            "pending",
        },
      });

    let notificationsCreated =
      0;

    for (
      const attendance of
      attendances
    ) {
      await createDailyUniqueAttendanceNotification(
        {
          attendance,

          userId:
            attendance.employeeId,

          event:
            "missed_check_out",

          title:
            "Checkout Missing",

          message:
            "You have not checked out after 7:00 PM. Please checkout or apply regularization.",

          priority:
            "high",

          meta: {
            employeeName:
              attendance.employeeName,

            employeeEmail:
              attendance.employeeEmail,

            attendanceDate:
              attendance.attendanceDate,
          },
        }
      );

      notificationsCreated +=
        1;
    }

    return {
      checked:
        attendances.length,

      notificationsCreated,
    };
  };

/* =====================================================
   MISSED CHECKOUT REGULARIZATION EMAIL REMINDER
===================================================== */

const createMissedCheckoutRegularizationReminders =
  async () => {
    const yesterday =
      getStartOfDay();

    yesterday.setUTCDate(
      yesterday.getUTCDate() -
        1
    );

    const attendances =
      await Attendance.find({
        attendanceDate:
          yesterday,

        "checkIn.time": {
          $exists:
            true,
        },

        "checkOut.time": {
          $exists:
            false,
        },

        "regularization.status": {
          $ne:
            "pending",
        },

        "reminder.missedCheckoutMailSent": {
          $ne:
            true,
        },
      });

    let mailSent = 0;

    for (
      const attendance of
      attendances
    ) {
      attendance.attendanceStatus =
        "regularization_pending";

      attendance.regularization.requested =
        false;

      attendance.regularization.type =
        "missed_check_out";

      attendance.regularization.reason =
        "";

      attendance.regularization.status =
        "none";

      attendance.reminder.lastReminderSentAt =
        new Date();

      await safeCreateNotification({
        module:
          "attendance",

        event:
          "missed_checkout_regularization",

        title:
          "Checkout Regularization Required",

        message:
          `Your checkout is missing for ${new Date(
            attendance.attendanceDate
          ).toLocaleDateString(
            "en-IN",
            {
              timeZone:
                IST_TIME_ZONE,
            }
          )}. Please submit regularization.`,

        priority:
          "high",

        targetUserIds: [
          attendance.employeeId,
        ],

        targetRoles:
          [],

        createdBy:
          null,

        referenceId:
          attendance._id,

        referenceModel:
          "Attendance",

        actionUrl:
          "/dashboard#attendance",

        meta: {
          employeeName:
            attendance.employeeName,

          employeeEmail:
            attendance.employeeEmail,

          attendanceDate:
            attendance.attendanceDate,
        },
      });

      try {
        await sendMissedCheckoutMailToUser(
          attendance
        );

        attendance.reminder.missedCheckoutMailSent =
          true;

        attendance.reminder.missedCheckoutMailSentAt =
          new Date();

        mailSent += 1;
      } catch (mailError) {
        console.error(
          "Missed checkout mail failed:",
          mailError.message
        );
      }

      await attendance.save();
    }

    return {
      checked:
        attendances.length,

      mailSent,
    };
  };

/* =====================================================
   EXPORTS
===================================================== */

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