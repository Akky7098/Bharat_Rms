const mongoose = require("mongoose");
const Attendance = require("../model/attendanceModel");
const User = require("../model/userModel");
const reverseGeocode = require("../util/reverseGeocode");
const { verifyOfficeLocation } = require("../util/locationUtil");

const {
  sendMissedCheckoutMailToUser,
  sendRegularizationRequestMailToAdmin,
  sendRegularizationDecisionMailToUser,
} = require("./attendanceMailService");

let notificationService = null;
let Notification = null;

try {
  notificationService = require("./notificationService");
  Notification = require("../model/notificationModel");
} catch (error) {
  console.log("Notification service/model not loaded =>", error.message);
}

const safeCreateNotification = async (payload) => {
  try {
    if (!notificationService?.createNotification) return;
    await notificationService.createNotification(payload);
  } catch (error) {
    console.log("ATTENDANCE NOTIFICATION ERROR =>", error.message);
  }
};

const getUserId = (user) => user?._id || user?.id;

const isAdmin = (user) => user?.role === "admin";
const isSuperAdmin = (user) => user?.role === "super_admin";

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getDeviceType = (userAgent = "") => {
  const ua = String(userAgent).toLowerCase();

  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile";
  if (ua) return "desktop";

  return "unknown";
};

const getWorkMode = async (user) => {
  const fullUser = await User.findById(getUserId(user)).lean();

  return (
    fullUser?.attendanceWorkMode ||
    fullUser?.attendanceMode ||
    "office"
  );
};

const createDailyUniqueAttendanceNotification = async ({
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

    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay();

    const alreadyExists = await Notification.exists({
      module: "attendance",
      event,
      referenceId: attendance?._id || null,
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
      referenceId: attendance?._id || null,
      referenceModel: "Attendance",
      actionUrl: "/dashboard#attendance",
      meta,
    });
  } catch (error) {
    console.log("ATTENDANCE DAILY UNIQUE NOTIFICATION ERROR =>", error.message);
  }
};
const getMinutesBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  return Math.max(
    Math.round((new Date(checkOut) - new Date(checkIn)) / 60000),
    0
  );
};

const isAttendanceComplete = (attendance) => {
  if (!attendance?.checkIn?.time || !attendance?.checkOut?.time) return false;

  const minutes =
    Number(attendance.totalWorkingMinutes || 0) ||
    getMinutesBetween(attendance.checkIn.time, attendance.checkOut.time);

  return minutes >= 9 * 60;
};
const buildLocationObject = async (body, workMode) => {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy || 0);

  const ipAddress = body.ipAddress || "";
  const userAgent = body.userAgent || "";
  const deviceType = body.deviceType || getDeviceType(userAgent);

  if (!latitude || !longitude) {
    throw new Error("Location permission is required to mark attendance.");
  }

  let locationAddress = "";

  if (workMode === "work_from_home") {
    locationAddress = await reverseGeocode(latitude, longitude);
  }

  if (workMode === "work_from_home") {
    return {
      latitude,
      longitude,
      accuracy,
      distanceFromOfficeMeters: null,
      isWithinOffice: false,
      ipAddress,
      userAgent,
      deviceType,
      locationAddress,
      googleMapLink: `https://www.google.com/maps?q=${latitude},${longitude}`,
      remark: body.remark || "",
    };
  }

  const result = verifyOfficeLocation({ latitude, longitude });

  return {
    latitude,
    longitude,
    accuracy,
    distanceFromOfficeMeters: result.distance,
    isWithinOffice: result.isWithinOffice,
    ipAddress,
    userAgent,
    deviceType,
    locationAddress: "",
    remark: body.remark || "",
  };
};


