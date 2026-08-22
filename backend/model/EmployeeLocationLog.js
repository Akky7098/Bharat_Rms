const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
   EMPLOYEE LOCATION LOG

   IMPORTANT:
   One MongoDB document = one genuine GPS checkpoint.

   We deliberately DO NOT keep all checkpoints inside
   Attendance because a working day can contain many
   location records.

   Attendance remains the daily attendance summary.
===================================================== */

const employeeLocationLogSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attendanceId: {
      type: Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
      index: true,
    },

    /*
     * Same stable attendance day used by Attendance.
     * Stored as UTC midnight day-key.
     */
    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },

    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    accuracy: {
      type: Number,
      default: null,
      min: 0,
    },

    /*
     * Calculated by backend when office coordinates
     * are configured.
     */
    distanceFromOfficeMeters: {
      type: Number,
      default: null,
      min: 0,
    },

    isWithinOffice: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * The employee's Attendance work mode for this day.
     *
     * Do NOT use this field to determine whether the
     * employee is actually inside the office.
     */
    workMode: {
      type: String,
      enum: [
        "office",
        "work_from_home",
      ],
      default: "office",
      index: true,
    },

    /*
     * Why this GPS point was created.
     */
    source: {
      type: String,
      enum: [
        "periodic",
        "app_open",
        "manual_refresh",
      ],
      default: "periodic",
      index: true,
    },

    /*
     * Classification produced from GPS.

     * office:
     * GPS is within office radius.

     * outside_office:
     * GPS is outside office radius.

     * home:
     * WFH employee is inside configured home radius.

     * remote:
     * WFH employee but outside configured home radius.

     * unknown:
     * Location could not be classified reliably.
     */
    locationStatus: {
      type: String,
      enum: [
        "office",
        "outside_office",
        "home",
        "remote",
        "unknown",
      ],
      default: "unknown",
      index: true,
    },

    distanceFromHomeMeters: {
      type: Number,
      default: null,
      min: 0,
    },

    isWithinHome: {
      type: Boolean,
      default: false,
    },

    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },

    userAgent: {
      type: String,
      trim: true,
      default: "",
    },

    deviceType: {
      type: String,
      enum: [
        "desktop",
        "mobile",
        "tablet",
        "unknown",
      ],
      default: "unknown",
    },

    /*
     * Optional reverse-geocoded address.
     *
     * Do NOT make an external geocoding call for every
     * checkpoint unless you actually need it.
     */
    locationAddress: {
      type: String,
      trim: true,
      default: "",
    },

    googleMapLink: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

/* =====================================================
   INDEXES
===================================================== */

employeeLocationLogSchema.index({
  employeeId: 1,
  attendanceDate: 1,
  capturedAt: 1,
});

employeeLocationLogSchema.index({
  attendanceId: 1,
  capturedAt: 1,
});

employeeLocationLogSchema.index({
  attendanceDate: 1,
  isWithinOffice: 1,
});

employeeLocationLogSchema.index({
  employeeId: 1,
  capturedAt: -1,
});

/*
 * TTL is intentionally NOT used.
 *
 * Management history should not disappear automatically
 * unless you later define an explicit retention policy.
 */

module.exports =
  mongoose.models.EmployeeLocationLog ||
  mongoose.model(
    "EmployeeLocationLog",
    employeeLocationLogSchema
  );