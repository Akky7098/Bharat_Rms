// backend/routes/steelAnalyticsRoutes.js

const express =
  require("express");

const router =
  express.Router();

const {
  getSteelAnalytics,
  getSteelAnalyticsSummary,
  getSteelAnalyticsDrillDown,
} = require(
  "../controller/steelAnalyticsController"
);

/*
 * IMPORTANT:
 *
 * Add the SAME authentication / role middleware
 * that dashboardRoutes.js currently uses.
 *
 * Management Analytics must NOT be public.
 */

/* =========================================================
   FULL ANALYTICS

   GET /api/steel-analytics

   Optional filters:

   ?from=2026-09-01
   &to=2026-09-30
   &trackingOrderType=H.O.
   &steelMill=ABC
   &grade=D2
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

   Required:
   metric

   Supported:

   new_order
   dispatch_target
   actual_dispatch
   target_pending
   order_balance

   EXAMPLES:

   H.O. ORDER BALANCE
   /api/steel-analytics/drill-down
     ?metric=order_balance
     &trackingOrderType=H.O.

   SEPTEMBER STEEL MILL DISPATCH TARGET
   /api/steel-analytics/drill-down
     ?metric=dispatch_target
     &trackingOrderType=N.H.O.
     &from=2026-09-01
     &to=2026-09-30

   ONE STEEL MILL
   /api/steel-analytics/drill-down
     ?metric=order_balance
     &trackingOrderType=N.H.O.
     &steelMill=ABC

   ONE GRADE
   /api/steel-analytics/drill-down
     ?metric=order_balance
     &grade=D2
========================================================= */

router.get(
  "/drill-down",
  getSteelAnalyticsDrillDown
);

module.exports =
  router;