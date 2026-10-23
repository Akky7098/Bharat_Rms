const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    googleId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    googleLinkedAt: Date,

    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    // Optional existing employee default; date-scoped WFH approvals live in AttendanceRequest.
    attendanceWorkMode: {
      type: String,
      enum: ["office", "work_from_home"],
    },
    attendanceMode: {
  type: String,
  enum: ["office", "work_from_home"],
  default: "office",
},
whatsappNumber: {
  type: String,
  trim: true,
},

homeLocation: {
  latitude: Number,
  longitude: Number,
  radiusMeters: {
    type: Number,
    default: 100,
  },
},
  },
  {
    timestamps: true,
  }
);
 const User = mongoose.model("User", userSchema);

   module.exports = User
