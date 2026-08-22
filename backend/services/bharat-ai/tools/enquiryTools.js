const { Enquiry } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const { scopedSalesPersonId } = require("../security/aiAccess");
const { buildDateRange, cacheMetadata } = require("./toolHelpers");

const applyScope = (query, requestingUser, salesPersonId) => {
  const id = scopedSalesPersonId(requestingUser, salesPersonId);
  if (id) query.salesPersonId = id;
};

const getEnquirySummary = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  const key = CACHE_KEYS.enquiry({
    requestingUser,
    salesPersonId,
    dateFrom,
    dateTo,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.SHORT,
    forceRefresh,
    loader: async () => {
      const match = {};
      applyScope(match, requestingUser, salesPersonId);

      const range = buildDateRange(dateFrom, dateTo);
      if (range) match.enquiryDate = range;

      const rows = await Enquiry.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            won: {
              $sum: { $cond: [{ $eq: ["$closure.status", "won"] }, 1, 0] },
            },
            lost: {
              $sum: { $cond: [{ $eq: ["$closure.status", "lost"] }, 1, 0] },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$closure.status", "pending"] }, 1, 0],
              },
            },
            totalQuantityKg: { $sum: "$quantityInKg" },
          },
        },
      ]);

      const summary =
        rows[0] || {
          total: 0,
          won: 0,
          lost: 0,
          pending: 0,
          totalQuantityKg: 0,
        };

      return {
        ...summary,
        conversionRate:
          summary.total > 0
            ? Number(((summary.won / summary.total) * 100).toFixed(2))
            : 0,
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

const getLostEnquiries = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  lostReason,
  limit = 50,
  forceRefresh = false,
}) => {
  const args = { salesPersonId, dateFrom, dateTo, lostReason, limit };
  const key = CACHE_KEYS.genericTool({
    toolName: "get_lost_enquiries",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.SHORT,
    forceRefresh,
    loader: async () => {
      const query = { "closure.status": "lost" };
      applyScope(query, requestingUser, salesPersonId);

      const range = buildDateRange(dateFrom, dateTo);
      if (range) query.enquiryDate = range;
      if (lostReason) query["closure.lostRemark"] = lostReason;

      const enquiries = await Enquiry.find(query)
        .select(
          "enquiryNumber enquiryDate companyName customerName grade shape size quantityInKg salesPersonId closure.lostRemark closure.lostRemarkOtherText closure.actualDate"
        )
        .sort({ enquiryDate: -1 })
        .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
        .lean();

      return { count: enquiries.length, enquiries };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

const getLostEnquiryReasonSummary = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  const args = { salesPersonId, dateFrom, dateTo };
  const key = CACHE_KEYS.genericTool({
    toolName: "get_lost_enquiry_reason_summary",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.MEDIUM,
    forceRefresh,
    loader: async () => {
      const match = { "closure.status": "lost" };
      applyScope(match, requestingUser, salesPersonId);

      const range = buildDateRange(dateFrom, dateTo);
      if (range) match.enquiryDate = range;

      const rows = await Enquiry.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$closure.lostRemark",
            count: { $sum: 1 },
            quantityKg: { $sum: "$quantityInKg" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        count: rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
        reasons: rows.map((row) => ({
          reason: row._id || "unspecified",
          count: row.count,
          quantityKg: row.quantityKg,
        })),
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.MEDIUM),
  };
};

module.exports = {
  getEnquirySummary,
  getLostEnquiries,
  getLostEnquiryReasonSummary,
};
