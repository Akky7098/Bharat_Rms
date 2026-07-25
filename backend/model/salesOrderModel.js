const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    sameAsCompanyAddress: {
      type: Boolean,
      default: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    gstinNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
  },
  { _id: false }
);

const approvalHistorySchema = new mongoose.Schema(
  {
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    role: {
      type: String,
      enum: ["salesperson", "admin", "manager", "system"],
      required: true,
    },
action: {
  type: String,
  enum: [
    "created",
    "submitted",
    "updated",
    "resubmitted",

    "admin_approved",
    "admin_rejected",

    "manager_approval_sent",

    "manager_approved",
    "manager_rejected",

    "manager_direct_approved",
    "manager_direct_rejected",

    "pdf_generated",
    "whatsapp_group_sent",
    "email_sent",
    "failed",
  ],
  required: true,
},

    comment: {
      type: String,
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const salesOrderSchema = new mongoose.Schema(
  {
    // =========================
    // AUTO FROM LOGIN TOKEN
    // =========================
    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    salesPersonName: {
      type: String,
      required: true,
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

    // =========================
    // BASIC ORDER DETAILS
    // =========================
    orderDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    salesOrderNo: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
   poDate: {
  type: Date,
  required: true,
  default: Date.now,
},

supplyFinish: {
  type: String,
  enum: ["supply_size", "finish_size"],
  required: true,
  default: "supply_size",
},
 orderType: {
  type: String,
  enum: ["domestic", "international", "special_economic_zone"],
  required: true,
  default: "domestic",
},
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    companyAddress: {
      type: String,
      required: true,
      trim: true,
    },

    gstinNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    poNumber: {
      type: String,
      required: true,
      trim: true,
    },

    checklistNumber: {
      type: String,
      trim: true,
    },

    // =========================
    // CUSTOMER DETAILS
    // =========================
    customerType: {
      type: String,
      enum: ["new", "existing"],
      required: true,
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

    contactPersonEmail: {
      type: String,
       required: true,
      trim: true,
      lowercase: true,
    },

    // =========================
    // PAYMENT DETAILS
    // =========================
   paymentTerms: {
  type: String,
  enum: [
    "10_percent_advance_balance_on_readiness_of_material",
    "20_percent_advance_balance_on_readiness_of_material",
    "30_percent_advance_balance_on_readiness_of_material",
    "40_percent_advance_balance_on_readiness_of_material",
    "50_percent_advance_balance_on_readiness_of_material",

    "30_days_pdc_against_invoice",
    "45_days_pdc_against_invoice",
    "60_days_pdc_against_invoice",
    "75_days_pdc_against_invoice",
    "90_days_pdc_against_invoice",

    "30_days_from_date_of_invoice",
    "45_days_from_date_of_invoice",
    "60_days_from_date_of_invoice",
    "75_days_from_date_of_invoice",
    "90_days_from_date_of_invoice",

    "30_days_from_date_of_po_received",
    "45_days_from_date_of_po_received",
    "60_days_from_date_of_po_received",
    "75_days_from_date_of_po_received",
    "90_days_from_date_of_po_received",

    "other",
  ],
  required: true,
},

otherPaymentTerms: {
  type: String,
  trim: true,
  default: "",
},

    orderValue: {
      type: Number,
      required: true,
      min: 0,
    },

    isPaymentTermsApprovedByManagement: {
      type: Boolean,
      default: false,
    },

    paymentTermsApprovedBy: {
      type: String,
      enum: ["nilesh_sir", "jatin_sir", "mayank_sir", null],
      default: null,
    },

   previousPaymentStatus: {
  type: String,
  enum: ["yes", "no"],
  default: "no",
  required: true,
},

previousPaymentRemark: {
  type: String,
  trim: true,
  default: "",
},

specialNote: {
  type: String,
  trim: true,
  default: "",
},

    // =========================
    // PO / QUOTATION DETAILS
    // =========================
    poAsPerQuotation: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },

    poAsPerQuotationRemark: {
      type: String,
      trim: true,
    },

    // =========================
    // MATERIAL DETAILS
    // this will print same like your PDF:
    // Size / Grade / Qty / Rate
    // =========================
    sizeGradeQuantityRate: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // SUPPLY DETAILS
    // =========================
    supplyCondition: {
  type: String,
  enum: [
    "as_per_standard",
    "as_rolled",
    "as_forged",
    "as_rolled_or_as_forged",
    "as_rolled_annealed",
    "as_forged_annealed",
    "as_rolled_or_forged_annealed",
    "as_rolled_normalised",
    "as_rolled_or_as_forged_normalised",
    "as_rolled_qt",
    "as_forged_qt",
    "as_rolled_or_as_forged_qt",
    "other",
  ],
  required: true,
  default: "as_per_standard",
},

   otherSupplyConditions: {
  type: String,
  trim: true,
  default: "",
},
    cutLengthRequired: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },

    cuttingCost: {
      type: String,
      enum: ["extra", "inclusive","not_applicable"],
      required: true,
    },
    cuttingExtraCharges: {
  type: String,
  default: "",
},
   
    deliveryCost: {
      type: String,
      enum: ["inclusive"],
      default: "inclusive",
    },

    freight: {
      type: String,
      enum: ["extra", "self","inclusive"],
      required: true,
    },
    freightExtraCharges: {
  type: String,
  default: "",
},
    tolerance: {
      type: String,
      trim: true,
    },

    endUseOfCustomer: {
      type: String,
      enum: ["machining", "forging"],
      required: true,
    },

    deliveryTime: {
      type: String,
      required: true,
      trim: true,
    },

    testCertificateRequired: {
      type: String,
      enum: ["yes"],
      default: "yes",
      required: true,
    },

   enquiryFormFilled: {
  type: String,
  enum: ["yes", "no"],
  required: true,
  default: "yes",
},

    enquiryNumber: {
  type: String,
  trim: true,
  index: true,
},

    // =========================
    // BILLING / SHIPPING
    // =========================
    billingAddress: {
      type: addressSchema,
      default: () => ({
        sameAsCompanyAddress: true,
      }),
    },

    shippingAddress: {
      type: addressSchema,
      default: () => ({
        sameAsCompanyAddress: true,
      }),
    },

    // =========================
    // ADMIN CHECK / SIGNATURE
    // =========================
    checkedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    checkedByAdminName: {
      type: String,
      trim: true,
    },

    adminSignatureUrl: {
      type: String,
      trim: true,
    },

    checkedAt: {
      type: Date,
    },

    // =========================
    // APPROVAL WORKFLOW STATUS
    // =========================
    approvalStatus: {
      type: String,
      enum: [
        "pending_admin_review",
        "rejected_by_admin",
        "pending_manager_approval",
        "rejected_by_manager",
        "approved",
      ],
      default: "pending_admin_review",
      index: true,
    },

    adminApproval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: Date,

      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rejectedAt: Date,

      rejectionComment: {
        type: String,
        trim: true,
      },
    },

    managerApproval: {
      managerName: {
        type: String,
        trim: true,
      },

      managerWhatsappNumber: {
        type: String,
        trim: true,
      },

      whatsappMessageId: {
        type: String,
        trim: true,
      },

      approvalToken: {
        type: String,
        trim: true,
      },

      approvalSentAt: Date,

      approvedAt: Date,

      rejectedAt: Date,

      rejectionComment: {
        type: String,
        trim: true,
      },
    },
     isActive: {
  type: Boolean,
  default: true,
},
deletedAt: {
  type: Date,
},
deletedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
},
    // =========================
    // PDF DETAILS
    // =========================
    pdf: {
      generated: {
        type: Boolean,
        default: false,
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

      generatedAt: Date,
    },

    // =========================
    // WHATSAPP GROUP STATUS
    // =========================
    whatsappGroupStatus: {
      groupName: {
        type: String,
        default: "Sales Bharat",
        trim: true,
      },

      groupId: {
        type: String,
        trim: true,
      },

      sent: {
        type: Boolean,
        default: false,
      },

      sentAt: Date,

      messageId: {
        type: String,
        trim: true,
      },

      errorMessage: {
        type: String,
        trim: true,
      },
    },

    // =========================
    // EMAIL BACKUP STATUS
    // =========================
    emailStatus: {
      sent: {
        type: Boolean,
        default: false,
      },

      sentAt: Date,

      sentTo: [
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

    // =========================
    // EDIT / RESUBMIT LOOP
    // =========================
    isEditableBySalesPerson: {
      type: Boolean,
      default: false,
    },

    revisionCount: {
      type: Number,
      default: 0,
    },

    lastSubmittedAt: {
      type: Date,
      default: Date.now,
    },

    customerPOFile: {
  originalName: String,
  fileName: String,
  filePath: String,
  fileUrl: String,
  uploadedAt: Date,
},
feasibilityReportFile: {
  originalName: String,
  fileName: String,
  filePath: String,
  fileUrl: String,
  uploadedAt: Date,
},
managerEmailApproval: {
  token: String,
  tokenCreatedAt: Date,
  approvedByEmailLinkAt: Date,
  rejectedByEmailLinkAt: Date,
},

preShipmentInspectionPdf: {
  generated: {
    type: Boolean,
    default: false,
  },
  fileName: String,
  filePath: String,
  fileUrl: String,
  generatedAt: Date,
},
 finalSalesOrderPackage: {
  generated: {
    type: Boolean,
    default: false,
  },
  fileName: String,
  filePath: String,
  fileUrl: String,
  generatedAt: Date,
},
    approvalHistory: [approvalHistorySchema],
  },
  {
    timestamps: true,
  }
);

// =========================
// VALIDATIONS
// =========================
// salesOrderSchema.pre("validate", function (next) {
//   if (
//     this.isPaymentTermsApprovedByManagement &&
//     !this.paymentTermsApprovedBy
//   ) {
//     return next(
//       new Error("Management approver is required when payment terms are approved")
//     );
//   }

//   if (
//     this.supplyCondition === "other" &&
//     (!this.otherSupplyConditions || this.otherSupplyConditions.length === 0)
//   ) {
//     return next(
//       new Error("Other supply condition is required when supply condition is other")
//     );
//   }

//   if (
//     this.billingAddress &&
//     this.billingAddress.sameAsCompanyAddress === false &&
//     !this.billingAddress.address
//   ) {
//     return next(new Error("Billing address is required"));
//   }

//   if (
//     this.shippingAddress &&
//     this.shippingAddress.sameAsCompanyAddress === false &&
//     !this.shippingAddress.address
//   ) {
//     return next(new Error("Shipping address is required"));
//   }

//   if (this.enquiryFormFilled === "yes" && !this.enquiryNumber) {
//     return next(new Error("Enquiry number is required"));
//   }

//   next();
// });

const SalesOrder =
  mongoose.models.SalesOrderForm ||
  mongoose.model(
    "SalesOrderForm",
    salesOrderSchema
  );

module.exports = SalesOrder;