const mongoose = require("mongoose");

const { Schema } = mongoose;

const USER_ROLES = [
  "super_admin",
  "admin",
  "user",
  "manager",
  "dispatch",
  "production",
];

const ORDER_TRACKING_STATUSES = [
  "order_approved",
  "planning",
  "material_pending",
  "cutting_started",
  "cutting_partial",
  "cutting_completed",
  "machining_started",
  "machining_partial",
  "machining_completed",
  "ready_for_dispatch",
  "loading_started",
  "dispatched",
  "in_transit",
  "reached_destination",
  "delivered",
  "on_hold",
  "cancelled",
];

const attachmentSchema = new Schema(
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

const userSnapshotSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
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

const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: ORDER_TRACKING_STATUSES,
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ORDER_TRACKING_STATUSES,
      default: null,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
    transporterName: {
      type: String,
      default: "",
      trim: true,
    },
    expectedDateTime: {
      type: Date,
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    updatedBy: {
      type: userSnapshotSchema,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

const unreadCountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    count: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);



const chatParticipantSchema =
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

      joinedAt: {
        type: Date,
        default: Date.now,
      },

      lastSeenAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
      timestamps: false,
    }
  );

const orderTrackingSchema = new Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    salesOrderId: {
      type: Schema.Types.ObjectId,
      ref: "SalesOrderForm",
      required: true,
    },

    salesOrderNo: {
      type: String,
      default: "",
      trim: true,
    },

    poNumber: {
      type: String,
      default: "",
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    companyAddress: {
      type: String,
      default: "",
      trim: true,
    },

    shippingAddress: {
      type: String,
      default: "",
      trim: true,
    },

    contactPersonName: {
      type: String,
      default: "",
      trim: true,
    },

    contactPersonNumber: {
      type: String,
      default: "",
      trim: true,
    },

    contactPersonEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    salesPersonId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    salesPersonName: {
      type: String,
      default: "",
      trim: true,
    },

    salesPersonEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    materialSnapshot: {
      type: String,
      default: "",
      trim: true,
    },

    currentStatus: {
      type: String,
      enum: ORDER_TRACKING_STATUSES,
      default: "order_approved",
      index: true,
    },

    previousStatus: {
      type: String,
      enum: ORDER_TRACKING_STATUSES,
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
      index: true,
    },

    sourcePlant: {
      plantName: {
        type: String,
        default: "",
        trim: true,
      },
      plantCode: {
        type: String,
        default: "",
        trim: true,
      },
    },

    transporter: {
      transporterName: {
        type: String,
        default: "",
        trim: true,
      },
      vehicleNumber: {
        type: String,
        default: "",
        trim: true,
      },
      driverName: {
        type: String,
        default: "",
        trim: true,
      },
      driverPhone: {
        type: String,
        default: "",
        trim: true,
      },
    },

    expectedReadyDate: {
      type: Date,
      default: null,
    },

    expectedDispatchDate: {
      type: Date,
      default: null,
    },

    dispatchDateTime: {
      type: Date,
      default: null,
    },

    expectedDeliveryDateTime: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    deliveredBy: {
      type: userSnapshotSchema,
      default: null,
    },

    receiverName: {
      type: String,
      default: "",
      trim: true,
    },

    latestUpdateText: {
      type: String,
      default: "",
      trim: true,
    },

    latestUpdateAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    latestUpdateBy: {
      type: userSnapshotSchema,
      default: null,
    },

    updateRequested: {
      type: Boolean,
      default: false,
      index: true,
    },

    updateRequestedAt: {
      type: Date,
      default: null,
    },

    updateRequestedBy: {
      type: userSnapshotSchema,
      default: null,
    },

    chatStatus: {
  type: String,
  enum: ["open", "closed"],
  default: "open",
  index: true,
},

chatParticipants: {
  type: [chatParticipantSchema],
  default: [],
},

unreadCountByUser: {
  type: [unreadCountSchema],
  default: [],
},

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    createdBy: {
      type: userSnapshotSchema,
      required: true,
    },

    lastUpdatedBy: {
      type: userSnapshotSchema,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: userSnapshotSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

orderTrackingSchema.index(
  {
    salesOrderId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  }
);

orderTrackingSchema.index({
  companyName: 1,
  currentStatus: 1,
  latestUpdateAt: -1,
});

orderTrackingSchema.index({
  salesPersonId: 1,
  isActive: 1,
  latestUpdateAt: -1,
});

orderTrackingSchema.index({
  "sourcePlant.plantName": 1,
  currentStatus: 1,
});

orderTrackingSchema.index({
  trackingNumber: 1,
  isActive: 1,
});

orderTrackingSchema.statics.ORDER_TRACKING_STATUSES =
  ORDER_TRACKING_STATUSES;

module.exports =
  mongoose.models.OrderTracking ||
  mongoose.model(
    "OrderTracking",
    orderTrackingSchema
  );
