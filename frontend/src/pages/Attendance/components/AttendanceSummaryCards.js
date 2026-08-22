import React from "react";

const AttendanceSummaryCards = ({
  todayAttendance,
  leaveSummary,
  pendingRegularizations = 0,
  approvedWfhCount = 0,
}) => {
  /* =========================================================
     SAFE LEAVE BALANCE
  ========================================================= */

  const balance =
    leaveSummary?.balance ||
    {};

  const paidLeaveRemaining =
    balance?.paidLeaveRemaining ??
    balance?.remaining ??
    "-";

  /* =========================================================
     TODAY STATUS
  ========================================================= */

  const checkedIn =
    Boolean(
      todayAttendance
        ?.checkIn
        ?.time
    );

  const checkedOut =
    Boolean(
      todayAttendance
        ?.checkOut
        ?.time
    );

  let todayStatus =
    "Pending";

  if (
    checkedIn &&
    !checkedOut
  ) {
    todayStatus =
      "Checked In";
  }

  if (
    checkedIn &&
    checkedOut
  ) {
    todayStatus =
      "Completed";
  }

  if (
    todayAttendance
      ?.attendanceStatus ===
    "on_leave"
  ) {
    todayStatus =
      "On Leave";
  }

  if (
    todayAttendance
      ?.attendanceStatus ===
    "loss_of_pay"
  ) {
    todayStatus =
      "Loss of Pay";
  }

  /* =========================================================
     SAFE COUNTS
  ========================================================= */

  const regularizationCount =
    Number(
      pendingRegularizations ||
      0
    );

  const wfhCount =
    Number(
      approvedWfhCount ||
      0
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="attendance-summary-grid">
      {/* TODAY */}

      <article className="attendance-summary-card">
        <span>
          Today
        </span>

        <strong>
          {todayStatus}
        </strong>

        <small>
          Current attendance state
        </small>
      </article>

      {/* PAID LEAVE */}

      <article className="attendance-summary-card leave">
        <span>
          Paid Leave
        </span>

        <strong>
          {paidLeaveRemaining}
        </strong>

        <small>
          Available balance
        </small>
      </article>

      {/* REGULARIZATION */}

      <article className="attendance-summary-card pending">
        <span>
          Regularization
        </span>

        <strong>
          {
            regularizationCount
          }
        </strong>

        <small>
          Pending requests
        </small>
      </article>

      {/* WFH */}

      <article className="attendance-summary-card wfh">
        <span>
          WFH
        </span>

        <strong>
          {wfhCount}
        </strong>

        <small>
          Approved in selected period
        </small>
      </article>
    </section>
  );
};

export default AttendanceSummaryCards;