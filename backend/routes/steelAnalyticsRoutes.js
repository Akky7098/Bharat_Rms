// backend/routes/steelAnalyticsRoutes.js

const express =
  require("express");

const router =
  express.Router();

const {
  getSteelAnalytics,
  getSteelAnalyticsSummary,
  getSteelAnalyticsDrillDown,
  downloadSteelAnalyticsPdf,
} = require(
  "../controller/steelAnalyticsController"
);

/*
 * IMPORTANT:
 *
 * Add the SAME authentication and
 * Super Admin authorization middleware
 * used by your protected dashboard routes.
 *
 * Do not expose Management Analysis publicly.
 */


/* =========================================================
   FULL ANALYTICS

   GET /api/steel-analytics
========================================================= */

router.get(
  "/",
  getSteelAnalytics
);


/* =========================================================
   SUMMARY

   GET /api/steel-analytics/summary
========================================================= */

router.get(
  "/summary",
  getSteelAnalyticsSummary
);


/* =========================================================
   DRILL-DOWN

   GET /api/steel-analytics/drill-down

   metric:

   new_order
   dispatch_target
   actual_dispatch
   target_pending
   order_balance
========================================================= */

router.get(
  "/drill-down",
  getSteelAnalyticsDrillDown
);


/* =========================================================
   PDF DOWNLOAD

   GET /api/steel-analytics/pdf

   ONE MONTH:

   /api/steel-analytics/pdf
     ?month=2026-09
     &period=1


   THREE MONTH:

   /api/steel-analytics/pdf
     ?month=2026-09
     &period=3


   SIX MONTH:

   /api/steel-analytics/pdf
     ?month=2026-09
     &period=6


   OPTIONAL FILTERS:

   trackingOrderType=H.O.

   trackingOrderType=N.H.O.

   steelMill=ABC

   grade=D2
========================================================= */

router.get(
  "/pdf",
  downloadSteelAnalyticsPdf
);


module.exports =
  router;