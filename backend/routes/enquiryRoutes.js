const express = require("express");
const router = express.Router();
const enquiryController = require("../controller/enquiryController");
const authMiddleware = require("../util/auth");
const uploadEnquirySizePdf = require("../util/enquirySizePdfUpload");

router.get(
  "/product-config",
  authMiddleware,
  enquiryController.getProductConfig
);


router.post(
  "/create",
  authMiddleware,
  uploadEnquirySizePdf.single("sizePdf"),
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

router.get(
  "/lost-reasons",
  authMiddleware,
  enquiryController.getLostEnquiryReasons
);

module.exports = router;
