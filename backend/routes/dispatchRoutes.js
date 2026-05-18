const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const dispatchController = require("../controller/dispatchController");
const dispatchUpload = require("../util/dispatchUpload");

/* =========================
   SALES ORDER SEARCH FOR DISPATCH
========================= */

router.get(
  "/sales-orders/search",
  authMiddleware,
  dispatchController.searchPendingDispatchSalesOrders
);

/* =========================
   CREATE DISPATCH
========================= */

router.post(
  "/create",
  authMiddleware,
  dispatchUpload.fields([
    { name: "billPdf", maxCount: 1 },
    { name: "lrCopyPdf", maxCount: 1 },
  ]),
  dispatchController.createDispatch
);

/* =========================
   GET ALL DISPATCHES
========================= */

router.get(
  "/",
  authMiddleware,
  dispatchController.getAllDispatches
);

/* =========================
   UPDATE PAYMENT
========================= */

router.patch(
  "/:dispatchId/payment",
  authMiddleware,
  dispatchUpload.single("paymentBillPdf"),
  dispatchController.updateDispatchPayment
);
/* =========================
   GET DISPATCH BY ID
========================= */

router.get(
  "/:dispatchId",
  authMiddleware,
  dispatchController.getDispatchById
);


/* =========================
   DELETE DISPATCH
========================= */

router.delete(
  "/:dispatchId",
  authMiddleware,
  dispatchController.deleteDispatch
);

module.exports = router;