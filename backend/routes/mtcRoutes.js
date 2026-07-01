const express = require("express");
const router = express.Router();

const mtcController = require("../controller/mtcController");
const authMiddleware = require("../util/auth");

router.get("/", authMiddleware, mtcController.getMtcCertificates);
router.get("/chemical-specs", authMiddleware, mtcController.getMtcChemicalSpecs);
router.post("/", authMiddleware, mtcController.createMtcCertificate);
router.get("/:id/pdf", authMiddleware, mtcController.downloadMtcPdf);

module.exports = router;