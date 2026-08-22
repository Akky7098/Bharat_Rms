const { Dispatch } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const { scopedSalesPersonId } = require("../security/aiAccess");
const { buildDateRange, cacheMetadata } = require("./toolHelpers");

const applyScope = (query, requestingUser, salesPersonId) => {
  const id = scopedSalesPersonId(requestingUser, salesPersonId);
  if (id) query.salesPersonId = id;
};

const getDispatchSummary = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  const key = CACHE_KEYS.dispatch({
    requestingUser,
    salesPersonId,
    dateFrom,
    dateTo,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const match = {
        isActive: true,
        dispatchStatus: { $ne: "cancelled" },
      };

      applyScope(match, requestingUser, salesPersonId);

      const range = buildDateRange(dateFrom, dateTo);
      if (range) match.dispatchDate = range;

      const rows = await Dispatch.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalDispatches: { $sum: 1 },
            totalInvoiceValue: { $sum: "$invoiceValue" },
            totalDispatchQty: { $sum: "$dispatchQty" },
            totalPendingPayment: { $sum: "$pendingAmount" },
            fullyDispatched: {
              $sum: {
                $cond: [
                  { $eq: ["$dispatchCompletionStatus", "fully_dispatched"] },
                  1,
                  0,
                ],
              },
            },
            partiallyDispatched: {
              $sum: {
                $cond: [
                  { $eq: ["$dispatchCompletionStatus", "partial_dispatched"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      return (
        rows[0] || {
          totalDispatches: 0,
          totalInvoiceValue: 0,
          totalDispatchQty: 0,
          totalPendingPayment: 0,
          fullyDispatched: 0,
          partiallyDispatched: 0,
        }
      );
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

const getOverdueDispatchPayments = async ({
  requestingUser,
  salesPersonId,
  limit = 50,
  forceRefresh = false,
}) => {
  const args = { salesPersonId, limit };
  const key = CACHE_KEYS.genericTool({
    toolName: "get_overdue_dispatch_payments",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const query = {
        isActive: true,
        paymentStatus: "overdue",
        pendingAmount: { $gt: 0 },
      };

      applyScope(query, requestingUser, salesPersonId);

      const rows = await Dispatch.find(query)
        .select(
          "companyName invoiceNumber invoiceDate invoiceValue pendingAmount paymentDueDate revisedPaymentDueDate revisedPaymentRemark salesPersonName dispatchDate paymentStatus"
        )
        .sort({ revisedPaymentDueDate: 1, paymentDueDate: 1 })
        .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
        .lean();

      return { count: rows.length, dispatches: rows };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

module.exports = {
  getDispatchSummary,
  getOverdueDispatchPayments,
};
