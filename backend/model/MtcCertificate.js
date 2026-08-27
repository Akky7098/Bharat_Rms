const mongoose = require("mongoose");

/* =========================================================
   COMMON CHEMICAL RESULT SCHEMA
========================================================= */

const chemicalResultSchema =
  new mongoose.Schema(
    {
      element: {
        type: String,
        required: true,
        trim: true,
      },

      min: {
        type: Number,
        default: null,
      },

      max: {
        type: Number,
        default: null,
      },

      /*
       * Mixed because some providers may store:
       *
       * 0.54
       * "0.54"
       * "-"
       * "---"
       * "X"
       */
      result: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   BASE MTC CERTIFICATE
========================================================= */

const mtcCertificateSchema =
  new mongoose.Schema(
    {
      /*
       * Provider discriminator.
       *
       * Examples:
       *
       * gloria
       * bharat
       * sbe_germany
       */
      mtcProvider: {
        type: String,
        required: true,

        enum: [
          "gloria",
          "bharat",
          "sbe_germany",
        ],

        index: true,
      },

      /* =====================================================
         COMMON CUSTOMER / COMPANY FIELDS
      ===================================================== */

      companyName: {
        type: String,
        default: "",
        trim: true,
        index: true,
      },

      customerName: {
        type: String,
        default: "",
        trim: true,
      },

      customerAddress: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         ORDER INFORMATION
      ===================================================== */

      orderNo: {
        type: String,
        default: "",
        trim: true,
        index: true,
      },

      poNo: {
        type: String,
        default: "",
        trim: true,
      },

      invoiceNo: {
        type: String,
        default: "",
        trim: true,
        index: true,
      },

      mtcDate: {
        type: Date,
        required: true,
        index: true,
      },

      /* =====================================================
         MATERIAL INFORMATION
      ===================================================== */

      grade: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      heatLotNo: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      size: {
        type: String,
        default: "",
        trim: true,
      },

      weight: {
        type: String,
        default: "",
        trim: true,
      },

      pcs: {
        type: String,
        default: "",
        trim: true,
      },

      condition: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         CHEMICAL COMPOSITION
      ===================================================== */

      chemicalComposition: {
        type: [chemicalResultSchema],
        default: [],
      },

      /* =====================================================
         GENERATED PDF DETAILS
      ===================================================== */

      pdf: {
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

        generatedAt: {
          type: Date,
          default: null,
        },
      },

      /*
       * Retained for frontend and old records.
       */
      pdfUrl: {
        type: String,
        default: "",
        trim: true,
      },

      pdfFileName: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,

      discriminatorKey: "mtcProvider",

      collection: "mtccertificates",

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   INDEXES
========================================================= */

mtcCertificateSchema.index({
  mtcProvider: 1,
  mtcDate: -1,
});

mtcCertificateSchema.index({
  companyName: 1,
  grade: 1,
  heatLotNo: 1,
});

/* =========================================================
   MODEL
========================================================= */

const MtcCertificate =
  mongoose.models.MtcCertificate ||
  mongoose.model(
    "MtcCertificate",
    mtcCertificateSchema
  );

module.exports = {
  MtcCertificate,
  chemicalResultSchema,
};