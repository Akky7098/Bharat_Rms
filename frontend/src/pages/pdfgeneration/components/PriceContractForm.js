import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPdfDocument,
  updatePdfDocument,
  generatePdfDocument,
  getPdfFileUrl,
} from "../../../services/pdfDocumentService";

import "./PriceContractForm.css";


/* =========================================================
   PRICE CONTRACT EDITABLE DATA

   Only these fields are entered from frontend.

   Everything else comes from backend template.
========================================================= */

const DEFAULT_FORM_DATA = {
  customerName: "",

  steelType: "tool_die",

  priceBasis: "",

  validityFrom: "",

  validityTo: "",

  paymentTerms: "",

  penalty:
    "Interest cost will be bond by ----, if delay in making payment",

  remarks: "",
};


/* =========================================================
   DATE HELPERS

   Existing saved value may be:
   12/12/2026
   or
   2026-12-12

   HTML date input needs YYYY-MM-DD.
========================================================= */

const toDateInputValue = (
  value
) => {
  if (!value) {
    return "";
  }

  const raw =
    String(value).trim();


  /* Already YYYY-MM-DD */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw
    )
  ) {
    return raw;
  }


  /* DD/MM/YYYY */

  const slashMatch =
    raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );


  if (
    slashMatch
  ) {
    const day =
      String(
        slashMatch[1]
      ).padStart(
        2,
        "0"
      );


    const month =
      String(
        slashMatch[2]
      ).padStart(
        2,
        "0"
      );


    const year =
      slashMatch[3];


    return `${year}-${month}-${day}`;
  }


  return "";
};


/* =========================================================
   FORMAT DATE FOR PDF

   Backend PDF should display DD/MM/YYYY.
========================================================= */

const formatDateForPdf = (
  value
) => {
  if (!value) {
    return "";
  }


  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (!match) {
    return value;
  }


  return `${match[3]}/${match[2]}/${match[1]}`;
};


/* =========================================================
   NORMALIZE EXISTING DOCUMENT
========================================================= */

const normalizeExistingData = (
  document
) => {
  const data =
    document?.formData ||
    {};


  return {

    customerName:
      document?.customerName ??
      data?.customerName ??
      data?.customer_name ??
      "",


    steelType:
      data?.steelType ??
      data?.steel_type ??
      "tool_die",


    priceBasis:
      data?.priceBasis ??
      data?.price_basis ??
      "",


    validityFrom:
      toDateInputValue(
        data?.validityFrom ??
        data?.validity_from ??
        ""
      ),


    validityTo:
      toDateInputValue(
        data?.validityTo ??
        data?.validity_to ??
        ""
      ),


    paymentTerms:
      data?.paymentTerms ??
      data?.payment_terms ??
      "",


    penalty:
      data?.penalty ??
      DEFAULT_FORM_DATA.penalty,


    remarks:
      data?.remarks ??
      "",
  };
};


/* =========================================================
   PRICE CONTRACT FORM
========================================================= */

