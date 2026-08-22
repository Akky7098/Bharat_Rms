const mongoose =
  require("mongoose");

/* =========================================================
   REQUEST TYPES

   Keep OLD values for production compatibility.

   Add NEW Bharat Intelligence analytics values.

   IMPORTANT:
   Router values such as BUSINESS_DATA or
   GENERAL_KNOWLEDGE are also allowed temporarily so
   existing service code cannot break logging.

   Later, once requestType is fully normalized before
   logging, these router-level values can be removed.
========================================================= */

const REQUEST_TYPES = [
  /* =======================================================
     OLD PRODUCTION VALUES
  ======================================================= */

  "GENERAL",
  "DATA_LOOKUP",
  "ANALYSIS",
  "REPORT_GENERATION",

  /* =======================================================
     NEW ANALYTICS VALUES
  ======================================================= */

  "unknown",

  "general_knowledge",
  "technical_knowledge",

  "daily_activity",

  "sales",
  "enquiry",
  "dispatch",
  "receivable",
  "order_tracking",

  "attendance",
  "timesheet",
  "sales_activity",

  "team_performance",
  "management",

  "document",
  "live_research",
  "calculation",

  /* =======================================================
     ROUTER VALUES

     Allowed for backward/current compatibility.

     Prefer analytics values above for long-term reporting.
  ======================================================= */

  "BUSINESS_DATA",
  "GENERAL_KNOWLEDGE",
  "MATH_OR_CONVERSION",
  "DOCUMENT",
  "LIVE_RESEARCH",
  "HYBRID",
];

/* =========================================================
   AI USAGE LOG
========================================================= */

const aiUsageLogSchema =
  new mongoose.Schema(
    {
      /* ===================================================
         USER
      =================================================== */

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      /* ===================================================
         CONVERSATION
      =================================================== */

      conversationId: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      /* ===================================================
         PROVIDER
      =================================================== */

      provider: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      /* ===================================================
         MODEL
      =================================================== */

      model: {
        type:
          String,

        trim:
          true,

        default:
          "",

        index:
          true,
      },

      /* ===================================================
         REQUEST TYPE

         Used for:
         - cost analysis
         - usage dashboards
         - feature adoption
         - model routing analytics
      =================================================== */

      requestType: {
        type:
          String,

        enum:
          REQUEST_TYPES,

        default:
          "unknown",

        index:
          true,
      },

      /* ===================================================
         TOKENS
      =================================================== */

      inputTokens: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      outputTokens: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      totalTokens: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* ===================================================
         TOOL USAGE
      =================================================== */

      toolCalls: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* ===================================================
         PERFORMANCE
      =================================================== */

      latencyMs: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      /* ===================================================
         RESULT
      =================================================== */

      success: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      errorMessage: {
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

/* =========================================================
   INDEXES
========================================================= */

/*
 * User usage history.
 */

aiUsageLogSchema.index({
  userId:
    1,

  createdAt:
    -1,
});

/*
 * Model-cost / model-usage reporting.
 */

aiUsageLogSchema.index({
  createdAt:
    -1,

  model:
    1,
});

/*
 * Request-type analytics.
 */

aiUsageLogSchema.index({
  requestType:
    1,

  createdAt:
    -1,
});

/*
 * Provider/model usage reporting.
 */

aiUsageLogSchema.index({
  provider:
    1,

  model:
    1,

  createdAt:
    -1,
});

/*
 * Success/failure monitoring.
 */

aiUsageLogSchema.index({
  success:
    1,

  createdAt:
    -1,
});

/* =========================================================
   EXPORT CONSTANT

   Useful later for dashboards / validation.
========================================================= */

module.exports =
  mongoose.models
    .AiUsageLog ||
  mongoose.model(
    "AiUsageLog",
    aiUsageLogSchema
  );

module.exports.REQUEST_TYPES =
  REQUEST_TYPES;