const mongoose =
  require("mongoose");

const documentSchema =
  new mongoose.Schema(
    {
      folderId: {
        type:
          mongoose.Schema
            .Types
            .ObjectId,

        ref:
          "DocumentFolder",

        required:
          true,
      },

      title: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      description: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      accessLevel: {
        type:
          String,

        enum: [
          "private",
          "admin_only",
          "all_users",
        ],

        default:
          "private",

        index:
          true,
      },

      fileName: {
        type:
          String,

        required:
          true,
      },

      originalFileName: {
        type:
          String,

        required:
          true,
      },

      fileUrl: {
        type:
          String,

        required:
          true,
      },

      filePath: {
        type:
          String,

        required:
          true,
      },

      mimeType: {
        type:
          String,

        required:
          true,
      },

      fileSize: {
        type:
          Number,

        required:
          true,
      },

      uploadedBy: {
        userId: {
          type:
            mongoose.Schema
              .Types
              .ObjectId,

          ref:
            "User",

          required:
            true,
        },

        name:
          String,

        email:
          String,

        role:
          String,
      },

      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },
    },
    {
      timestamps:
        true,
    }
  );

/* =========================================================
   SEARCH
========================================================= */

documentSchema.index({
  title:
    "text",

  description:
    "text",

  originalFileName:
    "text",
});

documentSchema.index({
  accessLevel:
    1,

  isActive:
    1,

  updatedAt:
    -1,
});

module.exports =
  mongoose.models
    .Document ||
  mongoose.model(
    "Document",
    documentSchema
  );