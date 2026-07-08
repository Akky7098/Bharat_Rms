const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    originalName: String,
    fileName: String,
    filePath: String,
    fileUrl: String,
    mimeType: String,
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploadedByName: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["user_message", "it_reply", "internal_note", "system"],
      default: "user_message",
    },
    attachments: [attachmentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: String,
    createdByRole: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "created",
        "message_added",
        "status_changed",
        "priority_changed",
        "assigned",
        "details_updated",
        "resolved",
        "closed",
        "reopened",
        "deleted",
      ],
      required: true,
    },
    message: String,
    oldValue: String,
    newValue: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    performedByName: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const itSupportSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      enum: ["ticket", "faq", "guide", "announcement"],
      required: true,
      index: true,
    },

    ticketNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 10000,
    },

    category: {
      type: String,
      enum: [
        "attendance",
        "sales_order",
        "dispatch",
        "enquiry",
        "document",
        "receivable",
        "payment",
        "dashboard",
        "login",
        "mobile_app",
        "performance",
        "bug",
        "feature_request",
        "general",
        "other",
      ],
      default: "other",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "open",
        "acknowledged",
        "assigned",
        "in_progress",
        "waiting_user",
        "resolved",
        "closed",
        "rejected",
        "published",
        "draft",
        "archived",
      ],
      default: "open",
      index: true,
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    raisedByName: String,
    raisedByEmail: String,
    raisedByRole: String,

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedToName: String,

    attachments: [attachmentSchema],
    messages: [messageSchema],
    timeline: [timelineSchema],

    voiceRecording: attachmentSchema,
    voiceTranscript: String,

    resolution: {
      rootCause: String,
      actionTaken: String,
      preventiveAction: String,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      resolvedByName: String,
      resolvedAt: Date,
    },

    deviceInfo: {
      browser: String,
      os: String,
      deviceType: String,
      screenResolution: String,
      currentUrl: String,
      userAgent: String,
      ipAddress: String,
    },

    visibility: {
      type: String,
      enum: ["all", "admin_only", "it_only"],
      default: "all",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: String,

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedByName: String,

    closedAt: Date,
  },
  { timestamps: true }
);

itSupportSchema.index({
  title: "text",
  description: "text",
  ticketNumber: "text",
});

module.exports = mongoose.model("ITSupport", itSupportSchema);