const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reportDate: {
      type: Date,
      required: true,
    },

    workSummary: {
      type: String,
      required: true,
      trim: true,
    },

    challenges: {
      type: String,
      default: "",
      trim: true,
    },

    nextDayPlan: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["submitted"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

timesheetSchema.index(
  { employeeId: 1, reportDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("Timesheet", timesheetSchema);