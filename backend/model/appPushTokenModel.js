const mongoose = require("mongoose");

const appPushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      required: true,
      index: true,
    },

    expoPushToken: {
      type: String,
      required: true,
      unique: true,
    },

    platform: {
      type: String,
      enum: ["android", "ios", "unknown"],
      default: "unknown",
    },

    deviceName: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppPushToken", appPushTokenSchema);