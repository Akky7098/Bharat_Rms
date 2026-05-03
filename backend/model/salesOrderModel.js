const mongoose = require("mongoose");

const salesOrderSchema = new mongoose.Schema(
  {
    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderDate: {
      type: Date,
      required: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
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

    contactPersonEmailId: {
      type: String,
      trim: true,
    },

    productCategory: {
      type: String,
      enum: [
        "tool_steel",
        "die_steel",
        "plastic_mould_steel",
        "high_speed_steel",
        "alloy_steel",
        "carbon_steel",
      ],
      required: true,
    },

    grade: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
    },

    quantityInKg: {
      type: Number,
      required: true,
    },

    valueInRupees: {
      type: Number,
      required: true,
    },

    paymentTerms: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const SalesOrder = mongoose.model("SalesOrder", salesOrderSchema);

module.exports = SalesOrder;