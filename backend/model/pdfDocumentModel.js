const mongoose = require("mongoose");


/* =========================================================
   GENERATED PDF SCHEMA
========================================================= */

const generatedPdfSchema = new mongoose.Schema(
  {
    generated: {
      type: Boolean,
      default: false,
    },

    fileName: {
      type: String,
      default: "",
      trim: true,
    },

    filePath: {
      type: String,
      default: "",
      trim: true,
    },

    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    generatedAt: {
      type: Date,
      default: null,
    },

    revisionNo: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);


/* =========================================================
   PDF DOCUMENT MODEL

   IMPORTANT:

   This model is intentionally GENERIC.

   Current document:
   - Price Contract

   Future examples:
   - Quotation
   - Commercial Offer
   - Agreement
   - Certificate
   - Customer Declaration
   - Any other PDF form/template

========================================================= */

const pdfDocumentSchema = new mongoose.Schema(
  {
    /* =====================================================
       DOCUMENT TYPE

       Examples:

       price_contract
       quotation
       commercial_offer
       agreement
       certificate

       Do NOT use enum here because new PDF modules
       can be added in future without changing Mongo model.
    ===================================================== */

    documentType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },


    /* =====================================================
       DISPLAY TITLE

       Example:
       Price Contract
    ===================================================== */

    documentTitle: {
      type: String,
      required: true,
      trim: true,
    },


    /* =====================================================
       UNIQUE DOCUMENT NUMBER / REFERENCE

       Example:

       PC-2026-0001

       Future:

       QT-2026-0001
       CO-2026-0001
    ===================================================== */

    documentNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },


    /* =====================================================
       CUSTOMER / COMPANY

       Kept outside formData because this is commonly
       required for:

       - Listing
       - Searching
       - Dashboard
       - PDF file naming
    ===================================================== */

    customerName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },


    companyName: {
      type: String,
      trim: true,
      default: "",
    },


    /* =====================================================
       REFERENCE NUMBER

       Optional external/customer reference.
    ===================================================== */

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },


    /* =====================================================
       FORM DATA

       This contains all fields entered in the popup/form.

       For Price Contract it can contain:

       {
         price,
         priceBasis,
         validity,
         specification,
         taxesAndDuties,
         paymentTerms,
         documents,
         penalty,
         warranty,
         qualityRejection,
         remarks,
         specialNote,
         annexures,
         customerName,
         processedBy,
         approvedBy
       }

       Future document types can store completely
       different fields without changing this schema.
    ===================================================== */

    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },


    /* =====================================================
       GENERATED PDF INFORMATION
    ===================================================== */

    pdf: {
      type: generatedPdfSchema,
      default: () => ({
        generated: false,
      }),
    },


    /* =====================================================
       REVISION

       Revision increases when a user edits the form
       and generates the PDF again.
    ===================================================== */

    revisionCount: {
      type: Number,
      default: 0,
      min: 0,
    },


    /* =====================================================
       STATUS

       draft
       generated
       revised
       cancelled
    ===================================================== */

    status: {
      type: String,

      enum: [
        "draft",
        "generated",
        "revised",
        "cancelled",
      ],

      default: "draft",

      index: true,
    },


    /* =====================================================
       OPTIONAL REMARK
    ===================================================== */

    remark: {
      type: String,
      default: "",
      trim: true,
    },


    /* =====================================================
       USER WHO CREATED DOCUMENT
    ===================================================== */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },


    createdByName: {
      type: String,
      default: "",
      trim: true,
    },


    /* =====================================================
       LAST UPDATED BY
    ===================================================== */

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },


    updatedByName: {
      type: String,
      default: "",
      trim: true,
    },


    /* =====================================================
       SOFT DELETE

       Better than permanently deleting business documents.
    ===================================================== */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },


    deletedAt: {
      type: Date,
      default: null,
    },


    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },

  {
    timestamps: true,
  }
);


/* =========================================================
   INDEXES
========================================================= */


/*
 * Dashboard/list query:
 *
 * documentType + active records + latest first
 */

pdfDocumentSchema.index({
  documentType: 1,
  isDeleted: 1,
  createdAt: -1,
});


/*
 * Search by customer
 */

pdfDocumentSchema.index({
  customerName: 1,
  documentType: 1,
});


/*
 * Search by document number
 */

pdfDocumentSchema.index({
  documentNumber: 1,
  documentType: 1,
});


/*
 * User's documents
 */

pdfDocumentSchema.index({
  createdBy: 1,
  documentType: 1,
  createdAt: -1,
});


/* =========================================================
   MODEL
========================================================= */

const PdfDocument = mongoose.model(
  "PdfDocument",
  pdfDocumentSchema
);


module.exports = PdfDocument;