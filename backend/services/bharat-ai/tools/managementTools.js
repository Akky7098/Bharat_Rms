const { assertManagement } = require("../security/aiAccess");
const salesTools = require("./salesOrderTools");
const enquiryTools = require("./enquiryTools");
const dispatchTools = require("./dispatchTools");
const receivableTools = require("./receivableTools");
const trackingTools = require("./orderTrackingTools");
const coldCallTools = require("./coldCallTools");
const userTools = require("./userTools");

const getExecutiveSummary = async ({
  requestingUser,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  assertManagement(requestingUser);

  const [sales, enquiries, dispatch, receivables, tracking] =
    await Promise.all([
      salesTools.getSalesSummary({
        requestingUser,
        dateFrom,
        dateTo,
        forceRefresh,
      }),
      enquiryTools.getEnquirySummary({
        requestingUser,
        dateFrom,
        dateTo,
        forceRefresh,
      }),
      dispatchTools.getDispatchSummary({
        requestingUser,
        dateFrom,
        dateTo,
        forceRefresh,
      }),
      receivableTools.getReceivableSummary({
        requestingUser,
        forceRefresh,
      }),
      trackingTools.getOrderTrackingSummary({
        requestingUser,
        forceRefresh,
      }),
    ]);

  return {
    period: { dateFrom: dateFrom || null, dateTo: dateTo || null },
    sales,
    enquiries,
    dispatch,
    receivables,
    orderTracking: tracking,
  };
};

const getSalespersonPerformance = async ({
  requestingUser,
  employeeName,
  salesPersonId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}) => {
  assertManagement(requestingUser);

  let resolvedId = salesPersonId;
  let salesperson = null;

  if (!resolvedId && employeeName) {
    const found = await userTools.searchUsers({
      requestingUser,
      search: employeeName,
      limit: 10,
    });

    if (found.count !== 1) {
      return {
        found: false,
        ambiguous: found.count > 1,
        matches: found.users,
      };
    }

    salesperson = found.users[0];
    resolvedId = salesperson.id;
  }

  if (!resolvedId) {
    throw new Error("salesPersonId or employeeName is required.");
  }

  const [sales, enquiries, topCustomers, coldCalls, delayedOrders] =
    await Promise.all([
      salesTools.getSalesSummary({
        requestingUser,
        salesPersonId: resolvedId,
        dateFrom,
        dateTo,
        forceRefresh,
      }),
      enquiryTools.getEnquirySummary({
        requestingUser,
        salesPersonId: resolvedId,
        dateFrom,
        dateTo,
        forceRefresh,
      }),
      salesTools.getTopCustomers({
        requestingUser,
        salesPersonId: resolvedId,
        dateFrom,
        dateTo,
        limit: 10,
        forceRefresh,
      }),
      coldCallTools.getColdCallSummary({
        requestingUser,
        salesPersonId: resolvedId,
        dateFrom,
        dateTo,
        forceRefresh,
      }),
      trackingTools.getDelayedOrders({
        requestingUser,
        salesPersonId: resolvedId,
        limit: 25,
        forceRefresh,
      }),
    ]);

  return {
    salesperson,
    salesPersonId: resolvedId,
    period: { dateFrom: dateFrom || null, dateTo: dateTo || null },
    sales,
    enquiries,
    topCustomers,
    coldCalls,
    delayedOrders,
  };
};

module.exports = {
  getExecutiveSummary,
  getSalespersonPerformance,
};
