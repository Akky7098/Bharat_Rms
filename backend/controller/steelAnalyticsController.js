// backend/controller/steelAnalyticsController.js

const steelAnalyticsService =
  require(
    "../services/steelAnalyticsService"
  );

/* =========================================================
   NORMALIZE TEXT
========================================================= */

const cleanText = (value) =>
  String(value || "")
    .trim();

/* =========================================================
   BUILD FILTERS

   IMPORTANT:

   "from" and "to" represent the ANALYSIS PERIOD.

   The service decides which date applies to each metric:

   New Order Qty
   -> Sales Order date

   Dispatch Target
   -> Order Tracking estimated dispatch/ready date

   Actual Dispatch
   -> Actual Dispatch date

   Order Balance
   -> Outstanding quantity as of the selected period
========================================================= */

const buildFilters = (
  query = {}
) => {
  const filters = {};

  if (query.from) {
    filters.from =
      cleanText(query.from);
  }

  if (query.to) {
    filters.to =
      cleanText(query.to);
  }

  if (
    query.trackingOrderType
  ) {
    const trackingOrderType =
      cleanText(
        query.trackingOrderType
      ).toUpperCase();

    if (
      ![
        "H.O.",
        "N.H.O.",
      ].includes(
        trackingOrderType
      )
    ) {
      throw new Error(
        "trackingOrderType must be H.O. or N.H.O."
      );
    }

    filters.trackingOrderType =
      trackingOrderType;
  }

  if (query.steelMill) {
    filters.steelMill =
      cleanText(
        query.steelMill
      );
  }

  if (query.grade) {
    filters.grade =
      cleanText(
        query.grade
      );
  }

  return filters;
};

/* =========================================================
   BUILD DRILL-DOWN FILTERS

   Supported metric values:

   new_order
   dispatch_target
   actual_dispatch
   target_pending
   order_balance

   Example:

   GET /api/steel-analytics/drill-down
       ?metric=order_balance
       &trackingOrderType=H.O.
       &from=2026-09-01
       &to=2026-09-30
========================================================= */

const buildDrillDownFilters = (
  query = {}
) => {
  const filters =
    buildFilters(query);

  const metric =
    cleanText(
      query.metric
    ).toLowerCase();

  const allowedMetrics = [
    "new_order",
    "dispatch_target",
    "actual_dispatch",
    "target_pending",
    "order_balance",
  ];

  if (!metric) {
    throw new Error(
      "metric is required for drill-down."
    );
  }

  if (
    !allowedMetrics.includes(
      metric
    )
  ) {
    throw new Error(
      `Invalid drill-down metric. Use: ${allowedMetrics.join(
        ", "
      )}.`
    );
  }

  filters.metric =
    metric;

  return filters;
};

/* =========================================================
   GET FULL ANALYTICS

   GET /api/steel-analytics
========================================================= */

const getSteelAnalytics =
  async (req, res) => {
    try {
      const filters =
        buildFilters(
          req.query
        );

      const data =
        await steelAnalyticsService
          .getSteelAnalytics(
            filters
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Steel analytics fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET STEEL ANALYTICS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch steel analytics.",
        });
    }
  };

/* =========================================================
   GET SUMMARY

   GET /api/steel-analytics/summary
========================================================= */

const getSteelAnalyticsSummary =
  async (req, res) => {
    try {
      const filters =
        buildFilters(
          req.query
        );

      const data =
        await steelAnalyticsService
          .getSteelAnalyticsSummary(
            filters
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Steel analytics summary fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET STEEL ANALYTICS SUMMARY ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch steel analytics summary.",
        });
    }
  };

/* =========================================================
   GET DRILL-DOWN

   GET /api/steel-analytics/drill-down

   This endpoint powers clickable dashboard values.

   Example:

   User clicks:

   H.O.
   Order Balance
   25 MT

   API returns the exact orders contributing to that 25 MT.

   Each returned order can contain:

   - Sales Order
   - Company
   - PO
   - Sales Person
   - H.O. / N.H.O.
   - Steel Mill
   - Grade
   - Ordered Qty
   - Dispatch Target
   - Actual Dispatch Qty
   - Remaining Qty
   - Tracking Status
   - Current Milestone
   - Estimated Dispatch Date
   - Delay information
========================================================= */

const getSteelAnalyticsDrillDown =
  async (req, res) => {
    try {
      const filters =
        buildDrillDownFilters(
          req.query
        );

      const data =
        await steelAnalyticsService
          .getSteelAnalyticsDrillDown(
            filters
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Steel analytics drill-down fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET STEEL ANALYTICS DRILL-DOWN ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch steel analytics drill-down.",
        });
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getSteelAnalytics,
  getSteelAnalyticsSummary,
  getSteelAnalyticsDrillDown,
};