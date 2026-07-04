const express = require("express");
const router = express.Router();

const authMiddleware = require("../util/auth");
const enquiryLookupController = require("../controller/enquiryLookupController");

router.get(
  "/sales-order/:enquiryNumber",
  authMiddleware,
  enquiryLookupController.lookupEnquiryForSalesOrder
);

module.exports = router;