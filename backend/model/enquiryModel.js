const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    salesPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    shape: {
      type: String,
      enum: ["round", "flat", "square"],
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
    "as_per_standard",
    "as_rolled_annealed",
    "as_forged_annealed",
    "as_rolled",
    "as_forged",
  ],
  required: true,
  default: "as_per_standard",
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