const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      enum: [
        "sales_order",
        "dispatch",
        "enquiry",
        "attendance",
        "timesheet",
        "receivable",
        "document",
        "payment",
        "system",
      ],
    },

    event: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "medium", "high", "urgent"],
      default: "normal",
    },

    targetUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    targetRoles: [
      {
        type: String,
        enum: ["super_admin", "admin", "user"],
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceModel: {
      type: String,
      default: "",
    },

    actionUrl: {
      type: String,
      default: "",
    },

    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    clearedBy: [
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    clearedAt: {
      type: Date,
      default: Date.now,
    },
  },
],
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ targetUserIds: 1, createdAt: -1 });
notificationSchema.index({ targetRoles: 1, createdAt: -1 });
notificationSchema.index({ module: 1, event: 1 });
notificationSchema.index({ "clearedBy.userId": 1 });

module.exports = mongoose.model("Notification", notificationSchema);