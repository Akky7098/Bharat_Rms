const mongoose = require("mongoose");

const dispatchSchema = new mongoose.Schema(
  {
    /* =========================
       SALES ORDER LINK
    ========================= */

    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },

    /* =========================
       CREATED BY
    ========================= */

    dispatchPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =========================
       INVOICE DETAILS
    ========================= */

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    dispatchDate: {
      type: Date,
      required: true,
    },

    /* =========================
       DISPATCH DETAILS
    ========================= */

    dispatchQty: {
      type: Number,
      required: true,
    },

    invoiceValue: {
      type: Number,
      required: true,
    },

    ratePerKg: {
      type: Number,
      required: true,
    },

    /* =========================
       LOGISTICS
    ========================= */

    transporterName: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNumber: {
      type: String,
      trim: true,
      default: "",
    },

    lrNumber: {
      type: String,
      trim: true,
      default: "",
    },

    ewayBillNumber: {
      type: String,
      trim: true,
      default: "",
    },

    /* =========================
       DOCUMENTS
    ========================= */

    invoicePdf: {
      type: String,
      default: "",
    },

    lrCopyPdf: {
      type: String,
      default: "",
    },

    ewayBillPdf: {
      type: String,
      default: "",
    },

    /* =========================
       PAYMENT TRACKING
    ========================= */

    paymentDays: {
      type: Number,
      required: true,
    },

    paymentDueDate: {
      type: Date,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "partial",
        "paid",
        "overdue",
      ],
      default: "pending",
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      required: true,
    },

    /* =========================
       REMINDER TRACKING
    ========================= */

    lastReminderSent: {
      type: Date,
    },

    reminderCount: {
      type: Number,
      default: 0,
    },

    /* =========================
       DISPATCH STATUS
    ========================= */

    dispatchStatus: {
      type: String,
      enum: [
        "dispatched",
        "in_transit",
        "delivered",
      ],
      default: "dispatched",
    },

    /* =========================
       INTERNAL REMARKS
    ========================= */

    internalRemark: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Dispatch = mongoose.model("Dispatch", dispatchSchema);

module.exports = Dispatch;