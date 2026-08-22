const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
   enquiryNumber: {
  type: String,
  trim: true,
  unique: true,
  sparse: true,
},
    enquiryDate: {
      type: Date,
      required: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerContactNo: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmailId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    customerAddress: {
      type: String,
      required: true,
      trim: true,
    },

    productCategory: {
  type: String,
  enum: [
    "tool_and_die_steel",
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

    shape: {
      type: String,
      enum: ["round", "flat", "square","rcs"],
      required: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
    },

    sizePdf: {
      fileName: {
        type: String,
        default: "",
      },
      filePath: {
        type: String,
        default: "",
      },
      fileUrl: {
        type: String,
        default: "",
      },
      uploadedAt: {
        type: Date,
      },
    },

    quantityInKg: {
      type: Number,
      required: true,
    },
supplyCondition: {
  type: String,
  enum: [
    /* Existing Values (KEEP) */
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

    /* New General Supply Conditions */

    "hot_rolled",
    "hot_rolled_annealed",
    "hot_rolled_normalized",
    "hot_rolled_qt_ht",
    "hot_rolled_annealed_cold_drawn",
    "hot_rolled_annealed_peeled",
    "hot_rolled_normalized_peeled",
    "hot_rolled_normalized_cold_drawn",
    "hot_rolled_annealed_qt_ht",
    "hot_rolled_normalized_qt_ht",
    "hot_rolled_qt_peeled",
    "double_rolled_condition",

    "hot_forged",
    "hot_forged_annealed",
    "hot_forged_normalized",
    "hot_forged_annealed_machined",
    "hot_forged_normalized_machined",
    "hot_forged_qt_ht",
    "hot_forged_qt_ht_machined",
    "hot_forged_rolled",

    /* Manual */
    "other",
  ],
  required: true,
  default: "as_per_standard",
},
otherSupplyConditions: {
  type: String,
  default: "",
  trim: true,
},

    modeOfEnquiry: {
      type: String,
      enum: [
        "phone",
        "email",
        "whatsapp",
        "website",
        "walk-in",
        "google-ads",
        "reference",
      ],
      required: true,
    },

    feasibility: {
      planDate: Date,
      actualDate: Date,
      status: {
        type: String,
        enum: ["pending", "feasible", "not_feasible"],
        default: "pending",
      },
      completed: {
        type: Boolean,
        default: false,
      },
    },

    quotation: {
      planDate: Date,
      actualDate: Date,
      quotationLink: String,
      completed: {
        type: Boolean,
        default: false,
      },
    },

    closure: {
      planDate: Date,
      actualDate: Date,
      status: {
        type: String,
        enum: ["pending", "won", "lost"],
        default: "pending",
      },

      lostRemark: {
        type: String,
        enum: [
          "",
          "price",
          "delivery",
          "qty",
          "quality",
          "payment_terms",
          "material_not_available",
          "others",
        ],
        default: "",
      },

      lostRemarkText: {
  type: String,
  trim: true,
  default: "",
  maxlength: 2000,
},

      lostRemarkOtherText: {
  type: String,
  default: "",
},
      completed: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Enquiry = mongoose.model("Enquiry", enquirySchema);

module.exports = Enquiry;