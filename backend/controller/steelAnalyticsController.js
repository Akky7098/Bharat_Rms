// backend/controller/steelAnalyticsController.js

const steelAnalyticsService =
  require(
    "../services/steelAnalyticsService"
  );

  
const steelAnalyticsPdfService =
  require(
    "../services/steelAnalyticsPdfService"
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

  if (query.month) {
    filters.month =
      cleanText(query.month);
  }

  if (query.months) {
    const months =
      Number(query.months);

    if (
      ![1, 3, 6].includes(months)
    ) {
      throw new Error(
        "months must be 1, 3 or 6."
      );
    }

    filters.months = months;
  }

  /*
   * BACKWARD COMPATIBILITY
   *
   * Current ManagementAnalysis frontend
   * sends:
   *
   * from=2026-07-01
   * to=2026-09-30
   *
   * Convert that into:
   *
   * month=2026-09
   * months=3
   */

  if (
    !filters.month &&
    query.from &&
    query.to
  ) {
    const from =
      cleanText(query.from);

    const to =
      cleanText(query.to);

    const fromDate =
      new Date(
        `${from}T00:00:00`
      );

    const toDate =
      new Date(
        `${to}T23:59:59.999`
      );

    if (
      !Number.isNaN(
        fromDate.getTime()
      ) &&
      !Number.isNaN(
        toDate.getTime()
      )
    ) {
      filters.month =
        `${toDate.getFullYear()}-${String(
          toDate.getMonth() + 1
        ).padStart(2, "0")}`;

      const monthDifference =
        (
          toDate.getFullYear() -
          fromDate.getFullYear()
        ) *
          12 +
        (
          toDate.getMonth() -
          fromDate.getMonth()
        ) +
        1;

      filters.months =
        [1, 3, 6].includes(
          monthDifference
        )
          ? monthDifference
          : 1;
    }
  }

  if (!filters.months) {
    filters.months = 1;
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
   DOWNLOAD MANAGEMENT ANALYSIS PDF

   GET /api/steel-analytics/pdf

   REQUIRED:
   month=YYYY-MM

   PERIOD:
   1
   3
   6

   EXAMPLES:

   ?month=2026-09&period=1

   ?month=2026-09&period=3

   ?month=2026-09&period=6
========================================================= */

const downloadSteelAnalyticsPdf =
  async (req, res) => {
    try {
      const month =
        cleanText(
          req.query.month
        );

      const period =
  Number(
    req.query.period ||
    req.query.months ||
    1
  );

      if (!month) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "month is required. Use YYYY-MM format.",
          });
      }

      if (
        !/^\d{4}-\d{2}$/.test(
          month
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid month. Use YYYY-MM format.",
          });
      }

      const [
        year,
        monthNumber,
      ] = month
        .split("-")
        .map(Number);

      if (
        !Number.isInteger(
          year
        ) ||
        !Number.isInteger(
          monthNumber
        ) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid month.",
          });
      }

      if (
        ![
          1,
          3,
          6,
        ].includes(
          period
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "period must be 1, 3 or 6.",
          });
      }

      let trackingOrderType;

      if (
        req.query
          .trackingOrderType
      ) {
        trackingOrderType =
          cleanText(
            req.query
              .trackingOrderType
          ).toUpperCase();

        if (
          ![
            "H.O.",
            "N.H.O.",
          ].includes(
            trackingOrderType
          )
        ) {
          return res
            .status(400)
            .json({
              success:
                false,

              message:
                "trackingOrderType must be H.O. or N.H.O.",
            });
        }
      }

      console.log(
        "STEEL ANALYTICS PDF REQUEST =>",
        {
          month,
          period,

          trackingOrderType:
            trackingOrderType ||
            "ALL",

          steelMill:
            req.query
              .steelMill ||
            "ALL",

          grade:
            req.query.grade ||
            "ALL",

          requestedBy:
            req.user?.id ||
            req.user?._id ||
            "UNKNOWN",
        }
      );

      const result =
        await steelAnalyticsPdfService
          .generateSteelAnalyticsPdf({
            month,

            period,

            trackingOrderType,

            steelMill:
              req.query
                .steelMill
                ? cleanText(
                    req.query
                      .steelMill
                  )
                : undefined,

            grade:
              req.query.grade
                ? cleanText(
                    req.query
                      .grade
                  )
                : undefined,
          });

      console.log(
        "STEEL ANALYTICS PDF DOWNLOAD READY =>",
        {
          filename:
            result.filename,

          bytes:
            result.buffer
              .length,
        }
      );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );

      res.setHeader(
        "Content-Length",
        result.buffer.length
      );

      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );

      return res
        .status(200)
        .end(
          result.buffer
        );
    } catch (error) {
      console.error(
        "DOWNLOAD STEEL ANALYTICS PDF ERROR =>",
        error
      );

      if (
        res.headersSent
      ) {
        return res.end();
      }

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message ||
            "Failed to generate Management Analysis PDF.",
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
  downloadSteelAnalyticsPdf,
};