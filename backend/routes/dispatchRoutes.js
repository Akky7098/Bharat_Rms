const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require("../util/auth");

const dispatchController =
  require(
    "../controller/dispatchController"
  );

const dispatchUpload =
  require(
    "../util/dispatchUpload"
  );

/* =========================================================
   SALES ORDER SEARCH FOR DISPATCH

   GET
   /api/dispatch/sales-orders/search
========================================================= */

router.get(
  "/sales-orders/search",
  authMiddleware,
  dispatchController
    .searchPendingDispatchSalesOrders
);

/* =========================================================
   CREATE DISPATCH

   POST
   /api/dispatch/create

   FILE SUPPORT:

   billPdf
   - maximum 1

   lrCopyPdf
   - maximum 1

   tcCertificatePdf
   - maximum 10
   - same multipart field name repeated
   - available in controller/service as:

     req.files.tcCertificatePdf = [
       file1,
       file2,
       file3,
       ...
     ]
========================================================= */

router.post(
  "/create",

  authMiddleware,

  dispatchUpload.fields([
    {
      name: "billPdf",
      maxCount: 1,
    },

    {
      name: "lrCopyPdf",
      maxCount: 1,
    },

    {
      name: "tcCertificatePdf",
      maxCount: 10,
    },
  ]),

  dispatchController
    .createDispatch
);

/* =========================================================
   GET ALL DISPATCHES

   GET
   /api/dispatch
========================================================= */

router.get(
  "/",
  authMiddleware,
  dispatchController
    .getAllDispatches
);

/* =========================================================
   UPDATE PAYMENT

   PATCH
   /api/dispatch/:dispatchId/payment

   Optional:
   paymentBillPdf
========================================================= */

router.patch(
  "/:dispatchId/payment",

  authMiddleware,

  dispatchUpload.single(
    "paymentBillPdf"
  ),

  dispatchController
    .updateDispatchPayment
);

/* =========================================================
   UPDATE DISPATCH STATUS

   PATCH
   /api/dispatch/:dispatchId/status
========================================================= */

router.patch(
  "/:dispatchId/status",

  authMiddleware,

  dispatchController
    .updateDispatchStatus
);

/* =========================================================
   GET DISPATCH BY ID

   GET
   /api/dispatch/:dispatchId
========================================================= */

router.get(
  "/:dispatchId",

  authMiddleware,

  dispatchController
    .getDispatchById
);

/* =========================================================
   DELETE DISPATCH

   DELETE
   /api/dispatch/:dispatchId
========================================================= */

router.delete(
  "/:dispatchId",

  authMiddleware,

  dispatchController
    .deleteDispatch
);

module.exports =
  router;