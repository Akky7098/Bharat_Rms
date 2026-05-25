const mongoose = require("mongoose");

/* =========================
   ADJUSTED INVOICE SUB-SCHEMA
========================= */

const adjustedInvoiceSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispatch",
      index: true,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },

    invoiceDate: {
      type: Date,
    },

    invoiceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    adjustedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingAfterAdjustment: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/* =========================
   PAYMENT / RECEIPT HISTORY
========================= */

const paymentReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      trim: true,
      index: true,
    },

    receiptDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ["bank_transfer", "cheque", "upi", "cash", "adjustment", "tds", "credit_note", "other"],
      default: "bank_transfer",
    },

    bankReferenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    tdsAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductionReason: {
      type: String,
      trim: true,
      default: "",
    },

    adjustedInvoices: [adjustedInvoiceSchema],

    source: {
      type: String,
      enum: ["manual", "tally"],
      default: "manual",
      index: true,
    },

    tallyVoucherId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },

    syncedAt: {
      type: Date,
    },

    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      email: String,
      role: String,
    },
  },
  { timestamps: true }
);

/* =========================
   INVOICE RECEIVABLE
========================= */

const invoiceReceivableSchema = new mongoose.Schema(
  {
    dispatchId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Dispatch",
  index: true,
},
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrderForm",
      index: true,
    },

    salesOrderNo: {
      type: String,
      trim: true,
      index: true,
    },

   invoiceNumber: {
  type: String,
  required: true,
  trim: true,
},

    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    invoiceAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    receivedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tdsAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue", "disputed", "written_off"],
      default: "pending",
      index: true,
    },

    overdueDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastPaymentDate: {
      type: Date,
    },

    reminder: {
      beforeDueDateSent: {
        type: Boolean,
        default: false,
      },
      dueDateSent: {
        type: Boolean,
        default: false,
      },
      overdueReminderCount: {
        type: Number,
        default: 0,
      },
      lastReminderSentAt: Date,
      lastReminderType: {
        type: String,
        enum: ["before_due_date", "due_date", "overdue", null],
        default: null,
      },
    },

    tallyVoucherId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    tallyBillRef: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    source: {
      type: String,
      enum: ["dispatch", "manual", "tally"],
      default: "dispatch",
      index: true,
    },

    syncedAt: {
      type: Date,
    },

    internalRemark: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

/* =========================
   CUSTOMER RECEIVABLE / LEDGER
========================= */

const receivableSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    normalizedCompanyName: {
  type: String,
  required: true,
  lowercase: true,
  trim: true,
},

    tallyLedgerName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    tallyLedgerGuid: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    /* =========================
       SALES OWNERSHIP / ACCESS
    ========================= */

    salesPersons: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          index: true,
        },
        name: String,
        email: {
          type: String,
          lowercase: true,
          trim: true,
        },
      },
    ],

    primarySalesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /* =========================
       CUSTOMER CONTACT SNAPSHOT
    ========================= */

    contactPersonName: {
      type: String,
      trim: true,
      default: "",
    },

    contactPersonEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    contactPersonNumber: {
      type: String,
      trim: true,
      default: "",
    },

    /* =========================
       LEDGER SUMMARY
    ========================= */

    totalInvoiceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalReceivedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalTdsAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDeductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPendingAmount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    totalOverdueAmount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    oldestOverdueDays: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    lastInvoiceDate: {
      type: Date,
    },

    lastPaymentDate: {
      type: Date,
    },

    /* =========================
       CREDIT / RISK CONTROL
    ========================= */

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    riskStatus: {
      type: String,
      enum: ["normal", "watch", "hold", "blocked"],
      default: "normal",
      index: true,
    },

    managementApprovalRequired: {
      type: Boolean,
      default: false,
      index: true,
    },

    riskRemark: {
      type: String,
      trim: true,
      default: "",
    },

    /* =========================
       INVOICES + PAYMENTS
    ========================= */

    invoices: [invoiceReceivableSchema],

    paymentReceipts: [paymentReceiptSchema],

    /* =========================
       TALLY SYNC TRACKING
    ========================= */

    syncStatus: {
      type: String,
      enum: ["not_synced", "synced", "partial", "failed"],
      default: "not_synced",
      index: true,
    },

    lastSyncedAt: {
      type: Date,
    },

    lastSyncError: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      enum: ["manual", "dispatch", "tally"],
      default: "dispatch",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* =========================
   AUTO CALCULATIONS
