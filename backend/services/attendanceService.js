const mongoose = require("mongoose");
const Attendance = require("../model/attendanceModel");
const User = require("../model/userModel");
const { verifyOfficeLocation } = require("../util/locationUtil");
const {
  sendAttendanceCheckInMessage,
  sendAttendanceCheckOutMessage,
} = require("./attendanceWhatsappService");
const {
  sendMissedCheckoutMailToUser,
  sendRegularizationRequestMailToAdmin,
  sendRegularizationDecisionMailToUser,
} = require("./attendanceMailService");

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

const buildLocationObject = (body, workMode) => {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy || 0);

  const ipAddress = body.ipAddress || "";
  const userAgent = body.userAgent || "";
  const deviceType = body.deviceType || getDeviceType(userAgent);

  if (!latitude || !longitude) {
    throw new Error("Location permission is required to mark attendance.");
  }

  if (workMode === "work_from_home") {
    return {
      latitude,
      longitude,
      accuracy,

      // WFH is allowed from anywhere.
      // We store exact live location for audit, not office validation.
      distanceFromOfficeMeters: null,
      isWithinOffice: false,

      ipAddress,
      userAgent,
      deviceType,
      locationAddress: body.locationAddress || "",
      remark: body.remark || "",
    };
  }

  // Existing production office validation stays same.
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
    locationAddress: body.locationAddress || "",
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

  const checkInData = buildLocationObject(body, workMode);

  // Existing office rule remains strict.
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

  sendAttendanceCheckInMessage(attendance).catch(console.error);

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

  const checkOutData = buildLocationObject(body, workMode);

  // Existing office rule remains strict.
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

  sendAttendanceCheckOutMessage(attendance).catch(console.error);

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

  try {
    await sendRegularizationRequestMailToAdmin(attendance);

    attendance.regularization.adminNotified = true;
    attendance.regularization.adminNotifiedAt = new Date();

    await attendance.save();
  } catch (mailError) {
    console.error("Regularization admin mail failed:", mailError.message);
  }

  return attendance;
};

const approveRegularization = async (attendanceId, body, user) => {
  if (!isAdmin(user) && !isSuperAdmin(user)) {
    throw new Error("Only admin or super admin can approve regularization.");
  }

  const attendance = await Attendance.findById(attendanceId);

  if (!attendance) {
    throw new Error("Attendance not found.");
  }

  if (attendance.regularization.status !== "pending") {
    throw new Error("No pending regularization found.");
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
    attendance.attendanceStatus = "regularized";
  }

  attendance.regularization.status = "approved";
  attendance.regularization.approvedBy = {
    userId: getUserId(user),
    name: user.name,
    email: user.email,
  };
  attendance.regularization.approvedAt = new Date();

  await attendance.save();

  sendRegularizationDecisionMailToUser(attendance, "approved").catch(
    console.error
  );

  return attendance;
};

const rejectRegularization = async (attendanceId, body, user) => {
  if (!isAdmin(user) && !isSuperAdmin(user)) {
    throw new Error("Only admin or super admin can reject regularization.");
  }

  const attendance = await Attendance.findById(attendanceId);

  if (!attendance) {
    throw new Error("Attendance not found.");
  }

  attendance.regularization.status = "rejected";
  attendance.regularization.rejectionReason = body.rejectionReason || "";
  attendance.attendanceStatus = "absent";

  await attendance.save();

  sendRegularizationDecisionMailToUser(attendance, "rejected").catch(
    console.error
  );

  return attendance;
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
  createMissedCheckoutRegularizationReminders,
};