const PriceContractForm = ({
  document = null,
  onClose,
  onBack,
  onGenerated,
}) => {

  /* =======================================================
     MODE
  ======================================================= */

  const isEditMode =
    Boolean(
      document?._id
    );


  /* =======================================================
     INITIAL DATA
  ======================================================= */

  const initialData =
    useMemo(
      () => {

        if (
          document?._id
        ) {
          return normalizeExistingData(
            document
          );
        }


        return {
          ...DEFAULT_FORM_DATA,
        };

      },
      [document]
    );


  /* =======================================================
     STATE
  ======================================================= */

  const [
    formData,
    setFormData,
  ] = useState(
    initialData
  );


  const [
    saving,
    setSaving,
  ] = useState(
    false
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  /* =======================================================
     RESET WHEN DOCUMENT CHANGES
  ======================================================= */

  useEffect(
    () => {

      if (
        document?._id
      ) {

        setFormData(
          normalizeExistingData(
            document
          )
        );

      } else {

        setFormData({
          ...DEFAULT_FORM_DATA,
        });

      }


      setError("");

    },
    [document]
  );


  /* =======================================================
     CHANGE HANDLER
  ======================================================= */

  const handleChange = (
    e
  ) => {

    const {
      name,
      value,
    } = e.target;


    setFormData(
      (prev) => ({
        ...prev,

        [name]:
          value,
      })
    );


    if (
      error
    ) {
      setError("");
    }

  };


  /* =======================================================
     PAYLOAD
  ======================================================= */

  const buildPayload =
    () => {

      return {

        documentType:
          "price_contract",


        documentTitle:
          "Price Contract",


        /*
         * Keep customerName at top level.
         *
         * Backend PDF service already reads:
         * pdfDocument.customerName
         */

        customerName:
          formData
            .customerName
            .trim(),


        /*
         * Keep steelType at top level too.
         */

        steelType:
          formData
            .steelType,


        formData: {

          /*
           * Also keep customerName inside
           * formData for backwards compatibility.
           */

          customerName:
            formData
              .customerName
              .trim(),


          /*
           * Used by backend template
           * to control the introduction.
           *
           * tool_die
           * alloy
           */

          steelType:
            formData
              .steelType,


          priceBasis:
            formData
              .priceBasis
              .trim(),


          /*
           * Store/display in the PDF
           * as DD/MM/YYYY.
           */

          validityFrom:
            formatDateForPdf(
              formData
                .validityFrom
            ),


          validityTo:
            formatDateForPdf(
              formData
                .validityTo
            ),


          paymentTerms:
            formData
              .paymentTerms
              .trim(),


          penalty:
            formData
              .penalty
              .trim(),


          remarks:
            formData
              .remarks
              .trim(),

        },

      };

    };


  /* =======================================================
     GENERATE PDF

     IMPORTANT:
     Do NOT open blank tab before generation.

     User remains on this form.

     Button becomes:
     "Generating..."

     After backend returns successfully,
     finished PDF opens directly.
  ======================================================= */

  const handleGenerate =
    async (
      e
    ) => {

      e.preventDefault();


      /* Prevent duplicate click */

      if (
        saving
      ) {
        return;
      }


      try {

        setSaving(
          true
        );


        setError(
          ""
        );


        const payload =
          buildPayload();


        let documentId =
          document?._id;


        /* ===============================================
           CREATE NEW DOCUMENT
        =============================================== */

        if (
          !documentId
        ) {

          const createResponse =
            await createPdfDocument(
              payload
            );


          const createdDocument =
            createResponse
              ?.data ||
            createResponse
              ?.document ||
            createResponse;


          documentId =
            createdDocument
              ?._id;


          if (
            !documentId
          ) {

            throw new Error(
              "Price Contract was created but document ID was not returned."
            );

          }

        }


        /* ===============================================
           UPDATE EXISTING DOCUMENT
        =============================================== */

        else {

          await updatePdfDocument(
            documentId,
            payload
          );

        }


        /* ===============================================
           GENERATE PDF
        =============================================== */

        const generateResponse =
          await generatePdfDocument(
            documentId
          );


        const generatedDocument =
          generateResponse
            ?.data ||
          generateResponse
            ?.document ||
          generateResponse;


        /* ===============================================
           GET PDF URL
        =============================================== */

        const fileUrl =
          generatedDocument
            ?.pdf
            ?.fileUrl ||
          generateResponse
            ?.pdf
            ?.fileUrl ||
          generateResponse
            ?.fileUrl;


        if (
          !fileUrl
        ) {

          throw new Error(
            "Price Contract generated successfully but PDF URL was not returned."
          );

        }


        const fullPdfUrl =
          getPdfFileUrl(
            fileUrl
          );


        /* ===============================================
           REFRESH MAIN PDF LIST
        =============================================== */

        if (
          onGenerated
        ) {

          await onGenerated(
            generatedDocument
          );

        }


        /* ===============================================
           OPEN ONLY FINISHED PDF

           No about:blank loading page.
        =============================================== */

        window.open(
          fullPdfUrl,
          "_blank",
          "noopener,noreferrer"
        );


      } catch (
        err
      ) {

        console.error(
          "Price Contract generation failed:",
          err
        );


        setError(
          err
            ?.response
            ?.data
            ?.message ||
          err
            ?.message ||
          "Failed to generate Price Contract."
        );


      } finally {

        setSaving(
          false
        );

      }

    };


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div
      className="pc-form-overlay"

      onMouseDown={
        saving
          ? undefined
          : onClose
      }
    >

      <div
        className="pc-form-modal pc-simple-form-modal"

        onMouseDown={(
          e
        ) =>
          e.stopPropagation()
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="pc-form-header">


          <div className="pc-form-header-left">


            {onBack && (

              <button
                type="button"

                className="pc-form-back"

                onClick={
                  onBack
                }

                disabled={
                  saving
                }
              >
                ‹
              </button>

            )}


            <div>


              <span className="pc-form-eyebrow">
                PRICE CONTRACT
              </span>


              <h2>

                {isEditMode
                  ? "Edit Price Contract"
                  : "Generate Price Contract"}

              </h2>


              <p>
                Enter the customer and
                commercial values for this
                contract. All remaining
                content comes from the
                approved backend PDF
                template.
              </p>


            </div>


          </div>


          <button
            type="button"

            className="pc-form-close"

            onClick={
              onClose
            }

            disabled={
              saving
            }
          >
            ×
          </button>


        </div>


        {/* =================================================
            EXISTING DOCUMENT INFO
        ================================================= */}

        {isEditMode && (

          <div className="pc-document-info">


            <div>

              <span>
                Document No.
              </span>


              <strong>
                {document
                  ?.documentNumber ||
                  "-"}
              </strong>

            </div>


            <div>

              <span>
                Revision
              </span>


              <strong>

                Rev.{" "}

                {Number(
                  document
                    ?.revisionCount ||
                  0
                )}

              </strong>

            </div>


            <div>

              <span>
                Status
              </span>


              <strong>
                {document
                  ?.status ||
                  "Draft"}
              </strong>

            </div>


          </div>

        )}


        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="pc-form pc-simple-form"

          onSubmit={
            handleGenerate
          }
        >


          {/* ERROR */}

          {error && (

            <div className="pc-alert pc-alert-error">

              <span>
                !
              </span>


              <p>
                {error}
              </p>

            </div>

          )}


          {/* =================================================
              INTRO
          ================================================= */}

          <div className="pc-simple-intro">


            <div className="pc-simple-intro-icon">
              PC
            </div>


            <div>


              <strong>
                Price Contract Terms
              </strong>


              <p>
                Enter the customer name,
                steel type and the following
                commercial values for this contract.
              </p>


            </div>


          </div>


          {/* =================================================
              COMMERCIAL TERMS
          ================================================= */}

          <section className="pc-section pc-simple-section">


            <div className="pc-section-heading">


              <div className="pc-section-number">
                01
              </div>


              <div>


                <h3>
                  Commercial Terms
                </h3>


                <p>
                  Enter the applicable
                  values for this contract.
                </p>


              </div>


            </div>


            <div className="pc-form-grid">


              {/* ===========================================
                  CUSTOMER NAME
              ============================================ */}

              <div className="pc-field pc-full pc-customer-name-field">


                <label>
                  Customer Name
                </label>


                <input
                  type="text"

                  name="customerName"

                  value={
                    formData
                      .customerName
                  }

                  onChange={
                    handleChange
                  }

                  placeholder="Enter customer name"

                  disabled={
                    saving
                  }

                  autoComplete="organization"
                />


                <small className="pc-field-help">
                  This name will appear in
                  the Price Contract table
                  above the Price row.
                </small>


              </div>


              {/* ===========================================
                  STEEL TYPE
              ============================================ */}

              <div className="pc-field pc-full pc-steel-type-field">


                <label>
                  Steel Type
                </label>


                <select
                  name="steelType"

                  value={
                    formData
                      .steelType
                  }

                  onChange={
                    handleChange
                  }

                  disabled={
                    saving
                  }
                >

                  <option value="tool_die">
                    Tool &amp; Die Steel
                  </option>


                  <option value="alloy">
                    Alloy Steel
                  </option>


                </select>


                <small className="pc-field-help">
                  This selection controls the
                  steel description shown in
                  the Price Contract introduction.
                </small>


              </div>


              {/* ===========================================
                  PRICE BASIS
              ============================================ */}

              <div className="pc-field">


                <label>
                  Price Basis
                </label>


                <input
                  type="text"

                  name="priceBasis"

                  value={
                    formData
                      .priceBasis
                  }

                  onChange={
                    handleChange
                  }

                  placeholder="Enter price basis"

                  disabled={
                    saving
                  }

                  autoComplete="off"
                />


                <small className="pc-field-help">
                  Example: Ex-Works,
                  FOR Destination,
                  as per discussion
                </small>


              </div>


              {/* ===========================================
                  VALIDITY - FROM / TO DATE
              ============================================ */}

              <div className="pc-field pc-validity-field">


                <label>
                  Validity
                </label>


                <div className="pc-validity-range">


                  <div className="pc-validity-date-box">


                    <span className="pc-validity-date-label">
                      From
                    </span>


                    <input
                      type="date"

                      name="validityFrom"

                      value={
                        formData
                          .validityFrom
                      }

                      onChange={
                        handleChange
                      }

                      disabled={
                        saving
                      }
                    />


                  </div>


                  <div className="pc-validity-range-separator">
                    TO
                  </div>


                  <div className="pc-validity-date-box">


                    <span className="pc-validity-date-label">
                      Till
                    </span>


                    <input
                      type="date"

                      name="validityTo"

                      value={
                        formData
                          .validityTo
                      }

                      onChange={
                        handleChange
                      }

                      min={
                        formData
                          .validityFrom ||
                        undefined
                      }

                      disabled={
                        saving
                      }
                    />


                  </div>


                </div>


                <small className="pc-field-help">
                  Select the From date and
                  Till date for this Price Contract.
                </small>


              </div>


              {/* ===========================================
                  PAYMENT TERMS
              ============================================ */}

              <div className="pc-field pc-full">


                <label>
                  Payment Terms
                </label>


                <textarea
                  name="paymentTerms"

                  value={
                    formData
                      .paymentTerms
                  }

                  onChange={
                    handleChange
                  }

                  rows="3"

                  placeholder="Enter payment terms"

                  disabled={
                    saving
                  }
                />


              </div>


              {/* ===========================================
                  PENALTY
              ============================================ */}

              <div className="pc-field pc-full">


                <label>
                  Penalty
                </label>


                <textarea
                  name="penalty"

                  value={
                    formData
                      .penalty
                  }

                  onChange={
                    handleChange
                  }

                  rows="3"

                  disabled={
                    saving
                  }
                />


                <small className="pc-field-help">
                  Standard wording is
                  pre-filled. Edit only
                  where required.
                </small>


              </div>


              {/* ===========================================
                  REMARKS
              ============================================ */}

              <div className="pc-field pc-full">


                <label>
                  Remarks
                </label>


                <textarea
                  name="remarks"

                  value={
                    formData
                      .remarks
                  }

                  onChange={
                    handleChange
                  }

                  rows="3"

                  placeholder="Enter remarks, if any"

                  disabled={
                    saving
                  }
                />


              </div>


            </div>


          </section>


          {/* =================================================
              TEMPLATE INFO
          ================================================= */}

          <div className="pc-template-info">


            <div className="pc-template-info-icon">
              ✓
            </div>


            <div>


              <strong>
                Approved Price Contract Template
              </strong>


              <p>
                Customer name, steel type,
                price, specification, taxes,
                documents, warranty,
                quality rejection,
                special note, annexure,
                company details and
                branding are generated
                from the backend template.
              </p>


            </div>


          </div>


          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="pc-form-actions">


            <div className="pc-action-note">


              <span>
                i
              </span>


              <p>

                {saving
                  ? "PDF generation is in progress. Please wait."
                  : isEditMode
                  ? "Changes will be saved and a new PDF revision will be generated."
                  : "Click Generate Price Contract once to create the PDF."}

              </p>


            </div>


            <div className="pc-action-buttons">


              <button
                type="button"

                className="pc-cancel-btn"

                onClick={
                  onClose
                }

                disabled={
                  saving
                }
              >
                Cancel
              </button>


              <button
                type="submit"

                className="pc-generate-btn"

                disabled={
                  saving
                }
              >

                {saving ? (

                  <>

                    <span className="pc-spinner" />

                    Generating...

                  </>

                ) : (

                  <>

                    <span>
                      PDF
                    </span>


                    {isEditMode
                      ? "Save & Regenerate"
                      : "Generate Price Contract"}

                  </>

                )}

              </button>


            </div>


          </div>


        </form>


      </div>


    </div>

  );

};


export default PriceContractForm;