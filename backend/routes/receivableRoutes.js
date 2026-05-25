const express = require("express");
const router = express.Router();

const auth = require("../util/auth");
const receivableController = require("../controller/receivableController");

router.get("/summary", auth, receivableController.getReceivableSummary);

router.get("/", auth, receivableController.getReceivables);

router.get("/risk-check", auth, receivableController.checkCustomerRisk);

router.get("/:receivableId", auth, receivableController.getCompanyLedger);

router.post(
  "/from-dispatch/:dispatchId",
  auth,
  receivableController.createFromDispatch
);
router.post(
  "/auto-map-sales-order/:salesOrderId",
  auth,
  receivableController.autoMapSalesPersonToReceivable
);
router.patch(
  "/:receivableId/payment",
  auth,
  receivableController.addManualPaymentReceipt
);

router.post(
  "/tally-sync",
  auth,
  receivableController.syncFromTallyReceivables
);

module.exports = router;