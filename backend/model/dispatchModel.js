const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    fileName: String,
    filePath: String,
    fileUrl: String,
    mimeType: String,
    fileSize: { type: Number, default: 0 },
    uploadedAt: Date,
  },
  { _id: false }
);

const dispatchSchema = new mongoose.Schema(
  {
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrderForm",
      required: true,
      index: true,
    },

    salesOrderNo: { type: String, trim: true, index: true },
    poNumber: { type: String, trim: true },
    companyName: { type: String, required: true, trim: true, index: true },

    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    salesPersonName: String,
    salesPersonEmail: { type: String, lowercase: true, trim: true },
    salesPersonMobile: String,

    contactPersonName: { type: String, required: true, trim: true },
    contactPersonEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    contactPersonNumber: { type: String, required: true, trim: true },
    shippingAddress: { type: String, trim: true, default: "" },

    dispatchCreatedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: String,
      email: { type: String, lowercase: true, trim: true },
      role: String,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    invoiceDate: { type: Date, required: true },
    dispatchDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    dispatchQty: { type: Number, required: true, min: 0 },
    invoiceValue: { type: Number, required: true, min: 0 },
    materialDescription: { type: String, required: true, trim: true },

    salesOrderTotalQtySnapshot: { type: Number, default: 0, min: 0 },
    previousDispatchedQty: { type: Number, default: 0, min: 0 },
    remainingQtyAfterDispatch: { type: Number, default: 0, min: 0 },

    dispatchCompletionStatus: {
      type: String,
      enum: ["partial_dispatched", "fully_dispatched"],
      default: "partial_dispatched",
      index: true,
    },

    lrNumber: { type: String, trim: true, default: "" },
    lrDate: Date,

    billPdf: { type: fileSchema, required: true },
    lrCopyPdf: fileSchema,

    /* =========================================================
   MTC / TC CERTIFICATES

   NEW:
   tcCertificatePdfs supports multiple TC files.

   LEGACY:
   tcCertificatePdf is retained temporarily so old
   records / frontend / email code do not break.
========================================================= */

tcApplicable: {
  type: String,
  enum: [
    "applicable",
    "not_applicable",
  ],
  default: "not_applicable",
  index: true,
},

/*
 * Legacy first TC.
 *
 * Keep this until every frontend/email/download
 * implementation has migrated to tcCertificatePdfs.
 */
tcCertificatePdf: {
  type: fileSchema,
  default: undefined,
},

/*
 * NEW:
 * Multiple TC/MTC certificates.
 *
 * Maximum count is enforced in:
 * 1. Multer route
 * 2. Dispatch service
 */
tcCertificatePdfs: {
  type: [fileSchema],
  default: [],
},

    paymentTerms: {
  type: String,
  trim: true,
  default: "",
},

paymentDueDays: {
  type: Number,
  required: true,
  min: 0,
},

/*
 * Original contractual payment due date.
 * Do not overwrite this when the customer asks
 * for an extension.
 */
paymentDueDate: {
  type: Date,
  required: true,
  index: true,
},

/*
 * Latest customer-committed payment date.
 * When present, this becomes the effective date
 * for reminders and overdue calculation.
 */
revisedPaymentDueDate: {
  type: Date,
  default: null,
  index: true,
},

revisedPaymentRemark: {
  type: String,
  trim: true,
  default: "",
},

revisedPaymentAt: {
  type: Date,
  default: null,
},

revisedPaymentBy: {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  role: {
    type: String,
    trim: true,
  },
},

paymentDueDateHistory: [
  {
    previousDate: {
      type: Date,
      required: true,
    },

    revisedDate: {
      type: Date,
      required: true,
    },

    remark: {
      type: String,
      trim: true,
      required: true,
    },

    revisedAt: {
      type: Date,
      default: Date.now,
    },

    revisedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      role: String,
    },
  },
],

paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
      index: true,
    },

    paidAmount: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, required: true, min: 0 },
    paymentRemark: { type: String, trim: true, default: "" },

    paymentHistory: [
      {
        amount: { type: Number, required: true, min: 0 },
        receivedAt: { type: Date, default: Date.now },
        remark: { type: String, trim: true, default: "" },
        paymentBillPdf: fileSchema,
        mailStatus: {
          sent: { type: Boolean, default: false },
          sentAt: Date,
          messageId: String,
          errorMessage: String,
        },
        updatedBy: {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          name: String,
          email: String,
        },
      },
    ],

    additionalCcEmails: [{ type: String, trim: true, lowercase: true }],

    notificationEmail: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      sentTo: { type: String, trim: true, lowercase: true },
      cc: [{ type: String, trim: true, lowercase: true }],
      messageId: String,
      errorMessage: String,
    },

    mobileNotification: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      sentTo: String,
      provider: { type: String, default: "" },
      messageId: String,
      errorMessage: String,
    },

    paymentReminder: {
      beforeDueDateSent: { type: Boolean, default: false },
      dueDateSent: { type: Boolean, default: false },
      overdueReminderCount: { type: Number, default: 0 },
      lastReminderSentAt: Date,
      lastReminderType: {
        type: String,
        enum: ["before_due_date", "due_date", "overdue", null],
        default: null,
      },
    },

    dispatchStatus: {
      type: String,
      enum: ["dispatched", "delivered", "cancelled"],
      default: "dispatched",
      index: true,
    },

    deliveredAt: Date,
    internalRemark: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

