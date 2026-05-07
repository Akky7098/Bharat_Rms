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
      lowercase: true,
    },

    additionalEmails: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    productCategory: {
      type: String,
      enum: [
        "tool_steel",
        "die_steel",
        "plastic_mould_steel",
        "high_speed_steel",
        "alloy_steel",
        "carbon_steel",
        "other",
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

    ratePerKg: {
      type: Number,
      required: true,
    },

    paymentTerms: {
      type: String,
      required: true,
      trim: true,
    },

    totalDispatchedQty: {
      type: Number,
      default: 0,
    },

    pendingDispatchQty: {
      type: Number,
      default: 0,
    },

    orderStatus: {
      type: String,
      enum: ["pending_dispatch", "partial_dispatch", "fully_dispatched"],
      default: "pending_dispatch",
    },
  },
  {
    timestamps: true,
  }
);

const SalesOrder = mongoose.model("SalesOrder", salesOrderSchema);

module.exports = SalesOrder;