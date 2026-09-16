const fs = require("fs");

const {
  generatePriceContractPdf,
} = require(
  "../services/priceContractPdfService"
);


/* =========================================================
   GENERATE PRICE CONTRACT PDF

   POST:
   /api/price-contracts/generate-pdf
========================================================= */

const generatePriceContractPdfController =
  async (req, res) => {

    let generatedPdf = null;

    try {

      /* ===================================================
         FORM DATA FROM FRONTEND
      =================================================== */

      const priceContract =
        req.body || {};


      /* ===================================================
         BASIC VALIDATION

         We intentionally do not make every field mandatory
         because many Price Contract fields have defaults
         inside priceContractTemplate.js.
      =================================================== */

      if (
        !priceContract ||
        typeof priceContract !== "object"
      ) {
        return res.status(400).json({

          success:
            false,

          message:
            "Invalid Price Contract data.",
        });
      }


      /* ===================================================
         GENERATE PDF
      =================================================== */

      generatedPdf =
        await generatePriceContractPdf(
          priceContract
        );


      /* ===================================================
         SUCCESS RESPONSE
      =================================================== */

      return res.status(200).json({

        success:
          true,

        message:
          "Price Contract PDF generated successfully.",

        pdf:
          generatedPdf,
      });

    } catch (error) {

      console.log(
        "GENERATE PRICE CONTRACT PDF CONTROLLER ERROR =>",
        error
      );


      /*
       * If something failed after the PDF file
       * was generated, remove incomplete/orphan file.
       */

      if (
        generatedPdf?.filePath &&
        fs.existsSync(
          generatedPdf.filePath
        )
      ) {
        try {

          fs.unlinkSync(
            generatedPdf.filePath
          );

          console.log(
            "FAILED PRICE CONTRACT PDF REMOVED =>",
            generatedPdf.filePath
          );

        } catch (
          cleanupError
        ) {

          console.log(
            "PRICE CONTRACT PDF CLEANUP FAILED =>",
            cleanupError.message
          );
        }
      }


      return res.status(500).json({

        success:
          false,

        message:
          "Failed to generate Price Contract PDF.",

        error:
          error.message,
      });
    }
  };


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  generatePriceContractPdfController,
};