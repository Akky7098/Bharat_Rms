const { ColdCall } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const { scopedSalesPersonId } = require("../security/aiAccess");
const { buildDateRange, cacheMetadata } = require("./toolHelpers");

const getColdCallSummary = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  const key = CACHE_KEYS.coldCall({
    requestingUser,
    salesPersonId,
    dateFrom,
    dateTo,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.MEDIUM,
    forceRefresh,
    loader: async () => {
      const match = {};

      const id = scopedSalesPersonId(requestingUser, salesPersonId);
      if (id) match.salesPersonId = id;

      const range = buildDateRange(dateFrom, dateTo);
      if (range) match.date = range;

      const rows = await ColdCall.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$activityType",
            count: { $sum: 1 },
            uniqueCompanies: { $addToSet: "$companyName" },
          },
        },
        {
          $project: {
            _id: 0,
            activityType: "$_id",
            count: 1,
            uniqueCompanyCount: { $size: "$uniqueCompanies" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return { activities: rows };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.MEDIUM),
  };
};

module.exports = {
  getColdCallSummary,
};
