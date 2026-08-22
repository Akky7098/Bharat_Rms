const { deleteCachePattern } = require("./cacheService");

const invalidatePrefix = (prefix) =>
  deleteCachePattern(`bharat:ai:${prefix}:*`);

const invalidateSalesCache = () => invalidatePrefix("sales");
const invalidateEnquiryCache = () => invalidatePrefix("enquiry");
const invalidateDispatchCache = async () => {
  await Promise.all([
    invalidatePrefix("dispatch"),
    invalidatePrefix("receivable"),
  ]);
};
const invalidateReceivableCache = () => invalidatePrefix("receivable");
const invalidateOrderTrackingCache = () => invalidatePrefix("tracking");
const invalidateAttendanceCache = () => invalidatePrefix("attendance");
const invalidateTimesheetCache = () => invalidatePrefix("timesheet");
const invalidateColdCallCache = () => invalidatePrefix("cold-call");
const invalidateAllToolCache = () => invalidatePrefix("tool");

module.exports = {
  invalidateSalesCache,
  invalidateEnquiryCache,
  invalidateDispatchCache,
  invalidateReceivableCache,
  invalidateOrderTrackingCache,
  invalidateAttendanceCache,
  invalidateTimesheetCache,
  invalidateColdCallCache,
  invalidateAllToolCache,
};
