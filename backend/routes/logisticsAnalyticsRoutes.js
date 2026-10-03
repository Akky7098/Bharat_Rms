const express =
  require("express");

const router =
  express.Router();

const {
  getLogisticsAnalysis,
  getLogisticsDetails,
} = require(
  "../controller/logisticsAnalyticsController"
);

/*
 * IMPORTANT:
 *
 * Add the SAME authentication and
 * Super Admin authorization middleware
 * used by your protected dashboard routes.
 *
 * This module must NOT be public.
 */


/* =========================================================
   LOGISTICS ANALYSIS

   GET /api/logistics-analysis

   EXAMPLES:

   ONE MONTH:
   ?month=2026-09&months=1

   THREE MONTH:
   ?month=2026-09&months=3

   SIX MONTH:
   ?month=2026-09&months=6


   RETURNS ONLY:

   Dispatch Plan
   Actual Dispatch
   Target Pending


   IMPORTANT:

   Dispatch Plan remains based on the
   exact Order Tracking readiness date.

   We are NOT changing the existing
   business logic.
========================================================= */

router.get(
  "/",
  getLogisticsAnalysis
);


/* =========================================================
   LOGISTICS DETAILS

   GET /api/logistics-analysis/details

   Called ONLY when the user opens
   Plan / Pending detail.

   EXAMPLE:

   ?month=2026-09
   &months=1

   OPTIONAL:

   &trackingOrderType=H.O.

   OR

   &trackingOrderType=N.H.O.
========================================================= */

router.get(
  "/details",
  getLogisticsDetails
);


module.exports =
  router;