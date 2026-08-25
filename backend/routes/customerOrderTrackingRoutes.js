const express =
  require("express");

const router =
  express.Router();

const customerOrderTrackingController =
  require(
    "../controller/customerOrderTrackingController"
  );


/* =========================================================
   PUBLIC CUSTOMER TRACKING API

   Used by standalone tracking HTML page.

   NO RMS auth middleware here.
========================================================= */

router.get(
  "/:token",

  customerOrderTrackingController
    .getCustomerOrderTracking
);


module.exports =
  router;