========================= */

receivableSchema.pre("validate", function () {
  const today = new Date();

  let totalInvoiceAmount = 0;
  let totalReceivedAmount = 0;
  let totalTdsAmount = 0;
  let totalDeductionAmount = 0;
  let totalPendingAmount = 0;
  let totalOverdueAmount = 0;
  let oldestOverdueDays = 0;

  this.invoices = this.invoices.map((invoice) => {
    const invoiceAmount = Number(invoice.invoiceAmount || 0);
    const receivedAmount = Number(invoice.receivedAmount || 0);
    const tdsAmount = Number(invoice.tdsAmount || 0);
    const deductionAmount = Number(invoice.deductionAmount || 0);

    const pendingAmount = Math.max(
      invoiceAmount - receivedAmount - tdsAmount - deductionAmount,
      0
    );

    invoice.pendingAmount = pendingAmount;

    let overdueDays = 0;

    if (invoice.dueDate && pendingAmount > 0) {
      const dueDate = new Date(invoice.dueDate);
      if (today > dueDate) {
        overdueDays = Math.floor(
          (today - dueDate) / (1000 * 60 * 60 * 24)
        );
      }
    }

    invoice.overdueDays = overdueDays;

    if (pendingAmount === 0 && invoiceAmount > 0) {
      invoice.status = "paid";
    } else if (overdueDays > 0) {
      invoice.status = receivedAmount > 0 ? "partial" : "overdue";
      if (receivedAmount > 0) invoice.status = "overdue";
    } else if (receivedAmount > 0 || tdsAmount > 0 || deductionAmount > 0) {
      invoice.status = "partial";
    } else {
      invoice.status = "pending";
    }

    totalInvoiceAmount += invoiceAmount;
    totalReceivedAmount += receivedAmount;
    totalTdsAmount += tdsAmount;
    totalDeductionAmount += deductionAmount;
    totalPendingAmount += pendingAmount;

    if (overdueDays > 0 && pendingAmount > 0) {
      totalOverdueAmount += pendingAmount;
      oldestOverdueDays = Math.max(oldestOverdueDays, overdueDays);
    }

    return invoice;
  });

  this.totalInvoiceAmount = totalInvoiceAmount;
  this.totalReceivedAmount = totalReceivedAmount;
  this.totalTdsAmount = totalTdsAmount;
  this.totalDeductionAmount = totalDeductionAmount;
  this.totalPendingAmount = totalPendingAmount;
  this.totalOverdueAmount = totalOverdueAmount;
  this.oldestOverdueDays = oldestOverdueDays;

  if (this.totalOverdueAmount > 0 && this.oldestOverdueDays >= 30) {
    this.riskStatus = "hold";
    this.managementApprovalRequired = true;
  } else if (this.totalOverdueAmount > 0 && this.oldestOverdueDays >= 15) {
    this.riskStatus = "watch";
    this.managementApprovalRequired = true;
  } else if (this.creditLimit > 0 && this.totalPendingAmount > this.creditLimit) {
    this.riskStatus = "watch";
    this.managementApprovalRequired = true;
  } else {
    this.riskStatus = "normal";
    this.managementApprovalRequired = false;
  }
});

/* =========================
   INDEXES
========================= */

receivableSchema.index(
  { normalizedCompanyName: 1 },
  { unique: true }
);

receivableSchema.index({
  "salesPersons.userId": 1,
  totalPendingAmount: -1,
});

receivableSchema.index({
  totalOverdueAmount: -1,
  oldestOverdueDays: -1,
});

receivableSchema.index({
  "invoices.invoiceNumber": 1,
});

receivableSchema.index({
  lastSyncedAt: -1,
});

const Receivable = mongoose.model("Receivable", receivableSchema);

module.exports = Receivable;                                                         