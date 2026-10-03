const managementOrderAnalyticsService =
  require(
    "../services/managementOrderAnalyticsService"
  );

/* =========================================================
   NORMALIZE TEXT
========================================================= */

const cleanText = (value) =>
  String(value || "").trim();

/* =========================================================
   BUILD MANAGEMENT ORDER FILTERS

   This module is ONLY for:

   - Total Orders
   - H.O. Orders
   - Steel Mill / N.H.O. Orders
   - Mill-wise Orders
   - Grade-wise Orders

   NO logistics filters/calculations here.
========================================================= */

const buildManagementFilters = (
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

     Existing frontend may still send:

     from=2026-07-01
     to=2026-09-30

     Convert to:

     month=2026-09
     months=3

     This can be removed after frontend migration.
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
     ORDER TYPE
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

  /* =====================================================
     STEEL MILL
  ===================================================== */

  if (query.steelMill) {
    filters.steelMill =
      cleanText(
        query.steelMill
      );
  }

  /* =====================================================
     GRADE
  ===================================================== */

  if (query.grade) {
    filters.grade =
      cleanText(
        query.grade
      );
  }

  return filters;
};

/* =========================================================
   GET MANAGEMENT ORDER ANALYSIS

   GET /api/management-order-analysis

   Lightweight dashboard response:

   - Total order KG
   - Total order count
   - H.O. KG / count
   - Steel Mill KG / count
   - Mill aggregates
   - Grade aggregates

   NO order-level details by default.
========================================================= */

const getManagementOrderAnalysis =
  async (req, res) => {
    try {
      const filters =
        buildManagementFilters(
          req.query
        );

      const data =
        await managementOrderAnalyticsService
          .getManagementOrderAnalytics(
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
            "Management order analysis fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET MANAGEMENT ORDER ANALYSIS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch management order analysis.",
        });
    }
  };

/* =========================================================
   GET STEEL MILL DETAIL

   GET /api/management-order-analysis/mill

   Called ONLY when management opens a mill.
========================================================= */

const getSteelMillAnalysis =
  async (req, res) => {
    try {
      const filters =
        buildManagementFilters(
          req.query
        );

      if (
        !filters.steelMill
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "steelMill is required.",
          });
      }

      const data =
        await managementOrderAnalyticsService
          .getSteelMillOrderDetails(
            filters
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Steel mill order analysis fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET STEEL MILL ANALYSIS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch steel mill analysis.",
        });
    }
  };

/* =========================================================
   GET GRADE DETAIL

   GET /api/management-order-analysis/grade

   Called ONLY when management opens a grade.
========================================================= */

const getGradeAnalysis =
  async (req, res) => {
    try {
      const filters =
        buildManagementFilters(
          req.query
        );

      if (!filters.grade) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "grade is required.",
          });
      }

      const data =
        await managementOrderAnalyticsService
          .getGradeOrderDetails(
            filters
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Grade order analysis fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET GRADE ANALYSIS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch grade analysis.",
        });
    }
  };

/* =========================================================
   GET H.O. ORDER DETAIL

   GET /api/management-order-analysis/house

   Called ONLY when management opens H.O.

   Returns:
   - H.O. summary
   - Grade-wise H.O. orders
   - Complete H.O. sales-order register
   - Company
   - PO
   - Order date
   - Order quantity
   - Grade
   - Material
   - Sales person
   - Dispatch information when available
========================================================= */

const getHouseOrderAnalysis =
  async (req, res) => {
    try {
      const filters =
        buildManagementFilters(
          req.query
        );

      const data =
        await managementOrderAnalyticsService
          .getHouseOrderDetails({
            ...filters,

            trackingOrderType:
              "H.O.",
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "H.O. order analysis fetched successfully.",

          data,
        });
    } catch (error) {
      console.error(
        "GET H.O. ORDER ANALYSIS ERROR =>",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Failed to fetch H.O. order analysis.",
        });
    }
  };


/* =========================================================
   DOWNLOAD H.O. ORDER ANALYSIS PDF

   GET /api/management-order-analysis/house/pdf

   PDF contains:
   - Bharat Special Steels logo
   - Analysis period
   - Total H.O. quantity
   - Total H.O. orders
   - Grade summary
   - Detailed H.O. order register
   - Company
   - PO number
   - PO / order date
   - Grade
   - Size
   - Supply condition
   - Order quantity
   - Dispatch quantity
   - Pending quantity
   - Last dispatch date
========================================================= */

