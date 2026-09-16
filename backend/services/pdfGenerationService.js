const {
  generatePriceContractPdf,
} = require(
  "./priceContractPdfService"
);


/* =========================================================
   GENERATE PDF BY DOCUMENT TYPE

   Add future PDF services here only.

   Example:

   quotation:
     return generateQuotationPdf(pdfDocument);

   commercial_offer:
     return generateCommercialOfferPdf(pdfDocument);
========================================================= */

const generatePdfByDocumentType = async (
  pdfDocument
) => {
  if (!pdfDocument) {
    throw new Error(
      "PDF document is required."
    );
  }


  const documentType =
    String(
      pdfDocument.documentType || ""
    )
      .trim()
      .toLowerCase();


  switch (documentType) {

    /* =====================================================
       PRICE CONTRACT
    ===================================================== */

    case "price_contract":

      return generatePriceContractPdf(
        pdfDocument
      );


    /* =====================================================
       FUTURE DOCUMENT TYPES

       case "quotation":
         return generateQuotationPdf(pdfDocument);

       case "commercial_offer":
         return generateCommercialOfferPdf(pdfDocument);

    ===================================================== */


    default:

      throw new Error(
        `Unsupported PDF document type: ${documentType || "unknown"}`
      );
  }
};


module.exports = {
  generatePdfByDocumentType,
};