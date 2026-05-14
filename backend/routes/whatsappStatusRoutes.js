const express = require("express");
const router = express.Router();

const whatsappStatusController = require("../controller/whatsappStatusController");

router.get("/status", whatsappStatusController.getWhatsappStatus);
router.get("/status-page", whatsappStatusController.showWhatsappQrPage);
router.get("/restart-page", whatsappStatusController.restartWhatsappPage);

module.exports = router;