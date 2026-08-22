import React from "react";

const AttendanceHeader = ({
  user,
  canMarkAttendance,
  isSuperAdmin,
  onRegularize,
  onLeave,
  onWfh,
}) => {
  /* =========================================================
     USER DISPLAY

     Safe fallback only.
     Does not change permission logic.
  ========================================================= */

  const userName =
    user?.name ||
    user?.employeeName ||
    "";

  /* =========================================================
     ACTION HANDLERS

     Keep handlers guarded so an undefined callback can never
     crash the production Attendance page.
  ========================================================= */

  const handleRegularize = () => {
    if (
      typeof onRegularize ===
      "function"
    ) {
      onRegularize();
    }
  };

  const handleWfh = () => {
    if (
      typeof onWfh ===
      "function"
    ) {
      onWfh();
    }
  };

  const handleLeave = () => {
    if (
      typeof onLeave ===
      "function"
    ) {
      onLeave();
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <header className="timesheet-header">
      {/* =====================================================
          TITLE
      ====================================================== */}

      <div>
        <span className="attendance-eyebrow">
          BHARAT RMS
        </span>

        <h2>
          Attendance
        </h2>

        <p>
          Attendance, leave, WFH,
          regularization and location audit
          in one production view.
        </p>

        {userName ? (
          <span
            className="attendance-header-user"
            title={`Logged in as ${userName}`}
          >
            {userName}
          </span>
        ) : null}
      </div>

      {/* =====================================================
          ACTIONS

          PERMISSION RULES

          USER / ADMIN:
          - Regularize
          - Work From Home
          - Apply Leave

          SUPER ADMIN:
          - Regularize if canMarkAttendance
          - Work From Home if canMarkAttendance
          - NO Apply Leave button

          Backend must still enforce permissions.
      ====================================================== */}

      <div className="timesheet-header-actions attendance-hero-actions">
        {/* REGULARIZATION */}

        {canMarkAttendance ? (
          <button
            className="attendance-regularize-btn"
            type="button"
            onClick={handleRegularize}
          >
            Regularize
          </button>
        ) : null}

        {/* WORK FROM HOME */}

        {canMarkAttendance ? (
          <button
            className="attendance-wfh-btn"
            type="button"
            onClick={handleWfh}
          >
            Work From Home
          </button>
        ) : null}

        {/* LEAVE
            Intentionally hidden for Super Admin.
        */}

        {!isSuperAdmin &&
        canMarkAttendance ? (
          <button
            className="attendance-leave-btn"
            type="button"
            onClick={handleLeave}
          >
            Apply Leave
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default AttendanceHeader;