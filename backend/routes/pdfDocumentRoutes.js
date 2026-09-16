const express = require("express");

const router = express.Router();

const pdfDocumentController = require(
  "../controller/pdfDocumentController"
);

const authMiddleware = require(
  "../util/auth"
);


/* =========================================================
   CREATE DOCUMENT
========================================================= */

router.post(
  "/create",

  authMiddleware,

  pdfDocumentController.createPdfDocument
);


/* =========================================================
   GENERATE PDF
========================================================= */

router.post(
  "/:id/generate-pdf",

  authMiddleware,

  pdfDocumentController.generatePdfDocument
);


/* =========================================================
   GET ALL DOCUMENTS
========================================================= */

router.get(
  "/",

  authMiddleware,

  pdfDocumentController.getAllPdfDocuments
);


/* =========================================================
   GET SINGLE DOCUMENT
========================================================= */

router.get(
  "/:id",

  authMiddleware,

  pdfDocumentController.getPdfDocumentById
);


/* =========================================================
   UPDATE DOCUMENT
========================================================= */

router.put(
  "/update/:id",

  authMiddleware,

  pdfDocumentController.updatePdfDocument
);


/* =========================================================
   UPDATE PDF DETAILS
========================================================= */

router.patch(
  "/:id/pdf",

  authMiddleware,

  pdfDocumentController.updatePdfDetails
);


/* =========================================================
   DELETE DOCUMENT
========================================================= */

router.delete(
  "/:id",

  authMiddleware,

  pdfDocumentController.deletePdfDocument
);


module.exports = router;