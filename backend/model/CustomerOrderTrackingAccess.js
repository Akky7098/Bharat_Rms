const mongoose =
  require("mongoose");

const {
  Schema,
} = mongoose;

/* =========================================================
   CUSTOMER ORDER TRACKING ACCESS

   IMPORTANT SECURITY DESIGN

   - Customer never receives MongoDB IDs.
   - Customer never receives internal auth token.
   - Raw public token is NEVER stored in MongoDB.
   - Only SHA-256 hash is stored.
   - One active tracking access per Sales Order.
========================================================= */

const customerOrderTrackingAccessSchema =
  new Schema(
    {
      salesOrderId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "SalesOrderForm",

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      /*
       * SHA-256 of the public token.
       *
       * Raw token only exists when the link
       * is generated.
       */
      tokenHash: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        trim:
          true,
      },

      customerEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      salesPersonEmail: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },

      issuedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      lastEmailSentAt: {
        type:
          Date,

        default:
          null,
      },

      lastOpenedAt: {
        type:
          Date,

        default:
          null,
      },

      openCount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      emailMessageId: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      emailError: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },

      revokedAt: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      minimize:
        false,
    }
  );


customerOrderTrackingAccessSchema.index({
  tokenHash:
    1,

  isActive:
    1,
});


module.exports =
  mongoose.models
    .CustomerOrderTrackingAccess ||
  mongoose.model(
    "CustomerOrderTrackingAccess",

    customerOrderTrackingAccessSchema
  );