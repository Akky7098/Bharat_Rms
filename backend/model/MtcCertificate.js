const mongoose = require("mongoose");

const chemicalResultSchema = new mongoose.Schema(
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

    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const mtcCertificateSchema = new mongoose.Schema(
  {
    /*
     * Mongoose discriminator key.
     *
     * MongoDB will automatically store:
     * mtcProvider: "gloria"
     * mtcProvider: "bharat"
     */
    mtcProvider: {
      type: String,
      required: true,
      enum: ["gloria", "bharat"],
      index: true,
    },

    /*
     * Fields common to every TC provider.
     */
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

    chemicalComposition: {
      type: [chemicalResultSchema],
      default: [],
    },

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
 * Retained for frontend and old record compatibility.
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

    /*
     * This tells Mongoose to use mtcProvider
     * for selecting the provider-specific schema.
     */
    discriminatorKey: "mtcProvider",

    /*
     * Prevent Mongoose from creating a separate
     * collection for every provider.
     */
    collection: "mtccertificates",

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

mtcCertificateSchema.index({
  mtcProvider: 1,
  mtcDate: -1,
});

mtcCertificateSchema.index({
  companyName: 1,
  grade: 1,
  heatLotNo: 1,
});

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