const mongoose = require("mongoose");

const coldCallSchema = new mongoose.Schema(
  {
    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    activityType: {
      type: String,
      enum: ["calling", "visit", "email"],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPersonNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const ColdCall = mongoose.model("ColdCall", coldCallSchema);

module.exports = ColdCall;