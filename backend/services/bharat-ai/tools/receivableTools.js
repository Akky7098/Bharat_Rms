const { Receivable } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const { isManagement } = require("../security/aiAccess");
const { cacheMetadata } = require("./toolHelpers");

const applyScope = (query, requestingUser) => {
  if (!isManagement(requestingUser)) {
    query["salesPersons.userId"] = requestingUser._id;
  }
};

const getReceivableSummary = async ({
  requestingUser,
  forceRefresh = false,
}) => {
  const key = CACHE_KEYS.receivable({ requestingUser });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.SHORT,
    forceRefresh,
    loader: async () => {
      const match = { isActive: true };
      applyScope(match, requestingUser);

      const rows = await Receivable.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            customers: { $sum: 1 },
            totalInvoiceAmount: { $sum: "$totalInvoiceAmount" },
            totalReceivedAmount: { $sum: "$totalReceivedAmount" },
            totalPendingAmount: { $sum: "$totalPendingAmount" },
            totalOverdueAmount: { $sum: "$totalOverdueAmount" },
            customersOnWatch: {
              $sum: { $cond: [{ $eq: ["$riskStatus", "watch"] }, 1, 0] },
            },
            customersOnHold: {
              $sum: { $cond: [{ $eq: ["$riskStatus", "hold"] }, 1, 0] },
            },
          },
        },
      ]);

      return (
        rows[0] || {
          customers: 0,
          totalInvoiceAmount: 0,
          totalReceivedAmount: 0,
          totalPendingAmount: 0,
          totalOverdueAmount: 0,
          customersOnWatch: 0,
          customersOnHold: 0,
        }
      );
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

const getOverdueCustomers = async ({
  requestingUser,
  minimumOverdueDays = 1,
  limit = 50,
  forceRefresh = false,
}) => {
  const args = { minimumOverdueDays, limit };
  const key = CACHE_KEYS.genericTool({
    toolName: "get_overdue_customers",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.SHORT,
    forceRefresh,
    loader: async () => {
      const query = {
        isActive: true,
        totalOverdueAmount: { $gt: 0 },
        oldestOverdueDays: {
          $gte: Math.max(Number(minimumOverdueDays) || 1, 1),
        },
      };

      applyScope(query, requestingUser);

      const customers = await Receivable.find(query)
        .select(
          "companyName salesPersons primarySalesPersonId totalInvoiceAmount totalReceivedAmount totalPendingAmount totalOverdueAmount oldestOverdueDays riskStatus managementApprovalRequired lastInvoiceDate lastPaymentDate"
        )
        .sort({ totalOverdueAmount: -1, oldestOverdueDays: -1 })
        .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
        .lean();

      return { count: customers.length, customers };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

const getCustomerReceivable = async ({
  requestingUser,
  companyName,
  forceRefresh = false,
}) => {
  if (!companyName) throw new Error("companyName is required.");

  const key = CACHE_KEYS.receivable({
    requestingUser,
    companyName,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.SHORT,
    forceRefresh,
    loader: async () => {
      const query = {
        isActive: true,
        companyName: { $regex: companyName, $options: "i" },
      };

      applyScope(query, requestingUser);

      const customers = await Receivable.find(query)
        .select(
          "companyName salesPersons totalInvoiceAmount totalReceivedAmount totalPendingAmount totalOverdueAmount oldestOverdueDays riskStatus creditLimit invoices lastInvoiceDate lastPaymentDate"
        )
        .limit(10)
        .lean();

      return { count: customers.length, customers };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

module.exports = {
  getReceivableSummary,
  getOverdueCustomers,
  getCustomerReceivable,
};
