const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    filePath: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const dispatchSchema = new mongoose.Schema(
  {
    /* =========================
       SALES ORDER LINK
    ========================= */

    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrderForm",
      required: true,
      index: true,
    },

    salesOrderNo: {
      type: String,
      trim: true,
      index: true,
    },

    poNumber: {
      type: String,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /* =========================
       SALES PERSON SNAPSHOT
    ========================= */

    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    salesPersonName: {
      type: String,
      trim: true,
    },

    salesPersonEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    salesPersonMobile: {
      type: String,
      trim: true,
    },

    /* =========================
       CUSTOMER SNAPSHOT
    ========================= */

    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPersonEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    contactPersonNumber: {
      type: String,
      required: true,
      trim: true,
    },

    shippingAddress: {
      type: String,
      trim: true,
      default: "",
    },

    /* =========================
       CREATED BY DISPATCH USER
    ========================= */

    dispatchCreatedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
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

    /* =========================
       INVOICE / DISPATCH DETAILS
    ========================= */

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    dispatchDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    dispatchQty: {
      type: Number,
      required: true,
      min: 0,
    },

    invoiceValue: {
      type: Number,
      required: true,
      min: 0,
    },

    materialDescription: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
       SIMPLE LOGISTICS
       LR details come from LR copy,
       but LR number/date are useful in table/search/mail.
    ========================= */

    lrNumber: {
      type: String,
      trim: true,
      default: "",
    },

    lrDate: {
      type: Date,
    },

    /* =========================
       DOCUMENTS
       billPdf = full bill set:
       tax invoice + eway bill + transporter copy + supplier copy
    ========================= */

    billPdf: {
      type: fileSchema,
      required: true,
    },

    lrCopyPdf: {
      type: fileSchema,
      required: true,
    },

    /* =========================
       PAYMENT TRACKING
    ========================= */

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

    paymentDueDate: {
      type: Date,
      required: true,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
      index: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentRemark: {
      type: String,
      trim: true,
      default: "",
    },

    paymentHistory: [
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    receivedAt: {
      type: Date,
      default: Date.now,
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },

    paymentBillPdf: {
      originalName: String,
      fileName: String,
      filePath: String,
      fileUrl: String,
      mimeType: String,
      fileSize: Number,
      uploadedAt: Date,
    },

    mailStatus: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
      messageId: String,
      errorMessage: String,
    },

    updatedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      email: String,
    },
  },
],

    /* =========================
       CUSTOMER EMAIL / CC TRACKING
    ========================= */

    additionalCcEmails: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    notificationEmail: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,

      sentTo: {
        type: String,
        trim: true,
        lowercase: true,
      },

      cc: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],

      messageId: {
        type: String,
        trim: true,
      },

      errorMessage: {
        type: String,
        trim: true,
      },
    },

    /* =========================
       MOBILE / WHATSAPP FUTURE TRACKING
    ========================= */

    mobileNotification: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
      sentTo: {
        type: String,
        trim: true,
      },
      provider: {
        type: String,
        trim: true,
        default: "",
      },
      messageId: {
        type: String,
        trim: true,
      },
      errorMessage: {
        type: String,
        trim: true,
      },
    },

    /* =========================
       PAYMENT REMINDER TRACKING
    ========================= */

  paymentReminder: {
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

    /* =========================
       DISPATCH STATUS
    ========================= */

    dispatchStatus: {
      type: String,
      enum: ["dispatched", "delivered", "cancelled"],
      default: "dispatched",
      index: true,
    },

    deliveredAt: {
      type: Date,
    },

    /* =========================
       INTERNAL REMARKS
    ========================= */

    internalRemark: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   AUTO CALCULATIONS
========================= */

dispatchSchema.pre("validate", function () {
  if (!this.dispatchDate) {
    this.dispatchDate = new Date();
  }

  if (
    this.paymentDueDays !== undefined &&
    this.paymentDueDays !== null
  ) {
    const dueDate = new Date(this.dispatchDate);
    dueDate.setDate(dueDate.getDate() + Number(this.paymentDueDays || 0));
    this.paymentDueDate = dueDate;
  }

  const invoiceValue = Number(this.invoiceValue || 0);
  const paidAmount = Number(this.paidAmount || 0);

  this.pendingAmount = Math.max(invoiceValue - paidAmount, 0);

  if (this.pendingAmount === 0 && invoiceValue > 0) {
    this.paymentStatus = "paid";
  } else if (paidAmount > 0) {
    this.paymentStatus = "partial";
  } else {
    const today = new Date();
    if (this.paymentDueDate && today > this.paymentDueDate) {
      this.paymentStatus = "overdue";
    } else {
      this.paymentStatus = "pending";
    }
  }
});
const Dispatch = mongoose.model("Dispatch", dispatchSchema);

module.exports = Dispatch;