const express =
  require("express");

const router =
  express.Router();

const customerOrderTrackingPageController =
  require(
    "../controller/customerOrderTrackingPageController"
  );


/* =========================================================
   PUBLIC CUSTOMER TRACKING PAGE

   Example:

   /track-order/abc123...

   NO login.
   NO JWT.
========================================================= */

router.get(
  "/:token",

  customerOrderTrackingPageController
    .renderCustomerOrderTrackingPage
);


module.exports =
  router;