const { Attendance } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const {
  resolveEmployee,
  publicEmployee,
  buildDateRange,
  startOfISTDayUTC,
  endOfISTDayUTC,
  cacheMetadata,
} = require("./toolHelpers");

const getAttendanceByEmployeeAndDate = async ({
  requestingUser,
  employeeId,
  employeeName,
  date,
  forceRefresh = false,
}) => {
  if (!date) throw new Error("date is required.");

  const employee = await resolveEmployee({
    requestingUser,
    employeeId,
    employeeName,
  });

  if (employee?.ambiguous || employee?.notFound) {
    return {
      found: false,
      ambiguousEmployee: Boolean(employee.ambiguous),
      matches: employee.matches || [],
    };
  }

  const key = CACHE_KEYS.attendance({
    requestingUser,
    employeeId: employee._id,
    date,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const attendance = await Attendance.findOne({
        employeeId: employee._id,
        attendanceDate: {
          $gte: startOfISTDayUTC(date),
          $lte: endOfISTDayUTC(date),
        },
      })
        .select(
          "employeeId employeeName employeeEmail attendanceDate workMode attendanceStatus attendanceSource checkIn.time checkIn.isWithinOffice checkIn.locationAddress checkOut.time checkOut.isWithinOffice checkOut.locationAddress totalWorkingMinutes regularization.status regularization.reason leaveType leaveDuration"
        )
        .lean();

      return {
        found: Boolean(attendance),
        employee: publicEmployee(employee),
        attendance,
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

const getAttendanceSummary = async ({
  requestingUser,
  employeeId,
  employeeName,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  let scopedEmployeeId = null;

  if (requestingUser.role === "user" || employeeId || employeeName) {
    const employee = await resolveEmployee({
      requestingUser,
      employeeId,
      employeeName,
    });

    if (employee?.ambiguous || employee?.notFound) {
      return {
        found: false,
        ambiguousEmployee: Boolean(employee.ambiguous),
        matches: employee.matches || [],
      };
    }

    scopedEmployeeId = employee._id;
  }

  const key = CACHE_KEYS.attendance({
    requestingUser,
    employeeId: scopedEmployeeId,
    dateFrom,
    dateTo,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const match = {};
      if (scopedEmployeeId) match.employeeId = scopedEmployeeId;

      const range = buildDateRange(dateFrom, dateTo);
      if (range) match.attendanceDate = range;

      const rows = await Attendance.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$attendanceStatus",
            count: { $sum: 1 },
            workingMinutes: { $sum: "$totalWorkingMinutes" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        byStatus: rows.map((row) => ({
          status: row._id,
          count: row.count,
          workingMinutes: row.workingMinutes,
        })),
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

module.exports = {
  getAttendanceByEmployeeAndDate,
  getAttendanceSummary,
};
