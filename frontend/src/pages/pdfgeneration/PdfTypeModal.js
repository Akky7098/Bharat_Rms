import React, {
  useEffect,
  useState,
} from "react";

import PriceContractForm from "./PriceContractForm";

/* =========================================================
   PDF DOCUMENT TYPES

   Add future PDF generators here.

   IMPORTANT:
   The key must match backend documentType.
========================================================= */

const PDF_TYPES = [
  {
    key: "price_contract",
    title: "Price Contract",
    shortName: "PC",
    description:
      "Create a professional customer price contract with commercial terms and conditions.",
    available: true,
  },

  /*
  ==========================================================
  FUTURE PDF TYPES

  Example:

  {
    key: "quotation",
    title: "Quotation",
    shortName: "QT",
    description:
      "Create a professional customer quotation.",
    available: true,
  },

  {
    key: "commercial_offer",
    title: "Commercial Offer",
    shortName: "CO",
    description:
      "Create a professional commercial offer.",
    available: true,
  },

  {
    key: "certificate",
    title: "Certificate",
    shortName: "CERT",
    description:
      "Create a professional certificate.",
    available: true,
  },

  ==========================================================
  */
];


/* =========================================================
   PDF TYPE MODAL
========================================================= */

const PdfTypeModal = ({
  document = null,
  onClose,
  onGenerated,
}) => {
  /* =======================================================
     SELECTED DOCUMENT TYPE

     New PDF:
     selectedType starts blank.

     Existing PDF:
     selectedType automatically uses documentType so the
     correct form opens directly.
  ======================================================= */

  const [
    selectedType,
    setSelectedType,
  ] = useState(
    document?.documentType || ""
  );


  /* =======================================================
     RESET WHEN DOCUMENT CHANGES
  ======================================================= */

  useEffect(() => {
    setSelectedType(
      document?.documentType || ""
    );
  }, [document]);


  /* =======================================================
     PRICE CONTRACT FORM
  ======================================================= */

  if (
    selectedType ===
    "price_contract"
  ) {
    return (
      <PriceContractForm
        document={document}
        onClose={onClose}
        onGenerated={onGenerated}
        onBack={
          document
            ? null
            : () =>
                setSelectedType("")
        }
      />
    );
  }


  /* =======================================================
     FUTURE DOCUMENT FORMS

     Example:

     if (
       selectedType ===
       "quotation"
     ) {
       return (
         <QuotationForm
           document={document}
           onClose={onClose}
           onGenerated={onGenerated}
           onBack={
             document
               ? null
               : () =>
                   setSelectedType("")
           }
         />
       );
     }

  ======================================================= */


  /* =======================================================
     DOCUMENT SELECTION SCREEN
  ======================================================= */

  return (
    <div
      className="pdfgen-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="pdfgen-type-modal"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        {/* =============================================
            HEADER
        ============================================== */}

        <div className="pdfgen-modal-header">
          <div>
            <span className="pdfgen-modal-eyebrow">
              PDF GENERATOR
            </span>

            <h2>
              Select Document
            </h2>

            <p>
              Choose the business document
              you want to create.
            </p>
          </div>

          <button
            type="button"
            className="pdfgen-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>


        {/* =============================================
            CONTENT
        ============================================== */}

        <div className="pdfgen-type-content">

          {/* ===========================================
              AVAILABLE DOCUMENT TYPES
          ============================================ */}

          <div className="pdfgen-type-grid">
            {PDF_TYPES.map(
              (type) => {
                return (
                  <button
                    type="button"
                    key={type.key}
                    className={`pdfgen-type-card ${
                      !type.available
                        ? "is-disabled"
                        : ""
                    }`}
                    disabled={
                      !type.available
                    }
                    onClick={() => {
                      if (
                        !type.available
                      ) {
                        return;
                      }

                      setSelectedType(
                        type.key
                      );
                    }}
                  >
                    {/* ICON */}

                    <div className="pdfgen-type-icon">
                      {type.shortName}
                    </div>


                    {/* INFORMATION */}

                    <div className="pdfgen-type-info">
                      <span>
                        DOCUMENT TEMPLATE
                      </span>

                      <h3>
                        {type.title}
                      </h3>

                      <p>
                        {type.description}
                      </p>


                      {/* FOOTER */}

                      <div className="pdfgen-type-card-footer">
                        <strong>
                          {type.available
                            ? "Create Document"
                            : "Coming Soon"}
                        </strong>

                        {type.available && (
                          <span>
                            →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>


          {/* ===========================================
              FUTURE DOCUMENT INFORMATION
          ============================================ */}

          <div className="pdfgen-coming-soon">
            <span>
              ＋
            </span>

            <div>
              <strong>
                More document templates
              </strong>

              <p>
                Quotations, certificates,
                commercial offers and other
                business PDF formats can be
                added here without changing
                the main PDF Generator module.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PdfTypeModal;