import React, {
  useState,
} from "react";

import PriceContractForm from "./PriceContractForm";

const PDF_TYPES = [
  {
    key: "price_contract",
    title: "Price Contract",
    shortName: "PC",
    description:
      "Generate professional customer price contracts with commercial terms and conditions.",
    available: true,
  },

  /*
  ==========================================================
  FUTURE DOCUMENTS

  Add new documents here.

  Example:

  {
    key: "quotation",
    title: "Quotation",
    shortName: "QT",
    description:
      "Generate professional customer quotations.",
    available: true,
  },

  {
    key: "certificate",
    title: "Certificate",
    shortName: "CERT",
    description:
      "Generate customer certificates.",
    available: true,
  },
  ==========================================================
  */
];

const PdfTypeModal = ({
  document,
  onClose,
  onGenerated,
}) => {
  const [
    selectedType,
    setSelectedType,
  ] = useState(
    document?.documentType || ""
  );

  /* =======================================================
     PRICE CONTRACT
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
     DOCUMENT SELECTOR
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
        <div className="pdfgen-modal-header">
          <div>
            <span className="pdfgen-modal-eyebrow">
              PDF GENERATOR
            </span>

            <h2>
              Select Document
            </h2>

            <p>
              Select the business document
              you want to generate.
            </p>
          </div>

          <button
            type="button"
            className="pdfgen-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="pdfgen-type-content">
          <div className="pdfgen-type-grid">
            {PDF_TYPES.map(
              (type) => (
                <button
                  type="button"
                  key={type.key}
                  className="pdfgen-type-card"
                  disabled={
                    !type.available
                  }
                  onClick={() =>
                    setSelectedType(
                      type.key
                    )
                  }
                >
                  <div className="pdfgen-type-icon">
                    {type.shortName}
                  </div>

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

                    <div className="pdfgen-type-card-footer">
                      <strong>
                        Create Document
                      </strong>

                      <span>
                        →
                      </span>
                    </div>
                  </div>
                </button>
              )
            )}
          </div>

          <div className="pdfgen-coming-soon">
            <span>
              ＋
            </span>

            <div>
              <strong>
                More document templates
              </strong>

              <p>
                Quotations,
                certificates,
                commercial offers and
                other PDF formats can
                be added here later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfTypeModal;