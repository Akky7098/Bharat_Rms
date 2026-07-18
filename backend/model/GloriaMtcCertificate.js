const mongoose = require("mongoose");

const {
  MtcCertificate,
} = require("./MtcCertificate");

const gloriaMtcSchema = new mongoose.Schema(
  {
    messers: {
      type: String,
      default: "",
      trim: true,
    },

    fileNo: {
      type: String,
      required: true,
      trim: true,
    },

    hardness: {
      halfR1: {
        specMin: {
          type: String,
          default: "",
          trim: true,
        },

        specMax: {
          type: String,
          default: "",
          trim: true,
        },

        result: {
          type: String,
          default: "",
          trim: true,
        },
      },

      halfR2: {
        specMin: {
          type: String,
          default: "",
          trim: true,
        },

        specMax: {
          type: String,
          default: "",
          trim: true,
        },

        result: {
          type: String,
          default: "",
          trim: true,
        },
      },
    },

    hardenability: {
      halfR1: {
        specMin: {
          type: String,
          default: "",
          trim: true,
        },

        specMax: {
          type: String,
          default: "",
          trim: true,
        },

        result: {
          type: String,
          default: "",
          trim: true,
        },
      },

      halfR2: {
        specMin: {
          type: String,
          default: "",
          trim: true,
        },

        specMax: {
          type: String,
          default: "",
          trim: true,
        },

        result: {
          type: String,
          default: "",
          trim: true,
        },
      },
    },

    seat: {
      at: {
        type: String,
        default: "",
        trim: true,
      },

      ah: {
        type: String,
        default: "",
        trim: true,
      },

      bt: {
        type: String,
        default: "",
        trim: true,
      },

      bh: {
        type: String,
        default: "",
        trim: true,
      },

      ct: {
        type: String,
        default: "",
        trim: true,
      },

      ch: {
        type: String,
        default: "",
        trim: true,
      },

      dt: {
        type: String,
        default: "",
        trim: true,
      },

      dh: {
        type: String,
        default: "",
        trim: true,
      },
    },

    specifications: {
      type: [String],
      default: [],
    },

    remarks: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const GloriaMtcCertificate =
  mongoose.models.gloria ||
  MtcCertificate.discriminators
    ?.gloria ||
  MtcCertificate.discriminator(
    "gloria",
    gloriaMtcSchema
  );

module.exports = GloriaMtcCertificate;