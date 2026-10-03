const logisticsAnalyticsService =
  require(
    "../services/logisticsAnalyticsService"
  );

/* =========================================================
   NORMALIZE TEXT
========================================================= */

const cleanText = (value) =>
  String(value || "").trim();

/* =========================================================
   BUILD LOGISTICS FILTERS

   This module is ONLY for:

   - Dispatch Plan
   - Actual Dispatch
   - Target Pending
   - Logistics drill-down

   IMPORTANT:

   Dispatch Plan month remains based on
   Order Tracking estimatedReadyDate /
   ready_for_dispatch milestone.

   We are NOT changing that logic.
========================================================= */

const buildLogisticsFilters = (
  query = {}
) => {
  const filters = {};

  /* =====================================================
     MONTH
  ===================================================== */

  if (query.month) {
    filters.month =
      cleanText(
        query.month
      );
  }

  /* =====================================================
     PERIOD
  ===================================================== */

  if (
    query.months !==
      undefined &&
    query.months !== ""
  ) {
    const months =
      Number(
        query.months
      );

    if (
      ![1, 3, 6].includes(
        months
      )
    ) {
      throw new Error(
        "months must be 1, 3 or 6."
      );
    }

    filters.months =
      months;
  }

  /* =====================================================
     BACKWARD COMPATIBILITY

     Existing frontend may still send
     from / to.

     Remove after frontend migration.
  ===================================================== */

  if (
    !filters.month &&
    query.from &&
    query.to
  ) {
    const from =
      cleanText(
        query.from
      );

    const to =
      cleanText(
        query.to
      );

    const fromDate =
      new Date(
        `${from}T00:00:00`
      );

    const toDate =
      new Date(
        `${to}T23:59:59.999`
      );

    if (
      Number.isNaN(
        fromDate.getTime()
      ) ||
      Number.isNaN(
        toDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid from/to date."
      );
    }

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

  if (!filters.months) {
    filters.months = 1;
  }

  /* =====================================================
     H.O. / N.H.O.
  ===================================================== */

  if (
    query.trackingOrderType
  ) {
    const type =
      cleanText(
        query
          .trackingOrderType
      ).toUpperCase();

    if (
      ![
        "H.O.",
        "N.H.O.",
      ].includes(type)
    ) {
      throw new Error(
        "trackingOrderType must be H.O. or N.H.O."
      );
    }

    filters
      .trackingOrderType =
      type;
  }

  return filters;
};

/* =========================================================
   GET LOGISTICS ANALYSIS

   GET /api/logistics-analysis

   Returns ONLY:

   - Dispatch Plan
   - Actual Dispatch
   - Target Pending

   NO grades.
   NO mill business.
   NO total order analysis.
========================================================= */

const getLogisticsAnalysis =
  async (req, res) => {
    try {
      const filters =
        buildLogisticsFilters(
          req.query
        );

      const data =
        await logisticsAnalyticsService
          .getLogisticsAnalytics(
            {
              ...filters,

              includeDetails:
                false,
            }
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Logistics analysis fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET LOGISTICS ANALYSIS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch logistics analysis.",
        });
    }
  };

/* =========================================================
   GET LOGISTICS DETAILS

   GET /api/logistics-analysis/details

   This is NOT called on initial page load.

   It is called only when management
   opens Plan / Pending detail.
========================================================= */

const getLogisticsDetails =
  async (req, res) => {
    try {
      const filters =
        buildLogisticsFilters(
          req.query
        );

      const data =
        await logisticsAnalyticsService
          .getLogisticsPlanDetails(
            filters
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Logistics details fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET LOGISTICS DETAILS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch logistics details.",
        });
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getLogisticsAnalysis,
  getLogisticsDetails,
};