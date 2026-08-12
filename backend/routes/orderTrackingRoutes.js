// ============================================================
// FILE: routes/orderTrackingRoutes.js
// ============================================================

const express =
  require("express");

const router =
  express.Router();

const orderTrackingController =
  require("../controller/orderTrackingController");

const authMiddleware =
  require("../util/auth");

/* =========================================================
   AUTO SYNC ALL APPROVED SALES ORDERS

   POST
   /api/order-tracking/sync

   BODY:
   {}

   Automatically reads:
   trackingOrderType
   supplyCondition
   otherSupplyConditions
   from Sales Order.
========================================================= */

router.post(
  "/sync",
  authMiddleware,
  orderTrackingController.syncApprovedSalesOrders
);

/* =========================================================
   SYNC SINGLE APPROVED SALES ORDER

   POST
   /api/order-tracking/sync/:salesOrderId

   BODY:
   {}
========================================================= */

router.post(
  "/sync/:salesOrderId",
  authMiddleware,
  orderTrackingController.syncSalesOrder
);

/* =========================================================
   GET ALL TRACKING ORDERS

   GET
   /api/order-tracking
========================================================= */

router.get(
  "/",
  authMiddleware,
  orderTrackingController.getAllOrderTrackings
);

/* =========================================================
   GET TRACKING BY SALES ORDER
========================================================= */

router.get(
  "/sales-order/:salesOrderId",
  authMiddleware,
  orderTrackingController.getTrackingBySalesOrderId
);

/* =========================================================
   GET TRACKING BY TRACKING NUMBER
========================================================= */

router.get(
  "/track/:trackingNumber",
  authMiddleware,
  orderTrackingController.getTrackingByNumber
);

/* =========================================================
   COMPLETE CURRENT MILESTONE

   PATCH
   /api/order-tracking/:id/milestones/:milestoneId/complete

   BODY:
   {}

   or:

   {
     "comment": "Forging completed"
   }

   Backend automatically:
   - saves current actual date/time
   - calculates early/late gap
   - shifts all future estimated dates
   - activates next milestone
   - updates progress
========================================================= */

router.patch(
  "/:id/milestones/:milestoneId/complete",
  authMiddleware,
  orderTrackingController.completeMilestone
);

/* =========================================================
   UPDATE ESTIMATED DATE
========================================================= */

router.patch(
  "/:id/milestones/:milestoneId/estimated-date",
  authMiddleware,
  orderTrackingController.updateEstimatedDate
);

/* =========================================================
   UPDATE TRANSPORTER
========================================================= */

router.patch(
  "/:id/transporter",
  authMiddleware,
  orderTrackingController.updateTransporter
);

/* =========================================================
   GET SINGLE TRACKING

   IMPORTANT:
   KEEP THIS LAST
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  orderTrackingController.getOrderTrackingById
);

module.exports =
  router;