const express = require("express");

const authMiddleware = require(
  "../util/auth"
);

const uploadOrderTrackingFiles = require(
  "../util/uploadOrderTrackingFiles"
);

const orderTrackingController = require(
  "../controller/orderTrackingController"
);

const router = express.Router();

router.use(authMiddleware);

/* =========================================================
   DASHBOARD
========================================================= */

router.get(
  "/dashboard",
  orderTrackingController.getDashboard
);

/* =========================================================
   MANUAL SYNC FOR EXISTING APPROVED SALES ORDERS
========================================================= */

router.post(
  "/sync-approved-orders",
  orderTrackingController.syncApprovedSalesOrders
);

/* =========================================================
   TRACKING LIST AND DETAILS
========================================================= */

router.get(
  "/",
  orderTrackingController.getTrackingList
);

router.get(
  "/:trackingId",
  orderTrackingController.getTrackingById
);

/* =========================================================
   STATUS UPDATE
========================================================= */

router.patch(
  "/:trackingId/status",
  uploadOrderTrackingFiles.array(
    "files",
    10
  ),
  orderTrackingController.updateStatus
);

/* =========================================================
   REQUEST UPDATE
========================================================= */

router.post(
  "/:trackingId/request-update",
  orderTrackingController.requestUpdate
);

/* =========================================================
   CHAT
========================================================= */

router.get(
  "/:trackingId/messages",
  orderTrackingController.getMessages
);

router.post(
  "/:trackingId/messages",
  uploadOrderTrackingFiles.array(
    "files",
    10
  ),
  orderTrackingController.sendMessage
);

router.patch(
  "/:trackingId/messages/read",
  orderTrackingController.markMessagesRead
);

router.delete(
  "/:trackingId/messages/:messageId",
  orderTrackingController.deleteMessage
);

/* =========================================================
   CHAT CONTROL
========================================================= */

router.patch(
  "/:trackingId/close-chat",
  orderTrackingController.closeChat
);

router.patch(
  "/:trackingId/reopen-chat",
  orderTrackingController.reopenChat
);

module.exports = router;
