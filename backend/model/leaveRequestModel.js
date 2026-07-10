const mongoose = require("mongoose");

/* =====================================================
   LEAVE HISTORY
===================================================== */

const leaveHistorySchema =
  new mongoose.Schema(
    {
      action: {
        type: String,

        enum: [
          "applied",
          "approved",
          "rejected",
          "cancelled",
        ],

        required: true,
      },

      message: {
        type: String,
        trim: true,
        default: "",
      },

      performedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      performedByName: {
        type: String,
        trim: true,
        default: "",
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   LEAVE REQUEST
===================================================== */

const leaveRequestSchema =
  new mongoose.Schema(
    {
      employeeId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      employeeName: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      employeeEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      employeeRole: {
        type:
          String,

        enum: [
          "user",
          "admin",
        ],

        required:
          true,

        index:
          true,
      },

      leaveType: {
        type:
          String,

        enum: [
          "paid_leave",
          "loss_of_pay",
        ],

        required:
          true,

        index:
          true,
      },

      duration: {
        type:
          String,

        enum: [
          "full_day",
          "first_half",
          "second_half",
        ],

        default:
          "full_day",

        required:
          true,
      },

      fromDate: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      toDate: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      reason: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          2000,
      },

      status: {
        type:
          String,

        enum: [
          "pending",
          "approved",
          "rejected",
          "cancelled",
        ],

        default:
          "pending",

        required:
          true,

        index:
          true,
      },

      approvalLevel: {
        type:
          String,

        enum: [
          "admin_or_super_admin",
          "super_admin",
        ],

        required:
          true,

        index:
          true,
      },

      appliedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      approvedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      approvedByName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      approvedAt: {
        type:
          Date,

        default:
          null,
      },

      rejectedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      rejectedByName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      rejectedAt: {
        type:
          Date,

        default:
          null,
      },

      rejectionReason: {
        type:
          String,

        trim:
          true,

        maxlength:
          2000,

        default:
          "",
      },

      cancelledAt: {
        type:
          Date,

        default:
          null,
      },

      history: {
        type: [
          leaveHistorySchema,
        ],

        default: [],
      },

      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      createdByName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      updatedByName: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },
    },
    {
      timestamps:
        true,
    }
  );

/* =====================================================
   VALIDATION
===================================================== */

leaveRequestSchema.pre(
  "validate",
  function validateLeaveDates(next) {
    if (
      this.fromDate &&
      this.toDate &&
      this.toDate <
        this.fromDate
    ) {
      return next(
        new Error(
          "Leave end date cannot be before start date."
        )
      );
    }

    if (
      this.duration !==
        "full_day" &&
      this.fromDate &&
      this.toDate
    ) {
      const fromDateKey =
        new Date(
          this.fromDate
        )
          .toISOString()
          .slice(0, 10);

      const toDateKey =
        new Date(
          this.toDate
        )
          .toISOString()
          .slice(0, 10);

      if (
        fromDateKey !==
        toDateKey
      ) {
        return next(
          new Error(
            "Half-day leave can be applied only for one date."
          )
        );
      }
    }

    return next();
  }
);

/* =====================================================
   INDEXES
===================================================== */

leaveRequestSchema.index({
  employeeId: 1,
  fromDate: 1,
  toDate: 1,
  status: 1,
  isActive: 1,
});

leaveRequestSchema.index({
  employeeId: 1,
  leaveType: 1,
  status: 1,
  fromDate: 1,
});

leaveRequestSchema.index({
  employeeRole: 1,
  status: 1,
  createdAt: -1,
});

leaveRequestSchema.index({
  approvalLevel: 1,
  status: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "LeaveRequest",
    leaveRequestSchema
  );