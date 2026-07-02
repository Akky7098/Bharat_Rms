const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      trim: true,
    },

    attachments: [
      {
        originalName: String,
        fileName: String,
        fileUrl: String,
        mimeType: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
    },

    senderRole: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      required: true,
    },

    isInternalNote: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const ticketTimelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    performedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    performedByName: {
      type: String,
      trim: true,
    },

    from: String,
    to: String,
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "on_hold", "completed", "closed"],
      default: "open",
      index: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    estimatedHours: {
      type: Number,
      default: 0,
    },

    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedToName: {
      type: String,
      required: true,
      trim: true,
    },

    assignedToEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    emailThread: {
  messageId: String,
  references: [String],
},

    createdByName: {
      type: String,
      required: true,
      trim: true,
    },

    createdByRole: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      required: true,
    },

    completedAt: Date,
    closedAt: Date,
    attachments: [
  {
    originalName: String,
    fileName: String,
    fileUrl: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
],
    messages: [ticketMessageSchema],
    timeline: [ticketTimelineSchema],
  },
  { timestamps: true }
);

supportTicketSchema.pre("validate", async function () {
  if (this.ticketNumber) return;

  const year = new Date().getFullYear();

  const count = await mongoose
    .model("SupportTicket")
    .countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      },
    });

  this.ticketNumber = `BSS-SUP-${year}-${String(count + 1).padStart(5, "0")}`;
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);