const express = require("express");
const router = express.Router();

const salesOrderController = require("../controller/salesOrderController");
const authMiddleware = require("../util/auth");

router.post(
  "/create",
  authMiddleware,
  salesOrderController.createSalesOrder
);

router.get(
  "/",
  authMiddleware,
  salesOrderController.getAllSalesOrders
);
router.get(
  "/pending-dispatch-search",
  authMiddleware,
  salesOrderController.searchPendingDispatchSalesOrders
);
module.exports = router;