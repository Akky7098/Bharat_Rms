const express = require("express");
const router = express.Router();

const whatsappApprovalController = require("../controller/whatsappApprovalController");

router.get("/approve/:id/:token", whatsappApprovalController.approveFromWhatsapp);
router.post("/approve/:id/:token", whatsappApprovalController.approveFromWhatsapp);

router.get("/hold-form/:id/:token", whatsappApprovalController.holdForm);
router.post("/hold/:id/:token", whatsappApprovalController.submitHoldFromWhatsapp);

router.get("/pdf/:id/:token", whatsappApprovalController.openPdfFromWhatsapp);

module.exports = router;