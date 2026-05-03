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
    },
    customerName: {
      type: String,
      required: true,
    },
    customerContactNo: {
      type: String,
      required: true,
    },

    customerEmailId:{
        type: String,
        required: true,
    },

    customerAddress: {
        type: String,
        required:true,
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
        "other"
      ],
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    shape: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },

    quantityInKg: {
      type: Number,
      required: true,
    },

    supplyCondition: String,

    modeOfEnquiry: {
      type: String,
      enum: [
        "phone",
        "email",
        "whatsapp",
        "website",
        "walk-in",
        "reference"
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
