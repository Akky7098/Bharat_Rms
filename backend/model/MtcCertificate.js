const mongoose = require("mongoose");

const chemicalResultSchema = new mongoose.Schema(
  {
    element: {
      type: String,
      required: true,
      trim: true, // C, Si, Mn, P, S, Cr, Mo, V, Ni+Cu
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
      type: mongoose.Schema.Types.Mixed, // number or "X"
      required: true,
    },
  },
  { _id: false }
);

const mtcCertificateSchema = new mongoose.Schema(
  {
    mtcProvider: {
  type: String,
  enum: ["gloria"],
  default: "gloria",
  required: true,
},

messers: {
  type: String,
  default: "",
  trim: true,
},

companyName: {
  type: String,
  default: "",
  trim: true,
},

orderNo: {
  type: String,
  required: true,
  trim: true,
},
    poNo: {
      type: String,
      default: "",
      trim: true,
    },
    fileNo: {
      type: String,
      required: true,
      trim: true,
    },
    mtcDate: {
      type: Date,
      required: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    pcs: {
      type: String,
      required: true,
      trim: true,
    },
    heatLotNo: {
      type: String,
      required: true,
      trim: true,
    },
    condition: {
      type: String,
      required: true,
      trim: true,
    },

    chemicalComposition: {
      type: [chemicalResultSchema],
      required: true,
    },

    hardness: {
      halfR1: {
        specMin: String,
        specMax: String,
        result: String,
      },
      halfR2: {
        specMin: String,
        specMax: String,
        result: String,
      },
    },

    hardenability: {
      halfR1: {
        specMin: String,
        specMax: String,
        result: String,
      },
      halfR2: {
        specMin: String,
        specMax: String,
        result: String,
      },
    },

    seat: {
      at: String,
      ah: String,
      bt: String,
      bh: String,
      ct: String,
      ch: String,
      dt: String,
      dh: String,
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MtcCertificate", mtcCertificateSchema);