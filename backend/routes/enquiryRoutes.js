const express = require("express");
const router = express.Router();
const enquiryController = require("../controller/enquiryController");
const authMiddleware = require("../util/auth");

router.get(
  "/product-config",
  authMiddleware,
  enquiryController.getProductConfig
);

router.post(
  "/create",
  authMiddleware,
  enquiryController.createEnquiry
);
router.post(
  "/:id/update-workflow",
  authMiddleware,
  enquiryController.updateWorkflow
);
router.get(
  "/",
  authMiddleware,
  enquiryController.getAllEnquiries
);

module.exports = router;
