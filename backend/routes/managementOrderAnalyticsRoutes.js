const express =
  require("express");

const router =
  express.Router();


const {
  getManagementOrderAnalysis,
  getHouseOrderAnalysis,
  getSteelMillAnalysis,
  getGradeAnalysis,
  downloadHouseOrderAnalysisPdf,
  downloadSteelMillOrderAnalysisPdf,
} = require(
  "../controller/managementOrderAnalyticsController"
);


/* =========================================================
   MANAGEMENT ORDER ANALYSIS OVERVIEW

   GET /api/management-order-analysis

   Lightweight:
   - Total orders
   - H.O.
   - Steel Mill / N.H.O.
   - Grade summary
   - Mill summary

   No complete order register.
========================================================= */

router.get(
  "/",
  getManagementOrderAnalysis
);


/* =========================================================
   H.O. ORDER ANALYSIS

   GET /api/management-order-analysis/house

   Example:

   /api/management-order-analysis/house
     ?month=2026-10
     &months=1

   Returns complete H.O. order details.
========================================================= */

router.get(
  "/house",
  getHouseOrderAnalysis
);


/* =========================================================
   H.O. ORDER ANALYSIS PDF

   GET /api/management-order-analysis/house/pdf

   Example:

   /api/management-order-analysis/house/pdf
     ?month=2026-10
     &months=1
========================================================= */

router.get(
  "/house/pdf",
  downloadHouseOrderAnalysisPdf
);


/* =========================================================
   STEEL MILL DETAIL

   GET /api/management-order-analysis/mill

   Example:

   /api/management-order-analysis/mill
     ?month=2026-10
     &months=1
     &steelMill=S.S.%20Steel%20-%20Sirhind

   Optional:

     &supplyCondition=as_rolled

   Returns complete selected mill order details.
========================================================= */

router.get(
  "/mill",
  getSteelMillAnalysis
);


/* =========================================================
   STEEL MILL ORDER ANALYSIS PDF

   GET /api/management-order-analysis/mill/pdf

   WITH CUSTOMER:

   /api/management-order-analysis/mill/pdf
     ?month=2026-10
     &months=3
     &steelMill=S.S.%20Steel%20-%20Sirhind
     &supplyCondition=as_rolled
     &includeCustomerName=true


   WITHOUT CUSTOMER:

   /api/management-order-analysis/mill/pdf
     ?month=2026-10
     &months=3
     &steelMill=S.S.%20Steel%20-%20Sirhind
     &supplyCondition=as_rolled
     &includeCustomerName=false


   PDF:
   - Mill name
   - Period
   - Supply condition
   - Total sales orders
   - Total order quantity
   - Order detail table

   NO:
   - Grade analysis
   - Dispatch
   - Pending
   - Logistics
   - Current status
   - Tentative schedule
========================================================= */

router.get(
  "/mill/pdf",
  downloadSteelMillOrderAnalysisPdf
);


/* =========================================================
   GRADE DETAIL

   GET /api/management-order-analysis/grade

   Example:

   /api/management-order-analysis/grade
     ?month=2026-10
     &months=1
     &grade=H-13
========================================================= */

router.get(
  "/grade",
  getGradeAnalysis
);


module.exports =
  router;