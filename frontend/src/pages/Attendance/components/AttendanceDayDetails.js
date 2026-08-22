import React, {
  useEffect,
} from "react";

import {
  displayCheckIn,
  displayCheckOut,
  formatMinutes,
  getHealth,
  isSunday,
} from "../utils/attendanceHelpers";

import LocationStatus from "./LocationStatus";

const AttendanceDayDetails = ({
  selectedDateKey,
  employees = [],
  attendanceForEmployee,
  todayKey,
  isSuperAdmin,
  latestLocations = {},
  loadLatest,
  onHistory,
  canMarkAttendance,
  currentUser,
  onRegularize,
}) => {
  /* =========================================================
     LOAD LATEST LOCATION FOR SELECTED DATE

     IMPORTANT:

     If user clicks:

     19 August

     selectedDateKey = 2026-08-19

     Every employee location request below
     uses 2026-08-19.

     It does NOT fall back to today's date.
  ========================================================= */

  useEffect(() => {
    if (
      !isSuperAdmin ||
      !selectedDateKey ||
      !Array.isArray(employees) ||
      employees.length === 0 ||
      typeof loadLatest !==
        "function"
    ) {
      return;
    }

    employees.forEach(
      (employee) => {
        loadLatest(
          employee,
          selectedDateKey
        );
      }
    );
  }, [
    isSuperAdmin,
    selectedDateKey,
    employees,
    loadLatest,
  ]);

  /* =========================================================
     NOTHING SELECTED
  ========================================================= */

  if (!selectedDateKey) {
    return null;
  }

  /* =========================================================
     CURRENT USER ID
  ========================================================= */

  const currentUserId =
    currentUser?._id ||
    currentUser?.id ||
    "";

  /* =========================================================
     SELECTED DATE FLAGS
  ========================================================= */

  const selectedDateIsFuture =
    selectedDateKey >
    todayKey;

  const selectedDateIsSunday =
    isSunday(
      selectedDateKey
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="attendance-admin-card att-selected-date">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="section-heading">
        <div>
          <span className="attendance-eyebrow">
            SELECTED DATE
          </span>

          <h3>
            {selectedDateKey}
          </h3>
        </div>

        <span>
          {selectedDateKey ===
          todayKey
            ? "Today"
            : "Saved date"}
        </span>
      </div>

      {/* =====================================================
          EMPLOYEE LIST
      ====================================================== */}

      {employees.length ===
      0 ? (
        <div className="empty-state">
          No employees found.
        </div>
      ) : (
        employees.map(
          (employee) => {
            const employeeId =
              employee?._id ||
              employee?.id ||
              "";

            const attendance =
              typeof attendanceForEmployee ===
              "function"
                ? attendanceForEmployee(
                    employee,
                    selectedDateKey
                  )
                : null;

            const health =
              getHealth(
                attendance,
                selectedDateKey,
                todayKey
              );

            const isOwnEmployee =
              String(
                employeeId
              ) ===
              String(
                currentUserId
              );

            /* ===============================================
               LOCATION CACHE KEY

               Exact key format must match AttendancePage:

               `${employeeId}:${selectedDateKey}`
            =============================================== */

            const locationCacheKey =
              `${employeeId}:${selectedDateKey}`;

            const latestLocation =
              latestLocations[
                locationCacheKey
              ] ||
              null;

            /* ===============================================
               REGULARIZATION

               We intentionally DO NOT block because:

               attendance has both Check In + Check Out.

               This allows correction for:

               late Check In
               early Check Out
               incorrect time
               missing Check In
               missing Check Out
            =============================================== */

            const regularizationPending =
              attendance
                ?.regularization
                ?.status ===
              "pending";

            const approvedLeave =
              attendance
                ?.attendanceStatus ===
                "on_leave" ||
              attendance
                ?.attendanceStatus ===
                "loss_of_pay";

            const canRegularizeThisDate =
              canMarkAttendance &&
              isOwnEmployee &&
              !selectedDateIsFuture &&
              !selectedDateIsSunday &&
              !approvedLeave &&
              !regularizationPending;

            return (
              <article
                className="employee-attendance-day-card"
                key={
                  employeeId ||
                  employee?.email ||
                  employee?.name
                }
              >
                {/* ===========================================
                    EMPLOYEE HEADER
                =========================================== */}

                <div className="employee-attendance-day-top">
                  <div>
                    <h4>
                      {employee?.name ||
                        attendance?.employeeName ||
                        "Employee"}
                    </h4>

                    <p>
                      {employee?.email ||
                        attendance?.employeeEmail ||
                        ""}
                    </p>
                  </div>

                  <span
                    className={`attendance-health-pill ${health.className}`}
                  >
                    {health.label}
                  </span>
                </div>

                {/* ===========================================
                    ATTENDANCE DETAILS
                =========================================== */}

                <div className="attendance-detail-box">
                  <div>
                    <span>
                      Check In
                    </span>

                    <strong>
                      {displayCheckIn(
                        attendance
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Check Out
                    </span>

                    <strong>
                      {displayCheckOut(
                        attendance
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Working
                    </span>

                    <strong>
                      {formatMinutes(
                        attendance?.totalWorkingMinutes
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Mode
                    </span>

                    <strong>
                      {attendance?.workMode ===
                      "work_from_home"
                        ? "WFH"
                        : "Office"}
                    </strong>
                  </div>
                </div>

                {/* ===========================================
                    SUPER ADMIN LOCATION

                    Shows:

                    Current / Latest Location
                    Map
                    History

                    History uses selectedDateKey.
                =========================================== */}

                {isSuperAdmin ? (
                  <LocationStatus
                    point={
                      latestLocation
                    }
                    isSuperAdmin={
                      isSuperAdmin
                    }
                    dateKey={
                      selectedDateKey
                    }
                    employee={
                      employee
                    }
                    onHistory={() => {
                      if (
                        typeof onHistory ===
                        "function"
                      ) {
                        onHistory(
                          employee,
                          selectedDateKey
                        );
                      }
                    }}
                  />
                ) : null}

                {/* ===========================================
                    REGULARIZATION

                    Always opens unified:

                    Check In
                    Check Out
                    Reason
                =========================================== */}

                {canRegularizeThisDate ? (
                  <div className="calendar-regularize-panel">
                    <div>
                      <strong>
                        Attendance Correction
                      </strong>

                      <p>
                        Correct Check In
                        and Check Out
                        together for this
                        date.
                      </p>
                    </div>

                    <button
                      className="calendar-regularize-btn"
                      type="button"
                      onClick={() => {
                        if (
                          typeof onRegularize ===
                          "function"
                        ) {
                          onRegularize(
                            selectedDateKey,
                            attendance
                          );
                        }
                      }}
                    >
                      Regularize
                    </button>
                  </div>
                ) : null}

                {/* ===========================================
                    PENDING REGULARIZATION NOTICE
                =========================================== */}

                {regularizationPending ? (
                  <div className="attendance-warning-box">
                    A regularization
                    request is already
                    pending for this date.
                  </div>
                ) : null}

                {/* ===========================================
                    APPROVED LEAVE NOTICE
                =========================================== */}

                {approvedLeave ? (
                  <div className="attendance-warning-box">
                    Regularization is
                    unavailable because
                    this date is marked
                    as approved leave.
                  </div>
                ) : null}
              </article>
            );
          }
        )
      )}
    </section>
  );
};

export default AttendanceDayDetails;