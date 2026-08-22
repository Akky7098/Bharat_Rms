import React from "react";

import {
  displayCheckIn,
  displayCheckOut,
  formatMinutes,
} from "../utils/attendanceHelpers";

const AttendanceTodayCard = ({
  attendance,
  canMarkAttendance,
  actionLoading,
  onCheckIn,
  onCheckOut,
  onRegularize,
}) => {
  /* =========================================================
     ATTENDANCE STATE
  ========================================================= */

  const checkedIn =
    Boolean(
      attendance?.checkIn?.time
    );

  const checkedOut =
    Boolean(
      attendance?.checkOut?.time
    );

  const regularizationPending =
    attendance
      ?.regularization
      ?.status ===
    "pending";

  const isBusy =
    Boolean(
      actionLoading
    );

  /* =========================================================
     SAFE HANDLERS
  ========================================================= */

  const handleCheckIn = () => {
    if (
      typeof onCheckIn ===
      "function"
    ) {
      onCheckIn();
    }
  };

  const handleCheckOut = () => {
    if (
      typeof onCheckOut ===
      "function"
    ) {
      onCheckOut();
    }
  };

  const handleRegularize = () => {
    if (
      typeof onRegularize ===
      "function"
    ) {
      onRegularize();
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="attendance-action-card">
      {/* =====================================================
          TODAY SUMMARY
      ====================================================== */}

      <div>
        <span className="attendance-eyebrow">
          TODAY
        </span>

        <h3>
          Your Attendance
        </h3>

        <p>
          Check In:{" "}
          <b>
            {displayCheckIn(
              attendance
            )}
          </b>

          {" · "}

          Check Out:{" "}
          <b>
            {displayCheckOut(
              attendance
            )}
          </b>

          {" · "}

          Working:{" "}
          <b>
            {formatMinutes(
              attendance
                ?.totalWorkingMinutes
            )}
          </b>
        </p>

        {/* ===================================================
            REGULARIZATION STATUS
        =================================================== */}

        {regularizationPending ? (
          <div className="attendance-today-status-note pending">
            Regularization request
            is pending for today.
          </div>
        ) : null}

        {checkedIn &&
        !checkedOut ? (
          <div className="attendance-today-status-note active">
            Attendance is active.
            Location checkpoints can
            continue while you remain
            checked in.
          </div>
        ) : null}
      </div>

      {/* =====================================================
          ACTION BUTTONS
      ====================================================== */}

      {canMarkAttendance ? (
        <div className="attendance-action-buttons">
          {/* CHECK IN */}

          <button
            className="attendance-checkin-btn"
            disabled={
              checkedIn ||
              isBusy
            }
            onClick={
              handleCheckIn
            }
            type="button"
          >
            {actionLoading ===
            "checkin"
              ? "Checking In..."
              : checkedIn
                ? "Checked In"
                : "Check In"}
          </button>

          {/* CHECK OUT */}

          <button
            className="attendance-checkout-btn"
            disabled={
              !checkedIn ||
              checkedOut ||
              isBusy
            }
            onClick={
              handleCheckOut
            }
            type="button"
          >
            {actionLoading ===
            "checkout"
              ? "Checking Out..."
              : checkedOut
                ? "Checked Out"
                : "Check Out"}
          </button>

          {/* =================================================
              REGULARIZE

              IMPORTANT:
              We DO NOT disable because:
              - both punches exist
              - employee is checked out
              - attendance is complete

              A complete attendance can still require
              correction for late check-in or early checkout.

              Only pending regularization disables it here.
          ================================================= */}

          <button
            className="attendance-regularize-btn"
            disabled={
              regularizationPending ||
              isBusy
            }
            onClick={
              handleRegularize
            }
            type="button"
          >
            {regularizationPending
              ? "Regularization Pending"
              : "Regularize"}
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default AttendanceTodayCard;