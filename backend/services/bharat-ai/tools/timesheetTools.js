const { Timesheet } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const {
  resolveEmployee,
  publicEmployee,
  startOfISTDayUTC,
  endOfISTDayUTC,
  buildDateRange,
  cacheMetadata,
} = require("./toolHelpers");

const getTimesheetByEmployeeAndDate = async ({
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

  const key = CACHE_KEYS.timesheet({
    requestingUser,
    employeeId: employee._id,
    date,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LONG,
    forceRefresh,
    loader: async () => {
      const timesheet = await Timesheet.findOne({
        employeeId: employee._id,
        reportDate: {
          $gte: startOfISTDayUTC(date),
          $lte: endOfISTDayUTC(date),
        },
      })
        .select(
          "employeeId reportDate workSummary challenges nextDayPlan status createdAt updatedAt"
        )
        .lean();

      return {
        found: Boolean(timesheet),
        employee: publicEmployee(employee),
        timesheet,
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LONG),
  };
};

const getTimesheets = async ({
  requestingUser,
  employeeId,
  employeeName,
  dateFrom,
  dateTo,
  limit = 31,
  forceRefresh = false,
}) => {
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

  const key = CACHE_KEYS.timesheet({
    requestingUser,
    employeeId: employee._id,
    dateFrom,
    dateTo,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LONG,
    forceRefresh,
    loader: async () => {
      const query = { employeeId: employee._id };
      const range = buildDateRange(dateFrom, dateTo);
      if (range) query.reportDate = range;

      const timesheets = await Timesheet.find(query)
        .select("reportDate workSummary challenges nextDayPlan status")
        .sort({ reportDate: -1 })
        .limit(Math.min(Math.max(Number(limit) || 31, 1), 100))
        .lean();

      return {
        employee: publicEmployee(employee),
        count: timesheets.length,
        timesheets,
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LONG),
  };
};

module.exports = {
  getTimesheetByEmployeeAndDate,
  getTimesheets,
};
