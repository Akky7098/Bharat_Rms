const express = require("express");

const router = express.Router();

const mtcController = require(
  "../controller/mtcController"
);

const authMiddleware = require(
  "../util/auth"
);

/* =========================================================
   MTC PROVIDERS
========================================================= */

/*
 * Returns providers for frontend dropdown.
 *
 * GET /api/mtc/providers
 */
router.get(
  "/providers",
  authMiddleware,
  mtcController.getMtcProviders
);

/* =========================================================
   CHEMICAL SPECIFICATIONS
========================================================= */

/*
 * Gloria:
 * GET /api/mtc/chemical-specs?mtcProvider=gloria
 *
 * Bharat:
 * GET /api/mtc/chemical-specs?mtcProvider=bharat
 */
router.get(
  "/chemical-specs",
  authMiddleware,
  mtcController.getMtcChemicalSpecs
);

/* =========================================================
   MTC LIST
========================================================= */

/*
 * GET /api/mtc
 *
 * Optional filters:
 *
 * ?mtcProvider=gloria
 * ?companyName=ABC
 * ?grade=D2
 * ?fromDate=2026-07-01
 * ?toDate=2026-07-31
 * ?limit=200
 */
router.get(
  "/",
  authMiddleware,
  mtcController.getMtcCertificates
);

/* =========================================================
   CREATE MTC
========================================================= */

/*
 * POST /api/mtc
 */
router.post(
  "/",
  authMiddleware,
  mtcController.createMtcCertificate
);

/* =========================================================
   REGENERATE PDF
========================================================= */

/*
 * POST /api/mtc/:id/regenerate-pdf
 *
 * Optional:
 * ?mtcProvider=bharat
 */
router.post(
  "/:id/regenerate-pdf",
  authMiddleware,
  mtcController.regenerateMtcPdf
);

/* =========================================================
   DOWNLOAD PDF
========================================================= */

/*
 * GET /api/mtc/:id/pdf
 *
 * Recommended for separate provider collections:
 * GET /api/mtc/:id/pdf?mtcProvider=bharat
 */
router.get(
  "/:id/pdf",
  authMiddleware,
  mtcController.downloadMtcPdf
);

module.exports = router;