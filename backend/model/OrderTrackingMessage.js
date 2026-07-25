const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   SUPPORTED USER ROLES
========================================================= */

const USER_ROLES = [
  "super_admin",
  "admin",
  "user",
  "manager",
  "dispatch",
  "production",
];

/* =========================================================
   SUPPORTED MESSAGE TYPES
========================================================= */

const MESSAGE_TYPES = [
  "text",
  "audio",
  "image",
  "video",
  "document",
  "mixed",
  "system",
  "status_update",
  "update_request",
];

/* =========================================================
   MESSAGE ATTACHMENT
========================================================= */

const messageAttachmentSchema =
  new Schema(
    {
      fileName: {
        type: String,
        required: true,
        trim: true,
      },

      originalName: {
        type: String,
        default: "",
        trim: true,
      },

      fileUrl: {
        type: String,
        required: true,
        trim: true,
      },

      mimeType: {
        type: String,
        default: "",
        trim: true,
      },

      fileType: {
        type: String,
        enum: [
          "image",
          "audio",
          "video",
          "document",
          "other",
        ],
        default: "other",
      },

      fileSize: {
        type: Number,
        min: 0,
        default: 0,
      },

      durationSeconds: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    {
      _id: true,
      timestamps: false,
    }
  );

/* =========================================================
   USER SNAPSHOT
========================================================= */

const senderSnapshotSchema =
  new Schema(
    {
      userId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      name: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        trim: true,
        lowercase: true,
      },

      role: {
        type: String,
        enum: USER_ROLES,
        default: "user",
      },
    },
    {
      _id: false,
      timestamps: false,
    }
  );

/* =========================================================
   READ RECEIPT

   Used for:
   - grey double tick
   - blue double tick
   - seen-by user list
========================================================= */

const readReceiptSchema =
  new Schema(
    {
      userId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      name: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        trim: true,
        lowercase: true,
      },

      role: {
        type: String,
        enum: USER_ROLES,
        default: "user",
      },

      readAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
      timestamps: false,
    }
  );

/* =========================================================
   REPLY SNAPSHOT
========================================================= */

const replySnapshotSchema =
  new Schema(
    {
      messageId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "OrderTrackingMessage",
        default: null,
      },

      senderName: {
        type: String,
        default: "",
        trim: true,
      },

      text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 250,
      },

      messageType: {
        type: String,
        enum: MESSAGE_TYPES,
        default: "text",
      },
    },
    {
      _id: false,
      timestamps: false,
    }
  );

/* =========================================================
   ORDER TRACKING MESSAGE
========================================================= */

const orderTrackingMessageSchema =
  new Schema(
    {
      trackingId: {
        type:
          Schema.Types.ObjectId,
        ref: "OrderTracking",
        required: true,
        index: true,
      },

      salesOrderId: {
        type:
          Schema.Types.ObjectId,
        ref: "SalesOrderForm",
        required: true,
        index: true,
      },

      sender: {
        type: senderSnapshotSchema,
        required: true,
      },

      text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 5000,
      },

      messageType: {
        type: String,
        enum: MESSAGE_TYPES,
        default: "text",
        index: true,
      },

      attachments: {
        type: [
          messageAttachmentSchema,
        ],
        default: [],
      },

      replyTo: {
        type: replySnapshotSchema,
        default: null,
      },

      /*
       * Every user who opens the chat
       * receives one read receipt.
       */
      readBy: {
        type: [
          readReceiptSchema,
        ],
        default: [],
      },

      /*
       * True after the message has been
       * successfully stored in MongoDB.
       *
       * The frontend uses this for the
       * grey double-tick state.
       */
      delivered: {
        type: Boolean,
        default: true,
      },

      isSystemMessage: {
        type: Boolean,
        default: false,
        index: true,
      },

      isEdited: {
        type: Boolean,
        default: false,
      },

      editedAt: {
        type: Date,
        default: null,
      },

      /*
       * Hard-hidden or administratively
       * removed messages.
       *
       * These records are excluded from
       * normal message queries.
       */
      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },

      /*
       * WhatsApp-style delete for everyone.
       *
       * Keep isDeleted false so the frontend
       * can still show:
       *
       * "This message was deleted."
       */
      deletedForEveryone: {
        type: Boolean,
        default: false,
        index: true,
      },

      deletedAt: {
        type: Date,
        default: null,
      },

      deletedBy: {
        type: senderSnapshotSchema,
        default: null,
      },
    },
    {
      timestamps: true,
      minimize: false,
    }
  );

/* =========================================================
   VALIDATION
========================================================= */

orderTrackingMessageSchema.pre(
  "validate",
  function validateMessage() {
    const hasText = Boolean(
      String(
        this.text || ""
      ).trim()
    );

    const hasAttachments =
      Array.isArray(
        this.attachments
      ) &&
      this.attachments.length > 0;

    const isDeletedPlaceholder =
      Boolean(
        this.deletedForEveryone
      );

    if (
      !hasText &&
      !hasAttachments &&
      !this.isSystemMessage &&
      !isDeletedPlaceholder
    ) {
      this.invalidate(
        "text",
        "Message text or attachment is required."
      );
    }
  }
);

/* =========================================================
   INDEXES
========================================================= */

orderTrackingMessageSchema.index({
  trackingId: 1,
  createdAt: -1,
});

orderTrackingMessageSchema.index({
  trackingId: 1,
  isDeleted: 1,
  createdAt: -1,
});

orderTrackingMessageSchema.index({
  trackingId: 1,
  deletedForEveryone: 1,
  createdAt: -1,
});

orderTrackingMessageSchema.index({
  trackingId: 1,
  "sender.userId": 1,
  createdAt: -1,
});

orderTrackingMessageSchema.index({
  trackingId: 1,
  "readBy.userId": 1,
  createdAt: -1,
});

/* =========================================================
   STATIC VALUES
========================================================= */

orderTrackingMessageSchema.statics.MESSAGE_TYPES =
  MESSAGE_TYPES;

/* =========================================================
   SAFE MODEL EXPORT
========================================================= */

module.exports =
  mongoose.models
    .OrderTrackingMessage ||
  mongoose.model(
    "OrderTrackingMessage",
    orderTrackingMessageSchema
  );