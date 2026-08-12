const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const USER_ROLES = [
  "super_admin",
  "admin",
  "user",
  "manager",
  "dispatch",
  "production",
];

const ORDER_TYPES = [
  "H.O.",
  "N.H.O.",
];

const TRACKING_STATUSES = [
  "planning",
  "under_casting",

  "rolling_planning",
  "rolling",

  "forging_planning",
  "forging",

  "pit_cooling",
  "inspection",

  "annealing",
  "normalizing",
  "quenching",
  "tempering",

  "end_cutting_mill_inspection",
  "bharat_inspection",

  "cutting",
  "machining",

  "ready_for_dispatch",
  "loading",
  "shipped",
  "out_for_delivery",
  "delivered",

  "on_hold",
  "cancelled",
];

const MILESTONE_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "on_hold",
];

const ACTIVITY_TYPES = [
  "tracking_created",
  "status_changed",
  "milestone_completed",
  "milestone_updated",
  "estimated_date_changed",
  "actual_date_changed",
  "transporter_updated",
  "comment_added",
  "hold",
  "resumed",
  "cancelled",
];

/* =========================================================
   USER SNAPSHOT
========================================================= */

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

/* =========================================================
   ATTACHMENT
========================================================= */

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

    fileSize: {
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
   MILESTONE
========================================================= */

const milestoneSchema = new Schema(
  {
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },

    code: {
      type: String,
      enum: TRACKING_STATUSES,
      required: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    /*
      This is the planned day from approval date.

      Example:

      Planning
      targetDay = 2

      Under Casting
      targetDay = 10

      Rolling Planning
      targetDay = 14

      Estimated date will be calculated by service:
      approvedAt + targetDay
    */
    targetDay: {
      type: Number,
      min: 0,
      default: null,
    },

    originalEstimatedDate: {
  type: Date,
  default: null,
},

estimatedDate: {
  type: Date,
  default: null,
},



    /*
      When dispatch/user clicks "Done now",
      service will automatically set actualDate = new Date()
    */
    actualDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: MILESTONE_STATUSES,
      default: "pending",
    },

    isCurrent: {
      type: Boolean,
      default: false,
    },

    completedBy: {
      type: userSnapshotSchema,
      default: null,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
    },

    estimatedDateComment: {
  type: String,
  default: "",
  trim: true,
},

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

/* =========================================================
   ACTIVITY HISTORY
========================================================= */

const activityHistorySchema = new Schema(
  {
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },

    status: {
      type: String,
      enum: TRACKING_STATUSES,
      default: null,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    previousValue: {
      type: Schema.Types.Mixed,
      default: null,
    },

    newValue: {
      type: Schema.Types.Mixed,
      default: null,
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

/* =========================================================
   MAIN ORDER TRACKING SCHEMA
========================================================= */

const orderTrackingSchema = new Schema(
  {
    /* -----------------------------------------------------
       TRACKING IDENTIFICATION
    ----------------------------------------------------- */

    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    salesOrderId: {
      type: Schema.Types.ObjectId,
      ref: "SalesOrderForm",
      required: true,
      index: true,
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

    /* -----------------------------------------------------
       H.O. / N.H.O.
    ----------------------------------------------------- */

    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: true,
      index: true,
    },

    /*
      This is automatically calculated from Sales Order
      supplyCondition for N.H.O.

      Examples:

      AS_ROLLED
      AS_FORGED

      AS_ROLLED_ANNEALED_NORMALIZED
      AS_FORGED_ANNEALED_NORMALIZED

      AS_ROLLED_QT
      AS_FORGED_QT

      H_O
    */
    processType: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    /*
      Exact supply condition copied from Sales Order.

      Example:
      as_rolled
      as_forged
      as_rolled_annealed
      as_rolled_normalised
      as_rolled_qt
    */
    supplyCondition: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    /* -----------------------------------------------------
       CUSTOMER SNAPSHOT
    ----------------------------------------------------- */

    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
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

    /* -----------------------------------------------------
       SALES PERSON SNAPSHOT
    ----------------------------------------------------- */

    salesPersonId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
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

    /* -----------------------------------------------------
       MATERIAL SNAPSHOT
    ----------------------------------------------------- */

    material: {
      grade: {
        type: String,
        default: "",
        trim: true,
      },

      size: {
        type: String,
        default: "",
        trim: true,
      },

      quantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      quantityUnit: {
        type: String,
        default: "KG",
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },
    },

    /* -----------------------------------------------------
       APPROVAL BASE DATE

       All estimated dates are generated from this date.
    ----------------------------------------------------- */

    approvedAt: {
      type: Date,
      required: true,
      index: true,
    },

    approvedBy: {
      type: userSnapshotSchema,
      required: true,
    },

    /* -----------------------------------------------------
       CURRENT TRACKING STATUS
    ----------------------------------------------------- */

    currentStatus: {
      type: String,
      enum: TRACKING_STATUSES,
      default: "planning",
      index: true,
    },

    currentStatusLabel: {
      type: String,
      default: "Planning",
      trim: true,
    },

    currentMilestoneId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /* -----------------------------------------------------
       FULL TIMELINE
    ----------------------------------------------------- */

    milestones: {
      type: [milestoneSchema],
      default: [],
    },

    /* -----------------------------------------------------
       ESTIMATED SUMMARY DATES

       These are copied from milestone estimated dates
       for quick table/dashboard access.
    ----------------------------------------------------- */

    estimatedReadyDate: {
      type: Date,
      default: null,
      index: true,
    },

    estimatedLoadingDate: {
      type: Date,
      default: null,
    },

    estimatedShipDate: {
      type: Date,
      default: null,
    },

    estimatedDeliveryDate: {
      type: Date,
      default: null,
      index: true,
    },

    /* -----------------------------------------------------
       ACTUAL SUMMARY DATES
    ----------------------------------------------------- */

    actualReadyDate: {
      type: Date,
      default: null,
    },

    actualLoadingDate: {
      type: Date,
      default: null,
    },

    actualShipDate: {
      type: Date,
      default: null,
    },

    actualDeliveryDate: {
      type: Date,
      default: null,
    },

    /* -----------------------------------------------------
       TRANSPORT
    ----------------------------------------------------- */

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
        uppercase: true,
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

      lrNumber: {
        type: String,
        default: "",
        trim: true,
      },
    },

    /* -----------------------------------------------------
       HOLD
    ----------------------------------------------------- */

    isOnHold: {
      type: Boolean,
      default: false,
      index: true,
    },

    holdReason: {
      type: String,
      default: "",
      trim: true,
    },

    holdStartedAt: {
      type: Date,
      default: null,
    },

    /* -----------------------------------------------------
       CANCELLATION
    ----------------------------------------------------- */

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    /* -----------------------------------------------------
       HISTORY
    ----------------------------------------------------- */

    activityHistory: {
      type: [activityHistorySchema],
      default: [],
    },

    /* -----------------------------------------------------
       AUDIT
    ----------------------------------------------------- */

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

/* =========================================================
   INDEXES
========================================================= */

/*
  One active tracking document per Sales Order.
*/
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

/*
  Main tracking table:
  customer + status + recently updated.
*/
orderTrackingSchema.index({
  companyName: 1,
  currentStatus: 1,
  updatedAt: -1,
});

/*
  Sales person's active orders.
*/
orderTrackingSchema.index({
  salesPersonId: 1,
  isActive: 1,
  updatedAt: -1,
});

/*
  H.O. / N.H.O. filtering.
*/
orderTrackingSchema.index({
  orderType: 1,
  currentStatus: 1,
  updatedAt: -1,
});

/*
  Process filtering.
*/
orderTrackingSchema.index({
  processType: 1,
  currentStatus: 1,
  updatedAt: -1,
});

/*
  Supply condition filtering.
*/
orderTrackingSchema.index({
  supplyCondition: 1,
  currentStatus: 1,
});

/*
  Delivery ETA / delayed tracking.
*/
orderTrackingSchema.index({
  estimatedDeliveryDate: 1,
  currentStatus: 1,
});

/*
  Ready-for-dispatch monitoring.
*/
orderTrackingSchema.index({
  estimatedReadyDate: 1,
  currentStatus: 1,
});

/* =========================================================
   STATIC CONSTANTS
========================================================= */

orderTrackingSchema.statics.TRACKING_STATUSES =
  TRACKING_STATUSES;

orderTrackingSchema.statics.ORDER_TYPES =
  ORDER_TYPES;

orderTrackingSchema.statics.MILESTONE_STATUSES =
  MILESTONE_STATUSES;

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  mongoose.models.OrderTracking ||
  mongoose.model(
    "OrderTracking",
    orderTrackingSchema
  );