import React from "react";

import {
  displayCheckIn,
  displayCheckOut,
  formatMinutes,
  formatTime,
  getDateKey,
  getHealth,
  pointLabel,
  pointMap,
  pointTime,
} from "../utils/attendanceHelpers";

const AttendanceAdminOverview = ({
  records = [],
  todayKey,
  isSuperAdmin,
  latestLocations = {},
  onHistory,
}) => {
  /* =========================================================
     NO RECORDS
  ========================================================= */

  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {
    return null;
  }

  /* =========================================================
     HISTORY HANDLER

     IMPORTANT:
     The exact attendance dateKey is passed.

     For today's overview:
     key = todayKey

     For any future reuse with another date:
     key comes from attendanceDate.

     History never assumes today's date.
  ========================================================= */

  const openHistory = (
    attendance,
    employeeId,
    dateKey
  ) => {
    if (
      !isSuperAdmin ||
      typeof onHistory !==
        "function"
    ) {
      return;
    }

    onHistory(
      {
        _id:
          employeeId,

        id:
          employeeId,

        name:
          attendance?.employeeName ||
          attendance?.employeeId
            ?.name ||
          "Employee",

        email:
          attendance?.employeeEmail ||
          attendance?.employeeId
            ?.email ||
          "",
      },
      dateKey
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="attendance-admin-card">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="section-heading">
        <div>
          <span className="attendance-eyebrow">
            LIVE OVERVIEW
          </span>

          <h3>
            Today Attendance
          </h3>
        </div>

        <span>
          {records.length}{" "}
          {records.length === 1
            ? "record"
            : "records"}
        </span>
      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <div className="attendance-admin-table-wrap">
        <table className="attendance-admin-table">
          <thead>
            <tr>
              <th>
                Employee
              </th>

              <th>
                Check In
              </th>

              <th>
                Check Out
              </th>

              <th>
                Total
              </th>

              <th>
                Mode
              </th>

              <th>
                Status
              </th>

              {isSuperAdmin ? (
                <th>
                  Current Location
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {records.map(
              (
                attendance
              ) => {
                /* ===========================================
                   EMPLOYEE ID
                =========================================== */

                const employeeId =
                  attendance
                    ?.employeeId
                    ?._id ||
                  attendance
                    ?.employeeId ||
                  attendance?._id ||
                  "";

                /* ===========================================
                   ATTENDANCE DATE

                   Use the actual record date first.

                   Only fall back to todayKey when the record
                   does not contain a date.
                =========================================== */

                const dateKey =
                  getDateKey(
                    attendance
                      ?.attendanceDate
                  ) ||
                  todayKey;

                /* ===========================================
                   HEALTH
                =========================================== */

                const health =
                  getHealth(
                    attendance,
                    dateKey,
                    todayKey
                  );

                /* ===========================================
                   LATEST TRACKING POINT

                   The cache key MUST match AttendancePage:

                   `${employeeId}:${dateKey}`

                   This point is the latest saved checkpoint,
                   not attendance.checkIn location.
                =========================================== */

                const locationCacheKey =
                  `${employeeId}:${dateKey}`;

                const latestPoint =
                  latestLocations[
                    locationCacheKey
                  ] ||
                  null;

                const latestLocationLabel =
                  latestPoint
                    ? pointLabel(
                        latestPoint
                      )
                    : "No checkpoint";

                const latestLocationTime =
                  latestPoint
                    ? formatTime(
                        pointTime(
                          latestPoint
                        )
                      )
                    : "";

                const latestMapLink =
                  latestPoint
                    ? pointMap(
                        latestPoint
                      )
                    : "";

                return (
                  <tr
                    key={
                      attendance?._id ||
                      `${employeeId}-${dateKey}`
                    }
                  >
                    {/* =====================================
                        EMPLOYEE
                    ===================================== */}

                    <td>
                      <strong>
                        {attendance
                          ?.employeeName ||
                          attendance
                            ?.employeeId
                            ?.name ||
                          "-"}
                      </strong>

                      <small>
                        {attendance
                          ?.employeeEmail ||
                          attendance
                            ?.employeeId
                            ?.email ||
                          ""}
                      </small>
                    </td>

                    {/* =====================================
                        CHECK IN
                    ===================================== */}

                    <td>
                      {displayCheckIn(
                        attendance
                      )}
                    </td>

                    {/* =====================================
                        CHECK OUT
                    ===================================== */}

                    <td>
                      {displayCheckOut(
                        attendance
                      )}
                    </td>

                    {/* =====================================
                        TOTAL
                    ===================================== */}

                    <td>
                      {formatMinutes(
                        attendance
                          ?.totalWorkingMinutes
                      )}
                    </td>

                    {/* =====================================
                        MODE
                    ===================================== */}

                    <td>
                      <span
                        className={`attendance-mode-pill ${
                          attendance
                            ?.workMode ===
                          "work_from_home"
                            ? "wfh"
                            : "office"
                        }`}
                      >
                        {attendance
                          ?.workMode ===
                        "work_from_home"
                          ? "WFH"
                          : "Office"}
                      </span>
                    </td>

                    {/* =====================================
                        STATUS
                    ===================================== */}

                    <td>
                      <span
                        className={`attendance-health-pill ${health.className}`}
                      >
                        {health.label}
                      </span>
                    </td>

                    {/* =====================================
                        SUPER ADMIN LOCATION

                        Shows latest checkpoint only.

                        MAP:
                        latest saved checkpoint.

                        HISTORY:
                        complete date-specific journey.
                    ===================================== */}

                    {isSuperAdmin ? (
                      <td>
                        <div className="attendance-table-location">
                          <div className="attendance-table-location-copy">
                            <strong>
                              {
                                latestLocationLabel
                              }
                            </strong>

                            {latestLocationTime ? (
                              <small>
                                Updated{" "}
                                {
                                  latestLocationTime
                                }
                              </small>
                            ) : (
                              <small>
                                No saved
                                checkpoint
                              </small>
                            )}
                          </div>

                          <div className="attendance-table-location-actions">
                            {latestMapLink ? (
                              <a
                                className="att-location-btn"
                                href={
                                  latestMapLink
                                }
                                target="_blank"
                                rel="noreferrer"
                                title="Open latest location in Google Maps"
                              >
                                Map
                              </a>
                            ) : null}

                            <button
                              className="att-location-btn history"
                              type="button"
                              onClick={() =>
                                openHistory(
                                  attendance,
                                  employeeId,
                                  dateKey
                                )
                              }
                              title={`View location history for ${dateKey}`}
                            >
                              History
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AttendanceAdminOverview;