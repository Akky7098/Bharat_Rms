const mongoose = require("mongoose");

/* =====================================================
   LOCATION AUDIT
===================================================== */

const locationAuditSchema = new mongoose.Schema(
  {
    time: {
      type: Date,
      default: null,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    accuracy: {
      type: Number,
      default: null,
    },

    distanceFromOfficeMeters: {
      type: Number,
      default: null,
    },

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
  {
    _id: false,
  }
);

/* =====================================================
   REGULARIZATION APPROVER
===================================================== */

const regularizationApproverSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      name: {
        type: String,
        trim: true,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   REGULARIZATION
===================================================== */

const regularizationSchema =
  new mongoose.Schema(
    {
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
        maxlength: 2000,
      },

      /*
       * These are Date fields.
       *
       * The attendance service must construct them using:
       * YYYY-MM-DDTHH:mm:ss+05:30
       *
       * Example:
       * new Date("2026-07-09T09:24:00+05:30")
       */
      requestedCheckIn: {
        type: Date,
        default: null,
      },

      requestedCheckOut: {
        type: Date,
        default: null,
      },

      requestedAt: {
        type: Date,
        default: null,
      },

      status: {
        type: String,
        enum: [
          "none",
          "pending",
          "approved",
          "rejected",
        ],
        default: "none",
        index: true,
      },

      adminNotified: {
        type: Boolean,
        default: false,
      },

      adminNotifiedAt: {
        type: Date,
        default: null,
      },

      approvedBy: {
        type: regularizationApproverSchema,
        default: undefined,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      rejectedBy: {
        type: regularizationApproverSchema,
        default: undefined,
      },

      rejectedAt: {
        type: Date,
        default: null,
      },

      rejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 2000,
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   REMINDER
===================================================== */

const reminderSchema = new mongoose.Schema(
  {
    missedCheckoutMailSent: {
      type: Boolean,
      default: false,
    },

    missedCheckoutMailSentAt: {
      type: Date,
      default: null,
    },

    lastReminderSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* =====================================================
   ATTENDANCE
===================================================== */

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      trim: true,
      default: "",
    },

    employeeEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    /*
     * Stable attendance date key.
     *
     * Existing production records remain compatible.
     * The service should store the date as UTC midnight only for
     * identifying the attendance day.
     */
    attendanceDate: {
      type: Date,
      required: true,
    },

    workMode: {
      type: String,
      enum: [
        "office",
        "work_from_home",
      ],
      required: true,
      default: "office",
      index: true,
    },

    checkIn: {
      type: locationAuditSchema,
      default: undefined,
    },

    checkOut: {
      type: locationAuditSchema,
      default: undefined,
    },

    attendanceStatus: {
      type: String,
      enum: [
        /*
         * Existing production values
         */
        "not_checked_in",
        "checked_in",
        "checked_out",
        "regularization_pending",
        "regularized",
        "absent",

        /*
         * New leave values
         */
        "on_leave",
        "loss_of_pay",
      ],
      default: "not_checked_in",
      index: true,
    },

    attendanceSource: {
      type: String,
      enum: [
        /*
         * Existing production values
         */
        "office_location",
        "work_from_home",
        "regularization",

        /*
         * New leave source
         */
        "leave",
      ],
      default: "office_location",
      index: true,
    },

    totalWorkingMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    regularization: {
      type: regularizationSchema,
      default: () => ({
        requested: false,
        type: null,
        reason: "",
        status: "none",
        adminNotified: false,
        rejectionReason: "",
      }),
    },

    reminder: {
      type: reminderSchema,
      default: () => ({
        missedCheckoutMailSent: false,
      }),
    },

    /* =================================================
       LEAVE REFERENCE
    ================================================= */

    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
      index: true,
    },

    leaveType: {
      type: String,
      enum: [
        "paid_leave",
        "loss_of_pay",
        null,
      ],
      default: null,
      index: true,
    },

    leaveDuration: {
      type: String,
      enum: [
        "full_day",
        "first_half",
        "second_half",
        null,
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   INDEXES
===================================================== */

/*
 * Existing production-safe unique attendance constraint.
 */
attendanceSchema.index(
  {
    employeeId: 1,
    attendanceDate: 1,
  },
  {
    unique: true,
  }
);

attendanceSchema.index({
  attendanceDate: 1,
});

attendanceSchema.index({
  workMode: 1,
  attendanceDate: 1,
});

attendanceSchema.index({
  attendanceStatus: 1,
  attendanceDate: 1,
});

attendanceSchema.index({
  "regularization.status": 1,
  attendanceDate: 1,
});

attendanceSchema.index({
  leaveRequestId: 1,
  attendanceDate: 1,
});

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);