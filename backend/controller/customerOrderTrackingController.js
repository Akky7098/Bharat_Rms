const customerOrderTrackingService =
  require(
    "../services/customerOrderTrackingService"
  );


/* =========================================================
   PUBLIC CUSTOMER TRACKING

   NO LOGIN REQUIRED.

   Security comes from the cryptographically random
   256-bit tracking token.
========================================================= */

const getCustomerOrderTracking =
  async (
    req,
    res
  ) => {
    try {
      const data =
        await customerOrderTrackingService
          .getCustomerTrackingByToken(
            req.params.token
          );

      /*
       * Customer tracking should never be cached publicly.
       */
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );

      res.set(
        "Pragma",
        "no-cache"
      );

      return res
        .status(200)
        .json({
          success:
            true,

          data,
        });
    } catch (
      error
    ) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            error.message ||
            "Order tracking not found.",
        });
    }
  };


module.exports = {
  getCustomerOrderTracking,
};