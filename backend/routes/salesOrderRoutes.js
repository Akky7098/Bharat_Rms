const express = require("express");

const router = express.Router();

const salesOrderController = require("../controller/salesOrderController");

const authMiddleware = require("../util/auth");

const uploadSalesOrderFiles = require("../util/uploadSalesOrderFiles");

/* =========================================================
   CREATE SALES ORDER
========================================================= */

router.post(
  "/create",
  authMiddleware,
  uploadSalesOrderFiles.fields([
    {
      name: "customerPOFile",
      maxCount: 1,
    },
    {
      name: "feasibilityReportFile",
      maxCount: 1,
    },
  ]),
  salesOrderController.createSalesOrder
);

/* =========================================================
   EMAIL APPROVAL ROUTES
   CURRENTLY DISABLED
========================================================= */

// router.get(
//   "/email-approve/:id/:token",
//   salesOrderController.approveSalesOrderFromEmail
// );

// router.get(
//   "/email-reject-form/:id/:token",
//   salesOrderController.showRejectForm
// );

// router.post(
//   "/email-reject/:id/:token",
//   salesOrderController.rejectSalesOrderFromEmail
// );

/* =========================================================
   GENERATE SALES ORDER PDF
========================================================= */

router.post(
  "/:id/generate-pdf",
  authMiddleware,
  salesOrderController.generateSalesOrderPdf
);

/* =========================================================
   GET ALL SALES ORDERS
========================================================= */

router.get(
  "/",
  authMiddleware,
  salesOrderController.getAllSalesOrders
);

/* =========================================================
   OLD DASHBOARD SUPPORT
========================================================= */

router.get(
  "/pending-dispatch-search",
  authMiddleware,
  salesOrderController.searchPendingDispatchSalesOrders
);

/* =========================================================
   WHATSAPP WEBHOOK
========================================================= */

router.get(
  "/whatsapp/webhook",
  salesOrderController.verifyWhatsappWebhook
);

router.post(
  "/whatsapp/webhook",
  salesOrderController.handleWhatsappWebhook
);

/* =========================================================
   SALES ORDER DISCUSSION / COMMENTS

   IMPORTANT:
   These routes match frontend exactly:

   GET  /api/sales-order/:id/comments
   POST /api/sales-order/:id/comments
========================================================= */

router.get(
  "/:id/comments",
  authMiddleware,
  salesOrderController.getSalesOrderComments
);

router.post(
  "/:id/comments",
  authMiddleware,
  salesOrderController.addSalesOrderComment
);

/* =========================================================
   GET SINGLE SALES ORDER
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  salesOrderController.getSalesOrderById
);

/* =========================================================
   UPDATE / RESUBMIT SALES ORDER
========================================================= */

router.put(
  "/update/:id",
  authMiddleware,
  uploadSalesOrderFiles.fields([
    {
      name: "customerPOFile",
      maxCount: 1,
    },
    {
      name: "feasibilityReportFile",
      maxCount: 1,
    },
  ]),
  salesOrderController.updateSalesOrder
);

/* =========================================================
   ADMIN APPROVE
========================================================= */

router.patch(
  "/:id/admin-approve",
  authMiddleware,
  salesOrderController.approveSalesOrderByAdmin
);

/* =========================================================
   ADMIN REJECT / HOLD
========================================================= */

router.patch(
  "/:id/admin-reject",
  authMiddleware,
  salesOrderController.rejectSalesOrderByAdmin
);

/* =========================================================
   MANAGER / MD APPROVE
========================================================= */

router.patch(
  "/:id/manager-approve",
  authMiddleware,
  salesOrderController.approveSalesOrderByManager
);

/* =========================================================
   MANAGER / MD REJECT / HOLD
========================================================= */

router.patch(
  "/:id/manager-reject",
  authMiddleware,
  salesOrderController.rejectSalesOrderByManager
);

/* =========================================================
   OLD SINGLE COMMENT ROUTE

   Removed:
   POST /:id/comment

   Frontend now uses:
   POST /:id/comments
========================================================= */

/* =========================================================
   UPDATE PDF DETAILS
========================================================= */

router.patch(
  "/:id/pdf",
  authMiddleware,
  salesOrderController.updatePdfDetails
);

/* =========================================================
   UPDATE WHATSAPP GROUP STATUS
========================================================= */

router.patch(
  "/:id/whatsapp-group",
  authMiddleware,
  salesOrderController.updateWhatsappGroupStatus
);

/* =========================================================
   DELETE SALES ORDER
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  salesOrderController.deleteSalesOrder
);

module.exports = router;