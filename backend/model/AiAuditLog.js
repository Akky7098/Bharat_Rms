const mongoose = require("mongoose");

const aiAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    role: {
      type: String,
      trim: true,
      default: "",
    },
    conversationId: {
      type: String,
      trim: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    requestType: {
      type: String,
      trim: true,
      default: "",
    },
    provider: {
      type: String,
      trim: true,
      default: "",
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    toolsUsed: [
      {
        name: String,
        success: Boolean,
      },
    ],
    answer: {
      type: String,
      default: "",
      maxlength: 50000,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

aiAuditLogSchema.index({ userId: 1, createdAt: -1 });
aiAuditLogSchema.index({ conversationId: 1, createdAt: 1 });

module.exports =
  mongoose.models.AiAuditLog ||
  mongoose.model("AiAuditLog", aiAuditLogSchema);