const downloadHouseOrderAnalysisPdf =
  async (req, res) => {
    try {
      const filters =
        buildManagementFilters(
          req.query
        );

      const {
        generateHouseOrderAnalysisPdf,
      } = require(
        "../services/managementOrderAnalyticsPdfService"
      );

      const result =
        await generateHouseOrderAnalysisPdf({
          ...filters,

          trackingOrderType:
            "H.O.",
        });

      if (
        !result ||
        !result.buffer
      ) {
        throw new Error(
          "H.O. analysis PDF could not be generated."
        );
      }

      const filename =
        result.filename ||
        `HO_Order_Analysis_${
          filters.month ||
          "report"
        }_${
          filters.months ||
          1
        }M.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
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
        .send(
          result.buffer
        );
    } catch (error) {
      console.error(
        "DOWNLOAD H.O. ORDER ANALYSIS PDF ERROR =>",
        error
      );

      if (
        !res.headersSent
      ) {
        return res
          .status(500)
          .json({
            success: false,

            message:
              error.message ||
              "Failed to generate H.O. order analysis PDF.",
          });
      }

      return res.end();
    }
  };

  /* =========================================================
   DOWNLOAD STEEL MILL ORDER ANALYSIS PDF

   GET /api/management-order-analysis/mill/pdf

   QUERY:

   ?month=2026-10
   &months=3
   &steelMill=S.S.%20Steel%20-%20Sirhind
   &supplyCondition=as_rolled
   &includeCustomerName=true

   PDF CONTAINS:

   - Selected Steel Mill
   - Analysis period
   - Supply condition
   - Total orders
   - Total order quantity
   - Complete order register

   OPTIONAL:

   - Customer column

   NO:

   - Grade analysis
   - Dispatch
   - Pending
   - Logistics
   - Current status
   - Tentative schedule
========================================================= */

const downloadSteelMillOrderAnalysisPdf =
  async (
    req,
    res
  ) => {
    try {
      const filters =
        buildManagementFilters(
          req.query
        );


      /* =============================================
         STEEL MILL REQUIRED
      ============================================= */

      if (
        !filters.steelMill
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "steelMill is required.",
          });
      }


      /* =============================================
         SUPPLY CONDITION

         Keep this separate because existing
         buildManagementFilters may not currently
         include supplyCondition.
      ============================================= */

      if (
        req.query
          .supplyCondition
      ) {
        filters
          .supplyCondition =
          cleanText(
            req.query
              .supplyCondition
          );
      }


      /* =============================================
         CUSTOMER VISIBILITY

         Default = TRUE

         Accepted false values:
         false
         0
         no
         without
      ============================================= */

      let includeCustomerName =
        true;


      if (
        req.query
          .includeCustomerName !==
        undefined
      ) {
        const customerValue =
          cleanText(
            req.query
              .includeCustomerName
          ).toLowerCase();


        includeCustomerName =
          ![
            "false",
            "0",
            "no",
            "without",
          ].includes(
            customerValue
          );
      }


      const {
        generateSteelMillOrderAnalysisPdf,
      } = require(
        "../services/managementOrderAnalyticsPdfService"
      );


      const result =
        await generateSteelMillOrderAnalysisPdf({
          ...filters,

          trackingOrderType:
            "N.H.O.",

          includeCustomerName,
        });


      if (
        !result ||
        !result.buffer
      ) {
        throw new Error(
          "Steel Mill analysis PDF could not be generated."
        );
      }


      const filename =
        result.filename ||
        `Steel_Mill_Order_Analysis_${
          filters.month ||
          "report"
        }_${
          filters.months ||
          1
        }M.pdf`;


      /* =============================================
         PDF HEADERS
      ============================================= */

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );


      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
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
        .send(
          result.buffer
        );
    } catch (
      error
    ) {
      console.error(
        "DOWNLOAD STEEL MILL ORDER ANALYSIS PDF ERROR =>",
        error
      );


      if (
        !res.headersSent
      ) {
        return res
          .status(500)
          .json({
            success:
              false,

            message:
              error.message ||
              "Failed to generate Steel Mill order analysis PDF.",
          });
      }


      return res.end();
    }
  };


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getManagementOrderAnalysis,
  getHouseOrderAnalysis,
  getSteelMillAnalysis,
  getGradeAnalysis,
  downloadHouseOrderAnalysisPdf,
  downloadSteelMillOrderAnalysisPdf,
};