dispatchSchema.pre("validate", function () {
  if (!this.dispatchDate) this.dispatchDate = new Date();

  /* =====================================================
   TC / MTC VALIDATION

   Supports both:
   - old tcCertificatePdf
   - new tcCertificatePdfs[]
===================================================== */

const tcFiles =
  Array.isArray(
    this.tcCertificatePdfs
  )
    ? this.tcCertificatePdfs
    : [];

const hasMultipleTcFiles =
  tcFiles.some(
    (file) =>
      Boolean(
        file?.fileUrl
      )
  );

const hasLegacyTcFile =
  Boolean(
    this.tcCertificatePdf
      ?.fileUrl
  );

/*
 * Backward compatibility for old records.
 */
if (!this.tcApplicable) {
  this.tcApplicable =
    hasMultipleTcFiles ||
    hasLegacyTcFile
      ? "applicable"
      : "not_applicable";
}

/*
 * TC applicable means at least one genuine
 * uploaded certificate must exist.
 */
if (
  this.tcApplicable ===
    "applicable" &&
  !hasMultipleTcFiles &&
  !hasLegacyTcFile
) {
  this.invalidate(
    "tcCertificatePdfs",
    "At least one MTC / TC PDF is required when TC is applicable."
  );
}

/*
 * Hard safety limit.
 */
if (
  tcFiles.length >
  10
) {
  this.invalidate(
    "tcCertificatePdfs",
    "Maximum 10 MTC / TC PDF files are allowed."
  );
}

/*
 * TC not applicable:
 * clear both new and legacy TC fields.
 */
if (
  this.tcApplicable ===
  "not_applicable"
) {
  this.tcCertificatePdf =
    undefined;

  this.tcCertificatePdfs =
    [];
}

/*
 * Maintain old field automatically.
 *
 * This allows old frontend / download / mail code
 * to continue reading tcCertificatePdf.
 */
if (
  this.tcApplicable ===
    "applicable" &&
  !hasLegacyTcFile &&
  hasMultipleTcFiles
) {
  this.tcCertificatePdf =
    tcFiles[0];
}

  if (this.paymentDueDays !== undefined && this.paymentDueDays !== null) {
    const dueDate = new Date(this.dispatchDate);
    dueDate.setDate(dueDate.getDate() + Number(this.paymentDueDays || 0));
    dueDate.setHours(12, 0, 0, 0);
    this.paymentDueDate = dueDate;
  }

  const invoiceValue = Number(this.invoiceValue || 0);
  const paidAmount = Number(this.paidAmount || 0);

  this.pendingAmount = Math.max(
    Number((invoiceValue - paidAmount).toFixed(2)),
    0
  );

  const today = new Date();
today.setHours(0, 0, 0, 0);

const effectiveDueDate =
  this.revisedPaymentDueDate ||
  this.paymentDueDate;

const dueDate = effectiveDueDate
  ? new Date(effectiveDueDate)
  : null;

if (dueDate) {
  dueDate.setHours(0, 0, 0, 0);
}

if (
  this.pendingAmount === 0 &&
  invoiceValue > 0
) {
  this.paymentStatus = "paid";
} else if (
  dueDate &&
  today > dueDate
) {
  /*
   * An unpaid or partially-paid invoice becomes
   * overdue after its effective due date.
   */
  this.paymentStatus = "overdue";
} else if (paidAmount > 0) {
  this.paymentStatus = "partial";
} else {
  this.paymentStatus = "pending";
}

  const total = Number(this.salesOrderTotalQtySnapshot || 0);
  const remaining = Number(this.remainingQtyAfterDispatch || 0);

  if (total > 0 && remaining <= 0) {
    this.dispatchCompletionStatus = "fully_dispatched";
  } else {
    this.dispatchCompletionStatus = "partial_dispatched";
  }
});

dispatchSchema.index({ salesOrderId: 1, isActive: 1, dispatchStatus: 1 });
dispatchSchema.index({ companyName: 1, invoiceNumber: 1 });
dispatchSchema.index({ tcApplicable: 1, isActive: 1 });
dispatchSchema.index({
  revisedPaymentDueDate: 1,
  paymentStatus: 1,
  isActive: 1,
});

module.exports = mongoose.model("Dispatch", dispatchSchema);