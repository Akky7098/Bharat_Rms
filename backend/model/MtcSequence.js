const mongoose = require(
  "mongoose"
);

/* =========================================================
   MTC SEQUENCE

   Used for atomic certificate number generation.

   Example key:

   sbe_production_260827
   sbe_customer_po_260827
========================================================= */

const mtcSequenceSchema =
  new mongoose.Schema(
    {
      key: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      sequence: {
        type: Number,
        required: true,
        default: 10,
      },
    },
    {
      timestamps: true,
    }
  );

const MtcSequence =
  mongoose.models.MtcSequence ||
  mongoose.model(
    "MtcSequence",
    mtcSequenceSchema
  );

module.exports =
  MtcSequence;