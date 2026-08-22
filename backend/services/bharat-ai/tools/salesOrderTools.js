const { SalesOrder } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const { scopedSalesPersonId } = require("../security/aiAccess");
const { buildDateRange, cacheMetadata } = require("./toolHelpers");

const applyScope = (query, requestingUser, requestedSalesPersonId) => {
  const id = scopedSalesPersonId(requestingUser, requestedSalesPersonId);
  if (id) query.salesPersonId = id;
};

const getSalesSummary = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  const key = CACHE_KEYS.sales({
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
      const match = {
        isActive: { $ne: false },
        approvalStatus: "approved",
      };

      applyScope(match, requestingUser, salesPersonId);

      const dateRange = buildDateRange(dateFrom, dateTo);
      if (dateRange) match.orderDate = dateRange;

      const rows = await SalesOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$orderValue" },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: "$orderValue" },
            newCustomerOrders: {
              $sum: { $cond: [{ $eq: ["$customerType", "new"] }, 1, 0] },
            },
            existingCustomerOrders: {
              $sum: {
                $cond: [{ $eq: ["$customerType", "existing"] }, 1, 0],
              },
            },
          },
        },
      ]);

      return (
        rows[0] || {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          newCustomerOrders: 0,
          existingCustomerOrders: 0,
        }
      );
    },
  });

  return {
    ...result.data,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

const getSalesOrders = async ({
  requestingUser,
  salesPersonId,
  companyName,
  dateFrom,
  dateTo,
  approvalStatus,
  limit = 50,
  forceRefresh = false,
}) => {
  const args = {
    salesPersonId,
    companyName,
    dateFrom,
    dateTo,
    approvalStatus,
    limit,
  };

  const key = CACHE_KEYS.genericTool({
    toolName: "get_sales_orders",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.SHORT,
    forceRefresh,
    loader: async () => {
      const query = { isActive: { $ne: false } };
      applyScope(query, requestingUser, salesPersonId);

      if (companyName) {
        query.companyName = { $regex: companyName, $options: "i" };
      }

      if (approvalStatus) query.approvalStatus = approvalStatus;

      const dateRange = buildDateRange(dateFrom, dateTo);
      if (dateRange) query.orderDate = dateRange;

      const orders = await SalesOrder.find(query)
        .select(
          "_id salesOrderNo orderDate poDate poNumber companyName salesPersonId salesPersonName orderValue customerType sizeGradeQuantityRate supplyCondition otherSupplyConditions deliveryTime approvalStatus trackingOrderType paymentTerms"
        )
        .sort({ orderDate: -1, createdAt: -1 })
        .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
        .lean();

      return { count: orders.length, orders };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.SHORT),
  };
};

const getTopCustomers = async ({
  requestingUser,
  salesPersonId,
  dateFrom,
  dateTo,
  limit = 10,
  forceRefresh = false,
}) => {
  const args = { salesPersonId, dateFrom, dateTo, limit };

  const key = CACHE_KEYS.genericTool({
    toolName: "get_top_customers",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.MEDIUM,
    forceRefresh,
    loader: async () => {
      const match = {
        isActive: { $ne: false },
        approvalStatus: "approved",
      };

      applyScope(match, requestingUser, salesPersonId);

      const dateRange = buildDateRange(dateFrom, dateTo);
      if (dateRange) match.orderDate = dateRange;

      const customers = await SalesOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$companyName",
            sales: { $sum: "$orderValue" },
            orders: { $sum: 1 },
            lastOrderDate: { $max: "$orderDate" },
            newCustomerOrders: {
              $sum: { $cond: [{ $eq: ["$customerType", "new"] }, 1, 0] },
            },
          },
        },
        { $sort: { sales: -1 } },
        { $limit: Math.min(Math.max(Number(limit) || 10, 1), 50) },
      ]);

      return {
        count: customers.length,
        customers: customers.map((row) => ({
          companyName: row._id,
          sales: row.sales,
          orders: row.orders,
          lastOrderDate: row.lastOrderDate,
          newCustomerOrders: row.newCustomerOrders,
        })),
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.MEDIUM),
  };
};

const compareSalesPeriods = async ({
  requestingUser,
  salesPersonId,
  period1From,
  period1To,
  period2From,
  period2To,
  forceRefresh = false,
}) => {
  const [period1, period2] = await Promise.all([
    getSalesSummary({
      requestingUser,
      salesPersonId,
      dateFrom: period1From,
      dateTo: period1To,
      forceRefresh,
    }),
    getSalesSummary({
      requestingUser,
      salesPersonId,
      dateFrom: period2From,
      dateTo: period2To,
      forceRefresh,
    }),
  ]);

  const current = Number(period1.totalSales || 0);
  const previous = Number(period2.totalSales || 0);

  const changeAmount = current - previous;
  const changePercent =
    previous === 0
      ? current === 0
        ? 0
        : null
      : Number(((changeAmount / previous) * 100).toFixed(2));

  return {
    period1,
    period2,
    changeAmount,
    changePercent,
  };
};

const getInactiveCustomers = async ({
  requestingUser,
  salesPersonId,
  inactiveDays = 45,
  minimumHistoricalSales = 0,
  limit = 25,
  forceRefresh = false,
}) => {
  const args = {
    salesPersonId,
    inactiveDays,
    minimumHistoricalSales,
    limit,
  };

  const key = CACHE_KEYS.genericTool({
    toolName: "get_inactive_customers",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.MEDIUM,
    forceRefresh,
    loader: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Math.max(Number(inactiveDays) || 45, 1));

      const match = {
        isActive: { $ne: false },
        approvalStatus: "approved",
      };

      applyScope(match, requestingUser, salesPersonId);

      const rows = await SalesOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$companyName",
            totalHistoricalSales: { $sum: "$orderValue" },
            orderCount: { $sum: 1 },
            lastOrderDate: { $max: "$orderDate" },
          },
        },
        {
          $match: {
            lastOrderDate: { $lt: cutoff },
            totalHistoricalSales: {
              $gte: Math.max(Number(minimumHistoricalSales) || 0, 0),
            },
          },
        },
        { $sort: { totalHistoricalSales: -1 } },
        { $limit: Math.min(Math.max(Number(limit) || 25, 1), 100) },
      ]);

      return {
        cutoffDate: cutoff,
        inactiveDays: Number(inactiveDays) || 45,
        count: rows.length,
        customers: rows.map((row) => ({
          companyName: row._id,
          totalHistoricalSales: row.totalHistoricalSales,
          orderCount: row.orderCount,
          lastOrderDate: row.lastOrderDate,
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
  getSalesSummary,
  getSalesOrders,
  getTopCustomers,
  compareSalesPeriods,
  getInactiveCustomers,
};
