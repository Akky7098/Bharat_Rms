const express = require("express");
const router = express.Router();

const salesOrderController = require("../controller/salesOrderController");
const authMiddleware = require("../util/auth");
const uploadSalesOrderFiles = require("../util/uploadSalesOrderFiles");
// CREATE

router.post(
  "/create",
  authMiddleware,
  uploadSalesOrderFiles.single("customerPOFile"),
  salesOrderController.createSalesOrder
);
router.post(
  "/:id/generate-pdf",
  authMiddleware,
  salesOrderController.generateSalesOrderPdf
);
// GET ALL
router.get(
  "/",
  authMiddleware,
  salesOrderController.getAllSalesOrders
);

// OLD DASHBOARD SUPPORT
router.get(
  "/pending-dispatch-search",
  authMiddleware,
  salesOrderController.searchPendingDispatchSalesOrders
);

// GET SINGLE
router.get(
  "/:id",
  authMiddleware,
  salesOrderController.getSalesOrderById
);

// UPDATE / RESUBMIT
router.put(
  "/:id",
  authMiddleware,
  salesOrderController.updateSalesOrder
);

// ADMIN APPROVE
router.patch(
  "/:id/admin-approve",
  authMiddleware,
  salesOrderController.approveSalesOrderByAdmin
);

// ADMIN REJECT
router.patch(
  "/:id/admin-reject",
  authMiddleware,
  salesOrderController.rejectSalesOrderByAdmin
);

// MANAGER APPROVE
router.patch(
  "/:id/manager-approve",
  authMiddleware,
  salesOrderController.approveSalesOrderByManager
);

// MANAGER REJECT
router.patch(
  "/:id/manager-reject",
  authMiddleware,
  salesOrderController.rejectSalesOrderByManager
);

// UPDATE PDF DETAILS
router.patch(
  "/:id/pdf",
  authMiddleware,
  salesOrderController.updatePdfDetails
);

// UPDATE WHATSAPP GROUP STATUS
router.patch(
  "/:id/whatsapp-group",
  authMiddleware,
  salesOrderController.updateWhatsappGroupStatus
);

// DELETE
router.delete(
  "/:id",
  authMiddleware,
  salesOrderController.deleteSalesOrder
);
router.get("/whatsapp/webhook", salesOrderController.verifyWhatsappWebhook);
router.post("/whatsapp/webhook", salesOrderController.handleWhatsappWebhook);

module.exports = router;