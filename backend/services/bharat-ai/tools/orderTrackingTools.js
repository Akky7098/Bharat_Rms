const { OrderTracking } = require("../modelRegistry");
const { remember, CACHE_TTL } = require("../cache/cacheService");
const { CACHE_KEYS } = require("../cache/cacheKeys");
const { scopedSalesPersonId } = require("../security/aiAccess");
const { cacheMetadata } = require("./toolHelpers");

const applyScope = (query, requestingUser, salesPersonId) => {
  const id = scopedSalesPersonId(requestingUser, salesPersonId);
  if (id) query.salesPersonId = id;
};

const getOrderTrackingSummary = async ({
  requestingUser,
  salesPersonId,
  forceRefresh = false,
}) => {
  const key = CACHE_KEYS.tracking({
    requestingUser,
    salesPersonId,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const match = { isActive: true };
      applyScope(match, requestingUser, salesPersonId);

      const rows = await OrderTracking.aggregate([
        { $match: match },
        { $group: { _id: "$currentStatus", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      return {
        total: rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
        byStatus: rows.map((row) => ({
          status: row._id,
          count: row.count,
        })),
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

const getDelayedOrders = async ({
  requestingUser,
  salesPersonId,
  overdueByDays = 0,
  limit = 50,
  forceRefresh = false,
}) => {
  const args = { salesPersonId, overdueByDays, limit };
  const key = CACHE_KEYS.genericTool({
    toolName: "get_delayed_orders",
    requestingUser,
    args,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Math.max(Number(overdueByDays) || 0, 0));

      const query = {
        isActive: true,
        currentStatus: { $nin: ["delivered", "cancelled"] },
        estimatedDeliveryDate: { $lt: cutoff, $ne: null },
      };

      applyScope(query, requestingUser, salesPersonId);

      const orders = await OrderTracking.find(query)
        .select(
          "trackingNumber salesOrderNo poNumber companyName salesPersonName material currentStatus currentStatusLabel progressPercentage estimatedReadyDate estimatedDeliveryDate actualDeliveryDate isOnHold holdReason transporter"
        )
        .sort({ estimatedDeliveryDate: 1 })
        .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
        .lean();

      return {
        asOf: new Date(),
        overdueByDays: Number(overdueByDays) || 0,
        count: orders.length,
        orders,
      };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

const getTrackingByCompany = async ({
  requestingUser,
  companyName,
  limit = 25,
  forceRefresh = false,
}) => {
  if (!companyName) throw new Error("companyName is required.");

  const key = CACHE_KEYS.tracking({
    requestingUser,
    companyName,
  });

  const result = await remember({
    key,
    ttlSeconds: CACHE_TTL.LIVE,
    forceRefresh,
    loader: async () => {
      const query = {
        isActive: true,
        companyName: { $regex: companyName, $options: "i" },
      };

      applyScope(query, requestingUser);

      const orders = await OrderTracking.find(query)
        .select(
          "trackingNumber salesOrderNo poNumber companyName orderType processType supplyCondition material currentStatus currentStatusLabel progressPercentage estimatedReadyDate estimatedLoadingDate estimatedShipDate estimatedDeliveryDate transporter isOnHold holdReason milestones"
        )
        .sort({ updatedAt: -1 })
        .limit(Math.min(Math.max(Number(limit) || 25, 1), 50))
        .lean();

      return { count: orders.length, orders };
    },
  });

  return {
    ...result.data,
    _cache: cacheMetadata(result.cache, CACHE_TTL.LIVE),
  };
};

module.exports = {
  getOrderTrackingSummary,
  getDelayedOrders,
  getTrackingByCompany,
};
