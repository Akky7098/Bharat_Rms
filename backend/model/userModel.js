const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
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

    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    attendanceMode: {
  type: String,
  enum: ["office", "work_from_home"],
  default: "office",
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
