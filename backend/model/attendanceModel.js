const mongoose = require("mongoose");

const locationAuditSchema = new mongoose.Schema(
  {
    time: Date,

    latitude: Number,
    longitude: Number,
    accuracy: Number,

    distanceFromOfficeMeters: Number,

    isWithinOffice: {
      type: Boolean,
      default: false,
    },

    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },

    userAgent: {
      type: String,
      trim: true,
      default: "",
    },

    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },

    locationAddress: {
      type: String,
      trim: true,
      default: "",
    },

    googleMapLink: {
      type: String,
      trim: true,
      default: "",
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    employeeName: {
      type: String,
      trim: true,
      default: "",
    },

    employeeEmail: {
      type: String,
      trim: true,
      default: "",
    },

    attendanceDate: {
      type: Date,
      required: true,
    },

    workMode: {
      type: String,
      enum: ["office", "work_from_home"],
      required: true,
      default: "office",
    },

    checkIn: locationAuditSchema,

    checkOut: locationAuditSchema,

    attendanceStatus: {
      type: String,
      enum: [
        "not_checked_in",
        "checked_in",
        "checked_out",
        "regularization_pending",
        "regularized",
        "absent",
      ],
      default: "not_checked_in",
    },

    attendanceSource: {
      type: String,
      enum: ["office_location", "work_from_home", "regularization"],
      default: "office_location",
    },

    totalWorkingMinutes: {
      type: Number,
      default: 0,
    },

    regularization: {
      requested: {
        type: Boolean,
        default: false,
      },

      type: {
        type: String,
        enum: [
          "missed_check_in",
          "missed_check_out",
          "wrong_time",
          "other",
          null,
        ],
        default: null,
      },

      reason: {
        type: String,
        trim: true,
        default: "",
      },

      requestedCheckIn: Date,
      requestedCheckOut: Date,

      requestedAt: Date,

      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },

      adminNotified: {
        type: Boolean,
        default: false,
      },

      adminNotifiedAt: Date,

      approvedBy: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
        email: String,
      },

      approvedAt: Date,

      rejectionReason: {
        type: String,
        trim: true,
        default: "",
      },
    },

    reminder: {
      missedCheckoutMailSent: {
        type: Boolean,
        default: false,
      },
      missedCheckoutMailSentAt: Date,
      lastReminderSentAt: Date,
    },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { employeeId: 1, attendanceDate: 1 },
  { unique: true }
);

attendanceSchema.index({ attendanceDate: 1 });
attendanceSchema.index({ workMode: 1, attendanceDate: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);