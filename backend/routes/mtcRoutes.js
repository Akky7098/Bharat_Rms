// const express = require(
//   "express"
// );

// const router =
//   express.Router();

// const mtcController = require(
//   "../controller/mtcController"
// );

// const authMiddleware = require(
//   "../util/auth"
// );

// /* =========================================================
//    GET CONFIGURED MTC PROVIDERS

//    GET
//    /api/mtc/providers
// ========================================================= */

// router.get(
//   "/providers",
//   authMiddleware,
//   mtcController.getMtcProviders
// );

// /* =========================================================
//    GET PROVIDER CHEMICAL SPECS / FORM CONFIG

//    GET
//    /api/mtc/chemical-specs

//    Examples:

//    /api/mtc/chemical-specs?mtcProvider=gloria

//    /api/mtc/chemical-specs?mtcProvider=bharat

//    /api/mtc/chemical-specs?mtcProvider=sbe_germany
// ========================================================= */

// router.get(
//   "/chemical-specs",
//   authMiddleware,
//   mtcController
//     .getMtcChemicalSpecs
// );

// /* =========================================================
//    GET ALL MTC CERTIFICATES

//    GET
//    /api/mtc

//    Optional:

//    ?companyName=
//    ?grade=
//    ?mtcProvider=
//    ?fromDate=
//    ?toDate=
//    ?limit=
// ========================================================= */

// router.get(
//   "/",
//   authMiddleware,
//   mtcController
//     .getMtcCertificates
// );

// /* =========================================================
//    CREATE MTC

//    POST
//    /api/mtc

//    Example:

//    {
//      "mtcProvider": "sbe_germany",
//      "grade": "1.2714"
//    }
// ========================================================= */

// router.post(
//   "/",
//   authMiddleware,
//   mtcController
//     .createMtcCertificate
// );

// /* =========================================================
//    DOWNLOAD MTC PDF

//    GET
//    /api/mtc/:id/download

//    Keep this BEFORE /:id.
// ========================================================= */

// router.get(
//   "/:id/download",
//   authMiddleware,
//   mtcController
//     .downloadMtcPdf
// );

// /* =========================================================
//    REGENERATE MTC PDF

//    POST
//    /api/mtc/:id/regenerate

//    Keep this BEFORE /:id.
// ========================================================= */

// router.post(
//   "/:id/regenerate",
//   authMiddleware,
//   mtcController
//     .regenerateMtcPdf
// );

// /* =========================================================
//    GET SINGLE MTC

//    GET
//    /api/mtc/:id

//    Used to populate edit form.
// ========================================================= */

// router.get(
//   "/:id",
//   authMiddleware,
//   mtcController
//     .getMtcCertificateById
// );

// /* =========================================================
//    UPDATE / EDIT MTC

//    PATCH
//    /api/mtc/:id

//    Saves English fields and regenerates
//    provider-specific PDF automatically.
// ========================================================= */

// router.patch(
//   "/:id",
//   authMiddleware,
//   mtcController
//     .updateMtcCertificate
// );

// module.exports = router;