const checkIn = async (body, user) => {
  if (isSuperAdmin(user)) {
    throw new Error("Super admin can only track attendance.");
  }

  const workMode = await getWorkMode(user);
  const today = getStartOfDay();

  const existing = await Attendance.findOne({
    employeeId: getUserId(user),
    attendanceDate: today,
  });

  if (existing?.checkIn?.time) {
    throw new Error("You have already checked in today.");
  }

  const checkInData = await buildLocationObject(body, workMode);

  if (workMode === "office" && !checkInData.isWithinOffice) {
    throw new Error(
      `You are outside office location. Distance: ${checkInData.distanceFromOfficeMeters} meters.`
    );
  }

  const attendance = await Attendance.findOneAndUpdate(
    {
      employeeId: getUserId(user),
      attendanceDate: today,
    },
    {
      $set: {
        employeeId: getUserId(user),
        employeeName: user.name,
        employeeEmail: user.email,
        attendanceDate: today,
        workMode,
        attendanceSource:
          workMode === "work_from_home" ? "work_from_home" : "office_location",
        attendanceStatus: "checked_in",
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

const checkOut = async (body, user) => {
  if (isSuperAdmin(user)) {
    throw new Error("Super admin can only track attendance.");
  }

  const today = getStartOfDay();
  const workMode = await getWorkMode(user);

  const attendance = await Attendance.findOne({
    employeeId: getUserId(user),
    attendanceDate: today,
  });

  if (!attendance || !attendance.checkIn?.time) {
    throw new Error("Please check in first.");
  }

  if (attendance.checkOut?.time) {
    throw new Error("You have already checked out today.");
  }

  const checkOutData = await buildLocationObject(body, workMode);

  if (workMode === "office" && !checkOutData.isWithinOffice) {
    throw new Error(
      `You are outside office location. Distance: ${checkOutData.distanceFromOfficeMeters} meters.`
    );
  }

  const totalWorkingMinutes = Math.max(
    Math.round((new Date() - new Date(attendance.checkIn.time)) / 60000),
    0
  );

  attendance.checkOut = {
    time: new Date(),
    ...checkOutData,
  };

  attendance.totalWorkingMinutes = totalWorkingMinutes;
  attendance.attendanceStatus = "checked_out";

  await attendance.save();

  return attendance;
};

const getTodayAttendance = async (user) => {
  const today = getStartOfDay();

  return Attendance.findOne({
    employeeId: getUserId(user),
    attendanceDate: today,
  }).lean();
};

const getAttendanceList = async (query, user) => {
  const {
    page = 1,
    limit = 20,
    employeeId,
    fromDate,
    toDate,
    attendanceStatus,
    workMode,
  } = query;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Number(limit) || 20, 100);

  const filter = {};

  if (!isAdmin(user) && !isSuperAdmin(user)) {
    filter.employeeId = new mongoose.Types.ObjectId(getUserId(user));
  } else if (employeeId) {
    filter.employeeId = new mongoose.Types.ObjectId(employeeId);
  }

  if (attendanceStatus) filter.attendanceStatus = attendanceStatus;
  if (workMode) filter.workMode = workMode;

  if (fromDate || toDate) {
    filter.attendanceDate = {};
    if (fromDate) filter.attendanceDate.$gte = getStartOfDay(fromDate);
    if (toDate) filter.attendanceDate.$lte = getEndOfDay(toDate);
  }

  const [totalRecords, data] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter)
      .populate("employeeId", "name email role")
      .sort({ attendanceDate: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    data,
    pagination: {
      totalRecords,
      currentPage: safePage,
      totalPages: Math.ceil(totalRecords / safeLimit),
      limit: safeLimit,
    },
  };
};

const requestRegularization = async (body, user) => {
  if (isSuperAdmin(user)) {
    throw new Error("Super admin cannot request regularization.");
  }

  if (!body.reason || !String(body.reason).trim()) {
    throw new Error("Regularization reason is required.");
  }

  const attendanceDate = getStartOfDay(body.attendanceDate || new Date());
  const today = getStartOfDay();

  const startAllowedDate = getStartOfDay();
  startAllowedDate.setDate(startAllowedDate.getDate() - 6);

  if (attendanceDate > today) {
    throw new Error("Future date regularization is not allowed.");
  }

  if (attendanceDate < startAllowedDate) {
    throw new Error("Regularization is allowed only for the last 7 days.");
  }

  if (attendanceDate.getDay() === 0) {
    throw new Error("Sunday regularization is not allowed.");
  }

  const workMode = await getWorkMode(user);
  const regularizationType = body.type || "other";

  const allowedTypes = [
    "missed_check_in",
    "missed_check_out",
    "wrong_time",
    "other",
  ];

  if (!allowedTypes.includes(regularizationType)) {
    throw new Error("Invalid regularization type.");
  }

  const existingAttendance = await Attendance.findOne({
    employeeId: getUserId(user),
    attendanceDate,
  });

  if (existingAttendance?.regularization?.status === "pending") {
    throw new Error("Regularization request is already pending for this date.");
  }

  if (isAttendanceComplete(existingAttendance)) {
    throw new Error("Attendance is already complete for 9 hours. Regularization is not allowed.");
  }

  const hasCheckIn = Boolean(existingAttendance?.checkIn?.time);
  const hasCheckOut = Boolean(existingAttendance?.checkOut?.time);

  if (!hasCheckIn && !hasCheckOut) {
    if (!body.requestedCheckIn || !body.requestedCheckOut) {
      throw new Error("Requested check-in and check-out time are required for missing attendance.");
    }
  }

  if (regularizationType === "missed_check_in" && !body.requestedCheckIn) {
    throw new Error("Requested check-in time is required.");
  }

  if (regularizationType === "missed_check_out" && !body.requestedCheckOut) {
    throw new Error("Requested check-out time is required.");
  }

  if (
    regularizationType === "wrong_time" &&
    (!body.requestedCheckIn || !body.requestedCheckOut)
  ) {
    throw new Error("Requested check-in and check-out time are required.");
  }

  const attendance = await Attendance.findOneAndUpdate(
    {
      employeeId: getUserId(user),
      attendanceDate,
    },
    {
      $setOnInsert: {
        employeeId: getUserId(user),
        employeeName: user.name,
        employeeEmail: user.email,
        attendanceDate,
        workMode,
      },
      $set: {
        attendanceStatus: "regularization_pending",
        attendanceSource: "regularization",
        regularization: {
          requested: true,
          requestedAt: new Date(),
          type: regularizationType,
          reason: String(body.reason).trim(),
          requestedCheckIn: body.requestedCheckIn || undefined,
          requestedCheckOut: body.requestedCheckOut || undefined,
          status: "pending",
          adminNotified: false,
          adminNotifiedAt: undefined,
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
    module: "attendance",
    event: "regularization_requested",
    title: "Regularization Request",
    message: `${user.name} submitted attendance regularization request`,
    priority: "high",
    targetUserIds: [],
    targetRoles: [isAdmin(user) ? "super_admin" : "admin"],
    createdBy: getUserId(user),
    referenceId: attendance._id,
    referenceModel: "Attendance",
    actionUrl: "/dashboard#attendance",
    meta: {
      employeeName: user.name,
      employeeEmail: user.email,
      attendanceDate,
      regularizationType,
      reason: String(body.reason).trim(),
    },
  });

  if (!isAdmin(user)) {
    try {
      await sendRegularizationRequestMailToAdmin(attendance);
      attendance.regularization.adminNotified = true;
      attendance.regularization.adminNotifiedAt = new Date();
      await attendance.save();
    } catch (mailError) {
      console.error("Regularization admin mail failed:", mailError.message);
    }
  }

  return attendance;
};
const validateRegularizationApprovalHierarchy = async (attendance, approver) => {
  const employee = await User.findById(attendance.employeeId).select("role name email").lean();

  if (!employee) {
    throw new Error("Employee not found.");
  }

  if (employee.role === "admin") {
    if (!isSuperAdmin(approver)) {
      throw new Error("Only super admin can approve admin regularization.");
    }
    return employee;
  }

  if (employee.role === "user") {
    if (!isAdmin(approver) && !isSuperAdmin(approver)) {
      throw new Error("Only admin can approve user regularization.");
    }
    return employee;
  }

  throw new Error("This regularization cannot be approved.");
};
const approveRegularization = async (attendanceId, body, user) => {
  if (!isAdmin(user) && !isSuperAdmin(user)) {
    throw new Error("Only admin or super admin can approve regularization.");
  }

  const attendance = await Attendance.findById(attendanceId);

  if (!attendance) {
    throw new Error("Attendance not found.");
  }
   await validateRegularizationApprovalHierarchy(attendance, user);
  if (!attendance.regularization || attendance.regularization.status !== "pending") {
    throw new Error("No pending regularization found.");
  }

  if (!attendance.checkIn) {
    attendance.checkIn = {};
  }

  if (!attendance.checkOut) {
    attendance.checkOut = {};
  }

  if (attendance.regularization.requestedCheckIn) {
    attendance.checkIn.time = attendance.regularization.requestedCheckIn;
  }

  if (attendance.regularization.requestedCheckOut) {
    attendance.checkOut.time = attendance.regularization.requestedCheckOut;
  }

  if (attendance.checkIn?.time && attendance.checkOut?.time) {
    attendance.totalWorkingMinutes = Math.max(
      Math.round(
        (new Date(attendance.checkOut.time) -
          new Date(attendance.checkIn.time)) /
          60000
      ),
      0
    );
  }

  attendance.attendanceStatus = "regularized";

  attendance.regularization.status = "approved";
  attendance.regularization.approvedBy = {
    userId: getUserId(user),
    name: user.name,
    email: user.email,
  };
  attendance.regularization.approvedAt = new Date();

  await attendance.save();

  await safeCreateNotification({
    module: "attendance",
    event: "regularization_approved",
    title: "Regularization Approved",
    message: `Your attendance regularization was approved by ${user.name}`,
    priority: "normal",
    targetUserIds: [attendance.employeeId],
    targetRoles: [],
    createdBy: getUserId(user),
    referenceId: attendance._id,
    referenceModel: "Attendance",
    actionUrl: "/dashboard#attendance",
    meta: {
      employeeName: attendance.employeeName,
      attendanceDate: attendance.attendanceDate,
      approvedBy: user.name,
    },
  });

  sendRegularizationDecisionMailToUser(attendance, "approved").catch(
    console.error
  );

  return attendance;
};

const isSundayIST = (date) => {
  if (!date) return false;

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(new Date(date));

  return weekday === "Sunday";
};

const requestRegularization = async (body, user) => {
  if (isSuperAdmin(user)) {
    throw new Error("Super admin cannot request regularization.");
  }

  if (!body.reason || !String(body.reason).trim()) {
    throw new Error("Regularization reason is required.");
  }

  const attendanceDate = getStartOfDay(body.attendanceDate || new Date());
  const today = getStartOfDay();

  // 10 days including today = today + previous 9 days
  const startAllowedDate = getStartOfDay();
  startAllowedDate.setDate(startAllowedDate.getDate() - 9);

  if (attendanceDate > today) {
    throw new Error("Future date regularization is not allowed.");
  }

  if (attendanceDate < startAllowedDate) {
    throw new Error("Regularization is allowed only for the last 10 days.");
  }

  // Sunday blocked using India calendar
  if (isSundayIST(attendanceDate)) {
    throw new Error("Sunday regularization is not allowed.");
  }

  const workMode = await getWorkMode(user);
  const regularizationType = body.type || "other";

  const allowedTypes = [
    "missed_check_in",
    "missed_check_out",
    "wrong_time",
    "other",
  ];

  if (!allowedTypes.includes(regularizationType)) {
    throw new Error("Invalid regularization type.");
  }

  const existingAttendance = await Attendance.findOne({
    employeeId: getUserId(user),
    attendanceDate,
  });

  if (existingAttendance?.regularization?.status === "pending") {
    throw new Error("Regularization request is already pending for this date.");
  }

  if (isAttendanceComplete(existingAttendance)) {
    throw new Error(
      "Attendance is already complete for 9 hours. Regularization is not allowed."
    );
  }

  const hasCheckIn = Boolean(existingAttendance?.checkIn?.time);
  const hasCheckOut = Boolean(existingAttendance?.checkOut?.time);

  const requestedCheckIn = body.requestedCheckIn || undefined;
  const requestedCheckOut = body.requestedCheckOut || undefined;

  // Full day missing
  if (!hasCheckIn && !hasCheckOut) {
    if (!requestedCheckIn || !requestedCheckOut) {
      throw new Error(
        "Requested check-in and check-out time are required for missing full-day attendance."
      );
    }
  }

  // Check-in missing only
  if (!hasCheckIn && hasCheckOut) {
    if (!requestedCheckIn) {
      throw new Error("Requested check-in time is required.");
    }
  }

  // Check-out missing only
  if (hasCheckIn && !hasCheckOut) {
    if (!requestedCheckOut) {
      throw new Error("Requested check-out time is required.");
    }
  }

  if (regularizationType === "missed_check_in") {
    if (hasCheckIn) {
      throw new Error("Check-in already exists. Missed check-in regularization is not allowed.");
    }

    if (!requestedCheckIn) {
      throw new Error("Requested check-in time is required.");
    }
  }

  if (regularizationType === "missed_check_out") {
    if (hasCheckOut) {
      throw new Error("Check-out already exists. Missed check-out regularization is not allowed.");
    }

    if (!requestedCheckOut) {
      throw new Error("Requested check-out time is required.");
    }
  }

  if (regularizationType === "wrong_time") {
    if (!requestedCheckIn || !requestedCheckOut) {
      throw new Error("Requested check-in and check-out time are required.");
    }
  }

  const attendance = await Attendance.findOneAndUpdate(
    {
      employeeId: getUserId(user),
      attendanceDate,
    },
    {
      $setOnInsert: {
        employeeId: getUserId(user),
        employeeName: user.name,
        employeeEmail: user.email,
        attendanceDate,
        workMode,
      },
      $set: {
        attendanceStatus: "regularization_pending",
        attendanceSource: "regularization",
        regularization: {
          requested: true,
          requestedAt: new Date(),
          type: regularizationType,
          reason: String(body.reason).trim(),
          requestedCheckIn,
          requestedCheckOut,
          status: "pending",
          adminNotified: false,
          adminNotifiedAt: undefined,
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
    module: "attendance",
    event: "regularization_requested",
    title: "Regularization Request",
    message: `${user.name} submitted attendance regularization request`,
    priority: "high",
    targetUserIds: [],
    targetRoles: [isAdmin(user) ? "super_admin" : "admin"],
    createdBy: getUserId(user),
    referenceId: attendance._id,
    referenceModel: "Attendance",
    actionUrl: "/dashboard#attendance",
    meta: {
      employeeName: user.name,
      employeeEmail: user.email,
      attendanceDate,
      regularizationType,
      reason: String(body.reason).trim(),
    },
  });

  if (!isAdmin(user)) {
    try {
      await sendRegularizationRequestMailToAdmin(attendance);
      attendance.regularization.adminNotified = true;
      attendance.regularization.adminNotifiedAt = new Date();
      await attendance.save();
    } catch (mailError) {
      console.error("Regularization admin mail failed:", mailError.message);
    }
  }

  return attendance;
};

const createMissedCheckInNotifications = async () => {
  const today = getStartOfDay();
  const now = new Date();

  const checkInDeadline = new Date(today);
  checkInDeadline.setHours(10, 15, 0, 0);

  if (now < checkInDeadline) {
    return {
      checked: 0,
      notificationsCreated: 0,
      message: "Missed check-in notification runs only after 10:15 AM.",
    };
  }

  const users = await User.find({
    role: { $in: ["admin", "user"] },
  })
    .select("_id name email role attendanceMode attendanceWorkMode")
    .lean();

  let notificationsCreated = 0;

  for (const employee of users) {
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      attendanceDate: today,
    });

    if (attendance?.checkIn?.time) continue;

    const finalAttendance =
      attendance ||
      (await Attendance.create({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        attendanceDate: today,
        workMode:
          employee.attendanceWorkMode ||
          employee.attendanceMode ||
          "office",
        attendanceStatus: "absent",
        attendanceSource: "system",
      }));

    await createDailyUniqueAttendanceNotification({
      attendance: finalAttendance,
      userId: employee._id,
      event: "missed_check_in",
      title: "Check-in Missing",
      message: "You have not checked in after 10:15 AM. Please check in or apply regularization.",
      priority: "high",
      meta: {
        employeeName: employee.name,
        employeeEmail: employee.email,
        attendanceDate: today,
      },
    });

    notificationsCreated++;
  }

  return {
    checked: users.length,
    notificationsCreated,
  };
};

const createMissedCheckoutNotifications = async () => {
  const today = getStartOfDay();
  const now = new Date();

  const checkoutReminderTime = new Date(today);
  checkoutReminderTime.setHours(19, 0, 0, 0);

  if (now < checkoutReminderTime) {
    return {
      checked: 0,
      notificationsCreated: 0,
      message: "Missed checkout notification runs only after 7:00 PM.",
    };
  }

  const attendances = await Attendance.find({
    attendanceDate: today,
    "checkIn.time": { $exists: true },
    "checkOut.time": { $exists: false },
    "regularization.status": { $ne: "pending" },
  });

  let notificationsCreated = 0;

  for (const attendance of attendances) {
    await createDailyUniqueAttendanceNotification({
      attendance,
      userId: attendance.employeeId,
      event: "missed_check_out",
      title: "Checkout Missing",
      message: "You have not checked out after 7:00 PM. Please checkout or apply regularization.",
      priority: "high",
      meta: {
        employeeName: attendance.employeeName,
        employeeEmail: attendance.employeeEmail,
        attendanceDate: attendance.attendanceDate,
      },
    });

    notificationsCreated++;
  }

  return {
    checked: attendances.length,
    notificationsCreated,
  };
};

const createMissedCheckoutRegularizationReminders = async () => {
  const yesterday = getStartOfDay();
  yesterday.setDate(yesterday.getDate() - 1);

  const attendances = await Attendance.find({
    attendanceDate: yesterday,
    "checkIn.time": { $exists: true },
    "checkOut.time": { $exists: false },
    "regularization.status": { $ne: "pending" },
    "reminder.missedCheckoutMailSent": { $ne: true },
  });

  let mailSent = 0;

  for (const attendance of attendances) {
    attendance.attendanceStatus = "regularization_pending";
    attendance.regularization.requested = false;
    attendance.regularization.type = "missed_check_out";
    attendance.regularization.reason = "";
    attendance.regularization.status = "none";
    attendance.reminder.lastReminderSentAt = new Date();

    await safeCreateNotification({
      module: "attendance",
      event: "missed_checkout_regularization",
      title: "Checkout Regularization Required",
      message: `Your checkout is missing for ${new Date(
        attendance.attendanceDate
      ).toLocaleDateString("en-IN")}. Please submit regularization.`,
      priority: "high",
      targetUserIds: [attendance.employeeId],
      targetRoles: [],
      createdBy: null,
      referenceId: attendance._id,
      referenceModel: "Attendance",
      actionUrl: "/dashboard#attendance",
      meta: {
        employeeName: attendance.employeeName,
        employeeEmail: attendance.employeeEmail,
        attendanceDate: attendance.attendanceDate,
      },
    });

    try {
      await sendMissedCheckoutMailToUser(attendance);

      attendance.reminder.missedCheckoutMailSent = true;
      attendance.reminder.missedCheckoutMailSentAt = new Date();
      mailSent++;
    } catch (mailError) {
      console.error("Missed checkout mail failed:", mailError.message);
    }

    await attendance.save();
  }

  return {
    checked: attendances.length,
    mailSent,
  };
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceList,
  requestRegularization,
  approveRegularization,
  rejectRegularization,
  createMissedCheckInNotifications,
  createMissedCheckoutNotifications,
  createMissedCheckoutRegularizationReminders,
};