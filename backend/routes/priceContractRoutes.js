const express = require("express");

const router = express.Router();

const priceContractController = require(
  "../controller/priceContractController"
);

const authMiddleware = require("../util/auth");


/* =========================================================
   CREATE PRICE CONTRACT
========================================================= */

router.post(

  "/create",

  authMiddleware,

  priceContractController.createPriceContract

);


/* =========================================================
   GENERATE PRICE CONTRACT PDF
========================================================= */

router.post(

  "/:id/generate-pdf",

  authMiddleware,

  priceContractController.generatePriceContractPdf

);


/* =========================================================
   GET ALL PRICE CONTRACTS
========================================================= */

router.get(

  "/",

  authMiddleware,

  priceContractController.getAllPriceContracts

);


/* =========================================================
   GET SINGLE PRICE CONTRACT
========================================================= */

router.get(

  "/:id",

  authMiddleware,

  priceContractController.getPriceContractById

);


/* =========================================================
   UPDATE PRICE CONTRACT
========================================================= */

router.put(

  "/update/:id",

  authMiddleware,

  priceContractController.updatePriceContract

);


/* =========================================================
   UPDATE PDF DETAILS
========================================================= */

router.patch(

  "/:id/pdf",

  authMiddleware,

  priceContractController.updatePdfDetails

);


/* =========================================================
   DELETE PRICE CONTRACT
========================================================= */

router.delete(

  "/:id",

  authMiddleware,

  priceContractController.deletePriceContract

);


module.exports = router;