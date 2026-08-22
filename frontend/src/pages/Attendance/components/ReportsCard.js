import React, {
  useMemo,
} from "react";

import {
  displayCheckIn,
  displayCheckOut,
  formatDate,
  formatMinutes,
  getDateKey,
  getHealth,
} from "../utils/attendanceHelpers";

const ReportsCard = ({
  records = [],
  todayKey,
  monthName,
  year,
}) => {
  /* =========================================================
     SAFE RECORD LIST

     Keep the same existing behavior:
     show first 12 records only.
  ========================================================= */

  const visibleRecords =
    useMemo(() => {
      if (
        !Array.isArray(
          records
        )
      ) {
        return [];
      }

      return records.slice(
        0,
        12
      );
    }, [
      records,
    ]);

  const totalRecords =
    Array.isArray(
      records
    )
      ? records.length
      : 0;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="reports-card">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="section-heading">
        <div>
          <span className="attendance-eyebrow">
            MONTH VIEW
          </span>

          <h3>
            {monthName}{" "}
            {year}
          </h3>
        </div>

        <span>
          {totalRecords}{" "}
          {totalRecords === 1
            ? "record"
            : "records"}
        </span>
      </div>

      {/* =====================================================
          RECORD LIST
      ====================================================== */}

      <div className="report-list">
        {visibleRecords.map(
          (
            attendance
          ) => {
            const dateKey =
              getDateKey(
                attendance
                  ?.attendanceDate
              );

            const health =
              getHealth(
                attendance,
                dateKey,
                todayKey
              );

            const employeeName =
              attendance
                ?.employeeName ||
              attendance
                ?.employeeId
                ?.name ||
              "Employee";

            return (
              <div
                className="report-item"
                key={
                  attendance?._id ||
                  `${employeeName}-${dateKey}`
                }
              >
                {/* ===========================================
                    TOP ROW
                =========================================== */}

                <div className="report-top">
                  <strong>
                    {
                      employeeName
                    }
                  </strong>

                  <span
                    className={`attendance-health-pill ${health.className}`}
                  >
                    {
                      health.label
                    }
                  </span>
                </div>

                {/* ===========================================
                    ATTENDANCE SUMMARY
                =========================================== */}

                <p>
                  <b>
                    {formatDate(
                      attendance
                        ?.attendanceDate
                    )}
                  </b>

                  {" · "}

                  In{" "}

                  <strong>
                    {displayCheckIn(
                      attendance
                    )}
                  </strong>

                  {" · "}

                  Out{" "}

                  <strong>
                    {displayCheckOut(
                      attendance
                    )}
                  </strong>

                  {" · "}

                  <strong>
                    {formatMinutes(
                      attendance
                        ?.totalWorkingMinutes
                    )}
                  </strong>
                </p>
              </div>
            );
          }
        )}

        {/* ===================================================
            EMPTY STATE
        =================================================== */}

        {visibleRecords.length ===
        0 ? (
          <div className="empty-state">
            No attendance records
            for this period.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ReportsCard;